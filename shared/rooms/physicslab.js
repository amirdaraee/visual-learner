/* Room "physicslab" for the physics subject: a teaching lab. A black optical table with a hole grid in front, a wooden bench along the
 * back wall carrying an optical rail, Newton's cradle, a pendulum and a spring, and a whiteboard with worked physics above them.
 * Local y = 0 is the table top, the floor is at y = -13, the back wall is at z = -19. Everything is matte and built from code. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;

/* canvas texture with mip-maps, so fine detail (the hole grid, small print) stays calm when the camera is far away */
function mipTex(T, w, h, draw, repeatX, repeatY) {
  var tex = K.canvasTex(T, w, h, draw);
  tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8;
  if (repeatX) { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(repeatX, repeatY); }
  return tex;
}
/* a power-of-two canvas that is drawn in logical units lw x lh (so circles stay round on a non-square board) */
function boardTex(T, w, h, lw, lh, draw) {
  return mipTex(T, w, h, function (x) { x.setTransform(w / lw, 0, 0, h / lh, 0, 0); draw(x, lw, lh); });
}

function woodTex(T, base, seed) {
  return mipTex(T, 512, 128, function (x, w, h) {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    var r = K.mulberry(seed), i;
    for (i = 0; i < 70; i++) {
      var y = r() * h, a = 0.05 + r() * 0.1;
      x.strokeStyle = r() < 0.6 ? 'rgba(80,50,22,' + a + ')' : 'rgba(255,235,200,' + a * 0.5 + ')'; x.lineWidth = 0.6 + r() * 1.4;
      x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 6, w * 0.7, y + (r() - 0.5) * 6, w, y + (r() - 0.5) * 4); x.stroke();
    }
  });
}

/* ---------- text and drawing helpers for the boards ---------- */
var SANS = '"Trebuchet MS", Verdana, "Segoe UI", sans-serif', SERIF = SANS;
function txt(x, s, px, py, size, color, o) {
  o = o || {};
  var st = (o.italic ? 'italic ' : '') + (o.bold === false ? '' : 'bold '), fam = o.serif ? SERIF : SANS;
  x.font = st + size + 'px ' + fam;
  if (o.maxW) { var w = x.measureText(s).width; if (w > o.maxW) { size = Math.floor(size * o.maxW / w); x.font = st + size + 'px ' + fam; } }
  x.fillStyle = color; x.textAlign = o.align || 'left'; x.textBaseline = 'alphabetic'; x.fillText(s, px, py);
}
/* an equation set as runs of [text, italic] so variables are italic */
function eq(x, runs, px, py, size, color, maxW) {
  var i, cx = px, st, tw = 0;
  if (maxW) {
    for (i = 0; i < runs.length; i++) { x.font = (runs[i][1] ? 'italic ' : '') + 'bold ' + size + 'px ' + SERIF; tw += x.measureText(runs[i][0]).width; }
    if (tw > maxW) size = Math.floor(size * maxW / tw);
  }
  for (i = 0; i < runs.length; i++) {
    st = (runs[i][1] ? 'italic ' : '') + 'bold ' + size + 'px ' + SERIF; x.font = st; x.fillStyle = color; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillText(runs[i][0], cx, py); cx += x.measureText(runs[i][0]).width;
  }
}
function line(x, x1, y1, x2, y2, color, lw, dash) {
  x.strokeStyle = color; x.lineWidth = lw; x.lineCap = 'round'; x.setLineDash(dash || []); x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); x.setLineDash([]);
}
function head(x, x1, y1, x2, y2, color, size) {
  var a = Math.atan2(y2 - y1, x2 - x1);
  x.fillStyle = color; x.beginPath(); x.moveTo(x2, y2); x.lineTo(x2 - size * Math.cos(a - 0.4), y2 - size * Math.sin(a - 0.4)); x.lineTo(x2 - size * Math.cos(a + 0.4), y2 - size * Math.sin(a + 0.4)); x.closePath(); x.fill();
}
function arrow(x, x1, y1, x2, y2, color, lw, size) { line(x, x1, y1, x2, y2, color, lw); head(x, x1, y1, x2, y2, color, size || lw * 4.2); }

/* the whiteboard: three panels of correct physics, drawn on a 2048 x 686 board */
function drawBoard(x, W, H) {
  var INK = '#1f2328', BLUE = '#1f4fa8', RED = '#c4372d', GREEN = '#1f7a46', ORANGE = '#d2691e', GREY = '#4a5560', i, r = K.mulberry(9);
  x.fillStyle = '#eceff2'; x.fillRect(0, 0, W, H);
  /* faint ghosts of old, rubbed-out marks */
  for (i = 0; i < 24; i++) { x.fillStyle = 'rgba(120,132,144,' + (0.025 + r() * 0.035) + ')'; x.save(); x.translate(r() * W, r() * H); x.rotate((r() - 0.5) * 0.7); x.fillRect(0, 0, 80 + r() * 280, 10 + r() * 24); x.restore(); }
  line(x, 690, 40, 690, H - 40, 'rgba(70,80,90,0.35)', 4, [16, 14]); line(x, 1400, 40, 1400, H - 40, 'rgba(70,80,90,0.35)', 4, [16, 14]);

  /* mechanics */
  txt(x, "Newton's second law", 60, 96, 66, BLUE, { maxW: 600 });
  eq(x, [['F', true], [' = ', false], ['ma', true]], 60, 300, 200, INK, 590);
  txt(x, 'force = mass \u00d7 acceleration', 64, 372, 50, GREY, { maxW: 590, bold: false });
  x.fillStyle = '#e1eaf5'; x.fillRect(100, 430, 170, 110); x.strokeStyle = INK; x.lineWidth = 6; x.strokeRect(100, 430, 170, 110);
  txt(x, 'm', 185, 508, 84, INK, { serif: true, italic: true, align: 'center' });
  arrow(x, 270, 485, 470, 485, RED, 9, 34); txt(x, 'F', 500, 505, 80, RED, { serif: true, italic: true });
  arrow(x, 120, 590, 300, 590, GREEN, 9, 34); txt(x, 'a', 330, 612, 80, GREEN, { serif: true, italic: true });
  txt(x, '1 N = 1 kg\u00b7m/s\u00b2', 60, 668, 56, INK, { maxW: 590 });

  /* optics: thin lens, f = 100, object at 1.5 f, so the image forms at 3 f (1/f = 1/u + 1/v) */
  var AX = 340, LX = 985, f = 100, u = 150, v = 300, h = 65;
  txt(x, 'Thin lens', 730, 96, 66, RED, { maxW: 600 });
  line(x, 720, AX, 1370, AX, GREY, 4);
  x.fillStyle = 'rgba(120,175,230,0.35)'; x.strokeStyle = BLUE; x.lineWidth = 7; x.beginPath(); x.moveTo(LX, AX - 150); x.bezierCurveTo(LX + 42, AX - 52, LX + 42, AX + 52, LX, AX + 150);
  x.bezierCurveTo(LX - 42, AX + 52, LX - 42, AX - 52, LX, AX - 150); x.closePath(); x.fill(); x.stroke();
  /* three standard rays from the tip of the object to the tip of the image */
  var ox = LX - u, ix = LX + v, oy = AX - h, iy = AX + h * v / u;
  line(x, ox, oy, LX, oy, BLUE, 6); line(x, LX, oy, ix, iy, BLUE, 6);
  line(x, ox, oy, ix, iy, GREEN, 6);
  line(x, ox, oy, LX, iy, ORANGE, 6); line(x, LX, iy, ix, iy, ORANGE, 6);
  [LX - f, LX + f].forEach(function (fx, k) {
    line(x, fx, AX - 14, fx, AX + 14, INK, 6);
    if (k) txt(x, "F'", fx + 8, AX - 22, 52, INK, { serif: true, italic: true }); else txt(x, 'F', fx - 24, AX + 56, 52, INK, { serif: true, italic: true, align: 'center' });
  });
  arrow(x, ox, AX, ox, oy, INK, 9, 26); txt(x, 'object', ox, oy - 26, 48, INK, { align: 'center', bold: false });
  arrow(x, ix, AX, ix, iy, RED, 9, 26); txt(x, 'image', ix, iy + 52, 48, RED, { align: 'center', bold: false });
  eq(x, [['1/', false], ['f', true], [' = 1/', false], ['u', true], [' + 1/', false], ['v', true]], 730, 650, 78, INK, 630);
  txt(x, 'here u = 1.5 f, so v = 3 f', 730, 556, 44, GREY, { bold: false, maxW: 440 });

  /* waves: y = A sin(2pi x / lambda) */
  var WX = 1470, WY = 290, A = 85, LAM = 240, k;
  txt(x, 'Waves', 1440, 90, 66, GREEN, { maxW: 560 });
  line(x, WX, WY, 2010, WY, GREY, 4); line(x, WX, 190, WX, 400, GREY, 4);
  txt(x, 'x', 2012, WY + 56, 54, GREY, { serif: true, italic: true }); txt(x, 'y', WX - 44, 214, 54, GREY, { serif: true, italic: true });
  x.strokeStyle = BLUE; x.lineWidth = 9; x.lineJoin = 'round'; x.beginPath();
  for (k = 0; k <= 160; k++) { var px = WX + k / 160 * 2 * LAM, py = WY - A * Math.sin(2 * Math.PI * (px - WX) / LAM); if (k) x.lineTo(px, py); else x.moveTo(px, py); }
  x.stroke();
  var c1 = WX + LAM / 4, c2 = c1 + LAM;
  line(x, c1, 170, c1, WY - A - 8, GREY, 3, [8, 8]); line(x, c2, 170, c2, WY - A - 8, GREY, 3, [8, 8]);
  arrow(x, c1 + 12, 180, c2 - 12, 180, RED, 7, 24); arrow(x, c2 - 12, 180, c1 + 12, 180, RED, 7, 24);
  txt(x, 'wavelength \u03bb', (c1 + c2) / 2, 156, 50, RED, { align: 'center', maxW: 330 });
  var tx = WX + LAM * 0.75;
  arrow(x, tx, WY, tx, WY + A, ORANGE, 7, 24); txt(x, 'A', tx + 22, WY + 62, 54, ORANGE, { serif: true, italic: true });
  txt(x, 'A = amplitude', 1700, 432, 46, ORANGE, { bold: false });
  eq(x, [['v', true], [' = ', false], ['f', true], ['\u03bb', true]], 1440, 590, 140, INK, 560);
  txt(x, 'speed = frequency \u00d7 wavelength', 1440, 636, 44, GREY, { bold: false, maxW: 580 });
}

function posterLight(x, W, H) {
  x.fillStyle = '#1f2832'; x.fillRect(0, 0, W, H);
  txt(x, 'VISIBLE', W / 2, 62, 50, '#f4f1ea', { align: 'center' }); txt(x, 'LIGHT', W / 2, 112, 50, '#f4f1ea', { align: 'center' });
  var y0 = 150, y1 = 410, k;
  for (k = 0; k <= y1 - y0; k++) { x.fillStyle = 'hsl(' + Math.round(275 * (1 - k / (y1 - y0))) + ',88%,52%)'; x.fillRect(70, y0 + k, 90, 2); }
  txt(x, '~400 nm', 180, y0 + 24, 40, '#f4f1ea', { bold: false }); txt(x, 'violet', 180, y0 + 64, 32, '#b9c4d0', { bold: false });
  txt(x, '~700 nm', 180, y1 - 4, 40, '#f4f1ea', { bold: false }); txt(x, 'red', 180, y1 - 44, 32, '#b9c4d0', { bold: false });
  txt(x, 'colours schematic', W / 2, 446, 26, '#8d99a6', { align: 'center', bold: false });
  eq(x, [['c', true], [' = ', false], ['f', true], ['\u03bb', true]], 100, 488, 46, '#f4f1ea');
}
function posterPendulum(x, W, H) {
  x.fillStyle = '#efe9dc'; x.fillRect(0, 0, W, H);
  txt(x, 'Simple pendulum', W / 2, 60, 42, '#25282c', { align: 'center', maxW: 320 });
  var px = W / 2, py = 110, L = 250, th = 0.42, bx = px + L * Math.sin(th), by = py + L * Math.cos(th);
  line(x, px - 70, py, px + 70, py, '#25282c', 8); line(x, px, py, px, py + L + 40, '#8a949e', 3, [10, 8]);
  line(x, px, py, bx, by, '#25282c', 5);
  x.fillStyle = '#b5472f'; x.beginPath(); x.arc(bx, by, 24, 0, 7); x.fill();
  x.strokeStyle = '#1f4fa8'; x.lineWidth = 4; x.beginPath(); x.arc(px, py, 110, Math.PI / 2 - th, Math.PI / 2); x.stroke();
  txt(x, '\u03b8', px + 22, py + 150, 40, '#1f4fa8', { serif: true, italic: true });
  txt(x, 'L', px + L * Math.sin(th) / 2 + 16, py + L * Math.cos(th) / 2, 40, '#25282c', { serif: true, italic: true });
  eq(x, [['T', true], [' = 2\u03c0\u221a(', false], ['L/g', true], [')', false]], 36, 450, 44, '#25282c');
  txt(x, 'g \u2248 9.8 m/s\u00b2', W / 2, 492, 30, '#4a5560', { align: 'center', bold: false });
}
function clockTex(T) {
  return K.canvasTex(T, 256, 256, function (x) {
    x.fillStyle = '#f0f2f4'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.strokeStyle = '#25282c'; x.fillStyle = '#25282c';
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.2832, big = i % 3 === 0; x.lineWidth = big ? 8 : 4; x.beginPath(); x.moveTo(128 + Math.sin(a) * (big ? 94 : 104), 128 - Math.cos(a) * (big ? 94 : 104)); x.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); x.stroke(); }
    x.lineCap = 'round'; x.lineWidth = 10; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 54 * Math.sin(0.6), 128 - 54 * Math.cos(0.6)); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 90 * Math.sin(3.4), 128 - 90 * Math.cos(3.4)); x.stroke();
    x.strokeStyle = '#c4372d'; x.lineWidth = 3; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 100 * Math.sin(4.9), 128 - 100 * Math.cos(4.9)); x.stroke();
    x.fillStyle = '#25282c'; x.beginPath(); x.arc(128, 128, 8, 0, 7); x.fill();
  });
}
function stopwatchTex(T) {
  return K.canvasTex(T, 128, 128, function (x) {
    x.fillStyle = '#f2f2ee'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#25282c';
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.2832; x.lineWidth = i % 3 === 0 ? 5 : 2.5; x.beginPath(); x.moveTo(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50); x.lineTo(64 + Math.sin(a) * 58, 64 - Math.cos(a) * 58); x.stroke(); }
    x.strokeStyle = '#c4372d'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + 40 * Math.sin(2.2), 64 - 40 * Math.cos(2.2)); x.stroke();
    x.fillStyle = '#25282c'; x.beginPath(); x.arc(64, 64, 5, 0, 7); x.fill();
  });
}
function rulerTex(T) {
  return mipTex(T, 2048, 64, function (x, w, h) {
    x.fillStyle = '#ece6d0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2a2a'; x.fillStyle = '#2a2a2a'; x.font = 'bold 22px sans-serif'; x.textAlign = 'left';
    var n = 160, i, px;
    for (i = 0; i <= n; i++) { px = 8 + i * (w - 16) / n; x.lineWidth = 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, i % 10 === 0 ? 30 : (i % 5 === 0 ? 22 : 14)); x.stroke(); if (i % 10 === 0 && i < n) x.fillText(String(i / 10 * 10), px + 4, 54); }
  });
}
function counterFrontTex(T) {
  return mipTex(T, 1024, 128, function (x, w, h) {
    x.fillStyle = '#39424d'; x.fillRect(0, 0, w, h);
    var dw = w / 21, i;
    for (i = 0; i < 21; i++) {
      x.fillStyle = i % 2 ? '#404a56' : '#3c4651'; x.fillRect(i * dw + 3, 4, dw - 6, h - 8);
      x.fillStyle = '#a9b2bc'; x.fillRect(i * dw + (i % 2 ? 8 : dw - 12), 14, 4, 26);
    }
  });
}
function pegTex(T) {
  return mipTex(T, 256, 128, function (x, w, h) {
    x.fillStyle = '#a6b1ba'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(240,244,247,0.75)'; x.lineWidth = 4;
    x.strokeRect(2, 2, w - 4, h - 4);
  }, 44, 5.2);
}

/* a helix of wire for the spring; its ends taper to the axis so each end joins a single point */
function springGeo(T, R, len, turns, wire) {
  var pts = [], n = turns * 14, k, t, e, rr, a;
  for (k = 0; k <= n; k++) {
    t = k / n; e = Math.min(1, Math.min(t, 1 - t) / 0.05); rr = R * e * e * (3 - 2 * e); a = t * turns * 2 * Math.PI;
    pts.push(new T.Vector3(rr * Math.cos(a), -len * t, rr * Math.sin(a)));
  }
  return new T.TubeGeometry(new T.CatmullRomCurve3(pts), n * 2, wire, 6, false);
}

ENV.physicslab = function (T) {
  var g = new T.Group(), FLOOR = -13, CT = 1.2, i;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var cradleBall = null, pendulum = null;

  /* palette: cool slate and steel, warm oak and brass, a little orange-red from small props */
  var OAK = '#a07a54', WALNUT = '#6a4a33', STEEL = '#a2abb5', DARK = '#2c333b', ORANGE = '#e0702a', RED = '#c9402b', BRASS = '#b88a3c';

  /* soft contact shadow, sharing one texture */
  var shTex = K.canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  var shGeo = new T.PlaneGeometry(1, 1);
  function shadow(x, y, z, w, d, op) {
    var m = new T.Mesh(shGeo, new T.MeshBasicMaterial({ map: shTex, transparent: true, opacity: op == null ? 0.5 : op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.04, z); m.scale.set(w, d, 1); g.add(m); return m;
  }
  function box(w, h, d, c, x, y, z, r, m) { return K.box(T, g, w, h, d, c, x, y, z, r == null ? 0.7 : r, m == null ? 0.05 : m); }
  function cyl(rt, rb, h, c, x, y, z, r, m) { return K.cyl(T, g, rt, rb, h, c, x, y, z, r == null ? 0.7 : r, m == null ? 0.05 : m); }

  /* ---------- light: same budget as the other rooms ---------- */
  g.add(new T.HemisphereLight(0xf2f5ff, 0x4a4238, 0.5));
  var key = new T.DirectionalLight(0xfff0dc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xe6eaf2, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffeccf, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---------- floor and back wall ---------- */
  var floorTex = mipTex(T, 256, 256, function (x, w, h) {
    var tones = ['#625d58', '#5d5955', '#66615c', '#5b5753'], r = K.mulberry(4), k;
    for (k = 0; k < 4; k++) { x.fillStyle = tones[k]; x.fillRect((k % 2) * 128, (k >> 1) * 128, 128, 128); }
    for (k = 0; k < 600; k++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'; x.fillRect(r() * w, r() * h, 2, 2); }
    x.fillStyle = 'rgba(22,20,18,0.55)'; x.fillRect(0, 0, w, 3); x.fillRect(0, 128, w, 3); x.fillRect(0, 0, 3, h); x.fillRect(128, 0, 3, h);
  }, 110 / 12, 100 / 12);
  var floor = new T.Mesh(new T.PlaneGeometry(110, 100), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, 11); g.add(floor);

  var wallTex = K.canvasTex(T, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#525c68'); gr.addColorStop(1, '#6b7580'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  K.plane(T, g, 110, 54, wallTex, 0, 14, -19, 0);
  /* side walls: the camera swings about 35 degrees either way, so the room is closed on both sides */
  var sideL = K.plane(T, g, 80, 54, wallTex, -44, 14, 21, Math.PI / 2), sideR = K.plane(T, g, 80, 54, wallTex, 44, 14, 21, -Math.PI / 2);
  sideL.material.color.setScalar(0.86); sideR.material.color.setScalar(0.86);
  box(0.3, 0.6, 80, '#222831', -43.85, FLOOR + 0.3, 21); box(0.3, 0.6, 80, '#222831', 43.85, FLOOR + 0.3, 21);

  /* ---------- the optical table ---------- */
  var TW = 68, TD = 30, TZ = 2.5, TOP = -0.03, TH = 1.4;
  var holeTex = mipTex(T, 128, 128, function (x, w, h) {
    x.fillStyle = '#262b32'; x.fillRect(0, 0, w, h);
    var r = K.mulberry(2), ix, iy, k;
    for (k = 0; k < 120; k++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)'; x.fillRect(r() * w, r() * h, 3, 2); }
    for (ix = 0; ix < 4; ix++) for (iy = 0; iy < 4; iy++) {
      var cx = 16 + ix * 32, cy = 16 + iy * 32;
      x.strokeStyle = 'rgba(150,162,178,0.14)'; x.lineWidth = 1.6; x.beginPath(); x.arc(cx, cy, 6.6, 0, 7); x.stroke();
      x.fillStyle = '#0d0f12'; x.beginPath(); x.arc(cx, cy, 5, 0, 7); x.fill();
    }
  }, TW / 4, TD / 4);
  /* a thin black skin on a steel body: one solid box for the skin, so no two faces share a plane */
  var SKIN = 0.2;
  var tabTop = new T.Mesh(new T.BoxGeometry(TW, SKIN, TD), new T.MeshStandardMaterial({ map: holeTex, roughness: 0.85, metalness: 0 }));
  tabTop.position.set(0, TOP - SKIN / 2, TZ); g.add(tabTop);
  box(TW - 0.1, TH, TD - 0.1, '#48515c', 0, TOP - SKIN - TH / 2, TZ, 0.7, 0.1);
  var legTop = TOP - SKIN - TH, legH = legTop - FLOOR, legs = [[-30.5, -9.5], [30.5, -9.5], [-30.5, 14.5], [30.5, 14.5]];
  legs.forEach(function (p) {
    cyl(1.25, 1.25, legH, '#8d96a1', p[0], FLOOR + legH / 2, p[1], 0.6, 0.1);
    cyl(1.8, 1.8, 0.3, '#23272c', p[0], FLOOR + 0.15, p[1], 0.8, 0);
  });
  [-9.5, 14.5].forEach(function (z) { box(61, 0.7, 0.7, '#5b646f', 0, -8, z); });
  [-30.5, 30.5].forEach(function (x) { box(0.7, 0.7, 24, '#5b646f', x, -8, TZ - 2.5 + 0); });
  shadow(0, FLOOR + 0.01, TZ, 74, 40, 0.5);

  /* ---------- the bench along the back wall ---------- */
  var front = counterFrontTex(T);
  var carcass = new T.Mesh(new T.BoxGeometry(87.6, 13.8, 5.7), new T.MeshStandardMaterial({ map: front, roughness: 0.8, metalness: 0 }));
  carcass.position.set(0, FLOOR + 6.9, -16); g.add(carcass);
  var oak = woodTex(T, OAK, 21);
  var slab = new T.Mesh(new T.BoxGeometry(88, 0.4, 6.2), new T.MeshStandardMaterial({ map: oak, roughness: 0.75, metalness: 0 })); slab.position.set(0, CT - 0.2, -15.8); g.add(slab);
  /* tiled splashback with a wooden cap, and two wall sockets */
  var splash = new T.Mesh(new T.BoxGeometry(88, 5.2, 0.2), new T.MeshStandardMaterial({ map: pegTex(T), roughness: 0.8, metalness: 0 })); splash.position.set(0, CT + 2.6, -18.9); g.add(splash);
  box(88, 0.3, 0.5, WALNUT, 0, CT + 5.35, -18.75, 0.7);
  [-3, 17].forEach(function (x) { box(1.3, 1.3, 0.14, '#d9dde1', x, CT + 2.6, -18.73, 0.6); box(0.5, 0.25, 0.04, '#2a2e33', x, CT + 2.6, -18.64, 0.6); });
  box(88, 0.5, 0.2, '#222831', 0, FLOOR + 0.25, -18.9);

  /* ---------- the whiteboard ---------- */
  var BW = 40, BH = 13.4, BX = 8, BY = 17.1, BZ = -18.68;
  box(BW + 0.8, BH + 0.8, 0.3, '#c9ced4', BX, BY, -18.85, 0.6, 0.05);
  K.plane(T, g, BW, BH, boardTex(T, 2048, 1024, 2048, 686, drawBoard), BX, BY, BZ, 0).material.fog = false;
  var trayY = BY - BH / 2 - 0.4 - 0.1;
  box(26, 0.28, 0.8, '#aab1b8', BX, trayY, -18.4, 0.6, 0.1);
  [[RED, -3], ['#2a56b8', -1.4], ['#26292d', 0.2], ['#2b8a4b', 1.8]].forEach(function (m) { var pen = cyl(0.13, 0.13, 1.7, m[0], BX + m[1], trayY + 0.26, -18.35, 0.5); pen.rotation.z = Math.PI / 2; box(0.45, 0.24, 0.26, '#d8dcdf', BX + m[1] - 0.6, trayY + 0.26, -18.35, 0.5); });
  box(1.9, 0.5, 0.7, '#38424d', BX + 7, trayY + 0.39, -18.35, 0.9); box(1.9, 0.14, 0.72, '#d9dadc', BX + 7, trayY + 0.7, -18.35, 0.8);

  /* clock, with a body, and a face set just in front of it */
  var CKX = -29.5, CKY = 19;
  var cbody = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 0.2, 40), K.mat(T, '#2b3036', 0.7, 0.05)); cbody.rotation.x = Math.PI / 2; cbody.position.set(CKX, CKY, -18.9); g.add(cbody);
  var cface = new T.Mesh(new T.CircleGeometry(1.42, 40), new T.MeshBasicMaterial({ map: clockTex(T) })); cface.position.set(CKX, CKY, -18.78); g.add(cface);

  /* two posters, each on a frame */
  box(6.4, 8.8, 0.16, '#2b3036', -19.5, 17.2, -18.9, 0.7);
  K.plane(T, g, 6, 8.4, boardTex(T, 512, 512, 360, 504, posterLight), -19.5, 17.2, -18.79, 0);
  box(6.4, 8.8, 0.16, '#5a4636', 33, 15.4, -18.9, 0.7);
  K.plane(T, g, 6, 8.4, boardTex(T, 512, 512, 360, 504, posterPendulum), 33, 15.4, -18.79, 0);

  /* shelf with binders, above the left end of the bench */
  var SHX = -29.5, SHY = 11, SHZ = -17.8;
  box(10, 0.35, 2.2, OAK, SHX, SHY, SHZ, 0.75);
  [-3.8, 3.8].forEach(function (dx) { box(0.3, 1.2, 1.8, '#4a4f55', SHX + dx, SHY - 0.78, -17.9, 0.6, 0.1); });
  [['#4b5d70', 3.5, 0.9], ['#d4552b', 3.1, 0.8], ['#d8cfb8', 3.6, 0.9], ['#2f6f73', 3.3, 0.85], ['#6c7580', 3.0, 0.8]].reduce(function (xx, b) {
    var cx = xx + b[2] / 2; box(b[2], b[1], 2.0, b[0], cx, SHY + 0.175 + b[1] / 2, SHZ, 0.8, 0);
    box(b[2] * 0.6, 1.1, 0.04, '#eef0f2', cx, SHY + 0.175 + b[1] * 0.6, SHZ + 1.02, 0.8, 0);
    return xx + b[2] + 0.06;
  }, SHX - 4.3);
  shadow(SHX - 1.9, SHY + 0.175, SHZ, 5.4, 2.4, 0.35);

  /* ---------- on the bench, left to right ---------- */
  /* slotted masses on an oak rack, and a stopwatch */
  var RKX = -31.3, RKZ = -16.2;
  box(4.2, 0.5, 1.7, WALNUT, RKX, CT + 0.25, RKZ, 0.75);
  [[0.4, 0.7, -1.5], [0.43, 0.8, -0.55], [0.46, 0.9, 0.45], [0.5, 1.0, 1.5]].forEach(function (m) { cyl(m[0], m[0], m[1], BRASS, RKX + m[2], CT + 0.5 + m[1] / 2, RKZ, 0.7, 0.1); });
  shadow(RKX, CT, RKZ, 5.6, 2.8, 0.5);
  var sw = new T.Group(); sw.position.set(-28, CT + 0.2, -15.6); sw.rotation.y = 0.5; g.add(sw);
  K.cyl(T, sw, 0.8, 0.8, 0.4, RED, 0, 0, 0, 0.65, 0.05); K.cyl(T, sw, 0.15, 0.15, 0.32, STEEL, 0, 0.05, -0.94, 0.7, 0.1).rotation.x = Math.PI / 2;
  var swf = new T.Mesh(new T.CircleGeometry(0.66, 28), new T.MeshBasicMaterial({ map: stopwatchTex(T) })); swf.rotation.x = -Math.PI / 2; swf.position.y = 0.215; sw.add(swf);
  shadow(-28, CT, -15.6, 2.8, 2.8, 0.5);

  /* Newton's cradle: oak base, steel frame, five steel balls on V strings. The end ball sways very slowly. */
  var NX = -23, NZ = -16, NB = CT + 0.6, NTOP = NB + 6.0, NBALL = NB + 1.55, BR = 0.55, SP = 1.115;
  var nc = new T.Group(); nc.position.set(NX, 0, NZ); g.add(nc);
  K.box(T, nc, 7.6, 0.6, 4.2, WALNUT, 0, CT + 0.3, 0, 0.75, 0.05);
  [[-3.1, -1.5], [3.1, -1.5], [-3.1, 1.5], [3.1, 1.5]].forEach(function (p) { K.cyl(T, nc, 0.12, 0.12, 6.1, STEEL, p[0], NB + 3.05, p[1], 0.6, 0.1); });
  [-1.5, 1.5].forEach(function (z) { K.cyl(T, nc, 0.1, 0.1, 6.4, STEEL, 0, NTOP, z, 0.6, 0.1).rotation.z = Math.PI / 2; });
  var ballGeo = new T.SphereGeometry(BR, 24, 16), ballMat = K.mat(T, '#a7b0ba', 0.65, 0.1), strGeo = new T.CylinderGeometry(0.04, 0.04, 1, 4), strMat = K.mat(T, '#33383e', 0.8, 0), up = new T.Vector3(0, 1, 0);
  var hang = NTOP - (NBALL + BR);
  for (i = 0; i < 5; i++) {
    var piv = new T.Group(); piv.position.set((i - 2) * SP, NTOP, 0); nc.add(piv);
    var ball = new T.Mesh(ballGeo, ballMat); ball.position.y = -(NTOP - NBALL); piv.add(ball);
    [-1.5, 1.5].forEach(function (z) {
      var a = new T.Vector3(0, 0, z), b = new T.Vector3(0, -hang, 0), d = b.clone().sub(a), s = new T.Mesh(strGeo, strMat);
      s.scale.y = d.length(); s.position.copy(a).add(b).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(up, d.normalize()); piv.add(s);
    });
    if (i === 0) cradleBall = piv;
  }
  shadow(NX, CT, NZ, 9.4, 5.8, 0.5);

  /* pendulum on a cast stand */
  var PX = -15.8, PZ = -16.4;
  var pg = new T.Group(); pg.position.set(PX, CT, PZ); g.add(pg);
  K.box(T, pg, 4.6, 0.5, 3.0, '#3a4048', 0, 0.25, 0, 0.7, 0.1);
  K.cyl(T, pg, 0.14, 0.14, 7.9, STEEL, -1.2, 4.45, 0, 0.6, 0.1);
  K.box(T, pg, 0.6, 0.6, 0.6, '#454c55', -1.2, 7.9, 0, 0.7, 0.1);
  K.cyl(T, pg, 0.09, 0.09, 3.6, STEEL, 0.6, 7.9, 0, 0.6, 0.1).rotation.z = Math.PI / 2;
  var pp = new T.Group(); pp.position.set(1.5, 7.9, 0); pg.add(pp);
  var pst = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 1, 4), strMat); pst.scale.y = 4.2; pst.position.y = -2.1; pp.add(pst);
  var bob = new T.Mesh(new T.SphereGeometry(0.62, 22, 16), K.mat(T, BRASS, 0.7, 0.1)); bob.position.y = -4.2 - 0.55; pp.add(bob);
  pendulum = pp;
  shadow(PX, CT, PZ, 6.2, 4.2, 0.5);

  /* spring on a hook, hung from a retort stand, with a small red mass */
  var SX = -7.5, SZ = -16.2;
  var sg = new T.Group(); sg.position.set(SX, CT, SZ); g.add(sg);
  K.box(T, sg, 4.4, 0.5, 3.0, '#6f7a86', 0, 0.25, 0, 0.7, 0.1);
  K.cyl(T, sg, 0.13, 0.13, 7.4, STEEL, -1.5, 4.2, 0, 0.6, 0.1);
  K.box(T, sg, 0.5, 0.5, 0.5, '#454c55', -1.5, 7.6, 0, 0.7, 0.1);
  K.cyl(T, sg, 0.09, 0.09, 3.2, STEEL, 0.1, 7.6, 0, 0.6, 0.1).rotation.z = Math.PI / 2;
  var hook = new T.Mesh(new T.TorusGeometry(0.2, 0.05, 8, 20), K.mat(T, STEEL, 0.6, 0.1)); hook.rotation.y = Math.PI / 2; hook.position.set(1.0, 7.5, 0); sg.add(hook);
  var coil = new T.Mesh(springGeo(T, 0.55, 3.9, 14, 0.05), K.mat(T, '#98a2ad', 0.65, 0.1)); coil.position.set(1.0, 7.25 - 0.35, 0); sg.add(coil);
  K.cyl(T, sg, 0.04, 0.04, 0.4, STEEL, 1.0, 3.0 - 0.0, 0, 0.6, 0.1);
  K.cyl(T, sg, 0.5, 0.5, 1.0, ORANGE, 1.0, 2.3, 0, 0.7, 0.05);
  shadow(SX, CT, SZ, 5.6, 4.0, 0.5);

  /* pen cup and a coil of red cable */
  var cup = new T.Mesh(K.lathe(T, [[0, 0], [0.62, 0], [0.64, 1.5], [0.56, 1.5], [0.54, 0.12], [0, 0.12]], 22), new T.MeshStandardMaterial({ color: '#3b4b5e', roughness: 0.75, side: T.DoubleSide }));
  cup.position.set(-2.4, CT, -16.4); g.add(cup);
  [['#e0b53a', 0.25, 0.12], ['#c4372d', -0.2, -0.15], ['#2a56b8', 0.05, 0.22], ['#e0702a', -0.3, 0.06]].forEach(function (p, k) {
    var pc = K.cyl(T, g, 0.06, 0.06, 2.5, p[0], -2.4 + p[1], CT + 1.4, -16.4 + (k % 2 ? 0.1 : -0.1), 0.7, 0); pc.rotation.z = p[2]; pc.rotation.x = (k - 1.5) * 0.08;
  });
  shadow(-2.4, CT, -16.4, 2.0, 2.0, 0.5);
  for (i = 0; i < 3; i++) { var tor = new T.Mesh(new T.TorusGeometry(0.85, 0.13, 8, 24), K.mat(T, RED, 0.7, 0)); tor.rotation.x = Math.PI / 2; tor.position.set(0.5 + i * 0.05, CT + 0.14 + i * 0.26, -15.2); g.add(tor); }
  shadow(0.5, CT, -15.2, 2.8, 2.8, 0.5);

  /* ---------- optical rail with lens, mirror and prism, and a laser at the end ---------- */
  var Z = -15.6, X0 = 3.2, X1 = 26.2, L = X1 - X0, CX = (X0 + X1) / 2, RT = CT + 1.4, AXY = RT + 3.4;
  box(2.2, 0.4, 2.0, DARK, X0 + 1.6, CT + 0.2, Z); box(2.2, 0.4, 2.0, DARK, X1 - 1.6, CT + 0.2, Z);
  box(L, 1.0, 1.6, STEEL, CX, CT + 0.9, Z, 0.65, 0.1);
  box(L - 1, 0.04, 0.45, '#2f353c', CX, RT + 0.02, Z);
  K.plane(T, g, L - 1.2, 0.7, rulerTex(T), CX, CT + 0.9, Z + 0.82, 0);
  shadow(CX, CT, Z, L + 2.4, 3.6, 0.45);
  function carrier(x) {
    box(1.7, 0.5, 2.0, DARK, x, RT + 0.27, Z);
    var kn = cyl(0.22, 0.22, 0.36, ORANGE, x + 0.3, RT + 0.27, Z + 1.18, 0.7, 0); kn.rotation.x = Math.PI / 2;
  }
  /* biconvex lens in a ring holder: a thin lens profile revolved about the optical axis */
  var LXP = 9.4, MXP = 15.6, PXP = 21.6;
  carrier(LXP); cyl(0.13, 0.13, 1.6, STEEL, LXP, RT + 0.5 + 0.8, Z, 0.6, 0.1);
  var Rl = 1.15, tl = 0.26, Rc = (Rl * Rl + tl * tl) / (2 * tl), prof = [], kk, rr;
  for (kk = 0; kk <= 12; kk++) { rr = Rl * kk / 12; prof.push([rr, -(Math.sqrt(Rc * Rc - rr * rr) - (Rc - tl))]); }
  for (kk = 12; kk >= 0; kk--) { rr = Rl * kk / 12; prof.push([rr, Math.sqrt(Rc * Rc - rr * rr) - (Rc - tl)]); }
  var glassMat = new T.MeshStandardMaterial({ color: '#cfe6ee', roughness: 0.7, metalness: 0, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false });
  /* the holder is turned a little off the axis so the lens reads as a disc, not an edge */
  var lg = new T.Group(); lg.position.set(LXP, AXY, Z); lg.rotation.y = 0.6; g.add(lg);
  var lens = new T.Mesh(K.lathe(T, prof, 36), glassMat); lens.rotation.z = Math.PI / 2; lg.add(lens);
  var ring = new T.Mesh(new T.TorusGeometry(1.26, 0.12, 8, 32), K.mat(T, '#59616b', 0.65, 0.1)); ring.rotation.y = Math.PI / 2; lg.add(ring);
  /* mirror in a square frame, turned a little */
  carrier(MXP); cyl(0.13, 0.13, 1.7, STEEL, MXP, RT + 0.5 + 0.85, Z, 0.6, 0.1);
  var mg = new T.Group(); mg.position.set(MXP, AXY, Z); mg.rotation.y = -0.55; g.add(mg);
  K.box(T, mg, 0.3, 2.5, 2.5, '#22272d', 0, 0, 0, 0.7, 0.1);
  K.box(T, mg, 0.1, 2.15, 2.15, '#b9c4cf', 0.2, 0, 0, 0.65, 0.1);
  /* glass prism on a small turntable */
  carrier(PXP); cyl(0.13, 0.13, 1.8, STEEL, PXP, RT + 0.5 + 0.9, Z, 0.6, 0.1);
  cyl(1.3, 1.3, 0.2, '#59616b', PXP, AXY - 1.0, Z, 0.7, 0.1);
  var tri = new T.Shape(); tri.moveTo(0, 1.2); tri.lineTo(-1.04, -0.6); tri.lineTo(1.04, -0.6); tri.closePath();
  var pgeo = new T.ExtrudeGeometry(tri, { depth: 1.8, bevelEnabled: false }); pgeo.translate(0, 0, -0.9);
  var prism = new T.Mesh(pgeo, new T.MeshStandardMaterial({ color: '#c3dde8', roughness: 0.7, metalness: 0, transparent: true, opacity: 0.42, side: T.DoubleSide, depthWrite: false }));
  prism.rotation.x = -Math.PI / 2; prism.position.set(PXP, AXY, Z); prism.rotation.z = 0.35; g.add(prism);
  prism.add(new T.LineSegments(new T.EdgesGeometry(pgeo), new T.LineBasicMaterial({ color: '#e9f4f8', transparent: true, opacity: 0.5 })));
  /* laser pointer on a post (no beam) */
  var LZX = 29.4;
  cyl(1.0, 1.0, 0.3, DARK, LZX, CT + 0.15, Z, 0.7, 0.1); cyl(0.14, 0.14, AXY - 0.5 - CT - 0.3, STEEL, LZX, (CT + 0.3 + AXY - 0.5) / 2, Z, 0.6, 0.1);
  box(0.8, 0.5, 0.8, '#454c55', LZX, AXY - 0.5 + 0.25, Z, 0.7, 0.1);
  var lb = cyl(0.28, 0.28, 3.4, '#2b3036', LZX, AXY, Z, 0.65, 0.1); lb.rotation.z = Math.PI / 2;
  var lf = cyl(0.3, 0.3, 0.3, STEEL, LZX - 1.7, AXY, Z, 0.6, 0.1); lf.rotation.z = Math.PI / 2;
  var lr = cyl(0.3, 0.3, 0.4, RED, LZX + 1.7, AXY, Z, 0.65, 0.05); lr.rotation.z = Math.PI / 2;
  var led = new T.Mesh(new T.CircleGeometry(0.07, 10), new T.MeshBasicMaterial({ color: K.hdr(T, '#ff7a4a', 1.4) })); led.position.set(LZX + 0.3, AXY + 0.285, Z + 0.0); led.rotation.x = -Math.PI / 2; g.add(led);
  shadow(LZX, CT, Z, 3.0, 3.0, 0.5);

  /* ---------- on the table, off to the sides of the clear zone ---------- */
  box(1.6, 0.35, 1.6, '#111418', -16, TOP + 0.175, -6, 0.8, 0); cyl(0.13, 0.13, 3.4, STEEL, -16, TOP + 0.35 + 1.7, -6, 0.6, 0.1);
  var tring = new T.Mesh(new T.TorusGeometry(0.75, 0.1, 8, 24), K.mat(T, '#59616b', 0.65, 0.1)); tring.rotation.y = Math.PI / 2; tring.position.set(-16, TOP + 0.35 + 3.1, -6); g.add(tring);
  shadow(-16, TOP + 0.01, -6, 3.0, 3.0, 0.6);
  var tape = cyl(0.8, 0.8, 0.6, '#e8932a', 16, TOP + 0.3, -4, 0.7, 0); box(0.9, 0.12, 0.7, '#d8dcdf', 16.9, TOP + 0.06, -3.4, 0.6, 0.1).rotation.y = 0.4;
  tape.rotation.y = 0.3;
  shadow(16.2, TOP + 0.01, -4, 3.0, 2.8, 0.6);

  /* ---------- room furniture on the side walls ---------- */
  var DZ = 6;
  box(0.4, 29.4, 13, '#59432f', -43.8, FLOOR + 14.7, DZ, 0.7);
  box(0.3, 28, 11.4, '#8b6b4a', -43.55, FLOOR + 14, DZ, 0.7);
  K.plane(T, g, 4, 8, null, -43.38, FLOOR + 19, DZ, Math.PI / 2, 0x6d8696);
  cyl(0.15, 0.15, 0.7, STEEL, -43.2, FLOOR + 13.5, DZ + 4.6, 0.6, 0.1).rotation.z = Math.PI / 2;
  cyl(0.13, 0.13, 1.5, STEEL, -43.0, FLOOR + 13.5, DZ + 4.0, 0.6, 0.1).rotation.x = Math.PI / 2;
  box(0.3, 0.25, 0.5, '#59432f', -43.9, FLOOR + 0.2, DZ, 0.7);
  box(4, 26, 8.2, '#8a939d', 41.9, FLOOR + 13, 6, 0.75, 0.1);
  box(0.08, 24.4, 0.14, '#4a5058', 39.86, FLOOR + 13, 6, 0.7);
  [5.3, 6.7].forEach(function (z) { box(0.2, 2.4, 0.22, '#4a5058', 39.8, FLOOR + 13, z, 0.7); });
  shadow(41, FLOOR, 6, 6, 11, 0.5);
  box(0.15, 5, 1.6, '#4a4f55', 43.8, FLOOR + 9.5, -8, 0.7);
  cyl(0.75, 0.75, 4.4, '#c23a2b', 43.0, FLOOR + 9.2, -8, 0.7, 0.05);
  cyl(0.3, 0.3, 0.6, '#1c1f23', 43.0, FLOOR + 11.7, -8, 0.7, 0.05); box(0.9, 0.18, 0.2, '#1c1f23', 43.0, FLOOR + 12.1, -8, 0.7, 0.05);

  /* the stage resizes this soft shadow under the subject */
  var tableShadow = K.contactShadow(T, g, 0, 0, -1, 1, 1, 0.5);

  return {
    group: g, shadow: tableShadow,
    update: function (t) {
      if (reduce) return;
      /* both motions are slow and tiny; the cradle ball lifts and settles back, it never strikes its neighbour */
      cradleBall.rotation.z = -0.13 * (1 - Math.cos(t * 2 * Math.PI / 8));
      pendulum.rotation.z = 0.1 * Math.sin(t * 2 * Math.PI / 5);
    }
  };
};
})();
