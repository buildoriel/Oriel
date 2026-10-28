/* ==========================================================================
   Tideline — Seed deck · app.js
   1. Generative art & charts (drawn from data-* attributes in index.html)
   2. Deck engine: scaling, navigation, hash links, overview, notes, fullscreen
   ========================================================================== */
(() => {
  'use strict';

  const W = 1600, H = 900;              // slide canvas size (see styles.css)
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const nums = (s) => s.split(',').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function text(parent, x, y, str, attrs = {}) {
    const t = el('text', Object.assign({ x, y }, attrs), parent);
    t.textContent = str;
    return t;
  }
  // Small deterministic PRNG so generative art is identical on every load
  function rng(seed) {
    let t = (seed * 2654435761) >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------------
     1a. Tide lines (title + closing slides)
     ------------------------------------------------------------------------ */
  const TIDES = {
    title: { seed: 3, horizon: 600, sunX: 1340, sunR: 112, lines: 22, grad: 'url(#g-tide)', scrim: 'url(#g-scrim)' },
    close: { seed: 8, horizon: 655, sunX: 800, sunR: 150, lines: 18, grad: 'url(#g-tide2)' }
  };
  function drawTide(svg) {
    const o = TIDES[svg.dataset.tide];
    if (!o) return;
    const r = rng(o.seed);
    el('circle', { cx: o.sunX, cy: o.horizon, r: o.sunR * 3.4, fill: 'url(#g-glow)', class: 'fadein' }, svg);
    el('circle', { cx: o.sunX, cy: o.horizon + 10, r: o.sunR, fill: 'url(#g-sun)', class: 'sun' }, svg);

    const paths = [];
    // shared swell so neighbouring lines flow together instead of crossing
    const f1 = 0.0034 + r() * 0.001, f2 = 0.0105 + r() * 0.002, p1 = r() * 6.283, p2 = r() * 6.283;
    for (let i = 0; i < o.lines; i++) {
      const t = i / (o.lines - 1);
      const y0 = o.horizon + Math.pow(t, 1.7) * (H - o.horizon + 60);
      const amp = 5 + t * 40;
      let d = '';
      for (let x = -40; x <= W + 40; x += 16) {
        const y = y0 + amp * (Math.sin(x * f1 + p1 + i * 0.16) * 0.75 + Math.sin(x * f2 + p2 - i * 0.22) * 0.25);
        d += (x === -40 ? 'M' : 'L') + x + ' ' + y.toFixed(1);
      }
      paths.push(d);
    }
    // the sea below the horizon line hides the lower half of the sun
    el('path', { d: paths[0] + `L${W + 40} ${H + 20}L-40 ${H + 20}Z`, fill: 'url(#g-sea)' }, svg);
    paths.forEach((d, i) => {
      const t = i / (paths.length - 1);
      el('path', {
        d, fill: 'none', stroke: o.grad, 'stroke-width': (1 + t * 1.7).toFixed(2),
        'stroke-opacity': (0.3 + t * 0.7).toFixed(2), class: 'fadein', style: `--d:${i * 0.5}`
      }, svg);
    });
    // sun reflection: short ember strokes on the water
    for (let k = 0; k < 7; k++) {
      const w = o.sunR * (1.5 - k * 0.17), y = o.horizon + 16 + k * 15 + k * k * 2;
      el('rect', { x: o.sunX - w / 2, y, width: w, height: 3, rx: 1.5, fill: '#ff9661', 'fill-opacity': (0.55 - k * 0.07).toFixed(2), class: 'fadein', style: `--d:${4 + k}` }, svg);
    }
    // scrim keeps text over the water readable
    if (o.scrim) el('rect', { x: 0, y: o.horizon - 40, width: W, height: H, fill: o.scrim }, svg);
  }

  /* ------------------------------------------------------------------------
     1b. Product mock: stacked monthly emissions by scope
     ------------------------------------------------------------------------ */
  function drawStack(svg) {
    const labels = svg.dataset.stack.split(',');
    const series = [nums(svg.dataset.s1), nums(svg.dataset.s2), nums(svg.dataset.s3)];
    const colors = ['#0e2549', '#2fbf98', '#9ee6d0'];
    const top = 8, bottom = 166, max = 160, band = 470 / labels.length, bw = 24;
    [40, 80, 120, 160].forEach((v) => {
      const y = bottom - (v / max) * (bottom - top);
      el('line', { x1: 0, x2: 470, y1: y, y2: y, stroke: '#dde7e4', 'stroke-dasharray': '3 4' }, svg);
    });
    labels.forEach((lab, i) => {
      const g = el('g', { class: 'bar', style: `--d:${i}` }, svg);
      let y = bottom;
      const x = i * band + (band - bw) / 2;
      series.forEach((s, k) => {
        const h = (s[i] / max) * (bottom - top);
        y -= h;
        el('rect', { x, y: y + (k ? 1 : 0), width: bw, height: Math.max(0, h - (k ? 1 : 0)), rx: 3, fill: colors[k] }, g);
      });
      text(svg, x + bw / 2, 186, lab, { 'text-anchor': 'middle' });
    });
  }

  /* ------------------------------------------------------------------------
     1c. Traction: ARR bars + customers line
     ------------------------------------------------------------------------ */
  function money(k) { return k >= 1000 ? `$${(k / 1000).toFixed(2)}M` : `$${k}k`; }
  function drawCombo(svg) {
    const labels = svg.dataset.labels.split(','), arr = nums(svg.dataset.arr), cus = nums(svg.dataset.customers);
    const L = 64, R = 856, T = 34, B = 306, max = 1200, n = labels.length;
    const band = (R - L) / n, bw = 58;
    const yA = (v) => B - (v / max) * (B - T);
    const yC = (v) => B - (v / Math.max(...cus)) * (B - T) * 0.62; // secondary scale sits inside the bars
    [0, 250, 500, 750, 1000].forEach((v) => {
      el('line', { x1: L, x2: R, y1: yA(v), y2: yA(v), class: 'grid-l' }, svg);
      text(svg, L - 12, yA(v) + 4, v ? money(v).replace('.00', '') : '$0', { 'text-anchor': 'end' });
    });
    const pts = [];
    labels.forEach((lab, i) => {
      const cx = L + band * i + band / 2, last = i === n - 1;
      el('rect', {
        x: cx - bw / 2, y: yA(arr[i]), width: bw, height: B - yA(arr[i]), rx: 6,
        fill: last ? 'url(#g-bar)' : 'rgba(94,242,194,.34)', class: 'bar', style: `--d:${i}`
      }, svg);
      text(svg, cx, yA(arr[i]) - (last ? 14 : 10), money(arr[i]), { 'text-anchor': 'middle', class: 'v fadein' + (last ? ' big' : ''), style: `--d:${i}` });
      text(svg, cx, B + 26, lab, { 'text-anchor': 'middle' });
      pts.push([cx, yC(cus[i])]);
    });
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    el('path', { d, fill: 'none', stroke: '#071632', 'stroke-width': 7, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1, class: 'draw', 'stroke-opacity': '.6' }, svg);
    el('path', { d, fill: 'none', stroke: '#ff9661', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1, class: 'draw' }, svg);
    pts.forEach((p, i) => el('circle', { cx: p[0], cy: p[1], r: 5.5, fill: '#071632', stroke: '#ff9661', 'stroke-width': 3, class: 'pop', style: `--d:${i}` }, svg));
    const lp = pts[pts.length - 1];
    text(svg, lp[0] + 36, lp[1] + 6, String(cus[cus.length - 1]), { class: 'v fadein', fill: '#ff9661', style: 'fill:#ff9661;--d:8' });
  }

  /* ------------------------------------------------------------------------
     1d. Roadmap: projected year-end ARR (first N bars are actuals)
     ------------------------------------------------------------------------ */
  function drawProjection(svg) {
    const labels = svg.dataset.labels.split(','), vals = nums(svg.dataset.values), actual = +svg.dataset.actual || 0;
    const L = 640 * 0.18, R = 640, T = 40, B = 284, max = 10.5, n = labels.length;
    const band = (R - L) / n, bw = 70;
    const y = (v) => B - (v / max) * (B - T);
    el('line', { x1: 0, x2: R, y1: B, y2: B, stroke: 'rgba(158,197,230,.25)' }, svg);
    labels.forEach((lab, i) => {
      const cx = L + band * i + band / 2, last = i === n - 1, isA = i < actual;
      el('rect', {
        x: cx - bw / 2, y: y(vals[i]), width: bw, height: B - y(vals[i]), rx: 6,
        fill: isA ? 'url(#g-bar)' : 'url(#p-hatch)', stroke: isA ? 'none' : '#5ef2c2', 'stroke-width': 1.5,
        class: 'bar', style: `--d:${i * 1.5}`
      }, svg);
      text(svg, cx, y(vals[i]) - 12, `$${vals[i]}M`, { 'text-anchor': 'middle', class: 'v fadein' + (last ? ' big' : ''), style: `--d:${i}` });
      text(svg, cx, B + 26, lab + (isA ? ' A' : ' E'), { 'text-anchor': 'middle' });
      if (i) {
        const gx = cx - band / 2, mult = (vals[i] / vals[i - 1]).toFixed(1);
        text(svg, gx, y(vals[i - 1]) - 40, `×${mult}`, { 'text-anchor': 'middle', class: 'fadein', style: `fill:#ff9661;font-weight:600;--d:${i + 2}` });
      }
    });
  }

  /* ------------------------------------------------------------------------
     1e. Use-of-funds donut
     ------------------------------------------------------------------------ */
  function drawDonut(svg) {
    const vals = nums(svg.dataset.values), colors = ['#071632', '#1f5b84', '#0b7d64', '#f2703f'];
    el('circle', { cx: 160, cy: 160, r: 120, fill: 'none', stroke: 'rgba(4,11,26,.08)', 'stroke-width': 46 }, svg);
    let start = 0;
    vals.forEach((v, i) => {
      const len = v - 0.7; // small gap between segments
      el('circle', {
        cx: 160, cy: 160, r: 120, pathLength: 100, class: 'seg', stroke: colors[i],
        'stroke-dasharray': `${len} 100`, transform: `rotate(${start * 3.6} 160 160)`, style: `--len:${len};--d:${i}`
      }, svg);
      start += v;
    });
  }

  /* ------------------------------------------------------------------------
     1f. Abstract team portraits (Bauhaus-style, one recipe per person)
     ------------------------------------------------------------------------ */
  const PORTRAITS = {
    1: { bg: '#173463', motif: 'rings', m: '#5ef2c2', body: '#ff9661', face: '#e9b48e', hair: '#0b1530', cut: 'bob' },
    2: { bg: '#5ef2c2', motif: 'stripes', m: '#2fd3a5', body: '#071632', face: '#a8714d', hair: '#0b1530', cut: 'short', glasses: 1 },
    3: { bg: '#ff9661', motif: 'quarter', m: '#ffc37a', body: '#173463', face: '#f6d2b8', hair: '#f4d27a', cut: 'bun' },
    4: { bg: '#0e2549', motif: 'sun', m: '#ff9661', body: '#2fd3a5', face: '#c98d63', hair: '#22150e', cut: 'side', beard: 1 }
  };
  function drawPortrait(svg) {
    const p = PORTRAITS[svg.dataset.seed];
    if (!p) return;
    svg.setAttribute('viewBox', '0 0 220 160');
    el('rect', { width: 220, height: 160, fill: p.bg }, svg);
    if (p.motif === 'rings') for (let r = 18; r < 170; r += 18) el('circle', { cx: 196, cy: 22, r, fill: 'none', stroke: p.m, 'stroke-width': 2, 'stroke-opacity': (1 - r / 190).toFixed(2) }, svg);
    if (p.motif === 'stripes') for (let x = -160; x < 220; x += 16) el('line', { x1: x, y1: 160, x2: x + 160, y2: 0, stroke: p.m, 'stroke-width': 6 }, svg);
    if (p.motif === 'quarter') {
      el('path', { d: 'M0 160V40a120 120 0 0 1 120 120z', fill: p.m }, svg);
      for (let x = 150; x < 214; x += 14) for (let y = 14; y < 70; y += 14) el('circle', { cx: x, cy: y, r: 2.6, fill: '#071632', 'fill-opacity': '.55' }, svg);
    }
    if (p.motif === 'sun') {
      el('circle', { cx: 110, cy: 84, r: 64, fill: p.m }, svg);
      for (let y = 104; y < 160; y += 9) el('rect', { x: 0, y, width: 220, height: 4, fill: p.bg }, svg);
    }
    // silhouette
    el('path', { d: 'M48 160c4-34 30-52 62-52s58 18 62 52z', fill: p.body }, svg);
    el('rect', { x: 101, y: 92, width: 18, height: 22, rx: 6, fill: p.face }, svg);
    el('circle', { cx: 110, cy: 70, r: 29, fill: p.face }, svg);
    const hair = {
      bob: 'M78 98V68a32 32 0 0 1 64 0v30h-9V72a23 23 0 0 0-46 0v26z',
      short: 'M80 66a30 30 0 0 1 60 0q-14-9-30-7q-16-2-30 7z',
      bun: 'M81 64a29 29 0 0 1 58 0q-29-14-58 0z',
      side: 'M80 68a30 30 0 0 1 60-6q-22 2-38-12q-8 12-22 18z'
    }[p.cut];
    el('path', { d: hair, fill: p.hair }, svg);
    if (p.cut === 'bun') el('circle', { cx: 110, cy: 36, r: 12, fill: p.hair }, svg);
    if (p.glasses) {
      el('circle', { cx: 99, cy: 72, r: 8, fill: 'none', stroke: '#071632', 'stroke-width': 2.5 }, svg);
      el('circle', { cx: 121, cy: 72, r: 8, fill: 'none', stroke: '#071632', 'stroke-width': 2.5 }, svg);
      el('path', { d: 'M107 72h6', stroke: '#071632', 'stroke-width': 2.5 }, svg);
    }
    if (p.beard) el('path', { d: 'M84 76q2 23 26 23t26-23q-6 10-26 10t-26-10z', fill: p.hair }, svg);
  }

  /* ------------------------------------------------------------------------
     1g. Count-up numbers ([data-count] keeps its final value in the HTML)
     ------------------------------------------------------------------------ */
  function fmt(node, v) {
    const dec = +node.dataset.decimals || 0;
    const s = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return (node.dataset.prefix || '') + s + (node.dataset.suffix || '');
  }
  function finishCounts(scope) {
    $$('[data-count]', scope).forEach((n) => { cancelAnimationFrame(n._raf); n.textContent = fmt(n, parseFloat(n.dataset.count)); });
  }
  function countUp(slide) {
    if (reduced.matches) return;
    $$('[data-count]', slide).forEach((n, i) => {
      const to = parseFloat(n.dataset.count), dur = 700, delay = 150 + i * 60;
      const t0 = performance.now() + delay;
      cancelAnimationFrame(n._raf);
      n.textContent = fmt(n, 0);
      const step = (now) => {
        const k = Math.min(1, Math.max(0, (now - t0) / dur));
        n.textContent = fmt(n, to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) n._raf = requestAnimationFrame(step);
      };
      n._raf = requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------------------
     2. Deck engine
     ------------------------------------------------------------------------ */
  const app = $('#app'), stage = $('#stage'), frame = $('#frame'), deck = $('#deck');
  const slides = $$('.deck > .slide'), N = slides.length;
  const notesEl = $('#notes'), notesText = $('#notes-text'), notesNum = $('#notes-slide');
  const counter = $('#counter'), progress = $('#progress'), hudBar = $('#hud-bar'), live = $('#live');
  const overview = $('#overview'), ovGrid = $('#ov-grid');
  let cur = -1;

  // Draw art + charts
  $$('svg[data-tide]').forEach(drawTide);
  $$('svg[data-stack]').forEach(drawStack);
  $$('svg.combo').forEach(drawCombo);
  $$('svg.proj').forEach(drawProjection);
  $$('svg.donut').forEach(drawDonut);
  $$('svg.portrait').forEach(drawPortrait);

  // Prepare slides: a11y labels, stagger indexes, footers, progress segments
  slides.forEach((s, i) => {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', `${i + 1} of ${N}: ${s.dataset.title}`);
    $$('[data-a]', s).forEach((n, k) => n.style.setProperty('--i', k));
    if (s.dataset.foot !== 'none') {
      s.insertAdjacentHTML('beforeend',
        `<footer class="slide-foot" aria-hidden="true"><span><svg class="mark"><use href="#i-mark"/></svg>Tideline</span><span>Seed round 2026 · Confidential</span><span class="pg">${pad(i + 1)} / ${pad(N)}</span></footer>`);
    }
    const seg = document.createElement('span');
    seg.title = `${i + 1}. ${s.dataset.title}`;
    seg.addEventListener('click', () => go(i));
    progress.appendChild(seg);
  });

  // Scale the 1600×900 canvas to fit the stage (letterboxed)
  function fit() {
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.max(0.05, Math.min(w / W, h / H));
    frame.style.width = (W * s).toFixed(2) + 'px';
    frame.style.height = (H * s).toFixed(2) + 'px';
    deck.style.transform = `scale(${s})`;
  }
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize', fit);
  fit();

  function go(n, opts = {}) {
    n = Math.max(0, Math.min(N - 1, n));
    if (n === cur) return;
    const prev = slides[cur];
    if (prev) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      clearTimeout(prev._t);
      prev._t = setTimeout(() => prev.classList.remove('is-leaving'), 360);
      finishCounts(prev);
    }
    const s = slides[n];
    clearTimeout(s._t);
    s.classList.remove('is-leaving');
    void s.offsetWidth; // restart entrance transitions when revisiting
    s.classList.add('is-active');
    slides.forEach((el2, i) => {
      el2.inert = i !== n;
      el2.setAttribute('aria-hidden', String(i !== n));
    });
    cur = n;
    countUp(s);
    updateUI();
    if (!opts.fromHash) {
      try { history.replaceState(null, '', '#' + (n + 1)); } catch (e) { location.hash = String(n + 1); }
    }
  }

  function updateUI() {
    const s = slides[cur];
    counter.innerHTML = `<b>${pad(cur + 1)}</b> / ${pad(N)}`;
    $$('span', progress).forEach((seg, i) => {
      seg.classList.toggle('cur', i === cur);
      seg.classList.toggle('done', i < cur);
    });
    hudBar.style.transform = `scaleX(${(cur + 1) / N})`;
    const note = $('.slide-notes', s);
    notesText.textContent = note ? note.textContent.trim() : 'No notes for this slide.';
    notesNum.textContent = `${pad(cur + 1)} · ${s.dataset.title}`;
    live.textContent = `Slide ${cur + 1} of ${N}: ${s.dataset.title}`;
    $$('.thumb', ovGrid).forEach((t, i) => t.classList.toggle('cur', i === cur));
    $('[data-action="prev"]').disabled = cur === 0;
    $('[data-action="next"]').disabled = cur === N - 1;
  }

  /* ---------- Speaker notes ---------- */
  function toggleNotes(force) {
    const on = typeof force === 'boolean' ? force : notesEl.hidden;
    notesEl.hidden = !on;
    $$('.hud [data-action="notes"]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
    store.set('tideline-notes', on ? '1' : '0');
    fit();
  }

  /* ---------- Overview grid ---------- */
  let lastFocus = null;
  function buildGrid() {
    ovGrid.textContent = '';
    slides.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', `Slide ${i + 1}: ${s.dataset.title}`);
      const box = document.createElement('div');
      box.className = 'thumb-box';
      box.setAttribute('aria-hidden', 'true');
      const canvas = document.createElement('div');
      canvas.className = 'thumb-canvas';
      const c = s.cloneNode(true);
      c.classList.remove('is-leaving');
      c.classList.add('is-active', 'is-static');
      c.removeAttribute('aria-hidden');
      c.removeAttribute('role');
      c.removeAttribute('aria-label');
      c.removeAttribute('aria-roledescription');
      c.setAttribute('inert', '');
      $$('.slide-notes', c).forEach((n) => n.remove());
      finishCounts(c);
      canvas.appendChild(c);
      box.appendChild(canvas);
      const label = document.createElement('span');
      label.className = 'thumb-label';
      label.innerHTML = `<b>${pad(i + 1)}</b>`;
      label.appendChild(document.createTextNode(s.dataset.title));
      b.append(box, label);
      b.addEventListener('click', () => { toggleGrid(false); go(i); });
      ovGrid.appendChild(b);
    });
  }
  function sizeThumbs() {
    const box = $('.thumb-box', ovGrid);
    if (box) ovGrid.style.setProperty('--ts', box.clientWidth / W);
  }
  if ('ResizeObserver' in window) new ResizeObserver(sizeThumbs).observe(ovGrid);

  function toggleGrid(force) {
    const open = typeof force === 'boolean' ? force : overview.hidden;
    if (open === !overview.hidden) return;
    if (open) {
      lastFocus = document.activeElement;
      buildGrid();
      overview.hidden = false;
      sizeThumbs();
      updateUI();
      const t = $$('.thumb', ovGrid)[cur];
      if (t) { t.focus(); t.scrollIntoView({ block: 'nearest' }); }
    } else {
      overview.hidden = true;
      (lastFocus && lastFocus.focus) ? lastFocus.focus() : deck.focus();
    }
  }
  function gridKeys(e) {
    const thumbs = $$('.thumb', ovGrid);
    const i = thumbs.indexOf(document.activeElement);
    const cols = getComputedStyle(ovGrid).gridTemplateColumns.split(' ').length;
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (move !== undefined) {
      e.preventDefault();
      const t = thumbs[Math.max(0, Math.min(thumbs.length - 1, (i < 0 ? cur : i) + move))];
      t.focus();
    } else if (e.key === 'Tab') { // keep focus inside the dialog
      const f = $$('button', overview), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ---------- Fullscreen ---------- */
  const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  const btnFull = $('#btn-full');
  if (!fsEnabled) btnFull.hidden = true;
  function toggleFull() {
    if (!fsEnabled) return;
    const root = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      if (p && p.catch) p.catch(() => {});
    }
  }
  function onFs() {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    app.classList.toggle('is-fs', on);
    btnFull.setAttribute('aria-pressed', String(on));
    btnFull.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Fullscreen');
    fit();
  }
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  let idleT;
  document.addEventListener('mousemove', () => {
    app.classList.remove('is-idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => app.classList.add('is-idle'), 2200);
  });

  /* ---------- Input: buttons, keys, click, swipe ---------- */
  const actions = {
    prev: () => go(cur - 1), next: () => go(cur + 1),
    grid: () => toggleGrid(), notes: () => toggleNotes(), full: toggleFull
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (b && actions[b.dataset.action]) actions[b.dataset.action]();
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (!overview.hidden) {
      if (k === 'Escape' || k === 'g' || k === 'G') { e.preventDefault(); toggleGrid(false); }
      else gridKeys(e);
      return;
    }
    const onControl = e.target.closest && e.target.closest('button, a');
    if (onControl && (k === ' ' || k === 'Enter')) return; // let buttons/links work
    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown':
        e.preventDefault(); go(cur + 1); break;
      case ' ':
        e.preventDefault(); go(e.shiftKey ? cur - 1 : cur + 1); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); go(cur - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(N - 1); break;
      case 'g': case 'G': e.preventDefault(); toggleGrid(); break;
      case 'n': case 'N': e.preventDefault(); toggleNotes(); break;
      case 'f': case 'F': e.preventDefault(); toggleFull(); break;
      default:
    }
  });

  let swiped = false, tx = null, ty = 0;
  frame.addEventListener('click', (e) => {
    if (swiped || e.target.closest('a, button')) return;
    if (String(window.getSelection ? getSelection() : '').length) return;
    const r = frame.getBoundingClientRect();
    if (e.clientX - r.left < r.width * 0.3) go(cur - 1); else go(cur + 1);
  });
  stage.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    tx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped = true;
      go(dx < 0 ? cur + 1 : cur - 1);
      setTimeout(() => { swiped = false; }, 400);
    }
  }, { passive: true });

  /* ---------- Deep links (#5) ---------- */
  function fromHash() {
    const m = /^#(\d+)$/.exec(location.hash);
    return m ? Math.max(1, Math.min(N, +m[1])) - 1 : 0;
  }
  window.addEventListener('hashchange', () => go(fromHash(), { fromHash: true }));

  // Printing: make sure every number shows its final value
  window.addEventListener('beforeprint', () => finishCounts(document));

  /* ---------- Boot ---------- */
  const savedNotes = store.get('tideline-notes');
  const phonePortrait = matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
  if (savedNotes === '1' || (savedNotes === null && phonePortrait)) {
    notesEl.hidden = false;
    $$('.hud [data-action="notes"]').forEach((b) => b.setAttribute('aria-pressed', 'true'));
  }
  go(fromHash());
  fit();
})();
