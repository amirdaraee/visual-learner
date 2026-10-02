/* Visual Learner sound.
 * Procedural audio built with the Web Audio API: no audio files, nothing to download.
 *
 *   VLSound.arm('lab', true);   // choose an ambience, wait for the first click or key press (browsers block audio before that)
 *   VLSound.sfx('ping');        // one-shot interaction sounds
 *   VLSound.setYaw(camYaw);     // optional: pans sources as the camera orbits
 *   VLSound.setEnabled(false);  // mute (fades out and stops all sources)
 *
 * VLSound.level(stageIndex, direction, steps) plays the stage-change sound: a sweep plus that stage's note, rising when you advance and falling when you go back.
 * Interaction sounds: ui, stage, pop, ping, blip, thump, step, tick, verdict_P, verdict_LP, verdict_VUS, verdict_LB, verdict_B, on, off.
 * Ambience profiles: lab. Add more by adding a function to PROFILES.
 */
(function () {
'use strict';
var ctx = null, master = null, enabled = true, profile = null, running = false, armed = false;
var sources = [], timers = [], pans = [], noiseBuf = null, brownBuf = null, yaw = 0, lastSfx = {};

function newCtx() { var C = window.AudioContext || window.webkitAudioContext; return C ? new C() : null; }
function makeNoise(c, brown) {
  var len = c.sampleRate * 3, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0), last = 0, i;
  for (i = 0; i < len; i++) {
    var w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 2.4; } else d[i] = w;
  }
  return b;
}
function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
function filt(type, f, q) { var n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; }
function panner(p) { if (ctx.createStereoPanner) { var s = ctx.createStereoPanner(); s.pan.value = p; return s; } return gain(1); }
function track(n) { sources.push(n); return n; }
function loopSrc(buf) { var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return track(s); }
function osc(type, f) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return track(o); }
function lfo(freq, depth, target) { var o = osc('sine', freq), g = gain(depth); o.connect(g); g.connect(target); return o; }
function placed(node, basePan, dest) {
  var p = panner(basePan); node.connect(p); p.connect(dest || master);
  if (p.pan) pans.push({ node: p, base: basePan });
  return p;
}
function rand(a, b) { return a + Math.random() * (b - a); }
function every(minS, maxS, fn) {
  var tm;
  function next() { tm = setTimeout(function () { if (running) fn(); next(); }, rand(minS, maxS) * 1000); timers.push(tm); }
  next();
}

/* ---- one-shot building blocks ---- */
function envGain(t0, a, d, peak, dest) {
  var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); g.connect(dest || master); return g;
}
function tone(freq, type, t0, dur, peak, endFreq, dest, pan) {
  var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0); if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  var g = envGain(t0, Math.min(0.02, dur * 0.3), dur, peak, null), p = panner(pan || 0); o.connect(g); g.disconnect(); g.connect(p); p.connect(master); o.start(t0); o.stop(t0 + dur + 0.1);
}
function burst(t0, dur, peak, ftype, f, q, f2, pan) {
  var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; var fl = filt(ftype, f, q); if (f2) { fl.frequency.setValueAtTime(f, t0); fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur); }
  var g = envGain(t0, Math.min(0.03, dur * 0.4), dur, peak, null), p = panner(pan || 0); s.connect(fl); fl.connect(g); g.disconnect(); g.connect(p); p.connect(master); s.start(t0, Math.random() * 2); s.stop(t0 + dur + 0.1);
}

var SFX = {
  ui: function (t) { tone(1500, 'sine', t, 0.05, 0.05); tone(2250, 'sine', t + 0.008, 0.04, 0.025); },
  stage: function (t) { burst(t, 0.55, 0.09, 'bandpass', 260, 1.2, 2400); tone(110, 'sine', t, 0.45, 0.07, 240); },
  pop: function (t) { tone(560, 'sine', t, 0.2, 0.13, 240); burst(t, 0.12, 0.05, 'highpass', 1800, 0.7); },
  ping: function (t) { tone(988, 'sine', t, 0.8, 0.09); tone(1482, 'sine', t + 0.01, 0.6, 0.05); tone(1976, 'sine', t + 0.02, 0.35, 0.025); },
  blip: function (t) { tone(440, 'triangle', t, 0.1, 0.05, 330); },
  thump: function (t) { tone(95, 'sine', t, 0.4, 0.22, 48); burst(t, 0.1, 0.04, 'lowpass', 400, 0.7); },
  step: function (t) { tone(720, 'sine', t, 0.07, 0.05); },
  tick: function (t) { burst(t, 0.03, 0.035, 'highpass', 3200, 0.7); },
  on: function (t) { tone(520, 'sine', t, 0.12, 0.06, 780); },
  off: function (t) { tone(620, 'sine', t, 0.14, 0.06, 360); },
  verdict_P: function (t) { tone(233, 'triangle', t, 1.4, 0.07); tone(311, 'triangle', t + 0.02, 1.3, 0.06); tone(466, 'triangle', t + 0.04, 1.1, 0.04); },
  verdict_LP: function (t) { tone(262, 'triangle', t, 1.1, 0.06); tone(392, 'triangle', t + 0.02, 1.0, 0.05); },
  verdict_VUS: function (t) { tone(523, 'sine', t, 0.5, 0.05); tone(622, 'sine', t + 0.12, 0.5, 0.045); },
  verdict_LB: function (t) { tone(587, 'sine', t, 0.6, 0.05); tone(880, 'sine', t + 0.1, 0.6, 0.045); },
  verdict_B: function (t) { tone(660, 'sine', t, 0.5, 0.055); tone(880, 'sine', t + 0.09, 0.5, 0.05); tone(1320, 'sine', t + 0.18, 0.7, 0.045); }
};

/* ---- level changes ---- */
var SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
function playLevel(index, dir, steps) {
  var t = ctx.currentTime + 0.01, up = dir >= 0, len = 0.42 + 0.08 * Math.min(steps, 4), f = SCALE[Math.max(0, Math.min(SCALE.length - 1, index))];
  burst(t, len, 0.085, 'bandpass', up ? 260 : 2400, 1.1, up ? 2400 : 260);
  tone(up ? 110 : 240, 'sine', t, len * 0.9, 0.06, up ? 240 : 110);
  var notes = up ? [f, f * 1.5, f * 2] : [f * 2, f * 1.5, f];
  notes.forEach(function (n, k) { var at = t + 0.1 + k * 0.075; tone(n, 'triangle', at, 0.55 - k * 0.08, 0.055 - k * 0.01); tone(n * 2.003, 'sine', at, 0.4, 0.012); });
  if (index === SCALE.length - 1 && up) {
    [f * 2, f * 2.5, f * 3, f * 4].forEach(function (n, k) { tone(n, 'sine', t + 0.34 + k * 0.06, 1.1 - k * 0.1, 0.035); });
    burst(t + 0.3, 0.9, 0.025, 'highpass', 5000, 0.7);
  }
  if (index === 0 && !up) tone(f / 2, 'sine', t + 0.1, 0.5, 0.06);
}

/* ---- ambience profiles ---- */
var PROFILES = {
  lab: function () {
    /* room tone: soft low rumble */
    var rt = loopSrc(brownBuf), rtf = filt('lowpass', 360), rtg = gain(0.1); rt.connect(rtf); rtf.connect(rtg); rtg.connect(master);
    /* ventilation and mains hum */
    var h1 = osc('sine', 55), h2 = osc('sine', 110), hg = gain(0.012), hg2 = gain(0.005); h1.connect(hg); h2.connect(hg2); hg.connect(master); hg2.connect(master); lfo(0.08, 0.003, hg.gain);
    var vent = loopSrc(noiseBuf), vf = filt('bandpass', 240, 0.8), vg = gain(0.018); vent.connect(vf); vf.connect(vg); vg.connect(master); lfo(0.05, 0.007, vg.gain);
    /* the city outside the window: muffled, drifting, right of centre */
    var city = loopSrc(noiseBuf), cbp = filt('bandpass', 760, 0.55), clp = filt('lowpass', 1700), cg = gain(0.04); city.connect(cbp); cbp.connect(clp); clp.connect(cg); placed(cg, 0.3); lfo(0.07, 0.014, cg.gain);
    /* centrifuge whirr, on the right of the counter */
    var c1 = osc('sawtooth', 82), c2 = osc('sawtooth', 83.7), clpf = filt('lowpass', 430), cgn = gain(0.014); c1.connect(clpf); c2.connect(clpf); clpf.connect(cgn); placed(cgn, 0.7); lfo(5.5, 1.4, c1.frequency);
    var cn = loopSrc(noiseBuf), cnf = filt('bandpass', 1150, 3), cng = gain(0.008); cn.connect(cnf); cnf.connect(cng); placed(cng, 0.7);
    /* sequencer fan */
    var fan = loopSrc(noiseBuf), ff = filt('bandpass', 2300, 2.2), fg = gain(0.005); fan.connect(ff); ff.connect(fg); placed(fg, 0.5);
    /* now and then: a car passing outside */
    every(9, 22, function () {
      var t = ctx.currentTime + 0.05, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; var bp = filt('bandpass', 520, 1.4); bp.frequency.setValueAtTime(520, t); bp.frequency.linearRampToValueAtTime(900, t + 1.6); bp.frequency.linearRampToValueAtTime(480, t + 3.4);
      var lp = filt('lowpass', 1500), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 1.5); g.gain.linearRampToValueAtTime(0.0001, t + 3.5);
      var p = panner(-0.5); if (p.pan) { p.pan.setValueAtTime(-0.5, t); p.pan.linearRampToValueAtTime(0.6, t + 3.4); } s.connect(bp); bp.connect(lp); lp.connect(g); g.connect(p); p.connect(master); s.start(t, Math.random() * 2); s.stop(t + 3.6);
    });
    /* rarely: a distant siren */
    every(55, 110, function () {
      var t = ctx.currentTime + 0.05, o = ctx.createOscillator(); o.type = 'sine'; var lp = filt('lowpass', 1300), g = ctx.createGain(), p = panner(0.45);
      for (var k = 0; k < 7; k++) o.frequency.setValueAtTime(k % 2 ? 760 : 610, t + k * 0.62);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 1.2); g.gain.linearRampToValueAtTime(0.012, t + 3); g.gain.linearRampToValueAtTime(0.0001, t + 4.4);
      o.connect(lp); lp.connect(g); g.connect(p); p.connect(master); o.start(t); o.stop(t + 4.5);
    });
    /* equipment and glass */
    every(14, 30, function () { var t = ctx.currentTime + 0.05; tone(1320, 'sine', t, 0.08, 0.03, null, null, 0.5); tone(1760, 'sine', t + 0.11, 0.1, 0.03, null, null, 0.5); });
    every(28, 70, function () { var t = ctx.currentTime + 0.05, pn = rand(-0.6, 0.2), f = rand(2800, 3600); tone(f, 'sine', t, 0.38, 0.03, null, null, pn); tone(f * 1.52, 'sine', t, 0.25, 0.015, null, null, pn); });
    every(32, 80, function () { var t = ctx.currentTime + 0.05; burst(t, 0.02, 0.04, 'bandpass', 3000, 2, null, -0.2); burst(t + 0.2, 0.025, 0.04, 'bandpass', 2600, 2, null, -0.2); });
    every(60, 120, function () { var t = ctx.currentTime + 0.05; tone(62, 'sine', t, 0.18, 0.05, 45, null, 0.8); });
  }
};

/* ---- lifecycle ---- */
function stopAmbience() {
  timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); timers = [];
  var old = sources; sources = []; pans = [];
  setTimeout(function () { old.forEach(function (s) { try { s.stop(); } catch (e) {} }); }, 450);
}
function startAmbience() {
  if (!ctx || !profile || !PROFILES[profile]) return;
  running = true; stopAmbience(); running = true;
  PROFILES[profile]();
  var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0.7, t + 0.8);
}
function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && enabled) ctx.resume(); return; }
  ctx = newCtx(); if (!ctx) return;
  master = ctx.createGain(); master.gain.value = 0; var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = makeNoise(ctx, false); brownBuf = makeNoise(ctx, true);
  if (ctx.state === 'suspended') ctx.resume();
  if (enabled) startAmbience();
}
function disarm() { ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { window.removeEventListener(ev, onGesture, true); }); armed = false; }
function onGesture() { disarm(); unlock(); }

var API = {
  /* choose an ambience and start it at the first click or key press */
  arm: function (name, on) {
    profile = name; enabled = on !== false;
    if (!armed && !ctx) { armed = true; ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { window.addEventListener(ev, onGesture, true); }); }
  },
  setEnabled: function (on) {
    enabled = !!on;
    if (!ctx) { if (enabled) { disarm(); unlock(); } return; }
    if (enabled) { if (ctx.state === 'suspended') ctx.resume(); startAmbience(); API.sfx('on'); }
    else {
      API.sfx('off'); running = false; var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.35); setTimeout(stopAmbience, 400);
    }
  },
  isEnabled: function () { return enabled; },
  running: function () { return !!(ctx && running && ctx.state === 'running'); },
  toggle: function () { API.setEnabled(!enabled); return enabled; },
  sfx: function (name) {
    if (!ctx || !enabled || !SFX[name]) return;
    var now = performance.now(), gap = name === 'tick' ? 130 : 60; if (lastSfx[name] && now - lastSfx[name] < gap) return; lastSfx[name] = now;
    if (ctx.state !== 'running') { ctx.resume().then(function () { if (enabled) SFX[name](ctx.currentTime + 0.01); }); return; }
    SFX[name](ctx.currentTime + 0.01);
  },
  /* level (stage) change: a sweep whose direction and length follow the move, plus that stage's note */
  level: function (index, dir, steps) {
    if (!ctx || !enabled) return;
    var go = function () { playLevel(index, dir, steps || 1); };
    if (ctx.state !== 'running') { ctx.resume().then(function () { if (enabled) go(); }); return; }
    go();
  },
  /* pan the placed sources as the camera orbits */
  setYaw: function (y) {
    yaw = y; if (!ctx) return;
    pans = pans.filter(function (p) { return !p.temp; });
    pans.forEach(function (p) { if (p.node.pan) p.node.pan.setTargetAtTime(Math.max(-1, Math.min(1, p.base - Math.sin(yaw) * 0.8)), ctx.currentTime, 0.2); });
  }
};
document.addEventListener('visibilitychange', function () { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (enabled) ctx.resume(); });
window.VLSound = API;
})();
