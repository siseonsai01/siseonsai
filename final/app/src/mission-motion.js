/*!
 * 시선사이 · 정리 친구의 가족 미션 시범 (mission-motion.js)
 * window.SiseonMission.create(host, options) -> { play(), pause(), destroy() }
 *
 * options = {
 *   code:          'FHSD' … 16 type codes (shown as the friend's name tag)
 *   imageSrc:      URL of that type's empty-handed demonstration sprite
 *   pattern:       0–4 mission pattern
 *   childIndex:    0 | 1  which of the two steps the child takes in the family split
 *   reducedMotion: true → still frames for each step (pick / carry / place) with fades
 *   soundAllowed:  true → quiet synthesized effects (no voice, no files)
 *   onStageChanged(text, info)  optional; called whenever the one on-screen sentence changes
 * }
 * host gets data-phase = "ready" (made, not started) | "playing" | "paused" | "done".
 * No libraries, no network, no storage, no embedded assets. All DOM stays inside host.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var ITEM_SCALE = 1.18;
  var NAMES = {
    FHSD: '순간포착 고슴도치', FHSB: '블랙홀 판다', FHMD: '마음부자 쿼카', FHMB: '우주대청장 아기물개',
    PVSD: '칵칵각 다람쥐', PVSB: '갤러리 고양이', PVMD: '작품왕 강아지', PVMB: '추억전시 펭귄',
    PHSD: '칼각 박스 비버', PHSB: '비밀창고 햄스터', PHMD: '비밀일기 사슴', PHMB: '추억보물상자 아기곰',
    FVSD: '자유로운 사막여우', FVSB: '번개출동 표범', FVMD: '감성아티스트 수달', FVMB: '벼락치기 몽상가 토끼'
  };
  var TITLES = [
    '첫 자리만 정하고, 같이 시작!',
    '한 상자에 보이는 단서 하나',
    '매일 쓰는 자리, 보물 자리',
    '길은 지금, 작품은 나중에',
    '내일도 찾을 수 있는 자리'
  ];
  var DONE_TEXT = '이제 집으로 가서 가족이 정리를 해 볼 차례예요!';
  var C = {
    ink: '#5b3a24', wood: '#d9a066', woodDark: '#9a6438', woodLight: '#f0c48f',
    paper: '#fbf4e8', line: '#8a5631', glow: '#ffd36b', mint: '#9ccf9a',
    red: '#f2836b', blue: '#7cbfe6', yellow: '#ffcc52', green: '#93c47d', pink: '#f6a6b8', purple: '#b9a3e3'
  };

  // ---------- small helpers ----------
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function ease(u) { u = clamp(u, 0, 1); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function easeOut(u) { u = clamp(u, 0, 1); return 1 - Math.pow(1 - u, 3); }
  function backOut(u) { u = clamp(u, 0, 1) - 1; return u * u * (2.6 * u + 1.6) + 1; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function html(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- toy & furniture drawings (each drawn with its anchor at bottom-centre 0,0) ----------
  var Draw = {
    ball: function (g, color) {
      el('ellipse', { cx: 0, cy: -2, rx: 40, ry: 7, fill: 'rgba(90,58,36,.12)' }, g);
      el('circle', { cx: 0, cy: -42, r: 42, fill: color || C.red, stroke: C.line, 'stroke-width': 4 }, g);
      el('path', { d: 'M-40,-52 Q0,-20 40,-52', fill: 'none', stroke: '#fff', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0.9 }, g);
      el('circle', { cx: -15, cy: -60, r: 8, fill: '#fff', opacity: 0.55 }, g);
    },
    block: function (g, color) {
      el('rect', { x: -40, y: -80, width: 80, height: 80, rx: 14, fill: color || C.blue, stroke: C.line, 'stroke-width': 4 }, g);
      el('rect', { x: -22, y: -62, width: 44, height: 44, rx: 9, fill: 'none', stroke: '#fff', 'stroke-width': 6, opacity: 0.8 }, g);
    },
    car: function (g, color) {
      el('path', { d: 'M-58,-22 L-58,-46 Q-58,-54 -50,-54 L-30,-54 L-16,-78 L22,-78 L38,-54 L50,-54 Q58,-54 58,-46 L58,-22 Z', fill: color || C.yellow, stroke: C.line, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
      el('path', { d: 'M-10,-70 L18,-70 L28,-54 L-20,-54 Z', fill: '#e9f6ff', stroke: C.line, 'stroke-width': 3 }, g);
      [-32, 32].forEach(function (x) {
        el('circle', { cx: x, cy: -20, r: 17, fill: '#6b4b38', stroke: C.line, 'stroke-width': 3 }, g);
        el('circle', { cx: x, cy: -20, r: 6, fill: '#f5e6d0' }, g);
      });
    },
    card: function (g, icon) {
      el('rect', { x: -44, y: -112, width: 88, height: 112, rx: 12, fill: '#fffdf8', stroke: C.line, 'stroke-width': 4 }, g);
      var s = el('g', { transform: 'translate(0,-34) scale(.62)' }, g);
      Draw[icon || 'block'](s, icon === 'ball' ? C.red : icon === 'car' ? C.yellow : C.blue);
    },
    crayons: function (g) {
      [['#f2836b', -22], ['#7cbfe6', 0], ['#93c47d', 22]].forEach(function (c) {
        el('path', { d: 'M' + (c[1] - 8) + ',-70 L' + (c[1] - 8) + ',-100 L' + c[1] + ',-116 L' + (c[1] + 8) + ',-100 L' + (c[1] + 8) + ',-70 Z', fill: c[0], stroke: C.line, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
      });
      el('rect', { x: -46, y: -76, width: 92, height: 76, rx: 10, fill: C.yellow, stroke: C.line, 'stroke-width': 4 }, g);
      el('rect', { x: -30, y: -56, width: 60, height: 22, rx: 8, fill: '#fff6dc' }, g);
    },
    star: function (g) {
      var p = [];
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 20 : 44, a = -Math.PI / 2 + i * Math.PI / 5;
        p.push((Math.cos(a) * r).toFixed(1) + ',' + (-46 + Math.sin(a) * r).toFixed(1));
      }
      el('polygon', { points: p.join(' '), fill: C.yellow, stroke: C.line, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
      el('circle', { cx: -10, cy: -56, r: 6, fill: '#fff', opacity: 0.7 }, g);
    },
    tower: function (g) {
      el('rect', { x: -66, y: -14, width: 132, height: 14, rx: 6, fill: C.woodLight, stroke: C.line, 'stroke-width': 4 }, g);
      el('rect', { x: -54, y: -64, width: 50, height: 50, rx: 9, fill: C.red, stroke: C.line, 'stroke-width': 4 }, g);
      el('rect', { x: 4, y: -64, width: 50, height: 50, rx: 9, fill: C.blue, stroke: C.line, 'stroke-width': 4 }, g);
      el('rect', { x: -30, y: -114, width: 60, height: 50, rx: 9, fill: C.green, stroke: C.line, 'stroke-width': 4 }, g);
      el('path', { d: 'M-30,-114 L0,-150 L30,-114 Z', fill: C.yellow, stroke: C.line, 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
    }
  };

  function shelf(g, w, h, cols, rows) {
    el('rect', { x: -w / 2, y: -h, width: w, height: h, rx: 14, fill: C.wood, stroke: C.line, 'stroke-width': 5 }, g);
    var cw = (w - 24) / cols, ch = (h - 24) / rows, slots = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = -w / 2 + 12 + c * cw, y = -h + 12 + r * ch;
      el('rect', { x: x + 5, y: y + 5, width: cw - 10, height: ch - 10, rx: 9, fill: '#f6dcb6', stroke: C.woodDark, 'stroke-width': 3 }, g);
      slots.push({ x: x + cw / 2, y: y + ch - 9, r: r, c: c });
    }
    return slots;
  }

  // ---------- scene layouts (landscape 1280×800; portrait drawn on 1000×1250, shown as the square 0,240–1000,1240) ----------
  function layoutFor(portrait) {
    return portrait ? { W: 1000, H: 1250, vy: 240, vh: 1000, floor: 1000, row: 1120, portrait: true } : { W: 1280, H: 800, vy: 0, vh: 800, floor: 690, row: 690, portrait: false };
  }

  // Each scene draws its furniture and items, then returns { home, plan }.
  // home = where the friend stands at the start and returns to at the end (kept clear).
  // Plan steps: title · cap(text, step) · walk(item) · pick(item) · carry(x) · place(item, x, y, layer) · fx/fxOff · wait · done
  var Scenes = [];

  // 0 · 첫 자리만 정하고, 같이 시작!
  Scenes[0] = function (L, B) {
    var P = L.portrait, F = L.floor, R = L.row;
    var sx = P ? 640 : 1010, sw = P ? 520 : 500;
    var g = el('g', { transform: 'translate(' + sx + ',' + F + ')' }, B.back);
    var slots = shelf(g, sw, 230, 3, 1).map(function (s) { return { x: sx + s.x, y: F + s.y }; });
    slots.forEach(function (s, i) {
      B.fx('slot' + i, function (p) {
        return el('rect', { x: s.x - 70, y: s.y - 136, width: 140, height: 146, rx: 16, fill: 'none', stroke: C.glow, 'stroke-width': 8 }, p);
      });
      B.check('ok' + i, s.x, s.y - 175);
    });
    B.item('ball', 'ball', P ? 380 : 360, R, { color: C.red });
    B.item('block', 'block', P ? 570 : 500, R, { color: C.blue });
    B.item('car', 'car', P ? 780 : 645, R, { color: C.yellow });
    B.ring('ring', 66);
    return { home: P ? 150 : 150, plan: [
      ['title'],
      ['cap', '장난감 셋 중에 공의 자리를 먼저 정해요.', 1],
      ['fx', 'ring', 0.45, { on: 'ball' }],
      ['walk', 'ball'], ['pick', 'ball'], ['fx', 'slot0', 0.2],
      ['carry', slots[0].x], ['place', 'ball', slots[0].x, slots[0].y], ['fx', 'ok0', 0.3, { pop: true }],
      ['cap', '나머지 둘도 하나씩 들고 자리를 찾아요.', 2],
      ['walk', 'block'], ['pick', 'block'], ['carry', slots[1].x], ['place', 'block', slots[1].x, slots[1].y], ['fx', 'ok1', 0.25, { pop: true }],
      ['walk', 'car'], ['pick', 'car'], ['carry', slots[2].x], ['place', 'car', slots[2].x, slots[2].y], ['fx', 'ok2', 0.25, { pop: true }],
      ['done']
    ] };
  };

  // 1 · 한 상자에 보이는 단서 하나
  Scenes[1] = function (L, B) {
    var P = L.portrait, F = L.floor, R = L.row;
    var tx = P ? 250 : 280, tw = 300;
    var tg = el('g', { transform: 'translate(' + tx + ',' + F + ')' }, B.back);
    el('rect', { x: -tw / 2, y: -128, width: tw, height: 18, rx: 8, fill: C.wood, stroke: C.line, 'stroke-width': 4 }, tg);
    el('rect', { x: -tw / 2 + 18, y: -112, width: 16, height: 112, fill: C.woodDark }, tg);
    el('rect', { x: tw / 2 - 34, y: -112, width: 16, height: 112, fill: C.woodDark }, tg);
    B.item('cardBall', 'card', tx - 96, F - 128, { icon: 'ball' });
    B.item('cardBlock', 'card', tx, F - 128, { icon: 'block' });
    B.item('cardCar', 'card', tx + 96, F - 128, { icon: 'car' });
    var bx = P ? 830 : 1110, bw = 300, bh = 220;
    var bg = el('g', { transform: 'translate(' + bx + ',' + F + ')' }, B.back);
    el('path', { d: 'M' + (-bw / 2 + 10) + ',' + (-bh) + ' L' + (bw / 2 - 10) + ',' + (-bh) + ' L' + (bw / 2 - 6) + ',-30 L' + (-bw / 2 + 6) + ',-30 Z', fill: '#b97d45' }, bg);
    var fg = el('g', { transform: 'translate(' + bx + ',' + F + ')' }, B.front);
    el('path', { d: 'M' + (-bw / 2) + ',' + (-bh + 60) + ' L' + (bw / 2) + ',' + (-bh + 60) + ' L' + (bw / 2 - 18) + ',0 L' + (-bw / 2 + 18) + ',0 Z', fill: C.wood, stroke: C.line, 'stroke-width': 5, 'stroke-linejoin': 'round' }, fg);
    el('rect', { x: -60, y: -bh + 76, width: 120, height: 140, rx: 12, fill: '#f6dcb6', stroke: C.woodDark, 'stroke-width': 4, 'stroke-dasharray': '10 8' }, fg);
    var labelY = F - bh + 76 + 140 - 8;
    B.item('blockA', 'block', P ? 360 : 770, R, { color: C.blue });
    B.item('blockB', 'block', P ? 520 : 885, R, { color: C.green });
    B.ring('ring', 76);
    B.sparkle('spark', bx, labelY - 80);
    var inY = F - bh + 74, parkX = bx - 96, parkY = F - bh + 66;
    return { home: P ? 560 : 585, plan: [
      ['title'],
      ['cap', '상자 앞에 붙일 블록 그림을 하나 골라요.', 1],
      ['fx', 'ring', 0.3, { on: 'cardBlock' }],
      ['walk', 'cardBlock'], ['pick', 'cardBlock'], ['carry', parkX], ['place', 'cardBlock', parkX, parkY, 'front'],
      ['cap', '블록을 상자에 넣고 그림 표시를 붙여요.', 2],
      ['walk', 'blockA'], ['pick', 'blockA'], ['carry', bx], ['place', 'blockA', bx - 44, inY, 'items'],
      ['walk', 'blockB'], ['pick', 'blockB'], ['carry', bx], ['place', 'blockB', bx + 44, inY, 'items'],
      ['walk', 'cardBlock'], ['pick', 'cardBlock'], ['carry', bx], ['place', 'cardBlock', bx, labelY, 'front'],
      ['fx', 'spark', 0.3, { pop: true }],
      ['done']
    ] };
  };

  // 2 · 매일 쓰는 자리, 보물 자리
  Scenes[2] = function (L, B) {
    var P = L.portrait, F = L.floor, R = L.row;
    var shx = P ? 560 : 760, shw = 280;
    var sg = el('g', { transform: 'translate(' + shx + ',' + F + ')' }, B.back);
    el('rect', { x: -shw / 2, y: -160, width: shw, height: 22, rx: 8, fill: C.wood, stroke: C.line, 'stroke-width': 4 }, sg);
    el('rect', { x: -shw / 2 + 10, y: -138, width: 18, height: 138, fill: C.woodDark }, sg);
    el('rect', { x: shw / 2 - 28, y: -138, width: 18, height: 138, fill: C.woodDark }, sg);
    el('rect', { x: -shw / 2, y: -44, width: shw, height: 18, rx: 6, fill: C.wood, stroke: C.line, 'stroke-width': 4 }, sg);
    var cx = P ? 845 : 1110, cw = 230, ch = 140;
    var cb = el('g', { transform: 'translate(' + cx + ',' + F + ')' }, B.back);
    el('rect', { x: -cw / 2 + 8, y: -ch, width: cw - 16, height: 44, fill: '#7a4a2a' }, cb);
    var cf = el('g', { transform: 'translate(' + cx + ',' + F + ')' }, B.front);
    el('rect', { x: -cw / 2, y: -ch + 26, width: cw, height: ch - 26, rx: 14, fill: '#c9863f', stroke: C.line, 'stroke-width': 5 }, cf);
    el('rect', { x: -cw / 2, y: -ch + 50, width: cw, height: 16, fill: C.yellow, stroke: C.line, 'stroke-width': 3 }, cf);
    el('rect', { x: -16, y: -ch + 44, width: 32, height: 34, rx: 6, fill: C.yellow, stroke: C.line, 'stroke-width': 3 }, cf);
    B.lid('lid', cx, F - ch + 26, cw);
    B.item('crayons', 'crayons', P ? 380 : 360, R);
    B.item('star', 'star', P ? 560 : 500, R);
    B.ring('ring', 76);
    B.sparkle('spark', cx, F - ch - 110);
    B.check('ok0', shx, F - 330);
    return { home: P ? 150 : 160, plan: [
      ['title'],
      ['cap', '매일 쓰는 크레파스는 꺼내기 쉬운 선반에 놓아요.', 1],
      ['fx', 'ring', 0.45, { on: 'crayons' }],
      ['walk', 'crayons'], ['pick', 'crayons'], ['carry', shx], ['place', 'crayons', shx, F - 160], ['fx', 'ok0', 0.3, { pop: true }],
      ['cap', '소중한 별은 보물상자에 쏙 넣어요.', 2],
      ['walk', 'star'], ['pick', 'star'], ['carry', cx], ['fx', 'lid', 0.35],
      ['place', 'star', cx, F - ch + 74, 'items'], ['fxOff', 'lid', 0.35], ['fx', 'spark', 0.35, { pop: true }],
      ['done']
    ] };
  };

  // 3 · 길은 지금, 작품은 나중에
  Scenes[3] = function (L, B) {
    var P = L.portrait, F = L.floor, W = L.W;
    var pg = el('g', {}, B.back);
    el('rect', { x: 0, y: F - 16, width: W, height: 70, fill: '#f3dfbf' }, pg);
    for (var i = 0; i < 10; i++) el('rect', { x: i * W / 10 + 30, y: F + 20, width: W / 22, height: 8, rx: 4, fill: '#e6c79c' }, pg);
    if (!P) {
      var dx = 1215;
      el('rect', { x: dx - 60, y: F - 300, width: 120, height: 284, rx: 14, fill: '#e9b77c', stroke: C.line, 'stroke-width': 5 }, pg);
      el('circle', { cx: dx - 34, cy: F - 150, r: 8, fill: C.line }, pg);
    }
    var back = F - 46;
    var kx = 115;
    var kb = el('g', { transform: 'translate(' + kx + ',' + back + ')' }, B.back);
    el('rect', { x: -86, y: -96, width: 172, height: 30, rx: 10, fill: '#a5703f' }, kb);
    var kf = el('g', { transform: 'translate(' + kx + ',' + back + ')' }, B.front);
    el('path', { d: 'M-92,-84 L92,-84 L74,0 L-74,0 Z', fill: '#d4a064', stroke: C.line, 'stroke-width': 5, 'stroke-linejoin': 'round' }, kf);
    for (var j = -2; j <= 2; j++) el('line', { x1: j * 30, y1: -80, x2: j * 25, y2: -4, stroke: '#b3814a', 'stroke-width': 4 }, kf);
    var mx = P ? 720 : 1030;
    el('ellipse', { cx: mx, cy: back - 4, rx: 110, ry: 22, fill: C.mint, stroke: '#6f9f6c', 'stroke-width': 4 }, B.back);
    var pathY = F + 26;
    B.item('ball', 'ball', P ? 540 : 520, pathY, { color: C.red });
    B.item('car', 'car', P ? 720 : 680, pathY, { color: C.yellow });
    B.item('tower', 'tower', P ? 880 : 870, pathY);
    B.ring('ring', 90);
    B.shine('shine', F + 18, W);
    B.clock('clock', mx, back - 260);
    return { home: P ? 330 : 330, plan: [
      ['title'],
      ['cap', '길 위의 공과 자동차를 바구니로 옮겨 길을 비워요.', 1],
      ['walk', 'ball'], ['pick', 'ball'], ['carry', kx], ['place', 'ball', kx - 34, back - 60, 'items'],
      ['walk', 'car'], ['pick', 'car'], ['carry', kx], ['place', 'car', kx + 32, back - 56, 'items'],
      ['fx', 'shine', 0.6],
      ['cap', '블록 작품은 부수지 않고 옆 안전한 자리에 둬요.', 2],
      ['fx', 'ring', 0.4, { on: 'tower' }],
      ['walk', 'tower'], ['pick', 'tower', { slow: true }], ['carry', mx, { slow: true }], ['place', 'tower', mx, back, 'items', { slow: true }],
      ['cap', '작품은 시계가 알려 줄 때 나중에 같이 정리해요.', 2],
      ['fx', 'clock', 0.45, { pop: true }],
      ['done']
    ] };
  };

  // 4 · 내일도 찾을 수 있는 자리
  Scenes[4] = function (L, B) {
    var P = L.portrait, F = L.floor, R = L.row;
    var sx = P ? 740 : 1000, sw = 290;
    var g = el('g', { transform: 'translate(' + sx + ',' + F + ')' }, B.back);
    el('rect', { x: -sw / 2, y: -520, width: sw, height: 520, rx: 16, fill: C.wood, stroke: C.line, 'stroke-width': 5 }, g);
    el('rect', { x: -sw / 2 + 16, y: -500, width: sw - 32, height: 210, rx: 10, fill: '#f6dcb6', stroke: C.woodDark, 'stroke-width': 3 }, g);
    el('rect', { x: -sw / 2 + 16, y: -270, width: sw - 32, height: 250, rx: 10, fill: '#f6dcb6', stroke: C.woodDark, 'stroke-width': 3 }, g);
    var hi = { x: sx, y: F - 300 }, lo = { x: sx, y: F - 30 };
    var rg = el('g', {}, B.back);
    el('line', { x1: sx - sw / 2 - 110, y1: F - 250, x2: sx - sw / 2 - 12, y2: F - 250, stroke: C.mint, 'stroke-width': 6, 'stroke-dasharray': '4 12', 'stroke-linecap': 'round' }, rg);
    var hx0 = sx - sw / 2 - 134, hy0 = F - 250;
    [-15, -5, 5, 15].forEach(function (d) { el('rect', { x: hx0 + d - 5, y: hy0 - 40 + Math.abs(d) * 0.6, width: 11, height: 30, rx: 5.5, fill: '#ffe1cf', stroke: C.line, 'stroke-width': 3 }, rg); });
    el('rect', { x: hx0 - 22, y: hy0 - 16, width: 44, height: 38, rx: 16, fill: '#ffe1cf', stroke: C.line, 'stroke-width': 3 }, rg);
    el('rect', { x: hx0 - 36, y: hy0 - 10, width: 12, height: 26, rx: 6, fill: '#ffe1cf', stroke: C.line, 'stroke-width': 3, transform: 'rotate(-30 ' + (hx0 - 30) + ' ' + hy0 + ')' }, rg);
    B.fx('hiNo', function (p) {
      var gg = el('g', {}, p);
      el('rect', { x: hi.x - 92, y: hi.y - 182, width: 184, height: 186, rx: 16, fill: 'rgba(255,255,255,.55)', stroke: '#c9b8a6', 'stroke-width': 6, 'stroke-dasharray': '14 10' }, gg);
      el('path', { d: 'M' + (hi.x - 26) + ',' + (hi.y - 116) + ' l52,52 M' + (hi.x + 26) + ',' + (hi.y - 116) + ' l-52,52', stroke: '#c9b8a6', 'stroke-width': 10, 'stroke-linecap': 'round' }, gg);
      return gg;
    });
    B.fx('loYes', function (p) {
      return el('rect', { x: lo.x - 100, y: lo.y - 220, width: 200, height: 226, rx: 16, fill: 'none', stroke: C.glow, 'stroke-width': 9 }, p);
    });
    B.item('car', 'car', P ? 420 : 420, R, { color: C.yellow });
    B.ring('ring', 84);
    B.sparkle('spark', lo.x, lo.y - 250);
    return { home: P ? 160 : 170, plan: [
      ['title'],
      ['cap', '자동차의 자리를 함께 골라요.', 1],
      ['fx', 'ring', 0.4, { on: 'car' }],
      ['walk', 'car'], ['pick', 'car'], ['carry', sx],
      ['fx', 'hiNo', 0.4], ['fx', 'loYes', 0.4],
      ['cap', '손이 닿는 낮은 곳에 두면 내일도 꺼낼 수 있어요.', 2],
      ['fxOff', 'hiNo', 0.25],
      ['place', 'car', lo.x, lo.y],
      ['pick', 'car'], ['wait', 0.2], ['place', 'car', lo.x, lo.y], ['fx', 'spark', 0.35, { pop: true }],
      ['done']
    ] };
  };

  // ---------- engine ----------
  function create(host, options) {
    if (!host) throw new Error('SiseonMission.create: host element is required');
    options = options || {};
    var code = String(options.code || '').toUpperCase();
    var pattern = clamp(parseInt(options.pattern, 10) || 0, 0, 4);
    var childIndex = options.childIndex === 1 ? 1 : 0;
    var reduced = !!options.reducedMotion;
    var soundAllowed = options.soundAllowed;
    var destroyed = false;
    var onStage = typeof options.onStageChanged === 'function' ? options.onStageChanged : null;

    // DOM
    var root = html('div', 'smm-root', null);
    var top = html('div', 'smm-top', root);
    var tag = html('span', 'smm-tag', top);
    var tagCode = html('b', 'smm-tag-code', tag); tagCode.textContent = code || '—';
    var tagName = html('span', 'smm-tag-name', tag); tagName.textContent = options.name || NAMES[code] || '';
    var stepChip = html('span', 'smm-step', top);
    var stage = html('div', 'smm-stage', root);
    var svg = el('svg', { class: 'smm-svg', role: 'img', 'aria-label': TITLES[pattern] }, stage);
    var caption = html('p', 'smm-caption', root);
    caption.setAttribute('aria-live', 'polite');
    host.appendChild(root);
    host.setAttribute('data-phase', 'ready');

    var charImg = null, ratio = 1.05, built = null, layout = null;
    var t = 0, raf = 0, lastNow = 0, phase = 'ready', lastCaption = null, lastKeyIdx = -1;
    var audio = null;

    // image size (decoded without fetch; the browser loads the URL as an <img>)
    var probe = new Image();
    probe.onload = function () { if(destroyed)return; if (probe.naturalWidth) { ratio = probe.naturalHeight / probe.naturalWidth; rebuild(); } };
    probe.src = options.imageSrc || '';

    function rebuild() {
      if(destroyed)return;
      var portrait = (root.clientWidth || 800) < 560;
      layout = layoutFor(portrait);
      root.classList.toggle('smm-portrait', portrait);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 ' + layout.vy + ' ' + layout.W + ' ' + layout.vh);
      built = build(layout);
      render(true);
    }

    function build(L) {
      var defs = el('defs', {}, svg);
      var gr = el('radialGradient', { id: 'smmPaper' + uid, cx: '50%', cy: '38%', r: '75%' }, defs);
      el('stop', { offset: '0', 'stop-color': '#fff9ee' }, gr);
      el('stop', { offset: '1', 'stop-color': '#f1e3cd' }, gr);
      el('rect', { x: 0, y: 0, width: L.W, height: L.H, fill: 'url(#smmPaper' + uid + ')' }, svg);
      // soft paper fibres
      for (var i = 0; i < 26; i++) {
        var fx = (i * 977) % L.W, fy = (i * 613) % (L.floor - 40);
        el('ellipse', { cx: fx, cy: fy, rx: 60 + (i % 5) * 18, ry: 4, fill: '#ead8bd', opacity: 0.35, transform: 'rotate(' + ((i * 37) % 30 - 15) + ' ' + fx + ' ' + fy + ')' }, svg);
      }
      // floor
      el('rect', { x: 0, y: L.floor, width: L.W, height: L.H - L.floor, fill: '#ecd6b6' }, svg);
      el('line', { x1: 0, y1: L.floor, x2: L.W, y2: L.floor, stroke: '#cfae86', 'stroke-width': 5 }, svg);

      var layers = {
        back: el('g', { class: 'smm-l-back' }, svg),
        items: el('g', { class: 'smm-l-items' }, svg),
        front: el('g', { class: 'smm-l-front' }, svg),
        fx: el('g', { class: 'smm-l-fx' }, svg),
        char: el('g', { class: 'smm-l-char' }, svg),
        carry: el('g', { class: 'smm-l-carry' }, svg)
      };
      var init = { char: { x: 0, bob: 0, tilt: 0, sq: 0, carry: null }, items: {}, fx: {}, cap: null };
      var nodes = { items: {}, fx: {} };

      // character size: big enough to read, never squashed
      var ch = L.portrait ? 320 : 285, cw = ch / ratio;
      if (cw > 300) { cw = 300; ch = cw * ratio; }
      var cg = el('g', {}, layers.char);
      el('ellipse', { cx: 0, cy: 0, rx: cw * 0.36, ry: 16, fill: 'rgba(90,58,36,.16)', class: 'smm-shadow' }, layers.char);
      var img = el('image', { x: -cw / 2, y: -ch, width: cw, height: ch, preserveAspectRatio: 'xMidYMax meet' }, cg);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', options.imageSrc || '');
      img.setAttribute('href', options.imageSrc || '');
      var charDim = { cw: cw, ch: ch, hx: cw * 0.23, hy: ch * 0.38 };

      var B = {
        back: layers.back, items: layers.items, front: layers.front,
        item: function (id, kind, x, y, o) {
          var g = el('g', { class: 'smm-item' }, layers.items);
          var gi = el('g', { transform: 'scale(' + ITEM_SCALE + ')' }, g);
          Draw[kind](gi, kind === 'card' ? (o && o.icon) : (o && o.color));
          nodes.items[id] = g;
          init.items[id] = { x: x, y: y, rot: 0, op: 1, layer: 'items' };
        },
        fx: function (name, make) { nodes.fx[name] = { el: make(layers.fx), kind: 'fade' }; init.fx[name] = 0; },
        ring: function (name, r) {
          var g = el('g', {}, layers.fx);
          el('circle', { cx: 0, cy: 0, r: r, fill: 'none', stroke: C.glow, 'stroke-width': 9, 'stroke-dasharray': '18 12' }, g);
          nodes.fx[name] = { el: g, kind: 'ring' }; init.fx[name] = 0;
        },
        check: function (name, x, y) {
          var g = el('g', { transform: 'translate(' + x + ',' + y + ')' }, layers.fx);
          var inner = el('g', {}, g);
          el('circle', { cx: 0, cy: 0, r: 30, fill: C.mint, stroke: '#5f8f5c', 'stroke-width': 4 }, inner);
          el('path', { d: 'M-13,1 L-3,11 L15,-10', fill: 'none', stroke: '#fff', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inner);
          nodes.fx[name] = { el: g, inner: inner, kind: 'pop' }; init.fx[name] = 0;
        },
        sparkle: function (name, x, y) {
          var g = el('g', { transform: 'translate(' + x + ',' + y + ')' }, layers.fx);
          var inner = el('g', {}, g);
          for (var k = 0; k < 5; k++) {
            var a = -Math.PI / 2 + k * (Math.PI * 2 / 5), r = 58;
            el('path', { d: starPath(Math.cos(a) * r, Math.sin(a) * r, k % 2 ? 12 : 18), fill: k % 2 ? C.pink : C.glow }, inner);
          }
          nodes.fx[name] = { el: g, inner: inner, kind: 'pop' }; init.fx[name] = 0;
        },
        clock: function (name, x, y) {
          var g = el('g', { transform: 'translate(' + x + ',' + y + ')' }, layers.fx);
          var inner = el('g', {}, g);
          el('rect', { x: -66, y: -66, width: 132, height: 132, rx: 30, fill: '#fffdf8', stroke: C.line, 'stroke-width': 5 }, inner);
          el('circle', { cx: 0, cy: 0, r: 44, fill: '#fff4dc', stroke: C.line, 'stroke-width': 5 }, inner);
          el('line', { x1: 0, y1: 0, x2: 0, y2: -28, stroke: C.line, 'stroke-width': 6, 'stroke-linecap': 'round' }, inner);
          var hand = el('line', { x1: 0, y1: 0, x2: 22, y2: 10, stroke: C.red, 'stroke-width': 6, 'stroke-linecap': 'round' }, inner);
          el('circle', { cx: 0, cy: 0, r: 6, fill: C.line }, inner);
          nodes.fx[name] = { el: g, inner: inner, kind: 'pop', hand: hand }; init.fx[name] = 0;
        },
        shine: function (name, y, w) {
          var g = el('g', {}, layers.back);
          var r = el('rect', { x: 0, y: y - 34, width: 0, height: 66, rx: 30, fill: '#fff6d6', opacity: 0.9 }, g);
          var steps = el('g', {}, g);
          for (var k = 0; k < 7; k++) el('ellipse', { cx: 120 + k * (w - 240) / 6, cy: y + (k % 2 ? 10 : -10), rx: 16, ry: 10, fill: '#e0b98a' }, steps);
          nodes.fx[name] = { el: g, kind: 'shine', bar: r, steps: steps, w: w }; init.fx[name] = 0;
        },
        lid: function (name, x, y, w) {
          var g = el('g', { transform: 'translate(' + (x - w / 2) + ',' + y + ')' }, layers.front);
          var inner = el('g', {}, g);
          el('path', { d: 'M0,0 L0,-30 Q' + (w / 2) + ',-78 ' + w + ',-30 L' + w + ',0 Z', fill: '#d9954d', stroke: C.line, 'stroke-width': 5, 'stroke-linejoin': 'round' }, inner);
          el('path', { d: 'M' + (w / 2 - 50) + ',-48 L' + (w / 2 - 34) + ',-62 L' + (w / 2 - 18) + ',-48', fill: 'none', stroke: C.yellow, 'stroke-width': 5 }, inner);
          nodes.fx[name] = { el: g, inner: inner, kind: 'lid' }; init.fx[name] = 0;
        }
      };

      var scene = Scenes[pattern](L, B), plan = scene.plan;
      init.char.x = scene.home;

      // compile plan into timed actions
      var acts = [], T = 0, captionStart = 0, captionText = null;
      function push(dur, apply, extra) { var a = { s: T, d: dur, apply: apply }; for (var k in extra || {}) a[k] = extra[k]; acts.push(a); T += dur; }
      function finishCaptionWindow() {
        var duration = options.captionDurations && options.captionDurations[captionText];
        if (duration && T - captionStart < duration + 0.35) push(duration + 0.35 - (T - captionStart), function () {}, {});
      }
      function handPos(S) { return { x: S.char.x + charDim.hx, y: L.floor - S.char.bob - charDim.hy }; }
      var stepNo = 0;
      plan.forEach(function (p) {
        var kind = p[0];
        if (kind === 'title') {
          push(0.9, function (S) { S.cap = { text: TITLES[pattern], kind: 'title', step: 0 }; }, { key: true, sound: null });
        } else if (kind === 'cap') {
          finishCaptionWindow();
          stepNo = p[2];
          var text = p[1], st = p[2];
          captionText = text; captionStart = T;
          push(0.25, function (S) { S.cap = { text: text, kind: 'step' + st, step: st }; }, { key: false });
        } else if (kind === 'walk') {
          var id = p[1];
          push(0.6, function (S, u) {
            var tx = S.items[id].x - charDim.hx;
            walkTo(S, tx, u);
          }, { key: false, walk: true });
        } else if (kind === 'carry') {
          var to = p[1], slow = p[2] && p[2].slow;
          push(slow ? 1.1 : 0.7, function (S, u) { walkTo(S, to - charDim.hx, u, slow); }, { key: true, walk: true });
        } else if (kind === 'pick') {
          var pid = p[1], ps = p[2] && p[2].slow;
          push(ps ? 0.6 : 0.42, function (S, u) {
            var it = S.items[pid], h = handPos(S);
            if (!it._from) it._from = { x: it.x, y: it.y };
            var e = ease(u);
            S.char.sq = Math.sin(clamp(u, 0, 1) * Math.PI) * 0.07;
            it.x = lerp(it._from.x, h.x, e);
            it.y = lerp(it._from.y, h.y + 38, e) - Math.sin(e * Math.PI) * 26;
            it.rot = Math.sin(e * Math.PI) * -6;
            if (u >= 1) { S.char.carry = pid; it.layer = 'carry'; delete it._from; S.char.sq = 0; it.rot = 0; }
          }, { key: true, sound: 'pick' });
        } else if (kind === 'place') {
          var qid = p[1], qx = p[2], qy = p[3], layer = typeof p[4] === 'string' ? p[4] : 'items';
          var qslow = (p[4] && p[4].slow) || (p[5] && p[5].slow);
          push(qslow ? 0.65 : 0.42, function (S, u) {
            var it = S.items[qid];
            if (!it._from) it._from = { x: it.x, y: it.y };
            S.char.carry = null;
            it.layer = u < 0.85 ? 'carry' : layer;
            var e = ease(u);
            S.char.sq = Math.sin(clamp(u, 0, 1) * Math.PI) * 0.06;
            it.x = lerp(it._from.x, qx, e);
            it.y = lerp(it._from.y, qy, e) - Math.sin(e * Math.PI) * 18;
            if (u >= 1) { delete it._from; S.char.sq = 0; it.layer = layer; }
          }, { key: true, sound: 'place' });
        } else if (kind === 'fx' || kind === 'fxOff') {
          var name = p[1], dur = p[2], o = p[3] || {}, on = kind === 'fx';
          push(dur, function (S, u) {
            S.fx[name] = on ? easeOut(u) : 1 - easeOut(u);
            if (o.on) S.fx[name + '_on'] = o.on;
          }, { key: !!o.pop || name === 'lid', sound: o.pop ? 'chime' : null });
        } else if (kind === 'wait') {
          push(p[1], function () {}, {});
        } else if (kind === 'done') {
          finishCaptionWindow();
          push(0.6, function (S, u) { walkTo(S, scene.home, u); }, { walk: true });
          push(0.7, function (S, u) {
            S.cap = { text: DONE_TEXT, kind: 'done', step: 3 };
            S.char.hop = Math.sin(clamp(u * 2, 0, 1) * Math.PI) * 26;
          }, { key: true, sound: 'done' });
          var finalDuration = options.captionDurations && options.captionDurations[DONE_TEXT];
          if (finalDuration) push(Math.max(0, finalDuration + 0.35 - 0.7), function () {}, {});
        }
      });
      // after each action, clear one-shot rings once the friend walks
      function walkTo(S, tx, u, slow) {
        if (S.char._wf === undefined) S.char._wf = S.char.x;
        var e = ease(u);
        tx = Math.max(tx, charDim.cw * 0.4);
        S.char.x = lerp(S.char._wf, tx, e);
        var dist = Math.abs(tx - S.char._wf), steps = Math.max(2, Math.round(dist / 110));
        S.char.bob = Math.abs(Math.sin(e * Math.PI * steps)) * (slow ? 6 : 14) * (u < 1 ? 1 : 0);
        S.char.tilt = Math.sin(e * Math.PI * steps) * (slow ? 1 : 2.5) * (u < 1 ? 1 : 0);
        if (u >= 1) delete S.char._wf;
      }

      var total = T;
      var keys = [];
      acts.forEach(function (a, i) { if (a.key) keys.push({ t: a.s + a.d, i: i, sound: a.sound }); });
      return { L: L, init: init, nodes: nodes, layers: layers, acts: acts, total: total, keys: keys, charG: cg, dim: charDim, handPos: handPos };
    }

    function starPath(x, y, r) {
      var s = '';
      for (var i = 0; i < 10; i++) {
        var rr = i % 2 ? r * 0.42 : r, a = -Math.PI / 2 + i * Math.PI / 5;
        s += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ',' + (y + Math.sin(a) * rr).toFixed(1);
      }
      return s + 'Z';
    }

    function syncCarry(S) {
      if (!S.char.carry) return;
      var it = S.items[S.char.carry], h = built.handPos(S);
      it.x = h.x; it.y = h.y + 38; it.layer = 'carry';
    }
    function stateAt(time) {
      var b = built, S = clone(b.init);
      for (var i = 0; i < b.acts.length; i++) {
        var a = b.acts[i];
        if (time >= a.s + a.d) { a.apply(S, 1); syncCarry(S); }
        else { if (time > a.s) { a.apply(S, (time - a.s) / a.d); syncCarry(S); } break; }
        // rings switch off once the next move starts
      }
      return S;
    }

    function render(force) {
      if (!built) return;
      var b = built, L = b.L;
      var time = reduced ? (b.keys[Math.max(0, lastKeyIdx)] || { t: 0 }).t : t;
      if (reduced && lastKeyIdx < 0) time = 0.001;
      var S = stateAt(time);
      // character
      var breathe = (!reduced && !S.char.bob) ? Math.sin(t * 2.4) * 0.012 : 0;
      var sq = S.char.sq + breathe, hop = S.char.hop || 0;
      b.charG.setAttribute('transform', 'translate(' + S.char.x.toFixed(1) + ',' + (L.floor - S.char.bob - hop).toFixed(1) + ') rotate(' + S.char.tilt.toFixed(2) + ') scale(' + (1 + sq * 0.6).toFixed(3) + ',' + (1 - sq).toFixed(3) + ')');
      var shadow = b.layers.char.querySelector('.smm-shadow');
      if (shadow) shadow.setAttribute('transform', 'translate(' + S.char.x.toFixed(1) + ',' + L.floor + ')');
      // items
      for (var id in S.items) {
        var it = S.items[id], n = b.nodes.items[id];
        var want = b.layers[it.layer] || b.layers.items;
        if (n.parentNode !== want) want.appendChild(n);
        n.setAttribute('transform', 'translate(' + it.x.toFixed(1) + ',' + it.y.toFixed(1) + ') rotate(' + (it.rot || 0).toFixed(2) + ')');
      }
      // effects
      for (var name in b.nodes.fx) {
        var f = b.nodes.fx[name], v = S.fx[name] || 0;
        if (f.kind === 'fade') { f.el.setAttribute('opacity', v.toFixed(3)); }
        else if (f.kind === 'ring') {
          var target = S.fx[name + '_on'];
          var show = v > 0 && target && S.char.carry !== target && !(S.items[target] && S.items[target].layer === 'carry') && !itemMoved(S, target);
          f.el.setAttribute('opacity', show ? (v * (0.7 + 0.3 * Math.sin(t * 6))).toFixed(3) : '0');
          if (target && S.items[target]) f.el.setAttribute('transform', 'translate(' + S.items[target].x + ',' + (S.items[target].y - 48) + ') rotate(' + (t * 40 % 360).toFixed(1) + ')');
        } else if (f.kind === 'pop') {
          var z = v > 0 ? backOut(v) : 0;
          f.el.setAttribute('opacity', v > 0 ? 1 : 0);
          f.inner.setAttribute('transform', 'scale(' + z.toFixed(3) + ') rotate(' + (f.hand ? 0 : (1 - v) * -30).toFixed(1) + ')');
          if (f.hand) f.hand.setAttribute('transform', 'rotate(' + (v * 300 + (reduced ? 0 : t * 30)).toFixed(1) + ')');
        } else if (f.kind === 'shine') {
          f.bar.setAttribute('width', (v * f.w).toFixed(1));
          f.steps.setAttribute('opacity', v.toFixed(3));
        } else if (f.kind === 'lid') {
          f.inner.setAttribute('transform', 'rotate(' + (-v * 70).toFixed(1) + ')');
        }
      }
      // caption + step chip
      var cap = S.cap || { text: TITLES[pattern], kind: 'title', step: 0 };
      if (force || !lastCaption || lastCaption.text !== cap.text) {
        caption.textContent = cap.text;
        caption.className = 'smm-caption smm-k-' + cap.kind;
        var role = cap.step === 1 || cap.step === 2 ? (cap.step === childIndex + 1 ? 'child' : 'family') : null;
        stepChip.textContent = role ? (cap.step + '단계 · ' + (role === 'child' ? '아이 차례' : '부모님 차례')) : (cap.kind === 'done' ? '시범 끝' : '시범 보기');
        stepChip.className = 'smm-step' + (role ? ' smm-role-' + role : '');
        var changed = !lastCaption || lastCaption.text !== cap.text;
        lastCaption = cap;
        if (changed && onStage) {
          try { onStage(cap.text, { kind: cap.kind, step: cap.step, role: role, pattern: pattern, code: code, title: TITLES[pattern] }); } catch (e) {}
        }
      }
    }

    function itemMoved(S, id) {
      var a = built.init.items[id], b = S.items[id];
      return !a || !b || Math.abs(a.x - b.x) > 2 || Math.abs(a.y - b.y) > 2;
    }

    // ---------- sound (opt-in, synthesized, quiet) ----------
    function sfx(kind) {
      if(window.SiseonAudioRoute && !window.SiseonAudioRoute.canPlayEffects())return;
      if(destroyed || document.hidden || !(typeof soundAllowed === 'function' ? soundAllowed() : soundAllowed) || !kind) return;
      try {
        if (!audio || audio.state==='closed') {audio = new (window.AudioContext || window.webkitAudioContext)();if(window.SiseonAudioRoute)window.SiseonAudioRoute.registerContext(audio);}
        if (audio.state === 'suspended') audio.resume();
        var now = audio.currentTime;
        var tone = function (f0, f1, at, dur, vol, type) {
          var o = audio.createOscillator(), g = audio.createGain();
          o.type = type || 'sine';
          o.frequency.setValueAtTime(f0, now + at);
          o.frequency.exponentialRampToValueAtTime(f1, now + at + dur);
          g.gain.setValueAtTime(0.0001, now + at);
          g.gain.exponentialRampToValueAtTime(vol, now + at + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
          o.connect(g).connect(audio.destination); o.start(now + at); o.stop(now + at + dur + 0.05);
        };
        if (kind === 'pick') tone(420, 640, 0, 0.14, 0.08);
        else if (kind === 'place') tone(260, 180, 0, 0.12, 0.1, 'triangle');
        else if (kind === 'chime') { tone(880, 880, 0, 0.35, 0.05); tone(1320, 1320, 0.08, 0.4, 0.035); }
        else if (kind === 'done') { tone(660, 660, 0, 0.3, 0.05); tone(880, 880, 0.14, 0.32, 0.05); tone(1100, 1100, 0.28, 0.5, 0.045); }
      } catch (e) {}
    }

    // ---------- playback ----------
    var HOLD = Math.max.apply(null, [1.9].concat(Object.keys(options.captionDurations || {}).map(function (text) { return options.captionDurations[text] + 0.35; })));
    function setPhase(p) { phase = p; host.setAttribute('data-phase', p); }
    function frame(now) {
      if(destroyed)return;
      var dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
      var prev = t; t += dt;
      if (reduced) {
        var idx = Math.min(built.keys.length - 1, Math.floor(t / HOLD));
        if (idx !== lastKeyIdx) {
          lastKeyIdx = idx;
          root.classList.remove('smm-flip'); void root.offsetWidth; root.classList.add('smm-flip');
          sfx(built.keys[idx].sound);
          render(false);
        }
        if (t >= built.keys.length * HOLD) { finish(); return; }
      } else {
        built.acts.forEach(function (a) { if (a.sound && a.s > prev && a.s <= t) sfx(a.sound); });
        render(false);
        if (t >= built.total) { t = built.total; render(false); finish(); return; }
      }
      raf = requestAnimationFrame(frame);
    }
    function finish() { raf = 0; setPhase('done'); }
    function play() {
      if(destroyed)return;
      if (!built) rebuild();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (phase !== 'paused') { var fresh = phase === 'ready'; t = 0; lastKeyIdx = -1; if (!fresh) lastCaption = null; render(false); }
      if (audio && audio.state === 'suspended' && (typeof soundAllowed === 'function' ? soundAllowed() : soundAllowed)) try { audio.resume(); } catch (e) {}
      setPhase('playing');
      lastNow = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function syncSound() {
      if(audio && !(typeof soundAllowed === 'function' ? soundAllowed() : soundAllowed)) audio.suspend().catch(function(){});
    }
    function pause() {
      if(audio)audio.suspend().catch(function(){});
      if (phase !== 'playing') return;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      setPhase('paused');
    }
    function destroy() {
      if(destroyed)return; destroyed=true;probe.onload=null;probe.onerror=null;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (ro) ro.disconnect();
      if (audio) try { audio.close(); } catch (e) {}
      audio = null;
      if (root.parentNode) root.parentNode.removeChild(root);
      host.removeAttribute('data-phase');
      built = null;
    }

    var uid = Math.random().toString(36).slice(2, 8);
    var ro = null, lastPortrait = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () {
        if(destroyed)return;
        var p = (root.clientWidth || 800) < 560;
        if (p !== lastPortrait) { lastPortrait = p; rebuild(); }
      });
      ro.observe(root);
    }
    rebuild();
    lastPortrait = layout.portrait;

    return { play: play, pause: pause, destroy: destroy, syncSound: syncSound };
  }

  window.SiseonMission = { create: create, codes: Object.keys(NAMES), names: NAMES, titles: TITLES.slice() };
})();
