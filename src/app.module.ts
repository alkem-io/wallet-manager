import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { ConfigurationTypes } from './common';
import { WinstonConfigService } from './config';
import configuration from './config/configuration';
import { HttpExceptionsFilter } from './core';
import { SsiAgentModule } from './services/agent/ssi.agent.module';
import { SsiCredentialInteractionModule } from './services/interactions/ssi.credential.interaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [configuration],
    }),
    WinstonModule.forRootAsync({
      useClass: WinstonConfigService,
    }),
    TypeOrmModule.forRootAsync({
      name: 'jolocom',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        insecureAuth: true,
        synchronize: true /*toDo - move to migrations */,
        cache: true,
        entities: [
          'node_modules/@jolocom/sdk-storage-typeorm/js/src/entities/*.js',
        ],
        host: configService.get(ConfigurationTypes.JOLOCOM)?.database?.host,
        port: configService.get(ConfigurationTypes.JOLOCOM)?.database?.port,
        username: configService.get(ConfigurationTypes.JOLOCOM)?.database
          ?.username,
        password: configService.get(ConfigurationTypes.JOLOCOM)?.database
          ?.password,
        database: configService.get(ConfigurationTypes.JOLOCOM)?.database
          ?.schema,

        logging: configService.get(ConfigurationTypes.JOLOCOM)?.database
          ?.logging,
      }),
    }),
    SsiAgentModule,
    SsiCredentialInteractionModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionsFilter,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
