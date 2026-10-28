/* =========================================================================
   Lumen — personal finance dashboard (vanilla JS, no dependencies)

   Sections
     1. Content & settings   ← edit names, merchants, budgets and goals here
     2. Helpers
     3. Data generation      (deterministic: same seed → same data every load)
     4. State & persistence
     5. Overview             (KPIs, cash-flow chart, donut, bills, recent)
     6. Transactions
     7. Budgets
     8. Goals
     9. Shell                (router, month picker, search, theme, keyboard)
   ========================================================================= */
(() => {
  'use strict';

  /* ======================= 1. Content & settings ======================= */

  const USER = { first: 'Nora' };
  const TODAY = new Date(2026, 9, 28);   // fixed "today" so the demo never changes
  const SEED = 1028;
  const MONTHS_BACK = 12;                 // Nov 2025 → Oct 2026
  const PAGE_SIZE = 14;

  const CATEGORIES = [
    { id: 'housing',       name: 'Housing',       color: 'var(--c-housing)' },
    { id: 'groceries',     name: 'Groceries',     color: 'var(--c-groceries)' },
    { id: 'dining',        name: 'Dining',        color: 'var(--c-dining)' },
    { id: 'transport',     name: 'Transport',     color: 'var(--c-transport)' },
    { id: 'utilities',     name: 'Utilities',     color: 'var(--c-utilities)' },
    { id: 'subscriptions', name: 'Subscriptions', color: 'var(--c-subscriptions)' },
    { id: 'shopping',      name: 'Shopping',      color: 'var(--c-shopping)' },
    { id: 'health',        name: 'Health',        color: 'var(--c-health)' },
    { id: 'leisure',       name: 'Travel & fun',  color: 'var(--c-leisure)' },
  ];
  const INCOME = { id: 'income', name: 'Income', color: 'var(--c-income)' };

  /* Recurring bills: [day of month, merchant, category, amount, account, varies?] */
  const RECURRING = [
    [1,  'Larkspur Residences',   'housing',       2150,  'Checking', false, 'Rent'],
    [1,  'Hearthstone Insurance', 'housing',       18.5,  'Checking', false, 'Renters insurance'],
    [1,  'Metro Transit',         'transport',     98,    'Aster Card', false, 'Monthly pass'],
    [2,  'Pulse Fitness',         'health',        49,    'Aster Card', false, 'Membership'],
    [3,  'Streamline TV',         'subscriptions', 15.99, 'Aster Card', false, 'Streaming'],
    [6,  'Cascade Power',         'utilities',     84,    'Checking', true,  'Electricity'],
    [9,  'Fibrely Internet',      'utilities',     65,    'Checking', false, 'Fiber 500'],
    [11, 'Tonal Music',           'subscriptions', 10.99, 'Aster Card', false, 'Music'],
    [12, 'Orbit Mobile',          'utilities',     45,    'Checking', false, 'Phone plan'],
    [16, 'Draftboard Pro',        'subscriptions', 12,    'Aster Card', false, 'Design tools'],
    [18, 'Clearwater Water',      'utilities',     40,    'Checking', true,  'Water & sewer'],
    [20, 'Cloudnest Storage',     'subscriptions', 2.99,  'Aster Card', false, 'Cloud storage'],
    [29, 'Inkwell Daily',         'subscriptions', 8,     'Aster Card', false, 'News'],
  ];

  /* Everyday spending: merchants with [name, min, max] and how often they appear */
  const VARIABLE = {
    groceries: { every: [3, 6],  merchants: [['Greenleaf Market', 38, 152], ['Harbor Foods Co-op', 26, 118], ['Daily Basket', 12, 46]] },
    dining:    { count: [10, 16], merchants: [['Kettle & Crumb', 4.5, 9.5], ['Saffron & Salt', 36, 98], ['Noodle Bar 88', 16, 38], ['Little Fig Bakery', 7, 24], ['Tidewater Oyster Co.', 62, 148], ['Verde Taqueria', 13, 31]] },
    transport: { count: [2, 5],  merchants: [['Zipp Rides', 9, 31], ['Zipp Rides', 11, 27], ['Spoke & Chain Bikes', 18, 74]] },
    shopping:  { count: [2, 4],  merchants: [['Arden Outfitters', 48, 196], ['Paperleaf Books', 14, 46], ['Homegood Supply', 22, 118], ['Fieldnote Stationers', 8, 32]] },
    health:    { count: [1, 2],  merchants: [['Clearview Pharmacy', 11, 46]] },
    leisure:   { count: [1, 3],  merchants: [['Marquee Cinemas', 15, 34], ['Ticketfold', 48, 126], ['Gallery Nine', 16, 24], ['Lanes & Lager', 22, 58]] },
  };

  /* One-off purchases that give the year its story: [yyyy-mm, day, merchant, category, amount] */
  const ONE_OFFS = [
    ['2025-12', 6,  'Wren & Willow Gifts', 'shopping', 214.3],
    ['2025-12', 19, 'Coastline Rail',      'leisure',  142.6],
    ['2026-02', 17, 'Brightsmile Dental',  'health',   140],
    ['2026-03', 22, 'Ticketfold',          'leisure',  164],
    ['2026-06', 4,  'Skyway Air',          'leisure',  684.2],
    ['2026-06', 20, 'Harborview Hotel',    'leisure',  912.4],
    ['2026-08', 14, 'Pinecrest Cabins',    'leisure',  418],
    ['2026-08', 26, 'Brightsmile Dental',  'health',   140],
    ['2026-09', 9,  'Circuit & Co.',       'shopping', 349],
    ['2026-10', 17, 'Tidewater Oyster Co.', 'dining',  132.8],
    ['2026-10', 21, 'Arden Outfitters',    'shopping', 168.5],
  ];

  const DEFAULT_BUDGETS = {
    housing: 2400, groceries: 600, dining: 420, transport: 200, utilities: 260,
    subscriptions: 60, shopping: 380, health: 120, leisure: 220,
  };

  const DEFAULT_GOALS = [
    { id: 'emergency', name: 'Emergency fund',    note: 'Six months of essentials', target: 25000, saved: 18400, due: [2027, 2], color: 'var(--accent-line)',    log: [450, '2026-10-15'] },
    { id: 'kyoto',     name: 'Kyoto in spring',   note: 'Two weeks, cherry blossom season', target: 6000, saved: 3120, due: [2027, 3], color: 'var(--secondary)', log: [250, '2026-10-12'] },
    { id: 'camera',    name: 'Mirrorless camera', note: 'Body plus a 35mm prime', target: 2400, saved: 1785, due: [2026, 11], color: 'var(--c-dining)',  log: [100, '2026-10-02'] },
    { id: 'home',      name: 'Home down payment', note: '20% on a two-bedroom', target: 60000, saved: 14250, due: [2029, 5], color: 'var(--c-transport)', log: [600, '2026-10-01'] },
  ];

  const ACCOUNTS_META = [
    { key: 'checking',  name: 'Checking',    sub: 'Northbank ··4821',     color: 'var(--c-transport)' },
    { key: 'savings',   name: 'Savings',     sub: 'Meridian ··0937', color: 'var(--accent-line)' },
    { key: 'brokerage', name: 'Brokerage',   sub: 'Fieldstone Invest',    color: 'var(--secondary)' },
    { key: 'card',      name: 'Credit card', sub: 'Aster Card ··2290',    color: 'var(--c-dining)' },
  ];

  /* ============================ 2. Helpers ============================ */

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sum = (arr, f = (x) => x) => arr.reduce((a, b) => a + f(b), 0);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MINUS = '−';

  const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money0 = (v) => (v < 0 ? MINUS : '') + usd0.format(Math.abs(v));
  const money2 = (v) => (v < 0 ? MINUS : '') + usd2.format(Math.abs(v));
  const signed2 = (v) => (v > 0 ? '+' : v < 0 ? MINUS : '') + usd2.format(Math.abs(v));
  const compact = (v) => (v >= 1000 ? '$' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '$' + Math.round(v));
  /* Big number with muted cents: $3,412<span>.58</span> */
  const moneyCents = (v) => { const s = money2(v); const i = s.lastIndexOf('.'); return s.slice(0, i) + '<span class="cents">' + s.slice(i) + '</span>'; };

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const short = (d) => MONTH_NAMES[d.getMonth()].slice(0, 3);
  const fmtDay = (d, withYear) => short(d) + ' ' + d.getDate() + (withYear ? ', ' + d.getFullYear() : '');
  const isoDay = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const initials = (name) => name.replace(/&|\d+|\./g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const catOf = (id) => (id === 'income' ? INCOME : CATEGORIES.find((c) => c.id === id));

  function store(key, value) {
    try { if (value === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { return null; }
    return null;
  }

  /* Small seeded PRNG (mulberry32) */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Animate a number inside `el` from its previous value to `to`. */
  function countUp(el, to, format, dur = 750) {
    if (!el) return;
    const from = parseFloat(el.dataset.v || '0');
    el.dataset.v = to;
    const token = (el._tok = (el._tok || 0) + 1);
    if (reduced || from === to) { el.innerHTML = format(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      if (el._tok !== token) return;
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.innerHTML = format(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* Smooth monotone curve through points (no overshoot). */
  function smoothPath(pts) {
    const n = pts.length;
    if (n < 2) return '';
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
    }
    return d;
  }

  /* Trigger draw-in transitions on the next frame. */
  function drawIn(root, animate) {
    const els = $$('.draw, .area', root);
    if (!animate || reduced) { els.forEach((e) => e.classList.add('is-drawn')); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((e) => e.classList.add('is-drawn'))));
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ======================== 3. Data generation ======================== */

  const MONTHS = [];
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
    MONTHS.push({ y: d.getFullYear(), m: d.getMonth(), date: d, label: MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear(), short: short(d), tx: [] });
  }

  const ALL_TX = (() => {
    const r = rng(SEED);
    const between = (a, b) => a + r() * (b - a);
    const cents = (v) => Math.round(v * 100) / 100;
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const tx = [];
    let id = 0;

    MONTHS.forEach((M, mi) => {
      const dim = daysIn(M.y, M.m);
      const isCurrent = M.y === TODAY.getFullYear() && M.m === TODAY.getMonth();
      const last = isCurrent ? TODAY.getDate() : dim;
      M.partial = isCurrent;
      M.lastDay = last;
      M.dim = dim;
      const key = M.y + '-' + String(M.m + 1).padStart(2, '0');
      const add = (day, merchant, cat, amount, account = 'Aster Card') => {
        day = Math.round(day);
        if (day < 1 || day > last) return;
        tx.push({ id: ++id, date: new Date(M.y, M.m, day), merchant, cat, amount: cents(amount), account });
      };

      // Income: payroll twice a month (raise in April), freelance now and then, savings interest
      const salary = mi >= 5 ? 3420 : 3250;
      add(1, 'Northwind Studio', 'income', salary, 'Checking');
      add(15, 'Northwind Studio', 'income', salary, 'Checking');
      if (r() < 0.55) add(between(5, 26), 'Fernhill Labs', 'income', Math.round(between(6, 19)) * 100, 'Checking');
      add(dim, 'Meridian Savings', 'income', between(38, 54), 'Savings');

      // Recurring bills (electricity is seasonal)
      const winter = [11, 0, 1].includes(M.m), summer = [6, 7].includes(M.m);
      RECURRING.forEach(([day, merchant, cat, amount, account, varies]) => {
        let a = amount;
        if (varies) a = between(amount * 0.85, amount * 1.15) * (merchant === 'Cascade Power' ? (winter ? 1.45 : summer ? 1.2 : 1) : 1);
        add(Math.min(day, dim), merchant, cat, -a, account);
      });

      // Everyday spending
      Object.entries(VARIABLE).forEach(([cat, cfg]) => {
        if (cfg.every) {
          for (let d = between(1, 4); d <= dim; d += between(cfg.every[0], cfg.every[1])) {
            const [name, lo, hi] = pick(cfg.merchants);
            add(d, name, cat, -between(lo, hi));
          }
        } else {
          let n = Math.round(between(cfg.count[0], cfg.count[1]));
          if (M.m === 11 && cat === 'shopping') n += 3; // December gifts
          for (let k = 0; k < n; k++) {
            const [name, lo, hi] = pick(cfg.merchants);
            add(between(1, dim), name, cat, -between(lo, hi));
          }
        }
      });

      ONE_OFFS.filter((o) => o[0] === key).forEach(([, day, merchant, cat, amount]) => add(day, merchant, cat, -amount));
    });

    tx.sort((a, b) => b.date - a.date || b.id - a.id);
    return tx;
  })();

  /* Monthly aggregates + a simple net-worth model */
  (() => {
    const r = rng(SEED + 7);
    let cash = 27200, brokerage = 61900;
    MONTHS.forEach((M) => {
      M.tx = ALL_TX.filter((t) => t.date.getFullYear() === M.y && t.date.getMonth() === M.m);
      M.income = sum(M.tx.filter((t) => t.amount > 0), (t) => t.amount);
      M.spend = -sum(M.tx.filter((t) => t.amount < 0), (t) => t.amount);
      M.byCat = {};
      M.counts = {};
      M.tx.forEach((t) => { if (t.amount < 0) { M.byCat[t.cat] = (M.byCat[t.cat] || 0) - t.amount; M.counts[t.cat] = (M.counts[t.cat] || 0) + 1; } });
      M.net = M.income - M.spend;
      M.rate = M.income ? (M.net / M.income) * 100 : 0;
      const invest = 600;                                   // monthly auto-invest
      cash += M.net - invest;
      brokerage = brokerage * (1 + (r() * 0.055 - 0.018)) + invest;
      M.cash = cash;
      M.brokerage = brokerage;
      M.nw = cash + brokerage;
    });
  })();

  const START_NW = 27200 + 61900;

  function accountsNow() {
    const M = MONTHS[MONTHS.length - 1];
    const card = -sum(M.tx.filter((t) => t.account === 'Aster Card' && t.date.getDate() > 6), (t) => t.amount);
    const checking = 6840 + card;
    return { checking, savings: M.cash - 6840, brokerage: M.brokerage, card: -card, total: M.nw };
  }

  /* ===================== 4. State & persistence ===================== */

  const state = {
    view: 'overview',
    month: MONTHS.length - 1,
    range: 12,
    donutOff: new Set(),
    tx: { q: '', cats: new Set(), sort: 'date', dir: 'desc', page: 1, scope: 'month' },
    budgets: Object.assign({}, DEFAULT_BUDGETS, store('lumen.budgets') || {}),
    goals: (() => {
      const saved = store('lumen.goals') || {};
      return DEFAULT_GOALS.map((g) => Object.assign({}, g, saved[g.id] || {}));
    })(),
    editing: null,
    openGoal: null,
  };
  const saveGoals = () => store('lumen.goals', Object.fromEntries(state.goals.map((g) => [g.id, { saved: g.saved, log: g.log }])));
  const cur = () => MONTHS[state.month];

  /* ========================== 5. Overview ========================== */

  const KPI_DEFS = [
    { id: 'nw',     label: 'Net worth',    value: (M) => M.nw,     fmt: (v) => money0(v), series: (M) => M.nw, color: 'var(--accent-line)', goodUp: true },
    { id: 'spend',  label: 'Spent',        value: (M) => M.spend,  fmt: moneyCents, series: (M) => M.spend, color: 'var(--secondary)', goodUp: false },
    { id: 'income', label: 'Income',       value: (M) => M.income, fmt: moneyCents, series: (M) => M.income, color: 'var(--accent-line)', goodUp: true },
    { id: 'rate',   label: 'Savings rate', value: (M) => M.rate,   fmt: (v) => v.toFixed(1) + '<span class="cents">%</span>', series: (M) => M.rate, color: 'var(--c-transport)', goodUp: true, points: true },
  ];

  function buildKpis() {
    $('#kpis').innerHTML = KPI_DEFS.map((k) => `
      <article class="card kpi" id="kpi-${k.id}" aria-labelledby="kpi-${k.id}-label">
        <div class="kpi-top"><h2 class="kpi-label" id="kpi-${k.id}-label">${k.label}</h2><span class="delta"></span></div>
        <p class="kpi-value" data-v="0"></p>
        <div class="kpi-foot"><span class="kpi-sub"></span><svg class="spark" aria-hidden="true"></svg></div>
      </article>`).join('');
  }

  function renderKpis(animate) {
    const i = state.month, M = cur(), P = MONTHS[i - 1];
    KPI_DEFS.forEach((k) => {
      const card = $('#kpi-' + k.id);
      const v = k.value(M);
      countUp($('.kpi-value', card), v, k.fmt);
      $('.kpi-label', card).textContent = k.id === 'spend' && M.partial ? 'Spent · MTD' : k.label;

      // Delta vs previous month (or vs the starting balance for net worth)
      const prev = P ? k.value(P) : k.id === 'nw' ? START_NW : null;
      const delta = $('.delta', card);
      if (prev == null) { delta.className = 'delta flat'; delta.textContent = 'New'; }
      else {
        const diff = k.points ? v - prev : ((v - prev) / Math.abs(prev)) * 100;
        const up = diff >= 0;
        const good = Math.abs(diff) < 0.05 ? null : up === k.goodUp;
        delta.className = 'delta ' + (good === null ? 'flat' : good ? 'good' : 'bad');
        delta.innerHTML = `<svg viewBox="0 0 10 10" aria-hidden="true"><path d="${up ? 'M5 8V2M2 5l3-3 3 3' : 'M5 2v6M2 5l3 3 3-3'}"/></svg><span class="sign">${up ? '+' : MINUS}</span>${Math.abs(diff).toFixed(1)}${k.points ? ' pts' : '%'}`;
        delta.setAttribute('aria-label', `${up ? 'Up' : 'Down'} ${Math.abs(diff).toFixed(1)} ${k.points ? 'points' : 'percent'} versus ${P ? P.short : 'start'}`);
      }
      const sub = $('.kpi-sub', card);
      if (k.id === 'nw') sub.textContent = P ? `${v - prev >= 0 ? '+' : MINUS}${usd0.format(Math.abs(v - prev))} vs ${P.short}` : 'Since Nov 1';
      else if (k.id === 'rate') sub.textContent = `${money0(M.net)} saved`;
      else sub.textContent = P ? `vs ${money0(prev)} in ${P.short}` : '12-month view';

      renderSpark($('.spark', card), MONTHS.map(k.series), i, k.color, animate);
    });
  }

  function renderSpark(svg, values, sel, color, animate) {
    const W = Math.max(60, Math.round(svg.getBoundingClientRect().width) || 120), H = Math.round(svg.getBoundingClientRect().height) || 34;
    const min = Math.min(...values), max = Math.max(...values), pad = 4;
    const pts = values.map((v, k) => [pad + (k * (W - pad * 2)) / (values.length - 1), pad + (1 - (v - min) / (max - min || 1)) * (H - pad * 2)]);
    const d = smoothPath(pts);
    const gid = 'sg' + Math.random().toString(36).slice(2, 7);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.22"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs>
      <path class="area" d="${d} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z" fill="url(#${gid})"/>
      <path class="line draw" pathLength="1" d="${d}" style="stroke:${color};stroke-width:1.6"/>
      <circle cx="${pts[sel][0]}" cy="${pts[sel][1]}" r="5" style="fill:${color};opacity:.18"/>
      <circle cx="${pts[sel][0]}" cy="${pts[sel][1]}" r="2.6" style="fill:${color}"/>`;
    drawIn(svg, animate);
  }

  /* ---- Cash-flow chart (hand-built SVG with crosshair + tooltip) ---- */
  function renderCashChart(animate) {
    const box = $('#cash-chart');
    const W = box.clientWidth - 16, H = box.clientHeight - 14;
    if (W < 50) return;
    const end = state.range === 6 ? Math.max(state.month, 5) : MONTHS.length - 1;
    const idx = Array.from({ length: state.range }, (_, k) => end - state.range + 1 + k);
    const inc = idx.map((i) => MONTHS[i].income), sp = idx.map((i) => MONTHS[i].spend);
    const rawMax = Math.max(...inc, ...sp) * 1.06;
    const step = [500, 1000, 2000, 2500, 5000].find((s) => s * 4 >= rawMax) || 5000;
    const max = step * 4;
    const pl = 44, pr = 12, pt = 10, pb = 26;
    const stepX = (W - pl - pr) / (idx.length - 1);
    const x = (k) => pl + k * stepX;
    const y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const pI = inc.map((v, k) => [x(k), y(v)]), pS = sp.map((v, k) => [x(k), y(v)]);
    const dI = smoothPath(pI), dS = smoothPath(pS);
    const base = y(0);
    const selK = idx.indexOf(state.month);

    let grid = '';
    for (let g = 0; g <= 4; g++) {
      const gy = y(step * g);
      grid += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/><text class="axis-label" x="${pl - 10}" y="${gy + 3.5}" text-anchor="end">${compact(step * g)}</text>`;
    }
    const labels = idx.map((i, k) => {
      const show = idx.length <= 6 || W > 520 || k % 2 === (idx.length - 1) % 2;
      return show ? `<text class="axis-label${k === selK ? ' is-sel' : ''}" x="${x(k)}" y="${H - 6}" text-anchor="middle">${MONTHS[i].short}</text>` : '';
    }).join('');
    const bw = Math.min(stepX, 60), bx0 = Math.max(pl, x(selK) - bw / 2), bx1 = Math.min(W - pr, x(selK) + bw / 2);
    const band = selK >= 0 ? `<rect x="${bx0.toFixed(1)}" y="${pt}" width="${(bx1 - bx0).toFixed(1)}" height="${(base - pt).toFixed(1)}" rx="6" style="fill:var(--band)"/>` : '';

    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent-line);stop-opacity:.16"/><stop offset="1" style="stop-color:var(--accent-line);stop-opacity:0"/></linearGradient>
          <linearGradient id="gSp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--secondary);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--secondary);stop-opacity:0"/></linearGradient>
        </defs>
        ${band}${grid}${labels}
        <path class="area" d="${dI} L${x(idx.length - 1)},${base} L${x(0)},${base} Z" fill="url(#gInc)"/>
        <path class="area" d="${dS} L${x(idx.length - 1)},${base} L${x(0)},${base} Z" fill="url(#gSp)"/>
        <path class="line draw" pathLength="1" d="${dS}" style="stroke:var(--secondary)"/>
        <path class="line draw" pathLength="1" d="${dI}" style="stroke:var(--accent-line)"/>
        <line class="crosshair" x1="0" x2="0" y1="${pt}" y2="${base}"/>
        <circle class="hover-dot" data-dot="inc" r="4.5" style="fill:var(--panel);stroke:var(--accent-line);stroke-width:2"/>
        <circle class="hover-dot" data-dot="sp" r="4.5" style="fill:var(--panel);stroke:var(--secondary);stroke-width:2"/>
      </svg>
      <div class="chart-tip" aria-hidden="true"></div>
      <p class="sr-only" aria-live="polite" id="cf-live"></p>`;
    drawIn(box, animate);
    $('#cf-sub').textContent = `Income vs. spending · ${MONTHS[idx[0]].short} ${MONTHS[idx[0]].y} – ${MONTHS[end].short} ${MONTHS[end].y}`;

    // Hover / keyboard inspection
    const svg = $('svg', box), tip = $('.chart-tip', box), cross = $('.crosshair', box);
    const dotI = $('[data-dot="inc"]', box), dotS = $('[data-dot="sp"]', box);
    const show = (k) => {
      box._k = k;
      const M = MONTHS[idx[k]];
      cross.setAttribute('x1', x(k)); cross.setAttribute('x2', x(k));
      dotI.setAttribute('cx', x(k)); dotI.setAttribute('cy', y(inc[k]));
      dotS.setAttribute('cx', x(k)); dotS.setAttribute('cy', y(sp[k]));
      tip.innerHTML = `<p class="tip-title">${M.label}${M.partial ? ' · to date' : ''}</p>
        <p class="tip-row"><i style="background:var(--accent-line)"></i>Income<b>${money0(M.income)}</b></p>
        <p class="tip-row"><i style="background:var(--secondary)"></i>Spending<b>${money0(M.spend)}</b></p>
        <p class="tip-row net">Net<b class="${M.net >= 0 ? 'amt-in' : ''}">${M.net >= 0 ? '+' : MINUS}${usd0.format(Math.abs(M.net))}</b></p>`;
      const px = x(k) + 8; // svg is inset by 8px padding
      const tw = tip.offsetWidth || 170;
      tip.style.left = (px + 14 + tw > box.clientWidth ? px - tw - 14 : px + 14) + 'px';
      box.classList.add('is-hover');
      $('#cf-live').textContent = `${M.label}: income ${money0(M.income)}, spending ${money0(M.spend)}`;
    };
    const hide = () => { box.classList.remove('is-hover'); box._k = null; };
    const kFromEvent = (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      return clamp(Math.round((px - pl) / stepX), 0, idx.length - 1);
    };
    box.onpointermove = (e) => show(kFromEvent(e));
    box.onpointerleave = hide;
    box.onclick = (e) => { const k = kFromEvent(e); if (idx[k] !== state.month) setMonth(idx[k]); };
    box.onkeydown = (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'Escape') return hide();
      const k = box._k == null ? Math.max(selK, 0) : box._k;
      if (e.key === 'Enter') return setMonth(idx[k]);
      show(clamp(k + (e.key === 'ArrowRight' ? 1 : -1), 0, idx.length - 1));
    };
    box.onblur = hide;
  }

  /* ---- Donut by category with interactive legend ---- */
  const DONUT_R = 68, DONUT_C = 85;
  function buildDonut() {
    $('#donut').innerHTML = `
      <svg viewBox="0 0 170 170" aria-hidden="true">
        <circle cx="${DONUT_C}" cy="${DONUT_C}" r="${DONUT_R}" style="fill:none;stroke:var(--panel-2);stroke-width:18"/>
        ${CATEGORIES.map((c) => `<circle class="seg-arc" data-cat="${c.id}" cx="${DONUT_C}" cy="${DONUT_C}" r="${DONUT_R}" pathLength="100" style="stroke:${c.color};stroke-dasharray:0 100;stroke-dashoffset:0"/>`).join('')}
      </svg>
      <div class="donut-center"><small>Total spent</small><b data-v="0">$0</b><span></span></div>`;
    $$('.seg-arc').forEach((arc) => {
      arc.addEventListener('pointerenter', () => focusCat(arc.dataset.cat));
      arc.addEventListener('pointerleave', () => focusCat(null));
    });
  }

  function donutItems() {
    const M = cur();
    return CATEGORIES.map((c) => ({ ...c, v: M.byCat[c.id] || 0 })).filter((c) => c.v > 0).sort((a, b) => b.v - a.v);
  }

  function renderDonut() {
    const items = donutItems();
    const active = items.filter((c) => !state.donutOff.has(c.id));
    const total = sum(active, (c) => c.v);
    const gap = active.length > 1 ? 0.9 : 0;
    let off = 0;
    const lens = {};
    active.forEach((c) => { lens[c.id] = [(c.v / total) * 100, off]; off += (c.v / total) * 100; });
    $$('.seg-arc').forEach((arc) => {
      const L = lens[arc.dataset.cat];
      const len = L ? Math.max(L[0] - gap, 0.001) : 0;
      arc.style.strokeDasharray = `${len} ${100 - len}`;
      arc.style.strokeDashoffset = L ? -L[1] : -(off || 0);
    });
    $('#donut-legend').innerHTML = items.map((c) => `
      <li><button data-cat="${c.id}" aria-pressed="${!state.donutOff.has(c.id)}" aria-label="${c.name}, ${money0(c.v)}">
        <i class="lg-dot" style="background:${c.color}"></i><span class="lg-name">${c.name}</span>
        <span class="lg-amt">${money0(c.v)}</span><span class="lg-pct">${state.donutOff.has(c.id) ? '—' : Math.round((c.v / total) * 100) + '%'}</span>
      </button></li>`).join('');
    $('#dn-sub').textContent = cur().label + (cur().partial ? ' · to date' : '');
    $('#donut')._total = total;
    $('#donut')._count = active.length;
    focusCat(null);
  }

  function focusCat(id) {
    const donut = $('#donut');
    donut.classList.toggle('has-focus', !!id && !state.donutOff.has(id));
    $$('.seg-arc').forEach((a) => a.classList.toggle('is-focus', a.dataset.cat === id));
    $$('#donut-legend button').forEach((b) => b.classList.toggle('is-focus', b.dataset.cat === id));
    const center = $('.donut-center', donut);
    const b = $('b', center);
    if (id && !state.donutOff.has(id)) {
      const v = cur().byCat[id] || 0;
      $('small', center).textContent = catOf(id).name;
      countUp(b, v, money0, 300);
      $('span', center).textContent = Math.round((v / donut._total) * 100) + '% of total';
    } else {
      $('small', center).textContent = state.donutOff.size ? 'Selected total' : 'Total spent';
      countUp(b, donut._total || 0, money0, 500);
      $('span', center).textContent = (donut._count || 0) + ' categories';
    }
  }

  $('#donut-legend').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    const id = btn.dataset.cat;
    if (state.donutOff.has(id)) state.donutOff.delete(id);
    else if (donutItems().length - state.donutOff.size > 1) state.donutOff.add(id);
    renderDonut();
    const again = $(`#donut-legend button[data-cat="${id}"]`);
    if (again) again.focus();
  });
  $('#donut-legend').addEventListener('pointerover', (e) => { const b = e.target.closest('button'); if (b) focusCat(b.dataset.cat); });
  $('#donut-legend').addEventListener('pointerleave', () => focusCat(null));
  $('#donut-legend').addEventListener('focusin', (e) => { const b = e.target.closest('button'); if (b) focusCat(b.dataset.cat); });
  $('#donut-legend').addEventListener('focusout', () => focusCat(null));

  /* ---- Upcoming bills & recent activity ---- */
  function renderBills() {
    const list = [];
    for (let d = 1; d <= 14; d++) {
      const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + d);
      const dim = daysIn(date.getFullYear(), date.getMonth());
      RECURRING.forEach(([day, merchant, cat, amount, account, varies, label]) => {
        if (Math.min(day, dim) === date.getDate()) list.push({ date, merchant, cat, amount, account, varies, label, inDays: d });
      });
    }
    const total = sum(list, (b) => b.amount);
    $('#bills-sub').textContent = `${list.length} bills · ${money0(total)} due in the next 14 days`;
    $('#bills').innerHTML = list.slice(0, 6).map((b) => `
      <li>
        <span class="bill-date" aria-hidden="true"><small>${short(b.date)}</small><b>${b.date.getDate()}</b></span>
        <span class="row-main"><b>${esc(b.merchant)}</b><small>${esc(b.label)} · ${b.account === 'Checking' ? 'Autopay' : 'Aster Card'}</small></span>
        <span class="row-amt">${b.varies ? '~' : ''}${money2(b.amount)}<small>${b.inDays === 1 ? '<span class="tag soon">Tomorrow</span>' : b.inDays <= 4 ? `<span class="tag soon">In ${b.inDays} days</span>` : fmtDay(b.date)}</small></span>
      </li>`).join('');
  }

  function txRowMini(t) {
    const c = catOf(t.cat);
    return `<li>
      <span class="avatar" style="--c:${c.color}" aria-hidden="true">${initials(t.merchant)}</span>
      <span class="row-main"><b>${esc(t.merchant)}</b><small>${c.name} · ${fmtDay(t.date)}</small></span>
      <span class="row-amt ${t.amount > 0 ? 'amt-in' : ''}">${signed2(t.amount)}</span>
    </li>`;
  }
  function renderRecent() {
    $('#recent').innerHTML = cur().tx.slice(0, 6).map(txRowMini).join('');
    $('#recent-sub').textContent = `Latest in ${MONTH_NAMES[cur().m]}`;
  }

  function renderOverview(animate) {
    renderKpis(animate);
    renderCashChart(animate);
    renderDonut();
    renderBills();
    renderRecent();
  }

  /* ========================= 6. Transactions ========================= */

  function scopeTx() {
    let list = state.tx.scope === 'month' ? cur().tx : ALL_TX;
    const q = state.tx.q.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.merchant.toLowerCase().includes(q) || catOf(t.cat).name.toLowerCase().includes(q) ||
        t.account.toLowerCase().includes(q) || Math.abs(t.amount).toFixed(2).includes(q));
    }
    return list;
  }

  function highlight(text) {
    const q = state.tx.q.trim();
    const safe = esc(text);
    if (!q) return safe;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return safe;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function renderTransactions() {
    const T = state.tx;
    const base = scopeTx();
    const list = (T.cats.size ? base.filter((t) => T.cats.has(t.cat)) : base).slice();
    const dir = T.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => (T.sort === 'amount' ? (Math.abs(a.amount) - Math.abs(b.amount)) * dir || b.date - a.date : (a.date - b.date) * dir || (a.id - b.id) * dir));

    $('#tx-eyebrow').textContent = T.scope === 'month' ? cur().label : `${MONTHS[0].label} – ${MONTHS[MONTHS.length - 1].label}`;
    $$('#tx-scope button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === T.scope)));

    // Category chips with live counts
    const counts = {};
    base.forEach((t) => (counts[t.cat] = (counts[t.cat] || 0) + 1));
    const chipCats = [INCOME, ...CATEGORIES];
    $('#chips').innerHTML = `<button class="chip" data-cat="" aria-pressed="${!T.cats.size}">All <span class="count">${base.length}</span></button>` +
      chipCats.map((c) => `<button class="chip${counts[c.id] ? '' : ' is-zero'}" data-cat="${c.id}" style="--c:${c.color}" aria-pressed="${T.cats.has(c.id)}"><i></i>${c.name} <span class="count">${counts[c.id] || 0}</span></button>`).join('');

    // Summary
    const inn = sum(list.filter((t) => t.amount > 0), (t) => t.amount), out = -sum(list.filter((t) => t.amount < 0), (t) => t.amount);
    $('#tx-summary').innerHTML = `<span><b>${list.length}</b> transactions</span><span>Money in <b class="amt-in">${money2(inn)}</b></span><span>Money out <b>${money2(out)}</b></span><span>Net <b>${signed2(inn - out)}</b></span>`;

    // Page
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    T.page = clamp(T.page, 1, pages);
    const start = (T.page - 1) * PAGE_SIZE;
    const rows = list.slice(start, start + PAGE_SIZE);
    const withYear = T.scope === 'all';
    $('#tx-body').innerHTML = rows.map((t, k) => {
      const c = catOf(t.cat);
      return `<tr style="animation-delay:${Math.min(k * 18, 240)}ms">
        <td><div class="t-merchant"><span class="avatar" style="--c:${c.color}" aria-hidden="true">${initials(t.merchant)}</span><div><b>${highlight(t.merchant)}</b><small>${highlight(t.account)}</small></div></div></td>
        <td class="t-cat"><span class="pill" style="--c:${c.color}">${highlight(c.name)}</span></td>
        <td class="t-date"><time datetime="${isoDay(t.date)}">${fmtDay(t.date, withYear)}</time></td>
        <td class="t-amt num ${t.amount > 0 ? 'amt-in' : ''}">${signed2(t.amount)}</td>
      </tr>`;
    }).join('');
    $('#tx-empty').hidden = list.length > 0;
    $('.tx-table').hidden = list.length === 0;

    // Sort indicators
    $$('.tx-table th').forEach((th) => {
      const b = $('.sort-btn', th);
      if (b) th.setAttribute('aria-sort', b.dataset.sort === T.sort ? (T.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });

    // Pager
    if (pages <= 1) { $('#pager').innerHTML = list.length ? `<span>Showing all ${list.length}</span>` : ''; return; }
    const nums = [];
    for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - T.page) <= 1) nums.push(p);
    let html = '';
    nums.forEach((p, k) => {
      if (k && p - nums[k - 1] > 1) html += '<span class="pager-gap" aria-hidden="true">…</span>';
      html += `<button data-page="${p}" ${p === T.page ? 'aria-current="page"' : ''} aria-label="Page ${p}">${p}</button>`;
    });
    $('#pager').innerHTML = `<span>Showing ${start + 1}–${start + rows.length} of ${list.length}</span>
      <div class="pager-btns"><button data-page="${T.page - 1}" ${T.page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>${html}<button data-page="${T.page + 1}" ${T.page === pages ? 'disabled' : ''} aria-label="Next page">›</button></div>`;
  }

  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const id = b.dataset.cat;
    if (!id) state.tx.cats.clear();
    else if (state.tx.cats.has(id)) state.tx.cats.delete(id);
    else state.tx.cats.add(id);
    state.tx.page = 1;
    renderTransactions();
    const again = $(`#chips .chip[data-cat="${id}"]`);
    if (again) again.focus();
  });
  $('#tx-scope').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-scope]');
    if (!b) return;
    state.tx.scope = b.dataset.scope;
    state.tx.page = 1;
    renderTransactions();
  });
  $$('.sort-btn').forEach((b) => b.addEventListener('click', () => {
    const T = state.tx;
    if (T.sort === b.dataset.sort) T.dir = T.dir === 'asc' ? 'desc' : 'asc';
    else { T.sort = b.dataset.sort; T.dir = 'desc'; }
    T.page = 1;
    renderTransactions();
  }));
  $('#pager').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-page]');
    if (!b || b.disabled) return;
    state.tx.page = +b.dataset.page;
    renderTransactions();
    const top = $('.table-card').getBoundingClientRect().top + window.scrollY - 80;
    if (window.scrollY > top) window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  });
  $('#tx-clear').addEventListener('click', () => {
    state.tx.q = ''; state.tx.cats.clear(); state.tx.page = 1;
    $('#search').value = '';
    renderTransactions();
  });

  /* ============================ 7. Budgets ============================ */

  function renderBudgets() {
    const M = cur();
    const elapsed = M.partial ? M.lastDay / M.dim : 1;
    const rows = CATEGORIES.map((c) => {
      const spent = M.byCat[c.id] || 0, budget = state.budgets[c.id] || 0;
      const i = state.month;
      const prev = MONTHS.slice(Math.max(0, i - 3), i);
      const avg = prev.length ? sum(prev, (p) => p.byCat[c.id] || 0) / prev.length : spent;
      return { ...c, spent, budget, pct: budget ? spent / budget : 0, avg, count: M.counts[c.id] || 0 };
    });
    const totalB = sum(rows, (r) => r.budget), totalS = sum(rows, (r) => r.spent);
    const left = totalB - totalS;
    const over = rows.filter((r) => r.spent > r.budget).length;

    $('#bd-eyebrow').textContent = M.label + (M.partial ? ` · day ${M.lastDay} of ${M.dim}` : '');
    $('#bd-summary').innerHTML = `
      <div class="bd-stat"><small>Budgeted</small><b class="tnum" data-v="0" id="bd-total"></b><p class="note">${CATEGORIES.length} categories</p></div>
      <div class="bd-stat"><small>Spent</small><b class="tnum" data-v="0" id="bd-spent"></b><p class="note">${Math.round((totalS / totalB) * 100)}% of plan${M.partial ? ` · ${Math.round(elapsed * 100)}% of month gone` : ''}</p></div>
      <div class="bd-stat"><small>${left >= 0 ? 'Left to spend' : 'Over plan'}</small><b class="tnum" style="color:${left >= 0 ? 'var(--accent-text)' : 'var(--danger)'}" data-v="0" id="bd-left"></b><p class="note">${M.partial ? money0(Math.max(left, 0) / Math.max(1, M.dim - M.lastDay)) + ' per day left' : 'Month closed'}</p></div>
      <div class="bd-stat"><small>Over budget</small><b class="tnum">${over}</b><p class="note">${over ? rows.filter((r) => r.spent > r.budget).map((r) => r.name).join(', ') : 'Everything on track'}</p></div>
      <div class="bd-stack" aria-hidden="true">${rows.map((r) => `<span style="--c:${r.color};width:0" data-w="${((r.spent / Math.max(totalB, totalS)) * 100).toFixed(2)}"></span>`).join('')}</div>`;
    countUp($('#bd-total'), totalB, money0);
    countUp($('#bd-spent'), totalS, money0);
    countUp($('#bd-left'), Math.abs(left), money0);

    $('#bd-list').innerHTML = rows.map((r) => {
      const status = r.spent > r.budget ? 'over' : r.pct > 0.92 ? 'near' : 'ok';
      const statusText = status === 'over' ? `Over by ${money0(r.spent - r.budget)}` : status === 'near' ? 'Close to limit' : 'On track';
      const editing = state.editing === r.id;
      return `<li class="card bd-item" data-cat="${r.id}">
        <div class="bd-top">
          <span class="avatar" style="--c:${r.color}" aria-hidden="true">${initials(r.name)}</span>
          <span class="bd-name"><b>${r.name}</b><small>${r.count} transaction${r.count === 1 ? '' : 's'}</small></span>
          <span class="bd-status ${status}">${statusText}</span>
        </div>
        <div class="bd-figs">
          <span><span class="bd-spent">${money0(r.spent)}</span> <span class="bd-of">of ${money0(r.budget)}</span></span>
          <span class="bd-left ${status === 'over' ? 'over' : ''}">${status === 'over' ? money0(r.spent - r.budget) + ' over' : money0(r.budget - r.spent) + ' left'}</span>
        </div>
        <div class="bar ${status === 'over' ? 'over' : ''}" role="progressbar" aria-label="${r.name} budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(r.pct * 100)}" aria-valuetext="${Math.round(r.pct * 100)}% of budget used">
          <span class="bar-fill" style="--c:${r.color}" data-w="${Math.min(100, r.pct * 100).toFixed(1)}"></span>
          ${M.partial ? `<span class="bar-pace" style="left:${(elapsed * 100).toFixed(1)}%" title="Where you'd be at an even pace"></span>` : ''}
        </div>
        <div class="bd-foot">
          ${editing ? `<form class="bd-edit" data-cat="${r.id}">
              <label class="sr-only" for="bd-in-${r.id}">Monthly budget for ${r.name}</label>
              <input id="bd-in-${r.id}" inputmode="decimal" value="${r.budget}" autocomplete="off">
              <button class="btn btn-accent" type="submit">Save</button>
              <button class="btn" type="button" data-cancel>Cancel</button>
            </form>`
          : `<span>3-mo avg ${money0(r.avg)}${M.partial && r.count && VARIABLE[r.id] ? ` · on pace for ${money0((r.spent / elapsed))}` : ''}</span>
             <button class="link-btn" data-edit="${r.id}" aria-label="Edit ${r.name} budget">Edit budget</button>`}
        </div>
      </li>`;
    }).join('');

    const fill = () => $$('#view-budgets [data-w]').forEach((el) => (el.style.width = el.dataset.w + '%'));
    if (reduced) fill(); else requestAnimationFrame(() => requestAnimationFrame(fill));
    if (state.editing) { const inp = $('#bd-in-' + state.editing); if (inp) { inp.focus(); inp.select(); } }
  }

  $('#bd-list').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) { state.editing = edit.dataset.edit; renderBudgets(); return; }
    if (e.target.closest('[data-cancel]')) { const id = state.editing; state.editing = null; renderBudgets(); const b = $(`[data-edit="${id}"]`); if (b) b.focus(); }
  });
  $('#bd-list').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target, id = form.dataset.cat;
    const v = Math.round(parseFloat($('input', form).value.replace(/[^0-9.]/g, '')));
    if (!isFinite(v) || v <= 0 || v > 100000) { $('input', form).setAttribute('aria-invalid', 'true'); toast('Enter an amount between $1 and $100,000'); return; }
    state.budgets[id] = v;
    store('lumen.budgets', state.budgets);
    state.editing = null;
    renderBudgets();
    toast(`${catOf(id).name} budget set to ${money0(v)} a month`);
    const b = $(`[data-edit="${id}"]`); if (b) b.focus();
  });
  $('#bd-list').addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.editing) { e.stopPropagation(); const c = $('[data-cancel]'); if (c) c.click(); }
  });
  $('#bd-reset').addEventListener('click', () => {
    state.budgets = Object.assign({}, DEFAULT_BUDGETS);
    store('lumen.budgets', state.budgets);
    state.editing = null;
    renderBudgets();
    toast('Budgets reset to defaults');
  });

  /* ============================= 8. Goals ============================= */

  const monthsUntil = (due) => Math.max(1, (due[0] - TODAY.getFullYear()) * 12 + (due[1] - TODAY.getMonth()));
  const RING_R = 52;

  function renderGoals() {
    $('#goals').innerHTML = state.goals.map((g) => `
      <article class="card goal" id="goal-${g.id}" aria-labelledby="goal-${g.id}-name">
        <div class="ring">
          <svg viewBox="0 0 124 124" aria-hidden="true">
            <circle class="ring-track" cx="62" cy="62" r="${RING_R}"/>
            <circle class="ring-fill" cx="62" cy="62" r="${RING_R}" pathLength="100" style="stroke:${g.color};stroke-dasharray:0 100"/>
          </svg>
          <div class="ring-label"><b data-v="0" class="ring-pct">0%</b><small>funded</small></div>
        </div>
        <div class="goal-body">
          <h2 id="goal-${g.id}-name">${esc(g.name)}</h2>
          <p>${esc(g.note)}</p>
          <div class="goal-figs"><b class="goal-saved" data-v="0"></b><span>of ${money0(g.target)}</span></div>
          <div class="goal-meta"></div>
          <div class="goal-actions">
            <button class="btn" data-open="${g.id}" aria-expanded="false" aria-controls="add-${g.id}">Add to goal</button>
          </div>
          <div class="goal-add" id="add-${g.id}" hidden>
            <div class="quick" role="group" aria-label="Quick amounts">
              ${[50, 100, 250, 500].map((a) => `<button type="button" data-quick="${a}" aria-pressed="false">+$${a}</button>`).join('')}
            </div>
            <form data-goal="${g.id}">
              <label class="sr-only" for="amt-${g.id}">Amount to add to ${esc(g.name)}</label>
              <input id="amt-${g.id}" inputmode="decimal" placeholder="Custom amount" autocomplete="off">
              <button class="btn btn-accent" type="submit">Add</button>
            </form>
          </div>
        </div>
      </article>`).join('');
    state.goals.forEach((g) => updateGoal(g));
  }

  function updateGoal(g) {
    const card = $('#goal-' + g.id);
    if (!card) return;
    const pct = Math.min(100, (g.saved / g.target) * 100);
    const ring = $('.ring-fill', card);
    const apply = () => (ring.style.strokeDasharray = `${pct} ${100 - pct}`);
    if (reduced) apply(); else requestAnimationFrame(() => requestAnimationFrame(apply));
    countUp($('.ring-pct', card), pct, (v) => Math.round(v) + '%', 900);
    countUp($('.goal-saved', card), g.saved, money0, 900);
    const remaining = Math.max(0, g.target - g.saved);
    const dueLabel = MONTH_NAMES[g.due[1]].slice(0, 3) + ' ' + g.due[0];
    const [lastAmt, lastDate] = g.log;
    const ld = new Date(lastDate + 'T00:00:00');
    $('.goal-meta', card).innerHTML = remaining
      ? `<span><svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="3" width="10" height="9" rx="1.5"/><path d="M2 6h10"/></svg>Target ${dueLabel}</span>
         <span><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 10l3-3 2 2 5-5"/></svg>${money0(remaining / monthsUntil(g.due))}/mo to finish</span>
         <span>Last added ${money0(lastAmt)} · ${fmtDay(ld)}</span>`
      : `<span class="done-badge">Funded</span><span>Last added ${money0(lastAmt)} · ${fmtDay(ld)}</span>`;
    const total = sum(state.goals, (x) => x.saved), target = sum(state.goals, (x) => x.target);
    $('#goals-total').innerHTML = `Saved toward goals <b>${money0(total)}</b> of ${money0(target)}`;
  }

  $('#goals').addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) {
      const panel = $('#add-' + open.dataset.open);
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      open.setAttribute('aria-expanded', String(willOpen));
      open.textContent = willOpen ? 'Cancel' : 'Add to goal';
      if (willOpen) $('input', panel).focus();
      return;
    }
    const q = e.target.closest('[data-quick]');
    if (q) {
      const panel = q.closest('.goal-add');
      $$('[data-quick]', panel).forEach((b) => b.setAttribute('aria-pressed', String(b === q)));
      $('input', panel).value = q.dataset.quick;
    }
  });
  $('#goals').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target, g = state.goals.find((x) => x.id === form.dataset.goal);
    const input = $('input', form);
    const amt = Math.round(parseFloat(input.value.replace(/[^0-9.]/g, '')) * 100) / 100;
    if (!isFinite(amt) || amt <= 0) { input.setAttribute('aria-invalid', 'true'); input.focus(); toast('Enter an amount to add'); return; }
    input.removeAttribute('aria-invalid');
    const wasDone = g.saved >= g.target;
    g.saved = Math.round((g.saved + amt) * 100) / 100;
    g.log = [amt, isoDay(TODAY)];
    saveGoals();
    updateGoal(g);
    input.value = '';
    const panel = form.closest('.goal-add');
    $$('[data-quick]', panel).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    panel.hidden = true;
    const btn = $(`[data-open="${g.id}"]`);
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Add to goal';
    btn.focus();
    toast(!wasDone && g.saved >= g.target ? `${g.name} is fully funded — nicely done.` : `Added ${money2(amt)} to ${g.name}`);
  });

  /* ============================== 9. Shell ============================== */

  const VIEWS = ['overview', 'transactions', 'budgets', 'goals'];
  const TITLES = { overview: 'Overview', transactions: 'Transactions', budgets: 'Budgets', goals: 'Goals' };

  function renderView(view, animate) {
    if (view === 'overview') renderOverview(animate);
    else if (view === 'transactions') renderTransactions();
    else if (view === 'budgets') renderBudgets();
    else if (view === 'goals') renderGoals();
  }

  function go(view, focusHeading) {
    if (!VIEWS.includes(view)) view = 'overview';
    const changed = view !== state.view;
    state.view = view;
    $$('.view').forEach((v) => {
      const on = v.dataset.view === view;
      v.hidden = !on;
      v.classList.toggle('is-entering', on && changed && !reduced);
    });
    $$('[data-nav]').forEach((a) => (a.dataset.nav === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('#crumb-view').textContent = TITLES[view];
    document.title = `${TITLES[view]} · Lumen`;
    renderView(view, true);
    if (focusHeading) { const h = $('#h-' + view); if (h) h.focus({ preventScroll: true }); }
    if (changed) window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', () => go(location.hash.slice(1), document.activeElement !== $('#search')));

  /* Month picker */
  function setMonth(i) {
    i = clamp(i, 0, MONTHS.length - 1);
    if (i === state.month) return;
    state.month = i;
    state.tx.page = 1;
    state.editing = null;
    renderMonthUi();
    if (state.view === 'overview') { renderKpis(false); renderCashChart(false); renderDonut(); renderRecent(); }
    else renderView(state.view, false);
  }
  function renderMonthUi() {
    $('#month-label').textContent = cur().label;
    $('#month-prev').disabled = state.month === 0;
    $('#month-next').disabled = state.month === MONTHS.length - 1;
    const years = [...new Set(MONTHS.map((M) => M.y))];
    $('#month-pop').innerHTML = years.map((y) => `<h3>${y}</h3><div class="month-grid">${MONTHS.map((M, i) => (M.y === y ? `<button data-month="${i}" ${i === state.month ? 'aria-current="true"' : ''} aria-label="${M.label}">${M.short}</button>` : '')).join('')}</div>`).join('');
  }
  const pop = $('#month-pop'), monthBtn = $('#month-btn');
  function togglePop(open) {
    pop.hidden = !open;
    monthBtn.setAttribute('aria-expanded', String(open));
    if (open) { const b = $('[aria-current="true"]', pop); if (b) b.focus(); }
  }
  monthBtn.addEventListener('click', () => togglePop(pop.hidden));
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-month]'); if (b) { setMonth(+b.dataset.month); togglePop(false); monthBtn.focus(); } });
  $('#month-prev').addEventListener('click', () => setMonth(state.month - 1));
  $('#month-next').addEventListener('click', () => setMonth(state.month + 1));
  document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('.month-picker')) togglePop(false); });

  /* Chart range */
  $$('.seg [data-range]').forEach((b) => b.addEventListener('click', () => {
    state.range = +b.dataset.range;
    $$('.seg [data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderCashChart(true);
  }));

  /* Search (lives in the top bar; results show in Transactions) */
  const search = $('#search');
  search.addEventListener('input', () => {
    state.tx.q = search.value;
    state.tx.page = 1;
    if (state.view !== 'transactions') {
      state.tx.scope = 'all';
      state.tx.cats.clear();
      location.hash = '#transactions';
    } else renderTransactions();
  });

  /* Theme */
  const themeBtn = $('#theme-btn');
  function applyThemeUi() {
    const light = document.documentElement.dataset.theme === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    $('meta[name="theme-color"]').setAttribute('content', light ? '#f4f4f1' : '#0a0b0d');
  }
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('lumen.theme', next); } catch (e) { /* storage unavailable */ }
    applyThemeUi();
  });

  /* Keyboard: "/" search, 1–4 switch views, Esc closes things */
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === 'Escape') {
      if (!pop.hidden) { togglePop(false); monthBtn.focus(); return; }
      if (document.activeElement === search) { if (search.value) { search.value = ''; search.dispatchEvent(new Event('input')); } else search.blur(); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); search.focus(); search.select(); }
    else if (/^[1-4]$/.test(e.key)) location.hash = '#' + VIEWS[+e.key - 1];
    else if (e.key === '[') setMonth(state.month - 1);
    else if (e.key === ']') setMonth(state.month + 1);
  });

  /* Sidebar accounts */
  function renderAccounts() {
    const a = accountsNow();
    $('#accounts').innerHTML = ACCOUNTS_META.map((m) => `
      <li><i class="acc-dot" style="background:${m.color}"></i><span class="acc-name">${m.name}<small>${m.sub}</small></span><span class="acc-val ${a[m.key] < 0 ? 'neg' : ''}">${money0(a[m.key])}</span></li>`).join('') +
      `<li class="acc-total" aria-label="Net worth ${money0(a.total)}"><span>Net worth</span><b>${money0(a.total)}</b></li>`;
  }

  /* Redraw size-dependent SVGs on resize */
  let raf = 0, lastW = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = $('#cash-chart').clientWidth;
      if (state.view === 'overview' && w !== lastW) { lastW = w; renderCashChart(false); KPI_DEFS.forEach((k) => renderSpark($('#kpi-' + k.id + ' .spark'), MONTHS.map(k.series), state.month, k.color, false)); }
    });
  });

  /* Boot */
  const hour = TODAY.getHours() || 19;
  $('#h-overview').textContent = `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${USER.first}`;
  $('#today-label').textContent = TODAY.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('#cash-chart').setAttribute('tabindex', '0');
  $('#cash-chart').setAttribute('role', 'group');
  $('#cash-chart').setAttribute('aria-label', 'Cash flow chart. Use left and right arrow keys to inspect months, Enter to select a month.');
  buildKpis();
  buildDonut();
  renderAccounts();
  renderMonthUi();
  applyThemeUi();
  state.view = '';
  go(location.hash.slice(1) || 'overview', false);
  lastW = $('#cash-chart').clientWidth;
  ro.observe($('#cash-chart'));
})();
