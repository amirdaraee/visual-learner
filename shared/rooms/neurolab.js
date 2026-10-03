/* Room "neurolab" for the neuroscience subject: a neuroscience lab at dusk.
 * Dusk-violet walls over a teal tile splashback, a dark slate bench with a soft task light. On the bench: a brain model on a
 * stand with a key card, a microscope with slides, an EEG monitor with scrolling traces, a head form wearing an electrode cap,
 * and a tray of pipettes. On the wall: a large labelled neuron, a poster of the brain lobes and a rack of slide boxes.
 * Local y = 0 is the bench top, the floor is at y = -13, the back wall is at z = -19. Everything is built from code. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
/* smoothstep that also accepts edge0 > edge1 (then it falls instead of rises) */
function sst(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

/* canvas texture with mipmaps. Draw in a logical lw x lh space. */
function ctex(T, w, h, lw, lh, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d'); x.scale(w / lw, h / lh); draw(x, lw, lh);
  var t = new T.CanvasTexture(c); t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}
/* a texture the room redraws now and then */
function dyn(T, w, h) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var t = new T.CanvasTexture(c); t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4;
  return { c: c, x: c.getContext('2d'), t: t };
}
function rrect(x, a, b, w, h, r) {
  x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r); x.lineTo(a + w, b + h - r);
  x.quadraticCurveTo(a + w, b + h, a + w - r, b + h); x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath();
}

/* ---------- value noise, for the folds of the brain model and the jitter of the EEG ---------- */
function hash1(i) { var n = Math.sin(i * 12.9898) * 43758.5453; return n - Math.floor(n); }
function hash3(i, j, k) { var n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y, z) {
  var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  function L(a, b, t) { return a + (b - a) * t; }
  var v = L(L(L(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx), L(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx), fy),
            L(L(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx), L(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx), fy), fz);
  return v * 2 - 1;
}

/* ---------- the brain's lobes: one colour set shared by the model, the key card and the poster ---------- */
var LOBE = { frontal: '#5fc2bd', parietal: '#efb04a', temporal: '#c783c8', occipital: '#ee8068', cerebellum: '#cdb98a' };
var BRAIN_BASE = '#c8a69a', TINT = 0.55;
function tinted(T, key) { return new T.Color(BRAIN_BASE).lerp(new T.Color(LOBE[key]), TINT); }

/* a two-hemisphere cerebrum, left lateral view (frontal pole towards -x). Folds are the zero-lines of a warped noise field, which
   makes winding grooves like gyri and sulci. Lobes are tinted lightly by position; grooves are darkened a little. */
function brainHemi(T, side) {
  var geo = new T.SphereGeometry(1, 128, 88), pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3);
  var C = { f: tinted(T, 'frontal'), p: tinted(T, 'parietal'), t: tinted(T, 'temporal'), o: tinted(T, 'occipital') };
  var i, ux, uy, uz, a, x, y, z, zw, q, q2, n1, n2, g, g2, lat, d, below, occ, front, wT, wO, up, wF, wP, r, gr, bl;
  for (i = 0; i < n; i++) {
    ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i); a = -ux;
    x = ux * 3.05; y = uy > 0 ? uy * 2.2 : uy * 1.5; z = uz * 1.72 * (1 - 0.2 * sst(0.1, 1, a));
    if (uy < 0) y += 0.42 * Math.exp(-Math.pow((a - 0.05) / 0.5, 2)) * uy;
    zw = side * 1.66 + z; if (zw * side < 0.07) zw = side * 0.07;
    q = vnoise(x * 0.8 + 5, y * 0.8, zw * 0.8); q2 = vnoise(x * 0.8, y * 0.8 + 9, zw * 0.8 + 3);
    n1 = vnoise(x * 1.6 + q * 2.0, y * 1.6 + q2 * 2.0 + 3.3, zw * 1.6 + (q - q2) * 1.6 + side * 7);
    n2 = vnoise(x * 3.5 + 11 + q2 * 1.4, y * 3.5 + q * 1.4, zw * 3.5 - 4);
    g = 1 - sst(0, 0.1, Math.abs(n1)); g2 = 1 - sst(0, 0.09, Math.abs(n2));
    lat = sst(0.12, 0.7, zw * side);
    d = (-0.2 * g - 0.08 * g2 * (1 - g) + 0.05 * n1) * lat; g = Math.max(g, 0.6 * g2);
    pos.setXYZ(i, x + ux * d, y + uy * d, zw + uz * d);
    below = sst(-0.14, 0.14, (-0.28 - 0.3 * a) - uy); occ = sst(-0.46, -0.7, a);
    front = sst(-0.16, 0.16, a - (0.06 - 0.16 * uy));
    wT = below * (1 - occ); wO = occ; up = (1 - below) * (1 - occ); wF = up * front; wP = up * (1 - front);
    r = wF * C.f.r + wP * C.p.r + wT * C.t.r + wO * C.o.r; gr = wF * C.f.g + wP * C.p.g + wT * C.t.g + wO * C.o.g; bl = wF * C.f.b + wP * C.p.b + wT * C.t.b + wO * C.o.b;
    bl *= 1 - 0.3 * g * lat; r *= 1 - 0.26 * g * lat; gr *= 1 - 0.3 * g * lat;
    col[i * 3] = r; col[i * 3 + 1] = gr; col[i * 3 + 2] = bl;
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); weldNormals(geo);
  return geo;
}
function brainCerebellum(T) {
  var geo = new T.SphereGeometry(1, 72, 48), pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3), c = tinted(T, 'cerebellum'), i, ux, uy, uz, rg, g, d;
  for (i = 0; i < n; i++) {
    ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);
    rg = Math.sin(uy * 26 + vnoise(ux * 2, uy * 2, uz * 2) * 3); g = 1 - sst(0, 0.3, Math.abs(rg)); d = -0.06 * g;
    pos.setXYZ(i, ux * (1.55 + d), uy * (0.78 + d), uz * (1.75 + d));
    col[i * 3] = c.r * (1 - 0.3 * g); col[i * 3 + 1] = c.g * (1 - 0.3 * g); col[i * 3 + 2] = c.b * (1 - 0.3 * g);
  }
  geo.setAttribute('color', new T.BufferAttribute(col, 3)); weldNormals(geo);
  return geo;
}
/* the sphere's seam duplicates vertices; average their normals so no seam line shows */
function weldNormals(geo) {
  geo.computeVertexNormals();
  var pos = geo.attributes.position, nor = geo.attributes.normal, map = {}, i, k, l, s;
  for (i = 0; i < pos.count; i++) { k = Math.round(pos.getX(i) * 500) + ',' + Math.round(pos.getY(i) * 500) + ',' + Math.round(pos.getZ(i) * 500); (map[k] = map[k] || []).push(i); }
  for (k in map) {
    l = map[k]; if (l.length < 2) continue;
    var sx = 0, sy = 0, sz = 0; for (i = 0; i < l.length; i++) { sx += nor.getX(l[i]); sy += nor.getY(l[i]); sz += nor.getZ(l[i]); }
    s = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1; for (i = 0; i < l.length; i++) nor.setXYZ(l[i], sx / s, sy / s, sz / s);
  }
}

/* ---------- artwork on canvases ---------- */

/* a neuron, left to right: dendrites, soma, axon hillock, myelinated axon with nodes of Ranvier, axon terminals. Schematic. */
function drawNeuron(x, W, H) {
  var r = K.mulberry(11), CY = 352, SX = 440, SR = 90, MEM = '#eab876', i, a;
  var bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1f52'); bg.addColorStop(1, '#171233'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  var gl = x.createRadialGradient(SX, CY, 10, SX, CY, 380); gl.addColorStop(0, 'rgba(130,100,210,0.34)'); gl.addColorStop(1, 'rgba(130,100,210,0)'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(95,224,208,0.6)'; x.lineWidth = 6; rrect(x, 10, 10, W - 20, H - 20, 26); x.stroke();
  x.lineCap = 'round'; x.lineJoin = 'round';

  /* dendrites: a few primary branches that fork twice */
  x.strokeStyle = MEM;
  function branch(px, py, ang, len, wd, depth, jit) {
    var ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len, mx = (px + ex) / 2 + (r() - 0.5) * len * jit, my = (py + ey) / 2 + (r() - 0.5) * len * jit;
    x.lineWidth = wd; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
    if (depth > 0) { branch(ex, ey, ang - 0.4 - r() * 0.3, len * 0.72, wd * 0.72, depth - 1, 0.35); branch(ex, ey, ang + 0.4 + r() * 0.3, len * 0.72, wd * 0.72, depth - 1, 0.35); }
  }
  var prim = [Math.PI + 0.95, Math.PI + 0.5, Math.PI, Math.PI - 0.5, Math.PI - 0.95];
  for (i = 0; i < prim.length; i++) branch(SX + Math.cos(prim[i]) * (SR - 6), CY + Math.sin(prim[i]) * (SR - 6), prim[i], 80, 15, 2, 0);

  /* soma, then the hillock that tapers into the axon */
  function blob() {
    x.beginPath();
    for (i = 0; i <= 56; i++) { a = i / 56 * Math.PI * 2; var rr = SR * (1 + 0.09 * Math.sin(3 * a + 0.6) + 0.05 * Math.sin(5 * a)); var px = SX + Math.cos(a) * rr, py = CY + Math.sin(a) * rr * 0.92; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
    x.closePath();
  }
  var sg = x.createRadialGradient(SX - 20, CY - 24, 10, SX, CY, SR + 14); sg.addColorStop(0, '#f6d49a'); sg.addColorStop(1, '#d98f4a');
  blob(); x.fillStyle = sg; x.fill(); x.strokeStyle = '#8a5a2a'; x.lineWidth = 4; x.stroke();
  x.fillStyle = '#e7ae6a'; x.beginPath(); x.moveTo(508, CY - 46); x.quadraticCurveTo(572, CY - 8, 632, CY - 5); x.lineTo(632, CY + 5); x.quadraticCurveTo(572, CY + 8, 508, CY + 46); x.closePath(); x.fill();
  x.strokeStyle = '#8a5a2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(526, CY - 44); x.quadraticCurveTo(576, CY - 9, 632, CY - 5); x.moveTo(526, CY + 44); x.quadraticCurveTo(576, CY + 9, 632, CY + 5); x.stroke();
  x.fillStyle = '#7d58b0'; x.beginPath(); x.arc(SX + 8, CY, 38, 0, 7); x.fill(); x.strokeStyle = '#4b2f78'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#2b1a4a'; x.beginPath(); x.arc(SX + 16, CY - 4, 12, 0, 7); x.fill();

  /* axon */
  x.strokeStyle = MEM; x.lineWidth = 10; x.beginPath(); x.moveTo(630, CY); x.lineTo(1745, CY); x.stroke();
  /* myelin: capsules separated by short bare gaps, the nodes of Ranvier */
  var k, sx, mg;
  for (k = 0; k < 5; k++) {
    sx = 700 + k * 203; mg = x.createLinearGradient(0, CY - 30, 0, CY + 30); mg.addColorStop(0, '#52d6cc'); mg.addColorStop(0.5, '#2aa5a6'); mg.addColorStop(1, '#1b7a80');
    rrect(x, sx, CY - 31, 175, 62, 29); x.fillStyle = mg; x.fill(); x.strokeStyle = '#0e5a62'; x.lineWidth = 4; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.18)'; rrect(x, sx + 18, CY - 22, 139, 11, 5); x.fill();
  }
  /* terminals: the axon forks and each branch ends in a bulb */
  var ends = [[1905, CY - 135], [1950, CY - 48], [1950, CY + 48], [1905, CY + 135]];
  x.strokeStyle = MEM; x.lineWidth = 8;
  for (k = 0; k < ends.length; k++) { x.beginPath(); x.moveTo(1745, CY); x.quadraticCurveTo(1815, ends[k][1] * 0.45 + CY * 0.55, ends[k][0] - 30, ends[k][1]); x.stroke(); }
  for (k = 0; k < ends.length; k++) {
    x.fillStyle = '#f4c552'; x.beginPath(); x.arc(ends[k][0], ends[k][1], 26, 0, 7); x.fill(); x.strokeStyle = '#8a5a2a'; x.lineWidth = 4; x.stroke();
    x.fillStyle = 'rgba(138,90,42,0.55)'; x.beginPath(); x.arc(ends[k][0] - 6, ends[k][1] - 5, 5, 0, 7); x.arc(ends[k][0] + 7, ends[k][1] + 4, 5, 0, 7); x.fill();
  }

  /* labels with leader lines */
  x.font = '700 60px ' + SANS; x.textBaseline = 'alphabetic';
  function lab(text, tx, ty, align, lx, ly, ex, ey) {
    x.fillStyle = '#f6eedb'; x.textAlign = align; x.fillText(text, tx, ty);
    x.strokeStyle = '#d7c9f2'; x.lineWidth = 4; x.beginPath(); x.moveTo(lx, ly); x.lineTo(ex, ey); x.stroke();
    x.fillStyle = '#f6eedb'; x.beginPath(); x.arc(ex, ey, 8, 0, 7); x.fill();
  }
  var da = prim[0], dx = SX + Math.cos(da) * (SR + 40), dy = CY + Math.sin(da) * (SR + 40);
  lab('Dendrites', 50, 96, 'left', 170, 114, dx, dy);
  lab('Axon hillock', 470, 96, 'left', 575, 114, 575, CY - 16);
  lab('Myelin sheath', 960, 96, 'left', 1193, 114, 1193, CY - 31);
  lab('Axon terminals', 2010, 96, 'right', 1905, 114, 1905, CY - 160);
  lab('Soma (cell body)', 170, 656, 'left', 400, 600, SX, CY + SR * 0.92 + 4);
  lab('Node of Ranvier', 1092, 656, 'center', 1092, 600, 1092, CY + 4);
  x.fillStyle = '#b9aedd'; x.font = '500 40px ' + SANS; x.textAlign = 'right'; x.fillText('Neuron: schematic, not to scale', 2010, 656);
  x.textAlign = 'left'; x.fillText('impulse direction', 1440, 580);
  x.strokeStyle = '#b9aedd'; x.lineWidth = 5; x.beginPath(); x.moveTo(1440, 600); x.lineTo(1790, 600); x.moveTo(1766, 586); x.lineTo(1790, 600); x.lineTo(1766, 614); x.stroke();
}

/* lateral view of the left hemisphere, front on the left; lobes filled, five labels on pills with leader lines. Schematic. */
function drawLobes(x, W, H) {
  var OX = 42, OY = 232, S = 0.98, INK = '#2b2250';
  x.fillStyle = '#e3d8bf'; x.fillRect(0, 0, W, H);
  x.strokeStyle = INK; x.lineWidth = 6; x.strokeRect(14, 14, W - 28, H - 28);
  x.fillStyle = INK; x.textAlign = 'center'; x.font = '700 62px ' + SANS; x.fillText('Lobes of the brain', W / 2, 78);
  x.fillStyle = '#6a5d8c'; x.font = '500 36px ' + SANS; x.fillText('left side view', W / 2, 122);

  x.save(); x.translate(OX, OY); x.scale(S, S); x.lineJoin = 'round'; x.lineCap = 'round';
  /* cerebellum and brainstem sit behind the cerebrum */
  x.fillStyle = LOBE.cerebellum; x.beginPath(); x.ellipse(590, 352, 104, 54, 0.1, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 4; x.stroke();
  x.strokeStyle = 'rgba(43,34,80,0.4)'; x.lineWidth = 3;
  for (var s = -28; s <= 30; s += 14) { x.beginPath(); x.moveTo(520 + Math.abs(s) * 0.5, 352 + s); x.quadraticCurveTo(590, 352 + s + 10, 660 - Math.abs(s) * 0.5, 352 + s - 4); x.stroke(); }
  x.fillStyle = '#d3bda8'; x.beginPath(); x.moveTo(408, 330); x.lineTo(472, 330); x.lineTo(468, 428); x.quadraticCurveTo(440, 448, 418, 430); x.closePath(); x.fill(); x.strokeStyle = INK; x.lineWidth = 4; x.stroke();
  /* cerebrum outline, then lobes clipped to it */
  function outline() {
    x.beginPath(); x.moveTo(38, 232); x.bezierCurveTo(40, 150, 100, 92, 190, 66); x.bezierCurveTo(260, 46, 340, 42, 420, 50); x.bezierCurveTo(520, 58, 610, 90, 654, 160);
    x.bezierCurveTo(684, 205, 690, 262, 664, 300); x.bezierCurveTo(640, 326, 590, 330, 540, 324); x.bezierCurveTo(490, 340, 420, 350, 340, 354);
    x.bezierCurveTo(260, 360, 180, 350, 130, 322); x.bezierCurveTo(100, 306, 60, 290, 44, 262); x.bezierCurveTo(40, 252, 38, 242, 38, 232); x.closePath();
  }
  function poly(pts, c) { x.fillStyle = c; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fill(); x.lineWidth = 2; x.strokeStyle = c; x.stroke(); }
  x.save(); outline(); x.clip();
  poly([[0, 0], [352, 0], [352, 46], [340, 100], [316, 170], [290, 240], [200, 274], [118, 300], [0, 330]], LOBE.frontal);
  poly([[0, 330], [118, 300], [200, 274], [290, 240], [380, 226], [470, 208], [540, 230], [506, 330], [506, 460], [0, 460]], LOBE.temporal);
  poly([[352, 0], [540, 0], [540, 230], [470, 208], [380, 226], [290, 240], [316, 170], [340, 100], [352, 46]], LOBE.parietal);
  poly([[540, 0], [740, 0], [740, 460], [506, 460], [506, 330], [540, 230]], LOBE.occipital);
  /* a few gyri-like squiggles for texture */
  x.strokeStyle = 'rgba(43,34,80,0.22)'; x.lineWidth = 3;
  var rn = K.mulberry(5), q, px, py;
  for (q = 0; q < 26; q++) {
    px = 70 + rn() * 580; py = 70 + rn() * 260; x.beginPath(); x.moveTo(px, py);
    x.bezierCurveTo(px + 30 + rn() * 30, py - 20 - rn() * 20, px + 40 + rn() * 30, py + 22 + rn() * 20, px + 70 + rn() * 20, py + (rn() - 0.5) * 30); x.stroke();
  }
  x.restore();
  x.strokeStyle = INK; x.lineWidth = 6; outline(); x.stroke();
  /* lateral fissure and central sulcus; the occipital boundary is only a convention, so it is dashed */
  x.lineWidth = 5; x.beginPath(); x.moveTo(118, 300); x.bezierCurveTo(170, 282, 260, 252, 290, 240); x.bezierCurveTo(340, 226, 420, 222, 470, 208); x.stroke();
  x.beginPath(); x.moveTo(352, 46); x.bezierCurveTo(342, 100, 322, 170, 290, 240); x.stroke();
  x.setLineDash([12, 10]); x.lineWidth = 4; x.beginPath(); x.moveTo(540, 58); x.lineTo(540, 230); x.lineTo(506, 330); x.stroke(); x.setLineDash([]);
  x.restore();

  /* pills + leaders */
  function pill(text, cx, cy, key, tx, ty) {
    x.font = '700 46px ' + SANS; var w = Math.ceil(x.measureText(text).width) + 44, h = 64;
    x.strokeStyle = INK; x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy + h / 2); x.lineTo(tx, ty); x.stroke();
    x.fillStyle = INK; x.beginPath(); x.arc(tx, ty, 9, 0, 7); x.fill();
    rrect(x, cx - w / 2, cy - h / 2, w, h, 30); x.fillStyle = LOBE[key]; x.fill(); x.lineWidth = 4; x.strokeStyle = INK; x.stroke();
    x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cx, cy + 3); x.textBaseline = 'alphabetic';
  }
  function bp(u, v) { return [OX + u * S, OY + v * S]; }
  var t;
  t = bp(170, 170); pill('Frontal', 140, 176, 'frontal', t[0], t[1]);
  t = bp(445, 130); pill('Parietal', 400, 238, 'parietal', t[0], t[1]);
  t = bp(620, 200); pill('Occipital', 622, 176, 'occipital', t[0], t[1]);
  t = bp(300, 304); pill('Temporal', 215, 742, 'temporal', t[0], t[1]);
  t = bp(590, 356); pill('Cerebellum', 590, 742, 'cerebellum', t[0], t[1]);
  x.strokeStyle = '#6a5d8c'; x.fillStyle = '#6a5d8c'; x.lineWidth = 4; x.font = '500 34px ' + SANS; x.textAlign = 'left'; x.fillText('front', 56, 822);
  x.textAlign = 'right'; x.fillText('back', W - 56, 822); x.beginPath(); x.moveTo(150, 812); x.lineTo(W - 142, 812); x.moveTo(170, 800); x.lineTo(150, 812); x.lineTo(170, 824); x.moveTo(W - 162, 800); x.lineTo(W - 142, 812); x.lineTo(W - 162, 824); x.stroke();
  x.textAlign = 'center'; x.font = '500 28px ' + SANS; x.fillText('schematic, not to scale', W / 2, 852);
}

/* the key card in front of the brain model */
function drawKey(x, W, H, sw) {
  x.fillStyle = '#1d1838'; x.fillRect(0, 0, W, H); x.strokeStyle = '#4fd0c8'; x.lineWidth = 8; rrect(x, 8, 8, W - 16, H - 16, 22); x.stroke();
  x.fillStyle = '#f6eedb'; x.textAlign = 'left'; x.font = '700 54px ' + SANS; x.fillText('Key: left side view', 38, 76);
  var names = ['Frontal', 'Parietal', 'Temporal', 'Occipital', 'Cerebellum'], keys = ['frontal', 'parietal', 'temporal', 'occipital', 'cerebellum'], k;
  x.font = '600 54px ' + SANS;
  for (k = 0; k < 5; k++) {
    x.fillStyle = sw[keys[k]]; rrect(x, 40, 106 + k * 66, 62, 48, 10); x.fill(); x.strokeStyle = 'rgba(246,238,219,0.7)'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#f6eedb'; x.fillText(names[k], 126, 146 + k * 66);
  }
  x.fillStyle = '#b9aedd'; x.font = '500 38px ' + SANS; x.fillText('model about 2.5x life size', 40, 480);
}
/* electrode placard: top view of the head with the six labelled sites */
function drawPlacard(x, W, H) {
  x.fillStyle = '#1d1838'; x.fillRect(0, 0, W, H); x.strokeStyle = '#f0b45a'; x.lineWidth = 8; rrect(x, 8, 8, W - 16, H - 16, 22); x.stroke();
  x.fillStyle = '#f6eedb'; x.textAlign = 'center'; x.font = '700 50px ' + SANS; x.fillText('Electrode sites', W / 2, 74);
  var cx = W / 2, cy = 332, R = 188, i;
  x.strokeStyle = '#9fb4cc'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
  x.beginPath(); x.moveTo(cx - 34, cy - R + 4); x.lineTo(cx, cy - R - 38); x.lineTo(cx + 34, cy - R + 4); x.stroke();
  x.beginPath(); x.arc(cx - R, cy, 22, Math.PI * 0.5, Math.PI * 1.5); x.stroke(); x.beginPath(); x.arc(cx + R, cy, 22, -Math.PI * 0.5, Math.PI * 0.5); x.stroke();
  var minor = [[0, -0.5], [0, 0], [0, 0.5], [-0.62, -0.45], [0.62, -0.45], [-0.62, 0.45], [0.62, 0.45], [-0.85, 0], [0.85, 0]];
  x.fillStyle = 'rgba(159,180,204,0.5)'; for (i = 0; i < minor.length; i++) { x.beginPath(); x.arc(cx + minor[i][0] * R, cy + minor[i][1] * R, 11, 0, 7); x.fill(); }
  var sites = [['Fp1', -0.32, -0.74], ['Fp2', 0.32, -0.74], ['C3', -0.5, 0], ['C4', 0.5, 0], ['O1', -0.32, 0.74], ['O2', 0.32, 0.74]];
  x.font = '700 46px ' + SANS;
  for (i = 0; i < sites.length; i++) {
    var px = cx + sites[i][1] * R, py = cy + sites[i][2] * R;
    x.fillStyle = '#f0b45a'; x.beginPath(); x.arc(px, py, 20, 0, 7); x.fill(); x.fillStyle = '#f6eedb'; x.fillText(sites[i][0], px, py + (sites[i][2] < 0 ? 62 : sites[i][2] > 0 ? -34 : 62));
  }
}
/* labels for the slide boxes: 2 columns x 3 rows in one atlas */
function drawSlideLabels(x, W, H) {
  var items = [['CORTEX', 'coronal'], ['HIPPOCAMPUS', 'sagittal'], ['CEREBELLUM', 'sagittal'], ['THALAMUS', 'coronal'], ['STRIATUM', 'coronal'], ['BRAINSTEM', 'axial']], i, cw = W / 2, ch = H / 3;
  for (i = 0; i < 6; i++) {
    var cx = (i % 2) * cw, cy = Math.floor(i / 2) * ch;
    x.fillStyle = '#e8dfc8'; x.fillRect(cx, cy, cw, ch); x.strokeStyle = '#2b2250'; x.lineWidth = 6; x.strokeRect(cx + 3, cy + 3, cw - 6, ch - 6);
    x.fillStyle = '#2b2250'; x.textAlign = 'left'; x.font = '700 60px ' + SANS; x.fillText(items[i][0], cx + 26, cy + 92);
    x.fillStyle = '#6a5d8c'; x.font = '500 42px ' + SANS; x.fillText(items[i][1] + ' slices', cx + 28, cy + 144);
  }
}

/* ---------- the EEG screen ---------- */
var EEG = [
  { n: 'Fp1', col: '#5fe0d0', kind: 'f', ph: 0.0 }, { n: 'Fp2', col: '#5fe0d0', kind: 'f', ph: 0.4 },
  { n: 'C3', col: '#f5c26b', kind: 'c', ph: 1.1 }, { n: 'C4', col: '#f5c26b', kind: 'c', ph: 1.7 },
  { n: 'O1', col: '#e6a8ff', kind: 'o', ph: 0.3 }, { n: 'O2', col: '#e6a8ff', kind: 'o', ph: 0.9 }
];
function nz(tt, k) { var s = tt * 60 + k * 31.7, i = Math.floor(s), f = s - i, a = hash1(i), b = hash1(i + 1); return (a + (b - a) * f) * 2 - 1; }
/* invented, schematic signals: strong ~10 Hz alpha at the back (O1, O2), mu and beta plus noise over the centre, eye blinks and noise at the front */
function eegVal(c, k, tt) {
  var env = 0.72 + 0.28 * Math.sin(tt * 2.1 + k * 1.3), TAU = 6.2832;
  if (c.kind === 'o') return 1.0 * env * Math.sin(TAU * 10.2 * tt + c.ph * 3) + 0.16 * nz(tt, k);
  if (c.kind === 'c') return 0.5 * env * Math.sin(TAU * 10.8 * tt + c.ph * 2) + 0.22 * Math.sin(TAU * 21 * tt + k) + 0.3 * nz(tt, k + 7);
  var bp = (tt + k * 0.03) % 3.7, blink = 1.5 * Math.exp(-Math.pow((bp - 1.0) / 0.14, 2));
  return blink + 0.2 * Math.sin(TAU * 5 * tt + c.ph) + 0.28 * Math.sin(TAU * 0.4 * tt) + 0.5 * nz(tt, k + 3);
}
function drawEEG(x, W, H, t) {
  var k, i, TX0 = 150, TX1 = 770, ROW0 = 108, RH = 70, WIN = 2.0, tt;
  x.fillStyle = '#0a1620'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#12283a'; x.fillRect(0, 0, W, 56); x.fillStyle = '#9fe8de'; x.font = '700 34px ' + SANS; x.textAlign = 'left'; x.fillText('EEG   6 channels', 20, 40);
  x.textAlign = 'right'; x.fillStyle = '#f0b45a'; x.fillText('SCHEMATIC SIGNALS', W - 20, 40);
  x.strokeStyle = 'rgba(159,200,230,0.14)'; x.lineWidth = 2;
  for (i = 0; i <= 8; i++) { var gx = TX0 + (TX1 - TX0) * i / 4 * 0.5; x.beginPath(); x.moveTo(gx, 70); x.lineTo(gx, 520); x.stroke(); }
  x.lineJoin = 'round';
  for (k = 0; k < 6; k++) {
    var cy = ROW0 + k * RH, c = EEG[k];
    x.strokeStyle = 'rgba(159,200,230,0.2)'; x.beginPath(); x.moveTo(TX0, cy); x.lineTo(TX1, cy); x.stroke();
    x.fillStyle = c.col; x.font = '700 46px ' + SANS; x.textAlign = 'left'; x.fillText(c.n, 18, cy + 16);
    x.strokeStyle = c.col; x.lineWidth = 3.4; x.beginPath();
    for (i = 0; i <= 150; i++) {
      tt = t - WIN + WIN * i / 150; var v = eegVal(c, k, tt) * 27, px = TX0 + (TX1 - TX0) * i / 150, py = cy - clamp(v, -33, 33);
      if (i) x.lineTo(px, py); else x.moveTo(px, py);
    }
    x.stroke();
  }
  /* time scale */
  x.strokeStyle = '#cfe2f0'; x.lineWidth = 4; x.beginPath(); x.moveTo(TX0, 548); x.lineTo(TX0 + (TX1 - TX0) / WIN, 548); x.moveTo(TX0, 538); x.lineTo(TX0, 558); x.moveTo(TX0 + (TX1 - TX0) / WIN, 538); x.lineTo(TX0 + (TX1 - TX0) / WIN, 558); x.stroke();
  x.fillStyle = '#cfe2f0'; x.font = '600 30px ' + SANS; x.textAlign = 'left'; x.fillText('1 s', TX0 + (TX1 - TX0) / WIN + 14, 558);
  /* head map: top view, nose up, the six sites */
  var cx = 912, cy = 232, R = 92;
  x.strokeStyle = '#7fa0b8'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke();
  x.beginPath(); x.moveTo(cx - 18, cy - R + 2); x.lineTo(cx, cy - R - 22); x.lineTo(cx + 18, cy - R + 2); x.stroke();
  var sites = [[0, -0.36, -0.55], [1, 0.36, -0.55], [2, -0.56, 0], [3, 0.56, 0], [4, -0.36, 0.55], [5, 0.36, 0.55]];
  x.font = '700 28px ' + SANS;
  for (i = 0; i < 6; i++) {
    var sp = sites[i], sx = cx + sp[1] * R, sy = cy + sp[2] * R;
    x.fillStyle = EEG[sp[0]].col; x.beginPath(); x.arc(sx, sy, 10, 0, 7); x.fill();
    x.textAlign = sp[1] < 0 ? 'right' : 'left'; x.fillText(EEG[sp[0]].n, sx + (sp[1] < 0 ? -16 : 16), sy + 10);
  }
  x.fillStyle = '#cfe2f0'; x.font = '600 28px ' + SANS; x.textAlign = 'left';
  x.fillText('O: alpha ~10 Hz', 790, 396); x.fillText('C: mu and beta', 790, 436); x.fillText('Fp: eye blinks', 790, 476);
}

/* ---------- the room ---------- */
ENV.neurolab = function (T) {
  var g = new T.Group(), rnd = K.mulberry(33), i;
  var FLOOR = -13, TOP = -0.1, WALL = -19, XW = 46, CEIL = 30, ZF = 62;
  var BW = 76, BD = 34, BZ = -1.5;
  var TEAL = '#2fb5ae', AMB = '#dc9d40';
  var up = new T.Vector3(0, 1, 0);
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Static props are recorded and merged into two meshes at the end (one lit, one unlit) so the room stays cheap. */
  var recs = [], grecs = [], shq = [];
  function rec(list, p, geo, color, x, y, z) { var o = new T.Object3D(); o.position.set(x, y, z); list.push({ o: o, p: p, geo: geo, c: new T.Color(color) }); return o; }
  function B(p, w, h, d, c, x, y, z) { return rec(recs, p, new T.BoxGeometry(w, h, d), c, x, y, z); }
  function C(p, rt, rb, h, c, x, y, z, seg) { return rec(recs, p, new T.CylinderGeometry(rt, rb, h, seg || 16), c, x, y, z); }
  function S(p, r, c, x, y, z, sx, sy, sz, seg) { var o = rec(recs, p, new T.SphereGeometry(r, seg || 14, Math.max(6, (seg || 14) * 0.6 | 0)), c, x, y, z); o.scale.set(sx || 1, sy || 1, sz || 1); return o; }
  function TO(p, geo, c, x, y, z) { return rec(recs, p, geo, c, x, y, z); }
  function rod(p, a, b, r, c, seg) {
    var A = new T.Vector3(a[0], a[1], a[2]), Bv = new T.Vector3(b[0], b[1], b[2]), d = Bv.clone().sub(A), len = d.length();
    var o = C(p, r, r, len, c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, seg || 10); o.quaternion.setFromUnitVectors(up, d.normalize()); return o;
  }
  /* unlit parts (LEDs, bulbs): colour times a multiplier at or under 1.4 */
  function GC(p, rt, rb, h, c, m, x, y, z, seg) { return rec(grecs, p, new T.CylinderGeometry(rt, rb, h, seg || 12), K.hdr(T, c, m), x, y, z); }
  function GB(p, w, h, d, c, m, x, y, z) { return rec(grecs, p, new T.BoxGeometry(w, h, d), K.hdr(T, c, m), x, y, z); }
  function P(p, w, h, mat, x, y, z, ry) { var o = new T.Mesh(new T.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry || 0; p.add(o); return o; }
  function flat(p, w, d, mat, x, y, z) { var o = new T.Mesh(new T.PlaneGeometry(w, d), mat); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); p.add(o); return o; }
  function grp(x, y, z, ry) { var o = new T.Group(); o.position.set(x, y, z); o.rotation.y = ry || 0; g.add(o); return o; }
  function bake(list, mat) {
    var pos = [], nor = [], col = [], idx = [], base = 0, m4 = new T.Matrix4();
    list.forEach(function (r) {
      r.o.updateMatrix(); m4.multiplyMatrices(r.p.matrixWorld, r.o.matrix);
      var geo = r.geo.clone().applyMatrix4(m4), pa = geo.attributes.position.array, na = geo.attributes.normal.array, ia = geo.index.array, n = pa.length / 3, q;
      for (q = 0; q < pa.length; q++) { pos.push(pa[q]); nor.push(na[q]); }
      for (q = 0; q < n; q++) col.push(r.c.r, r.c.g, r.c.b);
      for (q = 0; q < ia.length; q++) idx.push(ia[q] + base);
      base += n; geo.dispose(); r.geo.dispose();
    });
    var bg = new T.BufferGeometry();
    bg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); bg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    bg.setIndex(new T.BufferAttribute(new Uint32Array(idx), 1));
    var mesh = new T.Mesh(bg, mat); mesh.frustumCulled = false; g.add(mesh); return mesh;
  }
  /* contact shadows: collected, then merged into a few meshes (bench and floor level, soft and strong) */
  var shTex = ctex(T, 64, 64, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.8)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  function sh(x, z, w, d, op, y) { shq.push({ x: x, z: z, w: w, d: d, y: y == null ? 0 : y, soft: op < 0.45 }); }
  function bakeShadows() {
    [[false, false], [false, true], [true, false], [true, true]].forEach(function (k) {
      var pos = [], uv = [], idx = [], n = 0, floor = k[0], soft = k[1];
      shq.forEach(function (q) {
        if ((q.y < -5) !== floor || q.soft !== soft) return;
        var hw = q.w / 2, hd = q.d / 2;
        pos.push(q.x - hw, q.y, q.z + hd, q.x + hw, q.y, q.z + hd, q.x + hw, q.y, q.z - hd, q.x - hw, q.y, q.z - hd); uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
      });
      if (!n) return;
      var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); bg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); bg.setIndex(idx);
      var m = new T.Mesh(bg, new T.MeshBasicMaterial({ map: shTex, transparent: true, opacity: soft ? 0.32 : 0.5, depthWrite: false })); m.frustumCulled = false; g.add(m);
    });
  }

  /* ---- light: within the shared budget ---- */
  g.add(new T.HemisphereLight(0xefe6ff, 0x5d4c66, 0.5));
  var key = new T.DirectionalLight(0xffe6cc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xcdbcff, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffdcc0, 0.16, 70, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---- shell: dusk-violet walls, ceiling, floor ---- */
  function wallGrad(top, a, b, bot) { return ctex(T, 8, 256, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.3, a); gr.addColorStop(0.58, b); gr.addColorStop(1, bot); x.fillStyle = gr; x.fillRect(0, 0, w, h); }); }
  var wallTex = wallGrad('#40356b', '#5a4b8c', '#6a5a9c', '#3a3160'), sideTex = wallGrad('#3a3062', '#524581', '#605192', '#352d58');
  var wm = [];
  wm.push(K.plane(T, g, 110, CEIL - FLOOR, wallTex, 0, (CEIL + FLOOR) / 2, WALL));
  wm.push(K.plane(T, g, ZF - WALL, CEIL - FLOOR, sideTex, -XW, (CEIL + FLOOR) / 2, (ZF + WALL) / 2, Math.PI / 2));
  wm.push(K.plane(T, g, ZF - WALL, CEIL - FLOOR, sideTex, XW, (CEIL + FLOOR) / 2, (ZF + WALL) / 2, -Math.PI / 2));
  var ceil = K.plane(T, g, 2 * XW, ZF - WALL, null, 0, CEIL, (ZF + WALL) / 2, 0, 0x3a3162); ceil.rotation.x = Math.PI / 2; wm.push(ceil);
  var carpet = ctex(T, 128, 128, 128, 128, function (x, w, h) {
    x.fillStyle = '#3d3650'; x.fillRect(0, 0, w, h);
    for (var n = 0; n < 700; n++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255,0.045' : '0,0,0,0.08') + ')'; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
  });
  carpet.wrapS = carpet.wrapT = T.RepeatWrapping; carpet.repeat.set(2 * XW / 7, (ZF - WALL) / 7);
  flat(g, 2 * XW, ZF - WALL, new T.MeshStandardMaterial({ map: carpet, roughness: 0.95, metalness: 0 }), 0, FLOOR, (ZF + WALL) / 2);
  var rugTex = ctex(T, 512, 256, 1024, 512, function (x) {
    x.fillStyle = '#5b4a7a'; x.fillRect(0, 0, 1024, 512); x.strokeStyle = '#2fb5ae'; x.lineWidth = 10; x.strokeRect(46, 46, 932, 420);
    x.strokeStyle = '#f0b45a'; x.lineWidth = 5; x.strokeRect(74, 74, 876, 364);
  });
  flat(g, 54, 27, new T.MeshStandardMaterial({ map: rugTex, roughness: 1, metalness: 0 }), 0, FLOOR + 0.2, 6);

  /* teal tile splashback with a cream cap, on the back and side walls */
  function tiles(rx) {
    var t = ctex(T, 256, 128, 256, 128, function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#34969a'); gr.addColorStop(1, '#2a8387'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(6, 6, w - 12, h * 0.35); x.strokeStyle = '#1d6064'; x.lineWidth = 6; x.strokeRect(0, 0, w, h);
    });
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, 2); return t;
  }
  K.plane(T, g, 2 * XW, 4.7, tiles(2 * XW / 2.3), 0, 2.25, WALL + 0.15);
  K.plane(T, g, ZF - WALL, 4.7, tiles((ZF - WALL) / 2.3), -XW + 0.15, 2.25, (ZF + WALL) / 2, Math.PI / 2);
  K.plane(T, g, ZF - WALL, 4.7, tiles((ZF - WALL) / 2.3), XW - 0.15, 2.25, (ZF + WALL) / 2, -Math.PI / 2);
  B(g, 2 * XW, 0.4, 0.5, '#a89d86', 0, 4.8, WALL + 0.35);
  B(g, 0.5, 0.4, ZF - WALL, '#a89d86', -XW + 0.35, 4.8, (ZF + WALL) / 2); B(g, 0.5, 0.4, ZF - WALL, '#a89d86', XW - 0.35, 4.8, (ZF + WALL) / 2);
  /* baseboards and a darker lower wall under the bench line */
  B(g, 2 * XW, 0.9, 0.3, '#221d3a', 0, FLOOR + 0.45, WALL + 0.2); B(g, 0.3, 0.9, ZF - WALL, '#221d3a', -XW + 0.2, FLOOR + 0.45, (ZF + WALL) / 2); B(g, 0.3, 0.9, ZF - WALL, '#221d3a', XW - 0.2, FLOOR + 0.45, (ZF + WALL) / 2);

  /* ---- the bench: dark slate top on a steel frame ---- */
  var slate = ctex(T, 1024, 512, 1024, 512, function (x, w, h) {
    x.fillStyle = '#3f4957'; x.fillRect(0, 0, w, h);
    var n, v;
    for (n = 0; n < 5; n++) { var bx = rnd() * w, by = rnd() * h, bgr = x.createRadialGradient(bx, by, 0, bx, by, 160 + rnd() * 160); bgr.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'); bgr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = bgr; x.fillRect(0, 0, w, h); }
    for (n = 0; n < 2600; n++) { v = rnd(); x.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)'; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2); }
  });
  var topMat = new T.MeshStandardMaterial({ map: slate, roughness: 0.9, metalness: 0 }), edgeMat = new T.MeshStandardMaterial({ color: '#566274', roughness: 0.85, metalness: 0 });
  var slab = new T.Mesh(new T.BoxGeometry(BW, 1.0, BD), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]); slab.position.set(0, TOP - 0.5, BZ); g.add(slab);
  var steel = '#262c3a', legH = TOP - 1.0 - FLOOR - 1.0;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    B(g, 1.5, legH, 1.5, steel, c[0] * (BW / 2 - 1.8), FLOOR + legH / 2, BZ + c[1] * (BD / 2 - 1.8)); sh(c[0] * (BW / 2 - 1.8), BZ + c[1] * (BD / 2 - 1.8), 4, 4, 0.45, FLOOR + 0.35);
  });
  [BZ - BD / 2 + 1.8, BZ + BD / 2 - 1.8].forEach(function (z) { B(g, BW - 3.6, 1.6, 0.5, steel, 0, TOP - 1.9, z); B(g, BW - 3.6, 0.5, 0.5, steel, 0, -9.6, z); });
  [-BW / 2 + 1.8, BW / 2 - 1.8].forEach(function (x) { B(g, 0.5, 1.6, BD - 3.6, steel, x, TOP - 1.9, BZ); B(g, 0.5, 0.5, BD - 3.6, steel, x, -9.6, BZ); });
  /* a thin teal edge light under the front lip */
  rec(grecs, g, new T.PlaneGeometry(BW - 6, 0.16), K.hdr(T, TEAL, 0.8), 0, TOP - 0.55, BZ + BD / 2 + 0.04);

  /* ---- a soft pool of task-light on the bench, left of centre ---- */
  var pool = ctex(T, 128, 128, 128, 128, function (x, w, h) { var gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,0.5)'); gr.addColorStop(0.5, 'rgba(255,200,130,0.2)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  var poolM = new T.Mesh(new T.PlaneGeometry(17, 9), new T.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, opacity: 0.55 })); poolM.rotation.x = -Math.PI / 2; poolM.position.set(-16.5, 0.02, -12.2); g.add(poolM);

  /* ================= wall: neuron artwork ================= */
  (function () {
    var AW = 22.4, AH = 7.6, AY = 13.0, AX = 0, fr = '#1f4e55', fz = WALL + 0.25;
    B(g, AW + 1.1, AH + 1.1, 0.1, '#17282e', AX, AY, WALL + 0.2);
    B(g, AW + 1.1, 0.55, 0.55, fr, AX, AY + AH / 2 + 0.275, fz); B(g, AW + 1.1, 0.55, 0.55, fr, AX, AY - AH / 2 - 0.275, fz);
    B(g, 0.55, AH, 0.55, fr, AX - AW / 2 - 0.275, AY, fz); B(g, 0.55, AH, 0.55, fr, AX + AW / 2 + 0.275, AY, fz);
    var art = ctex(T, 2048, 1024, 2048, 694, drawNeuron);
    P(g, AW, AH, new T.MeshBasicMaterial({ map: art }), AX, AY, WALL + 0.42);
  })();

  /* ================= wall: lobes poster ================= */
  (function () {
    var PW = 7.0, PH = 7.84, PX = 17.6, PY = 13.2, fz = WALL + 0.25;
    B(g, PW + 0.9, PH + 0.9, 0.1, '#17282e', PX, PY, WALL + 0.2);
    B(g, PW + 0.9, 0.45, 0.5, '#a89d86', PX, PY + PH / 2 + 0.225, fz); B(g, PW + 0.9, 0.45, 0.5, '#a89d86', PX, PY - PH / 2 - 0.225, fz);
    B(g, 0.45, PH, 0.5, '#a89d86', PX - PW / 2 - 0.225, PY, fz); B(g, 0.45, PH, 0.5, '#a89d86', PX + PW / 2 + 0.225, PY, fz);
    P(g, PW, PH, new T.MeshBasicMaterial({ map: ctex(T, 1024, 1024, 768, 860, drawLobes) }), PX, PY, WALL + 0.42);
  })();

  /* ================= wall: rack of slide boxes ================= */
  (function () {
    var RX = -17.3, RY = 13.3, SW = 0.35, CW = 4.4, DIV = 0.3, RW = SW * 2 + CW * 2 + DIV, ROW = 1.9, BDD = 0.25, RH = ROW * 3 + BDD * 4, RDp = 1.9, rz = WALL + 0.1 + RDp / 2;
    var frame = '#2b6f76', bcol = ['#d6c7a4', '#8c78c0', '#3fa7a7', '#d9a04e', '#d9806a', '#cdbfd8'];
    B(g, RW, RH, 0.2, '#241f3e', RX, RY, WALL + 0.2);
    B(g, SW, RH, RDp, frame, RX - RW / 2 + SW / 2, RY, rz); B(g, SW, RH, RDp, frame, RX + RW / 2 - SW / 2, RY, rz); B(g, DIV, RH, RDp, frame, RX, RY, rz);
    for (i = 0; i < 4; i++) B(g, RW, BDD, RDp, frame, RX, RY - RH / 2 + BDD / 2 + i * (ROW + BDD), rz);
    var pos = [], uv = [], idx = [], n = 0, plateW = 3.9, plateH = 1.3;
    for (i = 0; i < 6; i++) {
      var col = i % 2, row = Math.floor(i / 2), bx = RX + (col ? 1 : -1) * (DIV / 2 + CW / 2), by = RY + RH / 2 - BDD - ROW * row - BDD * row - ROW / 2 + 0.05, bz = rz - 0.1;
      B(g, 4.2, 1.55, 1.5, bcol[i], bx, by - 0.12, bz);
      var u0 = col * 0.5, v1 = 1 - row / 3, v0 = 1 - (row + 1) / 3, px = bx, py = by - 0.12, pz = bz + 0.75 + 0.1;
      pos.push(px - plateW / 2, py - plateH / 2, pz, px + plateW / 2, py - plateH / 2, pz, px + plateW / 2, py + plateH / 2, pz, px - plateW / 2, py + plateH / 2, pz);
      uv.push(u0, v0, u0 + 0.5, v0, u0 + 0.5, v1, u0, v1); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    }
    var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); pg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); pg.setIndex(idx);
    g.add(new T.Mesh(pg, new T.MeshBasicMaterial({ map: ctex(T, 1024, 512, 1024, 512, drawSlideLabels) })));
  })();

  /* ================= the brain model on its stand (left) ================= */
  var BX = -15.8, BZ0 = -13.6;
  (function () {
    var sg = grp(BX, TOP, BZ0, 0);
    C(sg, 1.95, 2.1, 0.4, '#3a3550', 0, 0.2, 0, 28); C(sg, 1.6, 1.8, 0.2, '#2fa7a2', 0, 0.5, 0, 28);
    C(sg, 0.28, 0.28, 2.5, '#cfc6b2', 0, 1.7, 0, 12); C(sg, 0.45, 0.45, 0.2, '#2fa7a2', 0, 0.75, 0, 16);
    var bg = new T.Group(); bg.position.set(0, 5.7, 0); bg.rotation.y = 0.32; sg.add(bg);
    var bm = new T.MeshStandardMaterial({ vertexColors: true, color: '#d2d2d2', roughness: 0.9, metalness: 0 });
    var hl = new T.Mesh(brainHemi(T, 1), bm), hr = new T.Mesh(brainHemi(T, -1), bm); bg.add(hl); bg.add(hr);
    var cb = new T.Mesh(brainCerebellum(T), bm); cb.position.set(1.95, -1.78, 0); bg.add(cb);
    var st = C(bg, 0.42, 0.3, 2.2, '#d6bda9', 0.65, -2.3, 0, 18); st.rotation.z = 0.1;
    sh(BX, BZ0, 5.4, 5.4, 0.5, 0.0);
    /* key card on a small foot, tilted back */
    var kc = grp(BX, TOP + 0.35, -9.9, 0.1); kc.rotation.x = -0.28;
    B(kc, 5.6, 3.8, 0.14, '#17142b', 0, 1.9, 0); B(kc, 5.8, 0.3, 0.9, '#25908c', 0, 0, 0.3);
    var swc = {}; for (var kk in LOBE) swc[kk] = '#' + tinted(T, kk).getHexString();
    P(kc, 5.4, 3.6, new T.MeshBasicMaterial({ map: ctex(T, 768, 512, 768, 512, function (x, w, h) { drawKey(x, w, h, swc); }) }), 0, 1.9, 0.17);
    sh(BX, -9.7, 6.4, 2.4, 0.4, 0.0);
  })();

  /* ================= task lamp (far left): cream arms, amber shade ================= */
  (function () {
    var LX = -23.4, LZ = -16.2, lg = grp(LX, TOP, LZ, 0);
    C(lg, 1.3, 1.4, 0.34, '#a89c86', 0, 0.17, 0, 24);
    var j0 = [0, 0.4, 0], j1 = [0.9, 5.2, 0.2], j2 = [2.9, 9.0, 0.7];
    rod(lg, j0, j1, 0.16, '#b3a78f'); rod(lg, j1, j2, 0.16, '#b3a78f'); S(lg, 0.3, '#b9ab90', j1[0], j1[1], j1[2]); S(lg, 0.24, '#b9ab90', j2[0], j2[1], j2[2]); S(lg, 0.3, '#b9ab90', 0, 0.45, 0);
    var hd = new T.Group(); hd.position.set(j2[0] + 0.2, j2[1] - 0.2, j2[2] + 0.1); hd.rotation.z = 0.55; lg.add(hd);
    C(hd, 0.4, 1.55, 1.5, '#d9953f', 0, 0, 0, 24); C(hd, 0.46, 0.46, 0.25, '#b9ab90', 0, 0.8, 0, 12);
    GC(hd, 1.1, 1.1, 0.06, '#ffd79a', 1.1, 0, -0.84, 0, 22);
    sh(LX + 0.5, LZ + 0.2, 4.2, 4.2, 0.5, 0.0);
    /* a notebook and pencil in front of it, a mug beside */
    var nb = grp(-20.6, TOP, -10.4, 0.3);
    B(nb, 3.0, 0.2, 4.0, '#2f8f93', 0, 0.1, 0); B(nb, 2.8, 0.14, 3.8, '#e0d6b8', 0.06, 0.25, 0); C(nb, 0.06, 0.06, 2.6, '#f0b45a', 0.3, 0.4, 0.3, 8).rotation.z = Math.PI / 2;
    sh(-20.6, -10.4, 4.6, 5.4, 0.45, 0.0);
    var mg = grp(-24.2, TOP, -11.4, 0);
    C(mg, 0.62, 0.55, 1.2, '#d9953f', 0, 0.6, 0, 22); C(mg, 0.5, 0.5, 0.03, '#2a1810', 0, 1.2, 0, 20); var mh = TO(mg, new T.TorusGeometry(0.32, 0.07, 8, 16, Math.PI * 1.2), '#d9953f', 0.62, 0.6, 0); mh.rotation.z = -Math.PI * 0.6;
    sh(-24.2, -11.4, 2.8, 2.8, 0.5, 0.0);
  })();

  /* ================= microscope with slides ================= */
  (function () {
    var MX = -8.8, MZ = -14.6, m = grp(MX, TOP, MZ, 0.35), AX = 0.2, en = '#9a8f7a', bk = '#26212f', ch = '#a9a3b8';
    B(m, 2.9, 0.4, 2.4, en, 0, 0.2, 0);
    TO(m, new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0.3, -0.95), new T.Vector3(0, 1.4, -1.1), new T.Vector3(0, 2.8, -1.05), new T.Vector3(0, 3.7, -0.8), new T.Vector3(0, 4.05, -0.4)]), 30, 0.27, 12, false), en, 0, 0, 0);
    B(m, 0.52, 0.5, 0.95, en, 0, 4.0, -0.12);
    C(m, 0.42, 0.42, 1.0, en, 0, 3.75, AX, 22); C(m, 0.5, 0.46, 0.3, bk, 0, 3.1, AX, 22);
    [[-0.25, 0.1, 0.55, -0.22], [0.25, 0.1, 0.65, 0.22], [0, -0.22, 0.75, 0]].forEach(function (o) { var ob = C(m, 0.14, 0.08, o[2], ch, o[0], 2.95 - o[2] / 2, AX + o[1], 12); ob.rotation.z = o[3]; });
    var ep = new T.Group(); ep.position.set(0, 4.2, AX); ep.rotation.x = 0.55; m.add(ep);
    C(ep, 0.27, 0.3, 1.5, en, 0, 0.7, 0, 18); C(ep, 0.31, 0.31, 0.1, ch, 0, 1.4, 0, 18); C(ep, 0.2, 0.24, 0.65, bk, 0, 1.8, 0, 16);
    B(m, 0.8, 0.6, 0.8, en, 0, 1.5, -0.7); B(m, 2.0, 0.14, 1.8, bk, 0, 1.74, AX);
    [-0.55, 0.55].forEach(function (cx) { B(m, 0.06, 0.05, 0.75, ch, cx, 1.83, AX); });
    B(m, 1.1, 0.05, 0.42, '#cfe3e8', 0, 1.84, AX); B(m, 0.18, 0.02, 0.2, '#c24a7a', 0.1, 1.88, AX);
    C(m, 0.28, 0.34, 0.5, ch, 0, 1.4, AX, 16);
    [-1, 1].forEach(function (sd) {
      var c1 = C(m, 0.44, 0.44, 0.34, bk, sd * 0.47, 1.1, -1.1, 20); c1.rotation.z = Math.PI / 2;
      var c2 = C(m, 0.28, 0.28, 0.24, bk, sd * 0.76, 1.1, -1.1, 18); c2.rotation.z = Math.PI / 2;
      var c3 = C(m, 0.14, 0.14, 0.05, ch, sd * 0.9, 1.1, -1.1, 12); c3.rotation.z = Math.PI / 2;
    });
    C(m, 0.38, 0.4, 0.1, bk, 0, 0.45, AX + 0.15, 18); GC(m, 0.26, 0.26, 0.03, '#ffb454', 1.3, 0, 0.51, AX + 0.15, 16);
    sh(MX, MZ, 4.6, 4.2, 0.55, 0.0);
    /* a slide tray in front of it: stacked slides with coloured labels */
    var tr = grp(-10.6, TOP, -11.7, 0.12);
    B(tr, 3.6, 0.3, 1.8, '#2fa7a2', 0, 0.15, 0);
    for (i = 0; i < 6; i++) { B(tr, 0.3, 0.12, 1.2, '#cfe3e8', -1.3 + i * 0.52, 0.36, 0); B(tr, 0.3, 0.14, 0.34, ['#c24a7a', '#f0b45a', '#8c78c0', '#5fe0d0', '#e58f76', '#c24a7a'][i], -1.3 + i * 0.52, 0.36, -0.42); }
    var ls = grp(-6.4, TOP, -11.4, -0.5); B(ls, 1.07, 0.06, 0.36, '#cfe3e8', 0, 0.03, 0); B(ls, 0.3, 0.07, 0.36, '#f0b45a', -0.38, 0.04, 0);
    sh(-10.6, -11.7, 4.6, 2.8, 0.45, 0.0);
  })();

  /* ================= head form with an electrode cap (right) ================= */
  var HX = 11.0, HZ = -14.6, HY = 7.5, hg;
  (function () {
    var sg = grp(HX, TOP, HZ, 0);
    C(sg, 1.8, 1.9, 0.35, '#3a3550', 0, 0.175, 0, 28); C(sg, 0.3, 0.3, 4.6, '#8b8476', 0, 2.65, 0, 12);
    hg = new T.Group(); hg.position.set(0, HY, 0); hg.rotation.y = -0.4; hg.rotation.x = 0.05; hg.scale.setScalar(1.12); sg.add(hg);
    var skin = '#968a7b';
    S(hg, 1, skin, 0, 0, 0, 1.15, 1.55, 1.35, 28); TO(hg, new T.ConeGeometry(0.3, 0.7, 12), skin, 0, -0.2, 1.55).rotation.x = Math.PI / 2;
    S(hg, 0.5, skin, 1.12, -0.1, -0.1, 0.4, 1.0, 0.8, 10); S(hg, 0.5, skin, -1.12, -0.1, -0.1, 0.4, 1.0, 0.8, 10);
    C(hg, 0.62, 0.7, 1.5, skin, 0, -1.75, -0.15, 18);
    /* the cap: a teal shell over the upper head, with electrodes at 10-20 sites (the six labelled ones in amber) */
    var cap = TO(hg, new T.SphereGeometry(1, 36, 22, 0, Math.PI * 2, 0, 1.78), '#3fa9a6', 0, 0.12, -0.05); cap.scale.set(1.25, 1.64, 1.46);
    var RX = 1.25, RY = 1.64, RZ = 1.46, CYo = 0.12, CZo = -0.05;
    var EL = [['Fp1', 88, 20], ['F7', 90, 56], ['F3', 56, 40], ['C3', 46, 90], ['T3', 90, 90], ['P3', 56, 140], ['T5', 90, 124], ['O1', 88, 160], ['Fz', 46, 0], ['Cz', 0, 0], ['Pz', 46, 180]];
    var amber = { Fp1: 1, C3: 1, O1: 1, Fp2: 1, C4: 1, O2: 1 };
    function elec(name, th, ph) {
      var t = th * Math.PI / 180, p = ph * Math.PI / 180, ex = RX * Math.sin(t) * Math.sin(p), ey = CYo + RY * Math.cos(t), ez = CZo + RZ * Math.sin(t) * Math.cos(p);
      var nx = ex / (RX * RX), ny = (ey - CYo) / (RY * RY), nz2 = (ez - CZo) / (RZ * RZ), nv = new T.Vector3(nx, ny, nz2).normalize();
      var o = C(hg, 0.22, 0.22, 0.14, amber[name] ? AMB : '#cfc5ae', ex + nv.x * 0.07, ey + nv.y * 0.07, ez + nv.z * 0.07, 14); o.quaternion.setFromUnitVectors(up, nv);
    }
    EL.forEach(function (e) { elec(e[0], e[1], e[2]); if (e[2] !== 0 && e[2] !== 180) elec(e[0].replace(/(\d)/, function (d) { return String(+d + 1); }), e[1], -e[2]); });
    /* chin strap */
    var tor = TO(hg, new T.TorusGeometry(1.05, 0.05, 6, 28, Math.PI), '#cfc5ae', 0, -0.4, 0.15); tor.rotation.x = Math.PI / 2; tor.rotation.z = Math.PI; tor.scale.set(1.0, 1.15, 1.0);
    sh(HX, HZ, 4.4, 4.4, 0.5, 0.0);
    /* leads from the back of the cap to the amplifier */
    var lead = new T.CatmullRomCurve3([new T.Vector3(HX + 1.0, TOP + 7.5, HZ - 1.3), new T.Vector3(HX + 1.4, TOP + 5.2, HZ - 2.2), new T.Vector3(HX + 2.4, TOP + 2.0, HZ - 2.3), new T.Vector3(HX + 2.6, TOP + 0.3, HZ - 0.6), new T.Vector3(HX + 2.9, TOP + 0.22, HZ + 1.8), new T.Vector3(HX + 3.1, TOP + 0.9, HZ + 2.7)]);
    TO(g, new T.TubeGeometry(lead, 40, 0.14, 8, false), '#4b4468', 0, 0, 0);
    /* the electrode placard in front of the stand */
    var pc = grp(HX + 0.2, TOP + 0.3, -11.3, -0.1); pc.rotation.x = -0.3;
    B(pc, 4.4, 3.3, 0.14, '#17142b', 0, 1.65, 0); B(pc, 4.6, 0.26, 0.8, '#c98f3c', 0, 0, 0.26);
    P(pc, 4.2, 3.15, new T.MeshBasicMaterial({ map: ctex(T, 768, 576, 768, 576, drawPlacard) }), 0, 1.65, 0.17);
    sh(HX + 0.2, -11.2, 5, 2.2, 0.4, 0.0);
  })();

  /* ================= EEG monitor and amplifier ================= */
  var eegScr = dyn(T, 1024, 576);
  (function () {
    var MX = 17.6, MZ = -15.6, m = grp(MX, TOP, MZ, -0.2), dk = '#1d1b2c';
    C(m, 1.7, 1.8, 0.25, dk, 0, 0.125, 0, 24); B(m, 0.8, 2.0, 0.5, '#2a2740', 0, 1.2, -0.1);
    var cy = 2.0 + 2.55;
    B(m, 9.0, 5.1, 0.4, dk, 0, cy, 0); B(m, 4.6, 3.3, 0.55, '#242238', 0, cy, -0.42);
    var scr = P(m, 8.5, 4.78, new T.MeshBasicMaterial({ map: eegScr.t, color: new T.Color(1.15, 1.15, 1.15) }), 0, cy + 0.02, 0.32);
    GC(m, 0.08, 0.08, 0.02, '#7be58a', 1.2, 4.1, cy - 2.4, 0.22, 8).rotation.x = Math.PI / 2;
    sh(MX, MZ, 5.2, 3.2, 0.5, 0.0);
    /* amplifier box on the bench with status lights */
    var am = grp(14.4, TOP, -11.9, 0.1);
    B(am, 3.4, 1.3, 2.2, '#3b3558', 0, 0.65, 0); B(am, 3.0, 0.1, 1.8, '#4d4670', 0, 1.35, 0); B(am, 0.9, 0.5, 0.15, '#17142b', -1.0, 0.7, 1.15);
    [['#7be58a', 0.0], ['#f0b45a', 0.45], ['#5fe0d0', 0.9]].forEach(function (l, k) { GC(am, 0.07, 0.07, 0.03, l[0], 1.3, 0.2 + l[1], 0.9, 1.12, 10).rotation.x = Math.PI / 2; });
    sh(14.4, -11.9, 4.4, 3.2, 0.5, 0.0);
  })();

  /* ================= pipette tray ================= */
  (function () {
    var tr = grp(15.6, TOP, -8.3, 0.08);
    B(tr, 7.2, 0.22, 3.2, '#2c8c90', 0, 0.11, 0);
    B(tr, 7.2, 0.7, 0.2, '#2c8c90', 0, 0.35, 1.5); B(tr, 7.2, 0.7, 0.2, '#2c8c90', 0, 0.35, -1.5); B(tr, 0.2, 0.7, 3.2, '#2c8c90', 3.5, 0.35, 0); B(tr, 0.2, 0.7, 3.2, '#2c8c90', -3.5, 0.35, 0);
    /* tip box: a lid with a grid of tips under it */
    B(tr, 2.2, 0.8, 1.5, '#8c78c0', 2.3, 0.62, 0); B(tr, 2.2, 0.12, 1.5, '#a79fc4', 2.3, 1.06, 0);
    for (i = 0; i < 12; i++) { C(tr, 0.07, 0.03, 0.4, '#efe6d2', 1.55 + (i % 4) * 0.5, 1.3, -0.45 + Math.floor(i / 4) * 0.45, 8); }
    /* pipettes lying on the tray, a little fanned */
    [['#e58f76', -2.6, 1.0, 0.04], ['#f0b45a', -1.8, 0.55, 0.0], ['#5fe0d0', -1.0, 0.1, -0.03], ['#c58fbe', -0.2, -0.35, -0.07]].forEach(function (p, k) {
      var pg = new T.Group(); pg.position.set(p[1] - 0.3, 0.62, p[2] * 0.9 - 0.15); pg.rotation.y = p[3]; tr.add(pg);
      C(pg, 0.24, 0.24, 2.6, '#2b2640', 0, 0, 0, 14).rotation.z = Math.PI / 2;
      var gp = C(pg, 0.27, 0.27, 0.6, p[0], -0.4, 0, 0, 14); gp.rotation.z = Math.PI / 2;
      var bt = C(pg, 0.2, 0.2, 0.34, p[0], -1.45, 0, 0, 12); bt.rotation.z = Math.PI / 2; C(pg, 0.1, 0.1, 0.5, '#cfc6b2', -1.0, 0, 0, 10).rotation.z = Math.PI / 2;
      var ej = C(pg, 0.14, 0.05, 1.3, '#d8e6ea', 1.9, 0, 0, 10); ej.rotation.z = -Math.PI / 2;
    });
    sh(15.6, -8.3, 8.4, 4.4, 0.5, 0.0);
  })();

  /* ================= filler beyond the main view: plant, gloves, bulletin board, clock ================= */
  (function () {
    var pl = grp(-28.5, TOP, -14.5, 0);
    C(pl, 1.1, 0.85, 1.6, '#c46a4a', 0, 0.8, 0, 18); C(pl, 1.0, 1.0, 0.1, '#3a2a20', 0, 1.62, 0, 16);
    for (i = 0; i < 9; i++) { var a = i / 9 * 6.283, lf = S(pl, 0.6, i % 2 ? '#3f9a6a' : '#357f58', Math.sin(a) * 0.5, 2.6, Math.cos(a) * 0.5, 0.35, 1.4, 0.2, 8); lf.rotation.z = -Math.sin(a) * 0.5; lf.rotation.x = Math.cos(a) * 0.5; }
    sh(-28.5, -14.5, 3.6, 3.6, 0.5, 0.0);
    var gb = grp(25.4, TOP, -12.8, -0.2); B(gb, 3.2, 1.7, 2.0, '#b3a98f', 0, 0.85, 0); B(gb, 3.22, 0.5, 2.02, '#2fa7a2', 0, 1.2, 0); B(gb, 1.4, 0.12, 0.6, '#17142b', 0, 1.72, 0.3);
    sh(25.4, -12.8, 4.2, 3.0, 0.5, 0.0);
    /* a few binders on the far left */
    var bd = grp(-33.5, TOP, -14.2, 0.1); ['#8c78c0', '#2fa7a2', '#d9953f', '#c58fbe'].forEach(function (c, k) { B(bd, 0.9, 3.8, 3.0, c, -1.4 + k * 1.0, 1.9, 0); });
    sh(-33.5, -14.2, 5.2, 3.8, 0.5, 0.0);
  })();
  (function () {
    /* bulletin board with pinned papers, far left */
    var BXc = -32, BYc = 11, W = 9, Hh = 6, fz = WALL + 0.25;
    B(g, W + 0.6, Hh + 0.6, 0.4, '#8f8571', BXc, BYc, WALL + 0.25); B(g, W, Hh, 0.2, '#a97c4e', BXc, BYc, WALL + 0.5);
    var tint = ['#8f8672', '#8aa0a6', '#a8946a', '#928aa8'];
    for (i = 0; i < 6; i++) { var pp = B(g, 1.8 + rnd() * 0.4, 2.2 + rnd() * 0.4, 0.06, tint[i % 4], BXc - 3.2 + (i % 3) * 3.2 + rnd() * 0.3, BYc - 1.2 + Math.floor(i / 3) * 2.6 + (rnd() - 0.5) * 0.3, WALL + 0.66); pp.rotation.z = (rnd() - 0.5) * 0.12; B(g, 0.22, 0.22, 0.12, '#d9453f', pp.position.x, pp.position.y + 1.0, WALL + 0.72); }
    /* wall clock, far right */
    var CX = 31, CY = 12.5, cl = new T.Group(); cl.position.set(CX, CY, WALL + 0.3); g.add(cl);
    var body = new T.Mesh(new T.CylinderGeometry(1.7, 1.7, 0.3, 36), new T.MeshStandardMaterial({ color: '#2b2250', roughness: 0.8 })); body.rotation.x = Math.PI / 2; cl.add(body);
    var face = ctex(T, 256, 256, 256, 256, function (x) {
      x.fillStyle = '#e8dfc8'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.strokeStyle = '#2b2250'; x.lineWidth = 8;
      for (var h = 0; h < 12; h++) { var a = h / 12 * 6.283; x.beginPath(); x.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); x.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); x.stroke(); }
      x.lineWidth = 11; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 58 * Math.sin(2.4), 128 - 58 * Math.cos(2.4)); x.stroke();
      x.lineWidth = 7; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 92 * Math.sin(0.5), 128 - 92 * Math.cos(0.5)); x.stroke();
    });
    face.minFilter = T.LinearFilter;
    var fm = new T.Mesh(new T.CircleGeometry(1.6, 36), new T.MeshBasicMaterial({ map: face, transparent: true })); fm.position.z = 0.28; cl.add(fm);
  })();

  /* far left wall: a shelf of binders and boxes. Only seen when orbiting to the side. */
  (function () {
    var sx = -XW + 1.4, z0 = 4, k, hh;
    B(g, 2.6, 0.3, 15, '#2b6f76', sx, 10.4, z0); B(g, 0.3, 1.6, 15, '#2b6f76', -XW + 0.35, 9.5, z0);
    var cols = ['#8c78c0', '#2fa7a2', '#c98f3c', '#c58fbe', '#6f8fc0', '#a87a62', '#2fa7a2', '#8c78c0'], zc = z0 - 6.2;
    for (k = 0; k < 8; k++) { hh = 3.0 + (k % 3) * 0.5; B(g, 2.2, hh, 1.2, cols[k], sx, 10.55 + hh / 2, zc); zc += 1.35; }
    B(g, 2.2, 1.6, 3.4, '#9a8f7a', sx, 11.35, zc + 1.6); B(g, 2.2, 1.6, 3.0, '#7a6fa8', sx, 12.95, zc + 1.5);
  })();

  /* ---- bake the static parts, then the shadows ---- */
  g.updateMatrixWorld(true);
  bake(recs, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
  bake(grecs, new T.MeshBasicMaterial({ vertexColors: true }));
  bakeShadows();

  /* ---- the stage's soft shadow under the subject ---- */
  var tableShadow = K.contactShadow(T, g, 0, 0.0, 0, 1, 1, 0.5);

  /* nothing here uses the room fog: the room is small and its colours are chosen */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  /* the EEG redraws about ten times a second; signal time runs slower than real time so the sweep is easy to follow */
  var acc = 0;
  function paintEEG(t) { drawEEG(eegScr.x, 1024, 576, 3.2 + t * 0.45); eegScr.t.needsUpdate = true; }
  paintEEG(0);
  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) {
      if (calm) return;
      acc += dt || 0;
      if (acc >= 0.1) { acc = 0; paintEEG(t); }
    }
  };
};
})();
