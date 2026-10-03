/* Room "chemlab" for the chemistry subject.
 * A teaching chemistry lab: cream and warm-yellow wall tiles, a black epoxy bench, a fume hood, a large periodic-table
 * poster, a reagent rack, a burette stand, a Bunsen burner, coloured flasks. Everything is procedural (geometry and
 * small canvas textures). Local y = 0 is the bench top, the floor is at y = -13, the back wall at z = -19.
 * Many small parts of one material are merged into a single mesh (see Batch) to keep the draw-call count low. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;

var FLOOR = -13, TS = 2.2, WALL_Z = -19, CEIL = 28.6, TOPY = -0.02, SANS = 'Arial, Helvetica, sans-serif';

function tex(T, w, h, draw, rep) {
  var t = K.canvasTex(T, w, h, draw);
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}
function pl(T, g, w, h, map, x, y, z, rx, std, decal) {
  var m = new T.Mesh(new T.PlaneGeometry(w, h), std ? new T.MeshStandardMaterial({ map: map, roughness: 0.9, metalness: 0 }) : new T.MeshBasicMaterial({ map: map }));
  if (decal) offset(m.material);
  m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m;
}
/* the stage renders with a 16-bit depth buffer, so surfaces a few hundredths apart fight at distance: anything printed on or lying on another surface wins the depth test by an offset */
function offset(m) { m.polygonOffset = true; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4; return m; }

/* merges many small parts that share one material into one mesh. Parts carry vertex colours, so one material serves them all. */
function Batch(T, colored) {
  var parts = [], M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), S = new T.Vector3(1, 1, 1), C = new T.Color();
  var b = {
    add: function (geo, color, x, y, z, rx, ry, rz) {
      var gg = geo.index ? geo.toNonIndexed() : geo.clone(), n = gg.attributes.position.count, a, i;
      M.compose(P.set(x || 0, y || 0, z || 0), Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0)), S); gg.applyMatrix4(M);
      if (colored) { C.set(color); a = new Float32Array(n * 3); for (i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } gg.setAttribute('color', new T.BufferAttribute(a, 3)); }
      parts.push(gg); return b;
    },
    box: function (w, h, d, x, y, z, color, ry) { return b.add(new T.BoxGeometry(w, h, d), color, x, y, z, 0, ry || 0, 0); },
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

/* ---------- glass profiles ---------- */
var FLASK = [[0, 0], [1.4, 0], [1.5, 0.12], [1.46, 0.3], [0.56, 2.5], [0.52, 3.1], [0.64, 3.2], [0.66, 3.3]];
var BEAKER = [[0, 0], [1.2, 0], [1.22, 0.08], [1.2, 2.6], [1.3, 2.72]];
var TUBE = [[0, 0], [0.1, 0.02], [0.2, 0.1], [0.22, 0.3], [0.22, 2.3], [0.27, 2.4]];
var ROUND = [[0, 0], [0.5, 0.05], [0.9, 0.3], [1.2, 0.8], [1.3, 1.3], [1.2, 1.9], [0.8, 2.4], [0.45, 2.8], [0.42, 3.5], [0.52, 3.6]];

function radAt(prof, y) {
  for (var i = 1; i < prof.length; i++) if (y <= prof[i][1] || i === prof.length - 1) { var a = prof[i - 1], b = prof[i], t = b[1] === a[1] ? 0 : Math.min(1, Math.max(0, (y - a[1]) / (b[1] - a[1]))); return a[0] + (b[0] - a[0]) * t; }
  return 0;
}
/* the solution inside a vessel: the vessel's own profile, inset a little and cut off at the fill height */
function liquidProf(prof, fill, inset) {
  var y0 = 0.1, pts = [[0, y0], [radAt(prof, y0) - inset, y0]], k;
  for (k = 0; k < prof.length; k++) if (prof[k][1] > y0 && prof[k][1] < fill) pts.push([prof[k][0] - inset, prof[k][1]]);
  pts.push([radAt(prof, fill) - inset, fill], [0, fill]); return pts;
}

/* ---------- text on labels and posters ---------- */
/* a chemical formula with subscript digits, centred on cx, shrunk to fit maxW */
function formula(x, str, cx, cy, size, maxW, color) {
  var segs = [], w = 0, i, ch, k = 1, px;
  for (i = 0; i < str.length; i++) { ch = str.charAt(i); segs.push({ c: ch, sub: /[0-9]/.test(ch) && i > 0 }); }
  function fw(sz) { var s = 0; segs.forEach(function (g) { x.font = 'bold ' + (g.sub ? sz * 0.62 : sz) + 'px ' + SANS; g.w = x.measureText(g.c).width; s += g.w; }); return s; }
  w = fw(size); if (w > maxW) { k = maxW / w; size *= k; w = fw(size); }
  px = cx - w / 2; x.fillStyle = color; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  segs.forEach(function (g) { x.font = 'bold ' + (g.sub ? size * 0.62 : size) + 'px ' + SANS; x.fillText(g.c, px, g.sub ? cy + size * 0.2 : cy); px += g.w; });
}

var LABELS = [
  { f: 'NaCl', n: 'sodium chloride', c: '1 M', band: '#2f8f86' },
  { f: 'HCl', n: 'hydrochloric acid', c: '1 M', band: '#c4473a', haz: true },
  { f: 'NaOH', n: 'sodium hydroxide', c: '0.1 M', band: '#d99a2f', haz: true },
  { f: 'CuSO4', n: 'copper(II) sulfate', c: '0.5 M', band: '#2f8f86' },
  { f: 'H2O', n: 'distilled water', c: '', band: '#5aa8a0' },
  { f: 'H2SO4', n: 'sulfuric acid', c: '0.5 M', band: '#c4473a', haz: true },
  { f: 'KMnO4', n: 'potassium permanganate', c: '0.02 M', band: '#8a4a86', haz: true },
  { f: 'Na2CO3', n: 'sodium carbonate', c: '0.1 M', band: '#2f8f86' },
  { f: 'H2O', n: 'distilled', c: '', band: '#2f8f86' }
];
/* one 4 x 4 atlas of 256-pixel labels: cream paper, a colour band, the formula large, the name and strength small */
function labelAtlas(T) {
  return tex(T, 1024, 1024, function (x) {
    LABELS.forEach(function (L, i) {
      var ox = (i % 4) * 256, oy = Math.floor(i / 4) * 256;
      x.save(); x.translate(ox, oy);
      x.fillStyle = '#e9e0c6'; x.fillRect(0, 0, 256, 256);
      x.fillStyle = L.band; x.fillRect(0, 0, 256, 44);
      x.fillStyle = 'rgba(30,40,38,0.18)'; x.fillRect(0, 44, 256, 3);
      formula(x, L.f, L.haz ? 112 : 128, 132, 92, L.haz ? 190 : 228, '#1d2a29');
      x.textAlign = 'center'; x.fillStyle = '#3b4a47'; x.font = 'bold 24px ' + SANS; x.fillText(L.n, 128, 184, 236);
      if (L.c) { x.fillStyle = '#1d2a29'; x.font = 'bold 34px ' + SANS; x.fillText(L.c, 128, 226); }
      if (L.haz) {
        x.save(); x.translate(216, 98); x.rotate(Math.PI / 4); x.fillStyle = '#f4efe0'; x.fillRect(-19, -19, 38, 38); x.strokeStyle = '#c4473a'; x.lineWidth = 6; x.strokeRect(-19, -19, 38, 38); x.restore();
        x.fillStyle = '#1d2a29'; x.font = 'bold 34px ' + SANS; x.textAlign = 'center'; x.fillText('!', 216, 111);
      }
      x.restore();
    });
  });
}

/* ---------- periodic table ---------- */
var SYM = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe ' +
  'Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ');
var CATS = [
  { id: 'alkali', name: 'Alkali metals', col: '#e5604d' }, { id: 'alkaline', name: 'Alkaline earth', col: '#f2a23c' },
  { id: 'transition', name: 'Transition metals', col: '#f0d65c' }, { id: 'lanthanide', name: 'Lanthanides', col: '#c8d96a' },
  { id: 'actinide', name: 'Actinides', col: '#8fc46b' }, { id: 'post', name: 'Post-transition', col: '#6fc3a0' },
  { id: 'metalloid', name: 'Metalloids', col: '#3aa9a0' }, { id: 'nonmetal', name: 'Other nonmetals', col: '#f1e8cc' },
  { id: 'halogen', name: 'Halogens', col: '#e9a9a0' }, { id: 'noble', name: 'Noble gases', col: '#b595d6' }
];
function catOf(z) {
  function has(a) { return a.indexOf(z) >= 0; }
  if (has([3, 11, 19, 37, 55, 87])) return 'alkali';
  if (has([4, 12, 20, 38, 56, 88])) return 'alkaline';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return 'transition';
  if (has([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116])) return 'post';
  if (has([5, 14, 32, 33, 51, 52])) return 'metalloid';
  if (has([1, 6, 7, 8, 15, 16, 34])) return 'nonmetal';
  if (has([9, 17, 35, 53, 85, 117])) return 'halogen';
  return 'noble';
}
/* standard 18-column layout: [column, row]; the lanthanides and actinides sit in two rows below (rows 7 and 8) */
function cellOf(z) {
  if (z === 1) return [0, 0]; if (z === 2) return [17, 0];
  if (z <= 4) return [z - 3, 1]; if (z <= 10) return [z + 7, 1];
  if (z <= 12) return [z - 11, 2]; if (z <= 18) return [z - 1, 2];
  if (z <= 36) return [z - 19, 3]; if (z <= 54) return [z - 37, 4];
  if (z <= 56) return [z - 55, 5]; if (z <= 71) return [z - 55, 7];
  if (z <= 86) return [z - 69, 5]; if (z <= 88) return [z - 87, 6];
  if (z <= 103) return [z - 87, 8]; return [z - 101, 6];
}
function posterTex(T) {
  var W = 2048, H = 1024, M = 38;
  return tex(T, W, H, function (x) {
    var cw = (W - 2 * M) / 18, ch = (H - 2 * M) / 9.5, z, i, c, cat, byId = {}, lx, ly;
    CATS.forEach(function (k) { byId[k.id] = k.col; });
    x.fillStyle = '#17302f'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e0a03c'; x.lineWidth = 6; x.strokeRect(10, 10, W - 20, H - 20);
    function cellRect(col, row) { return [M + col * cw, M + (row < 7 ? row : row - 7 + 7.45) * ch]; }
    function draw(col, row, fill, num, sym) {
      var p = cellRect(col, row), cx = p[0] + 2, cy = p[1] + 2, w = cw - 4, h = ch - 4;
      x.fillStyle = fill; x.fillRect(cx, cy, w, h); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2; x.strokeRect(cx + 1, cy + 1, w - 2, h - 2);
      x.fillStyle = '#14201f'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      if (num) { x.font = 'bold 26px ' + SANS; x.fillText(num, cx + 8, cy + 27); }
      x.textAlign = 'center'; x.font = 'bold ' + (sym.length > 2 ? 40 : 54) + 'px ' + SANS; x.fillText(sym, cx + w / 2, cy + h * 0.78);
    }
    for (z = 1; z <= 118; z++) { c = cellOf(z); draw(c[0], c[1], byId[catOf(z)], String(z), SYM[z - 1]); }
    /* stand-ins in the main table for the two rows printed below it */
    draw(2, 5, byId.lanthanide, '', '57-71'); draw(2, 6, byId.actinide, '', '89-103');
    x.fillStyle = '#e9e0c6'; x.textAlign = 'right'; x.font = 'bold 28px ' + SANS;
    c = cellRect(1, 7); x.fillText('Lanthanides', c[0] + cw - 8, c[1] + ch * 0.62); c = cellRect(1, 8); x.fillText('Actinides', c[0] + cw - 8, c[1] + ch * 0.62);
    /* title and key in the empty block of the top rows */
    x.textAlign = 'left'; x.fillStyle = '#f1e8cc'; x.font = 'bold 68px ' + SANS; x.fillText('Periodic Table', M + 2.15 * cw, M + 0.82 * ch);
    x.fillStyle = '#e0a03c'; x.font = 'bold 36px ' + SANS; x.fillText('of the elements', M + 2.15 * cw, M + 1.42 * ch);
    for (i = 0; i < CATS.length; i++) {
      lx = M + 6.55 * cw + Math.floor(i / 5) * 2.95 * cw; ly = M + 0.5 * ch + (i % 5) * 0.46 * ch;
      x.fillStyle = CATS[i].col; x.fillRect(lx, ly - 22, 34, 28); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.strokeRect(lx, ly - 22, 34, 28);
      x.fillStyle = '#f1e8cc'; x.font = 'bold 27px ' + SANS; x.fillText(CATS[i].name, lx + 46, ly + 2);
    }
    x.fillStyle = '#9fb3ae'; x.font = '24px ' + SANS; x.fillText('Atomic number above each symbol. Groupings are conventional; borderline cases vary.', M + 2.15 * cw, M + 2.78 * ch);
  });
}

/* ---------- other textures ---------- */
function tileTex(T, base, grout, seed, rep) {
  var c = new T.Color(base);
  return tex(T, 512, 512, function (x, w, h) {
    var r = K.mulberry(seed), i, j, ts = 128, k, gr;
    x.fillStyle = grout; x.fillRect(0, 0, w, h);
    for (j = 0; j < 4; j++) for (i = 0; i < 4; i++) {
      k = 0.95 + r() * 0.07;
      x.fillStyle = 'rgb(' + Math.round(c.r * 255 * k) + ',' + Math.round(c.g * 255 * k) + ',' + Math.round(c.b * 255 * k) + ')'; x.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
      gr = x.createLinearGradient(i * ts, j * ts, i * ts + ts, j * ts + ts); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.08)');
      x.fillStyle = gr; x.fillRect(i * ts + 3, j * ts + 3, ts - 6, ts - 6);
    }
  }, rep);
}
function epoxyTex(T, rep) {
  /* soft blotches only: fine speckle smears into stripes at a low viewing angle */
  return tex(T, 256, 256, function (x, w, h) {
    var r = K.mulberry(9), i, gr, px, py;
    x.fillStyle = '#202425'; x.fillRect(0, 0, w, h);
    for (i = 0; i < 14; i++) {
      px = r() * w; py = r() * h; gr = x.createRadialGradient(px, py, 0, px, py, 50 + r() * 50);
      gr.addColorStop(0, 'rgba(' + (r() < 0.5 ? '60,68,66,0.1' : '4,6,6,0.12') + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    }
  }, rep);
}
function cabinetTex(T) {
  return tex(T, 2048, 256, function (x, w, h) {
    var n = 13, bw = w / n, i, kick = 22, gr;
    x.fillStyle = '#1a2524'; x.fillRect(0, 0, w, h);
    for (i = 0; i < n; i++) {
      var ox = i * bw, tone = i % 2 ? '#2d6c66' : '#2a655f';
      x.fillStyle = tone; x.fillRect(ox + 4, 5, bw - 8, h * 0.27 - 8);                       // drawer
      x.fillRect(ox + 4, h * 0.27 + 4, bw - 8, h - kick - h * 0.27 - 8);                       // door
      x.fillStyle = '#d6ad55'; x.fillRect(ox + bw / 2 - 20, h * 0.27 - 26, 40, 8); x.fillRect(ox + bw - 24, h * 0.27 + 22, 8, 54);
      x.fillStyle = 'rgba(0,0,0,0.14)'; x.fillRect(ox + 4, h - kick - 10, bw - 8, 6);
    }
    gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
}
function floorTex(T, rep) {
  return tex(T, 256, 256, function (x, w, h) {
    var r = K.mulberry(4), i, j;
    x.fillStyle = '#35423f'; x.fillRect(0, 0, w, h);
    for (j = 0; j < 2; j++) for (i = 0; i < 2; i++) { x.fillStyle = (i + j) % 2 ? '#587570' : '#5f7c76'; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); x.fillStyle = 'rgba(0,0,0,' + (r() * 0.05) + ')'; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); }
  }, rep);
}
function hoodPanelTex(T) {
  return tex(T, 2048, 256, function (x, w, h) {
    x.fillStyle = '#20403d'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e0a03c'; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10);
    x.fillStyle = '#f1e8cc'; x.font = 'bold 150px ' + SANS; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('FUME HOOD', 70, h / 2 + 8);
    x.fillStyle = '#0d1514'; x.fillRect(1180, 40, 520, 176); x.fillStyle = '#86e3a8'; x.font = 'bold 74px ' + SANS; x.fillText('FLOW OK', 1215, 100);
    x.font = 'bold 56px ' + SANS; x.fillStyle = '#e8c070'; x.fillText('~0.5 m/s', 1215, 172);
    x.fillStyle = '#6ee79a'; x.beginPath(); x.arc(1820, 100, 32, 0, 7); x.fill(); x.fillStyle = '#7b5a26'; x.beginPath(); x.arc(1820, 176, 32, 0, 7); x.fill();
  });
}
function buretteTex(T) {
  /* drawn with x stretched to undo the tall, thin shape of the tube, so digits are not squashed */
  return tex(T, 128, 1024, function (x, w, h) {
    var i, y, len;
    x.scale(w / 56, 1); x.strokeStyle = '#1d2927'; x.fillStyle = '#1d2927'; x.lineWidth = 3; x.textBaseline = 'middle';
    for (i = 0; i <= 50; i++) {
      y = 18 + i / 50 * (h - 36); len = i % 10 === 0 ? 20 : i % 5 === 0 ? 14 : 8;
      x.beginPath(); x.moveTo(2, y); x.lineTo(2 + len, y); x.stroke();
      if (i % 10 === 0) { x.font = 'bold 26px ' + SANS; x.fillText(String(i), 25, y); }
    }
  });
}
function clockTex(T) {
  return tex(T, 256, 256, function (x) {
    x.fillStyle = '#e9e0c6'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.strokeStyle = '#20403d'; x.lineWidth = 6;
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; x.beginPath(); x.moveTo(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98); x.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); x.stroke(); }
    x.lineWidth = 10; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 54 * Math.sin(1.05), 128 - 54 * Math.cos(1.05)); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 90 * Math.sin(3.35), 128 - 90 * Math.cos(3.35)); x.stroke();
    x.fillStyle = '#c4473a'; x.beginPath(); x.arc(128, 128, 8, 0, 7); x.fill();
  });
}

function flameShape(T, w, h) {
  var s = new T.Shape();
  s.moveTo(0, 0); s.bezierCurveTo(w, h * 0.1, w * 0.78, h * 0.55, 0, h); s.bezierCurveTo(-w * 0.78, h * 0.55, -w, h * 0.1, 0, 0);
  return new T.ShapeGeometry(s, 12);
}

ENV.chemlab = function (T) {
  var g = new T.Group(), i, j;
  var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var solid = Batch(T, true), glass = Batch(T, true), labs = Batch(T, false);
  var shTex = K.canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  var shGeo = new T.PlaneGeometry(1, 1);
  function shadow(x, z, w, d, op, y) {
    var m = new T.Mesh(shGeo, offset(new T.MeshBasicMaterial({ map: shTex, transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y == null ? 0.012 : y, z); m.scale.set(w, d, 1); g.add(m); return m;
  }
  /* glass vessel with its solution (solution goes into the opaque batch, the shell into the see-through one) */
  function vessel(prof, x, y, z, glassCol, liqCol, fill, sc) {
    sc = sc || 1;
    glass.add(K.lathe(T, prof.map(function (p) { return [p[0] * sc, p[1] * sc]; }), 28), glassCol, x, y, z);
    if (liqCol) solid.add(K.lathe(T, liquidProf(prof, fill, 0.06).map(function (p) { return [p[0] * sc, p[1] * sc]; }), 28), liqCol, x, y, z);
  }

  /* light: the same budget as the other rooms */
  g.add(new T.HemisphereLight(0xfff1de, 0x4a4038, 0.5));
  var key = new T.DirectionalLight(0xfff0dc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xe8e8f0, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe2bf, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---- shell: tiled back wall in three bands, ceiling, floor ---- */
  var WW = 130, SW = 60, yT = tileTex(T, '#dcb44c', '#a89560', 3, [1, 1]), tT = tileTex(T, '#2f8f86', '#1d5b56', 5, [1, 1]), cT = tileTex(T, '#d8cba6', '#a89f84', 7, [1, 1]);
  /* three tile bands: warm yellow up to y = 11, a teal border row, cream above. Used for the back wall and both end walls */
  function walls(len, x, z, ry) {
    var wg = new T.Group(), r = len / (4 * TS);
    function band(src, h, yc, ry2) { var t = src.clone(); t.needsUpdate = true; t.repeat.set(r, ry2); pl(T, wg, len, h, t, 0, yc, 0); }
    wg.position.set(x, 0, z); wg.rotation.y = ry; g.add(wg);
    band(yT, 24.2, FLOOR - 0.2 + 12.1, 24.2 / (4 * TS)); band(tT, TS, 11 + TS / 2, 0.25); band(cT, 7 * TS, 11 + TS + 3.5 * TS, 7 * TS / (4 * TS));
  }
  walls(WW, 0, WALL_Z, 0); walls(SW, -WW / 2, WALL_Z + SW / 2, Math.PI / 2); walls(SW, WW / 2, WALL_Z + SW / 2, -Math.PI / 2);
  var ceil = pl(T, g, WW, 60, null, 0, CEIL, 11, Math.PI / 2); ceil.material.dispose(); ceil.material = new T.MeshBasicMaterial({ color: '#b3a98c' });
  pl(T, g, WW, 70, floorTex(T, [WW / 8.8, 70 / 8.8]), 0, FLOOR, 16, -Math.PI / 2, true);
  solid.box(WW, 0.6, 0.6, 0, CEIL - 0.35, WALL_Z + 0.3, '#2a7f77');

  /* ---- bench: black epoxy top on teal cabinets, a long worktop against the wall ---- */
  var BW = 104, bz0 = WALL_Z, bz1 = 9.6;
  pl(T, g, BW, bz1 - bz0, epoxyTex(T, [BW / 4, (bz1 - bz0) / 4]), 0, TOPY, (bz0 + bz1) / 2, -Math.PI / 2, true);
  solid.box(BW, 0.76, bz1 - bz0, 0, -0.42, (bz0 + bz1) / 2, '#1a1e1f');
  pl(T, g, BW, 12.16, cabinetTex(T), 0, -6.92, 9.0);
  [-1, 1].forEach(function (s) { solid.box(0.5, 12.2, 28, s * (BW / 2 - 0.25), -6.9, -5.0, '#1f4e4a'); });

  /* ---- periodic table poster: hung on two amber rails ---- */
  var PW = 26, PH = 13, PY = 10.1;
  pl(T, g, PW, PH, posterTex(T), 0, PY, WALL_Z + 0.08, 0, false, true);
  [PY + PH / 2 + 0.3, PY - PH / 2 - 0.3].forEach(function (y) {
    solid.cyl(0.25, 0.25, PW + 0.8, 0, y, WALL_Z + 0.35, '#b9843f', 14, 0, 0, Math.PI / 2);
    [-1, 1].forEach(function (s) { solid.cyl(0.34, 0.34, 0.3, s * (PW / 2 + 0.55), y, WALL_Z + 0.35, '#7d5522', 14, 0, 0, Math.PI / 2); });
  });
  /* round wall clock above the poster */
  solid.cyl(1.55, 1.55, 0.35, 0, 22.4, WALL_Z + 0.2, '#20403d', 32, Math.PI / 2, 0, 0);
  pl(T, g, 2.5, 2.5, clockTex(T), 0, 22.4, WALL_Z + 0.45, 0, false, true).material.transparent = true;

  /* ---- fume hood ---- */
  var HX = -22.25, HW = 15.5, CREAM = '#8f8a74', FRAME = '#56635f', Y0 = TOPY;
  var inner = HW / 2 - 0.9;
  solid.box(inner * 2 + 0.4, 17.4, 0.3, HX, 8.84, -18.65, '#98aea6');                                      // back liner
  [-1, 1].forEach(function (s) {
    solid.box(0.9, 17.12, 7.9, HX + s * (HW / 2 - 0.45), 8.54, -15.05, CREAM);                         // side walls
    solid.box(1.1, 17.12, 1.1, HX + s * (HW / 2 - 0.55), 8.54, -10.55, FRAME);                         // front uprights
  });
  solid.box(HW, 2.7, 9.0, HX, 18.45, -14.5, CREAM);                                                  // header above the sash
  solid.box(HW + 0.5, 0.3, 9.4, HX, 19.95, -14.4, '#7a7561');                                        // top plate
  solid.box(inner * 2 + 0.4, 0.14, 8.2, HX, 0.07, -14.9, '#a8a18b');                                       // work surface liner
  solid.box(inner * 2, 0.4, 1.0, HX, 0.2, -10.5, FRAME);                                             // air-foil sill
  solid.box(inner * 2 - 2, 0.35, 0.1, HX, 0.55, -18.45, '#3a403d');                                   // baffle slot
  /* sash: raised about 30 cm, so you see in under it and through it */
  solid.box(12.8, 0.5, 0.5, HX, 4.4, -10.55, FRAME); solid.box(12.8, 0.5, 0.5, HX, 16.8, -10.55, FRAME);
  [-1, 1].forEach(function (s) { solid.box(0.5, 11.9, 0.5, HX + s * 6.15, 10.6, -10.55, FRAME); });
  solid.box(3.2, 0.22, 0.3, HX, 4.25, -10.15, '#3a403d');
  var pane = new T.Mesh(new T.PlaneGeometry(12.3, 11.9), new T.MeshBasicMaterial({ color: '#dff0e8', transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide }));
  pane.position.set(HX, 10.6, -10.55); g.add(pane);
  pl(T, g, 13.2, 1.65, hoodPanelTex(T), HX, 18.45, -9.85, 0, false, true);
  /* extractor duct */
  solid.cyl(2.3, 2.3, CEIL - 20.1 + 0.2, HX, (CEIL + 20.1) / 2, -15.2, '#72827e', 28);
  solid.cyl(2.8, 2.8, 0.5, HX, 20.4, -15.2, '#566662', 28); solid.cyl(2.55, 2.55, 0.4, HX, 24.4, -15.2, '#566662', 28); solid.cyl(2.8, 2.8, 0.5, HX, CEIL - 0.5, -15.2, '#566662', 28);
  /* inside: a hot plate with a flask, a beaker, a round-bottom flask in a cork ring, a retort stand */
  solid.box(4.6, 1.0, 4.6, HX - 4.0, 0.64, -14.6, '#38403f'); solid.cyl(1.9, 1.9, 0.12, HX - 4.0, 1.2, -14.6, '#98a6a2', 28);
  solid.cyl(0.32, 0.32, 0.3, HX - 4.0 + 1.5, 0.7, -12.2, '#2f9e92', 14, Math.PI / 2, 0, 0); solid.box(0.34, 0.2, 0.1, HX - 4.0 - 1.4, 0.64, -12.27, '#f2b04a');
  vessel(FLASK, HX - 4.0, 1.26, -14.6, '#c9e2dc', '#e0a03c', 1.4, 0.95);
  vessel(BEAKER, HX + 0.6, 0.14, -15.8, '#c9e2dc', '#3aa9a0', 1.6, 1.0);
  solid.add(new T.TorusGeometry(0.95, 0.34, 8, 24), '#b38b5a', HX + 4.2, 0.45, -14.4, Math.PI / 2, 0, 0);
  vessel(ROUND, HX + 4.2, 0.2, -14.4, '#c9e2dc', '#d9566a', 1.0, 0.9);
  solid.box(3.2, 0.3, 2.2, HX + 5.0, 0.29, -17.3, '#38403f'); solid.cyl(0.13, 0.13, 15, HX + 5.0, 7.7, -17.3, '#8c9894', 12);
  solid.cyl(0.1, 0.1, 3.6, HX + 3.3, 11.2, -17.3, '#8c9894', 10, 0, 0, Math.PI / 2); solid.box(0.5, 0.5, 0.5, HX + 5.0, 11.2, -17.3, '#38403f');
  shadow(HX - 4.0, -14.6, 6.2, 6.2, 0.55, 0.155); shadow(HX + 0.6, -15.8, 3.6, 3.6, 0.5, 0.155); shadow(HX + 4.2, -14.4, 3.8, 3.8, 0.5, 0.155);

  /* ---- reagent rack on the bench, against the wall ---- */
  var RX = 25, RZ = -17.0, rackCol = '#a07a46';
  [-1, 1].forEach(function (s) { solid.box(0.7, 14.6, 3.4, RX + s * 7.2, 7.3 + TOPY, RZ, rackCol); });
  [0.25, 6.7, 13.1].forEach(function (y) { solid.box(14.2, 0.5, 3.4, RX, y, RZ, rackCol); });
  solid.box(14.2, 0.6, 0.3, RX, 14.3, RZ + 1.55, rackCol);
  var GL = ['#c68a2d', '#cfe9e4'], LQ = ['#d6e6e0', '#ead98a', '#c9ddd6', '#4f9fb8', '#cfe5e5', '#e6d8a8', '#6a2f6d', '#e3e8e0'], CAPC = ['#1d2a29', '#2f8f86', '#c4473a', '#d99a2f'];
  var BH = 4.4, BR = 1.15, BP = [[0, 0], [BR * 0.92, 0], [BR, 0.12], [BR, BH - 1.2], [BR * 0.78, BH - 0.7], [0.38, BH - 0.35], [0.38, BH]];
  for (i = 0; i < 8; i++) {
    var bx = RX + (i % 4 - 1.5) * 3.6, by = (i < 4 ? 0.5 : 6.9), amber = (i === 1 || i === 5 || i === 6);
    glass.add(K.lathe(T, BP, 24), amber ? GL[0] : GL[1], bx, by, RZ);
    solid.add(K.lathe(T, liquidProf(BP, BH * 0.72, 0.07), 24), LQ[i], bx, by, RZ);
    solid.cyl(0.46, 0.46, 0.55, bx, by + BH + 0.2, RZ, CAPC[i % 4], 16);
    var lg = new T.CylinderGeometry(BR + 0.02, BR + 0.02, 1.95, 18, 1, true, -0.8, 1.6), uv = lg.attributes.uv, cx0 = (i % 4) / 4, cy0 = 1 - (Math.floor(i / 4) + 1) / 4;
    for (j = 0; j < uv.count; j++) uv.setXY(j, cx0 + uv.getX(j) / 4, cy0 + uv.getY(j) / 4);
    labs.add(lg, null, bx, by + 1.95, RZ);
  }
  /* small dropper bottles on the top board */
  var DP = [[0, 0], [0.5, 0], [0.55, 0.1], [0.55, 1.3], [0.3, 1.6], [0.22, 1.9]];
  for (i = 0; i < 5; i++) {
    var dx = RX + (i - 2) * 2.6;
    glass.add(K.lathe(T, DP, 16), i % 2 ? '#c68a2d' : '#4f8f6a', dx, 13.35, RZ); solid.add(K.lathe(T, liquidProf(DP, 1.0, 0.05), 16), i % 2 ? '#a8641c' : '#2f6f52', dx, 13.35, RZ);
    solid.cyl(0.2, 0.2, 0.5, dx, 13.35 + 2.15, RZ, '#1d2a29', 12); solid.add(new T.SphereGeometry(0.28, 12, 8), '#c4473a', dx, 13.35 + 2.65, RZ);
  }
  shadow(RX, RZ + 0.3, 15.4, 4.6, 0.5);

  /* ---- bench props, all behind the clear zone ---- */
  /* Bunsen burner and its gas hose to a tap in the wall */
  var BNX = -11.5, BNZ = -13.8;
  solid.cyl(0.85, 1.05, 0.3, BNX, 0.15, BNZ, '#2d3331', 24); solid.cyl(0.22, 0.4, 0.4, BNX, 0.45, BNZ, '#2d3331', 16);
  solid.cyl(0.26, 0.26, 1.7, BNX, 1.3, BNZ, '#7d8884', 16); solid.cyl(0.36, 0.36, 0.6, BNX, 0.95, BNZ, '#b9842f', 16);
  solid.cyl(0.13, 0.13, 0.7, BNX, 0.5, BNZ - 0.55, '#2d3331', 10, Math.PI / 2, 0, 0);
  var hose = new T.CatmullRomCurve3([new T.Vector3(BNX, 0.5, BNZ - 0.8), new T.Vector3(BNX + 0.2, 0.26, BNZ - 1.8), new T.Vector3(BNX - 1.4, 0.26, BNZ - 3.2), new T.Vector3(BNX + 0.8, 0.26, BNZ - 4.0), new T.Vector3(BNX, 1.3, WALL_Z + 0.9), new T.Vector3(BNX, 2.1, WALL_Z + 0.55)]);
  solid.add(new T.TubeGeometry(hose, 40, 0.2, 8, false), '#c4503a', 0, 0, 0);
  solid.cyl(0.32, 0.32, 0.8, BNX, 2.1, WALL_Z + 0.4, '#b9842f', 14, Math.PI / 2, 0, 0); solid.box(0.9, 0.22, 0.3, BNX + 0.3, 2.45, WALL_Z + 0.5, '#e0a82a');
  shadow(BNX, BNZ, 3.2, 3.2, 0.55);
  var flame = new T.Group(); flame.position.set(BNX, 2.15, BNZ); g.add(flame);
  [[0.55, 1.15, '#f2a233', 0], [0.36, 0.82, '#f7c85a', 0.012], [0.2, 0.42, '#3aa9a0', 0.024]].forEach(function (f) {
    [0, Math.PI / 2].forEach(function (ry) {
      var m = new T.Mesh(flameShape(T, f[0], f[1]), new T.MeshBasicMaterial({ color: f[2], side: T.DoubleSide })); m.position.z = ry ? 0 : f[3]; m.position.x = ry ? f[3] : 0; m.rotation.y = ry; flame.add(m);
    });
  });
  /* coloured solutions: teal flask, amber beaker, test tubes in a rack */
  vessel(FLASK, -7.5, 0, -14.8, '#cfe7e1', '#3aa9a0', 1.3, 1.0); shadow(-7.5, -14.8, 4.2, 4.2, 0.55);
  vessel(BEAKER, -3.5, 0, -15.6, '#cfe7e1', '#e0a03c', 1.7, 1.0); shadow(-3.5, -15.6, 3.6, 3.6, 0.55);
  var TCOL = ['#e0a03c', '#3aa9a0', '#d9566a', '#ead98a', '#8fc46b', '#e0a03c'], RKX = 0.8, RKZ = -14.5;
  solid.box(4.5, 0.2, 1.3, RKX, 1.25, RKZ, '#b38b5a'); solid.box(4.5, 0.2, 1.3, RKX, 0.45, RKZ, '#b38b5a');
  [-1, 1].forEach(function (s) { solid.box(0.2, 1.3, 1.3, RKX + s * 2.2, 0.8, RKZ, '#b38b5a'); });
  for (i = 0; i < 6; i++) { var tx = RKX - 1.85 + i * 0.74; glass.add(K.lathe(T, TUBE, 14), '#d5ebe6', tx, 0.5, RKZ); solid.add(K.lathe(T, liquidProf(TUBE, 0.6 + (i % 3) * 0.45, 0.04), 14), TCOL[i], tx, 0.5, RKZ); }
  shadow(RKX, RKZ, 5.6, 2.8, 0.5);
  /* safety goggles standing on their rim, strap looped behind */
  var GX = 5.3, GZ = -11.8;
  [-1, 1].forEach(function (sd) {
    var gs = K.rrShape(T, 1.5, 1.2, 0.42); gs.holes.push(K.rrShape(T, 1.08, 0.8, 0.28));
    solid.add(new T.ExtrudeGeometry(gs, { depth: 0.7, bevelEnabled: false, curveSegments: 8 }), '#2a8f86', GX + sd * 0.8, 0.65, GZ - 0.35);
    glass.add(new T.BoxGeometry(1.2, 0.9, 0.06), '#7fd6c8', GX + sd * 0.8, 0.65, GZ - 0.05);
  });
  solid.box(0.5, 0.3, 0.7, GX, 0.8, GZ, '#2a8f86');
  var strap = new T.CatmullRomCurve3([new T.Vector3(GX - 1.55, 0.65, GZ - 0.2), new T.Vector3(GX - 1.7, 0.12, GZ - 1.2), new T.Vector3(GX - 0.9, 0.12, GZ - 3.0), new T.Vector3(GX + 0.9, 0.12, GZ - 3.0), new T.Vector3(GX + 1.7, 0.12, GZ - 1.2), new T.Vector3(GX + 1.55, 0.65, GZ - 0.2)]);
  solid.add(new T.TubeGeometry(strap, 30, 0.1, 6, false), '#232a29', 0, 0, 0);
  shadow(GX, GZ - 1.2, 4.4, 4.6, 0.45);
  /* burette on a retort stand over a titration flask on a white tile */
  var BX = 10.2, BZ = -14.0, RDX = 8.4;
  solid.box(4.6, 0.28, 3.8, 9.6, 0.14, BZ, '#2d3331'); solid.cyl(0.13, 0.13, 13.6, RDX, 7.0, BZ - 0.8, '#8c9894', 12);
  solid.box(2.6, 0.1, 2.6, BX, 0.33, BZ, '#e2dac2');
  vessel(FLASK, BX, 0.38, BZ, '#cfe7e1', '#d9566a', 1.2, 1.0);
  solid.cyl(0.08, 0.08, 1.1, BX, 4.3, BZ, '#d5ebe6', 10);                                              // tip
  solid.cyl(0.2, 0.2, 0.9, BX, 4.9, BZ, '#2f9e92', 12, 0, 0, Math.PI / 2); solid.box(0.14, 0.14, 0.9, BX, 4.9, BZ + 0.1, '#2f9e92');   // stopcock
  glass.add(K.lathe(T, [[0.0, 0], [0.3, 0], [0.3, 7.9], [0.55, 8.4], [0.55, 8.6]], 14), '#d5ebe6', BX, 5.3, BZ);
  solid.add(K.lathe(T, [[0, 0.1], [0.25, 0.1], [0.25, 6.9], [0, 6.9]], 14), '#6fc9bb', BX, 5.3, BZ);
  var ticks = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 7.5, 16, 1, true, -0.9, 1.8), offset(new T.MeshBasicMaterial({ map: buretteTex(T), transparent: true, depthWrite: false }))); ticks.position.set(BX, 9.15, BZ); g.add(ticks);
  solid.cyl(0.1, 0.1, RDX < BX ? BX - RDX - 0.2 : 1, (RDX + BX) / 2 - 0.1, 9.9, BZ - 0.4, '#8c9894', 10, 0, 0, Math.PI / 2); solid.box(0.55, 0.55, 0.55, RDX, 9.9, BZ - 0.8, '#2d3331');
  solid.add(new T.TorusGeometry(0.4, 0.09, 8, 16), '#2d3331', BX, 9.9, BZ, Math.PI / 2, 0, 0);
  shadow(9.6, BZ, 6.0, 5.2, 0.55);
  /* wash bottle: white body, teal cap and a bent nozzle, labelled */
  var WX = 14.5, WZ = -14.0, WH = 3.6;
  solid.add(K.lathe(T, [[0, 0], [0.9, 0], [0.98, 0.1], [0.98, WH - 0.9], [0.6, WH - 0.35], [0.38, WH]], 20), '#e9e3d2', WX, 0, WZ);
  solid.cyl(0.46, 0.46, 0.55, WX, WH + 0.2, WZ, '#2f9e92', 16);
  var noz = new T.CatmullRomCurve3([new T.Vector3(WX, WH + 0.4, WZ), new T.Vector3(WX, WH + 1.3, WZ), new T.Vector3(WX + 0.5, WH + 1.65, WZ), new T.Vector3(WX + 1.3, WH + 1.45, WZ), new T.Vector3(WX + 1.7, WH + 1.0, WZ)]);
  solid.add(new T.TubeGeometry(noz, 20, 0.1, 8, false), '#2f9e92', 0, 0, 0);
  var wl = new T.CylinderGeometry(1.05, 1.05, 1.5, 18, 1, true, -0.85, 1.7), wuv = wl.attributes.uv;
  for (j = 0; j < wuv.count; j++) wuv.setXY(j, wuv.getX(j) / 4, 0.25 + wuv.getY(j) / 4);
  labs.add(wl, null, WX, 1.35, WZ);
  shadow(WX, WZ, 3.0, 3.0, 0.5);

  /* a lab notebook with a pencil, and an evaporating dish of salt, in front of the rack */
  solid.box(2.5, 0.2, 3.3, 26.5, 0.1, -12.0, '#b5473a', 0.3); solid.box(2.3, 0.14, 3.1, 26.6, 0.27, -12.0, '#d9d0b4', 0.3);
  solid.cyl(0.07, 0.07, 2.6, 24.2, 0.1, -10.9, '#e0a03c', 6, 0, 0.5, Math.PI / 2);
  solid.add(K.lathe(T, [[0, 0], [0.5, 0], [0.9, 0.1], [1.1, 0.5], [1.05, 0.55], [0.85, 0.15], [0, 0.15]], 20), '#e6dfcb', 21.6, 0, -11.9);
  solid.add(new T.SphereGeometry(0.62, 14, 8, 0, 6.283, 0, 1.2), '#f3eee0', 21.6, 0.15, -11.9);
  shadow(26.5, -12.0, 4.0, 4.8, 0.45); shadow(21.6, -11.9, 3.0, 3.0, 0.45);

  /* ---- merged meshes ---- */
  var smat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  g.add(solid.mesh(smat));
  var gmat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide });
  g.add(glass.mesh(gmat));
  g.add(labs.mesh(new T.MeshStandardMaterial({ map: labelAtlas(T), color: 0xcfcfcf, roughness: 0.9, metalness: 0, side: T.DoubleSide })));

  /* the stage sizes this soft shadow under the topic's model */
  var tableShadow = K.contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5); offset(tableShadow.material);

  /* nothing in this room takes the dark scene fog: its colours stay as drawn */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  return {
    group: g, shadow: tableShadow,
    update: function (t) {
      if (still) return;
      flame.scale.set(1 - 0.05 * Math.sin(t * 13), 1 + 0.07 * Math.sin(t * 9) + 0.04 * Math.sin(t * 17 + 1), 1);
    }
  };
};
})();
