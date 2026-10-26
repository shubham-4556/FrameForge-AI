import { Global, Module } from '@nestjs/common';
import { getServerEnv } from '@frameforge/shared/server';

export const ENV = 'FRAMEFORGE_ENV';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => getServerEnv() }],
  exports: [ENV],
})
export class EnvModule {}
