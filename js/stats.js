// =========================================================
//  stats.js — "the famous assignment"
//  ① drag the 5 measurements → live μ and σ
//  ② Galton board / 3 dice → the Gaussian appears by itself
//  ③ the meaning of σ: how much is inside ±kσ
// =========================================================

// error function (Abramowitz–Stegun approximation, good to ~1e-7)
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + .3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x);
  return s * y;
}

// ---------------------------------------------------------
// ① measurements
// ---------------------------------------------------------
(() => {
  const svg = document.getElementById('msSvg');
  const meanF = document.getElementById('msMeanF');
  const sigmaF = document.getElementById('msSigmaF');
  const msg = document.getElementById('msMsg');
  const NS = 'http://www.w3.org/2000/svg';
  const MIN = 480, MAX = 520, AY = 120;
  let VW = 800, X0 = 40, X1 = 760;
  const ASSIGN = [494, 498, 500, 502, 506];
  let vals = [...ASSIGN];
  let anim = null;

  const xOf = v => X0 + (v - MIN) / (MAX - MIN) * (X1 - X0);
  const vOf = x => Math.round(MIN + (x - X0) / (X1 - X0) * (MAX - MIN));
  const mk = (tag, a, p = svg) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };

  let band, meanLine, meanLbl, sigL, sigR, pts = [];
  function build() {
    // narrow screens get a narrower "virtual" width so the text stays readable
    const cw = svg.parentElement.clientWidth || 800;
    VW = Math.round(Math.max(380, Math.min(800, cw * 1.1)));
    X0 = 30; X1 = VW - 30;
    svg.setAttribute('viewBox', `0 0 ${VW} 170`);
    svg.innerHTML = '';
    band = mk('rect', { class: 'band', y: 30, height: AY - 30, rx: 6 });
    mk('line', { class: 'axis', x1: X0, x2: X1, y1: AY, y2: AY });
    for (let v = MIN; v <= MAX; v += 2) {
      const big = v % 10 === 0;
      mk('line', { class: 'tick', x1: xOf(v), x2: xOf(v), y1: AY, y2: AY + (big ? 10 : 5) });
      if (big || (VW > 600 && v % 10 === 0)) mk('text', { class: 'tick-lbl', x: xOf(v), y: AY + 28 }).textContent = v;
    }
    mk('text', { class: 'tick-lbl', x: X1, y: AY + 46, 'text-anchor': 'end' }).textContent = 'MeV/c²';
    meanLine = mk('line', { class: 'mean', y1: 22, y2: AY });
    meanLbl = mk('text', { class: 'mean-lbl', y: 16 });
    sigL = mk('text', { class: 'sig-lbl', y: 44 });
    sigR = mk('text', { class: 'sig-lbl', y: 44 });
    pts = vals.map((v, i) => {
      const g = mk('g', { class: 'pt' });
      mk('line', { class: 'stem', y1: AY, y2: 70 + (i % 2) * 18 }, g);
      mk('circle', { class: 'hit', r: 22 }, g);
      mk('circle', { class: 'core', r: 10 }, g);
      const t = mk('text', { y: 0 }, g);
      g.dataset.i = i;
      drag(g);
      return { g, t, y: 70 + (i % 2) * 18 };
    });
  }

  function drag(g) {
    let on = false;
    const i = +g.dataset.i;
    const toVal = e => {
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * VW;
      return Math.max(MIN, Math.min(MAX, vOf(x)));
    };
    g.addEventListener('pointerdown', e => { on = true; anim = null; g.classList.add('drag'); g.setPointerCapture(e.pointerId); e.preventDefault(); });
    g.addEventListener('pointermove', e => { if (on) { vals[i] = toVal(e); update(); } });
    const up = () => { on = false; g.classList.remove('drag'); };
    g.addEventListener('pointerup', up);
    g.addEventListener('pointercancel', up);
  }

  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
  const f1 = x => Number.isInteger(x) ? String(x) : x.toFixed(1);

  function update() {
    const v = vals.map(x => Math.round(x));
    const m = mean(v), s = sd(v);
    band.setAttribute('x', xOf(m - s));
    band.setAttribute('width', Math.max(0, xOf(m + s) - xOf(m - s)));
    meanLine.setAttribute('x1', xOf(m)); meanLine.setAttribute('x2', xOf(m));
    meanLbl.setAttribute('x', xOf(m)); meanLbl.textContent = 'μ = ' + f1(m);
    sigL.setAttribute('x', xOf(m - s) + 14); sigL.textContent = s > 1.5 ? '−σ' : '';
    sigR.setAttribute('x', xOf(m + s) - 14); sigR.textContent = s > 1.5 ? '+σ' : '';
    pts.forEach((p, i) => {
      const x = xOf(vals[i]);
      p.g.setAttribute('transform', `translate(${x},0)`);
      p.g.querySelector('.core').setAttribute('cy', p.y);
      p.g.querySelector('.hit').setAttribute('cy', p.y);
      p.t.setAttribute('y', p.y - 18);
      p.t.textContent = v[i];
    });
    const sq = v.map(x => (x - m) ** 2);
    const sumSq = sq.reduce((a, b) => a + b, 0);
    meanF.innerHTML = `(${v.join(' + ')}) / 5 = ${v.reduce((a, b) => a + b, 0)} / 5 = <span class="res">${f1(m)} MeV/c²</span>`;
    sigmaF.innerHTML = `√[(${sq.map(f1).join(' + ')}) / 5] = √(${f1(sumSq / 5)}) = <span class="res">${s.toFixed(2).replace(/\.00$/, '')} MeV/c²</span>`;

    if (s === 0) msg.textContent = T({ en: 'σ = 0 only if every measurement is exactly the same, which never happens in a real experiment. Every measurement has some uncertainty.', el: 'σ = 0 μόνο αν όλες οι μετρήσεις είναι ακριβώς ίδιες, κάτι που δεν συμβαίνει ποτέ σε πραγματικό πείραμα. Κάθε μέτρηση έχει κάποια αβεβαιότητα.' });
    else if (s > 10) msg.textContent = T({ en: 'Big σ = measurements all over the place. You\'d trust this mass value much less.', el: 'Μεγάλο σ = μετρήσεις σκορπισμένες παντού. Θα εμπιστευόσουν πολύ λιγότερο αυτή την τιμή μάζας.' });
    else if (v.join() === ASSIGN.join()) msg.textContent = T({ en: 'The assignment answer: μ = 500, σ = 4 MeV/c². Now try dragging the points around.', el: 'Η απάντηση της εργασίας: μ = 500, σ = 4 MeV/c². Τώρα δοκίμασε να σύρεις τα σημεία.' });
    else msg.textContent = T({ en: 'σ measures how spread out the measurements are around the mean.', el: 'Το σ μετράει πόσο «απλωμένες» είναι οι μετρήσεις γύρω από τη μέση τιμή.' });
  }

  function animateTo(target) {
    const from = [...vals];
    const t0 = performance.now();
    anim = t0;
    (function f(t) {
      if (anim !== t0) return;
      const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
      vals = from.map((v, i) => v + (target[i] - v) * e);
      update();
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  document.getElementById('msReset').onclick = () => animateTo(ASSIGN);
  document.getElementById('msSame').onclick = () => animateTo([500, 500, 500, 500, 500]);
  document.getElementById('msSpread').onclick = () => animateTo([482, 491, 503, 510, 518]);
  build(); update();
  document.addEventListener('langchange', update);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); update(); }, 150); });
  App.on('stats', { enter() { build(); update(); } });
})();

// ---------------------------------------------------------
// ② Galton board + dice
// ---------------------------------------------------------
(() => {
  const canvas = document.getElementById('galtonCanvas');
  const diceRow = document.getElementById('diceRow');
  const diceSum = document.getElementById('diceSum');
  const nEl = document.getElementById('gN'), inEl = document.getElementById('gIn');
  let ctx, W, H;
  let mode = 'galton';
  const ROWS = 12;
  let bins = new Array(ROWS + 1).fill(0);
  let dbins = new Array(19).fill(0); // sums 3..18
  let balls = [];
  let raining = false, rainAcc = 0, queue = 0;

  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function setDie(el, n) {
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i');
      s.style.visibility = PIPS[n].includes(i) ? 'visible' : 'hidden';
      el.appendChild(s);
    }
  }

  // board geometry
  function geo() {
    const top = H * .1, bottom = H * .52, histBottom = H - 26;
    const gap = Math.min(W * .9 / (ROWS + 1), (bottom - top) / ROWS * 1.15);
    return { top, bottom, histBottom, gap, cx: W / 2 };
  }
  const pegPos = (g, r, k) => [g.cx + (k - r / 2) * g.gap, g.top + r * (g.bottom - g.top) / ROWS];

  function addBall() {
    const path = [];
    let k = 0;
    for (let r = 0; r < ROWS; r++) { path.push(k); if (Math.random() < .5) k++; }
    balls.push({ path, bin: k, t: 0, speed: 7 + Math.random() * 3, c: ['#4cc9f0', '#9b6bff', '#ff5fa2', '#ffd166'][(Math.random() * 4) | 0] });
  }

  function rollDice(n) {
    let last;
    for (let i = 0; i < n; i++) {
      const d = [1, 2, 3].map(() => 1 + ((Math.random() * 6) | 0));
      dbins[d[0] + d[1] + d[2]]++;
      last = d;
    }
    const dice = diceRow.querySelectorAll('.die');
    dice.forEach((el, i) => { setDie(el, last[i]); el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); });
    diceSum.textContent = '= ' + (last[0] + last[1] + last[2]);
    readout();
  }

  // exact probabilities for the sum of 3 dice
  const DICE_P = (() => { const p = new Array(19).fill(0); for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) p[a + b + c]++; return p.map(x => x / 216); })();

  function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }

  // fraction of the counts inside mean ± σ (bins at the edge count partly,
  // like the area under a smooth curve would)
  function insideFrac(counts, probs) {
    const mean = probs.reduce((s, p, i) => s + p * i, 0);
    const sig = Math.sqrt(probs.reduce((s, p, i) => s + p * (i - mean) ** 2, 0));
    const lo = mean - sig, hi = mean + sig;
    let inside = 0, N = 0;
    counts.forEach((c, i) => {
      N += c;
      inside += c * Math.max(0, Math.min(i + .5, hi) - Math.max(i - .5, lo));
    });
    return N ? inside / N : null;
  }

  function readout() {
    const counts = mode === 'galton' ? bins : dbins.slice(3);
    const probs = mode === 'galton' ? bins.map((_, i) => binom(ROWS, i) / 2 ** ROWS) : DICE_P.slice(3);
    nEl.textContent = counts.reduce((a, b) => a + b, 0);
    const f = insideFrac(counts, probs);
    inEl.textContent = f == null ? '—' : (f * 100).toFixed(1) + '%';
  }

  function drawHist(g, counts, labels, probs) {
    const n = counts.length;
    const N = counts.reduce((a, b) => a + b, 0);
    const maxP = Math.max(...probs);
    const x0 = W * .06, x1 = W * .94;
    const bw = (x1 - x0) / n;
    const hTop = mode === 'galton' ? g.bottom + 16 : H * .22;
    const hH = g.histBottom - hTop;
    const scale = N ? hH / Math.max(maxP * N * 1.15, Math.max(...counts)) : 0;
    const mean = probs.reduce((s, p, i) => s + p * i, 0);
    const sig = Math.sqrt(probs.reduce((s, p, i) => s + p * (i - mean) ** 2, 0));

    // ±1σ band
    const bx = i => x0 + (i + .5) * bw;
    ctx.fillStyle = 'rgba(76,201,240,.08)';
    ctx.fillRect(bx(mean - sig), hTop, bx(mean + sig) - bx(mean - sig), hH);
    ctx.strokeStyle = 'rgba(76,201,240,.4)'; ctx.setLineDash([4, 4]);
    [mean - sig, mean + sig].forEach(v => { ctx.beginPath(); ctx.moveTo(bx(v), hTop); ctx.lineTo(bx(v), g.histBottom); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(76,201,240,.8)'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('−1σ', bx(mean - sig), hTop - 4); ctx.fillText('+1σ', bx(mean + sig), hTop - 4);

    // bars
    counts.forEach((c, i) => {
      const h = c * scale;
      const grad = ctx.createLinearGradient(0, g.histBottom - h, 0, g.histBottom);
      grad.addColorStop(0, '#ff9a5c'); grad.addColorStop(1, '#e8553b');
      ctx.fillStyle = grad;
      ctx.fillRect(x0 + i * bw + bw * .12, g.histBottom - h, bw * .76, h);
    });
    // Gaussian curve
    if (N > 0) {
      ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let s = 0; s <= 200; s++) {
        const v = -0.5 + s / 200 * n;
        const p = Math.exp(-((v - mean) ** 2) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI));
        const x = x0 + (v + .5) * bw, y = g.histBottom - p * N * scale;
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // labels
    ctx.fillStyle = '#8a93b0'; ctx.font = '11px "JetBrains Mono", monospace';
    labels.forEach((l, i) => { if (l !== '') ctx.fillText(l, x0 + (i + .5) * bw, g.histBottom + 16); });
  }

  function frame(dt) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h;
    ctx.clearRect(0, 0, W, H);
    const g = geo();

    if (mode === 'galton') {
      // rain
      if (raining) { rainAcc += dt; while (rainAcc > 45) { rainAcc -= 45; addBall(); } }
      if (queue > 0) { const k = Math.min(queue, 4); for (let i = 0; i < k; i++) addBall(); queue -= k; }

      // pegs
      ctx.fillStyle = 'rgba(200,210,240,.55)';
      for (let rr = 0; rr < ROWS; rr++) for (let k = 0; k <= rr; k++) {
        const [x, y] = pegPos(g, rr, k);
        ctx.beginPath(); ctx.arc(x, y, Math.max(1.8, g.gap * .08), 0, 7); ctx.fill();
      }
      // balls
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.t += dt / 1000 * b.speed;
        const r0 = Math.floor(b.t);
        let x, y;
        if (r0 >= ROWS) {
          // fall into bin
          const f = b.t - ROWS;
          const [bx] = pegPos(g, ROWS, b.bin);
          x = bx; y = g.bottom + f * 60;
          if (f > .3) { bins[b.bin]++; balls.splice(i, 1); readout(); continue; }
        } else {
          const f = b.t - r0;
          const k0 = b.path[r0], k1 = r0 + 1 < ROWS ? b.path[r0 + 1] : b.bin;
          const [ax, ay] = pegPos(g, r0, k0);
          const [cx2, cy2] = r0 + 1 < ROWS ? pegPos(g, r0 + 1, k1) : pegPos(g, ROWS, b.bin);
          x = ax + (cx2 - ax) * f;
          y = ay + (cy2 - ay) * f - Math.sin(f * Math.PI) * g.gap * .35 - g.gap * .2;
        }
        ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, g.gap * .13), 0, 7); ctx.fill();
      }
      drawHist(g, bins, bins.map((_, i) => i), bins.map((_, i) => binom(ROWS, i) / 2 ** ROWS));
    } else {
      const counts = dbins.slice(3), probs = DICE_P.slice(3);
      if (raining) { rainAcc += dt; if (rainAcc > 90) { rainAcc = 0; rollDice(3); } }
      drawHist(g, counts, counts.map((_, i) => i + 3), probs);
    }
  }

  document.getElementById('galtonBtns').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset.drop;
    if (d === 'reset') {
      balls = []; queue = 0; raining = false;
      if (mode === 'galton') bins.fill(0); else dbins.fill(0);
      readout();
      return;
    }
    if (d === 'rain') {
      raining = !raining;
      b.classList.toggle('btn-primary', raining);
      return;
    }
    const n = +d;
    if (mode === 'galton') { if (n === 1) addBall(); else queue += n; }
    else rollDice(n);
  });

  document.getElementById('gTabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    mode = b.dataset.tab;
    document.querySelectorAll('#gTabs button').forEach(x => x.classList.toggle('active', x === b));
    diceRow.hidden = mode !== 'dice';
    raining = false;
    document.querySelector('[data-drop="rain"]').classList.remove('btn-primary');
    readout();
  });

  diceRow.querySelectorAll('.die').forEach((d, i) => setDie(d, [5, 2, 4][i]));
  const lp = App.loop(frame);
  App.on('stats', {
    enter() { lp.start(); if (!bins.some(x => x)) queue += 60; },
    leave() { lp.stop(); raining = false; document.querySelector('[data-drop="rain"]').classList.remove('btn-primary'); }
  });
})();

// ---------------------------------------------------------
// ③ the meaning of σ
// ---------------------------------------------------------
(() => {
  const canvas = document.getElementById('sigmaCanvas');
  const range = document.getElementById('sigmaRange');
  const kEl = document.getElementById('sigmaK');
  const pctEl = document.getElementById('sigmaPct');
  const rxEl = document.getElementById('sigmaRangeX');
  const evEl = document.getElementById('sigmaEvents');
  const outEl = document.getElementById('sigmaOut');
  let k = 1, shown = 1;

  function fmtOdds(p) {
    if (p <= 0) return '—';
    const n = 1 / p;
    if (n < 1000) return T({ en: '1 in ', el: '1 στα ' }) + (n < 10 ? n.toFixed(1) : Math.round(n));
    if (n < 1e6) return T({ en: '1 in ', el: '1 στα ' }) + Math.round(n).toLocaleString('en-US');
    return T({ en: '1 in ', el: '1 στα ' }) + (n / 1e6).toFixed(1) + T({ en: ' million', el: ' εκατ.' });
  }

  function draw() {
    const { ctx, w, h } = App.fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const x0 = 20, x1 = w - 20, base = h - 30, top = 20;
    const X = s => x0 + (s + 5.5) / 11 * (x1 - x0);
    const Y = s => base - Math.exp(-s * s / 2) * (base - top);

    // shaded area inside ±k
    ctx.beginPath();
    ctx.moveTo(X(-shown), base);
    for (let s = -shown; s <= shown; s += .02) ctx.lineTo(X(s), Y(s));
    ctx.lineTo(X(shown), base);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, 'rgba(76,201,240,.55)'); g.addColorStop(1, 'rgba(155,107,255,.15)');
    ctx.fillStyle = g;
    ctx.fill();

    // tails
    ['-', '+'].forEach(side => {
      ctx.beginPath();
      const a = side === '-' ? -5.5 : shown, b = side === '-' ? -shown : 5.5;
      ctx.moveTo(X(a), base);
      for (let s = a; s <= b; s += .02) ctx.lineTo(X(s), Y(s));
      ctx.lineTo(X(b), base);
      ctx.fillStyle = 'rgba(255,77,109,.35)';
      ctx.fill();
    });

    // curve
    ctx.beginPath();
    for (let s = -5.5; s <= 5.5; s += .02) { const x = X(s), y = Y(s); s === -5.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // axis + ticks
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x1, base); ctx.stroke();
    ctx.fillStyle = '#8a93b0'; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (let s = -5; s <= 5; s++) {
      ctx.fillText(s === 0 ? 'μ' : (s > 0 ? '+' : '') + s + 'σ', X(s), base + 16);
      ctx.beginPath(); ctx.moveTo(X(s), base); ctx.lineTo(X(s), base + 4); ctx.stroke();
    }
    // edges
    ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    [-shown, shown].forEach(s => { ctx.beginPath(); ctx.moveTo(X(s), Y(s) - 10); ctx.lineTo(X(s), base); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.fillText((erf(shown / Math.SQRT2) * 100).toFixed(shown > 3 ? 5 : 2) + '%', X(0), Y(0) + (base - Y(0)) * .55);
  }

  function update() {
    k = +range.value;
    kEl.textContent = k.toFixed(1);
    const inside = erf(k / Math.SQRT2);
    pctEl.textContent = (inside * 100).toFixed(k > 3 ? 5 : 2) + '%';
    rxEl.textContent = `${+(500 - 4 * k).toFixed(1)} – ${+(500 + 4 * k).toFixed(1)}`;
    evEl.textContent = Math.round(2000 * inside).toLocaleString('en-US');
    outEl.textContent = fmtOdds(1 - inside);
  }

  const lp = App.loop(() => { shown += (k - shown) * .2; draw(); });
  range.addEventListener('input', update);
  document.addEventListener('langchange', update);
  update();
  App.on('stats', { enter() { lp.start(); }, leave() { lp.stop(); } });
})();
