// =========================================================
//  cloud.js — a live "cloud chamber": trails of α, β and μ
//  particles appear in the mist and slowly fade away
// =========================================================

(() => {
  const canvas = document.getElementById('cloudCanvas');
  const cA = document.getElementById('cA'), cB = document.getElementById('cB'), cM = document.getElementById('cM');
  let W, H, ctx;
  let trails = [], mist = [], count = { a: 0, b: 0, m: 0 };

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeMist() {
    mist = Array.from({ length: 7 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(120, 280), vx: rand(-.15, .15), vy: rand(-.08, .08) }));
  }

  // every trail is a line of tiny droplets that slowly drift apart and fade
  function droplets(pts, width, density) {
    const d = [];
    for (let k = 0; k < pts.length; k++) {
      for (let j = 0; j < density; j++) {
        const a = Math.random() * Math.PI * 2;
        d.push({ k, x: pts[k][0] + (Math.random() - .5) * width, y: pts[k][1] + (Math.random() - .5) * width, dx: Math.cos(a) * Math.random(), dy: Math.sin(a) * Math.random() + .15, r: Math.random() * .9 + .5 });
      }
    }
    return d;
  }

  function spawn(type, x, y) {
    x ??= rand(0, W); y ??= rand(0, H);
    const pts = [];
    let a = rand(0, Math.PI * 2);
    if (type === 'a') {
      // alpha: short, thick, straight
      const L = rand(35, 80);
      for (let s = 0; s <= L; s += 1.5) pts.push([x + Math.cos(a) * s, y + Math.sin(a) * s]);
      trails.push({ type, pts, drops: droplets(pts, 5, 5), color: '240,245,255', age: 0, grow: .1, life: 3.4, diff: 7 });
      count.a++;
    } else if (type === 'b') {
      // beta (electron): thin and wiggly, curls as it slows down
      const L = rand(90, 260);
      let px = x, py = y;
      for (let s = 0; s <= L; s += 2) {
        a += rand(-.22, .22) + (s / L) * .05;
        px += Math.cos(a) * 2; py += Math.sin(a) * 2;
        pts.push([px, py]);
      }
      trails.push({ type, pts, drops: droplets(pts, 1.5, 1), color: '170,225,255', age: 0, grow: .2, life: 2.8, diff: 5 });
      count.b++;
    } else {
      // muon: thin, perfectly straight, right across the chamber
      a = rand(Math.PI * .3, Math.PI * .7) + (Math.random() < .5 ? 0 : Math.PI);
      const L = Math.hypot(W, H);
      for (let s = -L; s <= L; s += 2.5) {
        const qx = x + Math.cos(a) * s, qy = y + Math.sin(a) * s;
        if (qx > -10 && qx < W + 10 && qy > -10 && qy < H + 10) pts.push([qx, qy]);
      }
      trails.push({ type, pts, drops: droplets(pts, 1.8, 1), color: '210,200,255', age: 0, grow: .08, life: 3, diff: 5 });
      count.m++;
    }
    cA.textContent = count.a; cB.textContent = count.b; cM.textContent = count.m;
  }

  function frame(dt) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx;
    if (r.w !== W || r.h !== H) { W = r.w; H = r.h; makeMist(); }
    const s = dt / 1000;

    // random arrivals
    if (Math.random() < s * 1.1) spawn('a');
    if (Math.random() < s * 2.2) spawn('b');
    if (Math.random() < s * .7) spawn('m');

    ctx.fillStyle = '#030409';
    ctx.fillRect(0, 0, W, H);
    for (const m of mist) {
      m.x += m.vx; m.y += m.vy;
      if (m.x < -m.r) m.x = W + m.r; if (m.x > W + m.r) m.x = -m.r;
      if (m.y < -m.r) m.y = H + m.r; if (m.y > H + m.r) m.y = -m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, 'rgba(120,150,210,.05)'); g.addColorStop(1, 'rgba(120,150,210,0)');
      ctx.fillStyle = g; ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
    }
    const side = ctx.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(180,200,255,.07)'); side.addColorStop(.5, 'rgba(0,0,0,0)');
    ctx.fillStyle = side; ctx.fillRect(0, 0, W, H);

    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      t.age += s;
      if (t.age > t.life) { trails.splice(i, 1); continue; }
      const grow = Math.min(1, t.age / t.grow);
      const fade = 1 - Math.max(0, (t.age - t.grow) / (t.life - t.grow));
      const shown = Math.floor(t.pts.length * grow);
      const spread = t.age * t.diff;
      // soft glow under the fresh trail
      if (fade > .6) {
        ctx.strokeStyle = `rgba(${t.color},${.08 * fade})`;
        ctx.lineWidth = t.type === 'a' ? 12 : 5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(t.pts[0][0], t.pts[0][1]);
        for (let k = 1; k < shown; k++) ctx.lineTo(t.pts[k][0], t.pts[k][1]);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${t.color},${Math.min(1, .95 * fade * fade + .05)})`;
      for (const d of t.drops) {
        if (d.k > shown) continue;
        ctx.fillRect(d.x + d.dx * spread, d.y + d.dy * spread, d.r, d.r);
      }
    }
  }

  canvas.parentElement.addEventListener('click', e => {
    const b = canvas.getBoundingClientRect();
    spawn('m', e.clientX - b.left, e.clientY - b.top);
    App.vibrate(8);
  });

  const lp = App.loop(frame);
  App.on('learned', {
    enter() { lp.start(); if (!trails.length) setTimeout(() => { for (let i = 0; i < 6; i++) spawn(['a', 'b', 'b', 'm'][i % 4]); }, 100); },
    leave() { lp.stop(); }
  });
})();
