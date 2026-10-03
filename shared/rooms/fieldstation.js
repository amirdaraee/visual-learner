/* Room "fieldstation" for the earth subject: a field station and geology lab.
 * Sage plaster, pine and oak, a deep window onto a lake and snow-capped mountains in golden morning light, rock and mineral samples
 * on a shelf, soil-profile jars, a contour map, a barometer, a cup anemometer, a globe, a plan chest and a scarred pine field table.
 * Local y = 0 is the table top, the floor is at y = -13, the back wall near z = -19.
 * Static geometry is baked into a few vertex-coloured meshes so the whole room stays well under the draw-call budget. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var PI = Math.PI, FLOOR = -13, CEIL = 31, ZB = -19, XS = 55, ZF = 70, ZC = (ZB + ZF) / 2;
var WIN = { x0: 8, x1: 34, y0: 4, y1: 21 };          /* the window opening in the back wall */
var mulberry = K.mulberry;
var SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", Times, serif';

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* canvas texture with mipmaps so fine detail stays calm at a slant; o.repeat tiles it */
function tex(T, w, h, draw, o) {
  var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  var t = new T.CanvasTexture(c); o = o || {};
  if (o.flat) { t.generateMipmaps = false; t.minFilter = T.LinearFilter; } else { t.anisotropy = 4; t.minFilter = T.LinearMipmapLinearFilter; }
  if (o.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}
function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/* ---------- value noise (integer hash: fast enough to run per pixel) ---------- */
function ih(x, y, z, s) { var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483629) + Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn2(x, y, s) {
  var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  var a = ih(xi, yi, 0, s), b = ih(xi + 1, yi, 0, s), c = ih(xi, yi + 1, 0, s), d = ih(xi + 1, yi + 1, 0, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function vn3(x, y, z, s) {
  var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  function l(a, b, t) { return a + (b - a) * t; }
  return l(l(l(ih(xi, yi, zi, s), ih(xi + 1, yi, zi, s), u), l(ih(xi, yi + 1, zi, s), ih(xi + 1, yi + 1, zi, s), u), v),
           l(l(ih(xi, yi, zi + 1, s), ih(xi + 1, yi, zi + 1, s), u), l(ih(xi, yi + 1, zi + 1, s), ih(xi + 1, yi + 1, zi + 1, s), u), v), w);
}
function fbm2(x, y, s, oct) { var sum = 0, amp = 0.5, tot = 0, i; for (i = 0; i < oct; i++) { sum += amp * vn2(x, y, s + i * 17); tot += amp; x *= 2.03; y *= 2.03; amp *= 0.5; } return sum / tot; }

/* ---------- baking: many small solids into one vertex-coloured mesh ---------- */
function makeBake(T) {
  var P = [], N = [], C = [], I = [], v = 0, st = [new T.Matrix4()];
  var m = new T.Matrix4(), nm = new T.Matrix3(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pp = new T.Vector3(), a = new T.Vector3(), col = new T.Color(), tmp = new T.Color();
  /* the stage already adds its own ambient and directional light, so lit albedo is kept low (about 0.8 of the colour named) */
  var B = {}, gain = 0.8;
  B.open = function (x, y, z, rx, ry, rz, s) { e.set(rx || 0, ry || 0, rz || 0); m.compose(pp.set(x || 0, y || 0, z || 0), q.setFromEuler(e), sc.set(s || 1, s || 1, s || 1)); st.push(st[st.length - 1].clone().multiply(m)); return B; };
  B.close = function () { st.pop(); return B; };
  /* color: a hex string / Color, or fn(x, y, z, face) returning a Color (x, y, z are local; face is the triangle index, -1 for indexed geometry) */
  B.add = function (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) {
    e.set(rx || 0, ry || 0, rz || 0);
    var s1 = sx == null ? 1 : sx; m.compose(pp.set(x || 0, y || 0, z || 0), q.setFromEuler(e), sc.set(s1, sy == null ? s1 : sy, sz == null ? s1 : sz));
    m.premultiply(st[st.length - 1]); nm.getNormalMatrix(m);
    var pa = geo.attributes.position, na = geo.attributes.normal, ia = geo.index, n = pa.count, k, fn = typeof color === 'function', cc = [];
    if (!fn) col.set(color).multiplyScalar(gain);
    for (k = 0; k < n; k++) {
      if (fn) {
        if (ia) { tmp.copy(color(pa.getX(k), pa.getY(k), pa.getZ(k), -1)).multiplyScalar(gain); cc[k] = [tmp.r, tmp.g, tmp.b]; }
        else if (k % 3 === 0) {
          var gx = (pa.getX(k) + pa.getX(k + 1) + pa.getX(k + 2)) / 3, gy = (pa.getY(k) + pa.getY(k + 1) + pa.getY(k + 2)) / 3, gz = (pa.getZ(k) + pa.getZ(k + 1) + pa.getZ(k + 2)) / 3;
          tmp.copy(color(gx, gy, gz, k / 3)).multiplyScalar(gain); cc[k] = cc[k + 1] = cc[k + 2] = [tmp.r, tmp.g, tmp.b];
        }
      }
      a.set(pa.getX(k), pa.getY(k), pa.getZ(k)).applyMatrix4(m); P.push(a.x, a.y, a.z);
      a.set(na.getX(k), na.getY(k), na.getZ(k)).applyMatrix3(nm).normalize(); N.push(a.x, a.y, a.z);
      if (fn) C.push(cc[k][0], cc[k][1], cc[k][2]); else C.push(col.r, col.g, col.b);
    }
    if (ia) for (k = 0; k < ia.count; k++) I.push(ia.getX(k) + v); else for (k = 0; k < n; k++) I.push(k + v);
    v += n;
  };
  B.mesh = function (material) {
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); geo.setIndex(I);
    return new T.Mesh(geo, material);
  };
  return B;
}

/* a batch of soft contact shadows: one mesh, one draw call */
function makeShadows(T, opacity) {
  var tx = tex(T, 64, 64, function (c, w, h) { var gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.8)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.34)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { flat: true });
  var P = [], U = [], I = [], v = 0, S = {};
  S.add = function (x, y, z, w, d) {
    P.push(x - w / 2, y, z + d / 2, x + w / 2, y, z + d / 2, x + w / 2, y, z - d / 2, x - w / 2, y, z - d / 2); U.push(0, 0, 1, 0, 1, 1, 0, 1);
    I.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4;
  };
  S.mesh = function () {
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); geo.setIndex(I);
    var m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.renderOrder = 2; return m;
  };
  return S;
}

/* atlas quads: label cards that share one texture */
function makeQuads(T, atlas, W, H) {
  var P = [], N = [], U = [], I = [], v = 0, e = new T.Euler(), q = new T.Quaternion(), a = new T.Vector3(), Q = {};
  Q.add = function (x, y, z, w, h, rx, ry, cell) {
    e.set(rx || 0, ry || 0, 0); q.setFromEuler(e);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c, k) {
      a.set(c[0] * w / 2, c[1] * h / 2, 0).applyQuaternion(q); P.push(x + a.x, y + a.y, z + a.z);
      a.set(0, 0, 1).applyQuaternion(q); N.push(a.x, a.y, a.z);
      U.push((cell[0] + (c[0] > 0 ? cell[2] : 0)) / W, 1 - (cell[1] + (c[1] > 0 ? 0 : cell[3])) / H);
    });
    I.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4;
  };
  Q.mesh = function () {
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); geo.setIndex(I);
    return new T.Mesh(geo, new T.MeshStandardMaterial({ map: atlas, color: 0xb0b0b0, roughness: 0.9, metalness: 0 }));
  };
  return Q;
}

/* ---------- textures: room shell ---------- */

function plasterTex(T) {
  return tex(T, 512, 512, function (c, w, h) {
    var r = mulberry(9), k, ox, oy;
    c.fillStyle = '#9aa07a'; c.fillRect(0, 0, w, h);
    for (k = 0; k < 70; k++) {
      var rd = 30 + r() * 80, bx = r() * w, by = r() * h, col = r() < 0.5 ? 'rgba(255,244,214,0.035)' : 'rgba(50,60,30,0.035)';
      for (ox = -1; ox <= 1; ox++) for (oy = -1; oy <= 1; oy++) { var rg = c.createRadialGradient(bx + ox * w, by + oy * h, 0, bx + ox * w, by + oy * h, rd); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(bx + ox * w - rd, by + oy * h - rd, rd * 2, rd * 2); }
    }
    for (k = 0; k < 900; k++) { c.fillStyle = 'rgba(40,50,25,' + (r() * 0.05) + ')'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }, { repeat: [5.5, 2.2] });
}

function floorTex(T) {
  return tex(T, 1024, 1024, function (c, w, h) {
    var r = mulberry(21), rows = 8, rh = h / rows, k, i;
    function plank(xs, len, y, hue, lit) {
      var segs = xs + len > w ? [[xs, w - xs], [0, xs + len - w]] : [[xs, len]];
      segs.forEach(function (s) {
        c.fillStyle = 'hsl(' + hue + ',34%,' + lit + '%)'; c.fillRect(s[0], y, s[1], rh);
        for (var n = 0; n < 8; n++) { var gy = y + 4 + r() * (rh - 8); c.strokeStyle = 'rgba(45,25,10,' + (0.07 + r() * 0.12) + ')'; c.lineWidth = 0.6 + r(); c.beginPath(); c.moveTo(s[0], gy); c.lineTo(s[0] + s[1], gy + (r() - 0.5) * 3); c.stroke(); }
      });
      var ex = (xs + len) % w; c.fillStyle = 'rgba(30,16,6,0.55)'; c.fillRect(ex - 1.5, y, 3, rh);
    }
    for (k = 0; k < rows; k++) {
      var off = r() * w, x = off, y = k * rh;
      while (x < off + w - 1) { var len = 240 + r() * 320; if (x + len > off + w - 140) len = off + w - x; plank(x % w, len, y, 28 + Math.floor(r() * 6), 36 + r() * 8); x += len; }
      c.fillStyle = 'rgba(30,16,6,0.6)'; c.fillRect(0, y, w, 2.5);
    }
  }, { repeat: [5, 4] });
}

/* a woven kilim: rust, ochre, sage and cream bands with a small sky-blue accent */
function rugTex(T) {
  return tex(T, 1024, 512, function (c, w, h) {
    var i, j, x, y, r = mulberry(31);
    c.fillStyle = '#7e3f2c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8c69a'; c.fillRect(20, 20, w - 40, h - 40);
    c.fillStyle = '#7e3f2c'; c.fillRect(32, 32, w - 64, h - 64);
    c.fillStyle = '#6a8060'; c.fillRect(54, 54, w - 108, h - 108);
    c.fillStyle = '#a35a38'; c.fillRect(70, 70, w - 140, h - 140);
    for (i = 0; i < 7; i++) {
      x = 70 + (i + 0.5) * (w - 140) / 7; y = h / 2;
      c.fillStyle = '#d6b05a'; c.beginPath(); c.moveTo(x, y - 150); c.lineTo(x + 58, y); c.lineTo(x, y + 150); c.lineTo(x - 58, y); c.closePath(); c.fill();
      c.fillStyle = i % 2 ? '#6a8060' : '#7e3f2c'; c.beginPath(); c.moveTo(x, y - 112); c.lineTo(x + 42, y); c.lineTo(x, y + 112); c.lineTo(x - 42, y); c.closePath(); c.fill();
      c.fillStyle = i % 3 === 1 ? '#7ea1b4' : '#d8c69a'; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + 18, y); c.lineTo(x, y + 40); c.lineTo(x - 18, y); c.closePath(); c.fill();
    }
    for (j = 0; j < 2; j++) for (i = 0; i < 28; i++) { c.fillStyle = i % 2 ? '#d8c69a' : '#6a8060'; c.fillRect(70 + i * (w - 140) / 28, 80 + j * (h - 180), (w - 140) / 28 - 3, 12); }
    for (i = 0; i < 1600; i++) { c.fillStyle = 'rgba(0,0,0,' + r() * 0.07 + ')'; c.fillRect(r() * w, r() * h, 3, 1); }
    for (i = 0; i < 60; i++) { c.fillStyle = 'rgba(235,225,200,0.5)'; c.fillRect(0, i * (h / 60), 12, 3); c.fillRect(w - 12, i * (h / 60), 12, 3); }
  });
}

/* tongue-and-groove boarding */
function boardTex(T) {
  return tex(T, 512, 512, function (c, w, h) {
    var r = mulberry(14), k, n = 8, bw = w / n;
    for (k = 0; k < n; k++) {
      c.fillStyle = 'hsl(' + (27 + r() * 5) + ',28%,' + (36 + r() * 7) + '%)'; c.fillRect(k * bw, 0, bw, h);
      for (var s = 0; s < 14; s++) { c.strokeStyle = 'rgba(40,22,8,' + (0.06 + r() * 0.1) + ')'; c.lineWidth = 0.6 + r(); var gx = k * bw + 3 + r() * (bw - 6); c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx + (r() - 0.5) * 4, h); c.stroke(); }
      c.fillStyle = 'rgba(25,12,4,0.7)'; c.fillRect(k * bw, 0, 3, h); c.fillStyle = 'rgba(210,170,120,0.14)'; c.fillRect(k * bw + 3, 0, 2, h);
    }
  });
}

/* the scarred pine field table: boards, knots, knife cuts, an ink stain, mug rings, a burn, tally marks. 28 px per unit, 72 x 36 units. */
function pineTex(T) {
  return tex(T, 2048, 1024, function (c, w, h) {
    var r = mulberry(7), i, b, nb = 6, bh = h / nb, base = ['#d9ae78', '#cfa46f', '#e0b982', '#d2a775', '#daB17b', '#cb9f6b'];
    for (b = 0; b < nb; b++) {
      var y0 = b * bh;
      c.fillStyle = base[b]; c.fillRect(0, y0, w, bh);
      for (i = 0; i < 80; i++) {
        var yy = y0 + r() * bh; c.strokeStyle = r() < 0.7 ? 'rgba(112,72,34,' + (0.08 + r() * 0.16) + ')' : 'rgba(238,208,152,' + (0.07 + r() * 0.1) + ')'; c.lineWidth = 0.7 + r() * 2.2;
        c.beginPath(); c.moveTo(0, yy); c.bezierCurveTo(w * 0.3, yy + (r() - 0.5) * 10, w * 0.65, yy + (r() - 0.5) * 10, w, yy + (r() - 0.5) * 8); c.stroke();
      }
      for (i = 0; i < 3; i++) {
        var kx = r() * w, ky = y0 + bh * (0.25 + r() * 0.5), kr = 9 + r() * 12;
        for (var q = 3; q >= 1; q--) { c.strokeStyle = 'rgba(98,58,24,' + (0.1 + 0.07 * (4 - q)) + ')'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(kx, ky, kr * q * 0.55 * 1.7, kr * q * 0.55, 0, 0, 7); c.stroke(); }
        c.fillStyle = 'rgba(84,46,18,0.75)'; c.beginPath(); c.ellipse(kx, ky, kr * 0.6, kr * 0.38, 0, 0, 7); c.fill();
      }
      var jx = 260 + r() * 1500; c.fillStyle = 'rgba(55,32,14,0.6)'; c.fillRect(jx, y0, 2.5, bh);
      c.fillStyle = 'rgba(55,32,14,0.7)'; c.fillRect(0, y0, w, 3);
    }
    /* knife cuts and scratches */
    for (i = 0; i < 150; i++) { var sx = r() * w, sy = r() * h * 0.74, ang = r() * 3.14, ln = 14 + r() * 60; c.strokeStyle = r() < 0.6 ? 'rgba(62,34,14,0.55)' : 'rgba(246,226,186,0.55)'; c.lineWidth = 1 + r() * 1.8; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln); c.stroke(); }
    for (i = 0; i < 16; i++) { var dx = r() * w, dy = r() * h * 0.74; c.fillStyle = 'rgba(72,42,18,0.4)'; c.beginPath(); c.ellipse(dx, dy, 4 + r() * 7, 3 + r() * 4, r() * 3, 0, 7); c.fill(); c.strokeStyle = 'rgba(240,215,170,0.3)'; c.lineWidth = 1.2; c.stroke(); }
    /* ink stain */
    var ig = c.createRadialGradient(1300, 300, 0, 1300, 300, 46); ig.addColorStop(0, 'rgba(32,40,78,0.6)'); ig.addColorStop(0.7, 'rgba(32,40,78,0.32)'); ig.addColorStop(1, 'rgba(32,40,78,0)'); c.fillStyle = ig; c.fillRect(1240, 240, 120, 120);
    for (i = 0; i < 9; i++) { c.fillStyle = 'rgba(32,40,78,0.45)'; c.beginPath(); c.arc(1300 + (r() - 0.5) * 130, 300 + (r() - 0.5) * 100, 1.5 + r() * 3, 0, 7); c.fill(); }
    /* mug rings */
    c.strokeStyle = 'rgba(86,52,24,0.34)'; c.lineWidth = 3; c.beginPath(); c.arc(1560, 560, 22, 0, 7); c.stroke(); c.beginPath(); c.arc(1574, 570, 22, 0.3, 5.6); c.stroke();
    c.beginPath(); c.arc(560, 520, 21, 0, 6); c.stroke();
    /* a scorch mark and a row of tally marks */
    var bg = c.createRadialGradient(900, 640, 0, 900, 640, 34); bg.addColorStop(0, 'rgba(60,32,14,0.6)'); bg.addColorStop(1, 'rgba(60,32,14,0)'); c.fillStyle = bg; c.fillRect(860, 600, 80, 80);
    c.strokeStyle = 'rgba(60,34,14,0.55)'; c.lineWidth = 2;
    for (i = 0; i < 12; i++) { var tx = 400 + Math.floor(i / 5) * 40 + (i % 5) * 7; c.beginPath(); if (i % 5 === 4) { c.moveTo(tx - 32, 120 + 18); c.lineTo(tx - 6, 120 - 2); } else { c.moveTo(tx, 120); c.lineTo(tx + 1, 120 + 18); } c.stroke(); }
    var vg = c.createLinearGradient(0, 0, 0, h * 0.74); vg.addColorStop(0, 'rgba(255,255,255,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.08)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  });
}

/* ---------- textures: the view through the window ----------
   Every layer is painted in "wall coordinates" (the size it would have if it were drawn on the window itself), then pushed back
   in depth so it shifts against the frame as the camera orbits. */

function drawClouds(c, w, h, rect, defs, seed) {
  var r = mulberry(seed), pxu = w / (rect[1] - rect[0]);
  function U(wx) { return (wx - rect[0]) * pxu; } function V(wy) { return (rect[3] - wy) * pxu; }
  function puff(cx, cy, rad, col0, col1) { var g = c.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, col0); g.addColorStop(1, col1); c.fillStyle = g; c.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
  defs.forEach(function (d) {
    var n = Math.max(6, Math.round(d[2] * 1.8)), k, pts = [];
    for (k = 0; k < n; k++) {
      var t = k / (n - 1), rad = d[3] * (0.4 + 0.6 * Math.pow(Math.sin(t * PI), 0.8) * (0.65 + 0.35 * r())) * pxu;
      pts.push([U(d[0] + (t - 0.5) * d[2]), V(d[1]) - rad * 0.5, rad]);
    }
    pts.forEach(function (p) { puff(p[0], p[1] + p[2] * 0.35, p[2] * 1.05, 'rgba(214,166,130,0.55)', 'rgba(214,166,130,0)'); });
    pts.forEach(function (p) { puff(p[0], p[1], p[2], 'rgba(236,228,208,0.8)', 'rgba(236,228,208,0)'); });
    pts.forEach(function (p) { puff(p[0] - p[2] * 0.25, p[1] - p[2] * 0.3, p[2] * 0.7, 'rgba(244,218,164,0.3)', 'rgba(244,218,164,0)'); });
  });
}

var SKY_RECT = [-34, 76, -6, 35.25], CLOUD_RECT = [-24, 70, 10, 27.6], FAR_RECT = [-26, 68, 6, 26.15], MID_RECT = [-16, 60, 6, 20.25];
function skyTex(T) {
  return tex(T, 2048, 768, function (c, w, h) {
    var R = SKY_RECT, pxu = w / (R[1] - R[0]), g = c.createLinearGradient(0, 0, 0, h);
    function st(y, col) { g.addColorStop(clamp((R[3] - y) / (R[3] - R[2]), 0, 1), col); }
    st(35.25, '#6a9bc6'); st(33, '#6a9bc6'); st(26, '#86aed0'); st(20, '#a9c3cf'); st(15.5, '#d9d6b8'); st(12.5, '#efd9a2'); st(10, '#f2d092'); st(-6, '#eecf94');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    var sx = (14.6 - R[0]) * pxu, sy = (R[3] - 14.0) * pxu;
    var sg = c.createRadialGradient(sx, sy, 0, sx, sy, 14 * pxu); sg.addColorStop(0, 'rgba(246,224,170,0.8)'); sg.addColorStop(0.14, 'rgba(244,214,150,0.42)'); sg.addColorStop(0.5, 'rgba(240,200,130,0.14)'); sg.addColorStop(1, 'rgba(236,190,118,0)');
    c.fillStyle = sg; c.fillRect(0, 0, w, h);
    var dg = c.createRadialGradient(sx, sy, 0, sx, sy, 1.2 * pxu); dg.addColorStop(0, 'rgba(248,234,190,1)'); dg.addColorStop(0.8, 'rgba(246,228,176,0.95)'); dg.addColorStop(1, 'rgba(244,222,160,0)'); c.fillStyle = dg; c.fillRect(sx - 40, sy - 40, 80, 80);
    drawClouds(c, w, h, R, [[-24, 17.5, 10, 1.6], [-14, 21.5, 8, 1.2], [60, 17, 9, 1.5], [68, 21, 8, 1.2], [-4, 15.6, 10, 1.7], [14.5, 16.3, 8, 1.2], [29, 17.6, 11, 1.7], [45, 15.4, 9, 1.5], [52, 19.6, 8, 1.3], [4, 19.8, 8, 1.3], [22, 20.6, 8, 1.1], [36, 21.6, 9, 1.1]], 5);
  });
}
function cloudTex(T, rect) {
  return tex(T, 2048, 384, function (c, w, h) {
    drawClouds(c, w, h, rect, [[-18, 16.6, 9, 1.4], [58, 17.4, 9, 1.4], [64, 14.6, 6, 1.0], [11, 18.2, 9, 1.5], [26, 15.2, 12, 2.1], [40, 18.8, 10, 1.6], [-2, 17.2, 9, 1.4], [49, 15.8, 8, 1.2]], 11);
  }, { flat: true });
}

/* snow-capped range: a silhouette from peaks plus noise, lit from the left, with a ragged snow line and haze */
function mountainTex(T, o) {
  var W = o.w, H = o.h, c = document.createElement('canvas'), ctx, img, d, ux = (o.x1 - o.x0) / W, uy = (o.y1 - o.y0) / H, top = new Float32Array(W), slope = new Float32Array(W), i, j, p;
  c.width = W; c.height = H; ctx = c.getContext('2d'); img = ctx.createImageData(W, H); d = img.data;
  for (i = 0; i < W; i++) {
    var wx = o.x0 + i * ux, hh = 0;
    for (p = 0; p < o.peaks.length; p++) { var pk = o.peaks[p], t = 1 - Math.abs(wx - pk[0]) / pk[2]; if (t > 0) hh = Math.max(hh, pk[1] * Math.pow(t, 1.1)); }
    hh += o.low * fbm2(wx * 0.45, 2.7, o.seed, 4);
    hh += (fbm2(wx * 2.1, 8.1, o.seed + 5, 4) - 0.5) * o.rough * (0.3 + 0.7 * hh / o.maxH);
    top[i] = o.base + hh;
  }
  for (i = 0; i < W; i++) slope[i] = (top[Math.min(W - 1, i + 5)] - top[Math.max(0, i - 5)]) / (10 * ux);
  var LC = rgb(o.rockLit), SC = rgb(o.rockShade), NL = rgb(o.snowLit), NS = rgb(o.snowShade), GC = rgb(o.green), HC = rgb(o.haze);
  for (j = 0; j < H; j++) {
    var wy = o.y1 - (j + 0.5) * uy;
    for (i = 0; i < W; i++) {
      var cov = clamp((top[i] - wy) / uy + 0.5, 0, 1); if (cov <= 0) continue;
      var wx2 = o.x0 + i * ux, q1 = fbm2(wx2 * 1.3 + wy * 0.5, wy * 0.26 + wx2 * 0.06, o.seed + 9, 3), q2 = fbm2((wx2 + 0.12) * 1.3 + wy * 0.5, wy * 0.26 + wx2 * 0.06, o.seed + 9, 3);
      var face = clamp(0.5 + 0.42 * slope[i] + (q2 - q1) * 8, 0, 1), streak = (q1 - 0.5) * 0.4;
      var r = lerp(SC[0], LC[0], face) * (1 + streak), g = lerp(SC[1], LC[1], face) * (1 + streak), b = lerp(SC[2], LC[2], face) * (1 + streak);
      var sn = clamp((wy - (o.snow + (fbm2(wx2 * 2.4, wy * 2.4, o.seed + 3, 3) - 0.5) * 1.8)) * 3, 0, 1);
      if (sn > 0) { r = lerp(r, lerp(NS[0], NL[0], face), sn); g = lerp(g, lerp(NS[1], NL[1], face), sn); b = lerp(b, lerp(NS[2], NL[2], face), sn); }
      var gt = clamp((o.tree - wy) / 1.0, 0, 1) * 0.75; r = lerp(r, GC[0], gt); g = lerp(g, GC[1], gt); b = lerp(b, GC[2], gt);
      var hz = o.haze_k + 0.25 * clamp((o.base + 2 - wy) / 3, 0, 1); r = lerp(r, HC[0], hz); g = lerp(g, HC[1], hz); b = lerp(b, HC[2], hz);
      var idx = (j * W + i) * 4; d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = cov * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  var t2 = new T.CanvasTexture(c); t2.generateMipmaps = false; t2.minFilter = T.LinearFilter; return t2;
}

var LAKE_RECT = [-14, 58, -2.75, 10.75], HILL_RECT = [-10, 56, -2.9, 9.5];
function lakeTex(T) {
  return tex(T, 2048, 384, function (c, w, h) {
    var R = LAKE_RECT, pxu = w / (R[1] - R[0]), r = mulberry(17), i;
    function U(wx) { return (wx - R[0]) * pxu; } function V(wy) { return (R[3] - wy) * pxu; }
    var wg = c.createLinearGradient(0, V(9.7), 0, V(R[2]));
    wg.addColorStop(0, '#dccfa0'); wg.addColorStop(0.18, '#b4c4b4'); wg.addColorStop(0.5, '#86a8b0'); wg.addColorStop(1, '#5e8798');
    c.fillStyle = wg; c.fillRect(0, V(9.9), w, h);
    /* reflected shore and mountains */
    var rf = c.createLinearGradient(0, V(9.9), 0, V(8.8)); rf.addColorStop(0, 'rgba(110,126,98,0.7)'); rf.addColorStop(1, 'rgba(110,126,98,0)'); c.fillStyle = rf; c.fillRect(0, V(9.9), w, V(8.8) - V(9.9));
    /* sun glitter and ripples */
    for (i = 0; i < 520; i++) {
      var gy = 9.6 - Math.pow(r(), 1.5) * 8.4, spread = 0.7 + (9.6 - gy) * 0.55, gx = 14 + (r() - 0.5) * 2 * spread * (r() < 0.8 ? 1 : 2.5);
      c.fillStyle = 'rgba(255,242,204,' + (0.14 + r() * 0.32) + ')'; c.fillRect(U(gx), V(gy), (0.2 + r() * 0.8) * pxu * (1 + (9.6 - gy) * 0.18), 1.5 + r() * 1.5);
    }
    for (i = 0; i < 260; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.03 + r() * 0.05) + ')'; c.fillRect(r() * w, V(9.4 - r() * 8.6), 30 + r() * 140, 1.5); }
    /* the far shore: low, hazy, wooded */
    c.fillStyle = '#6d7d62'; c.beginPath(); c.moveTo(0, h);
    for (i = 0; i <= 200; i++) { var wx = R[0] + i / 200 * (R[1] - R[0]), top = 10.15 + (fbm2(wx * 0.5, 4.2, 3, 3) - 0.35) * 1.0 + 0.08 * Math.sin(wx * 9); c.lineTo(i / 200 * w, V(Math.max(10.0, top))); }
    c.lineTo(w, h); c.closePath(); c.save(); c.beginPath(); c.moveTo(0, V(9.9)); c.lineTo(w, V(9.9)); c.lineTo(w, 0); c.lineTo(0, 0); c.closePath(); c.clip(); c.beginPath(); c.moveTo(0, V(9.7));
    for (i = 0; i <= 200; i++) { var wx2 = R[0] + i / 200 * (R[1] - R[0]), tp = 10.15 + (fbm2(wx2 * 0.5, 4.2, 3, 3) - 0.35) * 1.0 + 0.08 * Math.sin(wx2 * 9); c.lineTo(i / 200 * w, V(Math.max(10.0, tp))); }
    c.lineTo(w, V(9.7)); c.closePath(); var sg = c.createLinearGradient(0, V(10.8), 0, V(9.7)); sg.addColorStop(0, '#8a9a76'); sg.addColorStop(1, '#5f7258'); c.fillStyle = sg; c.fill(); c.restore();
  }, { flat: true });
}

function hillTex(T) {
  return tex(T, 2048, 384, function (c, w, h) {
    var R = HILL_RECT, pxu = w / (R[1] - R[0]), r = mulberry(29), i;
    function U(wx) { return (wx - R[0]) * pxu; } function V(wy) { return (R[3] - wy) * pxu; }
    function gy(wx) { return 4.4 + 4.0 * Math.exp(-Math.pow((wx - 4) / 9, 2)) + 3.2 * Math.exp(-Math.pow((wx - 40) / 9, 2)) + 0.35 * (fbm2(wx * 0.6, 1.3, 8, 3) - 0.5); }
    var mg = c.createLinearGradient(0, V(9.5), 0, V(-2.5)); mg.addColorStop(0, '#b3a864'); mg.addColorStop(0.4, '#98984f'); mg.addColorStop(1, '#6a7b46');
    c.fillStyle = mg; c.beginPath(); c.moveTo(0, h);
    for (i = 0; i <= 240; i++) { var wx = R[0] + i / 240 * (R[1] - R[0]); c.lineTo(i / 240 * w, V(gy(wx))); }
    c.lineTo(w, h); c.closePath(); c.fill();
    for (i = 0; i < 1400; i++) { var px = r() * (R[1] - R[0]) + R[0], py = gy(px) - r() * 5; c.strokeStyle = r() < 0.5 ? 'rgba(236,222,140,0.18)' : 'rgba(70,86,40,0.18)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(U(px), V(py)); c.lineTo(U(px) + (r() - 0.5) * 6, V(py) - 7); c.stroke(); }
    function pine(wx, hgt) {
      var x0 = U(wx), y0 = V(gy(wx)) + 4, ph = hgt * pxu, wd = ph * 0.34, k;
      c.fillStyle = '#4a3a2a'; c.fillRect(x0 - 2, y0 - ph * 0.12, 4, ph * 0.14);
      for (k = 0; k < 4; k++) {
        var by = y0 - ph * (0.1 + k * 0.22), tw = wd * (1 - k * 0.2), th = ph * 0.34;
        c.fillStyle = '#3b5a3e'; c.beginPath(); c.moveTo(x0, by - th); c.lineTo(x0 + tw, by); c.lineTo(x0 - tw, by); c.closePath(); c.fill();
        c.fillStyle = 'rgba(150,170,80,0.38)'; c.beginPath(); c.moveTo(x0, by - th); c.lineTo(x0 - tw, by); c.lineTo(x0 - tw * 0.1, by); c.closePath(); c.fill();
      }
    }
    var trees = [], k;
    for (k = 0; k < 22; k++) trees.push([-9 + r() * 22, 1.1 + r() * 1.5]);
    for (k = 0; k < 26; k++) trees.push([29 + r() * 25, 1.1 + r() * 1.6]);
    trees.sort(function (a, b) { return gy(a[0]) - gy(b[0]); }).reverse().forEach(function (t) { pine(t[0], t[1]); });
  }, { flat: true });
}

/* ---------- textures: props and signs ---------- */

/* a schematic contour map: invented terrain, contours every 50 m, index contours every 250 m labelled, a lake, two streams, spot heights.
   The shading and every line come from one elevation function, so the labels always match the lines. */
function topoTex(T) {
  var W = 1024, H = 768, GX = 256, GY = 192, MX0 = 56, MY0 = 56, MX1 = 968, MY1 = 712, i, j, k;
  function elev(u, v) {
    var h = 640, peaks = [[0.64, 0.33, 1150, 0.16], [0.27, 0.27, 720, 0.12], [0.86, 0.62, 560, 0.11], [0.5, 0.52, 260, 0.14]];
    peaks.forEach(function (p) { var dx = u - p[0], dy = (v - p[1]) * 1.15; h += p[2] * Math.exp(-(dx * dx + dy * dy) / (2 * p[3] * p[3])); });
    h += (fbm2(u * 6, v * 6, 2, 4) - 0.5) * 220;
    var lx = (u - 0.36) / 0.13, ly = (v - 0.77) / 0.09; h -= 420 * Math.exp(-(lx * lx + ly * ly));
    return Math.max(h, 430);
  }
  var LAKE = 440, el = new Float32Array((GX + 1) * (GY + 1));
  for (j = 0; j <= GY; j++) for (i = 0; i <= GX; i++) el[j * (GX + 1) + i] = elev(i / GX, j / GY);
  function E(i, j) { return el[clamp(j, 0, GY) * (GX + 1) + clamp(i, 0, GX)]; }
  return tex(T, W, H, function (c, w, h) {
    var mw = MX1 - MX0, mh = MY1 - MY0;
    c.fillStyle = '#e5dbbf'; c.fillRect(0, 0, w, h);
    /* tinted, hillshaded elevation at grid resolution, smoothed by scaling */
    var sc = document.createElement('canvas'); sc.width = GX; sc.height = GY; var sx = sc.getContext('2d'), im = sx.createImageData(GX, GY);
    for (j = 0; j < GY; j++) for (i = 0; i < GX; i++) {
      var e0 = E(i, j), dzx = E(i + 1, j) - E(i - 1, j), dzy = E(i, j + 1) - E(i, j - 1), sh = clamp(0.5 + (-dzx - dzy) * 0.0016, 0, 1), t = clamp((e0 - 430) / 1400, 0, 1);
      var r0 = lerp(214, 236, t), g0 = lerp(222, 222, t), b0 = lerp(176, 196, t), f = 0.9 + 0.2 * sh, o = (j * GX + i) * 4;
      if (e0 <= LAKE + 1) { r0 = 170; g0 = 199; b0 = 207; f = 1; }
      im.data[o] = r0 * f; im.data[o + 1] = g0 * f; im.data[o + 2] = b0 * f; im.data[o + 3] = 255;
    }
    sx.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(sc, MX0, MY0, mw, mh);
    /* graticule */
    c.strokeStyle = 'rgba(80,64,40,0.22)'; c.lineWidth = 1;
    for (k = 1; k < 9; k++) { c.beginPath(); c.moveTo(MX0 + k * mw / 9, MY0); c.lineTo(MX0 + k * mw / 9, MY1); c.stroke(); }
    for (k = 1; MY0 + k * mw / 9 < MY1; k++) { c.beginPath(); c.moveTo(MX0, MY0 + k * mw / 9); c.lineTo(MX1, MY0 + k * mw / 9); c.stroke(); }   /* square 1 km cells */
    /* contours by marching squares */
    var segs = {}, lev;
    function interp(a, b, level) { return (level - a) / (b - a); }
    for (lev = 450; lev <= 1850; lev += 50) {
      var list = [];
      for (j = 0; j < GY; j++) for (i = 0; i < GX; i++) {
        var a = E(i, j), b = E(i + 1, j), cc = E(i + 1, j + 1), dd = E(i, j + 1), idx = (a >= lev ? 8 : 0) | (b >= lev ? 4 : 0) | (cc >= lev ? 2 : 0) | (dd >= lev ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var pt = [[i + interp(a, b, lev), j], [i + 1, j + interp(b, cc, lev)], [i + interp(dd, cc, lev), j + 1], [i, j + interp(a, dd, lev)]];
        var tbl = { 1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[0, 3], [2, 1]], 6: [[0, 2]], 7: [[0, 3]], 8: [[0, 3]], 9: [[0, 2]], 10: [[0, 1], [3, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]] }[idx];
        for (k = 0; k < tbl.length; k++) list.push([pt[tbl[k][0]], pt[tbl[k][1]]]);
      }
      segs[lev] = list;
      var index = lev % 250 === 0; c.strokeStyle = index ? 'rgba(128,66,30,0.95)' : 'rgba(160,100,60,0.78)'; c.lineWidth = index ? 2.6 : 1.3; c.beginPath();
      list.forEach(function (s) { c.moveTo(MX0 + s[0][0] / GX * mw, MY0 + s[0][1] / GY * mh); c.lineTo(MX0 + s[1][0] / GX * mw, MY0 + s[1][1] / GY * mh); });
      c.stroke();
    }
    /* lake outline and streams that run downhill into it */
    c.strokeStyle = 'rgba(70,120,140,0.9)'; c.lineWidth = 2.2; c.beginPath();
    segs[450].forEach(function (s) { if (E(Math.round(s[0][0]), Math.round(s[0][1])) < 470 && Math.abs(s[0][0] / GX - 0.36) < 0.2 && Math.abs(s[0][1] / GY - 0.77) < 0.2) { c.moveTo(MX0 + s[0][0] / GX * mw, MY0 + s[0][1] / GY * mh); c.lineTo(MX0 + s[1][0] / GX * mw, MY0 + s[1][1] / GY * mh); } });
    c.stroke();
    function stream(u0, v0) {
      var u = u0, v = v0, s = 0; c.strokeStyle = 'rgba(70,128,156,0.95)'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(MX0 + u * mw, MY0 + v * mh);
      while (s++ < 260 && elev(u, v) > LAKE + 8) {
        var gx = elev(u + 0.004, v) - elev(u - 0.004, v), gy = elev(u, v + 0.004) - elev(u, v - 0.004), gl = Math.hypot(gx, gy) || 1;
        u -= gx / gl * 0.006; v -= gy / gl * 0.006; c.lineTo(MX0 + u * mw, MY0 + v * mh);
      }
      c.stroke();
    }
    stream(0.6, 0.5); stream(0.3, 0.42); stream(0.5, 0.62);
    var bad = [[MX1 - 330, MY1 - 190, 330, 190], [MX0, MY0, 140, 70]];
    /* spot heights: triangle and metres */
    c.textAlign = 'center'; c.textBaseline = 'middle';
    [[0.64, 0.33], [0.27, 0.27], [0.86, 0.62]].forEach(function (p) {
      var px = MX0 + p[0] * mw, py = MY0 + p[1] * mh, he = Math.round(elev(p[0], p[1]) / 5) * 5;
      c.fillStyle = '#4b2412'; c.beginPath(); c.moveTo(px, py - 14); c.lineTo(px + 13, py + 10); c.lineTo(px - 13, py + 10); c.closePath(); c.fill();
      c.font = 'bold 38px ' + SANS; c.fillStyle = '#e5dbbf'; c.fillRect(px - 52, py + 12, 104, 40); c.fillStyle = '#4b2412'; c.fillText(String(he), px, py + 33); bad.push([px - 52, py - 14, 104, 66]);
    });
    /* labels: index contours, horizontal on a paper patch that breaks the line */
    c.font = 'bold 40px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'middle';
    var placed = [], lab = [[750], [1000], [1250], [1500], [1750]];
    function free(x, y) {
      var n; for (n = 0; n < placed.length; n++) if (Math.abs(placed[n][0] - x) < 140 && Math.abs(placed[n][1] - y) < 56) return false;
      for (n = 0; n < bad.length; n++) if (x > bad[n][0] - 60 && x < bad[n][0] + bad[n][2] + 60 && y > bad[n][1] - 40 && y < bad[n][1] + bad[n][3] + 40) return false;
      return x > MX0 + 70 && x < MX1 - 70 && y > MY0 + 40 && y < MY1 - 40;
    }
    lab.forEach(function (L) {
      var lv = L[0], list = segs[lv], tries = 0, got = 0, want = lv >= 1500 ? 1 : 2, pick = mulberry(lv);
      while (got < want && tries++ < 400 && list.length) {
        var s = list[Math.floor(pick() * list.length)], mx = MX0 + (s[0][0] + s[1][0]) / 2 / GX * mw, my = MY0 + (s[0][1] + s[1][1]) / 2 / GY * mh;
        if (!free(mx, my)) continue;
        placed.push([mx, my]); c.fillStyle = '#e5dbbf'; c.fillRect(mx - 40, my - 20, 80, 40); c.fillStyle = '#7a3c1a'; c.fillText(String(lv), mx, my + 2); got++;
      }
    });
    /* border, edge numbers, title block, scale bar, north arrow */
    c.strokeStyle = '#4a3a24'; c.lineWidth = 4; c.strokeRect(MX0, MY0, mw, mh); c.lineWidth = 1.5; c.strokeRect(MX0 - 14, MY0 - 14, mw + 28, mh + 28);
    c.font = '24px ' + SANS; c.fillStyle = '#4a3a24';
    for (k = 0; k <= 9; k += 3) c.fillText(String(40 + k), MX0 + k * mw / 9, MY0 - 30);
    for (k = 0; k <= 6; k += 2) c.fillText(String(12 + k), MX0 - 36, MY0 + k * mw / 9);
    var bx = MX1 - 326, by = MY1 - 186; c.fillStyle = '#efe6cc'; c.fillRect(bx, by, 326, 186); c.strokeStyle = '#4a3a24'; c.lineWidth = 3; c.strokeRect(bx, by, 326, 186);
    c.fillStyle = '#3a2a16'; c.textAlign = 'left'; c.font = 'bold 36px ' + SANS; c.fillText('RIDGEBACK VALLEY', bx + 14, by + 34);
    c.font = '24px ' + SANS; c.fillText('Contour interval 50 m', bx + 14, by + 68); c.fillText('Index contours every 250 m', bx + 14, by + 96);
    c.font = 'bold 26px ' + SANS; c.fillStyle = '#8a4a22'; c.fillText('SCHEMATIC, invented terrain', bx + 14, by + 126);
    var sx0 = bx + 20, sy0 = by + 156, u100 = mw / 9 * 1;   /* one grid square is 1 km */
    c.fillStyle = '#3a2a16'; c.fillRect(sx0, sy0, u100, 8); c.fillStyle = '#efe6cc'; c.fillRect(sx0 + u100, sy0, u100, 8); c.strokeStyle = '#3a2a16'; c.lineWidth = 2; c.strokeRect(sx0, sy0, u100 * 2, 8);
    c.fillStyle = '#3a2a16'; c.font = '22px ' + SANS; c.textAlign = 'center'; c.fillText('0', sx0, sy0 - 8); c.fillText('1', sx0 + u100, sy0 - 8); c.fillText('2 km', sx0 + u100 * 2 + 12, sy0 - 8);
    var nx = MX0 + 56, ny = MY0 + 96; c.fillStyle = '#4a3a24'; c.beginPath(); c.moveTo(nx, ny - 40); c.lineTo(nx + 14, ny + 12); c.lineTo(nx, ny + 2); c.lineTo(nx - 14, ny + 12); c.closePath(); c.fill(); c.font = 'bold 30px ' + SANS; c.fillText('N', nx, ny - 52);
  });
}

function baroTex(T) {
  return tex(T, 512, 512, function (c, w, h) {
    var cx = 256, cy = 256, k;
    c.fillStyle = '#e1d7bc'; c.beginPath(); c.arc(cx, cy, 254, 0, 7); c.fill();
    function ang(p) { return (-135 + (p - 960) / 80 * 270) * PI / 180; }
    c.strokeStyle = '#33281c'; c.fillStyle = '#33281c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (k = 960; k <= 1040; k += 2) {
      var a = ang(k), big = k % 10 === 0, r1 = big ? 196 : 212, r2 = 232; c.lineWidth = big ? 4 : 2;
      c.beginPath(); c.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1); c.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); c.stroke();
      if (k % 20 === 0) { c.font = 'bold 34px ' + SANS; c.fillText(String(k), cx + Math.sin(a) * 166, cy - Math.cos(a) * 166); }
    }
    c.font = 'bold 28px ' + SANS;
    [['STORMY', 970], ['RAIN', 985], ['CHANGE', 1000], ['FAIR', 1015], ['VERY DRY', 1030]].forEach(function (wd) { var a = ang(wd[1]); c.fillText(wd[0], cx + Math.sin(a) * 96, cy - Math.cos(a) * 96 + (Math.abs(Math.sin(a)) > 0.6 ? 0 : 0)); });
    c.font = 'bold 30px ' + SANS; c.fillText('hPa', cx, cy + 66); c.font = '22px ' + SANS; c.fillText('ANEROID', cx, cy + 100);
    var an = ang(1013); c.fillStyle = '#9a4a24'; c.beginPath(); c.moveTo(cx + Math.sin(an + PI) * 40, cy - Math.cos(an + PI) * 40); c.lineTo(cx + Math.sin(an - 0.07) * 20, cy - Math.cos(an - 0.07) * 20); c.lineTo(cx + Math.sin(an) * 196, cy - Math.cos(an) * 196); c.lineTo(cx + Math.sin(an + 0.07) * 20, cy - Math.cos(an + 0.07) * 20); c.closePath(); c.fill();
    c.fillStyle = '#33281c'; c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.fill();
  });
}

function thermoTex(T) {
  return tex(T, 128, 512, function (c, w, h) {
    var k, y0 = 66, y1 = 430;
    c.fillStyle = '#e1d7bc'; c.fillRect(0, 0, w, h);
    function Y(t) { return y1 - (t + 10) / 50 * (y1 - y0); }
    c.fillStyle = '#d4cdc0'; c.fillRect(70, Y(40) - 6, 14, y1 - Y(40) + 6); c.beginPath(); c.arc(77, y1 + 22, 22, 0, 7); c.fill();
    c.fillStyle = '#b5352c'; c.fillRect(73, Y(18), 8, y1 - Y(18)); c.beginPath(); c.arc(77, y1 + 22, 17, 0, 7); c.fill();
    c.strokeStyle = '#33281c'; c.fillStyle = '#33281c'; c.textAlign = 'right'; c.textBaseline = 'middle';
    for (k = -10; k <= 40; k += 2) { var big = k % 10 === 0; c.lineWidth = big ? 3 : 1.5; c.beginPath(); c.moveTo(66, Y(k)); c.lineTo(big ? 40 : 52, Y(k)); c.stroke(); if (big) { c.font = 'bold 30px ' + SANS; c.fillText(String(k), 36, Y(k)); } }
    c.textAlign = 'center'; c.font = 'bold 32px ' + SANS; c.fillText('\u00b0C', 64, 30);
  });
}

/* label cards for the rock shelf and the soil jars, one atlas (1024 x 512) */
var ROCK_CARDS = [['SANDSTONE', 'sedimentary', '#c28a4a'], ['QUARTZ', 'SiO2 crystals', '#8f9aa6'], ['GRANITE', 'igneous', '#b3665a'], ['OBSIDIAN', 'volcanic glass', '#4a4650'], ['AMMONITE', 'fossil, ~180 Ma', '#8a7a55'], ['COPPER ORE', 'malachite, azurite', '#3f8f6a']];
var SOIL_COLORS = ['#3b281b', '#8a5a38', '#b98a5a', '#8d8a86'];   /* topsoil, subsoil, clay, bedrock (the order in a profile, top first) */
function atlasTex(T) {
  return tex(T, 1024, 512, function (c, w, h) {
    c.fillStyle = '#e2d8ba'; c.fillRect(0, 0, w, h);
    ROCK_CARDS.forEach(function (cd, k) {
      var x = (k % 4) * 256, y = Math.floor(k / 4) * 128;
      c.fillStyle = '#ece3c8'; c.fillRect(x + 4, y + 4, 248, 120); c.fillStyle = cd[2]; c.fillRect(x + 4, y + 4, 248, 20); c.strokeStyle = '#4a3a24'; c.lineWidth = 3; c.strokeRect(x + 4, y + 4, 248, 120);
      c.fillStyle = '#2b2118'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var fs = 40; c.font = 'bold ' + fs + 'px ' + SANS; while (c.measureText(cd[0]).width > 228) { fs -= 2; c.font = 'bold ' + fs + 'px ' + SANS; }
      c.fillText(cd[0], x + 128, y + 62); c.font = '24px ' + SANS; c.fillStyle = '#5a4a34'; c.fillText(cd[1], x + 128, y + 100);
    });
    ['SITE A', 'SITE B', 'SITE C', 'SITE D'].forEach(function (s, k) {
      var x = 512 + k * 128, y = 128; c.fillStyle = '#ece3c8'; c.fillRect(x + 2, y + 2, 124, 60); c.strokeStyle = '#4a3a24'; c.lineWidth = 3; c.strokeRect(x + 2, y + 2, 124, 60);
      c.fillStyle = '#2b2118'; c.font = 'bold 30px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, x + 64, y + 33);
    });
    /* the soil profile card: layers in order, top first */
    var X = 0, Y = 256; c.fillStyle = '#ece3c8'; c.fillRect(X + 4, Y + 4, 248, 248); c.strokeStyle = '#4a3a24'; c.lineWidth = 3; c.strokeRect(X + 4, Y + 4, 248, 248);
    c.fillStyle = '#2b2118'; c.font = 'bold 30px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SOIL PROFILE', X + 128, Y + 32);
    var names = ['TOPSOIL', 'SUBSOIL', 'CLAY', 'BEDROCK'];
    for (var k2 = 0; k2 < 4; k2++) {
      c.fillStyle = SOIL_COLORS[k2]; c.fillRect(X + 18, Y + 60 + k2 * 44, 70, 44);
      c.fillStyle = '#2b2118'; c.textAlign = 'left'; c.font = 'bold 25px ' + SANS; c.fillText(names[k2], X + 100, Y + 83 + k2 * 44);
    }
    c.strokeStyle = '#2b2118'; c.lineWidth = 3; c.strokeRect(X + 18, Y + 60, 70, 176);
    c.font = '20px ' + SANS; c.textAlign = 'center'; c.fillStyle = '#5a4a34'; c.fillText('top first, bottom last', X + 128, Y + 244);
  });
}

/* a framed geological cross-section: younger layers above older ones, a fault that offsets them, a granite body below */
function sectionTex(T) {
  return tex(T, 512, 384, function (c, w, h) {
    var X0 = 20, X1 = 492, XF = 290, OFF = 22, k, x, names = ['soil', 'sandstone', 'shale', 'limestone', 'granite'], cols = ['#5a3f2a', '#c9a56b', '#7f7d78', '#b9c2c0', '#b38a80'];
    c.fillStyle = '#e4dabf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d7e3e6'; c.fillRect(X0, 50, X1 - X0, 80);
    function bound(i, xx) { var base = [96, 112, 150, 196, 250][i], amp = [10, 9, 12, 14, 10][i]; return base + amp * Math.sin(xx * 0.018 + 0.4) + (i > 0 ? 6 * Math.sin(xx * 0.05 + i) : 0) + (xx > XF - 36 + (base - 90) * 0.3167 ? OFF : 0); }
    for (k = 0; k < 5; k++) {
      c.fillStyle = cols[k]; c.beginPath(); c.moveTo(X0, k < 4 ? bound(k, X0) : bound(4, X0));
      for (x = X0; x <= X1; x += 4) c.lineTo(x, bound(k, x));
      c.lineTo(X1, 352); c.lineTo(X0, 352); c.closePath(); c.fill();
    }
    for (k = 1; k < 5; k++) { c.strokeStyle = 'rgba(30,20,10,0.6)'; c.lineWidth = 1.5; c.beginPath(); for (x = X0; x <= X1; x += 4) { if (x === X0) c.moveTo(x, bound(k, x)); else c.lineTo(x, bound(k, x)); } c.stroke(); }
    c.strokeStyle = '#2b2118'; c.lineWidth = 3; c.beginPath(); c.moveTo(XF - 36, 90); c.lineTo(XF + 40, 330); c.stroke();
    c.fillStyle = '#2b2118'; c.font = 'bold 17px ' + SANS; c.fillText('fault', XF + 46, 322);
    c.fillStyle = '#e4dabf'; for (k = 0; k < 60; k++) { c.fillRect(X0 + 10 + ((k * 53) % 420), 270 + ((k * 31) % 70), 3, 2); }
    c.strokeStyle = '#2b2118'; c.lineWidth = 3; c.strokeRect(X0, 50, X1 - X0, 302);
    c.fillStyle = '#2b2118'; c.font = 'bold 28px ' + SANS; c.fillText('CROSS-SECTION', X0, 34); c.font = '17px ' + SANS; c.fillText('schematic, not to scale', 300, 34);
    var ly = [82, 134, 172, 220, 290];
    for (k = 0; k < 5; k++) { c.fillStyle = k === 2 || k === 4 ? '#f0e8d0' : '#2b2118'; c.font = 'bold 20px ' + SANS; c.fillText(names[k], X0 + 10, ly[k] + (k === 0 ? 0 : 18)); }
    c.strokeStyle = '#2b2118'; c.lineWidth = 2; c.beginPath(); c.moveTo(X0 + 54, 86); c.lineTo(X0 + 64, 100); c.stroke();
  });
}

function notebookTex(T) {
  return tex(T, 512, 384, function (c, w, h) {
    var r = mulberry(12), i, k;
    c.fillStyle = '#e3dabe'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(90,70,40,0.4)'; c.fillRect(w / 2 - 2, 0, 4, h);
    c.strokeStyle = 'rgba(100,130,150,0.35)'; c.lineWidth = 1;
    for (i = 40; i < h; i += 24) { c.beginPath(); c.moveTo(w / 2 + 14, i); c.lineTo(w - 14, i); c.stroke(); }
    c.fillStyle = '#3a2f22'; c.font = 'italic 24px ' + SERIF; c.fillText('Site 3, road cut', 22, 32); c.font = 'italic 17px ' + SERIF; c.fillText('dip ~25 deg W', 22, 358);
    /* a sketch of tilted strata with labels */
    var cols = ['#b88a54', '#8e8a7c', '#c9a56e', '#7a6a58'], names = ['sandstone', 'shale', 'sandstone', 'siltstone'];
    c.save(); c.beginPath(); c.rect(24, 52, 210, 270); c.clip();
    for (k = 0; k < 4; k++) { c.fillStyle = cols[k]; c.beginPath(); c.moveTo(24, 70 + k * 62); c.lineTo(234, 120 + k * 62); c.lineTo(234, 182 + k * 62); c.lineTo(24, 132 + k * 62); c.closePath(); c.fill(); c.strokeStyle = '#3a2f22'; c.lineWidth = 2; c.stroke(); }
    c.restore(); c.strokeStyle = '#3a2f22'; c.lineWidth = 3; c.strokeRect(24, 52, 210, 270);
    c.font = 'italic 17px ' + SERIF; c.fillStyle = '#f2ead2'; for (k = 0; k < 4; k++) c.fillText(names[k], 70, 118 + k * 62 + 16 - (k % 2) * 4);
    c.strokeStyle = '#9a4a24'; c.lineWidth = 3; c.beginPath(); c.moveTo(178, 290); c.lineTo(214, 306); c.stroke();
    /* handwriting-like lines on the right page */
    c.strokeStyle = '#3a2f22'; c.lineWidth = 2;
    for (i = 0; i < 10; i++) { var yy = 54 + i * 24, x0 = w / 2 + 22, ln = 60 + r() * 150; c.beginPath(); c.moveTo(x0, yy); for (k = 0; k < ln; k += 6) c.lineTo(x0 + k, yy - 2 - Math.sin(k * 0.9 + i) * 3 * r()); c.stroke(); }
    c.font = 'italic 21px ' + SERIF; c.fillStyle = '#3a2f22'; c.fillText('strike 040', w / 2 + 22, 36);
  });
}

/* a small desk globe: simplified continents (not to scale of detail) on muted oceans, graticule every 30 degrees */
function globeTex(T) {
  var LAND = [
    [[-168,66],[-162,70],[-156,71],[-141,70],[-128,70],[-115,68],[-95,72],[-85,69],[-82,63],[-93,60],[-95,56],[-88,56],[-82,52],[-79,55],[-77,62],[-70,60],[-64,60],[-61,56],[-56,52],[-60,47],[-66,45],[-70,43],[-74,40],[-76,35],[-81,31],[-80,26],[-82,26],[-84,30],[-89,30],[-94,29],[-97,26],[-97,22],[-92,18],[-88,21],[-87,16],[-83,10],[-79,9],[-78,8],[-85,10],[-92,14],[-97,16],[-105,20],[-110,24],[-112,29],[-115,30],[-117,33],[-121,35],[-124,40],[-124,47],[-127,51],[-133,55],[-140,59],[-148,60],[-152,58],[-158,56],[-164,55],[-162,59],[-166,62],[-165,64]],
    [[-73,78],[-60,82],[-30,83],[-20,80],[-20,72],[-30,68],[-43,60],[-50,64],[-55,70],[-62,76]],
    [[-77,8],[-72,12],[-63,10],[-55,6],[-50,0],[-44,-3],[-35,-6],[-35,-9],[-39,-14],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-40],[-65,-45],[-68,-50],[-69,-54],[-73,-52],[-75,-46],[-73,-38],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-77,4]],
    [[-9,37],[-9,43],[-2,43],[-1,46],[-4,48],[2,51],[5,53],[8,54],[9,57],[11,55],[14,54],[20,54],[21,57],[24,59],[30,60],[22,60],[21,64],[25,66],[20,63],[17,61],[18,59],[16,56],[12,56],[7,58],[5,61],[10,64],[14,67],[19,70],[28,71],[40,67],[44,68],[60,69],[70,73],[90,76],[110,76],[130,72],[150,71],[170,70],[180,69],[180,65],[173,64],[165,60],[163,56],[157,51],[156,57],[150,59],[143,59],[138,55],[141,52],[140,47],[135,43],[130,42],[129,36],[126,35],[126,38],[122,40],[121,37],[119,35],[122,31],[120,26],[115,22],[109,21],[108,16],[109,11],[105,9],[103,11],[101,13],[100,8],[103,2],[100,4],[98,9],[98,16],[94,17],[92,22],[88,22],[86,20],[80,15],[80,10],[77,8],[73,17],[72,21],[67,24],[62,25],[57,26],[52,28],[48,30],[50,27],[52,24],[56,25],[59,22],[55,17],[50,15],[44,13],[43,16],[39,21],[35,28],[34,31],[36,36],[30,36],[27,37],[26,40],[29,41],[35,42],[41,41],[41,44],[37,46],[33,45],[30,46],[29,44],[26,41],[24,40],[23,37],[21,39],[19,42],[16,44],[13,45],[12,44],[16,41],[16,38],[12,38],[9,44],[3,43],[-1,38],[-5,36]],
    [[-17,21],[-16,28],[-10,30],[-6,36],[10,37],[11,33],[20,31],[32,31],[34,28],[38,20],[43,12],[51,12],[48,5],[41,-2],[40,-10],[40,-16],[35,-24],[32,-29],[27,-34],[20,-35],[18,-32],[14,-23],[12,-14],[13,-6],[9,-1],[9,4],[5,6],[-4,5],[-8,4],[-13,8],[-17,13]],
    [[114,-22],[122,-18],[129,-15],[136,-12],[142,-11],[146,-19],[153,-26],[151,-34],[146,-39],[140,-38],[135,-34],[130,-32],[116,-35],[115,-31]],
    [[-5,50],[1,51],[2,53],[-2,57],[-5,58],[-6,56],[-3,54],[-5,52]], [[130,31],[135,34],[140,36],[142,40],[141,43],[145,44],[142,45],[140,41],[137,37],[132,35]],
    [[95,5],[104,-5],[106,-6],[100,-1]], [[109,-3],[114,-4],[118,1],[117,7],[111,2]], [[131,-1],[141,-3],[150,-10],[141,-9],[135,-4]], [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]], [[-24,64],[-14,65],[-14,66],[-22,66]], [[172,-35],[178,-38],[174,-41],[171,-45],[167,-46],[172,-41]]
  ];
  return tex(T, 1024, 512, function (c, w, h) {
    function X(lon) { return (lon + 180) / 360 * w; } function Y(lat) { return (90 - lat) / 180 * h; }
    c.fillStyle = '#86a9b6'; c.fillRect(0, 0, w, h);
    LAND.forEach(function (poly) { c.beginPath(); poly.forEach(function (p, k) { if (k) c.lineTo(X(p[0]), Y(p[1])); else c.moveTo(X(p[0]), Y(p[1])); }); c.closePath(); c.fillStyle = '#c3b684'; c.fill(); c.strokeStyle = '#7a6a48'; c.lineWidth = 2; c.stroke(); });
    c.fillStyle = '#a3ab7e'; c.fillRect(X(-18), Y(21), X(36) - X(-18), Y(10) - Y(21) + 0);    /* Sahel and savanna belt */
    c.fillStyle = '#d8d2bd'; c.fillRect(0, Y(-70), w, h - Y(-70)); c.fillRect(0, 0, w, Y(82));
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1.5;
    for (var lo = -180; lo <= 180; lo += 30) { c.beginPath(); c.moveTo(X(lo), 0); c.lineTo(X(lo), h); c.stroke(); }
    for (var la = -60; la <= 60; la += 30) { c.beginPath(); c.moveTo(0, Y(la)); c.lineTo(w, Y(la)); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(w, Y(0)); c.stroke();
  });
}

/* ---------- soft geometry helpers ---------- */
function displace(geo, amp, freq, seed) {
  var pos = geo.attributes.position, i, x, y, z, l, n;
  for (i = 0; i < pos.count; i++) {
    x = pos.getX(i); y = pos.getY(i); z = pos.getZ(i); l = Math.hypot(x, y, z) || 1; n = (vn3(x * freq + 11, y * freq + 7, z * freq + 3, seed) - 0.5) * 2 * amp;
    pos.setXYZ(i, x + x / l * n, y + y / l * n, z + z / l * n);
  }
  return geo;
}

ENV.fieldstation = function (T) {
  var g = new T.Group(), rnd = mulberry(23), i, j, k, still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var UB = new T.BoxGeometry(1, 1, 1);
  var solid = makeBake(T), rocks = makeBake(T), glass = makeBake(T), rotor = makeBake(T);
  var shLo = makeShadows(T, 0.5), shSoft = makeShadows(T, 0.3);
  var CT = new T.Color();
  function dim(hex) { return new T.Color(hex).multiplyScalar(0.8); }
  function bx(B, w, h, d, x, y, z, color, ry, rx, rz) { B.add(UB, color, x, y, z, rx, ry, rz, w, h, d); }
  function cy(B, rt, rb, h, x, y, z, color, rx, ry, rz, seg) { B.add(new T.CylinderGeometry(rt, rb, h, seg || 14), color, x, y, z, rx, ry, rz); }
  function sp(B, r, x, y, z, color, sx, sy, sz, rx, ry, rz) { B.add(new T.SphereGeometry(r, 10, 8), color, x, y, z, rx, ry, rz, sx, sy, sz); }
  function lathe(B, prof, color, x, y, z, seg) { B.add(K.lathe(T, prof, seg || 24), color, x, y, z); }

  /* light: the shared budget, warm morning from the window side */
  g.add(new T.HemisphereLight(0xfff0d8, 0x4a3d2c, 0.5));
  var key = new T.DirectionalLight(0xffe2b0, 0.3); key.position.set(10, 14, 10); g.add(key);
  var fill = new T.DirectionalLight(0xe4e8ee, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe4c0, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---------- shell: floor, rug, walls, ceiling ----------
     Big planes draw first (renderOrder), everything standing on or in front of them after, so nothing flickers at room distance. */
  var floor = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshStandardMaterial({ map: floorTex(T), color: 0xc0c0c0, roughness: 0.9, metalness: 0 })); floor.rotation.x = -PI / 2; floor.position.set(0, FLOOR, ZC); floor.renderOrder = -3; g.add(floor);
  var rug = new T.Mesh(new T.PlaneGeometry(70, 32), new T.MeshStandardMaterial({ map: rugTex(T), color: 0xc0c0c0, roughness: 0.95, metalness: 0 })); rug.rotation.x = -PI / 2; rug.position.set(0, FLOOR + 0.12, 0); rug.renderOrder = -2; g.add(rug);
  shSoft.add(0, FLOOR + 0.2, 0, 66, 30);

  var plaster = plasterTex(T), WH = CEIL - FLOOR, WYC = (CEIL + FLOOR) / 2;
  function wallMat(rx, ry) { var t = plaster.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new T.MeshBasicMaterial({ map: t }); }
  /* back wall in four panels around the window hole */
  var bw = new T.Group(); bw.position.set(0, WYC, ZB); g.add(bw);
  var bm = wallMat(5.5, 2.2), W2 = XS * 2, wy0 = WIN.y0 - WYC, wy1 = WIN.y1 - WYC;
  [[-XS, -WH / 2, XS, wy0], [-XS, wy1, XS, WH / 2], [-XS, wy0, WIN.x0, wy1], [WIN.x1, wy0, XS, wy1]].forEach(function (p) { var m = new T.Mesh(K.rectGeo(T, W2, WH, p[0], p[1], p[2], p[3]), bm); m.renderOrder = -3; bw.add(m); });
  [[-XS, ZC, PI / 2], [XS, ZC, -PI / 2]].forEach(function (s) {
    var m = new T.Mesh(new T.PlaneGeometry(ZF - ZB, WH), wallMat((ZF - ZB) / 20, 2.2)); m.position.set(s[0], WYC, s[1]); m.rotation.y = s[2]; m.renderOrder = -3; g.add(m);
  });
  var ceil = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshBasicMaterial({ color: '#8a7a5e' })); ceil.rotation.x = PI / 2; ceil.position.set(0, CEIL, ZC); ceil.renderOrder = -3; g.add(ceil);

  /* timber boarding to rail height, chair rail, skirting; beams under the ceiling */
  var boardMapA = boardTex(T), WAIN_TOP = 1.6, WAIN_H = WAIN_TOP - FLOOR;
  function boarding(len, x, z, ry) {
    var mp = boardMapA.clone(); mp.needsUpdate = true; mp.repeat.set(len / 12, 1);
    var side = new T.MeshStandardMaterial({ map: mp, color: 0xc0c0c0, roughness: 0.85, metalness: 0 }), cap = new T.MeshStandardMaterial({ color: dim('#6a4c2e'), roughness: 0.85 });
    var grp = new T.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; g.add(grp);
    var b = new T.Mesh(new T.BoxGeometry(len, WAIN_H, 0.7), [cap, cap, cap, cap, side, cap]); b.position.set(0, FLOOR + WAIN_H / 2, 0.15); grp.add(b);
    var rail = new T.Mesh(new T.BoxGeometry(len, 0.4, 1.1), new T.MeshStandardMaterial({ color: dim('#5a3f26'), roughness: 0.85 })); rail.position.set(0, WAIN_TOP + 0.2, 0.34); grp.add(rail);
    var skirt = new T.Mesh(new T.BoxGeometry(len, 1.1, 0.35), new T.MeshStandardMaterial({ color: dim('#4a3320'), roughness: 0.85 })); skirt.position.set(0, FLOOR + 0.55, 0.62); grp.add(skirt);
  }
  boarding(XS * 2, 0, ZB, 0); boarding(ZF - ZB, -XS, ZC, PI / 2); boarding(ZF - ZB, XS, ZC, -PI / 2);
  [-4, 18, 40, 62].forEach(function (z) { bx(solid, XS * 2, 1.6, 1.8, 0, CEIL - 0.8, z, '#6a4a2c'); });

  /* ---------- the window: casing, deep reveal, sill, casement with mullions, glass ---------- */
  var wx0 = WIN.x0, wx1 = WIN.x1, wy0b = WIN.y0, wy1b = WIN.y1, wwid = wx1 - wx0, whgt = wy1b - wy0b, wcx = (wx0 + wx1) / 2, wcy = (wy0b + wy1b) / 2;
  var CAS = '#cdc3a3', JAMB = '#a9ae92', SASH = '#d3cab0';
  bx(solid, 1.1, whgt + 2.2, 0.7, wx0 - 0.55, wcy + 0.55, ZB + 0.2, CAS); bx(solid, 1.1, whgt + 2.2, 0.7, wx1 + 0.55, wcy + 0.55, ZB + 0.2, CAS);
  bx(solid, wwid + 3.4, 1.1, 0.7, wcx, wy1b + 0.55, ZB + 0.2, CAS); bx(solid, wwid + 2.2, 0.7, 0.7, wcx, wy0b - 1.4, ZB + 0.2, CAS);
  bx(solid, 0.3, whgt, 3.2, wx0 - 0.15, wcy, ZB - 1.6, JAMB); bx(solid, 0.3, whgt, 3.2, wx1 + 0.15, wcy, ZB - 1.6, JAMB); bx(solid, wwid, 0.3, 3.2, wcx, wy1b + 0.15, ZB - 1.6, JAMB);
  bx(solid, wwid + 2.8, 0.5, 5.6, wcx, wy0b - 0.25, ZB - 0.2, '#b6aa88');                      /* sill: top at the window's lower edge, projects into the room */
  bx(solid, wwid + 2.8, 0.18, 0.5, wcx, wy0b - 0.59, ZB + 2.5, '#a69a78');
  [wx0 + 1.5, wcx, wx1 - 1.5].forEach(function (bxx) { bx(solid, 0.5, 1.2, 1.2, bxx, wy0b - 1.0, ZB + 0.3, '#a69a78'); });
  var SZ = ZB - 2.0;                                                                         /* the casement sits two units back from the wall face */
  bx(solid, 1.0, whgt + 0.2, 0.8, wx0 + 0.4, wcy, SZ, SASH); bx(solid, 1.0, whgt + 0.2, 0.8, wx1 - 0.4, wcy, SZ, SASH);
  bx(solid, wwid, 1.0, 0.8, wcx, wy1b - 0.4, SZ, SASH); bx(solid, wwid, 1.0, 0.8, wcx, wy0b + 0.4, SZ, SASH);
  [wx0 + wwid / 3, wx0 + wwid * 2 / 3].forEach(function (mx) { bx(solid, 0.5, whgt - 1.4, 0.6, mx, wcy, SZ, SASH); });
  bx(solid, wwid - 1.4, 0.5, 0.6, wcx, wy0b + whgt * 0.5, SZ, SASH);
  var glassSheen = new T.Mesh(new T.PlaneGeometry(wwid - 1.2, whgt - 1.2), new T.MeshBasicMaterial({
    map: tex(T, 128, 128, function (c, w, h) { var gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.03)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { flat: true }),
    transparent: true, depthWrite: false }));
  glassSheen.position.set(wcx, wcy, SZ - 0.1); glassSheen.renderOrder = 3; g.add(glassSheen);

  /* the view: painted layers pushed back in depth. The sky is opaque and drawn first without depth; the rest are transparent and depth-tested against the wall. */
  function viewLayer(map, rect, depth, order, opaque) {
    var kk = (43 + depth) / 43, cx = (rect[0] + rect[1]) / 2, cyy = (rect[2] + rect[3]) / 2;
    var mm = new T.MeshBasicMaterial({ map: map, transparent: !opaque, depthWrite: false, depthTest: !opaque, fog: false });
    var mesh = new T.Mesh(new T.PlaneGeometry((rect[1] - rect[0]) * kk, (rect[3] - rect[2]) * kk), mm);
    mesh.position.set(cx * kk, 10.8 + (cyy - 10.8) * kk, ZB - depth); mesh.renderOrder = order; g.add(mesh); return mesh;
  }
  viewLayer(skyTex(T), SKY_RECT, 100, -30, true);
  viewLayer(cloudTex(T, CLOUD_RECT), CLOUD_RECT, 70, -29, false);
  viewLayer(mountainTex(T, { w: 1792, h: 384, x0: FAR_RECT[0], x1: FAR_RECT[1], y0: FAR_RECT[2], y1: FAR_RECT[3], base: 8.8, low: 1.2, rough: 1.7, maxH: 8, seed: 3, snow: 11.5, tree: 9.6, haze_k: 0.3,
    peaks: [[-24, 5.0, 7], [-14, 6.2, 8], [-2, 5.8, 8], [10.5, 6.6, 8.5], [19.5, 5.4, 7], [27.5, 6.9, 9], [36.5, 4.8, 7], [45, 6.6, 8], [53, 5.0, 6], [61, 5.8, 8], [67, 4.5, 6]],
    rockLit: '#c4a483', rockShade: '#7e7a8c', snowLit: '#f2e6c8', snowShade: '#b4bdd2', green: '#7b8a68', haze: '#e8d6a8' }), FAR_RECT, 55, -28, false);
  viewLayer(mountainTex(T, { w: 1536, h: 288, x0: MID_RECT[0], x1: MID_RECT[1], y0: MID_RECT[2], y1: MID_RECT[3], base: 9.0, low: 0.9, rough: 1.0, maxH: 3.6, seed: 8, snow: 99, tree: 12.6, haze_k: 0.3,
    peaks: [[-12, 3.0, 6], [6, 2.8, 6], [17.5, 3.3, 8], [28, 2.6, 6], [38, 3.2, 8], [47, 2.4, 6], [56, 3.0, 6]],
    rockLit: '#99946a', rockShade: '#546a5e', snowLit: '#ffffff', snowShade: '#ffffff', green: '#5d7458', haze: '#d6cca2' }), MID_RECT, 36, -27, false);
  viewLayer(lakeTex(T), LAKE_RECT, 22, -26, false);
  viewLayer(hillTex(T), HILL_RECT, 9, -25, false);

  /* ---------- the scarred pine field table: 72 wide, 26 deep ---------- */
  var TW = 72, TD = 26, TZ0 = -15.5, TZ1 = 10.5, TCZ = (TZ0 + TZ1) / 2, TTH = 0.9, TOP = -0.03;
  var tg = new T.BoxGeometry(TW, TTH, TD), tuv = tg.attributes.uv, tk;
  for (tk = 8; tk < 12; tk++) tuv.setY(tk, tuv.getY(tk) * TD / 36);
  var edgeMat = new T.MeshStandardMaterial({ color: dim('#a98250'), roughness: 0.85 }), topMat = new T.MeshStandardMaterial({ map: pineTex(T), color: 0xc0c0c0, roughness: 0.85, metalness: 0 });
  var top = new T.Mesh(tg, [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]); top.position.set(0, TOP - TTH / 2, TCZ); g.add(top);
  var PINE = '#a47c4a', PINE2 = '#94703f', ay = TOP - TTH - 1.0, legH = TOP - TTH - FLOOR;
  bx(solid, TW - 4.6, 2.0, 0.9, 0, ay, TZ1 - 1.6, PINE); bx(solid, TW - 4.6, 2.0, 0.9, 0, ay, TZ0 + 1.6, PINE);
  bx(solid, 0.9, 2.0, TD - 4.6, TW / 2 - 1.6, ay, TCZ, PINE); bx(solid, 0.9, 2.0, TD - 4.6, -TW / 2 + 1.6, ay, TCZ, PINE);
  [[-1, TZ0 + 1.6], [1, TZ0 + 1.6], [-1, TZ1 - 1.6], [1, TZ1 - 1.6]].forEach(function (l) {
    var lx = l[0] * (TW / 2 - 1.6); bx(solid, 2.2, legH, 2.2, lx, FLOOR + legH / 2, l[1], PINE2); shLo.add(lx, FLOOR + 0.22, l[1], 5, 5);
  });
  bx(solid, TW - 5, 0.7, 0.6, 0, FLOOR + 3.4, TZ0 + 1.6, PINE2); bx(solid, TW - 5, 0.7, 0.6, 0, FLOOR + 3.4, TZ1 - 1.6, PINE2);
  bx(solid, 0.6, 0.7, TD - 4.6, TW / 2 - 1.6, FLOOR + 3.4, TCZ, PINE2); bx(solid, 0.6, 0.7, TD - 4.6, -TW / 2 + 1.6, FLOOR + 3.4, TCZ, PINE2);
  var tableShadow = K.contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5); tableShadow.material.polygonOffset = true; tableShadow.material.polygonOffsetFactor = -2; tableShadow.material.polygonOffsetUnits = -2;   /* the stage sizes this under the subject */

  /* ---------- rock and mineral shelf, under the map ---------- */
  var SH_Y = 2.0, SH_X0 = -35, SH_X1 = -6, SH_Z0 = ZB + 0.2, SH_Z1 = ZB + 4.4, SH_ZC = (SH_Z0 + SH_Z1) / 2;
  bx(solid, SH_X1 - SH_X0, 0.45, SH_Z1 - SH_Z0, (SH_X0 + SH_X1) / 2, SH_Y - 0.225, SH_ZC, '#9a7648');
  bx(solid, SH_X1 - SH_X0 + 0.2, 0.3, 0.3, (SH_X0 + SH_X1) / 2, SH_Y - 0.05, SH_Z1 + 0.05, '#7d5c36');
  [SH_X0 + 2.5, -20, SH_X1 - 2.5].forEach(function (bxx) { bx(solid, 0.5, 2.2, 0.35, bxx, SH_Y - 1.4, ZB + 0.55, '#7d5c36'); bx(solid, 0.5, 0.35, 2.6, bxx, SH_Y - 0.65, SH_ZC - 0.2, '#7d5c36'); });

  var labels = makeQuads(T, atlasTex(T), 1024, 512);
  var rockX = [-32.6, -27.8, -23.0, -18.2, -13.4, -8.6], PL = '#b08a58', RS = 1.3, PY = SH_Y + 0.3, RZ = SH_ZC - 0.3;
  rockX.forEach(function (rx, n) {
    bx(solid, 3.6, 0.3, 2.8, rx, SH_Y + 0.15, RZ, PL);                                                              /* plinth */
    bx(solid, 2.9, 0.2, 0.9, rx, SH_Y + 0.1, SH_Z1 - 0.62, '#7d5c36');                                              /* foot that props the label */
    labels.add(rx, SH_Y + 0.82, SH_Z1 - 0.66, 2.9, 1.45, -0.45, 0, [(n % 4) * 256, Math.floor(n / 4) * 128, 256, 128]);
    shLo.add(rx, SH_Y + 0.04, SH_ZC, 4.4, 3.4);
  });
  /* hand specimens, built at about 10 cm and scaled up a third so they read at room distance */
  var BANDS = ['#c9a56b', '#b4824a', '#d8bc86', '#a8714a', '#c99a62', '#e0c9a0', '#b98f58'];
  /* 1 banded sandstone: a cut block whose bands follow height */
  rocks.open(rockX[0], PY, RZ, 0, 0, 0, RS);
  rocks.add(displace(new T.BoxGeometry(2.1, 1.7, 1.5, 6, 18, 5), 0.05, 2.2, 4), function (x, y, z) { var b = Math.floor((y + 0.85 + 0.1 * (vn2(x * 2.5, z * 2.5, 3) - 0.5)) / 0.15); return CT.set(BANDS[(ih(b, 3, 0, 1) * 7 | 0) % 7]).multiplyScalar(0.92 + 0.12 * vn3(x * 5, y * 5, z * 5, 2)); }, 0, 0.85, 0, 0, 0.25, 0);
  rocks.close();
  /* 2 quartz cluster on a dark matrix */
  rocks.open(rockX[1], PY, RZ, 0, 0, 0, RS);
  rocks.add(displace(new T.IcosahedronGeometry(0.95, 1), 0.12, 1.5, 5), '#6c6155', 0, 0.3, -0.2, 0, 0, 0, 1.1, 0.5, 0.8);
  for (k = 0; k < 11; k++) {
    var ang = rnd() * 6.283, rad = rnd() * 0.55, len = 0.9 + rnd() * 0.9, cr = 0.12 + rnd() * 0.13, tilt = 0.1 + rnd() * 0.3, smoky = rnd() < 0.28, cc = smoky ? '#a39481' : '#e4dfd1';
    rocks.open(Math.cos(ang) * rad, 0.35, Math.sin(ang) * rad - 0.2, Math.sin(ang) * tilt, 0, -Math.cos(ang) * tilt);
    rocks.add(new T.CylinderGeometry(cr * 0.92, cr, len, 6), CT.set(cc).multiplyScalar(0.94 + rnd() * 0.08), 0, len / 2, 0);
    rocks.add(new T.CylinderGeometry(0.01, cr * 0.92, cr * 1.5, 6), CT.set(cc).multiplyScalar(1), 0, len + cr * 0.75, 0);
    rocks.close();
  }
  rocks.close();
  /* 3 granite boulder */
  rocks.open(rockX[2], PY, RZ, 0, 0, 0, RS);
  rocks.add(displace(new T.IcosahedronGeometry(1, 5), 0.09, 1.6, 6), function (x, y, z, f) {
    var q = ih(f | 0, 1, 2, 9), t = vn3(x * 3, y * 3, z * 3, 4);
    if (q < 0.4) return CT.set(t > 0.5 ? '#b49a90' : '#a58c82'); if (q < 0.7) return CT.set('#968f8a'); if (q < 0.85) return CT.set('#5c5860'); return CT.set('#cdc6ba');
  }, 0, 0.74, 0, 0, 0.6, 0, 1.0, 0.75, 0.8);
  rocks.close();
  /* 4 obsidian: large conchoidal facets */
  rocks.open(rockX[3], PY, RZ, 0, 0, 0, RS);
  rocks.add(displace(new T.IcosahedronGeometry(1, 1), 0.2, 1.3, 7), function (x, y, z, f) { return CT.set('#2a2831').multiplyScalar(0.85 + 0.35 * ih(f | 0, 5, 1, 3)); }, 0, 0.74, 0, 0, 0.3, 0, 0.88, 0.72, 0.8);
  rocks.close();
  /* 5 ammonite fossil: a slab leaning back on a ledge, a logarithmic spiral of ribbed whorls in relief */
  bx(solid, 3.2, 0.28, 0.7, rockX[4], PY + 0.14, RZ + 0.7, '#7d5c36');
  rocks.open(rockX[4], PY, RZ - 0.2, 0, 0, 0, RS);
  rocks.open(0, 1.5, 0, 1.2, 0, 0);
  rocks.add(new T.CylinderGeometry(1.45, 1.5, 0.45, 26), function (x, y, z) { return CT.set('#8f8576').multiplyScalar(0.92 + 0.14 * vn2(x * 4, z * 4, 5)); }, 0, 0, 0);
  for (k = 0; k < 58; k++) {
    var th = 0.2 + k * 0.226, rr = 0.1 * Math.exp(0.18 * th), tr = 0.07 + rr * 0.24;
    rocks.add(new T.SphereGeometry(1, 8, 6), CT.set(k % 2 ? '#c4a066' : '#a1814a'), rr * Math.cos(th), 0.2 + tr * 0.3, rr * Math.sin(th), 0, 0, 0, tr, tr * 0.7, tr);
  }
  rocks.close(); rocks.close();
  /* 6 copper ore: dark host rock with patches of malachite, a little azurite and bright copper */
  rocks.open(rockX[5], PY, RZ, 0, 0, 0, RS);
  rocks.add(displace(new T.IcosahedronGeometry(1, 3), 0.14, 1.7, 8), function (x, y, z) {
    var a = vn3(x * 1.5, y * 1.5, z * 1.5, 11), b = vn3(x * 2.2 + 5, y * 2.2, z * 2.2, 12), c2 = vn3(x * 2.6, y * 2.6 + 7, z * 2.6, 13), base = 0.8 + 0.4 * vn3(x * 5, y * 5, z * 5, 14);
    if (a > 0.58) return CT.set('#4f8f70').multiplyScalar(0.75 + 0.35 * b); if (c2 > 0.76) return CT.set('#4a6f93'); if (b > 0.74) return CT.set('#a8663a'); return CT.set('#6a5444').multiplyScalar(base);
  }, 0, 0.74, 0, 0, 0.8, 0, 0.95, 0.72, 0.8);
  for (k = 0; k < 8; k++) rocks.add(new T.SphereGeometry(1, 8, 6), CT.set(k % 3 ? '#58a07c' : '#4f8f70'), (rnd() - 0.5) * 0.7, 1.15 + rnd() * 0.15, (rnd() - 0.5) * 0.4, 0, 0, 0, 0.13 + rnd() * 0.09);
  rocks.close();

  /* ---------- soil-profile jars: glass jars, layers in order topsoil, subsoil, clay, bedrock (top first) ---------- */
  var JAR_Y = 0, JZ = -12.2, jx = [12.6, 15.45, 18.3, 21.15];
  var SOILS = [
    { t: ['#3b281b', '#8a5a38', '#b98a5a', '#8d8a86'], h: [0.8, 1.0, 0.8, 0.8] },
    { t: ['#6b3a2a', '#b5472f', '#c4663d', '#9a8f86'], h: [0.5, 1.5, 0.9, 0.7] },
    { t: ['#231a14', '#5f4c3a', '#8e8a7a', '#7e8187'], h: [1.1, 0.9, 0.7, 0.7] },
    { t: ['#a8825a', '#c4a06a', '#d9c08f', '#a89c8a'], h: [0.6, 1.1, 1.0, 0.7] }
  ];
  jx.forEach(function (x, n) {
    var s = SOILS[n], y = 0.14;
    shLo.add(x, JAR_Y + 0.05, JZ, 3.2, 3.2);
    for (k = 3; k >= 0; k--) {   /* bottom layer first: bedrock, clay, subsoil, topsoil */
      var hh = s.h[k], col = s.t[k];
      solid.add(new T.CylinderGeometry(1.0, 1.0, hh, 20), (function (c0) { return function (px, py, pz) { return CT.set(c0).multiplyScalar(0.9 + 0.2 * ih(Math.floor((Math.atan2(pz, px) + 3.2) * 6), Math.floor(py * 4), 0, 5)); }; })(col), x, y + hh / 2, JZ);
      y += hh;
    }
    for (k = 0; k < 7; k++) { var pa = k / 7 * 6.283 + n; rocks.add(new T.IcosahedronGeometry(1, 0), CT.set('#8a8884').multiplyScalar(0.8 + 0.3 * rnd()), x + Math.cos(pa) * 0.86, 0.14 + s.h[3] * 0.5 + (rnd() - 0.5) * 0.3, JZ + Math.sin(pa) * 0.86, rnd() * 3, rnd() * 3, 0, 0.26, 0.2, 0.26); }
    glass.add(new T.CylinderGeometry(1.2, 1.2, 4.1, 24, 1, true), '#d4e6e0', x, 2.05, JZ);
    glass.add(new T.CircleGeometry(1.2, 24), '#d4e6e0', x, 0.02, JZ, -PI / 2);
    cy(solid, 1.28, 1.28, 0.6, x, 4.4, JZ, '#7a5632', 0, 0, 0, 24); cy(solid, 1.3, 1.3, 0.12, x, 4.14, JZ, '#5c3f22', 0, 0, 0, 24);
    labels.add(x, 1.9, JZ + 1.24, 1.5, 0.75, 0, 0, [512 + n * 128, 128, 128, 64]);
  });
  bx(solid, 12.2, 0.25, 4.0, 16.9, 0.125, JZ + 0.1, '#8e6a3f'); shLo.add(16.9, 0.28, JZ, 13.8, 5);   /* tray under the jars */
  labels.add(9.6, 1.35, JZ + 0.5, 2.5, 2.5, -0.25, 0.1, [0, 256, 256, 256]);
  bx(solid, 2.3, 0.3, 0.7, 9.6, 0.15, JZ + 0.62, '#7d5c36');

  /* ---------- the globe: wooden foot, a half meridian ring, a tilted sphere that turns very slowly ---------- */
  var GXP = -15.2, GZP = -11.4, GR = 2.0, GCY = 3.7;
  solid.open(GXP, 0, GZP, 0, 0, 0);
  lathe(solid, [[0, 0], [1.7, 0], [1.8, 0.12], [1.55, 0.38], [0.5, 0.62], [0.22, 0.95], [0, 0.95]], '#5a3d24', 0, 0, 0, 28);
  cy(solid, 0.16, 0.2, GCY - GR - 0.7, 0, (GCY - GR - 0.7) / 2 + 0.85, 0, '#4f351f');
  solid.add(new T.TorusGeometry(GR + 0.3, 0.09, 8, 44, PI), '#9c7f3e', 0, GCY, 0, 0, 0, PI / 2);
  sp(solid, 0.18, 0, GCY + GR + 0.3, 0, '#9c7f3e'); cy(solid, 0.06, 0.06, 0.5, 0, GCY + GR + 0.15, 0, '#9c7f3e');
  solid.close();
  shLo.add(GXP, 0.05, GZP, 4.6, 4.6);
  var globeMesh = new T.Mesh(new T.SphereGeometry(GR, 36, 24), new T.MeshStandardMaterial({ map: globeTex(T), color: 0xc0c0c0, roughness: 0.85, metalness: 0 }));
  var globeGroup = new T.Group(); globeGroup.position.set(GXP, GCY, GZP); globeGroup.rotation.z = 0.41; globeGroup.add(globeMesh); g.add(globeGroup);

  /* ---------- on the table: field notebook, hand lens, rock hammer, mug, sample tray ---------- */
  var NX = 15.6, NZ = -3.4;
  solid.open(NX, 0, NZ, 0, 0.35, 0);
  bx(solid, 3.7, 0.16, 2.8, 0, 0.08, 0, '#5a4a30'); bx(solid, 3.56, 0.14, 2.64, 0, 0.23, 0, '#e8e0c6');
  bx(solid, 0.12, 0.02, 2.8, 1.2, 0.32, 0, '#8a3a2a');
  cy(solid, 0.06, 0.06, 2.2, 1.0, 0.38, 0.2, '#c89a38', 0, 0, PI / 2 + 0.3, 6);
  solid.close();
  var nbPlane = new T.Mesh(new T.PlaneGeometry(3.5, 2.62), new T.MeshStandardMaterial({ map: notebookTex(T), color: 0xb0b0b0, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  nbPlane.rotation.x = -PI / 2; nbPlane.rotation.z = 0.35; nbPlane.position.set(NX, 0.31, NZ); nbPlane.renderOrder = 1; g.add(nbPlane);
  shLo.add(NX, 0.06, NZ, 4.8, 3.9);
  /* hand lens */
  var LXP = 19.8, LZP = -2.4;
  solid.open(LXP, 0, LZP, 0, -0.5, 0);
  solid.add(new T.TorusGeometry(0.45, 0.07, 8, 24), '#8a7442', 0, 0.08, 0, PI / 2); cy(solid, 0.09, 0.09, 1.5, 1.2, 0.09, 0, '#3f2c1c', 0, 0, PI / 2, 10); solid.close();
  glass.open(LXP, 0, LZP, 0, -0.5, 0); glass.add(new T.CylinderGeometry(0.4, 0.4, 0.04, 20), '#e6f0ee', 0, 0.08, 0); glass.close();
  shLo.add(LXP + 0.5, 0.06, LZP, 3.4, 1.4);
  /* rock hammer */
  solid.open(21.8, 0, -6.6, 0, 0.5, 0);
  cy(solid, 0.12, 0.13, 4.2, 0, 0.14, 0, '#9a6a3a', 0, 0, PI / 2, 10); cy(solid, 0.14, 0.14, 1.3, -1.45, 0.14, 0, '#b8542e', 0, 0, PI / 2, 10);
  bx(solid, 0.55, 0.52, 0.8, 2.1, 0.26, 0, '#5c5f63'); bx(solid, 0.55, 0.55, 0.5, 2.1, 0.275, -0.65, '#6a6d71');
  solid.add(new T.CylinderGeometry(0.0, 0.26, 1.2, 8), '#5c5f63', 2.1, 0.26, 1.0, PI / 2); solid.close();
  shLo.add(21.8, 0.06, -6.6, 5.6, 2.2);
  /* enamel mug */
  solid.open(25.6, 0, -8.6, 0, 0.5, 0);
  lathe(solid, [[0, 0], [0.5, 0], [0.56, 0.05], [0.58, 1.3], [0.54, 1.34], [0.48, 1.2], [0.48, 0.12], [0, 0.12]], '#7ea3b8', 0, 0, 0, 26); cy(solid, 0.59, 0.59, 0.1, 0, 1.32, 0, '#d8d0b8', 0, 0, 0, 26);
  cy(solid, 0.47, 0.47, 0.04, 0, 1.0, 0, '#2c1b10', 0, 0, 0, 22); solid.add(new T.TorusGeometry(0.3, 0.07, 8, 16, PI * 1.2), '#7ea3b8', 0.6, 0.72, 0, 0, 0, -PI * 0.6);
  solid.close(); shLo.add(25.6, 0.06, -8.6, 2.5, 2.5);
  /* sample tray with a few small stones, left of the globe's neighbour space */
  solid.open(-22.5, 0, -10.8, 0, 0.12, 0);
  bx(solid, 6.4, 0.5, 3.6, 0, 0.25, 0, '#8e6a3f'); bx(solid, 6.0, 0.1, 3.2, 0, 0.5, 0, '#4a3624');
  for (k = 1; k < 4; k++) bx(solid, 0.1, 0.28, 3.2, -3 + k * 1.5, 0.6, 0, '#8e6a3f'); bx(solid, 6.0, 0.28, 0.1, 0, 0.6, 0, '#8e6a3f');
  ['#b8642f', '#d8d0c2', '#3d8f6a', '#8d8a86', '#c28a4a', '#4a4650', '#a3ab7e', '#b3665a'].forEach(function (cc, n) {
    var col = n % 4, row = Math.floor(n / 4); rocks.open(-22.5, 0, -10.8, 0, 0.12, 0);
    rocks.add(displace(new T.IcosahedronGeometry(1, 1), 0.2, 2, n + 20), cc, -2.25 + col * 1.5, 0.62 + 0.22 * 0.6, (row - 0.5) * 1.5 * 0.9 + 0.0, rnd() * 3, rnd() * 3, 0, 0.36, 0.26, 0.34); rocks.close();
  });
  solid.close(); shLo.add(-22.5, 0.06, -10.8, 7.8, 4.8);
  /* a rolled map with a tie, lying near the right end */
  cy(solid, 0.42, 0.42, 5.2, 28.6, 0.42, -4.8, '#d8ccaa', 0, 0.35, PI / 2, 14); cy(solid, 0.44, 0.44, 0.5, 27.6, 0.44, -5.2, '#9a4a24', 0, 0.35, PI / 2, 14); shLo.add(28.6, 0.06, -4.8, 6.4, 2.2);

  /* ---------- window sill: cup anemometer, binoculars, a potted aloe ---------- */
  var SY = wy0b, AXP = 20.6, AZP = ZB - 0.6;
  cy(solid, 0.9, 1.0, 0.35, AXP, SY + 0.175, AZP, '#6a4a2c', 0, 0, 0, 20); cy(solid, 0.1, 0.1, 5.0, AXP, SY + 2.85, AZP, '#8a8c8e'); cy(solid, 0.3, 0.3, 0.5, AXP, SY + 5.4, AZP, '#5c5f63', 0, 0, 0, 16);
  var ARM = '#8a8c8e', CUPS = ['#b8582f', '#b8582f', '#e0d6b8'];
  for (k = 0; k < 3; k++) {
    var aa = k * PI * 2 / 3;
    rotor.open(0, 0, 0, 0, -aa, 0); cy(rotor, 0.05, 0.05, 1.9, 1.0, 0, 0, ARM, 0, 0, PI / 2, 8);
    rotor.add(new T.SphereGeometry(0.5, 14, 8, 0, PI * 2, 0, PI / 2), CUPS[k], 2.0, 0, 0, -PI / 2, 0, 0); rotor.close();
  }
  cy(rotor, 0.22, 0.22, 0.3, 0, 0, 0, '#5c5f63', 0, 0, 0, 12);
  var rotorMesh = rotor.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: T.DoubleSide })); rotorMesh.position.set(AXP, SY + 5.8, AZP); g.add(rotorMesh);
  shLo.add(AXP, SY + 0.04, AZP, 2.6, 2.6);
  /* binoculars lying on the sill, pointing out of the window */
  solid.open(15.6, SY + 0.55, ZB - 0.2, 0, 0.1, 0);
  [-0.62, 0.62].forEach(function (bxx) { cy(solid, 0.52, 0.52, 2.2, bxx, 0, 0, '#3b4234', PI / 2, 0, 0, 14); cy(solid, 0.64, 0.64, 0.5, bxx, 0, -1.2, '#2a2f26', PI / 2, 0, 0, 14); cy(solid, 0.44, 0.44, 0.7, bxx, 0, 1.4, '#2a2f26', PI / 2, 0, 0, 14); });
  bx(solid, 0.8, 0.28, 0.9, 0, 0.1, 0.2, '#2a2f26'); solid.close(); shLo.add(15.6, SY + 0.04, ZB - 0.2, 3.4, 3.2);
  /* aloe in a terracotta pot */
  var PXP = 10.4, PZP = ZB - 0.2;
  lathe(solid, [[0, 0], [0.62, 0], [0.8, 0.1], [0.95, 1.25], [0.86, 1.3], [0.76, 1.15], [0, 1.15]], '#a85f3c', PXP, SY, PZP, 20);
  for (k = 0; k < 10; k++) {
    var la = k / 10 * 6.283 + rnd(), ll = 1.5 + rnd() * 0.8, lt = 0.35 + (k % 3) * 0.2;
    solid.open(PXP, SY + 1.2, PZP, Math.sin(la) * lt, 0, -Math.cos(la) * lt); solid.add(new T.ConeGeometry(0.22, ll, 6), k % 2 ? '#6f8a52' : '#7b9a5c', 0, ll / 2, 0); solid.close();
  }
  shLo.add(PXP, SY + 0.04, PZP, 2.6, 2.6);

  /* ---------- on the wall: topographic map, weather board, geologic time chart ---------- */
  var MAPX = -20, MAPY = 10.9, MW = 14.4, MH = 10.8;
  bx(solid, MW + 1.4, MH + 1.4, 0.5, MAPX, MAPY, ZB + 0.55, '#6a4a2c');
  var mapFace = new T.Mesh(new T.PlaneGeometry(MW, MH), new T.MeshBasicMaterial({ map: topoTex(T), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); mapFace.position.set(MAPX, MAPY, ZB + 0.85); mapFace.renderOrder = 1; g.add(mapFace);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (c) { cy(solid, 0.18, 0.18, 0.25, MAPX + c[0] * (MW / 2 + 0.35), MAPY + c[1] * (MH / 2 + 0.35), ZB + 0.86, '#9c7f3e', PI / 2, 0, 0, 10); });

  var WBX = 0.9, WBY = 12.4;
  bx(solid, 8.6, 6.5, 0.5, WBX, WBY, ZB + 0.4, '#6e4d2d');
  solid.add(new T.TorusGeometry(2.45, 0.28, 8, 36), '#8a6a3c', WBX - 1.6, WBY, ZB + 0.82);
  var baro = new T.Mesh(new T.CircleGeometry(2.3, 40), new T.MeshBasicMaterial({ map: baroTex(T), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); baro.position.set(WBX - 1.6, WBY, ZB + 0.72); baro.renderOrder = 1; g.add(baro);
  bx(solid, 2.7, 5.2, 0.3, WBX + 2.9, WBY, ZB + 0.75, '#8a6a3c');
  var therm = new T.Mesh(new T.PlaneGeometry(2.3, 4.9), new T.MeshBasicMaterial({ map: thermoTex(T), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); therm.position.set(WBX + 2.9, WBY, ZB + 0.95); therm.renderOrder = 1; g.add(therm);

  /* ---------- plan chest at the right end, with maps and a hard hat on top ---------- */
  var PCX = 46, PCZ = -14.2, PCW = 16, PCD = 9, PCH = 12.6;
  bx(solid, PCW, PCH, PCD, PCX, FLOOR + PCH / 2 + 0.4, PCZ, '#8b6a47'); bx(solid, PCW + 0.8, 0.5, PCD + 0.8, PCX, -0.25, PCZ, '#6e4f30'); bx(solid, PCW + 0.4, 0.8, PCD + 0.4, PCX, FLOOR + 0.4, PCZ, '#5a3f26');
  for (k = 0; k < 5; k++) {
    var dy = FLOOR + 1.6 + k * 2.4 + 1.1; bx(solid, PCW - 0.8, 2.1, 0.3, PCX, dy, PCZ + PCD / 2 + 0.1, k % 2 ? '#94724c' : '#9d7a52');
    bx(solid, 3.4, 0.22, 0.4, PCX, dy + 0.1, PCZ + PCD / 2 + 0.4, '#8a7442'); bx(solid, 1.7, 0.7, 0.15, PCX - 5, dy - 0.1, PCZ + PCD / 2 + 0.34, '#d8ccaa');
  }
  cy(solid, 0.45, 0.45, 6.2, PCX - 4.8, 0.45, PCZ + 0.4, '#d8ccaa', 0, 0.12, PI / 2, 14); cy(solid, 0.45, 0.45, 5.6, PCX - 4.4, 1.25, PCZ - 0.2, '#b9c4c2', 0, -0.1, PI / 2, 14); cy(solid, 0.45, 0.45, 5.8, PCX - 4.3, 0.45, PCZ - 1.5, '#cdbd96', 0, 0.2, PI / 2, 14);
  solid.add(new T.SphereGeometry(1.5, 16, 8, 0, PI * 2, 0, PI / 2), '#c9a43a', PCX + 3.6, 0.0, PCZ + 0.2, 0, 0, 0, 1, 0.8, 1.1); cy(solid, 1.9, 1.9, 0.14, PCX + 3.6, 0.07, PCZ + 0.6, '#b99530', 0, 0, 0, 22);
  shLo.add(PCX, FLOOR + 0.25, PCZ + 1.0, PCW + 3, PCD + 3);

  /* geologic time chart beside the chest: eras and periods with their ages in millions of years (rounded) */
  var chartTex = tex(T, 512, 768, function (c, w, h) {
    c.fillStyle = '#e4dabf'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b2118'; c.textAlign = 'center'; c.font = 'bold 44px ' + SANS; c.fillText('GEOLOGIC TIME', w / 2, 58); c.font = '26px ' + SANS; c.fillText('millions of years ago (rounded)', w / 2, 96);
    var rows = [['Quaternary', '0 \u2013 2.6', '#f2e6a8'], ['Neogene', '2.6 \u2013 23', '#e8d472'], ['Paleogene', '23 \u2013 66', '#e3b878'], ['Cretaceous', '66 \u2013 145', '#9bc48a'], ['Jurassic', '145 \u2013 201', '#6ea9b4'], ['Triassic', '201 \u2013 252', '#a77fa0'], ['Permian', '252 \u2013 299', '#d8785a'], ['Carboniferous', '299 \u2013 359', '#7fa89a'], ['Devonian', '359 \u2013 419', '#c49a62'], ['Silurian', '419 \u2013 444', '#b6c4a8'], ['Ordovician', '444 \u2013 485', '#5f9a9a'], ['Cambrian', '485 \u2013 539', '#8fb08a']];
    var y0 = 118, rh = 48;
    rows.forEach(function (r, i) {
      c.fillStyle = r[2]; c.fillRect(24, y0 + i * rh, w - 48, rh - 4); c.fillStyle = '#2b2118'; c.textAlign = 'left'; c.font = 'bold 29px ' + SANS; c.fillText(r[0], 38, y0 + i * rh + 32); c.textAlign = 'right'; c.font = '26px ' + SANS; c.fillText(r[1], w - 38, y0 + i * rh + 32);
    });
    c.textAlign = 'center'; c.font = '24px ' + SANS; c.fillText('Ma = millions of years ago', w / 2, y0 + 12 * rh + 24); c.fillText('youngest at the top', w / 2, y0 + 12 * rh + 54);
  });
  var CHX = 48.5, CHY = 7.5;
  bx(solid, 6.9, 10.3, 0.4, CHX, CHY, ZB + 0.5, '#5a3f26');
  var chart = new T.Mesh(new T.PlaneGeometry(6.2, 9.3), new T.MeshBasicMaterial({ map: chartTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); chart.position.set(CHX, CHY, ZB + 0.75); chart.renderOrder = 1; g.add(chart);

  /* ---------- floor: crates under the table, backpack, stool, leafy plant ---------- */
  bx(solid, 6.2, 3.8, 4.4, -20, FLOOR + 1.9, -5, '#a07a4a', 0.15); bx(solid, 5.6, 3.4, 4.0, -20.4, FLOOR + 5.5, -5.1, '#8e6c3f', -0.1);
  for (k = 0; k < 3; k++) bx(solid, 6.4, 0.3, 0.5, -20, FLOOR + 0.7 + k * 1.1, -2.8, '#7d5c36', 0.15);
  shLo.add(-20, FLOOR + 0.2, -5, 8.4, 6.8);
  /* stool */
  var STX = -39, STZ = 3;
  cy(solid, 2.2, 2.2, 0.7, STX, FLOOR + 9.6, STZ, '#a47c4a', 0, 0, 0, 24);
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(function (l) {
    var x1 = STX + l[0] * 1.3, z1 = STZ + l[1] * 1.3, x2 = STX + l[0] * 2.5, z2 = STZ + l[1] * 2.5, dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz, 9.3);
    solid.add(new T.CylinderGeometry(0.2, 0.17, len, 8), '#94703f', (x1 + x2) / 2, FLOOR + 9.25 - 4.65, (z1 + z2) / 2, dz / len * -1.0, 0, dx / len * 1.0);
  });
  var ringS = new T.TorusGeometry(2.1, 0.1, 6, 24); solid.add(ringS, '#94703f', STX, FLOOR + 3.6, STZ, PI / 2); shLo.add(STX, FLOOR + 0.2, STZ, 7, 7);
  /* backpack leaning against the wall */
  var BPX = -45, BPZ = -15;
  solid.add(new T.CylinderGeometry(2.0, 2.2, 6.6, 14), '#6b6a47', BPX, FLOOR + 3.5, BPZ, 0, 0, 0, 1.0, 1, 0.8); bx(solid, 3.4, 3.0, 1.2, BPX, FLOOR + 2.4, BPZ + 1.6, '#5a5a3a'); bx(solid, 4.2, 1.0, 2.8, BPX, FLOOR + 7.0, BPZ, '#7a5a38');
  bx(solid, 0.4, 5, 0.3, BPX - 1.3, FLOOR + 4, BPZ + 2.2, '#3a3426'); bx(solid, 0.4, 5, 0.3, BPX + 1.3, FLOOR + 4, BPZ + 2.2, '#3a3426');
  shLo.add(BPX, FLOOR + 0.2, BPZ + 0.6, 6.4, 5.4);
  /* floor plant */
  var FPX = -48.5, FPZ = -10.5;
  lathe(solid, [[0, 0], [1.5, 0], [1.9, 0.2], [2.2, 3.2], [2.0, 3.35], [1.8, 3.1], [0, 3.1]], '#a85f3c', FPX, FLOOR, FPZ, 22);
  for (k = 0; k < 14; k++) {
    var pa2 = k / 14 * 6.283 + rnd(), tl = 0.3 + rnd() * 0.55, hl = 6 + rnd() * 5;
    solid.open(FPX, FLOOR + 3.1, FPZ, 0, pa2, 0); solid.open(0, 0, 0, 0, 0, tl);
    solid.add(new T.SphereGeometry(1, 10, 8), k % 3 ? '#4f7a45' : '#5f8a4f', 0, hl * 0.5, 0, 0, 0, 0, 0.16, hl * 0.55, 0.5); solid.close(); solid.close();
  }
  shLo.add(FPX, FLOOR + 0.2, FPZ, 5.8, 5.8);

  /* left wall: a framed cross-section, a coat rail with a rain jacket and a specimen bag */
  bx(solid, 0.5, 7.7, 10.1, -XS + 0.45, 10, -6, '#5a3f26');
  var sect = new T.Mesh(new T.PlaneGeometry(9.1, 6.82), new T.MeshBasicMaterial({ map: sectionTex(T), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); sect.rotation.y = PI / 2; sect.position.set(-XS + 0.78, 10, -6); sect.renderOrder = 1; g.add(sect);
  bx(solid, 0.4, 0.6, 9, -XS + 0.4, 11, 14, '#6e4d2d');
  [10.5, 14, 17.5].forEach(function (pz) { cy(solid, 0.14, 0.14, 0.9, -XS + 1.0, 11, pz, '#8a7442', 0, 0, PI / 2, 10); });
  bx(solid, 1.0, 4.6, 3.2, -XS + 1.7, 8.2, 14, '#c2a03a'); bx(solid, 0.7, 3.6, 0.9, -XS + 1.6, 8.4, 12.0, '#b3932f'); bx(solid, 0.7, 3.6, 0.9, -XS + 1.6, 8.4, 16.0, '#b3932f');
  solid.add(new T.SphereGeometry(1, 10, 8, 0, PI * 2, 0, PI / 2), '#b3932f', -XS + 1.8, 10.3, 14, 0, 0, 0, 0.9, 0.9, 1.3);
  bx(solid, 1.1, 2.4, 2.2, -XS + 1.8, 8.6, 10.5, '#a58a5a'); bx(solid, 1.2, 0.8, 2.3, -XS + 1.8, 9.9, 10.5, '#8a7048');
  bx(solid, 0.2, 2.0, 0.2, -XS + 1.2, 10.0, 10.5, '#6b5a3a');

  /* a soft patch of morning sun from the window across the far end of the table; edges are feathered, nothing is hard-edged */
  var sunTex = tex(T, 512, 256, function (c, w, h) {
    var i, j, q;
    c.fillStyle = 'rgba(255,214,150,0.16)';
    for (i = 0; i < 3; i++) for (j = 0; j < 2; j++) {
      var x0 = 56 + i * 130 + j * 36, y0 = 28 + j * 110;
      for (q = 0; q < 9; q++) { var e = q * 5; c.beginPath(); c.moveTo(x0 + e, y0 + e); c.lineTo(x0 + 110 - e, y0 + e); c.lineTo(x0 + 138 - e, y0 + 90 - e); c.lineTo(x0 + 28 + e, y0 + 90 - e); c.closePath(); c.fill(); }
    }
  }, { flat: true });
  var sunPatch = new T.Mesh(new T.PlaneGeometry(26, 13), new T.MeshBasicMaterial({ map: sunTex, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  sunPatch.rotation.x = -PI / 2; sunPatch.position.set(21, 0.03, -8.5); sunPatch.renderOrder = 1; g.add(sunPatch);

  /* finish: meshes and materials */
  var solidMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: T.DoubleSide });
  var rockMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true, side: T.DoubleSide });
  var glassMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.65, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide });
  var sm = solid.mesh(solidMat), rm = rocks.mesh(rockMat), gm = glass.mesh(glassMat);
  gm.renderOrder = 3; g.add(sm); g.add(rm); g.add(gm); g.add(labels.mesh()); g.add(shLo.mesh()); g.add(shSoft.mesh());

  /* the room keeps its own colour: no distance haze toward the stage's blue-black */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) { if (still) return; rotorMesh.rotation.y = t * 1.1; globeMesh.rotation.y = t * 0.1; }
  };
};
})();
