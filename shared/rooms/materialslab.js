/* Room "materialslab" for the materials subject.
 * A materials-science lab in copper, teal and charcoal: hexagonal floor and splashback tiles, a display wall of crystal specimens in
 * glass-front cases, labelled metal ingot and bar stacks, lattice-cell and stress-strain posters, a bench-top tensile tester, a box
 * furnace with a dim window, a microscope, sample coupons and a hardness tester. Everything is procedural (geometry and small canvas
 * textures). Local y = 0 is the bench top, the floor is at y = -13, the back wall at z = -19.
 * Many small parts of one material are merged into one mesh (see Batch) to keep the draw-call count low. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;

var FLOOR = -13, WALL_Z = -19, TOPY = -0.02, SANS = 'Arial, Helvetica, sans-serif', S3 = Math.sqrt(3);
var CU = '#8c5032', CU_L = '#b9835a', CU_D = '#6e3c22', TEAL = '#2f7a78', TEAL_D = '#244e50', CHAR = '#2b3032', CHAR_L = '#454c4e', WARM = '#ddd5c2', INK = '#232c2d', STEEL = '#788286';

function tex(T, w, h, draw, rep) {
  var t = K.canvasTex(T, w, h, draw);
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}
/* a canvas drawn in logical units lw x lh, so a board of any aspect keeps round circles and upright text */
function boardTex(T, w, h, lw, lh, draw) {
  return tex(T, w, h, function (x) { x.setTransform(w / lw, 0, 0, h / lh, 0, 0); draw(x, lw, lh); });
}
/* the stage renders with a 16-bit depth buffer: anything printed on or lying on another surface wins the depth test by an offset */
function offset(m) { m.polygonOffset = true; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4; return m; }
function pl(T, g, w, h, map, x, y, z, rx, std, decal) {
  var m = new T.Mesh(new T.PlaneGeometry(w, h), std ? new T.MeshStandardMaterial({ map: map, roughness: 0.9, metalness: 0 }) : new T.MeshBasicMaterial({ map: map }));
  if (decal) offset(m.material);
  m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m;
}
function uvRect(geo, u0, v0, u1, v1) {
  var uv = geo.attributes.uv, i;
  for (i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
  return geo;
}

/* merges many small parts that share one material into one mesh. Parts carry vertex colours, so one material serves them all. */
function Batch(T, colored) {
  var parts = [], M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), S = new T.Vector3(1, 1, 1), C = new T.Color();
  var b = {
    addM: function (geo, color, m) {
      var gg = geo.index ? geo.toNonIndexed() : geo.clone(), n = gg.attributes.position.count, a, i;
      gg.applyMatrix4(m);
      if (colored) { C.set(color); a = new Float32Array(n * 3); for (i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } gg.setAttribute('color', new T.BufferAttribute(a, 3)); }
      parts.push(gg); return b;
    },
    add: function (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) {
      return b.addM(geo, color, M.compose(P.set(x || 0, y || 0, z || 0), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), S.set(sx || 1, sy || 1, sz || 1)));
    },
    box: function (w, h, d, x, y, z, color, ry, rx, rz) { return b.add(new T.BoxGeometry(w, h, d), color, x, y, z, rx || 0, ry || 0, rz || 0); },
    cyl: function (rt, rb, h, x, y, z, color, seg, rx, ry, rz) { return b.add(new T.CylinderGeometry(rt, rb, h, seg || 18), color, x, y, z, rx, ry, rz); },
    mesh: function (material) {
      var n = 0, o = 0, pos, nor, uv, cl, geo;
      parts.forEach(function (p) { n += p.attributes.position.count; });
      pos = new Float32Array(n * 3); nor = new Float32Array(n * 3); uv = new Float32Array(n * 2); cl = colored ? new Float32Array(n * 3) : null;
      parts.forEach(function (p) {
        pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3);
        if (p.attributes.uv) uv.set(p.attributes.uv.array, o * 2);
        if (cl) cl.set(p.attributes.color.array, o * 3);
        o += p.attributes.position.count;
      });
      geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      if (cl) geo.setAttribute('color', new T.BufferAttribute(cl, 3));
      return new T.Mesh(geo, material);
    }
  };
  return b;
}

/* ---------- hexagonal tiles ---------- */
/* One seamless tile holding 2 x 2 hexagon periods. Drawn in "hexagon width = 1" units, so the plane's repeat must be
   (width / (2 * hex), depth / (2 * sqrt(3) * hex)) to make the hexagons regular. */
function hexTex(T, shades, grout, seed, accents) {
  return tex(T, 512, 512, function (x, w, h) {
    var r = K.mulberry(seed), tbl = [], i, j, k, R = 0.93 / S3, cx, cy, a, s;
    for (j = 0; j < 4; j++) { tbl[j] = []; for (i = 0; i < 2; i++) tbl[j][i] = (accents && r() < 0.1) ? accents[Math.floor(r() * accents.length)] : shades[Math.floor(r() * shades.length)]; }
    x.fillStyle = grout; x.fillRect(0, 0, w, h);
    x.setTransform(w / 2, 0, 0, h / (2 * S3), 0, 0);
    for (j = -1; j <= 4; j++) for (i = -1; i <= 2; i++) {
      cx = i + ((j & 1) ? 0.5 : 0); cy = j * 0.8660254;
      x.beginPath();
      for (k = 0; k < 6; k++) { a = (30 + 60 * k) * Math.PI / 180; s = k ? 'lineTo' : 'moveTo'; x[s](cx + R * Math.cos(a), cy + R * Math.sin(a)); }
      x.closePath(); x.fillStyle = tbl[((j % 4) + 4) % 4][((i % 2) + 2) % 2]; x.fill();
    }
  }, null);
}
function hexRepeat(t, T, w, d, hex) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(w / (2 * hex), d / (2 * S3 * hex)); return t; }

/* ---------- text on plates and posters ---------- */
function fit(x, s, maxW, size, bold) {
  x.font = (bold === false ? '' : 'bold ') + size + 'px ' + SANS;
  var w = x.measureText(s).width;
  if (w > maxW) { size = Math.floor(size * maxW / w); x.font = (bold === false ? '' : 'bold ') + size + 'px ' + SANS; }
  return size;
}
/* a chemical formula left-aligned at px with subscript digits; returns where it ends */
function formula(x, str, px, py, size, color) {
  var i, ch, sub, sz;
  x.fillStyle = color; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  for (i = 0; i < str.length; i++) {
    ch = str.charAt(i); sub = /[0-9]/.test(ch) && i > 0; sz = sub ? size * 0.62 : size;
    x.font = 'bold ' + sz + 'px ' + SANS; x.fillText(ch, px, sub ? py + size * 0.2 : py); px += x.measureText(ch).width;
  }
  return px;
}
function line(x, x1, y1, x2, y2, color, lw, dash) {
  x.strokeStyle = color; x.lineWidth = lw; x.lineCap = 'round'; x.setLineDash(dash || []); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); x.setLineDash([]);
}
function head(x, x1, y1, x2, y2, color, size) {
  var a = Math.atan2(y2 - y1, x2 - x1);
  x.fillStyle = color; x.beginPath(); x.moveTo(x2, y2); x.lineTo(x2 - size * Math.cos(a - 0.4), y2 - size * Math.sin(a - 0.4)); x.lineTo(x2 - size * Math.cos(a + 0.4), y2 - size * Math.sin(a + 0.4)); x.closePath(); x.fill();
}
function arrow(x, x1, y1, x2, y2, color, lw, size) { line(x, x1, y1, x2, y2, color, lw); head(x, x1, y1, x2, y2, color, size || lw * 4); }
function dot(x, px, py, r, color) {
  var g = x.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, color); g.addColorStop(1, color);
  x.fillStyle = color; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(px - r * 0.3, py - r * 0.35, r * 0.38, 0, 7); x.fill();
  x.strokeStyle = 'rgba(20,28,28,0.7)'; x.lineWidth = 2.2; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke();
}

/* ---------- plates (case labels, stack tags, warning sign) in two atlases ---------- */
var CASE_LABELS = [
  ['QUARTZ', 'SiO2', 'trigonal'], ['PYRITE', 'FeS2', 'cubic'], ['FLUORITE', 'CaF2', 'cubic'],
  ['HALITE', 'NaCl', 'cubic'], ['CALCITE', 'CaCO3', 'trigonal'], ['BERYL', 'Be3Al2Si6O18', 'hexagonal']
];
var CELL_W = 1024, CELL_H = 170;
function caseAtlas(T) {
  return tex(T, 2048, 1024, function (x) {
    CASE_LABELS.forEach(function (L, i) {
      var ox = (i % 2) * CELL_W, oy = Math.floor(i / 2) * CELL_H, ex, sz;
      x.save(); x.translate(ox, oy);
      x.fillStyle = '#252b2d'; x.fillRect(0, 0, CELL_W, CELL_H);
      x.fillStyle = CU; x.fillRect(0, CELL_H - 10, CELL_W, 10);
      x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#efe7d4'; sz = fit(x, L[0], 900, 88); x.fillText(L[0], 40, 88);
      ex = formula(x, L[1], 40, 148, 54, CU_L); x.fillStyle = '#cfc7b3'; sz = fit(x, L[2], 1000 - ex - 40, 50, false); x.fillText(L[2], ex + 36, 148);
      x.restore();
    });
  });
}
var TAGS = [
  { n: 'COPPER', s: 'Cu', d: '~8.96 g/cm³', c: CU_L }, { n: 'STEEL', s: 'Fe + C', d: '~7.85 g/cm³', c: '#b9c3c6' },
  { n: 'ALUMINIUM', s: 'Al', d: '~2.70 g/cm³', c: '#cfd6d8' }, { n: 'BRASS', s: 'Cu + Zn', d: '~8.5 g/cm³', c: '#dcbd62' }
];
/* 512 x 256 cells in a 2048 x 512 sheet: four stack tags and a hazard sign */
function tagAtlas(T) {
  return tex(T, 2048, 512, function (x) {
    TAGS.forEach(function (L, i) {
      var ox = (i % 4) * 512, oy = Math.floor(i / 4) * 256;
      x.save(); x.translate(ox, oy);
      x.fillStyle = '#252b2d'; x.fillRect(0, 0, 512, 256); x.fillStyle = L.c; x.fillRect(0, 0, 14, 256);
      x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#efe7d4'; fit(x, L.n, 450, 76); x.fillText(L.n, 36, 92);
      x.fillStyle = L.c; fit(x, L.s, 450, 62); x.fillText(L.s, 36, 164);
      x.fillStyle = '#cfc7b3'; fit(x, L.d, 450, 48, false); x.fillText(L.d, 36, 224);
      x.restore();
    });
    /* hazard sign */
    x.save(); x.translate(0, 256);
    x.fillStyle = '#d9ad3a'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#232c2d'; x.lineWidth = 10; x.strokeRect(8, 8, 496, 240);
    x.fillStyle = '#232c2d'; x.beginPath(); x.moveTo(110, 40); x.lineTo(196, 196); x.lineTo(24, 196); x.closePath(); x.fill();
    x.fillStyle = '#d9ad3a'; x.beginPath(); x.moveTo(110, 78); x.lineTo(160, 170); x.lineTo(60, 170); x.closePath(); x.fill();
    x.fillStyle = '#232c2d'; x.font = 'bold 84px ' + SANS; x.textAlign = 'center'; x.fillText('!', 110, 166);
    x.textAlign = 'left'; x.font = 'bold 60px ' + SANS; x.fillText('CAUTION', 224, 112); x.font = 'bold 40px ' + SANS; x.fillText('HOT SURFACE', 224, 170); x.font = '30px ' + SANS; x.fillText('furnace in use', 224, 214);
    x.restore();
  });
}

/* ---------- lattice-cell posters ---------- */
var LATTICES = {
  sc: { code: 'SC', l1: 'Simple', l2: 'cubic', atoms: [], count: '1', calc: '8 corners x 1/8', cn: '6', apf: '~52 %', ex: 'Rare in metals: alpha-polonium' },
  bcc: { code: 'BCC', l1: 'Body-centred', l2: 'cubic', atoms: [[0.5, 0.5, 0.5]], count: '2', calc: '8 x 1/8 + 1', cn: '8', apf: '~68 %', ex: 'Iron (below ~912 C), chromium, tungsten' },
  fcc: { code: 'FCC', l1: 'Face-centred', l2: 'cubic', atoms: [[0.5, 0.5, 0], [0.5, 0.5, 1], [0, 0.5, 0.5], [1, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5]], count: '4', calc: '8 x 1/8 + 6 x 1/2', cn: '12', apf: '~74 %', ex: 'Copper, aluminium, gold, nickel' }
};
function latticeTex(T, kind) {
  var L = LATTICES[kind], LW = 620, LH = 840;
  return boardTex(T, 1024, 1024, LW, LH, function (x) {
    var A = 185, X0 = (LW - A * 1.5) / 2 + 4, Y0 = 500, i, j, pts = [], atoms = [], rows;
    function P(px, py, pz) { return [X0 + (px + pz * 0.5) * A, Y0 - (py + pz * 0.36) * A]; }
    x.fillStyle = WARM; x.fillRect(0, 0, LW, LH);
    x.fillStyle = '#25605f'; x.fillRect(0, 0, LW, 140); x.fillStyle = CU; x.fillRect(0, 140, LW, 8);
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = '#f0b88a'; x.font = 'bold 96px ' + SANS; x.fillText(L.code, 28, 102);
    x.fillStyle = '#d6e6e0'; x.font = '22px ' + SANS; x.fillText('unit cell, schematic', 30, 128);
    x.textAlign = 'right'; x.fillStyle = '#f2ead8'; fit(x, L.l1, 330, 44); x.fillText(L.l1, LW - 28, 66); x.font = 'bold 44px ' + SANS; x.fillText(L.l2, LW - 28, 116);
    /* faint front face, then the twelve edges (the three hidden ones dashed) */
    var f = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)];
    x.fillStyle = 'rgba(47,122,120,0.12)'; x.beginPath(); x.moveTo(f[0][0], f[0][1]); for (i = 1; i < 4; i++) x.lineTo(f[i][0], f[i][1]); x.closePath(); x.fill();
    for (i = 0; i < 8; i++) pts.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]);
    for (i = 0; i < 8; i++) for (j = i + 1; j < 8; j++) {
      var d = (pts[i][0] ^ pts[j][0]) + (pts[i][1] ^ pts[j][1]) + (pts[i][2] ^ pts[j][2]);
      if (d !== 1) continue;
      var hidden = (i === 4 || j === 4);
      var p1 = P(pts[i][0], pts[i][1], pts[i][2]), p2 = P(pts[j][0], pts[j][1], pts[j][2]);
      if (hidden) line(x, p1[0], p1[1], p2[0], p2[1], 'rgba(35,44,45,0.55)', 3, [9, 8]); else line(x, p1[0], p1[1], p2[0], p2[1], INK, 5);
    }
    /* atoms, back to front */
    for (i = 0; i < 8; i++) atoms.push({ p: pts[i], c: CU });
    L.atoms.forEach(function (a) { atoms.push({ p: a, c: '#2f9a96' }); });
    atoms.sort(function (a, b) { return b.p[2] - a.p[2]; });
    atoms.forEach(function (a) { var q = P(a.p[0], a.p[1], a.p[2]); dot(x, q[0], q[1], 19, a.c); });
    /* edge length */
    arrow(x, X0 + 30, Y0 + 32, X0, Y0 + 32, INK, 3, 12); arrow(x, X0 + A - 30, Y0 + 32, X0 + A, Y0 + 32, INK, 3, 12);
    x.fillStyle = INK; x.font = 'italic bold 34px ' + SANS; x.textAlign = 'center'; x.fillText('a', X0 + A / 2, Y0 + 44);
    /* legend */
    dot(x, 66, 604, 13, CU); x.fillStyle = INK; x.textAlign = 'left'; x.font = '27px ' + SANS; x.fillText('corner atom', 90, 613);
    if (L.atoms.length) { dot(x, 316, 604, 13, '#2f9a96'); x.fillStyle = INK; x.textAlign = 'left'; x.fillText(kind === 'fcc' ? 'face-centre atom' : 'body-centre atom', 340, 613); }
    line(x, 30, 644, LW - 30, 644, 'rgba(35,44,45,0.3)', 2);
    rows = [['Atoms per cell', L.count + '   (' + L.calc + ')'], ['Coordination number', L.cn], ['Packing fraction', L.apf]];
    rows.forEach(function (r, k) {
      var y = 690 + k * 50; x.textAlign = 'left'; x.fillStyle = '#4a5654'; x.font = '29px ' + SANS; x.fillText(r[0], 30, y);
      x.textAlign = 'right'; x.fillStyle = INK; fit(x, r[1], 330, 32); x.fillText(r[1], LW - 30, y);
    });
    x.textAlign = 'left'; x.fillStyle = CU_D; fit(x, L.ex, LW - 60, 28); x.fillText(L.ex, 30, 826);
  });
}

/* ---------- stress-strain poster ---------- */
function curveBez(p0, p1, p2, p3, n) {
  var out = [], i, t, u;
  for (i = 0; i <= n; i++) { t = i / n; u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return out;
}
function stressTex(T) {
  var LW = 940, LH = 800;
  return boardTex(T, 1024, 1024, LW, LH, function (x) {
    var OX = 140, OY = 700, SX = 740, SY = 500, SLOPE = 6, KNEE = [0.10, 0.60], i, hard, neck, yp, ep, d, d0, prev;
    function X(u) { return OX + u * SX; } function Y(v) { return OY - v * SY; }
    x.fillStyle = WARM; x.fillRect(0, 0, LW, LH);
    x.fillStyle = '#25605f'; x.fillRect(0, 0, LW, 86); x.fillStyle = CU; x.fillRect(0, 86, LW, 7);
    x.textBaseline = 'alphabetic'; x.textAlign = 'center'; x.fillStyle = '#f2ead8'; fit(x, 'Stress-strain curve of a ductile metal', 880, 46); x.fillText('Stress-strain curve of a ductile metal', LW / 2, 60);
    hard = curveBez(KNEE, [0.17, 0.78], [0.40, 1.0], [0.62, 1.0], 60); neck = curveBez([0.62, 1.0], [0.70, 1.0], [0.80, 0.93], [0.90, 0.78], 40);
    /* where the 0.2 % offset line (drawn exaggerated) meets the curve is the yield point */
    yp = hard[hard.length - 1]; prev = null;
    for (i = 0; i < hard.length; i++) {
      d = SLOPE * (hard[i][0] - 0.03) - hard[i][1];
      if (prev !== null && prev < 0 && d >= 0) { var k = -prev / (d - prev); yp = [hard[i - 1][0] + (hard[i][0] - hard[i - 1][0]) * k, hard[i - 1][1] + (hard[i][1] - hard[i - 1][1]) * k]; break; }
      prev = d;
    }
    /* shaded regions under the curve: elastic (teal), plastic (copper) */
    x.fillStyle = 'rgba(47,122,120,0.20)'; x.beginPath(); x.moveTo(X(0), Y(0)); x.lineTo(X(KNEE[0]), Y(KNEE[1])); x.lineTo(X(KNEE[0]), Y(0)); x.closePath(); x.fill();
    x.fillStyle = 'rgba(184,105,58,0.12)'; x.beginPath(); x.moveTo(X(KNEE[0]), Y(0)); x.lineTo(X(KNEE[0]), Y(KNEE[1]));
    hard.concat(neck).forEach(function (p) { x.lineTo(X(p[0]), Y(p[1])); }); x.lineTo(X(0.90), Y(0)); x.closePath(); x.fill();
    /* axes */
    arrow(x, OX, OY, OX, 130, INK, 5, 20); arrow(x, OX, OY, 905, OY, INK, 5, 20);
    x.fillStyle = INK; x.font = 'bold 34px ' + SANS; x.textAlign = 'left'; x.fillText('Stress σ', OX + 14, 138); x.textAlign = 'right'; x.fillText('Strain ε', 925, OY - 20);
    /* the curve */
    x.strokeStyle = CU; x.lineWidth = 8; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); x.moveTo(X(0), Y(0)); x.lineTo(X(KNEE[0]), Y(KNEE[1]));
    hard.concat(neck).forEach(function (p) { x.lineTo(X(p[0]), Y(p[1])); }); x.stroke();
    /* offset line */
    ep = Math.min(0.30, 0.03 + (yp[1] + 0.14) / SLOPE);
    line(x, X(0.03), OY, X(ep), Y(SLOPE * (ep - 0.03)), '#2f7a78', 3, [10, 8]);
    /* reference levels on the stress axis */
    line(x, OX, Y(yp[1]), X(yp[0]), Y(yp[1]), 'rgba(35,44,45,0.55)', 2.5, [6, 7]); line(x, OX, Y(1), X(0.62), Y(1), 'rgba(35,44,45,0.55)', 2.5, [6, 7]);
    x.textAlign = 'right'; x.fillStyle = INK; x.font = 'bold 32px ' + SANS; x.fillText('σy', OX - 12, Y(yp[1]) + 11);
    x.fillText('σ', OX - 40, Y(1) + 11); x.font = 'bold 20px ' + SANS; x.fillText('UTS', OX - 12, Y(1) + 20);
    /* marked points */
    x.fillStyle = INK; [[X(yp[0]), Y(yp[1])], [X(0.62), Y(1)]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 11, 0, 7); x.fill(); x.fillStyle = '#f0b88a'; x.beginPath(); x.arc(p[0], p[1], 6, 0, 7); x.fill(); x.fillStyle = INK; });
    line(x, X(0.90) - 14, Y(0.78) - 14, X(0.90) + 14, Y(0.78) + 14, '#a8362b', 7); line(x, X(0.90) - 14, Y(0.78) + 14, X(0.90) + 14, Y(0.78) - 14, '#a8362b', 7);
    /* labels */
    x.textAlign = 'left'; x.fillStyle = INK; x.font = 'bold 34px ' + SANS;
    x.fillText('Yield point', 300, 438); x.font = '27px ' + SANS; x.fillStyle = '#3d4a49'; x.fillText('plastic flow begins (0.2 % offset)', 300, 474);
    line(x, X(yp[0]) + 10, Y(yp[1]) + 12, 296, 424, INK, 2.5);
    x.font = 'bold 34px ' + SANS; x.fillStyle = INK; x.textAlign = 'center'; x.fillText('Ultimate tensile strength', X(0.62) - 40, 172); line(x, X(0.62), 182, X(0.62), Y(1) - 14, INK, 2.5);
    x.textAlign = 'left'; x.font = 'bold 32px ' + SANS; x.fillText('Elastic region', 250, 596); x.font = '27px ' + SANS; x.fillStyle = '#3d4a49'; x.fillText('stress ∝ strain, slope = E', 250, 632);
    line(x, 246, 588, X(0.04) + 8, Y(0.3) , INK, 2.5);
    x.fillStyle = CU_D; x.font = 'bold 30px ' + SANS; x.fillText('Strain hardening', 345, 356); x.fillText('Necking', X(0.66), 268);
    x.fillStyle = '#a8362b'; x.fillText('Fracture', X(0.90) - 70, Y(0.78) + 54);
    /* brackets under the axis */
    x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(X(0), 724); x.lineTo(X(0), 734); x.lineTo(X(KNEE[0]), 734); x.lineTo(X(KNEE[0]), 724); x.stroke();
    x.beginPath(); x.moveTo(X(KNEE[0]) + 8, 724); x.lineTo(X(KNEE[0]) + 8, 734); x.lineTo(X(0.90), 734); x.lineTo(X(0.90), 724); x.stroke();
    x.fillStyle = '#25605f'; x.font = 'bold 28px ' + SANS; x.textAlign = 'center'; x.fillText('elastic', (X(0) + X(KNEE[0])) / 2 - 8, 768);
    x.fillStyle = CU_D; x.fillText('plastic (permanent) deformation', (X(KNEE[0]) + X(0.90)) / 2 + 40, 768);
    x.fillStyle = '#4a5654'; x.textAlign = 'left'; x.font = '22px ' + SANS; x.fillText('Schematic, not to scale: real curves differ by material, temperature and strain rate.', 40, 792);
  });
}

/* ---------- small textures ---------- */
function wallTex(T) {
  return tex(T, 128, 256, function (x, w, h) {
    var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#254a4c'); gr.addColorStop(0.5, '#2d5759'); gr.addColorStop(1, '#2a5254');
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, 0, 3, h); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(3, 0, 2, h);
  });
}
function benchTex(T, rep) {
  /* very faint honeycomb on the charcoal top: calm, and it echoes the floor */
  return tex(T, 512, 512, function (x, w, h) {
    var r = K.mulberry(21), i, j, k, R = 0.5 / S3, a, cx, cy;
    x.fillStyle = '#41484a'; x.fillRect(0, 0, w, h);
    for (i = 0; i < 12; i++) { var px = r() * w, py = r() * h, g = x.createRadialGradient(px, py, 0, px, py, 90 + r() * 80); g.addColorStop(0, 'rgba(' + (r() < 0.5 ? '70,80,82,0.12' : '20,26,28,0.12') + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    x.setTransform(w / 2, 0, 0, h / (2 * S3), 0, 0); x.strokeStyle = 'rgba(0,0,0,0.035)'; x.lineWidth = 0.01;
    for (j = -1; j <= 4; j++) for (i = -1; i <= 2; i++) {
      cx = i + ((j & 1) ? 0.5 : 0); cy = j * 0.8660254; x.beginPath();
      for (k = 0; k < 6; k++) { a = (30 + 60 * k) * Math.PI / 180; x[k ? 'lineTo' : 'moveTo'](cx + R * 2 * Math.cos(a) * 1, cy + R * 2 * Math.sin(a) * 1); }
      x.closePath(); x.stroke();
    }
  }, rep);
}
function cabinetTex(T) {
  return tex(T, 2048, 256, function (x, w, h) {
    var n = 16, bw = w / n, i, kick = 22, gr;
    x.fillStyle = '#161c1d'; x.fillRect(0, 0, w, h);
    for (i = 0; i < n; i++) {
      var ox = i * bw, tone = i % 2 ? '#2d6968' : '#2a6261';
      x.fillStyle = '#343b3d'; x.fillRect(ox + 4, 5, bw - 8, h * 0.27 - 8);
      x.fillStyle = tone; x.fillRect(ox + 4, h * 0.27 + 4, bw - 8, h - kick - h * 0.27 - 8);
      x.fillStyle = '#c47a45'; x.fillRect(ox + bw / 2 - 22, h * 0.27 - 26, 44, 8); x.fillRect(ox + bw - 24, h * 0.27 + 22, 8, 54);
      x.fillStyle = 'rgba(0,0,0,0.14)'; x.fillRect(ox + 4, h - kick - 10, bw - 8, 6);
    }
    gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
}
function dialTex(T) {
  return tex(T, 256, 256, function (x) {
    var i, a, r0, c = 128;
    x.fillStyle = '#e4dcc8'; x.beginPath(); x.arc(c, c, 124, 0, 7); x.fill(); x.strokeStyle = INK; x.lineWidth = 6; x.beginPath(); x.arc(c, c, 120, 0, 7); x.stroke();
    x.fillStyle = INK; x.strokeStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (i = 0; i <= 50; i++) {
      a = (135 + i / 50 * 270) * Math.PI / 180; r0 = i % 10 === 0 ? 86 : i % 5 === 0 ? 96 : 104; x.lineWidth = i % 10 === 0 ? 5 : 2.5;
      x.beginPath(); x.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); x.lineTo(c + Math.cos(a) * 114, c + Math.sin(a) * 114); x.stroke();
      if (i % 10 === 0) { x.font = 'bold 26px ' + SANS; x.fillText(String(i * 2), c + Math.cos(a) * 66, c + Math.sin(a) * 66); }
    }
    x.font = 'bold 30px ' + SANS; x.fillText('HRC', c, 176); x.font = '18px ' + SANS; x.fillText('Rockwell', c, 204);
    a = (135 + 0.62 * 270) * Math.PI / 180; line(x, c, c, c + Math.cos(a) * 92, c + Math.sin(a) * 92, '#a8362b', 6); x.fillStyle = INK; x.beginPath(); x.arc(c, c, 11, 0, 7); x.fill();
  });
}
function furnaceTex(T) {
  return tex(T, 128, 64, function (x, w, h) {
    x.fillStyle = '#0b0807'; x.fillRect(0, 0, w, h); x.fillStyle = '#e07a2e'; x.font = 'bold 44px ' + SANS; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('850', w * 0.42, h * 0.54);
    x.font = 'bold 16px ' + SANS; x.fillStyle = '#c86a28'; x.fillText('SP', w * 0.88, h * 0.3); x.fillText('°C', w * 0.88, h * 0.72);
  });
}
/* the tester's screen: a force-extension trace that grows slowly, then holds, then restarts */
function screenCurve(x, w, h, p) {
  var i, n = 80, ux, uy, k, pts = [];
  x.fillStyle = '#06100f'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(95,200,190,0.18)'; x.lineWidth = 1; for (i = 1; i < 6; i++) { x.beginPath(); x.moveTo(i * w / 6, 6); x.lineTo(i * w / 6, h - 14); x.stroke(); } for (i = 1; i < 4; i++) { x.beginPath(); x.moveTo(24, i * h / 4); x.lineTo(w - 6, i * h / 4); x.stroke(); }
  x.strokeStyle = '#8fd8cf'; x.lineWidth = 2; x.beginPath(); x.moveTo(24, 6); x.lineTo(24, h - 14); x.lineTo(w - 6, h - 14); x.stroke();
  for (i = 0; i <= n; i++) {
    k = i / n; ux = k * 0.9; uy = k < 0.11 ? k * 5.4 : (k < 0.62 ? Math.min(1, 0.6 + 0.4 * (1 - Math.exp(-(k - 0.11) * 7)) / (1 - Math.exp(-0.51 * 7))) : 1 - (k - 0.62) * 0.8);
    pts.push([24 + ux * (w - 40), h - 14 - uy * (h - 34)]);
  }
  x.strokeStyle = '#f0a066'; x.lineWidth = 3; x.lineJoin = 'round'; x.beginPath();
  for (i = 0; i <= Math.floor(p * n); i++) { if (i) x.lineTo(pts[i][0], pts[i][1]); else x.moveTo(pts[i][0], pts[i][1]); } x.stroke();
  i = Math.min(n, Math.floor(p * n)); x.fillStyle = '#ffe2c4'; x.beginPath(); x.arc(pts[i][0], pts[i][1], 3.5, 0, 7); x.fill();
}

/* ---------- geometry helpers ---------- */
function shapeGeo(T, pts, depth) {
  var s = new T.Shape(), i;
  s.moveTo(pts[0][0], pts[0][1]);
  for (i = 1; i < pts.length; i++) { if (pts[i].length === 4) s.quadraticCurveTo(pts[i][2], pts[i][3], pts[i][0], pts[i][1]); else s.lineTo(pts[i][0], pts[i][1]); }
  s.closePath();
  var g = new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return g;
}
/* a tapered, ingot-shaped bar: a box whose top is narrower than its base */
function ingotGeo(T, L, H, D) {
  var g = new T.BoxGeometry(L, H, D), p = g.attributes.position, i;
  for (i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * 0.88, p.getY(i), p.getZ(i) * 0.8);
  g.computeVertexNormals(); return g;
}

/* ---------- the room ---------- */
ENV.materialslab = function (T) {
  var g = new T.Group(), i, j;
  var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var solid = Batch(T, true), trans = Batch(T, true), glass = Batch(T, true), tags = Batch(T, false), plates = Batch(T, false), shad = Batch(T, false);
  var edgePos = [], v3 = new T.Vector3();
  var shTex = K.canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  var shGeo = new T.PlaneGeometry(1, 1);
  function shadow(x, z, w, d, y) { shad.add(shGeo, null, x, y == null ? 0.012 : y, z, -Math.PI / 2, 0, 0, w, d, 1); }
  function mat4(x, y, z, rx, ry, rz, sx, sy, sz) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new T.Vector3(sx || 1, sy || 1, sz || 1)); }

  /* light: the same budget as the other rooms */
  g.add(new T.HemisphereLight(0xfff1de, 0x4a4038, 0.5));
  var key = new T.DirectionalLight(0xfff0dc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xe8e8f0, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe2bf, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---- shell: teal wall, hexagonal floor ---- */
  var WW = 170, BW = 94, bz0 = WALL_Z, bz1 = 9.6, BZC = (bz0 + bz1) / 2;
  var wt = wallTex(T); wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(WW / 9, 1);
  pl(T, g, WW, 40, wt, 0, 7, WALL_Z, 0);
  var ftex = hexRepeat(hexTex(T, ['#3a4042', '#3f4648', '#363c3e', '#43494b'], '#1b2022', 11, [TEAL_D, '#5a4030']), T, 170, 90, 5);
  pl(T, g, 170, 90, ftex, 0, FLOOR, 12, -Math.PI / 2, true);

  /* ---- bench: charcoal top with a copper edge, teal cabinets below ---- */
  var btex = benchTex(T, [BW / 24, (bz1 - bz0) / (24 * S3)]);
  pl(T, g, BW, bz1 - bz0, btex, 0, TOPY, BZC, -Math.PI / 2, true);
  solid.box(BW, 0.76, bz1 - bz0, 0, -0.5, BZC, CU_D);
  pl(T, g, BW, 12.16, cabinetTex(T), 0, -6.92, 9.0, 0);
  [-1, 1].forEach(function (s) { solid.box(0.5, 12.2, 28.6, s * (BW / 2 - 0.25), -6.9, BZC, '#1f4a49'); });
  /* splashback of small teal hexagonal tiles, with a copper rail along its top edge */
  var stex = hexRepeat(hexTex(T, ['#2f7472', '#2b6c6a', '#337a77', '#286664'], '#183a3a', 5, ['#3a8c88']), T, BW, 3.2, 2.2);
  pl(T, g, BW, 3.2, stex, 0, 1.6, WALL_Z + 0.35, 0, false, true);
  solid.box(BW, 0.3, 0.5, 0, 3.35, WALL_Z + 0.4, CU);

  /* ---- crystal display wall: three columns by two rows of glass-front cases ---- */
  var CX0 = -30.4, CW = 8.0, CH = 4.7, BAR = 0.3, CY0 = 4.2, ZB = WALL_Z + 0.25, ZF = ZB + 3.6, ZG = ZF - 0.2, CD = ZF - ZB;
  var CABW = 3 * CW + 4 * BAR, CABH = 2 * CH + 3 * BAR, cabL = CX0 - CABW / 2;
  solid.box(CABW, CABH, 0.2, CX0, CY0 + CABH / 2, ZB - 0.05, TEAL_D);
  for (i = 0; i < 4; i++) solid.box(BAR, CABH, CD, cabL + BAR / 2 + i * (CW + BAR), CY0 + CABH / 2, ZB + CD / 2, CHAR);
  for (j = 0; j < 3; j++) solid.box(CABW, BAR, CD, CX0, CY0 + BAR / 2 + j * (CH + BAR), ZB + CD / 2, CHAR);
  solid.box(CABW + 0.5, 0.36, CD + 0.3, CX0, CY0 + CABH + 0.18, ZB + CD / 2 + 0.1, CU);
  var opq = Batch(T, true);
  var CASEY = [CY0 + BAR, CY0 + 2 * BAR + CH];
  var FELT = ['#33595a', '#3a5f5a', '#33595a', '#3a5f5a', '#33595a', '#3a5f5a'], ROCK = '#6a6358', SPZ = ZB + 1.5;
  function caseX(c) { return cabL + BAR + CW / 2 + c * (CW + BAR); }
  function edgesOf(geo, m) {
    var eg = new T.EdgesGeometry(geo, 25), p = eg.attributes.position, k;
    for (k = 0; k < p.count; k++) { v3.set(p.getX(k), p.getY(k), p.getZ(k)).applyMatrix4(m); edgePos.push(v3.x, v3.y, v3.z); }
  }
  /* a crystal: translucent ones go in the see-through batch; every crystal gets crisp edge lines so its facets read */
  var SPS = { m: new T.Matrix4() };
  /* each specimen is scaled about its own footing, so it stays resting on the shelf */
  function setScale(x, y0, z, s) { SPS.m.makeTranslation(x, y0, z).multiply(new T.Matrix4().makeScale(s, s, s)).multiply(new T.Matrix4().makeTranslation(-x, -y0, -z)); }
  function crystal(geo, color, m, translucent) { m = SPS.m.clone().multiply(m); (translucent ? trans : opq).addM(geo, color, m); edgesOf(geo, m); }
  function quat(rx, ry, rz) { return new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')); }
  function yawQ(q, a) { return q.clone().premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), a)); }
  /* rests a rotated crystal on the shelf: lifts it so its lowest point touches y0 */
  function rest(geo, q, x, y0, z, color, translucent) {
    var p = geo.attributes.position, lo = 1e9, k;
    for (k = 0; k < p.count; k++) { v3.set(p.getX(k), p.getY(k), p.getZ(k)).applyQuaternion(q); if (v3.y < lo) lo = v3.y; }
    crystal(geo, color, new T.Matrix4().compose(new T.Vector3(x, y0 - lo, z), q, new T.Vector3(1, 1, 1)), translucent);
  }
  function lump(x, y0, z, sx, sy, sz, ry, color) { solid.addM(new T.IcosahedronGeometry(1, 1), color, SPS.m.clone().multiply(mat4(x, y0 + sy * 0.8, z, 0, ry, 0, sx, sy, sz))); }
  /* calcite: a cube squeezed along its body diagonal until the faces meet at ~102 degrees, then laid on a face */
  function calcite(size, x, y0, z, yaw, color) {
    var geo = new T.BoxGeometry(size, size, size), p = geo.attributes.position, d = new T.Vector3(1, 1, 1).normalize(), k = -0.3045, n, q, A = new T.Vector3(-1, -1, -1), B = new T.Vector3(1, -1, -1), C = new T.Vector3(-1, -1, 1), j2;
    for (j2 = 0; j2 < p.count; j2++) { v3.set(p.getX(j2), p.getY(j2), p.getZ(j2)); var dd = v3.dot(d); p.setXYZ(j2, v3.x + k * dd * d.x, v3.y + k * dd * d.y, v3.z + k * dd * d.z); }
    geo.computeVertexNormals();
    [A, B, C].forEach(function (pt) { pt.addScaledVector(d, k * pt.dot(d)); });
    n = B.clone().sub(A).cross(C.clone().sub(A)).normalize(); if (n.y > 0) n.negate();
    q = yawQ(new T.Quaternion().setFromUnitVectors(n, new T.Vector3(0, -1, 0)), yaw);
    rest(geo, q, x, y0, z, color, true);
  }
  function specimen(c, x, y0, z) {
    setScale(x, y0, z, [0.88, 1.25, 1.1, 1.1, 1.1, 1.15][c]);
    var oct = new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 1, 1).normalize(), new T.Vector3(0, -1, 0));
    if (c === 0) {            /* quartz: hexagonal prisms with pyramid tips, on a matrix */
      lump(x, y0, z, 1.7, 0.45, 1.0, 0.3, ROCK);
      [[-0.7, 0.2, 2.4, 0.38, 0.22, 0.1, 0.1], [0.0, -0.2, 2.9, 0.46, -0.05, 0.1, 0.5], [0.8, 0.1, 2.0, 0.36, -0.2, 0.14, 0.9], [-1.3, -0.2, 1.4, 0.3, 0.3, 0.25, 0.3],
        [1.4, -0.2, 1.5, 0.32, -0.18, -0.3, 0.2], [0.3, 0.4, 1.5, 0.34, 0.5, -0.12, 0.7], [-0.4, -0.5, 1.9, 0.34, -0.5, 0.05, 0.4]].forEach(function (it) {
        var r = it[3], L = it[2], tip = r * 1.35, m0 = new T.Matrix4().compose(new T.Vector3(x + it[0], y0 + 0.55, z + it[1]), quat(it[4] * 0.5, it[6], it[5] * 0.6), new T.Vector3(1, 1, 1));
        crystal(new T.CylinderGeometry(r, r, L, 6, 1), '#d3d6d0', m0.clone().multiply(new T.Matrix4().makeTranslation(0, L / 2, 0)), true);
        crystal(new T.CylinderGeometry(r * 0.14, r, tip, 6, 1), '#dfe2dc', m0.clone().multiply(new T.Matrix4().makeTranslation(0, L + tip / 2, 0)), true);
      });
    } else if (c === 1) {     /* pyrite: intergrown cubes on a matrix */
      lump(x, y0, z, 2.0, 0.32, 0.8, 0.2, ROCK);
      [[-0.9, 0.0, 0.0, 1.15, 0.25, '#9c8434'], [0.55, 0.0, -0.1, 0.95, -0.35, '#a68c38'], [-0.15, 1.15, -0.05, 0.75, 0.7, '#9c8434'], [0.1, 0.0, 0.6, 0.62, 0.5, '#af9440'],
        [-1.55, 0.0, -0.5, 0.6, -0.2, '#92792f'], [1.5, 0.0, 0.45, 0.55, 0.9, '#a58b3a'], [1.35, 0.0, -0.6, 0.5, 0.3, '#a68c38']].forEach(function (cb) {
        var s = cb[3];
        crystal(new T.BoxGeometry(s, s, s), cb[5], mat4(x + cb[0], y0 + 0.2 + s / 2 + cb[1], z + cb[2], 0.05, cb[4], -0.04), false);
      });
    } else if (c === 2) {     /* fluorite: octahedra resting on a face */
      rest(new T.OctahedronGeometry(1.1), yawQ(oct, 0.5), x - 0.5, y0, z, '#7c63a8', true);
      rest(new T.OctahedronGeometry(0.75), yawQ(oct, 1.4), x + 1.7, y0, z + 0.25, '#68a596', true);
      rest(new T.OctahedronGeometry(0.5), yawQ(oct, 0.2), x + 1.2, y0, z - 0.8, '#8a70b2', true);
    } else if (c === 3) {     /* halite: cubes */
      rest(new T.BoxGeometry(1.6, 1.6, 1.6), quat(0, 0.45, 0), x - 0.5, y0, z - 0.05, '#d4dce2', true);
      rest(new T.BoxGeometry(1.1, 1.1, 1.1), quat(0, -0.3, 0), x + 1.7, y0, z + 0.2, '#e0c8c4', true);
      rest(new T.BoxGeometry(0.75, 0.75, 0.75), quat(0, 0.9, 0), x + 1.15, y0, z - 0.9, '#d4dce2', true);
    } else if (c === 4) {     /* calcite: rhombohedra */
      calcite(1.55, x - 0.6, y0, z - 0.1, 0.3, '#dcae52'); calcite(0.9, x + 1.6, y0, z + 0.2, 1.2, '#e6c070');
    } else {                  /* beryl: flat-ended hexagonal prisms on a matrix */
      lump(x, y0, z, 1.6, 0.38, 0.95, 0.1, ROCK);
      [[-0.5, 0.1, 2.2, 0.42, 0.06, '#74b6c2'], [0.5, -0.2, 1.6, 0.36, -0.12, '#82c0c8'], [1.3, 0.2, 1.1, 0.3, 0.2, '#74b6c2'], [-1.3, -0.2, 1.2, 0.3, -0.25, '#6aaab8']].forEach(function (pr) {
        crystal(new T.CylinderGeometry(pr[3], pr[3], pr[2], 6, 1), pr[5], new T.Matrix4().compose(new T.Vector3(x + pr[0], y0 + 0.5 + pr[2] / 2, z + pr[1]), quat(0, pr[0], pr[4]), new T.Vector3(1, 1, 1)), true);
      });
    }
  }
  var casePl = new T.PlaneGeometry(7.0, 0.95), CT = -0.6, PLH = 0.7;
  for (j = 0; j < 2; j++) for (i = 0; i < 3; i++) {
    var ci = j * 3 + i, cxx = caseX(i), cy0 = CASEY[j];
    solid.box(CW, CH, 0.12, cxx, cy0 + CH / 2, ZB + 0.12, FELT[ci]);
    solid.box(7.4, PLH, 2.35, cxx, cy0 + PLH / 2, ZB + 1.375, '#26393a');
    specimen(ci, cxx, cy0 + PLH, SPZ);
    glass.add(new T.PlaneGeometry(CW, CH), '#cfe6e2', cxx, cy0 + CH / 2, ZG);
    /* a name card leaning inside the glass: charcoal board with a printed face set just in front of it */
    var py = cy0 + 0.06 + 0.475 * Math.cos(CT), pz = ZG - 0.25 + 0.475 * Math.sin(CT), nz = Math.cos(CT), ny = -Math.sin(CT);
    solid.box(7.0, 0.95, 0.1, cxx, py, pz, CHAR, 0, CT, 0);
    plates.addM(uvRect(casePl.clone(), (ci % 2) * 0.5, 1 - (Math.floor(ci / 2) + 1) * CELL_H / 1024, (ci % 2) * 0.5 + 0.5, 1 - Math.floor(ci / 2) * CELL_H / 1024), null,
      mat4(cxx, py + ny * 0.075, pz + nz * 0.075, CT, 0, 0));
  }

  /* ---- metal stacks on the left of the bench, one bay per metal, each with a tag ---- */
  var STK = [-39, -33.5, -28, -22.5], SZ = -15.5, tagPl = new T.PlaneGeometry(3.6, 1.8), TT = -0.5;
  var ING = ingotGeo(T, 3.0, 0.9, 1.15), CUC = ['#955530', '#a05f38', '#874a29', '#a96a40'], ROWS = [[[-1.1, 0, 1.1], 0], [[-0.55, 0.55], 0.95], [[0], 1.9]];
  STK.forEach(function (sx, n) {
    solid.box(5.0, 0.3, 4.6, sx, 0.15, SZ, '#262c2e');
    if (n === 0) {                      /* copper ingots, laid crosswise in three layers */
      for (j = 0; j < 3; j++) for (i = -1; i <= 1; i++) solid.add(ING, CUC[(i + 1 + j) % 4], j % 2 ? sx + i * 1.2 : sx, 0.75 + j * 0.9, j % 2 ? SZ : SZ + i * 1.2, 0, j % 2 ? Math.PI / 2 : 0, 0);
    } else if (n === 1) {               /* round steel bar in a pyramid bundle */
      ROWS.forEach(function (rw) { rw[0].forEach(function (zz, k) { solid.cyl(0.55, 0.55, 4.2, sx, 0.3 + 0.55 + rw[1], SZ + zz, (k + rw[1] * 2) % 2 ? '#6f797d' : '#7b8589', 20, 0, 0, Math.PI / 2); }); });
    } else if (n === 2) {               /* square aluminium bar */
      ROWS.forEach(function (rw) { rw[0].forEach(function (zz, k) { solid.box(4.2, 0.95, 0.95, sx, 0.3 + 0.475 + rw[1], SZ + zz * 0.86, (k + rw[1] * 2) % 2 ? '#767e82' : '#80888c'); }); });
    } else {                            /* hexagon brass bar */
      ROWS.forEach(function (rw) { rw[0].forEach(function (zz, k) { solid.cyl(0.5, 0.5, 4.2, sx, 0.3 + 0.5 + rw[1] * 0.92, SZ + zz * 0.95, (k + rw[1] * 2) % 2 ? '#927a31' : '#9e863a', 6, 0, 0, Math.PI / 2); }); });
    }
    var ty = 0.03 + 0.9 * Math.cos(TT), tz = -12.4 + 0.9 * Math.sin(TT);
    solid.box(3.6, 1.8, 0.12, sx, ty, tz, CHAR, 0, TT, 0);
    tags.addM(uvRect(tagPl.clone(), n * 0.25, 0.5, n * 0.25 + 0.25, 1), null, mat4(sx, ty - Math.sin(TT) * 0.085, tz + Math.cos(TT) * 0.085, TT, 0, 0));
    shadow(sx, SZ, 6.0, 5.6);
  });

  /* ---- bench props behind the clear zone ---- */
  var mic = K.makeMicroscope(T); mic.position.set(-14.5, 0, -13.2); mic.rotation.y = -0.25; mic.scale.setScalar(1.15); g.add(mic); shadow(-14.5, -13.2, 4.4, 4.8);
  /* sample coupons standing in a rack */
  var RKX = -4, RKZ = -12.2, CPC = ['#97562f', '#7f898d', '#a88a3a', '#939b9f', '#a96a40', '#6f797d'];
  solid.box(6.4, 0.4, 1.7, RKX, 0.2, RKZ, CHAR_L); solid.box(6.4, 0.5, 0.12, RKX, 0.65, RKZ - 0.72, CHAR_L); solid.box(6.4, 0.5, 0.12, RKX, 0.65, RKZ + 0.72, CHAR_L);
  for (i = 0; i < 12; i++) solid.box(0.1, 1.2, 1.2, RKX - 2.75 + i * 0.5, 1.0, RKZ, CPC[i % 6], 0, 0, (i % 3 - 1) * 0.04);
  shadow(RKX, RKZ, 8.0, 3.2);
  /* metallographic mounts (small resin pucks with a polished metal face) on a tray */
  var MX = 2.8, MZ = -11.6, FC = ['#b9835a', '#9aa4a8', '#b99c48', '#a9b1b3', '#8c5032'];
  solid.box(5.2, 0.25, 1.9, MX, 0.125, MZ, TEAL_D);
  for (i = 0; i < 5; i++) { solid.cyl(0.34, 0.34, 0.42, MX - 1.8 + i * 0.9, 0.46, MZ, '#1c2022', 20); solid.cyl(0.27, 0.27, 0.05, MX - 1.8 + i * 0.9, 0.7, MZ, FC[i], 20); }
  shadow(MX, MZ, 6.4, 3.2);
  /* a vernier caliper lying on the bench */
  var CLX = -9.2, CLZ = -10.7;
  solid.box(4.6, 0.14, 0.55, CLX, 0.07, CLZ, '#8a9498', 0.1); solid.box(0.16, 0.14, 1.5, CLX - 2.25, 0.07, CLZ + 0.14, '#8a9498', 0.1);
  solid.box(0.9, 0.24, 0.7, CLX - 0.6, 0.12, CLZ + 0.06, '#2f7371', 0.1); solid.box(0.16, 0.14, 1.5, CLX - 1.05, 0.07, CLZ + 0.2, '#8a9498', 0.1);
  /* notebook and pencil */
  var NX = 8.6, NZ = -11.4;
  solid.box(2.7, 0.08, 3.5, NX, 0.04, NZ, '#2b3335', 0.3); solid.box(2.5, 0.2, 3.3, NX + 0.02, 0.18, NZ, '#d6cdb2', 0.3); solid.box(2.7, 0.08, 3.5, NX, 0.32, NZ, '#2b3335', 0.3);
  solid.cyl(0.07, 0.07, 2.6, NX + 0.1, 0.43, NZ + 0.1, '#e0a63c', 6, 0, 0.5, Math.PI / 2);
  shadow(NX, NZ, 4.4, 5.0);
  /* a copper pot of pens */
  var PX = 13.2, PZ = -12.4;
  solid.add(K.lathe(T, [[0, 0], [0.62, 0], [0.66, 0.08], [0.7, 1.4], [0.62, 1.42], [0.58, 1.3], [0.56, 0.12], [0, 0.12]], 24), CU, PX, 0, PZ);
  [['#2f7371', 0.18, 0.1], ['#d6cdb2', -0.2, 0.3], ['#e0a63c', 0.05, -0.28], ['#232c2d', -0.1, 0.5]].forEach(function (pn) { solid.cyl(0.07, 0.07, 2.4, PX + pn[2] * 0.4, 1.3, PZ + pn[1] * 0.4, pn[0], 8, pn[1] * 0.5, 0, -pn[2] * 0.5); });
  shadow(PX, PZ, 2.8, 2.8);

  /* ---- box furnace with a small dim window ---- */
  var FX = 22.5, FZ = -14.0, FZ0 = FZ + 3.0, glowDisc;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { solid.box(0.6, 0.4, 0.6, FX + c[0] * 2.7, 0.2, FZ + c[1] * 2.5, CHAR); });
  solid.box(6.4, 5.4, 6.0, FX, 3.1, FZ, '#2f706e'); solid.box(6.6, 0.22, 6.2, FX, 5.91, FZ, CHAR);
  solid.box(4.6, 3.3, 0.32, FX - 0.3, 2.45, FZ0 + 0.16, '#252a2c');
  solid.box(0.16, 2.0, 0.16, FX + 1.55, 2.45, FZ0 + 0.7, CU); [1.55, 3.35].forEach(function (yy) { solid.box(0.16, 0.16, 0.4, FX + 1.55, yy, FZ0 + 0.52, CU); });
  [1.2, 3.7].forEach(function (yy) { solid.cyl(0.16, 0.16, 0.5, FX - 2.75, yy, FZ0 + 0.16, CU, 12); });
  solid.add(new T.TorusGeometry(0.56, 0.1, 8, 28), '#14181a', FX - 0.3, 3.1, FZ0 + 0.36, 0, 0, 0);
  solid.box(6.0, 1.1, 0.22, FX, 5.0, FZ0 + 0.11, '#1e2427');
  solid.cyl(0.24, 0.24, 0.2, FX + 0.6, 5.0, FZ0 + 0.32, CU_L, 16, Math.PI / 2, 0, 0); solid.cyl(0.24, 0.24, 0.2, FX + 1.5, 5.0, FZ0 + 0.32, CU_L, 16, Math.PI / 2, 0, 0);
  solid.cyl(0.5, 0.5, 0.9, FX + 1.6, 6.5, FZ - 1.2, CHAR, 18); solid.cyl(0.62, 0.62, 0.14, FX + 1.6, 7.02, FZ - 1.2, CHAR_L, 18);
  shadow(FX, FZ, 8.6, 8.2);
  glowDisc = new T.Mesh(new T.CircleGeometry(0.5, 24), offset(new T.MeshBasicMaterial({ color: new T.Color('#c0602a').multiplyScalar(0.75) }))); glowDisc.position.set(FX - 0.3, 3.1, FZ0 + 0.33); g.add(glowDisc);
  var fdisp = new T.Mesh(new T.PlaneGeometry(2.0, 0.8), offset(new T.MeshBasicMaterial({ map: furnaceTex(T) }))); fdisp.position.set(FX - 1.5, 5.0, FZ0 + 0.24); g.add(fdisp);
  var furnaceLed = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.08, 10), new T.MeshBasicMaterial({ color: new T.Color('#e0a03c').multiplyScalar(1.3) })); furnaceLed.rotation.x = Math.PI / 2; furnaceLed.position.set(FX + 2.35, 5.0, FZ0 + 0.27); g.add(furnaceLed);
  /* hazard sign on the wall above it */
  solid.box(4.9, 2.6, 0.2, FX, 9.0, WALL_Z + 0.35, CHAR);
  tags.addM(uvRect(new T.PlaneGeometry(4.6, 2.3), 0, 0, 0.25, 0.5), null, mat4(FX, 9.0, WALL_Z + 0.5, 0, 0, 0));

  /* crucibles and tongs beside the furnace */
  [[16.0, -11.2, 1.0], [17.5, -11.6, 0.9]].forEach(function (cr) { solid.add(K.lathe(T, [[0, 0], [0.34, 0], [0.4, 0.05], [0.58, 1.0], [0.52, 1.02], [0.3, 0.14], [0, 0.14]], 18).scale(cr[2], cr[2], cr[2]), '#a69e8a', cr[0], 0, cr[1]); });
  solid.box(0.16, 0.12, 4.4, 15.0, 0.06, -9.9, '#6f797d', Math.PI / 2 + 0.08); solid.box(0.16, 0.12, 4.4, 15.0, 0.18, -9.9, '#6f797d', Math.PI / 2 + 0.22);
  shadow(16.8, -11.4, 4.2, 2.4);

  /* ---- tensile tester: bench-top frame, two columns, crosshead, grips holding a dog-bone specimen ---- */
  var TX = 32.5, TZ = -13.2;
  solid.box(11.4, 0.5, 7.4, TX, 0.25, TZ, CHAR); solid.box(11.0, 2.5, 7.0, TX, 1.75, TZ, '#2c6d6b');
  [-1, 1].forEach(function (s) { solid.cyl(0.5, 0.5, 11.8, TX + s * 3.9, 8.9, TZ - 1.6, STEEL, 20); solid.cyl(0.6, 0.6, 0.3, TX + s * 3.9, 3.15, TZ - 1.6, CHAR, 20); });
  solid.box(9.8, 1.5, 4.8, TX, 12.25, TZ - 1.2, CHAR); solid.box(9.9, 0.22, 0.06, TX, 12.25, TZ + 1.23, CU);
  solid.box(10.8, 1.5, 5.4, TX, 15.55, TZ - 1.4, '#2c6d6b');
  solid.cyl(0.75, 0.75, 1.2, TX, 10.9, TZ, CHAR_L, 22); solid.cyl(0.8, 0.8, 0.18, TX, 10.9, TZ, CU, 22);
  solid.box(2.0, 1.6, 1.5, TX, 9.5, TZ, '#4a5154'); solid.box(1.5, 0.8, 0.1, TX, 9.5, TZ + 0.8, STEEL); solid.cyl(0.3, 0.3, 0.5, TX + 1.2, 9.5, TZ, CU_L, 14, 0, 0, Math.PI / 2);
  solid.cyl(0.8, 0.8, 0.9, TX, 3.45, TZ, '#4a5154', 20); solid.box(2.0, 1.6, 1.5, TX, 4.7, TZ, '#4a5154'); solid.box(1.5, 0.8, 0.1, TX, 4.7, TZ + 0.8, STEEL); solid.cyl(0.3, 0.3, 0.5, TX + 1.2, 4.7, TZ, CU_L, 14, 0, 0, Math.PI / 2);
  var DOG = [[-0.5, -2.5], [0.5, -2.5], [0.5, -1.6], [0.25, -1.1, 0.5, -1.25], [0.25, 1.1], [0.5, 1.6, 0.5, 1.25], [0.5, 2.5], [-0.5, 2.5], [-0.5, 1.6], [-0.25, 1.1, -0.5, 1.25], [-0.25, -1.1], [-0.5, -1.6, -0.5, -1.25]];
  solid.add(shapeGeo(T, DOG, 0.2), '#c9733f', TX, 7.1, TZ);
  /* control panel on the front of the base */
  solid.box(8.2, 2.0, 0.25, TX - 1.1, 1.8, TZ + 3.62, '#1c2326');
  solid.cyl(0.18, 0.18, 0.2, TX - 0.2, 2.3, TZ + 3.85, '#5fb3ae', 14, Math.PI / 2, 0, 0); solid.cyl(0.18, 0.18, 0.2, TX - 0.2, 1.3, TZ + 3.85, '#e0a03c', 14, Math.PI / 2, 0, 0);
  solid.cyl(0.3, 0.3, 0.25, TX + 0.9, 1.8, TZ + 3.88, CU, 20, Math.PI / 2, 0, 0);
  solid.cyl(0.55, 0.55, 0.1, TX + 2.0, 1.8, TZ + 3.78, '#d9ad3a', 22, Math.PI / 2, 0, 0); solid.cyl(0.4, 0.4, 0.3, TX + 2.0, 1.8, TZ + 3.9, '#b8362c', 20, Math.PI / 2, 0, 0);
  shadow(TX, TZ, 14.0, 10.0);
  /* the pieces of a specimen that was pulled to failure, lying on the bench */
  var HALF = [[-0.5, 0], [0.5, 0], [0.5, 0.9], [0.25, 1.4, 0.5, 1.2], [0.25, 1.9], [0.1, 2.25], [-0.05, 2.0], [-0.25, 2.15], [-0.25, 1.4], [-0.5, 0.9, -0.5, 1.2]];
  var halfGeo = shapeGeo(T, HALF, 0.2);
  solid.add(halfGeo, '#c9733f', 39.4, 0.12, -11.9, Math.PI / 2, 0.5, 0); solid.add(halfGeo, '#c9733f', 40.5, 0.12, -10.6, Math.PI / 2, 3.1 + 0.4, 0);
  /* hardness tester: a C-frame with a dial, an indenter above a raised anvil, a hand wheel under it */
  var HX = 43.8, HZ = -13.4;
  solid.box(4.8, 0.6, 5.2, HX, 0.3, HZ, CHAR); solid.box(1.8, 8.4, 1.6, HX, 4.8, HZ - 1.6, '#2c6d6b'); solid.box(3.4, 1.8, 4.6, HX, 9.1, HZ - 0.1, '#2c6d6b');
  solid.cyl(0.45, 0.45, 5.4, HX, 3.3, HZ + 1.0, STEEL, 16); solid.cyl(0.95, 0.95, 0.25, HX, 6.12, HZ + 1.0, '#4a5154', 22); solid.cyl(0.7, 0.7, 0.2, HX, 6.35, HZ + 1.0, CU_L, 20);
  solid.cyl(0.22, 0.22, 1.4, HX, 7.5, HZ + 1.0, STEEL, 12); solid.cyl(0.4, 0.4, 0.3, HX, 8.25, HZ + 1.0, CHAR_L, 14);
  solid.add(new T.TorusGeometry(1.45, 0.17, 8, 28), CHAR_L, HX, 2.4, HZ + 1.0, Math.PI / 2, 0, 0); solid.cyl(0.55, 0.55, 0.4, HX, 2.4, HZ + 1.0, CHAR_L, 16);
  for (i = 0; i < 3; i++) solid.box(2.9, 0.12, 0.14, HX, 2.4, HZ + 1.0, CHAR_L, i * Math.PI / 3);
  [0.9, 3.9].forEach(function (a) { solid.cyl(0.17, 0.17, 0.6, HX + Math.cos(a) * 1.45, 2.7, HZ + 1.0 + Math.sin(a) * 1.45, CU, 10); });
  solid.cyl(1.1, 1.1, 0.3, HX, 9.4, HZ + 2.2 + 0.15, CHAR, 28, Math.PI / 2, 0, 0);
  shadow(HX, HZ, 7.0, 7.2);
  var dial = new T.Mesh(new T.CircleGeometry(0.95, 32), offset(new T.MeshBasicMaterial({ map: dialTex(T) }))); dial.position.set(HX, 9.4, HZ + 2.2 + 0.34); g.add(dial);

  /* ---- posters, each on a charcoal board with a copper frame ---- */
  function poster(map, cx, w, h) {
    var py = 7.9, zf = WALL_Z + 0.5;
    solid.box(w + 0.5, h + 0.5, 0.3, cx, py, zf - 0.15, CHAR);
    solid.box(w + 0.5, 0.22, 0.3, cx, py + h / 2 + 0.14, zf + 0.0, CU); solid.box(w + 0.5, 0.22, 0.3, cx, py - h / 2 - 0.14, zf + 0.0, CU);
    solid.box(0.22, h + 0.5, 0.3, cx - w / 2 - 0.14, py, zf, CU); solid.box(0.22, h + 0.5, 0.3, cx + w / 2 + 0.14, py, zf, CU);
    pl(T, g, w, h, map, cx, py, zf + 0.04, 0, false, true);
  }
  poster(stressTex(T), -6.2, 9.4, 8.0); poster(latticeTex(T, 'sc'), 2.2, 6.2, 8.4); poster(latticeTex(T, 'bcc'), 9.0, 6.2, 8.4); poster(latticeTex(T, 'fcc'), 15.8, 6.2, 8.4);

  /* a title board high on the wall: large warm-white text on a solid charcoal backing */
  solid.box(26.6, 2.9, 0.3, 4, 15.6, WALL_Z + 0.35, CHAR); solid.box(26.6, 0.14, 0.34, 4, 17.1, WALL_Z + 0.37, CU); solid.box(26.6, 0.14, 0.34, 4, 14.1, WALL_Z + 0.37, CU);
  pl(T, g, 26, 2.6, boardTex(T, 2048, 256, 1040, 104, function (x, w, h) {
    x.fillStyle = '#252b2d'; x.fillRect(0, 0, w, h); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    x.fillStyle = '#efe7d4'; x.font = 'bold 62px ' + SANS; x.fillText('MATERIALS LAB', 28, 74);
    x.fillStyle = CU_L; x.font = 'bold 30px ' + SANS; x.textAlign = 'right'; x.fillText('structure \u2192 properties', w - 28, 70);
  }), 4, 15.6, WALL_Z + 0.57, 0, false, true);

  /* ---- floor: a stool pulled up to the bench ---- */
  K.makeStool(T, g, -27, 15.5, FLOOR, 0.3);

  /* ---- merged meshes ---- */
  var smat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  g.add(solid.mesh(smat));
  var omat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  g.add(opq.mesh(omat));
  var tmat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  var tm = trans.mesh(tmat); tm.renderOrder = 2; g.add(tm);
  var egeo = new T.BufferGeometry(); egeo.setAttribute('position', new T.Float32BufferAttribute(edgePos, 3));
  var em = new T.LineSegments(egeo, new T.LineBasicMaterial({ color: '#1d282a', transparent: true, opacity: 0.5 })); em.renderOrder = 2; g.add(em);
  var gm = glass.mesh(new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.1, depthWrite: false })); gm.renderOrder = 3; g.add(gm);
  g.add(plates.mesh(offset(new T.MeshBasicMaterial({ map: caseAtlas(T) }))));
  g.add(tags.mesh(offset(new T.MeshBasicMaterial({ map: tagAtlas(T) }))));
  g.add(shad.mesh(offset(new T.MeshBasicMaterial({ map: shTex, transparent: true, opacity: 0.55, depthWrite: false }))));

  /* the tester's screen is the one animated texture: a slow force-extension trace */
  var scrCv = document.createElement('canvas'); scrCv.width = 256; scrCv.height = 128; var scrCx = scrCv.getContext('2d');
  var scrTex = new T.CanvasTexture(scrCv); scrTex.minFilter = T.LinearFilter; screenCurve(scrCx, 256, 128, 1); scrTex.needsUpdate = true;
  var scr = new T.Mesh(new T.PlaneGeometry(3.3, 1.65), offset(new T.MeshBasicMaterial({ map: scrTex, color: new T.Color(1.15, 1.15, 1.15) }))); scr.position.set(TX - 3.4, 1.8, TZ + 3.76); g.add(scr);
  var led = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.08, 10), new T.MeshBasicMaterial({ color: new T.Color('#7be58a').multiplyScalar(1.3) })); led.rotation.x = Math.PI / 2; led.position.set(TX - 0.2, 2.5, TZ + 3.78); g.add(led);

  /* the stage sizes this soft shadow under the topic's model */
  var tableShadow = K.contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5); offset(tableShadow.material);

  /* nothing in this room takes the dark scene fog: its colours stay as drawn */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  var lastDraw = -1, LED_ON = new T.Color('#7be58a');
  return {
    group: g, shadow: tableShadow,
    update: function (t) {
      if (still) return;
      led.material.color.copy(LED_ON).multiplyScalar(0.5 + 0.9 * (Math.sin(t * 2.4) > 0 ? 1 : 0));
      var step = Math.floor(t * 8);
      if (step !== lastDraw) { lastDraw = step; screenCurve(scrCx, 256, 128, Math.min(1, (t % 30) / 22)); scrTex.needsUpdate = true; }
    }
  };
};
})();
