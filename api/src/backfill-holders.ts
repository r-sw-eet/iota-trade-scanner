import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { EcosystemService } from './ecosystem/ecosystem.service';

/**
 * One-shot CLI: drains all historical owner addresses for every
 * `(packageAddress, type)` pair observed in the latest snapshot's
 * `packages[].objectTypeCounts[]`. Writes per-owner docs into the
 * `project_holder_entries` collection. Resumable — each pair resets
 * its cursor+counters at drain start, then pages forward through full
 * history.
 *
 * Enumeration source is the snapshot's own `objectTypeCounts` — Option C
 * ensures every `key`-able struct type of every package gets captured
 * regardless of ProjectDefinition.countTypes, so the backfill covers
 * all project/non-project types uniformly (adding a project def later
 * retroactively populates at classify time).
 *
 * Parallel across (pkg, type) pairs (concurrency=20 default, matches
 * `backfill:txcounts` precedent). Pagination within each pair stays
 * serial (cursor chain).
 *
 * Usage (in container):
 *   docker exec iota-trade-scanner-api node dist/backfill-holders.js
 */
async function main() {
  const logger = new Logger('BackfillHolders');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(EcosystemService);
    logger.log('Starting holders backfill across every (package, type) pair in the latest snapshot...');
    const start = Date.now();

    const result = await service.backfillAllHolders((info) => {
      logger.log(
        `  ${info.packageAddress}::${info.type.split('::').slice(-1)[0]} → ${info.count} holders, ${info.listedCount} listed${info.capped ? ' [CAPPED — floor]' : ''}`,
      );
    });

    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    logger.log(
      `Backfill complete in ${seconds}s — ${result.totalPairs} (pkg, type) pairs, ${result.totalHolders} total holder docs, ${result.cappedPairs} capped.`,
    );
  } catch (e) {
    new Logger('BackfillHolders').error('Backfill failed', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
