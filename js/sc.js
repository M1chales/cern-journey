// =========================================================
//  sc.js — the Synchrocyclotron, seen from above.
//  A proton spirals out, getting a push at the gap every half
//  turn. Fixed frequency = it falls out of step and stalls.
//  Frequency drops (the "synchro" part) = it reaches 600 MeV.
//  Real numbers for B, radius and frequency; the energy per
//  turn is exaggerated so it takes seconds, not 1.3 ms.
// =========================================================

(() => {
  const canvas = document.getElementById('scCanvas');
  if (!canvas) return;
  const tabs = document.getElementById('scTabs');
  const eEl = document.getElementById('scE');
  const vEl = document.getElementById('scV');
  const gEl = document.getElementById('scG');
  const fEl = document.getElementById('scF');
  const statusEl = document.getElementById('scStatus');
  const T = App.T;
  const TAU = Math.PI * 2;

  // ---- physics (real machine values) ----
  const M = 938.272;                 // proton mass, MeV
  const R_MAX = 2.26;                // m, orbit at 600 MeV
  const K_MAX = 600;                 // MeV
  const Bof = r => 1.94 - 0.14 * (r / R_MAX) ** 2;   // field falls a bit with radius (focusing)
  function orbit(K) {
    const g = 1 + K / M;
    const p = Math.sqrt((K + M) ** 2 - M * M) / 1000;  // GeV/c
    let r = 0;
    for (let i = 0; i < 4; i++) r = p / (0.2998 * Bof(r));
    return { g, r, f: 15.2458 * Bof(r) / g, beta: Math.sqrt(1 - 1 / (g * g)) };  // f in MHz
  }
  const F0 = orbit(0).f;             // ≈ 29.6 MHz

  // ---- visual tuning ----
  const V = 12;                      // MeV per turn (the real machine: ~0.03)
  const PHI_S = 30 * Math.PI / 180;  // synchronous phase
  const SLIP = 6;                    // phase slip scale, so the cyclotron stalls near ~35 MeV like a real one would
  const REV = 6.5;                   // turns per second on screen, at the start
  const R0 = 0.10;                   // m, where the ion source puts it

  let mode = 'sync';
  let s, trail, kicks, status = null, wait = 0;

  function reset() {
    s = { K: 0, th: -Math.PI / 2 + 0.01, phi: mode === 'sync' ? PHI_S : -40 * Math.PI / 180,
          f: F0, peak: 0, phase: 'run', t: 0, ex: null };
    trail = [];
    kicks = [];
    setStatus(mode === 'sync' ? 'sync' : 'cyc');
  }

  const MSG = {
    sync: () => ({ cls: 'ok', t: { en: 'In step: the frequency drops with the proton, so every push arrives on time.', el: 'Σε συγχρονισμό: η συχνότητα πέφτει μαζί με το πρωτόνιο, οπότε κάθε ώθηση έρχεται στην ώρα της.' } }),
    cyc: () => ({ cls: '', t: { en: 'Fixed rhythm, like a normal cyclotron. So far, so good…', el: 'Σταθερός ρυθμός, όπως σε ένα κανονικό κύκλοτρο. Μέχρι στιγμής όλα καλά…' } }),
    stuck: k => ({ cls: 'bad', t: { en: `Out of step at about ${k} MeV. Each lap now takes longer than the rhythm, so the pushes arrive late and slow it down.`, el: `Εκτός συγχρονισμού στα ${k} MeV περίπου. Κάθε γύρος κρατάει πια περισσότερο από τον ρυθμό, οπότε οι ωθήσεις αργούν και το φρενάρουν.` } }),
    out: () => ({ cls: 'ok', t: { en: '600 MeV! Out through the extraction channel, towards the experiments.', el: '600 MeV! Βγαίνει από το κανάλι εξαγωγής, προς τα πειράματα.' } })
  };
  function setStatus(key, arg) {
    status = { key, arg };
    const m = MSG[key](arg);
    statusEl.className = 'sc-status ' + m.cls;
    statusEl.textContent = T(m.t);
  }
  document.addEventListener('langchange', () => status && setStatus(status.key, status.arg));

  tabs.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.mode === mode) { reset(); return; }
    mode = b.dataset.mode;
    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    reset();
  });

  // ---- one frame of physics ----
  function stepPhysics(dt) {
    s.t += dt;
    if (s.phase === 'wait') {
      wait -= dt;
      if (wait <= 0) reset();
      return;
    }
    if (s.phase === 'extract') {
      // straight out along the tangent
      s.ex.d += dt * 2.6;
      if (s.ex.d > 3.2) { s.phase = 'wait'; wait = 1.4; }
      return;
    }
    const o = orbit(s.K);
    s.f = mode === 'sync' ? o.f : F0;
    const w = TAU * REV * (o.f / F0);          // on-screen angular speed follows the real revolution frequency
    let left = w * dt;
    while (left > 0) {
      const d = Math.min(left, 0.08);
      const before = Math.floor((s.th - Math.PI / 2) / Math.PI);
      s.th += d;
      left -= d;
      const r = orbit(s.K).r;
      trail.push({ r, th: s.th, k: s.K });
      // crossed the gap (the vertical line through the centre)?
      if (s.phase !== 'full' && Math.floor((s.th - Math.PI / 2) / Math.PI) !== before) {
        const c = Math.cos(s.phi);
        s.K = Math.max(0, s.K + V / 2 * c);
        kicks.push(c);
        if (kicks.length > 60) kicks.shift();
        if (mode === 'sync') s.phi = PHI_S;
        else s.phi += SLIP * Math.PI * (F0 / orbit(s.K).f - 1);
        s.peak = Math.max(s.peak, s.K);
        if (mode === 'cyc' && s.phase === 'run' && s.phi > Math.PI / 2) {
          s.phase = 'stuck';
          s.stuckT = 0;
          setStatus('stuck', Math.round(s.peak / 5) * 5);
          App.vibrate(20);
        }
      }
      if (mode === 'sync' && s.K >= K_MAX && s.phase === 'run') {
        s.K = K_MAX;
        s.phase = 'full';             // coast on the last orbit until it reaches the extraction channel
      }
      if (s.phase === 'full' && Math.floor(s.th / TAU) !== Math.floor((s.th - d) / TAU)) {
        s.th = Math.ceil((s.th - d) / TAU) * TAU;
        s.phase = 'extract';
        s.ex = { th: s.th, r: orbit(K_MAX).r, d: 0 };
        setStatus('out');
        App.vibrate([15, 40, 15]);
        break;
      }
    }
    if (s.phase === 'stuck') {
      s.stuckT += dt;
      // slowed right back down (or gave up): lost, next pulse
      if (s.K < 0.5 || s.stuckT > 3.2) { s.phase = 'wait'; wait = 2.2; }
    }
    if (trail.length > 2600) trail.splice(0, trail.length - 2600);
  }

  // ---- drawing ----
  function draw() {
    const { ctx, w, h } = App.fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const stripH = 58;
    const areaH = h - stripH;
    const cx = w / 2, cy = areaH / 2 + 4;
    const R = Math.min(w * 0.36, areaH * 0.38);
    const px = r => R * r / R_MAX;

    // magnet yoke (the red frame in the photos)
    ctx.fillStyle = '#3a1119';
    ctx.strokeStyle = '#8d2a3a';
    ctx.lineWidth = 2;
    const yw = R * 2.55, yh = R * 1.55;
    ctx.beginPath();
    ctx.rect(cx - yw / 2, cy - yh / 2, yw, yh);
    ctx.fill(); ctx.stroke();
    // pole
    const pg = ctx.createRadialGradient(cx, cy, R * .1, cx, cy, R * 1.12);
    pg.addColorStop(0, '#20263a'); pg.addColorStop(1, '#141828');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    ctx.stroke();
    // the dee (one hollow electrode) and the gap
    ctx.fillStyle = 'rgba(76,201,240,.07)';
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(76,201,240,.35)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.08); ctx.lineTo(cx, cy + R * 1.08); ctx.stroke();
    ctx.setLineDash([]);

    // extraction channel
    const exR = px(R_MAX);
    ctx.strokeStyle = 'rgba(46,229,157,.45)';
    ctx.lineWidth = 3;
    const exEnd = h - stripH - 14;
    ctx.beginPath(); ctx.moveTo(cx + exR + 5, cy + 6); ctx.lineTo(cx + exR + 5, exEnd); ctx.stroke();
    ctx.lineWidth = 1;

    // labels
    ctx.font = '600 10.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(207,214,238,.55)';
    ctx.fillText(T({ en: 'GAP', el: 'ΔΙΑΚΕΝΟ' }), cx, cy - R * 1.14 - 4);
    ctx.fillText('DEE', cx - R * .55, cy - R * .8);
    ctx.fillStyle = 'rgba(46,229,157,.8)';
    ctx.textAlign = 'right';
    ctx.fillText(T({ en: 'to experiments ↓', el: 'προς πειράματα ↓' }), cx + exR - 2, exEnd - 2);

    // ROTCO (spins when the frequency is being swept)
    const rx = w - 34, ry = 34, rr = 18;
    const spin = mode === 'sync' && s.phase === 'run' ? s.t * 7 : 0;
    ctx.save();
    ctx.translate(rx, ry); ctx.rotate(spin);
    ctx.strokeStyle = mode === 'sync' ? 'rgba(76,201,240,.9)' : 'rgba(207,214,238,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 32; i++) {
      const a = i / 32 * TAU, q = i % 2 ? rr : rr - 4;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q);
    }
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(207,214,238,.6)';
    ctx.textAlign = 'right';
    ctx.fillText('ROTCO', rx - rr - 6, ry + 4);

    // trail, older = fainter
    const n = trail.length;
    if (n > 1) {
      const CH = 40;
      for (let i0 = 0; i0 < n - 1; i0 += CH) {
        const a = (i0 + CH) / n;
        ctx.strokeStyle = `rgba(76,201,240,${(0.08 + a * a * 0.8).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = i0; i <= Math.min(n - 1, i0 + CH); i++) {
          const p = trail[i];
          const x = cx + px(p.r) * Math.cos(p.th), y = cy + px(p.r) * Math.sin(p.th);
          ctx[i === i0 ? 'moveTo' : 'lineTo'](x, y);
        }
        ctx.stroke();
      }
    }

    // the proton
    let hx, hy;
    if (s.phase === 'extract' || (s.phase === 'wait' && s.ex)) {
      const e = s.ex, r0 = px(e.r);
      const x0 = cx + r0 * Math.cos(e.th) + 5 * Math.cos(e.th), y0 = cy + r0 * Math.sin(e.th);
      const dx = -Math.sin(e.th), dy = Math.cos(e.th);
      const d = Math.min(e.d * R, h - stripH - 14 - y0);
      hx = x0 + dx * d; hy = y0 + dy * d;
      ctx.strokeStyle = 'rgba(46,229,157,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(hx, hy); ctx.stroke(); ctx.lineWidth = 1;
    } else {
      const r = px(orbit(s.K).r);
      hx = cx + r * Math.cos(s.th); hy = cy + r * Math.sin(s.th);
    }
    if (s.phase !== 'wait') {
      const col = s.phase === 'stuck' ? '255,77,109' : s.phase === 'extract' ? '46,229,157' : '255,255,255';
      const gl = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
      gl.addColorStop(0, `rgba(${col},.9)`); gl.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gl; ctx.fillRect(hx - 14, hy - 14, 28, 28);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fill();
    }

    // pushes strip
    const sy = h - stripH + 8, mid = sy + (stripH - 16) / 2, amp = (stripH - 20) / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath(); ctx.moveTo(10, mid); ctx.lineTo(w - 10, mid); ctx.stroke();
    ctx.fillStyle = 'rgba(207,214,238,.5)';
    ctx.textAlign = 'left';
    ctx.fillText(T({ en: 'PUSHES AT THE GAP', el: 'ΩΘΗΣΕΙΣ ΣΤΟ ΔΙΑΚΕΝΟ' }), 10, sy - 1);
    const bw = Math.max(3, (w - 20) / 60);
    kicks.forEach((c, i) => {
      const x = 10 + i * bw;
      ctx.fillStyle = c >= 0 ? `rgba(46,229,157,${.35 + .6 * c})` : `rgba(255,77,109,${.35 - .6 * c})`;
      const bh = Math.max(1.5, Math.abs(c) * amp);
      ctx.fillRect(x, c >= 0 ? mid - bh : mid, bw - 1.5, bh);
    });
  }

  function meters() {
    const o = orbit(s.K);
    eEl.textContent = (s.K < 10 ? s.K.toFixed(1) : Math.round(s.K)) + ' MeV';
    vEl.textContent = o.beta.toFixed(3) + ' c';
    gEl.textContent = o.g.toFixed(2);
    fEl.textContent = s.f.toFixed(1) + ' MHz';
    fEl.classList.toggle('bad', s.phase === 'stuck');
  }

  reset();
  const lp = App.loop(dt => {
    stepPhysics(dt / 1000);
    draw();
    meters();
  });
  App.on('sc', { enter() { lp.start(); }, leave() { lp.stop(); } });
  addEventListener('resize', () => { if (!lp.running) draw(); });
})();
