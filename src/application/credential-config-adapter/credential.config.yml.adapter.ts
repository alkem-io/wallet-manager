import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@src/common';
import {
  CredentialConfig,
  ICredentialConfigProvider,
} from '@src/core/contracts/credential.provider.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class CredentialConfigYmlAdapter implements ICredentialConfigProvider {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getCredentials(): CredentialConfig {
    const credentials = this.configService.get(ConfigurationTypes.CREDENTIALS);

    return {
      credentials: Object.values(credentials),
    };
  }
}
