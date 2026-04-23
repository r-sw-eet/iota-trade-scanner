/**
 * Observe-only dry-run of `EcosystemService.captureRaw()` against a chosen
 * IOTA network. Exists so we can smoke-test a testnet (or devnet) capture
 * from the workstation without writing anything to Mongo — no documents
 * are persisted, no classify runs, no cache is invalidated.
 *
 * Prints the aggregate stats as one pretty-printed JSON object on stdout;
 * a single human-readable summary line goes to stderr so piping to `jq`
 * stays clean.
 *
 * Usage:
 *   npx ts-node --transpile-only src/dry-run-testnet.ts --network testnet --max-minutes 15
 *   npx ts-node --transpile-only src/dry-run-testnet.ts --network mainnet
 *   npx ts-node --transpile-only src/dry-run-testnet.ts --network devnet --max-minutes 10
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

type Network = 'mainnet' | 'testnet' | 'devnet';

interface Args {
  network: Network;
  maxMinutes: number;
}

function parseArgs(argv: string[]): Args {
  let network: Network | undefined;
  let maxMinutes = 20;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--network') {
      const v = argv[++i];
      if (v !== 'mainnet' && v !== 'testnet' && v !== 'devnet') {
        throw new Error(`--network must be one of: mainnet, testnet, devnet (got: ${v ?? '<missing>'})`);
      }
      network = v;
    } else if (arg === '--max-minutes') {
      const v = argv[++i];
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`--max-minutes must be a positive number (got: ${v ?? '<missing>'})`);
      }
      maxMinutes = n;
    } else {
      throw new Error(`unknown arg: ${arg}`);
    }
  }
  if (!network) throw new Error('--network is required (one of: mainnet, testnet, devnet)');
  return { network, maxMinutes };
}

async function main() {
  const logger = new Logger('DryRunTestnet');

  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`[dry-run] ${(e as Error).message}\n`);
    process.exit(2);
  }

  // Must be set BEFORE the Nest context is created — `EcosystemService`
  // reads `process.env.IOTA_NETWORK` once in its constructor, so mutating
  // it post-bootstrap is a no-op.
  process.env.IOTA_NETWORK = args.network;
  // Prevent the cron from firing / the boot-time capture from kicking off
  // during the dry-run. The service short-circuits `onModuleInit` in test
  // mode and `app.module.ts` disables `ScheduleModule` when NODE_ENV=test.
  process.env.NODE_ENV = 'test';

  // Lazy-load AppModule + EcosystemService AFTER env mutation so any
  // top-level reads of IOTA_NETWORK (Mongoose schema indexes etc.) see
  // the right value.
  const { AppModule } = await import('./app.module');
  const { EcosystemService } = await import('./ecosystem/ecosystem.service');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(EcosystemService);
    const stats = await service.dryRunCapture({ maxMinutes: args.maxMinutes });
    const seconds = Math.round(stats.durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    process.stderr.write(
      `[dry-run] captured ${stats.packages} packages in ${minutes}m ${rem}s against ${stats.graphqlUrl}; see JSON on stdout.\n`,
    );
    process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
    await app.close();
    process.exit(0);
  } catch (e) {
    logger.error((e as Error).message ?? String(e));
    try {
      await app.close();
    } catch {
      // Swallow close errors — the primary failure already dominates exit code.
    }
    process.exit(1);
  }
}

main();
