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
import { SsiCredentialOfferInteractionService } from './ssi.credential.offer.interaction.service';
import jwt_decode from 'jwt-decode';
import { WalletManagerCommand } from '@src/common/enums/wallet.manager.command';
import { WalletManagerRequestVcBegin } from './dto/wallet.manager.dto.request.vc.begin';
import { WalletManagerRequestVcComplete } from './dto/wallet.manager.dto.request.vc.complete';
import { WalletManagerOfferVcBegin } from './dto/wallet.manager.dto.offer.vc.begin';
import { WalletManagerOfferVcBeginResponse } from './dto/wallet.manager.dto.offer.vc.begin.response';
import { WalletManagerRequestVcCompleteResponse } from './dto/wallet.manager.dto.request.vc.complete.response';
import { WalletManagerOfferVcCompleteResponse } from './dto/wallet.manager.dto.offer.vc.complete.response';
import { WalletManagerOfferVcComplete } from './dto/wallet.manager.dto.offer.vc.complete';
import { WalletManagerRequestVcCompleteSovrhd } from './dto/wallet.manager.dto.request.vc.complete.sovrhd';

@Controller()
export class CredentialInteractionController {
  constructor(
    private ssiAgentService: SsiAgentService,
    private requestInteractionService: SsiCredentialRequestInteractionService,
    private offerInteractionService: SsiCredentialOfferInteractionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  @MessagePattern({
    cmd: WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION,
  })
  async beginCredentialRequestInteraction(
    @Payload() data: WalletManagerRequestVcBegin,
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
        data.issuerDID,
        data.issuerPassword
      );
      const beginCredentialRequestToken =
        await this.requestInteractionService.beginCredentialRequestInteraction(
          agent,
          data.credentialMetadata,
          data.uniqueCallbackURL
        );

      this.cacheManager.set<WalletManagerRequestVcBegin>(
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

  @MessagePattern({
    cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD,
  })
  async completeCredentialRequestInteractionSovrhd(
    @Payload() data: WalletManagerRequestVcCompleteSovrhd,
    @Ctx() context: RmqContext
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    this.logger.verbose?.(
      `completeCredentialShareInteractionSovrhd - payload: ${JSON.stringify(
        data
      )}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const request =
        await this.cacheManager.get<WalletManagerRequestVcComplete>(
          data.interactionId
        );

      if (!request) {
        throw new PreconditionFailedException(
          `The interactionId could not be found: ${data.interactionId}`
        );
      }

      const agent = await this.ssiAgentService.loadAgent(
        request.issuerDID,
        request.issuerPassword
      );

      const interactionComplete =
        await this.requestInteractionService.completeCredentialRequestInteractionSovrhd(
          agent,
          data.jwt,
          data.credentialType
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

  @MessagePattern({
    cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM,
  })
  async completeCredentialRequestInteractionJolocom(
    @Payload() data: WalletManagerRequestVcComplete,
    @Ctx() context: RmqContext
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    this.logger.verbose?.(
      `completeCredentialShareInteractionJolocm - payload: ${JSON.stringify(
        data
      )}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const request =
        await this.cacheManager.get<WalletManagerRequestVcComplete>(
          data.interactionId
        );

      if (!request) {
        throw new PreconditionFailedException(
          `The interactionId could not be found: ${data.interactionId}`
        );
      }

      const agent = await this.ssiAgentService.loadAgent(
        request.issuerDID,
        request.issuerPassword
      );

      const interactionComplete =
        await this.requestInteractionService.completeCredentialRequestInteractionJolocom(
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

  @MessagePattern({
    cmd: WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION,
  })
  async beginCredentialOfferInteraction(
    @Payload() data: WalletManagerOfferVcBegin,
    @Ctx() context: RmqContext
  ): Promise<WalletManagerOfferVcBeginResponse> {
    this.logger.verbose?.(
      `beginCredentialOfferInteraction - payload: ${JSON.stringify(data)}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const agent = await this.ssiAgentService.loadAgent(
        data.issuerDID,
        data.issuerPassword
      );
      const beginCredentialOfferOutput =
        await this.offerInteractionService.beginCredentialOfferInteraction(
          agent,
          data.offeredCredentials.map(c => c.metadata),
          data.uniqueCallbackURL
        );

      this.cacheManager.set<WalletManagerOfferVcBegin>(
        beginCredentialOfferOutput.interactionId,
        data,
        // time it so that it will expire at  the same time as the token
        { ttl: beginCredentialOfferOutput.expiresOn - new Date().getTime() }
      );

      channel.ack(originalMsg);
      this.logVerifiedCredentialInteraction(
        beginCredentialOfferOutput.jwt,
        'begin'
      );
      return beginCredentialOfferOutput;
    } catch (error) {
      const errorMessage = `Error when creating offer credential: ${error}`;
      this.logger.error(errorMessage, LogContext.SSI);
      channel.ack(originalMsg);
      throw new RpcException(errorMessage);
    }
  }

  @MessagePattern({
    cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
  })
  async completeCredentialOfferInteraction(
    @Payload() data: WalletManagerOfferVcComplete,
    @Ctx() context: RmqContext
  ): Promise<WalletManagerOfferVcCompleteResponse> {
    this.logger.verbose?.(
      `completeCredentialOfferInteraction - payload: ${JSON.stringify(data)}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const request = await this.cacheManager.get<WalletManagerOfferVcBegin>(
        data.interactionId
      );

      if (!request) {
        throw new PreconditionFailedException(
          `The interactionId could not be found: ${data.interactionId}`
        );
      }

      const agent = await this.ssiAgentService.loadAgent(
        request.issuerDID,
        request.issuerPassword
      );

      const interactionComplete =
        await this.offerInteractionService.completeCredentialOfferInteraction(
          agent,
          data.jwt,
          data.credentialMetadata,
          request.offeredCredentials.reduce(
            (aggr, cred) => ({
              ...aggr,
              [cred.metadata.uniqueType]: cred.claim,
            }),
            {}
          )
        );

      channel.ack(originalMsg);
      this.logVerifiedCredentialInteraction(
        interactionComplete.token,
        'CredOfferInteractionComplete'
      );
      return interactionComplete;
    } catch (error) {
      const errorMessage = `Error when offering credentials: ${error}`;
      this.logger.error(errorMessage, LogContext.SSI);
      channel.ack(originalMsg);
      throw new RpcException(errorMessage);
    }
  }

  private logVerifiedCredentialInteraction(jwt: string, prefix: string) {
    const tokenJson = jwt_decode(jwt);
    this.logger.verbose?.(
      `[${prefix}] - Token converted to JSON: ${JSON.stringify(tokenJson)}`,
      LogContext.SSI
    );
  }
}
