import {
  CACHE_MANAGER,
  Controller,
  Inject,
  LoggerService,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SsiAgentService } from '@src/services/agent/ssi.agent.service';
import { SsiCredentialRequestInteractionService } from './ssi.credential.request.interaction.service';
import { Cache } from 'cache-manager';
import { LogContext } from '@src/common/enums';
import {
  BeginCredentialRequestInteractionInputDTO as BeginCredentialRequestInteractionInput,
  CompleteCredentialRequestInteractionInputDTO as CompleteCredentialRequestInteractionInput,
} from './credential.request.interaction';

@Controller()
export class CredentialInteractionController {
  constructor(
    private ssiAgentService: SsiAgentService,
    private credentialRequestInteractionService: SsiCredentialRequestInteractionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  @MessagePattern({ cmd: 'beginCredentialRequestInteraction' })
  async beginCredentialRequestInteraction(
    @Payload() data: BeginCredentialRequestInteractionInput,
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `beginCredentialRequestInteraction - payload: ${JSON.stringify(data)}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const agent = await this.ssiAgentService.loadAgent(
        data.issuerDId,
        data.issuerPassword
      );
      const beginCredentialRequestToken =
        await this.credentialRequestInteractionService.beginCredentialRequestInteraction(
          agent,
          data.types,
          data.uniqueCallbackURL
        );

      this.cacheManager.set<BeginCredentialRequestInteractionInput>(
        beginCredentialRequestToken.interactionId,
        data,
        // time it so that it will expire at  the same time as the token
        { ttl: beginCredentialRequestToken.expiresOn - new Date().getTime() }
      );

      channel.ack(originalMsg);
      return beginCredentialRequestToken;
    } catch (error) {
      const errorMessage = `Error when creating credential share request credential: ${error}`;
      this.logger.error(errorMessage, LogContext.SSI);
      channel.ack(originalMsg);
      throw new RpcException(errorMessage);
    }
  }

  @MessagePattern({ cmd: 'completeCredentialShareInteraction' })
  async completeCredentialShareInteraction(
    @Payload() data: CompleteCredentialRequestInteractionInput,
    @Ctx() context: RmqContext
  ) {
    this.logger.verbose?.(
      `completeCredentialShareInteraction - payload: ${JSON.stringify(data)}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const request =
        await this.cacheManager.get<BeginCredentialRequestInteractionInput>(
          data.interactionId
        );

      if (!request) {
        throw new PreconditionFailedException(
          `The interactionId could not be found: ${data.interactionId}`
        );
      }

      const agent = await this.ssiAgentService.loadAgent(
        request.issuerDId,
        request.issuerPassword
      );

      const interactionComplete =
        await this.credentialRequestInteractionService.completeCredentialShareInteraction(
          agent,
          data.jwt
        );

      channel.ack(originalMsg);
      return interactionComplete;
    } catch (error) {
      const errorMessage = `Error when storing credentials: ${error}`;
      this.logger.error(errorMessage, LogContext.SSI);
      channel.ack(originalMsg);
      throw new RpcException(errorMessage);
    }
  }
}
