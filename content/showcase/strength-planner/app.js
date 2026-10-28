/* =========================================================
   Forge — weekly strength planner (vanilla JS, no build)
   1. Exercise library        4. Rendering
   2. Programming rules       5. Library browser
   3. Plan generator + swap   6. Wiring, storage, theme
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. Exercise library
     X(id, name, pattern, equipment ("a+b" = needs both), muscles, difficulty 1-3, style, form cue)
     style: load (external weight) · bw (bodyweight/band, rep ranges run higher)
            iso (single-joint accessory) · time (holds) · carry (distance)
     --------------------------------------------------------- */
  function X(id, name, pattern, eq, muscles, diff, style, tip) {
    return { id: id, name: name, pattern: pattern, eq: eq.split('+'), muscles: muscles, diff: diff, style: style, tip: tip };
  }

  var LIBRARY = [
    // Squat
    X('goblet-db', 'Goblet squat', 'squat', 'dumbbells', 'Quads, glutes', 1, 'load', 'Hold the bell at your chest and sit down between your heels.'),
    X('goblet-kb', 'Kettlebell goblet squat', 'squat', 'kettlebell', 'Quads, glutes', 1, 'load', 'Grip the horns, elbows inside knees, chest proud all the way.'),
    X('air-squat', 'Bodyweight squat', 'squat', 'bodyweight', 'Quads, glutes', 1, 'bw', 'Arms forward for balance; knees track over your toes.'),
    X('back-squat', 'Barbell back squat', 'squat', 'barbell', 'Quads, glutes, adductors', 2, 'load', 'Brace before you unrack, then drive the floor away.'),
    X('front-squat', 'Barbell front squat', 'squat', 'barbell', 'Quads, upper back', 3, 'load', 'Elbows high so the bar rests on your shoulders, not your wrists.'),
    X('leg-press', 'Leg press', 'squat', 'machines', 'Quads, glutes', 1, 'load', 'Lower until your hips start to tuck, then press through mid-foot.'),
    X('hack-squat', 'Hack squat', 'squat', 'machines', 'Quads', 2, 'load', 'Feet mid-platform and keep your back glued to the pad.'),
    X('band-squat', 'Banded squat', 'squat', 'bands', 'Quads, glutes', 1, 'bw', 'Stand on the band, handles at shoulders, pause at the bottom.'),
    X('box-pistol', 'Pistol squat to box', 'squat', 'bodyweight', 'Quads, glutes, balance', 3, 'bw', 'Control the descent on one leg; touch the box, don’t drop onto it.'),
    // Hinge
    X('rdl-bb', 'Romanian deadlift', 'hinge', 'barbell', 'Hamstrings, glutes', 2, 'load', 'Hips back, bar close; stop when your hamstrings are tight.'),
    X('deadlift', 'Conventional deadlift', 'hinge', 'barbell', 'Posterior chain', 3, 'load', 'Pull the slack out of the bar, then push the floor away.'),
    X('hip-thrust-bb', 'Barbell hip thrust', 'hinge', 'barbell', 'Glutes', 2, 'load', 'Chin tucked and shins vertical at the top; no lower-back arch.'),
    X('rdl-db', 'Dumbbell Romanian deadlift', 'hinge', 'dumbbells', 'Hamstrings, glutes', 1, 'load', 'Soft knees, long spine, bells slide down your thighs.'),
    X('sl-rdl-db', 'Single-leg dumbbell RDL', 'hinge', 'dumbbells', 'Hamstrings, glutes, balance', 2, 'load', 'Keep hips square to the floor and reach the back leg long.'),
    X('kb-swing', 'Kettlebell swing', 'hinge', 'kettlebell', 'Glutes, hamstrings', 2, 'load', 'Hike it back, snap the hips; your arms are just ropes.'),
    X('kb-deadlift', 'Kettlebell deadlift', 'hinge', 'kettlebell', 'Glutes, hamstrings', 1, 'load', 'Bell between your feet, hips back, stand up tall.'),
    X('glute-bridge', 'Glute bridge', 'hinge', 'bodyweight', 'Glutes, hamstrings', 1, 'bw', 'Ribs down; squeeze your glutes for a full second at the top.'),
    X('sl-hip-thrust', 'Single-leg hip thrust', 'hinge', 'bodyweight', 'Glutes', 2, 'bw', 'Shoulders on a bench or sofa; drive through the heel.'),
    X('band-pull-through', 'Band pull-through', 'hinge', 'bands', 'Glutes, hamstrings', 1, 'bw', 'Anchor low behind you and let the band pull your hips back.'),
    X('back-ext', '45° back extension', 'hinge', 'machines', 'Hamstrings, glutes, lower back', 1, 'bw', 'Hinge at the hips over the pad and finish with your glutes.'),
    X('leg-curl', 'Lying leg curl', 'hinge', 'machines', 'Hamstrings', 1, 'iso', 'Hips pinned to the pad; take three seconds on the way down.'),
    // Horizontal push
    X('push-up', 'Push-up', 'hpush', 'bodyweight', 'Chest, triceps', 1, 'bw', 'Body in one line, elbows about 45° from your sides.'),
    X('feet-up-push-up', 'Feet-elevated push-up', 'hpush', 'bodyweight', 'Upper chest, shoulders', 2, 'bw', 'Squeeze glutes so your hips don’t sag as the angle steepens.'),
    X('archer-push-up', 'Archer push-up', 'hpush', 'bodyweight', 'Chest, triceps', 3, 'bw', 'Shift over the working arm; the other arm stays long.'),
    X('bench-bb', 'Barbell bench press', 'hpush', 'barbell', 'Chest, triceps, front delts', 2, 'load', 'Shoulder blades pinned; bar to lower chest, press up and back.'),
    X('bench-db', 'Dumbbell bench press', 'hpush', 'dumbbells', 'Chest, triceps', 1, 'load', 'No bench? Floor press works. Wrists stacked over elbows.'),
    X('incline-db', 'Incline dumbbell press', 'hpush', 'dumbbells', 'Upper chest, shoulders', 2, 'load', 'Low incline, about 30°; lower to the top of your chest.'),
    X('chest-press', 'Machine chest press', 'hpush', 'machines', 'Chest, triceps', 1, 'load', 'Handles at mid-chest height; don’t let shoulders roll forward.'),
    X('band-chest-press', 'Band chest press', 'hpush', 'bands', 'Chest, triceps', 1, 'bw', 'Anchor behind you at chest height and press in a slight arc.'),
    X('kb-floor-press', 'Kettlebell floor press', 'hpush', 'kettlebell', 'Chest, triceps', 1, 'load', 'Pause with your triceps on the floor, then press.'),
    // Vertical push
    X('ohp-bb', 'Standing overhead press', 'vpush', 'barbell', 'Shoulders, triceps', 2, 'load', 'Squeeze glutes, press, and move your head through at the top.'),
    X('push-press', 'Barbell push press', 'vpush', 'barbell', 'Shoulders, triceps, legs', 3, 'load', 'Short dip, violent drive, lock out over mid-foot.'),
    X('db-press', 'Seated dumbbell shoulder press', 'vpush', 'dumbbells', 'Shoulders, triceps', 1, 'load', 'Start at ear height and press up without clanging the bells.'),
    X('kb-press', 'Half-kneeling kettlebell press', 'vpush', 'kettlebell', 'Shoulders, core', 2, 'load', 'Squeeze the down-knee glute so your ribs stay stacked.'),
    X('pike-push-up', 'Pike push-up', 'vpush', 'bodyweight', 'Shoulders, triceps', 2, 'bw', 'Hips high; lower your head to a spot just ahead of your hands.'),
    X('band-ohp', 'Band overhead press', 'vpush', 'bands', 'Shoulders, triceps', 1, 'bw', 'Stand on the band, press straight up, finish biceps by ears.'),
    X('mach-shoulder', 'Machine shoulder press', 'vpush', 'machines', 'Shoulders, triceps', 1, 'load', 'Back on the pad, press without shrugging.'),
    // Horizontal pull
    X('bb-row', 'Barbell bent-over row', 'hpull', 'barbell', 'Lats, mid-back', 2, 'load', 'Hinge to about 45°, pull the bar to your belly button.'),
    X('pendlay-row', 'Pendlay row', 'hpull', 'barbell', 'Mid-back, lats', 3, 'load', 'Each rep starts dead on the floor; keep your torso still.'),
    X('inverted-row', 'Inverted row', 'hpull', 'barbell', 'Mid-back, biceps', 1, 'bw', 'Bar in the rack at hip height; pull your chest to it.'),
    X('db-row', 'One-arm dumbbell row', 'hpull', 'dumbbells', 'Lats, mid-back', 1, 'load', 'Pull your elbow toward your back pocket, not straight up.'),
    X('chest-sup-row', 'Chest-supported dumbbell row', 'hpull', 'dumbbells', 'Mid-back, rear delts', 2, 'load', 'Chest stays on the incline bench; pause at the top.'),
    X('kb-gorilla-row', 'Kettlebell gorilla row', 'hpull', 'kettlebell', 'Lats, mid-back, core', 2, 'load', 'Wide stance, flat back, alternate arms without twisting.'),
    X('band-row', 'Seated band row', 'hpull', 'bands', 'Mid-back, lats', 1, 'bw', 'Sit tall and squeeze your shoulder blades together.'),
    X('cable-row', 'Seated cable row', 'hpull', 'machines', 'Mid-back, lats', 1, 'load', 'Chest up, pull to your stomach, let the shoulders reach forward.'),
    // Vertical pull
    X('pull-up', 'Pull-up', 'vpull', 'pullup-bar', 'Lats, biceps', 3, 'bw', 'Start from a dead hang and pull your chest toward the bar.'),
    X('chin-up', 'Chin-up', 'vpull', 'pullup-bar', 'Lats, biceps', 2, 'bw', 'Palms facing you; drive your elbows down to your ribs.'),
    X('neg-pull-up', 'Eccentric pull-up', 'vpull', 'pullup-bar', 'Lats, biceps', 1, 'bw', 'Jump to the top, then lower for a slow four-second count.'),
    X('assisted-pull-up', 'Band-assisted pull-up', 'vpull', 'pullup-bar+bands', 'Lats, biceps', 1, 'bw', 'Loop the band under one knee; use the lightest band that works.'),
    X('lat-pulldown', 'Lat pulldown', 'vpull', 'machines', 'Lats, biceps', 1, 'load', 'Pull to your collarbone with a slight lean back.'),
    X('band-pulldown', 'Kneeling band pulldown', 'vpull', 'bands', 'Lats', 1, 'bw', 'Anchor high and pull your elbows to your hips.'),
    // Lunge
    X('reverse-lunge', 'Reverse lunge', 'lunge', 'bodyweight', 'Quads, glutes', 1, 'bw', 'Step back far enough that your front shin stays upright.'),
    X('lateral-lunge', 'Lateral lunge', 'lunge', 'bodyweight', 'Adductors, glutes', 2, 'bw', 'Sit into one hip while the other leg stays straight.'),
    X('bulgarian-db', 'Bulgarian split squat', 'lunge', 'dumbbells', 'Quads, glutes', 2, 'load', 'Back foot on a bench; drop the back knee straight down.'),
    X('walking-lunge', 'Dumbbell walking lunge', 'lunge', 'dumbbells', 'Quads, glutes', 2, 'load', 'Long, controlled steps; don’t let the back knee slam.'),
    X('step-up', 'Dumbbell step-up', 'lunge', 'dumbbells', 'Quads, glutes', 1, 'load', 'Drive through the top foot only; no push from the bottom leg.'),
    X('kb-reverse-lunge', 'Goblet reverse lunge', 'lunge', 'kettlebell', 'Quads, glutes', 1, 'load', 'Bell at your chest keeps you upright; step back softly.'),
    X('bb-split-squat', 'Barbell split squat', 'lunge', 'barbell', 'Quads, glutes', 3, 'load', 'Set your stance first, then move straight up and down.'),
    // Core
    X('plank', 'Front plank', 'core', 'bodyweight', 'Abs, deep core', 1, 'time', 'Squeeze glutes and pull elbows toward toes to lock in.'),
    X('side-plank', 'Side plank', 'core', 'bodyweight', 'Obliques', 1, 'time', 'Stack hips and push the floor away with your forearm.'),
    X('dead-bug', 'Dead bug', 'core', 'bodyweight', 'Abs', 1, 'bw', 'Press your lower back into the floor before every rep.'),
    X('hollow-hold', 'Hollow body hold', 'core', 'bodyweight', 'Abs', 2, 'time', 'Lower back glued down; raise arms and legs only as far as you can hold it.'),
    X('hanging-knee', 'Hanging knee raise', 'core', 'pullup-bar', 'Abs, hip flexors', 2, 'bw', 'Curl your pelvis up instead of just lifting the knees.'),
    X('hanging-leg', 'Hanging leg raise', 'core', 'pullup-bar', 'Abs, hip flexors', 3, 'bw', 'Straight legs, no swing; lower for a slow count.'),
    X('pallof', 'Pallof press', 'core', 'bands', 'Obliques, deep core', 1, 'bw', 'Press out and resist the twist; hold two seconds.'),
    X('cable-chop', 'Cable woodchop', 'core', 'machines', 'Obliques', 2, 'bw', 'Rotate from the hips and upper back, arms stay long.'),
    // Carry
    X('farmer-db', 'Farmer carry', 'carry', 'dumbbells', 'Grip, traps, core', 1, 'carry', 'Walk tall with short, quick steps; shoulders down.'),
    X('suitcase-kb', 'Suitcase carry', 'carry', 'kettlebell', 'Obliques, grip', 1, 'carry', 'One side loaded; don’t let your torso lean.'),
    X('rack-carry-kb', 'Front-rack carry', 'carry', 'kettlebell', 'Core, upper back', 2, 'carry', 'Bell rests on your forearm; breathe behind the brace.'),
    X('bear-crawl', 'Bear crawl', 'carry', 'bodyweight', 'Core, shoulders', 2, 'carry', 'Knees an inch off the floor; move opposite hand and foot.'),
    // Accessories: push
    X('lateral-raise', 'Dumbbell lateral raise', 'ipush', 'dumbbells', 'Side delts', 1, 'iso', 'Lead with your elbows and stop at shoulder height.'),
    X('oh-triceps', 'Overhead triceps extension', 'ipush', 'dumbbells', 'Triceps', 1, 'iso', 'Elbows point forward; get a deep stretch at the bottom.'),
    X('band-pressdown', 'Band triceps pressdown', 'ipush', 'bands', 'Triceps', 1, 'iso', 'Elbows pinned to your sides; squeeze at lockout.'),
    X('cable-pushdown', 'Cable triceps pushdown', 'ipush', 'machines', 'Triceps', 1, 'iso', 'Stand tall, elbows fixed, only the forearms move.'),
    X('bench-dip', 'Bench dip', 'ipush', 'bodyweight', 'Triceps', 1, 'bw', 'Keep your back close to the bench and stop at 90°.'),
    // Accessories: pull
    X('db-curl', 'Dumbbell curl', 'ipull', 'dumbbells', 'Biceps', 1, 'iso', 'No swinging; turn your pinky up slightly at the top.'),
    X('face-pull', 'Band face pull', 'ipull', 'bands', 'Rear delts, upper back', 1, 'iso', 'Pull to your forehead and spread the band apart.'),
    X('cable-curl', 'Cable curl', 'ipull', 'machines', 'Biceps', 1, 'iso', 'Elbows slightly forward; control the way down.'),
    X('reverse-fly', 'Reverse fly machine', 'ipull', 'machines', 'Rear delts', 1, 'iso', 'Soft elbows and lead with the back of your hands.')
  ];
  var BY_ID = {};
  LIBRARY.forEach(function (e) { BY_ID[e.id] = e; });

  var PATTERNS = {
    squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge',
    hpush: 'Horizontal push', vpush: 'Vertical push',
    hpull: 'Horizontal pull', vpull: 'Vertical pull',
    core: 'Core', carry: 'Carry', ipush: 'Accessory · push', ipull: 'Accessory · pull'
  };
  var EQUIPMENT = {
    bodyweight: 'Bodyweight', dumbbells: 'Dumbbells', kettlebell: 'Kettlebell', barbell: 'Barbell & rack',
    'pullup-bar': 'Pull-up bar', bands: 'Resistance bands', machines: 'Gym machines'
  };
  var GOALS = { muscle: 'Build muscle', strength: 'Get stronger', fatloss: 'Lose fat' };
  var LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  var WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* ---------------------------------------------------------
     2. Programming rules
     --------------------------------------------------------- */
  // Day templates: movement slots in priority order. A session uses the first N.
  var T = {
    fbA:  ['squat', 'hpush', 'hpull', 'hinge', 'vpush', 'core', 'ipull', 'carry'],
    fbB:  ['hinge', 'vpush', 'vpull', 'lunge', 'hpush', 'carry', 'ipush', 'core'],
    fbC:  ['lunge', 'hpush', 'vpull', 'squat', 'hpull', 'core', 'ipush', 'carry'],
    upA:  ['hpush', 'hpull', 'vpush', 'vpull', 'ipush', 'ipull', 'core', 'carry'],
    upB:  ['vpush', 'vpull', 'hpush', 'hpull', 'ipull', 'ipush', 'carry', 'core'],
    loA:  ['squat', 'hinge', 'lunge', 'hinge', 'core', 'carry', 'squat', 'core'],
    loB:  ['hinge', 'squat', 'lunge', 'squat', 'carry', 'core', 'hinge', 'core'],
    push: ['hpush', 'vpush', 'hpush', 'ipush', 'vpush', 'core', 'ipush', 'carry'],
    pull: ['vpull', 'hpull', 'hinge', 'ipull', 'hpull', 'carry', 'ipull', 'core'],
    legs: ['squat', 'hinge', 'lunge', 'hinge', 'core', 'carry', 'squat', 'core']
  };
  // Split by training days: [day name, template], plus the weekdays they land on.
  var SPLITS = {
    2: { name: 'Full body ×2', days: [['Full body A', 'fbA'], ['Full body B', 'fbB']], on: [0, 3] },
    3: { name: 'Full body ×3', days: [['Full body A', 'fbA'], ['Full body B', 'fbB'], ['Full body C', 'fbC']], on: [0, 2, 4] },
    4: { name: 'Upper / Lower', days: [['Upper body A', 'upA'], ['Lower body A', 'loA'], ['Upper body B', 'upB'], ['Lower body B', 'loB']], on: [0, 1, 3, 4] },
    5: { name: 'Push / Pull / Legs + Upper / Lower', days: [['Push', 'push'], ['Pull', 'pull'], ['Legs', 'legs'], ['Upper body', 'upB'], ['Lower body', 'loB']], on: [0, 1, 2, 4, 5] }
  };
  // If no exercise fits a slot with the user's gear, try these patterns instead.
  var FALLBACK = { vpull: ['hpull'], hpull: ['vpull'], vpush: ['hpush'], hpush: ['vpush'], squat: ['lunge'], lunge: ['squat'], carry: ['core'], ipush: ['hpush', 'vpush'], ipull: ['hpull', 'vpull'], hinge: [], core: [] };
  // Exercises per session, by goal then minutes (supersets fit more work in).
  var COUNT = { muscle: { 30: 4, 45: 5, 60: 6 }, strength: { 30: 4, 45: 5, 60: 6 }, fatloss: { 30: 4, 45: 6, 60: 7 } };
  var LEVEL_N = { beginner: 1, intermediate: 2, advanced: 3 };

  /** Sets, reps and rest for one exercise. role: 'main' (first two lifts of the day) or 'acc'. */
  function prescribe(ex, role, goal, level, pairPos) {
    var lv = LEVEL_N[level];
    var s = ex.style;
    var rx;
    if (s === 'time') {
      rx = { sets: 3, reps: lv === 1 ? '20–30 s' : lv === 2 ? '30–45 s' : '45–60 s', rest: goal === 'strength' ? 60 : 45 };
    } else if (s === 'carry') {
      rx = { sets: 3, reps: '30–40 m', rest: goal === 'fatloss' ? 30 : 60 };
    } else if (goal === 'strength') {
      if (s === 'iso') rx = { sets: 3, reps: '8–10', rest: 60 };
      else if (role === 'main') rx = { sets: [3, 4, 5][lv - 1], reps: s === 'bw' ? '4–6' : (lv === 1 ? '5' : '3–5'), rest: 150 };
      else rx = { sets: 3, reps: s === 'bw' ? '6–10' : '6–8', rest: 90 };
    } else if (goal === 'muscle') {
      if (s === 'iso') rx = { sets: 3, reps: '12–15', rest: 60 };
      else if (role === 'main') rx = { sets: lv === 1 ? 3 : 4, reps: s === 'bw' ? '8–12' : '6–10', rest: 105 };
      else rx = { sets: 3, reps: s === 'bw' ? '10–15' : '8–12', rest: 75 };
    } else { // fat loss: everything runs as supersets
      rx = { sets: lv === 3 ? 4 : 3, reps: s === 'bw' ? '12–20' : '10–15', rest: 45 };
    }
    // Assisted / eccentric pull-ups stay low rep regardless of goal.
    if (ex.id === 'neg-pull-up') rx.reps = '3–5';
    if (goal === 'fatloss' && pairPos === 1) rx.rest = 0; // first half of a superset goes straight into the second
    return rx;
  }

  function restLabel(sec, item) {
    if (item && item.pairPos === 1) return 'Straight into ' + item.tag.charAt(0) + '2';
    if (sec >= 150) return 'Rest 2–3 min';
    if (sec >= 105) return 'Rest 90–120 s';
    return 'Rest ' + sec + ' s';
  }

  // Average reps (or seconds) from a range like "6–10" or "30–45 s".
  function avgOf(str) {
    var n = String(str).match(/\d+/g) || ['8'];
    var a = n.map(Number);
    return a.length > 1 ? (a[0] + a[1]) / 2 : a[0];
  }
  function workSeconds(ex, reps) {
    if (ex.style === 'time') return avgOf(reps) + 10;
    if (ex.style === 'carry') return 45;
    return avgOf(reps) * 3.5 + 10;
  }

  // Split a day's items into blocks: single exercises or superset pairs.
  function blocksOf(items) {
    var out = [];
    items.forEach(function (it) {
      var last = out[out.length - 1];
      if (it.pairPos === 2 && last) last.push(it); else out.push([it]);
    });
    return out;
  }
  /** Estimated session time in seconds: 5-minute warm-up + work + rest + changeovers. */
  function sessionSeconds(items) {
    var total = 300;
    blocksOf(items).forEach(function (b) {
      var sets = b[0].sets;
      var work = 0;
      b.forEach(function (it) { work += workSeconds(BY_ID[it.id], it.reps); });
      if (b.length > 1) work += 15;
      var rest = b[b.length - 1].rest;
      total += sets * work + (sets - 1) * rest + 75 * b.length;
    });
    return total;
  }
  // Trim sets from the end of the day (never the main lifts first) until it fits the time box.
  function fitToTime(items, minutes) {
    var target = minutes * 60 + 60;
    var guard = 40;
    while (sessionSeconds(items) > target && guard--) {
      var blocks = blocksOf(items);
      var trimmed = false;
      for (var i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i][0].sets > (i < 1 ? 3 : 2)) {
          blocks[i].forEach(function (it) { it.sets -= 1; });
          trimmed = true; break;
        }
      }
      if (!trimmed) {
        if (blocks.length <= 3) break;
        var drop = blocks[blocks.length - 1].length;
        items.splice(items.length - drop, drop);
      }
    }
    return items;
  }
  // If a session comes in well under the time box, add sets from the top of the day (capped by level).
  function fillToTime(items, minutes, level) {
    var cap = { beginner: 3, intermediate: 4, advanced: 5 }[level];
    var target = minutes * 60;
    var guard = 30;
    while (guard--) {
      var blocks = blocksOf(items);
      var grow = null;
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i][0].sets < cap && ['time', 'carry'].indexOf(BY_ID[blocks[i][0].id].style) === -1) { grow = blocks[i]; break; }
      }
      if (!grow) break;
      grow.forEach(function (it) { it.sets += 1; });
      if (sessionSeconds(items) > target) { grow.forEach(function (it) { it.sets -= 1; }); break; }
    }
    return items;
  }

  /* ---------------------------------------------------------
     3. Plan generator + swap
     --------------------------------------------------------- */
  function hasGear(ex, gear) {
    return ex.eq.every(function (k) { return gear.indexOf(k) !== -1; });
  }

  // Higher score = better fit for this person.
  function score(ex, inputs, role, weekCount) {
    var lv = LEVEL_N[inputs.experience];
    var s = 0;
    if (inputs.experience === 'beginner' && ex.diff === 3) s -= 6;
    s -= Math.abs(ex.diff - (lv === 3 ? 2.5 : lv)) * 1.5;
    var eq = ex.eq[0];
    if (inputs.goal === 'strength') s += { barbell: 2.5, dumbbells: 1, kettlebell: 1, machines: .5, 'pullup-bar': 1 }[eq] || 0;
    if (inputs.goal === 'muscle') s += { barbell: 1.5, dumbbells: 1.5, machines: 1.5, kettlebell: .5, 'pullup-bar': 1 }[eq] || 0;
    if (inputs.goal === 'fatloss') s += { kettlebell: 1.5, dumbbells: 1.2, bodyweight: .8, bands: .6, barbell: -.3 }[eq] || 0;
    if (role === 'main' && ex.style === 'load') s += 1;
    if (ex.style === 'iso' && role === 'main') s -= 2;
    if (role === 'acc' && ex.diff === 3) s -= 1.5; // keep the hardest lifts for the start of the day
    s -= (weekCount[ex.id] || 0) * 3; // variety across the week
    return s;
  }

  function candidates(pattern, inputs, usedInDay) {
    return LIBRARY.filter(function (e) {
      return e.pattern === pattern && hasGear(e, inputs.equipment) && usedInDay.indexOf(e.id) === -1;
    });
  }

  function pick(pattern, inputs, role, usedInDay, weekCount) {
    var tries = [pattern].concat(FALLBACK[pattern] || []);
    for (var i = 0; i < tries.length; i++) {
      var list = candidates(tries[i], inputs, usedInDay);
      if (list.length) {
        list.sort(function (a, b) { return score(b, inputs, role, weekCount) - score(a, inputs, role, weekCount); });
        return list[0];
      }
    }
    return null;
  }

  /** Tags + prescriptions for a day's exercises. Fat loss pairs them into A1/A2 supersets. */
  function prescribeDay(list, inputs) {
    return list.map(function (src, i) {
      var it = { id: src.id, role: src.role };
      if (inputs.goal === 'fatloss') {
        var hasPartner = i % 2 === 1 || i + 1 < list.length;
        it.pairPos = hasPartner ? (i % 2) + 1 : 0;
        it.tag = String.fromCharCode(65 + Math.floor(i / 2)) + (hasPartner ? (i % 2) + 1 : '');
      } else {
        it.pairPos = 0;
        it.tag = String(i + 1);
      }
      var rx = prescribe(BY_ID[it.id], it.role, inputs.goal, inputs.experience, it.pairPos);
      it.sets = rx.sets; it.reps = rx.reps; it.rest = rx.rest;
      return it;
    });
  }

  function generate(inputs) {
    var split = SPLITS[inputs.days];
    var count = COUNT[inputs.goal][inputs.length];
    var weekCount = {};
    var days = split.days.map(function (d, di) {
      var used = [];
      var pool = [];
      var slots = T[d[1]];
      // Pick one exercise per template slot (in priority order).
      for (var i = 0; i < slots.length; i++) {
        var ex = pick(slots[i], inputs, pool.length < 2 ? 'main' : 'acc', used, weekCount);
        if (!ex) continue;
        used.push(ex.id);
        pool.push({ id: ex.id, role: pool.length < 2 ? 'main' : 'acc' });
      }
      // Start with the standard count for this goal + time, then add slots while they still fit the clock.
      var n = Math.min(count, pool.length);
      var items = prescribeDay(pool.slice(0, n), inputs);
      while (n < pool.length) {
        var trial = prescribeDay(pool.slice(0, n + 1), inputs);
        if (sessionSeconds(trial) > inputs.length * 60) break;
        items = trial; n++;
      }
      fitToTime(items, inputs.length);
      fillToTime(items, inputs.length, inputs.experience);
      items.forEach(function (it) { weekCount[it.id] = (weekCount[it.id] || 0) + 1; });
      return { name: d[0], weekday: split.on[di], items: items };
    });
    return { inputs: inputs, split: split.name, days: days, created: Date.now() };
  }

  /** Next alternative for one slot: same pattern, user's gear, not already in that day. */
  function swapItem(plan, di, ii) {
    var day = plan.days[di];
    var item = day.items[ii];
    var cur = BY_ID[item.id];
    var others = day.items.map(function (x) { return x.id; }).filter(function (id) { return id !== item.id; });
    var list = candidates(cur.pattern, plan.inputs, others);
    if (list.length < 2) return false;
    list.sort(function (a, b) { return score(b, plan.inputs, item.role, {}) - score(a, plan.inputs, item.role, {}); });
    var idx = list.findIndex(function (e) { return e.id === item.id; });
    var next = list[(idx + 1) % list.length];
    var rx = prescribe(next, item.role, plan.inputs.goal, plan.inputs.experience, item.pairPos);
    item.id = next.id;
    item.reps = rx.reps;
    item.rest = rx.rest;
    // keep the time-fitted set count unless the new movement is a hold or carry
    if (next.style === 'time' || next.style === 'carry') item.sets = Math.min(item.sets, rx.sets);
    return true;
  }
  function canSwap(plan, di, ii) {
    var day = plan.days[di];
    var item = day.items[ii];
    var others = day.items.map(function (x) { return x.id; }).filter(function (id) { return id !== item.id; });
    return candidates(BY_ID[item.id].pattern, plan.inputs, others).length > 1;
  }

  function focusOf(day) {
    var seen = [];
    day.items.slice(0, 4).forEach(function (it) {
      var p = BY_ID[it.id].pattern;
      var label = { squat: 'Squat', hinge: 'Hinge', lunge: 'Single-leg', hpush: 'Press', vpush: 'Overhead', hpull: 'Row', vpull: 'Pull-up', core: 'Core', carry: 'Carry', ipush: 'Arms', ipull: 'Arms' }[p];
      if (seen.indexOf(label) === -1) seen.push(label);
    });
    return seen.slice(0, 3).join(' · ');
  }

  function balanceOf(plan) {
    var groups = [['Squat & lunge', ['squat', 'lunge']], ['Hinge', ['hinge']], ['Push', ['hpush', 'vpush', 'ipush']], ['Pull', ['hpull', 'vpull', 'ipull']], ['Core & carry', ['core', 'carry']]];
    return groups.map(function (g) {
      var sets = 0;
      plan.days.forEach(function (d) { d.items.forEach(function (it) { if (g[1].indexOf(BY_ID[it.id].pattern) !== -1) sets += it.sets; }); });
      return { label: g[0], sets: sets };
    });
  }

  function progressionNote(inputs) {
    var g = inputs.goal, lv = inputs.experience;
    var main = {
      strength: 'When every set of a main lift hits the top of its range with clean form, add 2.5 kg (5 lb) next session. Accessories: add a rep per set first, then weight.',
      muscle: 'Use double progression: work every set up to the top of the rep range, then add 2–5% load and start back at the bottom. Finish sets 1–2 reps short of failure.',
      fatloss: 'Next week, add one round to the first superset or cut 5–10 s of rest. Keep 1–2 reps in the tank so form holds up when you are breathing hard.'
    }[g];
    var extra = [];
    if (lv === 'beginner') extra.push('Learn the movement first: pick a weight you could lift 3 more times.');
    if (lv === 'beginner' && g === 'strength') extra.push('Beginners can usually add load every session for the first 6–8 weeks.');
    if (lv !== 'beginner') extra.push('Every 4th or 5th week, deload: same exercises, about half the sets.');
    extra.push('Log your weights. If a lift stalls for two weeks, swap it for a variation.');
    if (!candidates('vpull', inputs, []).length && !candidates('hpull', inputs, []).length) {
      extra.push('Gear tip: a pull-up bar or a resistance band unlocks proper back work. Without one, pulling is the gap in this plan.');
    }
    return { main: main, extra: extra };
  }

  /* ---------------------------------------------------------
     4. Rendering
     --------------------------------------------------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function minutes(items) { return Math.round(sessionSeconds(items) / 60); }

  var SWAP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>';

  function exHTML(item, di, ii, plan, animate) {
    var ex = BY_ID[item.id];
    var swappable = canSwap(plan, di, ii);
    return '<li class="ex' + (item.pairPos ? ' paired' : '') + (animate ? ' swapped' : '') + '" data-ex="' + ex.id + '">' +
      '<span class="ex-tag" aria-hidden="true">' + esc(item.tag) + '</span>' +
      '<div class="ex-main">' +
        '<div class="ex-name">' + esc(ex.name) + '</div>' +
        '<div class="ex-meta">' + esc(PATTERNS[ex.pattern]) + ' · ' + esc(ex.muscles) + '</div>' +
        '<div class="ex-rx"><span class="rx sets">' + item.sets + ' × ' + esc(item.reps) + '</span><span class="rx">' + esc(restLabel(item.rest, item)) + '</span></div>' +
        '<p class="ex-tip">' + esc(ex.tip) + '</p>' +
      '</div>' +
      '<button class="btn btn-ghost swap-btn" type="button" data-action="swap" data-day="' + di + '" data-index="' + ii + '"' +
        (swappable ? '' : ' disabled title="No other option for this movement with your equipment"') +
        ' aria-label="Swap ' + esc(ex.name) + '">' + SWAP_ICON + '<span>Swap</span></button>' +
      '</li>';
  }

  function dayHTML(day, di, plan) {
    return '<article class="day-card reveal" style="--i:' + di + '" data-day-card="' + di + '">' +
      '<header class="day-head"><div>' +
        '<span class="d-kicker">Day ' + (di + 1) + ' · ' + WEEKDAYS[day.weekday] + '</span>' +
        '<h3>' + esc(day.name) + '</h3>' +
        '<p class="d-focus">' + esc(focusOf(day)) + '</p>' +
      '</div><div class="d-time" data-time><small>Session</small>≈ ' + minutes(day.items) + ' min</div></header>' +
      '<ol class="ex-list">' + day.items.map(function (it, ii) { return exHTML(it, di, ii, plan); }).join('') + '</ol>' +
      '</article>';
  }

  function renderPlan(plan, scroll) {
    var inp = plan.inputs;
    var out = $('#plan-out');
    var trainDays = {};
    plan.days.forEach(function (d) { trainDays[d.weekday] = d.name; });

    var strip = '<div class="week-strip" aria-label="Week overview">' + WEEKDAYS.map(function (w, i) {
      var on = trainDays[i];
      return '<div class="ws-day ' + (on ? 'on' : 'rest') + '"><b>' + w + '</b><span>' + esc(on || 'Rest') + '</span></div>';
    }).join('') + '</div>';

    var bal = balanceOf(plan);
    var max = Math.max.apply(null, bal.map(function (b) { return b.sets; })) || 1;
    var totalSets = bal.reduce(function (a, b) { return a + b.sets; }, 0);
    var avgMin = Math.round(plan.days.reduce(function (a, d) { return a + sessionSeconds(d.items); }, 0) / plan.days.length / 60);
    var prog = progressionNote(inp);

    var side = '<aside class="side">' +
      '<div class="side-card bal-card reveal" style="--i:1"><h3>Weekly balance <small>sets per pattern</small></h3>' +
        '<div class="stats"><div class="stat"><b>' + totalSets + '</b><span>working sets</span></div><div class="stat"><b data-avg>' + avgMin + '</b><span>avg. minutes</span></div></div>' +
        '<div class="bal">' + bal.map(function (b) {
          return '<div class="bal-row"><span>' + b.label + '</span><span class="track"><span class="fill" style="--w:' + Math.round(b.sets / max * 100) + '%"></span></span><b>' + b.sets + '</b></div>';
        }).join('') + '</div></div>' +
      '<div class="side-card prog reveal" style="--i:2"><h3>Next week <small>progression</small></h3><p>' + esc(prog.main) + '</p><ul>' +
        prog.extra.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '</aside>';

    out.innerHTML = strip + '<div class="plan-grid"><div class="days">' +
      plan.days.map(function (d, di) { return dayHTML(d, di, plan); }).join('') + '</div>' + side + '</div>';

    var eqNames = inp.equipment.map(function (k) { return EQUIPMENT[k]; }).join(', ');
    $('#plan-summary').innerHTML = '<b>' + GOALS[inp.goal] + '</b> · ' + LEVELS[inp.experience] + ' · ' + inp.days + ' days · ' + inp.length + ' min · ' +
      esc(plan.split) + '<br><span>Using: ' + esc(eqNames) + '</span>';
    $('#plan-title').textContent = inp.days + '-day ' + (inp.goal === 'fatloss' ? 'conditioning' : inp.goal === 'strength' ? 'strength' : 'muscle') + ' week';
    $('#print').disabled = false;
    $('#start-over').disabled = false;

    if (scroll) {
      var sec = $('#plan');
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      sec.focus({ preventScroll: true });
    }
  }

  // Re-render a single day card after a swap (keeps the rest of the page still).
  function refreshDay(plan, di, ii) {
    var card = $('[data-day-card="' + di + '"]');
    var day = plan.days[di];
    var list = card.querySelector('.ex-list');
    list.innerHTML = day.items.map(function (it, k) { return exHTML(it, di, k, plan, k === ii); }).join('');
    card.querySelector('[data-time]').innerHTML = '<small>Session</small>≈ ' + minutes(day.items) + ' min';
    card.querySelector('.d-focus').textContent = focusOf(day);
    card.classList.remove('reveal');
    var btn = list.querySelector('[data-index="' + ii + '"]');
    if (btn) btn.focus({ preventScroll: true });
  }

  function resetPlanView() {
    $('#plan-out').innerHTML = EMPTY_HTML;
    $('#plan-summary').innerHTML = 'Pick your options above and hit <b>Generate my week</b>.';
    $('#plan-title').textContent = 'The plan';
    $('#print').disabled = true;
    $('#start-over').disabled = true;
  }

  /** Hero preview: a real plan from the generator, rendered small. */
  function renderPreview() {
    var sample = generate({ goal: 'muscle', experience: 'intermediate', days: 4, length: 45, equipment: ['bodyweight', 'dumbbells', 'pullup-bar', 'machines'] });
    var on = sample.days.map(function (d) { return d.weekday; });
    $('#pv-strip').innerHTML = WEEKDAYS.map(function (w, i) { return '<span class="' + (on.indexOf(i) !== -1 ? 'on' : '') + '">' + w.charAt(0) + '</span>'; }).join('');
    $('#pv-days').innerHTML = sample.days.map(function (d) {
      return '<div class="pv-day"><h4><small>' + WEEKDAYS[d.weekday] + '</small>' + esc(d.name) + '</h4>' +
        d.items.slice(0, 3).map(function (it) { return '<div class="pv-row"><span>' + esc(BY_ID[it.id].name) + '</span><b>' + it.sets + '×' + esc(it.reps.replace('–', '-')) + '</b></div>'; }).join('') +
        '</div>';
    }).join('');
    var bal = balanceOf(sample);
    var max = Math.max.apply(null, bal.map(function (b) { return b.sets; }));
    $('#pv-foot').innerHTML = bal.map(function (b) {
      return '<div class="pv-bar">' + esc(b.label.split(' ')[0]) + ' ' + b.sets + '<i style="--w:' + Math.round(b.sets / max * 100) + '%"></i></div>';
    }).join('');
  }

  /* ---------------------------------------------------------
     5. Library browser
     --------------------------------------------------------- */
  var libState = { filter: 'all', mine: false, all: false };
  var LIB_PREVIEW = 12;

  function renderFilters() {
    var keys = ['all'].concat(Object.keys(PATTERNS));
    $('#lib-filters').innerHTML = keys.map(function (k) {
      var n = k === 'all' ? LIBRARY.length : LIBRARY.filter(function (e) { return e.pattern === k; }).length;
      var label = k === 'all' ? 'All' : PATTERNS[k].replace('Accessory · ', 'Acc. ');
      return '<button class="filter" type="button" data-filter="' + k + '" aria-pressed="' + (libState.filter === k) + '">' + label + '<small>' + n + '</small></button>';
    }).join('');
  }

  function renderLibrary() {
    var gear = readInputs().equipment;
    var list = LIBRARY.filter(function (e) {
      return (libState.filter === 'all' || e.pattern === libState.filter) && (!libState.mine || hasGear(e, gear));
    });
    var shown = libState.all ? list : list.slice(0, LIB_PREVIEW);
    $('#lib-grid').innerHTML = shown.map(function (e) {
      var ok = hasGear(e, gear);
      var diff = [1, 2, 3].map(function (d) { return '<i class="' + (d <= e.diff ? 'on' : '') + '"></i>'; }).join('');
      return '<li class="lib-item' + (ok ? '' : ' off') + '">' +
        '<div class="li-top"><span class="li-pat">' + esc(PATTERNS[e.pattern]) + '</span><span class="diff" role="img" aria-label="Difficulty ' + e.diff + ' of 3">' + diff + '</span></div>' +
        '<div class="li-name">' + esc(e.name) + '</div><div class="li-mus">' + esc(e.muscles) + '</div>' +
        '<div class="li-eq">' + (ok ? '' : 'Needs ') + esc(e.eq.map(function (k) { return EQUIPMENT[k]; }).join(' + ')) + '</div></li>';
    }).join('') || '<li class="lib-item">No exercises match. Add some equipment above.</li>';
    var btn = $('#lib-toggle');
    btn.hidden = list.length <= LIB_PREVIEW;
    btn.textContent = libState.all ? 'Show fewer' : 'Show all ' + list.length + ' exercises';
    btn.setAttribute('aria-expanded', String(libState.all));
  }

  /* ---------------------------------------------------------
     6. Wiring, storage, theme
     --------------------------------------------------------- */
  var KEY = 'forge.v1';
  var EMPTY_HTML = '';
  var plan = null;

  function store(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function clearStore() { try { localStorage.removeItem(KEY); } catch (e) {} }

  var form = $('#planner-form');
  function readInputs() {
    var v = function (n) { var el = form.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : null; };
    return {
      goal: v('goal') || 'muscle',
      experience: v('experience') || 'intermediate',
      days: Number(v('days') || 3),
      length: Number(v('length') || 45),
      equipment: $$('input[name="equipment"]:checked', form).map(function (i) { return i.value; })
    };
  }
  function writeInputs(inp) {
    ['goal', 'experience', 'days', 'length'].forEach(function (n) {
      var el = form.querySelector('input[name="' + n + '"][value="' + inp[n] + '"]');
      if (el) el.checked = true;
    });
    $$('input[name="equipment"]', form).forEach(function (i) { i.checked = inp.equipment.indexOf(i.value) !== -1; });
  }
  var DEFAULTS = readInputs(); // whatever the HTML marks as checked

  function updateAvail() {
    var gear = readInputs().equipment;
    var n = LIBRARY.filter(function (e) { return hasGear(e, gear); }).length;
    $('#avail-count').textContent = n + ' exercises available';
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = readInputs();
    var err = $('#form-error');
    if (!inp.equipment.length) {
      err.textContent = 'Pick at least one option. Bodyweight counts!';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    plan = generate(inp);
    store({ inputs: inp, plan: plan });
    renderPlan(plan, true);
    toast('Your ' + inp.days + '-day week is ready');
  });

  form.addEventListener('change', function () {
    var inp = readInputs();
    if (inp.equipment.length) $('#form-error').hidden = true;
    var saved = load() || {};
    store({ inputs: inp, plan: saved.plan || null });
    updateAvail();
    renderLibrary();
  });

  // Swap buttons (event delegation)
  $('#plan-out').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action="swap"]');
    if (!btn || !plan) return;
    var di = Number(btn.getAttribute('data-day'));
    var ii = Number(btn.getAttribute('data-index'));
    var before = BY_ID[plan.days[di].items[ii].id].name;
    if (swapItem(plan, di, ii)) {
      store({ inputs: readInputs(), plan: plan });
      refreshDay(plan, di, ii);
      updateSide();
      toast('Swapped ' + before + ' for ' + BY_ID[plan.days[di].items[ii].id].name);
    }
  });
  // After a swap, refresh totals in the sidebar without re-animating everything.
  function updateSide() {
    var bal = balanceOf(plan);
    var max = Math.max.apply(null, bal.map(function (b) { return b.sets; })) || 1;
    $$('.bal-row').forEach(function (row, i) {
      row.querySelector('.fill').style.setProperty('--w', Math.round(bal[i].sets / max * 100) + '%');
      row.querySelector('b').textContent = bal[i].sets;
    });
    var avg = $('[data-avg]');
    if (avg) avg.textContent = Math.round(plan.days.reduce(function (a, d) { return a + sessionSeconds(d.items); }, 0) / plan.days.length / 60);
  }

  $('#print').addEventListener('click', function () { window.print(); });

  $('#start-over').addEventListener('click', function () {
    plan = null;
    clearStore();
    writeInputs(DEFAULTS);
    resetPlanView();
    updateAvail();
    renderLibrary();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('#planner').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    toast('Cleared. Start fresh whenever you’re ready.');
  });

  // Library controls
  $('#lib-filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (!b) return;
    libState.filter = b.getAttribute('data-filter');
    $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    renderLibrary();
  });
  $('#lib-mine').addEventListener('change', function (e) { libState.mine = e.target.checked; renderLibrary(); });
  $('#lib-toggle').addEventListener('click', function () { libState.all = !libState.all; renderLibrary(); });

  // Theme toggle (remembered)
  var root = document.documentElement;
  var themeBtn = $('#theme-toggle');
  function syncThemeBtn() {
    var dark = root.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.setAttribute('aria-pressed', String(dark));
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b0b0d' : '#f4f3f0');
  }
  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('forge.theme', next); } catch (e) {}
    syncThemeBtn();
  });

  /* ---------- Boot ---------- */
  EMPTY_HTML = $('#plan-out').innerHTML;
  $('#lib-count').textContent = LIBRARY.length;
  syncThemeBtn();
  renderPreview();
  renderFilters();

  var saved = load();
  if (saved && saved.inputs) writeInputs(saved.inputs);
  if (saved && saved.plan && saved.plan.days && saved.plan.days.every(function (d) { return d.items.every(function (it) { return BY_ID[it.id]; }); })) {
    plan = saved.plan;
    renderPlan(plan, false);
  }
  updateAvail();
  renderLibrary();
})();
