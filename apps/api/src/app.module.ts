import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from './search/search.module';
import { HealthController } from './health.controller';

function validateEnv(env: Record<string, unknown>) {
  for (const key of ['PANSOU_BASE_URL', 'REDIS_URL']) {
    if (typeof env[key] !== 'string' || !env[key]) throw new Error(`${key} is required`);
  }
  const pansou = new URL(String(env.PANSOU_BASE_URL));
  if (!['http:', 'https:'].includes(pansou.protocol)) throw new Error('Invalid PanSou URL');
  const redis = new URL(String(env.REDIS_URL));
  if (!['redis:', 'rediss:'].includes(redis.protocol)) throw new Error('Invalid Redis URL');
  return env;
}

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), SearchModule], controllers: [HealthController] })
export class AppModule {}
