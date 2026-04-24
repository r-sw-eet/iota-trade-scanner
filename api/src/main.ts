import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  // Register Node SIGTERM/SIGINT handlers → Nest's `OnApplicationShutdown`
  // / `BeforeApplicationShutdown` lifecycle hooks fire when Docker stops
  // the container. Needed so `EcosystemService.onApplicationShutdown`
  // releases held `CaptureLock`s before the process exits. Without this,
  // a deploy-triggered kill leaves locks stuck in Mongo until their TTL
  // expires (~3h for mainnet, 2.5h for testnet).
  app.enableShutdownHooks();

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`Scanner API running on port ${port}`);
}
bootstrap();
