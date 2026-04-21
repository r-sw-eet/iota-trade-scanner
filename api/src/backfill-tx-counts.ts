import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { EcosystemService } from './ecosystem/ecosystem.service';

/**
 * One-shot CLI: drains all historical MoveCall TX counts for every package
 * in the latest snapshot into the `project_tx_counts` collection. Resumable
 * — re-running picks up cleanly (each package resets its cursor+total at
 * the start of its drain, then pages forward through full history).
 *
 * Parallel across packages (concurrency=20 default, validated against
 * mainnet — see `plans/limits.md`). Pagination inside each package stays
 * serial (cursor chain).
 *
 * Usage (in container):
 *   docker exec iota-trade-scanner-api node dist/backfill-tx-counts.js
 */
async function main() {
  const logger = new Logger('BackfillTxCounts');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(EcosystemService);
    logger.log('Starting TX-count backfill across all packages in the latest snapshot...');
    const start = Date.now();

    const result = await service.backfillAllTxCounts((info) => {
      logger.log(
        `  ${info.packageAddress} → ${info.total} TXs${info.capped ? ' [CAPPED — floor]' : ''}`,
      );
    });

    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    logger.log(
      `Backfill complete in ${seconds}s — ${result.totalPackages} packages, ${result.totalTxs} total TXs counted, ${result.cappedPackages} capped.`,
    );
  } catch (e) {
    new Logger('BackfillTxCounts').error('Backfill failed', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
