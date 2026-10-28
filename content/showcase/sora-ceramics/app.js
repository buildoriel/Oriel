/* =========================================================
   Sora Ceramics — app.js
   1. Data (glazes, shapes, products)  ← edit content here
   2. SVG ceramics renderer
   3. Hero, shop grid, filters
   4. Quick view, cart drawer, checkout
   5. Newsletter, menu, small helpers
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. DATA ---------- */

  // Each glaze: gradient from rim (top) to where it pools (bottom),
  // the colour it breaks to at the rim, iron speckle colour and density.
  const GLAZES = {
    tide:    { name: 'Tide',    top: '#D6E5D8', mid: '#86B0A4', bottom: '#2C5C5B', rim: '#A8896A', speck: '#2B3A35', specks: 26 },
    celadon: { name: 'Celadon', top: '#E2E9D3', mid: '#B6C9A8', bottom: '#7C9B80', rim: '#B9A07F', speck: '#4A5640', specks: 14 },
    shino:   { name: 'Shino',   top: '#F5EFE5', mid: '#EADCC8', bottom: '#C9744A', rim: '#C27648', speck: '#7A3D1E', specks: 70 },
    ash:     { name: 'Ash',     top: '#D0CCBB', mid: '#A9A891', bottom: '#6C7160', rim: '#8C7A62', speck: '#2E2B24', specks: 120 },
    tenmoku: { name: 'Tenmoku', top: '#7A4528', mid: '#33241C', bottom: '#191310', rim: '#A65B32', speck: '#B8743F', specks: 22 },
    kaki:    { name: 'Kaki',    top: '#CF8650', mid: '#A5552C', bottom: '#6B3218', rim: '#E0AA78', speck: '#3A1A0C', specks: 40 }
  };
  const CLAY = { light: '#CDA884', dark: '#A27A57' }; // raw stoneware foot

  // Vessel profiles: [half-width, y] from rim to foot, centred on x=100 in a 200×240 box.
  // open: 'narrow' = dark opening (vases), 'wide' = glazed interior visible (bowls, cups).
  const SHAPES = {
    bottle:  { open: 'narrow', drip: 182, profile: [[13, 30], [11, 42], [12, 64], [22, 84], [48, 118], [60, 150], [58, 180], [46, 202], [36, 212]] },
    moon:    { open: 'narrow', drip: 190, profile: [[25, 56], [26, 64], [46, 78], [70, 104], [80, 138], [72, 174], [52, 200], [34, 212]] },
    column:  { open: 'narrow', drip: 192, ribs: 13, profile: [[30, 24], [27, 32], [29, 60], [33, 120], [33, 178], [31, 204], [27, 212]] },
    bud:     { open: 'narrow', drip: 196, profile: [[9, 84], [8, 94], [10, 108], [30, 134], [42, 162], [38, 192], [26, 212]] },
    serving: { open: 'wide', drip: 198, profile: [[90, 124], [86, 140], [74, 165], [56, 186], [36, 204], [30, 212]] },
    rice:    { open: 'wide', drip: 196, ribs: 2, profile: [[64, 108], [62, 126], [54, 158], [40, 186], [25, 204], [22, 212]] },
    noodle:  { open: 'wide', drip: 194, ribs: 3, profile: [[74, 94], [72, 120], [64, 156], [48, 186], [29, 204], [26, 212]] },
    yunomi:  { open: 'wide', drip: 194, ribs: 4, profile: [[36, 74], [35, 92], [34, 150], [33, 186], [30, 205], [27, 212]] },
    mug:     { open: 'wide', drip: 200, handle: true, ribs: 3, profile: [[42, 98], [42, 120], [42, 168], [41, 198], [38, 207], [36, 212]] },
    guinomi: { open: 'wide', drip: 200, pair: true, profile: [[34, 140], [33, 156], [28, 184], [20, 205], [17, 212]] },
    dinner:  { plate: true, rx: 94, cy: 168, well: .62 },
    side:    { plate: true, rx: 76, cy: 174, well: .55, ring: true }
  };

  const PRODUCTS = [
    { id: 'tide-bottle', name: 'Tide Bottle Vase', cat: 'Vases', shape: 'bottle', glazes: ['tide', 'celadon', 'shino'], price: 96, tide: true,
      dims: 'H 28 cm · Ø 14 cm', clay: 'Iron-flecked stoneware',
      desc: 'Our signature Tide form: a full shoulder that lets the glaze gather and darken before it breaks to raw clay at the foot.' },
    { id: 'moon-jar', name: 'Moon Jar, Medium', cat: 'Vases', shape: 'moon', glazes: ['shino', 'ash', 'tide'], price: 148, stock: 3,
      dims: 'H 22 cm · Ø 21 cm', clay: 'Porcelaneous stoneware',
      desc: 'Thrown in two halves and joined at the waist, after the Korean dalhangari. The seam is left softly visible.' },
    { id: 'column-vase', name: 'Ribbed Column Vase', cat: 'Vases', shape: 'column', glazes: ['ash', 'tenmoku', 'celadon'], price: 84,
      dims: 'H 30 cm · Ø 11 cm', clay: 'Iron-flecked stoneware',
      desc: 'Throwing rings left on purpose, so the glaze catches and thins on every ridge.' },
    { id: 'hana-bud', name: 'Hana Bud Vase', cat: 'Vases', shape: 'bud', glazes: ['tenmoku', 'kaki', 'shino'], price: 38,
      dims: 'H 12 cm · Ø 8 cm', clay: 'Dark stoneware',
      desc: 'Small enough for a windowsill, made for a single stem from the garden.' },
    { id: 'tide-bowl', name: 'Tide Serving Bowl', cat: 'Bowls', shape: 'serving', glazes: ['tide', 'celadon'], price: 78, tide: true,
      dims: 'H 8 cm · Ø 28 cm', clay: 'Iron-flecked stoneware',
      desc: 'Wide and shallow, for salads, fruit or a long Sunday lunch. The glaze pools in the well like a rock pool at low tide.' },
    { id: 'rice-bowl', name: 'Everyday Rice Bowl', cat: 'Bowls', shape: 'rice', glazes: ['celadon', 'shino', 'tenmoku', 'tide'], price: 32,
      dims: 'H 7 cm · Ø 12 cm · 350 ml', clay: 'Porcelaneous stoneware',
      desc: 'The bowl we eat from every day: rice, yoghurt, miso, ice cream. Sits exactly in the hand.' },
    { id: 'noodle-bowl', name: 'Deep Noodle Bowl', cat: 'Bowls', shape: 'noodle', glazes: ['kaki', 'tenmoku', 'ash'], price: 44,
      dims: 'H 9 cm · Ø 17 cm · 900 ml', clay: 'Dark stoneware',
      desc: 'Deep walls keep ramen and caldo verde hot. Persimmon kaki glaze over iron-rich clay.' },
    { id: 'tide-yunomi', name: 'Tide Yunomi', cat: 'Cups', shape: 'yunomi', glazes: ['tide', 'celadon', 'ash'], price: 28, tide: true,
      dims: 'H 9 cm · Ø 7.5 cm · 220 ml', clay: 'Iron-flecked stoneware',
      desc: 'A tall, handleless tea cup. Hold it low, where the unglazed clay stays cool.' },
    { id: 'morning-mug', name: 'Morning Mug', cat: 'Cups', shape: 'mug', glazes: ['shino', 'tenmoku', 'tide'], price: 34,
      dims: 'H 9.5 cm · Ø 8.5 cm · 300 ml', clay: 'Porcelaneous stoneware',
      desc: 'A pulled handle with room for three fingers, and a lip thin enough for good coffee.' },
    { id: 'guinomi-pair', name: 'Guinomi Sake Cups, Pair', cat: 'Cups', shape: 'guinomi', glazes: ['ash', 'tenmoku'], price: 36, soldOut: true,
      dims: 'H 5.5 cm · Ø 7 cm · 80 ml each', clay: 'Iron-flecked stoneware',
      desc: 'Two small cups for sake, ginjinha or a short espresso. Back after the November firing.' },
    { id: 'tide-plate', name: 'Tide Dinner Plate', cat: 'Plates', shape: 'dinner', glazes: ['tide', 'celadon', 'shino'], price: 42, tide: true,
      dims: 'Ø 27 cm · H 2.5 cm', clay: 'Porcelaneous stoneware',
      desc: 'A low rim and a broad, flat well. Heavy enough to feel considered, light enough to stack.' },
    { id: 'side-plate', name: 'Combed Side Plate', cat: 'Plates', shape: 'side', glazes: ['tenmoku', 'kaki', 'ash'], price: 26,
      dims: 'Ø 19 cm · H 2 cm', clay: 'Dark stoneware',
      desc: 'A single combed ring, cut with a bamboo tool while the plate turns on the wheel.' }
  ];

  const FREE_SHIP = 120;        // € threshold for free standard shipping
  const SHIP_STD = 9, SHIP_EXP = 16;
  const MAX_QTY = 10;
  const CART_KEY = 'sora-cart-v1';

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eur = n => '€' + (Number.isInteger(n) ? n : n.toFixed(2));
  const byId = id => PRODUCTS.find(p => p.id === id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const swatchBg = g => `radial-gradient(circle at 35% 30%, ${g.top}, ${g.mid} 55%, ${g.bottom})`;

  // Deterministic random so each pot keeps its speckles between renders.
  function rng(str) {
    let h = 1779033703;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19;
    return () => {
      h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  const f = n => Math.round(n * 10) / 10;

  /* ---------- 2. SVG CERAMICS RENDERER ---------- */
  let uidN = 0;

  // Catmull-Rom spline through points → cubic bezier segments.
  function spline(pts) {
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
  }
  // half-width of a profile at height y (linear interpolation)
  function widthAt(prof, y) {
    for (let i = 0; i < prof.length - 1; i++) {
      const [w1, y1] = prof[i], [w2, y2] = prof[i + 1];
      if (y >= y1 && y <= y2) return w1 + (w2 - w1) * ((y - y1) / (y2 - y1));
    }
    return prof[prof.length - 1][0];
  }
  function speckles(r, g, n, x0, x1, y0, y1) {
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<circle cx="${f(x0 + r() * (x1 - x0))}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(.35 + r() * r() * 1.3)}" opacity="${f(.35 + r() * .55)}"/>`;
    }
    return `<g fill="${g.speck}">${s}</g>`;
  }
  const shadeGrad = id => `<linearGradient id="${id}" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".22" stop-color="#fff" stop-opacity=".16"/>
      <stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity=".14"/>
      <stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>`;
  const shadowGrad = id => `<radialGradient id="${id}"><stop offset="0" stop-color="#4A3020" stop-opacity=".42"/><stop offset=".55" stop-color="#4A3020" stop-opacity=".16"/><stop offset="1" stop-color="#4A3020" stop-opacity="0"/></radialGradient>`;

  /** One vessel (vase, bowl, cup) as SVG markup in a 200×240 box. */
  function vessel(S, g, seed) {
    const u = 'p' + (++uidN), r = rng(seed);
    const prof = S.profile, top = prof[0], foot = prof[prof.length - 1];
    const maxW = Math.max(...prof.map(p => p[0]));
    const L = prof.map(([w, y]) => [100 - w, y]);
    const R = prof.map(([w, y]) => [100 + w, y]).reverse();
    const d = `M${L[0][0]} ${L[0][1]}${spline(L)} Q100 ${f(foot[1] + foot[0] * .44)} ${R[0][0]} ${R[0][1]}${spline(R)}Z`;
    const dripY = S.drip - r() * 6;

    // wavy glaze edge, glaze covers everything above it
    let edge = '';
    for (let x = 200; x >= 0; x -= 10) edge += ` L${x} ${f(dripY + Math.sin(x * .07 + r() * 2) * 2 + (r() - .5) * 2.4)}`;
    let drips = '';
    const nd = 2 + Math.floor(r() * 3);
    for (let i = 0; i < nd; i++) {
      // tapered teardrop: wide where it leaves the glaze line, rounded bead at the tip
      const w = 5 + r() * 6, x = 100 + (r() * 2 - 1) * maxW * .65, y0 = dripY - 3, len = 6 + r() * 12;
      drips += `<path d="M${f(x - w)} ${f(y0)} C${f(x - w * .3)} ${f(y0 + 2)} ${f(x - w * .42)} ${f(y0 + len * .7)} ${f(x - w * .4)} ${f(y0 + len)} A${f(w * .4)} ${f(w * .4)} 0 0 0 ${f(x + w * .4)} ${f(y0 + len)} C${f(x + w * .42)} ${f(y0 + len * .7)} ${f(x + w * .3)} ${f(y0 + 2)} ${f(x + w)} ${f(y0)}Z" fill="${g.bottom}"/>`;
    }
    let ribs = '';
    for (let i = 1; i <= (S.ribs || 0); i++) {
      const y = top[1] + 8 + (foot[1] - top[1] - 26) * (i / (S.ribs + 1)), w = widthAt(prof, y);
      ribs += `<path d="M${f(100 - w)} ${f(y)} Q100 ${f(y + w * .48)} ${f(100 + w)} ${f(y)}" stroke="#000" stroke-opacity=".13" stroke-width="1.3" fill="none"/>
               <path d="M${f(100 - w)} ${f(y + 1.6)} Q100 ${f(y + 1.6 + w * .48)} ${f(100 + w)} ${f(y + 1.6)}" stroke="#fff" stroke-opacity=".14" stroke-width="1" fill="none"/>`;
    }
    const rx = top[0], ry = Math.max(2.4, rx * .24), cy = top[1];
    let handle = '';
    if (S.handle) {
      const x = 100 + top[0] - 2;
      handle = `<path d="M${x} 122 C${x + 34} 118 ${x + 36} 176 ${x} 178" fill="none" stroke="url(#${u}g)" stroke-width="10" stroke-linecap="round"/>
                <path d="M${x} 122 C${x + 34} 118 ${x + 36} 176 ${x} 178" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="10" stroke-linecap="round" transform="translate(1.5 1.5)" style="mix-blend-mode:multiply"/>
                <path d="M${x + 4} 126 C${x + 26} 124 ${x + 28} 166 ${x + 4} 172" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>`;
    }
    const interior = S.open === 'narrow'
      ? `<radialGradient id="${u}i" cy=".62"><stop offset="0" stop-color="#0E0C0A"/><stop offset=".7" stop-color="#1F1915"/><stop offset="1" stop-color="${g.bottom}"/></radialGradient>`
      : `<radialGradient id="${u}i" cx=".5" cy=".62" r=".62"><stop offset="0" stop-color="${g.bottom}"/><stop offset=".55" stop-color="${g.mid}"/><stop offset="1" stop-color="${g.top}"/></radialGradient>`;

    return `<defs>
      <clipPath id="${u}c"><path d="${d}"/></clipPath>
      <clipPath id="${u}e"><ellipse cx="100" cy="${cy}" rx="${rx}" ry="${f(ry)}"/></clipPath>
      <linearGradient id="${u}g" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top[1]}" y2="${f(dripY)}">
        <stop offset="0" stop-color="${g.top}"/><stop offset=".5" stop-color="${g.mid}"/><stop offset="1" stop-color="${g.bottom}"/></linearGradient>
      <linearGradient id="${u}k" x1="0" x2="0" y1="0" y2="1"><stop offset=".6" stop-color="${CLAY.light}"/><stop offset="1" stop-color="${CLAY.dark}"/></linearGradient>
      <radialGradient id="${u}w"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      ${shadeGrad(u + 's')}${shadowGrad(u + 'h')}${interior}
    </defs>
    <ellipse cx="${100 + maxW * .12}" cy="${foot[1] + 2}" rx="${f(maxW * 1.05 + 10)}" ry="${f(maxW * .16 + 4)}" fill="url(#${u}h)"/>
    <ellipse cx="100" cy="${foot[1] + 1}" rx="${f(foot[0] * 1.1)}" ry="3.5" fill="#3A2618" opacity=".32"/>
    ${handle}
    <path d="${d}" fill="url(#${u}k)"/>
    <g clip-path="url(#${u}c)">
      <path d="M0 0H200V${f(dripY)}${edge}Z" fill="url(#${u}g)"/>
      ${drips}${ribs}
      ${speckles(r, g, g.specks, 100 - maxW, 100 + maxW, top[1], foot[1])}
      <rect x="${100 - maxW}" y="0" width="${maxW * 2}" height="240" fill="url(#${u}s)"/>
      <ellipse cx="${f(100 - maxW * .42)}" cy="${f((top[1] + foot[1]) / 2 - 6)}" rx="${f(maxW * .13 + 2)}" ry="${f((foot[1] - top[1]) * .3)}" fill="url(#${u}w)"/>
    </g>
    <ellipse cx="100" cy="${cy}" rx="${rx}" ry="${f(ry)}" fill="url(#${u}i)"/>
    ${S.open === 'wide' ? `<g clip-path="url(#${u}e)">${speckles(r, g, Math.round(g.specks / 4), 100 - rx, 100 + rx, cy - ry, cy + ry)}
      <ellipse cx="100" cy="${f(cy - ry * .7)}" rx="${rx}" ry="${f(ry * .8)}" fill="#000" opacity=".12"/></g>` : ''}
    <ellipse cx="100" cy="${cy}" rx="${rx}" ry="${f(ry)}" fill="none" stroke="${g.rim}" stroke-width="${S.open === 'wide' ? 2 : 2.4}"/>
    <path d="M${f(100 - rx * .85)} ${f(cy + ry * .55)} Q100 ${f(cy + ry * 1.25)} ${f(100 + rx * .2)} ${f(cy + ry * .98)}" stroke="#fff" stroke-opacity=".35" stroke-width="1" fill="none"/>`;
  }

  /** A plate seen from a low angle; drawn as a stack of two. */
  function plateLayer(S, g, r, cy, withShadow) {
    const u = 'p' + (++uidN);
    const rx = S.rx, ry = rx * .36, wx = rx * S.well, wy = ry * S.well;
    return `<defs>
      <clipPath id="${u}c"><ellipse cx="100" cy="${cy}" rx="${rx}" ry="${f(ry)}"/></clipPath>
      <linearGradient id="${u}t" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${g.top}"/><stop offset="1" stop-color="${g.mid}"/></linearGradient>
      <radialGradient id="${u}p" cy=".45"><stop offset="0" stop-color="${g.bottom}"/><stop offset=".7" stop-color="${g.mid}"/><stop offset="1" stop-color="${g.mid}" stop-opacity=".2"/></radialGradient>
      <linearGradient id="${u}k" x1="0" x2="0" y1="0" y2="1"><stop offset=".3" stop-color="${CLAY.light}"/><stop offset="1" stop-color="${CLAY.dark}"/></linearGradient>
      <radialGradient id="${u}w"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      ${shadeGrad(u + 's')}${shadowGrad(u + 'h')}
    </defs>
    ${withShadow ? `<ellipse cx="${100 + rx * .08}" cy="${f(cy + ry * .5)}" rx="${f(rx * 1.12)}" ry="${f(ry * .85)}" fill="url(#${u}h)"/>` : ''}
    <ellipse cx="100" cy="${f(cy + 7)}" rx="${f(rx * .97)}" ry="${f(ry)}" fill="url(#${u}k)"/>
    <ellipse cx="100" cy="${f(cy + 3.5)}" rx="${f(rx * .995)}" ry="${f(ry)}" fill="${g.bottom}"/>
    <ellipse cx="100" cy="${cy}" rx="${rx}" ry="${f(ry)}" fill="url(#${u}t)"/>
    <g clip-path="url(#${u}c)">
      <ellipse cx="100" cy="${f(cy + 2)}" rx="${f(wx)}" ry="${f(wy)}" fill="url(#${u}p)"/>
      <ellipse cx="100" cy="${f(cy + 2)}" rx="${f(wx)}" ry="${f(wy)}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1.4"/>
      <ellipse cx="100" cy="${f(cy + 3.4)}" rx="${f(wx)}" ry="${f(wy)}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>
      ${S.ring ? `<ellipse cx="100" cy="${f(cy + 1)}" rx="${f(rx * .8)}" ry="${f(ry * .8)}" fill="none" stroke="${g.rim}" stroke-width="2.4" stroke-dasharray="60 6 90 4 140 8" opacity=".85"/>` : ''}
      ${speckles(r, g, g.specks, 100 - rx, 100 + rx, cy - ry, cy + ry)}
      <rect x="${100 - rx}" y="${f(cy - ry)}" width="${rx * 2}" height="${f(ry * 2)}" fill="url(#${u}s)" opacity=".6"/>
      <ellipse cx="${f(100 - rx * .45)}" cy="${f(cy - ry * .45)}" rx="${f(rx * .35)}" ry="${f(ry * .28)}" fill="url(#${u}w)"/>
    </g>
    <ellipse cx="100" cy="${cy}" rx="${rx}" ry="${f(ry)}" fill="none" stroke="${g.rim}" stroke-width="1.6"/>`;
  }
  function plate(S, g, seed) {
    const r = rng(seed);
    return plateLayer(S, g, r, S.cy + 10, true) + plateLayer(S, g, r, S.cy, false);
  }

  /** Markup for a product's illustration (inner content of a 200×240 box). */
  function potArt(shapeKey, glazeKey, seed) {
    const S = SHAPES[shapeKey], g = GLAZES[glazeKey];
    if (S.plate) return plate(S, g, seed + glazeKey);
    if (S.pair) return `<g transform="translate(-36 -16)">${vessel(S, g, seed + glazeKey + 'b')}</g><g transform="translate(30 0)">${vessel(S, g, seed + glazeKey)}</g>`;
    return vessel(S, g, seed + glazeKey);
  }
  const potSVG = (p, glaze, viewBox, label) =>
    `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label || `${p.name} in ${GLAZES[glaze].name} glaze`)}">${potArt(p.shape, glaze, p.id)}</svg>`;

  /* ---------- 3a. HERO COMPOSITION ---------- */
  function renderHero() {
    const host = $('#hero-art');
    if (!host) return;
    const place = (shape, glaze, seed, cx, footY, scale, cls = '') => {
      const w = 200 * scale, h = 240 * scale;
      return `<svg class="${cls}" x="${f(cx - w / 2)}" y="${f(footY - 212 * scale)}" width="${f(w)}" height="${f(h)}" viewBox="0 0 200 240" overflow="visible">${potArt(shape, glaze, seed)}</svg>`;
    };
    // a plate standing upright, seen face-on
    const g = GLAZES.tide, px = 468, pr = 96, py = 566 - pr;
    let waves = '';
    for (let i = 0; i < 7; i++) {
      const y = 360 + i * 26, a = 6 + i;
      waves += `<path d="M20 ${y} q40 -${a} 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="#F4EEE4" stroke-opacity="${f(.12 + i * .035)}" stroke-width="1.4"/>`;
    }
    const pr2 = rng('heroplate');
    host.innerHTML = `<svg viewBox="0 0 640 700" preserveAspectRatio="xMidYMax meet" role="img" aria-label="The Tide series: a bottle vase on a tall plinth beside a serving bowl, a yunomi cup and a dinner plate, all in a pale sea-green glaze, set in a terracotta arch.">
      <defs>
        <linearGradient id="h-arch" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#D9A483"/><stop offset=".6" stop-color="#BF7C56"/><stop offset="1" stop-color="#A9643F"/></linearGradient>
        <radialGradient id="h-sun" cx=".42" cy=".38"><stop offset="0" stop-color="#FBF3E6"/><stop offset="1" stop-color="#F0D9C2"/></radialGradient>
        <linearGradient id="h-plA" x1="0" x2="1"><stop offset="0" stop-color="#F1E9DC"/><stop offset=".75" stop-color="#E6DBCA"/><stop offset="1" stop-color="#D3C4AE"/></linearGradient>
        <linearGradient id="h-plB" x1="0" x2="1"><stop offset="0" stop-color="#E4D7C4"/><stop offset="1" stop-color="#CDBBA2"/></linearGradient>
        <radialGradient id="h-plate" cx=".44" cy=".42"><stop offset="0" stop-color="${g.bottom}"/><stop offset=".45" stop-color="${g.mid}"/><stop offset=".62" stop-color="${g.mid}"/><stop offset=".66" stop-color="${g.top}"/><stop offset=".94" stop-color="${g.mid}"/><stop offset="1" stop-color="${g.rim}"/></radialGradient>
        <linearGradient id="h-fade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
        <clipPath id="h-clip"><path d="M40 700V330A280 280 0 0 1 600 330V700Z"/></clipPath>
      </defs>
      <path d="M40 700V330A280 280 0 0 1 600 330V700Z" fill="url(#h-arch)"/>
      <g clip-path="url(#h-clip)">
        <circle cx="398" cy="290" r="168" fill="url(#h-sun)" opacity=".9"/>
        ${waves}
        <rect x="0" y="560" width="640" height="140" fill="url(#h-fade)"/>
      </g>
      <!-- low plinth (back) -->
      <rect x="262" y="574" width="318" height="126" fill="url(#h-plB)"/>
      <rect x="262" y="560" width="318" height="14" fill="#F2EADF"/>
      <ellipse cx="${px + 10}" cy="567" rx="${pr * .9}" ry="6" fill="#4A3020" opacity=".25"/>
      <g class="pot-rise">
        <circle cx="${px}" cy="${py}" r="${pr}" fill="url(#h-plate)"/>
        <circle cx="${px}" cy="${py}" r="${pr * .62}" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="2"/>
        <g fill="${g.speck}">${Array.from({ length: 30 }, () => { const a = pr2() * 6.283, d = Math.sqrt(pr2()) * pr * .95; return `<circle cx="${f(px + Math.cos(a) * d)}" cy="${f(py + Math.sin(a) * d)}" r="${f(.5 + pr2())}" opacity=".6"/>`; }).join('')}</g>
        <path d="M${px - pr} ${py} A${pr} ${pr} 0 0 0 ${px + pr} ${py}A${pr} ${pr} 0 0 1 ${px - pr} ${py}" fill="#000" opacity=".1"/>
        <ellipse cx="${px - 38}" cy="${py - 42}" rx="26" ry="14" fill="#fff" opacity=".22" transform="rotate(-35 ${px - 38} ${py - 42})"/>
      </g>
      <g class="pot-rise">${place('serving', 'tide', 'hero-bowl', 392, 567, 1.02)}</g>
      <g class="pot-rise">${place('yunomi', 'tide', 'hero-cup', 548, 567, .74)}</g>
      <!-- tall plinth (front) -->
      <rect x="92" y="452" width="198" height="248" fill="url(#h-plA)"/>
      <rect x="92" y="438" width="198" height="14" fill="#FAF5EC"/>
      <rect x="290" y="452" width="10" height="248" fill="#000" opacity=".08"/>
      <g class="pot-rise">${place('bottle', 'tide', 'hero-bottle', 191, 445, 1.32)}</g>
    </svg>`;
  }

  /* ---------- 3b. SHOP GRID + FILTERS ---------- */
  const state = { cat: 'all', glaze: null, sort: 'featured' };
  const grid = $('#product-grid');

  function renderGlazeFilters() {
    const host = $('#glaze-filters');
    host.innerHTML = `<button type="button" class="swatch swatch-all" data-glaze="" aria-pressed="true">All glazes</button>` +
      Object.entries(GLAZES).map(([k, g]) =>
        `<button type="button" class="swatch" data-glaze="${k}" aria-pressed="false" aria-label="${g.name} glaze" title="${g.name}" style="background:${swatchBg(g)}"></button>`).join('');
  }

  function renderGrid() {
    let list = PRODUCTS.filter(p => (state.cat === 'all' || p.cat === state.cat) && (!state.glaze || p.glazes.includes(state.glaze)));
    if (state.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);

    grid.innerHTML = list.map((p, i) => {
      const glaze = state.glaze || p.glazes[0];
      const badge = p.soldOut ? '<span class="badge badge-out">Sold out</span>'
        : p.tide ? '<span class="badge badge-tide">Tide series</span>'
        : p.stock && p.stock <= 3 ? `<span class="badge">Only ${p.stock} left</span>` : '';
      return `<article class="card${p.soldOut ? ' is-out' : ''}" style="animation-delay:${Math.min(i, 8) * 45}ms">
        <button type="button" class="card-media" data-qv="${p.id}" data-glaze="${glaze}" aria-label="Quick view: ${esc(p.name)}, ${GLAZES[glaze].name} glaze">
          ${badge}${potSVG(p, glaze, '-10 -8 220 275')}
          <span class="qv-pill" aria-hidden="true">Quick view</span>
        </button>
        <div class="card-body">
          <div><h3>${esc(p.name)}</h3><p class="card-meta">${GLAZES[glaze].name} · ${p.dims.split(' · ').slice(0, 2).join(' · ')}</p></div>
          <p class="price">${eur(p.price)}</p>
        </div>
        ${p.soldOut
          ? `<button type="button" class="card-add" disabled>Sold out</button>`
          : `<button type="button" class="card-add" data-add="${p.id}" data-glaze="${glaze}">Add to bag</button>`}
      </article>`;
    }).join('');

    $('#empty').hidden = list.length > 0;
    const parts = [state.cat === 'all' ? 'all pieces' : state.cat.toLowerCase(), state.glaze ? `in ${GLAZES[state.glaze].name}` : ''];
    $('#result-count').textContent = `Showing ${list.length} of ${PRODUCTS.length} · ${parts.join(' ').trim()}`;
    $$('.chip[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
    $$('#glaze-filters .swatch').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.glaze || null) === state.glaze)));
  }

  function setFilter(patch) { Object.assign(state, patch); renderGrid(); }

  /* ---------- 4a. QUICK VIEW ---------- */
  const qv = { dlg: $('#quickview'), p: null, glaze: null, qty: 1 };

  function openQuickView(id, glaze) {
    const p = byId(id); if (!p) return;
    qv.p = p; qv.glaze = p.glazes.includes(glaze) ? glaze : p.glazes[0]; qv.qty = 1;
    $('#qv-cat').textContent = p.tide ? `${p.cat} · Tide series` : p.cat;
    $('#qv-title').textContent = p.name;
    $('#qv-price').textContent = eur(p.price);
    $('#qv-desc').textContent = p.desc;
    $('#qv-specs').innerHTML = `<dt>Size</dt><dd>${p.dims}</dd><dt>Clay</dt><dd>${p.clay}</dd><dt>Made</dt><dd>Lisbon, batch of 40 · signed on the foot</dd><dt>Dispatch</dt><dd>${p.soldOut ? 'Next firing: 6 November' : 'Ships in 3–5 working days'}</dd>`;
    $('#qv-swatches').innerHTML = p.glazes.map(k =>
      `<button type="button" class="swatch" data-qv-glaze="${k}" aria-label="${GLAZES[k].name} glaze" title="${GLAZES[k].name}" style="background:${swatchBg(GLAZES[k])}"></button>`).join('');
    renderQuickView(false);
    openDialog(qv.dlg);
  }
  function renderQuickView(animate = true) {
    const { p, glaze } = qv;
    $('#qv-media').innerHTML = potSVG(p, glaze, '-25 -6 250 250');
    if (animate) $('#qv-media svg').classList.add('swap');
    $('#qv-glaze-name').textContent = GLAZES[glaze].name;
    $$('#qv-swatches .swatch').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.qvGlaze === glaze)));
    $('#qv-qty').textContent = qv.qty;
    $('#qv-minus').disabled = qv.qty <= 1 || p.soldOut;
    $('#qv-plus').disabled = qv.qty >= MAX_QTY || p.soldOut;
    const add = $('#qv-add');
    add.disabled = !!p.soldOut;
    add.textContent = p.soldOut ? 'Sold out · back in November' : `Add to bag · ${eur(p.price * qv.qty)}`;
  }

  /* ---------- 4b. CART ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }
  cart = cart.filter(l => byId(l.id) && GLAZES[l.glaze] && l.qty > 0);
  const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable */ } };
  const count = () => cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = () => cart.reduce((n, l) => n + byId(l.id).price * l.qty, 0);

  function addToCart(id, glaze, qty = 1) {
    const p = byId(id); if (!p || p.soldOut) return;
    const line = cart.find(l => l.id === id && l.glaze === glaze);
    if (line) line.qty = Math.min(MAX_QTY, line.qty + qty); else cart.push({ id, glaze, qty: Math.min(MAX_QTY, qty) });
    save(); renderCart(true);
    toast(`Added: ${p.name}, ${GLAZES[glaze].name}`);
  }
  function setQty(i, qty) {
    if (qty <= 0) cart.splice(i, 1); else cart[i].qty = Math.min(MAX_QTY, qty);
    save(); renderCart(true);
  }

  function renderCart(bump = false) {
    const n = count(), sub = subtotal();
    const badge = $('#cart-count');
    badge.textContent = n;
    $('#cart-open').setAttribute('aria-label', `Open bag, ${n} item${n === 1 ? '' : 's'}`);
    if (bump && !reduced) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }

    const left = FREE_SHIP - sub;
    $('#ship-text').innerHTML = left > 0 ? `You’re <strong>${eur(left)}</strong> away from free EU shipping.` : `<strong>Free EU shipping</strong> unlocked. It’s on us.`;
    $('#ship-bar span').style.width = Math.min(100, (sub / FREE_SHIP) * 100) + '%';
    $('#ship-bar').setAttribute('aria-valuenow', String(Math.min(FREE_SHIP, sub)));

    $('#cart-lines').innerHTML = cart.map((l, i) => {
      const p = byId(l.id);
      return `<li class="line">
        <div class="line-media">${potSVG(p, l.glaze, '-10 -4 220 262', '')}</div>
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="line-meta">${GLAZES[l.glaze].name} glaze · ${eur(p.price)} each</p>
          <div class="stepper sm" role="group" aria-label="Quantity for ${esc(p.name)}">
            <button type="button" data-line-qty="${i}" data-d="-1" aria-label="Decrease quantity">−</button>
            <output aria-live="polite">${l.qty}</output>
            <button type="button" data-line-qty="${i}" data-d="1" aria-label="Increase quantity"${l.qty >= MAX_QTY ? ' disabled' : ''}>+</button>
          </div>
        </div>
        <div class="line-right">
          <span class="line-price">${eur(p.price * l.qty)}</span>
          <button type="button" class="remove" data-remove="${i}" aria-label="Remove ${esc(p.name)} from bag">Remove</button>
        </div>
      </li>`;
    }).join('');
    $$('#cart-lines .line-media svg').forEach(s => s.setAttribute('aria-hidden', 'true'));

    const empty = cart.length === 0;
    $('#cart-empty').hidden = !empty;
    $('#bag-foot').hidden = empty;
    $('#ship-meter').hidden = empty;
    $('#subtotal').textContent = eur(sub);
    if (currentView === 'bag') $('#drawer-title').textContent = empty ? 'Your bag' : `Your bag (${n})`;
  }

  /* ---------- 4c. DRAWER VIEWS + CHECKOUT ---------- */
  const drawer = $('#drawer');
  let currentView = 'bag';
  const TITLES = { bag: 'Your bag', details: 'Checkout', done: 'Thank you' };
  const ORDER = ['bag', 'details', 'done'];

  function setView(v) {
    currentView = v;
    $$('.view', drawer).forEach(el => { el.hidden = el.dataset.view !== v; });
    $$('.progress-steps li', drawer).forEach((li, i) => {
      const idx = ORDER.indexOf(v);
      li.classList.toggle('done', i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('#drawer-title').textContent = TITLES[v];
    if (v === 'bag') renderCart();
    if (v === 'details') updateTotals();
    drawer.scrollTop = 0;
  }
  const shippingCost = () => {
    const method = $('input[name="ship"]:checked', drawer).value;
    return method === 'express' ? SHIP_EXP : subtotal() >= FREE_SHIP ? 0 : SHIP_STD;
  };
  function updateTotals() {
    const sub = subtotal(), ship = shippingCost();
    $('#ship-std-price').textContent = sub >= FREE_SHIP ? 'Free' : eur(SHIP_STD);
    $('#co-subtotal').textContent = eur(sub);
    $('#co-shipping').textContent = ship === 0 ? 'Free' : eur(ship);
    $('#co-total').textContent = eur(sub + ship);
  }

  // Inline validation rules: [test, message]
  const RULES = {
    email: [v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Enter an email like name@example.com.'],
    name: [v => v.length >= 2, 'Tell us who the parcel is for.'],
    address: [v => v.length >= 5, 'Enter a street and house number.'],
    postcode: [v => /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(v), 'Enter a valid postcode, e.g. 1100-148.'],
    city: [v => v.length >= 2, 'Enter your town or city.']
  };
  function validateField(input) {
    const rule = RULES[input.name]; if (!rule) return true;
    const ok = rule[0](input.value.trim());
    input.setAttribute('aria-invalid', String(!ok));
    input.classList.toggle('valid', ok);
    const err = $('#' + input.id + '-err');
    err.textContent = ok ? '' : rule[1];
    if (ok) input.removeAttribute('aria-describedby'); else input.setAttribute('aria-describedby', err.id);
    return ok;
  }
  const form = $('#checkout-form');
  form.addEventListener('focusout', e => { if (e.target.matches('input[name]:not([type=radio])') && e.target.value) validateField(e.target); });
  form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
  form.addEventListener('change', e => { if (e.target.name === 'ship') updateTotals(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fields = $$('input[name]:not([type=radio])', form);
    const bad = fields.filter(i => !validateField(i));
    if (bad.length) { bad[0].focus(); return; }
    if (!cart.length) { setView('bag'); return; }
    placeOrder(new FormData(form));
  });

  function placeOrder(data) {
    const r = rng(String(Date.now()));
    const num = 'SR-' + String(26000 + Math.floor(r() * 9999)).padStart(5, '0');
    const sub = subtotal(), ship = shippingCost();
    $('#order-number').textContent = `Order ${num}`;
    $('#order-msg').textContent = `Thank you, ${data.get('name').split(' ')[0]}. A confirmation is on its way to ${data.get('email')}. We’ll wrap everything in wool and paper and send it to ${data.get('city')} within 3–5 days.`;
    $('#confirm-lines').innerHTML = cart.map(l => {
      const p = byId(l.id);
      return `<li><span>${l.qty} × ${esc(p.name)} <span class="fine">(${GLAZES[l.glaze].name})</span></span><span>${eur(p.price * l.qty)}</span></li>`;
    }).join('') + `<li><span>Shipping</span><span>${ship ? eur(ship) : 'Free'}</span></li>`;
    $('#confirm-total').textContent = eur(sub + ship);
    cart = []; save(); renderCart(true);
    form.reset();
    $$('input', form).forEach(i => { i.classList.remove('valid'); i.removeAttribute('aria-invalid'); });
    $$('.err', form).forEach(e => { e.textContent = ''; });
    setView('done');
    $('#order-number').focus();
  }

  /* ---------- dialogs ---------- */
  function openDialog(d) {
    if (d.open) return;
    d.classList.remove('closing');
    d.showModal();
  }
  function closeDialog(d) {
    if (!d.open || d.classList.contains('closing')) return;
    if (reduced) { d.close(); return; }
    d.classList.add('closing');
    setTimeout(() => { d.classList.remove('closing'); d.close(); }, 230);
  }
  $$('dialog').forEach(d => {
    d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(d); });
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) closeDialog(d);
    });
  });
  drawer.addEventListener('close', () => { if (currentView === 'done') setView('bag'); });

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- 5. EVENTS ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const qvBtn = t.closest('[data-qv]');
    if (qvBtn) { openQuickView(qvBtn.dataset.qv, qvBtn.dataset.glaze); return; }
    const add = t.closest('[data-add]');
    if (add) { addToCart(add.dataset.add, add.dataset.glaze); return; }
    const cat = t.closest('[data-cat]');
    if (cat) { setFilter({ cat: cat.dataset.cat }); return; }
    const gz = t.closest('#glaze-filters [data-glaze]');
    if (gz) { setFilter({ glaze: gz.dataset.glaze || null }); return; }
    const link = t.closest('[data-glaze-link]');
    if (link) { setFilter({ cat: 'all', glaze: link.dataset.glazeLink }); closeMenu(); }
    const qg = t.closest('[data-qv-glaze]');
    if (qg) { qv.glaze = qg.dataset.qvGlaze; renderQuickView(); return; }
    const lq = t.closest('[data-line-qty]');
    if (lq) { const i = +lq.dataset.lineQty; setQty(i, cart[i].qty + +lq.dataset.d); restoreFocus(`[data-line-qty="${i}"][data-d="${lq.dataset.d}"]`); return; }
    const rm = t.closest('[data-remove]');
    if (rm) { const p = byId(cart[+rm.dataset.remove].id); setQty(+rm.dataset.remove, 0); toast(`Removed: ${p.name}`); $('#drawer .icon-btn').focus(); }
  });
  // keep focus on the stepper after re-render
  function restoreFocus(sel) { const el = $(sel, drawer) || $('#drawer .icon-btn'); if (el && !el.disabled) el.focus(); else $('#drawer .icon-btn').focus(); }

  $('#sort').addEventListener('change', e => setFilter({ sort: e.target.value }));
  $('#reset-filters').addEventListener('click', () => setFilter({ cat: 'all', glaze: null }));
  $('#qv-minus').addEventListener('click', () => { qv.qty = Math.max(1, qv.qty - 1); renderQuickView(false); });
  $('#qv-plus').addEventListener('click', () => { qv.qty = Math.min(MAX_QTY, qv.qty + 1); renderQuickView(false); });
  $('#qv-add').addEventListener('click', () => {
    addToCart(qv.p.id, qv.glaze, qv.qty);
    closeDialog(qv.dlg);
    setTimeout(() => { setView('bag'); openDialog(drawer); }, reduced ? 0 : 260);
  });
  $('#cart-open').addEventListener('click', () => { setView('bag'); openDialog(drawer); });
  $('#to-checkout').addEventListener('click', () => { setView('details'); $('#co-email').focus(); });
  $('#back-to-bag').addEventListener('click', () => setView('bag'));

  // newsletter
  $('#news-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#news-email'), msg = $('#news-msg');
    const ok = RULES.email[0](input.value.trim());
    input.setAttribute('aria-invalid', String(!ok));
    msg.className = 'news-msg ' + (ok ? 'ok' : 'bad');
    msg.textContent = ok ? `Thank you. The next kiln notes will reach ${input.value.trim()} after the 6 November firing.` : 'That email doesn’t look quite right. Try name@example.com.';
    if (ok) input.value = ''; else input.focus();
  });

  // mobile menu
  const menuBtn = $('.menu-btn'), nav = $('#main-nav');
  function closeMenu() { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });

  /* ---------- init ---------- */
  $('#year').textContent = new Date().getFullYear();
  renderHero();
  renderGlazeFilters();
  renderGrid();
  renderCart();
})();
