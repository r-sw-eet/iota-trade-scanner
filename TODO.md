# TODO

## Operational

- [ ] Add devnet support (alongside mainnet)
- [ ] Set up backups (restic → Hetzner Object Storage; enable `iota_trade_scanner_backup_enabled` once S3 creds provisioned)
- [ ] Add tests (API unit/integration, website component tests)

## Indexing depth

Currently we index at epoch-level (332 records, ~65 KB). Deeper indexing levels for future consideration:

- [ ] **Checkpoint-level**: 125M records, ~18 GB. Would give sub-hour granularity on storage fund and gas burn. Impractical via public API (rate limited), would need a full node or dedicated indexer.
- [ ] **Transaction-level**: 594M records, ~277 GB. Per-tx gas cost, sender, effects. Requires running a full IOTA node with custom indexing.
- [ ] **Full tx + effects**: 594M records, ~1.1 TB. What a full archival node stores.
- [ ] **Object-level**: ~4.4 GB of stored object data (estimated from storage fund size). Track individual object lifetimes — when created, when deleted, how long storage deposits are actually held.

## Use case decomposition

Show grouped transactions that compose a single use case:

- [ ] Define per-project operation flows (e.g., 1 TLIP shipment = 26 tx: BL creation, carrier reg, endorsements, border events)
- [ ] Detect operation groups on-chain by analyzing linked transactions (shared objects, sequential digests from same sender within a time window)
- [ ] Display as "1 swap = N tx" breakdown per project

## Storage deposit lifetime analysis

- [ ] Track object creation and deletion events to measure how long storage deposits are actually held
- [ ] Chart: distribution of deposit hold times (are trade objects ever deleted?)
- [ ] Show "effectively locked" IOTA: deposits on objects that haven't been deleted in >30/90/180 days
