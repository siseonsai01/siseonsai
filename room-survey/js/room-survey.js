/*
 * 시선사이 · 공동관찰 입체방 — 인터랙티브 Canvas 엔진 (v2)
 * -------------------------------------------------------------
 * - 원본 PNG는 픽셀 그대로 텍스처로 쓰고, 방의 깊이(뒤쪽 벽 모서리는 멀고,
 *   화면 앞쪽 바닥은 가까움)를 가진 WebGL 메시 위에 입혀 그립니다.
 *   태블릿을 기울이거나 손가락으로 끌면 방이 깊이에 따라 다르게 움직여
 *   실제로 방이 돌아가는 것처럼 보입니다. (WebGL이 없으면 평면으로 표시)
 * - 깊이감 레이어(천장·벽 모서리·바닥 원근·가구 접지 그림자)는 원본 위에 얹는
 *   별도 레이어입니다.
 * - 선택 전에는 어떤 장난감도 따로 강조하지 않습니다.
 * - 장난감을 터치하면 통통 튀며 화려한 폭죽과 효과음이 나온 뒤 원래 모습으로
 *   돌아옵니다. 효과음은 파일 없이 Web Audio로 합성합니다.
 * - 터치 판정은 '화면에 지금 보이는 그대로'를 원본 이미지 좌표로 역변환해서
 *   계산하므로, 방이 움직이는 중이거나 화면 크기가 달라도 정확히 맞습니다.
 */
(function (global) {
  'use strict';

  var PALETTE = ['#ff7f8f', '#ffc84a', '#7fd6a3', '#73b6f5', '#c3a0f4', '#ff9fd0', '#ffe27a', '#ffa86b'];
  var BURST_SETS = [
    ['#ff6f86', '#ffd34f', '#fff6d8'],
    ['#6fbaff', '#c49cff', '#ffffff'],
    ['#78e0a3', '#ffe27a', '#fffbe6'],
    ['#ff9fd0', '#ffae66', '#fff3c4']
  ];

  var DEFAULTS = {
    imageSrc: 'assets/room.png',
    hotspots: null,
    fit: 'contain',            // 'contain' | 'cover'
    background: '#f1dfc0',
    depth: true,               // 깊이감 음영 레이어
    ambient: true,             // 빛 일렁임·먼지
    tilt: true,                // 기울이기·끌기로 방 회전
    tiltStrength: 1,           // 회전 세기(0.5 약하게 ~ 1.5 강하게)
    intro: true,
    sound: true,               // 효과음
    soundButton: true,         // 오른쪽 위 소리 켜기/끄기 버튼
    volume: 0.8,
    respondent: 'unknown',
    maxSelections: Infinity,
    tapTolerance: 22,
    maxDpr: 2,
    debug: false,
    onSelect: null,
    onReady: null
  };

  /* ---------- 유틸 ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(t) { return t >= 1 ? 1 : t <= 0 ? 0 : t * t * (3 - 2 * t); }
  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }
  function uid() { return 'xxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function lsGet(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, v); } catch (e) { /* 무시 */ } }

  function shapePath(s) {
    var p = new Path2D();
    if (s.rect) p.rect(s.rect[0], s.rect[1], s.rect[2], s.rect[3]);
    else if (s.ellipse) p.ellipse(s.ellipse[0], s.ellipse[1], s.ellipse[2], s.ellipse[3], 0, 0, Math.PI * 2);
    else if (s.poly) {
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

  /* ================================================================
   * 방의 깊이 모델 (원본 그림의 원근에 맞춤)
   *  - 두 벽이 만나는 모서리(x≈885)가 가장 멀다(1)
   *  - 벽은 화면 양옆으로 갈수록 가까워진다
   *  - 바닥은 벽과 만나는 선에서 화면 아래로 갈수록 가까워진다(0)
   *  - 천장은 벽 위쪽 몰딩선에서 화면 위로 갈수록 가까워진다
   * 반환값 w = (깊이 - 기준깊이) × 가장자리 고정 계수
   *  → 기준보다 먼 곳과 가까운 곳이 반대로 움직여 '회전' 느낌이 나고,
   *    그림의 테두리는 제자리에 고정되어 빈틈이 보이지 않습니다.
   * ================================================================ */
  function makeWeight(W, H) {
    var CX = 885;
    function wallZ(x) {
      return x <= CX ? 0.26 + 0.74 * Math.pow(x / CX, 1.35)
                     : 0.26 + 0.74 * Math.pow((W - x) / (W - CX), 1.35);
    }
    function baseY(x) { return x <= CX ? 398 + 14 * (x / CX) : 412 + 88 * ((x - CX) / (W - CX)); }
    function ceilY(x) {
      return x <= CX ? Math.max(0, 75 * (x - 300) / (CX - 300)) : Math.max(0, 75 * (1180 - x) / (1180 - CX));
    }
    function depth(x, y) {
      x = clamp(x, 0, W); y = clamp(y, 0, H);
      var wz = wallZ(x), b = baseY(x);
      if (y > b) return wz * Math.pow(1 - (y - b) / (H - b), 1.15);
      var c = ceilY(x);
      if (y < c) return wz * (0.72 + 0.28 * (y / c));
      return wz;
    }
    return depth;
  }

  /* 방 전체 3D 회전: 원본 좌표 p와 깊이 z로 3D 점을 만들고, 방 가운데를 축으로
   * 돌린 뒤 원근 투영합니다. 회전 전과 후의 투영 차이만 더하므로 정지 상태에서는
   * 원본 그림과 픽셀 단위로 똑같습니다. o(오버스캔)는 회전해도 빈 가장자리가
   * 보이지 않도록 살짝 확대하는 비율입니다. */
  var ROOM3D = { cx: 768, cy: 520, D: 950, zp: 470, F: 1700 };
  function rot3d(x, y, z01, R) {
    var X = x - ROOM3D.cx, Y = y - ROOM3D.cy, z = z01 * ROOM3D.D, Z = z - ROOM3D.zp;
    var x1 = X * R.cy + Z * R.sy, z1 = -X * R.sy + Z * R.cy;
    var y2 = Y * R.cp - z1 * R.sp, z2 = Y * R.sp + z1 * R.cp;
    var f1 = ROOM3D.F / (ROOM3D.F + z2 + ROOM3D.zp), f0 = ROOM3D.F / (ROOM3D.F + z);
    var Xd = X + (x1 * f1 - X * f0), Yd = Y + (y2 * f1 - Y * f0);
    return { x: Xd * R.o - X, y: Yd * R.o - Y, Xd: Xd, Yd: Yd };
  }

  /* ================================================================
   * WebGL 메시 렌더러
   * ================================================================ */
  function GLRoom(canvas, tex, W, H, weight, bg) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: false }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) { this.ok = false; return; }
    this.ok = true; this.gl = gl; this.W = W; this.H = H;

    var vs = 'attribute vec2 a_uv; attribute float a_z;' +
      'uniform vec2 u_size; uniform vec4 u_rot; uniform vec4 u_room; uniform vec2 u_c; uniform float u_o;' +
      'uniform vec2 u_off; uniform float u_k; uniform vec2 u_css;' +
      'varying vec2 v_uv;' +
      'void main(){ vec2 q = a_uv*u_size; float X = q.x-u_c.x; float Y = q.y-u_c.y;' +
      ' float z = a_z*u_room.x; float Z = z-u_room.y;' +
      ' float x1 = X*u_rot.x + Z*u_rot.y; float z1 = -X*u_rot.y + Z*u_rot.x;' +
      ' float y2 = Y*u_rot.z - z1*u_rot.w; float z2 = Y*u_rot.w + z1*u_rot.z;' +
      ' float f1 = u_room.z/(u_room.z+z2+u_room.y); float f0 = u_room.z/(u_room.z+z);' +
      ' vec2 d = vec2(X + x1*f1 - X*f0, Y + y2*f1 - Y*f0);' +
      ' vec2 p = u_c + d*u_o; vec2 s = u_off + u_k*p;' +
      ' vec2 c = s/u_css*2.0-1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); v_uv = a_uv; }';
    var fs = 'precision mediump float; uniform sampler2D u_tex; varying vec2 v_uv;' +
      'void main(){ gl_FragColor = texture2D(u_tex, v_uv); }';
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    this.pr = pr;

    // 메시(48×32칸)
    var NX = 48, NY = 32, uv = [], w = [], idx = [];
    for (var j = 0; j <= NY; j++) {
      for (var i = 0; i <= NX; i++) {
        var u = i / NX, v = j / NY;
        uv.push(u, v);
        w.push(weight(u * W, v * H));
      }
    }
    for (var jj = 0; jj < NY; jj++) {
      for (var ii = 0; ii < NX; ii++) {
        var a = jj * (NX + 1) + ii, b = a + 1, c = a + NX + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    this.count = idx.length;
    function buf(data, loc, size) {
      var bo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      var l = gl.getAttribLocation(pr, loc);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
    }
    buf(uv, 'a_uv', 2);
    buf(w, 'a_z', 1);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.u = {};
    var self = this;
    ['u_size', 'u_rot', 'u_room', 'u_c', 'u_o', 'u_off', 'u_k', 'u_css', 'u_tex'].forEach(function (n) { self.u[n] = gl.getUniformLocation(pr, n); });
    gl.uniform1i(this.u.u_tex, 0);
    gl.uniform2f(this.u.u_size, W, H);
    gl.uniform4f(this.u.u_room, ROOM3D.D, ROOM3D.zp, ROOM3D.F, 0);
    gl.uniform2f(this.u.u_c, ROOM3D.cx, ROOM3D.cy);
    var m = /^#?(..)(..)(..)$/.exec(bg) || [0, 'f1', 'df', 'c0'];
    this.bg = [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
  }
  GLRoom.prototype.draw = function (cssW, cssH, offX, offY, k, R) {
    var gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.u_css, cssW, cssH);
    gl.uniform2f(this.u.u_off, offX, offY);
    gl.uniform1f(this.u.u_k, k);
    gl.uniform4f(this.u.u_rot, R.cy, R.sy, R.cp, R.sp);
    gl.uniform1f(this.u.u_o, R.o);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  };

  /* ================================================================
   * 효과음 (Web Audio 합성 — 별도 소리 파일 없음)
   * ================================================================ */
  function Sfx(volume) {
    this.enabled = true;
    this.volume = volume;
    this.ctx = null;
  }
  Sfx.prototype.unlock = function () {
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS 무음 스위치에서도 재생
      } catch (e) { /* 무시 */ }
      var c = this.ctx = new AC();
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.ratio.value = 4;
      this.master = c.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.comp); this.comp.connect(c.destination);
      var len = c.sampleRate | 0, nb = c.createBuffer(1, len, c.sampleRate), d = nb.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
    }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e2) { /* 무시 */ } }
  };
  Sfx.prototype._out = function (pan) {
    var c = this.ctx;
    if (c.createStereoPanner && pan) {
      var p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.master); return p;
    }
    return this.master;
  };
  Sfx.prototype._noise = function (t, dur, type, freq, q, gain, pan) {
    var c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this._out(pan));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  };
  Sfx.prototype._tone = function (t, type, f0, f1, dur, gain, pan) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._out(pan));
    o.start(t); o.stop(t + dur + 0.02);
  };
  // 장난감이 통 튀는 소리 + 폭죽(펑, 타닥타닥, 반짝)
  Sfx.prototype.firework = function (pan, secondaryDelays) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    var self = this, t = this.ctx.currentTime + 0.01, i;
    // 통!
    this._tone(t, 'sine', 380, 980, 0.14, 0.5, pan);
    this._tone(t + 0.01, 'triangle', 760, 1500, 0.08, 0.12, pan);
    // 펑
    this._tone(t + 0.03, 'sine', 160, 46, 0.42, 0.55, pan);
    this._noise(t + 0.03, 0.32, 'lowpass', 1100, 0.8, 0.42, pan);
    this._noise(t + 0.03, 0.12, 'bandpass', 2600, 1.2, 0.18, pan);
    // 작은 펑들(보조 폭죽과 같은 박자)
    (secondaryDelays || []).forEach(function (d, k) {
      var tt = t + d / 1000, pp = clamp(pan + rand(-0.35, 0.35), -1, 1);
      self._tone(tt, 'sine', 210 + k * 20, 70, 0.26, 0.26, pp);
      self._noise(tt, 0.2, 'lowpass', 1500, 0.7, 0.22, pp);
    });
    // 타닥타닥
    for (i = 0; i < 46; i++) {
      var ct = t + 0.12 + Math.pow(Math.random(), 1.6) * 1.25;
      this._noise(ct, rand(0.012, 0.03), 'highpass', rand(2800, 6000), 0.7, rand(0.05, 0.16), clamp(pan + rand(-0.6, 0.6), -1, 1));
    }
    // 반짝반짝(오음계)
    var notes = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
    for (i = 0; i < 6; i++) {
      var nt = t + 0.08 + i * rand(0.07, 0.11);
      this._tone(nt, 'triangle', pick(notes), 0, 0.5, 0.075, clamp(pan + rand(-0.5, 0.5), -1, 1));
    }
  };
  // 위에서 0을 넘기면 주파수 램프가 안 되므로 보정
  var _tone = Sfx.prototype._tone;
  Sfx.prototype._tone = function (t, type, f0, f1, dur, gain, pan) { return _tone.call(this, t, type, f0, f1 || f0, dur, gain, pan); };

  /* ================================================================ */
  function RoomSurvey(container, options) {
    this.el = container;
    this.o = {};
    var k;
    for (k in DEFAULTS) this.o[k] = DEFAULTS[k];
    for (k in (options || {})) this.o[k] = options[k];
    if (!this.o.hotspots) throw new Error('hotspots 데이터가 필요합니다.');

    this.W = this.o.hotspots.imageWidth;
    this.H = this.o.hotspots.imageHeight;
    this.weight = makeWeight(this.W, this.H);   // 깊이(0=가까움 ~ 1=가장 멂)
    this.maxYaw = 10 * Math.PI / 180 * this.o.tiltStrength;    // 좌우 최대 회전
    this.maxPitch = 5.5 * Math.PI / 180 * this.o.tiltStrength;   // 위아래 최대 회전
    this.R = { cy: 1, sy: 0, cp: 1, sp: 0, o: 1 };
    this.sessionId = uid();
    this.selections = [];
    this.locked = false;
    this.pointers = {};
    this.dragger = null;
    this.pops = [];
    this.shows = [];
    this.motes = [];
    this.reduced = !!(global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    // 회전 상태(스프링)
    this.tl = { x: 0, y: 0, vx: 0, vy: 0, ox: 0, oy: 0 };  // ox/oy = 실제 적용값
    this.hover = { x: 0, y: 0 };
    this.gyro = { x: 0, y: 0, bx: null, by: null, last: 0, on: false };
    this.dragT = null;
    this.debugTap = null;
    this._raf = 0; this._t0 = 0; this._last = 0;

    this.sfx = new Sfx(this.o.volume);
    var saved = lsGet('siseon-room-sound');
    this.sfx.enabled = this.o.sound && saved !== 'off';

    this._buildDom();
    this._prepareToys();
    this._load();
  }

  RoomSurvey.prototype._buildDom = function () {
    var el = this.el, self = this;
    el.classList.add('rs-root');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.background = this.o.background;

    this.glCanvas = document.createElement('canvas');
    this.glCanvas.className = 'rs-canvas rs-gl';
    this.glCanvas.setAttribute('aria-hidden', 'true');
    el.appendChild(this.glCanvas);

    var c = this.canvas = document.createElement('canvas');
    c.className = 'rs-canvas rs-fx';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', '두 토끼가 있는 장난감 방 그림. 장난감을 눌러 고를 수 있어요. 기울이거나 끌면 방이 움직여요.');
    el.appendChild(c);
    this.ctx = c.getContext('2d');

    var sr = this.sr = document.createElement('div');
    sr.className = 'rs-sr';
    sr.setAttribute('role', 'group');
    sr.setAttribute('aria-label', '방 안의 장난감');
    el.appendChild(sr);

    if (this.o.soundButton) {
      var b = this.soundBtn = document.createElement('button');
      b.type = 'button';
      b.className = 'rs-sound';
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/>' +
        '<path class="rs-on" d="M15.5 8.6a4.6 4.6 0 0 1 0 6.8M18 6.2a8 8 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
        '<path class="rs-off" d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
      b.addEventListener('click', function () {
        self.sfx.unlock();
        self.setSound(!self.sfx.enabled);
      });
      el.appendChild(b);
      this._syncSoundBtn();
    }

    if (this.o.debug) {
      var d = this.debugEl = document.createElement('div');
      d.className = 'rs-debug';
      d.textContent = 'debug: 그림을 누르면 원본 좌표가 표시됩니다';
      el.appendChild(d);
    }
    this.hitCtx = makeCanvas(1, 1).getContext('2d');
  };

  RoomSurvey.prototype._syncSoundBtn = function () {
    if (!this.soundBtn) return;
    this.soundBtn.classList.toggle('is-off', !this.sfx.enabled);
    this.soundBtn.setAttribute('aria-pressed', this.sfx.enabled ? 'true' : 'false');
    this.soundBtn.setAttribute('aria-label', this.sfx.enabled ? '효과음 끄기' : '효과음 켜기');
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
        self.sfx.unlock();
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
      self._bake();
      self._initGL();
      self._initMotes();
      self._initGlow();
      self._bindEvents();
      self._resize();
      self._t0 = now();
      self._kick();
      self.el.classList.add('rs-ready');
      if (typeof self.o.onReady === 'function') self.o.onReady(self);
    };
    img.onerror = function () {
      self.el.classList.add('rs-error');
      self.el.setAttribute('data-error', '그림 파일을 불러오지 못했어요: ' + self.o.imageSrc);
    };
    img.src = this.o.imageSrc;
  };

  RoomSurvey.prototype._initGL = function () {
    var self = this;
    this.gl = null;
    if (this.o.tilt) {
      try { this.gl = new GLRoom(this.glCanvas, this.base, this.W, this.H, this.weight, this.o.background); }
      catch (e) { console.warn('[시선사이] WebGL 사용 불가, 평면으로 표시합니다.', e); this.gl = null; }
      if (this.gl && !this.gl.ok) this.gl = null;
    }
    this.flat = !this.gl;   // WebGL이 없으면 기울기 없이 평면 표시
    if (!this._glListen) {
      this._glListen = true;
      this.glCanvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.gl = null; self.flat = true; });
      this.glCanvas.addEventListener('webglcontextrestored', function () { self._initGL(); self._resize(); });
    }
  };

  /* ---------- 원본 + 깊이감 레이어 합성 ---------- */
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
    var gr = g.createLinearGradient(0, 0, 0, 120);
    gr.addColorStop(0, 'rgba(120,88,62,0.22)');
    gr.addColorStop(1, 'rgba(120,88,62,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, 120);

    gr = g.createLinearGradient(800, 0, 980, 0);
    gr.addColorStop(0, 'rgba(70,72,110,0)');
    gr.addColorStop(0.5, 'rgba(70,72,110,0.13)');
    gr.addColorStop(1, 'rgba(70,72,110,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(800, 60); g.lineTo(980, 60); g.lineTo(960, 420); g.lineTo(820, 420); g.closePath(); g.fill();

    g.save();
    g.strokeStyle = 'rgba(90,62,40,0.16)';
    g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = 'rgba(90,62,40,0.22)'; g.shadowBlur = 18;
    g.beginPath();
    g.moveTo(370, 404); g.lineTo(590, 414); g.lineTo(905, 416);
    g.lineTo(1080, 448); g.lineTo(1360, 492); g.lineTo(1536, 512);
    g.stroke();
    g.restore();

    gr = g.createLinearGradient(0, 400, 0, H);
    gr.addColorStop(0, 'rgba(92,62,40,0.14)');
    gr.addColorStop(0.28, 'rgba(92,62,40,0)');
    gr.addColorStop(0.78, 'rgba(92,62,40,0)');
    gr.addColorStop(1, 'rgba(92,62,40,0.13)');
    g.fillStyle = gr; g.fillRect(0, 400, W, H - 400);

    var self = this;
    [
      [215, 414, 46, 9], [740, 418, 175, 13], [1150, 470, 230, 16],
      [1372, 504, 22, 7], [1505, 528, 22, 7],
      [400, 700, 26, 8], [332, 598, 18, 6], [466, 592, 18, 6],
      [230, 668, 230, 52]
    ].forEach(function (e, i) { self._softEllipse(g, e[0], e[1], e[2], e[3], i === 8 ? 0.09 : 0.16); });

    gr = g.createRadialGradient(W * 0.52, H * 0.52, H * 0.42, W * 0.52, H * 0.52, H * 1.05);
    gr.addColorStop(0, 'rgba(70,46,30,0)');
    gr.addColorStop(1, 'rgba(70,46,30,0.2)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

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

  RoomSurvey.prototype._sprite = function (part) {
    if (part.sprite) return part.sprite;
    var pad = 8, b = part.box;
    var bx = Math.floor(b.x - pad), by = Math.floor(b.y - pad);
    var bw = Math.ceil(b.w + pad * 2), bh = Math.ceil(b.h + pad * 2);
    var c = makeCanvas(bw, bh), g = c.getContext('2d');
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

  // 색별 빛망울 스프라이트(폭죽 머리용)
  RoomSurvey.prototype._initGlow = function () {
    var self = this;
    this.glow = {};
    PALETTE.concat(['#ffffff', '#fff6d8', '#fffbe6', '#fff3c4', '#ff6f86', '#ffd34f', '#6fbaff', '#c49cff', '#78e0a3', '#ffae66'])
      .forEach(function (col) {
        if (self.glow[col]) return;
        var c = makeCanvas(64, 64), g = c.getContext('2d');
        var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.22, col);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        self.glow[col] = c;
      });
  };

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
    [this.canvas, this.glCanvas].forEach(function (c) {
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    });
    var sx = cssW / this.W, sy = cssH / this.H;
    this.s = this.o.fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
    this.ox = (cssW - this.W * this.s) / 2;
    this.oy = (cssH - this.H * this.s) / 2;
    this._draw(this._last || now());
  };

  RoomSurvey.prototype._cam = function (t) {
    var fx = 890, fy = 330, z = 1;
    if (this.o.intro && !this.reduced) {
      var p = clamp((t - this._t0) / 2400, 0, 1);
      z = 1 + 0.05 * (1 - easeInOutCubic(p));
    }
    return { fx: fx, fy: fy, z: z };
  };

  // 깊이에 따른 이동량(원본 좌표 → 움직인 좌표의 차이)
  RoomSurvey.prototype.disp = function (x, y) {
    if (this.flat) return { x: 0, y: 0 };
    var r = rot3d(x, y, this.weight(x, y), this.R);
    return { x: r.x, y: r.y };
  };

  // 화면(CSS px) → 원본 이미지 좌표 : 지금 화면에 보이는 그대로 역변환
  RoomSurvey.prototype.toImage = function (cx, cy) {
    var cam = this._cam(now());
    var qx = cam.fx + ((cx - this.ox) / this.s - cam.fx) / cam.z;
    var qy = cam.fy + ((cy - this.oy) / this.s - cam.fy) / cam.z;
    var px = qx, py = qy;
    for (var i = 0; i < 40; i++) {       // p + D(p) = q 를 반복법으로 풂
      var d = this.disp(px, py);
      var nx = qx - d.x, ny = qy - d.y;
      px += (nx - px) * 0.7; py += (ny - py) * 0.7;
      if (Math.abs(nx - px) + Math.abs(ny - py) < 0.01) break;
    }
    return { x: px, y: py };
  };

  // 원본 이미지 좌표 → 화면(CSS px)
  RoomSurvey.prototype.toScreen = function (x, y) {
    var cam = this._cam(now()), d = this.disp(x, y);
    return {
      x: this.ox + this.s * (cam.fx + cam.z * (x + d.x - cam.fx)),
      y: this.oy + this.s * (cam.fy + cam.z * (y + d.y - cam.fy))
    };
  };

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
  RoomSurvey.prototype._screenAngle = function () {
    var a = (global.screen && screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle : (typeof global.orientation === 'number' ? global.orientation : 0);
    return ((a % 360) + 360) % 360;
  };

  RoomSurvey.prototype._askMotion = function () {
    // iOS 13+ 는 사용자 터치 안에서 기울기 센서 권한을 받아야 함
    if (this._askedMotion) return;
    this._askedMotion = true;
    var DOE = global.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try { DOE.requestPermission().catch(function () { /* 거절 시 끌기로만 회전 */ }); } catch (e) { /* 무시 */ }
    }
  };

  RoomSurvey.prototype._bindEvents = function () {
    var self = this, c = this.canvas;

    this._onDown = function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      self.sfx.unlock();
      var p = self._local(e);
      // 누른 순간 화면에 보이던 위치 그대로 원본 좌표를 기억
      self.pointers[e.pointerId] = { x: p.x, y: p.y, t: now(), ip: self.toImage(p.x, p.y), drag: false, moved: 0 };
      if (self.dragger === null) {
        self.dragger = e.pointerId;
        self._dragBase = { x: self.tl.x, y: self.tl.y };
      }
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      if (e.pointerType !== 'mouse') e.preventDefault();
      self._kick();
    };
    this._onMove = function (e) {
      var p = self._local(e), d = self.pointers[e.pointerId];
      if (!d) {
        if (e.pointerType === 'mouse' && self.o.tilt) {
          self.hover.x = clamp(p.x / self.cssW * 2 - 1, -1, 1) * 0.45;
          self.hover.y = clamp(p.y / self.cssH * 2 - 1, -1, 1) * 0.45;
          self._kick();
        }
        return;
      }
      var dx = p.x - d.x, dy = p.y - d.y;
      d.moved = Math.max(d.moved, Math.hypot(dx, dy));
      if (e.pointerId === self.dragger && self.o.tilt && d.moved > 12) {
        d.drag = true;
        // 손가락을 따라 방이 돌아감
        var span = Math.min(self.cssW, self.cssH) * 0.45;
        self.dragT = {
          x: clamp(self._dragBase.x + dx / span, -1, 1),
          y: clamp(self._dragBase.y + dy / span, -1, 1)
        };
        self._kick();
      }
    };
    this._onUp = function (e) {
      var d = self.pointers[e.pointerId];
      delete self.pointers[e.pointerId];
      if (e.pointerId === self.dragger) { self.dragger = null; self.dragT = null; }
      if (!d) return;
      self._askMotion();
      if (d.drag || d.moved > 24 || now() - d.t > 1200) return;
      self._tap(d.ip, e.pointerType || 'touch');
    };
    this._onCancel = function (e) {
      delete self.pointers[e.pointerId];
      if (e.pointerId === self.dragger) { self.dragger = null; self.dragT = null; }
    };
    this._onLeave = function (e) {
      if (e.pointerType === 'mouse') { self.hover.x = 0; self.hover.y = 0; }
    };
    this._onTilt = function (e) {
      if (!self.o.tilt || e.beta == null || e.gamma == null) return;
      var a = self._screenAngle(), b = e.beta, g = e.gamma, x, y;
      if (a === 90) { x = b; y = -g; }
      else if (a === 270) { x = -b; y = g; }
      else if (a === 180) { x = -g; y = -b; }
      else { x = g; y = b; }
      var G = self.gyro, t = now();
      if (G.bx === null) { G.bx = x; G.by = y; }
      var dt = G.last ? Math.min(0.2, (t - G.last) / 1000) : 0;
      G.last = t;
      // 기준 자세는 천천히 따라옴 → 어떤 자세로 들어도 '움직인 만큼' 반응
      var k = 1 - Math.exp(-dt / 3.5);
      G.bx += (x - G.bx) * k; G.by += (y - G.by) * k;
      // 기기를 기울인 반대쪽으로 먼 벽이 밀려나 창 너머 방을 들여다보는 느낌
      G.x = clamp(-(x - G.bx) / 14, -1, 1);
      G.y = clamp(-(y - G.by) / 14, -1, 1);
      G.on = true;
      self._kick();
    };

    c.addEventListener('pointerdown', this._onDown, { passive: false });
    c.addEventListener('pointermove', this._onMove);
    c.addEventListener('pointerup', this._onUp);
    c.addEventListener('pointercancel', this._onCancel);
    c.addEventListener('pointerleave', this._onLeave);
    c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    c.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    c.addEventListener('touchend', function () { self._askMotion(); self.sfx.unlock(); });
    c.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    global.addEventListener('deviceorientation', this._onTilt);

    this._onResize = function () { self._resize(); };
    if (global.ResizeObserver) { this._ro = new ResizeObserver(this._onResize); this._ro.observe(this.el); }
    global.addEventListener('resize', this._onResize);
    global.addEventListener('orientationchange', function () {
      self.gyro.bx = null;   // 화면 방향이 바뀌면 기준 자세 다시 잡기
      setTimeout(self._onResize, 250);
    });
    if (global.visualViewport) visualViewport.addEventListener('resize', this._onResize);

    this._onVis = function () {
      if (document.hidden) { cancelAnimationFrame(self._raf); self._raf = 0; }
      else { self._last = now(); self._kick(); }
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
    if (t - toy.lastTap < 350) return;
    toy.lastTap = t;

    this._pop(toy, t);
    var mb = toy.main.box;
    var bx = mb.x + mb.w / 2, by = mb.y + mb.h * 0.42;
    var delays = this._show(bx, by, Math.max(mb.w, mb.h), t);
    this.sfx.firework(clamp((bx / this.W) * 2 - 1, -0.8, 0.8) * 0.7, delays);

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
    if (navigator.vibrate) { try { navigator.vibrate([16, 40, 12]); } catch (e3) { /* 무시 */ } }
    this._kick();
  };

  /* ---------- 장난감 통통 ---------- */
  RoomSurvey.prototype._pop = function (toy, t) {
    var self = this;
    this.pops = this.pops.filter(function (p) { return p.toy !== toy; });
    toy.parts.forEach(function (part, i) {
      self.pops.push({ toy: toy, part: part, t0: t + i * 40, dur: self.reduced ? 380 : 900, sp: self._sprite(part) });
    });
  };

  function popCurve(p, reduced) {
    var amp = reduced ? 0.06 : 0.18;
    if (p < 0.18) {
      var e = easeOutCubic(p / 0.18);
      return { sx: 1 + amp * 0.62 * e, sy: 1 + amp * e, r: 0 };
    }
    var q = (p - 0.18) / 0.82, damp = Math.pow(1 - q, 2.2);
    var w = (Math.cos(q * Math.PI * 3) + 1) / 2;
    return {
      sx: 1 + amp * 0.62 * damp * (0.4 + 0.6 * (1 - w)),
      sy: 1 + amp * damp * w,
      r: reduced ? 0 : 0.05 * damp * Math.sin(q * Math.PI * 4)
    };
  }

  /* ---------- 폭죽 쇼 ----------
   * 섬광 → 큰 폭발(64갈래, 일부는 다시 갈라짐) → 둘레에서 작은 폭죽 4발
   * → 반짝이 가루와 색종이가 흩날리며 사라짐 (약 2초)
   */
  RoomSurvey.prototype._show = function (x, y, size, t) {
    var R = clamp(size * 1.35, 150, 260), k = this.reduced ? 0.35 : 1;
    var sh = { x: x, y: y, R: R, t0: t, ps: [], rings: [], flashes: [], pending: [] };
    sh.flashes.push({ t0: t, dur: 260, r: R * 0.75 });
    sh.rings.push({ t0: t, dur: 560, R: R * 0.95, c: '#fff6d8', w: 7 });
    sh.rings.push({ t0: t + 90, dur: 720, R: R * 1.35, c: pick(PALETTE), w: 4 });
    this._spark(sh, x, y, R, Math.round(64 * k), PALETTE, 1, true);
    this._stars(sh, x, y, R, Math.round(14 * k));
    var delays = [];
    if (!this.reduced) {
      var base = rand(0, Math.PI * 2);
      for (var i = 0; i < 4; i++) {
        var a = base + i * Math.PI / 2 + rand(-0.4, 0.4), dist = R * rand(0.5, 0.8), d = 150 + i * 140;
        sh.pending.push({ at: t + d, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist * 0.75 - R * 0.15, set: BURST_SETS[i % 4] });
        delays.push(d);
      }
      sh.pending.push({ at: t + 240, glitter: true });
      sh.pending.push({ at: t + 60, confetti: true });
    }
    this.shows.push(sh);
    return delays;
  };

  RoomSurvey.prototype._spark = function (sh, x, y, R, n, colors, scale, canSplit) {
    var off = rand(0, Math.PI * 2);
    for (var i = 0; i < n; i++) {
      var a = off + (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
      var sp = R * 3.4 * rand(0.55, 1.05);
      sh.ps.push({
        k: 'spark', x: x, y: y, px: x, py: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: rand(0.85, 1.3) * (scale < 1 ? 0.8 : 1),
        c: pick(colors), w: rand(6, 9.5) * scale,
        split: canSplit && Math.random() < 0.22 ? rand(0.32, 0.48) : 0
      });
    }
  };
  RoomSurvey.prototype._stars = function (sh, x, y, R, n) {
    for (var j = 0; j < n; j++) {
      var b = rand(0, Math.PI * 2), s2 = R * 2.2 * rand(0.35, 0.9);
      sh.ps.push({
        k: 'star', x: x, y: y, px: x, py: y,
        vx: Math.cos(b) * s2, vy: Math.sin(b) * s2 - 60,
        life: 0, max: rand(1.0, 1.5), c: pick(PALETTE),
        w: rand(11, 18), rot: rand(0, 6), vr: rand(-6, 6)
      });
    }
  };
  RoomSurvey.prototype._glitter = function (sh) {
    for (var i = 0; i < 48; i++) {
      var a = rand(0, Math.PI * 2), r = sh.R * Math.sqrt(Math.random()) * 1.15;
      sh.ps.push({
        k: 'glitter', x: sh.x + Math.cos(a) * r, y: sh.y + Math.sin(a) * r * 0.8, px: 0, py: 0,
        vx: rand(-14, 14), vy: rand(10, 45), life: 0, max: rand(1.0, 1.7),
        c: pick(['#ffffff', '#fff3c4', '#ffe27a', '#ffd0e6']), w: rand(2.4, 4.6), ph: rand(0, 6)
      });
    }
  };
  RoomSurvey.prototype._confetti = function (sh) {
    for (var i = 0; i < 28; i++) {
      var a = rand(-Math.PI * 0.95, -Math.PI * 0.05), sp = sh.R * rand(2.0, 3.6);
      sh.ps.push({
        k: 'confetti', x: sh.x, y: sh.y, px: 0, py: 0,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(1.5, 2.1),
        c: pick(PALETTE), w: rand(8, 13), h: rand(4, 7), rot: rand(0, 6), vr: rand(-9, 9), ph: rand(0, 6)
      });
    }
  };

  RoomSurvey.prototype._update = function (dt, t) {
    var self = this;
    // 폭죽
    this.shows = this.shows.filter(function (sh) {
      sh.pending = sh.pending.filter(function (p) {
        if (t < p.at) return true;
        if (p.glitter) self._glitter(sh);
        else if (p.confetti) self._confetti(sh);
        else {
          self._spark(sh, p.x, p.y, sh.R * 0.5, 26, p.set, 0.7, false);
          sh.flashes.push({ t0: t, dur: 200, r: sh.R * 0.35, x: p.x, y: p.y });
          sh.rings.push({ t0: t, dur: 460, R: sh.R * 0.5, c: p.set[2], w: 4, x: p.x, y: p.y });
        }
        return false;
      });
      var born = [];
      sh.ps = sh.ps.filter(function (p) {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.px = p.x; p.py = p.y;
        if (p.k === 'spark' || p.k === 'star') {
          var drag = Math.exp(-2.3 * dt);
          p.vx *= drag; p.vy = p.vy * drag + 110 * dt;
          if (p.k === 'star') p.rot += p.vr * dt;
          if (p.split && p.life > p.split) {
            for (var i = 0; i < 4; i++) {
              var a = i * Math.PI / 2 + rand(-0.3, 0.3) + Math.PI / 4, s = rand(110, 170);
              born.push({ k: 'spark', x: p.x, y: p.y, px: p.x, py: p.y, vx: Math.cos(a) * s + p.vx * 0.3, vy: Math.sin(a) * s + p.vy * 0.3,
                life: 0, max: rand(0.4, 0.6), c: pick(PALETTE), w: p.w * 0.6, split: 0 });
            }
            return false;
          }
        } else if (p.k === 'glitter') {
          p.vx *= Math.exp(-1.5 * dt);
        } else if (p.k === 'confetti') {
          var dr = Math.exp(-2.6 * dt);
          p.vx = p.vx * dr + Math.sin(p.life * 6 + p.ph) * 40 * dt;
          p.vy = p.vy * dr + 260 * dt;
          p.rot += p.vr * dt;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        return true;
      });
      if (born.length) sh.ps = sh.ps.concat(born);
      sh.rings = sh.rings.filter(function (r) { return t - r.t0 < r.dur; });
      sh.flashes = sh.flashes.filter(function (f) { return t - f.t0 < f.dur; });
      return sh.ps.length || sh.pending.length || sh.rings.length || sh.flashes.length;
    });
    this.pops = this.pops.filter(function (p) { return t - p.t0 < p.dur; });

    var W = this.W, H = this.H;
    this.motes.forEach(function (m) {
      m.x += m.vx * dt * m.sp; m.y += m.vy * dt * m.sp;
      if (m.y < -10) { m.y = H * 0.9; m.x = rand(0, W); }
      if (m.x > W + 10) m.x = -10;
      if (m.x < -10) m.x = W + 10;
    });

    // 회전 스프링: 손가락/기울기를 부드럽게, 약간 출렁이며 따라감
    var T = this.tl, tx, ty;
    if (this.dragT) { tx = this.dragT.x; ty = this.dragT.y; }
    else {
      tx = clamp((this.gyro.on ? this.gyro.x : 0) + this.hover.x, -1, 1);
      ty = clamp((this.gyro.on ? this.gyro.y : 0) + this.hover.y, -1, 1);
    }
    if (!this.o.tilt || this.flat) { tx = 0; ty = 0; }
    var K = this.dragT ? 180 : 55, C = 2 * Math.sqrt(K) * (this.dragT ? 0.9 : 0.62);
    var steps = Math.max(1, Math.ceil(dt / 0.008)), h = dt / steps;
    for (var s = 0; s < steps; s++) {
      T.vx += (K * (tx - T.x) - C * T.vx) * h;
      T.vy += (K * (ty - T.y) - C * T.vy) * h;
      T.x += T.vx * h; T.y += T.vy * h;
    }
    // 인트로: 방을 한 번 둘러보듯 살짝 돌아갔다 제자리로
    var ix = 0, iy = 0;
    if (this.o.intro && !this.reduced && this.o.tilt) {
      var q = clamp((t - this._t0) / 2600, 0, 1);
      ix = 0.55 * Math.sin(q * Math.PI) * (1 - q * 0.3);
      iy = -0.18 * Math.sin(q * Math.PI);
    }
    T.ox = clamp(T.x + ix, -1.2, 1.2);
    T.oy = clamp(T.y + iy, -1.2, 1.2);
    this._updateRot();
  };

  // 회전각과, 가장자리 빈틈을 가리는 최소 확대율 계산
  RoomSurvey.prototype._updateRot = function () {
    var yaw = this.tl.ox * this.maxYaw, pitch = -this.tl.oy * this.maxPitch;
    var R = { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), o: 1 };
    if (!this.flat && (yaw || pitch)) {
      var W = this.W, H = this.H, cx = ROOM3D.cx, cyy = ROOM3D.cy, need = 1, N = 16, i, f, q;
      for (i = 0; i <= N; i++) {
        f = i / N;
        q = rot3d(0, f * H, this.weight(0, f * H), R);       if (q.Xd < 0) need = Math.max(need, cx / -q.Xd); else need = 2;
        q = rot3d(W, f * H, this.weight(W, f * H), R);       if (q.Xd > 0) need = Math.max(need, (W - cx) / q.Xd); else need = 2;
        q = rot3d(f * W, 0, this.weight(f * W, 0), R);       if (q.Yd < 0) need = Math.max(need, cyy / -q.Yd); else need = 2;
        q = rot3d(f * W, H, this.weight(f * W, H), R);       if (q.Yd > 0) need = Math.max(need, (H - cyy) / q.Yd); else need = 2;
      }
      R.o = clamp(need * 1.004, 1, 1.6);
    }
    this.R = R;
  };

  RoomSurvey.prototype._busy = function (t) {
    var T = this.tl;
    return this.o.ambient || this.shows.length || this.pops.length ||
      (this.o.intro && t - this._t0 < 2800) || this.dragT ||
      Math.abs(T.vx) + Math.abs(T.vy) > 0.002 || Math.abs(T.x) + Math.abs(T.y) > 0.002 || this.gyro.on;
  };

  RoomSurvey.prototype._kick = function () {
    if (this._raf || document.hidden || !this.base) return;
    var self = this;
    this._last = now();
    this._raf = requestAnimationFrame(function step() {
      var t = now();
      var dt = Math.min(0.05, (t - (self._last || t)) / 1000);
      self._last = t;
      self._update(dt, t);
      self._draw(t);
      self._raf = self._busy(t) && !document.hidden ? requestAnimationFrame(step) : 0;
    });
  };

  /* ---------- 그리기 ---------- */
  RoomSurvey.prototype._draw = function (t) {
    if (!this.base) return;
    var g = this.ctx, dpr = this.dpr, s = this.s, cam = this._cam(t);
    var fade = (this.o.intro && !this.reduced) ? clamp((t - this._t0) / 600, 0, 1) : 1;
    var offX = this.ox + s * cam.fx * (1 - cam.z), offY = this.oy + s * cam.fy * (1 - cam.z), k = s * cam.z;

    // 1) 방(원본 PNG + 깊이감) — WebGL 메시
    if (this.gl) {
      this.glCanvas.style.opacity = fade;
      this.gl.draw(this.cssW, this.cssH, offX, offY, k, this.R);
    }

    // 2) 효과 레이어
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(dpr * k, 0, 0, dpr * k, dpr * offX, dpr * offY);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    if (!this.gl) {   // WebGL이 없을 때 평면 표시
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = this.o.background;
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      g.restore();
      g.globalAlpha = fade;
      g.drawImage(this.base, 0, 0, this.W, this.H);
      g.globalAlpha = 1;
    }
    if (this.o.ambient && !this.reduced) this._drawAmbient(g, t);
    this._drawPops(g, t);
    this._drawShows(g, t);
    if (this.o.debug) this._drawDebug(g, t);
  };

  RoomSurvey.prototype._drawAmbient = function (g, t) {
    var sec = t / 1000, self = this;
    g.save();
    g.globalCompositeOperation = 'screen';
    var a = 0.09 + 0.03 * Math.sin(sec * 0.55);
    var pts = [[215, 95], [410, 70], [900, 640], [560, 720]].map(function (p) {
      var d = self.disp(p[0], p[1]); return [p[0] + d.x, p[1] + d.y];
    });
    var d0 = this.disp(310, 160), d1 = this.disp(640, 600);
    var gr = g.createLinearGradient(310 + d0.x, 160 + d0.y, 640 + d1.x, 600 + d1.y);
    gr.addColorStop(0, 'rgba(255,238,190,' + a + ')');
    gr.addColorStop(0.55, 'rgba(255,238,190,' + (a * 0.35) + ')');
    gr.addColorStop(1, 'rgba(255,238,190,0)');
    g.fillStyle = gr;
    g.beginPath();
    pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
    g.closePath(); g.fill();

    g.globalCompositeOperation = 'source-over';
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i], dm = this.disp(m.x, m.y);
      var al = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(sec * 1.3 * m.sp + m.ph));
      g.fillStyle = 'rgba(255,250,232,' + al.toFixed(3) + ')';
      g.beginPath();
      g.arc(m.x + dm.x * (0.6 + m.d * 0.6), m.y + dm.y * (0.6 + m.d * 0.6), m.r * (0.7 + m.d * 0.5), 0, Math.PI * 2);
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
      var ax = b.x + b.w / 2, ay = b.y + b.h * 0.92, d = this.disp(ax, b.y + b.h / 2);
      g.save();
      g.translate(ax + d.x, ay + d.y);
      g.rotate(c.r);
      g.scale(c.sx, c.sy);
      g.translate(-ax, -ay);
      g.drawImage(sp.c, sp.x, sp.y, sp.w, sp.h);
      var glow = (1 - q) * 0.28;
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

  RoomSurvey.prototype._drawShows = function (g, t) {
    for (var s = 0; s < this.shows.length; s++) {
      var sh = this.shows[s], d = this.disp(sh.x, sh.y);
      g.save();
      g.translate(d.x, d.y);   // 폭죽도 방과 함께 움직임
      g.lineCap = 'round';

      var i, q;
      for (i = 0; i < sh.flashes.length; i++) {
        var f = sh.flashes[i]; q = (t - f.t0) / f.dur;
        var fx = f.x == null ? sh.x : f.x, fy = f.y == null ? sh.y : f.y;
        var fr = f.r * (0.6 + 0.6 * easeOutCubic(q));
        var gr = g.createRadialGradient(fx, fy, 0, fx, fy, fr);
        gr.addColorStop(0, 'rgba(255,255,245,' + (0.85 * (1 - q)) + ')');
        gr.addColorStop(0.4, 'rgba(255,236,170,' + (0.45 * (1 - q)) + ')');
        gr.addColorStop(1, 'rgba(255,220,150,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(fx, fy, fr, 0, Math.PI * 2); g.fill();
      }
      for (i = 0; i < sh.rings.length; i++) {
        var r = sh.rings[i]; q = (t - r.t0) / r.dur;
        if (q < 0) continue;
        g.globalAlpha = (1 - q) * 0.8;
        g.strokeStyle = r.c;
        g.lineWidth = r.w * (1 - q) + 1;
        g.beginPath(); g.arc(r.x == null ? sh.x : r.x, r.y == null ? sh.y : r.y, r.R * easeOutCubic(q), 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1;

      for (i = 0; i < sh.ps.length; i++) {
        var p = sh.ps[i], fl = 1 - p.life / p.max;
        var al = fl < 0.3 ? fl / 0.3 : 1;
        if (p.k === 'spark') {
          var tx = p.x - (p.x - p.px) * 3.6, ty = p.y - (p.y - p.py) * 3.6;
          var wd = p.w * (0.45 + 0.55 * fl);
          g.globalAlpha = al;
          g.strokeStyle = p.c; g.lineWidth = wd;
          g.beginPath(); g.moveTo(tx, ty); g.lineTo(p.x, p.y); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = wd * 0.4;
          g.beginPath(); g.moveTo((tx + p.x) / 2, (ty + p.y) / 2); g.lineTo(p.x, p.y); g.stroke();
          var gs = wd * 3.2, gl = this.glow[p.c];
          if (gl) {
            g.globalAlpha = al * 0.7;
            g.globalCompositeOperation = 'lighter';
            g.drawImage(gl, p.x - gs, p.y - gs, gs * 2, gs * 2);
            g.globalCompositeOperation = 'source-over';
          }
        } else if (p.k === 'star') {
          g.globalAlpha = al * (0.75 + 0.25 * Math.sin(p.life * 30));
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          starPath(g, p.w * (0.6 + 0.4 * fl));
          g.fillStyle = p.c; g.fill();
          g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
          g.restore();
        } else if (p.k === 'glitter') {
          var tw = 0.5 + 0.5 * Math.sin(p.life * 22 + p.ph);
          g.globalAlpha = al * (0.35 + 0.65 * tw);
          var gg = this.glow[p.c] || this.glow['#ffffff'], gz = p.w * (1.4 + tw * 1.6);
          g.globalCompositeOperation = 'lighter';
          g.drawImage(gg, p.x - gz, p.y - gz, gz * 2, gz * 2);
          g.globalCompositeOperation = 'source-over';
          if (tw > 0.8) {   // 반짝 십자
            g.strokeStyle = '#fff'; g.lineWidth = 1.4;
            g.beginPath(); g.moveTo(p.x - gz, p.y); g.lineTo(p.x + gz, p.y); g.moveTo(p.x, p.y - gz); g.lineTo(p.x, p.y + gz); g.stroke();
          }
        } else if (p.k === 'confetti') {
          g.globalAlpha = al;
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          g.scale(1, Math.cos(p.life * 9 + p.ph));   // 팔랑팔랑
          g.fillStyle = p.c;
          g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          g.restore();
        }
      }
      g.restore();
    }
  };

  RoomSurvey.prototype._drawDebug = function (g, t) {
    var self = this;
    g.save();
    g.lineWidth = 2 / (this.s || 1);
    this.toys.forEach(function (toy, i) {
      var b = toy.main.box, d = self.disp(b.x + b.w / 2, b.y + b.h / 2);
      g.save(); g.translate(d.x, d.y);
      g.strokeStyle = PALETTE[i % PALETTE.length];
      g.fillStyle = 'rgba(255,255,255,0.12)';
      toy.parts.forEach(function (p) { g.fill(p.path); g.stroke(p.path); });
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.font = '600 13px system-ui, sans-serif';
      g.fillText(toy.label, b.x, b.y - 3);
      g.restore();
    });
    if (this.debugTap && t - this.debugTap.t < 2500) {
      var dd = this.disp(this.debugTap.x, this.debugTap.y);
      g.fillStyle = '#e0245e';
      g.beginPath(); g.arc(this.debugTap.x + dd.x, this.debugTap.y + dd.y, 6, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  };

  /* ---------- 공개 API ---------- */
  RoomSurvey.prototype.getSelections = function () { return this.selections.slice(); };
  RoomSurvey.prototype.reset = function () { this.selections = []; this.locked = false; };
  RoomSurvey.prototype.setLocked = function (v) { this.locked = !!v; };
  RoomSurvey.prototype.setRespondent = function (r) { this.o.respondent = r; };
  RoomSurvey.prototype.setSound = function (on) {
    this.sfx.enabled = !!on;
    lsSet('siseon-room-sound', on ? 'on' : 'off');
    this._syncSoundBtn();
  };
  RoomSurvey.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    global.removeEventListener('resize', this._onResize);
    global.removeEventListener('deviceorientation', this._onTilt);
    document.removeEventListener('visibilitychange', this._onVis);
    if (this.sfx.ctx) { try { this.sfx.ctx.close(); } catch (e) { /* 무시 */ } }
    this.el.innerHTML = '';
  };

  global.SiseonRoom = {
    create: function (el, opts) { return new RoomSurvey(el, opts); },
    RoomSurvey: RoomSurvey
  };
})(window);
