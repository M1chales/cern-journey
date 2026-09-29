// =========================================================
//  higgs.js — discover the Higgs boson yourself.
//  Simulated two-photon (γγ) mass spectrum: a falling
//  background + a small bump at 125 GeV. Collect data until
//  the bump is 5σ above the background.
// =========================================================

(() => {
  const canvas = document.getElementById('higgsCanvas');
  const runBtn = document.getElementById('hRun');
  const resetBtn = document.getElementById('hReset');
  const sigFill = document.getElementById('sigFill');
  const sigVal = document.getElementById('sigVal');
  const nEl = document.getElementById('hN');
  const pEl = document.getElementById('hP');
  const banner = document.getElementById('discBanner');

  const MIN = 100, MAX = 160, NB = 60;
  const TAU = 33;          // background slope (GeV)
  const MH = 125, SH = 1.8; // Higgs mass & detector resolution
  const FS = 0.011;        // fraction of events that are signal
  const NMAX = 62000;
  const WIN = [121, 129];  // where we look for the bump

  let bins = new Array(NB).fill(0);
  let N = 0, running = false, discovered = false, Z = 0, yMax = 10;

  const bgNorm = 1 - Math.exp(-(MAX - MIN) / TAU);
  const bgCdf = m => (1 - Math.exp(-(m - MIN) / TAU)) / bgNorm;
  const bgInBin = i => bgCdf(MIN + i + 1) - bgCdf(MIN + i);
  const pWin = bgCdf(WIN[1]) - bgCdf(WIN[0]);
  const gauss = (m) => Math.exp(-((m - MH) ** 2) / (2 * SH * SH)) / (SH * Math.sqrt(2 * Math.PI));

  function sample() {
    if (Math.random() < FS) {
      // Box–Muller
      const u = 1 - Math.random(), v = Math.random();
      return MH + SH * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    return MIN - TAU * Math.log(1 - Math.random() * bgNorm);
  }

  function addEvents(n) {
    for (let i = 0; i < n; i++) {
      const m = sample();
      if (m < MIN || m >= MAX) continue;
      bins[Math.floor(m - MIN)]++;
      N++;
    }
    let obs = 0;
    for (let i = WIN[0] - MIN; i < WIN[1] - MIN; i++) obs += bins[i];
    const B = N * (1 - FS) * pWin;
    Z = B > 0 ? Math.max(0, (obs - B) / Math.sqrt(B)) : 0;
  }

  // one-sided p-value for a Zσ excess
  function pValue(z) {
    if (z < 3) return .5 * (1 - erf(z / Math.SQRT2));
    const phi = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    return phi / z * (1 - 1 / (z * z) + 3 / z ** 4);
  }
  function fmtOdds(p) {
    const n = 1 / p;
    const w = T({ en: '1 in ', el: '1 στα ' });
    if (n < 100) return w + n.toFixed(n < 10 ? 1 : 0);
    if (n < 1e6) return w + Math.round(n).toLocaleString('en-US');
    if (n < 1e9) return w + (n / 1e6).toFixed(1) + T({ en: ' million', el: ' εκατ.' });
    return w + (n / 1e9).toFixed(1) + T({ en: ' billion', el: ' δισ.' });
  }

  function draw() {
    const { ctx, w, h } = App.fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const L = 54, Rm = 16, Tm = 40;
    const splitY = h * .68, bottom = h - 34;
    const X = m => L + (m - MIN) / (MAX - MIN) * (w - L - Rm);

    // scale
    const bgPeak = N * (1 - FS) * bgInBin(0);
    const target = Math.max(10, bgPeak * 1.25, ...bins) ;
    yMax += (target - yMax) * .15;
    const Y = v => splitY - v / yMax * (splitY - Tm);

    // grid + axes
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    ctx.fillStyle = '#6f7894'; ctx.font = '10.5px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
    const step = niceStep(yMax / 4);
    for (let v = 0; v <= yMax; v += step) {
      ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - Rm, Y(v)); ctx.stroke();
      ctx.fillText(v >= 1000 ? (v / 1000) + 'k' : v, L - 6, Y(v) + 3);
    }
    ctx.textAlign = 'center';
    for (let m = 100; m <= 160; m += 10) {
      ctx.beginPath(); ctx.moveTo(X(m), Tm); ctx.lineTo(X(m), bottom); ctx.stroke();
      ctx.fillText(m, X(m), bottom + 14);
    }
    ctx.fillStyle = '#9aa4c2'; ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('m(γγ) [GeV]', w - Rm, bottom + 28);
    ctx.save(); ctx.translate(14, (Tm + splitY) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText(T({ en: 'Events / GeV', el: 'Γεγονότα / GeV' }), 0, 0); ctx.restore();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '800 14px Manrope, Inter, sans-serif';
    ctx.fillText(T({ en: 'Simulated data', el: 'Προσομοιωμένα δεδομένα' }), L + 8, 22);

    // window highlight
    ctx.fillStyle = Z >= 5 ? 'rgba(255,209,102,.1)' : 'rgba(76,201,240,.06)';
    ctx.fillRect(X(WIN[0]), Tm, X(WIN[1]) - X(WIN[0]), bottom - Tm);

    if (N > 0) {
      // background (dashed) and signal+background (red)
      const bgAt = m => N * (1 - FS) * (Math.exp(-(m - MIN) / TAU) / (TAU * bgNorm));
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]); ctx.strokeStyle = '#6f93ff';
      ctx.beginPath();
      for (let m = MIN; m <= MAX; m += .5) { const y = Y(bgAt(m)); m === MIN ? ctx.moveTo(X(m), y) : ctx.lineTo(X(m), y); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ff4d6d';
      ctx.beginPath();
      for (let m = MIN; m <= MAX; m += .25) { const y = Y(bgAt(m) + N * FS * gauss(m)); m === MIN ? ctx.moveTo(X(m), y) : ctx.lineTo(X(m), y); }
      ctx.stroke();

      // data points with error bars
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2;
      bins.forEach((c, i) => {
        const x = X(MIN + i + .5), e = Math.sqrt(c);
        ctx.beginPath(); ctx.moveTo(x, Y(c - e)); ctx.lineTo(x, Y(c + e)); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, Y(c), 2.6, 0, 7); ctx.fill();
      });

      // lower panel: data − background
      const resMax = Math.max(20, N * FS * gauss(MH) * 1.8, Math.sqrt(bgPeak) * 3.2);
      const midY = (splitY + 16 + bottom) / 2;
      const RY = v => midY - v / resMax * (bottom - splitY - 16) / 2;
      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.moveTo(L, midY); ctx.lineTo(w - Rm, midY); ctx.stroke();
      ctx.fillStyle = '#6f7894'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(T({ en: 'data − background', el: 'δεδομένα − θόρυβος' }), L + 6, splitY + 26);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let m = MIN; m <= MAX; m += .25) { const y = RY(N * FS * gauss(m)); m === MIN ? ctx.moveTo(X(m), y) : ctx.lineTo(X(m), y); }
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
      bins.forEach((c, i) => {
        const x = X(MIN + i + .5);
        const exp = N * (1 - FS) * bgInBin(i);
        const d = c - exp, e = Math.sqrt(c);
        const clamp = v => Math.max(splitY + 16, Math.min(bottom, v));
        ctx.beginPath(); ctx.moveTo(x, clamp(RY(d - e))); ctx.lineTo(x, clamp(RY(d + e))); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, clamp(RY(d)), 2, 0, 7); ctx.fill();
      });

      // legend
      ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
      const lx = w - Rm - 150, ly = Tm + 12;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, 7); ctx.fill();
      ctx.fillText(T({ en: 'Data', el: 'Δεδομένα' }), lx + 10, ly + 4);
      ctx.strokeStyle = '#6f93ff'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(lx - 6, ly + 18); ctx.lineTo(lx + 6, ly + 18); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText(T({ en: 'Background', el: 'Θόρυβος' }), lx + 10, ly + 22);
      ctx.strokeStyle = '#ff4d6d'; ctx.beginPath(); ctx.moveTo(lx - 6, ly + 36); ctx.lineTo(lx + 6, ly + 36); ctx.stroke();
      ctx.fillText(T({ en: 'Signal + background', el: 'Σήμα + θόρυβος' }), lx + 10, ly + 40);
    } else {
      ctx.fillStyle = '#8a93b0'; ctx.font = `500 ${w < 500 ? 12 : 14}px Inter, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(T({ en: 'No data yet', el: 'Κανένα δεδομένο ακόμα' }), (L + w - Rm) / 2, (Tm + splitY) / 2 - 10);
      ctx.fillText(T({ en: 'Press "Collect data"', el: 'Πάτα «Μάζεψε δεδομένα»' }), (L + w - Rm) / 2, (Tm + splitY) / 2 + 10);
    }
  }

  function niceStep(x) {
    const p = 10 ** Math.floor(Math.log10(x)), m = x / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }

  function updateUI() {
    sigFill.style.width = Math.min(100, Z / 7 * 100) + '%';
    sigVal.textContent = Z.toFixed(1);
    nEl.textContent = N.toLocaleString('en-US');
    pEl.textContent = N ? fmtOdds(pValue(Z)) : '—';
    if (Z >= 5 && !discovered && N > 3000) {
      discovered = true;
      banner.classList.add('show');
      const r = canvas.getBoundingClientRect();
      BG.burst(r.left + r.width / 2, r.top + r.height / 2, 160);
      setTimeout(() => banner.classList.remove('show'), 7000);
      App.vibrate([40, 60, 40, 60, 120]);
    }
  }

  function setRun(on) {
    running = on;
    runBtn.innerHTML = on ? T({ en: 'Pause', el: 'Παύση' }) : (N ? T({ en: 'Continue', el: 'Συνέχεια' }) : T({ en: 'Collect data', el: 'Μάζεψε δεδομένα' }));
  }

  const lp = App.loop(dt => {
    if (running) {
      addEvents(Math.round(dt * 2.6));
      if (N >= NMAX) setRun(false);
      updateUI();
    }
    draw();
  });

  runBtn.onclick = () => { if (N >= NMAX) reset(); setRun(!running); };
  function reset() {
    bins.fill(0); N = 0; Z = 0; discovered = false; yMax = 10;
    banner.classList.remove('show');
    setRun(false);
    updateUI();
  }
  resetBtn.onclick = reset;
  banner.addEventListener('click', () => banner.classList.remove('show'));
  document.addEventListener('langchange', () => { setRun(running); updateUI(); });
  App.on('discovery', { enter() { lp.start(); }, leave() { lp.stop(); setRun(false); } });
})();
