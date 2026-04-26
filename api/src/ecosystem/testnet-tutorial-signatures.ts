/**
 * Curated catalog of testnet workshop/tutorial scaffold module signatures —
 * sorted-modules joined by '|'. Surfaced 2026-04-26 from the post-backfill
 * validation pass (`plans/findings_testnet_first_usable.md`): a perpetuals-
 * protocol scaffold whose ~12 sub-packages were re-deployed by ~3,000
 * distinct testnet wallets, scripted (1-min full-curriculum runs), 84% of
 * all testnet packages on the first-usable snapshot. See
 * `plans/plan_testnet_tutorial_filter.md` for the architecture.
 *
 * Catalog adds/removes are operator-approved — the refresh-cli surfaces
 * candidates from the latest snapshot but never auto-promotes. The 49
 * entries below were mined from snapshot 69ed130f9b8f517b356af96d at the
 * "≥10 distinct deployers" threshold.
 */
export const TESTNET_TUTORIAL_SIGNATURES: ReadonlySet<string> = new Set([
  'fixed18|sfixed18|uint_macro',
  'price_feed',
  'stable',
  'faucet',
  'soul_bound',
  'registry',
  'pair|trio',
  'filled',
  'mock_source|read',
  'markets|metadata|perps',
  'mock_source',
  'events|funding|v1',
  'account|admin|collateral|common|events|fee|margin_manager|margin_math|market|metadata|position|trade',
  'account|admin|collateral|common|events|fee|margin_manager|margin_math|market|position|trade',
  'funding|v1',
  'nft',
  'anchor|assets_bag|request',
  'account|admin|collateral|common|events|fee|margin_manager|margin_math|market|position|trade|version',
  'account|admin|collateral|events|fee|margin_manager|margin_math|market|metadata|position|trade',
  'pair',
  'verifiable_storage',
  'simple_counter',
  'account|admin|collateral|common|events|exchange|fee|margin_manager|margin_math|market|position|version',
  'account|admin|collateral|fee|margin_manager|margin_math|market|metadata|position|trade',
  'contract',
  'bee_hive|clock|counter|object_basics|random|resolve_args',
  'pyth_source|read',
  'pizza',
  'first_package',
  'account|admin|collateral|common|events|exchange|fee|margin_manager|margin_math|market|position|version|withdrawal',
  'counter',
  'my_token',
  'dynamic_notarization|locked_notarization|method|notarization|timelock',
  'main|permission|trusted_constraint|trusted_property|utils',
  'grant',
  'coffee',
  'my_module',
  'document_manager',
  'test',
  'grant|registry',
  'access_sub_entity_proposal|asset|borrow_proposal|config_proposal|controller|controller_proposal|delete_proposal|identity|migration|migration_registry|multicontroller|permissions|public_vc|transfer_proposal|update_value_proposal|upgrade_proposal|utils',
  'hello',
  'testcoin',
  'oft|oft_fee|oft_fee_detail|oft_impl|oft_info_v1|oft_limit|oft_msg_codec|oft_ptb_builder|oft_receipt|oft_send_context|oft_sender|pausable|rate_limiter|send_param',
  'forum',
  'accreditation|main|property|property_name|property_shape|property_value|utils',
  'account|admin|collateral|common|events|exchange|fee|margin_manager|margin_math|market|position|version|withdraw',
  'my_coin',
  'app|rewards',
]);

/**
 * Returns true if a package's module set matches a known testnet tutorial
 * scaffold signature. Mainnet and devnet always return false — the catalog
 * is testnet-specific (mainnet has no workshop population: 751 pkgs / 121
 * deployers, all real; devnet is transient and out of scope).
 */
export function isTutorialModuleSet(modules: readonly string[], network: string): boolean {
  if (network !== 'testnet') return false;
  if (modules.length === 0) return false;
  const sig = modules.slice().sort().join('|');
  return TESTNET_TUTORIAL_SIGNATURES.has(sig);
}
