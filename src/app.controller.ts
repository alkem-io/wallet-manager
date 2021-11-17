import { Controller, Inject, LoggerService } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from './common';
import { SsiAgentService } from './services/agent/ssi.agent.service';

@Controller()
export class AppController {
  constructor(
    private ssiAgentService: SsiAgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @MessagePattern({ cmd: 'createIdentity' })
  async createIdentity(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.ssiAgentService.createAgent(data.password).then(
      did => {
        channel.ack(originalMsg);
        return did;
      },
      error => {
        this.logger.error(`Error when acquiring DID: ${error}`, LogContext.SSI);
        channel.ack(originalMsg);
      }
    );
  }

  @MessagePattern({ cmd: 'getIdentityInfo' })
  async getIdentityInfo(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    channel.ack(originalMsg);
  }

  @MessagePattern({ cmd: 'grantCredential' })
  async assignCredential(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.ssiAgentService.grantCredential(data).then(
      res => {
        channel.ack(originalMsg);
        return res;
      },
      error => {
        this.logger.error(
          `Error when granting credential: ${error}`,
          LogContext.SSI
        );
        channel.ack(originalMsg);
      }
    );
  }
}
