import { Module } from '@nestjs/common';
import { CacheCredentialService } from './ssi.cache.credential.service';

@Module({
  imports: [],
  providers: [CacheCredentialService],
  exports: [CacheCredentialService],
})
export class SsiCacheCredentialModule {}
