import * as fs from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { EcosystemService } from './ecosystem/ecosystem.service';
import { PackageFactDoc } from './ecosystem/schemas/package-fact.schema';

/**
 * One-shot CLI: rebuilds the testnet packagefacts coverage from an explicit
 * list of addresses. Used after the 2026-04-25 cross-network pagination walk
 * surfaced ~35k packages we'd missed (see plans/handoff_2026-04-25.md).
 *
 * Input: argv[2] = path to a file containing one address per line, optionally
 * with `|<timestamp>` suffix (the timestamp is ignored — it's just there for
 * compatibility with the canonical file produced by the count walk).
 *
 * The CLI unions the file's addresses with every existing testnet address
 * already in `packagefacts` (via `distinct('address')`) so we end up with a
 * single fresh snapshot containing all known testnet packages — uniform
 * shape, current chain state, current registry classification.
 *
 * Does NOT wipe existing testnet snapshots. The new snapshot lands alongside;
 * cleanup is a separate explicit step once the operator has eyeballed it.
 *
 * Usage:
 *   docker exec iota-trade-scanner-api node dist/backfill-testnet-from-addresslist.js /tmp/tn-gap-canonical.txt
 */
async function main() {
  const logger = new Logger('BackfillTestnet');
  const path = process.argv[2];
  if (!path) {
    logger.error('Usage: node dist/backfill-testnet-from-addresslist.js <addresses-file>');
    process.exit(1);
  }
  if (!fs.existsSync(path)) {
    logger.error(`File not found: ${path}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(path, 'utf-8');
  const fileAddresses = new Set(
    fileContent
      .split('\n')
      .map((l) => l.split('|')[0].trim())
      .filter((l) => l.length > 0 && l.startsWith('0x')),
  );
  logger.log(`Loaded ${fileAddresses.size} addresses from ${path}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(EcosystemService);
    const pkgFactModel = app.get<Model<PackageFactDoc>>(
      getModelToken(PackageFactDoc.name),
    );

    const existingTestnetAddresses: string[] = await pkgFactModel
      .distinct('address', { network: 'testnet' })
      .exec();
    logger.log(
      `Found ${existingTestnetAddresses.length} existing testnet addresses in packagefacts`,
    );

    const combined = new Set(fileAddresses);
    for (const a of existingTestnetAddresses) combined.add(a);
    const addresses = [...combined];
    logger.log(`Combined unique address count: ${addresses.length}`);

    const start = Date.now();
    let lastLogged = start;
    const result = await service.backfillTestnetFromAddressList(addresses, {
      concurrency: 15,
      onProgress: (done, total) => {
        const nowMs = Date.now();
        if (nowMs - lastLogged > 30_000 || done === total) {
          const elapsedSec = (nowMs - start) / 1000;
          const rate = done / Math.max(elapsedSec, 1);
          const etaSec = (total - done) / Math.max(rate, 0.01);
          logger.log(
            `progress: ${done}/${total} (${((done / total) * 100).toFixed(1)}%) — ${rate.toFixed(1)}/s, ETA ${(etaSec / 60).toFixed(1)} min`,
          );
          lastLogged = nowMs;
        }
      },
    });

    logger.log(
      `DONE: snapshot=${result.snapshotId.toString()} probed=${result.probed} failed=${result.failures.length} durationMs=${result.durationMs}`,
    );
    if (result.failures.length > 0) {
      const sample = result.failures.slice(0, 10);
      logger.warn(`First 10 failures: ${JSON.stringify(sample, null, 2)}`);
      logger.warn(`Total failures: ${result.failures.length} of ${addresses.length}`);
    }
  } catch (e) {
    new Logger('BackfillTestnet').error('Backfill failed', e);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
