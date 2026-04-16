export interface ProjectDefinition {
  name: string;
  layer: 'L1' | 'L2';
  category: string;
  /** 50-500 characters describing what the project does */
  description: string;
  /** One or more URLs (website, docs, app, etc.) */
  urls: { label: string; href: string }[];
  /** Absolute public path to the project logo, e.g. `/logos/virtue.svg`. Overrides `Team.logo` for this project only — leave unset to inherit from the team. */
  logo?: string;
  /** ID of the owning team (references ALL_TEAMS in ../teams). `null` for aggregate buckets like NFT Collections that have no single team. */
  teamId: string | null;
  /** Optional caveat shown to users. Use for aggregate buckets that almost certainly mix distinct projects we can't yet distinguish. */
  disclaimer?: string;
  /** Split matched packages into one sub-project per distinct deployer. Use for aggregate buckets where deployer discriminates distinct projects. */
  splitByDeployer?: boolean;
  /** How to identify this project's packages. `packageAddresses` wins over module matchers; `fingerprint` enables auto-discovery of unknown packages by sampling a Move object's fields. */
  match: {
    all?: string[];
    any?: string[];
    exact?: string[];
    minModules?: number;
    /** Exact mainnet package addresses (lowercased on compare). Use when module names are too generic to match reliably. */
    packageAddresses?: string[];
    /** Fingerprint a sample object from the package. All specified fields must match (AND). Enables discovery of new packages deployed by this project. */
    fingerprint?: {
      /** Struct path within the package, e.g. 'nft::NFT'. Sampled type is `<pkg>::<type>`. */
      type: string;
      /** Expected value of the object's `issuer` Move field (lowercased on compare). */
      issuer?: string;
      /** Expected value of the object's `tag` Move field. */
      tag?: string;
    };
  };
}
