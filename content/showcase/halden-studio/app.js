/* =========================================================
   Halden Studio — app.js
   1. Content (projects + materials)       ← edit here
   2. Drawings (SVG compositions)
   3. Project index (filter, view, preview)
   4. Project dialog (gallery, keyboard)
   5. Clock, header, reveals, form, extras
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. CONTENT
     --------------------------------------------------------- */

  // Material palettes used by the drawings: stone, oak, clay, sage…
  var MAT = {
    lime:  { sky: '#EFE8DC', wall: '#E2D8C8', shade: '#BFAF98', deep: '#463D35', floor: '#D6CAB7', light: '#FCF7EE', accent: '#B0634A' },
    stone: { sky: '#E9E3D8', wall: '#D2C8B8', shade: '#AFA391', deep: '#4A433D', floor: '#C3B7A4', light: '#F6F0E6', accent: '#A65B40' },
    oak:   { sky: '#EEE4D4', wall: '#C8A37A', shade: '#A4815C', deep: '#45342A', floor: '#B79168', light: '#F7E8CF', accent: '#9C4F34' },
    clay:  { sky: '#F1E3D5', wall: '#C98F72', shade: '#A97056', deep: '#4F3027', floor: '#BC8165', light: '#F8E3D1', accent: '#7A3925' },
    sage:  { sky: '#E8EADF', wall: '#ABB39E', shade: '#8B957E', deep: '#3B4337', floor: '#B4AE9B', light: '#F2F2E7', accent: '#A65B40' },
    sand:  { sky: '#EFE6D6', wall: '#D9C4A2', shade: '#BCA27F', deep: '#4F4030', floor: '#CDB38E', light: '#FAF0DE', accent: '#A65B40' },
    ash:   { sky: '#E6E0D5', wall: '#7F776D', shade: '#655E55', deep: '#26221F', floor: '#A9A08F', light: '#F1EADD', accent: '#C0714F' }
  };

  // Which project the hero features (by id)
  var FEATURED = 'kalkvaerket';

  // Projects. `gallery` = [drawing, caption]; drawings: arch, stair, facade, window, plan, colonnade, vault, gable.
  var PROJECTS = [
    {
      id: 'kalkvaerket', name: 'Kalkværket Bathhouse', type: 'Hospitality',
      location: 'Nordhavn, Copenhagen', year: 2024, area: '1,850 m²', status: 'Completed',
      client: 'Kalkværket Bathing Society', mat: 'lime',
      summary: 'A public bathhouse folded into the shell of an 1898 lime works on the Nordhavn quay.',
      text: [
        'The kilns were kept. Their brick walls — a metre thick and still faintly white with lime — became the warm core of the building: three saunas, a steam room under the original chimney, and a sequence of rest rooms that open one by one towards the water.',
        'New elements are made of hand-floated lime plaster and untreated larch, materials that breathe with the humidity rather than fight it. A long loggia runs along the quay, so bathers move from heat to the cold harbour under cover, in full view of the cranes.'
      ],
      gallery: [['arch', 'The kiln wall, opened towards the harbour'], ['vault', 'Steam room under the old chimney'], ['colonnade', 'The cold-water loggia on the quay'], ['plan', 'Ground floor plan, 1:200']]
    },
    {
      id: 'solvhoj', name: 'Villa Sølvhøj', type: 'Residential',
      location: 'Hornbæk, North Zealand', year: 2023, area: '310 m²', status: 'Completed',
      client: 'Private', mat: 'oak',
      summary: 'A family house on a heathland plot, arranged as two pitched volumes linked by a glazed hall.',
      text: [
        'Sølvhøj sits low in the heather two kilometres from the Kattegat. The brief asked for a house that could hold five people in summer and two in winter; the answer was two volumes — one to open, one to close — joined by a hall that doubles as the dining room.',
        'Everything visible is oak: thermally modified boards outside, oiled planks within. Openings are placed for specific views at specific hours — the breakfast table catches first light over the moor at 04:40 in June.'
      ],
      gallery: [['stair', 'Oak stair to the sleeping loft'], ['gable', 'North elevation from the heath'], ['window', 'Morning in the long room'], ['plan', 'Ground floor plan, 1:100']]
    },
    {
      id: 'vadehavet', name: 'Vadehavet Archive', type: 'Cultural',
      location: 'Ribe, South Jutland', year: 2025, area: '2,400 m²', status: 'Under construction',
      client: 'Southwest Jutland Museums Trust', mat: 'stone',
      summary: 'A study centre and public archive for the Wadden Sea, raised a storey above the marsh.',
      text: [
        'Twice a day the marsh outside Ribe floods and drains. The archive is lifted onto a brick arcade so the tide can pass beneath it, and so that visitors arrive in shade before climbing to the reading rooms above.',
        'The collection — maps, ship’s logs, eighty thousand bird-ringing records — is kept in a thick-walled core with no windows at all. Around it, the reading room is lit only from above, through a single oculus that tracks the sun along the long tables.'
      ],
      gallery: [['colonnade', 'The tide arcade at low water'], ['vault', 'Reading room oculus, midday'], ['facade', 'West facade, brick and oak'], ['plan', 'Upper level plan, 1:250']]
    },
    {
      id: 'thorvaldsensvej', name: 'Apartment on Thorvaldsensvej', type: 'Interiors',
      location: 'Frederiksberg, Copenhagen', year: 2022, area: '142 m²', status: 'Completed',
      client: 'Private', mat: 'sage',
      summary: 'A fourth-floor apartment from 1902, returned to its original enfilade of rooms.',
      text: [
        'Successive renovations had divided the apartment into eleven small rooms. We removed what the 1970s added, restored the run of doors along the street facade and let five tall windows light the full depth of the plan again.',
        'Walls are finished in a sage limewash mixed on site. The kitchen is a single block of oiled ash set free of the walls, so the old cornices run uninterrupted from room to room.'
      ],
      gallery: [['window', 'The salon, after the walls came out'], ['arch', 'New opening between kitchen and hall'], ['plan', 'Plan as built, 1:100']]
    },
    {
      id: 'lysholm', name: 'Hotel Lysholm', type: 'Hospitality',
      location: 'Skagen, North Jutland', year: 2026, area: '4,100 m²', status: 'In design',
      client: 'Lysholm Hospitality ApS', mat: 'sand',
      summary: 'A forty-two-room hotel at the tip of Jutland, built around the famous northern light.',
      text: [
        'Skagen has drawn painters for a century and a half because of its light — low, silvery and reflected off two seas. Every room in Lysholm faces west over the dunes, behind a screen of vertical larch fins that soften the late sun without hiding the view.',
        'The ground floor is a single public room with a bakery, a bar and a library of local painters’ monographs. Construction is planned to begin in spring 2027.'
      ],
      gallery: [['facade', 'Garden facade behind larch fins'], ['colonnade', 'The arrival court'], ['window', 'Guest room in west light'], ['plan', 'Typical floor, 1:250']]
    },
    {
      id: 'kirkebakken', name: 'Three Houses at Kirkebakken', type: 'Residential',
      location: 'Ry, Central Jutland', year: 2021, area: '3 × 165 m²', status: 'Completed',
      client: 'Kirkebakken Building Cooperative', mat: 'ash',
      summary: 'Three tarred-timber houses for a cooperative of friends, sharing one garden and one workshop.',
      text: [
        'Three couples bought a sloping field above the lake together and asked for houses that were identical in cost but not in character. The gables share a plan, a structure and a palette of tarred pine, yet each turns a few degrees to face its own view.',
        'A shared workshop at the foot of the slope holds tools, bicycles, a guest room and the sauna. The final build cost came in four per cent under the cooperative’s budget.'
      ],
      gallery: [['gable', 'The three gables from the lake path'], ['window', 'Kitchen, late afternoon'], ['plan', 'Shared site plan, 1:500']]
    },
    {
      id: 'brondum', name: 'Atelier Brøndum', type: 'Interiors',
      location: 'Christianshavn, Copenhagen', year: 2023, area: '96 m²', status: 'Completed',
      client: 'Brøndum Ceramics', mat: 'clay',
      summary: 'A ceramicist’s workshop and shop in the vaulted basement of a canal-side warehouse.',
      text: [
        'The basement floods a little every few winters. Rather than seal it, we raised the working floor on a terracotta tile platform, kept the brick vaults bare and put the kilns where the old coal store used to be.',
        'A single arched opening separates shop from workshop, so customers buy their cups within sight of the wheel they were thrown on.'
      ],
      gallery: [['arch', 'Threshold between shop and workshop'], ['window', 'Wheels at the canal window'], ['plan', 'Plan, 1:50']]
    },
    {
      id: 'ronne', name: 'Chapel of Rest', type: 'Cultural',
      location: 'Rønne, Bornholm', year: 2020, area: '220 m²', status: 'Completed',
      client: 'Rønne Parish Council', mat: 'lime',
      summary: 'A small chapel for farewells at the edge of a granite island cemetery.',
      text: [
        'Families come here to sit with someone for the last time. The chapel is a single round room of white-washed brick, lit from one opening in the roof, with no windows at eye level — nothing to look at but the light moving slowly across the floor.',
        'A low cloister of granite columns joins the chapel to the cemetery and gives mourners a sheltered place to wait, talk and leave in their own time.'
      ],
      gallery: [['vault', 'The chapel under its oculus'], ['colonnade', 'Cloister towards the cemetery'], ['plan', 'Plan, 1:100']]
    }
  ];

  var TYPES = ['Residential', 'Hospitality', 'Cultural', 'Interiors'];

  /* ---------------------------------------------------------
     2. DRAWINGS — each returns SVG markup in a 600×600 box.
        Plates crop with "slice", so the subject stays central.
     --------------------------------------------------------- */
  var uid = 0;
  var INK = '#2A2622';

  // soft photographic vignette shared by all drawings
  function vignette(id) {
    return '<radialGradient id="' + id + 'v" cx=".46" cy=".42" r=".78"><stop offset=".55" stop-color="#2a1d12" stop-opacity="0"/><stop offset="1" stop-color="#2a1d12" stop-opacity=".22"/></radialGradient>';
  }
  function lin(id, stops, x2, y2) {
    var s = stops.map(function (st) {
      return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' + (st[2] != null ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
    }).join('');
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 || 0) + '" y2="' + (y2 == null ? 1 : y2) + '">' + s + '</linearGradient>';
  }
  function figure(x, baseY, h, color) {
    // a small standing person for scale
    var w = h * 0.22, head = h * 0.13;
    return '<g fill="' + color + '"><circle cx="' + x + '" cy="' + (baseY - h + head) + '" r="' + head + '"/>' +
      '<rect x="' + (x - w / 2) + '" y="' + (baseY - h + head * 2.15) + '" width="' + w + '" height="' + (h - head * 2.15) + '" rx="' + w / 2.2 + '"/></g>';
  }

  var ART = {
    /* A deep arched opening in a thick wall, light beyond */
    arch: function (p, id) {
      return '<defs>' +
        lin(id + 'w', [[0, p.light], [.5, p.wall], [1, p.shade]], 1, 1) +
        lin(id + 'd', [[0, p.deep], [.7, p.deep, .9], [1, p.shade]]) +
        lin(id + 'f', [[0, p.light, .95], [1, p.light, 0]]) +
        lin(id + 'b', [[0, p.light], [1, p.sky]]) + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 'w)"/>' +
        '<rect y="470" width="600" height="130" fill="' + p.floor + '"/>' +
        '<rect y="468" width="600" height="2" fill="' + p.shade + '"/>' +
        '<polygon class="svg-glow" points="34,150 150,104 150,366 34,430" fill="' + p.light + '" opacity=".5"/>' +
        '<path d="M196 470V262a104 104 0 0 1 208 0v208z" fill="url(#' + id + 'd)"/>' +
        '<path d="M196 470V262a104 104 0 0 1 26-68.8V470z" fill="' + p.shade + '" opacity=".85"/>' +
        '<path d="M262 470V306a38 38 0 0 1 76 0v164z" fill="url(#' + id + 'b)"/>' +
        '<polygon points="262,470 338,470 368,540 246,540" fill="' + p.light + '" opacity=".35"/>' +
        figure(306, 470, 50, p.deep) +
        '<polygon class="svg-glow" points="246,470 354,470 420,600 214,600" fill="url(#' + id + 'f)" opacity=".85"/>' +
        '<rect x="440" y="430" width="136" height="40" fill="' + p.shade + '"/>' +
        '<rect x="440" y="426" width="136" height="5" fill="' + p.light + '" opacity=".7"/>' +
        '<path d="M486 426c-15-8-17-44-4-58h14c13 14 11 50-4 58z" fill="' + p.accent + '"/>' +
        '<rect x="482" y="362" width="18" height="7" fill="' + p.accent + '" opacity=".8"/>' +
        '<path d="M520 426c-8-5-9-24-2-31h8c7 7 6 26-2 31z" fill="' + p.deep + '" opacity=".75"/>' +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    },

    /* Monolithic stair in section, a shaft of light from a high window */
    stair: function (p, id) {
      var d = 'M0 600V540H70', x = 70, y = 540, treads = '', shadow = 'M30 600V510H100';
      for (var i = 0; i < 10; i++) {
        y -= 38; d += 'V' + y; shadow += 'V' + (y - 30);
        treads += '<rect x="' + x + '" y="' + y + '" width="40" height="4" fill="' + p.light + '" opacity=".75"/>';
        x += 40; d += 'H' + x; shadow += 'H' + (x + 30);
      }
      d += 'H600V600Z'; shadow += 'H600V600Z';
      return '<defs>' +
        lin(id + 'w', [[0, p.light], [.6, p.wall], [1, p.shade]], 1, 1) +
        lin(id + 's', [[0, p.light, .7], [1, p.light, .05]]) + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 'w)"/>' +
        '<path d="' + shadow + '" fill="' + p.deep + '" opacity=".14"/>' +
        '<rect x="410" y="40" width="130" height="190" fill="' + p.sky + '"/>' +
        '<rect x="410" y="40" width="130" height="190" fill="none" stroke="' + p.deep + '" stroke-width="5"/>' +
        '<rect x="473" y="40" width="4" height="190" fill="' + p.deep + '"/>' +
        '<path d="' + d + '" fill="' + p.shade + '"/>' + treads +
        '<polygon class="svg-glow" points="410,230 540,230 300,600 120,600" fill="url(#' + id + 's)" opacity=".6"/>' +
        '<line x1="70" y1="470" x2="470" y2="90" stroke="' + p.deep + '" stroke-width="3"/>' +
        '<line x1="470" y1="90" x2="600" y2="90" stroke="' + p.deep + '" stroke-width="3"/>' +
        figure(395, 160, 62, p.deep) +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    },

    /* Facade with a screen of timber fins over two lit floors */
    facade: function (p, id) {
      var fins = '';
      for (var x = 66; x < 534; x += 13) {
        if (x > 252 && x < 340) { fins += '<rect x="' + x + '" y="150" width="6" height="296" fill="' + p.wall + '"/>'; continue; }
        fins += '<rect x="' + x + '" y="150" width="6" height="410" fill="' + p.wall + '"/><rect x="' + (x + 5) + '" y="150" width="1.6" height="410" fill="' + p.deep + '" opacity=".35"/>';
      }
      return '<defs>' +
        lin(id + 's', [[0, p.light], [1, p.sky]]) +
        lin(id + 'g', [[0, p.accent, .55], [1, p.light, .9]]) + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 's)"/>' +
        '<circle cx="520" cy="70" r="30" fill="' + p.light + '"/>' +
        '<rect x="50" y="118" width="500" height="482" fill="' + p.deep + '"/>' +
        '<rect x="90" y="176" width="120" height="130" fill="' + p.light + '" opacity=".35"/>' +
        '<rect x="370" y="360" width="140" height="140" fill="' + p.light + '" opacity=".3"/>' +
        '<rect x="258" y="446" width="84" height="114" fill="url(#' + id + 'g)"/>' +
        figure(312, 560, 64, p.deep) +
        fins +
        '<rect x="50" y="112" width="500" height="38" fill="' + p.wall + '"/><rect x="50" y="146" width="500" height="4" fill="' + p.deep + '" opacity=".4"/>' +
        '<rect x="50" y="326" width="500" height="14" fill="' + p.wall + '"/><rect x="50" y="340" width="500" height="3" fill="' + p.deep + '" opacity=".4"/>' +
        '<polygon points="50,112 550,112 550,170 50,520" fill="' + p.light + '" opacity=".12"/>' +
        '<rect y="560" width="600" height="40" fill="' + p.floor + '"/>' +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    },

    /* Interior: tall window, light on the floor, oak bench, vessel */
    window: function (p, id) {
      return '<defs>' +
        lin(id + 'w', [[0, p.wall], [1, p.shade]], 1, 0) +
        lin(id + 'g', [[0, p.light], [1, p.sky]]) +
        lin(id + 'f', [[0, p.light, .95], [1, p.light, .35]]) +
        '<clipPath id="' + id + 'c"><rect x="80" y="70" width="170" height="330"/></clipPath>' + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 'w)"/>' +
        '<rect y="430" width="600" height="170" fill="' + p.floor + '"/>' +
        '<rect y="424" width="600" height="7" fill="' + p.shade + '"/>' +
        '<rect x="80" y="70" width="170" height="330" fill="url(#' + id + 'g)"/>' +
        '<g clip-path="url(#' + id + 'c)" opacity=".35"><circle cx="120" cy="330" r="80" fill="' + MAT.sage.shade + '"/><circle cx="230" cy="360" r="60" fill="' + MAT.sage.wall + '"/></g>' +
        '<rect x="80" y="70" width="170" height="330" fill="none" stroke="' + p.deep + '" stroke-width="6"/>' +
        '<rect x="163" y="70" width="4" height="330" fill="' + p.deep + '"/><rect x="80" y="196" width="170" height="4" fill="' + p.deep + '"/>' +
        '<rect x="70" y="400" width="190" height="8" fill="' + p.light + '"/>' +
        '<polygon class="svg-glow" points="150,432 330,432 470,600 230,600" fill="url(#' + id + 'f)" opacity=".75"/>' +
        '<polygon points="232,432 238,432 360,600 350,600" fill="' + p.floor + '" opacity=".9"/>' +
        '<polygon class="svg-glow" points="250,90 300,70 300,330 250,370" fill="' + p.light + '" opacity=".3"/>' +
        '<ellipse cx="455" cy="436" rx="110" ry="8" fill="' + p.deep + '" opacity=".18"/>' +
        '<rect x="350" y="372" width="200" height="20" fill="' + MAT.oak.wall + '"/><rect x="350" y="372" width="200" height="4" fill="' + MAT.oak.light + '" opacity=".6"/>' +
        '<rect x="364" y="392" width="10" height="42" fill="' + MAT.oak.shade + '"/><rect x="526" y="392" width="10" height="42" fill="' + MAT.oak.shade + '"/>' +
        '<path d="M432 372c-18-10-20-52-4-66h16c16 14 14 56-4 66z" fill="' + p.accent + '"/>' +
        '<path d="M436 308c-6-40 10-80 40-110M452 258c14-8 28-6 40 2M446 280c-14-10-30-10-40-4" fill="none" stroke="' + p.deep + '" stroke-width="2"/>' +
        '<rect x="500" y="352" width="26" height="20" fill="' + p.deep + '" opacity=".7"/>' +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    },

    /* Architectural plan drawing on paper */
    plan: function (p, id) {
      var t = 'font-family="Inter Tight, Helvetica, Arial, sans-serif" font-size="11" letter-spacing="1.6" fill="' + INK + '"';
      var stairs = '';
      for (var i = 0; i < 11; i++) stairs += '<line x1="' + (124 + i * 13) + '" y1="352" x2="' + (124 + i * 13) + '" y2="452"/>';
      return '<defs><pattern id="' + id + 'p" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="' + p.shade + '" stroke-opacity=".35" stroke-width=".8"/></pattern></defs>' +
        '<rect width="600" height="600" fill="#F3EDE2"/><rect width="600" height="600" fill="url(#' + id + 'p)"/>' +
        '<rect x="306" y="130" width="194" height="340" fill="' + p.accent + '" opacity=".12"/>' +
        '<g fill="' + INK + '">' +
          '<rect x="90" y="120" width="110" height="10"/><rect x="300" y="120" width="210" height="10"/>' +
          '<rect x="90" y="120" width="10" height="360"/>' +
          '<rect x="500" y="120" width="10" height="130"/><rect x="500" y="350" width="10" height="130"/>' +
          '<rect x="90" y="470" width="240" height="10"/><rect x="380" y="470" width="130" height="10"/>' +
          '<rect x="300" y="130" width="6" height="150"/><rect x="300" y="330" width="6" height="140"/>' +
          '<rect x="100" y="330" width="140" height="6"/>' +
        '</g>' +
        '<g fill="none" stroke="' + INK + '" stroke-width="1.2">' +
          '<path d="M200 123H300M200 127H300M503 250V350M507 250V350"/>' +
          '<path d="M330 470V420M330 420A50 50 0 0 1 380 470"/>' +
          '<path d="M306 280H346M346 280A50 50 0 0 1 306 330" />' +
          '<path d="M240 333H280M280 333A40 40 0 0 0 240 293" stroke-opacity=".8"/>' +
          '<rect x="124" y="160" width="100" height="130"/><path d="M124 185H224"/>' +
          '<circle cx="404" cy="250" r="38"/><circle cx="404" cy="196" r="9"/><circle cx="404" cy="304" r="9"/><circle cx="350" cy="250" r="9"/><circle cx="458" cy="250" r="9"/>' +
          '<rect x="340" y="380" width="130" height="44"/>' +
          '<g stroke-opacity=".75">' + stairs + '</g><rect x="118" y="352" width="148" height="100"/>' +
          '<path d="M128 402H250M240 396L250 402L240 408"/>' +
          '<path d="M90 92H510M90 86V98M510 86V98M300 86V98"/>' +
        '</g>' +
        '<text x="195" y="82" ' + t + ' text-anchor="middle">8 400</text><text x="405" y="82" ' + t + ' text-anchor="middle">8 400</text>' +
        '<text x="140" y="315" ' + t + '>SLEEP</text><text x="380" y="355" ' + t + '>LIVING · 46 M²</text><text x="140" y="438" ' + t + ' opacity=".7">UP</text>' +
        '<g stroke="' + p.accent + '" stroke-width="1.4" fill="none"><path d="M44 300H556" stroke-dasharray="10 6"/><circle cx="36" cy="300" r="10"/><circle cx="564" cy="300" r="10"/></g>' +
        '<text x="36" y="304" ' + t + ' text-anchor="middle" fill="' + p.accent + '" letter-spacing="0">A</text><text x="564" y="304" ' + t + ' text-anchor="middle" fill="' + p.accent + '" letter-spacing="0">A</text>' +
        '<g transform="translate(540 530)"><circle r="17" fill="none" stroke="' + INK + '" stroke-width="1.2"/><path d="M0-13L6 8L0 4L-6 8Z" fill="' + INK + '"/></g>' +
        '<text x="90" y="530" ' + t + '>PLAN 1:100</text><path d="M90 540H190" stroke="' + INK + '" stroke-width="1"/>';
    },

    /* Portico: columns against a dark interior, long shadows */
    colonnade: function (p, id) {
      var cols = '', shadows = '';
      for (var i = 0; i < 6; i++) {
        var x = 30 + i * 110;
        shadows += '<polygon points="' + x + ',470 ' + (x + 40) + ',470 ' + (x + 150) + ',600 ' + (x + 100) + ',600" fill="' + p.deep + '" opacity=".26"/>';
        cols += '<rect x="' + x + '" y="140" width="30" height="330" fill="' + p.light + '"/><rect x="' + (x + 30) + '" y="140" width="10" height="330" fill="' + p.shade + '"/>';
      }
      return '<defs>' +
        lin(id + 'i', [[0, p.deep], [1, p.shade]]) +
        lin(id + 's', [[0, p.light], [1, p.sky]]) + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 's)"/>' +
        '<rect y="140" width="600" height="330" fill="url(#' + id + 'i)"/>' +
        '<polygon points="80,470 140,140 250,140 190,470" fill="' + p.light + '" opacity=".08"/>' +
        figure(205, 466, 66, p.deep) +
        '<rect y="80" width="600" height="60" fill="' + p.wall + '"/><rect y="132" width="600" height="8" fill="' + p.shade + '"/>' +
        '<rect y="470" width="600" height="130" fill="' + p.floor + '"/>' +
        '<rect y="470" width="600" height="130" fill="' + p.light + '" opacity=".35"/>' +
        shadows + cols +
        '<rect y="466" width="600" height="6" fill="' + p.shade + '"/>' +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    },

    /* Round room lit from a single oculus */
    vault: function (p, id) {
      return '<defs>' +
        '<radialGradient id="' + id + 'w" cx=".5" cy=".15" r=".9"><stop offset="0" stop-color="' + p.light + '"/><stop offset=".55" stop-color="' + p.wall + '"/><stop offset="1" stop-color="' + p.shade + '"/></radialGradient>' +
        lin(id + 'c', [[0, p.light, .85], [1, p.light, .08]]) + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 'w)"/>' +
        '<g fill="none" stroke="' + p.shade + '" stroke-width="1.5" opacity=".7"><path d="M-40 260Q300 -40 640 260"/><path d="M-40 330Q300 30 640 330"/></g>' +
        '<rect y="500" width="600" height="100" fill="' + p.floor + '"/><rect y="498" width="600" height="3" fill="' + p.shade + '"/>' +
        '<path d="M70 500V360a40 40 0 0 1 80 0v140z" fill="' + p.deep + '" opacity=".75"/>' +
        '<path d="M450 500V360a40 40 0 0 1 80 0v140z" fill="' + p.deep + '" opacity=".75"/>' +
        '<polygon class="svg-glow" points="252,92 348,92 440,520 160,520" fill="url(#' + id + 'c)" opacity=".7"/>' +
        '<ellipse cx="300" cy="92" rx="56" ry="14" fill="' + p.light + '"/><ellipse cx="300" cy="92" rx="56" ry="14" fill="none" stroke="' + p.deep + '" stroke-width="2" opacity=".5"/>' +
        '<ellipse class="svg-glow" cx="300" cy="530" rx="150" ry="26" fill="' + p.light + '" opacity=".85"/>' +
        '<rect x="372" y="486" width="110" height="14" fill="' + p.deep + '" opacity=".55"/>' +
        figure(262, 528, 74, p.deep) +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    },

    /* Danish gable houses in elevation, vertical cladding */
    gable: function (p, id) {
      var clad = '<pattern id="' + id + 'k" width="9" height="10" patternUnits="userSpaceOnUse"><rect width="9" height="10" fill="' + p.wall + '"/><rect width="1.4" height="10" fill="' + p.deep + '" opacity=".35"/></pattern>';
      return '<defs>' + clad +
        lin(id + 's', [[0, p.sky], [1, p.light]]) +
        lin(id + 'g', [[0, MAT.oak.light], [1, p.accent, .6]]) + vignette(id) + '</defs>' +
        '<rect width="600" height="600" fill="url(#' + id + 's)"/>' +
        '<circle cx="470" cy="120" r="34" fill="' + p.light + '"/>' +
        '<polygon points="110,500 110,300 240,186 370,300 370,500" fill="url(#' + id + 'k)"/>' +
        '<polygon points="370,500 370,368 444,302 518,368 518,500" fill="url(#' + id + 'k)"/>' +
        '<polygon points="370,500 370,368 444,302 518,368 518,500" fill="' + p.deep + '" opacity=".25"/>' +
        '<path d="M104 305L240 186L376 305M366 372L444 302L524 372" fill="none" stroke="' + p.deep + '" stroke-width="5"/>' +
        '<rect x="160" y="330" width="24" height="130" fill="' + p.deep + '"/>' +
        '<rect x="226" y="376" width="96" height="96" fill="url(#' + id + 'g)"/><rect x="226" y="376" width="96" height="96" fill="none" stroke="' + p.deep + '" stroke-width="4"/>' +
        '<rect x="420" y="404" width="48" height="66" fill="' + p.deep + '"/>' +
        '<polygon points="110,500 518,500 600,540 190,540" fill="' + p.deep + '" opacity=".18"/>' +
        '<rect y="500" width="600" height="100" fill="' + MAT.sage.wall + '"/>' +
        '<polygon points="110,500 518,500 590,532 180,532" fill="' + MAT.sage.deep + '" opacity=".22"/>' +
        '<circle cx="560" cy="430" r="48" fill="' + MAT.sage.shade + '"/><circle cx="540" cy="452" r="34" fill="' + MAT.sage.wall + '" opacity=".7"/><rect x="556" y="460" width="6" height="42" fill="' + MAT.sage.deep + '"/>' +
        figure(340, 500, 52, p.deep) +
        '<rect width="600" height="600" fill="url(#' + id + 'v)"/>';
    }
  };

  // Build a complete <svg> for a drawing + material
  function drawing(kind, matKey, label) {
    var id = 'h' + (++uid);
    var fn = ART[kind] || ART.arch;
    return '<svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(label || '') + '" focusable="false" xmlns="http://www.w3.org/2000/svg">' + fn(MAT[matKey] || MAT.stone, id) + '</svg>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------------------------------------------------
     3. PROJECT INDEX
     --------------------------------------------------------- */
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  PROJECTS.forEach(function (p, i) { p.no = pad(i + 1); });
  function byId(id) { for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) return PROJECTS[i]; return null; }
  function cover(p) { return p.gallery[0]; }

  // Hero
  (function () {
    var p = byId(FEATURED) || PROJECTS[0];
    var plate = $('[data-hero-plate]');
    plate.innerHTML = drawing(cover(p)[0], p.mat, cover(p)[1]);
    plate.setAttribute('aria-label', 'Open featured project: ' + p.name);
    plate.addEventListener('click', function () { openProject(p.id, plate); });
    $('[data-hero-no]').textContent = p.no;
    $('[data-hero-name]').textContent = p.name;
    $('[data-hero-meta]').textContent = p.location.split(',')[0] + ', ' + p.year;
  })();

  // Static plates declared in HTML (data-art / data-mat / data-label)
  $$('[data-art]').forEach(function (el) {
    el.innerHTML = drawing(el.getAttribute('data-art'), el.getAttribute('data-mat'), el.getAttribute('data-label'));
  });

  // Index items
  var indexEl = $('[data-index]');
  indexEl.innerHTML = PROJECTS.map(function (p) {
    return '<li data-type="' + p.type + '">' +
      '<button class="item__btn" type="button" aria-haspopup="dialog" data-open="' + p.id + '">' +
        '<span class="item__plate plate">' + drawing(cover(p)[0], p.mat, '') + '</span>' +
        '<span class="item__no">' + p.no + '</span>' +
        '<span class="item__name">' + esc(p.name) + '</span>' +
        '<span class="item__loc">' + esc(p.location) + '</span>' +
        '<span class="item__type">' + p.type + '</span>' +
        '<span class="item__year">' + p.year + '</span>' +
        '<span class="item__arrow" aria-hidden="true">→</span>' +
      '</button></li>';
  }).join('');
  $$('.item__plate svg', indexEl).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); s.removeAttribute('role'); });

  indexEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-open]');
    if (btn) openProject(btn.getAttribute('data-open'), btn);
  });

  // Filters
  var filtersEl = $('[data-filters]');
  var countEl = $('[data-count]');
  var activeFilter = 'All';
  filtersEl.innerHTML = ['All'].concat(TYPES).map(function (t) {
    var n = t === 'All' ? PROJECTS.length : PROJECTS.filter(function (p) { return p.type === t; }).length;
    return '<button type="button" data-filter="' + t + '" aria-pressed="' + (t === 'All') + '">' + t + '<sup>' + pad(n) + '</sup></button>';
  }).join('');

  function applyFilter(type, animate) {
    activeFilter = type;
    $$('[data-filter]', filtersEl).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === type)); });
    var shown = 0;
    $$('li', indexEl).forEach(function (li) {
      var match = type === 'All' || li.getAttribute('data-type') === type;
      li.hidden = !match;
      li.classList.remove('is-entering');
      if (match) {
        if (animate && !reduceMotion) { void li.offsetWidth; li.style.setProperty('--i', shown); li.classList.add('is-entering'); }
        shown++;
      }
    });
    countEl.textContent = 'Showing ' + pad(shown) + ' of ' + pad(PROJECTS.length) + (type === 'All' ? ' projects' : ' — ' + type);
  }
  filtersEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (b && b.getAttribute('data-filter') !== activeFilter) applyFilter(b.getAttribute('data-filter'), true);
  });

  // View toggle (remembered per visitor)
  function setView(v, animate) {
    indexEl.setAttribute('data-view-mode', v);
    $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
    try { localStorage.setItem('halden-view', v); } catch (err) { /* storage unavailable */ }
    if (animate) applyFilter(activeFilter, true);
    hidePeek();
  }
  $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view'), true); }); });
  var savedView = null;
  try { savedView = localStorage.getItem('halden-view'); } catch (err) { /* ignore */ }
  setView(savedView === 'grid' ? 'grid' : 'list', false);
  applyFilter('All', false);

  // Floating cursor preview (list view, fine pointers only)
  var peek = $('[data-peek]');
  var peekOn = false, px = 0, py = 0, tx = 0, ty = 0, raf = 0;
  peek.innerHTML = PROJECTS.map(function (p) {
    return '<div class="plate" data-peek-id="' + p.id + '">' + drawing(cover(p)[0], p.mat, '') + '</div>';
  }).join('') + '<span class="peek__tag">View project</span>';

  function hidePeek() { peekOn = false; if (peek) peek.classList.remove('is-on'); }
  function loop() {
    px += (tx - px) * 0.18; py += (ty - py) * 0.18;
    peek.style.transform = 'translate3d(' + (px + 28) + 'px,' + (py - 160) + 'px,0)';
    if (peekOn || Math.abs(tx - px) > .5) raf = requestAnimationFrame(loop); else raf = 0;
  }
  if (finePointer) {
    indexEl.addEventListener('mousemove', function (e) {
      if (indexEl.getAttribute('data-view-mode') !== 'list') return;
      var btn = e.target.closest('[data-open]');
      if (!btn) { hidePeek(); return; }
      tx = e.clientX; ty = e.clientY;
      if (!peekOn) {
        if (!peek.classList.contains('is-on')) { px = tx; py = ty; }
        peekOn = true; peek.classList.add('is-on');
      }
      var id = btn.getAttribute('data-open');
      $$('[data-peek-id]', peek).forEach(function (el) { el.classList.toggle('is-active', el.getAttribute('data-peek-id') === id); });
      if (!raf) raf = requestAnimationFrame(loop);
    });
    indexEl.addEventListener('mouseleave', hidePeek);
    window.addEventListener('scroll', hidePeek, { passive: true });
  }

  /* ---------------------------------------------------------
     4. PROJECT DIALOG
     --------------------------------------------------------- */
  var dialog = $('[data-dialog]');
  var stage = $('[data-g-stage]');
  var thumbs = $('[data-g-thumbs]');
  var current = null, gIndex = 0, opener = null;

  function renderGallery() {
    var item = current.gallery[gIndex];
    stage.innerHTML = drawing(item[0], current.mat, current.name + ' — ' + item[1]);
    $('[data-g-caption]').textContent = item[1];
    $('[data-g-count]').textContent = pad(gIndex + 1) + ' / ' + pad(current.gallery.length);
    $$('button', thumbs).forEach(function (b, i) { b.setAttribute('aria-current', String(i === gIndex)); });
  }
  function step(d) {
    if (!current) return;
    var n = current.gallery.length;
    gIndex = (gIndex + d + n) % n;
    renderGallery();
  }

  function fillProject(p) {
    current = p; gIndex = 0;
    $('[data-p-no]').textContent = 'No. ' + p.no;
    $('[data-p-type]').textContent = p.type;
    $('[data-p-title]').textContent = p.name;
    $('[data-p-summary]').textContent = p.summary;
    var statusCls = p.status === 'Completed' ? 'status status--done' : 'status';
    $('[data-p-facts]').innerHTML = [
      ['Year', p.year], ['Location', p.location], ['Type', p.type], ['Area', p.area],
      ['Status', '<span class="' + statusCls + '">' + p.status + '</span>'], ['Client', p.client]
    ].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + (r[0] === 'Status' ? r[1] : esc(r[1])) + '</dd></div>'; }).join('');
    $('[data-p-text]').innerHTML = p.text.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
    thumbs.innerHTML = p.gallery.map(function (g, i) {
      return '<button type="button" class="plate" aria-label="Show image ' + (i + 1) + ': ' + esc(g[1]) + '" data-g="' + i + '">' + drawing(g[0], p.mat, '') + '</button>';
    }).join('');
    $$('svg', thumbs).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); s.removeAttribute('role'); });
    var next = PROJECTS[(PROJECTS.indexOf(p) + 1) % PROJECTS.length];
    $('[data-p-next-name]').textContent = next.name + ' →';
    $('[data-p-next]').setAttribute('data-next', next.id);
    renderGallery();
    $('.project__inner', dialog).scrollTop = 0;
  }

  function openProject(id, from) {
    var p = byId(id);
    if (!p) return;
    hidePeek();
    if (from) opener = from;
    fillProject(p);
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      document.documentElement.classList.add('is-locked');
    }
    try { history.replaceState(null, '', '#project-' + p.id); } catch (err) { /* file:// may block */ }
    $('[data-close]').focus();
  }
  function closeProject() { if (dialog.open) { if (dialog.close) dialog.close(); else { dialog.removeAttribute('open'); onClosed(); } } }
  function onClosed() {
    document.documentElement.classList.remove('is-locked');
    try { history.replaceState(null, '', '#work'); } catch (err) { /* ignore */ }
    current = null;
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  dialog.addEventListener('close', onClosed);
  $('[data-close]').addEventListener('click', closeProject);
  $('[data-g-prev]').addEventListener('click', function () { step(-1); });
  $('[data-g-next]').addEventListener('click', function () { step(1); });
  thumbs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]');
    if (b) { gIndex = +b.getAttribute('data-g'); renderGallery(); }
  });
  $('[data-p-next]').addEventListener('click', function () { openProject(this.getAttribute('data-next')); });
  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  // click on backdrop area closes (only when native dialog reports click on itself)
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeProject(); });
  // swipe on gallery (touch)
  (function () {
    var sx = null;
    stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    });
  })();

  // Deep link: #project-<id>
  var m = location.hash.match(/^#project-([\w-]+)/);
  if (m && byId(m[1])) openProject(m[1], null);

  /* ---------------------------------------------------------
     5. CLOCK, HEADER, REVEALS, FORM, EXTRAS
     --------------------------------------------------------- */

  // Live Copenhagen clock + open/closed status
  var clockEl = $('[data-clock]'), clockShort = $('[data-clock-short]'), statusEl = $('[data-clock-status]'), clockWrap = $('.clock');
  var fmt, fmtParts;
  try {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false });
  } catch (err) { fmt = null; }
  function tick() {
    var now = new Date();
    var t = fmt ? fmt.format(now) : now.toTimeString().slice(0, 8);
    clockEl.textContent = t;
    clockEl.setAttribute('datetime', now.toISOString());
    clockShort.textContent = t.slice(0, 5);
    var open = false;
    if (fmtParts) {
      var parts = {};
      fmtParts.formatToParts(now).forEach(function (x) { parts[x.type] = x.value; });
      var mins = (+parts.hour % 24) * 60 + (+parts.minute), day = parts.weekday;
      if (['Mon', 'Tue', 'Wed', 'Thu'].indexOf(day) > -1) open = mins >= 540 && mins < 1050;
      else if (day === 'Fri') open = mins >= 540 && mins < 900;
    }
    statusEl.textContent = open ? 'Studio open' : 'Studio closed';
    clockWrap.classList.toggle('is-open', open);
  }
  tick();
  setInterval(tick, 1000);

  // Header border on scroll + active nav section
  var header = $('.site-header');
  var navLinks = $$('.nav a');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var menuBtn = $('.menu-btn'), nav = $('#site-nav');
  menuBtn.addEventListener('click', function () {
    var open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', open);
  });
  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      if (menuBtn.getAttribute('aria-expanded') === 'true') menuBtn.click();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { menuBtn.click(); menuBtn.focus(); }
  });

  // Scroll reveals + active section
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal, .hero__title').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal, .hero__title').forEach(function (el) { el.classList.add('is-in'); });
  }
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { so.observe(s); });
  }

  // Inquiry form — validates and confirms inline (nothing is sent anywhere)
  var form = $('[data-form]'), done = $('[data-form-done]');
  function setError(field, msg) {
    var wrap = field.closest('.field'), err = document.getElementById(field.id + '-err');
    wrap.classList.toggle('has-error', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg || ''; field.setAttribute('aria-describedby', err.id); }
    return !msg;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, email = form.elements.email, msg = form.elements.message;
    var ok = true, first = null;
    [[name, name.value.trim() ? '' : 'Please tell us your name.'],
     [email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? '' : 'Please add an email we can reply to.'],
     [msg, msg.value.trim().length >= 10 ? '' : 'A sentence or two is plenty.']
    ].forEach(function (pair) { if (!setError(pair[0], pair[1])) { ok = false; first = first || pair[0]; } });
    if (!ok) { first.focus(); return; }
    var type = (form.querySelector('input[name="type"]:checked') || {}).value || 'project';
    var firstName = name.value.trim().split(/\s+/)[0];
    done.innerHTML = '<p class="label">Inquiry received <span class="sep">/</span> ' + esc(type) + '</p>' +
      '<h3>Thank you, ' + esc(firstName) + '. <em>We’ll be in touch.</em></h3>' +
      '<p>Ida or Mikkel will read your note this week and reply to ' + esc(email.value.trim()) + ' within five working days — usually with a few questions and a suggestion to walk the site together.</p>' +
      '<button type="button" data-form-reset>Send another inquiry</button>';
    form.hidden = true; done.hidden = false; done.focus();
  });
  done.addEventListener('click', function (e) {
    if (!e.target.closest('[data-form-reset]')) return;
    form.reset(); done.hidden = true; form.hidden = false; form.elements.name.focus();
  });
  ['name', 'email', 'message'].forEach(function (n) {
    form.elements[n].addEventListener('input', function () { if (this.getAttribute('aria-invalid') === 'true') setError(this, ''); });
  });

  // Copy email
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var flag = function () { b.classList.add('is-copied'); setTimeout(function () { b.classList.remove('is-copied'); }, 1800); };
      try { navigator.clipboard.writeText(text).then(flag, flag); } catch (err) { flag(); }
    });
  });

  // 12-column grid overlay (button or "G" key)
  var overlay = $('[data-grid-overlay]'), gridBtn = $('[data-grid-toggle]');
  $('.grid', overlay).innerHTML = new Array(13).join('<span></span>');
  function toggleGrid() {
    var on = !overlay.classList.contains('is-on');
    overlay.classList.toggle('is-on', on);
    gridBtn.setAttribute('aria-pressed', String(on));
  }
  gridBtn.addEventListener('click', toggleGrid);
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey && ['input', 'textarea', 'select'].indexOf(tag) < 0 && !dialog.open) toggleGrid();
  });
})();
