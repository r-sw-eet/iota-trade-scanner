// Teaser carousel — 8 stylized mini-renders of the real views.
// Each slide renders an eyebrow, headline, sub, and an inline SVG visual.
// All deterministic — no data imports, everything is hand-tuned so it looks
// polished and magazine-y rather than "mocked up".

const TEASER_SLIDES = [
  // ---------- 1. Network activity heatmap ----------
  {
    eyebrow: "NETWORK · ACTIVITY",
    title: "Every category, every day.",
    sub: "DeFi leads the L1. See the whole network at once.",
    badge: "28-DAY HEATMAP",
    svg: heatmapSvg(),
  },

  // ---------- 2. L1 growth area chart ----------
  {
    eyebrow: "NETWORK · GROWTH",
    title: "Transactions +84% WoW.",
    sub: "L1 Rebased is compounding. The chart redraws across 8 metrics.",
    badge: "LIVE · TXS · 7D",
    svg: areaChartSvg(),
  },

  // ---------- 3. Leaderboard — strongest growth ----------
  {
    eyebrow: "DASHBOARD · LEADERBOARD",
    title: "Who's shipping the fastest?",
    sub: "Ranked by week-over-week growth across any metric you pick.",
    badge: "STRONGEST GROWTH · 7D WOW",
    svg: leaderboardSvg(),
  },

  // ---------- 4. Project detail card ----------
  {
    eyebrow: "PROJECT · ATLAS ESCROW",
    title: "A dossier for every dApp.",
    sub: "KPIs, activity charts, Move modules, deployer attribution.",
    badge: "L1 REBASED",
    svg: projectDetailSvg(),
  },

  // ---------- 5. Team attribution ----------
  {
    eyebrow: "TEAM · ATTRIBUTION",
    title: "Who actually shipped this?",
    sub: "Gold-standard attribution from on-chain deployers + public records.",
    badge: "★ GOLD ATTRIBUTION",
    svg: teamSvg(),
  },

  // ---------- 6. Arena ----------
  {
    eyebrow: "ARENA · HEAD-TO-HEAD",
    title: "Two projects. One metric table.",
    sub: "Compare any pair across 8 metrics. Pick the winner by the numbers.",
    badge: "VERSUS",
    svg: arenaSvg(),
  },

  // ---------- 7. Alerts / watchlists ----------
  {
    eyebrow: "ALERTS · LIVE",
    title: "Watchlists that ping you.",
    sub: "Set thresholds on growth, volume, new deploys. We watch, you build.",
    badge: "3 RULES ACTIVE",
    svg: alertsSvg(),
  },

  // ---------- 8. Category treemap ----------
  {
    eyebrow: "NETWORK · DISTRIBUTION",
    title: "Where the activity lives.",
    sub: "Category share across transactions, wallets, volume — at a glance.",
    badge: "CATEGORY SPLIT",
    svg: treemapSvg(),
  },
];

// ================================================================
// SVG builders — return strings of inline SVG. All use currentColor /
// the CSS var palette (via .viz class definitions) so they swap themes.
// ================================================================

function heatmapSvg() {
  const rows = [
    { lbl: "DeFi",       amp: 1.0, seed: 7  },
    { lbl: "Oracles",    amp: 0.9, seed: 13 },
    { lbl: "NFT",        amp: 0.8, seed: 21 },
    { lbl: "Governance", amp: 0.4, seed: 33 },
    { lbl: "Bridges",    amp: 0.3, seed: 41 },
    { lbl: "Identity",   amp: 0.25,seed: 52 },
  ];
  const cols = 28;
  const cellW = 18, cellH = 20, gap = 3;
  const left = 96, top = 32;
  const totalW = left + cols * (cellW + gap);
  const totalH = top + rows.length * (cellH + gap) + 20;

  let cells = "";
  rows.forEach((r, ri) => {
    // deterministic pseudorandom
    let s = r.seed;
    for (let c = 0; c < cols; c++) {
      s = (s * 9301 + 49297) % 233280;
      const noise = (s / 233280) * 0.7 + 0.3;
      const trend = 0.3 + (c / cols) * 0.8; // slight upward drift
      const v = Math.min(1, r.amp * noise * trend);
      const x = left + c * (cellW + gap);
      const y = top + ri * (cellH + gap);
      const a = Math.max(0.08, v);
      cells += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="3" fill="hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) + 5%) / ${a.toFixed(2)})"/>`;
    }
    cells += `<text x="${left - 12}" y="${top + ri * (cellH + gap) + cellH / 2 + 4}" text-anchor="end" font-size="12" class="tx-head">${r.lbl}</text>`;
  });

  // column scale at bottom
  let scale = "";
  ["28d", "21d", "14d", "7d", "today"].forEach((lbl, i) => {
    const x = left + (i * (cols - 1) / 4) * (cellW + gap) + cellW / 2;
    scale += `<text x="${x}" y="${top + rows.length * (cellH + gap) + 14}" text-anchor="middle" font-size="10" class="muted">${lbl}</text>`;
  });

  return `<svg class="viz" viewBox="0 0 ${totalW} ${totalH}" preserveAspectRatio="xMidYMid meet">
    ${cells}
    ${scale}
  </svg>`;
}

function areaChartSvg() {
  const W = 800, H = 360;
  const padL = 56, padR = 30, padT = 30, padB = 40;
  const n = 28;
  // shape: slow start, accelerate at day 18
  const data = [];
  for (let i = 0; i < n; i++) {
    const base = 12 + i * 1.4;
    const accel = i > 16 ? Math.pow(i - 16, 1.6) * 2.2 : 0;
    const wobble = Math.sin(i * 0.9) * 2.5;
    data.push(base + accel + wobble);
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v) => H - padB - ((v - min) / (max - min)) * (H - padT - padB);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${x(0)},${H - padB} ${pts} ${x(n - 1)},${H - padB}`;

  const yLabels = [max, (max + min) / 2, min].map((v, i) =>
    `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" class="muted">${Math.round(v * 1000).toLocaleString()}</text>
     <line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid-line"/>`
  ).join("");

  const xLabels = ["28d", "21d", "14d", "7d", "today"].map((lbl, i) => {
    const xi = padL + (i / 4) * (W - padL - padR);
    return `<text x="${xi}" y="${H - 16}" text-anchor="middle" font-size="11" class="muted">${lbl}</text>`;
  }).join("");

  return `<svg class="viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="tsAreaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${yLabels}
    <polygon points="${area}" fill="url(#tsAreaFill)"/>
    <polyline points="${pts}" fill="none" stroke="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(n - 1)}" cy="${y(data[n - 1])}" r="5" fill="hsl(var(--accent-h) var(--accent-s) var(--accent-l))"/>
    <circle cx="${x(n - 1)}" cy="${y(data[n - 1])}" r="11" fill="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" opacity="0.25"/>
    ${xLabels}
    <text x="${W - padR - 8}" y="${y(data[n - 1]) - 14}" text-anchor="end" font-size="13" class="tx-head" font-weight="600">${Math.round(data[n - 1] * 1000).toLocaleString()}</text>
  </svg>`;
}

function leaderboardSvg() {
  const items = [
    { rank: 1, name: "Ember Limits",     team: "Ember",          delta: "+880%" },
    { rank: 2, name: "Beacon Bridge",    team: "Beacon Labs",    delta: "+540%" },
    { rank: 3, name: "Kove ID",          team: "Kove",           delta: "+312%" },
    { rank: 4, name: "Halo Veto",        team: "Halo",           delta: "+210%" },
    { rank: 5, name: "Atlas Escrow",     team: "Atlas Labs",     delta: "+142%" },
  ];
  const W = 640, H = 420;
  const rowH = 62;
  const rowGap = 10;
  const top = 56;

  let rows = "";
  items.forEach((it, i) => {
    const y = top + i * (rowH + rowGap);
    rows += `
      <rect x="24" y="${y}" width="${W - 48}" height="${rowH}" rx="10" class="panel-2"/>
      <text x="46" y="${y + 38}" font-size="20" font-weight="600" class="accent" font-family="var(--font-mono)">${it.rank}</text>
      <text x="82" y="${y + 28}" font-size="16" font-weight="600" class="tx-head">${it.name}</text>
      <text x="82" y="${y + 48}" font-size="12" class="muted">${it.team}</text>
      <text x="${W - 46}" y="${y + 38}" text-anchor="end" font-size="18" font-weight="600" fill="hsl(145 55% 60%)" font-family="var(--font-mono)">${it.delta}</text>
    `;
  });

  return `<svg class="viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <text x="24" y="30" font-size="13" class="accent" font-family="var(--font-mono)" letter-spacing="2">🚀 STRONGEST GROWTH · 7D WOW</text>
    ${rows}
  </svg>`;
}

function projectDetailSvg() {
  const W = 720, H = 360;
  // KPI strip
  const kpis = [
    { lb: "CATEGORY", vl: "DeFi" },
    { lb: "TRANSACTIONS · 7D", vl: "11.4k", delta: "+142%" },
    { lb: "TVL", vl: "$12.4M" },
    { lb: "STORAGE COST", vl: "1.8k IOTA" },
  ];
  const kpiW = (W - 48 - 18) / 4;
  let kpiG = "";
  kpis.forEach((k, i) => {
    const x = 24 + i * (kpiW + 6);
    const isPrimary = i === 1;
    kpiG += `
      <rect x="${x}" y="60" width="${kpiW}" height="100" rx="10" fill="${isPrimary ? 'var(--accent-soft)' : 'var(--panel-2)'}" stroke="${isPrimary ? 'var(--accent-ring)' : 'var(--border)'}"/>
      <text x="${x + 14}" y="82" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">${k.lb}</text>
      <text x="${x + 14}" y="118" font-size="24" font-weight="600" class="tx-head" font-family="var(--font-mono)">${k.vl}</text>
      ${k.delta ? `<text x="${x + 14}" y="144" font-size="12" fill="hsl(145 55% 60%)" font-family="var(--font-mono)">${k.delta} WoW</text>` : ""}
    `;
  });

  // mini chart at bottom
  const n = 28;
  const data = [];
  for (let i = 0; i < n; i++) {
    data.push(20 + i * 1.5 + Math.sin(i * 0.6) * 4 + (i > 20 ? (i - 20) * 3 : 0));
  }
  const max = Math.max(...data), min = Math.min(...data);
  const chL = 24, chR = W - 24, chT = 190, chB = H - 30;
  const xf = (i) => chL + (i / (n - 1)) * (chR - chL);
  const yf = (v) => chB - ((v - min) / (max - min)) * (chB - chT);
  const pts = data.map((v, i) => `${xf(i)},${yf(v)}`).join(" ");
  const area = `${xf(0)},${chB} ${pts} ${xf(n - 1)},${chB}`;

  return `<svg class="viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="pdArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="24" y="14" width="36" height="36" rx="8" fill="var(--accent-soft)"/>
    <text x="32" y="39" font-size="15" font-weight="700" class="accent" font-family="var(--font-mono)">AE</text>
    <text x="70" y="30" font-size="18" font-weight="600" class="tx-head">Atlas Escrow</text>
    <text x="70" y="47" font-size="12" class="muted">by Atlas Labs · L1 Rebased</text>
    ${kpiG}
    <text x="24" y="184" font-size="11" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">TRANSACTIONS PER DAY</text>
    <polygon points="${area}" fill="url(#pdArea)"/>
    <polyline points="${pts}" fill="none" stroke="hsl(var(--accent-h) var(--accent-s) var(--accent-l))" stroke-width="1.75" stroke-linejoin="round"/>
    <circle cx="${xf(n - 1)}" cy="${yf(data[n - 1])}" r="3.5" fill="hsl(var(--accent-h) var(--accent-s) var(--accent-l))"/>
  </svg>`;
}

function teamSvg() {
  const W = 720, H = 360;

  // attribution grade pill
  const deployers = [
    "0xA1c4...7f82",
    "0xB8e2...912d",
    "0x47c9...ab11",
  ];
  const projects = [
    { nm: "Atlas Escrow", cat: "DeFi" },
    { nm: "Atlas Stream", cat: "DeFi" },
    { nm: "Atlas Vault",  cat: "DeFi" },
  ];

  let depG = "";
  deployers.forEach((d, i) => {
    const y = 116 + i * 32;
    depG += `
      <rect x="24" y="${y}" width="320" height="24" rx="6" fill="var(--panel-2)" stroke="var(--border)"/>
      <circle cx="38" cy="${y + 12}" r="3" fill="hsl(145 55% 60%)"/>
      <text x="50" y="${y + 16}" font-size="12" class="tx-head" font-family="var(--font-mono)">${d}</text>
      <text x="${24 + 310}" y="${y + 16}" text-anchor="end" font-size="10" class="muted" font-family="var(--font-mono)">MAINNET</text>
    `;
  });

  let projG = "";
  projects.forEach((p, i) => {
    const y = 116 + i * 32;
    projG += `
      <rect x="376" y="${y}" width="320" height="24" rx="6" fill="var(--panel-2)" stroke="var(--border)"/>
      <rect x="388" y="${y + 5}" width="14" height="14" rx="3" fill="var(--accent-soft)"/>
      <text x="410" y="${y + 16}" font-size="12" class="tx-head">${p.nm}</text>
      <text x="${376 + 310}" y="${y + 16}" text-anchor="end" font-size="10" class="muted" font-family="var(--font-mono)">${p.cat}</text>
    `;
  });

  return `<svg class="viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <rect x="24" y="14" width="48" height="48" rx="10" fill="var(--accent-soft)"/>
    <text x="48" y="46" text-anchor="middle" font-size="18" font-weight="700" class="accent" font-family="var(--font-mono)">AL</text>
    <text x="84" y="34" font-size="20" font-weight="600" class="tx-head">Atlas Labs</text>
    <text x="84" y="54" font-size="12" class="muted">DE · 9 members · joined 2024-11</text>
    <rect x="84" y="66" width="168" height="22" rx="11" fill="hsl(42 95% 55% / 0.16)" stroke="hsl(42 95% 55% / 0.4)"/>
    <text x="96" y="81" font-size="11" font-weight="600" fill="hsl(42 95% 55%)" font-family="var(--font-mono)">★ GOLD ATTRIBUTION</text>

    <text x="24" y="108" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">DEPLOYER ADDRESSES</text>
    <text x="376" y="108" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">PROJECTS PUBLISHED</text>
    ${depG}
    ${projG}

    <text x="24" y="330" font-size="11" class="muted" font-family="var(--font-mono)">AUDITED BY MOVEBIT · PUBLIC DOCS</text>
  </svg>`;
}

function arenaSvg() {
  const W = 720, H = 360;
  const metrics = [
    { lbl: "Transactions", l: "11.4k",  r: "62.1k", w: "R" },
    { lbl: "Wallets",      l: "24.8k",  r: "9.1k",  w: "L" },
    { lbl: "Volume (7d)",  l: "$12.4M", r: "$4.6M", w: "L" },
    { lbl: "Growth WoW",   l: "+142%",  r: "+88%",  w: "L" },
    { lbl: "TVL",          l: "$12.4M", r: "—",     w: "L" },
  ];

  // headers
  let header = `
    <rect x="24" y="20" width="${W - 48}" height="56" rx="10" fill="var(--panel-2)" stroke="var(--border)"/>
    <text x="40" y="54" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">METRIC</text>
    <text x="280" y="54" text-anchor="middle" font-size="15" font-weight="600" fill="hsl(42 95% 55%)">Atlas Escrow</text>
    <text x="280" y="68" text-anchor="middle" font-size="10" class="muted" font-family="var(--font-mono)">ATLAS LABS</text>
    <text x="${W - 280}" y="54" text-anchor="middle" font-size="15" font-weight="600" fill="hsl(175 70% 55%)">Lantern Oracle</text>
    <text x="${W - 280}" y="68" text-anchor="middle" font-size="10" class="muted" font-family="var(--font-mono)">LANTERN NETWORK</text>
    <line x1="200" y1="20" x2="200" y2="76" stroke="var(--border)"/>
    <line x1="${W - 200}" y1="20" x2="${W - 200}" y2="76" stroke="var(--border)"/>
  `;

  let rows = "";
  metrics.forEach((m, i) => {
    const y = 90 + i * 48;
    const lWin = m.w === "L";
    rows += `
      <line x1="24" x2="${W - 24}" y1="${y + 44}" y2="${y + 44}" stroke="var(--border)"/>
      <text x="40" y="${y + 28}" font-size="13" class="tx-head">${m.lbl}</text>
      <text x="280" y="${y + 28}" text-anchor="middle" font-size="16" font-weight="${lWin ? '600' : '500'}" font-family="var(--font-mono)" fill="${lWin ? 'hsl(42 95% 55%)' : 'var(--text-dim)'}">${m.l}</text>
      <text x="${W - 280}" y="${y + 28}" text-anchor="middle" font-size="16" font-weight="${!lWin ? '600' : '500'}" font-family="var(--font-mono)" fill="${!lWin ? 'hsl(175 70% 55%)' : 'var(--text-dim)'}">${m.r}</text>
      ${lWin
        ? `<circle cx="232" cy="${y + 24}" r="4" fill="hsl(42 95% 55%)"/>`
        : `<circle cx="${W - 232}" cy="${y + 24}" r="4" fill="hsl(175 70% 55%)"/>`}
    `;
  });

  return `<svg class="viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${header}
    ${rows}
  </svg>`;
}

function alertsSvg() {
  const W = 720, H = 360;
  const rules = [
    { nm: "Ember Limits growth > 200%",    when: "fired 2h ago",   st: "on"  },
    { nm: "Atlas Escrow TVL drops > 10%",   when: "watching",        st: "on"  },
    { nm: "Any new audited team on L1",     when: "watching",        st: "on"  },
    { nm: "Beacon Bridge volume > $5M/d",   when: "paused",          st: "off" },
  ];

  let ruleG = "";
  rules.forEach((r, i) => {
    const y = 84 + i * 56;
    const on = r.st === "on";
    ruleG += `
      <rect x="24" y="${y}" width="${W - 48}" height="44" rx="10" fill="var(--panel-2)" stroke="var(--border)"/>
      <circle cx="46" cy="${y + 22}" r="6" fill="${on ? 'hsl(145 55% 55%)' : 'var(--text-mute)'}"/>
      ${on ? `<circle cx="46" cy="${y + 22}" r="6" fill="hsl(145 55% 55%)" opacity="0.35"><animate attributeName="r" from="6" to="14" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.35" to="0" dur="1.4s" repeatCount="indefinite"/></circle>` : ""}
      <text x="62" y="${y + 20}" font-size="13" font-weight="600" class="tx-head">${r.nm}</text>
      <text x="62" y="${y + 36}" font-size="11" class="muted" font-family="var(--font-mono)">${r.when.toUpperCase()}</text>
      <text x="${W - 36}" y="${y + 28}" text-anchor="end" font-size="11" font-family="var(--font-mono)" fill="${on ? 'hsl(42 95% 55%)' : 'var(--text-mute)'}">${r.st.toUpperCase()}</text>
    `;
  });

  // stats header
  const stats = `
    <rect x="24" y="20" width="${W - 48}" height="48" rx="10" fill="var(--panel-2)" stroke="var(--border)"/>
    <text x="44"  y="42" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">ACTIVE</text>
    <text x="44"  y="60" font-size="18" font-weight="600" class="accent" font-family="var(--font-mono)">3</text>
    <text x="150" y="42" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">FIRED · 7D</text>
    <text x="150" y="60" font-size="18" font-weight="600" class="tx-head" font-family="var(--font-mono)">12</text>
    <text x="290" y="42" font-size="10" class="muted" font-family="var(--font-mono)" letter-spacing="1.5">UNREAD</text>
    <text x="290" y="60" font-size="18" font-weight="600" class="accent" font-family="var(--font-mono)">2</text>
  `;
  return `<svg class="viz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${stats}
    ${ruleG}
  </svg>`;
}

function treemapSvg() {
  // Single-hue heatmap treemap — darkness = share of activity.
  // Stock/crypto-market convention: size AND color both encode magnitude; no
  // category-coded rainbow.
  const W = 720, H = 360;
  const cells = [
    { lbl: "DeFi",       pct: 28, x: 24,  y: 24,  w: 260, h: 220 },
    { lbl: "Trade",      pct: 12, x: 292, y: 24,  w: 112, h: 220 },
    { lbl: "NFT",        pct: 22, x: 412, y: 24,  w: 284, h: 130 },
    { lbl: "Oracles",    pct: 14, x: 412, y: 162, w: 180, h: 82  },
    { lbl: "Governance", pct:  8, x: 600, y: 162, w: 96,  h: 82  },
    { lbl: "Bridges",    pct:  6, x: 24,  y: 252, w: 200, h: 84  },
    { lbl: "Identity",   pct:  5, x: 232, y: 252, w: 180, h: 84  },
    { lbl: "Infra",      pct:  3, x: 420, y: 252, w: 150, h: 84  },
    { lbl: "Utilities",  pct:  2, x: 578, y: 252, w: 118, h: 84  },
  ];
  const maxPct = Math.max(...cells.map(c => c.pct));
  // Amber accent, single hue. Map share → fill opacity (0.10 → 0.55).
  const fillOpacity = (pct) => {
    const t = pct / maxPct;                  // 0..1
    return (0.10 + Math.pow(t, 0.75) * 0.45).toFixed(3);
  };
  // Labels: darker cells get near-black text, lighter cells get the accent.
  const textFill = (pct) => (pct / maxPct > 0.45 ? "#1a1205" : "hsl(42 90% 62%)");
  const subFill  = (pct) => (pct / maxPct > 0.45 ? "rgba(26,18,5,0.75)" : "hsl(42 70% 70%)");

  let g = "";
  cells.forEach(c => {
    const fo = fillOpacity(c.pct);
    const tf = textFill(c.pct);
    const sf = subFill(c.pct);
    const showLabel = c.w >= 90 && c.h >= 50;
    const showPct   = c.w >= 60 && c.h >= 36;
    g += `
      <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="8"
            fill="hsl(42 95% 55%)" fill-opacity="${fo}"
            stroke="hsl(42 95% 55%)" stroke-opacity="0.45" stroke-width="1"/>
    `;
    if (showLabel) {
      g += `
        <text x="${c.x + 14}" y="${c.y + 26}" font-size="14" font-weight="600" fill="${tf}">${c.lbl}</text>
        <text x="${c.x + 14}" y="${c.y + 52}" font-size="22" font-weight="600" fill="${tf}" font-family="var(--font-mono)">${c.pct}%</text>
      `;
    } else if (showPct) {
      g += `
        <text x="${c.x + c.w/2}" y="${c.y + c.h/2 - 2}" font-size="12" font-weight="600" fill="${tf}" text-anchor="middle">${c.lbl}</text>
        <text x="${c.x + c.w/2}" y="${c.y + c.h/2 + 14}" font-size="12" font-weight="600" fill="${sf}" text-anchor="middle" font-family="var(--font-mono)">${c.pct}%</text>
      `;
    }
  });

  // Legend: LOW ▭▭▭▭▭ HIGH
  const legendSteps = 6;
  const legX = W - 24 - legendSteps * 18;
  const legY = H - 18;
  let legend = `
    <text x="${legX - 8}" y="${legY + 9}" font-size="10" fill="hsl(42 35% 55%)" text-anchor="end" font-family="var(--font-mono)" letter-spacing="0.08em">LOW</text>
  `;
  for (let i = 0; i < legendSteps; i++) {
    const t = (i + 1) / legendSteps;
    const fo = (0.10 + Math.pow(t, 0.75) * 0.45).toFixed(3);
    legend += `<rect x="${legX + i * 18}" y="${legY}" width="14" height="10" rx="2" fill="hsl(42 95% 55%)" fill-opacity="${fo}" stroke="hsl(42 95% 55%)" stroke-opacity="0.4"/>`;
  }
  legend += `<text x="${legX + legendSteps * 18 + 4}" y="${legY + 9}" font-size="10" fill="hsl(42 35% 55%)" font-family="var(--font-mono)" letter-spacing="0.08em">HIGH</text>`;

  return `<svg class="viz" viewBox="0 0 ${W} ${H + 8}" preserveAspectRatio="xMidYMid meet">${g}${legend}</svg>`;
}

window.TEASER_SLIDES = TEASER_SLIDES;
