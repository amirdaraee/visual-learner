/* Room "workshop" for the engineering subject: a machine shop.
 * Painted brick wall, concrete floor with yellow safety lines, a heavy steel bench with a vise bolted to its far corner, a wall of
 * spur gears that really mesh (involute teeth, driven slowly), steel shelving with labelled parts bins and boxes, a pinned
 * orthographic drawing, hard hats and safety glasses on pegs, a wrench rack, calipers, a micrometer, a toolbox, an I-beam piece
 * and a small truss. Industrial grey, safety yellow and a little red. Local y = 0 is the bench top, the floor is at y = -13.
 * Static solids are baked into one vertex-coloured mesh; every label and sign shares one atlas texture. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var PI = Math.PI, FLOOR = -13, TOP = -0.15, ZW = -19;
var mulberry = K.mulberry;

var STEEL = '#8d9399', STEELL = '#939aa0', STEELD = '#5d636a', IRON = '#3f444a', IROND = '#2c3035';
var YEL = '#cda01c', YELD = '#a37d14', RED = '#a2322b', REDD = '#80261f', KRAFT = '#a88a60', KRAFTD = '#8d704a', PAPER = '#d6d0bd';

/*GEARMATH*/
var GM = 0.3;                      /* gear module, in scene units */
function invAng(a) { return Math.tan(a) - a; }
/* spur gear outline: involute flanks (20 degree pressure angle), a tip arc and a root arc. Tooth 0 is centred on angle 0.
   Each tooth is thinned a little for backlash, so a meshed pair never touches. */
function gearOutline(N, m) {
  var al = 20 * PI / 180, r = m * N / 2, rb = r * Math.cos(al), ra = r + m, rf = r - 1.25 * m, step = 2 * PI / N;
  var half = PI / (2 * N) - 0.035 * m / r, steps = 7, pts = [], k, j;
  function psi(rho) { var rr = Math.max(rho, rb); return Math.max(0.004, half - (invAng(Math.acos(Math.min(1, rb / rr))) - invAng(al))); }
  function put(rho, a) { pts.push([rho * Math.cos(a), rho * Math.sin(a)]); }
  for (k = 0; k < N; k++) {
    var c = k * step, rho, ta = psi(ra), tr = psi(rf);
    for (j = 0; j <= steps; j++) { rho = rf + (ra - rf) * j / steps; put(rho, c - psi(rho)); }
    put(ra, c - ta * 0.35); put(ra, c + ta * 0.35);
    for (j = steps; j >= 0; j--) { rho = rf + (ra - rf) * j / steps; put(rho, c + psi(rho)); }
    put(rf, c + tr + (step - 2 * tr) / 3); put(rf, c + tr + (step - 2 * tr) * 2 / 3);
  }
  return pts;
}
/* Two gears mesh when N_A (psiA - th) + N_B (psiB - th - PI) = PI (mod 2 PI), where psi is the angle of a tooth centre and th is the
   direction from A's axle to B's. This gives B's angle for a given A. */
function meshAngle(Na, psiA, Nb, th) { return th + PI + (PI - Na * (psiA - th)) / Nb; }

/* The train: tooth count, layer (0 behind, 1 in front), the gear it meshes with and the direction of the line of centres,
   or `on`: sits on the same axle as another gear (a compound pair). */
var TRAIN = [
  { N: 36, layer: 0, col: '#8c9298' },
  { N: 22, layer: 0, from: 0, ang: 30, col: '#c99a1c' },
  { N: 30, layer: 0, from: 1, ang: -30, col: '#4e545a' },
  { N: 12, layer: 1, on: 1, col: '#a3342c' },
  { N: 20, layer: 1, from: 3, ang: 110, col: '#9aa0a5' },
  { N: 28, layer: 1, from: 4, ang: 12, col: '#c99a1c' },
  { N: 18, layer: 0, from: 0, ang: 215, col: '#6c7278' }
];
function layoutTrain(train, m) {
  var out = [], i, g, p, a, d, o, q;
  for (i = 0; i < train.length; i++) {
    g = train[i]; p = { N: g.N, r: m * g.N / 2, layer: g.layer, col: g.col, x: 0, y: 0, ratio: 1, th: 0, parent: -1, psi0: 0, coax: false };
    if (g.on != null) { o = out[g.on]; p.x = o.x; p.y = o.y; p.parent = g.on; p.coax = true; p.psi0 = o.psi0; }
    else if (g.from != null) {
      q = out[g.from]; a = g.ang * PI / 180; d = m * (q.N + g.N) / 2;
      p.x = q.x + d * Math.cos(a); p.y = q.y + d * Math.sin(a); p.th = a; p.parent = g.from; p.ratio = -q.ratio * q.N / g.N;
      p.psi0 = meshAngle(q.N, q.psi0, g.N, a);
    }
    out.push(p);
  }
  return out;
}
/*END*/

/* ---------- small helpers ---------- */

function mx(T, x, y, z, rx, ry, rz, sx, sy, sz) {
  return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0, 'XYZ')),
    new T.Vector3(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
}
function canv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function mipTex(T, c, rep) {
  var t = new T.CanvasTexture(c); t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* Merges many solids into one mesh with vertex colours. color: a hex, or a function (lx, ly, lz, nx, ny, nz) -> hex of the part's own frame. */
function makeBake(T) {
  var pos = [], nor = [], col = [], stack = [new T.Matrix4()], c = new T.Color(), v = new T.Vector3(), n = new T.Vector3(), lv = new T.Vector3(), ln = new T.Vector3(), nm = new T.Matrix3();
  var cache = {}, B = {};
  function unit(key, make) { return cache[key] || (cache[key] = make()); }
  B.mx = function (x, y, z, rx, ry, rz, sx, sy, sz) { return mx(T, x, y, z, rx, ry, rz, sx, sy, sz); };
  B.push = function (m) { stack.push(stack[stack.length - 1].clone().multiply(m)); };
  B.pop = function () { stack.pop(); };
  B.add = function (geo, m, color) {
    var gm = stack[stack.length - 1].clone().multiply(m), g2 = geo.__ni || (geo.__ni = geo.index ? geo.toNonIndexed() : geo), pa = g2.attributes.position, na = g2.attributes.normal, i;
    nm.getNormalMatrix(gm);
    for (i = 0; i < pa.count; i++) {
      lv.fromBufferAttribute(pa, i); ln.fromBufferAttribute(na, i);
      v.copy(lv).applyMatrix4(gm); n.copy(ln).applyMatrix3(nm).normalize();
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z);
      if (typeof color === 'function') c.set(color(lv.x, lv.y, lv.z, ln.x, ln.y, ln.z)); else c.set(color);
      col.push(c.r, c.g, c.b);
    }
  };
  B.box = function (w, h, d, x, y, z, color, rx, ry, rz) { B.add(unit('b', function () { return new T.BoxGeometry(1, 1, 1); }), mx(T, x, y, z, rx, ry, rz, w, h, d), color); };
  /* cylinder along y; rx = PI/2 turns it along z, rz = PI/2 along x */
  B.cyl = function (rt, rb, h, x, y, z, color, rx, ry, rz, seg) {
    var r0 = Math.max(rt, rb, 0.0001), s = seg || 16;
    B.add(unit('c' + (rt / r0).toFixed(3) + '_' + (rb / r0).toFixed(3) + '_' + s, function () { return new T.CylinderGeometry(rt / r0, rb / r0, 1, s, 1, false); }), mx(T, x, y, z, rx, ry, rz, r0, h, r0), color);
  };
  B.ball = function (r, x, y, z, color, sx, sy, sz) { B.add(unit('s', function () { return new T.SphereGeometry(1, 14, 10); }), mx(T, x, y, z, 0, 0, 0, r * (sx || 1), r * (sy || 1), r * (sz || 1)), color); };
  /* a round rod between two points */
  B.rod = function (a, b, r, color, seg) {
    var d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    B.add(unit('r' + (seg || 6), function () { return new T.CylinderGeometry(1, 1, 1, seg || 6, 1, false); }),
      new T.Matrix4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new T.Vector3(r, len, r)), color);
  };
  B.mesh = function (material) {
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return new T.Mesh(geo, material);
  };
  return B;
}

/* one atlas texture for every label, sign and scale; cells are drawn when they are registered */
function makeAtlas(T) {
  var S = 1024, c = canv(S, S), x = c.getContext('2d'), cx = 0, cy = 0, rowH = 0, A = {};
  x.fillStyle = '#777'; x.fillRect(0, 0, S, S);
  A.cell = function (w, h, draw) {
    if (cx + w > S) { cx = 0; cy += rowH + 4; rowH = 0; }
    x.save(); x.translate(cx, cy); x.beginPath(); x.rect(0, 0, w, h); x.clip(); draw(x, w, h); x.restore();
    var r = [cx / S, 1 - (cy + h) / S, (cx + w) / S, 1 - cy / S]; cx += w + 4; rowH = Math.max(rowH, h); return r;
  };
  A.texture = function () { return mipTex(T, c); };
  return A;
}
/* flat quads that show a cell of the atlas: one draw call, pulled slightly toward the camera so they never flicker on what they sit on */
function makeDecals(T) {
  var pos = [], uv = [], stack = [new T.Matrix4()], v = new T.Vector3(), D = {}, idx = [0, 1, 2, 0, 2, 3];
  D.push = function (m) { stack.push(stack[stack.length - 1].clone().multiply(m)); }; D.pop = function () { stack.pop(); };
  D.quad = function (w, h, cell, m) {
    var gm = stack[stack.length - 1].clone().multiply(m), pts = [[-w / 2, -h / 2, 0, 0], [w / 2, -h / 2, 1, 0], [w / 2, h / 2, 1, 1], [-w / 2, h / 2, 0, 1]], k, p;
    for (k = 0; k < 6; k++) {
      p = pts[idx[k]]; v.set(p[0], p[1], 0).applyMatrix4(gm); pos.push(v.x, v.y, v.z);
      uv.push(cell[0] + (cell[2] - cell[0]) * p[2], cell[1] + (cell[3] - cell[1]) * p[3]);
    }
  };
  D.mesh = function (map) {
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return new T.Mesh(geo, new T.MeshBasicMaterial({ map: map, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
  };
  return D;
}

/* shrink the font until the text fits */
function fitText(x, text, maxW, size, weight) {
  var s = size; x.font = (weight || '700') + ' ' + s + 'px Menlo, Consolas, "Courier New", monospace';
  while (x.measureText(text).width > maxW && s > 10) { s -= 2; x.font = (weight || '700') + ' ' + s + 'px Menlo, Consolas, "Courier New", monospace'; }
  return s;
}

/* ---------- textures ---------- */

/* painted brick: grey paint over bricks laid in running bond, a few chips showing the brick under the paint. One tile = 3 bricks x 8 courses. */
function brickTex(T) {
  var c = canv(512, 512), x = c.getContext('2d'), r = mulberry(11), bw = 512 / 3, bh = 64, i, j, k, row, off, px, py, L;
  x.fillStyle = '#585b60'; x.fillRect(0, 0, 512, 512);
  for (row = 0; row < 8; row++) {
    off = (row % 2) * bw / 2;
    for (i = -1; i < 4; i++) {
      px = i * bw + off; py = row * bh; L = 0.93 + r() * 0.14;
      x.fillStyle = 'rgb(' + Math.round(132 * L) + ',' + Math.round(133 * L) + ',' + Math.round(131 * L) + ')';
      x.fillRect(px + 3.5, py + 3.5, bw - 7, bh - 7);
      x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(px + 3.5, py + 3.5, bw - 7, 3);
      x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(px + 3.5, py + bh - 9, bw - 7, 5.5);
      if (r() < 0.13) {   /* paint chipped off an edge */
        x.fillStyle = 'rgba(140,82,64,0.85)'; x.beginPath(); x.ellipse(px + 20 + r() * (bw - 40), py + 10 + r() * (bh - 20), 6 + r() * 12, 3 + r() * 5, 0, 0, 7); x.fill();
      }
    }
  }
  for (k = 0; k < 900; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2); }
  for (j = 0; j < 7; j++) {   /* a few faint paint runs */
    px = r() * 512; py = r() * 400; x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(px, py, 2 + r() * 2, 30 + r() * 80);
  }
  return mipTex(T, c, [150 / 9.6, 54 / 7.6]);
}

/* concrete slab: x = -60..60, z = -19..61. Control joints, stains, and the painted safety lines of the work area. */
function floorTex(T) {
  var S = 1024, c = canv(S, S), x = c.getContext('2d'), r = mulberry(23), i, g;
  function px(wx) { return (wx + 60) / 120 * S; } function pz(wz) { return (wz + 19) / 80 * S; }
  x.fillStyle = '#85847f'; x.fillRect(0, 0, S, S);
  for (i = 0; i < 70; i++) {
    var cxp = r() * S, cyp = r() * S, rad = 40 + r() * 140, dark = r() < 0.5;
    x.save(); x.translate(cxp, cyp); x.scale(rad, rad * (0.5 + r() * 0.6)); g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, dark ? 'rgba(40,40,38,0.09)' : 'rgba(255,255,250,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore();
  }
  for (i = 0; i < 5000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5); }
  /* control joints every 20 units */
  x.strokeStyle = 'rgba(40,40,38,0.55)'; x.lineWidth = 2;
  for (i = -60; i <= 60; i += 20) { x.beginPath(); x.moveTo(px(i), 0); x.lineTo(px(i), S); x.stroke(); }
  for (i = -19; i <= 61; i += 20) { x.beginPath(); x.moveTo(0, pz(i)); x.lineTo(S, pz(i)); x.stroke(); }
  /* oil stains beside the bench and a hairline crack */
  [[-34, -2, 4], [30, 18, 3], [-6, 30, 5], [44, 8, 3.5]].forEach(function (s) {
    x.save(); x.translate(px(s[0]), pz(s[1])); x.scale(s[2] * 8.5, s[2] * 12); var og = x.createRadialGradient(0, 0, 0, 0, 0, 1); og.addColorStop(0, 'rgba(30,28,26,0.28)'); og.addColorStop(1, 'rgba(30,28,26,0)'); x.fillStyle = og; x.fillRect(-1, -1, 2, 2); x.restore();
  });
  x.strokeStyle = 'rgba(30,30,28,0.45)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px(-48), pz(30)); x.lineTo(px(-44), pz(33)); x.lineTo(px(-45), pz(37)); x.lineTo(px(-41), pz(41)); x.stroke();
  /* yellow safety lines: an aisle along the wall, and the work area around the bench */
  function line(x0, z0, x1, z1) {
    var a = px(x0), b = pz(z0), cc = px(x1), d = pz(z1); x.strokeStyle = '#c9a21e'; x.lineWidth = 8; x.lineCap = 'butt'; x.beginPath(); x.moveTo(a, b); x.lineTo(cc, d); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(a, b); x.lineTo(cc, d); x.stroke();
  }
  line(-60, -13.4, 60, -13.4); line(-37, -13.4, -37, 26); line(37, -13.4, 37, 26); line(-37, 26, 37, 26);
  /* wear on the lines */
  for (i = 0; i < 160; i++) { x.fillStyle = 'rgba(140,139,135,' + (0.25 + r() * 0.3) + ')'; x.fillRect(r() * S, r() * S, 2 + r() * 4, 2 + r() * 3); }
  return mipTex(T, c);
}

/* steel bench top: dull grey, long scratches, a couple of stains */
function steelTex(T) {
  var c = canv(512, 256), x = c.getContext('2d'), r = mulberry(31), i;
  x.fillStyle = '#5e6063'; x.fillRect(0, 0, 512, 256);
  for (i = 0; i < 30; i++) { var g; x.save(); x.translate(r() * 512, r() * 256); x.scale(30 + r() * 80, 12 + r() * 30); g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(-1, -1, 2, 2); x.restore(); }
  for (i = 0; i < 130; i++) {
    var sx = r() * 512, sy = r() * 256, len = 14 + r() * 90, an = (r() - 0.5) * 0.35 + (r() < 0.2 ? 1.2 : 0);
    x.strokeStyle = r() < 0.55 ? 'rgba(225,228,230,' + (0.03 + r() * 0.07) + ')' : 'rgba(25,27,30,' + (0.05 + r() * 0.09) + ')'; x.lineWidth = 0.6 + r();
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(an) * len, sy + Math.sin(an) * len); x.stroke();
  }
  [[90, 60, 18], [350, 190, 14], [430, 70, 10]].forEach(function (s) { var og = x.createRadialGradient(s[0], s[1], 0, s[0], s[1], s[2]); og.addColorStop(0, 'rgba(30,28,24,0.28)'); og.addColorStop(1, 'rgba(30,28,24,0)'); x.fillStyle = og; x.fillRect(s[0] - s[2], s[1] - s[2], s[2] * 2, s[2] * 2); });
  x.strokeStyle = 'rgba(190,196,200,0.22)'; x.lineWidth = 6; x.strokeRect(3, 3, 506, 250);
  return mipTex(T, c);
}

/* a small orthographic drawing of an invented part, third-angle projection, drawn to a true 2:1 scale of the sheet */
function drawingTex(T) {
  var W = 1024, H = 724, c = canv(W, H), x = c.getContext('2d'), r = mulberry(5), i;
  var INK = '#1b2128', DIM = '#1f3f63', CEN = '#a2322b', S = 4.876;   /* S: px per mm at 2:1 on a 420 mm wide sheet */
  x.fillStyle = '#d8d3c3'; x.fillRect(0, 0, W, H);
  for (i = 0; i < 1400; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.04)'; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
  function ln(x0, y0, x1, y1, w, col, dash) { x.save(); x.lineWidth = w; x.strokeStyle = col; x.setLineDash(dash || []); x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); x.restore(); }
  function rect(x0, y0, w, h, lw, col) { x.save(); x.lineWidth = lw; x.strokeStyle = col; x.strokeRect(x0, y0, w, h); x.restore(); }
  function circ(cx, cy, rr, lw, col, dash) { x.save(); x.lineWidth = lw; x.strokeStyle = col; x.setLineDash(dash || []); x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke(); x.restore(); }
  function head(px, py, dx, dy) {   /* arrowhead at (px, py) pointing along (dx, dy) */
    var l = Math.hypot(dx, dy); dx /= l; dy /= l; x.fillStyle = DIM; x.beginPath(); x.moveTo(px, py);
    x.lineTo(px - dx * 16 + dy * 5, py - dy * 16 - dx * 5); x.lineTo(px - dx * 16 - dy * 5, py - dy * 16 + dx * 5); x.closePath(); x.fill();
  }
  function text(s, tx, ty, size, col, align, rot) {
    x.save(); x.translate(tx, ty); if (rot) x.rotate(rot); x.font = '700 ' + size + 'px Menlo, Consolas, "Courier New", monospace'; x.fillStyle = col || INK; x.textAlign = align || 'center'; x.textBaseline = 'alphabetic'; x.fillText(s, 0, 0); x.restore();
  }
  var HID = [11, 7], CL = [26, 5, 4, 5];
  rect(14, 14, W - 28, H - 28, 3, INK);

  /* geometry, in mm: plate 80 x 50 x 12, boss diameter 36 and 18 high, bore diameter 20 through, two holes diameter 8 at +-28 */
  var FX = 130, cx = FX + 40 * S, fw = 80 * S, th = 12 * S, bh = 18 * S, tdp = 50 * S, bR = 18 * S, kR = 10 * S, hR = 4 * S, hx = 28 * S;
  var topY = 94, cy = topY + tdp / 2, frT = 388, frB = frT + 30 * S, RX = 650, rcx = RX + tdp / 2;

  /* top view */
  rect(FX, topY, fw, tdp, 3, INK); circ(cx, cy, bR, 3, INK); circ(cx, cy, kR, 3, INK); circ(cx - hx, cy, hR, 3, INK); circ(cx + hx, cy, hR, 3, INK);
  /* front view */
  rect(FX, frB - th, fw, th, 3, INK); rect(cx - bR, frT, 2 * bR, bh, 3, INK);
  ln(cx - kR, frT, cx - kR, frB, 2, INK, HID); ln(cx + kR, frT, cx + kR, frB, 2, INK, HID);
  [-1, 1].forEach(function (s) { ln(cx + s * hx - hR, frB - th, cx + s * hx - hR, frB, 2, INK, HID); ln(cx + s * hx + hR, frB - th, cx + s * hx + hR, frB, 2, INK, HID); });
  /* right view: the front of the part is on the left, next to the front view */
  rect(RX, frB - th, tdp, th, 3, INK); rect(rcx - bR, frT, 2 * bR, bh, 3, INK);
  ln(rcx - kR, frT, rcx - kR, frB, 2, INK, HID); ln(rcx + kR, frT, rcx + kR, frB, 2, INK, HID);
  ln(rcx - hR, frB - th, rcx - hR, frB, 2, INK, HID); ln(rcx + hR, frB - th, rcx + hR, frB, 2, INK, HID);
  /* centre lines */
  ln(FX - 22, cy, FX + fw + 22, cy, 2, CEN, CL); ln(cx, topY - 20, cx, topY + tdp + 20, 2, CEN, CL);
  ln(cx, frT - 16, cx, frB + 16, 2, CEN, CL); ln(cx - hx, topY - 36, cx - hx, topY + tdp + 16, 2, CEN, CL); ln(cx + hx, topY - 36, cx + hx, topY + tdp + 16, 2, CEN, CL);
  ln(rcx, frT - 16, rcx, frB + 16, 2, CEN, CL);

  /* dimensions */
  function hdim(xa, xb, y, label, e0, e1) {   /* horizontal, extension lines from e0 / e1 to the line */
    ln(xa, e0, xa, y + (e0 < y ? 8 : -8), 1.5, DIM); ln(xb, e1, xb, y + (e1 < y ? 8 : -8), 1.5, DIM); ln(xa, y, xb, y, 2, DIM);
    head(xa, y, 1, 0); head(xb, y, -1, 0); text(label, (xa + xb) / 2, y - 9, 32, DIM);
  }
  function vdim(ya, yb, xx, label, e0, e1) {
    ln(e0, ya, xx + (e0 < xx ? 8 : -8), ya, 1.5, DIM); ln(e1, yb, xx + (e1 < xx ? 8 : -8), yb, 1.5, DIM); ln(xx, ya, xx, yb, 2, DIM);
    head(xx, ya, 0, 1); head(xx, yb, 0, -1); text(label, xx - 9, (ya + yb) / 2, 32, DIM, 'center', -PI / 2);
  }
  hdim(FX, FX + fw, frB + 52, '80', frB, frB);
  hdim(cx - hx, cx + hx, topY - 36, '56', topY - 18, topY - 18);
  vdim(frB - th, frB, FX - 40, '12', FX, FX);
  vdim(topY, topY + tdp, FX - 40, '50', FX, FX);
  vdim(frT, frB, RX + tdp + 44, '30', rcx + bR, RX + tdp);
  hdim(RX, RX + tdp, frB + 52, '50', frB, frB);
  /* diameter leaders to the right of the top view */
  function leader(ang, tx, ty, label) {
    var px0 = ang.cx + Math.cos(ang.a) * ang.r, py0 = ang.cy + Math.sin(ang.a) * ang.r;
    ln(px0, py0, tx - 8, ty - 11, 2, DIM); head(px0, py0, px0 - (tx - 8), py0 - (ty - 11)); ln(tx - 8, ty - 11, tx + label.length * 20 + 6, ty - 11, 2, DIM); text(label, tx, ty, 32, DIM, 'left');
  }
  leader({ cx: cx, cy: cy, r: bR, a: -0.55 }, FX + fw + 20, topY + 40, 'Ø36');
  leader({ cx: cx, cy: cy, r: kR, a: -0.25 }, FX + fw + 20, topY + 118, 'Ø20');
  leader({ cx: cx + hx, cy: cy, r: hR, a: 0.5 }, FX + fw + 20, topY + 196, '2×Ø8');

  /* title block */
  var tx = 540, ty = 614, tw = 454, thh = 80;
  rect(tx, ty, tw, thh, 3, INK); ln(tx, ty + 42, tx + tw, ty + 42, 2, INK); ln(tx + 250, ty + 42, tx + 250, ty + thh, 2, INK);
  text('FLANGED BOSS PLATE', tx + 14, ty + 32, 32, INK, 'left');
  text('MILD STEEL, mm', tx + 14, ty + 69, 25, INK, 'left'); text('SCALE 2 : 1', tx + 264, ty + 69, 25, INK, 'left');
  text('THIRD ANGLE', 40, 640, 25, INK, 'left'); text('EXAMPLE DRAWING', 40, 672, 25, CEN, 'left'); text('INVENTED PART', 40, 700, 20, INK, 'left');
  /* sheet corner marks */
  [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].forEach(function (p) { ln(p[0] - 14, p[1], p[0] + 14, p[1], 2, INK); ln(p[0], p[1] - 14, p[0], p[1] + 14, 2, INK); });
  return mipTex(T, c);
}

/* ---------- props ---------- */

/* flat combination wrench: ring end at the origin, open end up. L = distance between the two centres. Extruded t thick. */
function wrenchGeo(T, L, w, t) {
  var rb = w * 0.95, ro = w * 1.0, sw = w * 0.62, sd = w * 0.8, sh = new T.Shape(), hs = rb * 0.55, i, a;
  var dB = Math.asin((w / 2) / rb), dO = Math.asin((w / 2) / ro), dM = Math.asin((sw / 2) / ro), n = 14, pts = [];
  /* ring end, counter-clockwise from the left join, round the bottom, to the right join */
  for (i = 0; i <= n; i++) { a = PI / 2 + dB + (2 * PI - 2 * dB) * i / n; pts.push([Math.cos(a) * rb, Math.sin(a) * rb]); }
  /* right edge of the shaft, then round the open end up to the mouth */
  for (i = 0; i <= 10; i++) { a = -PI / 2 + dO + (PI - dO - dM) * i / 10; pts.push([Math.cos(a) * ro, L + Math.sin(a) * ro]); }
  pts.push([sw / 2, L + ro * Math.cos(dM) - sd], [-sw / 2, L + ro * Math.cos(dM) - sd]);
  for (i = 0; i <= 10; i++) { a = PI / 2 + dM + (PI - dO - dM) * i / 10; pts.push([Math.cos(a) * ro, L + Math.sin(a) * ro]); }
  sh.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
  var hole = new T.Path(); for (i = 0; i < 6; i++) { a = i / 6 * 2 * PI + PI / 6; if (i) hole.lineTo(Math.cos(a) * hs, Math.sin(a) * hs); else hole.moveTo(Math.cos(a) * hs, Math.sin(a) * hs); } hole.closePath(); sh.holes.push(hole);
  var g = new T.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2); return g;
}

/* a spur gear plate: extruded outline with lightening holes in the web, spanning z = 0..thick */
function gearGeo(T, N, m, thick) {
  var pts = gearOutline(N, m), sh = new T.Shape(), i, r = m * N / 2, rf = r - 1.25 * m;
  sh.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
  var hub = Math.max(0.95, 0.26 * r), rimIn = rf - Math.max(0.55, 0.13 * r);
  if (N >= 22) {
    var nh = N >= 30 ? 6 : 5, rc = (hub + rimIn) / 2 + 0.1, hr = Math.min((rimIn - hub) / 2 - 0.28, rc * Math.sin(PI / nh) - 0.3), k, p;
    if (hr > 0.35) for (k = 0; k < nh; k++) { p = new T.Path(); p.absarc(Math.cos(k / nh * 2 * PI + 0.3) * rc, Math.sin(k / nh * 2 * PI + 0.3) * rc, hr, 0, 2 * PI, true); sh.holes.push(p); }
  }
  return new T.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false, curveSegments: 10 });
}

function binGeo(T, w, h, d, hf) {
  /* wedge bin seen from the side: low front lip, sloping open face, tall back. Shape x = depth from the front, extruded along the width. */
  var sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(d, 0); sh.lineTo(d, h); sh.lineTo(d - 0.3, h); sh.lineTo(0.35, hf); sh.lineTo(0, hf); sh.closePath();
  var g = new T.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); return g;
}

/* A hard hat hung on a wall peg, opening toward the wall: crown, ridge, a flat brim all round and a peak at the bottom.
   (x, y, z) is the centre of the rim; ry swings it a little so the crown reads as a hat and not a ball. */
function addHat(B, x, y, z, col, ry) {
  var T = B.T, shadeCol = new T.Color(col).multiplyScalar(0.8);
  B.push(mx(T, x, y, z, 0, ry, 0)); {
    B.add(new T.SphereGeometry(1, 22, 12, 0, 2 * PI, 0, PI / 2), mx(T, 0, 0, 0, PI / 2, 0, 0, 1.75, 1.45, 1.9), col);
    B.add(new T.CylinderGeometry(1, 1, 0.16, 26), mx(T, 0, 0, 0.05, PI / 2, 0, 0, 2.15, 1, 2.3), shadeCol);
    /* a ridge along the crown: half a torus turned into the yz plane and squashed to the dome's depth */
    B.add(new T.TorusGeometry(1.9, 0.17, 6, 16, PI), mx(T, 0, 0, 0, 0, 0, 0, 1, 1, 0.76).multiply(new T.Matrix4().makeRotationY(-PI / 2)).multiply(new T.Matrix4().makeRotationZ(-PI / 2)), shadeCol);
    B.add(new T.CylinderGeometry(1, 1, 0.16, 18, 1, false, -PI / 2, PI), mx(T, 0, -2.0, 0.7, 0.28, 0, 0, 1.9, 1, 1.5), col);
    B.cyl(0.2, 0.2, 2.0, 0, 1.45, -0.6, IRON, PI / 2, 0, 0, 8);
  } B.pop();
}

function addGlasses(B, x, y, z) {   /* hung by the bridge on a peg at (x, y, z) */
  B.cyl(0.14, 0.14, 1.0, x, y, z + 0.1, IRON, PI / 2, 0, 0, 8);
  B.box(3.4, 0.2, 0.22, x, y - 0.42, z + 0.62, '#23272b');
  [-1, 1].forEach(function (sd) {
    B.ball(0.86, x + sd * 0.92, y - 1.15, z + 0.6, '#23272b', 1, 0.8, 0.14);
    B.ball(0.72, x + sd * 0.92, y - 1.15, z + 0.72, '#8ba3a9', 1, 0.78, 0.12);
    B.box(0.16, 0.16, 1.3, x + sd * 1.8, y - 0.55, z + 0.05, YEL);
  });
  B.box(0.5, 0.14, 0.14, x, y - 0.95, z + 0.66, '#23272b');
}

/* ---------- the room ---------- */

ENV.workshop = function (T) {
  var g = new T.Group(), i, j, r = mulberry(7);
  var S = makeBake(T); S.T = T;
  var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function shade(x, y, z, w, d, op) { var m = K.contactShadow(T, g, x, y, z, w, d, op); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2; m.material.polygonOffsetUnits = -4; return m; }

  g.add(new T.HemisphereLight(0xfff1de, 0x55565a, 0.45));
  var key = new T.DirectionalLight(0xffe8cc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xdde6f0, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe4c0, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---- shell: concrete floor, painted brick wall with a concrete curb ---- */
  var floor = new T.Mesh(new T.PlaneGeometry(120, 80), new T.MeshStandardMaterial({ map: floorTex(T), roughness: 0.92, metalness: 0 }));
  floor.rotation.x = -PI / 2; floor.position.set(0, FLOOR, 21); g.add(floor);

  var wg = new T.PlaneGeometry(150, 54, 15, 9), wc = [], wp = wg.attributes.position, tz;
  for (i = 0; i < wp.count; i++) {
    tz = (wp.getY(i) + 27) / 54;   /* 0 at the floor, 1 at the top */
    var lv = (0.74 + 0.34 * Math.sin(Math.min(1, tz * 1.6) * PI * 0.5)) * (tz > 0.55 ? 1 - (tz - 0.55) * 0.55 : 1) * (0.94 + r() * 0.1);
    wc.push(lv * 1.0, lv * 0.99, lv * 0.96);
  }
  wg.setAttribute('color', new T.Float32BufferAttribute(wc, 3));
  var wall = new T.Mesh(wg, new T.MeshBasicMaterial({ map: brickTex(T), vertexColors: true })); wall.position.set(0, 14, ZW); g.add(wall);
  S.box(150, 1.1, 0.7, 0, FLOOR + 0.55, ZW + 0.2, '#74767a');                                              /* curb */
  S.cyl(0.32, 0.32, 150, 0, 24.2, ZW + 0.6, '#565a5f', 0, 0, PI / 2, 10);                                     /* conduit run along the wall */
  for (i = -3; i <= 3; i++) { S.box(0.9, 0.9, 0.5, i * 20 + 4, 24.2, ZW + 0.3, '#44484d'); }
  S.box(2.4, 2.2, 0.9, -45, 24.2, ZW + 0.5, '#4a4e53'); S.box(2.4, 2.2, 0.9, 52, 24.2, ZW + 0.5, '#4a4e53');

  /* ---- the bench: heavy steel top with a yellow safety edge, box-section frame and a lower shelf ---- */
  var BX0 = -31, BX1 = 31, BZ0 = -12.5, BZ1 = 16, TH = 0.8, bcz = (BZ0 + BZ1) / 2;
  var tm = new T.MeshStandardMaterial({ map: steelTex(T), roughness: 0.82, metalness: 0 }), tg = new T.MeshStandardMaterial({ color: '#555a60', roughness: 0.85 }), ty = new T.MeshStandardMaterial({ color: YEL, roughness: 0.85 });
  var plate = new T.Mesh(new T.BoxGeometry(BX1 - BX0, TH, BZ1 - BZ0), [tg, tg, tm, tg, ty, tg]); plate.position.set(0, TOP - TH / 2, bcz); g.add(plate);
  var AP = TOP - TH - 0.7;
  S.box(BX1 - BX0, 1.1, 0.4, 0, TOP + 0.55 - 0.0, BZ0 + 0.3, '#4f5459'); S.box(BX1 - BX0, 0.16, 0.44, 0, TOP + 1.18, BZ0 + 0.3, YEL);   /* upstand along the back edge */
  S.box(BX1 - BX0 - 3, 1.4, 0.5, 0, AP, BZ0 + 1.1, IRON); S.box(BX1 - BX0 - 3, 1.4, 0.5, 0, AP, BZ1 - 1.1, IRON);
  S.box(0.5, 1.4, BZ1 - BZ0 - 3, BX0 + 1.5, AP, bcz, IRON); S.box(0.5, 1.4, BZ1 - BZ0 - 3, BX1 - 1.5, AP, bcz, IRON);
  var LEGH = TOP - TH - FLOOR - 0.35, LEGY = FLOOR + 0.35 + LEGH / 2;
  [[BX0 + 1.5, BZ0 + 1.1], [BX1 - 1.5, BZ0 + 1.1], [BX0 + 1.5, BZ1 - 1.1], [BX1 - 1.5, BZ1 - 1.1]].forEach(function (p) {
    S.box(1.6, LEGH, 1.6, p[0], LEGY, p[1], IRON); S.box(2.4, 0.35, 2.4, p[0], FLOOR + 0.175, p[1], IRON); S.cyl(0.4, 0.4, 0.3, p[0], FLOOR + 0.5, p[1], '#6a7076', 0, 0, 0, 8);
  });
  S.box(BX1 - BX0 - 3, 0.35, BZ1 - BZ0 - 3, 0, FLOOR + 3.2, bcz, '#4c5258');   /* lower shelf */
  S.box(BX1 - BX0 - 3, 0.5, 0.3, 0, FLOOR + 3.5, BZ1 - 1.2, '#4c5258'); S.box(BX1 - BX0 - 3, 0.5, 0.3, 0, FLOOR + 3.5, BZ0 + 1.2, '#4c5258');
  var SHT = FLOOR + 3.375;                                                                                                          /* totes under the bench */
  S.box(5, 3.0, 4.2, -14, SHT + 1.5, 4, '#6f757b'); S.box(5.2, 0.5, 4.4, -14, SHT + 3.25, 4, '#4a5056');
  S.box(6, 3.4, 4.2, 8, SHT + 1.7, 6, YELD); S.box(6.2, 0.5, 4.4, 8, SHT + 3.65, 6, '#8f6f10'); S.box(4.4, 2.4, 3.6, 22, SHT + 1.2, 3, REDD);
  shade(0, FLOOR + 0.04, bcz, 80, 46, 0.5);

  /* labels and signs: one atlas */
  var A = makeAtlas(T), D = makeDecals(T);
  var labelNames = ['M6 BOLTS', 'WASHERS', 'BEARINGS', 'M8 NUTS', 'SHAFTS', 'BRACKETS', 'SPRINGS', 'SPARES', 'PINS', 'O-RINGS', 'KEYS', 'CLIPS'], lab = {};
  labelNames.forEach(function (name, k) {
    lab[name] = A.cell(256, 96, function (x, w, h) {
      x.fillStyle = '#d7d1bd'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2d31'; x.lineWidth = 5; x.strokeRect(4, 4, w - 8, h - 8);
      fitText(x, name, w - 30, 54, '700'); x.fillStyle = '#1b1f24'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, h / 2 + 3);
      x.fillStyle = k % 3 === 0 ? RED : (k % 3 === 1 ? YEL : '#4e545a'); x.fillRect(4, 4, w - 8, 9);
    });
  });
  var cSign = A.cell(512, 176, function (x, w, h) {
    x.fillStyle = '#cfa31b'; x.fillRect(0, 0, w, h); x.fillStyle = '#16181b'; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14);
    for (var k = -2; k < 18; k++) { x.fillStyle = '#cfa31b'; x.beginPath(); x.moveTo(k * 30, 0); x.lineTo(k * 30 + 15, 0); x.lineTo(k * 30 + 1, 14); x.lineTo(k * 30 - 14, 14); x.fill(); }
    x.fillStyle = '#16181b'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitText(x, 'HARD HAT ZONE', w - 40, 56, '700'); x.fillText('HARD HAT ZONE', w / 2, 62);
    fitText(x, 'EYE PROTECTION', w - 40, 50, '700'); x.fillText('EYE PROTECTION', w / 2, 120);
  });
  var tr = layoutTrain(TRAIN, GM);
  var plaqueLines = ['SPUR GEAR TRAIN', TRAIN[0].N + 'T DRIVES ' + TRAIN[1].N + 'T', 'SPEED RATIO ~' + (TRAIN[0].N / TRAIN[1].N).toFixed(2) + ' : 1'];
  var cPlaque = A.cell(640, 200, function (x, w, h) {
    x.fillStyle = '#25292d'; x.fillRect(0, 0, w, h); x.strokeStyle = '#cfa31b'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e4dfcf'; fitText(x, plaqueLines[0], w - 60, 56, '700'); x.fillText(plaqueLines[0], w / 2, 52);
    fitText(x, plaqueLines[2], w - 60, 40, '700'); x.fillStyle = '#d7d2c2'; x.fillText(plaqueLines[1], w / 2, 108); x.fillText(plaqueLines[2], w / 2, 156);
  });
  var cScale = A.cell(512, 64, function (x, w, h) {
    x.fillStyle = '#b9bec2'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1e2226'; x.fillStyle = '#1e2226'; x.lineWidth = 2;
    for (var k = 0; k <= 50; k++) { var tx = 14 + k * 9.6, long = k % 10 === 0, mid = k % 5 === 0; x.beginPath(); x.moveTo(tx, h - 4); x.lineTo(tx, h - (long ? 30 : (mid ? 22 : 14))); x.stroke(); if (long) { x.font = '700 15px Menlo, monospace'; x.textAlign = 'center'; x.fillText(String(k / 10 * 2), tx, 16); } }
  });

  /* ---- the vise, bolted to the far right corner of the bench ---- */
  S.push(S.mx(27.4, TOP, -8.3, 0, 0, 0)); {
    var VB = '#4d5256', VBD = '#30343a';
    S.box(5.2, 0.35, 7.2, 0, 0.175, 0, VBD);
    [[-2.1, -3.0], [2.1, -3.0], [-2.1, 3.0], [2.1, 3.0]].forEach(function (p) { S.cyl(0.32, 0.32, 0.28, p[0], 0.49, p[1], STEELD, 0, 0, 0, 6); });
    S.cyl(2.0, 2.0, 0.5, 0, 0.6, -0.6, VBD, 0, 0, 0, 20);
    S.box(2.2, 1.1, 6.2, 0, 1.4, -0.2, VB); S.box(3.4, 2.1, 1.5, 0, 1.9, -2.55, VB);
    S.box(3.1, 1.0, 0.22, 0, 2.4, -1.69, '#8a9096');
    S.box(3.4, 2.1, 1.3, 0, 1.9, 0.69, VB); S.box(3.1, 1.0, 0.22, 0, 2.4, -0.07, '#8a9096');
    S.box(2.6, 0.5, 1.1, 0, 3.2, -2.75, VB);
    S.box(1.4, 1.4, 0.5, 0, 1.4, 3.15, VB);
    S.cyl(0.28, 0.28, 1.4, 0, 1.4, 3.9, STEEL, PI / 2, 0, 0, 10);
    S.cyl(0.17, 0.17, 4.4, 0, 1.4, 4.45, STEEL, 0, 0, PI / 2, 8);
    S.ball(0.34, -2.2, 1.4, 4.45, RED); S.ball(0.34, 2.2, 1.4, 4.45, RED);
    S.box(1.0, 4.0, 1.34, 0, 2.9, -0.88, '#767c82');                                                          /* a bar held in the jaws */
  } S.pop();
  shade(27.4, TOP + 0.03, -7.8, 7.6, 9.6, 0.5);

  /* ---- toolbox ---- */
  S.push(S.mx(-25.5, TOP, -7.4, 0, 0.1, 0)); {
    S.box(9.6, 3.6, 4.0, 0, 1.8, 0, RED); S.box(9.8, 1.1, 4.2, 0, 4.15, 0, '#932b25');
    S.box(0.3, 0.9, 0.3, -2.3, 5.15, 0, IRON); S.box(0.3, 0.9, 0.3, 2.3, 5.15, 0, IRON); S.box(4.9, 0.3, 0.3, 0, 5.7, 0, IRON);
    S.box(0.9, 1.3, 0.22, -3.3, 3.7, 2.15, STEEL); S.box(0.9, 1.3, 0.22, 3.3, 3.7, 2.15, STEEL);
    S.box(9.0, 0.22, 0.14, 0, 1.2, 2.06, REDD); S.box(9.0, 0.22, 0.14, 0, 2.4, 2.06, REDD);
    S.box(0.4, 3.2, 0.3, -4.7, 1.8, 2.1, REDD); S.box(0.4, 3.2, 0.3, 4.7, 1.8, 2.1, REDD);
  } S.pop();
  shade(-25.5, TOP + 0.03, -7.2, 12, 6.6, 0.5);

  /* ---- I-beam display piece: a short length lying with its section toward the viewer ---- */
  S.push(S.mx(-15.8, TOP, -5.4, 0, 0.3, 0)); {
    var ib = new T.Shape(), pts = [[-1.7, -1.5], [1.7, -1.5], [1.7, -1.15], [0.16, -1.15], [0.16, 1.15], [1.7, 1.15], [1.7, 1.5], [-1.7, 1.5], [-1.7, 1.15], [-0.16, 1.15], [-0.16, -1.15], [-1.7, -1.15]];
    ib.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < pts.length; i++) ib.lineTo(pts[i][0], pts[i][1]); ib.closePath();
    S.add(new T.ExtrudeGeometry(ib, { depth: 5.6, bevelEnabled: false }), S.mx(0, 1.5, -2.8, 0, 0, 0), function (lx, ly, lz, nx, ny, nz) { return nz > 0.9 ? '#b4a02c' : '#6f757b'; });
  } S.pop();
  shade(-15.8, TOP + 0.03, -5.4, 6.8, 7.4, 0.5);

  /* ---- calipers ---- */
  S.push(S.mx(-24.4, TOP, 3.2, 0, 0.5, 0)); {
    var CAL = '#9aa0a5';
    S.box(5.6, 0.14, 0.62, 2.8, 0.07, 0, CAL);
    S.box(0.2, 0.14, 1.9, 0.1, 0.07, 0.645, CAL); S.box(0.2, 0.14, 0.8, 0.1, 0.07, -0.71, CAL);
    S.box(1.3, 0.3, 0.8, 1.9, 0.15, 0, '#868c91'); S.box(0.2, 0.14, 1.5, 1.25, 0.07, 0.85, CAL);
    S.cyl(0.2, 0.2, 0.1, 2.35, 0.34, 0, '#2d3236', 0, 0, 0, 12); S.cyl(0.12, 0.12, 0.1, 1.65, 0.34, 0, '#2d3236', 0, 0, 0, 8);
    D.push(S.mx(-24.4, TOP, 3.2, 0, 0.5, 0)); D.quad(2.95, 0.3, cScale, S.mx(4.0, 0.158, -0.08, -PI / 2, 0, 0)); D.pop();
  } S.pop();
  shade(-23.2, TOP + 0.03, 3.1, 6.6, 3.2, 0.4);

  /* ---- micrometer ---- */
  S.push(S.mx(-18.2, TOP, 6.8, 0, -0.25, 0)); {
    var fs = new T.Shape(), ro = 1.2, ri = 0.88, a0 = -20 * PI / 180, a1 = 200 * PI / 180, q;
    for (q = 0; q <= 20; q++) { var aa = a0 + (a1 - a0) * q / 20; if (q) fs.lineTo(Math.cos(aa) * ro, Math.sin(aa) * ro); else fs.moveTo(Math.cos(aa) * ro, Math.sin(aa) * ro); }
    for (q = 20; q >= 0; q--) { var ab = a0 + (a1 - a0) * q / 20; fs.lineTo(Math.cos(ab) * ri, Math.sin(ab) * ri); }
    fs.closePath();
    S.add(new T.ExtrudeGeometry(fs, { depth: 0.6, bevelEnabled: false }), S.mx(0, 0, 0, -PI / 2, 0, 0), '#6f757b');
    var mz = 0.36, my = 0.33;
    S.cyl(0.11, 0.11, 0.7, -0.62, my, mz, '#979da2', 0, 0, PI / 2, 10); S.cyl(0.1, 0.1, 1.05, 0.5, my, mz, '#979da2', 0, 0, PI / 2, 10);
    S.cyl(0.22, 0.22, 1.45, 1.68, my, mz, '#a3a9ad', 0, 0, PI / 2, 14); S.cyl(0.33, 0.33, 1.3, 2.25, my, mz, '#8b9196', 0, 0, PI / 2, 16);
    S.cyl(0.26, 0.26, 0.5, 3.15, my, mz, '#2d3236', 0, 0, PI / 2, 12); S.cyl(0.335, 0.335, 0.08, 1.64, my, mz, '#3a3f44', 0, 0, PI / 2, 16);
    for (q = 0; q < 12; q++) S.box(0.014, 0.012, 0.2, 1.05 + q * 0.045, my + 0.222, mz, '#2a2e32');
  } S.pop();
  shade(-17.0, TOP + 0.03, 6.8, 6.6, 3.0, 0.4);

  /* ---- low things along the front edge of the bench, clear of the model: a steel rule, a try square, a notepad and a pencil ---- */
  S.push(S.mx(-6.5, TOP, 13.4, 0, 0.06, 0)); {
    S.box(7.2, 0.1, 0.8, 0, 0.05, 0, '#8d9398');
    D.push(S.mx(-6.5, TOP, 13.4, 0, 0.06, 0)); D.quad(6.9, 0.62, cScale, S.mx(0, 0.108, 0, -PI / 2, 0, 0)); D.pop();
  } S.pop();
  S.push(S.mx(3.2, TOP, 13.0, 0, -0.3, 0)); {
    S.box(0.6, 0.34, 2.8, -1.5, 0.17, 0, '#6b4a2c'); S.box(4.6, 0.08, 0.5, 0.65, 0.04, 1.15, '#8d9398');
  } S.pop();
  S.push(S.mx(9.6, TOP, 12.6, 0, 0.35, 0)); {
    S.box(3.2, 0.22, 4.2, 0, 0.11, 0, '#d4cdb2'); S.box(3.2, 0.1, 0.5, 0, 0.27, -1.85, '#2f3438');
    for (i = 0; i < 6; i++) S.box(2.6, 0.012, 0.03, 0, 0.226, -1.1 + i * 0.6, '#9fb4c4');
    S.cyl(0.11, 0.11, 3.4, 2.1, 0.11, -0.4, YEL, PI / 2, 0, 0.35, 6); S.cyl(0.0, 0.11, 0.35, 2.1 - 0.28, 0.11, 1.35, '#c9a37a', PI / 2, 0, 0.35, 6);
  } S.pop();
  shade(-6.5, TOP + 0.03, 13.4, 8.4, 1.8, 0.4); shade(3.0, TOP + 0.03, 13.2, 5.6, 3.6, 0.35); shade(9.6, TOP + 0.03, 12.6, 5, 5.4, 0.4);

  /* ---- wrench rack on the back of the bench: 9 combination wrenches leaning on a back board ---- */
  var WL = [2.8, 3.1, 3.5, 3.9, 4.3, 4.8, 5.3, 5.8, 6.3], wx = [], cursor = 0, wr = [], rackW;
  for (i = 0; i < WL.length; i++) { var ww = 0.2 + 0.03 * WL[i]; wr.push(ww); wx.push(cursor + ww * 1.0); cursor += ww * 2.0 + 0.5; }
  rackW = cursor + 0.6;
  S.push(S.mx(18.3, TOP, -10.4, 0, 0, 0)); {
    S.box(rackW, 0.5, 2.2, 0, 0.25, 0, IRON); S.box(rackW, 6.6, 0.3, 0, 3.3, -1.15, IRON); S.box(0.35, 6.6, 2.4, -rackW / 2 + 0.17, 3.3, -0.1, IRON); S.box(0.35, 6.6, 2.4, rackW / 2 - 0.17, 3.3, -0.1, IRON);
    S.box(rackW, 0.22, 2.2, 0, 0.61, 0, YEL);
    for (i = 0; i < WL.length; i++) {
      var tilt = Math.asin(clamp(1.1 / (WL[i] + wr[i]), 0, 0.5));
      S.add(wrenchGeo(T, WL[i], wr[i], 0.14), S.mx(-rackW / 2 + 0.5 + wx[i] + 0.0, 0.5 + wr[i] * 0.95 * Math.cos(tilt), 0.0, -tilt, 0, 0), i % 2 ? '#8c9297' : '#7f858b');
    }
  } S.pop();
  shade(18.3, TOP + 0.03, -10.3, rackW + 1.5, 4.2, 0.45);

  /* ---- truss section, lying on the bench ---- */
  S.push(S.mx(20.5, TOP, 7.6, 0, -0.12, 0)); {
    var tz2 = [-0.55, 0.55], nb = [0, 2, 4, 6], nt = [1, 3, 5], TR = YEL;
    tz2.forEach(function (zz) {
      S.rod([0, 0.1, zz], [6, 0.1, zz], 0.09, TR); S.rod([0, 1.7, zz], [6, 1.7, zz], 0.09, TR);
      S.rod([0, 0.1, zz], [0, 1.7, zz], 0.07, TR); S.rod([6, 0.1, zz], [6, 1.7, zz], 0.07, TR);
      for (i = 0; i < 6; i++) S.rod([i, i % 2 ? 1.7 : 0.1, zz], [i + 1, i % 2 ? 0.1 : 1.7, zz], 0.06, TR);
    });
    for (i = 0; i <= 6; i += 2) { S.rod([i, 0.1, -0.55], [i, 0.1, 0.55], 0.06, TR); }
    for (i = 1; i <= 5; i += 2) { S.rod([i, 1.7, -0.55], [i, 1.7, 0.55], 0.06, TR); }
    nb.concat(nt).forEach(function (n) { S.ball(0.14, n, n % 2 ? 1.7 : 0.1, -0.55, '#8e6d10'); S.ball(0.14, n, n % 2 ? 1.7 : 0.1, 0.55, '#8e6d10'); });
  } S.pop();
  shade(23.5, TOP + 0.03, 7.4, 8.2, 3.6, 0.4);

  /* ---- small things on the bench: oil can, a rag ---- */
  S.cyl(0.6, 0.6, 1.0, 29.0, TOP + 0.5, 6.4, '#a2322b', 0, 0, 0, 14); S.cyl(0.18, 0.62, 0.45, 29.0, TOP + 1.22, 6.4, '#a2322b', 0, 0, 0, 14);
  S.rod([29.0, TOP + 1.3, 6.4], [30.0, TOP + 2.2, 6.4], 0.07, STEELD, 6); S.ball(0.1, 30.0, TOP + 2.2, 6.4, STEELD);
  S.ball(0.9, 12.6, TOP + 0.28, 9.6, '#6f2c27', 1.3, 0.32, 1.0); S.ball(0.9, 13.5, TOP + 0.3, 9.9, '#6f6f6a', 1.1, 0.34, 0.9); S.ball(0.8, 12.8, TOP + 0.5, 10.2, '#7a322c', 1.0, 0.3, 0.9);
  shade(29, TOP + 0.03, 6.4, 2.6, 2.6, 0.4); shade(13, TOP + 0.03, 9.8, 4.4, 3.2, 0.4);

  /* ---- gear wall: every gear is a separate axle group so the whole train can turn ---- */
  var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  tr.forEach(function (gr) { var ro2 = gr.r + GM; minx = Math.min(minx, gr.x - ro2); maxx = Math.max(maxx, gr.x + ro2); miny = Math.min(miny, gr.y - ro2); maxy = Math.max(maxy, gr.y + ro2); });
  var MG = 1.3, PW = maxx - minx + 2 * MG, PH = maxy - miny + 2 * MG, PX = -7.6 - (maxx + MG), PY = 0.8 - (miny - MG);   /* origin of the train in the room */
  var panelCX = PX + (minx + maxx) / 2, panelCY = PY + (miny + maxy) / 2;
  S.box(PW, PH, 0.9, panelCX, panelCY, -18.55, '#3e4348');                                                    /* backing board; its back stays inside the wall */
  S.box(PW + 0.8, 0.4, 1.1, panelCX, panelCY + PH / 2 + 0.2, -18.45, YEL); S.box(PW + 0.8, 0.4, 1.1, panelCX, panelCY - PH / 2 - 0.2, -18.45, YEL);
  S.box(0.4, PH, 1.1, panelCX - PW / 2 - 0.2, panelCY, -18.45, YEL); S.box(0.4, PH, 1.1, panelCX + PW / 2 + 0.2, panelCY, -18.45, YEL);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { S.cyl(0.4, 0.4, 0.3, panelCX + c[0] * (PW / 2 - 0.7), panelCY + c[1] * (PH / 2 - 0.7), -18.1, STEELD, PI / 2, 0, 0, 6); });
  var ZB = -18.1, T0 = -17.6, TH2 = 0.9, T1 = -15.8;   /* board front, layer-0 back, plate thickness, layer-1 back */
  var gearMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }), axles = [], hasFront = {};
  TRAIN.forEach(function (gd, k) { if (gd.on != null) hasFront[gd.on] = true; });
  tr.forEach(function (gr, k) {
    var B = makeBake(T), zb = gr.layer ? T1 : T0, zf = zb + TH2, hub = Math.max(0.95, 0.26 * gr.r);
    B.add(gearGeo(T, gr.N, GM, TH2), mx(T, 0, 0, zb), gr.col);
    if (gr.coax) { /* sits in front of its partner, which is joined by a spacer */ }
    if (hasFront[k]) B.cyl(hub * 0.8, hub * 0.8, T1 - zf, 0, 0, (zf + T1) / 2, '#6b7177', PI / 2, 0, 0, 14);
    else { B.cyl(hub, hub, 0.45, 0, 0, zf + 0.22, '#7b8187', PI / 2, 0, 0, 16); B.cyl(0.52, 0.52, 0.3, 0, 0, zf + 0.6, STEELD, PI / 2, 0, 0, 6); }
    var axle = new T.Group(); axle.position.set(PX + gr.x, PY + gr.y, 0); axle.rotation.z = gr.psi0; axle.add(B.mesh(gearMat)); g.add(axle); axles.push(axle);
    /* standoff from the board to the plate that is mounted on the board */
    if (!gr.coax) S.cyl(0.55, 0.55, zb - ZB, PX + gr.x, PY + gr.y, (zb + ZB) / 2, IRON, PI / 2, 0, 0, 10);
  });
  /* data plate on the board, in the free corner */
  var plW = 8.4, plH = plW * 200 / 640, plx = panelCX + PW / 2 - plW / 2 - 0.9, ply = panelCY - PH / 2 + plH / 2 + 0.9;
  S.box(plW + 0.3, plH + 0.3, 0.3, plx, ply, ZB + 0.15, '#202327'); D.quad(plW, plH, cPlaque, S.mx(plx, ply, ZB + 0.33, 0, 0, 0));

  /* ---- pinned drawing: board, sheet, red pins ---- */
  var DX = 17.6, DY = 11.4, SW = 18, SH = 12.73, dTex = drawingTex(T);
  S.box(SW + 1.5, SH + 1.5, 0.6, DX, DY, ZW + 0.3, '#464b50');
  S.box(SW + 1.9, 0.3, 0.7, DX, DY + SH / 2 + 0.85, ZW + 0.35, YEL); S.box(SW + 1.9, 0.3, 0.7, DX, DY - SH / 2 - 0.85, ZW + 0.35, YEL);
  S.box(0.3, SH + 1.5, 0.7, DX - SW / 2 - 0.85, DY, ZW + 0.35, YEL); S.box(0.3, SH + 1.5, 0.7, DX + SW / 2 + 0.85, DY, ZW + 0.35, YEL);
  var sheet = new T.Mesh(new T.BoxGeometry(SW, SH, 0.1), [new T.MeshStandardMaterial({ color: '#cfc9b6', roughness: 0.9 }), new T.MeshStandardMaterial({ color: '#cfc9b6', roughness: 0.9 }), new T.MeshStandardMaterial({ color: '#cfc9b6', roughness: 0.9 }), new T.MeshStandardMaterial({ color: '#cfc9b6', roughness: 0.9 }), new T.MeshBasicMaterial({ map: dTex }), new T.MeshStandardMaterial({ color: '#cfc9b6', roughness: 0.9 })]);
  sheet.position.set(DX, DY, ZW + 0.7); g.add(sheet);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { S.cyl(0.36, 0.36, 0.24, DX + c[0] * (SW / 2 - 0.55), DY + c[1] * (SH / 2 - 0.55), ZW + 0.95, RED, PI / 2, 0, 0, 10); S.cyl(0.13, 0.13, 0.8, DX + c[0] * (SW / 2 - 0.55), DY + c[1] * (SH / 2 - 0.55), ZW + 0.95, STEELD, PI / 2, 0, 0, 6); });

  /* ---- PPE: hats on pegs, glasses on hooks, a sign ---- */
  var PXC = 0.4;
  S.box(14.0, 0.6, 0.4, PXC, 14.5, ZW + 0.2, IRON); S.box(11.0, 0.6, 0.4, PXC, 9.3, ZW + 0.2, IRON);
  addHat(S, PXC - 4.5, 13.0, ZW + 1.3, YEL, 0.5); addHat(S, PXC, 13.0, ZW + 1.3, '#c3c5c2', -0.45); addHat(S, PXC + 4.5, 13.0, ZW + 1.3, RED, 0.4);
  addGlasses(S, PXC - 2.6, 9.3, ZW + 0.55); addGlasses(S, PXC + 2.6, 9.3, ZW + 0.55);
  S.box(11.2, 3.84, 0.3, PXC, 17.7, ZW + 0.15, '#26292d'); D.quad(11, 3.75, cSign, S.mx(PXC, 17.7, ZW + 0.33, 0, 0, 0));

  /* ---- steel shelving with labelled bins and boxes ---- */
  var SX = 35.6, SWD = 13.4, SDZ = -16.5, DK = [-8.6, -0.5, 7.6, 15.7], DKY = 24.4;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { S.box(0.7, DKY - FLOOR, 0.7, SX + c[0] * (SWD / 2 - 0.35), (DKY + FLOOR) / 2, SDZ + c[1] * 2.0, IRON); });
  DK.forEach(function (dy, k) {
    S.box(SWD, 0.22, 4.4, SX, dy - 0.11, SDZ, '#5c6268');
    S.box(SWD, 0.7, 0.3, SX, dy - 0.58, SDZ + 2.15, YEL); S.box(SWD, 0.7, 0.3, SX, dy - 0.58, SDZ - 2.15, YEL);
  });
  S.box(SWD, 0.7, 0.3, SX, DKY - 0.35, SDZ + 2.15, YEL); S.box(SWD, 0.7, 0.3, SX, DKY - 0.35, SDZ - 2.15, YEL);
  S.rod([SX - SWD / 2 + 0.4, FLOOR + 0.5, SDZ - 2.0], [SX + SWD / 2 - 0.4, DK[1] - 0.5, SDZ - 2.0], 0.1, '#4a4f55', 6);
  shade(SX, FLOOR + 0.04, SDZ, SWD + 3, 7.6, 0.5);
  var binCol = [YEL, '#6c7278', RED, '#8f959b'];
  function bin(bx, dy, w, h, d, col, name) {
    var z0 = SDZ + 1.75, hf = h * 0.5;
    S.add(binGeo(T, w, h, d, hf), S.mx(bx, dy, z0, 0, PI / 2, 0), function (lx, ly, lz, nx, ny, nz) { return (ny > 0.35 && ny < 0.97 && nx < -0.2) ? '#2e3236' : col; });
    D.quad(w * 0.82, w * 0.82 * 96 / 256, lab[name], S.mx(bx, dy + hf * 0.5, z0 + 0.06, 0, 0, 0));
  }
  [['M6 BOLTS', 0], ['WASHERS', 1], ['BEARINGS', 2], ['M8 NUTS', 3]].forEach(function (b, k) { bin(SX - 4.7 + k * 3.15, DK[3], 2.95, 3.6, 3.6, binCol[k], b[0]); });
  function carton(bx, dy, w, h, d, name, col) {
    S.box(w, h, d, bx, dy + h / 2, SDZ + 1.9 - d / 2, col || KRAFT); S.box(w * 0.18, 0.06, d + 0.02, bx, dy + h + 0.015, SDZ + 1.9 - d / 2, '#c9b387');
    D.quad(w * 0.72, w * 0.72 * 96 / 256, lab[name], S.mx(bx, dy + h * 0.55, SDZ + 1.9 + 0.07, 0, 0, 0));
  }
  carton(SX - 4.4, DK[2], 4.2, 3.9, 3.8, 'SHAFTS'); carton(SX - 0.2, DK[2], 3.4, 3.0, 3.8, 'BRACKETS', KRAFTD); carton(SX + 3.5, DK[2], 3.6, 3.4, 3.8, 'SPARES');
  /* middle shelf: two yellow lidded totes, a red box */
  [[SX - 4.0, 'PINS'], [SX + 0.2, 'O-RINGS']].forEach(function (t) {
    S.box(3.8, 2.8, 3.8, t[0], DK[1] + 1.4, SDZ, '#4c5258'); S.box(4.0, 0.5, 4.0, t[0], DK[1] + 3.05, SDZ, YEL);
    D.quad(2.8, 1.05, lab[t[1]], S.mx(t[0], DK[1] + 1.35, SDZ + 1.9 + 0.07, 0, 0, 0));
  });
  S.box(3.6, 3.4, 3.8, SX + 4.4, DK[1] + 1.7, SDZ, REDD); D.quad(2.7, 1.0, lab['KEYS'], S.mx(SX + 4.4, DK[1] + 1.8, SDZ + 1.9 + 0.07, 0, 0, 0));
  /* bottom shelf: a crate and two buckets */
  S.box(5.2, 3.6, 4.0, SX - 3.6, DK[0] + 1.8, SDZ - 0.1, '#9a7b52'); for (i = 0; i < 3; i++) S.box(5.3, 0.22, 4.1, SX - 3.6, DK[0] + 0.8 + i * 1.1, SDZ - 0.1, '#7d6240');
  S.cyl(1.4, 1.2, 3.2, SX + 2.2, DK[0] + 1.6, SDZ + 0.2, YELD, 0, 0, 0, 18); S.cyl(1.4, 1.4, 0.2, SX + 2.2, DK[0] + 3.2, SDZ + 0.2, '#8c6c10', 0, 0, 0, 18);
  S.cyl(1.2, 1.05, 2.8, SX + 4.9, DK[0] + 1.4, SDZ + 0.3, REDD, 0, 0, 0, 18);

  /* ---- far left: a rolling tool chest and a fire extinguisher; far right: a drafting table and stool ---- */
  S.push(S.mx(-52, FLOOR, -13, 0, 0.08, 0)); {
    S.box(11.4, 15.2, 7.2, 0, 8.5, 0, RED); S.box(12, 0.8, 7.8, 0, 16.5, 0, '#8a2b25');
    for (i = 0; i < 5; i++) { S.box(10.3, 2.4, 0.2, 0, 3.4 + i * 2.7, 3.7, REDD); S.box(4.4, 0.34, 0.5, 0, 4.2 + i * 2.7, 3.9, STEELL); }
    [[-5, -2.6], [5, -2.6], [-5, 2.6], [5, 2.6]].forEach(function (p) { S.cyl(0.55, 0.55, 0.5, p[0], 0.3, p[1], IRON, 0, 0, PI / 2, 12); S.box(0.4, 0.5, 0.4, p[0], 0.8, p[1], IRON); });
    S.box(0.6, 5, 0.6, -5.9, 14.3, -3.9, IRON);
  } S.pop();
  shade(-52, FLOOR + 0.04, -12, 15, 11, 0.5);
  S.cyl(1.0, 1.0, 6.6, -42.5, FLOOR + 3.3, -16.8, RED, 0, 0, 0, 18); S.ball(1.0, -42.5, FLOOR + 6.6, -16.8, RED, 1, 0.55, 1); S.box(0.5, 0.9, 1.0, -42.5, FLOOR + 7.4, -16.8, IRON); S.rod([-42.5, FLOOR + 6.2, -15.9], [-41.2, FLOOR + 3.2, -15.7], 0.12, '#1e2124', 6);
  S.box(1.1, 6.4, 0.3, -42.5, FLOOR + 4.4, -18.7, IRON); shade(-42.5, FLOOR + 0.04, -16.8, 3.6, 3.6, 0.5);

  var DTX = 54, DTZ = -12;
  S.push(S.mx(DTX, FLOOR, DTZ, 0, -0.12, 0)); {
    [-6.2, 6.2].forEach(function (px) { S.box(0.8, 14.2, 0.8, px, 7.1, -1.6, IRON); S.box(0.8, 11.8, 0.8, px, 5.9, 2.6, IRON); S.box(1.2, 0.35, 5.6, px, 0.2, 0.5, IRON); });
    S.box(13.2, 0.7, 0.7, 0, 5.0, -1.6, IRON); S.box(13.2, 0.7, 0.7, 0, 4.0, 2.6, IRON);
  } S.pop();
  var dtG = new T.Group(); dtG.position.set(DTX, FLOOR, DTZ); dtG.rotation.y = -0.12; g.add(dtG);
  var dtB = new T.Group(); dtB.position.set(0, 13.3, 0.6); dtB.rotation.x = 0.5; dtG.add(dtB);
  dtB.add(new T.Mesh(new T.BoxGeometry(14.4, 0.5, 9.4), new T.MeshStandardMaterial({ color: '#7d6d55', roughness: 0.9 })));
  var dtSheet = new T.Mesh(new T.PlaneGeometry(10.4, 7.35), new T.MeshBasicMaterial({ map: dTex, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
  dtSheet.rotation.x = -PI / 2; dtSheet.position.set(0, 0.29, 0); dtB.add(dtSheet);
  S.cyl(2.3, 2.3, 0.7, 51.5, FLOOR + 9.6, 9, '#454a50', 0, 0, 0, 20); S.cyl(0.3, 0.3, 9.2, 51.5, FLOOR + 4.6, 9, IRON, 0, 0, 0, 8); S.cyl(2.0, 2.0, 0.4, 51.5, FLOOR + 0.2, 9, IRON, 0, 0, 0, 16);
  shade(DTX, FLOOR + 0.04, DTZ + 0.4, 16, 9, 0.5); shade(51.5, FLOOR + 0.04, 9, 5.5, 5.5, 0.5);

  /* the baked solids, then the decals and the texture sheet */
  g.add(S.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 })));
  D.push(new T.Matrix4());
  g.add(D.mesh(A.texture()));

  /* soft shadow that grounds whatever the page puts on the bench */
  var tableShadow = K.contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5);
  tableShadow.material.polygonOffset = true; tableShadow.material.polygonOffsetFactor = -2; tableShadow.material.polygonOffsetUnits = -4;

  var psi = tr.map(function (gr) { return gr.psi0; });
  return {
    group: g, shadow: tableShadow,
    update: function (t) {
      if (still) return;
      var k, gr;
      psi[0] = tr[0].psi0 + t * 0.075;
      for (k = 1; k < tr.length; k++) { gr = tr[k]; psi[k] = gr.coax ? psi[gr.parent] : meshAngle(tr[gr.parent].N, psi[gr.parent], gr.N, gr.th); }
      for (k = 0; k < tr.length; k++) axles[k].rotation.z = psi[k];
    }
  };
};
})();
