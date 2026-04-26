import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SnapshotService } from './snapshot/snapshot.service';

/**
 * One-shot CLI: re-fetches the IOTA GraphQL `epoch{}` payload for every
 * Snapshot doc that's missing the post-2026-04-26 fee-decomposition fields
 * (epochStorageFeesIn, epochStorageRebatesOut, epochStakeRewards,
 * epochReferenceGasPrice, epochNonRefundableBalance) and $set's just those
 * five fields. Idempotent — re-running skips snapshots that already have
 * non-zero epochStakeRewards.
 *
 * Usage (in container):
 *   docker exec iota-trade-scanner-api node dist/backfill-epoch-fees.js
 */
async function main() {
  const logger = new Logger('BackfillEpochFees');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(SnapshotService);
    logger.log('Scanning for snapshots missing fee-decomposition fields...');
    const start = Date.now();

    const result = await service.backfillEpochFees(({ epoch, done, total }) => {
      if (done % 50 === 0 || done === total) {
        logger.log(`  ${done}/${total} (last: epoch ${epoch})`);
      }
    });

    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    logger.log(
      `Backfill complete in ${seconds}s — updated=${result.updated} skipped=${result.skipped} failed=${result.failed}.`,
    );
  } catch (e) {
    new Logger('BackfillEpochFees').error('Backfill failed', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
