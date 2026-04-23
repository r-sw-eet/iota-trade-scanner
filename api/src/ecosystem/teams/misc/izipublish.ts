import { Team } from '../team.interface';

export const izipublish: Team = {
  id: 'izipublish',
  name: 'izipublish',
  description: 'IOTA Data Publishing dApp — on-chain data-publishing framework on IOTA Rebased. Provides hierarchical Containers, versioned DataItems, multi-owner permissions, and a publish-to-external-domain flow. Live demo at cars.izipublish.com for automotive maintenance records. Current mainnet deployment is small-scale (3 containers, 3 DataItems at the active upgrade version), likely pilot stage.',
  urls: [
    { label: 'Website', href: 'https://izipublish.com' },
    { label: 'Cars demo', href: 'https://cars.izipublish.com' },
  ],
  deployers: [
    { address: '0x0dce85b04ae7d67de5c6785f329aac1c429cd9321724d64ba5961d347575db97', network: 'mainnet' },
    { address: '0x7c33d09b7b6ddbfed32bd945caae96719ae07f68863d8614c4d96d6d320af429', network: 'mainnet' },
  ],
  logo: '/logos/izipublish.png',
  attribution: `
Previously registered as "Easy Publish" based only on the module name. Resolved 2026-04-17 via object-probe: sampled live objects of every struct type declared by the \`easy_publish\` module (Container, DataItem, ContainerChain, DataItemChain, ChainInit, Creator, etc.) across all 5 upgrade versions of the package. Found live usage on the middle version \`0xb0927f142487c66708ec3cf978dbe45da94ccede7944de7a13889efa01f7dc67\`:

- 3 \`Container\` objects (one named "Genesis Container 1")
- 3 \`DataItem\` objects
- Plus \`ChainInit\`, \`ContainerChain\`, \`DataItemChain\` registry objects.

Inspected DataItem fields. The \`content\` field of two DataItems contains JSON with a **\`targets\` list specifying a domain to publish to**:

\`\`\`
name: Year 2025 Maintenance
content: {"easy_publish":{"publish":{"targets":[{"domain":"cars.izipublish.com","base_url":"https://cars.izipublish.com","enabled":true}]}, "cars":{"maintenance":...}}}
description: First year maintenance.
creator.creator_addr: 0x7c33d09b7b6ddbfed32bd945caae96719ae07f68863d8614c4d96d6d320af429

name: Maintenance april 2026
content: {"easy_publish":{"publish":{"targets":[{"domain":"cars.izipublish.com",...}]}},"cars":{"maintenance":...}}
creator.creator_addr: 0x7c33d09b7b6ddbfed32bd945caae96719ae07f68863d8614c4d96d6d320af429
\`\`\`

The domain \`cars.izipublish.com\` resolves to a live IOTA Data Publishing dApp. The parent site \`izipublish.com\` has the page title "IOTA Data Publishing dApp | On-Chain Data & Verification" — confirming the product.

**Product architecture** — framework + dApp pair:
- **Move framework (\`easy_publish\` module):** on-chain primitives for hierarchical data containers, versioned data items, multi-owner permissions, and event-audit trails. 19 functions, 20 structs (Container / ContainerAudit / ContainerChain / ContainerChildLink / ContainerPermission / Creator / DataItem / DataItemChain / DataItemPublishedEvent / etc.). The legacy module name \`easy_publish\` is literal branding ("easily publish structured data on-chain") — not a Move-package publisher.
- **Web dApp (izipublish.com):** reads the on-chain data and renders it via domain-targeted publishing. Each DataItem specifies which target domain(s) are authorized to render.
- **Demo (cars.izipublish.com):** car maintenance records — each event a DataItem anchored on-chain with a DataType schema.

**Addresses involved:**
- **Deployer (Move packages):** \`0x0dce85b04ae7d67de5c6785f329aac1c429cd9321724d64ba5961d347575db97\` — ships the 5 upgrade versions of the framework.
- **Publisher / container creator:** \`0x7c33d09b7b6ddbfed32bd945caae96719ae07f68863d8614c4d96d6d320af429\` — calls the public framework functions to create Containers and publish DataItems.

Both serve izipublish: the deployer runs the framework, the publisher creates content.

Triangulation:
- [x] DataItem content literally names \`cars.izipublish.com\` as a publishing target.
- [x] \`izipublish.com\` publicly runs an "IOTA Data Publishing dApp" (site title confirms).
- [x] The \`cars.izipublish.com\` subdomain matches the demo use case visible on-chain.
- [x] Module framework design matches the product's purpose.
- [x] Only one deployer on IOTA mainnet ships an \`easy_publish\` module.
`.trim(),
};
