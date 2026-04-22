import { ProjectDefinition } from '../project.interface';

/**
 * Genesis-installed legacy token packages migrated from the pre-Rebased IOTA
 * network (Stardust era) to Rebased mainnet. Each one is a one-module package
 * publishing the canonical IOTA coin-witness pattern (lowercase-ticker module
 * containing an uppercase-ticker struct with only `drop` ability), with
 * `previousTransactionBlock.sender: null` because they were installed at
 * Rebased genesis rather than deployed by a regular user.
 *
 * Matched via explicit `packageAddresses` (79 entries) because the scanner
 * skip-rule at `ecosystem.service.ts` filters low-hex / null-deployer
 * packages from generic matching to prevent `0x1` / `0x2` / `0x3` framework
 * collisions — the escape hatch is `claimedAddresses` (built from
 * `packageAddresses` entries across all defs). Listing them here trips that
 * escape hatch so they attribute cleanly to IOTA Foundation (who performed
 * the genesis ceremony and installed these tokens).
 */
export const stardustMigratedTokens: ProjectDefinition = {
  name: 'Stardust Migrated Tokens',
  layer: 'L1',
  category: 'Infrastructure',
  subcategory: 'Chain Primitive',
  description: 'Legacy native tokens migrated from the pre-Rebased IOTA network (Stardust era) into Rebased mainnet as genesis-installed Move packages. 79 packages spanning 64 distinct tickers — BTC×5, T×5, KATZO×4, plus 60 singletons including `monke`, `katzo`, `magic`, `chips`, `idota`, `ape`, `xau`, `love`, `heart`, plus anonymous foundry-issued tokens (`foundry_*`). Each package ships one module (lowercase ticker) containing one witness struct (uppercase ticker, `drop` ability) — the canonical IOTA coin-type pattern. IF-installed at Rebased genesis.',
  urls: [
    { label: 'Rebased Genesis Ceremony', href: 'https://blog.iota.org/rebased-mainnet-upgrade/' },
  ],
  teamId: 'iota-foundation',
  match: {
    packageAddresses: [
    "0x01b6210b273970dc2b18276edafe07aaf79b14fdd29f4f7fad0606bd9ecbd145",
    "0x038ff2c919ca134d18cbad1b1abfc54093be02741d4bf0fcb3eed2312eeb0fbe",
    "0x03c15eca26a586299bd6d0a564388592e56a0cf757d65bcc0c8f2fbca559b2a1",
    "0x03d67aff47d0318b8f1cea435b93755241f6b5a1ee749507c389cf0262ba3310",
    "0x044bbb8bd22e772999aa59ef48f116ded0cbf17d4f6828dd68dffac64eebd9e9",
    "0x0d2f069eedf8f051ed6d2f90f1fd70fbb373907098da4bd29b3c1cc63c234d3a",
    "0x0d9f29a11c337961f22c56b178dcb0dadd9232b18218a19524db9c13c620450c",
    "0x1032c97e5c1d74bb604815c38d2908d81d74ec52514b356aa6ff1373ec3d2d17",
    "0x11bd79190d1b30018d3672d99eef4cce8a0b04f16c7398851d5be21c958f75b5",
    "0x135e4cc50a899552cad78eb041736d5d74dadc17d7c99cb5fa652603bafcfaa3",
    "0x13d76965cb1b6e9d883ed128c4e1b59df20d95b2bb3b0960d21e15fd0579dbb3",
    "0x1a1b4769883bf1a1ed4b70f30ce62cdab9de3d403e251aa4af7b032688f622c9",
    "0x2010d79e5a186e91e4c6bdfeb2665415a29749397c0fc0a8ed4065f540023083",
    "0x233afbece2be14cba521268dd08b8616fffe6b253ed33da1c6a9398bdb625bfc",
    "0x2a6438c35e4cefb53e298e75008ab5b74e68b16a3b340fe823a55c1b71bdc5e5",
    "0x315c6185974c5e8705ec3a9a9d01e6e64a670379345b8e0a5eb1c55c93c662aa",
    "0x328ab20a9ee3fa3018a67d688b0e470467d02dee28efad4bcd24f61ca1e2c12f",
    "0x382e07914090a9939ee456980a00f336d6569045da9dfa89bbf859d653153d5a",
    "0x3b0ff132cfd45d8157e9f673c97fba0acd5ab459ef847203d3629c854be47572",
    "0x3b21b1459a8b0ba79dd4542b1ac12f5f6a5dc17189b3d6d5f31e1d3659beea34",
    "0x3cad4e2c275a3853fa534a5979dc52033047af06ff39638a05fecd557faeb0c1",
    "0x45f20f8f7111ff4c035ac58a01673d2e319611f0b28866235b6eae40acae94d6",
    "0x49baadcb29843f1a690455946bbd243eb9d707e4253d6230b94afe5db7ac69c0",
    "0x4ec908029cd6e8a2e08e7e9b13476ce5a6e92f5f82a0f80d1bd2c765238aeeea",
    "0x59899b2f9b07610a89678e7f705f4c676bed947f63717fe8423905a75b6744a3",
    "0x5b11e6db6f174ccb8a515e42bb5bbad2eb726b6fdbcbc83d7903b60772d77f35",
    "0x6779546f8c6c2dc33378b4a4256af3a937de3ffa23177a8169f6ce4c88d9ef39",
    "0x6882dbe35ee9744ec92e9a8aecdcf936006ab110a8208d36be5f8ded25967a7d",
    "0x6af1002e9693764e59cd172194d63b753a01e6d33b5607578353957715c815a9",
    "0x7154754cca94536f1c17c22b915bb2801df498433ed985453da721d3aa7cf6fd",
    "0x73e17ca3f0e557374ba71ac178f8028259b634aad5fb41376f3960ff79122d11",
    "0x752e4f4d6f07b712d56cd7f97175fcfdb3ca850ea59dee242c923975edb762ca",
    "0x7668bd2c3443a7a09ea55c3335ec4b8cbfc36bf502b41e13ab17b10a414d89e7",
    "0x7712a09c719f4e6eef589ef65d93b4d26d301815e17d0bc840911728ebc1a373",
    "0x7aa121e18020e3620fce967662ea6edcc07a10dbd810f36e1fa911fb43964cf4",
    "0x7cf0467bfef6984b312426bb5bb6f2576192a76df8e313224c011034a25df005",
    "0x7eb0362ad9477d81a3797fa78c2b62db6b006a91283795f467be21234e5fab9c",
    "0x834b22b77d6614a9cc83ad038d29641015e3f2ee9787a0208acfdc42505e8c2d",
    "0x85150517c129b9ce30f6fd1686da0a65e17b42c84419c81879c6fc9814ba8b70",
    "0x85a432f17ee380cc60b22a6c0f258d41d9455375eddc922ccb03dc6c931b3a30",
    "0x87f92cac71fcfdde917d9a80e8b197bd755871127c63792fae4042458b1a8e3c",
    "0x8aa3ce9018b33dd2c4bab513a0afd78778eb6181664b5e3b694cbc83191c0ea3",
    "0x8c9aea78112c8d0a1736d592794df9dc3e67c6a9f6cdc37d5a7d79d08f347c50",
    "0x94184d9ef4bbb699f07d4301df9bb04e3ef6d973b91b70f677aed7571beb2f5c",
    "0x95d0e7e057af7f8ff2865b3ab5c7a765d6e408defed29da724c84f54b2f4a6db",
    "0x9865565418e4240c5af170936d3495b3906a6e5cccb90b04255670ffec6daf57",
    "0x992897e088dac18f10bb95aa60782dcf0c61e05a8503e71280795494593379fd",
    "0x9e8e7a6f862b69d3eedbd06ed28fbc88344f5e377d5ef7d125ff4ffb4a94a713",
    "0xa48606ff2c8b2c843a4623f20ee1283fe9afa6c8084e8ea083bc889ddeb1197d",
    "0xaac8131e350d6cd2e3dc284b0f325218b3afa7a1adde7bcc3adc2629d69256c2",
    "0xacda7c28e5da13dc708b7cb6625dfde809025aa26b3f15f03b798d64f09a1dd8",
    "0xb0965c82418d1e6d082cf127f3777b645734c686e828544ad9162fa22ed1bdb9",
    "0xb0d81d1e7efd71cc540eae2d6a48de211271e751f7a2dbb39b556537564bae41",
    "0xb3ab844705d22b1ed90f93286735d3632bac673ae14b4210ff13947c6df8ef00",
    "0xb3d9b02ae559b4255f4324b5d1bbb4daee0d9599919b1a9a502267146509c64f",
    "0xb70f2ffc14c8d2a9fc8b6dcef37e0e0b90973246c77e0211cf1835f80aea58e5",
    "0xb904d17678345e1993fcfa8fc9fd18c097331be92b7871130fcbc76aa5104f74",
    "0xb9d1032667cb31480ce4916ed27adda7a296747fdd8e061d7e6aee77dadfbe44",
    "0xbd76c4d6064caa39329580d6b5f42ab01b11fd857c38d6519ab44970b34fb06f",
    "0xc166f70d6236a68b6ce5f5da91d04d9589c8af9942a44ec59b8f159fa0f2e214",
    "0xc327b9ba88839baeb529b0250cd0322be09bccc562ed9ae09dc6f801cf0cdb52",
    "0xc4d4a92b378029fb3c34f6416176fef3f5a7f4e30db4e4184d9289a827ac3955",
    "0xc65bdaabd6538170f983eb4b947b1a805cdd264ed45c66a69bac00bf18cbff63",
    "0xc6bea37754d78c86587096f543b9e94c3f930b57f6a6a71861f3b609d35f84a3",
    "0xc726ce4ac1317928b611cd2c0e86d352f089180ae89fe178e04a869e915d38bc",
    "0xc7685fb25e87649f0344aafaf0b802fa52f3c961bf3c7bac95676e83af7a0f13",
    "0xd42f52d641057341cbe7bcd4ab69e4e3dc91309d61b1773db4f96f2b2a547924",
    "0xd6eda59c9891925ed0c5825a86cd46b892a374dace56db569ae76f4846a941fd",
    "0xd95908801346b4290f7389d940c115db9dc4f54c5da0c81ca64753af9e344acc",
    "0xe1e504ad9108e85a4db817b023015da968b7dd621530ec50f245dc509be63f68",
    "0xe51256a06691cc707273c8861a8f6716f9c031d25a9065ca71cfcca701abeef0",
    "0xe579bdd58e567c7bbd8310c01f89413afb88ccbe3f59062ea7b50ade4f2ffe02",
    "0xeaa3fef37417aa39b7a3f82d3642ab885741f5004d7b7ac97459c7e4b9a793da",
    "0xec8facd85e56b3a627463f9dd5ec0f0fc7437f22e513c4feedbfe4607c4c7100",
    "0xf18a4c008bc70ac02a4f37559199446a4d636b7f5a1b944ddc6ed4ac5d6f1e96",
    "0xf18af69f6ff6afaaaee8526919409507a84f317a3d5e3e19e507ed0c8074e5a2",
    "0xf59811d1d40c3fc390b7c8a845f5f2a1d9c58ce861ff5b93f3cb36885ec3853e",
    "0xf9616ea95cc818521b95d578315e22498b41f206be3d5fd4081be7c6ae1ff114",
    "0xfa69281bce6f36d9c74020828d0bdb8c1203005ed4e6add81e7b59f024752666"
    ],
  },
  attribution: `
79 genesis-installed legacy-token packages migrated from pre-Rebased IOTA at the 2025-05-05 Rebased mainnet launch. Each package has a single one-module signature where the module name is the lowercase ticker (e.g. \`btc\`, \`monke\`, \`katzo\`) containing a single witness struct named TICKER (uppercase, \`drop\` ability) — the canonical IOTA coin-type one-time-witness pattern used to mint a \`Coin<pkg::ticker::TICKER>\` of the corresponding type.

All 79 have \`previousTransactionBlock.sender: null\`, confirming they were installed at genesis rather than deployed by a regular user. The Rebased genesis ceremony was conducted by the IOTA Foundation and 12 initial validators (per \`blog.iota.org/rebased-mainnet-upgrade/\`) — legacy Stardust tokens were re-materialized into Move packages at this ceremony.

**Ticker distribution** (counts > 1 indicate multiple Stardust foundries issued the same ticker, materialized as separate packages on Rebased):
- **btc × 5**, **t × 5**, **katzo × 4** — most-popular legacy tickers with multiple independent issuances
- **iq × 2, sdv × 2, tst × 2, zipp × 2** — pair issuances
- **60 singletons**, including: alf, alv, ape, bon, chips, cpl, cuppy, dj, emosi, euml, fel, final, foundry_kggmwzv, foundry_kpsyf2h, foundry_lj64b3d, foundry_r2yadjm, foundry_wsqav6s, foundry_y1ti9yf, ft, genx, ger, gns, hab, hans, heart, house, hpy, icc, idota, iotas, joc, love, magic, monke, mrns, nbc, njk, no5, nxs, ock, ptt, rdg, snk, spig, sqd, steto, stnd, t2, t3, test, tfnb, tok, toke, tpt, tud, xau, z0l

The six \`foundry_*\` tickers are Stardust-era anonymous foundry tokens whose original issuer chose no branded ticker — they're migrated with a synthetic \`foundry_<suffix>\` module name.

**Why \`packageAddresses\` with 79 entries rather than a fingerprint or module rule:** the scanner skip-rule in \`ecosystem.service.ts\` filters packages that start with 60 leading zeros unless explicitly claimed via \`packageAddresses\`. But these 79 packages actually have regular (non-low-hex) addresses; the reason they were unattributed is that their \`(null deployer + single-module)\` shape doesn't match any generic rule. Other migration artifacts whose addresses DO start with 60 zeros (the Stardust framework package \`0x107a\` and the three base framework packages \`0x1\` / \`0x2\` / \`0x3\`) are managed separately — see the \`iota-foundation\` team attribution for the chain-primitives note.

Team: \`iota-foundation\`. \`isCollectible: false\` — coin-type packages, not NFTs.

**Activity expectation:** most of these 79 tokens are legacy dormant migrations — the pre-Rebased Stardust ecosystem had many tokens that never saw meaningful Rebased-era use. They stay attributed here as one historical row regardless of whether any specific ticker is still transacting: the point of the row is to surface the migration footprint on the dashboard rather than track current activity. A few tickers (e.g. \`iotas\`, \`monke\`, \`magic\`, \`love\`) may see residual use; most won't. Aggregate event count for this row will be low — that's correct, not a bug. If residual activity ever concentrates around a specific ticker (e.g. one of the \`btc\` or \`t\` migrations re-becomes a live project), that ticker can be split out into its own project def at that point.

**Maintenance:** if IOTA ever performs another migration wave, new Stardust-token packages would need to be appended to this list manually. The 79 here were enumerated on 2026-04-19 by walking \`packages(first: 50)\` against \`graphql.mainnet.iota.cafe\` and filtering to \`previousTransactionBlock.sender: null\` + single-module. Re-run the enumeration to refresh.
  `.trim(),
};
