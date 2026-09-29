// =========================================================
//  intro.js — the opening: two proton bunches accelerate,
//  collide in the middle, and explode into particle tracks
// =========================================================

const Intro = (() => {
  const el = document.getElementById('intro');
  const canvas = document.getElementById('introCanvas');
  const status = document.getElementById('introStatus');
  let ctx, W, H, t0 = 0, raf = null, finished = false;
  let bunches = [], tracks = [], stars = [];
  let collided = false, flash = 0;

  const TRACK_COLORS = ['#4cc9f0', '#ff4d6d', '#2ee59d', '#ffd166', '#b38bff', '#ffffff'];

  function size() {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h;
    stars = Array.from({ length: 260 }, () => newStar(Math.random()));
  }

  // stars live in 3D: (x, y) around the axis, z = distance (1 far … 0 at the camera)
  function newStar(z) {
    const a = Math.random() * Math.PI * 2, r = .08 + Math.random() * 1.5;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * (H / W), z, hue: [200, 215, 250, 290][(Math.random() * 4) | 0] };
  }
  let starV = .04;
  function drawStars(speed, dt) {
    starV += (speed - starV) * Math.min(1, dt / 90);
    const Fk = Math.max(W, H) * .45, cx = W / 2, cy = H / 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= starV * dt / 1000;
      if (s.z < .02) { stars[i] = newStar(1); continue; }
      const hx = cx + s.x / s.z * Fk, hy = cy + s.y / s.z * Fk;
      if (hx < -50 || hx > W + 50 || hy < -50 || hy > H + 50) { stars[i] = newStar(1); continue; }
      const tz = Math.min(1.2, s.z + starV * .07);
      const tx = cx + s.x / tz * Fk, ty = cy + s.y / tz * Fk;
      const a = Math.min(.95, Math.pow(1 - s.z, 1.5));
      ctx.strokeStyle = `hsla(${s.hue},90%,78%,${a})`;
      ctx.lineWidth = Math.min(3, .4 + 1 / (s.z * 5 + .3));
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx + .1, hy); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function makeBunch(side) {
    return Array.from({ length: 18 }, () => ({
      dx: (Math.random() - .5) * 26, dy: (Math.random() - .5) * 10, side
    }));
  }

  function makeTracks() {
    tracks = [];
    const n = W < 600 ? 90 : 150;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      tracks.push({
        x: W / 2, y: H / 2,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        // low-momentum particles curl a lot, high-momentum ones almost straight
        curl: (Math.random() < .5 ? -1 : 1) * (0.004 + Math.random() * Math.random() * .08),
        pts: [[W / 2, H / 2]],
        c: TRACK_COLORS[(Math.random() * TRACK_COLORS.length) | 0],
        w: Math.random() * 1.4 + .5,
        life: 1
      });
    }
  }

  const ease = p => p * p * p;

  let lastT = 0;
  function draw(t) {
    const e = t - t0;
    const dt = Math.min(50, t - (lastT || t)); lastT = t;
    ctx.fillStyle = 'rgba(2,3,10,.38)';
    ctx.fillRect(0, 0, W, H);

    // we ride along with the beam: the stars stretch into streaks as it speeds up,
    // peak at the collision, then settle
    const APP = 1900;
    const speed = e < APP ? .05 + 3.2 * Math.pow(e / APP, 3) : Math.max(.08, 3.2 * Math.exp(-(e - APP) / 500));
    drawStars(speed, dt);

    const cy = H / 2;
    // beam pipe guide line
    ctx.strokeStyle = 'rgba(76,201,240,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

    const APPROACH = 1900;
    if (e < APPROACH) {
      const p = ease(e / APPROACH);
      const gx = W / 2 - 12;
      for (const b of bunches) {
        const x = b.side < 0 ? -40 + (gx + 40) * p + b.dx : W + 40 - (gx + 40) * p + b.dx;
        const y = cy + b.dy * (1 - p * .7);
        const col = b.side < 0 ? '#4cc9f0' : '#ff7a3d';
        const tail = 14 + Math.pow(p, 2) * 420;
        const g = ctx.createLinearGradient(x - b.side * -tail, y, x, y);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, col);
        ctx.strokeStyle = g;
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 2 + p * 2;
        ctx.beginPath(); ctx.moveTo(x + (b.side < 0 ? -tail : tail), y); ctx.lineTo(x, y); ctx.stroke();
        ctx.lineWidth = 8 + p * 8; ctx.globalAlpha = .12;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // status text
      const energy = p < .3 ? '160 MeV' : p < .55 ? '26 GeV' : p < .8 ? '450 GeV' : '6.8 TeV';
      status.textContent = T({ en: 'Accelerating · ', el: 'Επιτάχυνση · ' }) + energy;
    } else if (!collided) {
      collided = true;
      flash = 1;
      makeTracks();
      status.textContent = T({ en: 'Collision!', el: 'Σύγκρουση!' });
      App.vibrate([30, 40, 60]);
    }

    if (collided) {
      // flash
      if (flash > 0) {
        const g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W, H) * .6 * (1.2 - flash * .4));
        g.addColorStop(0, `rgba(255,255,255,${flash})`);
        g.addColorStop(.25, `rgba(160,220,255,${flash * .5})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        flash *= .9;
        if (flash < .01) flash = 0;
      }
      // tracks
      ctx.lineCap = 'round';
      for (const tr of tracks) {
        if (tr.life > 0) {
          for (let k = 0; k < 3; k++) {
            const c = Math.cos(tr.curl), s = Math.sin(tr.curl);
            const vx = tr.vx * c - tr.vy * s, vy = tr.vx * s + tr.vy * c;
            tr.vx = vx * .995; tr.vy = vy * .995;
            tr.x += tr.vx; tr.y += tr.vy;
            tr.pts.push([tr.x, tr.y]);
          }
          if (tr.pts.length > 160 || tr.x < -50 || tr.x > W + 50 || tr.y < -50 || tr.y > H + 50) tr.life = 0;
        }
        ctx.strokeStyle = tr.c;
        ctx.lineWidth = tr.w;
        ctx.globalAlpha = .9;
        ctx.beginPath();
        const pts = tr.pts;
        const from = Math.max(0, pts.length - 18);
        ctx.moveTo(pts[from][0], pts[from][1]);
        for (let k = from + 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (e > APPROACH + 2100) return finish();
    }
    raf = requestAnimationFrame(draw);
  }

  function start() {
    el.classList.add('running');
    size();
    bunches = [...makeBunch(-1), ...makeBunch(1)];
    collided = false;
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, W, H);
    t0 = performance.now();
    raf = requestAnimationFrame(draw);
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    el.classList.add('done');
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    BG.burst(innerWidth / 2, innerHeight / 2, 120);
    setTimeout(() => el.remove(), 1000);
  }

  function init() {
    let seen = false;
    try { seen = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}
    if (seen || App.reduced) { el.remove(); return; }
    size();
    // idle: the starfield drifts slowly towards us until the beam is injected
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H);
    let idleLast = 0;
    (function idle(t) {
      if (el.classList.contains('running') || finished) return;
      const dt = Math.min(50, t - (idleLast || t)); idleLast = t;
      ctx.fillStyle = 'rgba(2,3,10,.45)'; ctx.fillRect(0, 0, W, H);
      drawStars(.05, dt);
      requestAnimationFrame(idle);
    })(performance.now());
    document.getElementById('introGo').onclick = start;
    document.getElementById('introSkip').onclick = finish;
    document.addEventListener('keydown', function k(e) {
      if (!document.body.contains(el)) return document.removeEventListener('keydown', k);
      if (e.key === 'Escape') finish();
      if ((e.key === 'Enter' || e.key === ' ') && !el.classList.contains('running')) { e.preventDefault(); start(); }
    });
  }

  return { init };
})();
