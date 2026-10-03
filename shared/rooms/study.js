/* Room "study" for the math subject: a mathematician's study.
 * Slate-green chalkboard with correct chalk work, walnut bookcase and table, geometric solids, a brass lamp,
 * drafting tools, a mug. Slate green, walnut, brass and cream. Local y = 0 is the table top, the floor is at y = -13. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var mulberry = K.mulberry, canvasTex = K.canvasTex, box = K.box, cyl = K.cyl, mat = K.mat, lathe = K.lathe, contactShadow = K.contactShadow;
var SERIF = 'Georgia, "Times New Roman", Times, serif';

/* a canvas texture that stays crisp at a slant: mipmaps and anisotropy; o.repeat tiles it */
function tex(T, w, h, draw, o) {
  var t = canvasTex(T, w, h, draw); o = o || {};
  t.anisotropy = 8; t.minFilter = T.LinearMipmapLinearFilter;
  if (o.repeat || o.wrap) { o.repeat = o.repeat || [1, 1]; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}

/* walnut grain; vertical grain runs along the texture's v axis (uprights, legs) */
function grainTex(T, seed, vertical, base, w, h) {
  return tex(T, w, h, function (c, cw, ch) {
    var r = mulberry(seed), i, A = vertical ? ch : cw, B = vertical ? cw : ch, y, a;
    if (vertical) c.setTransform(0, 1, 1, 0, 0, 0);
    c.fillStyle = base; c.fillRect(0, 0, A, B);
    for (i = 0; i < 14; i++) { y = r() * B; c.fillStyle = r() < 0.5 ? 'rgba(20,10,4,' + (0.05 + r() * 0.08) + ')' : 'rgba(175,125,85,' + (0.04 + r() * 0.06) + ')'; c.fillRect(0, y, A, 6 + r() * 30); }
    for (i = 0; i < 120; i++) {
      y = r() * B; a = 0.06 + r() * 0.2;
      c.strokeStyle = r() < 0.65 ? 'rgba(25,12,5,' + a + ')' : 'rgba(195,145,100,' + a * 0.5 + ')'; c.lineWidth = 0.5 + r() * 1.6;
      c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(A * 0.3, y + (r() - 0.5) * 10, A * 0.7, y + (r() - 0.5) * 10, A, y + (r() - 0.5) * 6); c.stroke();
    }
  });
}

/* plank floor along x; each row has its own joint offset and wraps, so the tile repeats without a seam column */
function floorTex(T) {
  return tex(T, 1024, 1024, function (c, w, h) {
    var r = mulberry(21), rows = 8, rh = h / rows, k, i;
    function plank(xs, len, y, hue, lit) {
      var segs = xs + len > w ? [[xs, w - xs], [0, xs + len - w]] : [[xs, len]];
      segs.forEach(function (s) {
        c.fillStyle = 'hsl(' + hue + ',36%,' + lit + '%)'; c.fillRect(s[0], y, s[1], rh);
        for (var n = 0; n < 7; n++) { var gy = y + 4 + r() * (rh - 8); c.strokeStyle = 'rgba(30,15,6,' + (0.08 + r() * 0.12) + ')'; c.lineWidth = 0.6 + r(); c.beginPath(); c.moveTo(s[0], gy); c.lineTo(s[0] + s[1], gy + (r() - 0.5) * 3); c.stroke(); }
      });
      var ex = (xs + len) % w; c.fillStyle = 'rgba(22,11,4,0.6)'; c.fillRect(ex - 1.5, y, 3, rh);
    }
    for (k = 0; k < rows; k++) {
      var off = r() * w, x = off, y = k * rh;
      while (x < off + w - 1) {
        var len = 220 + r() * 320; if (x + len > off + w - 140) len = off + w - x;
        plank(x % w, len, y, 27 + Math.floor(r() * 6), 31 + r() * 8); x += len;
      }
      c.fillStyle = 'rgba(22,11,4,0.65)'; c.fillRect(0, y, w, 2.5);
    }
    for (i = 0; i < 400; i++) { c.fillStyle = 'rgba(0,0,0,' + r() * 0.05 + ')'; c.fillRect(r() * w, r() * h, 2 + r() * 3, 1); }
  }, { repeat: [5.5, 5.6] });
}

function rugTex(T) {
  return tex(T, 1024, 512, function (c, w, h) {
    var i, j, x, y;
    c.fillStyle = '#4b2220'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9ae78'; c.fillRect(18, 18, w - 36, h - 36);
    c.fillStyle = '#4b2220'; c.fillRect(30, 30, w - 60, h - 60);
    c.fillStyle = '#2f4a3c'; c.fillRect(54, 54, w - 108, h - 108);
    c.fillStyle = '#6b2f2c'; c.fillRect(66, 66, w - 132, h - 132);
    /* diamond lattice with a small cross in each cell */
    for (i = 0; i < 9; i++) for (j = 0; j < 4; j++) {
      x = 66 + (i + 0.5) * (w - 132) / 9; y = 66 + (j + 0.5) * (h - 132) / 4;
      c.fillStyle = '#c9ae78'; c.beginPath(); c.moveTo(x, y - 46); c.lineTo(x + 40, y); c.lineTo(x, y + 46); c.lineTo(x - 40, y); c.closePath(); c.fill();
      c.fillStyle = '#2f4a3c'; c.beginPath(); c.moveTo(x, y - 34); c.lineTo(x + 29, y); c.lineTo(x, y + 34); c.lineTo(x - 29, y); c.closePath(); c.fill();
      c.fillStyle = '#c9ae78'; c.fillRect(x - 4, y - 14, 8, 28); c.fillRect(x - 14, y - 4, 28, 8);
    }
    for (i = 0; i < 1400; i++) { c.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.05 + ')'; c.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
  });
}

/* ---------- chalk work ---------- */

/* lay out a line of maths: ^ and _ start a super/subscript, sin cos lim stay upright, other letters italic.
   draw=false only measures. Returns the end x. */
function mathRun(c, str, x, y, size, draw) {
  var i = 0, cx = x;
  function put(txt, sz, dy, ital) { c.font = (ital ? 'italic ' : '') + sz + 'px ' + SERIF; if (draw) c.fillText(txt, cx, y + dy); cx += c.measureText(txt).width; }
  function ital(ch) { return /[A-Za-z\u03c0]/.test(ch); }
  while (i < str.length) {
    var ch = str.charAt(i), w3 = str.substr(i, 3);
    if (ch === '^' || ch === '_') {
      var arg, k, dy = ch === '^' ? -size * 0.42 : size * 0.24; i++;
      if (str.charAt(i) === '{') { var j = str.indexOf('}', i); arg = str.slice(i + 1, j); i = j + 1; } else { arg = str.charAt(i); i++; }
      for (k = 0; k < arg.length; k++) put(arg.charAt(k), size * 0.62, dy, ital(arg.charAt(k)));
      continue;
    }
    if (w3 === 'sin' || w3 === 'cos' || w3 === 'lim') { put(w3, size, 0, false); i += 3; continue; }
    put(ch, size, 0, ital(ch)); i++;
  }
  return cx;
}

/* the slate board: every equation here is standard and correct */
function boardTex(T) {
  var W = 2560, H = 889;
  return tex(T, W, H, function (c, w, h) {
    var S = w / 2048, r = mulberry(11), i, chalk = '#efebdc', yellow = '#f1da8c', peach = '#f0bfa4';
    var bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2c453c'); bg.addColorStop(1, '#233a32'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    /* old eraser wipes */
    c.lineCap = 'round'; c.strokeStyle = 'rgba(205,215,205,0.045)';
    for (i = 0; i < 22; i++) { c.lineWidth = 60 + r() * 60; var wx = r() * w, wy = r() * h; c.beginPath(); c.moveTo(wx, wy); c.bezierCurveTo(wx + 150, wy - 60 + r() * 120, wx + 300, wy + r() * 80, wx + 420 + r() * 200, wy - 30 + r() * 60); c.stroke(); }
    var dust = c.createLinearGradient(0, h - 60, 0, h); dust.addColorStop(0, 'rgba(225,228,215,0)'); dust.addColorStop(1, 'rgba(225,228,215,0.10)'); c.fillStyle = dust; c.fillRect(0, h - 60, w, 60);
    c.save(); c.scale(S, S);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.textBaseline = 'alphabetic'; c.shadowColor = 'rgba(240,236,220,0.35)'; c.shadowBlur = 2;

    function stroke(pts, col, lw) {
      for (var p = 0; p < 2; p++) {
        c.strokeStyle = col; c.lineWidth = (lw || 5) * (p ? 0.55 : 1); c.globalAlpha = p ? 0.55 : 0.92; c.beginPath();
        for (var q = 0; q < pts.length; q++) { var jx = (r() - 0.5) * 1.4, jy = (r() - 0.5) * 1.4; if (q) c.lineTo(pts[q][0] + jx, pts[q][1] + jy); else c.moveTo(pts[q][0] + jx, pts[q][1] + jy); }
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    function line(x1, y1, x2, y2, col, lw) {
      var n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 14)), pts = [], k;
      for (k = 0; k <= n; k++) pts.push([x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n]);
      stroke(pts, col, lw);
    }
    function dotted(x1, y1, x2, y2, col) { var n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 14), k; c.fillStyle = col; c.globalAlpha = 0.6; for (k = 0; k <= n; k += 2) c.fillRect(x1 + (x2 - x1) * k / n - 1.5, y1 + (y2 - y1) * k / n - 1.5, 3, 3); c.globalAlpha = 1; }
    function text(str, x, y, size, col, align) {
      c.fillStyle = col || chalk;
      var wd = mathRun(c, str, 0, 0, size, false);
      mathRun(c, str, align === 'c' ? x - wd / 2 : x, y, size, true);
      return wd;
    }
    function frac(num, den, x, y, size, col) {
      var wn = mathRun(c, num, 0, 0, size, false), wd = mathRun(c, den, 0, 0, size, false), wm = Math.max(wn, wd) + 16;
      text(num, x + wm / 2, y - size * 0.18, size, col, 'c'); text(den, x + wm / 2, y + size * 0.82, size, col, 'c');
      line(x, y, x + wm, y, col || chalk, 4); return wm;
    }

    /* the left card of a topic page hides the first ~250 px, so the hero work starts right of it.
       Top band (py < 400) stays clear of a model on the table; the lower rows sit behind it. */
    /* 1. Euler's identity, boxed */
    var ew = text('e^{i\u03c0} + 1 = 0', 290, 200, 168);
    stroke([[246, 30], [ew + 362, 32], [ew + 364, 252], [244, 250], [246, 28]], yellow, 5);
    text('e^{ix} = cos x + i sin x', 262, 336, 70);

    /* 2. y = sin x on labelled axes, one full period */
    var ox = 1166, oy = 205, amp = 78, pw = 520, t, pts = [];
    line(1124, oy, 1714, oy, chalk, 4); line(1702, oy - 9, 1716, oy, chalk, 4); line(1702, oy + 9, 1716, oy, chalk, 4);
    line(ox, 340, ox, 40, chalk, 4); line(ox - 9, 54, ox, 38, chalk, 4); line(ox + 9, 54, ox, 38, chalk, 4);
    text('x', 1728, 226, 54); text('y', 1186, 62, 54);
    for (t = 0; t <= 120; t++) pts.push([ox + t / 120 * pw, oy - amp * Math.sin(t / 120 * Math.PI * 2)]);
    stroke(pts, yellow, 6);
    [['\u03c0/2', 0.25], ['\u03c0', 0.5], ['3\u03c0/2', 0.75], ['2\u03c0', 1]].forEach(function (tk) {
      var px = ox + tk[1] * pw; line(px, oy - 8, px, oy + 8, chalk, 4); dotted(px, oy + 12, px, 304, chalk); text(tk[0], px, 346, 42, chalk, 'c');
    });
    text('1', 1128, oy - amp + 14, 42); text('\u22121', 1110, oy + amp + 14, 42);
    dotted(ox + 8, oy - amp, ox + pw * 0.25, oy - amp, chalk);
    text('y = sin x', 1376, 90, 58, yellow);

    /* 3. the Basel sum */
    text('\u2211', 1810, 206, 120); text('\u221e', 1832, 86, 38); text('n = 1', 1804, 264, 32);
    frac('1', 'n^2', 1942, 178, 52);
    text('= \u03c0^2/6', 1810, 346, 60);

    /* 4. a right triangle with 3, 4, 5 */
    var A = [70, 664], B = [310, 664], C = [70, 484];
    stroke([A, B, C, A], peach, 6);
    stroke([[A[0] + 26, A[1]], [A[0] + 26, A[1] - 26], [A[0], A[1] - 26]], peach, 4);
    text('a', 190, 704, 46, peach, 'c'); text('b', 30, 582, 46, peach, 'c'); text('c', 214, 546, 46, peach, 'c');
    text('a^2 + b^2 = c^2', 370, 564, 104);
    text('3^2 + 4^2 = 5^2', 380, 628, 64, yellow);
    text('9 + 16 = 25', 380, 692, 64, yellow);

    /* 5. quadratic formula, two derivatives */
    var qx = 990; text('x =', qx, 556, 86);
    frac('\u2212b \u00b1 \u221a(b^2 \u2212 4ac)', '2a', qx + 132, 542, 70);
    text('d/dx sin x = cos x', qx, 648, 60);
    text('d/dx x^n = n x^{n\u22121}', qx, 702, 56);

    /* 6. constants */
    text('i^2 = \u22121', 1700, 552, 78); text('e \u2248 2.718', 1700, 632, 66); text('\u03c0 \u2248 3.14', 1700, 700, 66);
    c.restore();

    /* chalk is dusty: knock small gaps out of every stroke */
    c.shadowBlur = 0;
    for (i = 0; i < 16000; i++) { c.fillStyle = 'rgba(38,60,51,' + (0.35 + r() * 0.4) + ')'; var sz = 1 + r() * 3.2; c.fillRect(r() * w, r() * h, sz, sz * (0.5 + r())); }
  });
}

function pascalTex(T) {
  return tex(T, 256, 330, function (c, w, h) {
    c.fillStyle = '#e6dcc0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3a2a1a'; c.textAlign = 'center'; c.font = 'italic 22px ' + SERIF; c.fillText("Pascal's triangle", w / 2, 36);
    c.strokeStyle = 'rgba(58,42,26,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(34, 48); c.lineTo(w - 34, 48); c.stroke();
    var rows = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1], [1, 6, 15, 20, 15, 6, 1]];
    c.font = '23px ' + SERIF;
    rows.forEach(function (row, k) { row.forEach(function (n, j) { c.fillText(String(n), w / 2 + (j - (row.length - 1) / 2) * 34, 90 + k * 32); }); });
    c.font = 'italic 15px ' + SERIF; c.fillText('each number is the sum of the two above', w / 2, h - 18);
  });
}

function clockTex(T) {
  return tex(T, 256, 256, function (c, w, h) {
    c.fillStyle = '#e8dec2'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
    c.fillStyle = '#2c2218'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '26px ' + SERIF;
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach(function (n, k) { var a = k / 12 * Math.PI * 2; c.fillText(n, 128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); });
    c.strokeStyle = '#2c2218'; c.lineCap = 'round';
    c.lineWidth = 8; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 56 * Math.sin(-1.047), 128 - 56 * Math.cos(-1.047)); c.stroke();
    c.lineWidth = 5; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + 88 * Math.sin(1.047), 128 - 88 * Math.cos(1.047)); c.stroke();
    c.fillStyle = '#2c2218'; c.beginPath(); c.arc(128, 128, 7, 0, 7); c.fill();
  });
}

function rulerTex(T) {
  return tex(T, 1024, 64, function (c, w, h) {
    var mm, x;
    c.fillStyle = '#c4ad7c'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2a18'; c.fillStyle = '#3a2a18'; c.font = '17px ' + SERIF; c.textAlign = 'center';
    for (mm = 0; mm <= 400; mm++) {
      x = 12 + mm * (w - 24) / 400; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, mm % 10 === 0 ? 24 : mm % 5 === 0 ? 17 : 11); c.stroke();
      if (mm % 10 === 0 && mm > 0 && mm < 400) c.fillText(String(mm / 10), x, 42);
    }
    c.fillText('cm', w - 30, 56);
  });
}

function paperTex(T) {
  return tex(T, 512, 362, function (c, w, h) {
    var i, x, y;
    c.fillStyle = '#c4bda5'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,100,120,0.25)'; c.lineWidth = 1;
    for (i = 0; i < w; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); }
    for (i = 0; i < h; i += 22) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
    /* axes through (264, 242), 22 px per unit; y = x^2 / 2 so the curve stays on the sheet */
    c.strokeStyle = '#2a2a2e'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(30, 242); c.lineTo(490, 242); c.moveTo(264, 340); c.lineTo(264, 30); c.stroke();
    c.beginPath(); for (x = -8; x <= 8.01; x += 0.25) { y = x * x / 2; if (x > -8) c.lineTo(264 + x * 22, 242 - y * 22); else c.moveTo(264 + x * 22, 242 - y * 22); } c.stroke();
    c.fillStyle = '#2a2a2e'; c.font = 'italic 24px ' + SERIF; c.fillText('x', 478, 232); c.fillText('y', 274, 44); c.fillText('y = x\u00b2/2', 330, 90);
  });
}

/* many boxes with per-box colour in one mesh: books and stacks cost a single draw call */
function merger(T) {
  var UB = new T.BoxGeometry(1, 1, 1), pa = UB.attributes.position.array, na = UB.attributes.normal.array, ia = UB.index.array;
  var P = [], N = [], C = [], I = [], v = 0, m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), nm = new T.Matrix3(), a = new T.Vector3(), col = new T.Color();
  return {
    box: function (w, h, d, x, y, z, color, rz, ry) {
      var k; e.set(0, ry || 0, rz || 0, 'XYZ'); m.compose(p.set(x, y, z), q.setFromEuler(e), s.set(w, h, d)); nm.getNormalMatrix(m); col.set(color).multiplyScalar(0.8);
      for (k = 0; k < pa.length; k += 3) { a.set(pa[k], pa[k + 1], pa[k + 2]).applyMatrix4(m); P.push(a.x, a.y, a.z); a.set(na[k], na[k + 1], na[k + 2]).applyMatrix3(nm).normalize(); N.push(a.x, a.y, a.z); C.push(col.r, col.g, col.b); }
      for (k = 0; k < ia.length; k++) I.push(ia[k] + v);
      v += pa.length / 3;
    },
    mesh: function () {
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); geo.setIndex(I);
      return new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
    }
  };
}

var BOOK_COLORS = ['#6b2f25', '#2f4a3a', '#7a5a30', '#3b2a22', '#8a6a2c', '#a89868', '#4a3a52', '#35495e', '#a0452f', '#556b4a', '#5a3a28', '#b79a5a'];

/* a closed book lying flat: cover boards, page block, spine */
function flatBook(M, w, h, d, x, y, z, color, ry) {
  var c = Math.cos(ry || 0), s = Math.sin(ry || 0);
  function at(ox, oy, oz, bw, bh, bd, col) { M.box(bw, bh, bd, x + ox * c + oz * s, y + oy, z - ox * s + oz * c, col, 0, ry || 0); }
  at(0, -h / 2 + 0.05, 0, w, 0.1, d, color); at(0, h / 2 - 0.05, 0, w, 0.1, d, color);
  at(0.05, 0, 0.02, w - 0.14, h - 0.2, d - 0.1, '#b3a47c'); at(-w / 2 + 0.05, 0, 0, 0.1, h, d, color);
}

/* rest a solid on one of its faces at height y, optionally turned about the vertical */
function restOnFace(T, mesh, y, yaw) {
  var geo = mesh.geometry, pos = geo.attributes.position, a = new T.Vector3().fromBufferAttribute(pos, 0), b = new T.Vector3().fromBufferAttribute(pos, 1), c = new T.Vector3().fromBufferAttribute(pos, 2);
  var n = b.clone().sub(a).cross(c.clone().sub(a)).normalize(); if (n.dot(a) < 0) n.negate();
  mesh.quaternion.setFromUnitVectors(n, new T.Vector3(0, -1, 0)); mesh.rotateOnWorldAxis(new T.Vector3(0, 1, 0), yaw || 0);
  mesh.updateMatrixWorld(true); mesh.position.y += y - new T.Box3().setFromObject(mesh).min.y;
}

ENV.study = function (T) {
  var g = new T.Group(), rnd = mulberry(41), i, j;
  var FLOOR = -13, CEIL = 31, ZB = -19, XS = 55, ZF = 70, ZC = (ZB + ZF) / 2;
  var topTex = grainTex(T, 3, false, '#684530', 1024, 512), grainH = grainTex(T, 5, false, '#4f3220', 256, 256), grainV = grainTex(T, 8, true, '#52341f', 256, 256);
  grainH.wrapS = grainH.wrapT = grainV.wrapS = grainV.wrapT = T.RepeatWrapping;
  function wood(map, rough) { return new T.MeshStandardMaterial({ map: map, roughness: rough || 0.82, metalness: 0 }); }
  var matH = wood(grainH), matV = wood(grainV), matTop = wood(topTex);
  /* keep the grain the same size on every board: texture coordinates follow the box's real dimensions (8 units per tile) */
  function woodBoxGeo(w, h, d, skipTop) {
    var geo = new T.BoxGeometry(w, h, d), uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], f, k, n;
    for (f = 0; f < 6; f++) { if (skipTop && f === 2) continue; for (k = 0; k < 4; k++) { n = f * 4 + k; uv.setXY(n, uv.getX(n) * Math.max(dims[f][0], 4) / 8, uv.getY(n) * Math.max(dims[f][1], 4) / 8); } }
    return geo;
  }
  function wbox(w, h, d, x, y, z, m) { var o = new T.Mesh(woodBoxGeo(w, h, d), m || matH); o.position.set(x, y, z); g.add(o); return o; }

  /* light: the shared budget, warm */
  g.add(new T.HemisphereLight(0xfff0d8, 0x46382c, 0.5));
  var key = new T.DirectionalLight(0xffe9cf, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xf0e8e0, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe0b8, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---------- shell: floor, rug, three walls, ceiling ----------
     The stage's depth buffer is coarse at room distance, so surfaces that sit a hair apart are drawn in a fixed order (renderOrder): the room's big planes first, everything standing on or in front of them after. */
  var floor = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshStandardMaterial({ map: floorTex(T), roughness: 0.9, metalness: 0 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, ZC); floor.renderOrder = -3; g.add(floor);
  var rug = new T.Mesh(new T.PlaneGeometry(72, 36), new T.MeshStandardMaterial({ map: rugTex(T), roughness: 0.95, metalness: 0 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, FLOOR + 0.04, 1.5); rug.renderOrder = -2; g.add(rug);
  contactShadow(T, g, 0, FLOOR + 0.09, 1.5, 70, 38, 0.5);

  var wallTex = tex(T, 512, 256, function (c, w, h) {
    var gr = c.createLinearGradient(0, 0, 0, h), r = mulberry(9), k; gr.addColorStop(0, '#7d6643'); gr.addColorStop(1, '#ad9265'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (k = 0; k < 60; k++) { var rd = 20 + r() * 60, bx = r() * w, by = r() * h, rg = c.createRadialGradient(bx, by, 0, bx, by, rd); rg.addColorStop(0, r() < 0.5 ? 'rgba(255,240,210,0.05)' : 'rgba(40,25,10,0.05)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(bx - rd, by - rd, rd * 2, rd * 2); }
  }, { });
  var wainTex = tex(T, 256, 256, function (c, w, h) {
    c.fillStyle = '#4a3322'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#573b27'; c.fillRect(30, 30, w - 60, h - 60);
    c.strokeStyle = 'rgba(20,10,4,0.7)'; c.lineWidth = 5; c.strokeRect(30, 30, w - 60, h - 60);
    c.strokeStyle = 'rgba(190,140,95,0.25)'; c.lineWidth = 2; c.strokeRect(36, 36, w - 72, h - 72);
    c.fillStyle = 'rgba(15,8,3,0.5)'; c.fillRect(0, 0, 6, h); c.fillRect(w - 6, 0, 6, h);
  }, { repeat: [12, 1] });
  function wallPanel(L, x, z, ry) {
    var p = new T.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    var wall = new T.Mesh(new T.PlaneGeometry(L, CEIL - FLOOR), new T.MeshBasicMaterial({ map: wallTex })); wall.position.y = (CEIL + FLOOR) / 2; wall.renderOrder = -3; p.add(wall);
    var wain = new T.Mesh(new T.PlaneGeometry(L, 14), new T.MeshBasicMaterial({ map: wainTex })); wain.position.set(0, -6, 0.06); wain.renderOrder = -2; p.add(wain);
    box(T, p, L, 0.7, 0.55, '#3e2a1b', 0, 1.35, 0.3, 0.8, 0); box(T, p, L, 1.2, 0.4, '#3a281a', 0, FLOOR + 0.6, 0.22, 0.8, 0);
    box(T, p, L, 1.4, 1.0, '#9c8d70', 0, CEIL - 0.7, 0.5, 0.9, 0);
    return p;
  }
  wallPanel(110, 0, ZB, 0); wallPanel(ZF - ZB, -XS, ZC, Math.PI / 2); wallPanel(ZF - ZB, XS, ZC, -Math.PI / 2);
  var ceil = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshBasicMaterial({ color: '#3b2f24' })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL, ZC); ceil.renderOrder = -3; g.add(ceil);

  /* ---------- walnut table: 64 wide, 30 deep ---------- */
  var TZ0 = -13.5, TZ1 = 7.5, TCZ = (TZ0 + TZ1) / 2, TW = 64, TD = TZ1 - TZ0, TTH = 1.1;
  var top = new T.Mesh(woodBoxGeo(TW, TTH, TD, true), [matH, matH, matTop, matH, matH, matH]); top.position.set(0, -0.03 - TTH / 2, TCZ); g.add(top);
  var ay = -0.03 - TTH - 1.1;
  wbox(TW - 4.6, 2.2, 1.1, 0, ay, TZ1 - 1.6); wbox(TW - 4.6, 2.2, 1.1, 0, ay, TZ0 + 1.6);
  wbox(1.1, 2.2, TD - 4.6, TW / 2 - 1.6, ay, TCZ); wbox(1.1, 2.2, TD - 4.6, -TW / 2 + 1.6, ay, TCZ);
  var legH = -0.03 - TTH - FLOOR;
  [[-1, TZ0 + 1.6], [1, TZ0 + 1.6], [-1, TZ1 - 1.6], [1, TZ1 - 1.6]].forEach(function (l) { wbox(2.2, legH, 2.2, l[0] * (TW / 2 - 1.6), FLOOR + legH / 2, l[1], matV); contactShadow(T, g, l[0] * (TW / 2 - 1.6), FLOOR + 0.12, l[1], 4.6, 4.6, 0.55); });
  [-10, 10].forEach(function (dx) { wbox(14, 1.9, 0.2, dx, ay + 0.05, TZ1 - 0.95); cyl(T, g, 0.22, 0.22, 0.3, '#80652c', dx, ay + 0.05, TZ1 - 0.7, 0.7, 0).rotation.x = Math.PI / 2; });
  var tableShadow = contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5);   /* the stage sizes this under the subject */

  /* ---------- chalkboard: x -36..8, y 3.7..17.2 ---------- */
  var BX0 = -24, BX1 = 12, BY0 = 3.2, BY1 = 15.7, BW = BX1 - BX0, BH = BY1 - BY0, BCX = (BX0 + BX1) / 2, BCY = (BY0 + BY1) / 2, FT = 0.8, FZ = -18.7;
  var face = new T.Mesh(new T.PlaneGeometry(BW + 0.2, BH + 0.2), new T.MeshBasicMaterial({ map: boardTex(T) })); face.position.set(BCX, BCY, -18.8); face.renderOrder = -2; g.add(face);
  wbox(BW + 2 * FT, FT, 0.5, BCX, BY1 + FT / 2, FZ); wbox(BW + 2 * FT, FT, 0.5, BCX, BY0 - FT / 2, FZ);
  wbox(FT, BH, 0.5, BX0 - FT / 2, BCY, FZ, matV); wbox(FT, BH, 0.5, BX1 + FT / 2, BCY, FZ, matV);
  var TY = BY0 - FT;   /* top of the chalk tray */
  wbox(BW + 2 * FT + 0.6, 0.35, 1.6, BCX, TY - 0.175, -18.15); wbox(BW + 2 * FT + 0.6, 0.3, 0.15, BCX, TY + 0.15, -17.42);
  var dustTex = tex(T, 512, 64, function (c, w, h) {
    var r = mulberry(4), k; for (k = 0; k < 90; k++) { var dx = r() * w, rg = c.createRadialGradient(dx, 32 + (r() - 0.5) * 20, 0, dx, 32, 10 + r() * 24); rg.addColorStop(0, 'rgba(235,232,220,' + (0.1 + r() * 0.2) + ')'); rg.addColorStop(1, 'rgba(235,232,220,0)'); c.fillStyle = rg; c.fillRect(0, 0, w, h); }
  });
  var dust = new T.Mesh(new T.PlaneGeometry(12, 0.9), new T.MeshBasicMaterial({ map: dustTex, transparent: true, depthWrite: false })); dust.rotation.x = -Math.PI / 2; dust.position.set(-13, TY + 0.02, -18.0); g.add(dust);
  [['#d4d0c2', -17.4, 0.2, 1.1], ['#d6bf72', -16.3, -0.12, 1.1], ['#d09f8b', -13.6, 0.1, 0.7], ['#d4d0c2', -12.7, 0.35, 1.1]].forEach(function (ch) {
    var m = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, ch[3], 10), new T.MeshStandardMaterial({ color: ch[0], roughness: 0.95 })); m.rotation.z = Math.PI / 2; m.rotation.y = ch[2]; m.position.set(ch[1], TY + 0.075, -18.0); g.add(m);
  });
  box(T, g, 1.7, 0.3, 0.8, '#4d4841', -9.5, TY + 0.15, -18.0, 0.95, 0); box(T, g, 1.7, 0.28, 0.8, '#8c6c46', -9.5, TY + 0.44, -18.0, 0.8, 0);

  /* ---------- walnut bookcase: x 15..35 against the wall ---------- */
  var SX0 = 13.5, SX1 = 34.5, SZB = -18.4, SZF = -14.2, SZC = (SZB + SZF) / 2, SD = SZF - SZB, PITCH = 5.2, S0 = -11.4, SH0 = FLOOR, SHT = S0 + 4 * PITCH + 4.7 + 0.5, SC = (SX0 + SX1) / 2;
  wbox(0.8, SHT - SH0, SD, SX0 + 0.4, (SHT + SH0) / 2, SZC, matV); wbox(0.8, SHT - SH0, SD, SX1 - 0.4, (SHT + SH0) / 2, SZC, matV); wbox(0.6, SHT - SH0 - 1.2, SD - 0.2, SC, (SHT + SH0) / 2 - 0.2, SZC, matV);
  wbox(SX1 - SX0 - 1.6, SHT - SH0, 0.15, SC, (SHT + SH0) / 2, SZB + 0.1, new T.MeshStandardMaterial({ color: '#2b1c12', roughness: 0.95 }));
  for (i = 0; i < 5; i++) wbox(SX1 - SX0 - 1.6, 0.5, SD - 0.1, SC, S0 - 0.25 + i * PITCH, SZC);
  wbox(SX1 - SX0 - 1.6, 0.5, SD - 0.1, SC, S0 + 4 * PITCH + 4.7 + 0.25, SZC);
  wbox(SX1 - SX0 + 0.8, 0.7, SD + 0.5, SC, SHT + 0.35, SZC + 0.1);
  wbox(SX1 - SX0 - 1.6, 1.2, 0.3, SC, FLOOR + 0.6, SZF - 0.2, matH);
  var books = merger(T), zFront = SZF - 0.55, bay, row;
  function fillRow(xl, xr, s, lean) {
    var x = xl + 0.1, la = 0.2 + rnd() * 0.08, lw = 0.6 + rnd() * 0.25, lh = 3.5 + rnd() * 0.7, endX = xr - 0.12 - lh * Math.sin(la), limit = lean ? endX - lw * Math.cos(la) - 0.05 : xr - 0.1;
    while (x < limit - 0.5) {
      var w = 0.55 + rnd() * 0.6, h = 3.0 + rnd() * 1.55, d = 2.6 + rnd() * 0.6, col = BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], zf = zFront + (rnd() - 0.5) * 0.35;
      if (x + w > limit) break;
      var cx = x + w / 2, cy = s + h / 2, cz = zf - d / 2;
      books.box(w, h, d, cx, cy, cz, col);
      books.box(w - 0.06, 0.13, 0.06, cx, s + h - 0.55, zf + 0.01, '#a88838'); books.box(w - 0.06, 0.13, 0.06, cx, s + 0.55, zf + 0.01, '#a88838');
      if (w > 0.7 && rnd() < 0.55) books.box(w * 0.62, 0.8, 0.06, cx, s + h * 0.62, zf + 0.01, '#b9ab84');
      else if (rnd() < 0.5) books.box(w - 0.06, 0.1, 0.06, cx, s + h * 0.5, zf + 0.01, '#a88838');
      x += w + 0.02 + (rnd() < 0.08 ? 0.12 : 0);
    }
    if (lean) {
      var lc = BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], lcx = endX - (lw / 2) * Math.cos(la) + (lh / 2) * Math.sin(la), lcy = s + (lw / 2) * Math.sin(la) + (lh / 2) * Math.cos(la);
      books.box(lw, lh, 3.0, lcx, lcy, zFront - 1.6, lc, -la);
    }
  }
  for (row = 0; row < 5; row++) {
    var s = S0 + row * PITCH;
    for (bay = 0; bay < 2; bay++) {
      var xl = bay ? SC + 0.3 : SX0 + 0.8, xr = bay ? SX1 - 0.8 : SC - 0.3;
      if (row === 4 && bay === 0) continue;    /* the solids' bay */
      fillRow(xl, xr, s, rnd() < 0.4);
    }
  }
  g.add(books.mesh());

  /* geometric solids on the top shelf, left bay: cube, tetrahedron, octahedron, dodecahedron */
  var sy = S0 + 4 * PITCH, solidSpec = [
    [new T.BoxGeometry(1.6, 1.6, 1.6), '#ac9d72', 15.3, 0.5], [new T.TetrahedronGeometry(1.2), '#97472f', 17.8, 0.2],
    [new T.OctahedronGeometry(1.05), '#587659', 20.4, 0.4], [new T.DodecahedronGeometry(0.92), '#9a7430', 22.7, 0.3]
  ];
  solidSpec.forEach(function (sp) {
    var m = new T.Mesh(sp[0], new T.MeshStandardMaterial({ color: sp[1], roughness: 0.82, metalness: 0, flatShading: true })); m.position.set(sp[2], 0, SZC + 0.2);
    if (sp[0].index) { m.rotation.y = sp[3]; m.updateMatrixWorld(true); m.position.y = sy + 0.8; } else restOnFace(T, m, sy, sp[3]);
    g.add(m); var rr = sp[0].boundingSphere || (sp[0].computeBoundingSphere(), sp[0].boundingSphere); contactShadow(T, g, m.position.x, sy + 0.02, m.position.z, rr.radius * 2.3, rr.radius * 2.3, 0.45);
  });

  /* ---------- on the table: far left corner, drafting tools ---------- */
  var tools = new T.Group(); tools.position.set(-22, 0, -9.5); g.add(tools);
  function tp(m, x, y, z, ry) { m.position.set(x, y, z); if (ry) m.rotation.y = ry; tools.add(m); return m; }
  /* ruler */
  var rtop = new T.MeshStandardMaterial({ map: rulerTex(T), roughness: 0.8 }), rside = new T.MeshStandardMaterial({ color: '#b39a64', roughness: 0.8 });
  tp(new T.Mesh(new T.BoxGeometry(5.7, 0.1, 0.62), [rside, rside, rtop, rside, rside, rside]), 2.4, 0.05, -3.0, 0.04); contactShadow(T, tools, 2.4, 0.02, -3.0, 6.6, 1.6, 0.4);
  /* set square: a 45 degree triangle with its middle cut out */
  var L = 5.0, d0 = 0.75, tri = new T.Shape(); tri.moveTo(0, 0); tri.lineTo(L, 0); tri.lineTo(0, L); tri.lineTo(0, 0);
  var hole = new T.Path(), li = L - d0 * (1 + Math.SQRT2); hole.moveTo(d0, d0); hole.lineTo(d0, d0 + li); hole.lineTo(d0 + li, d0); hole.lineTo(d0, d0);
  tri.holes.push(hole);
  var sq = new T.Mesh(new T.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }), new T.MeshStandardMaterial({ color: '#9a6f2e', roughness: 0.8 })); sq.rotation.x = -Math.PI / 2; var sqg = new T.Group(); sqg.add(sq); tp(sqg, -6.4, 0.0, 4.6, 0.3); contactShadow(T, tools, -3.9, 0.02, 2.2, 7.4, 7.4, 0.3);
  /* compass: two legs hinged at one end, lying flat; one ends in a needle, one in a pencil lead */
  var comp = new T.Group(), steel = new T.MeshStandardMaterial({ color: '#77756e', roughness: 0.7 }), brass = new T.MeshStandardMaterial({ color: '#80652c', roughness: 0.7 });
  [[0.33, 0], [-0.33, 0.012]].forEach(function (lg, k) {
    var leg = new T.Group(); leg.rotation.y = lg[0]; comp.add(leg);
    var bar = new T.Mesh(new T.BoxGeometry(3.0, 0.1, 0.17), steel); bar.position.set(1.5, 0.07 + lg[1], 0); leg.add(bar);
    if (k === 0) { var nd = new T.Mesh(new T.CylinderGeometry(0.0, 0.05, 0.55, 8), steel); nd.rotation.z = -Math.PI / 2; nd.position.set(3.25, 0.07, 0); leg.add(nd); }
    else { var pl = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.5, 8), new T.MeshStandardMaterial({ color: '#c9a56a', roughness: 0.85 })); pl.rotation.z = -Math.PI / 2; pl.position.set(3.2, 0.1, 0); leg.add(pl); var gr = new T.Mesh(new T.CylinderGeometry(0.0, 0.05, 0.2, 8), new T.MeshStandardMaterial({ color: '#2b2b2f', roughness: 0.9 })); gr.rotation.z = -Math.PI / 2; gr.position.set(3.55, 0.1, 0); leg.add(gr); }
  });
  var hinge = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.3, 14), brass); hinge.position.set(0, 0.15, 0); comp.add(hinge);
  var handle = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1, 8), brass); handle.rotation.z = Math.PI / 2; handle.position.set(-0.7, 0.15, 0); comp.add(handle);
  comp.position.set(1.4, 0, 5.2); comp.rotation.y = -0.45; tools.add(comp); contactShadow(T, tools, 3.0, 0.02, 5.8, 6.2, 4.0, 0.28);

  /* ---------- on the table: right side, brass lamp, mug, books, a sheet ---------- */
  var LX = 16.0, LZ = -10.6;
  var spillTex = tex(T, 256, 256, function (c, w, h) {
    c.translate(w / 2, h * 0.4); c.scale(1, 0.8); var gr = c.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(255,196,110,0.55)'); gr.addColorStop(0.45, 'rgba(255,186,100,0.22)'); gr.addColorStop(1, 'rgba(255,180,90,0)');
    c.fillStyle = gr; c.fillRect(-w / 2, -h, w, h * 2);
  });
  var spill = new T.Mesh(new T.PlaneGeometry(20, 12), new T.MeshBasicMaterial({ map: spillTex, transparent: true, depthWrite: false, opacity: 0.8 }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(LX + 2.5, 0.015, TZ0 + 6); g.add(spill);
  var lamp = new T.Group(); lamp.position.set(LX, 0, LZ); g.add(lamp);
  var lb = new T.MeshStandardMaterial({ color: '#7d632c', roughness: 0.7, metalness: 0, side: T.DoubleSide }), lb2 = new T.MeshStandardMaterial({ color: '#6b5324', roughness: 0.7, metalness: 0, side: T.DoubleSide });
  lamp.add(new T.Mesh(lathe(T, [[0, 0], [1.7, 0], [1.72, 0.22], [1.45, 0.45], [0.6, 0.62], [0.32, 0.95]], 32), lb));
  var stem = new T.Mesh(new T.CylinderGeometry(0.13, 0.19, 4.5, 14), lb); stem.position.y = 3.05; lamp.add(stem);
  var collar = new T.Mesh(new T.TorusGeometry(0.2, 0.07, 8, 16), lb); collar.rotation.x = Math.PI / 2; collar.position.y = 1.4; lamp.add(collar);
  lamp.add(new T.Mesh(lathe(T, [[2.35, 4.0], [2.28, 4.35], [1.9, 5.0], [1.2, 5.55], [0.55, 5.9], [0.3, 6.05], [0, 6.1]], 36), lb2));
  var glow = new T.Mesh(lathe(T, [[2.2, 4.01], [1.82, 4.9], [1.15, 5.42], [0.5, 5.75], [0, 5.9]], 30), new T.MeshBasicMaterial({ color: new T.Color('#ffd89a').multiplyScalar(1.15), side: T.BackSide })); lamp.add(glow);
  var lrim = new T.Mesh(new T.TorusGeometry(2.33, 0.09, 8, 36), lb); lrim.rotation.x = Math.PI / 2; lrim.position.y = 4.0; lamp.add(lrim);
  var fin = new T.Mesh(new T.SphereGeometry(0.24, 10, 8), lb); fin.position.y = 6.25; lamp.add(fin);
  contactShadow(T, g, LX, 0.02, LZ, 5.4, 5.4, 0.55);
  /* mug */
  var mug = new T.Group(), cm = new T.MeshStandardMaterial({ color: '#aa9e7e', roughness: 0.8, side: T.DoubleSide });
  mug.add(new T.Mesh(lathe(T, [[0, 0], [0.5, 0], [0.57, 0.06], [0.58, 1.3], [0.52, 1.32], [0.49, 1.26], [0.49, 0.14], [0, 0.14]], 32), cm));
  var cof = new T.Mesh(new T.CircleGeometry(0.49, 28), new T.MeshStandardMaterial({ color: '#2c1b10', roughness: 0.9 })); cof.rotation.x = -Math.PI / 2; cof.position.y = 1.0; mug.add(cof);
  var hd = new T.Mesh(new T.TorusGeometry(0.33, 0.07, 8, 18, Math.PI * 1.2), cm); hd.position.set(0.58, 0.72, 0); hd.rotation.z = -Math.PI * 0.6; mug.add(hd);
  mug.position.set(20.5, 0, -8.2); mug.rotation.y = 0.5; g.add(mug); contactShadow(T, g, 20.5, 0.02, -8.2, 2.5, 2.5, 0.5);
  /* a stack of three books near the right end */
  var stack = merger(T);
  flatBook(stack, 5.4, 0.9, 3.8, 28.4, 0.0 + 0.45, -7.4, '#2f4a3a', 0.12); flatBook(stack, 4.8, 0.75, 3.4, 28.6, 0.9 + 0.375, -7.3, '#6b2f25', -0.08); flatBook(stack, 4.2, 0.6, 3.0, 28.3, 1.65 + 0.3, -7.45, '#8a6a2c', 0.2);
  g.add(stack.mesh()); contactShadow(T, g, 28.5, 0.02, -7.4, 8.0, 6.2, 0.45);
  /* a sheet with a graph and a pencil */
  var sheet = new T.Mesh(new T.PlaneGeometry(4.3, 3.04), new T.MeshStandardMaterial({ map: paperTex(T), roughness: 0.95 })); sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = 0.35; sheet.position.set(21.5, 0.05, 3.6); g.add(sheet);
  contactShadow(T, g, 21.6, 0.02, 3.7, 5.4, 4.2, 0.28);
  var pencil = new T.Group(); var pb = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 2.5, 6), new T.MeshStandardMaterial({ color: '#a88530', roughness: 0.8 })); pb.rotation.z = Math.PI / 2; pencil.add(pb);
  var pt = new T.Mesh(new T.CylinderGeometry(0.0, 0.07, 0.35, 8), new T.MeshStandardMaterial({ color: '#d8bf8e', roughness: 0.9 })); pt.rotation.z = Math.PI / 2; pt.position.x = 1.42; pencil.add(pt);
  pencil.position.set(24.0, 0.15, 2.6); pencil.rotation.y = -0.5; g.add(pencil);

  /* ---------- wall and floor details ---------- */
  var frameP = new T.Group(); frameP.position.set(-29, 10, ZB); g.add(frameP);
  box(T, frameP, 4.8, 6.2, 0.4, '#3e2a1b', 0, 0, 0.2, 0.8, 0); box(T, frameP, 4.1, 5.5, 0.1, '#a99a78', 0, 0, 0.41, 0.9, 0);
  var pp = new T.Mesh(new T.PlaneGeometry(3.9, 5.1), new T.MeshBasicMaterial({ map: pascalTex(T) })); pp.position.set(0, 0, 0.5); frameP.add(pp);
  var clk = new T.Group(); clk.position.set(-6, 20.4, ZB); g.add(clk);
  var cb = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, 0.3, 40), mat(T, '#3a281a', 0.8, 0)); cb.rotation.x = Math.PI / 2; cb.position.z = 0.2; clk.add(cb);
  var cr = new T.Mesh(new T.TorusGeometry(2.15, 0.15, 10, 44), mat(T, '#80652c', 0.7, 0)); cr.position.z = 0.4; clk.add(cr);
  var cf = new T.Mesh(new T.CircleGeometry(2.0, 40), new T.MeshBasicMaterial({ map: clockTex(T) })); cf.position.z = 0.385; clk.add(cf);
  /* a pile of books and a potted plant on the floor beside the case */
  var pile = merger(T); flatBook(pile, 5.6, 1.0, 4.0, 40.5, FLOOR + 0.5, -15.4, '#4a3a52', 0.1); flatBook(pile, 5.0, 0.8, 3.6, 40.3, FLOOR + 1.4, -15.5, '#b79a5a', -0.12); flatBook(pile, 4.4, 0.7, 3.2, 40.6, FLOOR + 2.15, -15.4, '#6b2f25', 0.18);
  g.add(pile.mesh()); contactShadow(T, g, 40.5, FLOOR + 0.1, -15.4, 8, 6.6, 0.45);
  var pot = new T.Mesh(lathe(T, [[0, 0], [1.5, 0], [1.9, 0.2], [2.2, 3.2], [2.0, 3.35], [1.8, 3.1], [0, 3.1]], 24), new T.MeshStandardMaterial({ color: '#9a5a3a', roughness: 0.9, side: T.DoubleSide })); pot.position.set(47, FLOOR, -15); g.add(pot);
  contactShadow(T, g, 47, FLOOR + 0.1, -15, 6.4, 6.4, 0.5);
  var leafMat = [new T.MeshStandardMaterial({ color: '#3f6a45', roughness: 0.85 }), new T.MeshStandardMaterial({ color: '#35593a', roughness: 0.85 })];
  var stemM = new T.MeshStandardMaterial({ color: '#4a3a26', roughness: 0.9 });
  for (i = 0; i < 11; i++) {
    var a = i / 11 * 6.283 + rnd(), tilt = 0.35 + rnd() * 0.45, hh = 6 + rnd() * 5, leaf = new T.Mesh(new T.SphereGeometry(1, 10, 8), leafMat[i % 2]);
    leaf.scale.set(1.0, 0.16, 1.9); var lg = new T.Group(); lg.position.set(47, FLOOR + 3.2, -15); lg.rotation.y = a;
    var st = new T.Mesh(new T.CylinderGeometry(0.06, 0.09, hh, 6), stemM); st.position.y = hh / 2; st.rotation.x = 0; lg.add(st);
    leaf.position.set(0, hh, 0.9); leaf.rotation.x = -0.3; var tg = new T.Group(); tg.rotation.x = tilt; tg.add(st); tg.add(leaf); lg.add(tg); g.add(lg);
  }

  /* the room keeps its own warm colour: no distance haze toward the stage's blue-black */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  return { group: g, shadow: tableShadow, update: function (t, dt) {} };
};
})();
