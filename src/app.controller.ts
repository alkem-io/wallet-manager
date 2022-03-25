import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
  RpcException,
} from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from './common';
import { WalletManagerCommand } from './common/enums/wallet.manager.command';
import { SsiAgentService } from './services/agent/ssi.agent.service';

@Controller()
export class AppController {
  constructor(
    private ssiAgentService: SsiAgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @MessagePattern({ cmd: WalletManagerCommand.CREATE_IDENTITY })
  async createIdentity(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.verbose?.(
      `createIdentity - payload: ${JSON.stringify(data)}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const did = await this.ssiAgentService.createAgent(data.password);
      channel.ack(originalMsg);

      return did;
    } catch (error) {
      const errorMessage = `Error when creating identity: ${error}`;
      this.logger.error(errorMessage, LogContext.SSI);
      channel.ack(originalMsg);
      throw new RpcException(errorMessage);
    }
  }

  @MessagePattern({ cmd: WalletManagerCommand.GET_IDENTITY_INFO })
  async getIdentityInfo(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.verbose?.(
      `getIdentityInfo - payload: ${JSON.stringify(data)}`,
      LogContext.EVENT
    );
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const identityInfo = await this.ssiAgentService.getVerifiedCredentials(
        data.did,
        data.password,
        data.credentialMetadata
      );

      channel.ack(originalMsg);
      return identityInfo;
    } catch (error) {
      const errorMessage = `Error when acquiring DID: ${error}`;
      this.logger.error(errorMessage, LogContext.SSI);
      channel.ack(originalMsg);
      throw new RpcException(errorMessage);
    }
  }
}
