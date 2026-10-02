/* Visual Learner environments.
 * Procedural 3D backdrops for topic pages, built from code only (no images, no downloads).
 *
 *   var env = VLEnv.lab(THREE);          // returns { group, update(t, dt) }
 *   scene.add(env.group);
 *   env.group.position.y = floorY;       // local y = 0 is the floor / bench top
 *   env.update(time, dt);                // each frame
 *
 * Available: lab (biology), studio (neutral default).
 * Topics do not pick one directly: they call VLEnv.forCategory(category, THREE), or let VLStage do it.
 * The floor is a matte dark bench top (no reflection).
 */
(function () {
'use strict';

function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function canvasTex(T, w, h, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  var t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter; return t;
}
function glowTex(T) {
  return canvasTex(T, 128, 128, function (x, w, h) {
    var g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}
function hdr(T, hex, m) { return new T.Color(hex).multiplyScalar(m); }

function metal(T, color) { return new T.MeshStandardMaterial({ color: color || '#18233a', roughness: 0.5, metalness: 0.55, envMapIntensity: 0.45 }); }

function lathe(T, prof, segs) { return new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[0], p[1]); }), segs || 28); }

/* glass vessel: translucent shell + crisp edge lines + optional liquid */
function vessel(T, shellProf, liquidProf, liquidHex) {
  var g = new T.Group(), geo = lathe(T, shellProf);
  g.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: '#8fe3f5', transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0, side: T.DoubleSide, depthWrite: false })));
  g.add(new T.LineSegments(new T.EdgesGeometry(geo, 25), new T.LineBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.55 })));
  if (liquidProf) g.add(new T.Mesh(lathe(T, liquidProf), new T.MeshBasicMaterial({ color: hdr(T, liquidHex, 0.8), transparent: true, opacity: 0.75 })));
  return g;
}

/* matte dark bench top: no mirror, so nothing is duplicated under the scene */
function benchFloor(T, g, w, d) {
  var tex = canvasTex(T, 256, 256, function (x, cw, ch) {
    var gr = x.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2);
    gr.addColorStop(0, '#16233a'); gr.addColorStop(0.6, '#0e1829'); gr.addColorStop(1, '#0a1020');
    x.fillStyle = gr; x.fillRect(0, 0, cw, ch);
  });
  var slab = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: tex }));
  slab.rotation.x = -Math.PI / 2; slab.position.y = 0.02; g.add(slab);
}

/* tiled room floor far below the table */
function tileFloor(T, g, y) {
  var tex = canvasTex(T, 256, 256, function (x, w, h) {
    x.fillStyle = '#5b534c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(230,205,180,0.18)'; x.lineWidth = 2;
    x.strokeRect(1, 1, w - 2, h - 2);
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(18, 14);
  var f = new T.Mesh(new T.PlaneGeometry(110, 70), new T.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 }));
  f.rotation.x = -Math.PI / 2; f.position.y = y; g.add(f);
}

/* wooden lab table. Top surface sits at local y = 0 (just under, to avoid z-fighting with the light pool). */
function woodTable(T, g, floorY) {
  var tex = canvasTex(T, 512, 256, function (x, w, h) {
    x.fillStyle = '#85694b'; x.fillRect(0, 0, w, h);
    var r = mulberry(3), i;
    for (i = 0; i < 90; i++) { var y = r() * h, a = 0.05 + r() * 0.12; x.strokeStyle = r() < 0.5 ? 'rgba(70,45,20,' + a + ')' : 'rgba(255,230,190,' + a * 0.3 + ')'; x.lineWidth = 0.6 + r() * 1.6; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.7, y + (r() - 0.5) * 8, w, y + (r() - 0.5) * 6); x.stroke(); }
    var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
  });
  var W = 30, D = 12, cz = -1, top = -0.03, th = 0.7;
  var topMat = new T.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0 });
  var edgeMat = new T.MeshStandardMaterial({ color: '#6e5436', roughness: 0.6 });
  var slab = new T.Mesh(new T.BoxGeometry(W, th, D), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]); slab.position.set(0, top - th / 2, cz); g.add(slab);
  var steel = new T.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.45, metalness: 0.6 });
  var apron = new T.Mesh(new T.BoxGeometry(W - 2.8, 0.9, D - 2.8), steel); apron.position.set(0, top - th - 0.45, cz); g.add(apron);
  var legH = top - th - floorY;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
    var leg = new T.Mesh(new T.BoxGeometry(0.8, legH, 0.8), steel); leg.position.set(c[0] * (W / 2 - 1), floorY + legH / 2, cz + c[1] * (D / 2 - 1)); g.add(leg);
  });
  var rail = new T.Mesh(new T.BoxGeometry(W - 2.8, 0.35, 0.35), steel); rail.position.set(0, floorY + 3.5, cz + D / 2 - 1); g.add(rail);
  var rail2 = rail.clone(); rail2.position.z = cz - D / 2 + 1; g.add(rail2);
}

/* ---------- windows ---------- */

/* high-resolution dusk sky: gradient, low sun glow, soft clouds, a few stars */
function skyTexture(T, seed) {
  return canvasTex(T, 1024, 1024, function (x, w, h) {
    var r = mulberry(seed), i, g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#061028'); g.addColorStop(0.3, '#12305a'); g.addColorStop(0.55, '#3b7597'); g.addColorStop(0.69, '#d9965a'); g.addColorStop(0.76, '#f2b46c'); g.addColorStop(1, '#2d2733');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.6) + ')'; x.fillRect(r() * w, r() * h * 0.32, 1.5, 1.5); }
    var sg = x.createRadialGradient(w * 0.62, h * 0.76, 0, w * 0.62, h * 0.76, h * 0.42);
    sg.addColorStop(0, 'rgba(255,224,168,0.95)'); sg.addColorStop(0.25, 'rgba(255,176,96,0.42)'); sg.addColorStop(1, 'rgba(255,140,80,0)'); x.fillStyle = sg; x.fillRect(0, 0, w, h);
    for (i = 0; i < 46; i++) {
      var cy = h * (0.18 + r() * 0.56), cx = r() * w, rad = 40 + r() * 90, lit = cy > h * 0.5;
      x.save(); x.translate(cx, cy); x.scale(3 + r() * 4, 0.55); var rg = x.createRadialGradient(0, 0, 0, 0, 0, rad);
      rg.addColorStop(0, lit ? 'rgba(255,170,110,' + (0.07 + r() * 0.1) + ')' : 'rgba(150,175,215,' + (0.05 + r() * 0.07) + ')'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = rg; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.fill(); x.restore();
    }
  });
}
/* a city skyline strip with lit windows. far = hazy and pale, near = dark and crisp */
function skylineTexture(T, seed, far) {
  return canvasTex(T, 1024, 128, function (x, w, h) {
    var r = mulberry(seed), px = 0, bw, bh, i, j;
    while (px < w) {
      bw = 24 + r() * 56; bh = (far ? 22 : 30) + r() * (far ? 56 : 84);
      x.fillStyle = far ? '#3a5784' : '#0b1322'; x.fillRect(px, h - bh, bw - 2, bh);
      if (r() < 0.25) { x.fillRect(px + bw * 0.45, h - bh - 14, 2, 14); }
      var cw = far ? 5 : 6, chh = far ? 7 : 9;
      for (i = px + 4; i < px + bw - 6; i += cw + 2) for (j = h - bh + 5; j < h - 6; j += chh + 3) {
        if (r() < (far ? 0.14 : 0.2)) { x.fillStyle = r() < 0.7 ? 'rgba(255,205,130,' + (far ? 0.6 : 0.95) + ')' : 'rgba(160,228,255,' + (far ? 0.55 : 0.9) + ')'; x.fillRect(i, j, cw - 1, chh - 2); }
      }
      px += bw;
    }
    if (far) { var hz = x.createLinearGradient(0, 0, 0, h); hz.addColorStop(0, 'rgba(120,150,200,0)'); hz.addColorStop(1, 'rgba(236,170,110,0.35)'); x.globalCompositeOperation = 'source-atop'; x.fillStyle = hz; x.fillRect(0, 0, w, h); }
  });
}
function glassSheenTexture(T) {
  return canvasTex(T, 128, 128, function (x, w, h) {
    var g = x.createRadialGradient(w * 0.2, h * 0.12, 0, w * 0.2, h * 0.12, w * 0.9); g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(0.5, 'rgba(210,235,255,0.07)'); g.addColorStop(1, 'rgba(180,215,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}

/* a real window set into a wall: recessed reveal, steel frame with mullions, glass, sill, optional blinds and plant,
   and a sky plus two skyline layers behind the glass at different depths (they shift as the camera orbits). */
function buildWindow(T, wg, o, seed) {
  var w = o.w, h = o.h, g = new T.Group(), d = 0.9, i; g.position.set(o.x, o.y, 0); wg.add(g);
  var paint = '#9c9689', steel = '#2a2420', pale = '#c9bfa8';
  box(T, g, 0.14, h, d, paint, -w / 2 + 0.07, 0, -d / 2, 0.7, 0); box(T, g, 0.14, h, d, paint, w / 2 - 0.07, 0, -d / 2, 0.7, 0);
  box(T, g, w, 0.14, d, paint, 0, h / 2 - 0.07, -d / 2, 0.7, 0); box(T, g, w, 0.14, d, paint, 0, -h / 2 + 0.07, -d / 2, 0.7, 0);
  var iw = w - 0.28, ih = h - 0.28, fz = -d / 2;
  box(T, g, 0.5, ih, 0.5, steel, -w / 2 + 0.39, 0, fz, 0.4, 0.6); box(T, g, 0.5, ih, 0.5, steel, w / 2 - 0.39, 0, fz, 0.4, 0.6);
  box(T, g, iw, 0.5, 0.5, steel, 0, h / 2 - 0.39, fz, 0.4, 0.6); box(T, g, iw, 0.5, 0.5, steel, 0, -h / 2 + 0.39, fz, 0.4, 0.6);
  [-w / 6, w / 6].forEach(function (mx) { box(T, g, 0.24, ih - 0.3, 0.3, steel, mx, 0, fz, 0.4, 0.6); });
  box(T, g, iw - 0.3, 0.24, 0.3, steel, 0, h * 0.1, fz, 0.4, 0.6);
  var glass = new T.Mesh(new T.PlaneGeometry(iw - 0.4, ih - 0.4), new T.MeshBasicMaterial({ map: glassSheenTexture(T), transparent: true, depthWrite: false })); glass.position.z = fz + 0.06; g.add(glass);

  /* outdoors: sky far away, two skyline layers, none affected by room fog */
  var sk = new T.Mesh(new T.PlaneGeometry(w * 3.8, h * 3.8), new T.MeshBasicMaterial({ map: skyTexture(T, seed * 3 + 1), color: new T.Color(1.12, 1.1, 1.08), fog: false }));
  sk.position.set(0, -0.18 * h + 0.26 * h * 3.8, -34); g.add(sk);
  var far = new T.Mesh(new T.PlaneGeometry(w * 3.2, w * 3.2 / 8), new T.MeshBasicMaterial({ map: skylineTexture(T, seed * 5 + 2, true), transparent: true, fog: false }));
  far.position.set(0, -h / 2 + w * 3.2 / 16 + 0.2, -24); g.add(far);
  var near = new T.Mesh(new T.PlaneGeometry(w * 2.2, w * 2.2 / 8), new T.MeshBasicMaterial({ map: skylineTexture(T, seed * 7 + 3, false), transparent: true, fog: false }));
  near.position.set(0, -h / 2 + w * 2.2 / 16 - 0.6, -13); g.add(near);

  /* sill */
  box(T, g, w + 1.4, 0.3, 1.6, '#b8ae98', 0, -h / 2 - 0.15, 0.55, 0.5, 0.05);
  if (o.plant) {
    var px = w * 0.3; cyl(T, g, 0.5, 0.38, 0.75, '#8a5a3a', px, -h / 2 + 0.38, 0.6, 0.7, 0);
    for (i = 0; i < 7; i++) {
      var a = i / 7 * 6.283, leaf = new T.Mesh(new T.SphereGeometry(0.4, 8, 6), mat(T, i % 2 ? '#3f9a6a' : '#357f58', 0.6, 0));
      leaf.scale.set(0.35, 1.3, 0.2); leaf.position.set(px + Math.sin(a) * 0.35, -h / 2 + 1.25, 0.6 + Math.cos(a) * 0.35); leaf.rotation.z = -Math.sin(a) * 0.5; leaf.rotation.x = Math.cos(a) * 0.5; g.add(leaf);
    }
  }
  /* venetian blinds covering the top third */
  if (o.blinds) {
    var bwid = w - 0.9, n = 8, y0 = h / 2 - 0.9;
    box(T, g, bwid, 0.34, 0.5, '#8f866f', 0, h / 2 - 0.55, fz + 0.45, 0.5, 0.2);
    for (i = 0; i < n; i++) { var sl = box(T, g, bwid, 0.11, 0.56, pale, 0, y0 - i * 0.36, fz + 0.45, 0.55, 0.15); sl.rotation.x = -0.5; }
    var clen = n * 0.36 + 0.4;
    [-(bwid / 2 - 0.7), bwid / 2 - 0.7].forEach(function (cx) { cyl(T, g, 0.025, 0.025, clen, '#cdd6e4', cx, h / 2 - 0.7 - clen / 2, fz + 0.72, 0.8, 0); });
    box(T, g, bwid, 0.16, 0.5, '#8f866f', 0, y0 - n * 0.36 + 0.1, fz + 0.45, 0.5, 0.2);
  }
}

/* a wall made of panels around a window hole, so the opening really is open */
function rectGeo(T, W, H, x0, y0, x1, y1) {
  var g = new T.PlaneGeometry(x1 - x0, y1 - y0), pos = g.attributes.position, uv = g.attributes.uv, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (var i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + cx + W / 2) / W, (pos.getY(i) + cy + H / 2) / H);
  g.translate(cx, cy, 0); return g;
}
function makeWall(T, parent, o) {
  var wg = new T.Group(), W = o.w, H = o.h, m = new T.MeshBasicMaterial({ map: o.map });
  wg.position.set(o.x, o.y, o.z); wg.rotation.y = o.ry || 0; parent.add(wg);
  function add(x0, y0, x1, y1) { if (x1 - x0 > 0.01 && y1 - y0 > 0.01) wg.add(new T.Mesh(rectGeo(T, W, H, x0, y0, x1, y1), m)); }
  var holes = o.holes || [];
  if (!holes.length) add(-W / 2, -H / 2, W / 2, H / 2);
  holes.forEach(function (hl) {
    add(-W / 2, -H / 2, W / 2, hl.y - hl.h / 2); add(-W / 2, hl.y + hl.h / 2, W / 2, H / 2);
    add(-W / 2, hl.y - hl.h / 2, hl.x - hl.w / 2, hl.y + hl.h / 2); add(hl.x + hl.w / 2, hl.y - hl.h / 2, W / 2, hl.y + hl.h / 2);
    buildWindow(T, wg, hl, o.seed || 1);
  });
  return wg;
}

function mat(T, c, r, m) { return new T.MeshStandardMaterial({ color: c, roughness: r == null ? 0.6 : r, metalness: m == null ? 0.1 : m, envMapIntensity: 0.152 + (m == null ? 0.1 : m) * 0.4 }); }
function box(T, g, w, h, d, color, x, y, z, r, m) { var o = new T.Mesh(new T.BoxGeometry(w, h, d), mat(T, color, r, m)); o.position.set(x, y, z); g.add(o); return o; }
function cyl(T, g, rt, rb, h, color, x, y, z, r, m) { var o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, 18), mat(T, color, r, m)); o.position.set(x, y, z); g.add(o); return o; }
function plane(T, g, w, h, map, x, y, z, ry, color) {
  var o = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial(map ? { map: map } : { color: color })); o.position.set(x, y, z); o.rotation.y = ry || 0; g.add(o); return o;
}

function whiteboardTex(T) {
  return canvasTex(T, 512, 300, function (x, w, h) {
    x.fillStyle = '#e8eef6'; x.fillRect(0, 0, w, h); x.lineWidth = 3; x.lineCap = 'round';
    var i, t;
    x.strokeStyle = '#2f6fd0'; x.beginPath(); for (i = 0; i <= 120; i++) { t = i / 120; var X = 26 + t * 200, Y = 80 + Math.sin(t * 14) * 26; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); } x.stroke();
    x.strokeStyle = '#d0463f'; x.beginPath(); for (i = 0; i <= 120; i++) { t = i / 120; var X2 = 26 + t * 200, Y2 = 80 - Math.sin(t * 14) * 26; if (i) x.lineTo(X2, Y2); else x.moveTo(X2, Y2); } x.stroke();
    x.strokeStyle = 'rgba(40,50,80,0.5)'; x.lineWidth = 2; for (i = 0; i < 24; i++) { t = i / 24; x.beginPath(); x.moveTo(26 + t * 200, 80 + Math.sin(t * 14) * 26); x.lineTo(26 + t * 200, 80 - Math.sin(t * 14) * 26); x.stroke(); }
    x.fillStyle = '#1d2a44'; x.font = 'bold 30px sans-serif'; x.fillText('exome ~ 1.5 %', 270, 62);
    x.font = '24px sans-serif'; x.fillStyle = '#2f6fd0'; x.fillText('ref  C  ->  alt  T', 270, 108); x.fillStyle = '#d0463f'; x.fillText('0/1 = het', 270, 146);
    x.strokeStyle = '#1d2a44'; x.lineWidth = 3; x.beginPath(); x.moveTo(30, 190); x.lineTo(230, 190); x.lineTo(150, 250); x.lineTo(110, 250); x.closePath(); x.stroke();
    x.font = '20px sans-serif'; x.fillStyle = '#1d2a44'; x.fillText('25,000  ->  1', 262, 232); x.beginPath(); x.moveTo(30, 275); x.lineTo(470, 275); x.strokeStyle = 'rgba(29,42,68,0.25)'; x.stroke();
  });
}
function clockTex(T) {
  return canvasTex(T, 256, 256, function (x, w, h) {
    x.fillStyle = '#e6edf6'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.strokeStyle = '#1d2a44'; x.lineWidth = 4;
    for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; x.beginPath(); x.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); x.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); x.stroke(); }
    x.lineWidth = 7; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 52 * Math.sin(2.4), 128 - 52 * Math.cos(2.4)); x.stroke();
    x.lineWidth = 4; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 88 * Math.sin(0.3), 128 - 88 * Math.cos(0.3)); x.stroke();
  });
}
function posterHelixTex(T) {
  return canvasTex(T, 300, 420, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#12254a'); g.addColorStop(1, '#070f20'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (var i = 0; i <= 140; i++) {
      var t = i / 140, Y = 30 + t * 300, a = t * Math.PI * 6, X1 = 150 + Math.sin(a) * 70, X2 = 150 - Math.sin(a) * 70;
      if (i % 4 === 0) { x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X1, Y); x.lineTo(X2, Y); x.stroke(); }
      x.fillStyle = '#7fe3ff'; x.beginPath(); x.arc(X1, Y, 4.5, 0, 7); x.fill(); x.fillStyle = '#ff6b86'; x.beginPath(); x.arc(X2, Y, 4.5, 0, 7); x.fill();
    }
    x.fillStyle = '#e6f1f2'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('DNA', 150, 384); x.font = '16px sans-serif'; x.fillStyle = '#9ea8c2'; x.fillText('3.1 billion base pairs', 150, 408);
  });
}
function posterDonutTex(T) {
  return canvasTex(T, 300, 420, function (x, w, h) {
    x.fillStyle = '#e9eef5'; x.fillRect(0, 0, w, h); x.lineWidth = 34;
    x.strokeStyle = '#c5d0e0'; x.beginPath(); x.arc(150, 170, 80, 0, 7); x.stroke();
    x.strokeStyle = '#2a8fb0'; x.beginPath(); x.arc(150, 170, 80, -Math.PI / 2, -Math.PI / 2 + 0.55); x.stroke();
    x.fillStyle = '#1d2a44'; x.textAlign = 'center'; x.font = 'bold 32px sans-serif'; x.fillText('1.5 %', 150, 182);
    x.font = 'bold 26px sans-serif'; x.fillText('The exome', 150, 316); x.font = '17px sans-serif'; x.fillStyle = '#51607c'; x.fillText('the part that codes', 150, 345); x.fillText('for protein', 150, 368);
  });
}

/* everything that makes the lab feel lived in: walls, ceiling, furniture, equipment */
function fillRoom(T, g, FLOOR, TOP) {
  var rnd = mulberry(77), i, j, CEIL = 24, XL = -34, XR = 34, ZB = -19, ZF = 36, ZC = (ZF + ZB) / 2, LEN = ZF - ZB, H = CEIL - FLOOR, YC = (CEIL + FLOOR) / 2;
  var steel = '#7f93ad', pal = ['#3a8fa8', '#c48a3a', '#b4476a', '#4aa58a', '#6a7fd0', '#8693aa', '#8d6a4a'];
  var wallTex = canvasTex(T, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4d625e'); gr.addColorStop(1, '#6b8076'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });

  /* shell: side walls, ceiling, wainscot, baseboards */
  plane(T, g, LEN, H, wallTex, XL, YC, ZC, Math.PI / 2);
  makeWall(T, g, { w: LEN, h: H, x: XR, y: YC, z: ZC, ry: -Math.PI / 2, map: wallTex, seed: 2, holes: [{ x: -4 - ZC, y: 9 - YC, w: 15, h: 8.5 }] });
  var ceil = plane(T, g, XR - XL, LEN, null, 0, CEIL, ZC, 0, 0x2a2f33); ceil.rotation.x = Math.PI / 2;
  plane(T, g, LEN, 8, null, XL + 0.05, FLOOR + 4, ZC, Math.PI / 2, 0x2f4a44);
  plane(T, g, LEN, 8, null, XR - 0.05, FLOOR + 4, ZC, -Math.PI / 2, 0x2f4a44);
  box(T, g, 0.3, 0.9, LEN, '#1c2422', XL + 0.15, FLOOR + 0.45, ZC); box(T, g, 0.3, 0.9, LEN, '#1c2422', XR - 0.15, FLOOR + 0.45, ZC);
  box(T, g, 68, 0.9, 0.3, '#1c2422', 0, FLOOR + 0.45, ZB + 0.15);

  /* rug under the table */
  plane(T, g, 38, 22, null, 0, FLOOR + 0.03, -1, 0, 0x7a3a3f).rotation.x = -Math.PI / 2;
  plane(T, g, 35, 19, null, 0, FLOOR + 0.04, -1, 0, 0x64303a).rotation.x = -Math.PI / 2;

  /* counter: worktop, cabinet doors, handles */
  box(T, g, 68.4, 0.4, 5.4, '#2b2e33', 0, 1.4, -12.5, 0.3, 0.2);
  for (i = 0; i < 12; i++) {
    var dx = -31 + i * 5.6;
    box(T, g, 5.2, 11, 0.2, i % 2 ? '#7b6f58' : '#857a62', dx, -6.7, -9.92, 0.5, 0.2);
    box(T, g, 0.18, 1.7, 0.18, steel, dx + 2, -2.6, -9.76, 0.3, 0.8);
  }

  /* sink */
  var sx = -23;
  box(T, g, 4.8, 0.06, 3.3, '#060c18', sx, TOP + 0.03, -12.8);
  cyl(T, g, 0.14, 0.14, 2.8, steel, sx, TOP + 1.4, -14.3, 0.25, 0.9);
  var sp = cyl(T, g, 0.13, 0.13, 1.7, steel, sx, TOP + 2.8, -13.5, 0.25, 0.9); sp.rotation.x = Math.PI / 2;
  cyl(T, g, 0.13, 0.13, 0.5, steel, sx, TOP + 2.55, -12.7, 0.25, 0.9);
  cyl(T, g, 0.2, 0.2, 0.35, '#c03f3f', sx - 0.8, TOP + 0.2, -14.3); cyl(T, g, 0.2, 0.2, 0.35, '#3f7fc0', sx + 0.8, TOP + 0.2, -14.3);

  /* microscope */
  var mic = makeMicroscope(T); mic.position.set(4.5, TOP, -11.7); mic.rotation.y = -0.2; g.add(mic); contactShadow(T, g, 4.5, TOP + 0.02, -11.7, 3.6, 4.0, 0.55);

  /* back wall: whiteboard, clock, wall cabinets */
  box(T, g, 10.4, 6.4, 0.2, '#a9a9a6', -28.5, 10, -18.9, 0.4, 0.5);
  plane(T, g, 10, 6, whiteboardTex(T), -28.5, 10, -18.78);
  box(T, g, 8, 0.2, 0.5, '#a9a9a6', -28.5, 6.7, -18.6, 0.4, 0.5);
  [['#d0463f', -31], ['#2f6fd0', -30.4], ['#2a2f3a', -29.8]].forEach(function (mk) { var c = cyl(T, g, 0.1, 0.1, 0.9, mk[0], mk[1] + 0, 6.9, -18.5); c.rotation.z = Math.PI / 2; });
  /* wall clock: solid body, a rim at its front edge, and the face set just in front of the body (nothing shares a plane, so no angle shows notches) */
  var CX = -12, CY = 16.5, body = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 0.22, 48), mat(T, '#2a2622', 0.5, 0.2)); body.rotation.x = Math.PI / 2; body.position.set(CX, CY, -18.86); g.add(body);
  var rim = new T.Mesh(new T.TorusGeometry(1.34, 0.1, 12, 56), mat(T, '#3a322b', 0.45, 0.25)); rim.position.set(CX, CY, -18.75); g.add(rim);
  var clk = plane(T, g, 2.5, 2.5, clockTex(T), CX, CY, -18.738); clk.material.transparent = true;
  box(T, g, 10, 7.5, 2.6, '#8a7f66', 28, 10, -17.7, 0.5, 0.15);
  box(T, g, 0.12, 7.3, 0.1, '#3a342a', 28, 10, -16.35);
  box(T, g, 0.15, 1.6, 0.15, steel, 27.3, 8.4, -16.3, 0.3, 0.8); box(T, g, 0.15, 1.6, 0.15, steel, 28.7, 8.4, -16.3, 0.3, 0.8);

  /* left wall: tall shelving, posters, door */
  var sz = 3, labTex = []; for (j = 0; j < 7; j++) labTex.push(paperLabel(T, j + 3, pal[j % pal.length]));
  [-6, 6].forEach(function (z) { box(T, g, 0.3, 28, 0.3, '#5d6268', -31.2, FLOOR + 14, sz + z, 0.4, 0.6); box(T, g, 0.3, 28, 0.3, '#5d6268', -33.7, FLOOR + 14, sz + z, 0.4, 0.6); });
  [-10, -4, 2, 8, 14].forEach(function (y) {
    box(T, g, 2.8, 0.25, 12.4, '#4c5157', -32.5, y, sz, 0.45, 0.5);
    var zc = -5.5;
    while (zc < 3.6) {
      var wd = 1 + rnd() * 1.3, ht = 0.9 + rnd() * 1.5, col = pal[Math.floor(rnd() * pal.length)];
      if (rnd() < 0.35) cyl(T, g, wd * 0.35, wd * 0.35, ht + 0.4, col, -32.5 + (rnd() - 0.5) * 0.4, y + 0.12 + (ht + 0.4) / 2, sz + zc, 0.35, 0.1);
      else {
        var bw2 = 1.4 + rnd() * 0.8, bx = -32.5 + (rnd() - 0.5) * 0.4, by = y + 0.12 + ht / 2, bz = sz + zc;
        box(T, g, bw2, ht, wd, col, bx, by, bz, 0.55, 0.05);
        var lbl = new T.Mesh(new T.PlaneGeometry(wd * 0.85, ht * 0.55), new T.MeshStandardMaterial({ map: labTex[Math.floor(rnd() * 7)], color: 0x8c8c8c, roughness: 0.9 })); lbl.position.set(bx + bw2 / 2 + 0.02, by, bz); lbl.rotation.y = Math.PI / 2; g.add(lbl);
      }
      zc += wd + 0.25;
    }
  });
  [[14, posterHelixTex], [20.5, posterDonutTex]].forEach(function (pz) {
    box(T, g, 0.16, 8.2, 6.2, '#2a2622', XL + 0.12, 5, pz[0], 0.5, 0.2);
    plane(T, g, 5.6, 7.6, pz[1](T), XL + 0.22, 5, pz[0], Math.PI / 2);
  });
  box(T, g, 0.3, 17, 5.2, '#7a5a42', XL + 0.15, FLOOR + 8.5, 27, 0.5, 0.2);
  box(T, g, 0.12, 5, 2.2, '#9fd0e8', XL + 0.35, FLOOR + 11, 27, 0.2, 0.1).material.transparent = true;
  cyl(T, g, 0.15, 0.15, 1.2, steel, XL + 0.55, FLOOR + 8, 25.2, 0.3, 0.9).rotation.x = Math.PI / 2;

  /* right wall: second window, fridge, coat rail */
  box(T, g, 4.2, 17, 3.6, '#a9bdb4', 31.6, FLOOR + 8.5, 14, 0.5, 0.2);
  box(T, g, 0.1, 0.12, 3.4, '#27364f', 29.45, FLOOR + 11.4, 14);
  box(T, g, 0.25, 6, 0.25, steel, 29.4, FLOOR + 13.5, 12.6, 0.3, 0.8); box(T, g, 0.25, 4, 0.25, steel, 29.4, FLOOR + 6.5, 12.6, 0.3, 0.8);
  var disp = new T.Mesh(new T.PlaneGeometry(1.2, 0.5), new T.MeshBasicMaterial({ color: new T.Color('#7fe3ff').multiplyScalar(1.4) })); disp.position.set(29.45, FLOOR + 15, 15); disp.rotation.y = -Math.PI / 2; g.add(disp);
  var rail = cyl(T, g, 0.12, 0.12, 8, steel, 33.3, 7, 24, 0.3, 0.9); rail.rotation.x = Math.PI / 2;
  [21, 23.6, 26.2].forEach(function (z, k) {
    box(T, g, 0.8, 6.4, 2.3, k === 1 ? '#c9d4e4' : '#dfe6f0', 32.8, 3.6, z, 0.9, 0);
    box(T, g, 0.7, 2.4, 0.5, k === 1 ? '#c9d4e4' : '#dfe6f0', 32.8, 1.0, z - 1.25, 0.9, 0);
    box(T, g, 0.7, 2.4, 0.5, k === 1 ? '#c9d4e4' : '#dfe6f0', 32.8, 1.0, z + 1.25, 0.9, 0);
  });

  /* floor: stools, bin, boxes, plant */
  [[-19, 1.5, 0.3], [19.5, 2.5, -0.5]].forEach(function (st) { makeStool(T, g, st[0], st[1], FLOOR, st[2]); });
  cyl(T, g, 1.6, 1.4, 4.6, '#b04848', -29.5, FLOOR + 2.3, -8, 0.5, 0.1); cyl(T, g, 1.66, 1.66, 0.7, '#f2c14e', -29.5, FLOOR + 3.2, -8, 0.5, 0.1); cyl(T, g, 1.7, 1.7, 0.25, '#8a3333', -29.5, FLOOR + 4.7, -8, 0.5, 0.1);
  box(T, g, 3.4, 2.8, 3.0, '#9a7b57', 25.8, FLOOR + 1.4, -5.8, 0.9, 0); box(T, g, 3.0, 2.4, 2.8, '#8d6f4d', 22.2, FLOOR + 1.2, -5.8, 0.9, 0); box(T, g, 2.8, 2.2, 2.6, '#a68660', 25.6, FLOOR + 3.9, -5.8, 0.9, 0);
  cyl(T, g, 1.5, 1.1, 2.4, '#8a5a3a', 30.5, FLOOR + 1.2, -7.5, 0.7, 0);
  for (i = 0; i < 10; i++) {
    var leaf = new T.Mesh(new T.SphereGeometry(0.55, 10, 8), mat(T, i % 3 ? '#3f9a6a' : '#357f58', 0.6, 0)); var a = i / 10 * 6.283 + rnd(), tilt = 0.35 + rnd() * 0.5;
    leaf.scale.set(0.45, 2.2 + rnd() * 1.2, 0.18); leaf.position.set(30.5 + Math.sin(a) * 0.9, FLOOR + 4.6 + rnd() * 0.8, -7.5 + Math.cos(a) * 0.9);
    leaf.rotation.z = -Math.sin(a) * tilt; leaf.rotation.x = Math.cos(a) * tilt; g.add(leaf);
  }

  /* on the table: notebook, pencil, mug */
  var nb = new T.Group(); box(T, nb, 2.6, 0.18, 3.4, '#b5473a', 0, 0.09, 0, 0.6, 0); box(T, nb, 2.4, 0.12, 3.2, '#8a8677', 0.05, 0.2, 0, 0.95, 0); nb.position.set(12.8, 0, -3.6); nb.rotation.y = 0.35; g.add(nb);
  var pc = cyl(T, g, 0.06, 0.06, 2.4, '#c9a43a', 13.2, 0.32, -1.9, 0.7, 0); pc.rotation.z = Math.PI / 2; pc.rotation.y = 0.5;
  var mg = mugProp(T); mg.position.set(-12.6, -0.03, -4.2); mg.rotation.y = 0.6; g.add(mg); contactShadow(T, g, -12.6, 0.0, -4.2, 2.2, 2.2, 0.5);
}

/* ---------- realistic props ---------- */
function rrShape(T, w, h, r) {
  var s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/* box with rounded corners and bevelled edges, centred on the origin */
function roundedBox(T, w, h, d, r, bevel, material) {
  var geo = new T.ExtrudeGeometry(rrShape(T, w, h, r), { depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  geo.translate(0, 0, -(d - 2 * bevel) / 2); return new T.Mesh(geo, material);
}
function radiusAt(prof, y) {
  for (var i = 1; i < prof.length; i++) if (y <= prof[i][1] || i === prof.length - 1) { var a = prof[i - 1], b = prof[i], t = b[1] === a[1] ? 0 : Math.min(1, Math.max(0, (y - a[1]) / (b[1] - a[1]))); return a[0] + (b[0] - a[0]) * t; }
  return prof[prof.length - 1][0];
}
function glassMat(T, op) { return new T.MeshStandardMaterial({ color: 0xd9f0f8, roughness: 0.14, metalness: 0, transparent: true, opacity: op, envMapIntensity: 0.67, depthWrite: false, side: T.DoubleSide }); }
function tickTexture(T, n, major) {
  return canvasTex(T, 256, 512, function (x, w, h) {
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.fillStyle = 'rgba(255,255,255,0.95)'; x.font = '22px sans-serif';
    for (var i = 0; i <= n; i++) { var y = h - 10 - i * (h - 20) / n, mj = i % major === 0; x.lineWidth = 2; x.beginPath(); x.moveTo(8, y); x.lineTo(mj ? 56 : 32, y); x.stroke(); if (mj) x.fillText(String(i * (100 / n)), 62, y + 7); }
  });
}
function paperLabel(T, seed, accent) {
  return canvasTex(T, 256, 128, function (x, w, h) {
    var r = mulberry(seed * 13 + 5), i;
    x.fillStyle = '#e9edf3'; x.fillRect(0, 0, w, h); x.fillStyle = accent; x.fillRect(0, 0, w, 26);
    x.fillStyle = '#26324a'; x.font = 'bold 22px sans-serif'; x.fillText(['NaCl 0.9%', 'Tris-HCl', 'Ethanol', 'PBS 1x', 'Agarose', 'Buffer A', 'dNTP mix'][seed % 7], 14, 56);
    x.font = '14px sans-serif'; x.fillStyle = '#4a5873'; x.fillText('Lot ' + (1000 + Math.floor(r() * 8999)) + '  store 4 C', 14, 78);
    for (i = 0; i < 3; i++) { x.fillStyle = 'rgba(38,50,74,0.25)'; x.fillRect(14, 92 + i * 9, 120 + r() * 100, 3); }
    if (seed % 3 === 0) { x.save(); x.translate(218, 92); x.rotate(Math.PI / 4); x.fillStyle = '#d9a026'; x.fillRect(-14, -14, 28, 28); x.restore(); }
  });
}
function contactShadow(T, g, x, y, z, w, d, op) {
  var tex = canvasTex(T, 64, 64, function (c, cw, ch) { var gr = c.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw / 2); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  var m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: op == null ? 0.7 : op, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m;
}

/* glass vessel with real wall thickness, a rim, meniscus and optional graduation marks */
function glassVessel(T, prof, o) {
  o = o || {}; var g = new T.Group(), th = o.thick || 0.07, outer = lathe(T, prof, 48), k;
  g.add(new T.Mesh(outer, glassMat(T, 0.16)));
  var inner = prof.map(function (p) { return [Math.max(0, p[0] - th), Math.max(p[1], th)]; }); inner[0][0] = 0;
  g.add(new T.Mesh(lathe(T, inner, 48), glassMat(T, 0.07)));
  var last = prof[prof.length - 1], rim = new T.Mesh(new T.TorusGeometry(last[0] - th * 0.5, th * 0.8, 8, 48), glassMat(T, 0.34)); rim.rotation.x = Math.PI / 2; rim.position.y = last[1]; g.add(rim);
  if (o.liquid) {
    var f = o.liquid.fill, y0 = th + 0.1, inset = 0.035, lp = [[0, y0], [radiusAt(inner, y0) - inset, y0]];
    for (k = 1; k < inner.length; k++) if (inner[k][1] > y0 && inner[k][1] < f) lp.push([inner[k][0] - inset, inner[k][1]]);
    var rf = radiusAt(inner, f) - inset; lp.push([rf, f], [0, f]);
    var lc = new T.Color(o.liquid.color);
    g.add(new T.Mesh(lathe(T, lp, 48), new T.MeshStandardMaterial({ color: lc, emissive: lc.clone().multiplyScalar(0.09), roughness: 0.14, metalness: 0, envMapIntensity: 0.36, side: T.DoubleSide })));
    var men = new T.Mesh(new T.TorusGeometry(rf, 0.04, 6, 48), new T.MeshStandardMaterial({ color: lc.clone().multiplyScalar(1.3), roughness: 0.1, transparent: true, opacity: 0.9, emissive: lc.clone().multiplyScalar(0.25) })); men.rotation.x = Math.PI / 2; men.position.y = f; g.add(men);
  }
  if (o.ticks) {
    var tk = o.ticks, shell = new T.Mesh(new T.CylinderGeometry(tk.r, tk.r, tk.y1 - tk.y0, 48, 1, true), new T.MeshBasicMaterial({ map: tickTexture(T, tk.n, tk.major), transparent: true, depthWrite: false, opacity: 0.85 }));
    shell.position.y = (tk.y0 + tk.y1) / 2; shell.rotation.y = o.tickRot == null ? -0.6 : o.tickRot; g.add(shell);
  }
  return g;
}

function bottle(T, h, glassHex, liquidHex, seed) {
  var g = new T.Group(), r = 0.48, prof = [[0, 0], [r * 0.9, 0], [r, 0.1], [r, h - 0.85], [r * 0.82, h - 0.5], [0.22, h - 0.28], [0.22, h]];
  g.add(new T.Mesh(lathe(T, prof, 32), new T.MeshStandardMaterial({ color: glassHex, roughness: 0.16, metalness: 0, transparent: true, opacity: 0.8, envMapIntensity: 0.59, side: T.DoubleSide, depthWrite: false })));
  var lc = new T.Color(liquidHex);
  g.add(new T.Mesh(lathe(T, [[0, 0.06], [r * 0.86, 0.06], [r * 0.94, 0.14], [r * 0.94, h * 0.55], [0, h * 0.55]], 32), new T.MeshStandardMaterial({ color: lc, emissive: lc.clone().multiplyScalar(0.08), roughness: 0.22, side: T.DoubleSide })));
  var lab = new T.Mesh(new T.CylinderGeometry(r + 0.014, r + 0.014, h * 0.36, 28, 1, true, -1.9, 3.8), new T.MeshStandardMaterial({ map: paperLabel(T, seed, ['#2f7fa6', '#c96a2a', '#3f9a6a', '#8a4fb0', '#c03f58'][seed % 5]), color: 0x8c8c8c, roughness: 0.9, side: T.DoubleSide }));
  lab.position.y = h * 0.38; g.add(lab);
  var cap = new T.Mesh(new T.CylinderGeometry(0.27, 0.27, 0.42, 22), mat(T, '#10151f', 0.5, 0.15)); cap.position.y = h + 0.14; g.add(cap);
  var ridge = new T.Mesh(new T.TorusGeometry(0.27, 0.025, 6, 22), mat(T, '#1b2233', 0.5, 0.2)); ridge.rotation.x = Math.PI / 2; ridge.position.y = h - 0.03; g.add(ridge);
  return g;
}

function mugProp(T) {
  var g = new T.Group(), cm = new T.MeshStandardMaterial({ color: '#b5654a', roughness: 0.3, metalness: 0, envMapIntensity: 0.23, side: T.DoubleSide });
  g.add(new T.Mesh(lathe(T, [[0, 0], [0.5, 0], [0.56, 0.06], [0.56, 1.12], [0.51, 1.14], [0.49, 1.1], [0.49, 0.14], [0, 0.14]], 40), cm));
  var cof = new T.Mesh(new T.CircleGeometry(0.49, 32), new T.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.15, envMapIntensity: 0.5 })); cof.rotation.x = -Math.PI / 2; cof.position.y = 0.95; g.add(cof);
  var hd = new T.Mesh(new T.TorusGeometry(0.3, 0.07, 10, 20, Math.PI * 1.15), cm); hd.position.set(0.56, 0.62, 0); hd.rotation.z = -Math.PI * 0.58; g.add(hd);
  return g;
}

function tubeRack(T) {
  var g = new T.Group(), plastic = new T.MeshStandardMaterial({ color: '#3f8a6a', roughness: 0.35, metalness: 0.05, envMapIntensity: 0.41 }), i;
  function plate(y) {
    var sh = rrShape(T, 4.3, 0.95, 0.12); for (var k = 0; k < 6; k++) { var hole = new T.Path(); hole.absarc(-1.5 + k * 0.6, 0, 0.23, 0, Math.PI * 2, true); sh.holes.push(hole); }
    var m = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false, curveSegments: 14 }), plastic); m.rotation.x = -Math.PI / 2; m.position.y = y; g.add(m);
  }
  plate(1.25); plate(0.45);
  [-2.05, 2.05].forEach(function (x) { var w = new T.Mesh(new T.BoxGeometry(0.12, 1.4, 0.95), plastic); w.position.set(x, 0.7, 0); g.add(w); });
  var liq = ['#3fb6d6', '#e0556f', '#e0a43a', '#5fcf9f', '#3fb6d6', '#e0556f'], cap = ['#e0556f', null, null, '#3f7fd0', null, '#e0a43a'];
  var tp = [[0, 0]]; for (i = 1; i <= 6; i++) { var a = i / 6 * Math.PI / 2; tp.push([0.2 * Math.sin(a), 0.2 - 0.2 * Math.cos(a)]); } tp.push([0.2, 2.1], [0.235, 2.14], [0.245, 2.2]);
  for (i = 0; i < 6; i++) {
    var tube = glassVessel(T, tp, { thick: 0.03, liquid: { fill: 0.7 + (i % 3) * 0.35, color: liq[i] } }); tube.position.set(-1.5 + i * 0.6, 0.56, 0); g.add(tube);
    if (cap[i]) { var c = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.34, 18), new T.MeshStandardMaterial({ color: cap[i], roughness: 0.4, envMapIntensity: 0.41 })); c.position.set(tube.position.x, 0.56 + 2.3, 0); g.add(c); }
  }
  return g;
}

function pipetteStand(T) {
  var g = new T.Group(), plastic = mat(T, '#b8b4a6', 0.35, 0.05), chrome = new T.MeshStandardMaterial({ color: '#c9d3e0', roughness: 0.5, metalness: 0.75, envMapIntensity: 0.52 });
  var base = roundedBox(T, 3.0, 1.2, 0.22, 0.25, 0.05, plastic); base.rotation.x = -Math.PI / 2; base.position.y = 0.11; g.add(base);
  var post = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 4.4, 14), chrome); post.position.set(-1.2, 2.3, 0); g.add(post);
  var arm = roundedBox(T, 2.7, 0.5, 0.25, 0.12, 0.04, plastic); arm.position.set(0.1, 4.0, 0); g.add(arm);
  [['#e0556f', 0], ['#3fb6d6', 1], ['#e0a43a', 2]].forEach(function (c) {
    var pg = new T.Group(), body = mat(T, '#1c2232', 0.42, 0.1);
    pg.add(new T.Mesh(lathe(T, [[0, 0], [0.025, 0], [0.04, 0.06], [0.09, 0.95], [0.1, 1.05]], 14), new T.MeshStandardMaterial({ color: '#e4f2f8', roughness: 0.25, transparent: true, opacity: 0.6, envMapIntensity: 0.52, side: T.DoubleSide })));
    var ej = new T.Mesh(lathe(T, [[0.1, 1.0], [0.11, 1.1], [0.15, 2.2], [0.17, 2.3]], 16), mat(T, '#cfd6e2', 0.4, 0.1)); pg.add(ej);
    pg.add(new T.Mesh(lathe(T, [[0.14, 2.2], [0.19, 2.6], [0.22, 3.4], [0.2, 4.4], [0.12, 4.75], [0, 4.75]], 22), body));
    var stripe = new T.Mesh(new T.CylinderGeometry(0.221, 0.221, 0.28, 22), new T.MeshStandardMaterial({ color: c[0], roughness: 0.35, envMapIntensity: 0.41 })); stripe.position.y = 3.35; pg.add(stripe);
    var plunger = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.6, 12), chrome); plunger.position.y = 5.05; pg.add(plunger);
    var btn = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.36, 18), new T.MeshStandardMaterial({ color: c[0], roughness: 0.3, envMapIntensity: 0.45 })); btn.position.y = 5.5; pg.add(btn);
    pg.scale.setScalar(0.66); pg.position.set(-0.65 + c[1] * 0.78, 0.22, 0.05); pg.rotation.z = 0.05 + c[1] * 0.04; g.add(pg);
  });
  return g;
}

function makeSequencer(T) {
  var g = new T.Group(), shell = new T.MeshStandardMaterial({ color: '#8d8a80', roughness: 0.4, metalness: 0.2, envMapIntensity: 0.45 }), dark = mat(T, '#0d121c', 0.35, 0.3), leds = [], i;
  var body = roundedBox(T, 3.9, 2.3, 2.7, 0.3, 0.08, shell); body.position.y = 1.2; g.add(body);
  for (i = 0; i < 7; i++) { var v = new T.Mesh(new T.BoxGeometry(2.8, 0.03, 0.09), dark); v.position.set(-0.2, 2.37, -0.5 + i * 0.24); g.add(v); }
  var bez = roundedBox(T, 3.3, 1.0, 0.12, 0.14, 0.03, dark); bez.position.set(0, 1.62, 1.4); g.add(bez);
  var cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; var cx = cv.getContext('2d'), ctex = new T.CanvasTexture(cv); ctex.minFilter = T.LinearFilter;
  var scr = new T.Mesh(new T.PlaneGeometry(2.9, 0.72), new T.MeshBasicMaterial({ map: ctex, color: new T.Color(1.4, 1.4, 1.4) })); scr.position.set(0, 1.62, 1.47); g.add(scr);
  var door = roundedBox(T, 3.3, 0.72, 0.12, 0.12, 0.03, new T.MeshStandardMaterial({ color: '#1a2336', roughness: 0.3, metalness: 0.4, envMapIntensity: 0.48 })); door.position.set(0, 0.62, 1.4); g.add(door);
  var glow = new T.Mesh(new T.PlaneGeometry(3.0, 0.035), new T.MeshBasicMaterial({ color: new T.Color('#7fe3ff').multiplyScalar(1.8) })); glow.position.set(0, 0.34, 1.47); g.add(glow);
  var handle = new T.Mesh(new T.BoxGeometry(1.0, 0.08, 0.06), new T.MeshStandardMaterial({ color: '#c9d3e0', roughness: 0.5, metalness: 0.75, envMapIntensity: 0.52 })); handle.position.set(0, 0.86, 1.47); g.add(handle);
  [['#7be58a', 1.35], ['#ffb454', 1.2], ['#7fe3ff', 1.05]].forEach(function (l, k) { var d = new T.Mesh(new T.CircleGeometry(0.06, 14), new T.MeshBasicMaterial({ color: new T.Color(l[0]).multiplyScalar(2) })); d.position.set(1.4 - k * 0.0, 0.62 - 0.0, 1.47); d.position.set(1.3, 0.78 - k * 0.15, 1.47); g.add(d); leds.push(d); });
  var accent = new T.Mesh(new T.BoxGeometry(0.9, 0.06, 0.02), new T.MeshBasicMaterial({ color: new T.Color('#7fe3ff').multiplyScalar(1.2) })); accent.position.set(-1.3, 2.0, 1.47); g.add(accent);
  [[-1.5, -0.9], [1.5, -0.9], [-1.5, 0.9], [1.5, 0.9]].forEach(function (f) { var ft = new T.Mesh(new T.CylinderGeometry(0.13, 0.15, 0.1, 12), mat(T, '#0b0f18', 0.8, 0)); ft.position.set(f[0], 0.04, f[1]); g.add(ft); });
  var cols = ['#58c48a', '#5b9cf0', '#f0b24a', '#e8685d'];
  function draw(t) {
    cx.fillStyle = '#04121c'; cx.fillRect(0, 0, 128, 32);
    for (var k = 0; k < 32; k++) { var hs = Math.abs(Math.sin((Math.floor(t * 6) + k) * 12.9898) * 43758.5453) % 1; cx.fillStyle = cols[Math.floor(hs * 4) % 4]; var hh = 5 + hs * 22; cx.fillRect(k * 4, 32 - hh, 3, hh); }
    ctex.needsUpdate = true;
  }
  draw(0); var acc = 0;
  return { group: g, leds: leds, tick: function (t, dt) { acc += dt || 0; if (acc > 0.1) { acc = 0; draw(t); } } };
}

function makeCentrifuge(T) {
  var g = new T.Group(), enamel = new T.MeshStandardMaterial({ color: '#8d8a80', roughness: 0.4, metalness: 0.2, envMapIntensity: 0.45, side: T.DoubleSide }), i;
  g.add(new T.Mesh(lathe(T, [[0, 0], [1.6, 0], [1.68, 0.1], [1.68, 0.95], [1.5, 1.12], [1.38, 1.12], [1.38, 0.92], [0, 0.92]], 48), enamel));
  var rotor = new T.Group(); rotor.position.y = 1.0;
  var disc = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 0.22, 36), new T.MeshStandardMaterial({ color: '#b9c3d3', roughness: 0.25, metalness: 1, envMapIntensity: 0.52 })); rotor.add(disc);
  for (i = 0; i < 8; i++) { var a = i / 8 * 6.283, hole = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.24, 12), mat(T, '#05080f', 0.8, 0)); hole.position.set(Math.cos(a) * 0.85, 0.01, Math.sin(a) * 0.85); rotor.add(hole); }
  var nut = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.3, 6), new T.MeshStandardMaterial({ color: '#d9e1ec', roughness: 0.5, metalness: 0.75, envMapIntensity: 0.53 })); nut.position.y = 0.1; rotor.add(nut); g.add(rotor);
  var lid = new T.Mesh(new T.SphereGeometry(1.42, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: '#0b1220', roughness: 0.16, metalness: 0.1, transparent: true, opacity: 0.5, envMapIntensity: 0.61, side: T.DoubleSide, depthWrite: false })); lid.scale.y = 0.42; lid.position.y = 1.12; g.add(lid);
  var hinge = new T.Mesh(new T.BoxGeometry(1.1, 0.3, 0.4), enamel); hinge.position.set(0, 1.12, -1.55); g.add(hinge);
  var latch = new T.Mesh(new T.BoxGeometry(0.5, 0.2, 0.26), mat(T, '#10151f', 0.5, 0.3)); latch.position.set(0, 1.2, 1.5); g.add(latch);
  var ring = new T.Mesh(new T.TorusGeometry(0.2, 0.025, 8, 24), new T.MeshBasicMaterial({ color: new T.Color('#7fe3ff').multiplyScalar(1.6) })); ring.position.set(1.0, 0.55, 1.5); g.add(ring);
  return { group: g, rotor: rotor, ring: ring };
}

function makeMicroscope(T) {
  /* side view, z towards the viewer. Everything sits on one optical axis at z = 0.2 above the stage. */
  var g = new T.Group(), enamel = mat(T, '#9a968a', 0.38, 0.15), black = mat(T, '#10151f', 0.5, 0.2);
  var chrome = new T.MeshStandardMaterial({ color: '#c9d3e0', roughness: 0.5, metalness: 0.75, envMapIntensity: 0.53 });
  var AX = 0.2;
  var base = roundedBox(T, 2.4, 2.9, 0.4, 0.5, 0.07, enamel); base.rotation.x = -Math.PI / 2; base.position.set(0, 0.2, 0); g.add(base);
  /* arm: starts inside the base at the back, rises and curves forward over the stage */
  var curve = new T.CatmullRomCurve3([new T.Vector3(0, 0.2, -1.0), new T.Vector3(0, 1.4, -1.15), new T.Vector3(0, 2.8, -1.1), new T.Vector3(0, 3.7, -0.85), new T.Vector3(0, 4.05, -0.45)]);
  g.add(new T.Mesh(new T.TubeGeometry(curve, 30, 0.27, 14, false), enamel));
  /* neck from the arm tip to the head, then the head, turret and objectives stacked on the axis */
  box(T, g, 0.52, 0.5, 0.95, '#9a968a', 0, 4.0, -0.15, 0.38, 0.15);
  var headBody = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 1.0, 26), enamel); headBody.position.set(0, 3.75, AX); g.add(headBody);
  var turret = new T.Mesh(new T.CylinderGeometry(0.5, 0.46, 0.3, 26), black); turret.position.set(0, 3.1, AX); g.add(turret);
  [[-0.25, 0.1, 0.55, -0.22], [0.25, 0.1, 0.65, 0.22], [0, -0.22, 0.75, 0]].forEach(function (o) {
    var ob = new T.Mesh(new T.CylinderGeometry(0.14, 0.08, o[2], 16), chrome); ob.position.set(o[0], 2.95 - o[2] / 2, AX + o[1]); ob.rotation.z = o[3]; g.add(ob);
  });
  /* eyepiece tube tilted towards the user */
  var ep = new T.Group(); ep.position.set(0, 4.2, AX); ep.rotation.x = 0.55; g.add(ep);
  var tube = new T.Mesh(new T.CylinderGeometry(0.27, 0.3, 1.5, 22), enamel); tube.position.y = 0.7; ep.add(tube);
  var ering = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.1, 22), chrome); ering.position.y = 1.4; ep.add(ering);
  var eye = new T.Mesh(new T.CylinderGeometry(0.2, 0.24, 0.65, 20), black); eye.position.y = 1.8; ep.add(eye);
  /* stage on a bracket fixed to the arm */
  box(T, g, 0.8, 0.6, 0.8, '#9a968a', 0, 1.5, -0.8, 0.4, 0.15);
  box(T, g, 2.0, 0.12, 1.8, '#10151f', 0, 1.74, AX, 0.45, 0.3);
  [-0.55, 0.55].forEach(function (cx) { var cl = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.75), chrome); cl.position.set(cx, 1.83, AX); g.add(cl); });
  var slide = new T.Mesh(new T.BoxGeometry(1.1, 0.04, 0.42), new T.MeshStandardMaterial({ color: 0xd9f0f8, roughness: 0.15, transparent: true, opacity: 0.45, envMapIntensity: 0.59 })); slide.position.set(0, 1.82, AX); g.add(slide);
  var spot = new T.Mesh(new T.CircleGeometry(0.1, 12), new T.MeshBasicMaterial({ color: '#c24a7a' })); spot.rotation.x = -Math.PI / 2; spot.position.set(0.1, 1.845, AX); g.add(spot);
  var cond = new T.Mesh(new T.CylinderGeometry(0.28, 0.34, 0.5, 18), chrome); cond.position.set(0, 1.4, AX); g.add(cond);
  /* focus knobs share the arm's axis: coarse inside, fine outside, caps on the ends */
  [-1, 1].forEach(function (sd) {
    var coarse = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, 0.34, 24), black); coarse.rotation.z = Math.PI / 2; coarse.position.set(sd * 0.47, 1.1, -1.1); g.add(coarse);
    var fine = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.24, 20), black); fine.rotation.z = Math.PI / 2; fine.position.set(sd * 0.76, 1.1, -1.1); g.add(fine);
    var cap = new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 0.05, 16), chrome); cap.rotation.z = Math.PI / 2; cap.position.set(sd * 0.9, 1.1, -1.1); g.add(cap);
  });
  /* lamp window in the base */
  var lampRing = new T.Mesh(new T.CylinderGeometry(0.38, 0.4, 0.1, 22), black); lampRing.position.set(0, 0.45, AX + 0.15); g.add(lampRing);
  var lamp = new T.Mesh(new T.CircleGeometry(0.28, 20), new T.MeshBasicMaterial({ color: new T.Color('#ffb454').multiplyScalar(1.8) })); lamp.rotation.x = -Math.PI / 2; lamp.position.set(0, 0.505, AX + 0.15); g.add(lamp);
  return g;
}

/* lab stool at real proportions (1 unit is about 7 cm): a 35 cm cushioned seat 70 cm off the floor, splayed steel legs, rubber feet, foot ring */
function makeStool(T, g, x, z, FLOOR, rot) {
  var st = new T.Group(), steel = new T.MeshStandardMaterial({ color: '#8d96a3', roughness: 0.3, metalness: 0.9, envMapIntensity: 0.49 });
  var seatY = 9.7, up = new T.Vector3(0, 1, 0);
  var seat = new T.Mesh(lathe(T, [[0, 0], [2.3, 0], [2.45, 0.1], [2.52, 0.34], [2.42, 0.62], [2.1, 0.72], [0, 0.72]], 40), new T.MeshStandardMaterial({ color: '#c0603a', roughness: 0.6, metalness: 0, envMapIntensity: 0.18, side: T.DoubleSide }));
  seat.position.y = seatY; st.add(seat);
  var plate = new T.Mesh(new T.CylinderGeometry(2.0, 2.0, 0.16, 32), mat(T, '#2a2c30', 0.5, 0.5)); plate.position.y = seatY - 0.08; st.add(plate);
  function strut(ax, ay, az, bx, by, bz, r) {
    var A = new T.Vector3(ax, ay, az), B = new T.Vector3(bx, by, bz), d = B.clone().sub(A), len = d.length();
    var m2 = new T.Mesh(new T.CylinderGeometry(r, r, len, 12), steel); m2.position.copy(A).add(B).multiplyScalar(0.5); m2.quaternion.setFromUnitVectors(up, d.normalize()); st.add(m2);
  }
  var c = Math.SQRT1_2, rt = 1.55, rb = 2.75, ringY = 3.7, rr = rt + (rb - rt) * (seatY - 0.15 - ringY) / (seatY - 0.15 - 0.2);
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(function (d) {
    strut(d[0] * c * rt, seatY - 0.15, d[1] * c * rt, d[0] * c * rb, 0.2, d[1] * c * rb, 0.17);
    var foot = new T.Mesh(new T.CylinderGeometry(0.26, 0.3, 0.22, 14), mat(T, '#0b0d10', 0.8, 0)); foot.position.set(d[0] * c * rb, 0.11, d[1] * c * rb); st.add(foot);
  });
  var ring = new T.Mesh(new T.TorusGeometry(rr, 0.1, 8, 40), steel); ring.rotation.x = Math.PI / 2; ring.position.y = ringY; st.add(ring);
  st.position.set(x, FLOOR, z); st.rotation.y = rot || 0; g.add(st);
  contactShadow(T, g, x, FLOOR + 0.06, z, 7.4, 7.4, 0.5);
}

var ENV = {};

/* ---------- lab at dusk ---------- */
ENV.lab = function (T) {
  var g = new T.Group(), glow = glowTex(T), rnd = mulberry(5), i;
  var CY = '#7fe3ff', AM = '#ffb454', CO = '#ff6b86', MI = '#9be5c8';

  var FLOOR = -13;
  tileFloor(T, g, FLOOR); woodTable(T, g, FLOOR);

  /* room light */
  g.add(new T.HemisphereLight(0xfff1de, 0x4a4038, 0.5));
  var key = new T.DirectionalLight(0xfff0dc, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xe8e8f0, 0.12); fill.position.set(-10, 8, 16); g.add(fill);

  /* back wall */
  var wallTex = canvasTex(T, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4d625e'); gr.addColorStop(1, '#6b8076'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  /* back wall with a real window cut into it (hole centre is relative to the wall centre) */
  makeWall(T, g, { w: 110, h: 54, x: 0, y: 14, z: -19, ry: 0, map: wallTex, seed: 1, holes: [{ x: 8, y: -2.5, w: 20, h: 11, blinds: true, plant: true }] });


  /* back counter */
  var counter = new T.Mesh(new T.BoxGeometry(68, 14.2, 5), metal(T, '#8a7f66')); counter.position.set(0, -5.9, -12.5); g.add(counter);
  var edge = new T.LineSegments(new T.EdgesGeometry(counter.geometry), new T.LineBasicMaterial({ color: CY, transparent: true, opacity: 0.18 })); edge.position.copy(counter.position); g.add(edge);
  var top = 1.6;

  /* shelf with bottles on the wall */
  var shelf = new T.Mesh(new T.BoxGeometry(18, 0.25, 1.4), metal(T, '#5a4a3a')); shelf.position.set(-12, 9, -17.2); g.add(shelf);
  var strip = new T.Mesh(new T.BoxGeometry(17.6, 0.08, 0.1), new T.MeshBasicMaterial({ color: hdr(T, '#cfeeff', 1.5) })); strip.position.set(-12, 8.82, -16.6); g.add(strip);
  var bottleSpecs = [['#b87a2a', '#8a5412'], ['#2f7fa6', '#2a6f95'], ['#3f9a6a', '#2f8a5a'], ['#8a8668', '#9a9576'], ['#2f7fa6', '#3a8fb8'], ['#b87a2a', '#9a6418'], ['#6a5fb0', '#5a4fa0']];
  for (i = 0; i < bottleSpecs.length; i++) {
    var bh = 1.7 + rnd() * 1.0, bt = bottle(T, bh, bottleSpecs[i][0], bottleSpecs[i][1], i); bt.position.set(-19.5 + i * 2.3, 9.13, -17.2); g.add(bt);
    contactShadow(T, g, bt.position.x, 9.14, -17.2, 1.5, 1.5, 0.45);
  }

  /* glassware */
  var flask = glassVessel(T, [[0, 0], [1.5, 0], [1.7, 0.14], [1.62, 0.3], [0.52, 2.7], [0.5, 3.5], [0.66, 3.66], [0.68, 3.76]], { thick: 0.07, liquid: { fill: 1.5, color: '#3fb6d6' } });
  var flab = new T.Mesh(new T.PlaneGeometry(0.95, 0.75), new T.MeshStandardMaterial({ map: paperLabel(T, 2, '#2f7fa6'), color: 0x8c8c8c, roughness: 0.9 })); flab.position.set(0, 1.45, 1.12); flab.rotation.x = -0.43; flask.add(flab);
  flask.position.set(-14, top, -12.4); flask.scale.setScalar(1.15); g.add(flask); contactShadow(T, g, -14, top + 0.02, -12.4, 4.6, 4.6, 0.55);
  var beaker = glassVessel(T, [[0, 0], [1.2, 0], [1.22, 0.08], [1.2, 2.5], [1.32, 2.64]], { thick: 0.07, liquid: { fill: 1.45, color: '#d99a3a' }, ticks: { r: 1.215, y0: 0.35, y1: 2.35, n: 10, major: 5 } });
  beaker.position.set(-10.4, top, -11.4); g.add(beaker); contactShadow(T, g, -10.4, top + 0.02, -11.4, 3.5, 3.5, 0.55);

  var rack = tubeRack(T); rack.position.set(-6.2, top, -11.4); g.add(rack); contactShadow(T, g, -6.2, top + 0.02, -11.4, 5.4, 2.2, 0.5);
  var stand = pipetteStand(T); stand.position.set(-2.4, top, -11.4); g.add(stand); contactShadow(T, g, -2.4, top + 0.02, -11.4, 4.0, 2.0, 0.5);
  var seqObj = makeSequencer(T); seqObj.group.position.set(11, top, -11.6); g.add(seqObj.group); contactShadow(T, g, 11, top + 0.02, -11.6, 5.2, 4.0, 0.6);
  var cenObj = makeCentrifuge(T); cenObj.group.position.set(15.6, top, -12.3); g.add(cenObj.group); contactShadow(T, g, 15.6, top + 0.02, -12.3, 4.4, 4.4, 0.6);

  /* soft shadow that grounds whatever the page puts on the table (the page sizes it) */
  var tableShadow = contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5);

  fillRoom(T, g, FLOOR, top);

  /* invisible overhead fill light (nothing is drawn for it) */
  var overhead = new T.PointLight(0xffe2bf, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) {
      seqObj.tick(t, dt);
      cenObj.rotor.rotation.y = t * 3.4;
      cenObj.ring.material.color.copy(hdr(T, CY, 1.4 + 0.5 * Math.sin(t * 2)));
      seqObj.leds[1].material.color.copy(hdr(T, AM, 1.2 + 1.2 * (Math.sin(t * 3) > 0 ? 1 : 0)));
    }
  };
};

/* ---------- neutral studio ---------- */
ENV.studio = function (T) {
  var g = new T.Group(), glow = glowTex(T);
  benchFloor(T, g, 90, 70);
  var wallTex = canvasTex(T, 8, 256, function (x, w, h) { var gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#070a14'); gr.addColorStop(1, '#16253f'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  var wall = new T.Mesh(new T.PlaneGeometry(110, 40), new T.MeshBasicMaterial({ map: wallTex })); wall.position.set(0, 14, -20); g.add(wall);
  [[-14, 8, '#7fe3ff'], [14, 8, '#ffb454']].forEach(function (s) {
    var panel = new T.Mesh(new T.PlaneGeometry(4, 12), new T.MeshBasicMaterial({ color: hdr(T, s[2], 1.3) })); panel.position.set(s[0], s[1] + 5, -19.5); g.add(panel);
    var sp = new T.Mesh(new T.PlaneGeometry(22, 26), new T.MeshBasicMaterial({ map: glow, color: hdr(T, s[2], 1), transparent: true, opacity: 0.4, depthWrite: false, blending: T.AdditiveBlending, fog: false })); sp.position.set(s[0], s[1] + 5, -19.3); g.add(sp);
  });
  return { group: g, update: function () {} };
};

/* ---------- category registry ----------
 * Each category (subject) has ONE fixed environment, shared by every topic in it.
 * Improving an environment upgrades all topics of that category at once.
 * Keep this map in sync with the "environment" field of each category in topics.json (npm run validate checks it).
 */
ENV.CATEGORY_ENV = { biology: 'lab' };
ENV.nameFor = function (category) { var n = ENV.CATEGORY_ENV[category]; return n && typeof ENV[n] === 'function' ? n : 'studio'; };
ENV.forCategory = function (category, T) { return ENV[ENV.nameFor(category)](T); };

window.VLEnv = ENV;
})();
