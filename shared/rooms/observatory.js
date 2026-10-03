/* Room "observatory" for the astronomy subject: the inside of an observatory dome at night.
 * A ribbed dome with an open observing slit onto a starry sky, a refractor on an equatorial mount, a wooden desk,
 * star charts, a celestial globe, notebooks and a dim red lamp. Deep navy, violet shadow, brass, wood and red.
 * Local y = 0 is the table top, the floor is at y = -13, the back of the dome is near z = -22. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit, D2R = Math.PI / 180;

/* real stars: RA in hours, Dec in degrees, apparent magnitude (rounded) */
var STAR = {
  betelgeuse: [5.919, 7.41, 0.5], rigel: [5.242, -8.20, 0.13], bellatrix: [5.419, 6.35, 1.64], saiph: [5.796, -9.67, 2.07],
  alnitak: [5.679, -1.94, 1.77], alnilam: [5.603, -1.20, 1.69], mintaka: [5.533, -0.30, 2.23], meissa: [5.586, 9.93, 3.39],
  pi2: [4.849, 8.90, 4.36], pi3: [4.832, 6.96, 3.19], pi4: [4.857, 5.61, 3.69], pi5: [4.904, 2.44, 3.72], pi6: [4.977, 1.71, 4.47],
  sirius: [6.752, -16.72, -1.46], aldebaran: [4.599, 16.51, 0.86],
  dubhe: [11.062, 61.75, 1.79], merak: [11.031, 56.38, 2.37], phecda: [11.897, 53.69, 2.44], megrez: [12.257, 57.03, 3.31],
  alioth: [12.900, 55.96, 1.77], mizar: [13.399, 54.93, 2.23], alkaid: [13.792, 49.31, 1.86],
  polaris: [2.530, 89.26, 1.98], yildun: [17.537, 86.59, 4.36], epsUMi: [16.766, 82.04, 4.2], zetUMi: [15.734, 77.79, 4.3],
  etaUMi: [16.292, 75.76, 4.95], pherkad: [15.345, 71.83, 3.0], kochab: [14.845, 74.16, 2.08],
  caph: [0.153, 59.15, 2.27], schedar: [0.675, 56.54, 2.24], gammaCas: [0.945, 60.72, 2.47], ruchbah: [1.430, 60.24, 2.68], segin: [1.907, 63.67, 3.37],
  vega: [18.616, 38.78, 0.03], deneb: [20.690, 45.28, 1.25], altair: [19.846, 8.87, 0.77], arcturus: [14.261, 19.18, -0.05], capella: [5.278, 46.0, 0.08],
  procyon: [7.655, 5.22, 0.34], regulus: [10.140, 11.97, 1.35], castor: [7.577, 31.89, 1.58], pollux: [7.755, 28.03, 1.14]
};
var FIG = {
  orion: [['meissa', 'betelgeuse'], ['meissa', 'bellatrix'], ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'], ['alnitak', 'alnilam'], ['alnilam', 'mintaka'], ['alnitak', 'saiph'], ['mintaka', 'rigel']],
  shield: [['pi2', 'pi3'], ['pi3', 'pi4'], ['pi4', 'pi5'], ['pi5', 'pi6']],
  dipper: [['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'], ['megrez', 'dubhe'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid']],
  little: [['polaris', 'yildun'], ['yildun', 'epsUMi'], ['epsUMi', 'zetUMi'], ['zetUMi', 'etaUMi'], ['etaUMi', 'pherkad'], ['pherkad', 'kochab'], ['kochab', 'zetUMi']],
  cass: [['caph', 'schedar'], ['schedar', 'gammaCas'], ['gammaCas', 'ruchbah'], ['ruchbah', 'segin']]
};

ENV.observatory = function (T) {
  var g = new T.Group(), rnd = K.mulberry(41), i, j;
  var FLOOR = -13, brassC = '#a47c38';

  /* ---------- small helpers ---------- */
  var cache = {};
  function M(c, r) { var k = c + '|' + (r == null ? '' : r); return cache[k] || (cache[k] = new T.MeshStandardMaterial({ color: c, roughness: r == null ? 0.84 : r, metalness: 0 })); }
  function bx(p, w, h, d, c, x, y, z, r) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c, r)); m.position.set(x, y, z); p.add(m); return m; }
  function cy(p, rt, rb, h, c, x, y, z, r, seg) { var m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), M(c, r)); m.position.set(x, y, z); p.add(m); return m; }
  function txt(x, s, px, col, ax, ay, o) {
    o = o || {}; x.font = (o.i ? 'italic ' : '') + (o.b ? 'bold ' : '') + px + 'px Georgia, "Times New Roman", serif';
    x.textAlign = 'left'; x.textBaseline = 'middle';
    var w = x.measureText(s).width, x0 = ax === 'right' ? ay[0] - w : ax === 'center' ? ay[0] - w / 2 : ay[0], y0 = ay[1];
    if (o.bg) { x.fillStyle = o.bg; x.beginPath(); x.rect(x0 - 8, y0 - px * 0.62, w + 16, px * 1.24); x.fill(); }
    x.fillStyle = col; x.fillText(s, x0, y0 + px * 0.04);
  }
  function pointTex(T2, size, rgb, a) {
    return K.canvasTex(T2, size, size, function (c, w, h) {
      var gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(0.5, 'rgba(' + rgb + ',' + a * 0.4 + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
  }

  /* ---------- the dome: an ellipsoid shell above a short drum wall ---------- */
  var AX = 90, AZ = 72, CZ = 50, RY = 62, SPRING = 4, EDGE = 96 * D2R, SA = -24 * D2R, SB = -6 * D2R, STOP = 62 * D2R, HALF = Math.PI / 2;
  function surf(az, el) { var c = Math.cos(el); return new T.Vector3(AX * Math.sin(az) * c, SPRING + RY * Math.sin(el), CZ - AZ * Math.cos(az) * c); }
  function drum(az, y) { return new T.Vector3(AX * Math.sin(az), y, CZ - AZ * Math.cos(az)); }
  function inward(p) { return new T.Vector3(-p.x / (AX * AX), p.y > SPRING ? -(p.y - SPRING) / (RY * RY) : 0, -(p.z - CZ) / (AZ * AZ)).normalize(); }
  function elOf(y) { return Math.asin(Math.min(1, (y - SPRING) / RY)); }
  /* a point on the wall at azimuth az and height y, with the inward normal */
  function wallAt(az, y) { var p = y > SPRING ? surf(az, elOf(y)) : drum(az, y); return { p: p, n: inward(p) }; }

  function gridGeo(pt, u0, u1, nu, v0, v1, nv, uvf) {
    var pos = [], nor = [], uv = [], idx = [], w = nu + 1, a, b, c, d, u, v, p, n, t;
    for (j = 0; j <= nv; j++) for (i = 0; i <= nu; i++) {
      u = u0 + (u1 - u0) * i / nu; v = v0 + (v1 - v0) * j / nv; p = pt(u, v); n = inward(p); t = uvf(u, v);
      pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(t[0], t[1]);
    }
    /* wind the triangles so the visible face looks into the room */
    var P0 = new T.Vector3(pos[0], pos[1], pos[2]), P1 = new T.Vector3(pos[3], pos[4], pos[5]), P2 = new T.Vector3(pos[3 * w], pos[3 * w + 1], pos[3 * w + 2]);
    var ccw = P1.sub(P0).cross(P2.sub(P0)).dot(new T.Vector3(nor[0], nor[1], nor[2])) > 0;
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) {
      a = j * w + i; b = a + 1; c = a + w; d = c + 1;
      if (ccw) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); return geo;
  }

  /* painted steel panels: one cell per 6 degrees of azimuth and 9 of elevation, so the ribs sit on the seams */
  var domeTex = K.canvasTex(T, 1024, 512, function (x, W, H) {
    var r = K.mulberry(7), cw = W / 32, ch = H / 10, ci, cj, tone;
    for (cj = 0; cj < 10; cj++) for (ci = 0; ci < 32; ci++) {
      tone = (r() - 0.5) * 7;
      x.fillStyle = 'rgb(' + Math.round(50 + tone) + ',' + Math.round(54 + tone) + ',' + Math.round(90 + tone) + ')';
      x.fillRect(ci * cw, H - (cj + 1) * ch, cw, ch);
      var gr = x.createLinearGradient(0, H - (cj + 1) * ch, 0, H - cj * ch); gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)');
      x.fillStyle = gr; x.fillRect(ci * cw, H - (cj + 1) * ch, cw, ch);
      x.strokeStyle = 'rgba(8,10,26,0.55)'; x.lineWidth = 2; x.strokeRect(ci * cw + 1, H - (cj + 1) * ch + 1, cw - 2, ch - 2);
      x.fillStyle = 'rgba(150,160,200,0.22)';
      for (var k = 0; k < 3; k++) { x.fillRect(ci * cw + 4, H - (cj + 1) * ch + 6 + k * ch * 0.3, 1.6, 1.6); x.fillRect(ci * cw + cw - 6, H - (cj + 1) * ch + 6 + k * ch * 0.3, 1.6, 1.6); }
    }
  });
  /* drum wall: dark wood boards below a painted band with recessed panels */
  var drumTex = K.canvasTex(T, 1024, 256, function (x, W, H) {
    var r = K.mulberry(9), k, wood = H * 0.56;
    x.fillStyle = '#2d3558'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#4a3425'; x.fillRect(0, H - wood, W, wood);
    for (k = 0; k < W; k += 16) { x.fillStyle = 'rgba(' + (r() < 0.5 ? '20,10,4' : '255,220,180') + ',' + (0.06 + r() * 0.1) + ')'; x.fillRect(k, H - wood, 15, wood); x.fillStyle = 'rgba(10,5,2,0.5)'; x.fillRect(k, H - wood, 1.5, wood); }
    x.fillStyle = '#9a7a3c'; x.fillRect(0, H - wood - 5, W, 5);
    for (k = 0; k < 16; k++) {
      var px0 = k * 64 + 7;
      x.fillStyle = 'rgba(6,8,22,0.5)'; x.fillRect(px0, 12, 50, H - wood - 28);
      x.fillStyle = 'rgba(70,82,130,0.35)'; x.fillRect(px0 + 3, 15, 44, H - wood - 34);
    }
  });
  var domeMat = new T.MeshStandardMaterial({ map: domeTex, roughness: 0.88, metalness: 0 });
  var drumMat = new T.MeshStandardMaterial({ map: drumTex, roughness: 0.88, metalness: 0 });
  function domeUV(az, el) { return [(az + EDGE) / (2 * EDGE), el / HALF]; }
  function addMesh(geo, mat) { var m = new T.Mesh(geo, mat); g.add(m); return m; }
  addMesh(gridGeo(drum, -EDGE, EDGE, 64, FLOOR, SPRING, 4, function (az, y) { return [(az + EDGE) / (2 * EDGE), (y - FLOOR) / (SPRING - FLOOR)]; }), drumMat);
  addMesh(gridGeo(surf, -EDGE, SA, 24, 0, HALF, 30, domeUV), domeMat);
  addMesh(gridGeo(surf, SB, EDGE, 34, 0, HALF, 30, domeUV), domeMat);
  addMesh(gridGeo(surf, SA, SB, 6, STOP, HALF, 10, domeUV), domeMat);

  /* ribs, ring beams and the brass-trimmed slit edges: swept boxes with flat shading, merged per material */
  function Acc() { return { pos: [], nor: [] }; }
  function quad(acc, p0, p1, p2, p3, n) {
    var flip = p1.clone().sub(p0).cross(p2.clone().sub(p0)).dot(n) < 0, o = flip ? [p0, p2, p1, p0, p3, p2] : [p0, p1, p2, p0, p2, p3];
    o.forEach(function (p) { acc.pos.push(p.x, p.y, p.z); acc.nor.push(n.x, n.y, n.z); });
  }
  function strip(acc, fr, w, d0, d1) {
    function c(f, s, d) { return f.p.clone().addScaledVector(f.a, s * w / 2).addScaledVector(f.n, d); }
    for (var k = 0; k < fr.length - 1; k++) {
      var f0 = fr[k], f1 = fr[k + 1], na = f0.a.clone().add(f1.a).normalize();
      quad(acc, c(f0, -1, d1), c(f0, 1, d1), c(f1, 1, d1), c(f1, -1, d1), f0.n.clone().add(f1.n).normalize());
      quad(acc, c(f0, 1, d1), c(f0, 1, d0), c(f1, 1, d0), c(f1, 1, d1), na);
      quad(acc, c(f0, -1, d1), c(f0, -1, d0), c(f1, -1, d0), c(f1, -1, d1), na.clone().negate());
    }
  }
  function meridian(az, e0, e1) {
    var f = [], k, n = Math.max(2, Math.round((e1 - e0) / (4 * D2R))), el, p;
    for (k = 0; k <= n; k++) { el = e0 + (e1 - e0) * k / n; p = surf(az, el); f.push({ p: p, a: new T.Vector3(AX * Math.cos(az) * Math.cos(el), 0, AZ * Math.sin(az) * Math.cos(el)).normalize(), n: inward(p) }); }
    return f;
  }
  function ringAt(el, a0, a1) {
    var f = [], k, n = Math.max(2, Math.round((a1 - a0) / (3 * D2R))), az, p;
    for (k = 0; k <= n; k++) {
      az = a0 + (a1 - a0) * k / n; p = surf(az, el);
      f.push({ p: p, a: new T.Vector3(-AX * Math.sin(az) * Math.sin(el), RY * Math.cos(el), AZ * Math.cos(az) * Math.sin(el)).normalize(), n: inward(p) });
    }
    return f;
  }
  function finish(acc, color) {
    var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(acc.pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(acc.nor, 3));
    return addMesh(geo, M(color, 0.8));
  }
  var ribs = Acc(), beams = Acc(), brass = Acc(), k, az, deg;
  for (k = -16; k <= 16; k++) {
    az = k * 6 * D2R;
    if (az > SA + 0.001 && az < SB - 0.001) strip(ribs, meridian(az, STOP, 88 * D2R), 1.0, 0, 0.7);
    else if (Math.abs(k) < 16) strip(ribs, meridian(az, 0, 88 * D2R), 1.0, 0, 0.7);
  }
  [9, 18, 27, 36, 45, 54].forEach(function (d) { strip(beams, ringAt(d * D2R, -EDGE, SA), 0.7, 0, 0.4); strip(beams, ringAt(d * D2R, SB, EDGE), 0.7, 0, 0.4); });
  [63, 72, 81].forEach(function (d) { strip(beams, ringAt(d * D2R, -EDGE, EDGE), 0.7, 0, 0.4); });
  strip(beams, ringAt(0, -EDGE, EDGE), 2.6, -0.4, 1.5);                      /* the rail the dome turns on */
  for (k = -8; k <= 8; k++) { var dm = []; for (j = 0; j <= 4; j++) { var yy = FLOOR + (SPRING - 1.3 - FLOOR) * j / 4, pd = drum(k * 12 * D2R, yy); dm.push({ p: pd, a: new T.Vector3(AX * Math.cos(k * 12 * D2R), 0, AZ * Math.sin(k * 12 * D2R)).normalize(), n: inward(pd) }); } strip(beams, dm, 1.3, 0, 0.35); }
  strip(brass, meridian(SA, 0, STOP), 1.7, -1.4, 0.9); strip(brass, meridian(SB, 0, STOP), 1.7, -1.4, 0.9); strip(brass, ringAt(STOP, SA, SB), 1.7, -1.4, 0.9);
  finish(ribs, '#3b4570'); finish(beams, '#2a3150'); finish(brass, '#9a7436');

  /* ---------- the sky seen through the slit ---------- */
  /* a patch of sky around the view direction through the slit; it follows the camera, so the stars stay at infinity */
  var SKY_AZ0 = -72, SKY_AZ1 = 32, SKY_EL0 = -10, SKY_EL1 = 60, SW = 1400, SH = 945;
  var skyTex = K.canvasTex(T, SW, SH, function (x, W, H) {
    var r = K.mulberry(2024), n, t, px, py, b, rad, cols = ['#ffffff', '#cfdcff', '#fff0d2', '#ffd9b0', '#a9c2ff'];
    function X(a) { return W * (SKY_AZ1 - a) / (SKY_AZ1 - SKY_AZ0); }
    function Y(e) { return H * (SKY_EL1 - e) / (SKY_EL1 - SKY_EL0); }
    var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#040814'); gr.addColorStop(0.55, '#08102a'); gr.addColorStop(1, '#161a3c'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    /* Milky Way: soft blobs along a slanted band with darker lanes through it */
    var c0 = [X(-68), Y(34)], c1 = [X(20), Y(-4)], bw = H * 0.17;
    function band(tt) { return [c0[0] + (c1[0] - c0[0]) * tt, c0[1] + (c1[1] - c0[1]) * tt]; }
    function gauss() { return (r() + r() + r() + r() - 2) / 0.58; }
    var nx = -(c1[1] - c0[1]), ny = c1[0] - c0[0], nl = Math.sqrt(nx * nx + ny * ny); nx /= nl; ny /= nl;
    x.globalCompositeOperation = 'lighter';
    for (n = 0; n < 1900; n++) {
      t = r(); var o = gauss() * bw * (0.55 + 0.45 * Math.sin(t * 3.14)), bp = band(t), core = Math.exp(-Math.pow((t - 0.55) / 0.3, 2));
      px = bp[0] + nx * o; py = bp[1] + ny * o; rad = 18 + r() * 60;
      var rg = x.createRadialGradient(px, py, 0, px, py, rad), al = (0.03 + r() * 0.045) * (0.6 + core), cc = r() < 0.35 + core * 0.3 ? '188,160,150' : '120,138,205';
      rg.addColorStop(0, 'rgba(' + cc + ',' + al + ')'); rg.addColorStop(1, 'rgba(' + cc + ',0)'); x.fillStyle = rg; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    x.globalCompositeOperation = 'source-over';
    for (n = 0; n < 150; n++) {
      t = 0.1 + r() * 0.8; var o2 = gauss() * bw * 0.28, bp2 = band(t); px = bp2[0] + nx * o2; py = bp2[1] + ny * o2; rad = 8 + r() * 30;
      var dg = x.createRadialGradient(px, py, 0, px, py, rad); dg.addColorStop(0, 'rgba(3,6,16,0.2)'); dg.addColorStop(1, 'rgba(3,6,16,0)'); x.fillStyle = dg; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    /* stars: many faint, a few bright; extra faint ones crowd the band */
    for (n = 0; n < 9500; n++) {
      var inBand = n > 6200; t = r();
      if (inBand) { var bq = band(t), oq = gauss() * bw * 0.45; px = bq[0] + nx * oq; py = bq[1] + ny * oq; } else { px = r() * W; py = r() * H; }
      if (px < 0 || px > W || py < 0 || py > H) continue;
      b = Math.pow(r(), inBand ? 6 : 4.2); rad = 0.5 + b * 1.7;
      x.globalAlpha = Math.min(0.94, 0.32 + b * 1.1 + r() * 0.2); x.fillStyle = cols[Math.floor(r() * r() * cols.length)];
      x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
      if (b > 0.5) { x.globalAlpha = 0.1 + b * 0.16; var hg = x.createRadialGradient(px, py, 0, px, py, rad * 3.2); hg.addColorStop(0, 'rgba(210,225,255,0.55)'); hg.addColorStop(1, 'rgba(210,225,255,0)'); x.fillStyle = hg; x.fillRect(px - rad * 3.2, py - rad * 3.2, rad * 6.4, rad * 6.4); }
    }
    x.globalAlpha = 1;
    /* a slim crescent moon with a hint of earthshine */
    var mx = X(-34), my = Y(8), mr = 21, mg = x.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5); mg.addColorStop(0, 'rgba(200,205,230,0.2)'); mg.addColorStop(1, 'rgba(200,205,230,0)'); x.fillStyle = mg; x.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    x.save(); x.beginPath(); x.arc(mx, my, mr, 0, 7); x.clip(); x.fillStyle = '#243052'; x.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    x.fillStyle = '#d9d3bf'; x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill(); x.fillStyle = '#243052'; x.beginPath(); x.arc(mx + mr * 0.5, my - mr * 0.18, mr * 0.92, 0, 7); x.fill(); x.restore();
  });
  var sky = new T.Mesh(new T.SphereGeometry(250, 48, 28, (270 - SKY_AZ1) * D2R, (SKY_AZ1 - SKY_AZ0) * D2R, (90 - SKY_EL1) * D2R, (SKY_EL1 - SKY_EL0) * D2R),
    new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false, depthTest: false, color: new T.Color(0.92, 0.92, 0.95) }));
  sky.renderOrder = -100; sky.frustumCulled = false;
  sky.onBeforeRender = function (renderer, scene, camera) {
    sky.position.copy(g.worldToLocal(camera.position.clone())); sky.updateMatrix(); sky.matrixWorld.multiplyMatrices(g.matrixWorld, sky.matrix);
  };
  g.add(sky);

  /* ---------- floor ---------- */
  var plankTex = K.canvasTex(T, 512, 512, function (x, W, H) {
    var r = K.mulberry(13), p, row = H / 10;
    for (p = 0; p < 10; p++) {
      var t = (r() - 0.5) * 12; x.fillStyle = 'rgb(' + Math.round(62 + t) + ',' + Math.round(44 + t * 0.8) + ',' + Math.round(32 + t * 0.6) + ')'; x.fillRect(0, p * row, W, row);
      for (var q = 0; q < 14; q++) { x.strokeStyle = 'rgba(20,10,4,' + (0.08 + r() * 0.12) + ')'; x.lineWidth = 0.7 + r(); var yy = p * row + r() * row; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy + (r() - 0.5) * 3); x.stroke(); }
      x.fillStyle = 'rgba(8,4,2,0.7)'; x.fillRect(0, p * row, W, 1.6); x.fillRect(r() * W, p * row, 1.6, row);
    }
  });
  plankTex.wrapS = plankTex.wrapT = T.RepeatWrapping; plankTex.repeat.set(7, 6);
  var floor = new T.Mesh(new T.CircleGeometry(1, 72), new T.MeshStandardMaterial({ map: plankTex, roughness: 0.9, metalness: 0 }));
  floor.rotation.x = -HALF; floor.scale.set(AX + 1, AZ + 1, 1); floor.position.set(0, FLOOR, CZ); g.add(floor);

  /* ---------- the desk ---------- */
  var woodTex = K.canvasTex(T, 1024, 512, function (x, W, H) {
    x.fillStyle = '#6c4a31'; x.fillRect(0, 0, W, H);
    var r = K.mulberry(3), n;
    for (n = 0; n < 150; n++) { var y = r() * H, a = 0.05 + r() * 0.13; x.strokeStyle = r() < 0.55 ? 'rgba(60,34,16,' + a + ')' : 'rgba(255,225,180,' + a * 0.35 + ')'; x.lineWidth = 0.7 + r() * 2; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 10, W * 0.7, y + (r() - 0.5) * 10, W, y + (r() - 0.5) * 8); x.stroke(); }
    for (n = 0; n < 6; n++) { x.fillStyle = 'rgba(40,22,10,0.1)'; x.fillRect(r() * W, 0, 2, H); }
  });
  var TW = 62, TD = 30, TZ0 = -8.5, TZc = TZ0 + TD / 2, TTOP = -0.03, TTH = 1.4;
  var topMat = new T.MeshStandardMaterial({ map: woodTex, roughness: 0.85, metalness: 0 }), edgeMat = M('#58402a', 0.8);
  var slab = new T.Mesh(new T.BoxGeometry(TW, TTH, TD), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]); slab.position.set(0, TTOP - TTH / 2, TZc); g.add(slab);
  bx(g, TW - 5, 2.2, TD - 5, '#3e2b1c', 0, TTOP - TTH - 1.1, TZc);
  var legH = TTOP - TTH - FLOOR;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { bx(g, 3, legH, 3, '#4a3322', c[0] * (TW / 2 - 2.6), FLOOR + legH / 2, TZc + c[1] * (TD / 2 - 2.6)); });
  bx(g, TW - 8, 0.8, 0.8, '#4a3322', 0, FLOOR + 4, TZc - TD / 2 + 2.6);
  K.contactShadow(T, g, -29.4, FLOOR + 0.04, TZ0 + 2.6, 7, 7, 0.5); K.contactShadow(T, g, 29.4, FLOOR + 0.04, TZ0 + 2.6, 7, 7, 0.5);
  var tableShadow = K.contactShadow(T, g, 0, 0.01, -1, 1, 1, 0.5);

  /* ---------- light: dim, cool and violet, with a warm key ---------- */
  g.add(new T.HemisphereLight(0x8d9ce0, 0x5b4636, 0.44));
  var key = new T.DirectionalLight(0xffe0bd, 0.26); key.position.set(-6, 16, 14); g.add(key);
  var fill = new T.DirectionalLight(0x8b92d8, 0.1); fill.position.set(10, 6, 16); g.add(fill);
  var over = new T.PointLight(0xffd2a6, 0.14, 70, 1.4); over.position.set(0, 22, -2); g.add(over);


  /* ---------- artwork: charts drawn from real star positions ---------- */
  function chartFrame(x, W, H, title, sub) {
    x.fillStyle = '#0d1a33'; x.fillRect(0, 0, W, H);
    var gr = x.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.75); gr.addColorStop(0, 'rgba(50,72,125,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#b79a58'; x.lineWidth = 6; x.strokeRect(14, 14, W - 28, H - 28); x.lineWidth = 2; x.strokeRect(28, 28, W - 56, H - 56);
    txt(x, title, 74, '#ecdba8', 'center', [W / 2, 84], { b: true });
    txt(x, sub, 32, '#b9c4e0', 'center', [W / 2, 142], { i: true });
  }
  function dot(x, cx, cy, mag, col) {
    var r = Math.max(3.4, 14.5 - mag * 2.7), gr = x.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
    gr.addColorStop(0, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
    x.fillStyle = col || '#f4efe0'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  }
  function figure(x, key, P, col, lw, wrapW) {
    x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round'; x.beginPath();
    FIG[key].forEach(function (pr) {
      var a = P(STAR[pr[0]]), b = P(STAR[pr[1]]);
      if (wrapW && Math.abs(a[0] - b[0]) > wrapW / 2) { var sg = a[0] < b[0] ? 1 : -1; x.moveTo(a[0], a[1]); x.lineTo(b[0] - sg * wrapW, b[1]); x.moveTo(a[0] + sg * wrapW, a[1]); x.lineTo(b[0], b[1]); } else { x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); }
    }); x.stroke();
  }
  function arrow(x, x0, y0, ang, len, col) {
    var x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len; x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 5; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    x.beginPath(); x.moveTo(x1, y1); x.lineTo(x1 - Math.cos(ang - 0.45) * 20, y1 - Math.sin(ang - 0.45) * 20); x.lineTo(x1 - Math.cos(ang + 0.45) * 20, y1 - Math.sin(ang + 0.45) * 20); x.closePath(); x.fill();
  }
  var PILL = 'rgba(11,22,44,0.86)', CREAM = '#efe6cf';

  var orionTex = K.canvasTex(T, 1280, 1056, function (x, W, H) {
    var s = 38, ra0 = 5.55, cx = 640, cy = 570, a, d;
    function P(st) { return [cx - (st[0] - ra0) * 15 * Math.cos(st[1] * D2R) * s, cy - st[1] * s]; }
    chartFrame(x, W, H, 'ORION  -  THE HUNTER', 'winter sky, north up, east left. Positions approximate.');
    x.strokeStyle = 'rgba(214,194,140,0.24)'; x.lineWidth = 2;
    [5, 6].forEach(function (ra) { x.beginPath(); for (d = -12; d <= 12; d += 2) { var q = P([ra, d]); if (d === -12) x.moveTo(q[0], q[1]); else x.lineTo(q[0], q[1]); } x.stroke(); var l = P([ra, 11.6]); txt(x, ra + 'h', 30, '#cdbd8a', 'center', [l[0], 178]); });
    [-10, 0, 10].forEach(function (dc) { var y = cy - dc * s; x.lineWidth = dc === 0 ? 3 : 2; x.beginPath(); x.moveTo(60, y); x.lineTo(1220, y); x.stroke(); txt(x, (dc > 0 ? '+' : dc < 0 ? '\u2212' : '') + Math.abs(dc) + '\u00b0', 28, '#cdbd8a', 'left', [62, y - 20]); });
    txt(x, 'celestial equator', 26, '#b9a878', 'right', [1214, cy + 22], { i: true });
    /* the Orion Nebula and the sword */
    var m = P([5.588, -5.39]), ng = x.createRadialGradient(m[0], m[1], 0, m[0], m[1], 62); ng.addColorStop(0, 'rgba(255,150,190,0.7)'); ng.addColorStop(0.5, 'rgba(190,100,170,0.28)'); ng.addColorStop(1, 'rgba(120,60,150,0)'); x.fillStyle = ng; x.fillRect(m[0] - 62, m[1] - 62, 124, 124);
    figure(x, 'shield', P, '#c9b57a', 3); figure(x, 'orion', P, '#d9c27c', 4);
    x.strokeStyle = '#d9c27c'; x.lineWidth = 3; x.beginPath(); var sw0 = P([5.59, -4.85]), sw1 = P([5.59, -5.9]); x.moveTo(sw0[0], sw0[1]); x.lineTo(sw1[0], sw1[1]); x.stroke();
    [-4.85, -5.39, -5.9].forEach(function (dc) { var q = P([5.59, dc]); dot(x, q[0], q[1], 3.2, '#f4efe0'); });
    var cols = { betelgeuse: '#ff9d62', rigel: '#a8c8ff', bellatrix: '#bdd2ff', saiph: '#a8c8ff', alnitak: '#b6ccff', alnilam: '#b6ccff', mintaka: '#b6ccff', meissa: '#c6d6ff', pi2: '#ffe6b0', pi3: '#f4efe0', pi4: '#ffe6b0', pi5: '#ffe6b0', pi6: '#ffe6b0' };
    for (a in cols) { var q2 = P(STAR[a]); dot(x, q2[0], q2[1], STAR[a][2], cols[a]); }
    function lab(name, text, ax, dx, dy, px, sub) { var q = P(STAR[name]); txt(x, text, px || 46, CREAM, ax, [q[0] + dx, q[1] + dy], { bg: PILL }); if (sub) txt(x, sub, 28, '#b9c4e0', ax, [q[0] + dx, q[1] + dy + 42], { i: true, bg: PILL }); }
    lab('betelgeuse', 'Betelgeuse', 'right', -26, -4, 46, 'red supergiant');
    lab('rigel', 'Rigel', 'left', 26, -4, 46, 'blue supergiant');
    lab('bellatrix', 'Bellatrix', 'right', -24, -6);
    lab('meissa', 'Meissa', 'left', 34, -8);
    lab('saiph', 'Saiph', 'right', -24, 0);
    lab('alnitak', 'Alnitak', 'right', -20, -2, 34);
    lab('mintaka', 'Mintaka', 'left', 44, -14, 34);
    var an = P(STAR.alnilam); txt(x, 'Alnilam', 34, CREAM, 'center', [an[0] + 16, an[1] + 72], { bg: PILL }); x.strokeStyle = 'rgba(239,230,207,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(an[0] + 4, an[1] + 14); x.lineTo(an[0] + 12, an[1] + 50); x.stroke();
    txt(x, 'Orion Nebula (M42)', 30, CREAM, 'center', [m[0], m[1] + 78], { bg: PILL });
    var pm = P(STAR.pi4); txt(x, "Orion's shield", 34, '#d9c9a0', 'right', [pm[0] - 40, pm[1] + 30], { i: true, bg: PILL });
    txt(x, 'Belt points to Sirius (down-left) and Aldebaran (up-right)', 28, '#cdbd8a', 'right', [1214, 1004], { i: true });
    /* compass */
    arrow(x, 1148, 960, -Math.PI / 2, 56, '#cdbd8a'); txt(x, 'N', 30, CREAM, 'center', [1148, 884]); arrow(x, 1148, 960, Math.PI, 56, '#cdbd8a'); txt(x, 'E', 30, CREAM, 'center', [1070, 958]);
    txt(x, 'Bigger dot = brighter star', 28, '#b9c4e0', 'left', [60, 1004], { i: true });
  });

  var polarTex = K.canvasTex(T, 1000, 1000, function (x, W, H) {
    var cx = 500, cy = 222, k = 16.6;
    /* looking north with the pole at the top: right ascension grows anticlockwise around Polaris */
    function P(st) { var r = (90 - st[1]) * k, ph = (270 + (st[0] - 12.4) * 15) * D2R; return [cx + r * Math.cos(ph), cy - r * Math.sin(ph)]; }
    chartFrame(x, W, H, 'FINDING POLARIS', 'looking north, pole star at the top. Positions approximate.');
    x.save(); x.beginPath(); x.rect(44, 176, W - 88, H - 232); x.clip();
    x.fillStyle = '#0a1530'; x.fillRect(44, 176, W - 88, H - 232);
    x.strokeStyle = 'rgba(214,194,140,0.26)'; x.lineWidth = 2;
    for (var d = 80; d >= 50; d -= 10) { x.beginPath(); x.arc(cx, cy, (90 - d) * k, 0, 7); x.stroke(); }
    var m = P(STAR.merak), po = P(STAR.polaris);
    x.strokeStyle = 'rgba(255,200,130,0.85)'; x.lineWidth = 3.5; x.setLineDash([14, 10]); x.beginPath(); x.moveTo(m[0], m[1]); x.lineTo(po[0], po[1]); x.stroke(); x.setLineDash([]);
    figure(x, 'dipper', P, '#d9c27c', 4.5); figure(x, 'little', P, '#9fc0e8', 4);
    ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid', 'polaris', 'yildun', 'epsUMi', 'zetUMi', 'etaUMi', 'pherkad', 'kochab'].forEach(function (n) { var q = P(STAR[n]); dot(x, q[0], q[1], STAR[n][2], '#f4efe0'); });
    function lab(n, text, ax, dx, dy, px) { var q = P(STAR[n]); txt(x, text, px || 38, CREAM, ax, [q[0] + dx, q[1] + dy], { bg: PILL }); }
    lab('dubhe', 'Dubhe', 'right', -24, 0); lab('merak', 'Merak', 'right', -24, 0); lab('phecda', 'Phecda', 'center', 0, 40); lab('megrez', 'Megrez', 'left', 12, -36, 32);
    lab('alioth', 'Alioth', 'center', 0, 40, 32); lab('mizar', 'Mizar', 'center', 12, -38, 32); lab('alkaid', 'Alkaid', 'left', 24, 4);
    lab('polaris', 'Polaris', 'right', -24, -4, 44); lab('kochab', 'Kochab', 'right', -24, 0, 34); lab('pherkad', 'Pherkad', 'left', 24, 4, 34);
    txt(x, 'URSA MINOR', 36, '#bcd2f0', 'center', [825, 300], { b: true, bg: PILL }); txt(x, 'the Little Dipper', 28, '#b9c4e0', 'center', [825, 342], { i: true, bg: PILL });
    x.restore();
    txt(x, 'URSA MAJOR  -  the Big Dipper', 38, '#ecdba8', 'center', [500, 922], { b: true, bg: PILL });
    txt(x, 'Merak and Dubhe point up to Polaris, ~5 times their gap', 28, '#ffd9a8', 'center', [500, 972 - 6], { i: true });
  });

  var wheelTex = K.canvasTex(T, 1024, 1024, function (x, W, H) {
    var cx = 512, cy = 512, k = 2.8, i2, h;
    function P(st) { var r = (90 - st[1]) * k, ph = (90 + st[0] * 15) * D2R; return [cx + r * Math.cos(ph), cy - r * Math.sin(ph)]; }
    x.fillStyle = '#071024'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#b39a5c'; x.beginPath(); x.arc(cx, cy, 506, 0, 7); x.fill();
    x.fillStyle = '#d6c58f'; x.beginPath(); x.arc(cx, cy, 486, 0, 7); x.fill();
    x.fillStyle = '#0d1a36'; x.beginPath(); x.arc(cx, cy, 426, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, 420, 0, 7); x.clip();
    x.strokeStyle = 'rgba(214,194,140,0.28)'; x.lineWidth = 2;
    [60, 30, 0, -30].forEach(function (dc) { x.beginPath(); x.arc(cx, cy, (90 - dc) * k, 0, 7); x.stroke(); });
    for (h = 0; h < 24; h++) { var ph = (90 + h * 15) * D2R; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 420 * Math.cos(ph), cy - 420 * Math.sin(ph)); x.stroke(); }
    x.strokeStyle = '#d9c27c'; x.lineWidth = 3.5; x.beginPath(); x.arc(cx, cy, 90 * k, 0, 7); x.stroke();
    x.strokeStyle = 'rgba(255,170,100,0.8)'; x.lineWidth = 3; x.setLineDash([14, 9]); x.beginPath();
    for (i2 = 0; i2 <= 96; i2++) { var ra = i2 / 4, dc2 = Math.atan(Math.tan(23.44 * D2R) * Math.sin(ra * 15 * D2R)) / D2R, q = P([ra, dc2]); if (i2) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); } x.stroke(); x.setLineDash([]);
    ['orion', 'shield', 'dipper', 'little', 'cass'].forEach(function (f) { figure(x, f, P, 'rgba(230,205,130,0.85)', 3.2); });
    var seen = {}; Object.keys(STAR).forEach(function (n) { var q = P(STAR[n]); dot(x, q[0], q[1], STAR[n][2] + 1.8, '#f4efe0'); });
    function nm(n, t, dx, dy, ax) { var q = P(STAR[n]); txt(x, t, 24, CREAM, ax || 'left', [q[0] + dx, q[1] + dy], { bg: PILL }); }
    nm('polaris', 'Polaris', 14, 22); nm('vega', 'Vega', 22, -6); nm('arcturus', 'Arcturus', 22, 0); nm('capella', 'Capella', 20, -28); nm('sirius', 'Sirius', 24, 6); nm('betelgeuse', 'Betelgeuse', 20, 26);
    nm('rigel', 'Rigel', -26, -18, 'right'); nm('procyon', 'Procyon', 22, 8); nm('deneb', 'Deneb', 22, 4); nm('altair', 'Altair', 22, 4); nm('aldebaran', 'Aldebaran', 22, -22);
    x.restore();
    for (h = 0; h < 24; h += 2) { var p3 = (90 + h * 15) * D2R, rr = 404; x.save(); x.translate(cx + rr * Math.cos(p3), cy - rr * Math.sin(p3)); x.rotate(Math.PI / 2 - p3); txt(x, h + 'h', 24, '#e2d3a2', 'center', [0, 0]); x.restore(); }
    /* the Sun's place on the first of each month (right ascension in hours), on the outer ring */
    var SUN = [18.7, 20.9, 22.8, 0.7, 2.6, 4.7, 6.7, 8.8, 10.7, 12.4, 14.4, 16.7], MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    x.strokeStyle = '#3a2c12'; x.lineWidth = 3;
    for (i2 = 0; i2 < 12; i2++) {
      var a0 = (90 + SUN[i2] * 15) * D2R, nxt = SUN[(i2 + 1) % 12] + (SUN[(i2 + 1) % 12] < SUN[i2] ? 24 : 0), am = (90 + (SUN[i2] + (nxt - SUN[i2]) / 2) * 15) * D2R;
      x.beginPath(); x.moveTo(cx + 430 * Math.cos(a0), cy - 430 * Math.sin(a0)); x.lineTo(cx + 484 * Math.cos(a0), cy - 484 * Math.sin(a0)); x.stroke();
      x.save(); x.translate(cx + 458 * Math.cos(am), cy - 458 * Math.sin(am)); x.rotate(Math.PI / 2 - am); txt(x, MON[i2], 36, '#2c2010', 'center', [0, 0], { b: true }); x.restore();
    }
    x.strokeStyle = '#3a2c12'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 486, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, 426, 0, 7); x.stroke();
  });

  /* mount a chart on the dome wall: a thin board held off the ribs on brass pins, face turned into the room */
  function wallPatch(az0, az1, y0, y1, off, tex, rgb) {
    var e0 = elOf(y0), e1 = elOf(y1);
    function pt(a, e) { var p = surf(a, e); return p.addScaledVector(inward(p), off); }
    var m = new T.Mesh(gridGeo(pt, az0, az1, 16, e0, e1, 8, function (a, e) { return [(a - az0) / (az1 - az0), (e - e0) / (e1 - e0)]; }),
      new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, color: rgb }));
    m.userData.keep = true; g.add(m); return m;
  }
  function hang(tex, w, h, az, y) {
    var wl = wallAt(az, y), grp = new T.Group();
    grp.position.copy(wl.p).addScaledVector(wl.n, 1.5); grp.lookAt(wl.p.clone().addScaledVector(wl.n, 3)); g.add(grp);
    bx(grp, w + 1, h + 1, 0.5, '#3d2b1c', 0, 0, 0.25);
    var c = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, color: new T.Color(0.86, 0.84, 0.82) })); c.position.z = 0.56; grp.add(c);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var pin = cy(grp, 0.22, 0.22, 1.5, '#9a7436', q[0] * (w / 2 + 0.15), q[1] * (h / 2 + 0.15), -0.75); pin.rotation.x = HALF; });
    return grp;
  }
  hang(orionTex, 13.6, 11.2, 11 * D2R, 11.2);
  hang(polarTex, 10.6, 10.6, 21.3 * D2R, 11.2);
  hang(wheelTex, 9.6, 9.6, -32 * D2R, 11.2);


  /* a 24-hour sidereal clock above the middle of the wall */
  var clockTex = K.canvasTex(T, 512, 512, function (x, W, H) {
    var cx = 256, cy2 = 256, n, a;
    x.fillStyle = '#0d1a33'; x.beginPath(); x.arc(cx, cy2, 250, 0, 7); x.fill();
    x.strokeStyle = '#b79a58'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy2, 238, 0, 7); x.stroke();
    for (n = 0; n < 96; n++) { a = n / 96 * Math.PI * 2; var big = n % 4 === 0; x.strokeStyle = big ? '#efe6cf' : 'rgba(239,230,207,0.5)'; x.lineWidth = big ? 4 : 2; x.beginPath(); x.moveTo(cx + Math.sin(a) * (big ? 196 : 210), cy2 - Math.cos(a) * (big ? 196 : 210)); x.lineTo(cx + Math.sin(a) * 226, cy2 - Math.cos(a) * 226); x.stroke(); }
    for (n = 1; n <= 24; n++) { a = n / 24 * Math.PI * 2; txt(x, String(n), 34, '#efe6cf', 'center', [cx + Math.sin(a) * 166, cy2 - Math.cos(a) * 166], { b: true }); }
    txt(x, 'SIDEREAL', 24, '#b9c4e0', 'center', [cx, cy2 + 70], { i: true });
    var th = 21.17 / 24 * Math.PI * 2, tm = 10 / 60 * Math.PI * 2;
    x.lineCap = 'round'; x.strokeStyle = '#d9c27c'; x.lineWidth = 12; x.beginPath(); x.moveTo(cx, cy2); x.lineTo(cx + Math.sin(th) * 100, cy2 - Math.cos(th) * 100); x.stroke();
    x.lineWidth = 7; x.beginPath(); x.moveTo(cx, cy2); x.lineTo(cx + Math.sin(tm) * 150, cy2 - Math.cos(tm) * 150); x.stroke();
    x.fillStyle = '#d9c27c'; x.beginPath(); x.arc(cx, cy2, 12, 0, 7); x.fill();
  });
  var ck = wallAt(-0.5 * D2R, 14.4), ckg = new T.Group(); ckg.position.copy(ck.p).addScaledVector(ck.n, 1.5); ckg.lookAt(ck.p.clone().addScaledVector(ck.n, 3)); g.add(ckg);
  var bz = cy(ckg, 3.6, 3.6, 0.6, brassC, 0, 0, 0.3, 0.8, 40); bz.rotation.x = HALF;
  var dial = new T.Mesh(new T.CircleGeometry(3.2, 48), new T.MeshBasicMaterial({ map: clockTex, color: new T.Color(0.85, 0.83, 0.82) })); dial.position.z = 0.64; ckg.add(dial);
  var ckp = cy(ckg, 0.6, 0.6, 1.5, brassC, 0, 0, -0.75, 0.8, 12); ckp.rotation.x = HALF;

  /* ---------- refractor on a German equatorial mount, on a steel pier behind the desk ---------- */
  var PX = -24, PZ = -12.4, PH = 19, steel = '#59627e', dark = '#2e344f', ivory = '#d9d2c0';
  var scope = new T.Group(); scope.position.set(PX, FLOOR, PZ); g.add(scope);
  cy(scope, 3.4, 3.4, 0.7, dark, 0, 0.35, 0, 0.8, 28);
  cy(scope, 1.7, 2.2, PH - 1.2, dark, 0, 0.7 + (PH - 1.2) / 2, 0, 0.8, 24);
  cy(scope, 2.1, 2.1, 0.3, '#3c4262', 0, 3.2, 0, 0.8, 24); cy(scope, 1.85, 1.85, 0.3, '#3c4262', 0, PH - 3.2, 0, 0.8, 24);
  cy(scope, 2.7, 2.7, 0.5, steel, 0, PH - 0.25, 0, 0.8, 24);
  bx(scope, 4.4, 1.4, 4.4, steel, 0, PH + 0.7, 0);
  K.contactShadow(T, g, PX, FLOOR + 0.04, PZ, 9.5, 9.5, 0.6);
  var lat = 40 * D2R, A = new T.Vector3(Math.cos(lat), Math.sin(lat), 0), Tt = new T.Vector3(Math.cos(52 * D2R), Math.sin(52 * D2R), 0);
  var Dv = new T.Vector3().crossVectors(A, Tt).normalize(); if (Dv.z < 0) Dv.negate();
  var Ez = new T.Vector3().crossVectors(Dv, A), delta = Math.atan2(Tt.dot(Ez), Tt.dot(A));
  var head = new T.Group(); head.position.set(0, PH + 1.4, 0).addScaledVector(A, 7); head.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(Dv, A, Ez)); scope.add(head);
  var ra = cy(head, 1.3, 1.5, 7, steel, 0, -3.5, 0, 0.8, 24);
  cy(head, 1.8, 1.8, 0.35, brassC, 0, -2.4, 0, 0.8, 28); cy(head, 1.55, 1.55, 0.5, dark, 0, -7.1, 0, 0.8, 24);
  bx(head, 2.8, 2.8, 2.8, steel, 0, 0, 0);
  var dec = cy(head, 1.25, 1.25, 6.4, steel, 0, 0, 0, 0.8, 24); dec.rotation.z = HALF;
  [-1, 1].forEach(function (sd) { var cp = cy(head, 1.5, 1.5, 0.4, dark, sd * 3.4, 0, 0, 0.8, 24); cp.rotation.z = HALF; });
  var dcirc = cy(head, 1.7, 1.7, 0.18, brassC, 3.75, 0, 0, 0.8, 28); dcirc.rotation.z = HALF;
  bx(head, 0.5, 9, 1.7, dark, 3.95, 3.0, 0);
  var tg = new T.Group(); tg.position.set(5.5, 0, 0); tg.rotation.x = delta; head.add(tg);
  cy(tg, 1.25, 1.25, 15, ivory, 0, 0.5, 0, 0.8, 28);
  cy(tg, 1.5, 1.5, 4.5, '#cfc7b3', 0, 10.25, 0, 0.8, 28); cy(tg, 1.56, 1.56, 0.4, brassC, 0, 8.1, 0, 0.8, 28);
  cy(tg, 1.3, 1.3, 0.12, '#0a0c16', 0, 12.3, 0, 0.9, 24);
  cy(tg, 1.55, 1.55, 0.3, '#2b2f46', 0, 12.4, 0, 0.8, 28);
  [-1.4, 4.6].forEach(function (yy) { var rg = new T.Mesh(new T.TorusGeometry(1.42, 0.2, 8, 28), M('#2b2f46')); rg.rotation.x = HALF; rg.position.y = yy; tg.add(rg); });
  cy(tg, 0.85, 0.85, 3.2, brassC, 0, -8.6, 0, 0.8, 20); cy(tg, 1.05, 1.05, 1.1, '#2b2f46', 0, -7.5, 0, 0.8, 20);
  [-1, 1].forEach(function (sd) { var kb = cy(tg, 0.4, 0.4, 0.5, '#171a2a', sd * 1.3, -7.7, 0, 0.8, 14); kb.rotation.z = HALF; });
  bx(tg, 1.3, 1.3, 1.3, '#171a2a', 0, -10.5, 0); var ep = cy(tg, 0.45, 0.45, 2.4, '#171a2a', 0, -10.5, -1.9, 0.8, 14); ep.rotation.x = HALF; var ep2 = cy(tg, 0.55, 0.55, 0.3, brassC, 0, -10.5, -3.2, 0.8, 14); ep2.rotation.x = HALF;
  cy(tg, 0.42, 0.42, 5.4, ivory, 0, 4.6, 2.5, 0.8, 16); cy(tg, 0.6, 0.6, 0.9, '#2b2f46', 0, 7.1, 2.5, 0.8, 16); cy(tg, 0.5, 0.5, 0.5, '#171a2a', 0, 1.7, 2.5, 0.8, 16);
  bx(tg, 0.3, 0.3, 1.6, '#2b2f46', 0, 2.8, 1.7); bx(tg, 0.3, 0.3, 1.6, '#2b2f46', 0, 6.0, 1.7);
  var cb = new T.Group(); cb.position.set(-3.8, 0, 0); cb.rotation.x = delta + Math.PI; head.add(cb);
  cy(cb, 0.35, 0.35, 7.8, steel, 0, 3.9, 0, 0.8, 14); cy(cb, 1.7, 1.7, 1.0, '#2c3048', 0, 3.0, 0, 0.8, 28); cy(cb, 1.7, 1.7, 1.0, '#2c3048', 0, 4.3, 0, 0.8, 28); cy(cb, 0.7, 0.7, 0.4, brassC, 0, 7.8, 0, 0.8, 16);
  var boss = cy(head, 0.6, 0.6, 0.6, dark, -3.6, 0, 0, 0.8, 14); boss.rotation.z = HALF;

  /* ---------- the red lamp: a lantern with red glass, and the flat glow it throws ---------- */
  var LX = 15.4, LZ = -5.8, lamp = new T.Group(); lamp.position.set(LX, 0, LZ); g.add(lamp);
  cy(lamp, 1.45, 1.55, 0.45, '#7a5a2a', 0, 0.22, 0, 0.8, 28); cy(lamp, 1.1, 1.3, 0.5, brassC, 0, 0.7, 0, 0.8, 28);
  var glass = cy(lamp, 0.95, 0.95, 2.6, '#ff3b24', 0, 2.25, 0, 0.9, 28); glass.material = new T.MeshBasicMaterial({ color: new T.Color(1, 0.24, 0.14) });
  for (i = 0; i < 4; i++) cy(lamp, 0.08, 0.08, 2.7, brassC, Math.cos(i * HALF + 0.78) * 1.0, 2.25, Math.sin(i * HALF + 0.78) * 1.0, 0.8, 8);
  cy(lamp, 1.15, 1.15, 0.22, brassC, 0, 3.7, 0, 0.8, 28); cy(lamp, 0.22, 1.05, 0.8, brassC, 0, 4.2, 0, 0.8, 28);
  var ring = new T.Mesh(new T.TorusGeometry(0.4, 0.07, 8, 20), M(brassC)); ring.position.y = 4.85; lamp.add(ring);
  K.contactShadow(T, g, LX, 0.02, LZ, 4.2, 4.2, 0.6);
  var pool = pointTex(T, 128, '255,70,40', 0.55);
  var tp = new T.Mesh(new T.PlaneGeometry(22, 14), new T.MeshBasicMaterial({ map: pool, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.55 }));
  tp.rotation.x = -HALF; tp.position.set(LX, 0.06, LZ + 1); tp.userData.keep = true; g.add(tp);
  var lw = Math.asin(LX / AX);
  wallPatch(lw - 16 * D2R, lw + 18 * D2R, 1.5, 18, 2.6, pointTex(T, 128, '255,66,36', 0.5), new T.Color(0.7, 0.7, 0.7));


  /* ---------- a celestial globe on a wooden stand ---------- */
  var globeTex = K.canvasTex(T, 1024, 512, function (x, W, H) {
    var n, d, h;
    function P(st) { return [st[0] / 24 * W, (0.5 - st[1] / 180) * H]; }
    var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#18265a'); gr.addColorStop(0.5, '#1c2c66'); gr.addColorStop(1, '#18265a'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(210,190,130,0.32)'; x.lineWidth = 1.5;
    for (h = 0; h < 24; h += 2) { x.beginPath(); x.moveTo(h / 24 * W, 0); x.lineTo(h / 24 * W, H); x.stroke(); }
    for (d = -60; d <= 60; d += 30) { x.beginPath(); x.moveTo(0, (0.5 - d / 180) * H); x.lineTo(W, (0.5 - d / 180) * H); x.stroke(); }
    x.strokeStyle = '#e0c47c'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
    x.strokeStyle = 'rgba(255,170,100,0.85)'; x.lineWidth = 3; x.beginPath();
    for (n = 0; n <= 120; n++) { var rr = n / 5, dd = Math.atan(Math.tan(23.44 * D2R) * Math.sin(rr * 15 * D2R)) / D2R, q = P([rr, dd]); if (n) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); } x.stroke();
    ['orion', 'shield', 'dipper', 'little', 'cass'].forEach(function (f) { figure(x, f, P, 'rgba(235,212,140,0.9)', 3.5, W); });
    Object.keys(STAR).forEach(function (nm) { var q = P(STAR[nm]); dot(x, q[0], q[1], STAR[nm][2] + 2.4, '#f4efe0'); });
    function nm2(t, st, dx, dy) { var q = P(st); txt(x, t, 26, '#efe6cf', 'center', [q[0] + dx, q[1] + dy], { bg: 'rgba(14,24,60,0.7)' }); }
    nm2('ORION', STAR.alnilam, 0, -50); nm2('URSA MAJOR', STAR.megrez, 0, 42); nm2('CASSIOPEIA', STAR.gammaCas, 0, -30); nm2('Sirius', STAR.sirius, 0, 34);
  });
  var gl = new T.Group(); gl.position.set(22.6, 0, -2.0); g.add(gl);
  cy(gl, 4.6, 4.8, 0.5, '#4a3322', 0, 0.25, 0, 0.8, 36);
  for (i = 0; i < 4; i++) { var la = i * HALF + 0.785; cy(gl, 0.3, 0.36, 6.2, '#4a3322', Math.cos(la) * 3.95, 3.6, Math.sin(la) * 3.95, 0.8, 12); }
  var hz = new T.Mesh(new T.RingGeometry(3.2, 4.6, 48), new T.MeshStandardMaterial({ color: '#5a4029', roughness: 0.85, side: T.DoubleSide })); hz.rotation.x = -HALF; hz.position.y = 7.0; gl.add(hz);
  var hz2 = new T.Mesh(new T.RingGeometry(3.5, 4.2, 48), new T.MeshBasicMaterial({ color: new T.Color(0.6, 0.5, 0.33), side: T.DoubleSide })); hz2.rotation.x = -HALF; hz2.position.y = 7.04; gl.add(hz2);
  var gc = new T.Group(); gc.position.y = 7.0; gl.add(gc);
  var mer = new T.Mesh(new T.TorusGeometry(3.4, 0.13, 8, 64), M(brassC)); gc.add(mer);
  var inner = new T.Group(); inner.rotation.z = -23.4 * D2R; gc.add(inner);
  var sph = new T.Mesh(new T.SphereGeometry(2.9, 48, 32), new T.MeshStandardMaterial({ map: globeTex, roughness: 0.85, metalness: 0 })); sph.rotation.y = 3.6; inner.add(sph);
  cy(inner, 0.1, 0.1, 6.8, brassC, 0, 0, 0, 0.8, 10); cy(inner, 0.24, 0.24, 0.3, brassC, 0, 3.4, 0, 0.8, 14); cy(inner, 0.24, 0.24, 0.3, brassC, 0, -3.4, 0, 0.8, 14);
  K.contactShadow(T, g, 22.6, 0.02, -2.0, 11.5, 11.5, 0.55);

  /* ---------- notebooks, an open log, a mug ---------- */
  function notebook(p, w, h, d, cover, ry, x, y, z) {
    var nb = new T.Group(); nb.position.set(x, y, z); nb.rotation.y = ry; p.add(nb);
    bx(nb, w, h, d, cover, 0, h / 2, 0); bx(nb, w - 0.5, h - 0.14, d - 0.3, '#d9d0b8', 0.12, h / 2, 0);
    return nb;
  }
  var stack = new T.Group(); stack.position.set(-20.5, 0, -1.6); stack.scale.setScalar(0.78); g.add(stack);
  notebook(stack, 4.6, 0.56, 6.2, '#6a2a30', 0.18, 0, 0, 0); notebook(stack, 4.3, 0.5, 5.8, '#27493b', -0.1, 0.1, 0.56, 0.1);
  notebook(stack, 4.1, 0.46, 5.5, '#26335a', 0.12, -0.1, 1.06, 0); var top = notebook(stack, 3.9, 0.42, 5.2, '#8b6a43', -0.06, 0, 1.52, 0.05);
  var plaque = K.canvasTex(T, 256, 128, function (x, W, H) { x.fillStyle = '#d9d0b8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#7a5a2a'; x.lineWidth = 4; x.strokeRect(6, 6, W - 12, H - 12); txt(x, 'OBSERVING', 36, '#2a2418', 'center', [W / 2, 48], { b: true }); txt(x, 'LOG', 36, '#2a2418', 'center', [W / 2, 90], { b: true }); });
  var pl = new T.Mesh(new T.PlaneGeometry(2.2, 1.1), new T.MeshBasicMaterial({ map: plaque, color: new T.Color(0.8, 0.78, 0.76) })); pl.rotation.x = -HALF; pl.position.set(0.1, 1.95, 0.05); top.add(pl); pl.position.set(0.1, 0.45, 0.05);
  K.contactShadow(T, g, -20.5, 0.02, -1.6, 6.6, 7.2, 0.55);
  var logTex = K.canvasTex(T, 640, 400, function (x, W, H) {
    x.fillStyle = '#ddd4bc'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(70,50,30,0.35)'; x.fillRect(W / 2 - 3, 0, 6, H);
    x.strokeStyle = 'rgba(70,90,140,0.4)'; x.lineWidth = 1.5; for (var ln = 70; ln < H - 20; ln += 34) { x.beginPath(); x.moveTo(24, ln); x.lineTo(W / 2 - 14, ln); x.moveTo(W / 2 + 14, ln); x.lineTo(W - 24, ln); x.stroke(); }
    txt(x, 'Object', 26, '#3a2c1a', 'left', [30, 40], { b: true }); txt(x, 'Seeing', 26, '#3a2c1a', 'right', [W / 2 - 20, 40], { b: true }); txt(x, 'Object', 26, '#3a2c1a', 'left', [W / 2 + 30, 40], { b: true }); txt(x, 'Seeing', 26, '#3a2c1a', 'right', [W - 30, 40], { b: true });
    var rows = [['M42 Orion Nebula', '4/5'], ['M45 Pleiades', '3/5'], ['M31 Andromeda Galaxy', '3/5'], ['M13 Hercules cluster', '4/5'], ['M44 Beehive cluster', '2/5'], ['Saturn', '4/5']];
    rows.forEach(function (rw, ri) { var col = ri < 3 ? 0 : 1, yy = 76 + (ri % 3) * 34 * 2; txt(x, rw[0], 22, '#2e3f78', 'left', [col ? W / 2 + 30 : 30, yy - 6], { i: true }); txt(x, rw[1], 22, '#2e3f78', 'right', [col ? W - 30 : W / 2 - 20, yy - 6], { i: true }); });
  });
  var lg = new T.Group(); lg.position.set(-19.2, 0, 6.2); lg.rotation.y = -0.22; lg.scale.setScalar(0.8); g.add(lg);
  bx(lg, 11.4, 0.3, 7.6, '#3a2230', 0, 0.15, 0); bx(lg, 5.3, 0.22, 7.2, '#d9d0b8', -2.7, 0.41, 0); bx(lg, 5.3, 0.22, 7.2, '#d9d0b8', 2.7, 0.41, 0);
  var lp = new T.Mesh(new T.PlaneGeometry(10.6, 6.6), new T.MeshBasicMaterial({ map: logTex, color: new T.Color(0.78, 0.74, 0.72) })); lp.rotation.x = -HALF; lp.position.y = 0.55; lg.add(lp);
  var pen = cy(lg, 0.12, 0.12, 3.0, '#c9a43a', 2.2, 0.75, 1.0, 0.8, 8); pen.rotation.z = HALF; pen.rotation.y = 0.5; var pn = cy(lg, 0.12, 0.0, 0.5, '#2a2418', 3.85, 0.75, 1.36, 0.8, 8); pn.rotation.z = -HALF; pn.rotation.y = 0.5;
  K.contactShadow(T, g, -19.2, 0.02, 6.2, 11.5, 8, 0.5);
  var mug = K.mugProp(T); mug.position.set(-27.2, -0.03, 3.8); mug.rotation.y = 0.7; mug.scale.setScalar(1.15); g.add(mug); K.contactShadow(T, g, -27.2, 0.02, 3.8, 3.2, 3.2, 0.5);

  /* binoculars and a rolled chart on the right-hand end of the desk */
  var bn = new T.Group(); bn.position.set(27.4, 0, 6.6); bn.rotation.y = 0.5; bn.scale.setScalar(0.7); g.add(bn);
  [-1, 1].forEach(function (sd) {
    var br = cy(bn, 0.85, 0.85, 3.8, '#1d2030', sd * 1.1, 1.0, 0, 0.8, 18); br.rotation.x = HALF;
    var ob = cy(bn, 1.15, 1.0, 1.5, '#161926', sd * 1.1, 1.05, 2.5, 0.8, 18); ob.rotation.x = HALF;
    var oc = cy(bn, 0.62, 0.7, 1.2, '#161926', sd * 1.1, 1.0, -2.3, 0.8, 14); oc.rotation.x = HALF; cy(bn, 0.5, 0.5, 0.2, brassC, sd * 1.1, 1.0, 3.3, 0.8, 14).rotation.x = HALF;
  });
  bx(bn, 1.5, 0.45, 2.0, '#272b3e', 0, 1.1, 0.2); cy(bn, 0.4, 0.4, 0.6, brassC, 0, 1.4, 0.3, 0.8, 12);
  K.contactShadow(T, g, 27.4, 0.02, 6.6, 4.4, 6, 0.5);
  var roll = cy(g, 0.6, 0.6, 5.2, '#b9ac8a', 28.4, 0.6, -6.6, 0.9, 16); roll.rotation.z = HALF; roll.rotation.y = 0.35; K.contactShadow(T, g, 28.4, 0.02, -6.6, 6.4, 3, 0.45);

  /* ---------- low cabinet against the wall behind the desk, with an eyepiece case and books ---------- */
  var CB = new T.Group(); CB.position.set(22, FLOOR, -13.4); g.add(CB);
  bx(CB, 20, 15, 4, '#4b3425', 0, 7.5, 0); bx(CB, 20.6, 0.5, 4.6, '#5b402b', 0, 15.2, 0);
  for (i = 0; i < 3; i++) { bx(CB, 6.1, 4.4, 0.25, '#5a3f2a', -6.6 + i * 6.6, 11.6, 2.05); bx(CB, 6.1, 4.4, 0.25, '#523824', -6.6 + i * 6.6, 6.3, 2.05); cy(CB, 0.22, 0.22, 0.4, brassC, -6.6 + i * 6.6, 11.6, 2.35, 0.8, 10).rotation.x = HALF; cy(CB, 0.22, 0.22, 0.4, brassC, -6.6 + i * 6.6, 6.3, 2.35, 0.8, 10).rotation.x = HALF; }
  var CY = FLOOR + 15.45;
  var ec = new T.Group(); ec.position.set(-3.6, CY - FLOOR, 0.2); CB.add(ec);
  bx(ec, 5.8, 1.5, 3.4, '#6a4a2e', 0, 0.75, 0); bx(ec, 5.9, 0.16, 3.5, '#3f2b1a', 0, 1.5, 0); bx(ec, 5.9, 0.16, 3.5, '#3f2b1a', 0, 0.45, 0);
  [-1.6, 1.6].forEach(function (lx) { bx(ec, 0.5, 0.7, 0.14, brassC, lx, 0.95, 1.74); }); bx(ec, 1.2, 0.2, 0.5, brassC, 0, 1.75, 0);
  var bk = [['#7a2f35', 4.6, 0.8], ['#2d4b44', 4.2, 0.7], ['#2e3a66', 4.4, 0.9], ['#8b6a43', 3.9, 0.6]];
  var by = CY - FLOOR; bk.forEach(function (b, bi) { var yy = by + b[2] / 2 + bk.slice(0, bi).reduce(function (a, c) { return a + c[2]; }, 0); var bk1 = bx(CB, b[1], b[2], 3.2, b[0], 5.0 + (bi % 2) * 0.25, yy, 0.3, 0.8); bk1.rotation.y = (bi - 1.5) * 0.08; var pg = bx(CB, b[1] - 0.4, b[2] - 0.15, 3.0, '#d9d0b8', 5.2 + (bi % 2) * 0.25, yy, 0.35, 0.9); pg.rotation.y = bk1.rotation.y; });
  var cr = cy(CB, 0.55, 0.55, 5.4, '#b3a684', -9.6 + 0.0, by + 0.55, 0.5, 0.9, 14); cr.rotation.z = HALF; cr.rotation.y = 0.15;
  var cr2 = cy(CB, 0.5, 0.5, 4.6, '#a99c7a', -8.9, by + 1.6, 0.4, 0.9, 14); cr2.rotation.z = HALF; cr2.rotation.y = 0.05;

  /* a navy leather desk mat under the model, stitched in brass */
  var matTex = K.canvasTex(T, 512, 320, function (x, W, H) {
    x.fillStyle = '#3f222b'; x.fillRect(0, 0, W, H);
    for (var q = 0; q < 900; q++) { x.fillStyle = 'rgba(' + (q % 2 ? '255,255,255' : '0,0,0') + ',0.03)'; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    x.strokeStyle = '#a07a38'; x.lineWidth = 2.5; x.setLineDash([9, 6]); x.strokeRect(14, 14, W - 28, H - 28); x.setLineDash([]);
  });
  var dmat = new T.Mesh(new T.PlaneGeometry(27, 22), new T.MeshBasicMaterial({ map: matTex, color: new T.Color(0.8, 0.8, 0.85) })); dmat.rotation.x = -HALF; dmat.position.set(0, 0.004, 3.5); g.add(dmat);


  /* fewer draw calls: bake every static mesh that shares a material into one */
  (function () {
    g.updateMatrixWorld(true);
    var buckets = {}, order = [];
    g.traverse(function (o) {
      if (!o.isMesh || o.userData.keep || Array.isArray(o.material)) return;
      var key = o.material.uuid + '|' + o.renderOrder; if (!buckets[key]) { buckets[key] = []; order.push(key); } buckets[key].push(o);
    });
    order.forEach(function (key) {
      var list = buckets[key], pos = [], nor = [], uv = [];
      if (list.length < 2) return;
      list.forEach(function (m) {
        var geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(), cnt = geo.attributes.position.count, k2;
        geo.applyMatrix4(m.matrixWorld);
        for (k2 = 0; k2 < cnt * 3; k2++) { pos.push(geo.attributes.position.array[k2]); nor.push(geo.attributes.normal.array[k2]); }
        for (k2 = 0; k2 < cnt * 2; k2++) uv.push(geo.attributes.uv ? geo.attributes.uv.array[k2] : 0);
        m.parent.remove(m); m.geometry.dispose(); geo.dispose();
      });
      var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); bg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      var mm = new T.Mesh(bg, list[0].material); mm.renderOrder = list[0].renderOrder; g.add(mm);
    });
  })();

  return { group: g, shadow: tableShadow, update: function (t, dt) {} };
};
})();
