// =========================================================
//  bg.js — travelling alongside a particle beam.
//  A 3D field of particles rushing towards the camera.
//  • perspective: far particles are tiny points, near ones fly past fast
//  • motion blur: each streak = the distance the particle travelled during
//    a short "camera exposure", so faster/closer = longer light trail
//  • chapter change = a sudden kick to (almost) light speed, then back
//  • relativistic Doppler tint: heads shift blue, tails shift red at high speed
//  + bursts of curling sparks (charged particles in a magnetic field)
// =========================================================

const BG = (() => {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  const HUES = [195, 200, 210, 230, 260, 285, 320]; // cyan → blue → violet → pink
  let W = 0, H = 0, dpr = 1, F = 1;
  let P = [];
  let sparks = [];
  const mouse = { x: 0, y: 0, on: false };
  const vp = { x: 0, y: 0 };                 // vanishing point (where the beam comes from)

  const CRUISE = 0.11;                        // depth units per second when idle
  const HYPER = 3.4;                          // at the peak of a "warp"
  let warpStart = -1e9, warpDir = 1;
  let vel = CRUISE;                           // current speed (can go negative = flying backwards)

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = Math.max(W, H) * .42;                 // "focal length" of the camera
    vp.x = W / 2; vp.y = H / 2;
    const n = Math.round(Math.min(360, Math.max(110, W * H / 4200)));
    P = Array.from({ length: n }, () => make(Math.random()));
  }

  function make(z) {
    // spread particles in a wide tube around the beam axis (none right on the axis,
    // otherwise they'd sit in the middle of the screen forever)
    const a = Math.random() * Math.PI * 2;
    const r = .12 + Math.pow(Math.random(), .7) * 1.6;
    return {
      x: Math.cos(a) * r * (W / Math.max(W, H)) * 1.4,
      y: Math.sin(a) * r * (H / Math.max(W, H)) * 1.4,
      z: z ?? 1, hue: HUES[(Math.random() * HUES.length) | 0],
      b: .55 + Math.random() * .45            // brightness
    };
  }

  // speed envelope of a warp: very fast attack, short hold, smooth release
  function envelope(t) {
    if (t < 0) return 0;
    if (t < 150) { const p = t / 150; return p * p * p; }       // slam to light speed
    if (t < 420) return 1;                                      // hold
    if (t < 1500) { const p = (t - 420) / 1080; return Math.pow(1 - p, 3); } // ease back
    return 0;
  }

  function warp(dir = 1) { warpStart = performance.now(); warpDir = dir < 0 ? -1 : 1; }

  function burst(x = W / 2, y = H / 2, n = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 6 + Math.random() * 16;       // explosive start…
      sparks.push({
        pts: [[x, y]], vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        curl: (Math.random() - .5) * (Math.random() < .3 ? .22 : .07),
        life: 1, decay: .008 + Math.random() * .014,
        hue: HUES[(Math.random() * HUES.length) | 0], w: Math.random() * 1.8 + .7
      });
    }
  }

  const project = (x, y, z) => [vp.x + x / z * F, vp.y + y / z * F];

  function frame(dt, t) {
    const s = dt / 1000;
    const env = envelope(t - warpStart);
    const target = CRUISE + (HYPER * env) * warpDir;
    vel += (target - vel) * Math.min(1, s * (env > .5 ? 30 : 8)); // accelerate hard, relax gently

    // the camera steers slightly towards the mouse → parallax / depth
    const tx = W / 2 + (mouse.on ? (mouse.x - W / 2) * .08 : 0);
    const ty = H / 2 + (mouse.on ? (mouse.y - H / 2) * .08 : 0);
    vp.x += (tx - vp.x) * Math.min(1, s * 3);
    vp.y += (ty - vp.y) * Math.min(1, s * 3);

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // glow at the vanishing point while we're at warp speed
    const speedK = Math.min(1, Math.abs(vel) / HYPER);
    if (speedK > .05) {
      const R = Math.max(W, H) * (.25 + .25 * speedK);
      const g = ctx.createRadialGradient(vp.x, vp.y, 0, vp.x, vp.y, R);
      g.addColorStop(0, `rgba(150,210,255,${.22 * speedK})`);
      g.addColorStop(.35, `rgba(120,110,255,${.08 * speedK})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // exposure time of our "camera": a bit longer at warp speed = stronger motion blur
    const exposure = .06 + .1 * speedK;

    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.z -= vel * s;
      if (p.z < .03) { P[i] = make(1); continue; }            // flew past us → new one far away
      if (p.z > 1.05) { P[i] = make(.03 + Math.random() * .1); continue; } // (flying backwards)

      const [hx, hy] = project(p.x, p.y, p.z);
      if (hx < -80 || hx > W + 80 || hy < -80 || hy > H + 80) { P[i] = make(vel > 0 ? 1 : .05); continue; }
      const tz = Math.max(.02, Math.min(1.2, p.z + vel * exposure));
      const [tx2, ty2] = project(p.x, p.y, tz);

      const near = Math.max(0, 1 - p.z);                         // 0 far … 1 right in front of us
      const alpha = Math.min(.9, Math.pow(near, 1.6) * p.b * (1 + speedK * .6));
      if (alpha < .01) continue;
      const w = Math.min(4, .35 + 1.3 / (p.z * 4 + .4));
      const len = Math.hypot(hx - tx2, hy - ty2);

      if (len < 1.5) {
        ctx.fillStyle = `hsla(${p.hue},90%,75%,${alpha})`;
        ctx.beginPath(); ctx.arc(hx, hy, w * .6, 0, 7); ctx.fill();
        continue;
      }
      // Doppler: at high speed the front looks bluer/whiter, the tail redder
      const g = ctx.createLinearGradient(tx2, ty2, hx, hy);
      g.addColorStop(0, `hsla(${p.hue + 60 * speedK},90%,60%,0)`);
      g.addColorStop(.7, `hsla(${p.hue},95%,65%,${alpha * .55})`);
      g.addColorStop(1, `hsla(${p.hue - 25 * speedK},100%,${80 + 15 * speedK}%,${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(tx2, ty2); ctx.lineTo(hx, hy); ctx.stroke();
      // soft halo on the closest ones
      if (p.z < .3) {
        ctx.lineWidth = w * 3.5;
        ctx.strokeStyle = `hsla(${p.hue},100%,70%,${alpha * .12})`;
        ctx.stroke();
      }
    }

    // sparks: fly out explosively, then curl in the "magnetic field" and fade
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      const c = Math.cos(sp.curl), sn = Math.sin(sp.curl);
      const vx = sp.vx * c - sp.vy * sn, vy = sp.vx * sn + sp.vy * c;
      sp.vx = vx * .955; sp.vy = vy * .955;
      const [lx, ly] = sp.pts[sp.pts.length - 1];
      sp.pts.push([lx + sp.vx, ly + sp.vy]);
      if (sp.pts.length > 14) sp.pts.shift();
      sp.life -= sp.decay;
      if (sp.life <= 0) { sparks.splice(i, 1); continue; }
      const pts = sp.pts;
      const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `hsla(${sp.hue},90%,60%,0)`);
      g.addColorStop(1, `hsla(${sp.hue},100%,80%,${sp.life})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = sp.w;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  const lp = App.loop((dt, t) => frame(dt, t));

  function init() {
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = e.pointerType === 'mouse'; }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.on = false; });
    if (App.reduced) { frame(16, 0); return; }
    lp.start();
    document.addEventListener('visibilitychange', () => document.hidden ? lp.stop() : lp.start());
  }

  return { init, warp, burst };
})();
