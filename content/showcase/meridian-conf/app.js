/* =========================================================
   Meridian 2027 — interactions
   Content (speakers, sessions, event date) lives at the top
   of this file so it is easy to edit.
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- CONTENT ---------------- */

  // Opening keynote, Lisbon time (WEST, UTC+1)
  var EVENT_START = new Date('2027-05-14T09:30:00+01:00');

  // track: design | ai | eng
  var SPEAKERS = [
    { id: 'ines', name: 'Inês Vasconcelos', role: 'Head of Design', company: 'Halcyon', track: 'design',
      bio: 'Inês leads a 70-person design org at Halcyon, where she turned a weekend chat prototype into the conversational layer now used by four million people. Before that she co-founded the Lisbon studio Casa Norte. She opens and closes Meridian.' },
    { id: 'theo', name: 'Theo Marchetti', role: 'Principal Designer', company: 'Parallax AI', track: 'design',
      bio: 'Theo designs the tools other designers use to direct models. His essay “Craft After Automation” was the most-shared design piece of 2026, and he has opinions about kerning he will share whether asked or not.' },
    { id: 'amara', name: 'Amara Okafor', role: 'VP of Research', company: 'Lumen Systems', track: 'ai',
      bio: 'Amara runs applied research at Lumen Systems, studying how people calibrate trust in agentic software. Her team’s evaluation framework is used by product teams on three continents. Previously a cognitive scientist in Lagos.' },
    { id: 'kenji', name: 'Kenji Arakawa', role: 'Creative Technologist', company: 'Studio Kiri', track: 'design',
      bio: 'Kenji builds prototypes that talk, sing and occasionally argue. At Studio Kiri in Osaka he pairs designers with small local models to explore interfaces that don’t fit inside a frame.' },
    { id: 'sofia', name: 'Sofia Lindqvist', role: 'Design Director', company: 'Vectorial', track: 'design',
      bio: 'Sofia leads design at Vectorial, the vector platform used by 30,000 teams. She has spent two years working out how to measure quality when generated output is never the same twice.' },
    { id: 'rafael', name: 'Rafael Duarte', role: 'Staff Engineer', company: 'Ostra', track: 'eng',
      bio: 'Rafael is the reason Ostra’s assistant answers in under 400 ms. He writes about streaming architectures, edge inference and the dark art of perceived performance. Lisbon born and raised.' },
    { id: 'priya', name: 'Priya Raman', role: 'Director of AI Product', company: 'Fieldnote', track: 'ai',
      bio: 'Priya ships AI features to Fieldnote’s two million note-takers. She is known for the “autonomy ladder”, a framework for deciding how much an agent should do before it asks. Ex-founder, ex-journalist.' },
    { id: 'malik', name: 'Malik Haddad', role: 'Founder', company: 'Common Form Type Foundry', track: 'design',
      bio: 'Malik draws Latin and Arabic typefaces at Common Form, a small foundry split between Amman and Berlin. Lately he has been teaching models to respect a good counter — and documenting exactly where they fail.' },
    { id: 'lena', name: 'Lena Brandt', role: 'Interaction Designer', company: 'Kestrel', track: 'design',
      bio: 'Lena designs how Kestrel’s assistant shows its work: sources, confidence, and the moments it says “I’m not sure”. Her open-source pattern library for uncertainty UI is widely copied, which she considers a compliment.' },
    { id: 'jonah', name: 'Jonah Whitfield', role: 'ML Engineer', company: 'Orbitale', track: 'ai',
      bio: 'Jonah builds retrieval and on-device inference at Orbitale. He believes every embedding pipeline should be explainable to a designer with a whiteboard marker — and he brings the marker.' },
    { id: 'camille', name: 'Camille Roux', role: 'Head of Brand', company: 'Atelier Nord', track: 'ai',
      bio: 'Camille runs brand at Atelier Nord, a Paris agency that fine-tunes small models to write in their clients’ voice. She has strong opinions on adjectives and the data to back them up.' },
    { id: 'daniel', name: 'Daniel Osei', role: 'Design Systems Lead', company: 'Tessellate', track: 'eng',
      bio: 'Daniel leads Tessellate’s design system, which now renders generated interfaces as well as hand-built ones. He argues accessibility should be a default machines inherit, not a checklist humans bolt on.' }
  ];

  // kind: keynote | talk | panel | workshop | break   (breaks can’t be starred)
  var ROOMS = ['Main Hall', 'Studio Atlântico', 'The Dock', 'Foyer', 'Terrace'];
  var SESSIONS = [
    // ---- Day 1 · Fri 14 May ----
    { id: 'd1-01', day: 1, start: '08:30', end: '09:30', kind: 'break', room: 'Foyer', title: 'Registration, coffee & pastéis de nata' },
    { id: 'd1-02', day: 1, start: '09:30', end: '10:15', kind: 'keynote', track: 'design', room: 'Main Hall', title: 'The Interface Is Becoming a Conversation', speakers: ['ines'] },
    { id: 'd1-03', day: 1, start: '10:30', end: '11:15', kind: 'talk', track: 'ai', room: 'Main Hall', title: 'Designing for Probabilistic Software', speakers: ['priya'] },
    { id: 'd1-04', day: 1, start: '10:30', end: '11:15', kind: 'talk', track: 'design', room: 'Studio Atlântico', title: 'Type at the Speed of Thought: Variable Fonts in Generative UI', speakers: ['malik'] },
    { id: 'd1-05', day: 1, start: '10:30', end: '11:15', kind: 'talk', track: 'eng', room: 'The Dock', title: 'Shipping LLM Features Without Shipping Latency', speakers: ['rafael'] },
    { id: 'd1-06', day: 1, start: '11:30', end: '12:15', kind: 'talk', track: 'ai', room: 'Main Hall', title: 'Evals Are the New Design Review', speakers: ['amara', 'jonah'] },
    { id: 'd1-07', day: 1, start: '11:30', end: '12:15', kind: 'talk', track: 'design', room: 'Studio Atlântico', title: 'Prototyping with Models, Not Mockups', speakers: ['kenji'] },
    { id: 'd1-08', day: 1, start: '11:30', end: '12:15', kind: 'talk', track: 'eng', room: 'The Dock', title: 'Streaming UI: Patterns for Partial Answers', speakers: ['daniel'] },
    { id: 'd1-09', day: 1, start: '12:15', end: '14:00', kind: 'break', room: 'Terrace', title: 'Lunch on the riverside terrace' },
    { id: 'd1-10', day: 1, start: '14:00', end: '14:45', kind: 'talk', track: 'design', room: 'Main Hall', title: 'Trust, Explained: Making Model Uncertainty Visible', speakers: ['lena'] },
    { id: 'd1-11', day: 1, start: '14:00', end: '14:45', kind: 'talk', track: 'ai', room: 'Studio Atlântico', title: 'Fine-Tuning Taste: Small Models for Brand Voice', speakers: ['camille'] },
    { id: 'd1-12', day: 1, start: '14:00', end: '15:30', kind: 'workshop', track: 'eng', room: 'The Dock', title: 'Your Design System as Model Context', speakers: ['sofia'] },
    { id: 'd1-13', day: 1, start: '15:00', end: '15:45', kind: 'panel', track: 'design', room: 'Main Hall', title: 'Who Owns the Pixel? Authorship in AI-Assisted Work', speakers: ['theo', 'camille', 'malik'] },
    { id: 'd1-14', day: 1, start: '16:15', end: '17:00', kind: 'keynote', track: 'design', room: 'Main Hall', title: 'Craft After Automation', speakers: ['theo'] },
    { id: 'd1-15', day: 1, start: '18:00', end: '21:00', kind: 'break', room: 'Terrace', title: 'Opening party: sunset, grilled sardines & a DJ set' },
    // ---- Day 2 · Sat 15 May ----
    { id: 'd2-01', day: 2, start: '09:00', end: '09:30', kind: 'break', room: 'Foyer', title: 'Coffee & breakfast' },
    { id: 'd2-02', day: 2, start: '09:30', end: '10:15', kind: 'keynote', track: 'ai', room: 'Main Hall', title: 'Agents Need Affordances', speakers: ['amara'] },
    { id: 'd2-03', day: 2, start: '10:30', end: '11:15', kind: 'talk', track: 'design', room: 'Main Hall', title: 'The Brand Is the Prompt', speakers: ['camille'] },
    { id: 'd2-04', day: 2, start: '10:30', end: '11:15', kind: 'talk', track: 'design', room: 'Studio Atlântico', title: 'Motion as Meaning in AI Interfaces', speakers: ['lena'] },
    { id: 'd2-05', day: 2, start: '10:30', end: '11:15', kind: 'talk', track: 'eng', room: 'The Dock', title: 'Retrieval Pipelines a Designer Can Read', speakers: ['jonah'] },
    { id: 'd2-06', day: 2, start: '11:30', end: '12:15', kind: 'talk', track: 'ai', room: 'Main Hall', title: 'From Copilot to Colleague: Mapping Agent Autonomy', speakers: ['priya'] },
    { id: 'd2-07', day: 2, start: '11:30', end: '12:15', kind: 'talk', track: 'design', room: 'Studio Atlântico', title: 'Accessible by Default in Generated UI', speakers: ['daniel'] },
    { id: 'd2-08', day: 2, start: '11:30', end: '13:00', kind: 'workshop', track: 'eng', room: 'The Dock', title: 'Build a Voice Interface in 90 Minutes', speakers: ['kenji', 'rafael'] },
    { id: 'd2-09', day: 2, start: '13:00', end: '14:15', kind: 'break', room: 'Terrace', title: 'Lunch & community tables' },
    { id: 'd2-10', day: 2, start: '14:15', end: '15:00', kind: 'talk', track: 'design', room: 'Main Hall', title: 'Measuring Delight When the Output Changes Every Time', speakers: ['sofia'] },
    { id: 'd2-11', day: 2, start: '14:15', end: '15:00', kind: 'talk', track: 'design', room: 'Studio Atlântico', title: 'Letterforms That Learn: Type Design with Machine Assistance', speakers: ['malik'] },
    { id: 'd2-12', day: 2, start: '14:15', end: '15:00', kind: 'talk', track: 'eng', room: 'The Dock', title: 'On-Device Models for Private Interfaces', speakers: ['rafael'] },
    { id: 'd2-13', day: 2, start: '15:15', end: '16:00', kind: 'talk', track: 'ai', room: 'Main Hall', title: 'Lightning Round: Ten Minutes of the Future', note: 'Six community speakers' },
    { id: 'd2-14', day: 2, start: '16:15', end: '17:00', kind: 'keynote', track: 'design', room: 'Main Hall', title: 'Closing Keynote: Where the Line Goes Next', speakers: ['ines', 'theo'] },
    { id: 'd2-15', day: 2, start: '17:00', end: '19:00', kind: 'break', room: 'Terrace', title: 'Farewell drinks on the terrace' }
  ];

  var TRACK_LABEL = { design: 'Design', ai: 'AI', eng: 'Engineering' };
  var DAY_LABEL = { 1: 'Fri 14 May', 2: 'Sat 15 May' };
  var AGENDA_KEY = 'meridian27:agenda';

  /* ---------------- HELPERS ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var byId = {};
  SPEAKERS.forEach(function (s) { byId[s.id] = s; });

  var store = {
    get: function (k, fallback) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  // tiny seeded PRNG so each portrait is unique but stable
  function seeded(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  var fmt0 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var fmt2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
  var euro = { format: function (n) { return (n % 1 ? fmt2 : fmt0).format(n); } };

  /* ---------------- HEADER ---------------- */
  function initHeader() {
    var header = $('#siteHeader'), toggle = $('#navToggle'), nav = $('#mainNav');
    function onScroll() { header.classList.toggle('is-condensed', window.scrollY > 40); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open);
    }
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });

    // highlight the nav link of the section in view
    if (!('IntersectionObserver' in window)) return;
    var links = $$('a', nav);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { io.observe(s); });
  }

  /* ---------------- HERO: generative meridian globe ---------------- */
  function initHeroCanvas() {
    var c = $('#heroCanvas');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var w = 0, h = 0, running = true, start = performance.now();
    var ptr = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    var VIOLET = '139,108,255', CORAL = '255,106,85', AMBER = '255,181,71';

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function glow(x, y, r, rgb, a) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function draw(t) {
      var mobile = w < 720;
      ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
      var R = mobile ? w * 0.62 : Math.min(h * 0.47, w * 0.3);
      var cx = (mobile ? w * 0.78 : w * 0.7) + (ptr.x - 0.5) * 40;
      var cy = (mobile ? h * 0.3 : h * 0.43) + (ptr.y - 0.5) * 24;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      // orbital gradient glows
      glow(cx - R * 0.45 + Math.sin(t * 0.21) * 30, cy - R * 0.25, R * 1.5, VIOLET, 0.32);
      glow(cx + R * 0.55, cy + R * 0.55 + Math.cos(t * 0.17) * 30, R * 1.1, CORAL, 0.22);
      glow(cx + R * 0.1, cy + R * 1.05, R * 0.8, AMBER, 0.14);

      // ---- globe of meridians (orthographic projection, two passes: back + front) ----
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.36);
      var spin = t * 0.12, tilt = 0.42 + Math.sin(t * 0.13) * 0.04;
      var ct = Math.cos(tilt), st = Math.sin(tilt);
      var back = new Path2D(), front = new Path2D();
      function curve(fn, steps) {
        var prevFront = null;
        for (var i = 0; i <= steps; i++) {
          var p = fn(i / steps);
          var isFront = p[2] >= 0, path = isFront ? front : back;
          if (prevFront !== isFront) { (isFront ? front : back).moveTo(p[0], p[1]); }
          else path.lineTo(p[0], p[1]);
          prevFront = isFront;
        }
      }
      function proj(lat, lon) {
        var x = R * Math.cos(lat) * Math.sin(lon), y0 = -R * Math.sin(lat), z0 = R * Math.cos(lat) * Math.cos(lon);
        return [x, y0 * ct - z0 * st, y0 * st + z0 * ct];
      }
      var M = mobile ? 14 : 20;
      for (var m = 0; m < M; m++) {
        (function (lon) { curve(function (u) { return proj(-Math.PI / 2 + u * Math.PI, lon); }, 48); })(m / M * Math.PI * 2 + spin);
      }
      for (var k = -3; k <= 3; k++) {
        (function (lat) { curve(function (u) { return proj(lat, u * Math.PI * 2 + spin); }, 72); })(k * Math.PI / 8);
      }
      var grad = ctx.createLinearGradient(-R, -R, R, R);
      grad.addColorStop(0, 'rgb(' + VIOLET + ')'); grad.addColorStop(0.55, 'rgb(' + CORAL + ')'); grad.addColorStop(1, 'rgb(' + AMBER + ')');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1; ctx.globalAlpha = 0.16; ctx.stroke(back);
      ctx.lineWidth = 1.4; ctx.globalAlpha = 0.75; ctx.stroke(front);
      ctx.globalAlpha = 0.9; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

      // satellites travelling over the surface
      ctx.globalAlpha = 1;
      for (var s = 0; s < 6; s++) {
        var p = proj(Math.sin(t * 0.25 + s * 1.7) * 1.1, s * 1.05 + t * (0.35 + s * 0.04));
        if (p[2] < 0) continue;
        glow(p[0], p[1], 16, s % 2 ? AMBER : CORAL, 0.9);
        ctx.fillStyle = '#FFF4E6';
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // ---- flowing meridian ribbon across the hero ----
      var lines = mobile ? 16 : 26, step = mobile ? 14 : 10;
      var lg = ctx.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, 'rgba(' + VIOLET + ',0.05)');
      lg.addColorStop(0.45, 'rgba(' + VIOLET + ',0.5)');
      lg.addColorStop(0.75, 'rgba(' + CORAL + ',0.6)');
      lg.addColorStop(1, 'rgba(' + AMBER + ',0.55)');
      ctx.strokeStyle = lg; ctx.lineWidth = 1;
      ctx.globalAlpha = mobile ? 0.5 : 0.62;
      var base = mobile ? h * 0.5 : h * 0.66;
      for (var i = 0; i < lines; i++) {
        var f = i / (lines - 1);
        ctx.beginPath();
        for (var x = -20; x <= w + 20; x += step) {
          var u = x / w;
          var spread = (mobile ? 50 : 150) * (0.25 + u);
          var y = base + (f - 0.5) * spread
            + Math.sin(u * 5.2 + t * 0.55 + f * 1.6) * (26 + 30 * u)
            + Math.sin(u * 11 - t * 0.4 + f * 3.1) * 8 * (1 - u * 0.5)
            - Math.exp(-Math.pow((x - cx) / (R * 0.9), 2)) * R * 0.28;
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!running) return;
      draw((now - start) / 1000);
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', function () { resize(); if (reduceMotion) draw(6); });
    if (reduceMotion) { draw(6); return; }
    window.addEventListener('pointermove', function (e) { ptr.tx = e.clientX / window.innerWidth; ptr.ty = e.clientY / window.innerHeight; }, { passive: true });
    // pause when the hero is off-screen or the tab is hidden
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting && !document.hidden;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        running = vis;
      }).observe(c);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !running) { running = true; requestAnimationFrame(frame); }
      else if (document.hidden) running = false;
    });
    requestAnimationFrame(frame);
  }

  /* ---------------- COUNTDOWN ---------------- */
  function initCountdown() {
    var els = {};
    $$('[data-cd]').forEach(function (el) { els[el.getAttribute('data-cd')] = el; });
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      var diff = Math.max(0, EVENT_START.getTime() - Date.now());
      var s = Math.floor(diff / 1000);
      els.days.textContent = pad(Math.floor(s / 86400));
      els.hours.textContent = pad(Math.floor(s % 86400 / 3600));
      els.minutes.textContent = pad(Math.floor(s % 3600 / 60));
      els.seconds.textContent = pad(s % 60);
      if (diff === 0) { $('#cdLabel').innerHTML = '<span class="mono-label">Meridian is live</span>'; return; }
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  }

  /* ---------------- PORTRAITS: generated abstract SVG ---------------- */
  var PALETTES = [
    ['#1C1342', '#3B1F73', '#FF6A55', '#FFB547'],
    ['#2C0F16', '#702032', '#FFB547', '#F5F2EC'],
    ['#0F1A30', '#243266', '#8B6CFF', '#FF6A55'],
    ['#2A1806', '#6E3C0C', '#FFB547', '#FF6A55'],
    ['#15121E', '#2D2546', '#8B6CFF', '#C9BDFF'],
    ['#3A1330', '#7C2A50', '#FFB547', '#8B6CFF']
  ];
  var uid = 0;
  function portrait(sp, idx, decorative) {
    var r = seeded(sp.id), pal = PALETTES[idx % PALETTES.length], id = 'p' + (uid++);
    var initials = sp.name.split(' ').map(function (n) { return n[0]; }).join('').slice(0, 2);
    var style = idx % 4, layer = '';
    var hx = 100 + (r() - 0.5) * 16, hy = 84 + (r() - 0.5) * 8, hr = 30 + r() * 8;
    if (style === 0) { // concentric orbit rings
      var ox = 40 + r() * 120, oy = 30 + r() * 60;
      for (var i = 1; i < 9; i++) layer += '<circle cx="' + ox + '" cy="' + oy + '" r="' + i * 18 + '" fill="none" stroke="' + pal[3] + '" stroke-opacity="' + (0.5 - i * 0.05) + '"/>';
    } else if (style === 1) { // meridian ellipses
      for (var j = 0; j < 7; j++) layer += '<ellipse cx="' + hx + '" cy="100" rx="' + (12 + j * 15) + '" ry="96" fill="none" stroke="' + pal[2] + '" stroke-opacity=".32"/>';
    } else if (style === 2) { // flowing lines
      for (var k = 0; k < 14; k++) {
        var y = 10 + k * 13, a = 6 + r() * 10;
        layer += '<path d="M-10 ' + y + ' C 50 ' + (y - a) + ', 120 ' + (y + a * 1.6) + ', 210 ' + (y - a) + '" fill="none" stroke="' + pal[3] + '" stroke-opacity=".28"/>';
      }
    } else { // dot field
      for (var gx = 0; gx < 10; gx++) for (var gy = 0; gy < 10; gy++) {
        layer += '<circle cx="' + (10 + gx * 20) + '" cy="' + (10 + gy * 20) + '" r="' + (1 + r() * 2.2).toFixed(1) + '" fill="' + pal[3] + '" fill-opacity=".35"/>';
      }
    }
    var sw = 58 + r() * 14; // shoulder width
    return '<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" ' + (decorative ? 'aria-hidden="true"' : 'role="img" aria-label="Abstract portrait of ' + esc(sp.name) + '"') + '>' +
      '<defs><linearGradient id="' + id + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + pal[0] + '"/><stop offset="1" stop-color="' + pal[1] + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + pal[2] + '"/><stop offset="1" stop-color="' + pal[3] + '"/></linearGradient></defs>' +
      '<rect width="200" height="200" fill="url(#' + id + 'b)"/>' + layer +
      '<path d="M' + (100 - sw - 20) + ' 210 C ' + (100 - sw) + ' 140, ' + (100 + sw) + ' 140, ' + (100 + sw + 20) + ' 210 Z" fill="url(#' + id + 'f)"/>' +
      '<circle cx="' + hx + '" cy="' + hy + '" r="' + hr + '" fill="url(#' + id + 'f)"/>' +
      '<circle cx="' + (hx - hr * 0.35) + '" cy="' + (hy - hr * 0.35) + '" r="' + hr * 0.5 + '" fill="#fff" fill-opacity=".14"/>' +
      '<text x="14" y="30" font-family="Unbounded, Inter, sans-serif" font-weight="700" font-size="18" fill="#F5F2EC" fill-opacity=".92">' + esc(initials) + '</text>' +
      '</svg>';
  }

  /* ---------------- SPEAKERS ---------------- */
  function sessionsFor(spId) { return SESSIONS.filter(function (s) { return (s.speakers || []).indexOf(spId) > -1; }); }

  function initSpeakers() {
    var grid = $('#speakerGrid');
    grid.innerHTML = SPEAKERS.map(function (sp, i) {
      return '<li data-reveal style="transition-delay:' + (i % 4) * 70 + 'ms">' +
        '<button type="button" class="speaker-card" data-speaker="' + sp.id + '" aria-haspopup="dialog">' +
        '<span class="portrait">' + portrait(sp, i, true) + '</span>' +
        '<span class="speaker-meta"><span class="speaker-name">' + esc(sp.name) + '</span>' +
        '<span class="speaker-role">' + esc(sp.role) + ', ' + esc(sp.company) + '</span>' +
        '<span class="speaker-tags"><span class="tag tag-' + sp.track + '">' + TRACK_LABEL[sp.track] + '</span></span></span>' +
        '</button></li>';
    }).join('');
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-speaker]');
      if (t) openSpeaker(t.getAttribute('data-speaker'));
    });
  }

  function openSpeaker(id) {
    var sp = byId[id]; if (!sp) return;
    var dlg = $('#speakerDialog');
    $('#sdPortrait').innerHTML = portrait(sp, SPEAKERS.indexOf(sp));
    $('#sdTrack').textContent = TRACK_LABEL[sp.track] + ' track';
    $('#sdName').textContent = sp.name;
    $('#sdRole').textContent = sp.role + ', ' + sp.company;
    $('#sdBio').textContent = sp.bio;
    $('#sdSessions').innerHTML = sessionsFor(id).map(function (s) {
      return '<li><span class="sd-s-title">' + esc(s.title) + '</span><span class="sd-s-meta">Day ' + s.day + ' · ' + DAY_LABEL[s.day] + ' · ' + s.start + '–' + s.end + ' · ' + esc(s.room) + '</span></li>';
    }).join('');
    if (dlg.open) dlg.close();
    showDialog(dlg);
  }

  /* ---------------- DIALOG HELPERS ---------------- */
  function showDialog(dlg) {
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function initDialogs() {
    $$('dialog').forEach(function (dlg) {
      dlg.addEventListener('click', function (e) {
        if (e.target.closest('[data-close]')) { dlg.close(); return; }
        if (e.target !== dlg) return;
        var b = dlg.getBoundingClientRect(); // click on the backdrop closes
        if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) dlg.close();
      });
    });
  }

  /* ---------------- SCHEDULE ---------------- */
  function initSchedule() {
    var state = { day: 1, track: 'all', agendaOnly: false, agenda: store.get(AGENDA_KEY, []) };
    var list = $('#timeline'), empty = $('#scheduleEmpty'), status = $('#scheduleStatus');
    var tabs = $$('.day-tab'), chips = $$('.chip[data-track]'), agendaBtn = $('#agendaToggle');
    var STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2.5 2.3 4.8 5.2.7-3.8 3.6.9 5.2L10 14.3l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/></svg>';
    var PIN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14s5-4.2 5-8A5 5 0 0 0 3 6c0 3.8 5 8 5 8z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="6" r="1.8" fill="currentColor"/></svg>';

    function isSaved(id) { return state.agenda.indexOf(id) > -1; }

    function render() {
      var rows = SESSIONS.filter(function (s) {
        if (s.day !== state.day) return false;
        if (state.agendaOnly) return isSaved(s.id);
        if (s.kind === 'break') return true;
        return state.track === 'all' || s.track === state.track;
      }).sort(function (a, b) { return a.start.localeCompare(b.start) || ROOMS.indexOf(a.room) - ROOMS.indexOf(b.room); });

      list.innerHTML = rows.map(function (s, i) {
        var delay = reduceMotion ? '' : ' style="animation-delay:' + Math.min(i * 35, 400) + 'ms"';
        var time = '<div class="session-time">' + s.start + '<small>– ' + s.end + '</small></div>';
        if (s.kind === 'break') {
          return '<li class="session is-break"' + delay + '>' + time + '<div class="session-body"><p class="session-title">' + esc(s.title) + '</p><div class="session-info"><span class="session-room">' + PIN + esc(s.room) + '</span></div></div></li>';
        }
        var who = (s.speakers || []).map(function (id) {
          var sp = byId[id]; return '<button type="button" class="speaker-link" data-speaker="' + id + '">' + esc(sp.name) + '</button>';
        }).join('') || '<span>' + esc(s.note || '') + '</span>';
        var saved = isSaved(s.id);
        var kind = s.kind !== 'talk' ? '<span class="tag">' + s.kind + '</span>' : '';
        return '<li class="session" data-track="' + s.track + '"' + delay + '>' + time +
          '<div class="session-body"><h3 class="session-title">' + esc(s.title) + '</h3>' +
          '<div class="session-info"><span class="tag tag-' + s.track + '">' + TRACK_LABEL[s.track] + '</span>' + kind +
          '<span class="session-room">' + PIN + esc(s.room) + '</span><span class="session-speakers">' + who + '</span></div></div>' +
          '<button type="button" class="star" data-star="' + s.id + '" aria-pressed="' + saved + '" aria-label="' + (saved ? 'Remove from' : 'Add to') + ' my agenda: ' + esc(s.title) + '">' + STAR + '</button></li>';
      }).join('');

      var total = state.agenda.length;
      $('#agendaCount').textContent = total;
      empty.hidden = rows.length > 0;
      if (!rows.length) {
        var other = state.agenda.filter(function (id) { return id.indexOf('d' + state.day) !== 0; }).length;
        empty.textContent = other
          ? 'Nothing saved for ' + DAY_LABEL[state.day] + ' yet — you have ' + other + ' session' + (other > 1 ? 's' : '') + ' on Day ' + (state.day === 1 ? 2 : 1) + '.'
          : 'Your agenda is empty. Tap the star on any session to save it here.';
      }
    }

    function selectDay(day, focus) {
      state.day = day;
      tabs.forEach(function (t) {
        var on = +t.getAttribute('data-day') === day;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) { $('#schedulePanel').setAttribute('aria-labelledby', t.id); if (focus) t.focus(); }
      });
      render();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectDay(+t.getAttribute('data-day')); });
      t.addEventListener('keydown', function (e) { // arrow-key navigation between tabs
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectDay(+tabs[(i + 1) % tabs.length].getAttribute('data-day'), true); }
      });
    });
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        state.track = c.getAttribute('data-track');
        state.agendaOnly = false; agendaBtn.setAttribute('aria-pressed', 'false');
        chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
        render();
      });
    });
    agendaBtn.addEventListener('click', function () {
      state.agendaOnly = !state.agendaOnly;
      agendaBtn.setAttribute('aria-pressed', String(state.agendaOnly));
      if (state.agendaOnly) chips.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
      else { state.track = 'all'; chips[0].setAttribute('aria-pressed', 'true'); }
      render();
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-star]'); if (!b) return;
      var id = b.getAttribute('data-star'), title = b.closest('.session').querySelector('.session-title').textContent;
      var on = !isSaved(id);
      state.agenda = on ? state.agenda.concat(id) : state.agenda.filter(function (x) { return x !== id; });
      store.set(AGENDA_KEY, state.agenda);
      status.textContent = (on ? 'Added to' : 'Removed from') + ' your agenda: ' + title;
      if (state.agendaOnly && !on) { render(); return; }
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? 'Remove from' : 'Add to') + ' my agenda: ' + title);
      b.classList.remove('pop'); void b.offsetWidth; if (on) b.classList.add('pop');
      $('#agendaCount').textContent = state.agenda.length;
    });
    render();
  }

  /* ---------------- TICKETS + CHECKOUT ---------------- */
  function initTickets() {
    var dlg = $('#checkoutDialog'), form = $('#coForm'), msg = $('#coMsg');
    var order = null;

    $$('.tier').forEach(function (tier) {
      var out = $('.qty-val', tier), btns = $$('.qty-btn', tier), qty = 1;
      function sync() { out.textContent = qty; btns[0].disabled = qty <= 1; btns[1].disabled = qty >= 10; }
      btns.forEach(function (b) { b.addEventListener('click', function () { qty = Math.min(10, Math.max(1, qty + +b.getAttribute('data-step'))); sync(); }); });
      sync();
      $('.buy-btn', tier).addEventListener('click', function () {
        order = { tier: tier.getAttribute('data-tier'), name: tier.getAttribute('data-name'), price: +tier.getAttribute('data-price'), qty: qty };
        openCheckout();
      });
    });

    function totals(o) {
      var sub = o.price * o.qty, disc = o.qty >= 5 ? Math.round(sub * 0.1 * 100) / 100 : 0;
      return { sub: sub, disc: disc, total: sub - disc };
    }

    function openCheckout() {
      var t = totals(order);
      $('#coSummary').innerHTML =
        '<div class="co-row"><span>' + esc(order.name) + ' × ' + order.qty + '</span><span>' + euro.format(t.sub) + '</span></div>' +
        (t.disc ? '<div class="co-row"><span>Team discount (10%)</span><span>−' + euro.format(t.disc) + '</span></div>' : '') +
        '<div class="co-row total"><span>Total</span><span>' + euro.format(t.total) + '</span></div>' +
        '<div class="co-row"><span class="muted">Early-bird price, VAT included</span></div>';
      $('#coDayField').hidden = order.tier !== 'day';
      $('#coStep').hidden = false; $('#coDone').hidden = true;
      msg.textContent = ''; msg.className = 'form-msg';
      $$('.input', form).forEach(function (i) { i.removeAttribute('aria-invalid'); });
      showDialog(dlg);
      setTimeout(function () { $('#coName').focus(); }, 50);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#coName'), email = $('#coEmail'), errs = [];
      name.setAttribute('aria-invalid', String(!name.value.trim()));
      if (!name.value.trim()) errs.push('your name');
      var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      email.setAttribute('aria-invalid', String(!okEmail));
      if (!okEmail) errs.push('a valid email');
      if (errs.length) {
        msg.textContent = 'Please add ' + errs.join(' and ') + '.'; msg.className = 'form-msg is-err';
        (name.value.trim() ? email : name).focus();
        return;
      }
      var t = totals(order), first = name.value.trim().split(/\s+/)[0];
      var ref = 'MRD27-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      var day = order.tier === 'day' ? ' for ' + $('#coDay').value : '';
      $('#coDoneTitle').textContent = 'You’re in, ' + first + '.';
      $('#coDoneText').textContent = order.qty + ' × ' + order.name + day + ' reserved — ' + euro.format(t.total) +
        '. A confirmation would go to ' + email.value.trim() + '. This is a demo: no payment was taken.';
      $('#coRef').textContent = 'Order ref ' + ref;
      $('#coStep').hidden = true;
      var done = $('#coDone'); done.hidden = false; done.focus();
      form.reset();
    });
  }

  /* ---------------- VENUE MAP PINS ---------------- */
  function initMap() {
    var items = $$('.travel-item'), pins = $$('.map-pin');
    function setActive(n) {
      items.forEach(function (i) { i.classList.toggle('is-active', i.getAttribute('data-pin') === n); i.setAttribute('aria-pressed', String(i.getAttribute('data-pin') === n)); });
      pins.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-pin') === n); });
    }
    items.forEach(function (i) {
      var n = i.getAttribute('data-pin');
      i.addEventListener('mouseenter', function () { setActive(n); });
      i.addEventListener('focus', function () { setActive(n); });
      i.addEventListener('click', function () { setActive(n); });
    });
    pins.forEach(function (p) { p.addEventListener('mouseenter', function () { setActive(p.getAttribute('data-pin')); }); });
    setActive('1');
  }

  /* ---------------- NEWSLETTER ---------------- */
  function initNewsletter() {
    var form = $('#nlForm'), input = $('#nlEmail'), msg = $('#nlMsg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = 'That email doesn’t look quite right — mind checking it?'; msg.className = 'form-msg is-err';
        input.focus(); return;
      }
      input.removeAttribute('aria-invalid');
      msg.textContent = 'You’re on the list. First program drop lands in your inbox in February.'; msg.className = 'form-msg is-ok';
      form.reset();
    });
  }

  /* ---------------- SCROLL REVEALS ---------------- */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- BOOT ---------------- */
  initHeader();
  initHeroCanvas();
  initCountdown();
  initSpeakers();
  initDialogs();
  initSchedule();
  initTickets();
  initMap();
  initNewsletter();
  initReveal();
})();
