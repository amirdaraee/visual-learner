/* Room "devroom" for the computer-science subject: a developer's den.
 * Indigo and charcoal walls, a warm wood desk with a big dark mat, two monitors showing real code, a keyboard, headphones,
 * a whiteboard with a binary search tree and a flowchart, and a small server rack with slowly blinking status lights.
 * Local y = 0 is the desk mat; the floor is at y = -13; the back wall is at z = -19. Everything is built from code. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var MONO = '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
var HAND = '"Marker Felt", "Segoe Print", "Bradley Hand", "Comic Sans MS", "Trebuchet MS", sans-serif';

/* canvas texture with mipmaps (small text stays clean when far away). Draw in a logical lw x lh space. */
function ctex(T, w, h, lw, lh, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d'); x.scale(w / lw, h / lh); draw(x, lw, lh);
  var t = new T.CanvasTexture(c); t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 8; return t;
}
/* a texture the room redraws now and then (screens, rack lights, clock) */
function dyn(T, w, h) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var t = new T.CanvasTexture(c); t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 8;
  return { c: c, x: c.getContext('2d'), t: t };
}
function rrect(x, a, b, w, h, r) {
  x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r); x.lineTo(a + w, b + h - r);
  x.quadraticCurveTo(a + w, b + h, a + w - r, b + h); x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath();
}
function arrow(x, x1, y1, x2, y2, hs) {
  var a = Math.atan2(y2 - y1, x2 - x1);
  x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
  x.beginPath(); x.moveTo(x2 - hs * Math.cos(a - 0.45), y2 - hs * Math.sin(a - 0.45)); x.lineTo(x2, y2); x.lineTo(x2 - hs * Math.cos(a + 0.45), y2 - hs * Math.sin(a + 0.45)); x.stroke();
}

/* ---------- code on the monitors (syntax colours are this room's own dark theme) ---------- */
var CODE = { bg: '#1a1b2e', bar: '#12131f', gut: '#565b86', kw: '#e868b4', fn: '#4fe0cc', num: '#f5b862', cm: '#6a7098', bi: '#7fb4ff', op: '#a9b2e0', v: '#d6d9f5', str: '#9ae08c' };
var PY = [
  [['# nth Fibonacci number', 'cm']],
  [['def ', 'kw'], ['fib', 'fn'], ['(', 'op'], ['n', 'v'], ['):', 'op']],
  [['    a', 'v'], [', ', 'op'], ['b', 'v'], [' = ', 'op'], ['0', 'num'], [', ', 'op'], ['1', 'num']],
  [['    ', 'v'], ['for ', 'kw'], ['_', 'v'], [' in ', 'kw'], ['range', 'bi'], ['(', 'op'], ['n', 'v'], ['):', 'op']],
  [['        a', 'v'], [', ', 'op'], ['b', 'v'], [' = ', 'op'], ['b', 'v'], [', ', 'op'], ['a', 'v'], [' + ', 'op'], ['b', 'v']],
  [['    ', 'v'], ['return ', 'kw'], ['a', 'v']]
];
var JS = [
  [['// greatest common divisor', 'cm']],
  [['function ', 'kw'], ['gcd', 'fn'], ['(', 'op'], ['a', 'v'], [', ', 'op'], ['b', 'v'], [') {', 'op']],
  [['  ', 'v'], ['while ', 'kw'], ['(', 'op'], ['b', 'v'], [') {', 'op']],
  [['    [', 'op'], ['a', 'v'], [', ', 'op'], ['b', 'v'], ['] = [', 'op'], ['b', 'v'], [', ', 'op'], ['a', 'v'], [' % ', 'op'], ['b', 'v'], ['];', 'op']],
  [['  }', 'op']],
  [['  ', 'v'], ['return ', 'kw'], ['a', 'v'], [';', 'op']],
  [['}', 'op']]
];
/* an editor window: tab bar, line numbers, highlighted code, status bar. cursor = { line, col } */
function drawEditor(x, w, h, o, cursorOn) {
  var fs = o.font, pitch = o.pitch, top = 54, cw, i, j, ln, tx, col;
  x.fillStyle = CODE.bg; x.fillRect(0, 0, w, h);
  x.fillStyle = CODE.bar; x.fillRect(0, 0, w, top);
  o.tabs.forEach(function (tb, k) {
    var tw = 190, X = 14 + k * (tw + 6);
    x.fillStyle = k === 0 ? CODE.bg : '#181a2b'; x.fillRect(X, 8, tw, top - 8);
    if (k === 0) { x.fillStyle = CODE.kw; x.fillRect(X, top - 4, tw, 4); }
    x.font = '500 26px ' + MONO; x.textBaseline = 'middle'; x.fillStyle = k === 0 ? '#e3e6ff' : CODE.gut; x.fillText(tb, X + 18, 33);
  });
  x.font = '600 ' + fs + 'px ' + MONO; x.textBaseline = 'alphabetic'; cw = x.measureText('M').width;
  var y0 = top + 14 + pitch * 0.78, gx = 24;
  x.fillStyle = '#23253d'; x.fillRect(0, top + 14 + (o.cursor.line - 1) * pitch, w, pitch);
  x.fillStyle = '#15162a'; x.fillRect(0, top, gx + cw * 2 + 22, h - top - 40);
  for (i = 0; i < o.lines.length; i++) {
    ln = o.lines[i]; tx = gx + cw * 2 + 40;
    x.fillStyle = i + 1 === o.cursor.line ? '#9aa0d6' : CODE.gut; x.fillText(String(i + 1), gx + (i + 1 > 9 ? 0 : cw), y0 + i * pitch);
    for (j = 0; j < ln.length; j++) { col = CODE[ln[j][1]]; x.fillStyle = col; x.fillText(ln[j][0], tx, y0 + i * pitch); tx += cw * ln[j][0].length; }
  }
  if (cursorOn) { x.fillStyle = '#f2f4ff'; x.fillRect(gx + cw * 2 + 40 + cw * (o.cursor.col - 1) + 2, top + 14 + (o.cursor.line - 1) * pitch + 6, 5, pitch - 12); }
  x.fillStyle = '#2b2e5e'; x.fillRect(0, h - 40, w, 40);
  x.font = '500 22px ' + MONO; x.textBaseline = 'middle'; x.fillStyle = '#c5c9f0'; x.fillText(o.status, 18, h - 19);
  x.fillStyle = CODE.fn; x.fillRect(w - 150, h - 40, 150, 40); x.fillStyle = '#10121e'; x.fillText(o.lang, w - 134, h - 19);
}

/* ---------- the room ---------- */
ENV.devroom = function (T) {
  var g = new T.Group(), rnd = K.mulberry(21), mc = {}, i, j;
  var FLOOR = -13, TOP = -0.1, MAT = -0.03, WALL = -19, XW = 46, CEIL = 30, ZF = 62;
  var TX = -3, TZ = 3, TW = 60, TD = 30;
  var TEAL = '#2fd8c4', MAG = '#e24c9e', AMB = '#f2b45c';

  /* Static props are recorded and baked into two meshes at the end (one lit, one unlit), so the room stays cheap.
     The helpers return a stand-in object: set .rotation or .scale on it before the bake. */
  var recs = [], grecs = [], shq = [];
  function rec(list, p, geo, color, x, y, z) { var o = new T.Object3D(); o.position.set(x, y, z); list.push({ o: o, p: p, geo: geo, c: new T.Color(color) }); return o; }
  function B(p, w, h, d, c, x, y, z) { return rec(recs, p, new T.BoxGeometry(w, h, d), c, x, y, z); }
  function C(p, rt, rb, h, c, x, y, z, seg) { return rec(recs, p, new T.CylinderGeometry(rt, rb, h, seg || 16), c, x, y, z); }
  function S(p, r, c, x, y, z, sx, sy, sz) { var o = rec(recs, p, new T.SphereGeometry(r, 12, 8), c, x, y, z); o.scale.set(sx || 1, sy || 1, sz || 1); return o; }
  function TO(p, geo, c, x, y, z) { return rec(recs, p, geo, c, x, y, z); }
  /* unlit parts (LEDs, strips, flat colour panels), colour times a multiplier that stays at or under 1.4 */
  function GB(p, w, h, d, c, m, x, y, z) { return rec(grecs, p, new T.BoxGeometry(w, h, d), K.hdr(T, c, m), x, y, z); }
  function GC(p, rt, rb, h, c, m, x, y, z, seg) { return rec(grecs, p, new T.CylinderGeometry(rt, rb, h, seg || 12), K.hdr(T, c, m), x, y, z); }
  function GP(p, w, h, c, m, x, y, z) { return rec(grecs, p, new T.PlaneGeometry(w, h), K.hdr(T, c, m), x, y, z); }
  function GF(p, w, d, c, m, x, y, z) { var o = rec(grecs, p, new T.PlaneGeometry(w, d), K.hdr(T, c, m), x, y, z); o.rotation.x = -Math.PI / 2; return o; }
  /* textured planes stay real meshes */
  function P(p, w, h, mat, x, y, z, ry) { var o = new T.Mesh(new T.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry || 0; p.add(o); return o; }
  function flat(p, w, d, mat, x, y, z) { var o = new T.Mesh(new T.PlaneGeometry(w, d), mat); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); p.add(o); return o; }
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

  /* contact shadows: collected, then merged into a few meshes (desk level and floor level, soft and strong) */
  var shTex = K.canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.8)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
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
  g.add(new T.HemisphereLight(0xe9e2ff, 0x5c4838, 0.5));
  var key = new T.DirectionalLight(0xffe8d0, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xcdbcff, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffdcb8, 0.16, 70, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---- shell: floor, walls, ceiling ---- */
  var wallTex = ctex(T, 8, 256, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f3048'); gr.addColorStop(1, '#3d3e5a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  var sideTex = ctex(T, 8, 256, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2b42'); gr.addColorStop(1, '#383954'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  /* walls ignore the room fog so their colours stay as designed */
  var walls = [];
  walls.push(K.plane(T, g, 110, CEIL - FLOOR, wallTex, 0, (CEIL + FLOOR) / 2, WALL));
  walls.push(K.plane(T, g, ZF - WALL, CEIL - FLOOR, sideTex, -XW, (CEIL + FLOOR) / 2, (ZF + WALL) / 2, Math.PI / 2));
  walls.push(K.plane(T, g, ZF - WALL, CEIL - FLOOR, sideTex, XW, (CEIL + FLOOR) / 2, (ZF + WALL) / 2, -Math.PI / 2));
  var ceil = K.plane(T, g, 2 * XW, ZF - WALL, null, 0, CEIL, (ZF + WALL) / 2, 0, 0x2b2c46); ceil.rotation.x = Math.PI / 2; walls.push(ceil);
  walls.forEach(function (w) { w.material.fog = false; });

  var carpet = ctex(T, 128, 128, 128, 128, function (x, w, h) {
    x.fillStyle = '#403f4e'; x.fillRect(0, 0, w, h);
    for (var n = 0; n < 700; n++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255,0.045' : '0,0,0,0.08') + ')'; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
  });
  carpet.wrapS = carpet.wrapT = T.RepeatWrapping; carpet.repeat.set(2 * XW / 7, (ZF - WALL) / 7);
  flat(g, 2 * XW, ZF - WALL, new T.MeshStandardMaterial({ map: carpet, roughness: 0.95, metalness: 0 }), 0, FLOOR, (ZF + WALL) / 2);

  /* rug under the desk: indigo with a lattice, a teal and a magenta stripe */
  var rugTex = ctex(T, 512, 256, 1024, 512, function (x, w, h) {
    x.fillStyle = '#3b3544'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(150,120,190,0.30)'; x.lineWidth = 3;
    for (var k = -h; k < w + h; k += 64) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + h, h); x.stroke(); x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
    x.fillStyle = '#2a2433'; x.fillRect(0, 0, w, 40); x.fillRect(0, h - 40, w, 40); x.fillRect(0, 0, 40, h); x.fillRect(w - 40, 0, 40, h);
    x.strokeStyle = '#b0407f'; x.lineWidth = 5; x.strokeRect(54, 54, w - 108, h - 108);
    x.strokeStyle = '#2bb7a8'; x.lineWidth = 3; x.strokeRect(70, 70, w - 140, h - 140);
  });
  flat(g, 46, 32, new T.MeshStandardMaterial({ map: rugTex, roughness: 1, metalness: 0 }), TX, FLOOR + 0.04, 8);

  /* wainscot, rails and baseboards keep the big walls from looking flat */
  function wains(len, x, z, ry) {
    var wg = new T.Group(); wg.position.set(x, 0, z); wg.rotation.y = ry; g.add(wg);
    GP(wg, len, 9.6, '#33344f', 1, 0, FLOOR + 5.7, 0.04);
    B(wg, len, 0.5, 0.45, '#3c3e66', 0, FLOOR + 10.6, 0.22, 0.8);
    B(wg, len, 0.9, 0.3, '#1d1e2d', 0, FLOOR + 0.45, 0.15, 0.9);
  }
  wains(110, 0, WALL, 0); wains(ZF - WALL, -XW, (ZF + WALL) / 2, Math.PI / 2); wains(ZF - WALL, XW, (ZF + WALL) / 2, -Math.PI / 2);

  /* ---- the desk: warm wood top on dark steel, with a large dark mat ---- */
  var woodTex = ctex(T, 1024, 512, 1024, 512, function (x, w, h) {
    var pl = 5, ph = h / pl, k, n;
    for (k = 0; k < pl; k++) {
      x.fillStyle = ['#a1724b', '#98693f', '#a97a52', '#9c6d45', '#a47550'][k]; x.fillRect(0, k * ph, w, ph);
      for (n = 0; n < 22; n++) { var y = k * ph + rnd() * ph; x.strokeStyle = rnd() < 0.6 ? 'rgba(70,40,18,' + (0.08 + rnd() * 0.14) + ')' : 'rgba(255,220,170,' + (0.05 + rnd() * 0.07) + ')'; x.lineWidth = 0.8 + rnd() * 2; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 10, w * 0.7, y + (rnd() - 0.5) * 10, w, y + (rnd() - 0.5) * 8); x.stroke(); }
      x.fillStyle = 'rgba(40,22,10,0.55)'; x.fillRect(0, k * ph, w, 3);
    }
  });
  var steel = '#25262f';
  B(g, TW, 1.2, TD, '#7a5133', TX, TOP - 0.62, TZ, 0.8);
  flat(g, TW, TD, new T.MeshStandardMaterial({ map: woodTex, roughness: 0.85, metalness: 0 }), TX, TOP, TZ);
  var LX = [TX - TW / 2 + 1.7, TX + TW / 2 - 1.7], LZ = [TZ - TD / 2 + 1.7, TZ + TD / 2 - 1.7], legH = -1.32 - FLOOR;
  LX.forEach(function (lx) { LZ.forEach(function (lz) { B(g, 1.3, legH, 1.3, steel, lx, FLOOR + legH / 2, lz); sh(lx, lz, 3.4, 3.4, 0.45, FLOOR + 0.07); }); });
  LZ.forEach(function (lz) { B(g, TW - 3.4, 1.5, 0.5, steel, TX, -2.1, lz); B(g, TW - 3.4, 0.5, 0.5, steel, TX, -9.6, lz); });
  LX.forEach(function (lx) { B(g, 0.5, 1.5, TD - 3.4, steel, lx, -2.1, TZ); B(g, 0.5, 0.5, TD - 3.4, steel, lx, -9.6, TZ); });
  /* a dim teal strip under the front edge of the desk */
  GP(g, TW - 6, 0.16, TEAL, 0.7, TX, -1.5, TZ + TD / 2 + 0.03);

  var matTex = ctex(T, 1024, 512, 1024, 512, function (x, w, h) {
    x.fillStyle = '#202238'; x.fillRect(0, 0, w, h);
    for (var n = 0; n < 1600; n++) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
    /* faint circuit traces at both ends */
    [[0, TEAL, 0.16], [1, MAG, 0.14]].forEach(function (s) {
      x.strokeStyle = s[1]; x.globalAlpha = s[2]; x.lineWidth = 3; x.fillStyle = s[1];
      for (var t2 = 0; t2 < 9; t2++) {
        var px = s[0] ? w - 40 - t2 * 18 : 40 + t2 * 18, py = 40 + t2 * 44; x.beginPath(); x.moveTo(px, py);
        px += (s[0] ? -1 : 1) * (60 + (t2 % 3) * 40); x.lineTo(px, py); py += 46; px += (s[0] ? -1 : 1) * 46; x.lineTo(px, py); px += (s[0] ? -1 : 1) * (50 + (t2 % 2) * 60); x.lineTo(px, py); x.stroke();
        x.beginPath(); x.arc(px, py, 7, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
    });
    x.setLineDash([10, 8]); x.strokeStyle = '#4b4f86'; x.lineWidth = 3; rrect(x, 16, 16, w - 32, h - 32, 18); x.stroke();
  });
  var MW = 54, MD = 22, MCX = TX, MCZ = 2.2;
  B(g, MW, 0.05, MD, '#15162a', MCX, TOP + 0.025, MCZ, 1);
  flat(g, MW, MD, new T.MeshStandardMaterial({ map: matTex, roughness: 1, metalness: 0 }), MCX, MAT, MCZ);

  /* ---- monitors ---- */
  function monitor(tex, x, z, ry) {
    var m = new T.Group(), w = 10.4, h = 5.65, pb = 3.0, cy = pb + h / 2;
    m.position.set(x, TOP, z); m.rotation.y = ry; g.add(m);
    B(m, w, h, 0.34, '#15161f', 0, cy, 0, 0.8);
    B(m, w * 0.55, h * 0.72, 0.5, '#1b1c27', 0, cy, -0.42, 0.9);
    B(m, 0.8, 4.9, 0.4, '#202129', 0, 2.6, -0.5, 0.8);
    B(m, 4.2, 0.2, 2.6, '#202129', 0, 0.1, 0.1, 0.8);
    var scr = P(m, w - 0.5, 4.95, new T.MeshBasicMaterial({ map: tex, color: new T.Color(1.2, 1.2, 1.2), fog: false }), 0, cy + 0.12, 0.19);
    GC(m, 0.08, 0.08, 0.02, TEAL, 1, 4.6, pb + 0.2, 0.18, 8).rotation.x = Math.PI / 2;
    return m;
  }
  var edA = { font: 54, pitch: 66, tabs: ['fib.py', 'notes.md'], lines: PY, cursor: { line: 6, col: 13 }, status: 'Ln 6, Col 13    Spaces: 4', lang: 'Python' };
  var edB = { font: 46, pitch: 56, tabs: ['gcd.js', 'main.js'], lines: JS, cursor: { line: 6, col: 12 }, status: 'Ln 6, Col 12    Spaces: 2', lang: 'JavaScript' };
  var scrA = dyn(T, 1024, 512), scrB = dyn(T, 1024, 512);
  drawEditor(scrA.x, 1024, 512, edA, true); drawEditor(scrB.x, 1024, 512, edB, false);
  scrA.t.needsUpdate = scrB.t.needsUpdate = true;
  var MON_Z = -10.6, M1X = -17.5, M2X = 13.2;
  monitor(scrA.t, M1X, MON_Z, 0.2); monitor(scrB.t, M2X, MON_Z, -0.2);
  sh(M1X, MON_Z, 6, 3.6, 0.5, 0.0); sh(M2X, MON_Z, 6, 3.6, 0.5, 0.0);

  /* ---- keyboard (key layout drawn on a texture), wrist rest, mouse ---- */
  var KBX = -18.8, KBZ = -6.2, kb = new T.Group(); kb.position.set(KBX, MAT, KBZ); g.add(kb);
  var keyTex = ctex(T, 1024, 512, 1024, 292, function (x, w, h) {
    x.fillStyle = '#16171f'; x.fillRect(0, 0, w, h);
    var u = 43, ox = 16, oy = 14, legend = 'QWERTYUIOP[]ASDFGHJKL;\'ZXCVBNM,./1234567890-=';
    function key(a, b, kw, kh, col, txt) {
      x.fillStyle = '#0d0e14'; rrect(x, a * u + ox, b * u + oy, kw * u - 2, kh * u - 2, 6); x.fill();
      x.fillStyle = col; rrect(x, a * u + ox + 3, b * u + oy + 2, kw * u - 8, kh * u - 9, 6); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.08)'; rrect(x, a * u + ox + 5, b * u + oy + 4, kw * u - 12, kh * u * 0.3, 4); x.fill();
      if (txt) { x.fillStyle = '#c4c8ea'; x.font = '600 17px ' + MONO; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, a * u + ox + kw * u / 2 - 2, b * u + oy + kh * u / 2 - 2); }
    }
    var alpha = '#464a68', mod = '#303247', k, r, a;
    key(0, 0, 1, 1, '#c8408e', 'esc'); for (k = 0; k < 12; k++) key(2 + k + Math.floor(k / 4) * 0.5, 0, 1, 1, mod, 'F' + (k + 1));
    for (k = 0; k < 13; k++) key(k, 1.5, 1, 1, alpha, legend.charAt(32 + k) || ''); key(13, 1.5, 2, 1, mod, '<-');
    key(0, 2.5, 1.5, 1, mod, 'tab'); for (k = 0; k < 12; k++) key(1.5 + k, 2.5, 1, 1, alpha, legend.charAt(k)); key(13.5, 2.5, 1.5, 1, mod, '');
    key(0, 3.5, 1.75, 1, mod, 'caps'); for (k = 0; k < 11; k++) key(1.75 + k, 3.5, 1, 1, alpha, legend.charAt(12 + k)); key(12.75, 3.5, 2.25, 1, '#1f9c8e', 'enter');
    key(0, 4.5, 2.25, 1, mod, 'shift'); for (k = 0; k < 10; k++) key(2.25 + k, 4.5, 1, 1, alpha, legend.charAt(23 + k)); key(12.25, 4.5, 2.75, 1, mod, 'shift');
    key(0, 5.5, 1.25, 1, mod, 'ctrl'); key(1.25, 5.5, 1.25, 1, mod, ''); key(2.5, 5.5, 1.25, 1, mod, 'alt'); key(3.75, 5.5, 6.25, 1, alpha, ''); key(10, 5.5, 1.25, 1, mod, 'alt'); key(11.25, 5.5, 1.25, 1, mod, ''); key(12.5, 5.5, 1.25, 1, mod, ''); key(13.75, 5.5, 1.25, 1, mod, 'ctrl');
    for (k = 0; k < 3; k++) { key(15.5 + k, 1.5, 1, 1, mod, ''); key(15.5 + k, 2.5, 1, 1, mod, ''); }
    key(16.5, 4.5, 1, 1, '#1f9c8e', '^'); key(15.5, 5.5, 1, 1, '#1f9c8e', '<'); key(16.5, 5.5, 1, 1, '#1f9c8e', 'v'); key(17.5, 5.5, 1, 1, '#1f9c8e', '>');
    for (r = 0; r < 4; r++) for (a = 0; a < 3; a++) key(19 + a, 1.5 + r, 1, 1, alpha, ['789', '456', '123', '0.='][r].charAt(a));
    key(22, 1.5, 1, 1, mod, '+'); key(22, 2.5, 1, 2, mod, '+'); key(22, 4.5, 1, 1, mod, '-');
    x.textAlign = 'start';
  });
  B(kb, 6.9, 0.5, 2.5, '#20212c', 0, 0.25, 0, 0.8);
  flat(kb, 6.7, 1.91, new T.MeshBasicMaterial({ map: keyTex }), 0, 0.53, 0);
  GB(kb, 6.4, 0.06, 0.06, TEAL, 0.85, 0, 0.12, 1.27);
  B(kb, 6.9, 0.45, 1.2, '#7c5233', 0, 0.225, 2.2, 0.8);
  sh(KBX, KBZ + 1, 8.4, 5.4, 0.5, 0.0);
  var mouse = new T.Group(); mouse.position.set(-13.4, MAT, KBZ + 0.2); mouse.rotation.y = 0.15; g.add(mouse);
  S(mouse, 0.55, '#24252f', 0, 0.2, 0, 0.9, 0.5, 1.5); GB(mouse, 0.04, 0.03, 0.8, MAG, 0.9, 0, 0.45, -0.25); sh(-13.4, KBZ + 0.2, 2.2, 2.8, 0.45, 0.0);

  /* ---- headphones on a stand ---- */
  var hp = new T.Group(); hp.position.set(-10.0, TOP, -10.7); g.add(hp);
  C(hp, 1.35, 1.5, 0.3, '#24252f', 0, 0.15, 0, 24); C(hp, 0.13, 0.13, 6.4, '#2a2b36', 0, 3.3, 0, 10);
  TO(hp, new T.TorusGeometry(1.7, 0.16, 8, 28, Math.PI), '#1d1e28', 0, 4.7, 0);
  B(hp, 1.2, 0.34, 0.5, '#e24c9e', 0, 6.55, 0, 0.8);
  [-1, 1].forEach(function (s) {
    C(hp, 0.95, 0.95, 0.75, '#23242f', s * 1.85, 3.9, 0, 20).rotation.z = Math.PI / 2;
    C(hp, 0.82, 0.82, 0.2, '#e24c9e', s * 2.28, 3.9, 0, 20).rotation.z = Math.PI / 2;
    C(hp, 0.75, 0.82, 0.3, '#2f303d', s * 1.5, 3.9, 0, 20).rotation.z = Math.PI / 2;
    B(hp, 0.2, 0.9, 0.34, '#1d1e28', s * 1.78, 4.6, 0);
  });
  sh(-10.0, -10.7, 4.2, 4.2, 0.5, 0.0);

  /* ---- mug, duck, notebook, books, small plant on the desk ---- */
  var mug = new T.Group(); mug.position.set(-14.4, MAT, -2.4); g.add(mug);
  C(mug, 0.58, 0.52, 1.15, '#2a8f95', 0, 0.58, 0, 22);
  C(mug, 0.47, 0.47, 0.03, '#2a1810', 0, 1.17, 0, 20); TO(mug, new T.TorusGeometry(0.53, 0.05, 6, 22), '#2a8f95', 0, 1.15, 0).rotation.x = Math.PI / 2;
  var mh = TO(mug, new T.TorusGeometry(0.3, 0.07, 8, 16, Math.PI * 1.2), '#2a8f95', 0.58, 0.58, 0); mh.rotation.z = -Math.PI * 0.6;
  sh(-14.4, -2.4, 2.6, 2.6, 0.5, 0.0);
  var duck = new T.Group(); duck.position.set(13.6, MAT, -6.8); duck.rotation.y = -0.5; g.add(duck);
  S(duck, 0.55, '#f0c23c', 0, 0.45, 0, 1.15, 0.85, 1.35); S(duck, 0.34, '#f0c23c', 0.55, 1.05, 0, 1, 1, 1);
  B(duck, 0.34, 0.1, 0.3, '#e8873a', 0.95, 1.0, 0, 0.8); S(duck, 0.05, '#15161f', 0.78, 1.18, 0.2); S(duck, 0.05, '#15161f', 0.78, 1.18, -0.2);
  sh(13.6, -6.8, 2.0, 2.0, 0.5, 0.0);
  var nb = new T.Group(); nb.position.set(20.6, MAT, 9.2); nb.rotation.y = 0.35; g.add(nb);
  B(nb, 3.0, 0.2, 4.0, '#2a8f95', 0, 0.1, 0, 0.9); B(nb, 2.8, 0.14, 3.8, '#cfc9b4', 0.06, 0.25, 0, 0.95);
  C(nb, 0.05, 0.05, 2.6, '#e24c9e', 0.2, 0.4, 0.2, 8).rotation.z = Math.PI / 2;
  sh(20.6, 9.2, 4.4, 5.4, 0.45, 0.0);
  var bk = new T.Group(); bk.position.set(24.6, TOP, -10.4); bk.rotation.y = 0.12; g.add(bk);
  [['#3b3f8a', 3.5, 2.5, 0.5], ['#b4467d', 3.2, 2.3, 0.45], ['#c6963e', 3.4, 2.4, 0.4]].forEach(function (b, k) {
    var o = B(bk, b[1], b[3], b[2], b[0], 0, 0.25 + k * 0.48, 0, 0.9); o.rotation.y = (k - 1) * 0.08;
  });
  sh(24.6, -10.4, 5, 3.8, 0.45, 0.0);

  /* ---- an open laptop (a Python prompt) and a to-do pad, both outside the clear zone ---- */
  var lapTex = ctex(T, 512, 256, 512, 332, function (x, w, h) {
    x.fillStyle = '#14151f'; x.fillRect(0, 0, w, h); x.font = '600 30px ' + MONO; x.textBaseline = 'middle';
    var rows = [[['$ ', '#6a7098'], ['python3', '#d6d9f5']], [['>>> ', '#e868b4'], ['bin(42)', '#d6d9f5']], [["'0b101010'", '#9ae08c']], [['>>> ', '#e868b4'], ["int('1010', 2)", '#d6d9f5']], [['10', '#f5b862']], [['>>> ', '#e868b4'], ['_', '#4fe0cc']]];
    rows.forEach(function (r, k) { var tx = 22; r.forEach(function (tk) { x.fillStyle = tk[1]; x.fillText(tk[0], tx, 40 + k * 46); tx += x.measureText(tk[0]).width; }); });
  });
  var lap = new T.Group(); lap.position.set(17.8, MAT, 2.8); lap.rotation.y = 0.32; g.add(lap);
  B(lap, 4.5, 0.22, 3.1, '#2a2b37', 0, 0.11, 0.2, 0.8); GF(lap, 3.9, 1.4, '#1a1b26', 1, 0, 0.235, 0.35);
  GF(lap, 1.4, 0.8, '#33354a', 1, 0, 0.235, 1.35);
  var lid = new T.Group(); lid.position.set(0, 0.22, -1.3); lid.rotation.x = -0.32; lap.add(lid);
  B(lid, 4.5, 3.1, 0.14, '#2a2b37', 0, 1.55, 0, 0.8); P(lid, 4.1, 2.66, new T.MeshBasicMaterial({ map: lapTex, fog: false }), 0, 1.58, 0.09);
  sh(17.8, 3.0, 6.2, 5, 0.5, 0.0);
  var padTex = ctex(T, 256, 256, 256, 320, function (x, w, h) {
    x.fillStyle = '#d8d2bc'; x.fillRect(0, 0, w, h); x.fillStyle = '#4a8fb0'; for (var k = 0; k < 8; k++) x.fillRect(0, 74 + k * 30, w, 1.5);
    x.fillStyle = '#b8344a'; x.fillRect(32, 0, 2, h); x.fillStyle = '#2a2b3c'; x.font = '700 34px ' + HAND; x.textBaseline = 'middle'; x.fillText('to do', 48, 38);
    x.font = '600 26px ' + HAND; ['[x] binary', '[x] cpu', '[ ] sorting', '[ ] graphs'].forEach(function (l, k) { x.fillText(l, 48, 90 + k * 30); });
  });
  var pad = new T.Group(); pad.position.set(-20.6, MAT, 3.8); pad.rotation.y = -0.18; g.add(pad);
  B(pad, 3.6, 0.12, 4.5, '#8c8a96', 0, 0.06, 0, 0.9); flat(pad, 3.5, 4.4, new T.MeshBasicMaterial({ map: padTex }), 0, 0.14, 0);
  sh(-20.6, 3.8, 4.8, 5.8, 0.4, 0.0);

  /* ---- plants: leaves and stems are baked into the static mesh ---- */
  var leafGeo = new T.SphereGeometry(1, 8, 5), stemGeo = new T.CylinderGeometry(1, 1, 1, 5);
  function plant(x, y, z, potR, potH, potColor, n, len, stemR, bright) {
    var pg = new T.Group(); pg.position.set(x, y, z); g.add(pg);
    C(pg, potR, potR * 0.74, potH, potColor, 0, potH / 2, 0, 20); C(pg, potR * 0.92, potR * 0.92, 0.06, '#2a1d14', 0, potH + 0.01, 0, 18);
    var up = new T.Vector3(0, 1, 0), pr = K.mulberry(Math.floor(x * 31 + z * 17) + 9), cols = [bright ? '#3fae78' : '#2f8c62', '#357f58', '#46b480', '#2d7a56'];
    for (var k = 0; k < n; k++) {
      var a = k * 2.4, tl = 0.22 + pr() * 0.65, L = len * (0.55 + pr() * 0.6), dir = new T.Vector3(Math.sin(tl) * Math.cos(a), Math.cos(tl), Math.sin(tl) * Math.sin(a)).normalize();
      var q = new T.Quaternion().setFromUnitVectors(up, dir), base = new T.Vector3(0, potH, 0), mid = base.clone().add(dir.clone().multiplyScalar(L * 0.5));
      var st = rec(recs, pg, stemGeo, '#4c7a4a', mid.x, mid.y, mid.z); st.quaternion.copy(q); st.scale.set(stemR, L, stemR);
      var lr = len * (0.38 + pr() * 0.22), lc = base.clone().add(dir.clone().multiplyScalar(L + lr * 0.55)), roll = new T.Quaternion().setFromAxisAngle(dir, pr() * 6.28);
      var lf = rec(recs, pg, leafGeo, cols[k % cols.length], lc.x, lc.y, lc.z); lf.quaternion.copy(roll.multiply(q)); lf.scale.set(lr * 0.5, lr, lr * 0.12);
    }
    return pg;
  }
  plant(25.7, TOP, -6.0, 0.9, 1.2, '#d9d4c4', 8, 1.6, 0.05, true);
  plant(-39, FLOOR, -9, 2.4, 4.4, '#3a3b4a', 26, 6.4, 0.1, false);
  sh(-39, -9, 7.5, 7.5, 0.5, FLOOR + 0.07);

  /* ---- under the desk: a PC tower with a teal strip ---- */
  var tw = new T.Group(); tw.position.set(-17, FLOOR, -3.5); tw.rotation.y = -0.1; g.add(tw);
  B(tw, 3.4, 7.2, 6.8, '#24252f', 0, 3.6, 0); B(tw, 2.6, 6.2, 0.06, '#171821', 0, 3.8, 3.43);
  GP(tw, 0.14, 5.2, TEAL, 0.9, -0.8, 3.8, 3.48); GC(tw, 0.14, 0.14, 0.04, AMB, 0.9, 0.6, 6.4, 3.48, 8).rotation.x = Math.PI / 2;
  sh(-17, -3.5, 6.6, 9.4, 0.55, FLOOR + 0.07);

  /* ---- chair, pulled out from the desk (seen from behind) ---- */
  var ch = new T.Group(); ch.position.set(-22, FLOOR, 22); ch.rotation.y = Math.PI + 0.5; g.add(ch);
  var cm = '#2b2c39';
  for (i = 0; i < 5; i++) { var ca = i / 5 * 6.283; var lg = B(ch, 0.8, 0.45, 3.8, '#1f202a', Math.sin(ca) * 1.9, 0.95, Math.cos(ca) * 1.9, 0.8); lg.rotation.y = ca; C(ch, 0.42, 0.42, 0.7, '#14151c', Math.sin(ca) * 3.7, 0.4, Math.cos(ca) * 3.7, 10); }
  C(ch, 0.38, 0.45, 4.2, '#23242e', 0, 3.2, 0, 12);
  B(ch, 6.4, 1.0, 6.2, cm, 0, 5.9, 0, 0.95);
  B(ch, 0.9, 3.4, 0.7, '#23242e', 0, 8.0, -3.0);
  var back = B(ch, 5.8, 8.2, 0.9, cm, 0, 12.0, -3.4, 0.95); back.rotation.x = -0.1;
  var head = B(ch, 3.4, 1.9, 0.8, cm, 0, 17.4, -3.9, 0.95); head.rotation.x = -0.1;
  var stripe = GP(ch, 0.4, 6.8, MAG, 0.5, 0, 12.1, -3.99 - 0.36); stripe.rotation.y = Math.PI; stripe.rotation.x = 0.1;
  [-1, 1].forEach(function (s) { B(ch, 0.6, 0.45, 3.4, '#1f202a', s * 3.5, 9.2, -0.6); B(ch, 0.45, 2.4, 0.45, '#1f202a', s * 3.5, 8.0, -1.4); });
  sh(-22, 22, 9.5, 9.5, 0.5, FLOOR + 0.07);

  /* ---- server racks: dark frames, front panels drawn on a texture, a few slow LEDs ---- */
  var RACKS = [];
  function makeRack(cx, seed, plan, acc) {
    var r = K.mulberry(seed), leds = [], W = 256, H = 1024, U = 25.6, bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    var x = bg.getContext('2d'), live = dyn(T, W, H), n, d, y = 0, k, col;
    var used = 0; plan.forEach(function (p) { used += p[1]; });
    var fillU = 40 - used; if (fillU > 0) plan.splice(plan.length - 1, 0, ['blank', fillU]);
    x.fillStyle = '#0e0f16'; x.fillRect(0, 0, W, H);
    function led(a, b, c, mode, rr) { leds.push({ x: a, y: b, c: c, m: mode, p: 1.6 + r() * 3.4, ph: r(), d: 0.45 + r() * 0.35, r: rr || 3.6 }); }
    function body(y0, u, c) { x.fillStyle = c; x.fillRect(16, y0 + 1.5, W - 32, u * U - 3); x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(16, y0 + 1.5, W - 32, 2); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(16, y0 + u * U - 3, W - 32, 1.5); }
    plan.forEach(function (p) {
      var kind = p[0], u = p[1], y0 = y * U, h = u * U;
      if (kind === 'blank') { body(y0, u, '#252736'); for (d = 0; d < u; d++) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(30, y0 + d * U + 8, W - 60, 2); } }
      else if (kind === 'patch') {
        body(y0, u, '#2c2e40');
        for (d = 0; d < 12; d++) { var px = 28 + d * 17.5; x.fillStyle = '#0b0c12'; x.fillRect(px, y0 + 6, 13, 12); x.fillStyle = acc.cables[(d * 5 + seed) % acc.cables.length]; x.fillRect(px + 2, y0 + 9, 9, 8); }
      } else if (kind === 'switch') {
        body(y0, u, '#383b52');
        for (d = 0; d < 8; d++) { var sx = 30 + d * 21; x.fillStyle = '#0b0c12'; x.fillRect(sx, y0 + 11, 15, 10); led(sx + 7.5, y0 + 6.5, acc.ok, r() < 0.6 ? 'blink' : 'on', 3); }
        x.fillStyle = '#0b0c12'; x.fillRect(206, y0 + 7, 28, 12); led(220, y0 + 4, acc.hot, 'on', 3);
      } else if (kind === 'srv') {
        body(y0, u, '#303347');
        if (u === 1) {
          for (d = 0; d < 10; d++) { x.fillStyle = '#12131c'; x.fillRect(30 + d * 9, y0 + 6, 5, 12); }
          led(168, y0 + 12, acc.ok, 'on'); led(184, y0 + 12, acc.ok, r() < 0.5 ? 'blink' : 'on'); led(200, y0 + 12, acc.hot, 'blink'); x.fillStyle = '#16171f'; x.beginPath(); x.arc(226, y0 + 12, 5, 0, 7); x.fill();
        } else {
          for (d = 0; d < 8; d++) { var bx = 28 + (d % 4) * 40, by = y0 + 7 + Math.floor(d / 4) * 21; x.fillStyle = '#12131c'; x.fillRect(bx, by, 34, 16); led(bx + 28, by + 8, d % 3 === 1 ? acc.hot : acc.ok, r() < 0.55 ? 'blink' : 'on', 3.2); }
          x.fillStyle = '#12131c'; for (d = 0; d < 5; d++) x.fillRect(196, y0 + 8 + d * 7, 30, 3);
          led(238, y0 + 12, acc.ok, 'on');
        }
      } else if (kind === 'nas') {
        body(y0, u, '#2e3146');
        for (d = 0; d < 12; d++) { var nx = 26 + (d % 3) * 70, ny = y0 + 8 + Math.floor(d / 3) * 22; x.fillStyle = '#12131c'; x.fillRect(nx, ny, 62, 17); x.fillStyle = '#1d1f2c'; x.fillRect(nx + 14, ny + 4, 44, 9); led(nx + 7, ny + 8.5, acc.ok, r() < 0.5 ? 'blink' : 'on', 3.4); }
      } else if (kind === 'ups') {
        body(y0, u, '#2a2b3a'); x.fillStyle = '#082f33'; x.fillRect(30, y0 + 12, 120, h - 28);
        for (d = 0; d < 6; d++) { x.fillStyle = d < 5 ? acc.ok : '#14464a'; x.fillRect(38 + d * 18, y0 + 18, 12, h - 40); }
        x.fillStyle = '#12131c'; for (d = 0; d < 6; d++) x.fillRect(170, y0 + 14 + d * 8, 62, 3);
        led(160, y0 + h - 12, acc.ok, 'on', 4);
      }
      y += u;
    });
    /* rails with mounting holes, drawn over the device edges */
    x.fillStyle = '#1b1c28'; x.fillRect(0, 0, 16, H); x.fillRect(W - 16, 0, 16, H);
    x.fillStyle = '#07080c'; for (k = 0; k < 40; k++) { x.fillRect(5, k * U + 5, 6, 5); x.fillRect(5, k * U + 16, 6, 5); x.fillRect(W - 11, k * U + 5, 6, 5); x.fillRect(W - 11, k * U + 16, 6, 5); }
    var lx = live.x, sig = '';
    function paint(t) {
      var s = '', q = Math.floor(t * 4) / 4, k2, L, on;
      for (k2 = 0; k2 < leds.length; k2++) { L = leds[k2]; on = L.m === 'on' ? 1 : (((q / L.p + L.ph) % 1) < L.d ? 1 : 0); L.on = on; s += on; }
      if (s === sig) return; sig = s;
      lx.drawImage(bg, 0, 0);
      for (k2 = 0; k2 < leds.length; k2++) {
        L = leds[k2]; col = L.c;
        if (L.on) { lx.fillStyle = col; lx.globalAlpha = 0.25; lx.beginPath(); lx.arc(L.x, L.y, L.r * 1.9, 0, 7); lx.fill(); lx.globalAlpha = 1; lx.beginPath(); lx.arc(L.x, L.y, L.r, 0, 7); lx.fill(); }
        else { lx.fillStyle = '#1d2a2c'; lx.beginPath(); lx.arc(L.x, L.y, L.r * 0.9, 0, 7); lx.fill(); }
      }
      live.t.needsUpdate = true;
    }
    paint(0);

    /* frame around the front panel: 7.2 wide, 27 tall, 8 deep */
    var rg = new T.Group(), RW = 7.2, RH = 27, RD = 6, IW = 6.4, IH = 25.6; rg.position.set(cx, FLOOR, WALL + 0.5 + RD / 2); g.add(rg);
    var fm = '#2a2b38', fm2 = '#333444';
    B(rg, 0.2, RH, RD, fm, -RW / 2 + 0.1, RH / 2, 0); B(rg, 0.2, RH, RD, fm, RW / 2 - 0.1, RH / 2, 0);
    B(rg, RW, RH, 0.2, fm, 0, RH / 2, -RD / 2 + 0.1); B(rg, RW, 0.3, RD, fm2, 0, RH - 0.15, 0); B(rg, RW, 0.8, RD, '#16171f', 0, 0.4, 0);
    B(rg, 0.4, IH, 0.5, fm2, -RW / 2 + 0.3, 0.8 + IH / 2, RD / 2 - 0.25); B(rg, 0.4, IH, 0.5, fm2, RW / 2 - 0.3, 0.8 + IH / 2, RD / 2 - 0.25);
    B(rg, RW, 0.6, 0.5, fm2, 0, 0.8 + IH + 0.3 - 0.0, RD / 2 - 0.25);
    P(rg, IW, IH, new T.MeshBasicMaterial({ map: live.t, color: new T.Color(1.15, 1.15, 1.15) }), 0, 0.8 + IH / 2, RD / 2 - 0.65);
    B(rg, IW, IH, 0.1, '#0b0c11', 0, 0.8 + IH / 2, -RD / 2 + 0.4);
    sh(cx, WALL + 0.5 + RD / 2 + 0.6, RW + 3, RD + 3, 0.55, FLOOR + 0.07);
    RACKS.push(paint);
  }
  var accA = { ok: '#52f09a', hot: '#f5b862', cables: ['#2aa8a0', '#b83a86', '#c99a3c', '#4a6bd0'] };
  var accB = { ok: '#34e0cf', hot: '#ee5aa8', cables: ['#b83a86', '#2aa8a0', '#6a7ad8', '#c99a3c'] };
  makeRack(26.6, 5, [['patch', 1], ['switch', 1], ['blank', 1], ['srv', 1], ['srv', 1], ['srv', 2], ['srv', 2], ['blank', 1], ['srv', 2], ['srv', 2], ['blank', 1], ['nas', 4], ['blank', 1], ['srv', 2], ['ups', 4]], accA);
  makeRack(34.2, 9, [['switch', 1], ['switch', 1], ['patch', 1], ['patch', 1], ['blank', 1], ['srv', 1], ['srv', 1], ['srv', 1], ['srv', 1], ['blank', 1], ['srv', 2], ['srv', 2], ['srv', 2], ['blank', 1], ['nas', 4], ['ups', 4]], accB);

  /* ---- whiteboard: a correct binary search tree and a small flowchart ---- */
  var WBX = -17.5, WBY = 14.5;
  var wbTex = ctex(T, 1024, 512, 1024, 512, function (x, w, h) {
    x.fillStyle = '#b8bccb'; x.fillRect(0, 0, w, h);
    for (var n = 0; n < 7; n++) { x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 60 + rnd() * 80, 12 + rnd() * 12, rnd() * 3, 0, 7); x.fill(); }
    x.lineCap = 'round'; x.lineJoin = 'round'; x.textAlign = 'center'; x.textBaseline = 'middle';
    var INK = '#1d2d78', TL = '#0a7a76', MG = '#a8206a', BK = '#26283a';
    /* tree */
    x.fillStyle = TL; x.font = '700 38px ' + HAND; x.fillText('binary search tree', 250, 40);
    x.strokeStyle = TL; x.lineWidth = 4; x.beginPath(); x.moveTo(110, 66); x.lineTo(390, 66); x.stroke();
    var nodes = { 8: [250, 150], 3: [125, 258], 10: [375, 258], 1: [60, 366], 6: [190, 366], 14: [440, 366] }, edges = [[8, 3], [8, 10], [3, 1], [3, 6], [10, 14]];
    x.strokeStyle = INK; x.lineWidth = 5;
    edges.forEach(function (e) { var a = nodes[e[0]], b = nodes[e[1]], an = Math.atan2(b[1] - a[1], b[0] - a[0]); x.beginPath(); x.moveTo(a[0] + Math.cos(an) * 36, a[1] + Math.sin(an) * 36); x.lineTo(b[0] - Math.cos(an) * 36, b[1] - Math.sin(an) * 36); x.stroke(); });
    Object.keys(nodes).forEach(function (kk) { var p = nodes[kk]; x.beginPath(); x.arc(p[0], p[1], 36, 0, 7); x.fillStyle = '#d6d9e4'; x.fill(); x.stroke(); x.fillStyle = INK; x.font = '700 40px ' + HAND; x.fillText(kk, p[0], p[1] + 2); });
    x.fillStyle = TL; x.font = '700 32px ' + HAND; x.fillText('left < node < right', 250, 440);
    x.fillStyle = MG; x.font = '700 30px ' + HAND; x.fillText('in-order: 1 3 6 8 10 14', 250, 486);
    /* flowchart: for i in range(3) */
    x.fillStyle = TL; x.font = '700 36px ' + HAND; x.fillText('for i in range(3)', 775, 34);
    x.strokeStyle = BK; x.lineWidth = 5; x.fillStyle = BK; x.font = '700 34px ' + HAND;
    function oval(cx, cy, tw, label) { rrect(x, cx - tw / 2, cy - 22, tw, 44, 22); x.stroke(); x.fillText(label, cx, cy + 2); }
    function box(cx, cy, tw, label) { x.strokeRect(cx - tw / 2, cy - 22, tw, 44); x.fillText(label, cx, cy + 2); }
    oval(775, 96, 120, 'start'); box(775, 172, 140, 'i = 0');
    x.beginPath(); x.moveTo(775, 262); x.lineTo(870, 308); x.lineTo(775, 354); x.lineTo(680, 308); x.closePath(); x.stroke(); x.fillText('i < 3 ?', 775, 310);
    box(775, 420, 160, 'print(i)'); box(775, 486, 170, 'i = i + 1'); oval(978, 308, 90, 'end');
    arrow(x, 775, 118, 775, 148, 14); arrow(x, 775, 194, 775, 260, 14); arrow(x, 775, 354, 775, 396, 14); arrow(x, 775, 442, 775, 462, 14); arrow(x, 870, 308, 931, 308, 14);
    x.beginPath(); x.moveTo(690, 486); x.lineTo(610, 486); x.lineTo(610, 308); x.stroke(); arrow(x, 610, 308, 678, 308, 14);
    x.fillStyle = MG; x.font = '700 28px ' + HAND; x.fillText('yes', 812, 378); x.fillText('no', 900, 286);
  });
  B(g, 17.8, 9.3, 0.4, '#8b8fa3', WBX, WBY, WALL + 0.2, 0.6);
  P(g, 17, 8.5, new T.MeshBasicMaterial({ map: wbTex }), WBX, WBY, WALL + 0.43);
  B(g, 10, 0.3, 0.8, '#8b8fa3', WBX, WBY - 4.8, WALL + 0.5, 0.6);
  [['#c43b3b', -3.4], ['#1d2d78', -2.4], ['#0a7a76', -1.4]].forEach(function (m) { C(g, 0.12, 0.12, 1.0, m[0], WBX + m[1], WBY - 4.5, WALL + 0.6, 10).rotation.z = Math.PI / 2; });

  /* ---- sticky notes: one mesh, four quads cut from one texture ---- */
  var noteTex = ctex(T, 256, 256, 256, 256, function (x) {
    var cs = ['#e8cd62', '#ee8fb9', '#6fd6c8', '#f2a85e'], tx = [['TODO:', 'tests'], ['fix bug', '#42'], ['git', 'push!'], ['buy', 'coffee']];
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (var k = 0; k < 4; k++) { var ox = (k % 2) * 128, oy = Math.floor(k / 2) * 128; x.fillStyle = cs[k]; x.fillRect(ox, oy, 128, 128); x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(ox, oy + 112, 128, 16); x.fillStyle = '#2a2b3c'; x.font = '700 32px ' + HAND; x.fillText(tx[k][0], ox + 64, oy + 50); x.fillText(tx[k][1], ox + 64, oy + 86); }
  });
  var ng = new T.BufferGeometry(), np = [], nu = [], ni = [], NS = 1.5;
  [[-7.7, 17.2, 0.1], [-6.0, 16.2, -0.14], [-7.5, 15.1, -0.08], [-5.9, 14.2, 0.12]].forEach(function (n, k) {
    var c = Math.cos(n[2]) * NS / 2, s = Math.sin(n[2]) * NS / 2, u0 = (k % 2) * 0.5, vb = (1 - Math.floor(k / 2)) * 0.5, b = k * 4;
    np.push(n[0] - c + s, n[1] - s - c, 0, n[0] + c + s, n[1] + s - c, 0, n[0] + c - s, n[1] + s + c, 0, n[0] - c - s, n[1] - s + c, 0);
    nu.push(u0, vb, u0 + 0.5, vb, u0 + 0.5, vb + 0.5, u0, vb + 0.5); ni.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  ng.setAttribute('position', new T.Float32BufferAttribute(np, 3)); ng.setAttribute('uv', new T.Float32BufferAttribute(nu, 2)); ng.setIndex(ni);
  var notes = new T.Mesh(ng, new T.MeshBasicMaterial({ map: noteTex })); notes.position.z = WALL + 0.05; g.add(notes);

  /* ---- acoustic foam panels (one texture), with a dim LED strip near the ceiling ---- */
  var foamTex = ctex(T, 1024, 512, 768, 512, function (x, w, h) {
    x.fillStyle = '#34355c'; x.fillRect(0, 0, w, h);
    for (var pr = 0; pr < 2; pr++) for (var pc = 0; pc < 3; pc++) {
      var ox = pc * 256 + 6, oy = pr * 256 + 6, sz = 244, cells = 6, cs = sz / cells, a, b;
      x.fillStyle = '#23243a'; x.fillRect(ox, oy, sz, sz);
      for (a = 0; a < cells; a++) for (b = 0; b < cells; b++) {
        var X = ox + a * cs, Y = oy + b * cs;
        x.fillStyle = '#2d2f4c'; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + cs, Y); x.lineTo(X + cs / 2, Y + cs / 2); x.fill();
        x.fillStyle = '#3a3d62'; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + cs / 2, Y + cs / 2); x.lineTo(X, Y + cs); x.fill();
        x.fillStyle = '#1b1c2e'; x.beginPath(); x.moveTo(X + cs, Y); x.lineTo(X + cs, Y + cs); x.lineTo(X + cs / 2, Y + cs / 2); x.fill();
        x.fillStyle = '#262842'; x.beginPath(); x.moveTo(X, Y + cs); x.lineTo(X + cs, Y + cs); x.lineTo(X + cs / 2, Y + cs / 2); x.fill();
      }
    }
  });
  P(g, 13.2, 8.8, new T.MeshBasicMaterial({ map: foamTex }), 2, 14.9, WALL + 0.04);
  var stripTex = ctex(T, 512, 8, 512, 8, function (x, w, h) { var gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2fd8c4'); gr.addColorStop(0.3, '#4a6bd8'); gr.addColorStop(0.55, '#e24c9e'); gr.addColorStop(0.8, '#4a6bd8'); gr.addColorStop(1, '#2fd8c4'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  var stripMat = new T.MeshBasicMaterial({ map: stripTex, color: K.hdr(T, '#ffffff', 0.8), fog: false });
  function strip(len, x, z, ry) { var sg = new T.Group(); sg.position.set(x, 21.2, z); sg.rotation.y = ry; g.add(sg); B(sg, len, 0.5, 0.25, '#1b1c2a', 0, 0, 0.13); P(sg, len, 0.34, stripMat, 0, 0, 0.27); }
  strip(2 * XW, 0, WALL, 0); strip(ZF - WALL, -XW, (ZF + WALL) / 2, Math.PI / 2); strip(ZF - WALL, XW, (ZF + WALL) / 2, -Math.PI / 2);

  /* ---- shelf with books, framed prints, a clock ---- */
  var SHX = 15.5, SHY = 9.8, SHZ = WALL + 1.4;
  B(g, 12, 0.6, 2.8, '#7a5133', SHX, SHY, SHZ, 0.8);
  var bcols = ['#1f7077', '#9a2f68', '#3b3f8a', '#b98a3c', '#3a3b48', '#6a3a7a', '#2f7a58', '#8a3a3a', '#4a4f9a'], bx = SHX - 5.6;
  for (i = 0; i < 9; i++) {
    var bt = 0.5 + rnd() * 0.45, bh = 2.8 + rnd() * 1.1; bx += bt / 2;
    var bo = B(g, bt, bh, 2.3, bcols[i], bx, SHY + 0.3 + bh / 2, SHZ, 0.9); if (i === 8) { bo.rotation.z = -0.22; bo.position.x += 0.3; }
    bx += bt / 2 + 0.03;
  }
  plant(SHX + 4.6, SHY + 0.3, SHZ + 0.3, 0.9, 1.1, '#d9d4c4', 7, 1.15, 0.045, true);
  sh(SHX, SHZ, 12, 3.4, 0.3, SHY + 0.32);
  function frame(w, h, tex, x, y) {
    B(g, w + 0.7, h + 0.7, 0.3, '#7a5133', x, y, WALL + 0.15, 0.8);
    P(g, w, h, new T.MeshBasicMaterial({ map: tex }), x, y, WALL + 0.33);
  }
  var printA = ctex(T, 256, 256, 256, 290, function (x, w, h) {
    x.fillStyle = '#1a1b2e'; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#2fd8c4'; x.font = '700 44px ' + MONO; x.fillText('01001000', 128, 58); x.fillStyle = '#9aa0d6'; x.font = '600 28px ' + MONO; x.fillText('= H', 128, 98);
    x.fillStyle = '#e24c9e'; x.font = '700 44px ' + MONO; x.fillText('01101001', 128, 154); x.fillStyle = '#9aa0d6'; x.font = '600 28px ' + MONO; x.fillText('= i', 128, 194);
    x.fillStyle = '#d6d9f5'; x.font = '600 26px ' + MONO; x.fillText('hello, binary', 128, 256);
  });
  var printB = ctex(T, 256, 256, 256, 256, function (x, w, h) {
    x.fillStyle = '#22243e'; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#e24c9e'; x.font = '700 120px ' + MONO; x.fillText('{ }', 128, 100); x.fillStyle = '#9ae08c'; x.font = '600 24px ' + MONO; x.fillText('it works', 128, 190); x.fillStyle = '#6a7098'; x.fillText('(on my machine)', 128, 222);
  });
  frame(4.4, 5.0, printA, 13.2, 17.5); frame(4.4, 4.4, printB, 19.0, 17.3);
  /* clock: digits are the visitor's local time, redrawn when the minute changes */
  var clk = dyn(T, 256, 128), clkMin = -1;
  B(g, 5.8, 2.9, 0.3, '#16171f', 26.6, 17.4, WALL + 0.15, 0.8);
  P(g, 5.2, 2.4, new T.MeshBasicMaterial({ map: clk.t, fog: false }), 26.6, 17.4, WALL + 0.33);
  function paintClock() {
    var d = new Date(), m = d.getHours() * 60 + d.getMinutes(); if (m === clkMin) return; clkMin = m;
    var x = clk.x, hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    x.fillStyle = '#10111b'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#2fd8c4'; x.font = '700 92px ' + MONO; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(hh + ':' + mm, 128, 68); clk.t.needsUpdate = true;
  }
  paintClock();

  /* ---- right side of the room: boxes and a cable duct ---- */
  B(g, 5.6, 3.4, 4.4, '#a47c52', 38, FLOOR + 1.7, 2, 0.9); B(g, 4.2, 3.0, 3.8, '#98714a', 38.4, FLOOR + 3.4 + 1.5, 2.1, 0.9).rotation.y = 0.2;
  B(g, 5.6, 0.04, 0.5, '#d6c9a8', 38, FLOOR + 3.42, 2, 0.9); sh(38, 2, 8, 7, 0.5, FLOOR + 0.07);


  /* ---- side walls: a door on the right, two prints on the left ---- */
  var dg = new T.Group(); dg.position.set(XW, 0, 24); dg.rotation.y = -Math.PI / 2; g.add(dg);
  B(dg, 13.4, 0.8, 0.5, '#2f2a33', 0, FLOOR + 28.6, 0.25); B(dg, 0.8, 28.6, 0.5, '#2f2a33', -6.3, FLOOR + 14.3, 0.25); B(dg, 0.8, 28.6, 0.5, '#2f2a33', 6.3, FLOOR + 14.3, 0.25);
  B(dg, 11.8, 28.2, 0.3, '#7d5638', 0, FLOOR + 14.1, 0.2);
  [[-3.2, 21], [3.2, 21], [-3.2, 9], [3.2, 9]].forEach(function (pn) { B(dg, 4.6, 8.4, 0.12, '#6f4b31', pn[0], FLOOR + pn[1], 0.4); });
  C(dg, 0.3, 0.3, 0.7, '#b9b6c4', -4.6, FLOOR + 14, 0.65, 14).rotation.x = Math.PI / 2;
  var lw = new T.Group(); lw.position.set(-XW, 0, 0); lw.rotation.y = Math.PI / 2; g.add(lw);
  var printC = ctex(T, 256, 256, 256, 256, function (x, w, h) {
    x.fillStyle = '#20223a'; x.fillRect(0, 0, w, h); x.lineWidth = 5; x.lineJoin = 'round';
    function cube(cx, cy, s, col) { var a = s * 0.866; x.strokeStyle = col; x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + a, cy - s / 2); x.lineTo(cx + a, cy + s / 2); x.lineTo(cx, cy + s); x.lineTo(cx - a, cy + s / 2); x.lineTo(cx - a, cy - s / 2); x.closePath(); x.moveTo(cx, cy); x.lineTo(cx, cy + s); x.moveTo(cx, cy); x.lineTo(cx + a, cy - s / 2); x.moveTo(cx, cy); x.lineTo(cx - a, cy - s / 2); x.stroke(); }
    cube(128, 128, 96, '#2fd8c4'); cube(128, 128, 56, '#e24c9e');
  });
  var printD = ctex(T, 256, 256, 256, 256, function (x, w, h) {
    x.fillStyle = '#1a1b2e'; x.fillRect(0, 0, w, h);
    var px = ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000', '00000000'];
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) if (px[r].charAt(c) === '1') { x.fillStyle = (r + c) % 3 === 0 ? '#e24c9e' : '#2fd8c4'; x.fillRect(32 + c * 24, 32 + r * 24, 22, 22); }
  });
  [[8, 12.5, 5.6, printC], [-3, 12.5, 5.6, printD]].forEach(function (f) {
    B(lw, f[2] + 0.7, f[2] + 0.7, 0.3, '#7a5133', f[0], f[1], 0.15); P(lw, f[2], f[2], new T.MeshBasicMaterial({ map: f[3] }), f[0], f[1], 0.33);
  });

  /* ---- bake the static parts and the shadows ---- */
  g.updateMatrixWorld(true);
  bake(recs, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
  bake(grecs, new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
  bakeShadows();

  /* ---- the stage's soft shadow under the subject ---- */
  var tableShadow = K.contactShadow(T, g, 0, 0.0, 0, 1, 1, 0.5);

  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) {
      var k;
      if (calm) { paintClock(); return; }
      for (k = 0; k < RACKS.length; k++) RACKS[k](t + k * 0.7);
      paintClock();
      var on = (Math.floor(t / 0.8) % 2) === 0;
      if (on !== scrA.on) { scrA.on = on; drawEditor(scrA.x, 1024, 512, edA, on); scrA.t.needsUpdate = true; }
    }
  };
};
})();
