/* Visual Learner stage.
 * Everything a topic needs to render its 3D scenes inside its category's fixed environment:
 * renderer, camera, lighting, the category environment (shared/environments.js), bloom and the cinematic
 * final pass, the orbit camera with its cinematic sway, framing, and the on/off toggles.
 *
 * A topic provides only its own scenes ("subjects") and its interface. Improve this file or the
 * environment and every topic that uses it is upgraded the next time its page loads.
 *
 *   var stage = VLStage.create({ canvas: canvasEl, view: containerEl, category: 'biology' });
 *   stage.add(subject);      // subject = { group, w, h, base, update(t, dt) }
 *   stage.show(subject);     // makes it the current subject (hides the others, resets the camera)
 *   // each frame: subject.update(t, dt); stage.frame(dt, t);
 *
 * Subject contract (see docs/TOPIC_GUIDE.md):
 *   group  THREE.Group, centred on the origin
 *   w, h   half-width and half-height (scene units) the camera must keep in view
 *   base   how far below the origin the lowest part reaches; the table surface is placed under it
 */
(function () {
'use strict';
var T = window.THREE;
function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
function lerp(a, b, k) { return a + (b - a) * k; }

/* cinematic final pass: soft edge blur, a trace of colour fringing, gentle grade, vignette, film grain */
function makeFxShader() {
  return {
    uniforms: { tDiffuse: { value: null }, time: { value: 0 }, amount: { value: 1 }, res: { value: new T.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float time; uniform float amount; uniform vec2 res; varying vec2 vUv;',
      'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
      'void main() {',
      '  vec2 c = vUv - 0.5; float r = dot(c, c); vec2 dir = normalize(c + 1e-5);',
      '  vec2 px = 1.0 / res; float blur = amount * smoothstep(0.1, 0.45, r) * 2.4; float ca = amount * r * 0.0045;',
      '  vec3 col = vec3(0.0);',
      '  for (int i = 0; i < 8; i++) {',
      '    float a = float(i) * 0.785398; vec2 o = vec2(cos(a), sin(a)) * px * blur;',
      '    col.r += texture2D(tDiffuse, vUv + o + dir * ca).r; col.g += texture2D(tDiffuse, vUv + o).g; col.b += texture2D(tDiffuse, vUv + o - dir * ca).b;',
      '  }',
      '  col /= 8.0;',
      '  vec3 base = texture2D(tDiffuse, vUv).rgb; col = mix(base, col, smoothstep(0.06, 0.3, r) * amount);',
      '  float l = dot(col, vec3(0.299, 0.587, 0.114));',
      '  col = mix(col, col * vec3(0.94, 1.0, 1.08), (1.0 - l) * 0.35 * amount);',
      '  col = mix(col, col * vec3(1.06, 1.0, 0.92), l * 0.25 * amount);',
      '  col *= 1.0 - r * 0.5 * amount;',
      '  col += (hash(vUv * res + fract(time) * 91.7) - 0.5) * 0.03 * amount;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  };
}

/* force every shaded material matte: no environment reflection, little metalness, high roughness.
   Shiny surfaces pick up bright light and glint distractingly as the camera moves. */
function calmMaterials(root) {
  root.traverse(function (o) {
    var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(function (m) { if (m.isMeshStandardMaterial) { m.envMapIntensity = 0; m.metalness = Math.min(m.metalness, 0.12); m.roughness = Math.max(m.roughness, 0.62); } });
  });
}

/* the shared finish for shaded scene objects: matte, no environment reflection, a little self-glow */
function soft(color, glow, extra) {
  var c = new T.Color(color), o = { color: c, roughness: 0.85, metalness: 0, envMapIntensity: 0, emissive: c.clone().multiplyScalar(glow == null ? 0.1 : glow) };
  if (extra) for (var k in extra) o[k] = extra[k];
  return new T.MeshStandardMaterial(o);
}

/* in-scene text on a dark rounded backing so it stays readable against any background.
   options: size, color, bold, bg:false (plain text), plane:true (flat plate on a surface, cannot intersect it) */
function label(text, o) {
  o = o || {};
  var plain = o.bg === false, fs = 48, padX = plain ? 8 : 26, padY = plain ? 8 : 16, font = (o.bold ? '600 ' : '') + fs + 'px ui-monospace, Menlo, Consolas, monospace';
  var c = document.createElement('canvas'), ctx = c.getContext('2d');
  ctx.font = font; var tw = Math.ceil(ctx.measureText(text).width), w = tw + padX * 2, h = fs + padY * 2;
  c.width = w; c.height = h; ctx.font = font;
  if (!plain) {
    var r = h / 2; ctx.beginPath(); ctx.moveTo(r, 1); ctx.lineTo(w - r, 1); ctx.arc(w - r, r, r - 1, -Math.PI / 2, Math.PI / 2); ctx.lineTo(r, h - 1); ctx.arc(r, r, r - 1, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    ctx.fillStyle = 'rgba(8,12,20,0.8)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.stroke();
  }
  ctx.fillStyle = o.color || '#dbe4ee'; ctx.textBaseline = 'middle'; ctx.fillText(text, padX, h / 2 + 2);
  var tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
  if (o.plane) {
    /* printed on a flat plate parallel to a surface: it cannot intersect that surface from any angle */
    var psz = o.size || 0.4, pm = new T.Mesh(new T.PlaneGeometry(psz * c.width / c.height, psz), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    return pm;
  }
  var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: plain, fog: false }));
  if (!plain) sp.renderOrder = 20;
  var size = (o.size || 0.4) * (plain ? 1 : 1.3); sp.scale.set(size * c.width / c.height, size, 1); return sp;
}

function create(o) {
  o = o || {};
  var S = { ok: true, T: T, category: o.category };
  var canvas = o.canvas, view = o.view || canvas.parentNode, prefix = o.prefix || 'vl';
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function read(k, d) { try { var v = localStorage.getItem(prefix + '-' + k); return v == null ? d : v !== '0'; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(prefix + '-' + k, v ? '1' : '0'); } catch (e) {} }
  S.envOn = read('env', true); S.fxOn = read('fx', true); S.cine = true; S.yaw = 0;
  S.environmentName = window.VLEnv ? window.VLEnv.nameFor(o.category) : null;

  var renderer, scene, camera, composer = null, fxPass = null, floor, grid, env = null;
  var rig = { yaw: 0, pitch: 0.2, zoom: 1, ty: 0, tp: 0.2, tz: 1 }, swayK = 1, lastSway = { y: 0, p: 0 }, drag = null, ptr = { x: 0, y: 0, in: false };
  var subjects = [], current = null, trans = 1, camZ = 22, floorY = -4, firstFrame = true;

  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setClearColor(0x0b0f1a, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new T.Scene(); scene.fog = new T.FogExp2(0x0b0f1a, 0.012);
    /* near plane 0.5: the composer's depth buffer is 16-bit, and a nearer plane makes distant surfaces flicker where they almost touch */
    camera = new T.PerspectiveCamera(38, 1, 0.5, 300);
    scene.add(new T.AmbientLight(0xffffff, 0.46));
    var dl = new T.DirectionalLight(0xffffff, 0.3); dl.position.set(3, 6, 9); scene.add(dl);
    var dl2 = new T.DirectionalLight(0xdce6f0, 0.14); dl2.position.set(-6, -3, 4); scene.add(dl2);
    /* a plain glowing floor and grid, shown only when the category environment is switched off or missing */
    var fc = document.createElement('canvas'); fc.width = fc.height = 256; var fx = fc.getContext('2d'), fgr = fx.createRadialGradient(128, 128, 0, 128, 128, 128);
    fgr.addColorStop(0, 'rgba(127,227,255,0.30)'); fgr.addColorStop(0.55, 'rgba(127,227,255,0.07)'); fgr.addColorStop(1, 'rgba(127,227,255,0)'); fx.fillStyle = fgr; fx.fillRect(0, 0, 256, 256);
    floor = new T.Mesh(new T.PlaneGeometry(46, 46), new T.MeshBasicMaterial({ map: new T.CanvasTexture(fc), transparent: true, depthWrite: false, blending: T.AdditiveBlending })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    grid = new T.GridHelper(46, 46, 0x7fe3ff, 0x7fe3ff); grid.material.transparent = true; grid.material.opacity = 0.07; grid.material.depthWrite = false; scene.add(grid);
    /* the category's one fixed environment */
    if (window.VLEnv && o.category) { env = window.VLEnv.forCategory(o.category, T); calmMaterials(env.group); env.group.visible = S.envOn; scene.add(env.group); }
    grid.visible = floor.visible = !(env && S.envOn);
    if (T.EffectComposer && T.RenderPass && T.UnrealBloomPass) {
      composer = new T.EffectComposer(renderer);
      composer.addPass(new T.RenderPass(scene, camera));
      composer.addPass(new T.UnrealBloomPass(new T.Vector2(256, 256), 0.6, 0.55, 0.97));
      if (T.ShaderPass) { fxPass = new T.ShaderPass(makeFxShader()); fxPass.uniforms.amount.value = S.fxOn ? 1 : 0; composer.addPass(fxPass); }
    }
  } catch (e) {
    S.ok = false;
    var fb = document.createElement('div'); fb.className = 'fallback'; fb.textContent = o.fallbackText || 'This page needs WebGL, which is unavailable here.'; view.appendChild(fb);
  }
  S.camera = camera; S.scene = scene; S.renderer = renderer; S.env = env; S.pointer = ptr;
  S.hasEnv = !!env;

  S.resize = function () {
    if (!S.ok) return;
    var w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); if (composer) composer.setSize(w, h);
    if (fxPass) fxPass.uniforms.res.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var off = o.viewOffset ? o.viewOffset(w, h) : { x: w > 900 ? -150 : 0, y: w > 900 ? 40 : 70 };
    S.hFrac = w > 900 ? 0.82 : 0.6;
    if (!o.viewOffset && w <= 900) {
      /* small screens: fit the scene into the band between the top card and the dock, wherever they end up */
      var side = document.querySelector('.side'), ctl = document.querySelector('.ctl'), top = 0, bottom = h, ox = 0;
      if (side && side.offsetWidth > w * 0.6) top = side.getBoundingClientRect().bottom;
      else if (side) ox = -(side.offsetWidth + 24) / 2;
      if (ctl) { var cr = ctl.getBoundingClientRect(); bottom = cr.top; }
      var free = Math.max(h * 0.3, bottom - top);
      off = { x: ox, y: h / 2 - (top + bottom) / 2 };
      S.hFrac = Math.min(0.9, free / h);
    }
    camera.setViewOffset(w, h, off.x, off.y, w, h);
  };
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(S.resize); ro.observe(view);
    /* the card and dock change height per step; the stage re-fits when they do */
    ['.side', '.ctl'].forEach(function (q) { var el = document.querySelector(q); if (el) ro.observe(el); });
  } else window.addEventListener('resize', S.resize);

  /* orbit camera: drag, wheel, double-click to reset. Cinematic sway is folded into the position when you grab, so nothing jumps. */
  var yawLimit = function () { return env && S.envOn; };
  canvas.addEventListener('pointerdown', function (e) {
    rig.ty += lastSway.y; rig.yaw += lastSway.y; rig.tp = clamp(rig.tp + lastSway.p, -0.8, 1.2); rig.pitch = clamp(rig.pitch + lastSway.p, -0.8, 1.2); swayK = 0; lastSway.y = lastSway.p = 0;
    if (yawLimit()) rig.ty = clamp(rig.ty, -1.1, 1.1);
    drag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
  });
  canvas.addEventListener('pointermove', function (e) {
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.in = true;
    if (!drag) return;
    rig.ty -= (e.clientX - drag.x) * 0.006; if (yawLimit()) rig.ty = clamp(rig.ty, -1.1, 1.1);
    rig.tp = clamp(rig.tp + (e.clientY - drag.y) * 0.005, -0.8, 1.2); drag.x = e.clientX; drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', function () { drag = null; }); canvas.addEventListener('pointercancel', function () { drag = null; });
  canvas.addEventListener('pointerleave', function () { ptr.in = false; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); rig.tz = clamp(rig.tz * Math.exp(e.deltaY * 0.001), 0.35, yawLimit() ? 1.2 : 2); }, { passive: false });
  S.resetView = function () { rig.ty = 0; rig.tp = 0.2; rig.tz = 1; };
  /* jump the camera to a view: { yaw, pitch, zoom }. Used by tests and preview captures. */
  S.setView = function (v) { v = v || {}; if (v.yaw != null) rig.ty = rig.yaw = v.yaw; if (v.pitch != null) rig.tp = rig.pitch = v.pitch; if (v.zoom != null) rig.tz = rig.zoom = v.zoom; };
  canvas.addEventListener('dblclick', S.resetView);
  S.dragging = function () { return !!drag; };

  /* subjects */
  S.add = function (sub) { if (!S.ok) return sub; calmMaterials(sub.group); sub.group.visible = false; scene.add(sub.group); subjects.push(sub); return sub; };
  S.show = function (sub) {
    if (!S.ok) return;
    subjects.forEach(function (x) { x.group.visible = false; });
    sub.group.visible = true; current = sub; trans = 0; S.resetView();
  };

  /* toggles (remembered between visits) */
  S.setEnv = function (on) {
    S.envOn = !!on; if (on) rig.tz = Math.min(rig.tz, 1.2);
    if (env) { env.group.visible = S.envOn; grid.visible = floor.visible = !S.envOn; }
    write('env', S.envOn); return S.envOn;
  };
  S.setFx = function (on) { S.fxOn = !!on; if (fxPass) fxPass.uniforms.amount.value = S.fxOn ? 1 : 0; write('fx', S.fxOn); return S.fxOn; };
  S.setCine = function (on) { S.cine = !!on; return S.cine; };

  /* one frame: camera framing, category environment, final pass, render */
  S.frame = function (dt, t) {
    if (!S.ok || !current) return;
    trans = Math.min(1, trans + dt * 1.6); var e = 1 - Math.pow(1 - trans, 3);
    current.group.scale.setScalar(lerp(0.86, 1, e));
    var tn = Math.tan(camera.fov * Math.PI / 360), wide = window.innerWidth > 900, avail = camera.aspect * (wide ? 0.62 : 1);
    var tz = Math.max(current.w / (avail * tn), current.h / ((S.hFrac || (wide ? 0.82 : 0.6)) * tn)) * 1.05 * rig.zoom;
    camZ += (tz - camZ) * Math.min(1, dt * 5);
    var k = Math.min(1, dt * 6);
    rig.yaw += (rig.ty - rig.yaw) * k; rig.pitch += (rig.tp - rig.pitch) * k; rig.zoom += (rig.tz - rig.zoom) * k;
    var swayOn = S.cine && !drag && !calm; swayK += ((swayOn ? 1 : 0) - swayK) * Math.min(1, dt * (swayOn ? 0.8 : 8));
    lastSway.y = Math.sin(t * 0.22) * 0.3 * swayK; lastSway.p = Math.sin(t * 0.17) * 0.07 * swayK;
    var yaw = rig.yaw + lastSway.y, pit = rig.pitch + lastSway.p, d = camZ * (1 + (1 - e) * 0.3);
    S.yaw = yaw;
    camera.position.set(Math.sin(yaw) * Math.cos(pit) * d, Math.sin(pit) * d, Math.cos(yaw) * Math.cos(pit) * d);
    camera.lookAt(0, 0, 0);
    var fy = -((current.base || current.h) + 1.7); floorY = firstFrame ? fy : floorY + (fy - floorY) * Math.min(1, dt * 4);
    floor.position.y = floorY; grid.position.y = floorY + 0.01;
    if (env && S.envOn) { env.group.position.y = floorY; env.update(t, dt); if (env.shadow) env.shadow.scale.set(current.w * 1.7, Math.max(4, current.w * 0.6), 1); }
    if (fxPass) fxPass.uniforms.time.value = t;
    if (composer) composer.render(); else renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; if (o.onFirstFrame) o.onFirstFrame(); }
  };

  S.resize();
  return S;
}

window.VLStage = { create: create, calmMaterials: calmMaterials, soft: soft, label: label };
})();
