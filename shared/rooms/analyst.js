/* Room "analyst" for the statistics subject: a data analyst's office.
 * Beige walls, navy and mustard accents, a light wood desk. A whiteboard with a real histogram of a simulated sample, the normal curve over it,
 * the 68-95-99.7 bands, a least-squares scatter plot and the mean and standard deviation formulas. A Galton board on the counter, a jar of marbles,
 * dice, coins and cards, a framed bar chart, a bookshelf of statistics books and a window onto a city. Local y = 0 is the desk top, the floor is at y = -13. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var mulberry = K.mulberry, canvasTex = K.canvasTex, box = K.box, cyl = K.cyl, mat = K.mat, lathe = K.lathe, contactShadow = K.contactShadow, rectGeo = K.rectGeo;
var SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", Times, serif';
var NAVY = '#27406f', MUSTARD = '#d5a22b', TEAL = '#2f8a86', INK = '#232b3d';

/* a canvas texture that stays crisp at a slant */
function tex(T, w, h, draw, o) {
  var t = canvasTex(T, w, h, draw); o = o || {};
  t.anisotropy = 4; t.minFilter = T.LinearMipmapLinearFilter;
  if (o.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}

/* light wood grain; vertical grain runs along the texture's v axis */
function grainTex(T, seed, vertical, base, w, h) {
  return tex(T, w, h, function (c, cw, ch) {
    var r = mulberry(seed), i, A = vertical ? ch : cw, B = vertical ? cw : ch, y, a;
    if (vertical) c.setTransform(0, 1, 1, 0, 0, 0);
    c.fillStyle = base; c.fillRect(0, 0, A, B);
    for (i = 0; i < 12; i++) { y = r() * B; c.fillStyle = r() < 0.5 ? 'rgba(120,80,40,' + (0.04 + r() * 0.06) + ')' : 'rgba(255,238,205,' + (0.05 + r() * 0.07) + ')'; c.fillRect(0, y, A, 6 + r() * 30); }
    for (i = 0; i < 110; i++) {
      y = r() * B; a = 0.05 + r() * 0.14;
      c.strokeStyle = r() < 0.7 ? 'rgba(110,72,36,' + a + ')' : 'rgba(255,240,210,' + a * 0.7 + ')'; c.lineWidth = 0.5 + r() * 1.4;
      c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(A * 0.3, y + (r() - 0.5) * 8, A * 0.7, y + (r() - 0.5) * 8, A, y + (r() - 0.5) * 5); c.stroke();
    }
  });
}

function gaussFrom(r) { return function () { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(6.283185307 * r()); }; }

/* ---------- the whiteboard: every figure is computed, not sketched ---------- */
function boardTex(T) {
  var W = 2400, H = 1040;
  return tex(T, W, H, function (c, w, h) {
    var BG = '#c9c8bd', NV = '#2f4f8f', TL = '#1f8581', MU = '#dca72a', MUD = '#b9830f', GR = '#a9a89b';
    var r = mulberry(7), gauss = gaussFrom(r), i, k, S, vb;
    c.fillStyle = BG; c.fillRect(0, 0, w, h);
    /* faint ghosts of old writing, wiped */
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(100,100,92,0.05)';
    for (i = 0; i < 14; i++) { c.lineWidth = 40 + r() * 50; var gx = r() * w, gy = r() * h; c.beginPath(); c.moveTo(gx, gy); c.bezierCurveTo(gx + 120, gy - 40, gx + 260, gy + 50, gx + 380, gy - 10); c.stroke(); }
    c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.strokeStyle = INK;

    function line(x1, y1, x2, y2, col, lw) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    /* a stroke with a paper-coloured halo so it stays visible over dark bars */
    function halo(x1, y1, x2, y2, lw, dash) { c.setLineDash(dash || []); line(x1, y1, x2, y2, BG, lw + 7); line(x1, y1, x2, y2, INK, lw); c.setLineDash([]); }
    function text(str, x, y, size, o) { o = o || {}; c.font = (o.bold ? 'bold ' : '') + (o.it ? 'italic ' : '') + size + 'px ' + (o.serif ? SERIF : SANS); c.textAlign = o.align || 'left'; c.fillStyle = o.col || INK; c.fillText(str, x, y); }

    /* small maths layout: tokens are strings, {v, sub, sup, bar, hat} variables, {s, k} scaled symbols, {sup} */
    function seq(x, y, toks, size, draw) {
      var cx = x, i2, t, w2, w3;
      c.textAlign = 'left';
      for (i2 = 0; i2 < toks.length; i2++) {
        t = toks[i2];
        if (typeof t === 'string') { c.font = size + 'px ' + SERIF; w2 = c.measureText(t).width; if (draw) c.fillText(t, cx, y); cx += w2; }
        else if (t.v) {
          c.font = 'italic ' + size + 'px ' + SERIF; w2 = c.measureText(t.v).width;
          if (draw) {
            c.fillText(t.v, cx, y);
            if (t.bar) { c.fillStyle = INK; c.fillRect(cx + w2 * 0.12, y - size * 0.66, w2 * 0.8, size * 0.06); }
            if (t.hat) { c.lineWidth = size * 0.06; c.strokeStyle = INK; c.beginPath(); c.moveTo(cx + w2 * 0.2, y - size * 0.56); c.lineTo(cx + w2 * 0.5, y - size * 0.7); c.lineTo(cx + w2 * 0.8, y - size * 0.56); c.stroke(); }
          }
          cx += w2;
          if (t.sub) { c.font = 'italic ' + size * 0.6 + 'px ' + SERIF; w3 = c.measureText(t.sub).width; if (draw) c.fillText(t.sub, cx, y + size * 0.22); cx += w3; }
        }
        else if (t.sup) { c.font = size * 0.6 + 'px ' + SERIF; w2 = c.measureText(t.sup).width; if (draw) c.fillText(t.sup, cx, y - size * 0.4); cx += w2; }
        else if (t.s) { c.font = size * (t.k || 1) + 'px ' + SERIF; w2 = c.measureText(t.s).width; if (draw) c.fillText(t.s, cx, y + (t.dy || 0) * size); cx += w2; }
      }
      return cx - x;
    }
    function frac(x, axisY, num, den, size) {
      var wn = seq(0, 0, num, size, false), wd = seq(0, 0, den, size, false), wm = Math.max(wn, wd) + 24;
      seq(x + (wm - wn) / 2, axisY - 16, num, size, true); seq(x + (wm - wd) / 2, axisY + size * 0.9, den, size, true);
      line(x, axisY, x + wm, axisY, INK, 5); return wm;
    }

    /* ----- left: histogram of a simulated sample (n = 1000) with the normal curve and the 68-95-99.7 bands ----- */
    var N = 1000, nb = 14, counts = [], cx = 665, sx = 140, vB = 470, cs = 1.4, z, a;
    for (i = 0; i < nb; i++) counts.push(0);
    for (i = 0; i < N; i++) { z = gauss(); k = Math.floor((z + 3.5) / 0.5); if (k >= 0 && k < nb) counts[k]++; }
    function phi(zz) { return Math.exp(-zz * zz / 2) / 2.5066283; }
    text('Normal distribution', 40, 82, 64, { bold: true });
    text('n = 1000', 1290, 82, 50, { align: 'right' });
    for (k = 0; k < nb; k++) {
      a = Math.abs(-3.25 + 0.5 * k);
      c.fillStyle = a < 1 ? NV : a < 2 ? TL : a < 3 ? MU : GR;
      c.fillRect(cx + (-3.5 + 0.5 * k) * sx + 1.5, vB - counts[k] * cs, 0.5 * sx - 3, counts[k] * cs);
    }
    /* expected count in a bin of width 0.5 is n * 0.5 * phi(z) */
    c.lineWidth = 12; c.strokeStyle = BG; c.beginPath();
    for (z = -3.5; z <= 3.501; z += 0.05) { var cy = vB - N * 0.5 * phi(z) * cs; if (z === -3.5) c.moveTo(cx + z * sx, cy); else c.lineTo(cx + z * sx, cy); } c.stroke();
    c.lineWidth = 6; c.strokeStyle = INK; c.beginPath();
    for (z = -3.5; z <= 3.501; z += 0.05) { var cy2 = vB - N * 0.5 * phi(z) * cs; if (z === -3.5) c.moveTo(cx + z * sx, cy2); else c.lineTo(cx + z * sx, cy2); } c.stroke();
    /* the mean, and the sd markers at the curve's inflection points */
    halo(cx, 185, cx, vB, 5);
    text('mean', cx, 160, 50, { align: 'center', bold: true });
    for (k = -3; k <= 3; k++) if (k) halo(cx + k * sx, vB - N * 0.5 * phi(k) * cs, cx + k * sx, vB, 3, [10, 8]);
    line(150, vB, 1180, vB, INK, 6);
    var tl = ['\u22123\u03c3', '\u22122\u03c3', '\u2212\u03c3', '\u03bc', '\u03c3', '2\u03c3', '3\u03c3'];
    for (k = -3; k <= 3; k++) { line(cx + k * sx, vB, cx + k * sx, vB + 16, INK, 5); text(tl[k + 3], cx + k * sx, vB + 66, 48, { align: 'center', serif: true, it: true }); }
    [[1, 595, '\u2248 68%', NV], [2, 645, '\u2248 95%', TL], [3, 695, '\u2248 99.7%', MUD]].forEach(function (b) {
      var xl = cx - b[0] * sx, xr = cx + b[0] * sx, tw;
      c.setLineDash([4, 10]); line(xl, vB + 92, xl, b[1], b[3], 4); line(xr, vB + 92, xr, b[1], b[3], 4); c.setLineDash([]);
      line(xl, b[1], xr, b[1], b[3], 7); line(xl, b[1] - 15, xl, b[1] + 15, b[3], 7); line(xr, b[1] - 15, xr, b[1] + 15, b[3], 7);
      c.font = 'bold 46px ' + SANS; tw = c.measureText(b[2]).width; c.fillStyle = BG; c.fillRect(cx - tw / 2 - 14, b[1] - 30, tw + 28, 60);
      text(b[2], cx, b[1] + 16, 46, { align: 'center', bold: true });
    });

    /* ----- bottom left: the formulas ----- */
    line(40, 752, 1290, 752, 'rgba(35,43,61,0.25)', 3);
    S = 78; vb = 905;
    var xx = 45, axisY = vb - S * 0.3, big;
    xx += seq(xx, vb, [{ v: 'x', bar: 1 }, ' = '], S, true);
    xx += frac(xx, axisY, ['1'], [{ v: 'n' }], S) + 14;
    big = S * 1.3; c.font = big + 'px ' + SERIF; var sw = c.measureText('\u03a3').width; c.fillStyle = INK; c.textAlign = 'left'; c.fillText('\u03a3', xx, vb + S * 0.1);
    c.font = 'italic ' + S * 0.5 + 'px ' + SERIF; c.textAlign = 'center'; c.fillText('n', xx + sw / 2, vb - S * 0.85); c.fillText('i = 1', xx + sw / 2, vb + S * 0.62); c.textAlign = 'left';
    seq(xx + sw + 8, vb, [{ v: 'x', sub: 'i' }], S, true);
    text('mean', 45, 1012, 44, { col: 'rgba(35,43,61,0.8)' });
    xx = 640;
    xx += seq(xx, vb, [{ v: 's' }, ' = '], S, true);
    var num = [{ s: '\u03a3' }, '(', { v: 'x', sub: 'i' }, ' \u2212 ', { v: 'x', bar: 1 }, ')', { sup: '2' }], den = [{ v: 'n' }, ' \u2212 1'];
    var wn = seq(0, 0, num, S, false), wd = seq(0, 0, den, S, false), wm = Math.max(wn, wd) + 24, top = axisY - 108, bot = vb + S * 0.78;
    c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(xx, axisY + 12); c.lineTo(xx + 12, axisY); c.lineTo(xx + 34, bot); c.lineTo(xx + 58, top); c.lineTo(xx + 58 + wm + 16, top); c.stroke();
    frac(xx + 66, axisY, num, den, S);
    text('standard deviation (sample)', 640, 1012, 44, { col: 'rgba(35,43,61,0.8)' });

    /* ----- right: scatter plot with the least-squares line ----- */
    line(1318, 40, 1318, 990, 'rgba(35,43,61,0.2)', 3);
    text('Scatter plot and fitted line', 1370, 82, 64, { bold: true });
    var ox = 1520, oy = 780, xs = 80, ys = 40, pts = [], sxv = 0, syv = 0, sxx = 0, sxy = 0, syy = 0, n = 40, px, py;
    for (i = 0; i < n; i++) { px = 0.4 + 9.2 * r(); py = 2.0 + 0.8 * px + 1.4 * gauss(); py = Math.max(0.5, Math.min(13.3, py)); pts.push([px, py]); sxv += px; syv += py; }
    var mx = sxv / n, my = syv / n;
    for (i = 0; i < n; i++) { sxx += (pts[i][0] - mx) * (pts[i][0] - mx); sxy += (pts[i][0] - mx) * (pts[i][1] - my); syy += (pts[i][1] - my) * (pts[i][1] - my); }
    var b = sxy / sxx, a0 = my - b * mx, rr = sxy / Math.sqrt(sxx * syy);
    [4, 8, 12].forEach(function (g) { line(ox, oy - g * ys, ox + 10 * xs + 10, oy - g * ys, 'rgba(35,43,61,0.14)', 3); });
    line(ox, oy - 14 * ys - 14, ox, oy, INK, 6); line(ox, oy, ox + 10 * xs + 24, oy, INK, 6);
    for (k = 0; k <= 10; k += 2) { line(ox + k * xs, oy, ox + k * xs, oy + 14, INK, 5); text(String(k), ox + k * xs, oy + 60, 44, { align: 'center' }); }
    for (k = 4; k <= 12; k += 4) { line(ox - 14, oy - k * ys, ox, oy - k * ys, INK, 5); text(String(k), ox - 24, oy - k * ys + 15, 44, { align: 'right' }); }
    text('x', ox + 10 * xs + 44, oy + 16, 58, { it: true, serif: true }); text('y', ox + 24, oy - 14 * ys - 6, 58, { it: true, serif: true });
    for (i = 0; i < n; i++) line(ox + pts[i][0] * xs, oy - pts[i][1] * ys, ox + pts[i][0] * xs, oy - (a0 + b * pts[i][0]) * ys, 'rgba(35,43,61,0.38)', 3);
    line(ox, oy - a0 * ys, ox + 10 * xs, oy - (a0 + b * 10) * ys, MUD, 10);
    for (i = 0; i < n; i++) { c.fillStyle = NV; c.strokeStyle = BG; c.lineWidth = 3; c.beginPath(); c.arc(ox + pts[i][0] * xs, oy - pts[i][1] * ys, 12, 0, 6.2832); c.fill(); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.arc(ox + mx * xs, oy - my * ys, 24, 0, 6.2832); c.stroke();
    text('\u0177 = ' + a0.toFixed(2) + ' + ' + b.toFixed(2) + 'x      r = ' + rr.toFixed(2), 1370, 925, 60, { serif: true });
    c.fillStyle = INK; seq(1370, 995, ['the line passes through (', { v: 'x', bar: 1 }, ', ', { v: 'y', bar: 1 }, ')'], 48, true);
  });
}

/* ---------- framed bar chart print ---------- */
function chartTex(T) {
  return tex(T, 420, 540, function (c, w, h) {
    var vals = [32, 45, 18, 27, 38], cols = [NAVY, TEAL, MUSTARD, '#7d8fb5', '#b4533f'], i, y, bt = 470, tp = 110, sc = (bt - tp) / 50;
    c.fillStyle = '#efe8d6'; c.fillRect(0, 0, w, h); c.fillStyle = INK; c.textAlign = 'center'; c.font = 'bold 32px ' + SANS; c.fillText('Responses per group', w / 2, 56);
    c.strokeStyle = 'rgba(35,43,61,0.2)'; c.lineWidth = 2; c.font = '22px ' + SANS; c.textAlign = 'right';
    for (i = 0; i <= 5; i++) { y = bt - i * 10 * sc; c.beginPath(); c.moveTo(78, y); c.lineTo(396, y); c.stroke(); c.fillStyle = INK; c.fillText(String(i * 10), 66, y + 8); }
    c.textAlign = 'center';
    for (i = 0; i < 5; i++) {
      var x = 100 + i * 62; c.fillStyle = cols[i]; c.fillRect(x - 21, bt - vals[i] * sc, 42, vals[i] * sc);
      c.fillStyle = INK; c.font = 'bold 24px ' + SANS; c.fillText(String(vals[i]), x, bt - vals[i] * sc - 8); c.font = '26px ' + SANS; c.fillText('ABCDE'.charAt(i), x, bt + 34);
    }
    c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(78, tp - 8); c.lineTo(78, bt); c.lineTo(396, bt); c.stroke();
    c.font = '22px ' + SANS; c.fillText('n = 160 respondents', w / 2, 524);
  });
}

/* ---------- cards, dice, coins ---------- */
function dieFace(T, n, bg, pip) {
  var P = { 1: [[0.5, 0.5]], 2: [[0.3, 0.3], [0.7, 0.7]], 3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]], 4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]], 5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]], 6: [[0.3, 0.25], [0.7, 0.25], [0.3, 0.5], [0.7, 0.5], [0.3, 0.75], [0.7, 0.75]] };
  return tex(T, 96, 96, function (c, w, h) {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = pip;
    P[n].forEach(function (p) { c.beginPath(); c.arc(p[0] * w, p[1] * h, 9, 0, 6.2832); c.fill(); });
  });
}
function coinFace(T, ch, base, ink) {
  return tex(T, 128, 128, function (c, w, h) {
    c.fillStyle = base; c.fillRect(0, 0, w, h); c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 52, 0, 6.2832); c.stroke();
    c.fillStyle = ink; c.font = 'bold 64px ' + SERIF; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 64, 68);
  });
}
function cardBack(T) {
  return tex(T, 90, 126, function (c, w, h) {
    var i, j; c.fillStyle = '#ece6d2'; c.fillRect(0, 0, w, h); c.fillStyle = NAVY; c.fillRect(6, 6, w - 12, h - 12);
    c.strokeStyle = MUSTARD; c.lineWidth = 2;
    for (i = 0; i < 6; i++) for (j = 0; j < 8; j++) { var x = 6 + i * 13 + 6.5, y = 6 + j * 15 + 7.5; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 5, y); c.lineTo(x, y + 6); c.lineTo(x - 5, y); c.closePath(); c.stroke(); }
  });
}
function cardFace(T, rank, suit, red) {
  var t0 = tex(T, 90, 126, function (c, w, h) {
    c.fillStyle = '#ece6d2'; c.fillRect(0, 0, w, h); c.fillStyle = red ? '#b23a3a' : INK; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = 'bold 26px ' + SERIF; c.fillText(rank, 18, 30); c.fillText(rank, w - 18, h - 12);
    c.font = '20px ' + SERIF; c.fillText(suit, 18, 52); c.fillText(suit, w - 18, h - 34);
    c.font = '56px ' + SERIF; c.fillText(suit, w / 2, h / 2 + 20);
  });
  return t0;
}

/* many boxes with per-box colour in one mesh, so books, doors and slats cost one draw call */
function merger(T, basic) {
  var UB = new T.BoxGeometry(1, 1, 1), pa = UB.attributes.position.array, na = UB.attributes.normal.array, ia = UB.index.array;
  var P = [], N = [], C = [], I = [], v = 0, m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), nm = new T.Matrix3(), a = new T.Vector3(), col = new T.Color();
  return {
    box: function (w, h, d, x, y, z, color, rx, ry, rz) {
      var k; e.set(rx || 0, ry || 0, rz || 0, 'XYZ'); m.compose(p.set(x, y, z), q.setFromEuler(e), s.set(w, h, d)); nm.getNormalMatrix(m); col.set(color).multiplyScalar(basic ? 1 : 0.85);
      for (k = 0; k < pa.length; k += 3) { a.set(pa[k], pa[k + 1], pa[k + 2]).applyMatrix4(m); P.push(a.x, a.y, a.z); a.set(na[k], na[k + 1], na[k + 2]).applyMatrix3(nm).normalize(); N.push(a.x, a.y, a.z); C.push(col.r, col.g, col.b); }
      for (k = 0; k < ia.length; k++) I.push(ia[k] + v);
      v += pa.length / 3;
    },
    mesh: function () {
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); geo.setIndex(I);
      return new T.Mesh(geo, basic ? new T.MeshBasicMaterial({ vertexColors: true }) : new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
    }
  };
}

/* every soft contact shadow in a few draw calls: planes batched by opacity, sharing one texture */
function shadowBatch(T) {
  var tex0 = canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  var groups = {};
  return {
    add: function (x, y, z, w, d, op) {
      var key = op.toFixed(2), gp = groups[key] || (groups[key] = { op: op, P: [], U: [], I: [] }), v = gp.P.length / 3;
      gp.P.push(x - w / 2, y, z + d / 2, x + w / 2, y, z + d / 2, x + w / 2, y, z - d / 2, x - w / 2, y, z - d / 2);
      gp.U.push(0, 0, 1, 0, 1, 1, 0, 1); gp.I.push(v, v + 1, v + 2, v, v + 2, v + 3);
    },
    build: function (parent) {
      Object.keys(groups).forEach(function (key) {
        var gp = groups[key], geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(gp.P, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(gp.U, 2)); geo.setIndex(gp.I);
        var m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex0, transparent: true, opacity: gp.op, depthWrite: false })); parent.add(m);
      });
    }
  };
}

/* ---------- outdoors: a daytime sky and three skyline layers that shift as the camera orbits ---------- */
function skyTex(T) {
  return tex(T, 512, 512, function (c, w, h) {
    var r = mulberry(31), i, g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5f9bd0'); g.addColorStop(0.5, '#9cc6e4'); g.addColorStop(0.75, '#cfe3ee'); g.addColorStop(1, '#dcebf0'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (i = 0; i < 26; i++) {
      c.save(); c.translate(r() * w, h * (0.12 + r() * 0.6)); c.scale(2.6 + r() * 2.4, 0.6); var rad = 22 + r() * 40, rg = c.createRadialGradient(0, 0, 0, 0, 0, rad);
      rg.addColorStop(0, 'rgba(250,252,255,' + (0.35 + r() * 0.3) + ')'); rg.addColorStop(1, 'rgba(250,252,255,0)'); c.fillStyle = rg; c.beginPath(); c.arc(0, 0, rad, 0, 7); c.fill(); c.restore();
    }
  });
}
/* Wp: plane width in units; the canvas keeps the same scale. Buildings run from min to max units above the layer's lower edge, down to the bottom. */
function skylineTex(T, seed, Wp, Hp, lo, hi, baseCol, winCol, warm) {
  var k = 1920 / Wp;
  return tex(T, 1920, Math.round(Hp * k), function (c, w, h) {
    var r = mulberry(seed), px = 0, bw, bh, i, j, cw = 0.34 * k, ch = 0.5 * k, gx = 0.62 * k, gy = 0.86 * k;
    while (px < w) {
      bw = (1.4 + r() * 2.8) * k; bh = (lo + r() * (hi - lo)) * k;
      c.fillStyle = baseCol; c.fillRect(px, h - bh, bw - 2, bh);
      if (r() < 0.22) c.fillRect(px + bw * 0.45, h - bh - 0.9 * k, 0.12 * k + 1, 0.9 * k);
      for (i = px + 0.3 * k; i < px + bw - 0.7 * k; i += gx) for (j = h - bh + 0.4 * k; j < h - 4 * k; j += gy) {
        if (r() < 0.42) { c.fillStyle = warm && r() < 0.2 ? 'rgba(236,214,160,0.7)' : winCol; c.fillRect(i, j, cw, ch); }
      }
      px += bw;
    }
  });
}

ENV.analyst = function (T) {
  var g = new T.Group(), rnd = mulberry(52), i, j, k;
  var FLOOR = -13, CEIL = 31, ZB = -19, XS = 55, ZF = 70, ZC = (ZB + ZF) / 2, YC = (CEIL + FLOOR) / 2;

  /* light: the shared budget, warm */
  g.add(new T.HemisphereLight(0xfff0dc, 0x4a4036, 0.5));
  var key = new T.DirectionalLight(0xffeedb, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xeceae6, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe4c4, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  var sh = shadowBatch(T);
  var deco = merger(T), trim = merger(T, true);   /* every plain coloured box: doors, slats, books, boxes, in one draw call */
  function bb(parent, w, h, d, color, x, y, z) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: color })); o.position.set(x, y, z); parent.add(o); return o; }
  function strut(parent, A, B, r, m) {
    var d = B.clone().sub(A), len = d.length(), o = new T.Mesh(new T.CylinderGeometry(r, r, len, 10), m);
    o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); parent.add(o); return o;
  }

  /* ---------- floor and rug ---------- */
  var floor = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshStandardMaterial({
    map: tex(T, 256, 256, function (c, w, h) {
      var r = mulberry(5), n; c.fillStyle = '#8a8070'; c.fillRect(0, 0, w, h);
      for (n = 0; n < 2600; n++) { c.fillStyle = r() < 0.5 ? 'rgba(60,50,40,' + r() * 0.12 + ')' : 'rgba(255,245,225,' + r() * 0.1 + ')'; c.fillRect(r() * w, r() * h, 2, 2); }
      c.strokeStyle = 'rgba(40,32,24,0.35)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h);
    }, { repeat: [15.7, 12.7] }), roughness: 0.95, metalness: 0
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, ZC); floor.renderOrder = -3; g.add(floor);
  var rug = new T.Mesh(new T.PlaneGeometry(64, 34), new T.MeshStandardMaterial({
    map: tex(T, 640, 340, function (c, w, h) {
      var n; c.fillStyle = '#2a3e68'; c.fillRect(0, 0, w, h); c.strokeStyle = MUSTARD; c.lineWidth = 10; c.strokeRect(22, 22, w - 44, h - 44);
      c.strokeStyle = '#e6dcc0'; c.lineWidth = 3; c.strokeRect(44, 44, w - 88, h - 88); c.strokeStyle = TEAL; c.lineWidth = 6; c.strokeRect(58, 58, w - 116, h - 116);
      c.fillStyle = 'rgba(213,162,43,0.55)'; for (n = 0; n < 14; n++) { c.beginPath(); c.arc(100 + n * 33, h / 2, 6, 0, 7); c.fill(); }
      for (n = 0; n < 2500; n++) { c.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.07 + ')'; c.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
    }), roughness: 0.95, metalness: 0
  }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, FLOOR + 0.06, 1); rug.renderOrder = -2; g.add(rug);
  sh.add(0, FLOOR + 0.12, 1, 62, 33, 0.35);

  /* ---------- walls: beige above, tan wainscot, light trim ---------- */
  var wallTex = tex(T, 8, 256, function (c, w, h) { var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ccbd9c'); gr.addColorStop(1, '#d9cdb1'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  var WH = { x: -42, y: 8.75, w: 13, h: 12.5 };   /* window hole in the back wall (world coordinates) */
  function wallPanel(L, x, z, ry, hole) {
    var p = new T.Group(), wm = new T.MeshBasicMaterial({ map: wallTex }), Hh = CEIL - FLOOR;
    p.position.set(x, YC, z); p.rotation.y = ry; g.add(p);
    function add(x0, y0, x1, y1) { if (x1 - x0 > 0.01 && y1 - y0 > 0.01) { var m = new T.Mesh(rectGeo(T, L, Hh, x0, y0, x1, y1), wm); m.renderOrder = -3; p.add(m); } }
    if (!hole) add(-L / 2, -Hh / 2, L / 2, Hh / 2);
    else {
      var hx = hole.x, hy = hole.y - YC, x0 = hx - hole.w / 2, x1 = hx + hole.w / 2, y0 = hy - hole.h / 2, y1 = hy + hole.h / 2;
      add(-L / 2, -Hh / 2, L / 2, y0); add(-L / 2, y1, L / 2, Hh / 2); add(-L / 2, y0, x0, y1); add(x1, y0, L / 2, y1);
    }
    function tb(w, h, d, color, wy, lz) { trim.box(w, h, d, x + lz * Math.sin(ry), wy, z + lz * Math.cos(ry), color, 0, ry); }
    tb(L, 13, 0.3, '#bfae8c', FLOOR + 6.5, 0.15);   /* wainscot */
    tb(L, 0.5, 0.5, '#d6cdb6', 0.25, 0.25);         /* chair rail */
    tb(L, 1.2, 0.5, '#a89674', FLOOR + 0.6, 0.25);  /* baseboard */
    tb(L, 1.0, 0.5, '#d6cdb6', CEIL - 0.5, 0.25);   /* crown */
    return p;
  }
  wallPanel(110, 0, ZB, 0, WH); wallPanel(ZF - ZB, -XS, ZC, Math.PI / 2); wallPanel(ZF - ZB, XS, ZC, -Math.PI / 2);
  var ceil = new T.Mesh(new T.PlaneGeometry(XS * 2, ZF - ZB), new T.MeshBasicMaterial({ color: '#cfc4ac' })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, CEIL, ZC); ceil.renderOrder = -3; g.add(ceil);

  /* ---------- window onto a city (back wall, left) ---------- */
    var ww = WH.w, wh = WH.h, fzz = -0.45, frameM = '#2a3a5c', revM = '#cdc3a8';
  function wbx(w, h, d, x, y, z, c) { deco.box(w, h, d, WH.x + x, WH.y + y, ZB + z, c); }
  wbx(0.14, wh, 0.9, -ww / 2 + 0.07, 0, -0.45, revM); wbx(0.14, wh, 0.9, ww / 2 - 0.07, 0, -0.45, revM); wbx(ww, 0.14, 0.9, 0, wh / 2 - 0.07, -0.45, revM); wbx(ww, 0.14, 0.9, 0, -wh / 2 + 0.07, -0.45, revM);
  var iw = ww - 0.28, ih = wh - 0.28;
  wbx(0.5, ih, 0.5, -ww / 2 + 0.39, 0, fzz, frameM); wbx(0.5, ih, 0.5, ww / 2 - 0.39, 0, fzz, frameM); wbx(iw, 0.5, 0.5, 0, wh / 2 - 0.39, fzz, frameM); wbx(iw, 0.5, 0.5, 0, -wh / 2 + 0.39, fzz, frameM);
  [-ww / 6, ww / 6].forEach(function (mx) { wbx(0.26, ih - 0.3, 0.3, mx, 0, fzz, frameM); }); wbx(iw - 0.3, 0.26, 0.3, 0, wh * 0.12, fzz, frameM);
  /* sill with a small plant */
  wbx(ww + 1.6, 0.35, 1.9, 0, -wh / 2 - 0.17, 0.0, '#cdc3a8');
  /* outdoors */
  var hb = WH.y - wh / 2;   /* world y of the hole's lower edge */
  var sk = new T.Mesh(new T.PlaneGeometry(110, 64), new T.MeshBasicMaterial({ map: skyTex(T) })); sk.position.set(WH.x - 14, WH.y + 8, ZB - 24); g.add(sk);
  /* the camera looks through the window at a slant, so the planes sit close behind the wall and are wide */
  [[6, 48, 4, 1.0, 3.2, '#4d6584', 'rgba(228,238,246,0.65)'], [11, 64, 7, 1.6, 5, '#7890ae', 'rgba(205,224,240,0.6)'], [17, 80, 10, 2.5, 7, '#a9bdd0', 'rgba(222,234,244,0.55)']].forEach(function (L, idx) {
    var Wp = L[1], Hp = L[2] + L[4] + 1.2, mm = new T.Mesh(new T.PlaneGeometry(Wp, Hp), new T.MeshBasicMaterial({ map: skylineTex(T, 90 + idx, Wp, Hp, L[2] + L[3], L[2] + L[4], L[5], L[6], idx === 0), transparent: true }));
    mm.position.set(WH.x - 12, hb - L[2] + Hp / 2, ZB - L[0]); g.add(mm);
  });
  /* venetian blinds drawn up over the top of the window */
  var by0 = WH.y + wh / 2 - 0.9;
  deco.box(ww - 1.0, 0.36, 0.5, WH.x, WH.y + wh / 2 - 0.55, ZB + 0.35, '#8e8266');
  for (i = 0; i < 7; i++) deco.box(ww - 1.2, 0.12, 0.55, WH.x, by0 - i * 0.38, ZB + 0.35, '#e1d8c2', -0.5);
  deco.box(ww - 1.0, 0.18, 0.5, WH.x, by0 - 7 * 0.38 + 0.1, ZB + 0.35, '#8e8266');
  /* window plant */
  var leafGeo = new T.SphereGeometry(0.5, 8, 6), leafM = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  function leaves(list, cols) {
    var im = new T.InstancedMesh(leafGeo, leafM, list.length), mt = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), cc = new T.Color(), pp = new T.Vector3(), ss = new T.Vector3();
    list.forEach(function (l, n) { e.set(l.rx, 0, l.rz); q.setFromEuler(e); mt.compose(pp.set(l.x, l.y, l.z), q, ss.set(l.sx, l.sy, l.sz)); im.setMatrixAt(n, mt); im.setColorAt(n, cc.set(cols[n % cols.length])); });
    im.instanceColor.needsUpdate = true; return im;
  }
  var pot1 = new T.Mesh(lathe(T, [[0, 0], [0.4, 0], [0.5, 0.1], [0.62, 1.0], [0.55, 1.05], [0.48, 0.95], [0, 0.95]], 20), new T.MeshStandardMaterial({ color: '#b5714c', roughness: 0.9, side: T.DoubleSide }));
  pot1.position.set(WH.x + 3.2, hb + 0.02, ZB + 0.05); g.add(pot1);
  var ll = [], a;
  for (i = 0; i < 9; i++) { a = i / 9 * 6.283 + rnd(); ll.push({ x: WH.x + 3.2 + Math.sin(a) * 0.35, y: hb + 1.9 + rnd() * 0.5, z: ZB + 0.05 + Math.cos(a) * 0.35, rx: Math.cos(a) * 0.5, rz: -Math.sin(a) * 0.5, sx: 0.4, sy: 1.8 + rnd() * 0.6, sz: 0.18 }); }
  g.add(leaves(ll, ['#4f8a5a', '#427a4f']));

  /* ---------- light wood desk: 64 wide, 20 deep ---------- */
  var topTex = grainTex(T, 3, false, '#c4a878', 1024, 512), grainH = grainTex(T, 5, false, '#bb9e6f', 256, 256), grainV = grainTex(T, 8, true, '#b79868', 256, 256);
  grainH.wrapS = grainH.wrapT = grainV.wrapS = grainV.wrapT = T.RepeatWrapping;
  function wood(map) { return new T.MeshStandardMaterial({ map: map, roughness: 0.82, metalness: 0 }); }
  var matH = wood(grainH), matV = wood(grainV), matTop = wood(topTex);
  /* texture coordinates follow the box's real size, so the grain is the same scale on every board */
  function woodBoxGeo(w, h, d, skipTop) {
    var geo = new T.BoxGeometry(w, h, d), uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], f, kk, n;
    for (f = 0; f < 6; f++) { if (skipTop && f === 2) continue; for (kk = 0; kk < 4; kk++) { n = f * 4 + kk; uv.setXY(n, uv.getX(n) * Math.max(dims[f][0], 4) / 8, uv.getY(n) * Math.max(dims[f][1], 4) / 8); } }
    return geo;
  }
  function wbox(w, h, d, x, y, z, m) { var o = new T.Mesh(woodBoxGeo(w, h, d), m || matH); o.position.set(x, y, z); g.add(o); return o; }
  var TZ0 = -12, TZ1 = 8, TCZ = (TZ0 + TZ1) / 2, TW = 64, TD = TZ1 - TZ0, TTH = 1.1;
  var dtop = new T.Mesh(woodBoxGeo(TW, TTH, TD, true), [matH, matH, matTop, matH, matH, matH]); dtop.position.set(0, -0.03 - TTH / 2, TCZ); g.add(dtop);
  var ay = -0.03 - TTH - 1.0;
  wbox(TW - 4.6, 2.0, 1.1, 0, ay, TZ1 - 1.6); wbox(TW - 4.6, 2.0, 1.1, 0, ay, TZ0 + 1.6); wbox(1.1, 2.0, TD - 4.6, TW / 2 - 1.6, ay, TCZ); wbox(1.1, 2.0, TD - 4.6, -TW / 2 + 1.6, ay, TCZ);
  var legH = -0.03 - TTH - FLOOR;
  [[-1, TZ0 + 1.6], [1, TZ0 + 1.6], [-1, TZ1 - 1.6], [1, TZ1 - 1.6]].forEach(function (l) { wbox(2.2, legH, 2.2, l[0] * (TW / 2 - 1.6), FLOOR + legH / 2, l[1], matV); sh.add(l[0] * (TW / 2 - 1.6), FLOOR + 0.12, l[1], 4.6, 4.6, 0.5); });
  var tableShadow = contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5);   /* the stage sizes this under the subject */

  /* ---------- counter along the back wall: light wood cabinets, navy top ---------- */
  var CX0 = -34, CX1 = 36, CCX = (CX0 + CX1) / 2, CW = CX1 - CX0, CTOP = 0.8;
  wbox(CW - 0.4, CTOP - 0.6 - FLOOR - 1.0, 5.3, CCX, (FLOOR + 1.0 + CTOP - 0.6) / 2, -16.15);
  bb(g, CW - 1, 1.0, 4.6, '#2c241c', CCX, FLOOR + 0.5, -16.0);
  var cdoor = '#c8aa7c';
  for (i = 0; i < 15; i++) {
    var dx = CX0 + 2.35 + i * (CW - 4.7) / 14;
    deco.box(4.3, 11.4, 0.22, dx, FLOOR + 1.0 + 5.9, -13.4, cdoor); deco.box(0.2, 1.5, 0.22, dx + (i % 2 ? -1.7 : 1.7), -1.6, -13.2, MUSTARD);
  }
  var ctop = new T.Mesh(new T.BoxGeometry(CW, 0.6, 5.8), mat(T, '#2b3d63', 0.85, 0)); ctop.position.set(CCX, CTOP - 0.3, -16.0); g.add(ctop);

  /* ---------- whiteboard: x -21..5, y 2.2..13.5 ---------- */
  var BX0 = -21, BX1 = 5, BY0 = 2.2, BY1 = 13.5, BW = BX1 - BX0, BH = BY1 - BY0, BCX = (BX0 + BX1) / 2, BCY = (BY0 + BY1) / 2, alu = '#8a8f8d';
  var side = new T.MeshStandardMaterial({ color: '#9ea19f', roughness: 0.8 });
  var bface = new T.Mesh(new T.BoxGeometry(BW, BH, 0.3), [side, side, side, side, new T.MeshBasicMaterial({ map: boardTex(T) }), side]); bface.position.set(BCX, BCY, -18.55); g.add(bface);
  deco.box(BW + 1.0, 0.5, 0.9, BCX, BY1 + 0.25, -18.45, alu); deco.box(BW + 1.0, 0.5, 0.9, BCX, BY0 - 0.25, -18.45, alu);
  deco.box(0.5, BH, 0.9, BX0 - 0.25, BCY, -18.45, alu); deco.box(0.5, BH, 0.9, BX1 + 0.25, BCY, -18.45, alu);
  deco.box(22, 0.3, 1.2, BCX, BY0 - 0.65, -18.3, alu); deco.box(22, 0.12, 0.12, BCX, BY0 - 0.44, -17.76, alu);
  [[NAVY, -8.6, 0.1], [TEAL, -7.7, -0.12], [MUSTARD, -6.8, 0.06]].forEach(function (mk) {
    var mc = cyl(T, g, 0.09, 0.09, 1.0, mk[0], BCX + mk[1] + 3.5, BY0 - 0.42, -18.2, 0.8, 0); mc.rotation.z = Math.PI / 2; mc.rotation.y = mk[2];
    var cap = cyl(T, g, 0.1, 0.1, 0.3, '#33384a', BCX + mk[1] + 3.5 + 0.55, BY0 - 0.42, -18.2 - mk[2] * 0.4, 0.8, 0); cap.rotation.z = Math.PI / 2; cap.rotation.y = mk[2];
  });
  box(T, g, 1.3, 0.35, 0.55, '#3d4a6e', BCX + 6, BY0 - 0.32, -18.2, 0.9, 0);

  /* ---------- Galton board: 10 rows of pegs, 11 bins, 84 balls dropped at the binomial odds ---------- */
  var GX = 14.2, GZ = -16.0, gal = new T.Group(); gal.position.set(GX, CTOP, GZ); g.add(gal);   /* gal holds the instanced and round parts; its boxes go into the shared mesh */
  var ROWS = 10, SP = 0.8, DY = 0.69, PY0 = 12.1, wd = '#b8955f';
  function gbox(w, h, d, x, y, z, color, rz) { deco.box(w, h, d, GX + x, CTOP + y, GZ + z, color, 0, 0, rz || 0); }
  gbox(11.4, 0.5, 3.4, 0, 0.25, 0, wd);
  gbox(10.3, 13.1, 0.3, 0, 7.05, -0.4, NAVY);
  gbox(0.4, 13.6, 1.1, -5.35, 7.3, 0, wd); gbox(0.4, 13.6, 1.1, 5.35, 7.3, 0, wd); gbox(4.7, 0.5, 1.1, -3.2, 13.85, 0, wd); gbox(4.7, 0.5, 1.1, 3.2, 13.85, 0, wd); gbox(10.3, 0.4, 1.1, 0, 0.7, 0, wd);
  for (i = 0; i < 12; i++) gbox(0.07, 4.0, 0.8, (i - 5.5) * SP, 2.9, 0.15, '#e3dcc6');
  var th = Math.atan(4.41 / 7.6), rl = Math.sqrt(4.41 * 4.41 + 7.6 * 7.6);
  [-1, 1].forEach(function (sd) { gbox(0.25, rl, 0.8, sd * 2.625, 8.7, 0.15, '#e3dcc6', sd * th); });
  var fun = new T.Mesh(lathe(T, [[0.17, 12.7], [0.22, 13.0], [0.7, 14.7], [0.78, 14.76]], 20), new T.MeshStandardMaterial({ color: MUSTARD, roughness: 0.8, side: T.DoubleSide })); fun.position.set(0, 0, 0.15); gal.add(fun);
  var pegGeo = new T.CylinderGeometry(0.11, 0.11, 0.5, 8); pegGeo.rotateX(Math.PI / 2);
  var pegs = new T.InstancedMesh(pegGeo, new T.MeshStandardMaterial({ color: '#d9d1ba', roughness: 0.7 }), 55), mt = new T.Matrix4(), pn = 0, r0, c0;
  for (r0 = 0; r0 < ROWS; r0++) for (c0 = 0; c0 <= r0; c0++) { mt.makeTranslation((c0 - r0 / 2) * SP, PY0 - r0 * DY, 0.0); pegs.setMatrixAt(pn++, mt); }
  gal.add(pegs);
  var bins = [0, 1, 4, 10, 17, 20, 17, 10, 4, 1, 0], bp = [], ballCols = [MUSTARD, TEAL, '#e5dcc2'];
  bins.forEach(function (cnt, kk) { for (var q = 0; q < cnt; q++) { var row = Math.floor(q / 2), colx = cnt === 1 ? 0 : (q % 2 ? 0.18 : -0.18); bp.push([(kk - 5) * SP + colx, 0.9 + 0.17 + row * 0.33]); } });
  var balls = new T.InstancedMesh(new T.SphereGeometry(0.165, 12, 9), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }), bp.length), cc = new T.Color();
  bp.forEach(function (p, n) { mt.makeTranslation(p[0], p[1], 0.05); balls.setMatrixAt(n, mt); var u = rnd(); balls.setColorAt(n, cc.set(u < 0.55 ? ballCols[0] : u < 0.85 ? ballCols[1] : ballCols[2])); });
  balls.instanceColor.needsUpdate = true; gal.add(balls);
  sh.add(14.2, CTOP + 0.06, -16.0, 13.5, 5, 0.45);

  /* ---------- on the counter: lamp, binders, plant, paper boxes ---------- */
  var lamp = new T.Group(), lm = mat(T, '#d5a22b', 0.8, 0), lnav = mat(T, '#2b3d63', 0.85, 0); lamp.position.set(7.0, CTOP, -16.3); g.add(lamp);
  lamp.add(new T.Mesh(new T.CylinderGeometry(1.1, 1.2, 0.3, 24), lnav)).position.y = 0.15;
  var pA = new T.Vector3(0, 0.3, 0), pB = new T.Vector3(0.5, 6.0, 0), pC = new T.Vector3(-0.2, 9.8, 0);
  strut(lamp, pA, pB, 0.13, lm); strut(lamp, pB, pC, 0.13, lm);
  [pB, pC].forEach(function (p) { var s = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), lnav); s.position.copy(p); lamp.add(s); });
  var head = new T.Group(); head.position.copy(pC); head.rotation.z = -0.45; lamp.add(head);
  var shade = new T.Mesh(lathe(T, [[0.0, 1.1], [0.35, 1.1], [0.5, 0.85], [1.5, -0.3], [1.58, -0.4]], 28), new T.MeshStandardMaterial({ color: MUSTARD, roughness: 0.8, side: T.DoubleSide })); shade.position.y = -0.1; head.add(shade);
  var bulb = new T.Mesh(new T.SphereGeometry(0.26, 10, 8), new T.MeshBasicMaterial({ color: new T.Color('#fff0cf').multiplyScalar(0.9) })); bulb.position.y = -0.18; head.add(bulb);
  sh.add(7.0, CTOP + 0.06, -16.3, 3.6, 3.6, 0.5);
  /* binders */
  [[-28.4, NAVY, 3.7], [-27.3, MUSTARD, 3.4], [-26.2, TEAL, 3.7], [-25.1, '#b4533f', 3.5], [-24.0, NAVY, 3.6]].forEach(function (b) {
    deco.box(1.0, b[2], 3.0, b[0], CTOP + b[2] / 2, -15.6, b[1]); deco.box(0.82, 0.5, 0.06, b[0], CTOP + b[2] * 0.62, -14.08, '#b9af93');
  });
  sh.add(-26.2, CTOP + 0.06, -15.6, 7, 4.2, 0.4);
  /* paper boxes */
  deco.box(3.4, 2.2, 4.6, -32.5, CTOP + 1.1, -15.8, '#d7cdb2', 0, 0.06); deco.box(3.5, 0.3, 4.7, -32.5, CTOP + 2.25, -15.8, '#c5b996', 0, 0.06); deco.box(3.4, 2.2, 4.6, -32.9, CTOP + 3.5, -15.7, '#d7cdb2', 0, -0.08);
  sh.add(-32.5, CTOP + 0.06, -15.8, 6, 6, 0.4);
  /* a small plant */
  var pot2 = new T.Mesh(lathe(T, [[0, 0], [0.7, 0], [0.9, 0.1], [1.05, 1.5], [0.95, 1.55], [0.85, 1.4], [0, 1.4]], 20), new T.MeshStandardMaterial({ color: '#2f6f6c', roughness: 0.9, side: T.DoubleSide })); pot2.position.set(-30.0, CTOP, -16.0); g.add(pot2);
  sh.add(-30.0, CTOP + 0.06, -16.0, 3.4, 3.4, 0.45);
  var l2 = [];
  for (i = 0; i < 12; i++) { a = i / 12 * 6.283 + rnd(); l2.push({ x: -30.0 + Math.sin(a) * 0.5, y: CTOP + 2.4 + rnd() * 0.8, z: -16.0 + Math.cos(a) * 0.5, rx: Math.cos(a) * 0.55, rz: -Math.sin(a) * 0.55, sx: 0.5, sy: 1.9 + rnd() * 0.7, sz: 0.2 }); }
  g.add(leaves(l2, ['#4f8a5a', '#3f7a52', '#5a9a62']));

  /* ---------- framed bar chart print (right of the Galton board) ---------- */
  var PX = 26.5, PY = 9.5;
  box(T, g, 6.4, 8.0, 0.5, '#6e4f33', PX, PY, ZB + 0.35, 0.8, 0); box(T, g, 5.6, 7.2, 0.14, '#e6dcc0', PX, PY, ZB + 0.66, 0.9, 0);
  var print = new T.Mesh(new T.BoxGeometry(4.8, 6.1, 0.1), [side, side, side, side, new T.MeshBasicMaterial({ map: chartTex(T) }), side]); print.position.set(PX, PY, ZB + 0.8); g.add(print);

  /* ---------- bookshelf with statistics books (right end of the back wall) ---------- */
  var SX0 = 38, SX1 = 53, SC = (SX0 + SX1) / 2, SZB = -18.6, SZF = -14.6, SZC = (SZB + SZF) / 2, SD = SZF - SZB, PITCH = 5.2, S0 = -11.4, SHT = S0 + 4 * PITCH + 4.9 + 0.5;
  wbox(0.8, SHT - FLOOR, SD, SX0 + 0.4, (SHT + FLOOR) / 2, SZC, matV); wbox(0.8, SHT - FLOOR, SD, SX1 - 0.4, (SHT + FLOOR) / 2, SZC, matV);
  wbox(SX1 - SX0 - 1.6, SHT - FLOOR, 0.15, SC, (SHT + FLOOR) / 2, SZB + 0.1, new T.MeshStandardMaterial({ color: '#8a7456', roughness: 0.95 }));
  for (i = 0; i < 5; i++) wbox(SX1 - SX0 - 1.6, 0.5, SD - 0.1, SC, S0 - 0.25 + i * PITCH, SZC);
  wbox(SX1 - SX0 + 0.8, 0.7, SD + 0.5, SC, SHT + 0.35, SZC + 0.1); wbox(SX1 - SX0 - 1.6, 1.2, 0.3, SC, FLOOR + 0.6, SZF - 0.2, matH);
  var bookCols = [NAVY, '#c4952a', TEAL, '#e0d6bc', '#b4533f', '#4d5f86', '#8e8266', '#2f5d58', '#d6a93c', '#6b3f3a'];
  var titles = ['PROBABILITY', 'REGRESSION', 'STATISTICS', 'SAMPLING', 'INFERENCE', 'BAYESIAN DATA', 'EXPERIMENTS', 'DISTRIBUTIONS', 'TIME SERIES', 'LINEAR MODELS', 'ESTIMATION', 'VARIANCE', 'DATA ANALYSIS', 'HYPOTHESIS TESTS'];
  var zFront = SZF - 0.5, xl = SX0 + 0.8, xr = SX1 - 0.8, rowW = xr - xl, tt = 0;
  for (j = 0; j < 5; j++) {
    var s = S0 + j * PITCH, x = xl + 0.1, row = [];
    while (x < xr - 1.0) {
      var w = 0.55 + rnd() * 0.65, h = 3.1 + rnd() * 1.6, d = 2.6 + rnd() * 0.5, col = bookCols[Math.floor(rnd() * bookCols.length)];
      if (j === 4 && x > xl + 8 && x < xl + 10.5) { x += 0.4; continue; }
      if (x + w > xr - 0.1) break;
      deco.box(w, h, d, x + w / 2, s + h / 2, zFront - d / 2, col); row.push({ x: x - xl + w / 2, w: w, h: h, col: col }); x += w + 0.02;
    }
    var lab = new T.Mesh(new T.PlaneGeometry(rowW, 5), new T.MeshBasicMaterial({
      map: tex(T, 768, 384, (function (rowB, rowN) { return function (c, cw, ch) {
        var kx = cw / rowW, ky = ch / 5, n;
        c.clearRect(0, 0, cw, ch); c.textAlign = 'center'; c.textBaseline = 'middle';
        rowB.forEach(function (b, ix) {
          var px = b.x * kx, dark = b.col === '#e0d6bc' || b.col === '#d6a93c' || b.col === '#c4952a';
          c.fillStyle = dark ? 'rgba(35,43,61,0.7)' : 'rgba(224,214,188,0.8)'; c.fillRect(px - b.w * kx / 2 + 3, ch - 0.7 * ky - 4, b.w * kx - 6, 6); c.fillRect(px - b.w * kx / 2 + 3, ch - (b.h - 0.55) * ky, b.w * kx - 6, 6);
          if (b.w > 0.78) { c.save(); c.translate(px, ch - b.h * ky * 0.5 - 0.05 * ky); c.rotate(Math.PI / 2); c.fillStyle = dark ? 'rgba(35,43,61,0.95)' : 'rgba(236,228,206,0.95)'; c.font = 'bold ' + Math.min(b.w * kx * 0.5, 24) + 'px ' + SANS; c.fillText(titles[(rowN * 3 + ix) % titles.length], 0, 0, (b.h - 1.6) * ky); c.restore(); }
        });
      }; })(row, j)), transparent: true, depthWrite: false
    }));
    lab.position.set((xl + xr) / 2, s + 2.5, zFront + 0.13); lab.renderOrder = 1; g.add(lab);
  }

  /* ---------- on the desk: marbles, dice, coins, cards, notebook, mug ---------- */
  /* jar of marbles, left */
  var JX = -14.6, JZ = -9.6, jar = new T.Group(); jar.position.set(JX, 0, JZ); g.add(jar);
  var jarProf = [[0, 0], [0.95, 0], [1.05, 0.12], [1.05, 2.7], [0.88, 3.0], [0.88, 3.3]];
  jar.add(new T.Mesh(lathe(T, jarProf, 28), new T.MeshStandardMaterial({ color: '#cfe2e4', roughness: 0.3, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false })));
  var jrim = new T.Mesh(new T.TorusGeometry(0.88, 0.05, 6, 28), new T.MeshStandardMaterial({ color: '#cfe2e4', roughness: 0.5, transparent: true, opacity: 0.4, depthWrite: false })); jrim.rotation.x = Math.PI / 2; jrim.position.y = 3.3; jar.add(jrim);
  var mp = [], lay, ix, iz, mx2, mz2, rr0 = 0.8, sp2 = 0.37;
  for (lay = 0; lay < 8; lay++) {
    var off = lay % 2 ? sp2 / 2 : 0, offz = lay % 2 ? sp2 * 0.433 : 0;
    for (ix = -3; ix <= 3; ix++) for (iz = -3; iz <= 3; iz++) {
      mx2 = ix * sp2 + off + (iz % 2 ? sp2 / 2 : 0); mz2 = iz * sp2 * 0.866 + offz;
      if (Math.sqrt(mx2 * mx2 + mz2 * mz2) <= rr0) mp.push([mx2 + (rnd() - 0.5) * 0.02, 0.15 + 0.17 + lay * 0.3, mz2 + (rnd() - 0.5) * 0.02]);
    }
  }
  var marbles = new T.InstancedMesh(new T.SphereGeometry(0.17, 10, 8), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), mp.length + 4), mcols = [TEAL, MUSTARD, NAVY, '#e5dcc2', '#b4533f'];
  mp.forEach(function (p, n) { var u = rnd(); mt.makeTranslation(p[0], p[1], p[2]); marbles.setMatrixAt(n, mt); marbles.setColorAt(n, cc.set(u < 0.3 ? mcols[0] : u < 0.58 ? mcols[1] : u < 0.8 ? mcols[2] : u < 0.92 ? mcols[3] : mcols[4])); });
  /* four loose marbles beside the jar */
  [[1.7, 0.2, 0], [2.1, 0.8, 4], [1.45, -0.9, 2], [2.4, -0.2, 1]].forEach(function (p, n) { mt.makeTranslation(p[0], 0.17, p[1]); marbles.setMatrixAt(mp.length + n, mt); marbles.setColorAt(mp.length + n, cc.set(mcols[p[2]])); });
  marbles.instanceColor.needsUpdate = true; jar.add(marbles);
  sh.add(JX, 0.04, JZ, 3.4, 3.4, 0.5);
  var lid = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 0.22, 24), mat(T, MUSTARD, 0.8, 0)); lid.position.set(JX - 3.3, 0.11, JZ + 0.4); g.add(lid); sh.add(JX - 3.3, 0.04, JZ + 0.4, 2.8, 2.8, 0.4);

  /* dice */
  var dm1 = [2, 5, 1, 6, 3, 4].map(function (n) { return new T.MeshStandardMaterial({ map: dieFace(T, n, '#e8e0c8', NAVY), roughness: 0.7 }); });
  var dm2 = [2, 5, 1, 6, 3, 4].map(function (n) { return new T.MeshStandardMaterial({ map: dieFace(T, n, '#2f8a86', '#e8e0c8'), roughness: 0.7 }); });
  var dgeo = new T.BoxGeometry(0.5, 0.5, 0.5);
  [[14.7, 0.25, -6.3, 0.5, 0, 0, dm1], [15.55, 0.25, -5.6, -0.3, 0, Math.PI / 2, dm2], [14.7, 0.75, -6.3, 0.9, Math.PI / 2, 0, dm1]].forEach(function (d) {
    var m = new T.Mesh(dgeo, d[6]); m.position.set(d[0], d[1], d[2]); m.rotation.set(d[4], d[3], d[5]); g.add(m);
  });
  sh.add(15.0, 0.04, -6.0, 2.4, 2.0, 0.45);
  /* coins: a stack and two flat, heads and tails */
  var cgold = '#c9a647', cH = coinFace(T, 'H', cgold, '#6f5714'), cT = coinFace(T, 'T', cgold, '#6f5714'), cside = new T.MeshStandardMaterial({ color: '#b4953f', roughness: 0.75 });
  var cgeo = new T.CylinderGeometry(0.3, 0.3, 0.06, 20), cmH = new T.MeshStandardMaterial({ map: cH, roughness: 0.75 }), cmT = new T.MeshStandardMaterial({ map: cT, roughness: 0.75 });
  for (i = 0; i < 7; i++) { var cn = new T.Mesh(cgeo, [cside, i === 6 ? cmH : cside, cside]); cn.position.set(16.3 + (rnd() - 0.5) * 0.03, 0.03 + i * 0.062, -8.7 + (rnd() - 0.5) * 0.03); cn.rotation.y = rnd() * 6; g.add(cn); }
  var cf1 = new T.Mesh(cgeo, [cside, cmH, cmT]); cf1.position.set(17.15, 0.03, -8.2); cf1.rotation.y = 0.4; g.add(cf1);
  var cf2 = new T.Mesh(cgeo, [cside, cmT, cmH]); cf2.position.set(16.85, 0.03, -7.5); cf2.rotation.y = 1.4; g.add(cf2);
  sh.add(16.6, 0.04, -8.2, 2.6, 2.4, 0.4);
  /* deck of cards and a fan */
  var cbk = cardBack(T), deckSide = new T.MeshStandardMaterial({ color: '#d9d3c0', roughness: 0.9 }), deckTop = new T.MeshStandardMaterial({ map: cbk, roughness: 0.85 });
  var deckM = new T.Mesh(new T.BoxGeometry(0.9, 0.24, 1.26), [deckSide, deckSide, deckTop, deckSide, deckSide, deckSide]); deckM.position.set(13.5, 0.12, -9.7); deckM.rotation.y = 0.3; g.add(deckM);
  sh.add(13.5, 0.04, -9.7, 2.0, 2.4, 0.4);
  var faces = [cardFace(T, 'A', '\u2660', false), cardFace(T, 'K', '\u2665', true), cardFace(T, 'Q', '\u2666', true), cardFace(T, 'J', '\u2663', false)];
  for (i = 0; i < 4; i++) {
    var cm = [deckSide, deckSide, new T.MeshStandardMaterial({ map: faces[i], roughness: 0.85 }), new T.MeshStandardMaterial({ map: cbk, roughness: 0.85 }), deckSide, deckSide];
    var cd = new T.Group(), cmesh = new T.Mesh(new T.BoxGeometry(0.9, 0.05, 1.26), cm); cmesh.position.z = -0.45; cd.add(cmesh);
    cd.position.set(16.6 + i * 0.05, 0.05 + i * 0.1, -3.6); cd.rotation.y = -0.6 + i * 0.42; g.add(cd);
  }
  sh.add(16.6, 0.04, -4.1, 3.0, 2.8, 0.35);
  /* notebook and pencil, left */
  var nb = new T.Group(); nb.position.set(-15.3, 0, -4.4); nb.rotation.y = 0.3; g.add(nb);
  box(T, nb, 3.0, 0.06, 4.0, NAVY, 0, 0.03, 0, 0.85, 0); box(T, nb, 2.8, 0.2, 3.8, '#e6dcc0', 0.08, 0.16, 0, 0.9, 0); box(T, nb, 3.0, 0.06, 4.0, NAVY, 0, 0.29, 0, 0.85, 0); box(T, nb, 0.18, 0.46, 4.04, MUSTARD, 1.0, 0.2, 0, 0.8, 0);
  var pen = cyl(T, nb, 0.07, 0.07, 2.6, '#d5a22b', 0.2, 0.42, 0.4, 0.8, 0); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5;
  sh.add(-15.3, 0.04, -4.4, 4.4, 5.4, 0.4);
  /* mug of pencils */
  var mug = new T.Mesh(lathe(T, [[0, 0], [0.62, 0], [0.7, 0.06], [0.7, 1.45], [0.64, 1.47], [0.6, 1.4], [0.6, 0.14], [0, 0.14]], 28), new T.MeshStandardMaterial({ color: TEAL, roughness: 0.8, side: T.DoubleSide })); mug.position.set(-19.2, 0, -8.6); g.add(mug);
  [[-0.2, 0.1, 0.2], [0.15, -0.1, -0.15], [0.05, 0.25, 0.05]].forEach(function (p, n) {
    var pc = cyl(T, g, 0.06, 0.06, 2.2, [NAVY, MUSTARD, '#b4533f'][n], -19.2 + p[0], 1.8, -8.6 + p[1], 0.8, 0); pc.rotation.z = p[2]; pc.rotation.x = p[0];
  });
  sh.add(-19.2, 0.04, -8.6, 2.2, 2.2, 0.5);

  /* ---------- floor: waste basket, a tall plant ---------- */
  var basket = new T.Mesh(lathe(T, [[0, 0], [1.4, 0], [1.9, 3.8], [1.8, 3.9], [1.6, 3.7], [0, 0.2]], 24), new T.MeshStandardMaterial({ color: NAVY, roughness: 0.85, side: T.DoubleSide })); basket.position.set(-38.5, FLOOR, -15.5); g.add(basket);
  sh.add(-38.5, FLOOR + 0.14, -15.5, 5.2, 5.2, 0.5);
  var pot3 = new T.Mesh(lathe(T, [[0, 0], [1.6, 0], [2.0, 0.2], [2.3, 3.4], [2.1, 3.55], [1.9, 3.3], [0, 3.3]], 24), new T.MeshStandardMaterial({ color: '#b5714c', roughness: 0.9, side: T.DoubleSide })); pot3.position.set(-49, FLOOR, -15.5); g.add(pot3);
  sh.add(-49, FLOOR + 0.14, -15.5, 6.6, 6.6, 0.5);
  var l3 = [], hh;
  for (i = 0; i < 16; i++) { a = i / 16 * 6.283 + rnd(), hh = 3 + rnd() * 5; l3.push({ x: -49 + Math.sin(a) * 1.0, y: FLOOR + 5.2 + hh, z: -15.5 + Math.cos(a) * 1.0, rx: Math.cos(a) * 0.6, rz: -Math.sin(a) * 0.6, sx: 0.9, sy: 3.0 + rnd(), sz: 0.3 }); }
  g.add(leaves(l3, ['#4f8a5a', '#3f7a52', '#5a9a62']));
  [0, 1, 2, 3, 4].forEach(function (n) { var st = cyl(T, g, 0.07, 0.1, 5.2, '#5a4a30', -49 + (n - 2) * 0.35, FLOOR + 3.3 + 2.6, -15.5 + ((n % 2) - 0.5) * 0.6, 0.9, 0); st.rotation.z = (n - 2) * 0.12; });

  g.add(deco.mesh()); g.add(trim.mesh()); sh.build(g);

  /* the room keeps its own warm colours: no distance haze toward the stage's blue-black */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  return { group: g, shadow: tableShadow, update: function (t, dt) {} };
};
})();
