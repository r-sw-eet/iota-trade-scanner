import {
  TESTNET_TUTORIAL_SIGNATURES,
  isTutorialModuleSet,
} from './testnet-tutorial-signatures';

describe('isTutorialModuleSet', () => {
  it('returns true for an exact-match module set on testnet', () => {
    expect(isTutorialModuleSet(['fixed18', 'sfixed18', 'uint_macro'], 'testnet')).toBe(true);
  });

  it('returns true regardless of input order (sort-then-join lookup)', () => {
    // Same set, permuted — expected to be sorted internally before catalog lookup.
    expect(isTutorialModuleSet(['uint_macro', 'fixed18', 'sfixed18'], 'testnet')).toBe(true);
    expect(isTutorialModuleSet(['sfixed18', 'uint_macro', 'fixed18'], 'testnet')).toBe(true);
  });

  it('returns false for a strict subset of a catalog entry (exact set match required)', () => {
    // Catalog contains `'fixed18|sfixed18|uint_macro'`; the subset must NOT match.
    expect(isTutorialModuleSet(['fixed18', 'sfixed18'], 'testnet')).toBe(false);
    expect(isTutorialModuleSet(['fixed18'], 'testnet')).toBe(false);
  });

  it('returns false for a strict superset of a catalog entry (exact set match required)', () => {
    // Catalog contains `'pair'` alone; adding modules must NOT match.
    expect(isTutorialModuleSet(['pair', 'extra'], 'testnet')).toBe(false);
    expect(isTutorialModuleSet(['fixed18', 'sfixed18', 'uint_macro', 'extra'], 'testnet')).toBe(false);
  });

  it('returns false for an empty modules array', () => {
    expect(isTutorialModuleSet([], 'testnet')).toBe(false);
  });

  it('returns false when modules are not in the catalog', () => {
    expect(isTutorialModuleSet(['unique_real_builder_module'], 'testnet')).toBe(false);
    expect(isTutorialModuleSet(['amm', 'pool', 'router'], 'testnet')).toBe(false);
  });

  it('returns false on mainnet even when modules match a catalog entry', () => {
    // The catalog is testnet-specific — mainnet packages with the same module
    // names are real protocol code, not workshop scaffolds.
    expect(isTutorialModuleSet(['fixed18', 'sfixed18', 'uint_macro'], 'mainnet')).toBe(false);
    expect(isTutorialModuleSet(['faucet'], 'mainnet')).toBe(false);
    expect(isTutorialModuleSet(['nft'], 'mainnet')).toBe(false);
  });

  it('returns false on devnet even when modules match a catalog entry', () => {
    expect(isTutorialModuleSet(['fixed18', 'sfixed18', 'uint_macro'], 'devnet')).toBe(false);
    expect(isTutorialModuleSet(['price_feed'], 'devnet')).toBe(false);
  });

  it('matches every catalog entry against itself on testnet', () => {
    // Each catalog signature, split back into modules, must round-trip true.
    for (const sig of TESTNET_TUTORIAL_SIGNATURES) {
      const modules = sig.split('|');
      expect(isTutorialModuleSet(modules, 'testnet')).toBe(true);
      // And in reverse order — to assert sort-stability of the lookup.
      expect(isTutorialModuleSet([...modules].reverse(), 'testnet')).toBe(true);
    }
  });

  it('catalog has the expected 49 entries', () => {
    // Sanity check on the snapshot-mined catalog size — guards against
    // accidental edits silently shrinking the workshop coverage.
    expect(TESTNET_TUTORIAL_SIGNATURES.size).toBe(49);
  });
});
