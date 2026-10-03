/* Room "bench" for the electronics subject: a workbench with an anti-static mat, a pegboard of tools, a wall of parts drawers,
 * an oscilloscope, a bench supply, a soldering station, wire spools, a multimeter and a desk lamp.
 * Palette: charcoal and warm grey, a muted green mat, orange and cream accents. Nothing is shiny and nothing floats.
 *
 * Static solids are merged into one vertex-coloured mesh (see Batcher), so the whole room is about 50 draw calls. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;

var FLOOR = -13, ZB = -19;
var CH = '#34373b', CHD = '#1f2124', CHL = '#4a4d52', STEEL = '#a4a9ae', STEELD = '#6e747a', CREAM = '#d9cfb2', CREAMD = '#b9ae8f';
var ORANGE = '#dd7a2c', ORANGED = '#a8501a', WOOD = '#b98c58', WOODD = '#8c6540';

/* ---------- small helpers ---------- */

function canv(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(T, c, o) {
  o = o || {}; var t = new T.CanvasTexture(c);
  if (o.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.minFilter = o.flat ? T.LinearFilter : T.LinearMipmapLinearFilter; t.generateMipmaps = !o.flat; t.anisotropy = 4; return t;
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}


/* a box whose texture coordinates follow its real size (ts units per tile), for tiling materials */
function tboxGeo(T, w, h, d, ts) {
  var g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, f, k, su, sv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (f = 0; f < 6; f++) { su = dims[f][0] / ts; sv = dims[f][1] / ts; for (k = 0; k < 4; k++) { var i = f * 4 + k; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); } }
  return g;
}

/* Merges many solids into one mesh with vertex colours. Parts are placed relative to ctx.base, so a prop is modelled in its own frame. */
function Batcher(T, ctx) {
  var parts = [], cache = {}, q = new T.Quaternion(), eu = new T.Euler(), pv = new T.Vector3(), sv = new T.Vector3(), lm = new T.Matrix4();
  function unit(key, make) { return cache[key] || (cache[key] = make()); }
  var self = {
    addM: function (geo, color, m, a) { parts.push({ g: geo, c: color.isColor ? color : new T.Color(color), m: new T.Matrix4().multiplyMatrices(ctx.base, m), a: a == null ? 1 : a }); },
    add: function (geo, color, x, y, z, rx, ry, rz, sx, sy, sz, a) {
      eu.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(eu); pv.set(x || 0, y || 0, z || 0); sv.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
      lm.compose(pv, q, sv); self.addM(geo, color, lm, a);
    },
    box: function (w, h, d, color, x, y, z, ry, rx, rz) { self.add(unit('b', function () { return new T.BoxGeometry(1, 1, 1); }), color, x, y, z, rx, ry, rz, w, h, d); },
    /* cylinder along y (rx = PI/2 turns it to z, rz = PI/2 to x) */
    cyl: function (rt, rb, h, color, x, y, z, rx, ry, rz, seg) {
      var r0 = Math.max(rt, rb, 0.0001), s = seg || 20, k = 'c' + (rt / r0).toFixed(3) + '_' + (rb / r0).toFixed(3) + '_' + s;
      self.add(unit(k, function () { return new T.CylinderGeometry(rt / r0, rb / r0, 1, s, 1, false); }), color, x, y, z, rx, ry, rz, r0, h, r0);
    },
    ball: function (rx_, ry_, rz_, color, x, y, z) { self.add(unit('s', function () { return new T.SphereGeometry(1, 16, 12); }), color, x, y, z, 0, 0, 0, rx_, ry_, rz_); },
    /* a round rod between two points */
    rod: function (a, b, r, color, seg) {
      var d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), mq = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
      var m = new T.Matrix4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), mq, new T.Vector3(r, len, r));
      self.addM(unit('r' + (seg || 10), function () { return new T.CylinderGeometry(1, 1, 1, seg || 10, 1, false); }), color, m);
    },
    geo: function (geo, color, x, y, z, rx, ry, rz) { self.add(geo, color, x, y, z, rx, ry, rz); },
    /* a flat quad that shows a sub-rectangle of a texture atlas */
    quad: function (w, h, u0, v0, u1, v1, x, y, z) {
      var g = new T.PlaneGeometry(1, 1), uv = g.attributes.uv; uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
      self.add(g, '#ffffff', x, y, z, 0, 0, 0, w, h, 1);
    },
    build: function (material, alpha) {
      if (!parts.length) return null;
      var gs = [], total = 0, i, j, o = 0, p, g, n;
      for (i = 0; i < parts.length; i++) { p = parts[i]; g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(p.m); gs.push(g); total += g.attributes.position.count; }
      var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), cs = alpha ? 4 : 3, col = new Float32Array(total * cs);
      for (i = 0; i < gs.length; i++) {
        g = gs[i]; n = g.attributes.position.count; p = parts[i];
        pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2);
        for (j = 0; j < n; j++) { col[(o + j) * cs] = p.c.r; col[(o + j) * cs + 1] = p.c.g; col[(o + j) * cs + 2] = p.c.b; if (alpha) col[(o + j) * cs + 3] = p.a; }
        o += n; g.dispose();
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('color', new T.BufferAttribute(col, cs));
      return new T.Mesh(geo, material);
    }
  };
  return self;
}

/* ---------- canvas artwork ---------- */

function pegTile(T) {
  return tex(T, canv(128, 128, function (c, w, h) {
    c.fillStyle = '#44474c'; c.fillRect(0, 0, w, h);
    var r = K.mulberry(9), i, j;
    for (i = 0; i < 160; i++) { c.fillStyle = 'rgba(255,255,255,' + (r() * 0.03) + ')'; c.fillRect(r() * w, r() * h, 2, 2); }
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
      var x = 16 + i * 32, y = 16 + j * 32;
      c.fillStyle = 'rgba(255,255,255,0.10)'; c.beginPath(); c.arc(x + 1, y + 1.2, 5.6, 0, 7); c.fill();
      c.fillStyle = '#0c0d0e'; c.beginPath(); c.arc(x, y, 5.2, 0, 7); c.fill();
    }
  }), { repeat: [15, 8] });
}

function matTile(T) {
  return tex(T, canv(256, 256, function (c, w, h) {
    c.fillStyle = '#5f9a74'; c.fillRect(0, 0, w, h);
    var r = K.mulberry(21), i;
    for (i = 0; i < 700; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    /* faint printed grid, one cell per unit (about 7 cm), a bolder line every fourth cell */
    for (i = 0; i <= 4; i++) {
      c.strokeStyle = i % 4 === 0 ? 'rgba(235,245,225,0.22)' : 'rgba(235,245,225,0.10)'; c.lineWidth = i % 4 === 0 ? 2 : 1.2;
      c.beginPath(); c.moveTo(i * 64 + 0.5, 0); c.lineTo(i * 64 + 0.5, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64 + 0.5); c.lineTo(w, i * 64 + 0.5); c.stroke();
    }
  }), { repeat: [16, 6.5] });
}

function woodTile(T) {
  return tex(T, canv(256, 256, function (c, w, h) {
    c.fillStyle = '#c4986a'; c.fillRect(0, 0, w, h);
    var r = K.mulberry(33), i;
    for (i = 0; i < 70; i++) { var y = r() * h, a = 0.05 + r() * 0.1; c.strokeStyle = r() < 0.6 ? 'rgba(110,70,30,' + a + ')' : 'rgba(255,235,200,' + a * 0.5 + ')'; c.lineWidth = 0.7 + r() * 1.6; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 6, w * 0.7, y + (r() - 0.5) * 6, w, y + (r() - 0.5) * 4); c.stroke(); }
  }), { repeat: [1, 1] });
}

function floorTile(T) {
  return tex(T, canv(128, 128, function (c, w, h) {
    c.fillStyle = '#58534c'; c.fillRect(0, 0, w, h);
    var r = K.mulberry(41), i;
    for (i = 0; i < 200; i++) { c.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'; c.fillRect(r() * w, r() * h, 2, 2); }
    c.strokeStyle = 'rgba(20,18,16,0.5)'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
  }), { repeat: [27, 16] });
}

function wallTex(T) {
  return tex(T, canv(8, 512, function (c, w, h) {
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#36342f'); g.addColorStop(0.3, '#5a5648'); g.addColorStop(0.55, '#77715f'); g.addColorStop(0.8, '#4d493f'); g.addColorStop(1, '#2d2b27');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }), { flat: true });
}

/* ---- tools on the pegboard, drawn as silhouettes with a baked drop shadow ---- */
function hg(c, x0, x1, a, b) { var g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(0.45, b); g.addColorStop(1, a); return g; }
function ink(c, fill) { c.fillStyle = fill; c.fill(); c.lineWidth = 0.035; c.lineJoin = 'round'; c.strokeStyle = 'rgba(14,14,16,0.9)'; c.stroke(); }
function poly(c, p) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); }
function steelG(c, hw) { return hg(c, -hw, hw, '#7a8188', '#d8dcdf'); }

function drawDriver(c, o) {
  var h = o.h, hw = o.hw, sw = o.sw, y0 = -0.45, y1 = y0 + h, ys = y1 + 0.26, yE = ys + o.L, hc = o.col || ['#a8501a', '#f29a4a'];
  c.beginPath(); c.rect(-sw, ys - 0.02, sw * 2, o.L - 0.3); ink(c, steelG(c, sw));
  if (o.phil) { poly(c, [[-sw, yE - 0.55], [sw, yE - 0.55], [sw * 0.3, yE], [-sw * 0.3, yE]]); ink(c, steelG(c, sw)); c.strokeStyle = 'rgba(20,20,22,0.55)'; c.lineWidth = 0.02; c.beginPath(); c.moveTo(0, yE - 0.5); c.lineTo(0, yE - 0.05); c.stroke(); }
  else { poly(c, [[-sw, yE - 0.4], [-sw * 1.6, yE - 0.17], [-sw * 1.6, yE], [sw * 1.6, yE], [sw * 1.6, yE - 0.17], [sw, yE - 0.4]]); ink(c, steelG(c, sw * 1.6)); }
  c.beginPath(); c.rect(-hw * 0.55, y1 - 0.02, hw * 1.1, 0.3); ink(c, steelG(c, hw));
  c.beginPath(); c.moveTo(-hw * 0.6, y0); c.quadraticCurveTo(0, y0 - 0.14, hw * 0.6, y0);
  c.bezierCurveTo(hw * 1.05, y0 + h * 0.1, hw * 1.05, y0 + h * 0.6, hw * 0.82, y1 - 0.08); c.lineTo(hw * 0.72, y1); c.lineTo(-hw * 0.72, y1); c.lineTo(-hw * 0.82, y1 - 0.08);
  c.bezierCurveTo(-hw * 1.05, y0 + h * 0.6, -hw * 1.05, y0 + h * 0.1, -hw * 0.6, y0); c.closePath();
  ink(c, hg(c, -hw, hw, hc[0], hc[1]));
  c.save(); c.clip(); c.fillStyle = '#e9dfc4'; c.fillRect(-hw * 2, y0 + h * 0.7, hw * 4, h * 0.08);
  c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.025; for (var i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * hw * 0.3, y0 + h * 0.3); c.lineTo(i * hw * 0.3, y0 + h * 0.66); c.stroke(); }
  c.restore();
  c.fillStyle = '#0c0d0e'; c.beginPath(); c.arc(0, 0, 0.075, 0, 7); c.fill();
}

/* handles hang from a peg between them; jaws below the pivot. jaw: 'needle' | 'cutter' | 'flat' */
function drawPliers(c, o) {
  var hc = o.col, k, s;
  for (k = 0; k < 2; k++) {
    s = k ? 1 : -1;
    poly(c, [[s * 0.74, -0.4], [s * 0.3, -0.4], [s * 0.07, 2.15], [s * 0.3, 2.15]]); ink(c, hg(c, -0.7, 0.7, hc[0], hc[1]));
    poly(c, [[s * 0.3, 1.5], [s * 0.12, 1.5], [s * 0.05, 2.5], [s * 0.3, 2.5]]); ink(c, steelG(c, 0.3));
  }
  poly(c, [[-0.32, 2.05], [0.32, 2.05], [0.27, 2.62], [-0.27, 2.62]]); ink(c, steelG(c, 0.3));
  if (o.jaw === 'needle') { poly(c, [[-0.25, 2.6], [0.25, 2.6], [0.065, 4.5], [-0.065, 4.5]]); ink(c, steelG(c, 0.25)); c.strokeStyle = 'rgba(20,20,22,0.7)'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(0, 2.9); c.lineTo(0, 4.5); c.stroke();
    c.strokeStyle = 'rgba(20,20,22,0.35)'; c.lineWidth = 0.02; for (k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-0.07, 3.2 + k * 0.15); c.lineTo(0.07, 3.2 + k * 0.15); c.stroke(); } }
  else if (o.jaw === 'flat') { poly(c, [[-0.27, 2.6], [0.27, 2.6], [0.22, 4.0], [-0.22, 4.0]]); ink(c, steelG(c, 0.27)); c.strokeStyle = 'rgba(20,20,22,0.7)'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(0, 2.9); c.lineTo(0, 4.0); c.stroke(); }
  else { poly(c, [[-0.34, 2.6], [0.34, 2.6], [0.38, 3.12], [0.2, 3.7], [0.05, 3.62], [-0.05, 3.62], [-0.2, 3.7], [-0.38, 3.12]]); ink(c, steelG(c, 0.38));
    c.strokeStyle = 'rgba(20,20,22,0.8)'; c.lineWidth = 0.028; c.beginPath(); c.moveTo(0, 2.95); c.lineTo(0.05, 3.62); c.stroke(); c.beginPath(); c.moveTo(-0.19, 3.64); c.lineTo(0.19, 3.64); c.stroke(); }
  c.fillStyle = '#2a2c2f'; c.beginPath(); c.arc(0, 2.35, 0.1, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(-0.025, 2.325, 0.035, 0, 7); c.fill();
}

function drawTweezers(c, o) {
  var n = 24, i, t, g, w, L = [], R = [], Li = [], Ri = [];
  for (i = 0; i <= n; i++) {
    t = i / n; g = 0.03 + 0.27 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.9) * (1 - 0.15 * t); w = 0.15 - 0.105 * t;
    L.push([-g - w / 2, 0.45 + t * (o.len - 0.45)]); Li.push([-g + w / 2, 0.45 + t * (o.len - 0.45)]);
  }
  var pts = L.concat(Li.slice().reverse()); poly(c, pts); ink(c, steelG(c, 0.4));
  var pr = []; for (i = 0; i <= n; i++) pr.push([-L[i][0], L[i][1]]); var pri = []; for (i = 0; i <= n; i++) pri.push([-Li[i][0], Li[i][1]]);
  poly(c, pr.concat(pri.slice().reverse())); ink(c, steelG(c, 0.4));
  poly(c, [[-0.2, -0.45], [0.2, -0.45], [0.17, 0.5], [-0.17, 0.5]]); ink(c, steelG(c, 0.25));
  if (o.sleeve) { for (var k = 0; k < 2; k++) { var s = k ? 1 : -1; poly(c, [[s * 0.03, 0.55], [s * 0.1, 0.55], [s * 0.3, 1.9], [s * 0.2, 1.9]]); ink(c, hg(c, -0.3, 0.3, ORANGED, '#f29a4a')); } }
  c.fillStyle = '#0c0d0e'; c.beginPath(); c.arc(0, 0, 0.065, 0, 7); c.fill();
}

function drawRuler(c) {
  poly(c, [[-0.3, -0.35], [0.3, -0.35], [0.3, 5.0], [-0.3, 5.0]]); ink(c, hg(c, -0.3, 0.3, '#9ca2a8', '#dfe2e4'));
  c.strokeStyle = 'rgba(15,15,17,0.8)'; c.lineWidth = 0.02;
  for (var i = 0; i <= 30; i++) { var y = 0.35 + i * 0.15, l = i % 5 === 0 ? 0.2 : 0.1; c.beginPath(); c.moveTo(0.3, y); c.lineTo(0.3 - l, y); c.stroke(); }
  c.fillStyle = '#0c0d0e'; c.beginPath(); c.arc(0, 0, 0.075, 0, 7); c.fill();
}

function drawHammer(c) {
  poly(c, [[-1.3, -0.12], [3.0, -0.12], [3.12, -0.06], [3.12, 0.06], [3.0, 0.12], [-1.3, 0.12]]); ink(c, '#d6a566');
  c.fillStyle = 'rgba(0,0,0,0.14)'; c.fillRect(0.6, -0.12, 2.4, 0.04);
  /* head across the handle's end: flat striking face above, rounded peen below */
  c.beginPath(); c.moveTo(-1.95, -0.7); c.lineTo(-1.2, -0.7); c.lineTo(-1.2, -0.5); c.lineTo(-1.3, -0.3); c.lineTo(-1.3, 0.3); c.quadraticCurveTo(-1.3, 0.62, -1.575, 0.92); c.quadraticCurveTo(-1.85, 0.62, -1.85, 0.3); c.lineTo(-1.85, -0.3); c.lineTo(-1.95, -0.5); c.closePath();
  ink(c, hg(c, -1.95, -1.2, '#6f767d', '#c9cdd1')); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-1.92, -0.69, 0.7, 0.05);
}

function drawWrench(c) {
  poly(c, [[-0.17, -0.3], [0.17, -0.3], [0.23, 2.8], [-0.23, 2.8]]); ink(c, hg(c, -0.25, 0.25, '#7a8188', '#d8dcdf'));
  /* head: a long fixed jaw on the left, a shorter movable jaw on the right, the slot between them, and the worm screw */
  c.beginPath(); c.moveTo(-0.52, 2.7); c.lineTo(0.52, 2.7); c.lineTo(0.56, 3.55); c.lineTo(0.42, 3.95); c.lineTo(0.14, 3.95); c.lineTo(0.12, 3.6); c.lineTo(-0.1, 3.6); c.lineTo(-0.1, 4.45); c.lineTo(-0.34, 4.55); c.lineTo(-0.56, 4.3); c.closePath();
  ink(c, hg(c, -0.56, 0.56, '#7a8188', '#d8dcdf'));
  c.beginPath(); c.arc(0.3, 3.15, 0.17, 0, 7); ink(c, '#9aa0a6'); c.strokeStyle = 'rgba(20,20,22,0.6)'; c.lineWidth = 0.02; for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(0.14, 3.15 + k * 0.06); c.lineTo(0.46, 3.15 + k * 0.06); c.stroke(); }
  c.fillStyle = '#0c0d0e'; c.beginPath(); c.arc(0, 0, 0.075, 0, 7); c.fill();
}

function drawHexKeys(c) {
  var L = [2.2, 1.8, 1.4], i;
  c.strokeStyle = '#8a9097'; c.lineWidth = 0.06; c.beginPath(); c.arc(0, 0.05, 0.28, 0, 7); c.stroke();
  for (i = 0; i < 3; i++) {
    var x = (i - 1) * 0.28, path = function () { c.beginPath(); c.moveTo(x, 0.3); c.lineTo(x, 0.3 + L[i]); c.arcTo(x, 0.3 + L[i] + 0.2, x + 0.2, 0.3 + L[i] + 0.2, 0.12); c.lineTo(x + 0.75, 0.3 + L[i] + 0.2); };
    c.lineCap = 'round'; c.strokeStyle = 'rgba(14,14,16,0.9)'; c.lineWidth = 0.15; path(); c.stroke(); c.strokeStyle = i === 1 ? '#e08a40' : '#bfc4c8'; c.lineWidth = 0.09; path(); c.stroke();
  }
}

function drawTape(c) {
  c.beginPath(); c.arc(0, 0, 0.98, 0, 7); c.arc(0, 0, 0.5, 0, 7, true); ink(c, '#d9cfb2');
  c.beginPath(); c.arc(0, 0, 0.88, 0, 7); c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 0.03; c.stroke();
  c.beginPath(); c.arc(0, 0, 0.62, 0, 7); c.stroke(); c.fillStyle = '#c4572a'; c.beginPath(); c.arc(0.5, 0.78, 0.08, 0, 7); c.fill();
}

function drawCoil(c) {
  var i; c.lineCap = 'round';
  for (i = 0; i < 6; i++) { var r = 0.95 - i * 0.1; c.strokeStyle = 'rgba(15,10,8,0.85)'; c.lineWidth = 0.14; c.beginPath(); c.ellipse(0, 0, r, r * 0.98, 0, 0, 7); c.stroke(); c.strokeStyle = i % 2 ? '#d9462d' : '#e8643a'; c.lineWidth = 0.09; c.beginPath(); c.ellipse(0, 0, r, r * 0.98, 0, 0, 7); c.stroke(); }
  c.fillStyle = '#e9dfc4'; c.fillRect(-0.12, 0.35, 0.24, 0.75); c.strokeStyle = 'rgba(14,14,16,0.8)'; c.lineWidth = 0.025; c.strokeRect(-0.12, 0.35, 0.24, 0.75);
}

/* board: W x H units, U pixels per unit. tools: list of { u, v, s, draw, o } with the peg hole at (u, v) from the bottom-left corner */
function toolsTex(T, W, H, list) {
  var U = 80, cw = Math.round(W * U), ch = Math.round(H * U);
  var layer = canv(cw, ch, function (c) {
    list.forEach(function (t) { c.save(); c.translate(t.u * U, (H - t.v) * U); c.scale(U * (t.s || 1), U * (t.s || 1)); t.draw(c, t.o || {}); c.restore(); });
  });
  var t2 = tex(T, canv(cw, ch, function (c) { c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 9; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.drawImage(layer, 0, 0); }));
  return t2;
}

/* ---- parts drawers: one atlas, 3 x 3 drawer fronts, each with its label card ---- */
var DRAWERS = [
  ['RESISTORS', '100 \u03A9 \u2013 1 M\u03A9', '#dd7a2c'], ['CAPACITORS', '10 pF \u2013 1000 \u00B5F', '#c9a13a'], ['LEDs', '3 mm \u00B7 5 mm', '#c4452f'],
  ['ICs', '555 \u00B7 74HC \u00B7 op-amp', '#6f8f4e'], ['DIODES', '1N4148 \u00B7 1N4007', '#dd7a2c'], ['TRANSISTORS', 'BC547 \u00B7 2N2222', '#c9a13a'],
  ['SWITCHES', 'toggle \u00B7 push', '#c4452f'], ['FUSES', '5 \u00D7 20 mm', '#6f8f4e'], ['SCREWS', 'M2 \u00B7 M3 \u00B7 M4', '#dd7a2c']
];
var CELL = { w: 444, h: 300, strip: 40 };
function drawerAtlas(T) {
  var W = CELL.w * 3 + CELL.strip, H = CELL.h * 3;
  return tex(T, canv(W, H, function (c) {
    c.fillStyle = '#d6cdb3'; c.fillRect(0, 0, W, H);
    DRAWERS.forEach(function (d, i) {
      var x = (i % 3) * CELL.w, y = Math.floor(i / 3) * CELL.h;
      c.fillStyle = '#d6cdb3'; c.fillRect(x, y, CELL.w, CELL.h);
      c.fillStyle = '#efe8d2'; rr(c, x + 28, y + 30, CELL.w - 56, 160, 12); c.fill(); c.lineWidth = 5; c.strokeStyle = '#2b2a28'; c.stroke();
      c.fillStyle = d[2]; c.fillRect(x + 28, y + 30, 26, 160);
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      var fs = 70; c.font = '800 ' + fs + 'px sans-serif'; while (c.measureText(d[0]).width > CELL.w - 140 && fs > 28) { fs -= 2; c.font = '800 ' + fs + 'px sans-serif'; }
      c.fillStyle = '#26241f'; c.fillText(d[0], x + CELL.w / 2 + 13, y + 106);
      c.font = '600 34px sans-serif'; c.fillStyle = '#5a5446'; c.fillText(d[1], x + CELL.w / 2 + 13, y + 160);
      c.fillStyle = '#4a4740'; rr(c, x + 140, y + 226, 164, 26, 13); c.fill(); c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, x + 146, y + 230, 152, 14, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 3; c.strokeRect(x + 2, y + 2, CELL.w - 4, CELL.h - 4);
    });
  }));
}

/* ---- resistor colour code chart: values are the standard code ---- */
var BANDS = [
  ['Black', '#16161a', '#fff', '0', '\u00D71', '\u2013'], ['Brown', '#7a4a26', '#fff', '1', '\u00D710', '\u00B11%'], ['Red', '#c4392a', '#fff', '2', '\u00D7100', '\u00B12%'],
  ['Orange', '#e07a2c', '#1a1a1a', '3', '\u00D71k', '\u2013'], ['Yellow', '#e8c63a', '#1a1a1a', '4', '\u00D710k', '\u2013'], ['Green', '#4c9a58', '#fff', '5', '\u00D7100k', '\u00B10.5%'],
  ['Blue', '#3d6fb3', '#fff', '6', '\u00D71M', '\u00B10.25%'], ['Violet', '#7b4f9d', '#fff', '7', '\u00D710M', '\u00B10.1%'], ['Grey', '#8c9096', '#1a1a1a', '8', '\u00D7100M', '\u00B10.05%'],
  ['White', '#ecebe4', '#1a1a1a', '9', '\u00D71G', '\u2013']
];
function posterFace(T) {
  var W = 640, H = 800;
  return tex(T, canv(W, H, function (c) {
    c.fillStyle = '#2a2825'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#e4dbc2'; c.fillRect(22, 22, W - 44, H - 44);
    c.fillStyle = '#26241f'; c.textAlign = 'center'; c.font = '800 42px sans-serif'; c.fillText('RESISTOR COLOUR CODE', W / 2, 82);
    c.fillStyle = ORANGE; c.fillRect(50, 98, W - 100, 6);
    c.font = '700 22px sans-serif'; c.fillStyle = '#5a5446'; c.textAlign = 'left';
    c.fillText('COLOUR', 58, 138); c.textAlign = 'center'; c.font = '700 17px sans-serif'; c.fillText('DIGIT', 322, 138); c.fillText('MULTIPLIER', 428, 138); c.fillText('TOLERANCE', 548, 138);
    BANDS.forEach(function (b, i) {
      var y = 150 + i * 50;
      c.fillStyle = b[1]; c.fillRect(46, y, 196, 44);
      c.fillStyle = b[2]; c.font = '700 30px sans-serif'; c.textAlign = 'left'; c.fillText(b[0], 60, y + 33);
      c.fillStyle = '#26241f'; c.textAlign = 'center'; c.font = '800 38px sans-serif'; c.fillText(b[3], 328, y + 35);
      c.font = '700 29px sans-serif'; c.fillText(b[4], 440, y + 33); c.fillText(b[5], 556, y + 33);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(250, y + 46, W - 300, 2);
    });
    c.fillStyle = '#26241f'; c.font = '600 22px sans-serif'; c.textAlign = 'center'; c.fillText('Gold \u00D70.1, \u00B15%      Silver \u00D70.01, \u00B110%', W / 2, 676);
    /* worked example: yellow, violet, red, gold = 47 x 100 = 4.7 kOhm, +-5% */
    c.strokeStyle = '#7d7561'; c.lineWidth = 5; c.beginPath(); c.moveTo(50, 736); c.lineTo(150, 736); c.moveTo(350, 736); c.lineTo(404, 736); c.stroke();
    c.fillStyle = '#c9a56a'; rr(c, 150, 716, 200, 40, 18); c.fill();
    [['#e8c63a', 176], ['#7b4f9d', 212], ['#c4392a', 248], ['#c9a13a', 304]].forEach(function (b) { c.fillStyle = b[0]; c.fillRect(b[1], 716, 16, 40); });
    c.fillStyle = '#26241f'; c.textAlign = 'left'; c.font = '700 32px sans-serif'; c.fillText('= 4.7 k\u03A9 \u00B15%', 416, 746);
  }));
}

/* ---- instrument faces. 100 px per unit, so a face is drawn at the size of its panel ---- */
function knobTicks(c, x, y, r) {
  c.strokeStyle = 'rgba(230,220,190,0.85)'; c.lineWidth = 2;
  for (var i = 0; i < 11; i++) { var a = (-135 + i * 27) * Math.PI / 180; c.beginPath(); c.moveTo(x + Math.sin(a) * r, y - Math.cos(a) * r); c.lineTo(x + Math.sin(a) * (r + 8), y - Math.cos(a) * (r + 8)); c.stroke(); }
}
function scopeFace(T) {
  var W = 800, H = 460, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
  var base = canv(W, H, function (b) {
    b.fillStyle = '#c2b9a0'; b.fillRect(0, 0, W, H);
    b.save(); b.translate(20, 15); b.fillStyle = '#3d3f43'; b.fillRect(0, 0, 760, 430);
    b.fillStyle = '#101112'; rr(b, 20, 25, 460, 372, 14); b.fill();
    b.fillStyle = '#e6dcc0'; b.textAlign = 'center'; b.font = '700 18px sans-serif';
    b.fillText('VOLTS/DIV', 560, 92); b.fillText('TIME/DIV', 680, 92); b.fillText('POSITION', 560, 236); b.fillText('LEVEL', 680, 236);
    b.fillText('CH 1', 540, 330); b.fillText('CH 2', 620, 330); b.fillText('EXT', 700, 330); b.textAlign = 'right'; b.fillText('POWER', 668, 56);
    b.fillStyle = ORANGE; b.fillRect(505, 22, 230, 4);
    knobTicks(b, 560, 172, 48); knobTicks(b, 680, 172, 48); knobTicks(b, 560, 278, 32); knobTicks(b, 680, 278, 32);
    b.textAlign = 'left'; b.font = '600 15px sans-serif'; b.fillStyle = 'rgba(230,220,190,0.8)'; b.fillText('2 CH  20 MHz', 505, 410);
    b.restore();
  });
  var t = new T.CanvasTexture(cv); t.minFilter = T.LinearFilter; t.generateMipmaps = false;
  function draw(time) {
    var x, i, ph = time * 2.2;
    c.drawImage(base, 0, 0); c.save(); c.translate(50, 50); c.scale(1.375, 1.375); c.beginPath(); c.rect(0, 0, 320, 256); c.clip();
    c.fillStyle = '#140d07'; c.fillRect(0, 0, 320, 256);
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,170,70,0.20)';
    for (i = 1; i < 10; i++) { c.beginPath(); c.moveTo(i * 32 + 0.5, 0); c.lineTo(i * 32 + 0.5, 256); c.stroke(); }
    for (i = 1; i < 8; i++) { c.beginPath(); c.moveTo(0, i * 32 + 0.5); c.lineTo(320, i * 32 + 0.5); c.stroke(); }
    c.strokeStyle = 'rgba(255,170,70,0.42)'; c.beginPath(); c.moveTo(160.5, 0); c.lineTo(160.5, 256); c.moveTo(0, 128.5); c.lineTo(320, 128.5); c.stroke();
    for (i = 0; i < 50; i++) { c.beginPath(); c.moveTo(i * 6.4, 125); c.lineTo(i * 6.4, 131); c.stroke(); }
    /* CH 2 is the capacitor voltage of an RC filter: smaller than CH 1 and lagging it */
    c.lineJoin = 'round'; c.shadowColor = 'rgba(255,150,40,0.9)'; c.shadowBlur = 7;
    c.strokeStyle = '#ffb347'; c.lineWidth = 2.8; c.beginPath();
    for (x = 0; x <= 320; x += 2) { var y = 128 - 70 * Math.sin(x / 320 * 6.2832 * 2.5 - ph); if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    c.strokeStyle = '#ffe6b0'; c.lineWidth = 2.4; c.beginPath();
    for (x = 0; x <= 320; x += 2) { var y2 = 128 - 42 * Math.sin(x / 320 * 6.2832 * 2.5 - ph - 0.9); if (x) c.lineTo(x, y2); else c.moveTo(x, y2); } c.stroke();
    c.shadowBlur = 0; c.font = '600 13px ui-monospace, Menlo, monospace'; c.textAlign = 'left';
    c.fillStyle = '#ffb347'; c.fillText('1 2V', 10, 246); c.fillStyle = '#ffe6b0'; c.fillText('2 1V', 70, 246); c.fillStyle = 'rgba(255,190,100,0.9)'; c.fillText('M 1ms', 250, 246);
    c.restore(); t.needsUpdate = true;
  }
  draw(0.8);
  return { tex: t, draw: draw };
}
function psuFace(T) {
  return tex(T, canv(700, 340, function (c, w, h) {
    c.fillStyle = '#3a3d42'; c.fillRect(0, 0, w, h); c.save(); c.translate(10, 10);
    c.fillStyle = '#2d3034'; c.fillRect(0, 0, 680, 320); c.fillStyle = ORANGE; c.fillRect(0, 0, 680, 7);
    [[25, 'V'], [265, 'A']].forEach(function (d, i) {
      c.fillStyle = '#0d0a07'; rr(c, d[0], 28, 220, 92, 8); c.fill(); c.strokeStyle = '#55585d'; c.lineWidth = 3; c.stroke();
      c.font = '700 56px ui-monospace, Menlo, monospace'; c.textAlign = 'right';
      c.fillStyle = 'rgba(255,150,50,0.12)'; c.fillText(i ? '8.888' : '88.88', d[0] + 172, 96);
      c.fillStyle = '#ffa73c'; c.fillText(i ? '0.250' : '12.00', d[0] + 172, 96);
      c.font = '700 30px sans-serif'; c.textAlign = 'left'; c.fillText(d[1], d[0] + 182, 96);
    });
    c.fillStyle = '#e6dcc0'; c.font = '700 21px sans-serif'; c.textAlign = 'center';
    c.fillText('VOLTAGE', 135, 150); c.fillText('CURRENT', 375, 150); c.fillText('CV', 545, 90); c.fillText('CC', 605, 90); c.fillText('OUT', 665, 90);
    c.fillText('OUTPUT', 605, 188); c.fillText('+', 540, 212); c.fillText('\u2212', 605, 212); c.fillText('GND', 670, 212);
    knobTicks(c, 135, 215, 52); knobTicks(c, 375, 215, 52);
    c.strokeStyle = 'rgba(230,220,190,0.35)'; c.lineWidth = 2; c.strokeRect(500, 36, 170, 270);
    c.restore();
  }));
}
function stationFace(T) {
  return tex(T, canv(640, 260, function (c, w, h) {
    c.fillStyle = '#3a3d42'; c.fillRect(0, 0, w, h); c.save(); c.translate(20, 20);
    c.fillStyle = '#2d3034'; c.fillRect(0, 0, 600, 220);
    c.fillStyle = '#0d0a07'; rr(c, 30, 30, 290, 160, 10); c.fill(); c.strokeStyle = '#55585d'; c.lineWidth = 3; c.stroke();
    c.font = '700 96px ui-monospace, Menlo, monospace'; c.textAlign = 'right'; c.fillStyle = 'rgba(255,150,50,0.12)'; c.fillText('888', 232, 135);
    c.fillStyle = '#ffa73c'; c.fillText('350', 232, 135); c.font = '700 44px sans-serif'; c.textAlign = 'left'; c.fillText('\u00B0C', 240, 135);
    c.font = '600 22px sans-serif'; c.fillText('SET 350', 48, 176);
    c.fillStyle = '#e6dcc0'; c.font = '700 20px sans-serif'; c.textAlign = 'center'; c.fillText('TEMP', 470, 60); c.fillText('POWER', 540, 190);
    knobTicks(c, 470, 110, 52);
    c.restore();
  }));
}
function meterFace(T) {
  return tex(T, canv(384, 624, function (c, w, h) {
    c.fillStyle = ORANGED; c.fillRect(0, 0, w, h); c.save(); c.translate(40, 48); c.scale(1.013, 1.015);
    c.fillStyle = '#26282b'; c.fillRect(0, 0, 300, 520);
    c.fillStyle = '#c9d0ae'; rr(c, 24, 24, 252, 130, 8); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#1b1d16'; c.font = '700 86px ui-monospace, Menlo, monospace'; c.textAlign = 'right'; c.fillText('4.99', 220, 118);
    c.font = '700 34px sans-serif'; c.textAlign = 'left'; c.fillText('V', 228, 118); c.font = '600 20px sans-serif'; c.fillText('DC', 36, 56);
    var cx = 150, cy = 330, labels = ['OFF', 'V\u223C', 'V\u2393', '\u03A9', 'A'], i;
    c.fillStyle = '#e6dcc0'; c.font = '700 24px sans-serif'; c.textAlign = 'center';
    for (i = 0; i < 5; i++) { var a = (-120 + i * 60) * Math.PI / 180; c.fillText(labels[i], cx + Math.sin(a) * 118, cy - Math.cos(a) * 118 + 8); }
    c.fillStyle = ORANGE; c.fillRect(24, 168, 252, 4);
    c.fillStyle = '#e6dcc0'; c.font = '700 17px sans-serif'; c.fillText('V\u03A9', 70, 492); c.fillText('COM', 150, 492); c.fillText('A', 230, 492);
    c.restore();
  }));
}
function clockFace(T) {
  return tex(T, canv(256, 256, function (c) {
    c.fillStyle = '#d9cfb2'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#26241f'; c.lineCap = 'round';
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.2832; c.lineWidth = i % 3 === 0 ? 9 : 5; c.beginPath(); c.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); c.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); c.stroke(); }
    var hh = (10 + 10 / 60) / 12 * 6.2832; c.lineWidth = 11; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 58 * Math.sin(hh), 128 - 58 * Math.cos(hh)); c.stroke();
    var mm = 10 / 60 * 6.2832; c.lineWidth = 7; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 92 * Math.sin(mm), 128 - 92 * Math.cos(mm)); c.stroke();
    c.fillStyle = '#26241f'; c.beginPath(); c.arc(128, 128, 9, 0, 7); c.fill();
  }));
}
function railTile(T) {
  return tex(T, canv(736, 144, function (c, w, h) {
    c.fillStyle = '#464a4f'; c.fillRect(0, 0, w, h); c.fillStyle = ORANGE; c.fillRect(0, 0, w, 14);
    c.fillStyle = '#d8cfb3'; rr(c, 260, 34, 216, 84, 14); c.fill(); c.strokeStyle = '#2b2a28'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#26241f'; rr(c, 322, 56, 14, 38, 4); c.fill(); rr(c, 400, 56, 14, 38, 4); c.fill(); c.beginPath(); c.arc(368, 98, 7, 0, 7); c.fill();
  }), { repeat: [13, 1] });
}

/* ---------- the room ---------- */

ENV.bench = function (T) {
  var g = new T.Group(), ctx = { base: new T.Matrix4() }, TONE = new T.Color(0.74, 0.74, 0.74);
  var S = Batcher(T, ctx), E = Batcher(T, ctx), H = Batcher(T, ctx), WB = Batcher(T, ctx), AT = Batcher(T, ctx), rnd = K.mulberry(12), i, j;
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* light: same budget as the lab */
  g.add(new T.HemisphereLight(0xfff0dc, 0x4a4238, 0.5));
  var key = new T.DirectionalLight(0xfff0dc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xece6dc, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe2bf, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* The stage's depth buffer is 16 bit with near = 0.1, so surfaces closer than about 0.3 units to each other at the back wall can
     flicker. Faces that carry artwork are therefore faces of the object itself (see texBox), never a plane laid over another surface. */
  function at(x, y, z, ry, fn, rx) {
    ctx.base.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, 0, 'YXZ')), new T.Vector3(1, 1, 1)); fn(); ctx.base.identity();
  }
  function sub(x, y, z, rx, ry, rz, fn) {
    var keep = ctx.base.clone(), m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new T.Vector3(1, 1, 1));
    ctx.base.multiply(m); fn(); ctx.base.copy(keep);
  }
  function wp(x, y, z) { return new T.Vector3(x, y, z).applyMatrix4(ctx.base).toArray(); }
  function place(mesh, x, y, z, ry, rx) {
    mesh.matrixAutoUpdate = false;
    mesh.matrix.multiplyMatrices(ctx.base, new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, 0, 'YXZ')), new T.Vector3(1, 1, 1)));
    g.add(mesh); return mesh;
  }
  function stdMat(o) { o.roughness = 0.9; o.metalness = 0; o.color = o.color || TONE; return new T.MeshStandardMaterial(o); }
  /* a box with artwork on its front face (+z): three draw calls, no overlay plane */
  function texBox(w, h, d, side, map, x, y, z, ry, rx) {
    var geo = new T.BoxGeometry(w, h, d); geo.clearGroups(); geo.addGroup(0, 24, 0); geo.addGroup(24, 6, 1); geo.addGroup(30, 6, 0);
    return place(new T.Mesh(geo, [stdMat({ color: new T.Color(side).multiply(TONE) }), stdMat({ map: map })]), x, y, z, ry, rx);
  }
  function shadow(x, z, w, d, a, y, ry) { H.add(new T.PlaneGeometry(1, 1), '#000000', x, y == null ? 0.03 : y, z, -Math.PI / 2, ry || 0, 0, w, d, 1, a); }
  function cable(pts, r, color) { var cv = new T.CatmullRomCurve3(pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); })); S.geo(new T.TubeGeometry(cv, Math.max(12, pts.length * 8), r, 6, false), color || '#18191b', 0, 0, 0); }
  function led(x, y, z, color, bright) { E.ball(0.1, 0.1, 0.16, new T.Color(color).multiplyScalar(bright || 1.2), x, y, z); }
  /* a knob: skirt, body, cap and a rib that marks its position (everything stands at least 0.3 off the face) */
  function knob(x, y, z, r, h, ang) {
    S.cyl(r * 1.2, r * 1.2, 0.12, CREAMD, x, y, z + 0.06, Math.PI / 2); S.cyl(r * 0.92, r, h, '#1c1d1f', x, y, z + 0.12 + h / 2, Math.PI / 2);
    S.cyl(r * 0.72, r * 0.72, 0.06, '#2a2c2f', x, y, z + 0.12 + h + 0.03, Math.PI / 2);
    S.box(0.1, r * 0.75, 0.12, ORANGE, x + Math.sin(ang) * r * 0.36, y + Math.cos(ang) * r * 0.36, z + 0.12 + h + 0.1, 0, 0, -ang);
  }

  /* ===== shell: floor, walls ===== */
  var floorM = new T.Mesh(new T.PlaneGeometry(110, 64), stdMat({ map: floorTile(T) }));
  floorM.rotation.x = -Math.PI / 2; floorM.position.set(0, FLOOR, 13); g.add(floorM);
  var wallMat = new T.MeshBasicMaterial({ map: wallTex(T), fog: false });
  var back = new T.Mesh(new T.PlaneGeometry(110, 54), wallMat); back.position.set(0, 14, ZB); g.add(back);
  [-1, 1].forEach(function (s) { var sw = new T.Mesh(new T.PlaneGeometry(64, 54), wallMat); sw.position.set(s * 55, 14, 13); sw.rotation.y = -s * Math.PI / 2; g.add(sw); });
  at(0, 0, 0, 0, function () { S.box(110, 1.0, 0.5, '#26231f', 0, FLOOR + 0.5, ZB + 0.25); });

  /* ===== table: wooden margins round a green mat; the mat plane and the margins meet edge to edge and never overlap ===== */
  var woodMat = stdMat({ map: woodTile(T) }), MZ0 = -17.9, MZ1 = 9.6, MX = 32.7, TOP = -0.012;
  at(0, 0, 0, 0, function () {
    function strip(w, d, x, z) { WB.geo(tboxGeo(T, w, 0.75, d, 8), '#ffffff', x, TOP - 0.375, z); }
    strip(74, 3.4, 0, (MZ1 + 13) / 2); strip(74, 1.0, 0, (MZ0 - 18.9) / 2); strip(4.3, MZ1 - MZ0, -(MX + 37) / 2, (MZ0 + MZ1) / 2); strip(4.3, MZ1 - MZ0, (MX + 37) / 2, (MZ0 + MZ1) / 2);
    S.box(65.4, 0.9, 27.5, '#2b2926', 0, -1.0, (MZ0 + MZ1) / 2);                                    /* core under the mat */
    var mz = (MZ0 + MZ1) / 2, edge = '#1d1f20';
    S.box(65.4, 0.5, 0.5, edge, 0, TOP - 0.25, MZ1 - 0.25); S.box(65.4, 0.5, 0.5, edge, 0, TOP - 0.25, MZ0 + 0.25);
    S.box(0.5, 0.5, MZ1 - MZ0 - 1.0, edge, -(MX - 0.25), TOP - 0.25, mz); S.box(0.5, 0.5, MZ1 - MZ0 - 1.0, edge, MX - 0.25, TOP - 0.25, mz);
    S.box(74, 0.7, 0.5, CHD, 0, -1.25, 12.6); S.box(74, 0.7, 0.5, CHD, 0, -1.25, -18.3);
    [[-35.8, -18], [35.8, -18], [-35.8, 12.2], [35.8, 12.2]].forEach(function (p) { S.box(1.3, 11.9, 1.3, '#2b2d30', p[0], -7.1, p[1]); S.box(1.6, 0.25, 1.6, '#121314', p[0], FLOOR + 0.125, p[1]); });
    S.box(0.5, 0.7, 30, CHD, -35.8, -1.25, -2.9); S.box(0.5, 0.7, 30, CHD, 35.8, -1.25, -2.9);
    S.box(71, 0.4, 0.4, '#2b2d30', 0, -9.5, 12.2); S.box(0.4, 0.4, 30, '#2b2d30', -35.8, -9.5, -2.9); S.box(0.4, 0.4, 30, '#2b2d30', 35.8, -9.5, -2.9);
    S.cyl(0.34, 0.34, 0.3, STEEL, -30.4, 0.1, -15.6); S.cyl(0.2, 0.2, 0.3, STEELD, -30.4, 0.3, -15.6);       /* press stud for a wrist strap */
  });
  var matPlane = new T.Mesh(new T.PlaneGeometry(MX * 2 - 1, MZ1 - MZ0 - 1), stdMat({ map: matTile(T) }));
  matPlane.rotation.x = -Math.PI / 2; matPlane.position.set(0, TOP, (MZ0 + MZ1) / 2); g.add(matPlane);

  /* ===== wall: pegboard ===== */
  var PB = { w: 21.6, h: 11.52, x: -19.2, y: 9.16, zf: -18.35 }, left = PB.x - PB.w / 2, bottom = PB.y - PB.h / 2;
  at(0, 0, 0, 0, function () {
    texBox(PB.w, PB.h, 0.4, '#2c2e31', pegTile(T), PB.x, PB.y, PB.zf - 0.2);
    S.box(PB.w + 0.9, 0.45, 0.62, WOOD, PB.x, PB.y + PB.h / 2 + 0.225, PB.zf - 0.1); S.box(PB.w + 0.9, 0.45, 0.62, WOOD, PB.x, PB.y - PB.h / 2 - 0.225, PB.zf - 0.1);
    S.box(0.45, PB.h, 0.62, WOOD, PB.x - PB.w / 2 - 0.225, PB.y, PB.zf - 0.1); S.box(0.45, PB.h, 0.62, WOOD, PB.x + PB.w / 2 + 0.225, PB.y, PB.zf - 0.1);
    [0.1, 0.4, 0.7, 0.95].forEach(function (f) { S.box(0.9, PB.h - 0.2, 0.3, WOODD, PB.x - PB.w / 2 + 0.6 + f * (PB.w - 1.2), PB.y, ZB + 0.15); });
  });
  /* tools hang from pegs through (or between) their handles; each hole is snapped to the 2.54 cm grid of the board */
  function snap(u) { return (Math.round(u / 0.36 - 0.5) + 0.5) * 0.36; }
  var V1 = snap(10.75), V2 = snap(4.3);
  var tools = [
    { u: 1.4, v: V1, draw: drawDriver, o: { h: 2.5, hw: 0.36, sw: 0.075, L: 3.0 } },
    { u: 2.75, v: V1, draw: drawDriver, o: { h: 2.2, hw: 0.31, sw: 0.065, L: 2.4, phil: true, col: ['#9c9588', '#e3dccb'] } },
    { u: 3.95, v: V1, draw: drawDriver, o: { h: 1.9, hw: 0.27, sw: 0.055, L: 2.2 } },
    { u: 5.0, v: V1, draw: drawDriver, o: { h: 1.7, hw: 0.23, sw: 0.05, L: 1.9, phil: true } },
    { u: 5.95, v: V1, draw: drawDriver, o: { h: 1.45, hw: 0.19, sw: 0.04, L: 1.7, col: ['#9c9588', '#e3dccb'] } },
    { u: 8.4, v: V1, draw: drawPliers, o: { jaw: 'needle', col: [ORANGED, '#f29a4a'] } },
    { u: 10.95, v: V1, draw: drawPliers, o: { jaw: 'cutter', col: ['#9c9588', '#e9e1cd'] } },
    { u: 13.5, v: V1, draw: drawPliers, o: { jaw: 'flat', col: ['#2a2c2f', '#55585d'] } },
    { u: 15.9, v: V1, draw: drawTweezers, o: { len: 3.9 } },
    { u: 17.2, v: V1, draw: drawTweezers, o: { len: 3.3, sleeve: true } },
    { u: 18.55, v: V1, draw: drawTweezers, o: { len: 3.6 } },
    { u: 20.3, v: V1, draw: drawRuler },
    { u: 2.4, v: V2 - 1.5, draw: drawHammer, pegs: [[0.6, -0.34], [2.6, -0.34]], short: true },
    { u: 7.7, v: V2, draw: drawWrench, s: 0.9 },
    { u: 10.9, v: V2, draw: drawHexKeys },
    { u: 14.0, v: V2 - 1.3, draw: drawTape },
    { u: 17.9, v: V2 - 1.3, draw: drawCoil }
  ];
  tools.forEach(function (t) { t.u = snap(t.u); });
  var toolPlane = new T.Mesh(new T.PlaneGeometry(PB.w, PB.h), stdMat({ map: toolsTex(T, PB.w, PB.h, tools), transparent: true, depthWrite: false }));
  toolPlane.position.set(PB.x, PB.y, PB.zf + 0.4); g.add(toolPlane);
  at(0, 0, 0, 0, function () {
    tools.forEach(function (t) {
      var pegs = t.pegs || [[0, 0]], len = t.short ? 0.3 : 0.65;
      pegs.forEach(function (p) {
        var px = left + (t.pegs ? snap(t.u + p[0]) : t.u), py = bottom + (t.pegs ? (Math.round((t.v + p[1]) / 0.36 - 0.5) + 0.5) * 0.36 : t.v);
        S.cyl(0.085, 0.085, len, STEEL, px, py, PB.zf + len / 2, Math.PI / 2, 0, 0, 10);
      });
    });
  });

  /* ===== wall: parts drawers (3 x 3), resistor chart, clock, power rail ===== */
  var CAB = { w: 14.7, h: 10.6, x: 10.75, y: 9.7, zb: -18.95, d: 3.0 }, cellW = (CAB.w - 0.4) / 3, cellH = (CAB.h - 0.4) / 3, faceZ = CAB.zb + CAB.d;
  var pulls = { 1: 1.1, 5: 2.0, 6: 0.7 }, aw = CELL.w * 3 + CELL.strip, ah = CELL.h * 3;
  function slabGeo(c0, r0) {
    var gm = new T.BoxGeometry(1, 1, 1), uv = gm.attributes.uv, k;
    for (k = 0; k < 24; k++) uv.setXY(k, (CELL.w * 3 + CELL.strip / 2) / aw, 0.5);
    var u0 = c0 * CELL.w / aw, u1 = (c0 + 1) * CELL.w / aw, v0 = 1 - (r0 + 1) * CELL.h / ah, v1 = 1 - r0 * CELL.h / ah;
    uv.setXY(16, u0, v1); uv.setXY(17, u1, v1); uv.setXY(18, u0, v0); uv.setXY(19, u1, v0); return gm;
  }
  at(0, 0, 0, 0, function () {
    S.box(CAB.w, CAB.h, CAB.d, '#2a2c2f', CAB.x, CAB.y, CAB.zb + CAB.d / 2);
    for (j = 0; j < 9; j++) {
      var col = j % 3, row = Math.floor(j / 3), cx = CAB.x - CAB.w / 2 + 0.2 + cellW * (col + 0.5), cy = CAB.y + CAB.h / 2 - 0.2 - cellH * (row + 0.5), p = pulls[j] || 0;
      AT.add(slabGeo(col, row), '#ffffff', cx, cy, faceZ + p + 0.1, 0, 0, 0, cellW - 0.3, cellH - 0.3, 0.5);
      if (p) {
        var tz = faceZ + p / 2 - 0.1, tw = (cellW - 0.3) / 2 - 0.05;
        S.box(0.1, cellH - 0.9, p, '#3a3b3e', cx - tw, cy, tz); S.box(0.1, cellH - 0.9, p, '#3a3b3e', cx + tw, cy, tz); S.box(tw * 2, 0.1, p, '#3a3b3e', cx, cy - (cellH - 0.9) / 2, tz);
      }
    }
    S.box(0.5, 0.5, 0.4, STEELD, CAB.x - CAB.w / 2 + 1.2, CAB.y + CAB.h / 2 + 0.3, ZB + 0.25); S.box(0.5, 0.5, 0.4, STEELD, CAB.x + CAB.w / 2 - 1.2, CAB.y + CAB.h / 2 + 0.3, ZB + 0.25);
  });
  var atMesh = AT.build(new T.MeshStandardMaterial({ map: drawerAtlas(T), vertexColors: true, color: TONE, roughness: 0.9, metalness: 0 }));

  var POS = { w: 7.6, h: 9.5, x: -2.4, y: 10.55 };
  at(0, 0, 0, 0, function () { texBox(POS.w, POS.h, 0.35, '#2a2825', posterFace(T), POS.x, POS.y, ZB + 0.2); });

  at(0, 0, 0, 0, function () {
    /* clock: the cap of a short cylinder carries the face */
    var cgeo = new T.CylinderGeometry(1.55, 1.55, 0.4, 40);
    var cm = new T.Mesh(cgeo, [stdMat({ color: new T.Color(CHD).multiply(TONE) }), stdMat({ map: clockFace(T) }), stdMat({ color: new T.Color(CHD).multiply(TONE) })]);
    place(cm, 22.6, 12.4, ZB + 0.25, 0, Math.PI / 2);
    /* power rail with sockets, low on the wall behind the instruments */
    texBox(59.8, 0.95, 0.5, '#3c3f43', railTile(T), 0, 2.95, ZB + 0.25);
  });

  /* ===== wall: shelf high up with storage bins ===== */
  at(0, 0, 0, 0, function () {
    S.box(58, 0.4, 2.4, WOOD, -4, 20.2, ZB + 1.3);
    for (i = 0; i < 9; i++) S.box(0.35, 1.4, 1.6, STEELD, -28 + i * 6.4 + 3.2, 19.5, ZB + 0.9);
    var x = -30, cols = [ORANGE, CREAM, '#4a4d52', '#c4a36a', ORANGED, CREAMD];
    while (x < 22) {
      var bw = 2.2 + rnd() * 2.6, bh = 1.8 + rnd() * 2.0, cc = cols[Math.floor(rnd() * cols.length)];
      S.box(bw, bh, 1.8, cc, x + bw / 2, 20.4 + bh / 2, ZB + 1.3);
      shadow(x + bw / 2, ZB + 1.3, bw + 0.6, 2.6, 0.35, 20.43);
      x += bw + 0.35 + rnd() * 1.2;
    }
  });

  /* ===== bench: spool rack ===== */
  at(-24.3, 0, -14.4, 0.04, function () {
    shadow(0, 0, 8, 5, 0.5);
    S.box(6.6, 0.25, 3.0, WOOD, 0, 0.125, 0); S.box(0.35, 3.2, 2.0, WOODD, -3.1, 1.85, 0); S.box(0.35, 3.2, 2.0, WOODD, 3.1, 1.85, 0);
    S.cyl(0.1, 0.1, 6.4, STEEL, 0, 2.45, 0, 0, 0, Math.PI / 2, 10);
    var wires = ['#c8412d', '#1f2022', '#e3b53c', '#3f8a52'];
    for (i = 0; i < 4; i++) {
      var sx = -2.2 + i * 1.45;
      S.cyl(1.0, 1.0, 1.0, wires[i], sx, 2.45, 0, 0, 0, Math.PI / 2, 24);
      S.cyl(1.4, 1.4, 0.1, '#cfc6ad', sx - 0.55, 2.45, 0, 0, 0, Math.PI / 2, 24); S.cyl(1.4, 1.4, 0.1, '#cfc6ad', sx + 0.55, 2.45, 0, 0, 0, Math.PI / 2, 24);
    }
    cable([[-0.75, 2.2, 1.0], [-0.6, 0.9, 1.5], [-0.2, 0.1, 2.0], [0.8, 0.07, 2.3], [1.8, 0.07, 1.9]], 0.06, wires[0]);
    cable([[0.7, 2.1, 1.0], [0.9, 0.9, 1.4], [1.3, 0.07, 1.9]], 0.06, wires[1]);
  });

  /* ===== soldering station ===== */
  at(-15.8, 0, -14.6, 0.05, function () {
    shadow(0, 0, 8.4, 6.4, 0.5);
    texBox(6.4, 2.6, 4.6, '#3a3d42', stationFace(T), 0, 1.55, 0);
    [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]].forEach(function (p) { S.cyl(0.28, 0.28, 0.25, '#0f1011', p[0], 0.125, p[1]); });
    S.box(6.6, 0.16, 4.8, ORANGE, 0, 2.93, 0);
    knob(1.7, 1.55, 2.3, 0.46, 0.3, 0.9); led(0.95, 0.5, 2.3, '#7bff9c', 1.2);
  });
  at(-9.5, 0, -12.3, -0.25, function () {
    shadow(0, 0, 6.2, 7.0, 0.5);
    S.box(3.6, 0.5, 5.0, '#2d2f33', 0, 0.25, 0);
    S.cyl(0.62, 0.62, 0.8, '#b79a57', 1.0, 0.9, 1.2, 0, 0, 0, 20);
    S.box(0.35, 1.6, 0.35, '#3a3d42', 1.35, 1.3, -1.4);
    sub(-0.6, 2.25, -0.2, 0.17, 0, 0, function () {
      S.cyl(0.34, 0.34, 3.3, ORANGE, 0, 0, -1.85, Math.PI / 2, 0, 0, 20);
      S.cyl(0.46, 0.46, 0.16, '#d9cfb2', 0, 0, -0.55, Math.PI / 2); S.cyl(0.46, 0.46, 0.16, '#d9cfb2', 0, 0, -3.1, Math.PI / 2);
      S.cyl(0.27, 0.27, 0.5, STEEL, 0, 0, 0.05, Math.PI / 2); S.cyl(0.17, 0.17, 1.2, STEELD, 0, 0, 0.9, Math.PI / 2); S.cyl(0.03, 0.12, 0.7, '#c9ccd0', 0, 0, 1.85, Math.PI / 2);
      var pts = []; for (i = 0; i <= 56; i++) { var a = i / 56 * Math.PI * 2 * 4.5; pts.push(new T.Vector3(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.45 + i / 56 * 1.35)); }
      S.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, 0.045, 5, false), '#2f3236', 0, 0, 0);
      var rodA = wp(0, -0.4, 0.7), rodB = wp(0, -0.4, 1.6), keep = ctx.base.clone(); ctx.base.identity();
      S.rod([rodA[0], 0.5, rodA[2]], rodA, 0.07, '#3a3d42'); S.rod([rodB[0], 0.5, rodB[2]], rodB, 0.07, '#3a3d42'); ctx.base.copy(keep);
    });
  });
  /* iron lead: from the handle end down behind the stand and along the bench to the station */
  cable([[-10.2, 2.2, -16.2], [-10.6, 1.0, -17.0], [-12.0, 0.1, -17.4], [-15, 0.1, -17.1], [-17.8, 0.8, -16.9]], 0.08);
  at(-17.0, 0, -10.9, 0.5, function () {   /* solder reel */
    shadow(0, 0, 3.0, 3.0, 0.5);
    S.cyl(1.1, 1.1, 0.12, CREAMD, 0, 0.36, 0, 0, 0, 0, 24); S.cyl(1.1, 1.1, 0.12, CREAMD, 0, 1.0, 0, 0, 0, 0, 24); S.cyl(0.75, 0.75, 0.6, '#aeb1b5', 0, 0.68, 0, 0, 0, 0, 24);
    S.cyl(0.32, 0.32, 0.3, '#8f9297', 0, 0.15, 0);
  });

  /* ===== pen cup ===== */
  at(-6.3, 0, -12.8, 0, function () {
    shadow(0, 0, 3.4, 3.4, 0.5);
    S.cyl(0.85, 0.75, 1.9, '#d97a2e', 0, 0.95, 0, 0, 0, 0, 22);
    [['#d9cfb2', 0.3, 0.1, 0.12], ['#1f2022', -0.25, 0.1, -0.2], [ORANGE, 0.1, -0.3, 0.1], ['#a4a9ae', -0.3, -0.2, 0.28], ['#e8c63a', 0.45, -0.15, -0.14], ['#c8412d', -0.1, 0.35, -0.1]].forEach(function (p, k) {
      var tx = p[1] * 1.6 + p[3] * 3.0, tz = p[2] * 1.6 - p[3] * 1.6, ht = 2.1 + (k % 3) * 0.6;
      S.rod([p[1] * 0.4, 1.0, p[2] * 0.4], [tx, 1.9 + ht, tz], k === 3 ? 0.06 : 0.1, p[0], 8);
    });
  });

  /* ===== oscilloscope: the face is one animated texture ===== */
  var scr = scopeFace(T);
  at(-0.5, 0, -14.5, 0, function () {
    shadow(0, 0, 10.4, 8.6, 0.55);
    texBox(8, 4.6, 6.4, '#a89f88', scr.tex, 0, 2.65, 0);
    [[-3.4, -2.6], [3.4, -2.6], [-3.4, 2.6], [3.4, 2.6]].forEach(function (p) { S.cyl(0.3, 0.3, 0.35, '#161718', p[0], 0.175, p[1]); });
    S.box(0.3, 0.55, 0.45, CHD, -3.2, 5.2, 0); S.box(0.3, 0.55, 0.45, CHD, 3.2, 5.2, 0); S.box(6.7, 0.28, 0.45, CHD, 0, 5.5, 0);
    knob(1.8, 3.08, 3.2, 0.38, 0.3, 0.6); knob(3.0, 3.08, 3.2, 0.38, 0.3, -0.9); knob(1.8, 2.02, 3.2, 0.25, 0.24, 1.9); knob(3.0, 2.02, 3.2, 0.25, 0.24, -0.2);
    [1.6, 2.4, 3.2].forEach(function (x) { S.cyl(0.22, 0.22, 0.4, STEEL, x, 1.15, 3.2 + 0.2, Math.PI / 2); S.cyl(0.12, 0.12, 0.14, '#222', x, 1.15, 3.2 + 0.46, Math.PI / 2); });
    S.cyl(0.2, 0.2, 0.3, '#1c1d1f', 3.1, 4.3, 3.35, Math.PI / 2); led(1.65, 4.3, 3.2, '#ff9c33', 1.3);
  });
  cable([[-1.6, 2.4, -17.7], [-2.2, 3.4, -18.3], [-3.6, 3.0, -18.55]], 0.09, '#1a1b1d');

  /* ===== bench power supply ===== */
  var ledOut = null;
  at(8.6, 0, -14.5, 0, function () {
    shadow(0, 0, 9.4, 8.6, 0.55);
    texBox(7, 3.4, 6.4, '#3a3d42', psuFace(T), 0, 2.0, 0);
    [[-3.0, -2.6], [3.0, -2.6], [-3.0, 2.6], [3.0, 2.6]].forEach(function (p) { S.cyl(0.3, 0.3, 0.3, '#161718', p[0], 0.15, p[1]); });
    knob(-2.05, 1.45, 3.2, 0.4, 0.3, 0.7); knob(0.35, 1.45, 3.2, 0.4, 0.3, -0.4);
    S.box(0.6, 0.34, 0.3, ORANGE, 2.65, 2.3, 3.35);
    [['#c8412d', 2.0], ['#1c1d1f', 2.65], ['#3f8a52', 3.3]].forEach(function (p) { S.cyl(0.24, 0.24, 0.4, p[0], p[1], 1.05, 3.2 + 0.2, Math.PI / 2); S.cyl(0.14, 0.14, 0.16, STEEL, p[1], 1.05, 3.2 + 0.48, Math.PI / 2); });
    led(2.05, 3.0, 3.2, '#7bff9c', 1.3); led(2.65, 3.0, 3.2, '#8a4a18', 1.0);
    ledOut = place(new T.Mesh(new T.SphereGeometry(1, 14, 10), new T.MeshBasicMaterial({ color: new T.Color('#7bff9c').multiplyScalar(1.3) })), 3.25, 3.0, 3.2); ledOut.matrix.scale(new T.Vector3(0.1, 0.1, 0.16));
  });
  cable([[10.5, 2.0, -17.7], [11.2, 3.2, -18.0], [12.4, 3.0, -18.55]], 0.09, '#1a1b1d');
  cable([[6.5, 1.4, -17.7], [5.2, 0.5, -18.1], [4.8, 2.2, -18.4], [4.0, 3.0, -18.55]], 0.09, '#1a1b1d');

  /* ===== handheld multimeter on its stand, with leads ===== */
  at(15.6, 0.48, -12.2, 0.12, function () {
    shadow(0, -0.3, 3.4, 3.4, 0.5, -0.43);
    texBox(2.4, 3.9, 1.0, ORANGE, meterFace(T), 0, 1.95, -0.5);
    S.cyl(0.55, 0.55, 0.3, '#1c1d1f', 0, 1.2, 0.15, Math.PI / 2); S.box(0.1, 0.4, 0.12, ORANGE, 0.0, 1.38, 0.34, 0, 0, 0.8);
    var jr = wp(-0.7, 0.3, 0.05), jb = wp(0.0, 0.3, 0.05), hinge = wp(0, 3.0, -1.0), keep = ctx.base.clone(); ctx.base.identity();
    cable([jr, [jr[0] - 0.6, 0.5, jr[2] + 0.6], [jr[0] - 1.6, 0.1, jr[2] + 1.3], [jr[0] - 2.4, 0.1, jr[2] + 0.4], [jr[0] - 3.4, 0.1, jr[2] + 0.9]], 0.06, '#c8412d');
    cable([jb, [jb[0] + 0.3, 0.45, jb[2] + 0.7], [jb[0] + 0.8, 0.1, jb[2] + 1.7], [jb[0] + 2.0, 0.1, jb[2] + 1.0], [jb[0] + 2.9, 0.1, jb[2] + 1.8]], 0.06, '#1f2022');
    S.rod(hinge, [hinge[0], 0.1, hinge[2] - 1.7], 0.08, '#2b2d30', 8);
    S.rod([jr[0] - 3.4, 0.12, jr[2] + 0.9], [jr[0] - 4.2, 0.12, jr[2] + 0.55], 0.11, '#c8412d'); S.rod([jb[0] + 2.9, 0.12, jb[2] + 1.8], [jb[0] + 3.7, 0.12, jb[2] + 2.2], 0.11, '#1f2022');
    ctx.base.copy(keep);
  }, -0.3);

  /* ===== desk lamp (articulated, shade tipped towards the bench) ===== */
  at(21.8, 0, -13.2, -0.35, function () {
    shadow(0, 0, 5.4, 5.4, 0.5);
    S.cyl(1.7, 1.8, 0.4, '#2b2d30', 0, 0.2, 0, 0, 0, 0, 28); S.cyl(0.35, 0.35, 0.5, '#2b2d30', 0, 0.6, 0);
    S.cyl(0.22, 0.22, 0.5, STEELD, 0, 0.9, 0, 0, 0, Math.PI / 2);
    var j1 = [0.0, 0.9, 0.0], j2 = [-2.4, 6.9, 0.0], j3 = [-4.9, 5.4, 0.0];
    [-0.22, 0.22].forEach(function (o) { S.rod([j1[0], j1[1], o], [j2[0], j2[1], o], 0.08, '#8e918e', 8); S.rod([j2[0], j2[1], o], [j3[0], j3[1], o], 0.08, '#8e918e', 8); });
    S.cyl(0.3, 0.3, 0.7, ORANGED, j2[0], j2[1], 0, Math.PI / 2, 0, 0, 14); S.cyl(0.28, 0.28, 0.6, ORANGED, j3[0], j3[1], 0, Math.PI / 2, 0, 0, 14);
    sub(j3[0], j3[1], 0, 0, 0, 1.0, function () {                       /* open shade with a bulb inside */
      S.geo(new T.CylinderGeometry(0.9, 2.2, 2.6, 28, 1, true), ORANGE, 0, -1.4, 0);
      S.cyl(0.55, 0.55, 0.5, '#2b2d30', 0, -0.1, 0);
      E.ball(0.5, 0.5, 0.5, new T.Color('#ffe2a8').multiplyScalar(1.2), 0, -2.0, 0);
    });
  });

  /* ===== breadboard with a few parts ===== */
  at(15.5, 0, -8.2, 0.12, function () {
    shadow(0, 0, 5.2, 3.2, 0.5);
    S.box(3.6, 0.4, 1.3, '#e2d9bf', 0, 0.2, 0);
    for (i = 0; i < 14; i++) { S.box(0.1, 0.12, 0.5, '#3a3c3f', -1.5 + i * 0.23, 0.44, 0.3); S.box(0.1, 0.12, 0.5, '#3a3c3f', -1.5 + i * 0.23, 0.44, -0.3); }
    S.cyl(0.09, 0.09, 0.3, '#e8643a', -0.8, 0.65, 0.3); S.cyl(0.09, 0.09, 0.3, '#3f8a52', 0.15, 0.65, -0.3); E.cyl(0.09, 0.09, 0.16, new T.Color('#ff9c33').multiplyScalar(1.2), 0.7, 0.68, 0.3);
    cable([[-1.3, 0.5, 0.3], [-1.3, 1.0, 0.0], [-0.6, 1.0, -0.3], [-0.6, 0.5, -0.3]], 0.04, '#c9a13a');
  });

  /* ===== floor: stool, toolbox, boxes ===== */
  K.makeStool(T, g, 14, 8.2, FLOOR, 0.4);
  at(-23, FLOOR, 6.0, 0.1, function () {
    shadow(0, 0, 10.5, 6.5, 0.55, 0.05);
    S.box(8.0, 3.4, 3.4, '#cf6c25', 0, 1.7, 0); S.box(8.2, 0.3, 3.6, '#a8501a', 0, 3.55, 0); S.box(1.8, 0.35, 0.5, '#2b2d30', 0, 4.0, 0);
    S.box(0.5, 0.9, 3.5, '#2b2d30', -3.4, 3.0, 0); S.box(0.5, 0.9, 3.5, '#2b2d30', 3.4, 3.0, 0);
  });
  at(26, FLOOR, 3.0, -0.2, function () {
    shadow(0, 0, 8.5, 8.5, 0.5, 0.05);
    S.box(6.0, 3.6, 5.0, '#b89a68', 0, 1.8, 0); S.box(4.6, 2.8, 4.0, '#c3a672', 0.2, 5.0, 0, 0.3);
  });

  /* contact shadow under the topic's model, resized by the stage */
  var tableShadow = K.contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5);

  /* ===== build the merged meshes ===== */
  var solid = S.build(new T.MeshStandardMaterial({ vertexColors: true, color: TONE, roughness: 0.85, metalness: 0, side: T.DoubleSide }));
  var emis = E.build(new T.MeshBasicMaterial({ vertexColors: true }));
  var wood = WB.build(new T.MeshStandardMaterial({ map: woodMat.map, color: TONE, roughness: 0.9, metalness: 0, vertexColors: true }));
  var shadMat = new T.MeshBasicMaterial({ map: K.canvasTex(T, 64, 64, function (c, w, h) { var gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  var shad = H.build(shadMat, true);
  tableShadow.material.polygonOffset = true; tableShadow.material.polygonOffsetFactor = -2; tableShadow.material.polygonOffsetUnits = -2;
  [solid, emis, wood, atMesh, shad].forEach(function (m) { if (m) g.add(m); });
  if (shad) shad.renderOrder = 1;

  var acc = 0;
  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) {
      if (!calm) { acc += dt || 0; if (acc > 0.1) { acc = 0; scr.draw(t); } }
      if (ledOut) ledOut.material.color.setRGB(0.48, 1.3, 0.62).multiplyScalar(0.85 + 0.15 * Math.sin(t * 1.6));
    }
  };
};
})();
