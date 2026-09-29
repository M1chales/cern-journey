// =========================================================
//  journey.js — "Ride along": first-person view of a proton
//  Hydrogen → Linac4 → PS Booster → PS → SPS → LHC → Collision
//
//  A chase camera rides right behind one proton through a 3D beam pipe.
//  The whole scene is driven by the proton's REAL energy at each stage:
//  energy → Lorentz factor γ → speed, and the visual speed grows with
//  log(energy), so every stage feels faster than the last.
// =========================================================

(() => {
  const $ = id => document.getElementById(id);
  const root = $('jr'), stageEl = $('jrStage'), canvas = $('jrCanvas');
  const flashEl = $('jrFlash'), titleEl = $('jrTitle'), startEl = $('jrStart'), endEl = $('jrEnd'), slowmoEl = $('jrSlowmo');
  const nameEl = $('jrName'), whatEl = $('jrWhat'), stepEl = $('jrStep');
  const eEl = $('jrE'), eLabel = $('jrELabel'), vEl = $('jrV'), gEl = $('jrG'), pEl = $('jrP'), fieldEl = $('jrField');
  const stepsEl = $('jrSteps'), infoEl = $('jrInfo'), mapEl = $('jrMap');
  const playBtn = $('jrPlay'), nextBtn = $('jrNext'), replayBtn = $('jrReplay'), autoEl = $('jrAuto');

  // ---------------------------------------------------------------- physics
  const MP = 938.272e6;                       // proton rest energy (eV)
  const gammaOf = E => 1 + E / MP;            // E = kinetic energy
  const betaOf = E => { const g = gammaOf(E); return Math.sqrt(1 - 1 / (g * g)); };
  const E_SRC = 45e3, E_TOP = 6.8e12;
  // visual speed (world units / s): grows with log(E) so it keeps increasing
  // even when the real speed is already 99.9…% of c
  const logE = E => Math.log10(Math.max(E, E_SRC) / E_SRC);           // 0 … 8.2
  const energyK = E => Math.min(1, logE(E) / logE(E_TOP));           // 0 … 1
  const visSpeed = E => 3 + 4 * Math.pow(1 + logE(E), 1.62);         // ≈7 … 155

  const loc = () => App.lang() === 'el' ? 'el-GR' : 'en-US';
  const num = (x, d = 0) => x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
  function fmtE(e) {
    if (e <= 0) return '0 eV';
    if (e >= 1e12) return num(e / 1e12, 2) + ' TeV';
    if (e >= 1e9) return num(e / 1e9, e < 1e10 ? 2 : e < 1e11 ? 1 : 0) + ' GeV';
    if (e >= 1e6) return num(e / 1e6, e < 1e7 ? 2 : e < 1e8 ? 1 : 0) + ' MeV';
    if (e >= 1e3) return num(e / 1e3, 1) + ' keV';
    return num(e, 0) + ' eV';
  }
  function fmtB(b) {
    if (b <= 0) return '0% c';
    const k = Math.max(1, Math.min(8, Math.ceil(-Math.log10(1 - b))));
    return num(Math.floor(b * 100 * 10 ** k) / 10 ** k, k) + '% c';
  }
  const fmtG = g => g < 10 ? num(g, 3) : g < 100 ? num(g, 1) : num(Math.round(g));

  // ---------------------------------------------------------------- stages
  const STAGES = [
    { key: 'source', short: { en: 'Hydrogen', el: 'Υδρογόνο' }, name: { en: 'Hydrogen source', el: 'Πηγή υδρογόνου' },
      E0: 0, E1: 45e3, dur: 6, color: '#2ee59d', part: 'H⁻',
      what: { en: 'Hydrogen gas becomes H⁻ ions: 1 proton + 2 electrons', el: 'Αέριο υδρογόνο → ιόντα H⁻: 1 πρωτόνιο + 2 ηλεκτρόνια' },
      info: [
        { en: 'A small bottle of hydrogen gas feeds a plasma source.', el: 'Μια μικρή φιάλη υδρογόνου τροφοδοτεί μια πηγή πλάσματος.' },
        { en: 'Radio waves break the H₂ molecules apart. Some atoms grab an extra electron and become negative H⁻ ions.', el: 'Ραδιοκύματα σπάνε τα μόρια H₂. Κάποια άτομα αρπάζουν ένα επιπλέον ηλεκτρόνιο και γίνονται αρνητικά ιόντα H⁻.' },
        { en: 'An electric field pulls them out at 45 keV.', el: 'Ένα ηλεκτρικό πεδίο τα τραβάει έξω με 45 keV.' }
      ],
      facts: [[{ en: 'Out', el: 'Έξοδος' }, '45 keV'], [{ en: 'Ion', el: 'Ιόν' }, 'H⁻ = p⁺ + 2e⁻']] },
    { key: 'linac', short: { en: 'Linac4', el: 'Linac4' }, name: { en: 'Linac4', el: 'Linac4' },
      E0: 45e3, E1: 160e6, dur: 6, color: '#2ee59d', part: 'H⁻', lattice: 0,
      what: { en: 'Radio-frequency cavities push the ions to 160 MeV', el: 'Κοιλότητες ραδιοσυχνοτήτων σπρώχνουν τα ιόντα στα 160 MeV' },
      info: [
        { en: 'A straight accelerator, 86 m long. CERN\'s newest, running since 2020.', el: 'Ευθύγραμμος επιταχυντής 86 m. Ο νεότερος του CERN, σε λειτουργία από το 2020.' },
        { en: 'The accelerating cells get longer and longer: the faster the ions, the further they travel between two pushes.', el: 'Οι επιταχυντικές κοιλότητες γίνονται όλο και μακρύτερες: όσο πιο γρήγορα τα ιόντα, τόσο πιο πολύ ταξιδεύουν ανάμεσα σε δύο «σπρωξίματα».' },
        { en: 'At the end, a thin carbon foil strips off both electrons: only the bare proton is left.', el: 'Στο τέλος, ένα λεπτό φύλλο άνθρακα αφαιρεί και τα δύο ηλεκτρόνια: μένει μόνο το γυμνό πρωτόνιο.' }
      ],
      facts: [[{ en: 'Energy', el: 'Ενέργεια' }, '45 keV → 160 MeV'], [{ en: 'Length', el: 'Μήκος' }, '86 m'], [{ en: 'Since', el: 'Από' }, '2020']] },
    { key: 'psb', short: { en: 'Booster', el: 'Booster' }, name: { en: 'PS Booster', el: 'PS Booster' },
      E0: 160e6, E1: 2e9, dur: 5, color: '#b38bff', part: 'p⁺', lattice: 3.2, bend: .02, laps: 1.8e6,
      what: { en: 'Four stacked rings take the protons to 2 GeV', el: 'Τέσσερις στοιβαγμένοι δακτύλιοι τα πάνε στα 2 GeV' },
      info: [
        { en: '157 m around: four small rings stacked on top of each other.', el: 'Περιφέρεια 157 m: τέσσερις μικροί δακτύλιοι ο ένας πάνω στον άλλο.' },
        { en: 'Magnets bend the beam into a circle; radio-frequency cavities give it a kick on every lap.', el: 'Μαγνήτες στρίβουν τη δέσμη σε κύκλο· κοιλότητες ραδιοσυχνοτήτων της δίνουν ώθηση σε κάθε γύρο.' },
        { en: 'The proton does about 1.8 million laps every second.', el: 'Το πρωτόνιο κάνει περίπου 1,8 εκατομμύρια γύρους κάθε δευτερόλεπτο.' }
      ],
      facts: [[{ en: 'Energy', el: 'Ενέργεια' }, '160 MeV → 2 GeV'], [{ en: 'Size', el: 'Μέγεθος' }, '157 m'], [{ en: 'Since', el: 'Από' }, '1972']] },
    { key: 'ps', short: { en: 'PS', el: 'PS' }, name: { en: 'Proton Synchrotron', el: 'Proton Synchrotron (PS)' },
      E0: 2e9, E1: 26e9, dur: 5, color: '#ff5fa2', part: 'p⁺', lattice: 3.6, bend: .012, laps: 4.77e5,
      what: { en: 'CERN\'s historic ring: up to 26 GeV', el: 'Ο ιστορικός δακτύλιος του CERN: μέχρι 26 GeV' },
      info: [
        { en: '628 m around, working since 1959: CERN\'s oldest accelerator still running.', el: 'Περιφέρεια 628 m, λειτουργεί από το 1959: ο παλαιότερος επιταχυντής του CERN που δουλεύει ακόμα.' },
        { en: 'It also shapes the beam into "bunches" of about 100 billion protons each.', el: 'Επίσης «κόβει» τη δέσμη σε πακέτα (bunches) με περίπου 100 δισεκατομμύρια πρωτόνια το καθένα.' },
        { en: 'About 480,000 laps every second.', el: 'Περίπου 480.000 γύροι κάθε δευτερόλεπτο.' }
      ],
      facts: [[{ en: 'Energy', el: 'Ενέργεια' }, '2 → 26 GeV'], [{ en: 'Size', el: 'Μέγεθος' }, '628 m'], [{ en: 'Since', el: 'Από' }, '1959']] },
    { key: 'sps', short: { en: 'SPS', el: 'SPS' }, name: { en: 'Super Proton Synchrotron', el: 'Super Proton Synchrotron (SPS)' },
      E0: 26e9, E1: 450e9, dur: 5.5, color: '#4d7cff', part: 'p⁺', lattice: 4, bend: .007, laps: 4.34e4,
      what: { en: '7 km underground, up to 450 GeV', el: '7 km κάτω από τη γη, μέχρι τα 450 GeV' },
      info: [
        { en: 'A 6.9 km ring, since 1976. In 1983 it helped discover the W and Z bosons.', el: 'Δακτύλιος 6,9 km, από το 1976. Το 1983 βοήθησε να ανακαλυφθούν τα μποζόνια W και Z.' },
        { en: 'Its beams also go to the North Area experiments and to HiRadMat.', el: 'Οι δέσμες του πάνε επίσης στα πειράματα της Βόρειας Περιοχής και στο HiRadMat.' },
        { en: 'About 43,000 laps every second.', el: 'Περίπου 43.000 γύροι κάθε δευτερόλεπτο.' }
      ],
      facts: [[{ en: 'Energy', el: 'Ενέργεια' }, '26 → 450 GeV'], [{ en: 'Size', el: 'Μέγεθος' }, '6.9 km'], [{ en: 'Since', el: 'Από' }, '1976']] },
    { key: 'lhc', short: { en: 'LHC', el: 'LHC' }, name: { en: 'Large Hadron Collider', el: 'Large Hadron Collider (LHC)' },
      E0: 450e9, E1: 6.8e12, dur: 8, color: '#4cc9f0', part: 'p⁺', lattice: 4.6, bend: .0035, laps: 11245, twin: true,
      what: { en: 'Two beams, opposite directions, up to 6.8 TeV', el: 'Δύο δέσμες, αντίθετες κατευθύνσεις, μέχρι 6,8 TeV' },
      info: [
        { en: '26.7 km, about 100 m underground, with two beam pipes side by side, one for each direction.', el: '26,7 km, περίπου 100 m κάτω από τη γη, με δύο σωλήνες δέσμης δίπλα-δίπλα, έναν για κάθε κατεύθυνση.' },
        { en: '1232 superconducting dipole magnets (the blue ones) at −271.3 °C bend the beams.', el: '1232 υπεραγώγιμοι δίπολοι μαγνήτες (οι μπλε) στους −271,3 °C στρίβουν τις δέσμες.' },
        { en: 'For real, going from 450 GeV to 6.8 TeV takes about 20 minutes. Then the beams circulate for hours, 11,245 laps a second.', el: 'Στην πραγματικότητα, από τα 450 GeV στα 6,8 TeV χρειάζονται περίπου 20 λεπτά. Μετά οι δέσμες γυρίζουν για ώρες, 11.245 γύρους το δευτερόλεπτο.' }
      ],
      facts: [[{ en: 'Energy', el: 'Ενέργεια' }, '0.45 → 6.8 TeV'], [{ en: 'Size', el: 'Μέγεθος' }, '26.7 km'], [{ en: 'Since', el: 'Από' }, '2008']] },
    { key: 'collision', short: { en: 'Collision', el: 'Σύγκρουση' }, name: { en: 'Collision', el: 'Σύγκρουση' },
      E0: 6.8e12, E1: 6.8e12, dur: 9, color: '#ffd166', part: 'p⁺ ⟶⟵ p⁺',
      what: { en: 'The beams cross inside a detector: 13.6 TeV', el: 'Οι δέσμες διασταυρώνονται μέσα σε έναν ανιχνευτή: 13,6 TeV' },
      info: [
        { en: 'Just before the collision point, magnets squeeze the beams thinner than a human hair.', el: 'Λίγο πριν το σημείο σύγκρουσης, μαγνήτες «στριμώχνουν» τις δέσμες ώστε να γίνουν πιο λεπτές από μια τρίχα.' },
        { en: 'Bunches cross 40 million times a second, with up to about a billion proton collisions every second.', el: 'Τα πακέτα διασταυρώνονται 40 εκατομμύρια φορές το δευτερόλεπτο, με έως και περίπου ένα δισεκατομμύριο συγκρούσεις πρωτονίων κάθε δευτερόλεπτο.' },
        { en: 'The energy of the collision turns into brand-new particles (E = mc²) that fly out in every direction.', el: 'Η ενέργεια της σύγκρουσης μετατρέπεται σε ολοκαίνουργια σωματίδια (E = mc²) που φεύγουν προς κάθε κατεύθυνση.' }
      ],
      facts: [[{ en: 'Collision', el: 'Σύγκρουση' }, '6.8 + 6.8 = 13.6 TeV'], [{ en: 'Crossings', el: 'Διασταυρώσεις' }, '40 M/s']] }
  ];
  const N = STAGES.length;

  // ---------------------------------------------------------------- state
  let ctx, W = 1, H = 1, F = 1;
  let stage = 0, st = 0, clock = 0;         // stage index, time in stage (s), global time (s)
  let playing = false, started = false, auto = true;
  let E = 0;
  let kick = 0;                             // extra speed burst at stage changes
  let shakeX = 0, shakeY = 0;
  let endShown = false, toDetTimer = null;
  let hudTick = 0;

  // tunnel objects
  let rings = [], sparks = [], mates = [], oncoming = [], shed = [];
  let stripped = false, stripT = -1;
  // source scene
  let ions = [];
  // collision scene
  let tracks = [], colDone = false;

  const CAM_Y = .34, CAM_X = .24;             // camera sits a bit above and to the side of the beam axis
  const PROTON_Z = 3.2;                       // how far in front of the camera "our" proton is
  const FAR = 150;

  // ---------------------------------------------------------------- helpers
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const S = () => STAGES[stage];

  // energy of the proton right now
  function energyNow() {
    const s = S();
    if (s.key === 'source') {
      const ours = ions.find(i => i.ours);
      if (!ours || st < ours.te) return 0;
      return E_SRC * smooth((st - ours.te) / .8);
    }
    if (s.key === 'collision') return s.E1;
    // ramp in log(E) over the first 85% of the stage; accelerating shape
    const p = clamp01(st / (s.dur * .85));
    const q = p * p * (3 - 2 * p);
    return Math.exp(Math.log(s.E0) + (Math.log(s.E1) - Math.log(s.E0)) * q);
  }

  // 3D → screen. Curved tunnels: the path bends sideways ∝ distance², like a ring seen from inside.
  function proj(x, y, dz, bend) {
    const z = Math.max(dz, .05);
    const bx = bend * dz * dz;
    return [W / 2 + shakeX + (x + bx + CAM_X) * F / z, H / 2 + shakeY + (y + CAM_Y) * F / z];
  }

  // ---------------------------------------------------------------- stage control
  function enterStage(i, opts = {}) {
    stage = Math.max(0, Math.min(N - 1, i));
    st = 0;
    const s = S();
    kick = stage > 0 ? 1 : 0;
    endShown = false;
    clearTimeout(toDetTimer);
    endEl.classList.remove('show');
    root.classList.remove('counting');
    slowmoEl.classList.remove('show');
    if (s.key === 'source') initSource();
    else if (s.key === 'collision') initCollision();
    else initTunnel();
    if (s.key !== 'linac' && stage > 1) { stripped = true; }
    if (s.key === 'linac' || s.key === 'source') { stripped = false; stripT = -1; }

    // flash + title card
    flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
    titleEl.querySelector('small').textContent = `${stage + 1} / ${N}`;
    titleEl.querySelector('b').textContent = T(s.name);
    titleEl.querySelector('em').textContent = s.key === 'source' ? 'H₂ → H⁻' : s.key === 'collision' ? '6.8 + 6.8 = 13.6 TeV' : `${fmtE(s.E0)} → ${fmtE(s.E1)}`;
    titleEl.classList.remove('show'); void titleEl.offsetWidth; titleEl.classList.add('show');
    if (stage > 0 && !opts.silent && typeof BG !== 'undefined') BG.warp(1);
    if (stage > 0) App.vibrate(stage === N - 1 ? 25 : 12);

    renderStatic();
    renderInfo();
    renderSteps();
    renderMap(true);
  }

  function next() { if (stage < N - 1) enterStage(stage + 1); }

  function setPlaying(on) {
    playing = on;
    playBtn.textContent = on ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    root.classList.toggle('paused', !on);
    if (!on) { clearTimeout(toDetTimer); root.classList.remove('counting'); }
  }

  function start() {
    started = true;
    startEl.classList.add('hide');
    enterStage(0, { silent: true });
    setPlaying(true);
  }

  // ---------------------------------------------------------------- scene: SOURCE
  function initSource() {
    ions = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      ions.push({
        x: rand(-.8, .8), y: rand(-.8, .8), vx: rand(-.3, .3), vy: rand(-.3, .3), a: rand(0, 6.28),
        tc: rand(.5, 2.4),                 // when the molecule is split & the atom becomes H⁻
        te: 2.6 + i * .12 + rand(0, .1),    // when it is pulled out
        ours: false, gone: false
      });
    }
    const ours = ions[7];
    ours.ours = true; ours.tc = 1.2; ours.te = 3.3;
  }

  function drawSource(dt) {
    const R = Math.min(W * .26, H * .34), cx = Math.max(W * .4, R * 1.85 + 8), cy = H * .5;
    // chamber + RF coil
    const pl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    const pulse = .5 + .5 * Math.sin(clock * 6);
    pl.addColorStop(0, `rgba(170,90,255,${.18 + .12 * pulse * smooth(st / 1)})`);
    pl.addColorStop(1, 'rgba(60,30,120,.05)');
    ctx.fillStyle = pl;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(180,200,255,.35)'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(217,137,91,.22)'; ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath(); ctx.ellipse(cx + k * R * .22, cy, R * .07, R * 1.05, 0, 0, 7); ctx.stroke();
    }
    // extraction electrode + field lines
    const ex = cx + R * 1.08;
    ctx.fillStyle = 'rgba(200,210,240,.25)';
    ctx.fillRect(ex, cy - R * .8, 6, R * .62); ctx.fillRect(ex, cy + R * .18, 6, R * .62);
    if (st > 2.2) {
      ctx.strokeStyle = `rgba(76,201,240,${.35 * smooth((st - 2.2) / .6)})`;
      ctx.setLineDash([5, 7]); ctx.lineDashOffset = -clock * 40; ctx.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx + R * .3, cy + k * R * .1); ctx.lineTo(W + 20, cy + k * 4); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    // labels
    ctx.font = `600 ${Math.max(11, W * .012)}px Inter, sans-serif`; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(210,190,255,.8)';
    ctx.fillText(T({ en: 'hydrogen plasma', el: 'πλάσμα υδρογόνου' }), cx, cy + R + 22);

    // bottle feeding the chamber
    const bx = cx - R * 1.55, by = cy;
    ctx.fillStyle = 'rgba(46,229,157,.12)'; ctx.strokeStyle = 'rgba(46,229,157,.7)'; ctx.lineWidth = 2;
    roundRect(bx - R * .22, by - R * .55, R * .44, R * 1.1, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b6ffd9'; ctx.font = `700 ${Math.max(12, R * .16)}px Inter, sans-serif`;
    ctx.fillText('H₂', bx, by + 5);
    ctx.strokeStyle = 'rgba(46,229,157,.5)';
    ctx.beginPath(); ctx.moveTo(bx + R * .22, by); ctx.lineTo(cx - R, by); ctx.stroke();

    // zoom into our ion at the end of the stage
    const ours = ions.find(i => i.ours);
    const zoom = st > 4.6 ? smooth((st - 4.6) / 1.3) : 0;
    ctx.save();
    if (zoom > 0) {
      const [ox, oy] = ionPos(ours, cx, cy, R);
      ctx.translate(ox, oy); ctx.scale(1 + zoom * 5, 1 + zoom * 5); ctx.translate(-ox, -oy);
    }
    for (const io of ions) {
      const s = dt / 1000;
      if (st < io.te) {
        io.vx += rand(-.6, .6) * s; io.vy += rand(-.6, .6) * s;
        io.x += io.vx * s; io.y += io.vy * s;
        const d = Math.hypot(io.x, io.y);
        if (d > .82) { io.x *= .82 / d; io.y *= .82 / d; io.vx *= -.6; io.vy *= -.6; }
        io.a += s * 2;
      }
      const [x, y] = ionPos(io, cx, cy, R);
      if (x > W + 40) continue;
      const r = Math.max(4, R * .045);
      if (st < io.tc) {
        // H₂ molecule: two atoms with a bond
        const dx = Math.cos(io.a) * r * 1.3, dy = Math.sin(io.a) * r * 1.3;
        ctx.strokeStyle = 'rgba(220,230,255,.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
        dot(x - dx, y - dy, r * .8, '#dfe6ff'); dot(x + dx, y + dy, r * .8, '#dfe6ff');
      } else {
        // H⁻ ion: proton + two electrons
        const age = st - io.tc;
        if (age < .35) { ctx.fillStyle = `rgba(255,255,255,${.6 * (1 - age / .35)})`; ctx.beginPath(); ctx.arc(x, y, r * (2 + age * 8), 0, 7); ctx.fill(); }
        glow(x, y, r * (io.ours ? 1.5 : 1.1), io.ours ? '#ff6b86' : '#e2455f');
        for (let k = 0; k < 2; k++) {
          const a = clock * 7 + k * Math.PI + io.a;
          dot(x + Math.cos(a) * r * 2.2, y + Math.sin(a) * r * 1.4, r * .45, '#8fe3ff');
        }
        if (io.ours && st > io.tc + .3 && zoom < .3) {
          ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.max(11, R * .1)}px Inter, sans-serif`; ctx.textAlign = 'left';
          ctx.fillText('H⁻', x + r * 3, y - r * 2);
        }
        // extraction trail
        if (st > io.te) {
          const L = Math.min(260, (st - io.te) ** 2 * 400);
          const g = ctx.createLinearGradient(x - L, y, x, y);
          g.addColorStop(0, 'rgba(255,107,134,0)'); g.addColorStop(1, 'rgba(255,150,170,.8)');
          ctx.strokeStyle = g; ctx.lineWidth = r * .9; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x - r, y); ctx.stroke();
        }
      }
    }
    ctx.restore();
    if (zoom > .75) { ctx.fillStyle = `rgba(255,190,150,${(zoom - .75) / .25 * .3})`; ctx.fillRect(0, 0, W, H); }
  }

  // where an ion is: brownian motion inside the chamber, then accelerated out through the electrode
  function ionPos(io, cx, cy, R) {
    let x = cx + io.x * R, y = cy + io.y * R;
    if (st > io.te) {
      const t = st - io.te;
      const u = smooth(t / .45);
      const ax = cx + R * 1.1, ay = cy;
      x = x + (ax - x) * u; y = y + (ay - y) * u;
      if (t > .45) x = ax + (t - .45) ** 2 * W * .9;
    }
    return [x, y];
  }

  // ---------------------------------------------------------------- scene: TUNNEL
  function initTunnel() {
    rings = []; oncoming = []; shed = [];
    let z = 1.2, n = 0;
    const v0 = visSpeed(S().E0);
    while (z < FAR) { rings.push(makeRing(z, n++)); z += spacing(v0); }
    const count = W < 600 ? 150 : 260;
    sparks = Array.from({ length: count }, () => makeSpark(rand(.6, FAR)));
    mates = Array.from({ length: 26 }, () => ({ ox: rand(-1, 1), oy: rand(-1, 1), oz: rand(-.9, .9), ph: rand(0, 6.28), w: rand(2, 3.4) }));
  }
  function spacing(v) {
    const s = S();
    // Linac: cells get longer as the ions speed up (just like the real drift tubes)
    return s.key === 'linac' ? 1.1 + v * .085 : s.lattice;
  }
  function makeRing(z, n) { return { z, n }; }
  function makeSpark(z) {
    const s = S();
    const onWall = Math.random() < .65;
    const a = rand(0, 6.28);
    const r = onWall ? rand(.96, 1.08) : rand(1.4, 4.5);
    let x = Math.cos(a) * r, y = Math.sin(a) * r * .9;
    if (s.twin && Math.random() < .3) x += 3.2;          // light around the other LHC pipe too
    return { x, y, z, hue: [195, 205, 215, 250, 280][(Math.random() * 5) | 0], b: rand(.5, 1) };
  }

  function drawTunnel(dt) {
    const s = S();
    const sec = dt / 1000;
    const Ek = energyK(E);
    kick *= Math.pow(.02, sec);                                    // kick fades in ~1 s
    const v = visSpeed(E) * (1 + kick * 1.6);
    const bend = s.bend || 0;
    const exposure = .018 + .05 * Ek + .03 * kick;                 // motion blur grows with energy

    // camera shake at the highest energies
    const sh = Math.max(0, Ek - .78) * 9 + kick * 3;
    shakeX += (rand(-sh, sh) - shakeX) * .3; shakeY += (rand(-sh, sh) - shakeY) * .3;

    // camera roll in the rings (we're turning!)
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(-bend * 7 * (1 + .1 * Math.sin(clock))); ctx.translate(-W / 2, -H / 2);

    // glow at the end of the tunnel
    const [vx, vy] = proj(0, 0, 60, bend);
    const gR = Math.max(W, H) * (.22 + .3 * Ek);
    const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, gR);
    vg.addColorStop(0, `rgba(${s.key === 'linac' ? '255,170,120' : '140,200,255'},${.05 + .16 * Ek})`);
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg; ctx.fillRect(-50, -50, W + 100, H + 100);

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // --- the pipe walls: lines running along the tube → strong perspective + shows the curve
    drawWalls(bend, s);

    // --- rings (far → near)
    for (const r of rings) r.z -= v * sec;
    while (rings.length && rings[0].z < .35) rings.shift();
    let last = rings.length ? rings[rings.length - 1] : { z: 1, n: 0 };
    while (last.z < FAR) { last = makeRing(last.z + spacing(v), last.n + 1); rings.push(last); }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const fog = Math.pow(1 - r.z / FAR, 2.4) * clamp01((r.z - 1.2) / 3.5) * clamp01(F / r.z / 28);
      if (fog < .01) continue;
      drawRing(r, v, exposure, bend, fog, s);
    }

    // --- oncoming beam in the LHC (other pipe, other direction!)
    if (s.twin) {
      if (Math.random() < sec * (1.2 + 3 * Ek)) oncoming.push({ z: FAR, y: rand(-.05, .05) });
      for (let i = oncoming.length - 1; i >= 0; i--) {
        const o = oncoming[i];
        o.z -= v * 2 * sec;                                        // closing speed: both moving
        if (o.z < .3) { oncoming.splice(i, 1); continue; }
        const [hx, hy] = proj(3.2, o.y, o.z, bend);
        const [tx, ty] = proj(3.2, o.y, Math.min(FAR, o.z + v * 2 * exposure * 1.5), bend);
        const fog = Math.pow(1 - o.z / FAR, 1.3);
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, 'rgba(255,122,61,0)'); g.addColorStop(1, `rgba(255,190,120,${.9 * fog})`);
        ctx.strokeStyle = g; ctx.lineWidth = Math.min(14, 2 + 30 / o.z);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = `rgba(255,230,200,${fog})`;
        ctx.beginPath(); ctx.arc(hx, hy, Math.min(10, 1 + 18 / o.z), 0, 7); ctx.fill();
      }
    }

    // --- sparks rushing past (reflections on the pipe, light in the tunnel)
    for (let i = 0; i < sparks.length; i++) {
      const p = sparks[i];
      p.z -= v * sec;
      if (p.z < .3) { sparks[i] = makeSpark(FAR * rand(.7, 1)); continue; }
      const [hx, hy] = proj(p.x, p.y, p.z, bend);
      if (hx < -100 || hx > W + 100 || hy < -100 || hy > H + 100) { sparks[i] = makeSpark(FAR * rand(.7, 1)); continue; }
      const tz = Math.min(FAR, p.z + v * exposure);
      const [tx, ty] = proj(p.x, p.y, tz, bend);
      const fog = Math.pow(1 - p.z / FAR, 1.4) * p.b;
      const w = Math.min(3.5, .4 + 3 / p.z);
      if (p.z < 14) {
        // Doppler-ish tint at high energy: blue head, red tail
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, `hsla(${p.hue + 70 * Ek},90%,60%,0)`);
        g.addColorStop(1, `hsla(${p.hue - 20 * Ek},100%,${78 + 18 * Ek}%,${Math.min(1, fog * 1.2)})`);
        ctx.strokeStyle = g;
      } else ctx.strokeStyle = `hsla(${p.hue},90%,75%,${fog * .8})`;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx + .1, hy); ctx.stroke();
    }

    // --- our proton (+ its bunch) and its light trail towards the camera
    drawProton(bend, Ek, v, exposure, sec);

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // speed lines at the edges when we're really fast
    if (Ek > .55 || kick > .3) {
      const k = Math.max((Ek - .55) / .45, kick * .6);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,230,255,${.18 * k})`;
      ctx.lineWidth = 1.2;
      const n = Math.round(10 + 30 * k);
      for (let i = 0; i < n; i++) {
        const a = rand(0, 6.28), r0 = Math.max(W, H) * rand(.42, .6), r1 = r0 + Math.max(W, H) * rand(.1, .3) * k;
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawWalls(bend, s) {
    const col = s.key === 'linac' ? '255,170,120' : s.twin ? '120,200,255' : hexRgb(s.color);
    const pipes = s.twin ? [[0, 1], [3.2, .55]] : [[0, 1]];
    for (const [x0, strength] of pipes) {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + Math.PI / n;
        const wx = x0 + Math.cos(a) * 1.02, wy = Math.sin(a) * 1.02;
        let [lx, ly] = proj(wx, wy, .5, bend);
        for (let z = .5 * 1.12; z < 100; z *= 1.12) {
          const [x, y] = proj(wx, wy, z, bend);
          const al = Math.pow(1 - z / 100, 2) * clamp01(F / z / 20) * .32 * strength;
          ctx.strokeStyle = `rgba(${col},${al})`;
          ctx.lineWidth = Math.max(.6, 7 / z);
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
          lx = x; ly = y;
        }
      }
    }
  }
  const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };

  // one ring of the lattice: a flange, a magnet, an RF cavity — with zoom motion blur
  function drawRing(r, v, exposure, bend, fog, s) {
    const zFar = Math.min(FAR, r.z + v * exposure);
    const band = (x0, rad, width, color, alpha) => {
      const [cx, cy] = proj(x0, 0, r.z, bend);
      const rn = rad * F / r.z, rf = rad * F / zFar;               // radius now vs. a moment ago
      const wpx = Math.max(width * F / r.z, .6);
      const blur = Math.min(Math.max(0, rn - rf), wpx * 1.2 + 8);    // capped, so near rings smear but never fill the screen
      const total = wpx + blur;
      ctx.strokeStyle = color;
      ctx.globalAlpha = Math.min(1, alpha * fog * (wpx / total) * 1.3 + alpha * fog * .15);
      ctx.lineWidth = total;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(.5, rn - blur / 2), 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    };
    if (s.key === 'linac') {
      // copper RF cavities that glow as the RF wave passes
      const rf = .5 + .5 * Math.sin(clock * 18 - r.n * 1.3);
      band(0, 1.45, .15, `rgb(${200 + 55 * rf},${120 + 60 * rf},${80 + 40 * rf})`, .28 + .4 * rf);
      band(0, 1.02, .05, '#9fb0d0', .35);
    } else if (s.twin) {
      // LHC: a blue cryostat around BOTH beam pipes (the "two-in-one" dipole)
      if (r.n % 2 === 0) band(1.6, 4.3, .24, '#2f6bff', .6);
      band(0, 1.0, .06, '#8fd8ff', .45);
      band(3.2, 1.0, .06, '#ffb07a', .3);
    } else {
      if (r.n % 3 === 0) band(0, 1.6, .22, s.color, .6);            // bending dipole
      else if (r.n % 3 === 1) band(0, 1.35, .18, '#dfe6ff', .25);   // focusing quadrupole
      band(0, 1.0, .05, '#9fb0d0', .3);                             // beam pipe flange
    }
  }

  function drawProton(bend, Ek, v, exposure, sec) {
    const s = S();
    const [px, py] = proj(0, 0, PROTON_Z, bend);
    const size = Math.min(W, H) * (.018 + .012 * Ek);

    // light trail = where the proton just was: from the proton back towards the camera
    const trailLen = .6 + 2.4 * Ek + kick;
    const steps = 22;
    let [lx, ly] = [px, py];
    for (let k = 1; k <= steps; k++) {
      const z = PROTON_Z - trailLen * k / steps;
      if (z < .45) break;
      const [x, y] = proj(0, 0, z, bend);
      const f = 1 - k / steps;
      ctx.strokeStyle = `rgba(150,225,255,${.42 * f * (.4 + Ek)})`;
      ctx.lineWidth = size * .9 * (PROTON_Z / z) * (.5 + f * .5);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${.35 * f})`;
      ctx.lineWidth *= .3; ctx.stroke();
      lx = x; ly = y;
    }

    // the rest of the bunch: betatron wobble; the bunch gets smaller as energy rises
    const sigma = .55 * (1 - .8 * Ek) + .06;
    for (const m of mates) {
      const ox = Math.cos(clock * m.w + m.ph) * m.ox * sigma;
      const oy = Math.sin(clock * m.w * .9 + m.ph) * m.oy * sigma;
      const [mx, my] = proj(ox, oy, PROTON_Z + m.oz * (1 - .5 * Ek), bend);
      const [tx, ty] = proj(ox, oy, PROTON_Z + m.oz * (1 - .5 * Ek) + .15 + Ek * .5, bend);
      ctx.strokeStyle = `rgba(160,220,255,${.35 + .3 * Ek})`;
      ctx.lineWidth = Math.max(1, size * .18);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(mx, my); ctx.stroke();
    }

    // the proton itself
    glow(px, py, size * (1.2 + .6 * Ek + kick * .5), stripped || s.key !== 'linac' ? '#ff5577' : '#ff6b86', 3.2);

    // Linac: H⁻ with two electrons until the stripping foil
    if (s.key === 'linac') {
      const foilAt = s.dur * .86;
      if (st > foilAt - .6 && stripT < 0) {
        // the foil comes towards us
        const fz = PROTON_Z + (foilAt - st) * visSpeed(E) * .9;
        if (fz > PROTON_Z - .05) {
          const [fx, fy] = proj(0, 0, Math.max(.3, fz), bend);
          const fr = 1.15 * F / Math.max(.3, fz);
          ctx.fillStyle = 'rgba(210,220,255,.12)'; ctx.strokeStyle = 'rgba(230,235,255,.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.fill(); ctx.stroke();
        }
      }
      if (st >= foilAt && stripT < 0) {
        stripT = clock; stripped = true;
        for (let k = 0; k < 2; k++) shed.push({ x: px, y: py, vx: (k ? 1 : -1) * rand(250, 420), vy: rand(-260, -80), life: 1 });
        flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go');
        App.vibrate(15);
      }
      if (!stripped) {
        for (let k = 0; k < 2; k++) {
          const a = clock * 9 + k * Math.PI;
          glow(px + Math.cos(a) * size * 2.6, py + Math.sin(a) * size * 1.2, size * .45, '#7fdcff', 2.2);
        }
      }
    }
    // stripped electrons flying away
    for (let i = shed.length - 1; i >= 0; i--) {
      const e = shed[i];
      e.x += e.vx * sec; e.y += e.vy * sec; e.vy += 300 * sec; e.life -= sec * .9;
      if (e.life <= 0) { shed.splice(i, 1); continue; }
      ctx.globalAlpha = e.life;
      glow(e.x, e.y, size * .5, '#7fdcff', 2.4);
      ctx.fillStyle = '#bff0ff'; ctx.font = `700 ${Math.max(11, size * .8)}px Inter, sans-serif`;
      ctx.fillText('e⁻', e.x + size, e.y - size);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- scene: COLLISION
  const T_HIT = 2.6;
  function initCollision() {
    tracks = []; colDone = false;
  }
  function makeTracks() {
    tracks = [];
    const TYPES = [
      ['pion', '#2ee59d', .52, 1.4], ['pion', '#2ee59d', .52, 1.4], ['pion', '#2ee59d', .52, 1.4],
      ['photon', '#ffd166', .36, 0], ['electron', '#ff4d6d', .36, 1.2], ['muon', '#4cc9f0', 1.1, .35], ['neutron', '#2ee59d', .5, 0]
    ];
    const add = (type, color, stop, curl, a) => tracks.push({ type, color, stop, a, k: (Math.random() < .5 ? -1 : 1) * curl * rand(.5, 1.2), dash: type === 'photon' || type === 'neutron', born: rand(0, .15) });
    // two back-to-back jets (momentum must add up to zero)
    const jet = rand(0, Math.PI);
    for (let i = 0; i < 9; i++) add('pion', '#2ee59d', .53, .9, jet + rand(-.22, .22));
    for (let i = 0; i < 8; i++) add('pion', '#2ee59d', .53, .9, jet + Math.PI + rand(-.22, .22));
    for (let i = 0; i < 26; i++) { const t = TYPES[(Math.random() * TYPES.length) | 0]; add(t[0], t[1], t[2], t[3], rand(0, 6.28)); }
    add('muon', '#4cc9f0', 1.15, .25, jet + 1.6); add('muon', '#4cc9f0', 1.15, .25, jet + 1.6 + Math.PI + rand(-.2, .2));
  }

  function drawCollision(dt) {
    const cx = W / 2 + shakeX, cy = H / 2 + shakeY;
    const R = Math.min(W, H) * .44;
    shakeX *= .85; shakeY *= .85;

    if (st < T_HIT) {
      // ---- side view: two bunches race towards the interaction point inside the detector
      slowmoEl.classList.toggle('show', st > .5);
      const u = st / T_HIT;
      // detector silhouette (a big cylinder seen from the side)
      ctx.strokeStyle = 'rgba(160,180,230,.18)'; ctx.lineWidth = 1.5;
      for (const k of [1, .72, .45]) {
        const rx = R * 1.15 * k, ry = R * .95 * k;
        ctx.beginPath(); ctx.ellipse(cx - rx, cy, ry * .22, ry, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + rx, cy, ry * .22, ry, 0, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - rx, cy - ry); ctx.lineTo(cx + rx, cy - ry); ctx.moveTo(cx - rx, cy + ry); ctx.lineTo(cx + rx, cy + ry); ctx.stroke();
      }
      ctx.font = `600 ${Math.max(11, R * .045)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,209,102,.8)';
      if (W > 600) ctx.fillText(T({ en: 'interaction point', el: 'σημείο σύγκρουσης' }), cx, cy - R * 1.02);
      ctx.strokeStyle = 'rgba(255,209,102,.4)'; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(cx, cy - R * .96); ctx.lineTo(cx, cy - 16); ctx.stroke(); ctx.setLineDash([]);
      // beam pipe
      ctx.strokeStyle = 'rgba(200,215,245,.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cy - 7); ctx.lineTo(W, cy - 7); ctx.moveTo(0, cy + 7); ctx.lineTo(W, cy + 7); ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      // horizontal speed streaks everywhere
      const k = .4 + .6 * u;
      for (let i = 0; i < 40; i++) {
        const y = cy + rand(-R, R) * rand(.1, 1), x = rand(0, W), L = rand(40, 200) * k;
        ctx.strokeStyle = `rgba(170,210,255,${.05 + .12 * k})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x < cx ? L : -L), y); ctx.stroke();
      }
      // the two bunches: flattened into "pancakes" by relativity, with huge light trails
      const pos = Math.pow(u, 2.2);
      const D = W * .62;
      const beams = [[-1, '#4cc9f0', '150,220,255'], [1, '#ff7a3d', '255,170,110']];
      for (const [side, col, rgb] of beams) {
        const x = cx + side * D * (1 - pos), y = cy + side * -R * .05 * (1 - pos);   // tiny crossing angle
        const tail = Math.max(W, 400) * (.3 + .7 * u);
        const g = ctx.createLinearGradient(x + side * tail, y, x, y);
        g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},.95)`);
        ctx.strokeStyle = g; ctx.lineCap = 'round';
        ctx.lineWidth = 10 + 16 * u;
        ctx.beginPath(); ctx.moveTo(x + side * tail, y); ctx.lineTo(x, y); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.globalAlpha = .7;
        ctx.beginPath(); ctx.moveTo(x + side * tail * .5, y); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = 1;
        // pancake
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.ellipse(x, y, 3 + 2 * (1 - u), R * .08, 0, 0, 7); ctx.fill();
        glow(x, y, R * .05, col, 3);
      }
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    // ---- the collision
    if (!colDone) {
      colDone = true;
      makeTracks();
      slowmoEl.classList.remove('show');
      flashEl.classList.remove('go', 'big'); void flashEl.offsetWidth; flashEl.classList.add('go', 'big');
      shakeX = rand(-14, 14); shakeY = rand(-14, 14);
      const b = canvas.getBoundingClientRect();
      if (typeof BG !== 'undefined') BG.burst(b.left + b.width / 2, b.top + b.height / 2, 140);
      App.vibrate([40, 30, 80]);
    }
    const t = st - T_HIT;

    // end view of the detector (looking along the beam)
    const L = (r0, r1, col, a) => { ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = (r1 - r0) * R; ctx.beginPath(); ctx.arc(cx, cy, (r0 + r1) / 2 * R, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; };
    L(.29, .40, '#2e8f63', .28);
    L(.42, .60, '#b58a2a', .24);
    L(.62, .66, '#8a93b0', .35);
    L(.72, .76, '#5a1622', .6); L(.84, .88, '#5a1622', .6); L(.96, 1, '#5a1622', .6);
    ctx.strokeStyle = 'rgba(143,163,199,.25)'; ctx.lineWidth = 1;
    for (const r of [.07, .12, .17, .22, .26]) { ctx.beginPath(); ctx.arc(cx, cy, r * R, 0, 7); ctx.stroke(); }

    // shock ring
    if (t < 1.2) {
      ctx.strokeStyle = `rgba(255,240,200,${.8 * (1 - t / 1.2)})`; ctx.lineWidth = 3 + 10 * (1 - t / 1.2);
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.3 * smooth(t / 1.2), 0, 7); ctx.stroke();
    }
    // centre flash
    const fl = Math.max(0, 1 - t / .6);
    if (fl > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .5); g.addColorStop(0, `rgba(255,255,255,${fl})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }

    // tracks grow out explosively (fast at first), then stay
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const tr of tracks) {
      const age = t - tr.born;
      if (age <= 0) continue;
      const grow = 1 - Math.pow(1 - clamp01(age / .55), 3);
      const len = tr.stop * grow;
      let x = 0, y = 0, a = tr.a;
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = tr.type === 'muon' ? 2.4 : 1.8;
      ctx.setLineDash(tr.dash ? [5, 4] : []);
      ctx.shadowColor = tr.color; ctx.shadowBlur = tr.dash ? 0 : 8;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      const steps = 40;
      for (let i = 1; i <= steps; i++) {
        const d = len * i / steps;
        const kk = d < .66 ? tr.k : -tr.k * .5;          // opposite bend in the iron outside the magnet
        if (!tr.dash) a += kk * (len / steps);
        x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps;
        ctx.lineTo(cx + x * R, cy + y * R);
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.shadowBlur = 0;
      // energy deposit in the calorimeters
      if (grow >= 1 && tr.type !== 'muon') {
        const g = ctx.createRadialGradient(cx + x * R, cy + y * R, 0, cx + x * R, cy + y * R, R * .05);
        const c = tr.type === 'photon' || tr.type === 'electron' ? '120,255,190' : '255,190,80';
        g.addColorStop(0, `rgba(${c},.8)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + x * R, cy + y * R, R * .05, 0, 7); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    if (t > 2.8 && !endShown) {
      endShown = true;
      endEl.classList.add('show');
      if (auto && playing) {
        root.classList.add('counting');
        toDetTimer = setTimeout(() => { if (playing && auto) location.hash = 'detectors'; }, 7000);
      }
    }
  }

  // ---------------------------------------------------------------- drawing helpers
  function glow(x, y, r, color, spread = 2.6) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * spread);
    g.addColorStop(0, '#fff'); g.addColorStop(.22, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * spread, 0, 7); ctx.fill();
  }
  function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ---------------------------------------------------------------- UI
  function renderStatic() {
    const s = S();
    stepEl.textContent = `${stage + 1} / ${N}`;
    nameEl.textContent = T(s.name);
    whatEl.textContent = T(s.what);
    root.style.setProperty('--stage', s.color);
    eLabel.textContent = s.key === 'collision' ? T({ en: 'Collision energy', el: 'Ενέργεια σύγκρουσης' }) : T({ en: 'Energy', el: 'Ενέργεια' });
  }

  function renderInfo() {
    const s = S();
    infoEl.style.setProperty('--c', s.color);
    infoEl.innerHTML = `
      <div class="jr-info-head"><span class="jr-dot"></span><h4>${T(s.name)}</h4></div>
      <ul>${s.info.map(p => `<li>${T(p)}</li>`).join('')}</ul>
      <div class="jr-facts">${s.facts.map(([k, v]) => `<div><span>${T(k)}</span><b>${v}</b></div>`).join('')}</div>`;
  }

  function renderSteps() {
    if (!stepsEl.children.length) {
      STAGES.forEach((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<button><span class="n">${i + 1}</span><b></b><small></small><i></i></button>`;
        li.querySelector('button').onclick = () => { if (!started) { started = true; startEl.classList.add('hide'); setPlaying(true); } enterStage(i); };
        stepsEl.appendChild(li);
      });
    }
    [...stepsEl.children].forEach((li, i) => {
      const s = STAGES[i];
      li.style.setProperty('--c', s.color);
      li.classList.toggle('on', i === stage);
      li.classList.toggle('done', i < stage);
      li.querySelector('b').textContent = T(s.short);
      li.querySelector('small').textContent = s.key === 'source' ? '45 keV' : s.key === 'collision' ? '13.6 TeV' : fmtE(s.E1);
    });
  }

  function updateHUD() {
    const s = S();
    const g = gammaOf(E), b = betaOf(E);
    eEl.textContent = s.key === 'collision' ? fmtE(2 * E) : fmtE(E);
    vEl.textContent = fmtB(b);
    gEl.textContent = fmtG(g);
    pEl.textContent = s.key === 'source' ? (st < 1.2 ? 'H₂' : 'H⁻') : s.key === 'linac' ? (stripped ? 'p⁺' : 'H⁻') : s.part;
    // the electric field of a fast charge squashes into a pancake (by 1/γ)
    fieldEl.style.transform = `scaleX(${Math.max(.04, 1 / g)})`;
    const li = stepsEl.children[stage];
    if (li) li.querySelector('i').style.width = (clamp01(st / S().dur) * 100) + '%';
  }

  // ---------------------------------------------------------------- mini map
  const MAP = {
    src: [14, 176], linac: [[22, 176], [78, 176]],
    psb: { cx: 88, cy: 166, r: 10 }, ps: { cx: 126, cy: 146, r: 20 }, sps: { cx: 178, cy: 118, r: 32 }, lhc: { cx: 196, cy: 86, r: 70 }
  };
  let mapMarker, mapTrail, mapEls = {};
  function buildMap() {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, a, p = mapEl) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; };
    mapEl.innerHTML = '';
    const grp = (i) => { const g = el('g', { class: 'm-el', 'data-stage': i }); g.addEventListener('click', e => { e.stopPropagation(); if (!started) { started = true; startEl.classList.add('hide'); setPlaying(true); } enterStage(i); }); return g; };
    let g = grp(0); el('rect', { x: 6, y: 168, width: 14, height: 16, rx: 3, class: 'm-shape', stroke: '#2ee59d' }, g); mapEls.source = g;
    g = grp(1); el('line', { x1: 22, y1: 176, x2: 78, y2: 176, class: 'm-shape', stroke: '#2ee59d' }, g); el('line', { x1: 22, y1: 176, x2: 78, y2: 176, class: 'm-hit' }, g); mapEls.linac = g;
    for (const [k, i, col] of [['psb', 2, '#b38bff'], ['ps', 3, '#ff5fa2'], ['sps', 4, '#4d7cff'], ['lhc', 5, '#4cc9f0']]) {
      const R = MAP[k];
      g = grp(i);
      el('circle', { cx: R.cx, cy: R.cy, r: R.r, class: 'm-shape', stroke: col }, g);
      el('circle', { cx: R.cx, cy: R.cy, r: R.r, class: 'm-hit' }, g);
      mapEls[k] = g;
    }
    g = grp(6); el('circle', { cx: MAP.lhc.cx, cy: MAP.lhc.cy + MAP.lhc.r, r: 6, class: 'm-ip' }, g); mapEls.collision = g;
    const lbl = (x, y, t, a = 'middle') => { const e = el('text', { x, y, class: 'm-lbl', 'text-anchor': a }); e.textContent = t; };
    lbl(50, 194, 'LINAC4'); lbl(88, 150, 'PSB'); lbl(126, 150, 'PS'); lbl(178, 122, 'SPS'); lbl(196, 30, 'LHC'); lbl(214, 162, 'ATLAS', 'start');
    mapTrail = el('path', { class: 'm-trail', d: '' });
    mapMarker = el('circle', { r: 4, class: 'm-marker' });
  }
  function mapPos() {
    const s = S(), p = clamp01(st / s.dur);
    const ring = (R, a0, laps) => { const a = (a0 - p * laps * 360) * Math.PI / 180; return [R.cx + R.r * Math.cos(a), R.cy + R.r * Math.sin(a)]; };
    switch (s.key) {
      case 'source': return MAP.src;
      case 'linac': return [22 + 56 * p, 176];
      case 'psb': return ring(MAP.psb, 90, 3);
      case 'ps': return ring(MAP.ps, 120, 3);
      case 'sps': return ring(MAP.sps, 120, 2);
      case 'lhc': return ring(MAP.lhc, 150, 2.4);
      default: return [MAP.lhc.cx, MAP.lhc.cy + MAP.lhc.r];
    }
  }
  let mapPts = [];
  function renderMap(changed) {
    if (changed) {
      mapPts = [];
      Object.entries(mapEls).forEach(([k, g]) => g.classList.toggle('on', k === S().key));
    }
    const [x, y] = mapPos();
    mapMarker.setAttribute('cx', x); mapMarker.setAttribute('cy', y);
    mapPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    if (mapPts.length > 14) mapPts.shift();
    mapTrail.setAttribute('d', 'M' + mapPts.join(' L'));
  }

  // ---------------------------------------------------------------- main loop
  function frame(dt) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h; F = Math.min(W, H) * .62;
    if (!started) { idle(dt); return; }
    if (playing) {
      const sec = dt / 1000;
      clock += sec;
      st += sec;
      const s = S();
      if (st >= s.dur) {
        if (auto && stage < N - 1) { enterStage(stage + 1); }
        else if (s.key !== 'collision') st = s.dur;   // manual: hold at full energy (the ring keeps turning)
      }
    }
    E = energyNow();

    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, W, H);
    const s = S();
    if (s.key === 'source') drawSource(playing ? dt : 0);
    else if (s.key === 'collision') drawCollision(playing ? dt : 0);
    else drawTunnel(playing ? dt : 0);

    if (++hudTick % 2 === 0) updateHUD();
    renderMap(false);
  }

  // before the start: a slow tunnel drift behind the "Ride along" button
  function idle(dt) {
    if (!sparks.length) { stage = 1; initTunnel(); stage = 0; }
    clock += dt / 1000;
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H);
    const keep = stage; stage = 1; E = 3e6;
    drawTunnel(dt);
    stage = keep;
  }

  const lp = App.loop(frame);

  // ---------------------------------------------------------------- events
  $('jrStartBtn').onclick = start;
  playBtn.onclick = () => { if (!started) return start(); setPlaying(!playing); };
  nextBtn.onclick = () => { if (!started) return start(); next(); };
  replayBtn.onclick = () => { started = true; startEl.classList.add('hide'); enterStage(0); setPlaying(true); };
  $('jrAgain').onclick = () => { enterStage(0); setPlaying(true); };
  autoEl.onchange = () => { auto = autoEl.checked; if (!auto) { clearTimeout(toDetTimer); root.classList.remove('counting'); } };
  $('jrToDet').addEventListener('click', () => clearTimeout(toDetTimer));

  const fsBtn = $('jrFs');
  if (!document.fullscreenEnabled) fsBtn.hidden = true;
  fsBtn.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen().catch(() => {}); };

  document.addEventListener('keydown', e => {
    if (App.current !== 'ride' || e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!started) start(); else setPlaying(!playing); }
    if (e.key === 'n' || e.key === 'N') next();
  });

  document.addEventListener('langchange', () => { renderStatic(); renderInfo(); renderSteps(); updateHUD(); });

  buildMap();
  enterStage(0, { silent: true });
  titleEl.classList.remove('show');
  flashEl.classList.remove('go');
  setPlaying(false);
  App.on('ride', {
    enter() { lp.start(); },
    leave() {
      lp.stop();
      setPlaying(false);
      clearTimeout(toDetTimer); root.classList.remove('counting');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  });
})();
