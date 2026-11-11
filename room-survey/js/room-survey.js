/*
 * 시선사이 · 공동관찰 입체방 — 인터랙티브 Canvas 엔진
 * -------------------------------------------------------------
 * - 원본 PNG를 변형 없이 그대로 그린 뒤, 그 위에 깊이감 레이어(천장·벽 모서리·
 *   바닥 원근·가구 접지 그림자)와 은은한 빛·먼지 움직임을 얹습니다.
 * - 선택 전에는 어떤 장난감도 따로 강조하지 않습니다(호버 효과·커서 변화 없음,
 *   빛과 먼지는 방 전체에 고르게 분포).
 * - 장난감을 터치하면 그 장난감이 살짝 통통 튀고 폭죽이 터진 뒤 원래 모습으로
 *   돌아옵니다.
 * - 모든 판정은 원본 이미지 좌표(1536×1024)로 계산하므로 화면 크기·회전·
 *   기기 픽셀 밀도가 달라도 그림과 터치 위치가 정확히 맞습니다.
 *
 * 사용법
 *   const room = SiseonRoom.create(document.getElementById('room'), {
 *     imageSrc: 'assets/room.png',
 *     hotspots: window.SISEON_ROOM_HOTSPOTS,
 *     respondent: 'parent',                 // 'parent' | 'child' | 임의 문자열
 *     onSelect: (sel) => console.log(sel)
 *   });
 */
(function (global) {
  'use strict';

  var PALETTE = ['#ff8f7e', '#ffc94f', '#8fd8a9', '#7fbaf2', '#c6a2f2', '#ff9fc8', '#ffe27a'];

  var DEFAULTS = {
    imageSrc: 'assets/room.png',
    hotspots: null,
    fit: 'contain',            // 'contain'(그림 전체 보이기) | 'cover'(화면 꽉 채우기)
    background: '#f1dfc0',     // 여백 색(그림 가장자리 톤)
    depth: true,               // 깊이감 레이어
    ambient: true,             // 빛 일렁임·먼지
    parallax: true,            // 기울기/마우스에 따른 빛·먼지 시차
    intro: true,               // 첫 진입 시 카메라가 살짝 물러나며 방이 펼쳐짐
    respondent: 'unknown',
    maxSelections: Infinity,   // 이 횟수만큼 고르면 더 이상 반응하지 않음
    tapTolerance: 22,          // 장난감 경계 밖 터치 허용 반경(CSS px)
    maxDpr: 2,
    debug: false,
    onSelect: null,
    onReady: null
  };

  /* ---------- 작은 유틸 ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }
  function uid() { return 'xxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }

  function shapePath(s) {
    var p = new Path2D();
    if (s.rect) {
      p.rect(s.rect[0], s.rect[1], s.rect[2], s.rect[3]);
    } else if (s.ellipse) {
      p.ellipse(s.ellipse[0], s.ellipse[1], s.ellipse[2], s.ellipse[3], 0, 0, Math.PI * 2);
    } else if (s.poly) {
      s.poly.forEach(function (pt, i) { if (i) p.lineTo(pt[0], pt[1]); else p.moveTo(pt[0], pt[1]); });
      p.closePath();
    }
    return p;
  }
  function shapeBox(s) {
    if (s.rect) return { x: s.rect[0], y: s.rect[1], w: s.rect[2], h: s.rect[3] };
    if (s.ellipse) return { x: s.ellipse[0] - s.ellipse[2], y: s.ellipse[1] - s.ellipse[3], w: s.ellipse[2] * 2, h: s.ellipse[3] * 2 };
    var xs = s.poly.map(function (p) { return p[0]; }), ys = s.poly.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
    return { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 };
  }
  function shapeArea(s) {
    if (s.rect) return s.rect[2] * s.rect[3];
    if (s.ellipse) return Math.PI * s.ellipse[2] * s.ellipse[3];
    var a = 0, P = s.poly;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]);
    return Math.abs(a / 2);
  }
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  /* ================================================================ */
  function RoomSurvey(container, options) {
    this.el = container;
    this.o = {};
    for (var k in DEFAULTS) this.o[k] = DEFAULTS[k];
    for (var k2 in (options || {})) this.o[k2] = options[k2];
    if (!this.o.hotspots) throw new Error('hotspots 데이터가 필요합니다.');

    this.W = this.o.hotspots.imageWidth;
    this.H = this.o.hotspots.imageHeight;
    this.sessionId = uid();
    this.selections = [];
    this.locked = false;
    this.pointers = {};
    this.pops = [];        // 통통 튀는 장난감 애니메이션
    this.particles = [];   // 폭죽 입자
    this.rings = [];
    this.pending = [];     // 지연 발사 폭죽
    this.motes = [];
    this.par = { x: 0, y: 0, tx: 0, ty: 0 };
    this.reduced = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.debugTap = null;
    this._raf = 0;
    this._t0 = 0;
    this._last = 0;

    this._buildDom();
    this._prepareToys();
    this._load();
  }

  RoomSurvey.prototype._buildDom = function () {
    var el = this.el;
    el.classList.add('rs-root');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.background = this.o.background;

    var c = this.canvas = document.createElement('canvas');
    c.className = 'rs-canvas';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', '두 토끼가 있는 장난감 방 그림. 장난감을 눌러 고를 수 있어요.');
    el.appendChild(c);
    this.ctx = c.getContext('2d');

    // 화면낭독기·키보드용 숨은 버튼(시각적으로는 보이지 않으므로 어떤 장난감도 강조되지 않음)
    var sr = this.sr = document.createElement('div');
    sr.className = 'rs-sr';
    sr.setAttribute('role', 'group');
    sr.setAttribute('aria-label', '방 안의 장난감');
    el.appendChild(sr);

    if (this.o.debug) {
      var d = this.debugEl = document.createElement('div');
      d.className = 'rs-debug';
      d.textContent = 'debug: 그림을 누르면 원본 좌표가 표시됩니다';
      el.appendChild(d);
    }

    this.hitCtx = makeCanvas(1, 1).getContext('2d');
  };

  RoomSurvey.prototype._prepareToys = function () {
    var self = this;
    this.toys = this.o.hotspots.toys.map(function (t) {
      var parts = t.shapes.map(function (s) {
        return { def: s, path: shapePath(s), box: shapeBox(s), area: shapeArea(s), sprite: null };
      });
      var area = parts.reduce(function (a, p) { return a + p.area; }, 0);
      var main = parts.slice().sort(function (a, b) { return b.area - a.area; })[0];
      return { id: t.id, label: t.label, zone: t.zone, parts: parts, area: area, main: main, lastTap: -1e9 };
    });
    this.toys.forEach(function (toy) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = toy.label;
      b.addEventListener('click', function () {
        var m = toy.main.box;
        self._select(toy, { x: m.x + m.w / 2, y: m.y + m.h / 2 }, 'keyboard');
      });
      self.sr.appendChild(b);
    });
  };

  RoomSurvey.prototype._load = function () {
    var self = this, img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      self.img = img;
      if (img.naturalWidth !== self.W || img.naturalHeight !== self.H) {
        // 다른 해상도의 같은 그림을 넣어도 좌표가 맞도록 비례 처리
        self.srcScaleX = img.naturalWidth / self.W;
        self.srcScaleY = img.naturalHeight / self.H;
      }
      self._bake();
      self._initMotes();
      self._bindEvents();
      self._resize();
      self._t0 = now();
      self._loop();
      self.el.classList.add('rs-ready');
      if (typeof self.o.onReady === 'function') self.o.onReady(self);
    };
    img.onerror = function () {
      self.el.classList.add('rs-error');
      self.el.setAttribute('data-error', '그림 파일을 불러오지 못했어요: ' + self.o.imageSrc);
    };
    img.src = this.o.imageSrc;
  };

  /* ---------- 원본 + 깊이감 레이어를 한 번만 합성 ---------- */
  RoomSurvey.prototype._bake = function () {
    var W = this.W, H = this.H;
    var base = this.base = makeCanvas(W, H);
    var g = base.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(this.img, 0, 0, W, H);          // 원본 PNG 그대로
    if (this.o.depth) this._drawDepth(g, W, H);
  };

  RoomSurvey.prototype._drawDepth = function (g, W, H) {
    g.save();
    g.globalCompositeOperation = 'multiply';

    // 1) 천장: 위로 갈수록 살짝 어둡게 → 천장이 뒤로 물러나는 느낌
    var gr = g.createLinearGradient(0, 0, 0, 120);
    gr.addColorStop(0, 'rgba(120,88,62,0.22)');
    gr.addColorStop(1, 'rgba(120,88,62,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, 120);

    // 2) 두 벽이 만나는 모서리(약 x=885)의 은은한 그늘
    gr = g.createLinearGradient(800, 0, 980, 0);
    gr.addColorStop(0, 'rgba(70,72,110,0)');
    gr.addColorStop(0.5, 'rgba(70,72,110,0.13)');
    gr.addColorStop(1, 'rgba(70,72,110,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(800, 60); g.lineTo(980, 60); g.lineTo(960, 420); g.lineTo(820, 420); g.closePath(); g.fill();

    // 3) 벽과 바닥이 만나는 선의 접지 그늘
    g.save();
    g.strokeStyle = 'rgba(90,62,40,0.16)';
    g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = 'rgba(90,62,40,0.22)'; g.shadowBlur = 18;
    g.beginPath();
    g.moveTo(370, 404); g.lineTo(590, 414); g.lineTo(905, 416);
    g.lineTo(1080, 448); g.lineTo(1360, 492); g.lineTo(1536, 512);
    g.stroke();
    g.restore();

    // 4) 바닥 원근: 먼 바닥은 살짝 어둡고, 화면 앞쪽 가장자리도 살짝 내려앉게
    gr = g.createLinearGradient(0, 400, 0, H);
    gr.addColorStop(0, 'rgba(92,62,40,0.14)');
    gr.addColorStop(0.28, 'rgba(92,62,40,0)');
    gr.addColorStop(0.78, 'rgba(92,62,40,0)');
    gr.addColorStop(1, 'rgba(92,62,40,0.13)');
    g.fillStyle = gr; g.fillRect(0, 400, W, H - 400);

    // 5) 가구 접지 그림자(장난감이 아닌 가구에만 → 특정 장난감 강조 없음)
    var self = this;
    [
      [215, 414, 46, 9],   // 꽃 받침 의자
      [740, 418, 175, 13], // 낮은 책장
      [1150, 470, 230, 16],// 큰 선반
      [1372, 504, 22, 7], [1505, 528, 22, 7], // 카트 바퀴
      [400, 700, 26, 8], [332, 598, 18, 6], [466, 592, 18, 6], // 탁자·의자 다리
      [230, 668, 230, 52]  // 탁자 아래 넓은 그늘
    ].forEach(function (e, i) { self._softEllipse(g, e[0], e[1], e[2], e[3], i === 9 ? 0.09 : 0.16); });

    // 6) 비네팅: 시선이 방 안쪽으로 모이도록 가장자리를 고르게 낮춤
    gr = g.createRadialGradient(W * 0.52, H * 0.52, H * 0.42, W * 0.52, H * 0.52, H * 1.05);
    gr.addColorStop(0, 'rgba(70,46,30,0)');
    gr.addColorStop(1, 'rgba(70,46,30,0.2)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

    // 7) 창문 쪽 따뜻한 주광(벽 위주)
    g.globalCompositeOperation = 'screen';
    gr = g.createRadialGradient(312, 160, 30, 312, 160, 460);
    gr.addColorStop(0, 'rgba(255,232,180,0.18)');
    gr.addColorStop(1, 'rgba(255,232,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 800, 640);
    g.restore();
  };

  RoomSurvey.prototype._softEllipse = function (g, cx, cy, rx, ry, a) {
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, 'rgba(80,52,32,' + a + ')');
    gr.addColorStop(1, 'rgba(80,52,32,0)');
    g.save(); g.translate(cx, cy); g.scale(rx, ry);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
    g.restore();
  };

  /* ---------- 장난감 조각 스프라이트(가장자리 부드러운 마스크) ---------- */
  RoomSurvey.prototype._sprite = function (part) {
    if (part.sprite) return part.sprite;
    var pad = 8, b = part.box;
    var bx = Math.floor(b.x - pad), by = Math.floor(b.y - pad);
    var bw = Math.ceil(b.w + pad * 2), bh = Math.ceil(b.h + pad * 2);
    var c = makeCanvas(bw, bh), g = c.getContext('2d');
    // 그림자 트릭으로 마스크 가장자리를 4px 정도 페더링(사파리 포함 호환)
    var OFF = 10000;
    g.save();
    g.shadowColor = '#000'; g.shadowBlur = 5; g.shadowOffsetX = OFF;
    g.translate(-bx - OFF, -by);
    g.fillStyle = '#000';
    g.fill(part.path);
    g.restore();
    g.globalCompositeOperation = 'source-in';
    g.drawImage(this.base, bx, by, bw, bh, 0, 0, bw, bh);
    part.sprite = { c: c, x: bx, y: by, w: bw, h: bh };
    return part.sprite;
  };

  /* ---------- 먼지 입자(방 전체에 고르게) ---------- */
  RoomSurvey.prototype._initMotes = function () {
    var n = this.reduced ? 0 : 42;
    this.motes = [];
    for (var i = 0; i < n; i++) {
      this.motes.push({
        x: rand(0, this.W), y: rand(0, this.H * 0.9),
        r: rand(1.1, 2.6), d: rand(0.3, 1),
        vx: rand(-4, 7), vy: rand(-7, -2),
        ph: rand(0, Math.PI * 2), sp: rand(0.6, 1.4)
      });
    }
  };

  /* ---------- 크기·좌표 변환 ---------- */
  RoomSurvey.prototype._resize = function () {
    var r = this.el.getBoundingClientRect();
    var cssW = Math.max(1, this.el.clientWidth || r.width);
    var cssH = Math.max(1, this.el.clientHeight || r.height);
    var dpr = Math.min(global.devicePixelRatio || 1, this.o.maxDpr);
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    var sx = cssW / this.W, sy = cssH / this.H;
    this.s = this.o.fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
    this.ox = (cssW - this.W * this.s) / 2;
    this.oy = (cssH - this.H * this.s) / 2;
    this._draw(this._last || now());
  };

  // 카메라(인트로 줌) 상태
  RoomSurvey.prototype._cam = function (t) {
    var fx = 890, fy = 330, z = 1;
    if (this.o.intro && !this.reduced) {
      var p = clamp((t - this._t0) / 2400, 0, 1);
      z = 1 + 0.05 * (1 - easeInOutCubic(p));
    }
    return { fx: fx, fy: fy, z: z };
  };

  // 화면(CSS px, 컨테이너 기준) → 원본 이미지 좌표
  RoomSurvey.prototype.toImage = function (cx, cy) {
    var cam = this._cam(now());
    var u = (cx - this.ox) / this.s, v = (cy - this.oy) / this.s;
    return { x: cam.fx + (u - cam.fx) / cam.z, y: cam.fy + (v - cam.fy) / cam.z };
  };

  // 브라우저 이벤트 좌표 → 컨테이너 CSS px (CSS transform으로 확대된 경우도 보정)
  RoomSurvey.prototype._local = function (e) {
    var r = this.el.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.cssW / (r.width || 1)),
      y: (e.clientY - r.top) * (this.cssH / (r.height || 1))
    };
  };

  /* ---------- 판정 ---------- */
  RoomSurvey.prototype.hitTest = function (ix, iy) {
    var g = this.hitCtx, best = null;
    for (var i = 0; i < this.toys.length; i++) {
      var t = this.toys[i];
      for (var j = 0; j < t.parts.length; j++) {
        if (g.isPointInPath(t.parts[j].path, ix, iy)) {
          if (!best || t.area < best.area) best = t;
          break;
        }
      }
    }
    if (best) return best;
    // 경계 바로 바깥(손가락 굵기) 허용
    var tol = this.o.tapTolerance / (this.s * this._cam(now()).z), bestD = tol;
    for (var a = 0; a < this.toys.length; a++) {
      var toy = this.toys[a];
      for (var b = 0; b < toy.parts.length; b++) {
        var bx = toy.parts[b].box;
        var dx = Math.max(bx.x - ix, 0, ix - (bx.x + bx.w));
        var dy = Math.max(bx.y - iy, 0, iy - (bx.y + bx.h));
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) { bestD = d; best = toy; }
      }
    }
    return best;
  };

  /* ---------- 입력 ---------- */
  RoomSurvey.prototype._bindEvents = function () {
    var self = this, c = this.canvas;

    this._onDown = function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var p = self._local(e);
      self.pointers[e.pointerId] = { x: p.x, y: p.y, t: now() };
      if (e.pointerType !== 'mouse') e.preventDefault();
    };
    this._onUp = function (e) {
      var d = self.pointers[e.pointerId];
      delete self.pointers[e.pointerId];
      if (!d) return;
      var p = self._local(e);
      var moved = Math.hypot(p.x - d.x, p.y - d.y);
      if (moved > 24 || now() - d.t > 1200) return;   // 드래그·길게 누름은 선택 아님
      var ip = self.toImage(d.x, d.y);
      self._tap(ip, e.pointerType || 'touch');
    };
    this._onCancel = function (e) { delete self.pointers[e.pointerId]; };
    this._onMove = function (e) {
      if (!self.o.parallax || e.pointerType !== 'mouse') return;
      var p = self._local(e);
      self.par.tx = clamp(p.x / self.cssW * 2 - 1, -1, 1);
      self.par.ty = clamp(p.y / self.cssH * 2 - 1, -1, 1);
    };
    this._onTilt = function (e) {
      if (!self.o.parallax || e.gamma == null) return;
      self.par.tx = clamp(e.gamma / 25, -1, 1);
      self.par.ty = clamp((e.beta - 40) / 25, -1, 1);
    };

    c.addEventListener('pointerdown', this._onDown, { passive: false });
    c.addEventListener('pointerup', this._onUp);
    c.addEventListener('pointercancel', this._onCancel);
    c.addEventListener('pointermove', this._onMove);
    c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // iOS 더블탭 확대·제스처 확대 방지
    c.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    c.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    global.addEventListener('deviceorientation', this._onTilt);

    this._onResize = function () { self._resize(); };
    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(this.el);
    }
    global.addEventListener('resize', this._onResize);
    global.addEventListener('orientationchange', function () { setTimeout(self._onResize, 250); });
    if (global.visualViewport) visualViewport.addEventListener('resize', this._onResize);

    this._onVis = function () {
      if (document.hidden) { cancelAnimationFrame(self._raf); self._raf = 0; }
      else if (!self._raf) { self._last = now(); self._loop(); }
    };
    document.addEventListener('visibilitychange', this._onVis);
  };

  RoomSurvey.prototype._tap = function (ip, source) {
    if (this.o.debug) {
      this.debugTap = { x: ip.x, y: ip.y, t: now() };
      if (this.debugEl) this.debugEl.textContent = '원본 좌표 x=' + Math.round(ip.x) + ', y=' + Math.round(ip.y);
    }
    if (ip.x < 0 || ip.y < 0 || ip.x > this.W || ip.y > this.H) return;
    var toy = this.hitTest(ip.x, ip.y);
    if (toy) this._select(toy, ip, source);
  };

  RoomSurvey.prototype._select = function (toy, ip, source) {
    if (this.locked) return;
    var t = now();
    if (t - toy.lastTap < 350) return;   // 같은 장난감 연타 방지
    toy.lastTap = t;

    this._pop(toy, t);
    var mb = toy.main.box;
    this._burst(mb.x + mb.w / 2, mb.y + mb.h * 0.42, Math.max(mb.w, mb.h), t);

    var sel = {
      type: 'siseon:toy-select',
      toyId: toy.id,
      toyLabel: toy.label,
      zone: toy.zone,
      respondent: this.o.respondent,
      sessionId: this.sessionId,
      order: this.selections.length + 1,
      imageX: Math.round(ip.x),
      imageY: Math.round(ip.y),
      input: source,
      at: new Date().toISOString()
    };
    this.selections.push(sel);
    if (this.selections.length >= this.o.maxSelections) this.locked = true;

    if (typeof this.o.onSelect === 'function') { try { this.o.onSelect(sel, this); } catch (err) { console.error(err); } }
    this.el.dispatchEvent(new CustomEvent('toyselect', { detail: sel, bubbles: true }));
    if (global.parent && global.parent !== global) {
      try { global.parent.postMessage(sel, '*'); } catch (e2) { /* 무시 */ }
    }
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e3) { /* 무시 */ } }
    if (!this._raf) this._loop();
  };

  /* ---------- 장난감 통통 ---------- */
  RoomSurvey.prototype._pop = function (toy, t) {
    var self = this;
    this.pops = this.pops.filter(function (p) { return p.toy !== toy; });
    toy.parts.forEach(function (part, i) {
      self.pops.push({ toy: toy, part: part, t0: t + i * 40, dur: self.reduced ? 380 : 820, sp: self._sprite(part) });
    });
  };

  function popCurve(p, reduced) {
    // 항상 1 이상으로만 커지므로 원본 그림의 가장자리가 겹쳐 보이지 않음
    var amp = reduced ? 0.06 : 0.15;
    if (p < 0.2) {
      var e = easeOutCubic(p / 0.2);
      return { sx: 1 + amp * 0.62 * e, sy: 1 + amp * e, r: 0 };
    }
    var q = (p - 0.2) / 0.8, damp = Math.pow(1 - q, 2.2);
    var w = (Math.cos(q * Math.PI * 3) + 1) / 2;
    return {
      sx: 1 + amp * 0.62 * damp * (0.4 + 0.6 * (1 - w)),
      sy: 1 + amp * damp * w,
      r: reduced ? 0 : 0.045 * damp * Math.sin(q * Math.PI * 4)
    };
  }

  /* ---------- 폭죽 ---------- */
  RoomSurvey.prototype._burst = function (x, y, size, t) {
    var R = clamp(size * 0.9, 95, 170);
    var k = this.reduced ? 0.4 : 1;
    this._spawn(x, y, R, Math.round(34 * k), 1, t);
    this.rings.push({ x: x, y: y, R: R * 0.75, t0: t, dur: 480 });
    if (!this.reduced) {
      this.pending.push({ at: t + 150, x: x + rand(-R * 0.25, R * 0.25), y: y - R * 0.3, R: R * 0.6, n: 18, kind: 0.8 });
      this.pending.push({ at: t + 290, x: x + rand(-R * 0.3, R * 0.3), y: y - R * 0.12, R: R * 0.45, n: 12, kind: 0.6 });
    }
  };

  RoomSurvey.prototype._spawn = function (x, y, R, n, scale, t) {
    var off = rand(0, Math.PI * 2);
    for (var i = 0; i < n; i++) {
      var a = off + (i / n) * Math.PI * 2 + rand(-0.12, 0.12);
      var sp = R * 3.3 * rand(0.6, 1.05);
      this.particles.push({
        x: x, y: y, px: x, py: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: rand(0.75, 1.1),
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        w: rand(5.5, 8.5) * scale, star: false
      });
    }
    var stars = Math.round(n / 4);
    for (var j = 0; j < stars; j++) {
      var b = rand(0, Math.PI * 2), s2 = R * 2.0 * rand(0.4, 0.85);
      this.particles.push({
        x: x, y: y, px: x, py: y,
        vx: Math.cos(b) * s2, vy: Math.sin(b) * s2 - 40,
        life: 0, max: rand(0.9, 1.25),
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        w: rand(9, 14) * scale, star: true, rot: rand(0, 6), vr: rand(-6, 6)
      });
    }
  };

  RoomSurvey.prototype._update = function (dt, t) {
    var self = this;
    // 지연 폭죽
    this.pending = this.pending.filter(function (p) {
      if (t >= p.at) { self._spawn(p.x, p.y, p.R, p.n, p.kind, t); return false; }
      return true;
    });
    var drag = Math.exp(-2.4 * dt);
    this.particles = this.particles.filter(function (p) {
      p.life += dt;
      if (p.life >= p.max) return false;
      p.px = p.x; p.py = p.y;
      p.vx *= drag; p.vy = p.vy * drag + 120 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.star) p.rot += p.vr * dt;
      return true;
    });
    this.rings = this.rings.filter(function (r) { return t - r.t0 < r.dur; });
    this.pops = this.pops.filter(function (p) { return t - p.t0 < p.dur; });

    // 먼지
    var W = this.W, H = this.H;
    this.motes.forEach(function (m) {
      m.x += m.vx * dt * m.sp; m.y += m.vy * dt * m.sp;
      if (m.y < -10) { m.y = H * 0.9; m.x = rand(0, W); }
      if (m.x > W + 10) m.x = -10; if (m.x < -10) m.x = W + 10;
    });
    // 시차 부드럽게
    this.par.x += (this.par.tx - this.par.x) * Math.min(1, dt * 3);
    this.par.y += (this.par.ty - this.par.y) * Math.min(1, dt * 3);
  };

  /* ---------- 그리기 ---------- */
  RoomSurvey.prototype._loop = function () {
    var self = this;
    this._raf = requestAnimationFrame(function step() {
      var t = now();
      var dt = Math.min(0.05, (t - (self._last || t)) / 1000);
      self._last = t;
      self._update(dt, t);
      self._draw(t);
      var busy = self.o.ambient || self.particles.length || self.pops.length || self.pending.length ||
        (self.o.intro && t - self._t0 < 2600);
      self._raf = busy && !document.hidden ? requestAnimationFrame(step) : 0;
    });
  };

  RoomSurvey.prototype._draw = function (t) {
    if (!this.base) return;
    var g = this.ctx, dpr = this.dpr, s = this.s, cam = this._cam(t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.o.background;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);

    var k = dpr * s * cam.z;
    g.setTransform(k, 0, 0, k,
      dpr * (this.ox + s * (cam.fx - cam.z * cam.fx)),
      dpr * (this.oy + s * (cam.fy - cam.z * cam.fy)));
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';

    var fade = (this.o.intro && !this.reduced) ? clamp((t - this._t0) / 600, 0, 1) : 1;
    g.globalAlpha = fade;
    g.drawImage(this.base, 0, 0, this.W, this.H);
    g.globalAlpha = 1;

    if (this.o.ambient && !this.reduced) this._drawAmbient(g, t);
    this._drawPops(g, t);
    this._drawFireworks(g, t);
    if (this.o.debug) this._drawDebug(g, t);
  };

  RoomSurvey.prototype._drawAmbient = function (g, t) {
    var sec = t / 1000, px = this.par.x, py = this.par.y;
    g.save();
    // 창문에서 들어오는 빛: 벽 쪽에서 가장 밝고 바닥에 닿기 전 사라짐(장난감 강조 없음)
    g.globalCompositeOperation = 'screen';
    var a = 0.09 + 0.03 * Math.sin(sec * 0.55);
    var sx = px * 6, sy = py * 4;
    var gr = g.createLinearGradient(310 + sx, 160 + sy, 640 + sx, 600 + sy);
    gr.addColorStop(0, 'rgba(255,238,190,' + a + ')');
    gr.addColorStop(0.55, 'rgba(255,238,190,' + (a * 0.35) + ')');
    gr.addColorStop(1, 'rgba(255,238,190,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(215 + sx, 95 + sy); g.lineTo(410 + sx, 70 + sy);
    g.lineTo(900 + sx, 640 + sy); g.lineTo(560 + sx, 720 + sy);
    g.closePath(); g.fill();

    // 먼지: 방 전체에 고르게, 깊이별로 시차
    g.globalCompositeOperation = 'source-over';
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      var al = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(sec * 1.3 * m.sp + m.ph));
      g.fillStyle = 'rgba(255,250,232,' + al.toFixed(3) + ')';
      g.beginPath();
      g.arc(m.x + px * 10 * m.d, m.y + py * 7 * m.d, m.r * (0.7 + m.d * 0.5), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };

  RoomSurvey.prototype._drawPops = function (g, t) {
    for (var i = 0; i < this.pops.length; i++) {
      var p = this.pops[i];
      if (t < p.t0) continue;
      var q = clamp((t - p.t0) / p.dur, 0, 1);
      var c = popCurve(q, this.reduced), sp = p.sp, b = p.part.box;
      // 바닥/선반에 닿은 아랫부분 중앙을 기준으로 통통
      var ax = b.x + b.w / 2, ay = b.y + b.h * 0.92;
      g.save();
      g.translate(ax, ay);
      g.rotate(c.r);
      g.scale(c.sx, c.sy);
      g.translate(-ax, -ay);
      g.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h);
      // 살짝 반짝(스프라이트 영역 안에서만)
      var glow = (1 - q) * 0.22;
      if (glow > 0.01) {
        g.globalAlpha = glow;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h);
      }
      g.restore();
    }
  };

  function starPath(g, r) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
  }

  RoomSurvey.prototype._drawFireworks = function (g, t) {
    g.save();
    g.lineCap = 'round';
    // 퍼지는 고리
    for (var i = 0; i < this.rings.length; i++) {
      var r = this.rings[i], q = (t - r.t0) / r.dur;
      g.globalAlpha = (1 - q) * 0.75;
      g.strokeStyle = '#fff6d6';
      g.lineWidth = 5 * (1 - q) + 1;
      g.beginPath(); g.arc(r.x, r.y, r.R * easeOutCubic(q), 0, Math.PI * 2); g.stroke();
    }
    // 불꽃
    for (var j = 0; j < this.particles.length; j++) {
      var p = this.particles[j], f = 1 - p.life / p.max;
      var al = f < 0.35 ? f / 0.35 : 1;
      if (p.star) {
        g.globalAlpha = al * (0.75 + 0.25 * Math.sin(p.life * 30));
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        starPath(g, p.w * (0.6 + 0.4 * f));
        g.fillStyle = p.c; g.fill();
        g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
        g.restore();
      } else {
        var tx = p.x - (p.x - p.px) * 3.2, ty = p.y - (p.y - p.py) * 3.2; // 꼬리
        g.globalAlpha = al;
        g.strokeStyle = p.c; g.lineWidth = p.w * (0.5 + 0.5 * f);
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(p.x, p.y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = p.w * 0.38 * (0.5 + 0.5 * f);
        g.beginPath(); g.moveTo((tx + p.x) / 2, (ty + p.y) / 2); g.lineTo(p.x, p.y); g.stroke();
      }
    }
    g.restore();
  };

  RoomSurvey.prototype._drawDebug = function (g, t) {
    g.save();
    g.lineWidth = 2 / (this.s || 1);
    this.toys.forEach(function (toy, i) {
      g.strokeStyle = PALETTE[i % PALETTE.length];
      g.fillStyle = 'rgba(255,255,255,0.12)';
      toy.parts.forEach(function (p) { g.fill(p.path); g.stroke(p.path); });
      var b = toy.main.box;
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.font = '600 13px system-ui, sans-serif';
      g.fillText(toy.label, b.x, b.y - 3);
    });
    if (this.debugTap && t - this.debugTap.t < 2500) {
      g.fillStyle = '#e0245e';
      g.beginPath(); g.arc(this.debugTap.x, this.debugTap.y, 6, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  };

  /* ---------- 공개 API ---------- */
  RoomSurvey.prototype.getSelections = function () { return this.selections.slice(); };
  RoomSurvey.prototype.reset = function () { this.selections = []; this.locked = false; };
  RoomSurvey.prototype.setLocked = function (v) { this.locked = !!v; };
  RoomSurvey.prototype.setRespondent = function (r) { this.o.respondent = r; };
  RoomSurvey.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    global.removeEventListener('resize', this._onResize);
    global.removeEventListener('deviceorientation', this._onTilt);
    document.removeEventListener('visibilitychange', this._onVis);
    this.el.innerHTML = '';
  };

  global.SiseonRoom = {
    create: function (el, opts) { return new RoomSurvey(el, opts); },
    RoomSurvey: RoomSurvey
  };
})(window);
