/**
 * Top-level categories. Exactly 10, closed set. `Misc` is the catch-all and
 * must stay last — reserved for projects that don't fit any domain bucket.
 * See also `SUBCATEGORIES` for the per-category sub-vocabulary.
 */
export const CATEGORIES = [
  'DeFi',
  'Bridge',
  'Oracle',
  'NFT',
  'Game',
  'Identity',
  'Real World',
  'Infrastructure',
  'Social',
  'Misc',
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Per-category sub-vocabulary, capped at 10 subs each. Populated slots carry
 * existing projects; reserved slots exist so adding the 11th project of a new
 * shape forces a deliberate merge/split decision rather than string drift.
 *
 * `Misc` has no subcategories by design. A project sitting in Misc is a
 * signal to revisit — if a second similar project arrives, promote the
 * pattern to its own subcategory under an existing top-level.
 */
export const SUBCATEGORIES = {
  DeFi: [
    'DEX', 'Perpetuals', 'Stablecoin', 'Lending', 'Liquid Staking',
    'Staking', 'Vault', 'Liquidity Manager', 'Payments', 'Token',
  ],
  Bridge: ['Messaging', 'OFT', 'Asset Bridge', 'Liquidity Bridge', 'Wrapped Token'],
  Oracle: ['Price Feed', 'VRF', 'Data Feed', 'Keeper / Automation'],
  NFT: ['Collection', 'Launchpad', 'Marketplace', 'Aggregator', 'Dynamic NFT', 'Royalty / Rental'],
  Game: ['On-chain', 'GambleFi', 'P2E', 'TCG', 'Sandbox / Metaverse', 'Racing / Sports'],
  Identity: ['Framework', 'Credentials', 'Name Service', 'Reputation', 'Attestation', 'KYC'],
  'Real World': ['Framework', 'Application'],
  Infrastructure: [
    'Chain Primitive', 'EVM Anchor', 'Data / Publishing', 'Wallet',
    'Explorer', 'Indexer', 'Account Abstraction', 'Multisig', 'SDK',
  ],
  Social: ['Incentive', 'Airdrop', 'Community', 'SocialFi', 'Creator', 'Tipping'],
  Misc: [],
} as const satisfies Record<Category, readonly string[]>;
export type Subcategory = (typeof SUBCATEGORIES)[Category][number];

export interface ProjectDefinition {
  name: string;
  layer: 'L1' | 'L2';
  /**
   * IOTA network this definition targets. Classifier filters
   * `ALL_PROJECTS.filter(d => (d.network ?? 'mainnet') === scanNetwork)`
   * before iteration, so a mainnet scan never matches testnet definitions
   * and vice versa. Optional with a default of `'mainnet'` so the ~600
   * existing definitions stay unaffected. See
   * `plans/plan_testnet_support.md § Tag matrix` for why this is singular
   * (not an array): testnet and mainnet deploys of "the same" app are
   * intrinsically disjoint — version-split pattern applies, two defs under
   * one `teamId`.
   */
  network?: 'mainnet' | 'testnet' | 'devnet';
  /**
   * Top-level category from the closed 10-member `CATEGORIES` set. Display
   * label combines `category` + `subcategory` as `"<Category> / <Sub>"`
   * (computed at read time; see `ecosystem.service.ts`). Use subcategory to
   * carry the mechanism/type within a category; use `industries` for the
   * orthogonal sector tag axis.
   */
  category: Category;
  /**
   * Optional sub-vocabulary within the category — must be a member of
   * `SUBCATEGORIES[category]`. Runtime-validated by
   * `ecosystem-registry.spec.ts`; `Misc` projects leave this unset.
   */
  subcategory?: Subcategory;
  /**
   * Orthogonal sector tags. Multi-valued. Free-form strings with a starter
   * vocabulary (`Agriculture`, `Carbon`, `Luxury`, `Trade Documents`, …) —
   * industries are tags, not taxonomy, so no cap and no enum. Primarily used
   * on Real World projects (the target industry a supply-chain / authenticity
   * / traceability app serves) but available on every project.
   */
  industries?: string[];
  /** 50-500 characters describing what the project does */
  description: string;
  /**
   * ISO-8601 date (`YYYY-MM-DD`) this project was first added to the registry.
   * Optional: older defs predate this field. Exposed on the API's `Project`
   * read shape so the frontend can badge "new this week / month". One-shot
   * backfill from `git log --diff-filter=A --format=%ai -- <file>` is
   * tracked in `TODO.md § Registry addedAt backfill`.
   */
  addedAt?: string;
  /** One or more URLs (website, docs, app, etc.) */
  urls: { label: string; href: string }[];
  /** Absolute public path to the project ICON (square — e.g. `/logos/virtue.svg`). Overrides `Team.logo` for this project only — leave unset to inherit from the team. */
  logo?: string;
  /** Optional landscape WORDMARK (e.g. `/logos/virtue-wordmark.svg`). Overrides `Team.logoWordmark` for this project only — leave unset to inherit. Used on the project-details page; list views always use the square `logo`. */
  logoWordmark?: string;
  /** ID of the owning team (references ALL_TEAMS in ../teams). `null` for aggregate buckets like NFT Collections that have no single team. */
  teamId: string | null;
  /** Optional caveat shown to users. Use for aggregate buckets that almost certainly mix distinct projects we can't yet distinguish. */
  disclaimer?: string;
  /**
   * Free-form prose explaining how we arrived at the project's display name:
   * what on-chain evidence triggers the match, and how we know that evidence
   * maps to this specific branded project (deployer correlation, app
   * inspection, docs references, etc.). Surfaced on the project details page;
   * not shown in the main listing tables.
   */
  attribution?: string;
  /** Split matched packages into one sub-project per distinct deployer. Use for aggregate buckets where deployer discriminates distinct projects. */
  splitByDeployer?: boolean;
  /**
   * Flag this project as a dumb PFP / collectible NFT (no real utility, no RWA
   * anchor — just pictures). Opt-in so the dashboard's "Hide collectibles"
   * toggle can filter them out of the "real usecases" view. Leave unset for
   * anything with economic logic or real-world-asset backing (RWA NFTs like
   * Salus's DWRs, ObjectID's GS1-anchored authenticity tokens, TruvID's
   * document proofs — those stay visible regardless of the toggle).
   */
  isCollectible?: boolean;
  /**
   * How to identify this project's packages. All specified criteria must pass
   * (AND semantics). A rule with no criteria is skipped by the synchronous
   * matcher and is only reachable via `fingerprint` or team-deployer routing.
   *
   * Composition examples:
   * - `{deployerAddresses: ['0x…']}` — everything from a team's deployer.
   * - `{deployerAddresses: ['0x…'], all: ['stake']}` — staking packages
   *   from this team specifically.
   * - `{packageAddresses: ['0x…'], all: ['irt']}` — pin a single address and
   *   also require the module (defence-in-depth when the address is known
   *   but the rule should fail loudly if the deployed modules change).
   *
   * Priority between defs is the order of `ALL_PROJECTS`: more-specific
   * matchers must come first so they win over broader rules on shared
   * deployers (e.g. TWIN's `{all: ['verifiable_storage']}` before any
   * IF-Testing team-deployer routing).
   */
  match: {
    all?: string[];
    any?: string[];
    exact?: string[];
    minModules?: number;
    /** Exact mainnet package addresses (lowercased on compare). Use when module names are too generic to match reliably. */
    packageAddresses?: string[];
    /** Deployer addresses (first-publisher of the package). Matches every package published by any listed deployer. Cheaper than enumerating `packageAddresses` when a team's whole footprint is on-scope. Lowercased on compare. */
    deployerAddresses?: string[];
    /**
     * Required Move-struct names — every entry must appear as the trailing
     * `::<StructName>` segment of at least one `objectTypeCounts.type` on the
     * package. Lets a rule key off the package's *structural shape* in addition
     * to its module list. Originally added to detect TWIN's "scaffold" of
     * `MigrationState` + `UpgradeCapRegistry` companion objects, which
     * mechanically distinguishes their tooling deployments from the
     * IF-Testing fixtures that share the same deployer + `nft` module name.
     * Generalises to any team that publishes a recognisable shape: e.g.
     * "this deployer + an `AdminCap` + a `<Foo>Pool`" without having to
     * pin the specific package address. Suffix-match on `<StructName>` (the
     * last `::` segment), case-sensitive — Move struct names are PascalCase
     * by convention so case-insensitivity would just hide typos.
     */
    objectTypes?: string[];
    /** Fingerprint a sample object from the package. All specified constraints must match (AND). Enables discovery of new packages deployed by this project. */
    fingerprint?: {
      /** Struct path within the package, e.g. 'nft::NFT'. Sampled type is `<pkg>::<type>`. */
      type: string;
      /** Expected value of the object's `issuer` Move field (lowercased on compare). Shortcut for `fields: { issuer: <value> }` with lowercase-insensitive comparison. */
      issuer?: string;
      /** Expected value of the object's `tag` Move field. Shortcut for `fields: { tag: <value> }`. */
      tag?: string;
      /**
       * Per-field constraints on the sampled Move object. Key = Move field name.
       * Value = a matcher:
       *   - `string` → exact match on the string field value.
       *   - `{ prefix }` → string field starts with prefix.
       *   - `{ suffix }` → string field ends with suffix.
       *   - `{ present: true }` → field exists and is non-empty.
       * Multiple keys on the same object are combined with AND. Combine rule
       * properties within one key (e.g. `{ prefix, suffix }`) to require both.
       * Added for the Salus-shaped case where module/struct names are generic
       * (`nft::NFT`) and identity lives in field values. Skip regex / OR /
       * numeric matchers until a real cluster needs them (see TODO.md).
       */
      fields?: Record<
        string,
        string | { prefix?: string; suffix?: string; present?: true }
      >;
    };
  };
  /**
   * Declared Move struct types this project wants counted as Items + Holders
   * (`plans/plan_object_count.md`). Entries are fully-qualified module paths
   * — `<module>::<StructName>` (e.g. `'otterfly_1::OtterFly1NFT'`). The
   * scanner enumerates every package in the project's set and resolves the
   * `<mod>::<T>` form against each package's modules at classify time —
   * config stays simple across multi-version (same-module, different
   * package address) deployments.
   *
   * Consumed **only at classify time**, not capture. Capture writes the raw
   * `objectTypeCounts` array for every `key`-able struct of every package;
   * `classifyFromRaw` filters to the project's `countTypes` and sums
   * `count` + `listedCount` across matched facts. Adding a new project
   * tomorrow retroactively picks up history from every past snapshot.
   *
   * Absent / empty → project doesn't participate in Items / Holders. On
   * the detail page those fields render `—`; the overview `Wallets*` reach
   * column falls back to `uniqueSenders` only (no holder union contribution).
   * Opt-in is by design — DeFi / infra rows whose activity is TX-shaped
   * shouldn't surface misleading zero-holder numbers just because the
   * scanner can theoretically count their `Pool` or `Admin` structs.
   */
  countTypes?: string[];
}
