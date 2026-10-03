/* Room "hangar" for the aerospace subject: a mission room inside an aircraft hangar.
 * Concrete floor with painted safety lines, light grey-blue cladding, a big hangar-door window onto an airfield at golden hour,
 * scale airliner and rocket on a counter, a blueprint, two telemetry screens, a red toolbox, a tool cart and traffic cones.
 * Concrete grey, safety orange, white and a little steel blue. Local y = 0 is the table top, the floor is at y = -13.
 * Static geometry is baked into a few vertex-coloured meshes so the whole room stays well under the draw-call budget. */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
var PI = Math.PI, FLOOR = -13, CT = 1.6;               /* CT: counter top height */
var mulberry = K.mulberry, contactShadow = K.contactShadow;

var WIN = { x0: 2, x1: 40, y0: 2.8, y1: 26 };            /* the hangar-door opening in the back wall */
var GY = -2;                                             /* airfield ground height outside */

/* canvas texture; mip = true for power-of-two sheets that are seen at a grazing angle */
function tex(T, w, h, draw, mip, wrapS) {
  var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  var t = new T.CanvasTexture(c);
  if (mip) { t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; } else { t.generateMipmaps = false; t.minFilter = T.LinearFilter; }
  if (wrapS) t.wrapS = T.RepeatWrapping;
  return t;
}
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* ---------- baking: many boxes / lathes / extrusions into one vertex-coloured mesh ---------- */
function makeBake(T) {
  var pos = [], nor = [], col = [], stack = [new T.Matrix4()], c = new T.Color(), v = new T.Vector3(), n = new T.Vector3(), lv = new T.Vector3(), ln = new T.Vector3();
  var nm = new T.Matrix3(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
  var UB = new T.BoxGeometry(1, 1, 1), B = { tint: null };
  B.mx = function (x, y, z, rx, ry, rz, sx, sy, sz) {
    e.set(rx || 0, ry || 0, rz || 0, 'XYZ'); q.setFromEuler(e);
    return new T.Matrix4().compose(p.set(x, y, z), q, s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
  };
  B.push = function (m) { stack.push(stack[stack.length - 1].clone().multiply(m)); };
  B.pop = function () { stack.pop(); };
  /* color: a hex, or function (localX, localY, localZ, localNx, localNy, localNz) -> hex */
  B.add = function (geo, m, color) {
    var gm = stack[stack.length - 1].clone().multiply(m), g2 = geo.__ni || (geo.__ni = geo.index ? geo.toNonIndexed() : geo);
    var pa = g2.attributes.position, na = g2.attributes.normal, i;
    nm.getNormalMatrix(gm);
    for (i = 0; i < pa.count; i++) {
      lv.fromBufferAttribute(pa, i); ln.fromBufferAttribute(na, i);
      v.copy(lv).applyMatrix4(gm); n.copy(ln).applyMatrix3(nm).normalize();
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z);
      if (typeof color === 'function') c.set(color(lv.x, lv.y, lv.z, ln.x, ln.y, ln.z)); else c.set(color);
      if (B.tint) B.tint(c, v, n);
      col.push(c.r, c.g, c.b);
    }
  };
  B.box = function (w, h, d, x, y, z, color, rx, ry, rz) { B.add(UB, B.mx(x, y, z, rx, ry, rz, w, h, d), color); };
  B.cyl = function (rt, rb, h, x, y, z, color, rx, ry, rz, seg) { B.add(new T.CylinderGeometry(rt, rb, h, seg || 16), B.mx(x, y, z, rx, ry, rz), color); };
  B.mesh = function (material) {
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return new T.Mesh(geo, material);
  };
  return B;
}

/* golden-hour grading for everything outdoors: the sun sits low behind the hangars on the right, so faces toward the viewer are in
   cool shade and faces toward +x catch warm light. Distance adds haze. */
function outdoorTint(T) {
  var warm = new T.Color('#ffd5a0'), cool = new T.Color('#7a86a8'), haze = new T.Color('#e8bb92'), L = new T.Vector3(0.62, 0.22, -0.75).normalize(), tmp = new T.Color();
  return function (c, v, n) {
    var d = Math.max(0, n.x * L.x + n.y * L.y + n.z * L.z);
    tmp.copy(cool).lerp(warm, 0.3 + 0.7 * d); c.multiply(tmp).multiplyScalar(0.9 + 0.5 * d);
    c.lerp(haze, clamp((-v.z - 30) / 130, 0, 0.75));
  };
}

/* an outline pulled into a thin slab: pts = [[x, y], ...] in the xy plane, centred on z = 0 */
function slab(T, pts, thick) {
  var sh = new T.Shape(), i; sh.moveTo(pts[0][0], pts[0][1]);
  for (i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  var g = new T.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false }); g.translate(0, 0, -thick / 2); return g;
}
function lathePts(T, fn, y0, y1, n, cap0, cap1) {
  var pts = [], i, y;
  if (cap0) pts.push(new T.Vector2(0, y0));
  for (i = 0; i <= n; i++) { y = y0 + (y1 - y0) * i / n; pts.push(new T.Vector2(fn(y), y)); }
  if (cap1) pts.push(new T.Vector2(0, y1));
  return pts;
}

/* ---------- scale models ---------- */

/* twin-jet airliner, nose toward +x, centred on the origin, 9.6 long. Matte white, a blue and an orange cheat line, orange fin cap. */
function addJet(T, B, D, c) {
  var L = 9.6, h = L / 2, R0 = 0.9, i, s, sd;
  function rf(y) {
    var u = (y + h) / L;
    if (u < 0.3) { s = u / 0.3; return R0 * (0.14 + 0.86 * Math.pow(s, 0.85)); }
    if (u < 0.78) return R0;
    s = (u - 0.78) / 0.22; return R0 * Math.pow(Math.max(0, 1 - s * s), 0.55);
  }
  var fus = B.mx(0, 0, 0, 0, 0, -PI / 2);
  B.add(new T.LatheGeometry(lathePts(T, rf, -h, h, 48, true, false), 32), fus, c.white);
  /* a tail band and a nose band, as thin shells that follow the body. D is the detail layer: its material is pulled slightly toward
     the camera so decals never z-fight the surface they sit on (the stage's composer only has a 16-bit depth buffer). */
  D.add(new T.LatheGeometry(lathePts(T, function (y) { return rf(y) + 0.012; }, -3.9, -3.55, 4), 32), fus, c.orange);
  D.add(new T.LatheGeometry(lathePts(T, function (y) { return rf(y) + 0.012; }, 3.15, 3.4, 4), 32), fus, c.blue);
  for (sd = -1; sd <= 1; sd += 2) {
    var ya = 0.2, yb = -0.1;
    D.box(4.5, 0.2, 0.02, -0.5, ya, sd * (Math.sqrt(R0 * R0 - ya * ya) + 0.004), c.blue, -sd * Math.asin(ya / R0));
    D.box(4.5, 0.07, 0.02, -0.5, yb, sd * (Math.sqrt(R0 * R0 - yb * yb) + 0.004), c.orange, -sd * Math.asin(yb / R0));
    for (i = 0; i < 11; i++) {   /* passenger windows */
      var wx = -2.2 + i * 0.37, wy = 0.42, ph = Math.asin(wy / R0);
      D.box(0.15, 0.19, 0.03, wx, wy, sd * (Math.sqrt(R0 * R0 - wy * wy) + 0.006), c.dark, -sd * ph);
    }
    for (i = 0; i < 2; i++) {    /* cockpit windows, following the nose taper */
      var cx = 2.9 + i * 0.4, cr = rf(cx), cy = 0.3, cph = Math.asin(cy / cr);
      D.box(0.3, 0.17, 0.03, cx, cy, sd * (Math.sqrt(cr * cr - cy * cy) + 0.008), c.dark, -sd * cph, sd * -0.32);
    }
  }
  /* swept wings with a little dihedral, engines under them */
  var wing = slab(T, [[1.7, 0.55], [0.1, 0.55], [-1.05, 3.9], [-0.65, 3.9]], 0.12), wingL = slab(T, [[1.7, -0.55], [-0.65, -3.9], [-1.05, -3.9], [0.1, -0.55]], 0.12);
  B.add(wing, B.mx(0, -0.38, 0, PI / 2 - 0.07, 0, 0), c.white); B.add(wingL, B.mx(0, -0.38, 0, PI / 2 + 0.07, 0, 0), c.white);
  var nac = new T.LatheGeometry(lathePts(T, function (y) { return y > 0.65 ? 0.3 + (y - 0.65) * 0.2 : (y < -0.55 ? 0.3 - (-0.55 - y) * 0.18 : 0.33); }, -0.8, 0.8, 12, true, true), 20);
  for (sd = -1; sd <= 1; sd += 2) {
    B.add(nac, B.mx(0.7, -0.74, sd * 1.55 - sd * 0.08, 0, 0, -PI / 2), c.white);
    D.cyl(0.25, 0.25, 0.02, 1.51, -0.74, sd * 1.47, c.dark, 0, 0, PI / 2, 14);
    B.box(0.8, 0.22, 0.14, 0.7, -0.42, sd * 1.47, c.white);
  }
  /* tail: stabilisers and fin with an orange cap and a blue band */
  B.add(slab(T, [[-3.0, 0.2], [-3.9, 1.7], [-4.35, 1.7], [-4.25, 0.2]], 0.07), B.mx(0, 0.1, 0, PI / 2, 0, 0), c.white);
  B.add(slab(T, [[-3.0, -0.2], [-4.25, -0.2], [-4.35, -1.7], [-3.9, -1.7]], 0.07), B.mx(0, 0.1, 0, PI / 2, 0, 0), c.white);
  B.add(slab(T, [[-2.6, 0.45], [-4.0, 2.6], [-4.55, 2.6], [-4.7, 0.1]], 0.12), B.mx(0, 0, 0), c.white);
  D.add(slab(T, [[-3.479, 1.8], [-4.0, 2.6], [-4.55, 2.6], [-4.598, 1.8]], 0.14), B.mx(0, 0, 0), c.orange);
  D.add(slab(T, [[-3.186, 1.35], [-3.349, 1.6], [-4.61, 1.6], [-4.625, 1.35]], 0.14), B.mx(0, 0, 0), c.blue);
}

/* launch vehicle: two stages, interstage, ogive nose, four fins, bell nozzle. Axis +y, base at the origin, 11.4 tall. */
function addRocket(T, B, D, c) {
  function rf(y) {
    if (y < 6.2) return 0.8;
    if (y < 6.8) return 0.8 - (y - 6.2) / 0.6 * 0.18;
    if (y < 9.2) return 0.62;
    var t = (y - 9.2) / 2.2; return 0.62 * Math.pow(Math.max(0, 1 - t * t), 0.62);
  }
  function shell(ya, yb, off, color) { D.add(new T.LatheGeometry(lathePts(T, function (y) { return rf(y) + off; }, ya, yb, 5), 32), B.mx(0, 0, 0), color); }
  B.add(new T.LatheGeometry(lathePts(T, rf, 0, 11.4, 60, true, false), 32), B.mx(0, 0, 0), c.white);
  shell(2.0, 2.6, 0.012, c.blue); shell(4.5, 5.2, 0.012, c.orange); shell(6.25, 6.75, 0.012, c.dark); shell(10.35, 11.35, 0.01, c.orange);
  var bell = new T.LatheGeometry(lathePts(T, function (y) { return y > -0.3 ? 0.3 - y * 0.2 : 0.36 + (-0.3 - y) * 0.45; }, -1.1, 0.05, 8, false, false), 24);
  B.add(bell, B.mx(0, 0, 0), c.dark);
  B.cyl(0.52, 0.66, 0.3, 0, -0.1, 0, c.dark, 0, 0, 0, 24);
  for (var k = 0; k < 4; k++) {
    var a = PI / 4 + k * PI / 2, fin = slab(T, [[0.7, 0.1], [2.3, -0.25], [2.3, 0.75], [0.7, 2.7]], 0.1);
    B.add(fin, B.mx(0, 0, 0, 0, a, 0), c.blue);
  }
}

/* orange traffic cone on a black square base; two white reflective bands */
function addCone(T, B, D, x, z, y) {
  var H = 6.8;
  function rf(h) { return 1.3 - (1.3 - 0.2) * h / H; }
  B.box(3.5, 0.3, 3.5, x, y + 0.15, z, '#23272c');
  B.add(new T.LatheGeometry(lathePts(T, rf, 0, H, 6, false, true), 22), B.mx(x, y + 0.3, z), '#cf5f10');
  D.add(new T.LatheGeometry(lathePts(T, function (h) { return rf(h) + 0.02; }, 3.4, 4.5, 3), 22), B.mx(x, y + 0.3, z), '#a3a8ac');
  D.add(new T.LatheGeometry(lathePts(T, function (h) { return rf(h) + 0.02; }, 5.0, 5.6, 3), 22), B.mx(x, y + 0.3, z), '#a3a8ac');
}

/* ---------- textures ---------- */

function floorTex(T) {
  return tex(T, 1024, 1024, function (x, W, H) {
    var r = mulberry(11), i, sx = W / 110, sz = H / 119;
    x.fillStyle = '#85888b'; x.fillRect(0, 0, W, H);
    for (i = 0; i < 70; i++) {
      var bx = r() * W, by = r() * H, br = 40 + r() * 120, gr = x.createRadialGradient(bx, by, 0, bx, by, br);
      gr.addColorStop(0, r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(30,30,34,0.07)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = gr; x.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    for (i = 0; i < 5200; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + (0.03 + r() * 0.07) + ')' : 'rgba(20,20,24,' + (0.04 + r() * 0.09) + ')'; x.fillRect(r() * W, r() * H, 1 + r() * 1.5, 1 + r() * 1.5); }
    x.setTransform(sx, 0, 0, sz, 55 * sx, 19 * sz);     /* from here on: world x in [-55, 55], z in [-19, 100] */
    x.strokeStyle = 'rgba(45,46,50,0.5)'; x.lineWidth = 0.14;                  /* saw-cut joints */
    for (i = -55; i <= 55; i += 11) { x.beginPath(); x.moveTo(i, -19); x.lineTo(i, 100); x.stroke(); }
    for (i = -19; i <= 100; i += 11) { x.beginPath(); x.moveTo(-55, i); x.lineTo(55, i); x.stroke(); }
    x.fillStyle = 'rgba(25,25,28,0.16)'; x.beginPath(); x.ellipse(45, -3.5, 5, 3, 0.3, 0, 7); x.fill();   /* oil under the cart */
    x.beginPath(); x.ellipse(-30, 30, 3.4, 1.8, -0.2, 0, 7); x.fill();
    /* safety line round the work table */
    x.lineJoin = 'miter'; x.strokeStyle = '#e8741a'; x.lineWidth = 0.75;
    x.beginPath(); x.moveTo(-36.5, -10); x.lineTo(-36.5, 26); x.lineTo(36.5, 26); x.lineTo(36.5, -10); x.stroke();
    /* hazard hatch along the front */
    x.save(); x.beginPath(); x.rect(-36.1, 27.2, 72.2, 3.2); x.clip();
    x.strokeStyle = '#e8741a'; x.lineWidth = 1.1;
    for (i = -40; i < 40; i += 3.4) { x.beginPath(); x.moveTo(i, 31); x.lineTo(i + 3.2, 27); x.stroke(); }
    x.restore();
    x.strokeStyle = '#e8741a'; x.lineWidth = 0.5; x.strokeRect(-36.1, 27.2, 72.2, 3.2);
    /* white walkway edges */
    x.strokeStyle = 'rgba(236,238,240,0.9)'; x.lineWidth = 0.5;
    [-47, 47].forEach(function (xx) { x.beginPath(); x.moveTo(xx, -10); x.lineTo(xx, 100); x.stroke(); });
    x.setLineDash([3, 2.4]); x.beginPath(); x.moveTo(-47, 40); x.lineTo(47, 40); x.stroke(); x.setLineDash([]);
    /* paint wear */
    for (i = 0; i < 260; i++) { x.fillStyle = 'rgba(133,136,139,' + (0.12 + r() * 0.3) + ')'; x.fillRect(-47 + r() * 94, -10 + r() * 61, 0.3 + r() * 0.8, 0.2 + r() * 0.5); }
  }, true);
}

/* corrugated, riveted cladding in light grey-blue with a darker concrete plinth. One tile = one 5.5 wide panel of the 54 high wall. */
function wallTex(T) {
  return tex(T, 128, 1024, function (x, W, H) {
    var r = mulberry(31), i, ppu = H / 54;
    function Y(wy) { return (41 - wy) * ppu; }
    var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#b5c3cf'); gr.addColorStop(0.5, '#a9b9c6'); gr.addColorStop(1, '#9db0be');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (i = 0; i < 5; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(30,50,70,0.05)'; x.fillRect(i * W / 5, 0, W / 5, H); }
    for (i = 0; i < 8; i++) { var sxp = r() * W; x.fillStyle = 'rgba(40,55,70,0.04)'; x.fillRect(sxp, 0, 2 + r() * 6, H); }
    x.fillStyle = '#7f858c'; x.fillRect(0, Y(-3), W, H);                          /* concrete plinth */
    x.fillStyle = '#9097a0'; x.fillRect(0, Y(-3), W, 5); x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, Y(-3) + 5, W, 3);
    [Y(19.5), Y(34)].forEach(function (yy) { x.fillStyle = '#8c9db0'; x.fillRect(0, yy - 4, W, 8); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, yy - 4, W, 1.5); x.fillStyle = 'rgba(20,35,50,0.22)'; x.fillRect(0, yy + 3, W, 1.5); });
    x.fillStyle = 'rgba(30,45,60,0.5)'; x.fillRect(0, 0, 2, H); x.fillRect(W - 1, 0, 1, H);                /* panel seams */
    x.fillStyle = 'rgba(255,255,255,0.2)'; x.fillRect(2, 0, 1.5, H);
    for (i = 8; i < H; i += 46) { x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(7, i, 2.2, 2.2); x.fillRect(W - 10, i, 2.2, 2.2); x.fillStyle = 'rgba(20,35,50,0.25)'; x.fillRect(7, i + 2, 2.2, 1); x.fillRect(W - 10, i + 2, 2.2, 1); }
    for (i = 0; i < 5; i++) { var sg = x.createLinearGradient(0, 0, 0, H * 0.5); sg.addColorStop(0, 'rgba(60,70,80,0.0)'); sg.addColorStop(1, 'rgba(60,70,80,0.06)'); x.fillStyle = sg; x.fillRect(5 + r() * (W - 14), H * 0.3, 2 + r() * 3, H * 0.35); }
  }, true, true);
}

function tableTex(T) {
  return tex(T, 1024, 512, function (x, W, H) {
    var r = mulberry(7), i, sx = W / 62, sz = H / 30;
    x.fillStyle = '#939da6'; x.fillRect(0, 0, W, H);
    for (i = 0; i < 4000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + (0.03 + r() * 0.05) + ')' : 'rgba(20,30,40,' + (0.03 + r() * 0.06) + ')'; x.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6); }
    x.setTransform(sx, 0, 0, sz, 31 * sx, 15 * sz);
    x.strokeStyle = 'rgba(70,84,98,0.32)'; x.lineWidth = 0.07;
    for (i = -30; i <= 30; i += 5) { x.beginPath(); x.moveTo(i, -14); x.lineTo(i, 14); x.stroke(); }
    for (i = -15; i <= 15; i += 5) { x.beginPath(); x.moveTo(-30, i); x.lineTo(30, i); x.stroke(); }
    x.strokeStyle = 'rgba(60,72,86,0.5)'; x.lineWidth = 0.1;
    for (var gx = -30; gx <= 30; gx += 10) for (var gz = -10; gz <= 10; gz += 10) { x.beginPath(); x.moveTo(gx - 0.5, gz); x.lineTo(gx + 0.5, gz); x.moveTo(gx, gz - 0.5); x.lineTo(gx, gz + 0.5); x.stroke(); }
    x.strokeStyle = '#e8741a'; x.lineWidth = 0.34; x.strokeRect(-29.2, -13.2, 58.4, 26.4);          /* work-area outline */
    x.fillStyle = '#e8741a'; [[-29.2, -13.2], [29.2, -13.2], [-29.2, 13.2], [29.2, 13.2]].forEach(function (c) { x.fillRect(c[0] - 0.6, c[1] - 0.6, 1.2, 1.2); });
  }, true);
}

function glassTex(T) {
  return tex(T, 256, 512, function (x, W, H) {
    x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.beginPath(); x.moveTo(W * 0.1, 0); x.lineTo(W * 0.42, 0); x.lineTo(W * 0.1, H * 0.62); x.lineTo(0, H * 0.62); x.lineTo(0, H * 0.2); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.04)'; x.beginPath(); x.moveTo(W * 0.62, 0); x.lineTo(W * 0.78, 0); x.lineTo(W * 0.3, H); x.lineTo(W * 0.14, H); x.closePath(); x.fill();
    var g = x.createLinearGradient(0, H, 0, 0); g.addColorStop(0, 'rgba(60,50,40,0.1)'); g.addColorStop(0.3, 'rgba(60,50,40,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
}

/* golden-hour sky. The plane spans x -450..450 and y -10..150; the sun sits low on the right. */
function skyTex(T) {
  return tex(T, 1024, 512, function (x, W, H) {
    var r = mulberry(21), i;
    function Y(y) { return (150 - y) / 160 * H; }
    function X(wx) { return (wx + 450) / 900 * W; }
    var gr = x.createLinearGradient(0, 0, 0, H);
    [[150, '#35588f'], [105, '#5b83b6'], [64, '#9fb4cc'], [34, '#e9c5a2'], [14, '#f6c58c'], [0, '#f0bc86'], [-10, '#e3ae80']].forEach(function (s) { gr.addColorStop((150 - s[0]) / 160, s[1]); });
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    var sxp = X(95), syp = Y(15);
    for (i = 0; i < 46; i++) {                                           /* streaky high cloud, lit from below near the sun */
      var cy = Y(24 + r() * 70), cx = r() * W, rad = 30 + r() * 70, near = clamp(1 - Math.abs(cx - sxp) / (W * 0.55), 0, 1), warm = near * 0.8 + (cy > Y(45) ? 0.2 : 0);
      x.save(); x.translate(cx, cy); x.scale(3.5 + r() * 4, 0.28 + r() * 0.2);
      var rg = x.createRadialGradient(0, 0, 0, 0, 0, rad);
      rg.addColorStop(0, 'rgba(' + Math.round(200 + 55 * warm) + ',' + Math.round(190 - 20 * warm) + ',' + Math.round(215 - 80 * warm) + ',' + (0.1 + r() * 0.14) + ')'); rg.addColorStop(1, 'rgba(255,200,150,0)');
      x.fillStyle = rg; x.beginPath(); x.arc(0, 0, rad, 0, 7); x.fill(); x.restore();
    }
    x.save(); x.translate(sxp, syp); x.scale(1, 0.55);
    var sg = x.createRadialGradient(0, 0, 0, 0, 0, 300);
    sg.addColorStop(0, 'rgba(255,238,200,1)'); sg.addColorStop(0.03, 'rgba(255,232,190,0.95)'); sg.addColorStop(0.12, 'rgba(255,214,150,0.6)'); sg.addColorStop(0.4, 'rgba(255,172,100,0.2)'); sg.addColorStop(1, 'rgba(255,150,90,0)');
    x.fillStyle = sg; x.fillRect(-300, -300, 600, 600); x.restore();
  });
}

/* two layers of hills in haze, on a plane at the far end of the airfield (y -6..30) */
function ridgeTex(T) {
  return tex(T, 1024, 128, function (x, W, H) {
    var r = mulberry(5), i;
    function Y(y) { return (30 - y) / 36 * H; }
    function ridge(base, amp, color, seed) {
      var ph = [r() * 7, r() * 7, r() * 7];
      x.fillStyle = color; x.beginPath(); x.moveTo(0, H);
      for (i = 0; i <= W; i += 8) { var u = i / W * 6.283, h = base + amp * (0.5 + 0.28 * Math.sin(u * 2 + ph[0] + seed) + 0.17 * Math.sin(u * 5 + ph[1]) + 0.08 * Math.sin(u * 13 + ph[2])); x.lineTo(i, Y(h)); }
      x.lineTo(W, H); x.closePath(); x.fill();
    }
    ridge(6, 12, '#bda3a0', 0); ridge(1, 8, '#a99aa0', 2);
    var g = x.createLinearGradient(0, Y(8), 0, H); g.addColorStop(0, 'rgba(232,186,142,0)'); g.addColorStop(1, 'rgba(232,186,142,0.95)'); x.fillStyle = g; x.fillRect(0, Y(8), W, H);
  });
}

/* the airfield seen from above: apron, taxiway, grass, a runway on a slant, all in world units (x -450..450, z -152..-21.4) */
function groundTex(T) {
  return tex(T, 1024, 1024, function (x, W, H) {
    var r = mulberry(17), i, sx = W / 900, sz = H / 130.6;
    x.setTransform(sx, 0, 0, sz, 450 * sx, 152 * sz);
    var gr = x.createLinearGradient(0, -152, 0, -21.4);
    gr.addColorStop(0, '#d8b48c'); gr.addColorStop(0.2, '#b5a272'); gr.addColorStop(0.5, '#909056'); gr.addColorStop(1, '#8a8a52');
    x.fillStyle = gr; x.fillRect(-450, -152, 900, 131);
    for (i = 0; i < 90; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,230,150,0.07)' : 'rgba(60,70,30,0.07)'; x.fillRect(-450 + r() * 900, -125 + r() * 45, 20 + r() * 80, 2 + r() * 6); }
    for (i = 0; i < 140; i++) { x.fillStyle = 'rgba(70,86,48,0.8)'; x.beginPath(); x.ellipse(-450 + r() * 900, -116 + r() * 5, 3 + r() * 5, 1.2 + r() * 1.4, 0, 0, 7); x.fill(); }   /* tree line */
    /* runway on a slant, with shoulders, edge lines, a dashed centre line, touchdown marks and a threshold */
    x.save(); x.translate(100, -98); x.rotate(-0.09);
    x.fillStyle = '#6a6862'; x.fillRect(-500, -17, 1000, 34);
    x.fillStyle = '#4a4b50'; x.fillRect(-500, -12, 1000, 24);
    x.strokeStyle = '#e9e6dc'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(-500, -10.8); x.lineTo(500, -10.8); x.moveTo(-500, 10.8); x.lineTo(500, 10.8); x.stroke();
    x.lineWidth = 0.9; x.setLineDash([14, 10]); x.beginPath(); x.moveTo(-500, 0); x.lineTo(500, 0); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#e9e6dc';
    for (i = 0; i < 8; i++) { x.fillRect(170, -9.6 + i * 2.7, 14, 1.3); }
    for (i = 40; i < 160; i += 30) { x.fillRect(i - 20, -5.4, 11, 1.2); x.fillRect(i - 20, -3.4, 11, 1.2); x.fillRect(i - 20, 2.2, 11, 1.2); x.fillRect(i - 20, 4.2, 11, 1.2); }
    x.restore();
    /* taxiway and the connector to the apron */
    x.fillStyle = '#55565b'; x.fillRect(-450, -76, 900, 12); x.fillRect(58, -76, 18, 15);
    x.strokeStyle = '#e4bd4a'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(-450, -70); x.lineTo(450, -70); x.stroke();
    x.beginPath(); x.moveTo(67, -70); x.lineTo(67, -60); x.stroke();
    /* apron with joints, stand lines, stains */
    x.fillStyle = '#aaa79d'; x.fillRect(-450, -62, 900, 40.6);
    x.strokeStyle = 'rgba(100,98,92,0.55)'; x.lineWidth = 0.3;
    for (i = -450; i < 450; i += 14) { x.beginPath(); x.moveTo(i, -62); x.lineTo(i, -21.4); x.stroke(); }
    for (i = -62; i < -21; i += 10.2) { x.beginPath(); x.moveTo(-450, i); x.lineTo(450, i); x.stroke(); }
    x.strokeStyle = '#e4bd4a'; x.lineWidth = 0.55;
    [-20, 30, 80, 150, 200].forEach(function (lx) { x.beginPath(); x.moveTo(lx, -21.4); x.lineTo(lx, -54); x.stroke(); });
    x.beginPath(); x.moveTo(-450, -54.5); x.lineTo(450, -54.5); x.stroke();
    x.fillStyle = 'rgba(40,40,44,0.14)'; for (i = 0; i < 24; i++) { x.beginPath(); x.ellipse(-200 + r() * 460, -58 + r() * 34, 2 + r() * 4, 1 + r() * 2, r() * 3, 0, 7); x.fill(); }
    var hz = x.createLinearGradient(0, -122, 0, -152); hz.addColorStop(0, 'rgba(232,186,142,0)'); hz.addColorStop(1, 'rgba(232,186,142,0.95)'); x.fillStyle = hz; x.fillRect(-450, -152, 900, 30);
  }, true);
}

/* ---------- the blueprint: top, side and front views of a twin-jet airliner in white line on blueprint blue ---------- */
function blueprintTex(T) {
  return tex(T, 1024, 640, function (x, W, H) {
    var S = 8.4, i, ink = '#e9f2ff';
    var bg = x.createRadialGradient(W * 0.45, H * 0.4, 40, W / 2, H / 2, W * 0.8); bg.addColorStop(0, '#2b69b5'); bg.addColorStop(1, '#194789'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    for (i = 0; i <= W; i += 16) { x.strokeStyle = i % 80 === 0 ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.07)'; x.lineWidth = 1; x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, H); x.stroke(); }
    for (i = 0; i <= H; i += 16) { x.strokeStyle = i % 80 === 0 ? 'rgba(255,255,255,0.17)' : 'rgba(255,255,255,0.07)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, i + 0.5); x.lineTo(W, i + 0.5); x.stroke(); }
    x.strokeStyle = ink; x.fillStyle = ink; x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = 2.6; x.strokeRect(12, 12, W - 24, H - 24); x.lineWidth = 1; x.strokeRect(18, 18, W - 36, H - 36);

    function path(pts, close) { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var k = 1; k < pts.length; k++) x.lineTo(pts[k][0], pts[k][1]); if (close) x.closePath(); x.stroke(); }
    function txt(s, tx, ty, size, align) { x.font = '600 ' + size + 'px Menlo, Consolas, "Courier New", monospace'; x.textAlign = align || 'left'; x.textBaseline = 'middle'; x.fillText(s, tx, ty); }
    function head(px, py, dx, dy) { var a = Math.atan2(dy, dx); x.beginPath(); x.moveTo(px, py); x.lineTo(px - 10 * Math.cos(a - 0.3), py - 10 * Math.sin(a - 0.3)); x.lineTo(px - 10 * Math.cos(a + 0.3), py - 10 * Math.sin(a + 0.3)); x.closePath(); x.fill(); }
    function dim(x1, y1, x2, y2) { x.lineWidth = 1.4; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); head(x1, y1, x1 - x2, y1 - y2); head(x2, y2, x2 - x1, y2 - y1); }
    function fusR(u) { var R = 1.975; if (u < 4) return R * Math.sqrt(Math.max(0, 1 - Math.pow((4 - u) / 4, 2))); if (u < 27) return R; return R * (1 - 0.88 * Math.pow((u - 27) / 10.6, 1.2)); }
    function rrect(rx, ry, rw, rh, rr) { x.beginPath(); x.moveTo(rx + rr, ry); x.lineTo(rx + rw - rr, ry); x.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr); x.lineTo(rx + rw, ry + rh - rr); x.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh); x.lineTo(rx + rr, ry + rh); x.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr); x.lineTo(rx, ry + rr); x.quadraticCurveTo(rx, ry, rx + rr, ry); x.closePath(); x.stroke(); }

    /* ---- top view ---- */
    var X0 = 62, YC = 188, L = 37.6, top = [], bot = [], u, r;
    x.lineWidth = 2.4;
    for (u = 0; u <= L + 0.01; u += 0.4) { r = fusR(u) * S; top.push([X0 + u * S, YC - r]); bot.push([X0 + u * S, YC + r]); }
    path(top.concat(bot.reverse()), true);
    [-1, 1].forEach(function (sd) {
      function P(uu, yy) { return [X0 + uu * S, YC + sd * yy * S]; }
      path([P(12, 1.9), P(21.1, 17.9), P(22.6, 17.9), P(18.4, 1.9)], false);             /* wing */
      path([P(30.4, 0.6), P(34, 6.3), P(35.6, 6.3), P(35.4, 0.5)], false);                /* tailplane */
      x.lineWidth = 1.3; path([P(17.2, 2.6), P(19.2, 9.5)]); path([P(19.7, 11), P(21.7, 17.4)]); x.lineWidth = 2.4;
      var ex = X0 + 12.9 * S, ey = YC + sd * 5.75 * S - 1.05 * S; rrect(ex, ey, 4.1 * S, 2.1 * S, 8);   /* engine */
      x.lineWidth = 1.3; path([P(12.9 + 2.0, 4.7), P(12.9 + 2.0, 6.8)]); x.lineWidth = 2.4;
    });
    x.lineWidth = 1.2; x.setLineDash([22, 5, 3, 5]); path([[X0 - 24, YC], [X0 + L * S + 24, YC]]); x.setLineDash([]);
    txt('TOP VIEW', 34, 36, 21);
    var spx = X0 + L * S + 46; dim(spx, YC - 17.9 * S, spx, YC + 17.9 * S); x.lineWidth = 1; path([[X0 + 22.6 * S, YC - 17.9 * S], [spx + 6, YC - 17.9 * S]]); path([[X0 + 22.6 * S, YC + 17.9 * S], [spx + 6, YC + 17.9 * S]]);
    txt('SPAN ~ 36 m', spx + 12, YC - 20, 17);

    /* ---- side view ---- */
    var YS = 432, gy = YS + 5.9 * S;
    function topY(uu) { return YS - fusR(uu) * S; }
    function botY(uu) { var up = Math.max(0, (uu - 26) / 11.6); return YS + fusR(uu) * S - Math.pow(up, 1.5) * 2.2 * S; }
    var st = [], sb = [];
    x.lineWidth = 2.4;
    for (u = 0; u <= L + 0.01; u += 0.4) { st.push([X0 + u * S, topY(u)]); sb.push([X0 + u * S, botY(u)]); }
    path(st.concat(sb.reverse()), true);
    path([[X0 + 27.2 * S, topY(27.2)], [X0 + 32.8 * S, topY(27.2) - 6 * S], [X0 + 35.2 * S, topY(27.2) - 6 * S], [X0 + 36.3 * S, topY(36.3)]]);    /* fin */
    x.lineWidth = 1.3; path([[X0 + 34.2 * S, topY(27.2) - 6 * S + 2], [X0 + 35.2 * S, topY(35.2)]]);
    x.lineWidth = 2; path([[X0 + 30.6 * S, YS - 0.9 * S], [X0 + 35.7 * S, YS - 1.1 * S], [X0 + 35.7 * S, YS - 0.65 * S], [X0 + 30.6 * S, YS - 0.4 * S]], true);   /* tailplane edge-on */
    path([[X0 + 12 * S, YS + 1.1 * S], [X0 + 18.4 * S, YS + 1.1 * S], [X0 + 22.6 * S, YS - 0.45 * S], [X0 + 21.1 * S, YS - 0.45 * S]], true);                /* wing, with dihedral */
    rrect(X0 + 13.4 * S, YS + 1.9 * S, 4.1 * S, 2.1 * S, 8);                                                                                                 /* engine */
    x.lineWidth = 1.3; path([[X0 + 15.2 * S, YS + 1.1 * S], [X0 + 15.2 * S, YS + 1.9 * S]]);
    x.lineWidth = 2;                                                                                                                                         /* landing gear */
    path([[X0 + 5 * S, botY(5)], [X0 + 5 * S, gy - 0.5 * S]]); path([[X0 + 15.8 * S, YS + 1.2 * S + 6], [X0 + 15.8 * S, gy - 0.55 * S]]);
    [5, 15.8].forEach(function (gx) { x.beginPath(); x.arc(X0 + gx * S, gy - 0.5 * S, 0.5 * S, 0, 7); x.stroke(); });
    x.lineWidth = 1.5; path([[28, gy], [X0 + L * S + 70, gy]]); for (i = 36; i < X0 + L * S + 70; i += 14) path([[i, gy], [i - 8, gy + 9]]);
    x.lineWidth = 1.4;
    for (u = 6.4; u < 25.6; u += 0.82) rrect(X0 + u * S, YS - 0.8 * S, 0.45 * S, 0.55 * S, 3);                                                                /* cabin windows */
    for (i = 0; i < 3; i++) path([[X0 + (1.9 + i * 0.95) * S, YS - 0.75 * S], [X0 + (2.55 + i * 0.95) * S, YS - 0.7 * S], [X0 + (2.55 + i * 0.95) * S, YS - 0.2 * S], [X0 + (1.95 + i * 0.95) * S, YS - 0.22 * S]], true);
    rrect(X0 + 5.2 * S, YS - 1.2 * S, 1.0 * S, 1.9 * S, 6); rrect(X0 + 26 * S, YS - 1.1 * S, 0.95 * S, 1.8 * S, 6);
    txt('SIDE VIEW', 34, 372, 21);
    var dy = gy + 36; dim(X0, dy, X0 + L * S, dy); x.lineWidth = 1; path([[X0, gy + 8], [X0, dy + 6]]); path([[X0 + L * S, gy + 8], [X0 + L * S, dy + 6]]);
    txt('LENGTH ~ 37 m', X0 + L * S / 2, dy - 12, 17, 'center');
    var hx = X0 + L * S + 50; dim(hx, gy, hx, topY(27.2) - 6 * S); x.lineWidth = 1; path([[X0 + 32.8 * S, topY(27.2) - 6 * S], [hx + 6, topY(27.2) - 6 * S]]);
    txt('H ~ 12 m', hx + 10, (gy + topY(27.2) - 6 * S) / 2, 17);

    /* ---- front view ---- */
    var FX = 700, FY = 232, ph = S * 1.975;
    x.lineWidth = 2.4; x.beginPath(); x.arc(FX, FY, ph, 0, 7); x.stroke();
    [-1, 1].forEach(function (sd) {
      var tipx = FX + sd * 17.9 * S, tipy = FY + ph * 0.5 - 1.57 * S, rootx = FX + sd * ph * 0.97, rooty = FY + ph * 0.5;
      x.lineWidth = 2.4; path([[rootx, rooty - 3], [tipx, tipy - 2], [tipx, tipy + 3], [rootx, rooty + 5]], false);
      var ex2 = FX + sd * 5.75 * S, ey2 = FY + ph * 0.5 + 6 - (5.75 * S - ph) / (17.9 * S - ph) * 1.57 * S - 1.5 + 1.05 * S; x.beginPath(); x.arc(ex2, ey2 - 3, 1.05 * S, 0, 7); x.stroke();
      x.lineWidth = 1.8; path([[FX + sd * 6.2 * S, FY - 3], [FX + sd * 0.6, FY - 3]]);
      var gxp = FX + sd * 2.8 * S; x.lineWidth = 2; path([[gxp, FY + ph * 0.55], [gxp, FY + 5.9 * S - 0.5 * S]]); rrect(gxp - 4, FY + 5.9 * S - 1.0 * S, 8, 0.9 * S, 3);
    });
    x.lineWidth = 2.4; path([[FX - 3, FY - ph], [FX - 2, FY - ph - 6 * S], [FX + 2, FY - ph - 6 * S], [FX + 3, FY - ph]], false);
    x.lineWidth = 1.5; path([[FX - 130, FY + 5.9 * S], [FX + 130, FY + 5.9 * S]]);
    x.lineWidth = 1.2; x.setLineDash([22, 5, 3, 5]); path([[FX, FY - ph - 6 * S - 14], [FX, FY + 5.9 * S + 14]]); x.setLineDash([]);
    txt('FRONT VIEW', 560, 74, 21);

    /* ---- typical wing section ---- */
    var AX = 560, AY = 420, C = 330, t = 0.12, mC = 0.04, pC = 0.4, up = [], lo = [], px, yt, yc, dyc, th;
    for (i = 0; i <= 60; i++) {
      px = i / 60; px = (1 - Math.cos(px * PI)) / 2;
      yt = 5 * t * (0.2969 * Math.sqrt(px) - 0.126 * px - 0.3516 * px * px + 0.2843 * Math.pow(px, 3) - 0.1015 * Math.pow(px, 4));
      if (px < pC) { yc = mC / (pC * pC) * (2 * pC * px - px * px); dyc = 2 * mC / (pC * pC) * (pC - px); } else { yc = mC / Math.pow(1 - pC, 2) * ((1 - 2 * pC) + 2 * pC * px - px * px); dyc = 2 * mC / Math.pow(1 - pC, 2) * (pC - px); }
      th = Math.atan(dyc);
      up.push([AX + (px - yt * Math.sin(th)) * C, AY - (yc + yt * Math.cos(th)) * C]); lo.push([AX + (px + yt * Math.sin(th)) * C, AY - (yc - yt * Math.cos(th)) * C]);
    }
    x.lineWidth = 2.4; path(up.concat(lo.reverse()), true);
    x.lineWidth = 1.2; x.setLineDash([14, 5]); path([[AX - 16, AY], [AX + C + 16, AY]]); x.setLineDash([]);
    dim(AX, AY + 50, AX + C, AY + 50); x.lineWidth = 1; path([[AX, AY + 14], [AX, AY + 56]]); path([[AX + C, AY + 14], [AX + C, AY + 56]]);
    txt('CHORD', AX + C / 2, AY + 36, 17, 'center');
    txt('LEADING EDGE', AX - 6, AY - 62, 15); x.lineWidth = 1; path([[AX + 8, AY - 52], [AX + 2, AY - 10]]);
    txt('TRAILING EDGE', AX + C - 8, AY - 62, 15, 'right'); path([[AX + C - 14, AY - 52], [AX + C, AY - 4]]);
    txt('SECTION A-A', 560, 330, 21);
    txt('THICKNESS ~ 12 %', AX + C, AY + 82, 15, 'right');

    /* ---- title block ---- */
    var bx = 520, by = 528, bw = 466, bh = 88;
    x.lineWidth = 2.2; x.strokeRect(bx, by, bw, bh); x.lineWidth = 1.2;
    path([[bx, by + 44], [bx + bw, by + 44]]); path([[bx + 236, by], [bx + 236, by + bh]]); path([[bx + 370, by], [bx + 370, by + bh]]);
    txt('TWIN-JET AIRLINER', bx + 12, by + 22, 21); txt('GENERAL ARRANGEMENT', bx + 12, by + 66, 17);
    txt('SCHEMATIC', bx + 246, by + 22, 16); txt('NOT TO SCALE', bx + 246, by + 66, 16); txt('REV A', bx + 380, by + 22, 15); txt('SHEET 1/1', bx + 380, by + 66, 15);
    txt('DIMENSIONS ARE APPROXIMATE', 34, 596, 15);
  }, false);
}

/* ---------- telemetry screens ---------- */
function makeScreen(T) {
  var c = document.createElement('canvas'); c.width = 512; c.height = 320;
  var t = new T.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = T.LinearFilter;
  return { c: c, x: c.getContext('2d'), tex: t };
}
function hms(sec) { sec = Math.floor(sec); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

/* ascent profile: altitude against downrange, with separation markers and a few readouts */
function drawAscent(s, p) {
  var x = s.x, W = 512, H = 320, i, px = 22, py = 58, pw = 300, ph = 236;
  x.fillStyle = '#06141e'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0d2a3b'; x.fillRect(0, 0, W, 42);
  x.font = 'bold 26px Menlo, Consolas, monospace'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#7fd8f2'; x.fillText('ASCENT', 16, 22);
  x.textAlign = 'right'; x.fillStyle = '#ffb454'; x.fillText('T+ ' + hms(p * 540), W - 16, 22); x.textAlign = 'left';
  x.strokeStyle = 'rgba(127,216,242,0.16)'; x.lineWidth = 1;
  for (i = 0; i <= 5; i++) { x.beginPath(); x.moveTo(px + i * pw / 5, py); x.lineTo(px + i * pw / 5, py + ph); x.stroke(); }
  for (i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(px, py + i * ph / 4); x.lineTo(px + pw, py + i * ph / 4); x.stroke(); }
  x.strokeStyle = '#7fd8f2'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + ph); x.lineTo(px + pw, py + ph); x.stroke();
  function pt(t) { var a = 1 - Math.pow(1 - t, 2.2); return [px + 6 + t * (pw - 14), py + ph - 6 - a * (ph - 26)]; }
  x.strokeStyle = '#2f566b'; x.lineWidth = 3; x.setLineDash([8, 7]); x.beginPath(); for (i = 0; i <= 60; i++) { var q = pt(i / 60); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); } x.stroke(); x.setLineDash([]);
  x.strokeStyle = '#ff9a3c'; x.lineWidth = 4; x.beginPath(); for (i = 0; i <= 60; i++) { var q2 = pt(p * i / 60); if (i) x.lineTo(q2[0], q2[1]); else x.moveTo(q2[0], q2[1]); } x.stroke();
  [[0.42, 'MECO'], [0.7, 'SEP']].forEach(function (m) { var q3 = pt(m[0]); x.fillStyle = p > m[0] ? '#ffd27a' : '#4a7186'; x.beginPath(); x.arc(q3[0], q3[1], 6, 0, 7); x.fill(); x.font = 'bold 16px Menlo, Consolas, monospace'; x.fillText(m[1], q3[0] + 10, q3[1] + 18); });
  var cur = pt(p); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cur[0], cur[1], 6.5, 0, 7); x.fill();
  x.font = 'bold 15px Menlo, Consolas, monospace'; x.fillStyle = '#7fd8f2'; x.fillText('ALT', px + 8, py + 14); x.textAlign = 'right'; x.fillText('RANGE', px + pw - 6, py + ph - 14); x.textAlign = 'left';
  var alt = Math.round(190 * (1 - Math.pow(1 - p, 2.2))), vel = 0.4 + 7.3 * Math.pow(p, 1.25), acc = 1.4 + 2.6 * p;
  var rows = [['ALT', '~' + alt + ' km'], ['VEL', '~' + vel.toFixed(1) + ' km/s'], ['ACC', '~' + acc.toFixed(1) + ' g'], ['STAGE', p < 0.42 ? '1' : '2']];
  for (i = 0; i < rows.length; i++) {
    var ry = 66 + i * 62; x.fillStyle = '#4f8aa3'; x.font = 'bold 17px Menlo, Consolas, monospace'; x.fillText(rows[i][0], 338, ry + 8);
    x.fillStyle = i === 3 ? '#8ff0b4' : '#eaf8ff'; x.font = 'bold 28px Menlo, Consolas, monospace'; x.fillText(rows[i][1], 338, ry + 36);
  }
  s.tex.needsUpdate = true;
}

/* transfer orbit between two circular orbits (schematic), burn markers and readouts */
function drawOrbit(s, p) {
  var x = s.x, W = 512, H = 320, i, cx = 160, cy = 188, rp = 62, ra = 124, a = (rp + ra) / 2, b = Math.sqrt(rp * ra);
  x.fillStyle = '#06141e'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0d2a3b'; x.fillRect(0, 0, W, 42);
  x.font = 'bold 26px Menlo, Consolas, monospace'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#7fd8f2'; x.fillText('ORBIT TRANSFER', 16, 22);
  x.strokeStyle = '#2b6a8e'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, rp, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, ra, 0, 7); x.stroke();
  x.strokeStyle = '#ff9a3c'; x.lineWidth = 3; x.setLineDash([10, 6]); x.beginPath(); x.ellipse(cx - (ra - rp) / 2, cy, a, b, 0, 0, 7); x.stroke(); x.setLineDash([]);
  var eg = x.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, 30); eg.addColorStop(0, '#6fb6e8'); eg.addColorStop(1, '#1d5a96'); x.fillStyle = eg; x.beginPath(); x.arc(cx, cy, 28, 0, 7); x.fill();
  var E = p * PI, vx = cx - (ra - rp) / 2 + a * Math.cos(E), vy = cy - b * Math.sin(E);
  x.fillStyle = '#ffd27a'; x.beginPath(); x.arc(cx + rp, cy, 6, 0, 7); x.fill(); x.beginPath(); x.arc(cx - ra, cy, 6, 0, 7); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(vx, vy, 7, 0, 7); x.fill();
  x.font = 'bold 16px Menlo, Consolas, monospace'; x.fillStyle = '#7fd8f2'; x.fillText('LOW', cx + 12, cy + rp - 12); x.fillText('HIGH', cx - 18, cy - ra - 12);
  x.fillStyle = '#ffd27a'; x.fillText('BURN 1', cx + rp + 8, cy - 14); x.fillText('BURN 2', cx - ra - 6, cy + 24);
  x.fillStyle = '#4f8aa3'; x.font = 'bold 14px Menlo, Consolas, monospace'; x.fillText('SCHEMATIC, NOT TO SCALE', 16, H - 14);
  var rows = [['DV 1', '~2.4 km/s'], ['DV 2', '~1.5 km/s'], ['COAST', '~5.3 h'], ['PHASE', p < 0.04 ? 'BURN' : (p > 0.96 ? 'BURN' : 'COAST')]];
  for (i = 0; i < rows.length; i++) {
    var ry = 62 + i * 60; x.fillStyle = '#4f8aa3'; x.font = 'bold 17px Menlo, Consolas, monospace'; x.fillText(rows[i][0], 336, ry + 8);
    x.fillStyle = i === 3 ? '#8ff0b4' : '#eaf8ff'; x.font = 'bold 28px Menlo, Consolas, monospace'; x.fillText(rows[i][1], 336, ry + 36);
  }
  s.tex.needsUpdate = true;
}

/* ---------- the room ---------- */
ENV.hangar = function (T) {
  var g = new T.Group(), i;
  /* S: solid furniture and props. D: thin details laid on them (decals, bands, hardware), drawn with a small depth bias. The stage renders
     through a composer with a 16-bit depth buffer, so anything closer than ~0.5 units to the surface behind it would flicker at this
     distance. Two rules follow: solids either intersect or stand clearly apart, and every detail goes in D (or is a decal() plane). */
  var S = makeBake(T), D = makeBake(T), O = makeBake(T), OD = makeBake(T);
  O.tint = OD.tint = outdoorTint(T);
  var W = '#a6abb1', BL = '#34628f', OR = '#cf630f', DK = '#2b3138';
  var jetC = { white: W, blue: BL, orange: OR, dark: DK };
  function both(m) { S.push(m); D.push(m); }
  function unboth() { S.pop(); D.pop(); }
  function decal(mesh) { var m = mesh.material; m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -6; return mesh; }
  function shade(x, y, z, w, d, op) {
    var m = contactShadow(T, g, x, y, z, w, d, op); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2; m.material.polygonOffsetUnits = -4; return m;
  }

  g.add(new T.HemisphereLight(0xfff3e2, 0x55565c, 0.45));
  var key = new T.DirectionalLight(0xffe9cf, 0.3); key.position.set(6, 16, 12); g.add(key);
  var fill = new T.DirectionalLight(0xdfe8f2, 0.12); fill.position.set(-10, 8, 16); g.add(fill);
  var overhead = new T.PointLight(0xffe6c4, 0.16, 60, 1.4); overhead.position.set(0, 22, -3); g.add(overhead);

  /* ---- shell: floor, walls with the door opening, ceiling ---- */
  var floor = new T.Mesh(new T.PlaneGeometry(110, 119), new T.MeshStandardMaterial({ map: floorTex(T), roughness: 0.9, metalness: 0 }));
  floor.rotation.x = -PI / 2; floor.position.set(0, FLOOR, 40.5); g.add(floor);

  var wallMat = new T.MeshBasicMaterial({ map: wallTex(T) });
  var ws = new T.Shape(); ws.moveTo(-55, -27); ws.lineTo(55, -27); ws.lineTo(55, 27); ws.lineTo(-55, 27); ws.closePath();
  var hole = new T.Path(); hole.moveTo(WIN.x0, WIN.y0 - 14); hole.lineTo(WIN.x0, WIN.y1 - 14); hole.lineTo(WIN.x1, WIN.y1 - 14); hole.lineTo(WIN.x1, WIN.y0 - 14); hole.closePath(); ws.holes.push(hole);
  var wg = new T.ShapeGeometry(ws), wp = wg.attributes.position, wuv = wg.attributes.uv;
  for (i = 0; i < wp.count; i++) wuv.setXY(i, (wp.getX(i) + 55) / 110 * 20, (wp.getY(i) + 27) / 54);
  var back = new T.Mesh(wg, wallMat); back.position.set(0, 14, -19); g.add(back);
  [-1, 1].forEach(function (sd) {
    var sg = new T.PlaneGeometry(119, 54), su = sg.attributes.uv; for (i = 0; i < su.count; i++) su.setX(i, su.getX(i) * 21.6);
    var sw = new T.Mesh(sg, wallMat); sw.position.set(sd * 55, 14, 40.5); sw.rotation.y = -sd * PI / 2; g.add(sw);
  });
  var ceil = new T.Mesh(new T.PlaneGeometry(110, 119), new T.MeshBasicMaterial({ color: '#69727d' })); ceil.rotation.x = PI / 2; ceil.position.set(0, 36, 40.5); g.add(ceil);
  for (i = 0; i < 8; i++) S.box(110, 1.6, 1.2, 0, 35.2, -12 + i * 14, '#4f5964');

  /* ---- hangar-door opening: deep trim standing proud of the wall, steel frame with mullions, glass, a sliding leaf on a rail ---- */
  var ox = (WIN.x0 + WIN.x1) / 2, ow = WIN.x1 - WIN.x0, oh = WIN.y1 - WIN.y0, FZ = -20.35, REV = '#a3abb2', TZ = -19.8, TD = 3.2;
  S.box(1.0, oh + 1.0, TD, WIN.x0 - 0.5, (WIN.y0 + WIN.y1 + 1.0) / 2, TZ, REV);
  S.box(1.0, oh + 1.0, TD, WIN.x1 + 0.5, (WIN.y0 + WIN.y1 + 1.0) / 2, TZ, REV);
  S.box(ow + 2, 1.0, TD, ox, WIN.y1 + 0.5, TZ, REV);
  S.box(ow + 2.8, 0.6, 3.5, ox, WIN.y0 - 0.3, -19.65, '#868f97');                                    /* sill, projects into the room */
  var FR = '#3b5570';
  S.box(0.7, oh, 0.7, WIN.x0 + 0.35, (WIN.y0 + WIN.y1) / 2, FZ, FR); S.box(0.7, oh, 0.7, WIN.x1 - 0.35, (WIN.y0 + WIN.y1) / 2, FZ, FR);
  S.box(ow, 0.7, 0.7, ox, WIN.y1 - 0.35, FZ, FR); S.box(ow, 0.7, 0.7, ox, WIN.y0 + 0.35, FZ, FR);
  for (i = 1; i < 6; i++) S.box(0.45, oh - 1.4, 0.5, WIN.x0 + ow * i / 6, (WIN.y0 + WIN.y1) / 2, FZ, FR);
  [WIN.y0 + 7.2, WIN.y0 + 16.2].forEach(function (ty) { S.box(ow - 1.4, 0.45, 0.5, ox, ty, FZ, FR); });
  var glass = new T.Mesh(new T.PlaneGeometry(ow - 1.4, oh - 1.4), new T.MeshBasicMaterial({ map: glassTex(T), transparent: true, depthWrite: false }));
  glass.position.set(ox, (WIN.y0 + WIN.y1) / 2, FZ - 0.12); g.add(glass);
  /* sliding door leaf parked over the left end of the opening, hanging from an overhead rail */
  var LF = '#5d7184', LZ = -17.6;
  S.box(46, 0.7, 0.8, 22, 27.4, -17.5, '#47525e');
  [3.1, 8.2].forEach(function (hx) { S.box(0.7, 0.8, 0.5, hx, 26.82, LZ, '#2f3a45'); });
  S.box(7.2, 23.2, 0.5, 5.65, 15.0, LZ, LF);
  for (i = 0; i < 8; i++) D.box(0.4, 21.2, 0.3, 2.4 + i * 0.9, 15.6, LZ + 0.35, '#677b8e');
  D.box(7.2, 1.4, 0.8, 5.65, 4.1, LZ + 0.15, OR);

  /* ---- outdoors: sky, hills, ground and a believable airfield, all unfogged and unlit. The far layers are drawn first with the depth test off
     (the depth buffer is far too coarse out there); the ground and buildings then sort by depth among themselves. ---- */
  var OK = 0.62, og = new T.Group();                                    /* the airfield is built at a roomy scale, then drawn smaller so every part stays inside the far plane */
  og.scale.setScalar(OK); og.position.set(0, GY * (1 - OK), -21.4 * (1 - OK)); g.add(og);
  var sky = new T.Mesh(new T.PlaneGeometry(900, 160), new T.MeshBasicMaterial({ map: skyTex(T), depthTest: false, depthWrite: false })); sky.position.set(0, 70, -168); sky.renderOrder = -30; og.add(sky);
  var ridge = new T.Mesh(new T.PlaneGeometry(900, 36), new T.MeshBasicMaterial({ map: ridgeTex(T), alphaTest: 0.5, depthTest: false, depthWrite: false })); ridge.position.set(0, 12, -156); ridge.renderOrder = -29; og.add(ridge);
  var ground = new T.Mesh(new T.PlaneGeometry(900, 130.6), new T.MeshBasicMaterial({ map: groundTex(T) })); ground.rotation.x = -PI / 2; ground.position.set(0, GY, -86.7); ground.renderOrder = -28; og.add(ground);
  function hangar(hx, hz, w, d, hw, rise, color) {
    var base = GY - 0.3, r = w / 2, sc = rise / r;
    O.box(w, hw, d, hx, base + hw / 2, hz, color);
    O.add(new T.CylinderGeometry(r, r, d, 18, 1, true, -PI / 2, PI), O.mx(hx, base + hw, hz, -PI / 2, 0, 0, 1, 1, sc), color);
    O.add(new T.CircleGeometry(r, 18, 0, PI), O.mx(hx, base + hw, hz + d / 2, 0, 0, 0, 1, sc, 1), color);
    OD.box(w * 0.62, hw * 0.88, 0.4, hx, base + hw * 0.44, hz + d / 2, '#444c57');
    for (var k = 1; k < 4; k++) OD.box(0.2, hw * 0.88, 0.5, hx - w * 0.31 + w * 0.62 * k / 4, base + hw * 0.44, hz + d / 2 + 0.05, '#363d47');
  }
  [[48, -138, 46, 30, 6, 7, '#8e9aa8'], [112, -142, 58, 32, 7, 9, '#a39ea4'], [172, -134, 40, 26, 5, 7, '#8b96a4'], [-12, -144, 52, 32, 6, 8, '#98a0ab'], [-72, -138, 44, 28, 5, 7, '#8a95a3'], [226, -144, 60, 30, 7, 9, '#9a98a2']].forEach(function (h) { hangar(h[0], h[1], h[2], h[3], h[4], h[5], h[6]); });
  O.box(40, 9, 12, 22, GY + 4.2, -128, '#a2a4aa'); O.box(36, 1.2, 13, 22, GY + 9.3, -128, '#7d848e');
  O.box(14, 9, 6, 142, GY + 4.2, -124, '#9a9ba2'); O.box(16, 6, 8, -40, GY + 2.7, -126, '#a1a2a8');
  O.box(2.6, 24, 2.6, 78, GY + 11.7, -126, '#b4b0ae'); O.box(6.2, 3.2, 6.2, 78, GY + 25.2, -126, '#2f3c4c'); O.box(7.4, 0.6, 7.4, 78, GY + 27.1, -126, '#8a8f98'); O.box(0.3, 4, 0.3, 78, GY + 29.3, -126, '#6c727b');
  for (i = 0; i < 3; i++) O.cyl(4, 4, 6, -30 + i * 9.2, GY + 2.7, -120, '#c9c6c2', 0, 0, 0, 16);
  for (i = 0; i < 7; i++) { O.box(0.4, 12, 0.4, 5 + i * 42, GY + 5.7, -62.5, '#4a4f56'); O.box(2.2, 0.5, 0.8, 5 + i * 42, GY + 11.8, -62.5, '#3a3f46'); }
  for (i = 0; i < 26; i++) { O.box(0.6, 0.5, 0.6, -10 + i * 9, GY + 0.1, -76.6, '#5a88c8'); O.box(0.6, 0.5, 0.6, -10 + i * 9, GY + 0.1, -63.4, '#5a88c8'); }
  /* a parked airliner on the apron, nose to the left, and two service trucks */
  var pj = O.mx(98, GY + 4.0, -50, 0, PI + 0.12, 0, 2.5, 2.5, 2.5);
  O.push(pj); OD.push(pj); addJet(T, O, OD, jetC);
  [[1.6, 0.0], [-0.3, 1.02], [-0.3, -1.02]].forEach(function (gp) { O.cyl(0.07, 0.07, 1.5, gp[0], -1.0, gp[1], '#3a3f46', 0, 0, 0, 8); O.cyl(0.2, 0.2, 0.16, gp[0], -1.7, gp[1], '#1c1f23', PI / 2, 0, 0, 12); });
  O.pop(); OD.pop();
  O.box(9, 3.4, 3.6, 40, GY + 1.7, -34, '#ec7a1c'); O.box(3.4, 3.4, 3.4, 45.5, GY + 1.7, -34, '#e4e6e8'); O.cyl(1.6, 1.6, 8, 38, GY + 4.4, -34, '#d8dadc', 0, 0, PI / 2, 14);
  O.box(7, 2.6, 3, 150, GY + 1.3, -40, '#e8e8e6'); O.box(2.8, 2.6, 2.9, 154.2, GY + 1.3, -40, '#3d4f66');
  var mO = O.mesh(new T.MeshBasicMaterial({ vertexColors: true })); mO.renderOrder = -27; og.add(mO);
  var mOD = OD.mesh(new T.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })); mOD.renderOrder = -26; og.add(mOD);

  /* ---- table: a steel-framed mission table with a laminate top, lower shelf and crates ---- */
  var tm = new T.MeshStandardMaterial({ map: tableTex(T), roughness: 0.85, metalness: 0 }), tside = new T.MeshStandardMaterial({ color: '#2f363d', roughness: 0.8 });
  var tslab = new T.Mesh(new T.BoxGeometry(62, 1, 30), [tside, tside, tm, tside, tside, tside]); tslab.position.set(0, -0.7, 6); g.add(tslab);   /* top surface at y = -0.2 */
  var TF = '#47647f';
  S.box(59.6, 0.9, 0.9, 0, -1.6, -7.6, TF); S.box(59.6, 0.9, 0.9, 0, -1.6, 19.6, TF); S.box(0.9, 0.9, 27, -29.4, -1.6, 6, TF); S.box(0.9, 0.9, 27, 29.4, -1.6, 6, TF);
  [[-29.4, -7.6], [29.4, -7.6], [-29.4, 19.6], [29.4, 19.6]].forEach(function (c) {
    S.box(1.4, 11.8, 1.4, c[0], FLOOR + 5.9, c[1], TF); S.box(2.2, 0.5, 2.2, c[0], FLOOR + 0.25, c[1], '#23272c');
  });
  S.box(59.6, 0.6, 0.6, 0, -10.8, -7.6, TF); S.box(59.6, 0.6, 0.6, 0, -10.8, 19.6, TF); S.box(0.6, 0.6, 27, -29.4, -10.8, 6, TF); S.box(0.6, 0.6, 27, 29.4, -10.8, 6, TF);
  S.box(58.2, 0.35, 26.6, 0, -10.3, 6, '#5a636d');
  S.box(9, 4, 6, -20, -8.1, 4, '#c4620f'); S.box(7, 3, 5, -8, -8.6, 8, '#76828e'); S.box(5, 2.2, 4, 18, -9.0, 2, '#76828e'); S.box(8, 4.6, 5.4, 22, -7.7, 12, '#c4620f');

  /* ---- back counter: steel-blue cabinets under a charcoal worktop ---- */
  S.box(80, 13, 8.3, 0, -5.7, -14.85, '#4b6783');
  S.box(80.8, 0.8, 9.3, 0, CT - 0.4, -14.25, '#3c444c');
  D.box(80.8, 0.14, 0.2, 0, CT - 0.4, -9.62, OR);
  S.box(80, 0.8, 7.9, 0, FLOOR + 0.4, -14.95, '#2a3037');
  for (i = 0; i < 16; i++) {
    var dx = -37.5 + i * 5, dc = i % 4 === 1 ? '#6f879f' : (i % 4 === 3 ? '#5b7690' : '#52708c');
    S.box(4.8, 10.2, 0.7, dx, -6.9, -10.35, dc); D.box(0.22, 1.9, 0.3, dx + 1.8, -3.0, -9.95, '#aab3bb');
  }

  /* ---- scale models on stands ---- */
  var JZ = -14.4;
  S.cyl(1.7, 1.8, 0.25, 12.5, CT + 0.12, JZ, '#3a4048', 0, 0, 0, 28); S.cyl(0.15, 0.15, 2.6, 12.5, CT + 1.5, JZ, '#aab2ba', 0, 0, 0, 12); S.cyl(0.55, 0.45, 0.2, 12.5, CT + 2.9, JZ, '#3a4048', 0, 0, 0, 16);
  both(S.mx(12.5, 5.2, JZ, 0, 0.12, 0.05)); addJet(T, S, D, jetC); unboth();
  S.box(4.6, 0.3, 4.6, 27, CT + 0.15, JZ, '#3a4048');
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) { S.box(0.3, 1.5, 0.3, 27 + c[0] * 1.33, CT + 1.15, JZ + c[1] * 1.33, '#7a848e'); });
  both(S.mx(27, CT + 1.9, JZ, 0, 0, 0, 0.82, 0.82, 0.82)); addRocket(T, S, D, jetC); unboth();

  /* ---- blueprint on the wall: a deep frame, the sheet laid just in front of it ---- */
  var BX = -24.5, BY = 10.5, BW = 20, BH = 12.5;
  S.box(BW + 0.8, BH + 0.8, 0.9, BX, BY, -18.55, '#3a4450'); S.box(BW + 1.4, 0.4, 0.9, BX, BY + BH / 2 + 0.9, -18.55, '#5d6975');
  var bp = decal(new T.Mesh(new T.PlaneGeometry(BW, BH), new T.MeshBasicMaterial({ map: blueprintTex(T) }))); bp.position.set(BX, BY, -18.0); g.add(bp);

  /* ---- telemetry screens on small stands ---- */
  var screens = [], mons = [[-9.2, 0.1], [-0.8, -0.1]];
  mons.forEach(function (m) {
    var sc = makeScreen(T); screens.push(sc);
    var mg = new T.Group(); mg.position.set(m[0], 6.4, -15.5); mg.rotation.y = m[1]; mg.updateMatrix();
    S.push(mg.matrix);
    S.box(8.1, 5.5, 0.5, 0, 0, 0, '#262c33'); S.box(5, 3, 0.6, 0, 0.3, -0.5, '#2e353c');
    S.box(0.8, 2.6, 0.4, 0, -3.5, -0.5, '#3b434b'); S.box(3.4, 0.16, 1.9, 0, -4.72, -0.2, '#3b434b');
    S.pop();
    var face = decal(new T.Mesh(new T.PlaneGeometry(7.4, 4.8), new T.MeshBasicMaterial({ map: sc.tex }))); face.position.set(0, 0, 0.4); mg.add(face); g.add(mg);
  });
  drawAscent(screens[0], 0.55); drawOrbit(screens[1], 0.3);
  S.box(5.4, 0.22, 1.8, -5, CT + 0.11, -12.2, function (lx, ly, lz, nx, ny) { return ny > 0.5 ? '#4a535c' : '#2b3239'; });
  S.box(0.9, 0.28, 1.4, -0.4, CT + 0.14, -12.4, '#2b3239', 0, 0.2, 0);
  S.cyl(0.5, 0.5, 0.95, 4.3, CT + 0.48, -13.2, '#9fa4a9', 0, 0, 0, 18); D.cyl(0.52, 0.52, 0.2, 4.3, CT + 0.42, -13.2, OR, 0, 0, 0, 18);
  S.add(new T.TorusGeometry(0.28, 0.07, 8, 14, PI * 1.2), S.mx(4.85, CT + 0.5, -13.2, 0, 0, -PI * 0.6), '#9fa4a9');

  /* ---- counter props: red toolbox, drawing tubes, hard hat ---- */
  both(S.mx(-31, CT, -14.3, 0, 0.12, 0));
  S.box(6.4, 1.9, 2.8, 0, 0.95, 0, '#932823'); S.box(6.5, 1.0, 2.9, 0, 2.4, 0, '#a62d28');
  D.box(0.5, 0.6, 0.7, -1.9, 1.9, 1.4, '#6e7780'); D.box(0.5, 0.6, 0.7, 1.9, 1.9, 1.4, '#6e7780');
  S.box(0.2, 0.7, 0.2, -1.5, 3.25, 0, '#2b3138'); S.box(0.2, 0.7, 0.2, 1.5, 3.25, 0, '#2b3138'); S.box(3.2, 0.2, 0.3, 0, 3.6, 0, '#2b3138');
  unboth();
  S.cyl(0.55, 0.55, 5.4, -24.6, CT + 0.55, -17.4, '#b79a72', 0, 0.12, PI / 2, 16); D.cyl(0.57, 0.57, 0.2, -22.2, CT + 0.55, -17.4, '#2b3138', 0, 0.12, PI / 2, 16);
  S.cyl(0.5, 0.5, 5.0, -25.4, CT + 1.65, -17.6, '#a98d68', 0, 0.05, PI / 2, 16);
  both(S.mx(-18.8, CT, -13.4, 0, 0.5, 0));
  S.add(new T.SphereGeometry(1.35, 24, 12, 0, PI * 2, 0, PI / 2), S.mx(0, 0.1, 0, 0, 0, 0, 1, 0.78, 1), '#d56a12');
  S.cyl(1.52, 1.52, 0.1, 0, 0.1, 0, '#c9600f', 0, 0, 0, 28); S.box(0.35, 0.16, 2.2, 0, 1.12, 0, '#bd590e');
  unboth();

  /* ---- floor props: tool cart, cones, step platform, extinguisher ---- */
  var CX = 44.2, CZ = -3.5;
  both(S.mx(CX, FLOOR, CZ, 0, -0.1, 0));
  S.box(6.8, 0.4, 11.4, 0, 12.0, 0, '#3a4148'); S.box(6.5, 8.8, 11, 0, 7.4, 0, '#c9600f'); S.box(6.5, 0.3, 11, 0, 1.75, 0, '#3a4148');
  [[-2.9, -5.0], [2.9, -5.0], [-2.9, 5.0], [2.9, 5.0]].forEach(function (c) {
    S.box(0.5, 1.8, 0.5, c[0], 2.3, c[1], '#59616a'); S.box(0.5, 0.8, 0.8, c[0], 1.0, c[1], '#2b3138'); S.cyl(0.6, 0.6, 0.5, c[0], 0.6, c[1], '#16191d', 0, 0, PI / 2, 14);
  });
  for (i = 0; i < 4; i++) { D.box(0.3, 1.9, 9.6, -3.35, 4.25 + i * 2.1, 0, i % 2 ? '#b85a10' : '#c4620f'); D.box(0.3, 0.2, 3.2, -3.65, 4.5 + i * 2.1, 0, '#aab3bb'); }
  S.box(0.3, 3.2, 0.3, 3.2, 13.6, -5.2, '#aab3bb'); S.box(0.3, 3.2, 0.3, 3.2, 13.6, 5.2, '#aab3bb'); S.box(0.3, 0.3, 10.7, 3.2, 15.1, 0, '#aab3bb');
  S.box(3.4, 0.6, 4.4, 0.2, 12.5, -2.4, '#59616a'); S.box(1.0, 0.8, 2.4, 0.4, 13.0, 2.6, '#a9b1b8'); S.cyl(0.3, 0.3, 3.0, -0.8, 12.5, 3.8, '#932823', PI / 2, 0, 0, 10);
  unboth();
  [[-40.5, 25.6], [-34, 30.5], [40.2, 27.4], [38.2, -12.2]].forEach(function (c) { addCone(T, S, D, c[0], c[1], FLOOR); });
  var PX = -45, PZ = -6;                                                                   /* a stack of spare tyres on the left */
  S.add(new T.TorusGeometry(2.7, 1.15, 12, 28), S.mx(PX, FLOOR + 1.15, PZ, PI / 2, 0, 0), '#262a2e'); S.add(new T.TorusGeometry(2.7, 1.15, 12, 28), S.mx(PX + 0.2, FLOOR + 3.45, PZ - 0.1, PI / 2, 0, 0), '#2d3236');
  S.cyl(1.7, 1.7, 0.4, PX, FLOOR + 0.2, PZ, '#7a848e', 0, 0, 0, 20);
  S.cyl(0.85, 0.85, 4.8, 50, 3.2, -18.2, '#a8241f', 0, 0, 0, 18); S.cyl(0.4, 0.4, 0.6, 50, 5.9, -18.2, '#23272c', 0, 0, 0, 10); S.box(1.9, 0.4, 1.0, 50, 4.6, -18.4, '#2b3138'); S.box(0.8, 0.14, 0.4, 50.4, 6.3, -18.2, '#23272c');
  S.box(3.4, 3.4, 0.8, 50, 10.5, -18.6, '#c9600f');
  for (i = 0; i < 4; i++) D.box(2.8, 0.28, 0.3, 50, 9.6 + i * 0.6, -18.2, '#23272c');

  var matS = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  var matD = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  g.add(S.mesh(matS)); g.add(D.mesh(matD));

  /* ---- soft contact shadows ---- */
  var FS = FLOOR + 0.3;
  shade(0, FS, 6, 72, 42, 0.55); shade(CX, FS, CZ, 12, 15, 0.55); shade(PX, FS, PZ, 9.5, 9.5, 0.5);
  [[-40.5, 25.6], [-34, 30.5], [40.2, 27.4], [38.2, -12.2]].forEach(function (c) { shade(c[0], FS, c[1], 5.5, 5.5, 0.5); });
  shade(12.5, CT + 0.2, JZ, 6, 4, 0.5); shade(27, CT + 0.2, JZ, 6.5, 6.5, 0.5); shade(-31, CT + 0.2, -14.3, 8.4, 4.6, 0.55); shade(-18.8, CT + 0.2, -13.4, 4.2, 4.2, 0.5);
  shade(-9.2, CT + 0.2, -15.5, 5.2, 2.8, 0.5); shade(-0.8, CT + 0.2, -15.5, 5.2, 2.8, 0.5);
  var tableShadow = contactShadow(T, g, 0, 0.0, -1, 1, 1, 0.5);
  tableShadow.material.polygonOffset = true; tableShadow.material.polygonOffsetFactor = -2; tableShadow.material.polygonOffsetUnits = -4;

  /* the room is lit and graded by hand; fog would only muddy the palette */
  g.traverse(function (o) { var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(function (m) { m.fog = false; }); });

  var acc = 0;
  return {
    group: g, shadow: tableShadow,
    update: function (t, dt) {
      acc += dt || 0; if (acc < 0.25) return; acc = 0;
      drawAscent(screens[0], 0.08 + 0.9 * ((t / 70) % 1));
      drawOrbit(screens[1], (t / 40) % 1);
    }
  };
};
})();
