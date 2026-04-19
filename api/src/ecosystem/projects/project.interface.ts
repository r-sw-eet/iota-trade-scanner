export interface ProjectDefinition {
  name: string;
  layer: 'L1' | 'L2';
  category: string;
  /** 50-500 characters describing what the project does */
  description: string;
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
}
