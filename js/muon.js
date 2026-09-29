// =========================================================
//  muon.js — cosmic muons with and without relativity,
//  plus the twin paradox
// =========================================================

(() => {
  const canvas = document.getElementById('muonCanvas');
  const range = document.getElementById('muonV');
  const vOut = document.getElementById('muonVOut');
  const gEl = document.getElementById('muonGamma');
  const lifeEl = document.getElementById('muonLife');
  const cEl = document.getElementById('muonClassic');
  const rEl = document.getElementById('muonRel');
  const goBtn = document.getElementById('muonGo');

  const TAU = 2.197;          // μs
  const C = 0.299792458;      // km per μs
  const H0 = 10;              // km, where muons are born
  const TOP = 15;             // km shown
  const US_PER_S = 14;        // lab μs per real second (slow motion!)

  let beta = .9994, gamma = 29;
  let muons = [], decays = [], hitsC = 0, hitsR = 0, launched = 0, labT = 0, ground = [];

  function sliderToBeta(s) { return 1 - Math.pow(10, -(1 + 3 * s / 1000)); }
  function fmtBeta(b) {
    const d = Math.min(6, Math.max(2, Math.ceil(-Math.log10(1 - b)) + 1));
    return (Math.floor(b * 10 ** d) / 10 ** d).toFixed(d) + ' c';
  }
  function updateSpeed() {
    beta = sliderToBeta(+range.value);
    gamma = 1 / Math.sqrt(1 - beta * beta);
    vOut.textContent = fmtBeta(beta);
    gEl.textContent = gamma < 10 ? gamma.toFixed(1) : Math.round(gamma);
    lifeEl.textContent = (gamma * TAU).toFixed(gamma < 10 ? 1 : 0) + ' μs';
  }

  function launch() {
    const n = innerWidth < 600 ? 24 : 36;
    for (let i = 0; i < n; i++) {
      const tau = -TAU * Math.log(1 - Math.random());
      muons.push({
        x: .08 + Math.random() * .84,          // position inside its column (0..1)
        h0: H0 + (Math.random() - .5) * 1.2,
        tau,                                   // its own (proper) lifetime
        born: labT + Math.random() * 18,       // staggered, in lab μs
        v: beta * C, g: gamma,
        deadC: false, deadR: false
      });
    }
    launched += n;
    App.vibrate(10);
  }

  function frame(dt) {
    const { ctx, w, h } = App.fitCanvas(canvas);
    labT += dt / 1000 * US_PER_S;
    ctx.clearRect(0, 0, w, h);

    const axisW = 46, top = 44, bot = h - 40;
    const colW = (w - axisW) / 2;
    const Y = km => bot - km / TOP * (bot - top);
    const cols = [axisW, axisW + colW];

    // sky
    const sky = ctx.createLinearGradient(0, top, 0, bot);
    sky.addColorStop(0, '#060a1c'); sky.addColorStop(1, '#10204a');
    ctx.fillStyle = sky; ctx.fillRect(axisW, top, w - axisW, bot - top);
    // column divider
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(axisW + colW - 1, top, 2, bot - top);
    // column titles
    ctx.font = '700 13px Manrope, Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8fa3'; ctx.fillText(T({ en: 'Classical physics', el: 'Κλασική φυσική' }), cols[0] + colW / 2, 20);
    ctx.fillStyle = '#6ff2b8'; ctx.fillText(T({ en: 'With relativity', el: 'Με σχετικότητα' }), cols[1] + colW / 2, 20);
    ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillStyle = '#8a93b0';
    ctx.fillText(T({ en: 'distance = v·τ', el: 'απόσταση = v·τ' }), cols[0] + colW / 2, 36);
    ctx.fillText(T({ en: 'distance = v·γτ', el: 'απόσταση = v·γτ' }), cols[1] + colW / 2, 36);

    // altitude axis
    ctx.textAlign = 'right'; ctx.fillStyle = '#6f7894';
    for (let km = 0; km <= TOP; km += 5) {
      ctx.fillText(km + ' km', axisW - 6, Y(km) + 4);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.beginPath(); ctx.moveTo(axisW, Y(km)); ctx.lineTo(w, Y(km)); ctx.stroke();
    }
    // birth line
    ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,209,102,.5)';
    ctx.beginPath(); ctx.moveTo(axisW, Y(H0)); ctx.lineTo(w, Y(H0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ffd166'; ctx.textAlign = 'left'; ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText(w < 560
      ? T({ en: 'muons are created here', el: 'εδώ δημιουργούνται τα μιόνια' })
      : T({ en: 'cosmic ray hits the air → muons are created', el: 'κοσμική ακτίνα χτυπά τον αέρα → δημιουργούνται μιόνια' }), axisW + 8, Y(H0) - 8);
    // 660 m bracket (classical)
    const bx = cols[0] + colW - 16;
    ctx.strokeStyle = 'rgba(255,143,163,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, Y(H0)); ctx.lineTo(bx, Y(H0 - .66)); ctx.moveTo(bx - 5, Y(H0 - .66)); ctx.lineTo(bx + 5, Y(H0 - .66)); ctx.stroke();
    ctx.fillStyle = '#ff8fa3'; ctx.textAlign = 'right'; ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('cτ ≈ 660 m', bx - 6, Y(H0 - .66) + 12);
    ctx.lineWidth = 1;

    // ground + detector
    ctx.fillStyle = '#1a2a1f'; ctx.fillRect(axisW, bot, w - axisW, h - bot);
    ctx.fillStyle = '#2ee59d'; ctx.fillRect(axisW, bot, w - axisW, 3);
    ctx.fillStyle = '#9aa4c2'; ctx.textAlign = 'center'; ctx.font = '11px Inter, sans-serif';
    ctx.fillText(T({ en: 'Earth\'s surface · muon detector', el: 'Επιφάνεια της Γης · ανιχνευτής μιονίων' }), axisW + (w - axisW) / 2, bot + 24);

    // muons
    for (let i = muons.length - 1; i >= 0; i--) {
      const m = muons[i];
      const t = labT - m.born;
      if (t < 0) continue;
      const fall = m.v * t;
      const dC = m.v * m.tau, dR = m.v * m.g * m.tau;
      [[0, dC, 'deadC'], [1, dR, 'deadR']].forEach(([c, d, key]) => {
        if (m[key]) return;
        const x = cols[c] + m.x * colW;
        const hgt = m.h0 - Math.min(fall, d);
        if (fall >= d && hgt > 0) {
          m[key] = true;
          decays.push({ x, y: Y(hgt), t: 0 });
          return;
        }
        if (hgt <= 0) {
          m[key] = true;
          if (c === 0) hitsC++; else hitsR++;
          ground.push({ x, t: 0 });
          return;
        }
        // trail
        const y = Y(hgt);
        // light-speed streak: long fading tail + glow
        const L = 70;
        const trail = ctx.createLinearGradient(x, y - L, x, y);
        trail.addColorStop(0, 'rgba(76,201,240,0)'); trail.addColorStop(.8, 'rgba(120,220,255,.5)'); trail.addColorStop(1, 'rgba(230,250,255,.95)');
        ctx.strokeStyle = trail; ctx.lineCap = 'round';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x, y - L); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = .18; ctx.lineWidth = 8; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      });
      if (m.deadC && m.deadR) muons.splice(i, 1);
    }

    // decays: μ → e + ν + ν
    for (let i = decays.length - 1; i >= 0; i--) {
      const d = decays[i];
      d.t += dt / 1000;
      if (d.t > .9) { decays.splice(i, 1); continue; }
      const a = 1 - d.t / .9, L = 6 + d.t * 26;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - L * .7, d.y + L * .8); ctx.stroke();
      ctx.setLineDash([2, 3]); ctx.strokeStyle = '#cfd6ee'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + L * .2, d.y + L); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + L * .8, d.y + L * .6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // ground hits
    for (let i = ground.length - 1; i >= 0; i--) {
      const g = ground[i];
      g.t += dt / 1000;
      if (g.t > .8) { ground.splice(i, 1); continue; }
      const rg = ctx.createRadialGradient(g.x, bot, 0, g.x, bot, 24);
      rg.addColorStop(0, `rgba(46,229,157,${1 - g.t / .8})`); rg.addColorStop(1, 'rgba(46,229,157,0)');
      ctx.fillStyle = rg; ctx.fillRect(g.x - 24, bot - 24, 48, 48);
    }

    // counters
    cEl.textContent = `${hitsC} / ${launched}`;
    rEl.textContent = `${hitsR} / ${launched}`;

    if (!launched) {
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '500 14px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(T({ en: 'Press “Send cosmic muons”', el: 'Πάτα «Στείλε κοσμικά μιόνια»' }), axisW + (w - axisW) / 2, Y(5));
    }
  }

  range.value = 743;   // γ ≈ 29 → lifetime ≈ 64 μs (matches the text)
  updateSpeed();
  range.addEventListener('input', updateSpeed);
  goBtn.onclick = launch;
  const lp = App.loop(frame);
  App.on('muons', {
    enter() { lp.start(); if (!launched) setTimeout(launch, 900); },
    leave() { lp.stop(); }
  });
})();

// ---------------------------------------------------------
// twin paradox
// ---------------------------------------------------------
(() => {
  const svg = document.getElementById('twinSvg');
  const range = document.getElementById('twinV');
  const vOut = document.getElementById('twinVOut');
  const aEl = document.getElementById('twinA'), bEl = document.getElementById('twinB');
  const NS = 'http://www.w3.org/2000/svg';
  let gamma = 5, p = 0;

  svg.innerHTML = `
    <defs>
      <radialGradient id="earthG" cx="35%" cy="35%"><stop offset="0" stop-color="#6fc3ff"/><stop offset=".7" stop-color="#2463c9"/><stop offset="1" stop-color="#0d2a66"/></radialGradient>
      <radialGradient id="starG"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ffd166"/><stop offset="1" stop-color="rgba(255,209,102,0)"/></radialGradient>
    </defs>
    <path id="twinPath" d="M 170 150 C 300 20, 560 20, 660 110 C 560 250, 300 260, 170 150" fill="none" stroke="rgba(46,229,157,.5)" stroke-width="2" stroke-dasharray="7 7"/>
    <circle cx="700" cy="110" r="42" fill="url(#starG)"/>
    <circle cx="700" cy="110" r="9" fill="#fff"/>
    <circle cx="120" cy="150" r="54" fill="url(#earthG)"/>
    <path d="M92 124c14-6 26 2 22 12s-18 8-26 2 0-10 4-14zM118 168c10-4 22 0 20 8s-14 10-22 4-2-10 2-12z" fill="#3fa34d" opacity=".9"/>
    <g id="clockA" transform="translate(120 250)"><circle r="22" fill="#0b1024" stroke="#ff7a3d" stroke-width="2"/><line id="handA" x1="0" y1="0" x2="0" y2="-15" stroke="#ff7a3d" stroke-width="2.5" stroke-linecap="round"/><circle r="2.5" fill="#fff"/></g>
    <g id="rocket"><path d="M-16 -6 L10 -6 L20 0 L10 6 L-16 6 Z" fill="#e9edf8"/><path d="M-16 -6 L-22 -12 L-10 -6 Z M-16 6 L-22 12 L-10 6 Z" fill="#ff5fa2"/><circle cx="6" cy="0" r="3" fill="#4d7cff"/><path id="flame" d="M-16 -3 L-30 0 L-16 3 Z" fill="#ffd166"/>
      <g transform="translate(0 -30)"><circle r="16" fill="#0b1024" stroke="#2ee59d" stroke-width="2"/><line id="handB" x1="0" y1="0" x2="0" y2="-11" stroke="#2ee59d" stroke-width="2.5" stroke-linecap="round"/><circle r="2" fill="#fff"/></g>
    </g>`;
  const path = svg.querySelector('#twinPath');
  const rocket = svg.querySelector('#rocket');
  const handA = svg.querySelector('#handA'), handB = svg.querySelector('#handB');
  const flame = svg.querySelector('#flame');
  const len = path.getTotalLength();

  function update() {
    const b = +range.value / 1000;
    gamma = 1 / Math.sqrt(1 - b * b);
    vOut.textContent = b.toFixed(b >= .99 ? 3 : 2) + ' c';
  }

  let hold = 0;
  const lp = App.loop(dt => {
    if (hold > 0) hold -= dt;
    else {
      p += dt / 6000;
      if (p >= 1) { p = 1; hold = 1600; }
    }
    if (hold <= 0 && p >= 1) p = 0;
    const L = p * len;
    const pt = path.getPointAtLength(L), pt2 = path.getPointAtLength(Math.min(len, L + 1));
    const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
    rocket.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${ang})`);
    rocket.querySelector('g').setAttribute('transform', `rotate(${-ang}) translate(0 -30)`);
    flame.setAttribute('d', `M-16 -3 L${-26 - Math.random() * 10} 0 L-16 3 Z`);
    const yearsA = 30 * p, yearsB = yearsA / gamma;
    handA.setAttribute('transform', `rotate(${yearsA * 36})`);
    handB.setAttribute('transform', `rotate(${yearsB * 36})`);
    aEl.textContent = Math.round(20 + yearsA);
    bEl.textContent = Math.round(20 + yearsB);
  });
  range.addEventListener('input', update);
  update();
  App.on('muons', { enter() { lp.start(); }, leave() { lp.stop(); } });
})();
