import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppController } from './app.controller';
import { SsiAgentService } from './services/agent/ssi.agent.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
        {
          provide: SsiAgentService,
          useValue: {
            createAgent: jest.fn(),
            getVerifiedCredentials: jest.fn(),
            grantCredential: jest.fn(),
          },
        },
      ],
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should have defined AppController', () => {
      expect(appController).toBeDefined();
    });
  });
});
