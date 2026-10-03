/* Room "clinic" for the health subject: a calm exam room.
 * Soft white and seafoam walls, a pale vinyl floor, light oak, and a little soft coral. An exam bed with a paper roll and a step
 * stool on the right, an anatomy poster of the heart (labelled four-chamber section) and one of the eye, a glass-fronted supply
 * cabinet, a sink with a soap dispenser, a patient monitor on a stand with a slow ECG trace, a privacy curtain on a ceiling track,
 * a stethoscope on a hook, a blood-pressure cuff, a height chart and a plant.
 * Local y = 0 is the table top, the floor is at y = -13, the back wall is at z = -19. Everything is built from code. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var mulberry = K.mulberry, canvasTex = K.canvasTex, contactShadow = K.contactShadow, roundedBox = K.roundedBox;
var PI = Math.PI, SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
var FLOOR = -13, CEIL = 26, ZB = -19, XS = 60, ZF = 80, ZC = (ZB + ZF) / 2;
var LIT = 0.68, LIT_MAX = 0.56;   /* the shared lights add up to about 1.4 on a surface facing the camera, so shaded colours are drawn darker than the colour you see, and never above 0.56 (bloom starts near 0.97) */
/* cap: a higher ceiling (and a lighter start) for surfaces that face up, which catch less of the light */
function litColor(c, cap) { c.multiplyScalar(cap ? LIT * cap / LIT_MAX : LIT); var m = Math.max(c.r, c.g, c.b), mx = cap || LIT_MAX; if (m > mx) c.multiplyScalar(mx / m); return c; }

/* canvas texture with mipmaps; o.repeat tiles it */
function tex(T, w, h, draw, o) {
  var t = canvasTex(T, w, h, draw); o = o || {};
  t.anisotropy = 4; t.minFilter = T.LinearMipmapLinearFilter;
  if (o.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}

/* light oak grain; vertical grain runs along the texture's v axis */
function woodTex(T, seed, base, w, h, vertical) {
  return tex(T, w, h, function (c, cw, ch) {
    var r = mulberry(seed), i, A = vertical ? ch : cw, B = vertical ? cw : ch, y, a;
    if (vertical) c.setTransform(0, 1, 1, 0, 0, 0);
    c.fillStyle = base; c.fillRect(0, 0, A, B);
    for (i = 0; i < 12; i++) { y = r() * B; c.fillStyle = r() < 0.5 ? 'rgba(120,80,40,' + (0.04 + r() * 0.06) + ')' : 'rgba(255,238,205,' + (0.05 + r() * 0.07) + ')'; c.fillRect(0, y, A, 6 + r() * 26); }
    for (i = 0; i < 90; i++) {
      y = r() * B; a = 0.05 + r() * 0.14;
      c.strokeStyle = r() < 0.65 ? 'rgba(110,72,36,' + a + ')' : 'rgba(255,240,210,' + a * 0.6 + ')'; c.lineWidth = 0.5 + r() * 1.4;
      c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(A * 0.3, y + (r() - 0.5) * 8, A * 0.7, y + (r() - 0.5) * 8, A, y + (r() - 0.5) * 5); c.stroke();
    }
  });
}

/* pale vinyl: four slightly different tiles with thin seams, fine speckle */
function floorTex(T, rep) {
  return tex(T, 512, 512, function (c, w, h) {
    var r = mulberry(7), tones = ['#d8ccb4', '#dcd0b8', '#d4c8b0', '#dacdb5'], k, i, x, y;
    for (k = 0; k < 4; k++) { c.fillStyle = tones[k]; c.fillRect((k % 2) * 256, Math.floor(k / 2) * 256, 256, 256); }
    for (i = 0; i < 1800; i++) { x = r() * w; y = r() * h; c.fillStyle = r() < 0.5 ? 'rgba(110,100,84,' + (0.05 + r() * 0.07) + ')' : 'rgba(255,250,238,' + (0.06 + r() * 0.08) + ')'; c.fillRect(x, y, 1 + r() * 2, 1 + r()); }
    c.strokeStyle = 'rgba(128,118,100,0.55)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.moveTo(0, 256); c.lineTo(w, 256); c.moveTo(0, 0); c.lineTo(0, h); c.moveTo(256, 0); c.lineTo(256, h); c.stroke();
  }, { repeat: rep });
}

/* world-space solids baked into one vertex-coloured mesh. Colours given here are the colours you see; they are darkened for the lights. */
function baker(T) {
  var UB = new T.BoxGeometry(1, 1, 1), cache = {}, P = [], N = [], C = [], I = [], v = 0, a = new T.Vector3(), nm = new T.Matrix3(), col = new T.Color();
  var q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3();
  function add(geo, hex, m, cap) {
    var pa = geo.attributes.position.array, na = geo.attributes.normal.array, ia = geo.index ? geo.index.array : null, n = pa.length / 3, k;
    litColor(col.set(hex), cap); nm.getNormalMatrix(m);
    for (k = 0; k < n; k++) {
      a.set(pa[3 * k], pa[3 * k + 1], pa[3 * k + 2]).applyMatrix4(m); P.push(a.x, a.y, a.z);
      a.set(na[3 * k], na[3 * k + 1], na[3 * k + 2]).applyMatrix3(nm).normalize(); N.push(a.x, a.y, a.z); C.push(col.r, col.g, col.b);
    }
    if (ia) for (k = 0; k < ia.length; k++) I.push(ia[k] + v); else for (k = 0; k < n; k++) I.push(k + v);
    v += n;
  }
  /* a transform from position, rotation (radians), size, optionally inside a parent group */
  function M(x, y, z, rx, ry, rz, sx, sy, sz, parent) {
    var m = new T.Matrix4(); e.set(rx || 0, ry || 0, rz || 0); m.compose(p.set(x, y, z), q.setFromEuler(e), s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
    if (parent) { parent.updateWorldMatrix(true, false); m.premultiply(parent.matrixWorld); }
    return m;
  }
  return {
    add: add, M: M,
    box: function (w, h, d, hex, x, y, z, parent, cap, rx, ry, rz) { add(UB, hex, M(x, y, z, rx, ry, rz, w, h, d, parent), cap); },
    cyl: function (rt, rb, h, hex, x, y, z, parent, cap, rx, ry, rz) {
      var key = rt + '|' + rb + '|' + h; add(cache[key] || (cache[key] = new T.CylinderGeometry(rt, rb, h, 18)), hex, M(x, y, z, rx, ry, rz, 1, 1, 1, parent), cap);
    },
    geo: function (geo, hex, x, y, z, rx, ry, rz, sx, sy, sz, parent, cap) { add(geo, hex, M(x, y, z, rx, ry, rz, sx, sy, sz, parent), cap); },
    mesh: function () {
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); geo.setIndex(I);
      return new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: T.DoubleSide }));
    }
  };
}

/* soft contact shadows baked into a few meshes, one per strength */
function shadowBaker(T, tex) {
  var buckets = {};
  return {
    add: function (x, y, z, w, d, op) {
      var key = op.toFixed(2), b = buckets[key] || (buckets[key] = { P: [], U: [], I: [], v: 0, op: op }), x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
      b.P.push(x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0); b.U.push(0, 0, 1, 0, 1, 1, 0, 1); b.I.push(b.v, b.v + 1, b.v + 2, b.v, b.v + 2, b.v + 3); b.v += 4;
    },
    meshes: function () {
      return Object.keys(buckets).map(function (k) {
        var b = buckets[k], geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(b.P, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(b.U, 2)); geo.setIndex(b.I);
        var m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: b.op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        m.renderOrder = 2; return m;
      });
    }
  };
}

/* ---------- anatomy posters (drawn on canvas) ---------- */

/* a label with a leader line to the structure it names.
   mode: 'ra' text right-aligned at x, line leaves its right side; 'la' text left-aligned at x, line leaves its left side;
         'lt' text left-aligned, line leaves its right end; 'rt' text right-aligned, line leaves its left end */
function leaderLabel(c, lines, x, y, mode, tx, ty, fs) {
  var lh = fs * 1.12, i, w = 0, top = y - (lines.length - 1) * lh / 2, right = mode === 'ra' || mode === 'rt';
  c.font = 'bold ' + fs + 'px ' + SANS; c.textBaseline = 'middle'; c.textAlign = right ? 'right' : 'left';
  for (i = 0; i < lines.length; i++) w = Math.max(w, c.measureText(lines[i]).width);
  c.fillStyle = '#2a3a36';
  for (i = 0; i < lines.length; i++) c.fillText(lines[i], x, top + i * lh);
  var sx = mode === 'ra' ? x + 14 : mode === 'la' ? x - 14 : mode === 'lt' ? x + w + 14 : x - w - 14;
  c.strokeStyle = '#2a3a36'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(sx, y); c.lineTo(tx, ty); c.stroke();
  c.fillStyle = '#2a3a36'; c.beginPath(); c.arc(tx, ty, 6, 0, 7); c.fill();
  c.strokeStyle = '#f4efe2'; c.lineWidth = 2; c.beginPath(); c.arc(tx, ty, 6, 0, 7); c.stroke();
}

function posterHeader(c, W, title, sub) {
  c.fillStyle = '#e4ded0'; c.fillRect(0, 0, W, 4000);
  c.fillStyle = '#3f7466'; c.fillRect(0, 0, W, 150);
  c.fillStyle = '#c9776a'; c.fillRect(0, 150, W, 10);
  c.fillStyle = '#f1f0e6'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'bold 76px ' + SANS; c.fillText(title, W / 2, 62);
  c.font = '34px ' + SANS; c.fillText(sub, W / 2, 118);
}

function drawHeartPoster(c, W, H) {
  var BLUE = '#7b9dc2', BLUE_D = '#3f628a', RED = '#dd6f64', RED_D = '#8c3631', MUS = '#c78b7e', MUS_D = '#7a3f39', CREAM = '#f6e9c2', CREAM_D = '#8a6d34';
  posterHeader(c, W, 'THE HEART', 'frontal section (schematic, simplified)');
  c.save(); c.translate(40, 10); c.lineJoin = 'round'; c.lineCap = 'butt';

  /* muscle (myocardium) */
  c.beginPath();
  c.moveTo(328, 575); c.bezierCurveTo(340, 540, 440, 530, 460, 565); c.lineTo(464, 600); c.lineTo(652, 600); c.lineTo(660, 568);
  c.bezierCurveTo(690, 535, 805, 535, 836, 572); c.bezierCurveTo(852, 610, 856, 660, 850, 715);
  c.bezierCurveTo(842, 810, 792, 898, 707, 950); c.bezierCurveTo(670, 976, 630, 976, 600, 953);
  c.bezierCurveTo(500, 936, 382, 892, 326, 792); c.bezierCurveTo(296, 735, 300, 640, 328, 575); c.closePath();
  c.fillStyle = MUS; c.fill(); c.strokeStyle = MUS_D; c.lineWidth = 6; c.stroke();

  function tube(pts, w, col, dark) {
    function path() { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { var p = pts[i]; if (p.length === 6) c.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]); else c.lineTo(p[0], p[1]); } }
    c.lineCap = 'butt'; path(); c.strokeStyle = dark; c.lineWidth = w + 10; c.stroke();
    path(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  }
  /* pulmonary trunk and its two branches (behind the aorta) */
  tube([[508, 650], [508, 500]], 52, BLUE, BLUE_D);
  tube([[508, 500], [508, 470, 450, 452, 310, 442]], 44, BLUE, BLUE_D);
  tube([[508, 500], [508, 470, 560, 462, 660, 460], [850, 462]], 44, BLUE, BLUE_D);
  /* venae cavae */
  tube([[390, 330], [390, 600]], 50, BLUE, BLUE_D);
  tube([[262, 990], [262, 810], [262, 752, 280, 722, 300, 712], [352, 708]], 46, BLUE, BLUE_D);
  /* aorta: root, arch, and the first part of the descending aorta */
  tube([[598, 670], [598, 480], [598, 392, 640, 346, 712, 346], [782, 346, 822, 392, 822, 450], [822, 580]], 50, RED, RED_D);
  /* pulmonary veins */
  tube([[900, 596], [780, 596]], 34, RED, RED_D); tube([[900, 656], [780, 656]], 34, RED, RED_D);

  /* right atrium + right ventricle (oxygen-poor) */
  c.beginPath(); c.moveTo(340, 578); c.bezierCurveTo(360, 553, 438, 553, 455, 580); c.lineTo(458, 700); c.lineTo(340, 700); c.bezierCurveTo(328, 655, 330, 610, 340, 578); c.closePath();
  c.fillStyle = BLUE; c.fill(); c.strokeStyle = BLUE_D; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(350, 700); c.lineTo(470, 700); c.lineTo(470, 646); c.bezierCurveTo(480, 628, 536, 628, 546, 646); c.lineTo(548, 700);
  c.bezierCurveTo(556, 780, 592, 860, 628, 915); c.bezierCurveTo(540, 924, 432, 884, 376, 810); c.bezierCurveTo(352, 778, 346, 740, 350, 700); c.closePath();
  c.fillStyle = BLUE; c.fill(); c.strokeStyle = BLUE_D; c.lineWidth = 4; c.stroke();
  /* left atrium + left ventricle (oxygen-rich) */
  c.beginPath(); c.moveTo(672, 580); c.bezierCurveTo(700, 556, 800, 556, 830, 582); c.bezierCurveTo(844, 620, 844, 670, 838, 700); c.lineTo(662, 700); c.bezierCurveTo(654, 660, 656, 620, 672, 580); c.closePath();
  c.fillStyle = RED; c.fill(); c.strokeStyle = RED_D; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(576, 656); c.lineTo(620, 656); c.lineTo(640, 700); c.lineTo(838, 700); c.bezierCurveTo(842, 780, 800, 858, 740, 900);
  c.bezierCurveTo(710, 920, 685, 924, 668, 910); c.bezierCurveTo(640, 870, 612, 800, 592, 730); c.lineTo(576, 700); c.closePath();
  c.fillStyle = RED; c.fill(); c.strokeStyle = RED_D; c.lineWidth = 4; c.stroke();
  /* the aortic root's lumen continues up from the left ventricle */
  c.fillStyle = RED; c.fillRect(580, 480, 36, 190);

  function leaflet(pts) {
    function path() { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { var p = pts[i]; c.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]); } }
    path(); c.lineCap = 'round'; c.strokeStyle = CREAM_D; c.lineWidth = 17; c.stroke(); path(); c.strokeStyle = CREAM; c.lineWidth = 10; c.stroke();
  }
  function chord(x1, y1, x2, y2) { c.strokeStyle = '#f2e6c4'; c.lineWidth = 3; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function papillary(x, y, rx, ry, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fillStyle = MUS; c.fill(); c.strokeStyle = MUS_D; c.lineWidth = 3; c.stroke(); c.restore(); }
  /* tricuspid valve (right atrium to right ventricle) */
  papillary(398, 836, 22, 15, 0.5); papillary(468, 856, 20, 14, -0.4);
  chord(412, 772, 398, 826); chord(434, 768, 466, 846); chord(424, 770, 400, 826);
  leaflet([[350, 700], [358, 736, 388, 760, 416, 772]]); leaflet([[470, 700], [468, 730, 452, 752, 436, 766]]);
  /* mitral valve (left atrium to left ventricle) */
  papillary(716, 846, 22, 15, 0.4); papillary(790, 826, 20, 14, -0.5);
  chord(706, 780, 714, 832); chord(784, 774, 790, 816); chord(720, 784, 790, 816);
  leaflet([[646, 700], [650, 734, 678, 764, 708, 780]]); leaflet([[836, 700], [832, 730, 808, 758, 784, 774]]);
  /* aortic and pulmonary valves: two pocket-shaped cusps each */
  function cusps(x0, x1, y, dy) {
    var xm = (x0 + x1) / 2;
    c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + xm) / 2, y + dy * 2, xm, y); c.quadraticCurveTo((xm + x1) / 2, y + dy * 2, x1, y); c.closePath();
    c.fillStyle = CREAM; c.fill(); c.strokeStyle = CREAM_D; c.lineWidth = 5; c.stroke();
  }
  cusps(576, 620, 658, 20); cusps(472, 544, 646, 24);
  c.restore();

  /* labels in poster coordinates (the heart is shifted by 40, 10) */
  var LX = 262, RX = 950, F = 37, dx = 40, dy = 10;
  leaderLabel(c, ['Superior', 'vena cava'], LX, 380, 'ra', 390 + dx, 460 + dy, F);
  leaderLabel(c, ['Pulmonary', 'artery'], LX, 505, 'ra', 332 + dx, 442 + dy, F);
  leaderLabel(c, ['Right', 'atrium'], LX, 640, 'ra', 392 + dx, 636 + dy, F);
  leaderLabel(c, ['Pulmonary', 'valve'], LX, 765, 'ra', 508 + dx, 654 + dy, F);
  leaderLabel(c, ['Tricuspid', 'valve'], LX, 870, 'ra', 384 + dx, 746 + dy, F);
  leaderLabel(c, ['Right', 'ventricle'], LX, 975, 'ra', 452 + dx, 800 + dy, F);
  leaderLabel(c, ['Inferior', 'vena cava'], LX, 1090, 'ra', 262 + dx, 900 + dy, F);
  leaderLabel(c, ['Aorta'], RX, 330, 'la', 740 + dx, 346 + dy, F);
  leaderLabel(c, ['Pulmonary', 'veins'], RX, 500, 'la', 860 + dx, 596 + dy, F);
  leaderLabel(c, ['Left', 'atrium'], RX, 650, 'la', 760 + dx, 640 + dy, F);
  leaderLabel(c, ['Aortic', 'valve'], RX, 780, 'la', 602 + dx, 664 + dy, F);
  leaderLabel(c, ['Mitral', 'valve'], RX, 890, 'la', 808 + dx, 736 + dy, F);
  leaderLabel(c, ['Left', 'ventricle'], RX, 1000, 'la', 752 + dx, 866 + dy, F);
  leaderLabel(c, ['Septum'], RX, 1100, 'la', 596 + dx, 810 + dy, F);

  c.font = 'italic 30px ' + SANS; c.fillStyle = '#5b6a64'; c.textBaseline = 'middle';
  c.textAlign = 'left'; c.fillText("patient's right", 36, 1190); c.textAlign = 'right'; c.fillText("patient's left", W - 36, 1190);
  c.fillStyle = BLUE; c.fillRect(300, 1255, 56, 38); c.fillStyle = RED; c.fillRect(300, 1311, 56, 38);
  c.fillStyle = '#2a3a36'; c.textAlign = 'left'; c.font = 'bold 36px ' + SANS;
  c.fillText('oxygen-poor blood', 376, 1275); c.fillText('oxygen-rich blood', 376, 1331);
  c.fillStyle = '#5b6a64'; c.font = '28px ' + SANS; c.textAlign = 'center'; c.fillText('not to scale', W / 2, 1400);
}

function drawEyePoster(c, W, H) {
  posterHeader(c, W, 'THE EYE', 'horizontal section (schematic, simplified)');
  var CX = 450, CY = 600, R = 220, Ri = 207, D = Math.PI / 180, i;
  var AN = 143 * D;       /* the sclera ends at the limbus, 38 degrees either side of the axis */
  c.lineCap = 'butt'; c.lineJoin = 'round';
  function ring(r, w, col, a0, a1) { c.beginPath(); c.arc(CX, CY, r, a0, a1, false); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }

  /* optic nerve leaves the back of the globe a little below the axis */
  var na = 12 * D, nx = CX + R * Math.cos(na), ny = CY + R * Math.sin(na);
  c.fillStyle = '#e9d9ac'; c.strokeStyle = '#8a7a50'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(nx - 24, ny - 34); c.lineTo(nx + 150, ny - 26); c.lineTo(nx + 150, ny + 42); c.lineTo(nx - 12, ny + 40); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(138,122,80,0.5)'; c.lineWidth = 3; for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(nx, ny - 18 + i * 17); c.lineTo(nx + 150, ny - 12 + i * 17); c.stroke(); }

  /* vitreous humour fills the globe */
  c.beginPath(); c.arc(CX, CY, Ri, 0, 7); c.fillStyle = '#cfe4d9'; c.fill();

  /* sclera, choroid, retina */
  ring(R, 34, '#ece6d6', -AN, AN); ring(R + 17, 4, '#8c8576', -AN, AN); ring(Ri - 4, 3, '#8c8576', -AN, AN);
  ring(R - 25, 10, '#6d4c3d', -128 * D, 128 * D); ring(R - 36, 14, '#e9a28f', -126 * D, 126 * D);
  c.fillStyle = '#e9d9ac'; c.fillRect(nx - 16, ny - 24, 24, 54);
  /* fovea: a small pit on the retina, on the axis */
  c.beginPath(); c.ellipse(CX + R - 40, CY, 9, 24, 0, 0, 7); c.fillStyle = '#d6b445'; c.fill(); c.strokeStyle = '#8a6d1d'; c.lineWidth = 3; c.stroke();

  /* front of the eye: cornea circle through the two limbus points */
  var px = CX - R * Math.cos(38 * D), py = R * Math.sin(38 * D), apexX = CX - R - 34;
  var s = px - apexX, rc = (py * py + s * s) / (2 * s), ccx = apexX + rc, a1 = Math.atan2(py, px - ccx);
  c.save();
  c.beginPath(); c.arc(CX, CY, Ri, 0, 7); c.moveTo(ccx + rc, CY); c.arc(ccx, CY, rc - 8, 0, 7); c.clip();
  c.fillStyle = '#e8f4ef'; c.fillRect(0, 0, 330, H);
  c.restore();
  function cornea(r, w, col) { c.beginPath(); c.arc(ccx, CY, r, a1, 2 * Math.PI - a1, false); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
  cornea(rc, 16, '#d6ebe4'); cornea(rc + 8, 3, '#6f8c84'); cornea(rc - 8, 3, '#6f8c84');

  /* ciliary body and the fibres that hold the lens */
  var IX = 330;
  [-1, 1].forEach(function (sd) {
    c.fillStyle = '#c9a98c'; c.strokeStyle = '#7a5a3f'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(IX - 14, CY + sd * 168); c.lineTo(IX + 50, CY + sd * 160); c.lineTo(IX + 58, CY + sd * 118); c.lineTo(IX + 22, CY + sd * 126); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(110,84,56,0.8)'; c.lineWidth = 2;
    for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(IX + 52 + i * 3, CY + sd * (122 - i * 3)); c.lineTo(IX + 40 + i * 4, CY + sd * (66 - i * 4)); c.stroke(); }
  });
  /* lens */
  var lx = IX + 38;
  c.beginPath(); c.ellipse(lx, CY, 38, 68, 0, 0, 7); c.fillStyle = '#f2e7bf'; c.fill(); c.strokeStyle = '#a89a64'; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.ellipse(lx - 10, CY - 6, 14, 44, 0, 0, 7); c.fillStyle = 'rgba(255,252,236,0.55)'; c.fill();
  /* iris: two flaps around the pupil, in front of the lens */
  c.fillStyle = '#5f9a8a'; c.strokeStyle = '#2f5f53'; c.lineWidth = 4;
  [-1, 1].forEach(function (sd) {
    c.beginPath(); c.moveTo(IX - 8, CY + sd * 170); c.lineTo(IX + 10, CY + sd * 170); c.lineTo(IX + 10, CY + sd * 48); c.lineTo(IX - 8, CY + sd * 48); c.closePath(); c.fill(); c.stroke();
  });

  var F = 38;
  leaderLabel(c, ['Cornea'], 40, CY - 240, 'lt', apexX + 12, CY - 60, F);
  leaderLabel(c, ['Pupil'], 40, CY - 110, 'lt', IX, CY - 8, F);
  leaderLabel(c, ['Lens'], 40, CY + 90, 'lt', lx + 6, CY + 14, F);
  leaderLabel(c, ['Iris'], 40, CY + 235, 'lt', IX + 1, CY + 112, F);
  leaderLabel(c, ['Sclera'], W - 40, CY - 250, 'rt', CX + R * Math.cos(-48 * D), CY + R * Math.sin(-48 * D), F);
  leaderLabel(c, ['Retina'], W - 40, CY - 140, 'rt', CX + (R - 36) * Math.cos(-26 * D), CY + (R - 36) * Math.sin(-26 * D), F);
  leaderLabel(c, ['Fovea'], W - 40, CY - 40, 'rt', CX + R - 40, CY, F);
  leaderLabel(c, ['Optic nerve'], W - 40, CY + 230, 'rt', nx + 100, ny + 14, F);
  leaderLabel(c, ['Vitreous', 'humour'], W - 40, CY + 340, 'rt', CX + 60, CY + 90, F);

  c.font = '28px ' + SANS; c.fillStyle = '#5b6a64'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('not to scale', W / 2, H - 30);
}


/* ---------- height chart: a real centimetre scale; one unit is 7 cm, the floor is y = -13 ---------- */
function chartTex(T, cm0, cm1) {
  var W = 192, H = Math.round((cm1 - cm0) * 8);
  return tex(T, W, H, function (c, w, h) {
    c.fillStyle = '#e3ddcf'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3f7466'; c.fillRect(0, 0, 16, h);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    for (var cm = Math.ceil(cm0); cm <= cm1; cm++) {
      var y = h - (cm - cm0) * 8, len = cm % 10 === 0 ? 70 : cm % 5 === 0 ? 46 : 26;
      c.strokeStyle = cm % 10 === 0 ? '#243a35' : '#4f625c'; c.lineWidth = cm % 10 === 0 ? 4 : 2;
      c.beginPath(); c.moveTo(16, y); c.lineTo(16 + len, y); c.stroke();
      if (cm % 10 === 0) { c.fillStyle = '#243a35'; c.font = 'bold 44px ' + SANS; c.fillText(String(cm), 98, y); }
    }
    c.fillStyle = '#c9776a'; c.font = 'bold 30px ' + SANS; c.textAlign = 'left'; c.fillText('cm', 98, 32);
  });
}

function signTex(T, text) {
  return tex(T, 512, 160, function (c, w, h) {
    c.fillStyle = '#e3ddcf'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3f7466'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#243a35'; c.font = 'bold 84px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2 + 4);
  });
}

function printTex(T) {
  return tex(T, 512, 384, function (c, w, h) {
    var i, r = mulberry(5);
    c.fillStyle = '#ebe5d6'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#5f9a84'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(120, 350); c.bezierCurveTo(150, 250, 240, 200, 380, 60); c.stroke();
    for (i = 0; i < 9; i++) {
      var t = 0.12 + i * 0.1, px = 120 + (380 - 120) * t + Math.sin(t * 6) * 18, py = 350 - (350 - 60) * t, side = i % 2 ? 1 : -1;
      c.save(); c.translate(px, py); c.rotate(side * 0.9 - 0.5); c.beginPath(); c.ellipse(side * 34, 0, 40, 15, 0, 0, 7); c.fillStyle = i % 3 ? '#78b49c' : '#a9d0bc'; c.fill(); c.restore();
    }
    for (i = 0; i < 5; i++) { c.beginPath(); c.arc(300 + r() * 110, 70 + r() * 90, 11 + r() * 5, 0, 7); c.fillStyle = '#e58a78'; c.fill(); }
  });
}

/* a round wall clock face, hands at ten past ten */
function clockTex(T) {
  return tex(T, 256, 256, function (c) {
    c.fillStyle = '#e3ddcf'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill();
    c.strokeStyle = '#243a35'; c.lineCap = 'round';
    for (var i = 0; i < 12; i++) { var a = i / 12 * PI * 2; c.lineWidth = i % 3 ? 5 : 9; c.beginPath(); c.moveTo(128 + Math.sin(a) * 98, 128 - Math.cos(a) * 98); c.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); c.stroke(); }
    c.lineWidth = 9; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 58 * Math.sin(-1.05), 128 - 58 * Math.cos(-1.05)); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 92 * Math.sin(0.6), 128 - 92 * Math.cos(0.6)); c.stroke();
    c.fillStyle = '#c9776a'; c.beginPath(); c.arc(128, 128, 9, 0, 7); c.fill();
  });
}

/* ---------- the patient monitor's screen: ECG and plethysmograph sweeping, steady numbers ---------- */
var HR = 72, BEAT = 60 / HR, SPEED = 110;
function bump(p, c, w, a) { var d = (p - c) / w; return a * Math.exp(-d * d); }
function ecg(t) {
  var p = (((t % BEAT) + BEAT) % BEAT) / BEAT;
  return bump(p, 0.12, 0.035, 0.13) + bump(p, 0.232, 0.009, -0.13) + bump(p, 0.258, 0.011, 1) + bump(p, 0.285, 0.011, -0.22) + bump(p, 0.5, 0.05, 0.26);
}
function pleth(t) {
  var p = ((((t - 0.2) % BEAT) + BEAT) % BEAT) / BEAT;
  return 0.05 + bump(p, 0.3, 0.11, 0.9) + bump(p, 0.58, 0.08, 0.3);
}
function monitorBase(W, H) {
  var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
  x.fillStyle = '#07110f'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#1b2b27'; x.lineWidth = 3; x.beginPath(); x.moveTo(712, 20); x.lineTo(712, H - 20); x.moveTo(30, 318); x.lineTo(690, 318); x.stroke();
  x.textBaseline = 'middle'; x.textAlign = 'left';
  x.fillStyle = '#5ee79a'; x.font = 'bold 40px ' + SANS; x.fillText('ECG II', 34, 46);
  x.fillStyle = '#6fd9d3'; x.fillText('PLETH', 34, 360);
  x.fillStyle = '#5ee79a'; x.font = 'bold 36px ' + SANS; x.fillText('HR  bpm', 736, 46);
  x.font = 'bold 190px ' + SANS; x.fillText(String(HR), 736, 160);
  x.fillStyle = '#6fd9d3'; x.font = 'bold 36px ' + SANS; x.fillText('SpO2  %', 736, 266);
  x.font = 'bold 150px ' + SANS; x.fillText('98', 736, 360);
  x.fillStyle = '#f0d9d0'; x.font = 'bold 36px ' + SANS; x.fillText('NIBP  mmHg', 736, 456);
  x.font = 'bold 76px ' + SANS; x.fillText('120/80', 736, 520);
  x.font = 'bold 44px ' + SANS; x.fillText('(93)', 736, 586);
  x.fillStyle = '#e6d27a'; x.font = 'bold 38px ' + SANS; x.fillText('RESP 16', 34, 604); x.fillText('TEMP 36.8', 300, 604);
  return c;
}
function trace(x, x0, w, base, amp, fn, t, color, delay) {
  var head = (t * SPEED) % w, gap = 40, i, age, pts, run;
  x.strokeStyle = color; x.lineWidth = 5; x.lineJoin = 'round'; x.lineCap = 'round';
  function seg(a, b) {
    x.beginPath();
    for (i = a; i <= b; i += 2) { age = ((head - i) % w + w) % w; var y = base - fn(t - age / SPEED - (delay || 0)) * amp; if (i === a) x.moveTo(x0 + i, y); else x.lineTo(x0 + i, y); }
    x.stroke();
  }
  seg(0, head); if (head + gap < w) seg(head + gap, w);
}
function drawMonitor(x, base, W, H, t) {
  x.drawImage(base, 0, 0);
  x.save(); x.beginPath(); x.rect(30, 70, 664, 240); x.clip(); trace(x, 30, 660, 262, 170, ecg, t, '#5ee79a'); x.restore();
  x.save(); x.beginPath(); x.rect(30, 380, 664, 200); x.clip(); trace(x, 30, 660, 540, 120, pleth, t, '#6fd9d3'); x.restore();
}

ENV.clinic = function (T) {
  var g = new T.Group(), rnd = mulberry(23), i, j;
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var W = baker(T);
  var shadowTex = canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  var SH = shadowBaker(T, shadowTex);
  function B(w, h, d, hex, x, y, z, parent, cap) { W.box(w, h, d, hex, x, y, z, parent, cap); }
  function R(w, h, d, hex, x, y, z, rx, ry, rz, parent, cap) { W.box(w, h, d, hex, x, y, z, parent, cap, rx, ry, rz); }
  function Cy(rt, rb, h, hex, x, y, z, parent, cap, rx, ry, rz) { W.cyl(rt, rb, h, hex, x, y, z, parent, cap, rx, ry, rz); }
  function shade(x, y, z, w, d, op) { SH.add(x, y, z, w, d, op); }
  function tube(pts, r, hex, parent, cap) {
    var curve = new T.CatmullRomCurve3(pts.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }));
    W.geo(new T.TubeGeometry(curve, 28, r, 8, false), hex, 0, 0, 0, 0, 0, 0, 1, 1, 1, parent, cap);
  }
  /* a printed sheet floating 0.1 in front of a solid (never in the same plane) */
  function decal(map, w, h, x, y, z, parent, tint) {
    var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: map, color: tint || 0xffffff, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.position.set(x, y, z); m.renderOrder = 3; (parent || g).add(m); return m;
  }
  var OAK = '#d3b48a', OAK_D = '#bf9c70', WHITE = '#e0ddd2', SEA = '#a9d4c3', SEA_D = '#6fb09c', CORAL = '#e58a78', TOPCAP = 0.76;

  /* light: the shared budget, warm */
  g.add(new T.HemisphereLight(0xfff3e4, 0x8d7f6c, 0.5));
  var key = new T.DirectionalLight(0xffecd6, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xf2ebe2, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe8cc, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---------- shell ---------- */
  var floor = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshStandardMaterial({ map: floorTex(T, [XS * 2 / 17.2, (ZF - ZB) / 17.2]), color: new T.Color(0.95, 0.95, 0.95), roughness: 0.9, metalness: 0 }));
  floor.rotation.x = -PI / 2; floor.position.set(0, FLOOR, ZC); floor.renderOrder = -3; g.add(floor);

  var upperTex = tex(T, 1024, 256, function (c, w, h) {
    var gr = c.createLinearGradient(0, 0, 0, h), r = mulberry(9), n; gr.addColorStop(0, '#b9dccd'); gr.addColorStop(1, '#a6d1bf'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (n = 0; n < 60; n++) { var rd = 30 + r() * 80, bx = r() * w, by = r() * h, rg = c.createRadialGradient(bx, by, 0, bx, by, rd); rg.addColorStop(0, r() < 0.5 ? 'rgba(255,255,240,0.06)' : 'rgba(60,110,90,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(bx - rd, by - rd, rd * 2, rd * 2); }
  });
  var dadoTex = tex(T, 640, 256, function (c, w, h) {
    c.fillStyle = '#dbd7ca'; c.fillRect(0, 0, w, h);
    for (var n = 0; n < 5; n++) { c.fillStyle = 'rgba(110,104,88,0.4)'; c.fillRect(n * 128, 0, 5, h); c.fillStyle = 'rgba(255,255,248,0.4)'; c.fillRect(n * 128 + 5, 0, 3, h); }
  });
  var ceilTex = tex(T, 512, 512, function (c, w, h) {
    var r = mulberry(31), n; c.fillStyle = '#cfd1c8'; c.fillRect(0, 0, w, h);
    for (n = 0; n < 1400; n++) { c.fillStyle = 'rgba(120,122,110,' + (0.04 + r() * 0.06) + ')'; c.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
    c.strokeStyle = '#a6a89c'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.moveTo(0, 256); c.lineTo(w, 256); c.moveTo(0, 0); c.lineTo(0, h); c.moveTo(256, 0); c.lineTo(256, h); c.stroke();
  }, { repeat: [XS * 2 / 17.2, (ZF - ZB) / 17.2] });
  var DADO_TOP = -1.5;
  function wallPanel(L, x, z, ry) {
    var p = new T.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    var upH = CEIL - DADO_TOP, loH = DADO_TOP - FLOOR;
    var up = new T.Mesh(new T.PlaneGeometry(L, upH), new T.MeshBasicMaterial({ map: upperTex })); up.position.y = DADO_TOP + upH / 2; up.renderOrder = -3; p.add(up);
    var dt = dadoTex.clone(); dt.needsUpdate = true; dt.wrapS = dt.wrapT = T.RepeatWrapping; dt.repeat.set(L / 8, 1);
    var lo = new T.Mesh(new T.PlaneGeometry(L, loH), new T.MeshBasicMaterial({ map: dt })); lo.position.y = FLOOR + loH / 2; lo.renderOrder = -3; p.add(lo);
    B(L, 0.7, 0.55, OAK, 0, DADO_TOP, 0.28, p); B(L, 1.2, 0.4, '#d6d2c6', 0, FLOOR + 0.6, 0.2, p); B(L, 0.9, 0.5, '#d6d8cc', 0, CEIL - 0.45, 0.25, p);
    return p;
  }
  wallPanel(XS * 2, 0, ZB, 0); var LW = wallPanel(ZF - ZB, -XS, ZC, PI / 2), RW = wallPanel(ZF - ZB, XS, ZC, -PI / 2);
  var ceil = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshBasicMaterial({ map: ceilTex })); ceil.rotation.x = PI / 2; ceil.position.set(0, CEIL, ZC); ceil.renderOrder = -3; g.add(ceil);

  /* ---------- oak table: x -38..22, z -13.5..9.5 ---------- */
  var TX0 = -38, TX1 = 22, TZ0 = -13.5, TZ1 = 9.5, TCX = (TX0 + TX1) / 2, TCZ = (TZ0 + TZ1) / 2, TW = TX1 - TX0, TD = TZ1 - TZ0, TTH = 1.1;
  var topMat = new T.MeshStandardMaterial({ map: woodTex(T, 3, '#d5b78d', 1024, 512, false), color: new T.Color(0.8, 0.8, 0.8), roughness: 0.85, metalness: 0 });
  var sideMat = new T.MeshStandardMaterial({ color: litColor(new T.Color(OAK_D)), roughness: 0.88, metalness: 0 });
  var tgeo = new T.BoxGeometry(TW, TTH, TD); tgeo.clearGroups(); tgeo.addGroup(0, 12, 0); tgeo.addGroup(12, 6, 1); tgeo.addGroup(18, 18, 0);
  var tableTop = new T.Mesh(tgeo, [sideMat, topMat]); tableTop.position.set(TCX, -0.03 - TTH / 2, TCZ); g.add(tableTop);
  var ay = -0.03 - TTH - 1.0;
  B(TW - 4.4, 2.0, 0.9, OAK_D, TCX, ay, TZ1 - 1.5); B(TW - 4.4, 2.0, 0.9, OAK_D, TCX, ay, TZ0 + 1.5);
  B(0.9, 2.0, TD - 4.4, OAK_D, TX1 - 1.5, ay, TCZ); B(0.9, 2.0, TD - 4.4, OAK_D, TX0 + 1.5, ay, TCZ);
  var legH = -0.03 - TTH - FLOOR, legGeo = new T.CylinderGeometry(0.85, 0.65, legH, 4);
  [[TX0 + 1.5, TZ0 + 1.5], [TX1 - 1.5, TZ0 + 1.5], [TX0 + 1.5, TZ1 - 1.5], [TX1 - 1.5, TZ1 - 1.5]].forEach(function (l) {
    W.geo(legGeo, OAK_D, l[0], FLOOR + legH / 2, l[1], 0, PI / 4, 0, 1, 1, 1); shade(l[0], FLOOR + 0.07, l[1], 4.4, 4.4, 0.5);
  });
  shade(TCX, FLOOR + 0.05, TCZ, 66, 30, 0.35);
  var tableShadow = contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5); tableShadow.renderOrder = 2;   /* the stage sizes this under the subject */
  tableShadow.material.polygonOffset = true; tableShadow.material.polygonOffsetFactor = -2; tableShadow.material.polygonOffsetUnits = -2;

  /* ---------- sink counter: x -31..-11 against the back wall ---------- */
  var CX0 = -31, CX1 = -11, CW = CX1 - CX0, CCX = (CX0 + CX1) / 2, CZ0 = -18.6, CZ1 = -14.1, SBX = -21.5, SBZ = -16.35, HW = 3.4, HD = 1.5;
  B(0.5, 12.9, 3.9, OAK, CX0 + 0.25, -6.05, -16.5); B(0.5, 12.9, 3.9, OAK, CX1 - 0.25, -6.05, -16.5);
  B(CW - 1, 12.9, 0.3, OAK_D, CCX, -6.05, -18.35); B(CW - 1, 0.4, 3.9, OAK_D, CCX, -12.3, -16.5);
  B(CW, 0.6, 3.4, '#a09c90', CCX, -12.7, -16.6);
  [-25.7, -15.9].forEach(function (dx, n) {
    B(9.6, 12.3, 0.3, OAK, dx, -6.0, -14.4); B(8.2, 10.9, 0.1, '#c9a97c', dx, -6.0, -14.2);
    Cy(0.28, 0.28, 0.3, CORAL, n ? dx - 3.9 : dx + 3.9, -2.2, -14.0, null, null, PI / 2);
  });
  var CTOP = 1.0, topCol = '#e4dcc8';
  B(CW, 0.6, 0.75, topCol, CCX, 0.7, CZ0 + 0.375, null, 0.66); B(CW, 0.6, 0.75, topCol, CCX, 0.7, CZ1 - 0.375, null, 0.66);
  B(SBX - HW - CX0, 0.6, 3.0, topCol, (CX0 + SBX - HW) / 2, 0.7, SBZ, null, 0.66); B(CX1 - SBX - HW, 0.6, 3.0, topCol, (CX1 + SBX + HW) / 2, 0.7, SBZ, null, 0.66);
  /* the basin: four walls and a floor below the opening */
  B(0.2, 3.0, 2 * HD, '#cfccc1', SBX - HW + 0.1, -0.5, SBZ); B(0.2, 3.0, 2 * HD, '#cfccc1', SBX + HW - 0.1, -0.5, SBZ);
  B(2 * HW, 3.0, 0.2, '#cfccc1', SBX, -0.5, SBZ - HD + 0.1); B(2 * HW, 3.0, 0.2, '#cfccc1', SBX, -0.5, SBZ + HD - 0.1);
  B(2 * HW, 0.2, 2 * HD, '#bdbab0', SBX, -2.0, SBZ, null, TOPCAP); Cy(0.4, 0.4, 0.05, '#7d7a70', SBX, -1.88, SBZ);
  /* tap: a gooseneck over the basin, and a lever */
  var metalHex = '#bcc0be';
  Cy(0.6, 0.7, 0.5, metalHex, SBX, 1.25, -18.15);
  tube([[SBX, 1.4, -18.15], [SBX, 3.4, -18.15], [SBX, 4.9, -17.9], [SBX, 5.3, -17.0], [SBX, 4.8, -16.2], [SBX, 4.2, -16.0]], 0.21, metalHex);
  Cy(0.28, 0.28, 0.6, metalHex, SBX, 4.1, -16.0); Cy(0.12, 0.12, 1.9, metalHex, SBX + 1.2, 1.8, -18.15, null, null, 0, 0, PI / 2 - 0.3);
  /* wall soap dispenser and paper towel dispenser, and a few things on the counter */
  B(1.8, 4.0, 1.7, WHITE, -16.5, 5.6, -18.05); B(0.9, 2.2, 0.12, SEA_D, -16.5, 5.9, -17.14); B(0.5, 0.3, 1.6, CORAL, -16.5, 3.9, -17.2);
  B(4.2, 5.2, 2.2, WHITE, -27.3, 6.4, -17.8); B(3.0, 0.5, 0.15, '#7f7c72', -27.3, 4.4, -16.65); B(1.2, 0.5, 0.15, CORAL, -27.3, 8.0, -16.65);
  var jar = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 1.9, 18), new T.MeshStandardMaterial({ color: 0xdfece6, transparent: true, opacity: 0.5, roughness: 0.9, depthWrite: false })); jar.position.set(-27.6, CTOP + 0.95, -17.7); jar.renderOrder = 4; g.add(jar);
  for (i = 0; i < 6; i++) R(0.14, 2.2, 0.5, '#d8bf94', -27.6 + (i - 2.5) * 0.22, CTOP + 1.15 + (i % 2) * 0.1, -17.7, 0, 0, (i - 2.5) * 0.06);
  B(1.8, 1.0, 1.2, CORAL, -12.9, CTOP + 0.5, -17.3); B(0.9, 0.04, 0.5, '#eee9dc', -12.9, CTOP + 1.02, -17.3, null, TOPCAP);
  Cy(0.5, 0.5, 1.5, WHITE, -14.9, CTOP + 0.75, -17.6); Cy(0.2, 0.2, 0.3, CORAL, -14.9, CTOP + 1.65, -17.6); B(0.8, 0.14, 0.14, CORAL, -14.7, CTOP + 1.85, -17.6);
  shade(-12.9, CTOP + 0.02, -17.3, 2.6, 2.2, 0.4); shade(-14.9, CTOP + 0.02, -17.6, 1.8, 1.8, 0.4); shade(-27.6, CTOP + 0.02, -17.7, 2.0, 2.0, 0.4);
  shade(CCX, FLOOR + 0.07, -16.3, 24, 7, 0.5);
  /* stethoscope on a hook above the counter */
  var HX = -13.6, HY = 12.6, hz = -18.2, scol = '#d9786a';
  B(1.1, 1.6, 0.25, metalHex, HX, HY, -18.8); Cy(0.14, 0.14, 1.0, metalHex, HX, HY + 0.2, -18.2, null, null, PI / 2); Cy(0.14, 0.14, 0.5, metalHex, HX, HY + 0.45, -17.7);
  tube([[HX - 0.5, HY - 4.2, hz], [HX - 0.5, HY - 0.6, hz], [HX, HY + 0.6, hz], [HX + 0.5, HY - 0.6, hz], [HX + 0.5, HY - 5.0, hz], [HX + 0.5, HY - 9.0, hz]], 0.16, scol);
  tube([[HX - 0.5, HY - 4.2, hz], [HX - 0.6, HY - 5.4, hz + 0.25], [HX - 0.5, HY - 6.6, hz + 0.4]], 0.1, '#aeb2b0');
  tube([[HX - 0.5, HY - 4.2, hz], [HX - 0.2, HY - 5.4, hz + 0.45], [HX - 0.1, HY - 6.6, hz + 0.55]], 0.1, '#aeb2b0');
  Cy(0.9, 0.9, 0.3, '#aeb2b0', HX + 0.5, HY - 9.6, hz, null, null, PI / 2); Cy(0.45, 0.45, 0.3, '#aeb2b0', HX + 0.5, HY - 9.6, hz + 0.28, null, null, PI / 2);

  /* ---------- anatomy posters ---------- */
  function poster(map, w, h, x, y) {
    var fw = 0.4, d = 0.5, wz = ZB + 0.1, zc = wz + d / 2;
    B(w + 2 * fw, fw, d, OAK, x, y + h / 2 + fw / 2, zc); B(w + 2 * fw, fw, d, OAK, x, y - h / 2 - fw / 2, zc);
    B(fw, h, d, OAK, x - w / 2 - fw / 2, y, zc); B(fw, h, d, OAK, x + w / 2 + fw / 2, y, zc);
    B(w - 0.06, h - 0.06, 0.3, '#cfc8b8', x, y, wz + 0.15);
    decal(map, w - 0.06, h - 0.06, x, y, wz + 0.4);
  }
  poster(tex(T, 1160, 1440, function (c, w, h) { drawHeartPoster(c, w, h); }), 13.9, 17.25, -2.5, 14.9);
  poster(tex(T, 900, 1100, function (c, w, h) { drawEyePoster(c, w, h); }), 9.6, 11.73, -24.5, 15.9);

  /* ---------- height chart ---------- */
  var cm0 = 88, cm1 = 204, yBot = FLOOR + cm0 / 7, yTop = FLOOR + cm1 / 7, chH = yTop - yBot, chX = 7.0;
  B(3.4, chH, 0.3, '#cfc8b8', chX, (yBot + yTop) / 2, ZB + 0.25); decal(chartTex(T, cm0, cm1), 3.4, chH, chX, (yBot + yTop) / 2, ZB + 0.5);
  B(3.4 + 0.6, 0.3, 0.5, OAK, chX, yTop + 0.15, ZB + 0.35); B(3.4 + 0.6, 0.3, 0.5, OAK, chX, yBot - 0.15, ZB + 0.35);
  B(3.0, 0.3, 1.2, CORAL, chX + 0.2, FLOOR + 163 / 7, ZB + 1.15);   /* the sliding headpiece, set at 163 cm */

  /* ---------- supply cabinet: glass doors, shelves, neatly stacked supplies ---------- */
  var KX0 = 10, KX1 = 24, KY0 = 8, KY1 = 22, KZ0 = -18.9, KZ1 = -15.5, KCX = (KX0 + KX1) / 2, KZC = (KZ0 + KZ1) / 2;
  B(0.5, KY1 - KY0, 3.4, OAK, KX0 + 0.25, (KY0 + KY1) / 2, KZC); B(0.5, KY1 - KY0, 3.4, OAK, KX1 - 0.25, (KY0 + KY1) / 2, KZC);
  B(KX1 - KX0, 0.5, 3.4, OAK, KCX, KY0 + 0.25, KZC); B(KX1 - KX0, 0.5, 3.4, OAK, KCX, KY1 - 0.25, KZC);
  B(KX1 - KX0 - 1, KY1 - KY0 - 1, 0.2, '#cfcbbf', KCX, (KY0 + KY1) / 2, KZ0 + 0.1);
  var CHT = (KY1 - KY0 - 1.0 - 0.8) / 3, shelfY = [KY0 + 0.5 + CHT, KY0 + 0.5 + CHT + 0.4 + CHT];
  shelfY.forEach(function (y) { B(KX1 - KX0 - 1, 0.4, 3.3, OAK_D, KCX, y + 0.2, KZC); });
  var gm = new T.MeshBasicMaterial({ map: tex(T, 128, 256, function (c, w, h) { c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(20, 0); c.lineTo(54, 0); c.lineTo(10, h); c.lineTo(-24, h); c.fill(); c.fillRect(70, 0, 8, h); }), transparent: true, depthWrite: false });
  var dw = (KX1 - KX0) / 2 - 0.05, dh = KY1 - KY0 - 0.2;
  [KX0 + dw / 2 + 0.025, KX1 - dw / 2 - 0.025].forEach(function (dx, n) {
    var dz = KZ1 + 0.17, fwid = 0.55;
    B(dw, fwid, 0.34, OAK, dx, KY1 - 0.1 - fwid / 2, dz); B(dw, fwid, 0.34, OAK, dx, KY0 + 0.1 + fwid / 2, dz);
    B(fwid, dh, 0.34, OAK, dx - dw / 2 + fwid / 2, (KY0 + KY1) / 2, dz); B(fwid, dh, 0.34, OAK, dx + dw / 2 - fwid / 2, (KY0 + KY1) / 2, dz);
    var gl = new T.Mesh(new T.PlaneGeometry(dw - 2 * fwid + 0.1, dh - 2 * fwid + 0.1), gm); gl.position.set(dx, (KY0 + KY1) / 2, dz); gl.renderOrder = 5; g.add(gl);
    Cy(0.2, 0.2, 2.2, CORAL, n ? dx - dw / 2 + 0.9 : dx + dw / 2 - 0.9, (KY0 + KY1) / 2, dz + 0.32);
  });
  /* the supplies */
  var sy0 = KY0 + 0.5, packCol = ['#a9d4c3', '#e0ddd2', '#e58a78', '#d3b48a', '#e0ddd2'], px, hs = [3.0, 3.4, 2.8, 3.2, 3.0];
  for (i = 0; i < 5; i++) {
    px = 11.9 + i * 2.35; B(2.1, hs[i], 2.3, packCol[i], px, sy0 + hs[i] / 2, -17.3);
    B(1.7, 0.8, 0.06, i % 2 ? '#a9d4c3' : '#e0ddd2', px, sy0 + hs[i] * 0.55, -16.12);
  }
  B(1.3, 2.4, 2.0, '#c9a97c', 22.9, sy0 + 1.2, -17.3);
  var y1 = shelfY[0] + 0.4;
  for (j = 0; j < 4; j++) B(3.7, 0.38, 2.4, j % 2 ? '#a9d4c3' : '#e0ddd2', 12.4, y1 + 0.19 + j * 0.38, -17.2);
  for (j = 0; j < 5; j++) B(3.7, 0.38, 2.4, j % 2 ? '#e0ddd2' : '#a9d4c3', 12.4, y1 + 0.19 + 1.9 + j * 0.38, -17.2);
  for (j = 0; j < 3; j++) {
    Cy(0.58, 0.58, 1.2, '#e0ddd2', 15.6 + j * 1.3, y1 + 0.6, -17.6); Cy(0.6, 0.6, 0.2, '#e58a78', 15.6 + j * 1.3, y1 + 0.75, -17.6);
    Cy(0.58, 0.58, 1.2, '#e0ddd2', 15.6 + j * 1.3, y1 + 0.6, -16.3); Cy(0.6, 0.6, 0.2, '#a9d4c3', 15.6 + j * 1.3, y1 + 0.75, -16.3);
  }
  B(3.4, 1.6, 2.4, '#e58a78', 20.9, y1 + 0.8, -17.2); B(3.2, 0.9, 0.06, '#e0ddd2', 20.9, y1 + 0.8, -15.98); B(2.8, 1.0, 2.2, '#d3b48a', 20.9, y1 + 2.1, -17.2);
  var y2 = shelfY[1] + 0.4;
  [[12.0, '#a9d4c3'], [14.1, '#e0ddd2'], [16.2, '#a9d4c3']].forEach(function (jr) { Cy(0.85, 0.85, 2.4, jr[1], jr[0], y2 + 1.2, -17.3); Cy(0.9, 0.9, 0.35, '#e58a78', jr[0], y2 + 2.55, -17.3); });
  [18.2, 19.5].forEach(function (bx) { Cy(0.55, 0.55, 3.0, '#b98f5e', bx, y2 + 1.5, -17.5); Cy(0.3, 0.3, 0.7, '#e0ddd2', bx, y2 + 3.3, -17.5); });
  for (j = 0; j < 3; j++) { B(2.2, 1.5, 2.2, j % 2 ? '#e0ddd2' : '#a9d4c3', 21.9, y2 + 0.75 + j * 1.5, -17.2); B(1.9, 0.3, 0.06, '#e58a78', 21.9, y2 + 0.75 + j * 1.5, -16.06); }
  /* glove boxes on a wall rack below the cabinet */
  B(9.6, 0.4, 1.6, OAK_D, 16.2, 3.1, -18.1); B(9.6, 0.4, 0.3, OAK_D, 16.2, 3.3, -17.15); B(0.3, 1.0, 1.6, OAK_D, 11.25, 3.5, -18.1); B(0.3, 1.0, 1.6, OAK_D, 21.15, 3.5, -18.1);
  [['#e58a78', 12.7], ['#a9d4c3', 15.6], ['#e0ddd2', 18.5]].forEach(function (gb) { B(2.6, 3.4, 1.5, gb[0], gb[1], 5.0, -18.1); B(1.6, 1.1, 0.06, gb[0] === '#e0ddd2' ? '#a9d4c3' : '#e0ddd2', gb[1], 5.4, -17.28); });

  /* ---------- exam bed on the right: head end raised, paper roll, pad on a drawer base ---------- */
  var BX0 = 40, BX1 = 58, BZC = -13.4, BW = 9.8, PADTOP = -0.6, PADH = 1.4, SEAPAD = '#7cb8a4', paperHex = '#e6e3d8';
  B(16.4, 10.05, 7.0, WHITE, 46.7, -7.38, BZC); B(16.8, 0.6, 7.0, '#a09c90', 46.7, -12.7, BZC - 0.2);
  [-10.4, -7.5, -4.6].forEach(function (y) { B(7.8, 2.7, 0.25, OAK, 42.6, y, BZC + 3.6); Cy(0.25, 0.25, 0.3, CORAL, 42.6, y, BZC + 3.85, null, null, PI / 2); });
  B(7.0, 8.4, 0.25, OAK_D, 51.2, -7.7, BZC + 3.6); Cy(0.25, 0.25, 0.3, CORAL, 48.6, -7.7, BZC + 3.85, null, null, PI / 2);
  B(BX1 - BX0, 0.35, BW - 0.4, '#cfccc0', (BX0 + BX1) / 2, -2.2, BZC);
  var padGeo = roundedBox(T, BX1 - BX0, BW, PADH, 0.9, 0.25, null).geometry, hpadGeo = roundedBox(T, 6.5, BW, PADH, 0.9, 0.25, null).geometry;
  W.geo(padGeo, SEAPAD, (BX0 + BX1) / 2, PADTOP - PADH / 2, BZC, -PI / 2, 0, 0, 1, 1, 1);
  B(BX1 - BX0 - 0.6, 0.1, BW - 1.4, paperHex, (BX0 + BX1) / 2, PADTOP + 0.06, BZC, null, TOPCAP);
  /* raised head section, hinged at x = 40 on the pad's top edge */
  var head = new T.Group(); head.position.set(BX0, PADTOP, BZC); head.rotation.z = -0.52; g.add(head);
  W.geo(hpadGeo, SEAPAD, -3.25, -PADH / 2, 0, -PI / 2, 0, 0, 1, 1, 1, head);
  B(6.4, 0.35, BW - 0.4, '#cfccc0', -3.3, -PADH - 0.175, 0, head); B(5.9, 0.1, BW - 1.4, paperHex, -3.25, 0.06, 0, head, TOPCAP);
  Cy(0.8, 0.8, BW - 1.0, '#e6e3d8', -7.0, 0.85, 0, head, 0.7, PI / 2); Cy(0.3, 0.3, BW - 0.2, '#a09c90', -7.0, 0.85, 0, head, null, PI / 2);
  [-1, 1].forEach(function (sd) { B(0.4, 1.8, 0.4, '#bcc0be', -7.0, 0.5, sd * (BW / 2 - 0.2), head); });
  (function () {
    var a = new T.Vector3(39.0, -2.3, BZC), b = new T.Vector3(35.7, 0.0, BZC), len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5), rz = Math.atan2(b.x - a.x, b.y - a.y);
    Cy(0.22, 0.22, len, '#bcc0be', mid.x, mid.y, mid.z, null, null, 0, 0, -rz);
  })();
  /* folded coral blanket at the foot */
  B(5.4, 0.35, 7.2, CORAL, 54.8, PADTOP + 0.29, BZC, null, TOPCAP); B(5.4, 0.35, 7.2, '#e0ddd2', 54.8, PADTOP + 0.64, BZC, null, TOPCAP); B(5.2, 0.12, 7.0, '#f0a898', 54.8, PADTOP + 0.875, BZC, null, TOPCAP);
  shade(46.6, FLOOR + 0.07, BZC, 28, 11, 0.5);

  /* step stool in front of the bed */
  var SX = 45, SZ = -5.2;
  [-2.7, 2.7].forEach(function (s) { B(0.4, 2.8, 4.8, OAK, SX + s, FLOOR + 1.4, SZ); B(0.4, 5.4, 2.6, OAK, SX + s, FLOOR + 2.7, SZ - 1.1); });
  B(5.6, 0.4, 4.8, OAK_D, SX, FLOOR + 2.8, SZ); B(5.6, 0.4, 2.6, OAK_D, SX, FLOOR + 5.4, SZ - 1.1);
  B(5.2, 0.12, 2.0, CORAL, SX, FLOOR + 3.06, SZ + 1.35, null, TOPCAP); B(5.2, 0.12, 2.2, CORAL, SX, FLOOR + 5.66, SZ - 1.1, null, TOPCAP);
  shade(SX, FLOOR + 0.07, SZ - 0.4, 8.6, 7.4, 0.5);

  /* the clinician's rolling stool, left of the table */
  (function () {
    var sx = -43, sz = 5, ang, k;
    Cy(2.5, 2.5, 0.9, CORAL, sx, FLOOR + 9.4, sz); Cy(2.2, 2.2, 0.3, '#8f8c82', sx, FLOOR + 8.8, sz); Cy(0.35, 0.35, 7.4, '#b4b0a4', sx, FLOOR + 5.0, sz);
    for (k = 0; k < 5; k++) {
      ang = k / 5 * PI * 2 + 0.5; R(2.8, 0.4, 0.55, '#8f8c82', sx + Math.cos(ang) * 1.4, FLOOR + 1.0, sz + Math.sin(ang) * 1.4, 0, -ang, 0);
      Cy(0.4, 0.4, 0.5, '#5c5a52', sx + Math.cos(ang) * 2.7, FLOOR + 0.5, sz + Math.sin(ang) * 2.7);
    }
    shade(sx, FLOOR + 0.07, sz, 7.4, 7.4, 0.45);
  })();

  /* back wall, right: a botanical print and a wall diagnostic set above the bed */
  (function () {
    var px = 47, py = 15, fw = 0.4, zc = ZB + 0.35, w = 7.0, h = 5.3;
    B(w + 2 * fw, fw, 0.5, OAK, px, py + h / 2 + fw / 2, zc); B(w + 2 * fw, fw, 0.5, OAK, px, py - h / 2 - fw / 2, zc);
    B(fw, h, 0.5, OAK, px - w / 2 - fw / 2, py, zc); B(fw, h, 0.5, OAK, px + w / 2 + fw / 2, py, zc);
    B(w - 0.06, h - 0.06, 0.3, '#cfc8b8', px, py, ZB + 0.25); decal(printTex(T), w - 0.06, h - 0.06, px, py, ZB + 0.5);
    var dx = 50, dy = 7.5;
    B(6.4, 7.6, 0.8, WHITE, dx, dy, ZB + 0.5); B(5.6, 0.5, 1.4, '#a09c90', dx, dy - 2.2, ZB + 0.9);
    Cy(0.42, 0.42, 4.2, '#cfccc0', dx - 1.6, dy - 0.2, ZB + 1.3); B(1.5, 1.0, 0.9, '#4a4a44', dx - 1.6, dy + 2.3, ZB + 1.3);
    Cy(0.0, 0.28, 0.9, CORAL, dx - 0.4, dy + 2.3, ZB + 1.3, null, null, 0, 0, -PI / 2);
    Cy(0.42, 0.42, 4.2, '#cfccc0', dx + 1.6, dy - 0.2, ZB + 1.3); Cy(0.65, 0.65, 0.8, '#4a4a44', dx + 1.6, dy + 2.3, ZB + 1.3);
  })();

  /* ---------- patient monitor on a rolling stand ---------- */
  var MX = 28.5, MZ = -15.8, mon = new T.Group(); mon.position.set(MX, 0, MZ); g.add(mon);
  Cy(0.8, 0.9, 0.7, '#8f8c82', 0, FLOOR + 1.2, 0, mon);
  for (i = 0; i < 5; i++) {
    var ang = i / 5 * PI * 2 + 0.3; R(2.7, 0.45, 0.6, '#8f8c82', Math.cos(ang) * 1.5, FLOOR + 0.95, Math.sin(ang) * 1.5, 0, -ang, 0, mon);
    Cy(0.38, 0.38, 0.5, '#5c5a52', Math.cos(ang) * 2.7, FLOOR + 0.55, Math.sin(ang) * 2.7, mon);
  }
  Cy(0.28, 0.28, 15.4, '#b4b0a4', 0, FLOOR + 9.4, 0, mon);
  shade(MX, FLOOR + 0.07, MZ, 7.6, 7.6, 0.45);
  var mh = new T.Group(); mh.position.set(0, 5.4, 0.2); mh.rotation.y = -0.35; mon.add(mh);
  W.geo(roundedBox(T, 7.0, 5.2, 1.4, 0.45, 0.18, null).geometry, '#d0cdc2', 0, 0, 0, 0, 0, 0, 1, 1, 1, mh);
  B(6.3, 4.5, 0.4, '#2c302e', 0, 0, 0.8, mh);
  B(2.8, 0.3, 0.7, '#a8a498', 0, 2.9, 0.0, mh); B(0.4, 0.5, 0.4, '#a8a498', -1.1, 2.65, 0, mh); B(0.4, 0.5, 0.4, '#a8a498', 1.1, 2.65, 0, mh);
  var mCanvas = document.createElement('canvas'); mCanvas.width = 1024; mCanvas.height = 640;
  var mCtx = mCanvas.getContext('2d'), mBase = monitorBase(1024, 640), mTex = new T.CanvasTexture(mCanvas); mTex.minFilter = T.LinearMipmapLinearFilter; mTex.anisotropy = 4;
  decal(mTex, 5.9, 3.69, 0, 0.0, 1.12, mh, new T.Color(1.08, 1.08, 1.08));
  var led = new T.Mesh(new T.CircleGeometry(0.16, 12), new T.MeshBasicMaterial({ color: new T.Color('#5ee79a').multiplyScalar(1.1) })); led.position.set(2.95, -2.3, 1.1); led.renderOrder = 3; mh.add(led);
  var accT = 0; drawMonitor(mCtx, mBase, 1024, 640, 2.4); mTex.needsUpdate = true;

  /* ---------- blood-pressure cuff and bulb on the table ---------- */
  var cuff = new T.Group(); cuff.position.set(13.2, 0, -10.6); cuff.rotation.y = 0.35; g.add(cuff);
  Cy(1.1, 1.1, 3.4, '#a9bdb4', 0, 1.07, 0, cuff, null, 0, 0, PI / 2); Cy(1.12, 1.12, 0.5, CORAL, 0.9, 1.07, 0, cuff, null, 0, 0, PI / 2);
  B(3.2, 0.1, 2.4, '#b9cbc2', 0.2, 0.05, 2.0, cuff, TOPCAP);
  tube([[1.7, 0.7, 0.4], [2.6, 0.2, 0.9], [3.4, 0.14, 1.9], [4.4, 0.14, 2.2], [5.3, 0.14, 1.6], [5.9, 0.4, 1.4]], 0.14, '#46463f', cuff);
  W.geo(new T.SphereGeometry(0.75, 14, 10), '#46463f', 6.8, 0.65, 1.2, 0, 0, 0, 1.5, 0.85, 0.85, cuff);
  shade(13.4, 0.0, -10.2, 4.6, 3.2, 0.4); shade(20.0, 0.0, -11.7, 3.0, 2.2, 0.35);

  /* a clipboard and pen at the far left corner of the table, outside the clear zone */
  (function () {
    var cb = new T.Group(); cb.position.set(-31.5, 0, -9.2); cb.rotation.y = 0.28; g.add(cb);
    B(3.7, 0.2, 4.9, OAK_D, 0, 0.07, 0, cb); B(3.2, 0.06, 4.3, '#e6e3d8', 0, 0.22, 0.1, cb, TOPCAP); B(1.7, 0.26, 0.5, CORAL, 0, 0.3, -2.2, cb);
    for (var n = 0; n < 5; n++) B(2.4, 0.02, 0.07, '#9d9a8e', 0, 0.26, -1.2 + n * 0.55, cb);
    Cy(0.07, 0.07, 3.0, '#4a4a44', 2.6, 0.1, 0.2, cb, null, PI / 2);
    shade(-31.5, 0.0, -9.2, 5.6, 6.6, 0.4);
  })();

  /* ---------- floor plant (left of the table) and a bin ---------- */
  (function () {
    var px = -45.5, pz = -7.5, V = new T.Vector3(), E = new T.Euler(), q = new T.Quaternion(), lc = ['#5c9a72', '#4a8860', '#6aa680', '#3f7a58'], sph = new T.SphereGeometry(1, 8, 6);
    W.geo(new T.LatheGeometry([[0, 0], [1.5, 0], [1.95, 0.2], [2.3, 3.5], [2.4, 3.9], [2.1, 3.9], [2.0, 3.6], [0, 3.6]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 24), '#e08c7a', px, FLOOR, pz, 0, 0, 0, 1, 1, 1);
    Cy(2.0, 2.0, 0.1, '#5b4a3a', px, FLOOR + 3.5, pz);
    for (i = 0; i < 15; i++) {
      var yaw = rnd() * PI * 2, tilt = 0.06 + rnd() * 0.3, hh = 4.6 + rnd() * 4.4, r0 = 0.25 + rnd() * 0.9, sw = 0.55 + rnd() * 0.15;
      E.set(tilt, yaw, 0, 'YXZ'); V.set(0, 1, 0).applyEuler(E); q.setFromEuler(E);
      var m4 = new T.Matrix4().compose(new T.Vector3(px + Math.sin(yaw) * r0 + V.x * hh * 0.95, FLOOR + 3.6 + V.y * hh * 0.95, pz + Math.cos(yaw) * r0 + V.z * hh * 0.95), q, new T.Vector3(sw, hh, 0.14));
      W.add(sph, lc[i % 4], m4);
    }
    shade(px, FLOOR + 0.07, pz, 6.6, 6.6, 0.5);
    var bx = -34.6, bz = -16.4;
    W.geo(new T.LatheGeometry([[0, 0], [1.2, 0], [1.4, 0.2], [1.5, 5.0], [0, 5.0]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 22), '#d3d1c6', bx, FLOOR, bz, 0, 0, 0, 1, 1, 1);
    Cy(1.6, 1.6, 0.35, SEA_D, bx, FLOOR + 5.2, bz); B(0.9, 0.2, 1.0, '#8f8c82', bx, FLOOR + 0.3, bz + 1.6);
    shade(bx, FLOOR + 0.07, bz, 4.6, 4.6, 0.5);
  })();

  /* ---------- privacy curtain on a ceiling track, far left ---------- */
  var cx0 = -58, cx1 = -39, cW = cx1 - cx0, cTop = 24.6, cBot = -10.6, cH = cTop - cBot, cZ = -15.6;
  var curTex = tex(T, 512, 1024, function (c, w, h) {
    var r = mulberry(17), n;
    c.fillStyle = '#9fcdbb'; c.fillRect(0, 0, w, h);
    for (n = 0; n < 700; n++) { c.fillStyle = 'rgba(70,120,100,' + (0.03 + r() * 0.04) + ')'; c.fillRect(r() * w, r() * h, 1, 6 + r() * 14); }
    c.fillStyle = '#d9e8dc'; c.fillRect(0, 0, w, 96);
    c.strokeStyle = 'rgba(110,150,130,0.7)'; c.lineWidth = 2;
    for (n = 0; n < w; n += 8) { c.beginPath(); c.moveTo(n, 0); c.lineTo(n, 96); c.stroke(); }
    for (n = 0; n < 96; n += 8) { c.beginPath(); c.moveTo(0, n); c.lineTo(w, n); c.stroke(); }
    c.fillStyle = '#c4dccf'; c.fillRect(0, 96, w, 10);
    c.fillStyle = '#e58a78'; c.fillRect(0, h - 70, w, 16); c.fillStyle = '#8fbfae'; c.fillRect(0, h - 40, w, 40);
  });
  /* folds of uneven width and depth, a little looser towards the hem */
  function curtainZ(ux, hang) { var l = 1 - hang; return Math.sin(ux / 1.9 * PI * 2 + 0.6 + l * 0.5) * (0.5 + 0.25 * l) + Math.sin(ux / 3.3 * PI * 2 + 2.0) * 0.22 + Math.sin(ux / 0.85 * PI * 2) * 0.04 * l + Math.sin(ux * 0.5 + l) * 0.1 * l; }
  var cgeo = new T.PlaneGeometry(cW, cH, 150, 14), cpos = cgeo.attributes.position;
  for (i = 0; i < cpos.count; i++) cpos.setZ(i, curtainZ(cpos.getX(i) + cW / 2, (cpos.getY(i) + cH / 2) / cH));
  cgeo.computeVertexNormals();
  var curtain = new T.Mesh(cgeo, new T.MeshStandardMaterial({ map: curTex, color: new T.Color(0.72, 0.72, 0.72), roughness: 1, metalness: 0, side: T.DoubleSide })); curtain.position.set((cx0 + cx1) / 2, (cTop + cBot) / 2, cZ); g.add(curtain);
  B(29.4, 0.45, 0.6, '#bfbdb2', -44.8, 25.55, cZ);
  var ringGeo = new T.TorusGeometry(0.3, 0.05, 6, 12);
  for (i = 0; i < 20; i++) { var rx = cx0 + 0.5 + i * (cW - 1) / 19; W.geo(ringGeo, '#bfbdb2', rx, 25.0, cZ + curtainZ(rx - cx0, 1), 0, 0, 0, 1, 1, 1); }
  shade(-48.5, FLOOR + 0.07, cZ, 22, 4, 0.25);

  /* ---------- left wall: clock and a botanical print ---------- */
  Cy(2.3, 2.3, 0.4, '#c9a97c', ZC + 10, 15.5, 0.3, LW, null, PI / 2);
  var clkFace = new T.Mesh(new T.CircleGeometry(2.0, 36), new T.MeshBasicMaterial({ map: clockTex(T), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); clkFace.position.set(ZC + 10, 15.5, 0.62); clkFace.renderOrder = 3; LW.add(clkFace);
  (function () {
    var pbx = ZC - 2, pby = 9, fw = 0.4, w = 7.0, h = 5.3;
    B(w + 2 * fw, fw, 0.5, OAK, pbx, pby + h / 2 + fw / 2, 0.3, LW); B(w + 2 * fw, fw, 0.5, OAK, pbx, pby - h / 2 - fw / 2, 0.3, LW);
    B(fw, h, 0.5, OAK, pbx - w / 2 - fw / 2, pby, 0.3, LW); B(fw, h, 0.5, OAK, pbx + w / 2 + fw / 2, pby, 0.3, LW);
    B(w - 0.06, h - 0.06, 0.25, '#cfc8b8', pbx, pby, 0.2, LW); decal(printTex(T), w - 0.06, h - 0.06, pbx, pby, 0.45, LW);
  })();

  /* ---------- right wall: a door with a small sign (it stands proud of the wall rail, so nothing passes through it) ---------- */
  var DW = 12, DY0 = FLOOR, DY1 = 15, DH = DY1 - DY0, DX = 2 - ZC;   /* wall-local x: world z = ZC + x */
  B(DW + 1.8, 0.9, 0.6, '#d6d2c6', DX, DY1 + 0.45, 0.88, RW); B(0.9, DH, 0.6, '#d6d2c6', DX - DW / 2 - 0.45, (DY0 + DY1) / 2, 0.88, RW); B(0.9, DH, 0.6, '#d6d2c6', DX + DW / 2 + 0.45, (DY0 + DY1) / 2, 0.88, RW);
  B(DW, DH, 0.4, OAK, DX, (DY0 + DY1) / 2, 0.8, RW);
  [-1, 1].forEach(function (s) { B(4.4, 6.2, 0.08, '#c9a97c', DX + s * 2.8, (DY0 + DY1) / 2 + 5.8, 1.04, RW); B(4.4, 5.8, 0.08, '#c9a97c', DX + s * 2.8, (DY0 + DY1) / 2 - 4.6, 1.04, RW); });
  B(DW - 0.4, 2.2, 0.1, '#a09c90', DX, DY0 + 1.2, 1.05, RW);
  Cy(0.4, 0.4, 0.2, metalHex, DX + 4.6, FLOOR + 14.3, 1.1, RW, null, PI / 2); B(1.9, 0.22, 0.25, metalHex, DX + 3.9, FLOOR + 14.3, 1.35, RW);
  B(5.6, 1.75, 0.2, '#cfc8b8', DX, DY1 + 3.4, 0.2, RW); decal(signTex(T, 'EXAM 2'), 5.5, 1.7, DX, DY1 + 3.4, 0.4, RW);
  B(0.8, 1.2, 0.2, '#d6d2c6', DX + 9.6, FLOOR + 13.2, 0.2, RW);

  /* everything solid and still, baked into one mesh; soft contact shadows in a few more */
  g.add(W.mesh());
  SH.meshes().forEach(function (m) { g.add(m); });

  /* the stage runs a dark scene fog; this room keeps its own colours */
  g.traverse(function (o) {
    var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(function (m) { m.fog = false; });
  });

  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) {
      if (calm) return;
      accT += dt || 0;
      if (accT >= 0.1) { accT = 0; drawMonitor(mCtx, mBase, 1024, 640, t); mTex.needsUpdate = true; }
    }
  };
};
})();
