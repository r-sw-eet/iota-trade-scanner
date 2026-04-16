export interface Team {
  /** Stable slug, e.g. 'iota-foundation-identity'. Referenced by ProjectDefinition.teamId. */
  id: string;
  /** Human-readable name shown on the website. */
  name: string;
  description?: string;
  urls?: { label: string; href: string }[];
  /** Mainnet addresses known to publish packages for this team (lowercased on compare). */
  deployers: string[];
  /** Absolute public path to the team logo (e.g. `/logos/virtue.svg`). Inherited by every project on this team unless the project overrides via `ProjectDefinition.logo`. */
  logo?: string;
}
