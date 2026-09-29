// =========================================================
//  detector.js — the "onion" model of a particle detector
//  (end view, like CMS). Fire particles and see where they stop.
// =========================================================

(() => {
  const canvas = document.getElementById('detCanvas');
  const tip = document.getElementById('detTip');
  const info = document.getElementById('detInfo');
  const legendEl = document.getElementById('detLegend');
  const buttons = document.getElementById('detButtons');
  let ctx, W, H, R, cx, cy, time = 0;
  let tracks = [];
  let centerFlash = 0;
  let hoverLayer = null;

  // radii as fractions of R
  const LAYERS = [
    { id: 'pipe', r0: 0, r1: .025, color: '#6b7390', name: { en: 'Beam pipe', el: 'Σωλήνας δέσμης' } },
    { id: 'tracker', r0: .05, r1: .27, color: '#8fa3c7', name: { en: 'Tracker (silicon)', el: 'Ανιχνευτής τροχιών (πυρίτιο)' } },
    { id: 'ecal', r0: .29, r1: .40, color: '#2e8f63', name: { en: 'Electromagnetic calorimeter', el: 'Ηλεκτρομαγνητικό καλορίμετρο' } },
    { id: 'hcal', r0: .42, r1: .60, color: '#b58a2a', name: { en: 'Hadronic calorimeter', el: 'Αδρονικό καλορίμετρο' } },
    { id: 'magnet', r0: .62, r1: .67, color: '#8a93b0', name: { en: 'Superconducting solenoid', el: 'Υπεραγώγιμος σωληνοειδής μαγνήτης' } },
    { id: 'muon', r0: .70, r1: .98, color: '#c8384f', name: { en: 'Iron yoke + muon chambers', el: 'Σιδερένιος ζυγός + θάλαμοι μιονίων' } }
  ];
  const TRACKER_R = [.06, .085, .11, .14, .17, .2, .23, .26];
  const CHAMBERS = [[.745, .785], [.845, .885], [.945, .975]];
  const YOKES = [[.70, .74], [.79, .84], [.89, .94]];

  const TYPES = {
    electron: { charged: true, stop: .36, shower: 'em', color: '#ff4d6d', k: [.5, 1.6],
      name: { en: 'Electron', el: 'Ηλεκτρόνιο' },
      text: { en: 'It has charge, so the magnetic field bends it and it leaves a curved track in the tracker. It stops in the electromagnetic calorimeter, where it makes a shower of particles.', el: 'Έχει φορτίο, οπότε το μαγνητικό πεδίο το στρίβει και αφήνει καμπύλη τροχιά στον ανιχνευτή τροχιών. Σταματάει στο ηλεκτρομαγνητικό καλορίμετρο, όπου δημιουργεί καταιγισμό σωματιδίων.' } },
    photon: { charged: false, stop: .35, shower: 'em', color: '#ffd166', dash: [6, 5],
      name: { en: 'Photon', el: 'Φωτόνιο' },
      text: { en: 'No charge, so no track: the tracker can\'t see it at all. It suddenly "appears" in the electromagnetic calorimeter and showers there. Two photons like this is how the Higgs was found!', el: 'Χωρίς φορτίο δεν αφήνει τροχιά: ο ανιχνευτής τροχιών δεν το βλέπει καθόλου. «Εμφανίζεται» ξαφνικά στο ηλεκτρομαγνητικό καλορίμετρο και κάνει καταιγισμό εκεί. Με δύο τέτοια φωτόνια βρέθηκε το Higgs!' } },
    pion: { charged: true, stop: .53, shower: 'had', color: '#2ee59d', k: [.4, 1.4],
      name: { en: 'Charged hadron (pion)', el: 'Φορτισμένο αδρόνιο (πιόνιο)' },
      text: { en: 'A curved track, then it goes through the ECAL almost untouched. The dense hadronic calorimeter finally stops it in a big, messy shower.', el: 'Καμπύλη τροχιά, και μετά περνάει το ECAL σχεδόν ανέπαφο. Το πυκνό αδρονικό καλορίμετρο τελικά το σταματάει σε έναν μεγάλο, ακατάστατο καταιγισμό.' } },
    neutron: { charged: false, stop: .52, shower: 'had', color: '#2ee59d', dash: [6, 5],
      name: { en: 'Neutral hadron (neutron)', el: 'Ουδέτερο αδρόνιο (νετρόνιο)' },
      text: { en: 'No track at all. It only shows up as a lump of energy in the hadronic calorimeter.', el: 'Καθόλου τροχιά. Φαίνεται μόνο σαν «σβώλος» ενέργειας στο αδρονικό καλορίμετρο.' } },
    muon: { charged: true, stop: 1.05, shower: null, color: '#4cc9f0', k: [.15, .45],
      name: { en: 'Muon', el: 'Μιόνιο' },
      text: { en: 'The only charged particle that gets through everything, even metres of iron. That\'s why the outermost layer is the muon chambers. Look: outside the magnet it bends the other way, because the field in the iron points the opposite way.', el: 'Το μόνο φορτισμένο σωματίδιο που περνάει τα πάντα, ακόμα και μέτρα σιδήρου. Γι\' αυτό η εξωτερική στρώση είναι οι θάλαμοι μιονίων. Κοίτα: έξω από τον μαγνήτη στρίβει ανάποδα, γιατί το πεδίο στον σίδηρο έχει αντίθετη φορά.' } },
    neutrino: { charged: false, stop: 1.05, shower: null, color: '#8a93b0', dash: [2, 5], ghost: true,
      name: { en: 'Neutrino', el: 'Νετρίνο' },
      text: { en: 'It goes through the whole detector without leaving a trace. We only "see" it as missing energy: if the momenta don\'t add up to zero, something invisible escaped.', el: 'Περνάει όλον τον ανιχνευτή χωρίς να αφήσει ίχνος. Το «βλέπουμε» μόνο ως ενέργεια που λείπει: αν οι ορμές δεν αθροίζονται στο μηδέν, κάτι αόρατο ξέφυγε.' } }
  };

  const rand = (a, b) => a + Math.random() * (b - a);

  // ---------- make a track ----------
  function makeTrack(type, angle = rand(0, Math.PI * 2), delay = 0) {
    const t = TYPES[type];
    const sign = Math.random() < .5 ? -1 : 1;
    const k0 = t.charged ? sign * rand(t.k[0], t.k[1]) : 0;
    const pts = [], hits = [], chamberHits = [];
    let x = 0, y = 0, a = angle;
    const ds = .004;
    let lastR = 0;
    for (let i = 0; i < 600; i++) {
      const r = Math.hypot(x, y);
      if (r >= t.stop) break;
      // magnetic field: strong inside the solenoid, opposite (weaker) in the iron outside
      const k = r < .665 ? k0 : r > .70 ? -k0 * .55 : 0;
      a += k * ds;
      x += Math.cos(a) * ds; y += Math.sin(a) * ds;
      pts.push([x, y]);
      const nr = Math.hypot(x, y);
      if (t.charged) {
        for (const tr of TRACKER_R) if (lastR < tr && nr >= tr) hits.push([x, y]);
        if (type === 'muon') for (const [c0] of CHAMBERS) if (lastR < c0 + .02 && nr >= c0 + .02) chamberHits.push([x, y, a]);
      }
      lastR = nr;
    }
    const end = pts[pts.length - 1];
    // shower particles
    const shower = [];
    if (t.shower) {
      const n = t.shower === 'em' ? 22 : 40;
      const spread = t.shower === 'em' ? .45 : .9;
      const len = t.shower === 'em' ? .05 : .09;
      for (let i = 0; i < n; i++) {
        const aa = a + rand(-spread, spread) * Math.random();
        const l = rand(.2, 1) * len;
        const sx = end[0] + Math.cos(a) * rand(0, len * .3), sy = end[1] + Math.sin(a) * rand(0, len * .3);
        shower.push([sx, sy, sx + Math.cos(aa) * l, sy + Math.sin(aa) * l]);
      }
    }
    return { type, t, pts, hits, chamberHits, shower, end, dir: a, born: time + delay, life: 1 };
  }

  function fire(type) {
    // keep the picture readable: fade older tracks
    tracks.forEach(tr => tr.fading = true);
    tracks.push(makeTrack(type));
    centerFlash = .6;
    showInfo(type);
    App.vibrate(12);
  }

  function collide() {
    tracks = [];
    const list = ['pion', 'pion', 'pion', 'pion', 'pion', 'photon', 'photon', 'electron', 'neutron'];
    if (Math.random() < .8) list.push('muon');
    if (Math.random() < .5) list.push('muon');
    if (Math.random() < .5) list.push('neutrino');
    if (Math.random() < .5) list.push('electron', 'pion', 'pion');
    list.forEach((ty, i) => tracks.push(makeTrack(ty, rand(0, Math.PI * 2), i * .03)));
    centerFlash = 1;
    info.style.setProperty('--c', '#fff');
    info.innerHTML = `<h4>${T({ en: 'A full collision', el: 'Μια ολόκληρη σύγκρουση' })}</h4><p>${T({ en: `${list.length} particles came out of one proton–proton collision. The detector takes a "photo" like this up to 40 million times a second, and computers have to decide in microseconds which ones are worth keeping.`, el: `${list.length} σωματίδια βγήκαν από μία σύγκρουση πρωτονίου–πρωτονίου. Ο ανιχνευτής τραβάει τέτοια «φωτογραφία» έως και 40 εκατομμύρια φορές το δευτερόλεπτο, και οι υπολογιστές πρέπει να αποφασίσουν σε μικροδευτερόλεπτα ποιες αξίζει να κρατήσουν.` })}</p>`;
    buttons.querySelectorAll('button').forEach(b => b.classList.remove('on'));
    App.vibrate([20, 30, 40]);
  }

  function showInfo(type) {
    const t = TYPES[type];
    info.style.setProperty('--c', t.color);
    info.innerHTML = `<h4>${T(t.name)}</h4><p>${T(t.text)}</p>`;
    buttons.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.p === type));
  }

  // ---------- drawing ----------
  function ring(r0, r1, color, alpha, sides = 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    if (sides) {
      poly(r1 * R, sides, false); poly(r0 * R, sides, true);
    } else {
      ctx.arc(cx, cy, r1 * R, 0, Math.PI * 2, false);
      ctx.arc(cx, cy, r0 * R, 0, Math.PI * 2, true);
    }
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
  }
  function poly(rad, n, rev) {
    const rr = rad / Math.cos(Math.PI / n);
    for (let i = 0; i <= n; i++) {
      const k = rev ? n - i : i;
      const a = k / n * Math.PI * 2 + Math.PI / n;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function drawDetector() {
    const hl = id => hoverLayer === id ? .5 : 0;
    // muon system: iron + chambers (12-sided like CMS)
    YOKES.forEach(([a, b]) => ring(a, b, '#5a1622', .75 + hl('muon'), 12));
    CHAMBERS.forEach(([a, b]) => ring(a, b, '#e07a8c', .28 + hl('muon'), 12));
    ring(.62, .67, '#8a93b0', .5 + hl('magnet'));
    ring(.42, .60, '#b58a2a', .32 + hl('hcal'), 12);
    // HCAL segmentation
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * .42 * R, cy + Math.sin(a) * .42 * R); ctx.lineTo(cx + Math.cos(a) * .6 * R, cy + Math.sin(a) * .6 * R); ctx.stroke();
    }
    ring(.29, .40, '#2e8f63', .38 + hl('ecal'));
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    for (let i = 0; i < 90; i++) {
      const a = i / 90 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * .29 * R, cy + Math.sin(a) * .29 * R); ctx.lineTo(cx + Math.cos(a) * .4 * R, cy + Math.sin(a) * .4 * R); ctx.stroke();
    }
    // tracker layers
    ctx.strokeStyle = hoverLayer === 'tracker' ? 'rgba(180,200,240,.8)' : 'rgba(143,163,199,.35)';
    ctx.lineWidth = 1.2;
    TRACKER_R.forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r * R, 0, 7); ctx.stroke(); });
    ring(0, .025, '#6b7390', .9);
  }


  const P = ([x, y]) => [cx + x * R, cy + y * R];

  function drawTrack(tr) {
    const age = time - tr.born;
    if (age < 0) return;
    const grow = Math.min(1, age / .7);
    const n = Math.max(1, Math.floor(tr.pts.length * grow));
    const alpha = tr.life;
    const t = tr.t;

    ctx.globalAlpha = alpha * (t.ghost ? .45 : 1);
    ctx.strokeStyle = t.color;
    ctx.lineWidth = t.ghost ? 1.3 : 2.2;
    ctx.setLineDash(t.dash || []);
    if (!t.dash) { ctx.shadowColor = t.color; ctx.shadowBlur = 10; }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let i = 0; i < n; i++) { const [x, y] = P(tr.pts[i]); ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);

    // tracker hits
    ctx.fillStyle = '#fff';
    tr.hits.forEach((h, i) => {
      if (i / tr.hits.length > grow * 3) return;
      const [x, y] = P(h);
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
    });
    // muon chamber hits
    tr.chamberHits.forEach(([hx, hy, a], i) => {
      if (grow < (.7 + i * .1)) return;
      const [x, y] = P([hx, hy]);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#9ef0ff';
      ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 14;
      ctx.fillRect(-3, -9, 6, 18);
      ctx.restore();
    });

    // shower / energy deposit
    if (grow >= 1 && tr.shower.length) {
      const sp = Math.min(1, (age - .7) / .5);
      const [ex, ey] = P(tr.end);
      const rad = (tr.t.shower === 'em' ? .06 : .1) * R * (0.4 + sp * .6);
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, rad);
      const c = tr.t.shower === 'em' ? '120,255,190' : '255,190,80';
      g.addColorStop(0, `rgba(${c},${.8 * alpha})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ex, ey, rad, 0, 7); ctx.fill();
      ctx.strokeStyle = t.shower === 'em' ? '#b6ffd9' : '#ffd08a';
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha * .9;
      ctx.beginPath();
      tr.shower.forEach(([x0, y0, x1, y1]) => {
        const [a, b] = P([x0, y0]), [c2, d] = P([x0 + (x1 - x0) * sp, y0 + (y1 - y0) * sp]);
        ctx.moveTo(a, b); ctx.lineTo(c2, d);
      });
      ctx.stroke();
    }
    // neutrino: missing energy arrow
    if (t.ghost && grow >= 1) {
      const [ex, ey] = P([Math.cos(tr.dir) * .5, Math.sin(tr.dir) * .5]);
      ctx.globalAlpha = alpha * Math.min(1, (age - .7) * 2);
      ctx.fillStyle = '#cfd6ee';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(T({ en: 'missing energy?', el: 'ενέργεια που λείπει;' }), ex, ey - 8);
    }
    ctx.globalAlpha = 1;
  }

  function frame(dt) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h;
    R = Math.min(W, H) * .48; cx = W / 2; cy = H / 2;
    time += dt / 1000;
    ctx.clearRect(0, 0, W, H);
    drawDetector();

    for (let i = tracks.length - 1; i >= 0; i--) {
      const tr = tracks[i];
      if (tr.fading) tr.life -= dt / 900;
      if (tr.life <= 0) { tracks.splice(i, 1); continue; }
      drawTrack(tr);
    }

    if (centerFlash > 0) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .2);
      g.addColorStop(0, `rgba(255,255,255,${centerFlash})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * .2, 0, 7); ctx.fill();
      centerFlash *= .9;
      if (centerFlash < .01) centerFlash = 0;
    }
  }

  // ---------- hover to name the layers ----------
  canvas.addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    const rr = Math.hypot(x - cx, y - cy) / R;
    const L = LAYERS.find(l => rr >= l.r0 - .01 && rr <= l.r1 + .01);
    hoverLayer = L ? L.id : null;
    if (L && e.pointerType === 'mouse') {
      tip.textContent = T(L.name);
      tip.style.left = (x + 14) + 'px'; tip.style.top = (y + 10) + 'px';
      tip.style.opacity = 1;
    } else tip.style.opacity = 0;
  });
  canvas.addEventListener('pointerleave', () => { hoverLayer = null; tip.style.opacity = 0; });
  canvas.addEventListener('click', () => collide());

  function buildLegend() {
    legendEl.innerHTML = LAYERS.map(l => `<li><i style="background:${l.color}"></i>${T(l.name)}</li>`).join('');
  }

  buttons.querySelectorAll('button').forEach(b => b.onclick = () => fire(b.dataset.p));
  document.getElementById('detCollide').onclick = collide;
  buildLegend();
  showInfo('muon');
  info.innerHTML = `<h4>${T({ en: 'Pick a particle', el: 'Διάλεξε ένα σωματίδιο' })}</h4><p>${T({ en: 'Each type of particle leaves its own "fingerprint" in the layers. Physicists read these fingerprints to work out what happened in a collision. Or tap the detector for a full collision.', el: 'Κάθε είδος σωματιδίου αφήνει το δικό του «αποτύπωμα» στις στρώσεις. Οι φυσικοί διαβάζουν αυτά τα αποτυπώματα για να καταλάβουν τι έγινε σε μια σύγκρουση. Ή πάτα πάνω στον ανιχνευτή για ολόκληρη σύγκρουση.' })}</p>`;
  buttons.querySelectorAll('button').forEach(b => b.classList.remove('on'));
  document.addEventListener('langchange', () => {
    buildLegend();
    const on = buttons.querySelector('button.on');
    if (on) showInfo(on.dataset.p);
  });

  const lp = App.loop(frame);
  App.on('detectors', {
    enter() { lp.start(); if (!tracks.length) setTimeout(collide, 700); },
    leave() { lp.stop(); }
  });
})();
