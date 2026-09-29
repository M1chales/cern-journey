// =========================================================
//  hero.js — the LHC ring on the home page, seen in perspective.
//  Two beams go around in opposite directions and collide
//  at the four experiments.
// =========================================================

(() => {
  const canvas = document.getElementById('heroCanvas');
  let ctx, W, H, time = 0;
  let flashes = [];
  const IPS = [
    { a: Math.PI / 2, name: 'ATLAS' },
    { a: Math.PI, name: 'ALICE' },
    { a: -Math.PI / 2, name: 'CMS' },
    { a: 0, name: 'LHCb' }
  ];

  const word = document.querySelector('.hero-title .grad-text');
  function geom() {
    const rx = Math.min(W * .47, 640);
    const b = word.getBoundingClientRect();
    const cy = b.height ? b.top + b.height * .55 : H * .4;
    return { cx: W / 2, cy, rx, ry: Math.min(rx * .2, b.height * .9 || 80) };
  }
  const pos = (g, a) => [g.cx + Math.cos(a) * g.rx, g.cy + Math.sin(a) * g.ry];

  function drawRing(g, front) {
    // draw only the back half or only the front half, so the text sits "inside" the ring
    ctx.lineWidth = 2;
    const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : Math.PI * 2;
    const grad = ctx.createLinearGradient(g.cx - g.rx, 0, g.cx + g.rx, 0);
    // bright at the sides, almost invisible in the middle where the text is
    grad.addColorStop(0, 'rgba(76,201,240,.55)');
    grad.addColorStop(.3, 'rgba(76,201,240,.12)');
    grad.addColorStop(.5, 'rgba(76,201,240,.03)');
    grad.addColorStop(.7, 'rgba(155,107,255,.12)');
    grad.addColorStop(1, 'rgba(155,107,255,.55)');
    ctx.strokeStyle = grad;
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, a0, a1); ctx.stroke();
    ctx.globalAlpha = front ? .35 : .15;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, a0, a1); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBeam(g, a, color, dir, speedK) {
    // a bunch at ~c: white-hot head + a long light trail that tapers and fades.
    // The trail gets longer the faster the beam goes (motion blur).
    const len = .25 + 1.35 * speedK;
    const N = 36;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    let [px, py] = pos(g, a);
    for (let k = 1; k <= N; k++) {
      const aa = a - dir * len * k / N;
      const [x, y] = pos(g, aa);
      const depth = (Math.sin(aa) + 1) / 2;                          // 1 = front of the ring
      const side = Math.min(1, Math.cos(aa) ** 2 * 2.2 + .04);        // fade in front of the text
      const f = 1 - k / N;
      const al = f * f * (.35 + .65 * depth) * side;
      ctx.strokeStyle = color;
      ctx.globalAlpha = al * .18;                                      // glow
      ctx.lineWidth = (2 + depth * 5) * (.4 + f) * 3;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = al;                                            // core
      ctx.lineWidth = (1 + depth * 2.4) * (.3 + f);
      ctx.stroke();
      px = x; py = y;
    }
    const [x, y] = pos(g, a);
    const side = Math.min(1, Math.cos(a) ** 2 * 2.2 + .04);
    const depth = (Math.sin(a) + 1) / 2;
    ctx.globalAlpha = side;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 10 + depth * 10);
    rg.addColorStop(0, '#fff'); rg.addColorStop(.25, color); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(x, y, 10 + depth * 10, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  let phase = 0, omega = 0, lastQ = 0, enterT = 0;
  function frame(dt) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h;
    time += dt / 1000;
    ctx.clearRect(0, 0, W, H);
    const g = geom();

    drawRing(g, false);

    // experiment labels
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const ip of IPS) {
      const [x, y] = pos(g, ip.a);
      const front = Math.sin(ip.a) > -0.01;
      ctx.globalAlpha = front ? .9 : .45;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
      // only label the side experiments, so nothing sits on top of the text
      if (W > 700 && Math.abs(Math.sin(ip.a)) < .1) { ctx.fillStyle = 'rgba(255,209,102,.8)'; ctx.fillText(ip.name, x, y - 14); }
    }
    ctx.globalAlpha = 1;

    // the beams are injected and ramped up very fast, then circulate at full speed
    const W_MAX = 2.4; // rad/s — slowed down a LOT: the real ones do 11,245 laps a second
    const since = time - enterT;
    const target = since < .9 ? W_MAX * Math.pow(Math.min(1, since / .9), 2.2) : W_MAX;
    omega += (target - omega) * Math.min(1, dt / 60);
    phase += omega * dt / 1000;
    const a = phase;
    const speedK = omega / W_MAX;
    // two bunches per beam, opposite directions: they always meet at the 4 IPs
    for (let k = 0; k < 2; k++) {
      drawBeam(g, a + k * Math.PI, '#4cc9f0', 1, speedK);
      drawBeam(g, -a + k * Math.PI, '#ff7a3d', -1, speedK);
    }

    // collisions: every time the beams pass a quarter turn they meet at two IPs
    const qNow = Math.floor(a / (Math.PI / 2));
    const crossed = qNow !== lastQ;
    lastQ = qNow;
    if (crossed && speedK > .3) {
      const q = qNow;
      for (let k = 0; k < 2; k++) {
        const ang = q * Math.PI / 2 + k * Math.PI;
        const [x, y] = pos(g, ang);
        const rays = Array.from({ length: 14 }, () => ({ a: Math.random() * Math.PI * 2, l: 10 + Math.random() * 34, c: ['#4cc9f0', '#ffd166', '#ff4d6d', '#2ee59d', '#fff'][(Math.random() * 5) | 0] }));
        flashes.push({ x, y, t: time, rays, depth: (Math.sin(ang) + 1) / 2 });
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const age = time - f.t;
      if (age > .9) { flashes.splice(i, 1); continue; }
      const p = age / .9;
      const al = (1 - p) * (.4 + .6 * f.depth);
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 40);
      rg.addColorStop(0, `rgba(255,255,255,${al})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(f.x - 40, f.y - 40, 80, 80);
      ctx.lineWidth = 1.2;
      for (const r of f.rays) {
        ctx.globalAlpha = al;
        ctx.strokeStyle = r.c;
        const L = r.l * (0.3 + p) * (.5 + f.depth * .5);
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(r.a) * L * .3, f.y + Math.sin(r.a) * L * .3 * .5);
        ctx.lineTo(f.x + Math.cos(r.a) * L, f.y + Math.sin(r.a) * L * .5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawRing(g, true);
  }

  const lp = App.loop(frame);
  App.on('home', {
    enter() { enterT = time; omega = 0; if (App.reduced) frame(16); else lp.start(); },
    leave() { lp.stop(); }
  });
})();
