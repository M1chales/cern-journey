// =========================================================
//  complex.js — CERN's accelerator complex as one model
//
//  Linac4 → PS Booster → PS → SPS → LHC → experiments
//
//  • One world in metres. Ring sizes are to scale (PSB 157 m, PS 628 m,
//    SPS 6.9 km, LHC 26.7 km). Relative positions are approximate.
//  • A chase camera rides behind the bunch; it climbs as the machines get
//    bigger, so the change of scale is something you feel.
//  • LHC: Beam 1 clockwise (blue), Beam 2 anticlockwise (red), in separate
//    pipes; collisions at the four interaction points.
//  • Experiments: footprints to scale at their points, the five smaller
//    experiments at their real locations, simplified event displays.
// =========================================================

(() => {
  const $ = id => document.getElementById(id);
  const root = $('cx'), stageEl = $('cxStage'), canvas = $('cxCanvas');
  const kickerEl = $('cxKicker'), whereEl = $('cxWhere'), whatEl = $('cxWhat');
  const eLabel = $('cxELabel'), eEl = $('cxE'), vEl = $('cxV'), nextEl = $('cxNext'), realEl = $('cxReal');
  const navEl = $('cxNav'), expsEl = $('cxExps'), cardEl = $('cxCard'), cardBody = $('cxCardBody');
  const startEl = $('cxStart'), playBtn = $('cxFollow'), restartBtn = $('cxRestart');

  const DEG = Math.PI / 180, TAU = Math.PI * 2;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = x => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const rand = (a, b) => a + Math.random() * (b - a);

  // ------------------------------------------------------------ physics & formatting
  const MP = 938.272e6;
  const gammaOf = E => 1 + E / MP;
  const betaOf = E => { const g = gammaOf(E); return Math.sqrt(1 - 1 / (g * g)); };
  const loc = () => App.lang() === 'el' ? 'el-GR' : 'en-US';
  const num = (x, d = 0) => x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d });
  function fmtE(e) {
    if (e <= 0) return '0 eV';
    if (e >= 1e12) return num(e / 1e12, 2) + ' TeV';
    if (e >= 1e9) return num(e / 1e9, e < 1e10 ? 2 : e < 1e11 ? 1 : 0) + ' GeV';
    if (e >= 1e6) return num(e / 1e6, e < 1e7 ? 2 : e < 1e8 ? 1 : 0) + ' MeV';
    if (e >= 1e3) return num(e / 1e3, 0) + ' keV';
    return num(e, 0) + ' eV';
  }
  function fmtB(b) {
    if (b <= 0) return '0 %';
    const k = Math.max(1, Math.min(8, Math.ceil(-Math.log10(1 - b))));
    return num(Math.floor(b * 100 * 10 ** k) / 10 ** k, k) + ' %';
  }

  // ------------------------------------------------------------ geometry (metres, y points "south")
  const LHC = { cx: 0, cy: 0, r: 4243 };
  const SPS = { cx: -250, cy: 2950, r: 1100 };
  const PS = { cx: 250, cy: 4500, r: 100 };
  const PSB = { cx: 100, cy: 4600, r: 25 };
  const rp = (R, th) => [R.cx + R.r * Math.cos(th), R.cy + R.r * Math.sin(th)];
  const tang = (th, dir) => Math.atan2(dir * Math.cos(th), -dir * Math.sin(th)); // heading of travel

  function Line(a, b) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), h = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return { len, at: d => [a[0] + (b[0] - a[0]) * d / len, a[1] + (b[1] - a[1]) * d / len], hd: () => h };
  }
  function Arc(R, th0, sweepDeg, dir) {
    return { len: R.r * sweepDeg * DEG, R, at: d => rp(R, th0 + dir * d / R.r), hd: d => tang(th0 + dir * d / R.r, dir) };
  }
  function Bez(p0, h0, p3, h3, kf) {
    const k = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) * kf;
    const c1 = [p0[0] + Math.cos(h0) * k, p0[1] + Math.sin(h0) * k], c2 = [p3[0] - Math.cos(h3) * k, p3[1] - Math.sin(h3) * k];
    const N = 200, pts = [], cum = [0];
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]]);
      if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const len = cum[N];
    const idx = d => {
      d = Math.max(0, Math.min(len, d));
      let lo = 0, hi = N;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
      return [lo, hi, (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1)];
    };
    return { len, pts, at: d => { const [l, h, f] = idx(d); return [lerp(pts[l][0], pts[h][0], f), lerp(pts[l][1], pts[h][1], f)]; },
      hd: d => { const [l, h] = idx(d); return Math.atan2(pts[h][1] - pts[l][1], pts[h][0] - pts[l][0]); } };
  }

  // the proton's path, piece by piece
  const LIN0 = [14, 4575], LIN1 = [100, 4575];
  const sLinac = Line(LIN0, LIN1);
  const sPSB = Arc(PSB, 270 * DEG, 1035, 1);                  // ~2.9 laps, exit at 225°
  const sBT = Bez(sPSB.at(sPSB.len), sPSB.hd(sPSB.len), rp(PS, 225 * DEG), tang(225 * DEG, 1), .35);
  const sPS = Arc(PS, 225 * DEG, 990, 1);                     // ~2.75 laps, exit at 135°
  const sTT = Bez(sPS.at(sPS.len), sPS.hd(sPS.len), rp(SPS, 90 * DEG), tang(90 * DEG, 1), .35); // TT2 / TT10
  const sSPS = Arc(SPS, 90 * DEG, 758, 1);                    // ~2.1 laps, exit at 128°
  const sTI2 = Bez(sSPS.at(sSPS.len), sSPS.hd(sSPS.len), rp(LHC, 128 * DEG), tang(128 * DEG, 1), .2);
  const sLHC = Arc(LHC, 128 * DEG, 440, 1);                   // Beam 1, clockwise
  const TI8 = Bez(rp(SPS, 330 * DEG), tang(330 * DEG, 1), rp(LHC, 52 * DEG), tang(52 * DEG, -1), .3);

  // per piece: machine, speed [start,end] (m/s, visual), energy, camera (back, height, pitch)
  const SEGS = [
    { seg: sLinac, m: 'linac', v: [34, 80], cam: [26, 8.5, 17] },
    { seg: sPSB, m: 'psb', v: [150, 430], E: [160e6, 2e9], cam: [46, 29, 32] },
    { seg: sBT, m: 'psb', v: [430, 430], E: [2e9, 2e9], cam: [80, 55, 34], xfer: 'BT' },
    { seg: sPS, m: 'ps', v: [820, 1750], E: [2e9, 26e9], cam: [150, 105, 34] },
    { seg: sTT, m: 'ps', v: [1750, 1750], E: [26e9, 26e9], cam: [420, 320, 36], xfer: 'TT2 · TT10' },
    { seg: sSPS, m: 'sps', v: [3600, 8600], E: [26e9, 450e9], cam: [1000, 690, 34] },
    { seg: sTI2, m: 'sps', v: [8600, 8600], E: [450e9, 450e9], cam: [1500, 1050, 34], xfer: 'TI2' },
    { seg: sLHC, m: 'lhc', v: [13500, 13500], E: [450e9, 450e9], cam: [2300, 1350, 30] }
  ];
  let acc = 0;
  SEGS.forEach(s => { s.s0 = acc; acc += s.seg.len; s.s1 = acc; });
  const S_END = acc;
  const segAt = s => { for (const g of SEGS) if (s < g.s1) return g; return SEGS[SEGS.length - 1]; };
  const posAt = s => { s = Math.max(0, Math.min(S_END, s)); const g = segAt(s); return g.seg.at(s - g.s0); };
  const hdAt = s => { s = Math.max(0, Math.min(S_END - .01, s)); const g = segAt(s); return g.seg.hd(s - g.s0); };

  // Linac4 structure (distance from the source, m) and energy at the end of each section
  const LINAC = [
    ['H⁻', 0, 4, 45e3, '#8b93a8'], ['RFQ', 4, 7, 3e6, '#c9a26b'], ['MEBT', 7, 11, 3e6, '#8b93a8'],
    ['DTL', 11, 30, 50e6, '#d9895b'], ['CCDTL', 30, 55, 102e6, '#d9895b'], ['PIMS', 55, 78, 160e6, '#d9895b'], ['', 78, 86, 160e6, '#8b93a8']
  ];
  function linacEnergy(d) {
    let prev = 0;
    for (const [, a, b, E] of LINAC) {
      if (d <= b) { const u = clamp01((d - a) / (b - a)); return prev === 0 ? E * u : prev * Math.pow(E / prev, u); }
      prev = E;
    }
    return 160e6;
  }

  const MACHINE = {
    linac: { name: 'Linac4', color: '#b6a4f5' },
    psb: { name: 'PS Booster', color: '#e58fb4' },
    ps: { name: 'Proton Synchrotron', color: '#d9659a' },
    sps: { name: 'Super Proton Synchrotron', color: '#57a6de' },
    lhc: { name: 'Large Hadron Collider', color: '#6f8fd6' }
  };
  const B1 = '#4f8dff', B2 = '#ff5b5b';

  // interaction points (Beam 1 goes clockwise: P1 → P2 → … → P8)
  const IP = {
    atlas: { th: 90 * DEG, pt: 'P1', col: '#5b8def', name: 'ATLAS', foot: [46, 25], span: 560 },
    alice: { th: 135 * DEG, pt: 'P2', col: '#e8a04a', name: 'ALICE', foot: [26, 16], span: 170 },
    cms: { th: 270 * DEG, pt: 'P5', col: '#e0625f', name: 'CMS', foot: [21, 15], span: 300 },
    lhcb: { th: 45 * DEG, pt: 'P8', col: '#46c2a0', name: 'LHCb', foot: [21, 13], span: 190, oneSide: true }
  };
  const OTHER_P = [
    [180, 'P3', { en: 'collimation', el: 'κατευθυντήρες' }], [225, 'P4', { en: 'RF cavities', el: 'κοιλότητες RF' }],
    [315, 'P6', { en: 'beam dump', el: 'απόρριψη δέσμης' }], [0, 'P7', { en: 'collimation', el: 'κατευθυντήρες' }]
  ];

  // ------------------------------------------------------------ the nine LHC experiments
  const EXPS = [
    { id: 'atlas', host: 'atlas', major: true, name: 'ATLAS',
      what: { en: 'General-purpose detector: the Higgs boson, extra dimensions, particles that could make up dark matter.', el: 'Ανιχνευτής γενικού σκοπού: μποζόνιο Higgs, επιπλέον διαστάσεις, σωματίδια που ίσως φτιάχνουν τη σκοτεινή ύλη.' },
      facts: [['46 × 25 m', { en: 'size', el: 'μέγεθος' }], ['7 000 t', { en: 'weight', el: 'βάρος' }], ['P1 · Meyrin', { en: 'location', el: 'θέση' }]],
      how: { en: 'Particles cross the tracker, the calorimeters and the muon spectrometer inside huge air-core toroid magnets.', el: 'Τα σωματίδια περνούν τον ανιχνευτή τροχιών, τα καλορίμετρα και το φασματόμετρο μιονίων μέσα σε τεράστιους τοροειδείς μαγνήτες.' } },
    { id: 'cms', host: 'cms', major: true, name: 'CMS',
      what: { en: 'General-purpose detector with the same goals as ATLAS, but different technical solutions and a 3.8 T solenoid magnet.', el: 'Ανιχνευτής γενικού σκοπού με τους ίδιους στόχους με το ATLAS, αλλά άλλες τεχνικές λύσεις και σωληνοειδή μαγνήτη 3,8 T.' },
      facts: [['21 × 15 m', { en: 'size', el: 'μέγεθος' }], ['14 000 t', { en: 'weight', el: 'βάρος' }], ['P5 · Cessy', { en: 'location', el: 'θέση' }]],
      how: { en: 'Muons are the only particles that cross its iron return yoke, so muon chambers sit between the iron layers.', el: 'Τα μιόνια είναι τα μόνα που περνούν τον σιδερένιο ζυγό, γι\' αυτό οι θάλαμοι μιονίων βρίσκονται ανάμεσα στις στρώσεις σιδήρου.' } },
    { id: 'alice', host: 'alice', major: true, name: 'ALICE',
      what: { en: 'Dedicated to heavy-ion physics: the quark–gluon plasma, the state of matter of the first microseconds after the Big Bang.', el: 'Αφιερωμένο στη φυσική βαρέων ιόντων: το πλάσμα κουάρκ–γλουονίων, η κατάσταση της ύλης των πρώτων μικροδευτερολέπτων μετά τη Μεγάλη Έκρηξη.' },
      facts: [['26 × 16 m', { en: 'size', el: 'μέγεθος' }], ['10 000 t', { en: 'weight', el: 'βάρος' }], ['P2 · St-Genis', { en: 'location', el: 'θέση' }]],
      how: { en: 'When lead nuclei collide, thousands of particles come out. Its large Time Projection Chamber can follow each of them.', el: 'Όταν συγκρούονται πυρήνες μολύβδου βγαίνουν χιλιάδες σωματίδια. Ο μεγάλος θάλαμος TPC μπορεί να ακολουθήσει το καθένα.' } },
    { id: 'lhcb', host: 'lhcb', major: true, name: 'LHCb',
      what: { en: 'Studies the differences between matter and antimatter using particles that contain the "beauty" quark.', el: 'Μελετά τις διαφορές ύλης–αντιύλης με σωματίδια που περιέχουν το κουάρκ «beauty».' },
      facts: [['21 × 13 m', { en: 'size', el: 'μέγεθος' }], ['5 600 t', { en: 'weight', el: 'βάρος' }], ['P8 · Ferney', { en: 'location', el: 'θέση' }]],
      how: { en: 'B particles are thrown mostly forward, so instead of surrounding the collision LHCb is a line of detectors on one side.', el: 'Τα σωματίδια B πετιούνται κυρίως προς τα εμπρός, οπότε αντί να περικλείει τη σύγκρουση, το LHCb είναι μια σειρά ανιχνευτών στη μία πλευρά.' } },
    { id: 'totem', host: 'cms', name: 'TOTEM',
      what: { en: 'Measures protons that barely touch and fly on almost straight: elastic scattering and the size of the proton.', el: 'Μετράει πρωτόνια που μόλις «ακουμπούν» και συνεχίζουν σχεδόν ευθεία: ελαστική σκέδαση και το μέγεθος του πρωτονίου.' },
      facts: [[{ en: 'around CMS', el: 'γύρω από το CMS' }, 'P5'], [{ en: '“Roman pots” ≈220 m away', el: '«Roman pots» σε ≈220 m' }, '']] },
    { id: 'lhcf', host: 'atlas', name: 'LHCf',
      what: { en: 'Uses neutral particles thrown forward along the beam to recreate cosmic-ray showers in the lab.', el: 'Χρησιμοποιεί ουδέτερα σωματίδια που πετιούνται μπροστά κατά μήκος της δέσμης για να αναπαράγει καταιγισμούς κοσμικών ακτίνων.' },
      facts: [[{ en: '140 m either side of ATLAS', el: '140 m εκατέρωθεν του ATLAS' }, 'P1']] },
    { id: 'moedal', host: 'lhcb', name: 'MoEDAL-MAPP',
      what: { en: 'Searches for the magnetic monopole and other highly ionising particles; MAPP looks for very weakly interacting, long-lived ones.', el: 'Ψάχνει το μαγνητικό μονόπολο και άλλα έντονα ιονίζοντα σωματίδια· το MAPP ψάχνει πολύ ασθενώς αλληλεπιδρώντα, μακρόβια σωματίδια.' },
      facts: [[{ en: 'around LHCb’s collision point', el: 'γύρω από το σημείο σύγκρουσης του LHCb' }, 'P8'], [{ en: 'MAPP in a nearby gallery', el: 'MAPP σε κοντινή στοά' }, '']] },
    { id: 'faser', host: 'atlas', name: 'FASER',
      what: { en: 'Looks for light, extremely weakly interacting particles and studies high-energy neutrinos from the collisions.', el: 'Ψάχνει ελαφριά, εξαιρετικά ασθενώς αλληλεπιδρώντα σωματίδια και μελετά νετρίνα υψηλής ενέργειας από τις συγκρούσεις.' },
      facts: [[{ en: '480 m from ATLAS, tunnel TI12', el: '480 m από το ATLAS, σήραγγα TI12' }, ''], [{ en: 'on the collision axis', el: 'πάνω στον άξονα σύγκρουσης' }, '']] },
    { id: 'snd', host: 'atlas', name: 'SND@LHC',
      what: { en: 'Scattering and Neutrino Detector: studies high-energy neutrinos produced in LHC collisions.', el: 'Scattering and Neutrino Detector: μελετά νετρίνα υψηλής ενέργειας από τις συγκρούσεις του LHC.' },
      facts: [[{ en: '480 m from ATLAS, tunnel TI18', el: '480 m από το ATLAS, σήραγγα TI18' }, ''], [{ en: 'slightly off the axis', el: 'λίγο εκτός άξονα' }, '']] }
  ];
  const EXP = Object.fromEntries(EXPS.map(e => [e.id, e]));

  // ------------------------------------------------------------ state
  let ctx, W = 1, H = 1, FOC = 1, mobile = false;
  let started = false, playing = false;
  let mode = 'path';            // 'path' | 'overview' | 'focus'
  let s = 0, hold = 0;          // position along the path; pause at the source
  let v = 0, E = 0;
  let clock = 0;                // global animation time (only runs when playing)
  let ov = 0;                   // time since entering overview
  let ovDone = false, touring = false, tourIdx = 0;
  let focus = null;             // { ip, exp, t }
  let theta1 = 0, theta2 = 0, omega = 0;
  let event = null;
  let lastScene = '';
  const cam = { x: 0, y: 0, h: 10, p: 20 * DEG, hd: 0 };
  let tween = null;

  // ------------------------------------------------------------ camera & projection
  let cHd = 1, sHd = 0, cP = 1, sP = 0, NEAR = 1;
  function setCam() {
    cHd = Math.cos(cam.hd); sHd = Math.sin(cam.hd); cP = Math.cos(cam.p); sP = Math.sin(cam.p);
    NEAR = Math.max(.3, cam.h * .04);
  }
  const depthOf = (x, y) => { const f = (x - cam.x) * cHd + (y - cam.y) * sHd; return f * cP + cam.h * sP; };
  function prj(x, y) {
    const dx = x - cam.x, dy = y - cam.y;
    const f = dx * cHd + dy * sHd, r = -dx * sHd + dy * cHd;
    const depth = f * cP + cam.h * sP;
    if (depth < NEAR) return null;
    const vert = f * sP - cam.h * cP;
    return [W / 2 + r / depth * FOC, H / 2 - vert / depth * FOC, depth];
  }
  // draw a polyline in world coords, cutting it where it goes behind the camera
  function poly(pts) {
    ctx.beginPath();
    let pen = false;
    for (const [x, y] of pts) {
      const q = prj(x, y);
      if (!q) { pen = false; continue; }
      if (!pen) { ctx.moveTo(q[0], q[1]); pen = true; } else ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
  }
  function seg3(x1, y1, x2, y2) {
    let d1 = depthOf(x1, y1), d2 = depthOf(x2, y2);
    if (d1 < NEAR && d2 < NEAR) return;
    if (d1 < NEAR) { const t = (NEAR - d1) / (d2 - d1); x1 += (x2 - x1) * t; y1 += (y2 - y1) * t; }
    if (d2 < NEAR) { const t = (NEAR - d2) / (d1 - d2); x2 += (x1 - x2) * t; y2 += (y1 - y2) * t; }
    const a = prj(x1, y1), b = prj(x2, y2);
    if (!a || !b) return;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  const ringPts = (R, n, off = 0, a0 = 0, a1 = TAU) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const th = a0 + (a1 - a0) * i / n; pts.push([R.cx + (R.r + off) * Math.cos(th), R.cy + (R.r + off) * Math.sin(th)]); }
    return pts;
  };
  const niceStep = x => { const p = 10 ** Math.floor(Math.log10(x)), m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };

  function camTo(target, dur) { tween = { from: { ...cam }, to: target, t: 0, dur }; }
  function stepCamera(dt) {
    const k = 1 - Math.exp(-dt * 4);
    if (tween) {
      tween.t += dt;
      const u = ease(tween.t / tween.dur), a = tween.from, b = typeof tween.to === 'function' ? tween.to() : tween.to;
      cam.x = lerp(a.x, b.x, u); cam.y = lerp(a.y, b.y, u);
      cam.h = Math.exp(lerp(Math.log(a.h), Math.log(b.h), u));      // zoom in log space feels natural
      cam.p = lerp(a.p, b.p, u);
      cam.hd = a.hd + angDiff(a.hd, b.hd) * u;
      if (tween.t >= tween.dur) tween = null;
      return;
    }
    if (mode === 'path') {
      const g = segAt(s);
      const [px, py] = posAt(s);
      const hd = hdAt(s);
      cam.hd += angDiff(cam.hd, hd) * Math.min(1, dt * 5);
      const [B, Hh, P] = g.cam;
      cam.h += (Hh - cam.h) * k * 1.4;
      cam.p += (P * DEG - cam.p) * k;
      const back = B * (cam.h / Hh);
      cam.x = px - Math.cos(cam.hd) * back; cam.y = py - Math.sin(cam.hd) * back;
    } else if (mode === 'overview') {
      Object.assign(cam, overviewCam());
    } else if (mode === 'focus' && focus) {
      Object.assign(cam, focusCam(focus.ip));
    }
  }
  function overviewCam() {
    const half = Math.min(W, H) / 2 * .92;
    return { x: 0, y: 250, h: 4750 * FOC / half, p: 90 * DEG, hd: -90 * DEG };
  }
  function focusCam(ipKey) {
    const ip = IP[ipKey];
    const [x, y] = rp(LHC, ip.th);
    const t = tang(ip.th, 1);
    const landscape = W > H;
    const hd = landscape ? t - 90 * DEG : t;          // beam axis runs across the long side of the screen
    const half = (landscape ? W : H) / 2 * .9;
    const p = 72 * DEG;
    const h = ip.span * FOC / half * .95;
    const back = h / Math.tan(p);
    return { x: x - Math.cos(hd) * back, y: y - Math.sin(hd) * back, h, p, hd };
  }

  // ------------------------------------------------------------ energy / speed of the moment
  function pathEnergy() {
    const g = segAt(s);
    if (g.m === 'linac') return hold > 0 ? 45e3 : linacEnergy(s - g.s0);
    const u = clamp01((s - g.s0) / g.seg.len);
    return Math.exp(Math.log(g.E[0]) + (Math.log(g.E[1]) - Math.log(g.E[0])) * u);
  }
  const RAMP0 = 3.3, RAMP1 = 6.6, REVEAL = 6.8;
  function overviewEnergy() { const u = clamp01((ov - RAMP0) / (RAMP1 - RAMP0)); return Math.exp(Math.log(450e9) + (Math.log(6.8e12) - Math.log(450e9)) * (u * u * (3 - 2 * u))); }

  // ------------------------------------------------------------ drawing: ground, machines
  function drawBackdrop() {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, W, H);
    const hy = H / 2 - Math.tan(cam.p) * FOC;          // horizon
    if (cam.p < 80 * DEG && hy > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, hy + 40);
      g.addColorStop(0, '#0a1220'); g.addColorStop(1, '#101a2c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.min(H, hy + 40));
    }
  }

  function drawGrid() {
    const G = niceStep(cam.h * (cam.p > 1.3 ? .12 : .5));
    const range = cam.p > 1.3 ? cam.h * W / FOC * .8 : cam.h * 16;
    const cx0 = cam.x + Math.cos(cam.hd) * (cam.p < 1.5 ? cam.h / Math.tan(cam.p) : 0);
    const cy0 = cam.y + Math.sin(cam.hd) * (cam.p < 1.5 ? cam.h / Math.tan(cam.p) : 0);
    const x0 = Math.floor((cx0 - range) / G) * G, x1 = cx0 + range;
    const y0 = Math.floor((cy0 - range) / G) * G, y1 = cy0 + range;
    ctx.lineWidth = 1;
    const fogFar = cam.h * 22;
    for (let x = x0; x <= x1; x += G) {
      const d = depthOf(x, cy0);
      ctx.strokeStyle = `rgba(120,150,200,${(mode === "path" ? .11 : .075) * (1 - clamp01(d / fogFar)) * (Math.round(x / G) % 5 === 0 ? 1.8 : 1)})`;
      seg3(x, y0, x, y1);
    }
    for (let y = y0; y <= y1; y += G) {
      const d = depthOf(cx0, y);
      ctx.strokeStyle = `rgba(120,150,200,${(mode === "path" ? .11 : .075) * (1 - clamp01(d / fogFar)) * (Math.round(y / G) % 5 === 0 ? 1.8 : 1)})`;
      seg3(x0, y, x1, y);
    }
    return G;
  }

  const RING_CACHE = {
    psb: ringPts(PSB, 90), ps: ringPts(PS, 180), sps: ringPts(SPS, 360), lhc: ringPts(LHC, 900)
  };
  function curMachine() {
    if (mode !== 'path') return 'lhc';
    return segAt(s).m;
  }

  function drawMachines() {
    const act = curMachine();
    const line = (pts, color, w, a) => { ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.lineWidth = w; poly(pts); ctx.globalAlpha = 1; };
    const on = m => m === act;

    // transfer lines
    const xferCol = '#7b869e';
    line(sBT.pts, xferCol, 1.2, .7);
    line(sTT.pts, xferCol, 1.2, .7);
    line(sTI2.pts, xferCol, 1.4, .8);
    line(TI8.pts, xferCol, 1.4, .8);

    // Linac4 with its sections
    for (const [lbl, a, b, , col] of LINAC) {
      const p0 = sLinac.at(a), p1 = sLinac.at(b);
      ctx.strokeStyle = on('linac') ? col : MACHINE.linac.color; ctx.globalAlpha = on('linac') ? .95 : .7;
      ctx.lineWidth = on('linac') && mode === 'path' ? Math.max(2, 3.2 * 9 / Math.max(9, cam.h)) : 1.6;
      seg3(p0[0], p0[1], p1[0], p1[1]);
      ctx.globalAlpha = 1;
    }
    // rings (PSB drawn doubled: four rings stacked on top of each other)
    line(RING_CACHE.psb, MACHINE.psb.color, on('psb') ? 2.4 : 1.4, on('psb') ? 1 : .6);
    line(RING_CACHE.ps, MACHINE.ps.color, on('ps') ? 2.4 : 1.4, on('ps') ? 1 : .6);
    line(RING_CACHE.sps, MACHINE.sps.color, on('sps') ? 2.4 : 1.5, on('sps') ? 1 : .65);
    // LHC: two beam pipes (separation hugely exaggerated so you can see both)
    if (mode !== 'focus') {                      // (the close-up view draws its own pipes)
      const sep = lhcSep();
      line(ringPts(LHC, 900, sep), B1, on('lhc') ? 1.8 : 1.3, on('lhc') ? .75 : .45);
      line(ringPts(LHC, 900, -sep), B2, on('lhc') ? 1.8 : 1.3, on('lhc') ? .75 : .45);
    }

    drawMagnets(act);
  }
  // visual separation of the two LHC beam pipes (real: 19.4 cm)
  const lhcSep = () => Math.max(1.2, cam.h * (cam.p > 1.3 ? (mobile ? .0022 : .0035) : .006));

  // magnets as ticks across the ring; they get "smeared" by motion blur when we fly past
  function drawMagnets(act) {
    if (mode !== 'path') return;
    const specs = { psb: [PSB, 32, 1.1], ps: [PS, 100, 1.8], sps: [SPS, 216, 11], lhc: [LHC, 368, 18] };
    const sp = specs[act];
    if (!sp) {
      if (act === 'linac') drawLinacCells();
      return;
    }
    const [R, n, len] = sp;
    if (cam.h > R.r * 6) return;
    const col = MACHINE[act].color;
    const blur = v * .02;                        // metres travelled during the "exposure"
    const dth = blur / R.r;
    for (let i = 0; i < n; i++) {
      const th = i / n * TAU;
      const [mx, my] = rp(R, th);
      const d = depthOf(mx, my);
      if (d < NEAR || d > cam.h * 30) continue;
      const fade = 1 - clamp01(d / (cam.h * 30));
      const nx = Math.cos(th), ny = Math.sin(th);
      // the magnet body (a short block across the pipe), smeared along the ring
      ctx.fillStyle = col;
      ctx.globalAlpha = .55 * fade;
      const a = prj(mx - nx * len / 2, my - ny * len / 2), b = prj(mx + nx * len / 2, my + ny * len / 2);
      const [ex, ey] = rp(R, th - dth);
      const c = prj(ex + nx * len / 2, ey + ny * len / 2), e = prj(ex - nx * len / 2, ey - ny * len / 2);
      if (a && b && c && e) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  // Linac4: accelerating cells — they get longer as the ions speed up (like the real drift tubes)
  function drawLinacCells() {
    let d = 11;
    ctx.strokeStyle = '#e0a27a';
    ctx.lineWidth = 1.3;
    while (d < 78) {
      const beta = betaOf(linacEnergy(d));
      const [x, y] = sLinac.at(d);
      const dist = depthOf(x, y);
      if (dist > NEAR) {
        ctx.globalAlpha = .75 * (1 - clamp01(dist / 160));
        seg3(x, y - 1.1, x, y + 1.1);
      }
      d += .6 + beta * 3.4;
    }
    ctx.globalAlpha = 1;
  }

  // world-anchored labels
  function label(x, y, text, opt = {}) {
    const q = prj(x, y);
    if (!q) return;
    const [sx, sy] = q;
    if (sx < -100 || sx > W + 100 || sy < -40 || sy > H + 40) return;
    ctx.font = `${opt.w || 600} ${opt.size || 12}px ${opt.mono ? '"JetBrains Mono", monospace' : 'Inter, sans-serif'}`;
    ctx.textAlign = opt.align || 'center';
    ctx.fillStyle = opt.color || 'rgba(215,225,245,.85)';
    ctx.globalAlpha = opt.alpha ?? 1;
    ctx.fillText(text, sx + (opt.dx || 0), sy + (opt.dy || 0));
    ctx.globalAlpha = 1;
    return q;
  }

  function drawMachineLabels() {
    const act = curMachine();
    const vis = (size) => { const px = size * FOC / cam.h; return clamp01((px - 18) / 30); };
    const L = (x, y, t, m, size, extra = {}) => { const a = m === act ? 1 : .55 * vis(size); if (a > .02) label(x, y, t, { alpha: a, color: MACHINE[m].color, ...extra }); };
    L(57, 4560, 'LINAC4', 'linac', 60, { mono: true, size: 11 });
    L(100, 4640, 'PSB', 'psb', 60, { mono: true, size: 11 });
    L(250, 4625, 'PS', 'ps', 200, { mono: true, size: 11 });
    L(-250, 1780, 'SPS · 6.9 km', 'sps', 2000, { mono: true, size: 12 });
    if (!mobile || mode === 'path') L(rp(LHC, 335 * DEG)[0] + 900, rp(LHC, 335 * DEG)[1] - 250, 'LHC · 26.7 km', 'lhc', 8000, { mono: true, size: 13 });
    const tl = (seg, t) => { const [x, y] = seg.at(seg.len / 2); const px = seg.len * FOC / cam.h; if (px > 60) label(x, y, t, { mono: true, size: 10.5, color: '#9aa4bd', dy: -8, alpha: clamp01((px - 60) / 60) }); };
    tl(sTT, 'TT2 · TT10'); tl(sTI2, 'TI2'); tl(TI8, 'TI8');
    if (act === 'linac' && mode === 'path') {
      for (const [lbl, a, b] of LINAC) if (lbl) { const [x, y] = sLinac.at((a + b) / 2); label(x, y - 3.2, lbl, { mono: true, size: 11, color: '#e7c3a6' }); }
    }
  }

  // interaction points + the other LHC points
  function drawPoints(alphaIn = 1) {
    if (alphaIn <= 0) return;
    const R = LHC.r;
    for (const [deg, pt, what] of OTHER_P) {
      const [x, y] = rp(LHC, deg * DEG);
      const q = prj(x, y);
      if (!q) continue;
      ctx.globalAlpha = .7 * alphaIn;
      ctx.fillStyle = '#9aa4bd';
      ctx.beginPath(); ctx.arc(q[0], q[1], 2.5, 0, TAU); ctx.fill();
      const out = [Math.cos(deg * DEG), Math.sin(deg * DEG)];
      if (!mobile) label(x + out[0] * R * .07, y + out[1] * R * .07, `${pt} · ${T(what)}`, { size: 10.5, mono: true, color: '#8f9ab3', alpha: .8 * alphaIn });
    }
    for (const k in IP) {
      const ip = IP[k];
      const [x, y] = rp(LHC, ip.th);
      const q = prj(x, y);
      if (!q) continue;
      const on = focus && focus.ip === k;
      ctx.globalAlpha = alphaIn;
      ctx.strokeStyle = ip.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(q[0], q[1], on ? 9 : 6.5, 0, TAU); ctx.stroke();
      ctx.fillStyle = ip.col;
      ctx.beginPath(); ctx.arc(q[0], q[1], 2.6, 0, TAU); ctx.fill();
      // collisions happening: thin expanding circles (not an explosion)
      if (ovDone || mode === 'focus') {
        const ph = ((clock * 1.25 + ip.th) % 1);
        ctx.globalAlpha = (1 - ph) * .7 * alphaIn;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(q[0], q[1], 6 + ph * 16, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (mode !== 'focus') {
        const out = [Math.cos(ip.th), Math.sin(ip.th)];
        const lx = x + out[0] * R * .1, ly = y + out[1] * R * .1;
        label(lx, ly, ip.name, { size: 13, w: 800, color: ip.col, alpha: alphaIn });
        label(lx, ly, ip.pt, { size: 10, mono: true, color: '#8f9ab3', dy: 14, alpha: alphaIn });
      }
    }
  }

  // ------------------------------------------------------------ beams
  // a bunch with a motion-blur trail along the path (world metres)
  function trailAlong(fnPos, sHead, len, color, headR = 2.6, width = 3) {
    const N = 26;
    let prev = null;
    ctx.lineCap = 'round';
    for (let i = 0; i <= N; i++) {
      const ss = sHead - len * (1 - i / N);
      const [x, y] = fnPos(ss);
      const q = prj(x, y);
      if (q && prev) {
        const f = i / N;
        ctx.strokeStyle = color;
        ctx.globalAlpha = f * f * .95;
        ctx.lineWidth = .6 + width * f;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      prev = q;
    }
    ctx.globalAlpha = 1;
    const [hx, hy] = fnPos(sHead);
    const q = prj(hx, hy);
    if (q) {
      ctx.fillStyle = '#f2f6ff';
      ctx.beginPath(); ctx.arc(q[0], q[1], headR, 0, TAU); ctx.fill();
    }
    return q;
  }

  // position on an LHC pipe at angle th (beam 1 outer, beam 2 inner)
  const lhcPos = (th, off) => [(LHC.r + off) * Math.cos(th), (LHC.r + off) * Math.sin(th)];

  function drawPathBeam() {
    const g = segAt(s);
    const trail = Math.max(2.5, v * (g.m === 'lhc' ? .32 : .26));
    const color = g.m === 'linac' ? '#b9c9ff' : B1;
    const q = trailAlong(posAt, s, trail, color, g.m === 'linac' ? 2.6 : 2.8, g.m === 'lhc' ? 3.6 : 3);
    // particle name tag
    if (q) {
      const tag = g.m === 'linac' ? 'H⁻' : 'p⁺';
      ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#e6ecfa';
      ctx.fillText(tag, q[0] + 9, q[1] - 8);
    }
    // in the LHC: the rest of Beam 1 flies with us, Beam 2 comes the other way
    if (g.m === 'lhc') {
      const sep = lhcSep();
      const th = 128 * DEG + (s - g.s0) / LHC.r;
      for (let i = -8; i <= 14; i++) {
        if (i === 0) continue;
        const thi = th + i * 1100 / LHC.r;
        trailAlong(ss => lhcPos(thi + (ss / LHC.r), sep), 0, trail * .9, B1, 1.8, 2.2);
      }
      const th2 = -clock * v / LHC.r;
      for (let i = 0; i < 26; i++) {
        const thi = th2 + i * 1000 / LHC.r;
        trailAlong(ss => lhcPos(thi - ss / LHC.r, -sep), 0, trail * 1.1, B2, 1.8, 2.2);
      }
    }
    // at the Booster injection the H⁻ loses its two electrons on a thin foil
    if (g.m === 'psb' && s - g.s0 < 60) {
      label(LIN1[0], LIN1[1] - 5, T({ en: 'stripping foil: H⁻ → p⁺', el: 'φύλλο αποκόλλησης: H⁻ → p⁺' }), { size: 11.5, color: '#e6ecfa', alpha: 1 - (s - g.s0) / 60 });
    }
  }

  // overview: both beams circulating as bunch trains, with an abort gap
  function drawOverviewBeams(beam2On) {
    const sep = lhcSep();
    const trainLen = 7 * DEG;
    const trailTh = omega * .3;
    const trains = 11;
    for (let k = 0; k < trains; k++) {
      const a1 = theta1 + k * (TAU - 30 * DEG) / trains;
      trailAlong(ss => lhcPos(a1 + ss, sep), 0, trailTh + trainLen, B1, 2.2, 3);
      if (beam2On) {
        const a2 = theta2 - k * (TAU - 30 * DEG) / trains;
        trailAlong(ss => lhcPos(a2 - ss, -sep), 0, trailTh + trainLen, B2, 2.2, 3);
      }
    }
    // direction labels
    const top = rp(LHC, 245 * DEG), top2 = rp(LHC, 290 * DEG);
    if (mobile) { label(0, -LHC.r * .45, T({ en: 'Beam 1 ⟳ clockwise', el: 'Δέσμη 1 ⟳ δεξιόστροφα' }), { size: 11.5, color: B1, w: 700 }); if (beam2On) label(0, -LHC.r * .3, T({ en: 'Beam 2 ⟲ anticlockwise', el: 'Δέσμη 2 ⟲ αριστερόστροφα' }), { size: 11.5, color: B2, w: 700 }); return; }
    label(top[0] - 300, top[1] - 380, T({ en: 'Beam 1  ⟳ clockwise', el: 'Δέσμη 1  ⟳ δεξιόστροφα' }), { size: 12, color: B1, w: 700 });
    if (beam2On) label(top2[0] - 250, top2[1] + 700, T({ en: 'Beam 2  ⟲ anticlockwise', el: 'Δέσμη 2  ⟲ αριστερόστροφα' }), { size: 12, color: B2, w: 700 });
  }

  // ------------------------------------------------------------ focus views (an interaction point up close)
  function ipFrame(key) {
    const ip = IP[key];
    const [x, y] = rp(LHC, ip.th);
    const t = tang(ip.th, 1);
    return { x, y, tx: Math.cos(t), ty: Math.sin(t), nx: Math.cos(ip.th), ny: Math.sin(ip.th), th: ip.th };
  }
  // point on beam pipe `b` (1 or 2) at distance d from the IP (along the ring)
  function pipeAt(key, d, b) {
    const ip = IP[key];
    const th = ip.th + d / LHC.r;
    const sepMax = 3.2;
    const sep = sepMax * clamp01((Math.abs(d) - 60) / 90);   // common pipe near the IP, separate after ~140 m
    const off = b === 1 ? sep : -sep;
    return [(LHC.r + off) * Math.cos(th), (LHC.r + off) * Math.sin(th)];
  }

  function drawFocus(t) {
    const key = focus.ip, ip = IP[key], F = ipFrame(key);
    const span = ip.span * 1.25;
    // beam pipes
    for (const b of [1, 2]) {
      const pts = [];
      for (let d = -span; d <= span; d += span / 90) pts.push(pipeAt(key, d, b));
      ctx.strokeStyle = b === 1 ? B1 : B2; ctx.globalAlpha = .7; ctx.lineWidth = 1.6; poly(pts); ctx.globalAlpha = 1;
    }
    // experiment cavern footprint, to scale
    const [Lm, Wm] = ip.foot;
    const along = ip.oneSide ? [-1, Lm - 1] : [-Lm / 2, Lm / 2];
    const corner = (a, c) => [F.x + F.tx * a + F.nx * c, F.y + F.ty * a + F.ny * c];
    const cs = [corner(along[0], -Wm / 2), corner(along[1], -Wm / 2), corner(along[1], Wm / 2), corner(along[0], Wm / 2)];
    const qs = cs.map(c => prj(c[0], c[1]));
    if (qs.every(Boolean)) {
      ctx.fillStyle = ip.col; ctx.globalAlpha = .18;
      ctx.beginPath(); qs.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = .9; ctx.strokeStyle = ip.col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
    label(F.x - F.nx * (Wm / 2 + ip.span * .08), F.y - F.ny * (Wm / 2 + ip.span * .08), `${ip.name} · ${ip.foot[0]} m`, { size: 13, w: 800, color: ip.col });
    // scale reference: 100 m along the beam
    // (the scale bar in the corner is always there too)

    // the collision: bunches from both sides meet at the IP
    const TC = 1.3;
    if (t < TC + .05) {
      const u = clamp01(t / TC);
      const d = (1 - u * u) * span;
      trailAlong(dd => pipeAt(key, dd, 1), -d, Math.min(span * .6, 40 + u * span * .6), B1, 2.6, 3.2);
      trailAlong(dd => pipeAt(key, -dd, 2), -d, Math.min(span * .6, 40 + u * span * .6), B2, 2.6, 3.2);
    } else {
      // the vertex: a precise point, with a thin ring
      const q = prj(F.x, F.y);
      if (q) {
        const a = Math.max(0, 1 - (t - TC) / 1.4);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.moveTo(q[0] - 7, q[1]); ctx.lineTo(q[0] + 7, q[1]); ctx.moveTo(q[0], q[1] - 7); ctx.lineTo(q[0], q[1] + 7); ctx.stroke();
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], 6 + (t - TC) * 30, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // a few particles leave the vertex (short, straight here: the detector view comes next)
    }
    // the smaller experiments that live around this point
    drawSmallExps(key, t - TC, F);
  }

  function drawSmallExps(key, tc, F) {
    const hi = id => focus && focus.exp === id;
    const box = (a, c, la, lc, col, name, sub) => {
      const pts = [[a - la / 2, c - lc / 2], [a + la / 2, c - lc / 2], [a + la / 2, c + lc / 2], [a - la / 2, c + lc / 2]]
        .map(([aa, cc]) => prj(F.x + F.tx * aa + F.nx * cc, F.y + F.ty * aa + F.ny * cc));
      if (!pts.every(Boolean)) return;
      ctx.fillStyle = col; ctx.globalAlpha = hi(name.id) ? .95 : .7;
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (hi(name.id)) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      label(F.x + F.tx * a + F.nx * (c - lc / 2 - 12), F.y + F.ty * a + F.ny * (c - lc / 2 - 12), name.label, { size: 12, w: 800, color: col });
      if (sub) label(F.x + F.tx * a + F.nx * (c - lc / 2 - 12), F.y + F.ty * a + F.ny * (c - lc / 2 - 12), sub, { size: 10, mono: true, color: '#9aa4bd', dy: 13 });
    };
    // travelling particles from the vertex
    const flyer = (dist, lateral, col, dash, spd) => {
      if (tc < 0) return 0;
      const d = Math.min(dist, tc * spd);
      const q0 = prj(F.x + F.tx * Math.max(0, d - 60) * Math.sign(dist) + F.nx * lateral, F.y + F.ty * Math.max(0, d - 60) * Math.sign(dist) + F.ny * lateral);
      const x = F.x + F.tx * d * Math.sign(dist) + F.nx * lateral, y = F.y + F.ty * d * Math.sign(dist) + F.ny * lateral;
      const q1 = prj(x, y);
      if (q0 && q1) {
        ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.setLineDash(dash); ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      return d;
    };
    const flyerAbs = (dSigned, lateral, col, dash, spd) => {
      if (tc < 0) return;
      const dist = Math.abs(dSigned), sg = Math.sign(dSigned);
      const d = Math.min(dist, tc * spd);
      const a = prj(F.x + F.tx * sg * Math.max(0, d - 70) + F.nx * lateral * Math.max(0, d - 70) / dist, F.y + F.ty * sg * Math.max(0, d - 70) + F.ny * lateral * Math.max(0, d - 70) / dist);
      const b = prj(F.x + F.tx * sg * d + F.nx * lateral * d / dist, F.y + F.ty * sg * d + F.ny * lateral * d / dist);
      if (a && b) { ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]); }
    };

    if (key === 'atlas') {
      // the collision axis continues straight; the ring curves away from it
      ctx.strokeStyle = 'rgba(210,220,240,.35)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
      seg3(F.x - F.tx * 620, F.y - F.ty * 620, F.x + F.tx * 620, F.y + F.ty * 620); ctx.setLineDash([]);
      label(F.x + F.tx * 330, F.y + F.ty * 330, T({ en: 'collision axis (straight line)', el: 'άξονας σύγκρουσης (ευθεία)' }), { size: 10.5, mono: true, color: '#b7c1d8', dy: -10 });
      // service tunnels TI12 and TI18 (old LEP injection tunnels)
      ctx.strokeStyle = 'rgba(150,160,180,.55)'; ctx.lineWidth = 5;
      seg3(F.x + F.tx * 440 - F.nx * 60, F.y + F.ty * 440 - F.ny * 60, F.x + F.tx * 520 + F.nx * 40, F.y + F.ty * 520 + F.ny * 40);
      seg3(F.x - F.tx * 440 - F.nx * 60, F.y - F.ty * 440 - F.ny * 60, F.x - F.tx * 520 + F.nx * 40, F.y - F.ty * 520 + F.ny * 40);
      label(F.x + F.tx * 520 + F.nx * 60, F.y + F.ty * 520 + F.ny * 60, 'TI12', { size: 10, mono: true, color: '#9aa4bd' });
      label(F.x - F.tx * 520 + F.nx * 60, F.y - F.ty * 520 + F.ny * 60, 'TI18', { size: 10, mono: true, color: '#9aa4bd' });
      // neutral particles + neutrinos fly straight along the axis
      for (const sg of [1, -1]) {
        flyer(sg * 140, 0, '#e8edf7', [3, 4], 480);
        if (tc * 480 > 140) flyer(sg * 480, sg < 0 ? 5 : 0, '#c3a6ff', [2, 5], 480);
      }
      box(140, 0, 8, 6, '#f0c05a', { id: 'lhcf', label: 'LHCf' }, '140 m');
      box(-140, 0, 8, 6, '#f0c05a', { id: 'lhcf', label: 'LHCf' }, '140 m');
      box(480, 0, 12, 7, '#b08cff', { id: 'faser', label: 'FASER' }, '480 m · TI12');
      box(-480, 5, 12, 7, '#9fd36a', { id: 'snd', label: 'SND@LHC' }, '480 m · TI18');
      if (tc > .4) label(F.x + F.tx * 300, F.y + F.ty * 300, T({ en: 'neutral particles & neutrinos', el: 'ουδέτερα σωματίδια & νετρίνα' }), { size: 10.5, color: '#c9b3ff', dy: 16 });
    }
    if (key === 'cms') {
      // TOTEM "Roman pots" squeeze towards the beams ~220 m from the collision point
      for (const sg of [1, -1]) {
        for (const b of [1, 2]) {
          const [x, y] = pipeAt('cms', sg * 220, b);
          const q = prj(x, y);
          if (q) { ctx.fillStyle = '#f0c05a'; ctx.globalAlpha = hi('totem') ? 1 : .8; ctx.fillRect(q[0] - 4, q[1] - 4, 8, 8); ctx.globalAlpha = 1; }
        }
        const [x, y] = pipeAt('cms', sg * 220, 1);
        label(x + F.nx * 26, y + F.ny * 26, 'TOTEM', { size: 12, w: 800, color: '#f0c05a' });
        label(x + F.nx * 26, y + F.ny * 26, 'Roman pots · 220 m', { size: 10, mono: true, color: '#9aa4bd', dy: 13 });
        // elastically scattered protons stay (almost) inside the beam pipe
        if (tc > 0) {
          const dd = Math.min(220, tc * 260);
          trailAlong(z => pipeAt('cms', sg * z, sg > 0 ? 1 : 2).map((c, i) => c + (i ? F.ny : F.nx) * z * .004 * sg), dd, 60, '#f3e3b0', 1.8, 1.6);
        }
      }
    }
    if (key === 'lhcb') {
      // MoEDAL detectors sit around LHCb's collision point; MAPP in a gallery ~100 m away
      const q = prj(F.x, F.y);
      if (q) {
        ctx.strokeStyle = '#d58cff'; ctx.lineWidth = 3; ctx.globalAlpha = hi('moedal') ? 1 : .8;
        const r = 5 * FOC / cam.h;
        ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(8, r * 2.2), -2.3, -.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(8, r * 2.2), .8, 2.3); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      label(F.x + F.nx * 22, F.y + F.ny * 22, 'MoEDAL', { size: 12, w: 800, color: '#d58cff' });
      box(-100, -30, 10, 8, '#d58cff', { id: 'moedal', label: 'MAPP' }, T({ en: 'gallery ≈100 m', el: 'στοά ≈100 m' }));
      if (tc > 0) {
        flyerAbs(18, 22, '#d58cff', [2, 3], 12);
        if (tc > .6) label(F.x + F.tx * 18 + F.nx * 30, F.y + F.ty * 18 + F.ny * 30, T({ en: 'hypothetical monopole', el: 'υποθετικό μονόπολο' }), { size: 10, color: '#d8b6ff' });
      }
    }
  }

  // ------------------------------------------------------------ event displays (simplified, simulated)
  function makeEvent(id) {
    const tracks = [];
    const R = () => Math.random();
    if (id === 'atlas') {
      for (let i = 0; i < 22; i++) tracks.push({ a: R() * TAU, k: (R() < .5 ? -1 : 1) * rand(1.5, 7), r: .34, col: '#f5b041', w: 1.2 });
      const a = R() * TAU;
      return { id, tracks, photons: [a, a + Math.PI + rand(-.35, .35)], towers: Array.from({ length: 10 }, () => [R() * TAU, rand(.03, .1)]) };
    }
    if (id === 'cms') {
      for (let i = 0; i < 26; i++) tracks.push({ a: R() * TAU, k: (R() < .5 ? -1 : 1) * rand(1.5, 7), r: .31, col: '#9be07a', w: 1.1 });
      const base = R() * TAU;
      const muons = [0, 1.4, 3.3, 4.6].map(o => ({ a: base + o + rand(-.3, .3), k: (R() < .5 ? -1 : 1) * rand(.5, 1.1) }));
      return { id, tracks, muons, deps: Array.from({ length: 8 }, () => [R() * TAU, rand(.02, .06)]) };
    }
    if (id === 'alice') {
      const n = mobile ? 380 : 620;
      for (let i = 0; i < n; i++) {
        const k = (R() < .5 ? -1 : 1) * (R() < .7 ? rand(.6, 3) : rand(3, 9));
        tracks.push({ a: R() * TAU, k, r: R() < .75 ? .62 : .77, col: k > 0 ? '#f2b35b' : '#6fb6ff', w: .7 });
      }
      return { id, tracks };
    }
    if (id === 'lhcb') {
      const list = [];
      // B meson decay products from a displaced vertex (flies ~1 cm before decaying)
      const types = [['mu', 1], ['mu', -1], ['K', 1], ['pi', -1]];
      types.forEach(([ty, q]) => list.push({ ty, q, ang: rand(-.18, .18), p: rand(.6, 1.6), sv: true }));
      for (let i = 0; i < 12; i++) list.push({ ty: R() < .25 ? 'g' : 'pi', q: R() < .5 ? -1 : 1, ang: rand(-.3, .3), p: rand(.15, 1), sv: false });
      return { id, list };
    }
    return null;
  }

  // follow a charged particle outwards; kOut = curvature outside the solenoid (return field)
  function trackPts(a, k, rStop, grow, kOut = null, rMag = 1) {
    const pts = [[0, 0]];
    let x = 0, y = 0, ang = a;
    const ds = .006;
    const maxL = 2.2 * grow;
    for (let l = 0; l < maxL; l += ds) {
      const r = Math.hypot(x, y);
      if (r >= rStop) break;
      ang += (r < rMag ? k : (kOut ?? 0)) * ds;
      x += Math.cos(ang) * ds; y += Math.sin(ang) * ds;
      pts.push([x, y]);
    }
    return pts;
  }

  function drawDisplay(t) {
    // backdrop over the 3D view
    const a = clamp01(t / .4);
    ctx.fillStyle = `rgba(5,8,15,${.9 * a})`;
    ctx.fillRect(0, 0, W, H);
    if (a < .05 || !event) return;
    ctx.globalAlpha = a;
    const cardW = mobile ? 0 : Math.min(360, W * .3);
    const cx = mobile ? W / 2 : (W - cardW) / 2, cy = mobile ? H * .38 : H / 2;
    const Rd = mobile ? Math.min(W * .44, H * .3) : Math.min((W - cardW) * .42, H * .42);
    const grow = clamp01((t - .35) / .9);
    const P = (x, y) => [cx + x * Rd, cy + y * Rd];
    const ring = (r0, r1, col, al, sides = 0, segs = 0) => {
      ctx.strokeStyle = col; ctx.globalAlpha = al * a; ctx.lineWidth = Math.max(1, (r1 - r0) * Rd);
      ctx.beginPath();
      if (sides) { const rr = (r0 + r1) / 2 * Rd / Math.cos(Math.PI / sides); for (let i = 0; i <= sides; i++) { const an = i / sides * TAU + Math.PI / sides; const x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } }
      else ctx.arc(cx, cy, (r0 + r1) / 2 * Rd, 0, TAU);
      ctx.stroke();
      if (segs) {
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1;
        for (let i = 0; i < segs; i++) { const an = i / segs * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r0 * Rd, cy + Math.sin(an) * r0 * Rd); ctx.lineTo(cx + Math.cos(an) * r1 * Rd, cy + Math.sin(an) * r1 * Rd); ctx.stroke(); }
      }
      ctx.globalAlpha = a;
    };
    const tower = (an, r0, len, col, width = .07) => {
      ctx.fillStyle = col; ctx.globalAlpha = .9 * a;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 * Rd, an - width / 2, an + width / 2);
      ctx.arc(cx, cy, (r0 + len * grow) * Rd, an + width / 2, an - width / 2, true);
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = a;
    };
    const drawTrack = (pts, col, w, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
      ctx.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke();
      ctx.setLineDash([]);
    };
    const caption = (title, sub, legend) => {
      ctx.textAlign = mobile ? 'center' : 'left';
      const x = mobile ? W / 2 : 22;
      const y = mobile ? cy + Rd + 26 : H - 58;
      ctx.fillStyle = '#e8eefc'; ctx.font = '700 13px Inter, sans-serif'; ctx.fillText(title, x, y);
      ctx.fillStyle = '#8f9ab3'; ctx.font = '11.5px Inter, sans-serif'; ctx.fillText(sub, x, y + 16);
      let lx = mobile ? W / 2 - legend.length * 45 : 22;
      ctx.textAlign = 'left'; ctx.font = '11px Inter, sans-serif';
      legend.forEach(([col, name, dash]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(lx, y + 34); ctx.lineTo(lx + 16, y + 34); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#b7c1d8'; ctx.fillText(name, lx + 21, y + 38);
        lx += 32 + ctx.measureText(name).width;
      });
    };
    const layerName = (r, name, an = -.62) => {
      if (mobile) return;
      const x = cx + Math.cos(an) * r * Rd, y = cy + Math.sin(an) * r * Rd;
      ctx.fillStyle = 'rgba(200,210,230,.6)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(name, x + 4, y);
    };

    const ev = event;
    if (ev.id === 'atlas') {
      // end view: inner detector, solenoid, LAr EM calorimeter, tile calorimeter, toroids + muon chambers
      [.05, .08, .12, .16, .2, .25, .3].forEach(r => ring(r, r + .004, '#7d879c', .5));
      ring(.345, .355, '#b9c0cc', .7);
      ring(.37, .5, '#2f8f5b', .45, 0, 64);
      ring(.52, .72, '#8c3b3b', .45, 0, 64);
      for (let i = 0; i < 8; i++) {                          // 8 barrel toroid coils
        const an = i / 8 * TAU + Math.PI / 8;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(an);
        ctx.strokeStyle = 'rgba(214,196,150,.55)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(.75 * Rd, -.025 * Rd, .23 * Rd, .05 * Rd);
        ctx.restore();
      }
      [.79, .87, .96].forEach(r => { for (let i = 0; i < 16; i++) { const an = i / 16 * TAU; ctx.save(); ctx.translate(cx, cy); ctx.rotate(an); ctx.fillStyle = 'rgba(90,140,220,.35)'; ctx.fillRect(r * Rd, -.07 * Rd, .025 * Rd, .14 * Rd); ctx.restore(); } });
      layerName(.2, T({ en: 'inner detector', el: 'εσωτερικός ανιχνευτής' })); layerName(.44, 'LAr'); layerName(.62, 'Tile'); layerName(.9, T({ en: 'muon chambers', el: 'θάλαμοι μιονίων' }));
      ev.tracks.forEach(tr => drawTrack(trackPts(tr.a, tr.k, tr.r, grow), tr.col, tr.w));
      ev.towers.forEach(([an, l]) => tower(an, .52, l, '#d8a24a', .06));
      ev.photons.forEach(an => { drawTrack([[0, 0], [Math.cos(an) * .37 * grow, Math.sin(an) * .37 * grow]], '#ffe27a', 1.4, [4, 4]); tower(an, .37, .13, '#ffd84a', .09); });
      caption(T({ en: 'ATLAS · simulated, simplified event', el: 'ATLAS · προσομοιωμένο, απλοποιημένο γεγονός' }),
        T({ en: 'Two photons (γγ) in the calorimeter, one of the channels in which the Higgs boson was discovered', el: 'Δύο φωτόνια (γγ) στο καλορίμετρο, ένα από τα κανάλια στα οποία ανακαλύφθηκε το μποζόνιο Higgs' }),
        [['#f5b041', T({ en: 'charged tracks', el: 'φορτισμένες τροχιές' })], ['#ffe27a', T({ en: 'photons', el: 'φωτόνια' }), [4, 4]]]);
    }
    if (ev.id === 'cms') {
      [.05, .09, .13, .18, .23, .28].forEach(r => ring(r, r + .004, '#7d879c', .5));
      ring(.31, .39, '#2f8f5b', .5, 0, 90);                  // PbWO₄ crystal ECAL
      ring(.41, .56, '#3b5a9a', .45, 0, 72);                 // HCAL
      ring(.58, .62, '#aeb6c6', .6);                         // solenoid
      [[.65, .7], [.76, .81], [.87, .92]].forEach(([r0, r1]) => ring(r0, r1, '#7a2330', .8, 12));
      [[.71, .75], [.82, .86], [.93, .97]].forEach(([r0, r1]) => ring(r0, r1, '#d9dde6', .18, 12));
      layerName(.16, T({ en: 'silicon tracker', el: 'πυρίτιο' })); layerName(.35, 'ECAL'); layerName(.49, 'HCAL'); layerName(.6, T({ en: 'solenoid 3.8 T', el: 'σωληνοειδές 3,8 T' })); layerName(.84, T({ en: 'iron + muon chambers', el: 'σίδηρος + θάλαμοι μιονίων' }));
      ev.tracks.forEach(tr => drawTrack(trackPts(tr.a, tr.k, tr.r, grow), tr.col, tr.w));
      ev.deps.forEach(([an, l]) => tower(an, .31, l, '#ff7b6b', .05));
      ev.muons.forEach(m => {
        const pts = trackPts(m.a, m.k, .99, grow * 1.1, -m.k * .45, .6);   // bends the other way in the iron
        drawTrack(pts, '#ff4a4a', 2.2);
        if (grow > .9) [.73, .84, .95].forEach(r => { const p = pts.find(([x, y]) => Math.hypot(x, y) >= r); if (p) { const [X, Y] = P(p[0], p[1]); ctx.fillStyle = '#ffd0d0'; ctx.fillRect(X - 3, Y - 3, 6, 6); } });
      });
      caption(T({ en: 'CMS · simulated, simplified event', el: 'CMS · προσομοιωμένο, απλοποιημένο γεγονός' }),
        T({ en: 'Four muons (like H → ZZ → 4μ): only muons reach the outer chambers; they bend the other way in the iron', el: 'Τέσσερα μιόνια (όπως H → ZZ → 4μ): μόνο τα μιόνια φτάνουν στους εξωτερικούς θαλάμους· στρίβουν ανάποδα στον σίδηρο' }),
        [['#9be07a', T({ en: 'charged tracks', el: 'φορτισμένες τροχιές' })], ['#ff4a4a', T({ en: 'muons', el: 'μιόνια' })]]);
    }
    if (ev.id === 'alice') {
      if (t < 1.1) {
        // two lead nuclei, flattened into discs by relativity, about to collide (side view)
        const u = clamp01(t / 1.0);
        const off = (1 - u) * Rd * 1.1;
        ctx.fillStyle = '#b8c6e8';
        [[-1, B1], [1, B2]].forEach(([sg, col]) => {
          ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(cx + sg * off, cy, 2.5, Rd * .09, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = col; ctx.globalAlpha = .6 * a;
          ctx.beginPath(); ctx.moveTo(cx + sg * off, cy); ctx.lineTo(cx + sg * (off + Rd * .9), cy); ctx.stroke();
        });
        ctx.globalAlpha = a;
        ctx.fillStyle = '#8f9ab3'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(T({ en: 'Pb nuclei, flattened ~2 900× by relativity', el: 'πυρήνες Pb, «πλακωμένοι» ~2.900× από τη σχετικότητα' }), cx, cy + Rd * .2);
      } else {
        const g2 = clamp01((t - 1.1) / .9);
        [.02, .04, .06].forEach(r => ring(r, r + .004, '#7d879c', .5));
        ring(.1, .104, '#9fb0cc', .6); ring(.6, .604, '#9fb0cc', .6);  // TPC field cage
        ctx.fillStyle = 'rgba(120,150,210,.05)'; ctx.beginPath(); ctx.arc(cx, cy, .6 * Rd, 0, TAU); ctx.fill();
        ring(.63, .7, '#4b5b7c', .5, 18);
        ring(.72, .76, '#6c7a96', .5, 18);
        ring(.9, .97, '#9b2c2c', .45, 8);                    // the red L3 magnet
        layerName(.35, 'TPC'); layerName(.66, 'TRD'); layerName(.74, 'TOF'); layerName(.92, T({ en: 'L3 magnet', el: 'μαγνήτης L3' }));
        ev.tracks.forEach(tr => drawTrack(trackPts(tr.a, tr.k, tr.r, g2), tr.col, tr.w));
      }
      caption(T({ en: 'ALICE · simulated, simplified lead–lead collision', el: 'ALICE · προσομοιωμένη, απλοποιημένη σύγκρουση μολύβδου–μολύβδου' }),
        T({ en: 'Thousands of particles from a tiny drop of quark–gluon plasma (only some are drawn)', el: 'Χιλιάδες σωματίδια από μια μικροσκοπική σταγόνα πλάσματος κουάρκ–γλουονίων (σχεδιάζονται μόνο μερικά)' }),
        [['#f2b35b', '+'], ['#6fb6ff', '−']]);
    }
    if (ev.id === 'lhcb') {
      // top view (x–z): a single-arm forward spectrometer, 20 m long
      const zL = mobile ? W * .06 : 40, zR = mobile ? W * .94 : W - cardW - 30;
      const Z = z => zL + (z + .5) / 20.5 * (zR - zL);
      const sc = (zR - zL) / 20.5;
      const X = x => cy + x * sc;
      const blocks = [['VELO', -.3, .7, .15, '#9fb0cc'], ['RICH1', 1, 2.2, .6, '#6c7a96'], ['UT', 2.3, 2.7, .7, '#9fb0cc'],
        [T({ en: 'magnet', el: 'μαγνήτης' }), 3.2, 7.4, 2.2, '#4b5b7c'], ['SciFi', 7.7, 9.4, 3, '#9fb0cc'], ['RICH2', 9.5, 11.8, 3.5, '#6c7a96'],
        ['ECAL', 12.2, 12.9, 3.9, '#2f8f5b'], ['HCAL', 13.2, 14.6, 4.3, '#8c3b3b'], ['M2–M5', 15.2, 19.2, 5.8, '#5a6ea8']];
      ctx.strokeStyle = 'rgba(200,210,230,.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W - cardW, cy); ctx.stroke();                 // beam line
      blocks.forEach(([n, z0, z1, hw, col]) => {
        ctx.fillStyle = col; ctx.globalAlpha = .28 * a;
        ctx.fillRect(Z(z0), X(-hw), Z(z1) - Z(z0), X(hw) - X(-hw));
        ctx.globalAlpha = .7 * a; ctx.strokeStyle = col; ctx.strokeRect(Z(z0), X(-hw), Z(z1) - Z(z0), X(hw) - X(-hw));
        ctx.globalAlpha = a;
        if (!mobile || n !== 'UT') { ctx.fillStyle = 'rgba(200,210,230,.7)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(n, (Z(z0) + Z(z1)) / 2, X(-hw) - 6); }
      });
      // tracks: straight, bend inside the magnet, straight again
      ev.list.forEach(tr => {
        const stop = tr.ty === 'mu' ? 19.2 : tr.ty === 'g' ? 12.6 : 13.9;
        const zmax = -.5 + (stop + .5) * grow;
        const col = tr.ty === 'mu' ? '#ff4a4a' : tr.ty === 'g' ? '#ffe27a' : tr.ty === 'K' ? '#f5b041' : '#e6c27a';
        let z = tr.sv ? .01 : 0, x = 0, ang = tr.ang;
        const pts = [[z, x]];
        while (z < zmax) {
          const dz = .05;
          if (tr.ty !== 'g' && z > 3.2 && z < 7.4) ang += tr.q * .012 / tr.p;
          z += dz; x += Math.tan(ang) * dz;
          if (Math.abs(x) > 6) break;
          pts.push([z, x]);
        }
        ctx.strokeStyle = col; ctx.lineWidth = tr.sv ? 1.8 : 1; ctx.setLineDash(tr.ty === 'g' ? [4, 4] : []);
        ctx.beginPath(); pts.forEach(([zz, xx], i) => i ? ctx.lineTo(Z(zz), X(xx)) : ctx.moveTo(Z(zz), X(xx))); ctx.stroke();
        ctx.setLineDash([]);
      });
      // magnified view of the collision point: the B travels ~1 cm before decaying
      const ix = Z(0), iy = cy;
      const mr = mobile ? 34 : 46;
      const mx = ix + (mobile ? 50 : 90), my = cy + (mobile ? 70 : 110);
      ctx.strokeStyle = 'rgba(200,210,230,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(mx - mr * .7, my - mr * .7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx - mr * .5, my, 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb3b3'; ctx.beginPath(); ctx.arc(mx + mr * .35, my - 4, 2.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mx - mr * .5, my); ctx.lineTo(mx + mr * .35, my - 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#b7c1d8'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(T({ en: 'B flies ≈1 cm, then decays', el: 'το B ταξιδεύει ≈1 cm και διασπάται' }), mx, my + mr + 13);
      caption(T({ en: 'LHCb · simulated, simplified event (top view)', el: 'LHCb · προσομοιωμένο, απλοποιημένο γεγονός (κάτοψη)' }),
        T({ en: 'A B meson decays after ~1 cm; its products fly forward and bend in the magnet', el: 'Ένα μεσόνιο B διασπάται μετά από ~1 cm· τα προϊόντα του πάνε μπροστά και στρίβουν στον μαγνήτη' }),
        [['#ff4a4a', T({ en: 'muons', el: 'μιόνια' })], ['#f5b041', T({ en: 'hadrons', el: 'αδρόνια' })], ['#ffe27a', T({ en: 'photons', el: 'φωτόνια' }), [4, 4]]]);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ scale bar + locator
  function drawScale() {
    const depth = cam.h / Math.max(.2, Math.sin(cam.p));
    const mpp = depth / FOC;
    const L = niceStep(110 * mpp);
    const px = L / mpp;
    const x1 = W - 16, x0 = x1 - px, y = H - (mobile ? 16 : 20);
    ctx.strokeStyle = 'rgba(220,228,245,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y - 5); ctx.stroke();
    ctx.fillStyle = 'rgba(220,228,245,.9)'; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(L >= 1000 ? `${L / 1000} km` : `${L} m`, (x0 + x1) / 2, y - 8);
  }
  function drawLocator() {
    if (mobile || mode !== 'path') return;
    const size = Math.min(150, W * .14), x0 = W - size - 16, y0 = H - size - 50;
    ctx.fillStyle = 'rgba(8,12,22,.75)'; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, size, size, 10) : ctx.rect(x0, y0, size, size); ctx.fill(); ctx.stroke();
    const sc = size / 10400, ox = x0 + size / 2, oy = y0 + size / 2 - 250 * sc;
    const P = (x, y) => [ox + x * sc, oy + y * sc];
    const circ = (R, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(ox + R.cx * sc, oy + R.cy * sc, Math.max(1.2, R.r * sc), 0, TAU); ctx.stroke(); };
    ctx.lineWidth = 1.2;
    circ(LHC, MACHINE.lhc.color); circ(SPS, MACHINE.sps.color); circ(PS, MACHINE.ps.color);
    const [px, py] = posAt(s);
    const [X, Y] = P(px, py);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(X, Y, 7, 0, TAU); ctx.stroke();
  }

  // ------------------------------------------------------------ HUD / UI text
  const TXT = {
    linac: { what: { en: 'H⁻ ions from a hydrogen source are accelerated by radio-frequency cavities.', el: 'Ιόντα H⁻ από πηγή υδρογόνου επιταχύνονται από κοιλότητες ραδιοσυχνοτήτων.' },
      next: 'PS Booster', real: { en: '86 m · since 2020', el: '86 m · από το 2020' } },
    psb: { what: { en: 'On injection from Linac4, a foil strips both electrons (H⁻ → p⁺). Four stacked rings, 157 m around.', el: 'Στην είσοδο από τον Linac4, ένα φύλλο αφαιρεί και τα δύο ηλεκτρόνια (H⁻ → p⁺). Τέσσερις στοιβαγμένοι δακτύλιοι, 157 m.' },
      next: 'PS', real: { en: 'real: ≈1.8 million laps per second', el: 'πραγματικά: ≈1,8 εκατ. γύροι το δευτερόλεπτο' } },
    ps: { what: { en: '628 m, 100 magnets. It forms the bunch trains for the LHC.', el: '628 m, 100 μαγνήτες. Σχηματίζει τις σειρές πακέτων για τον LHC.' },
      next: 'SPS', real: { en: 'real: ≈480 000 laps per second', el: 'πραγματικά: ≈480.000 γύροι το δευτερόλεπτο' } },
    sps: { what: { en: '6.9 km underground. The last accelerator before the LHC.', el: '6,9 km κάτω από τη γη. Ο τελευταίος επιταχυντής πριν τον LHC.' },
      next: { en: 'LHC via TI2 / TI8', el: 'LHC μέσω TI2 / TI8' }, real: { en: 'real: ≈43 000 laps per second', el: 'πραγματικά: ≈43.000 γύροι το δευτερόλεπτο' } },
    lhc: { what: { en: 'Injected through TI2 near Point 2. Beam 1 goes round clockwise.', el: 'Εισάγεται μέσω TI2 κοντά στο Σημείο 2. Η Δέσμη 1 γυρίζει δεξιόστροφα.' },
      next: { en: 'the full ring', el: 'ολόκληρος ο δακτύλιος' }, real: { en: 'real: 11 245 laps per second', el: 'πραγματικά: 11.245 γύροι το δευτερόλεπτο' } }
  };
  function hud() {
    let kicker = '', where = '', what = '', next = '', real = '', eLbl = T({ en: 'Energy', el: 'Ενέργεια' }), eTxt = fmtE(E), vTxt = fmtB(betaOf(E));
    if (mode === 'path') {
      const g = segAt(s);
      const m = g.m, tx = TXT[m];
      const order = ['linac', 'psb', 'ps', 'sps', 'lhc'];
      kicker = `${order.indexOf(m) + 1} / 5` + (g.xfer ? ` · ${T({ en: 'transfer line', el: 'γραμμή μεταφοράς' })} ${g.xfer}` : '');
      where = MACHINE[m].name;
      what = hold > 0 ? T({ en: 'Hydrogen source: H⁻ ions (1 proton + 2 electrons) leave at 45 keV.', el: 'Πηγή υδρογόνου: ιόντα H⁻ (1 πρωτόνιο + 2 ηλεκτρόνια) φεύγουν με 45 keV.' }) : T(tx.what);
      next = T(tx.next); real = T(tx.real);
    } else if (mode === 'overview') {
      kicker = 'LHC · 26.7 km';
      if (ov < 1.9) { where = T({ en: 'The LHC ring', el: 'Ο δακτύλιος του LHC' }); what = T({ en: 'Two beams in two separate beam pipes.', el: 'Δύο δέσμες σε δύο ξεχωριστούς σωλήνες.' }); next = T({ en: 'Beam 2', el: 'Δέσμη 2' }); }
      else if (ov < RAMP0) { where = T({ en: 'Beam 2 via TI8', el: 'Δέσμη 2 μέσω TI8' }); what = T({ en: 'Injected near Point 8; it goes round anticlockwise.', el: 'Εισάγεται κοντά στο Σημείο 8· γυρίζει αριστερόστροφα.' }); next = T({ en: 'energy ramp', el: 'άνοδος ενέργειας' }); }
      else if (ov < REVEAL) { where = T({ en: 'Energy ramp', el: 'Άνοδος ενέργειας' }); what = T({ en: 'The energy rises 15×, but the speed hardly changes: it is already 99.9998 % of c.', el: 'Η ενέργεια ανεβαίνει 15×, αλλά η ταχύτητα σχεδόν δεν αλλάζει: είναι ήδη 99,9998 % του c.' }); next = T({ en: 'collisions', el: 'συγκρούσεις' }); real = T({ en: 'real ramp: ≈20 minutes', el: 'πραγματική άνοδος: ≈20 λεπτά' }); }
      else { where = T({ en: 'Collisions', el: 'Συγκρούσεις' }); what = T({ en: 'The beams cross at four points: ATLAS, ALICE, CMS and LHCb.', el: 'Οι δέσμες διασταυρώνονται σε τέσσερα σημεία: ATLAS, ALICE, CMS και LHCb.' }); next = T({ en: 'experiments', el: 'πειράματα' }); real = T({ en: 'real: 11 245 laps per second', el: 'πραγματικά: 11.245 γύροι το δευτερόλεπτο' }); }
    } else if (mode === 'focus' && focus) {
      const ex = EXP[focus.exp], ip = IP[focus.ip];
      kicker = `${ip.pt} · ${T({ en: 'experiment', el: 'πείραμα' })}`;
      where = ex.name;
      what = T(ex.what);
      if (focus.exp === 'alice') { eLbl = T({ en: 'Pb–Pb collision', el: 'Σύγκρουση Pb–Pb' }); eTxt = T({ en: '5.36 TeV / nucleon pair', el: '5,36 TeV / ζεύγος νουκλεονίων' }); }
      else { eLbl = T({ en: 'Collision energy (c.m.) · 2 × 6.8 TeV', el: 'Ενέργεια σύγκρουσης (κ.μ.) · 2 × 6,8 TeV' }); eTxt = fmtE(13.6e12); }
      const order = ['atlas', 'alice', 'cms', 'lhcb'];
      const i = order.indexOf(focus.ip);
      next = touring && i < 3 ? IP[order[i + 1]].name : '—';
    }
    kickerEl.textContent = kicker; whereEl.textContent = where; whatEl.textContent = what;
    eLabel.textContent = eLbl; eEl.textContent = eTxt; vEl.textContent = vTxt; nextEl.textContent = next; realEl.textContent = real;
    root.style.setProperty('--m', mode === 'path' ? MACHINE[segAt(s).m].color : mode === 'focus' && focus ? IP[focus.ip]?.col || '#6f8fd6' : MACHINE.lhc.color);
    const scene = mode === 'path' ? segAt(s).m : mode === 'overview' ? 'lhc' : 'exps';
    if (scene !== lastScene) { lastScene = scene; navEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.scene === scene)); }
  }

  function showCard(id) {
    const ex = EXP[id];
    if (!ex) { cardEl.classList.remove('show'); return; }
    const host = IP[ex.host];
    cardEl.style.setProperty('--c', ex.major ? host.col : '#c9b3ff');
    cardBody.innerHTML = `
      <p class="cx-card-k">${ex.major ? host.pt : T({ en: 'at', el: 'στο' }) + ' ' + host.pt + ' · ' + host.name}</p>
      <h4>${ex.name}</h4>
      <p>${T(ex.what)}</p>
      ${ex.how ? `<p class="cx-card-how">${T(ex.how)}</p>` : ''}
      <div class="cx-card-facts">${ex.facts.map(([a, b]) => `<span><b>${typeof a === 'string' ? a : T(a)}</b>${b ? ' ' + (typeof b === 'string' ? b : T(b)) : ''}</span>`).join('')}</div>`;
    cardEl.classList.add('show');
  }

  function buildNav() {
    const items = [['linac', 'Linac4'], ['psb', 'PSB'], ['ps', 'PS'], ['sps', 'SPS'], ['lhc', 'LHC'], ['exps', { en: 'Experiments', el: 'Πειράματα' }]];
    navEl.innerHTML = '';
    items.forEach(([k, n], i) => {
      const b = document.createElement('button');
      b.dataset.scene = k;
      b.innerHTML = `${i ? '<i>→</i>' : ''}<span>${T(n)}</span>`;
      b.onclick = () => jump(k);
      navEl.appendChild(b);
    });
    expsEl.innerHTML = '';
    EXPS.forEach(ex => {
      const b = document.createElement('button');
      b.className = ex.major ? 'major' : 'minor';
      b.style.setProperty('--c', ex.major ? IP[ex.host].col : '#c9b3ff');
      b.textContent = ex.name;
      b.onclick = () => { ensureStarted(); openExperiment(ex.id, false); };
      expsEl.appendChild(b);
    });
    lastScene = '';
  }

  // ------------------------------------------------------------ flow control
  function ensureStarted() { if (!started) { started = true; startEl.classList.add('hide'); setPlaying(true); } }
  function setPlaying(p) { playing = p; playBtn.textContent = p ? '❚❚' : '▶'; playBtn.setAttribute('aria-label', p ? 'Pause' : 'Play'); root.classList.toggle('paused', !p); }

  function jump(k) {
    ensureStarted();
    cardEl.classList.remove('show');
    event = null; focus = null; touring = false; tween = null;
    root.classList.remove('exps-open');
    if (k === 'exps') {
      enterOverview(true);
      touring = true; tourIdx = 0;
      root.classList.add('exps-open');
      setTimeout(() => { if (touring && mode === 'overview') nextTour(); }, 900);
      return;
    }
    mode = 'path';
    const idx = { linac: 0, psb: 1, ps: 3, sps: 5, lhc: 7 }[k];
    s = SEGS[idx].s0 + (k === 'linac' ? 0 : .01);
    hold = k === 'linac' ? .7 : 0;
    const [B, Hh, P] = SEGS[idx].cam;
    const [px, py] = posAt(s), hd = hdAt(s);
    Object.assign(cam, { h: Hh, p: P * DEG, hd, x: px - Math.cos(hd) * B, y: py - Math.sin(hd) * B });
  }

  function enterOverview(ready) {
    mode = 'overview';
    ov = ready ? REVEAL + .1 : 0;
    ovDone = !!ready;
    theta1 = 128 * DEG + (s - SEGS[7].s0) / LHC.r;
    theta2 = 52 * DEG;
    if (ready) { E = 6.8e12; camTo(overviewCam(), 1.2); }
    else camTo(() => overviewCam(), 2.4);
  }

  const TOUR = ['atlas', 'alice', 'cms', 'lhcb'];
  function nextTour() {
    if (tourIdx >= TOUR.length) { touring = false; endTour(); return; }
    openExperiment(TOUR[tourIdx++], true);
  }
  function endTour() {
    focus = null; event = null;
    mode = 'overview';
    camTo(() => overviewCam(), 1.8);
    cardEl.style.setProperty('--c', '#6f8fd6');
    cardBody.innerHTML = `<p class="cx-card-k">${T({ en: 'End of the journey', el: 'Τέλος του ταξιδιού' })}</p>
      <h4>${T({ en: 'Nine experiments, one accelerator', el: 'Εννέα πειράματα, ένας επιταχυντής' })}</h4>
      <p>${T({ en: 'Tap any experiment below to visit it again, or see how detectors catch the particles.', el: 'Πάτα οποιοδήποτε πείραμα από κάτω για να το ξαναδείς, ή δες πώς οι ανιχνευτές «πιάνουν» τα σωματίδια.' })}</p>
      <a class="btn btn-small btn-primary" href="#detectors">${T({ en: 'Detectors →', el: 'Ανιχνευτές →' })}</a>`;
    cardEl.classList.add('show');
    root.classList.add('exps-open');
  }

  function openExperiment(id, fromTour) {
    const ex = EXP[id];
    if (!ovDone) { ovDone = true; E = 6.8e12; }
    cardEl.classList.remove('show');
    event = null;
    mode = 'focus';
    focus = { ip: ex.host, exp: id, t: 0, major: ex.major, fromTour };
    camTo(() => focusCam(ex.host), 1.6);
    expsEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', EXPS[i].id === id));
    root.classList.add('exps-open');
  }

  // ------------------------------------------------------------ main loop
  function update(dt) {
    const mul = mobile ? 1.3 : 1;              // faster on phones
    if (mode === 'path') {
      if (hold > 0) { hold -= dt; v = 0; }
      else {
        const g = segAt(s);
        const u = clamp01((s - g.s0) / g.seg.len);
        v = lerp(g.v[0], g.v[1], u) * mul;
        s += v * dt;
        if (s >= S_END) { s = S_END; enterOverview(false); }
      }
      E = pathEnergy();
    } else {
      // circulating beams (visual lap ≈ 1 s — the real ones do 11 245 laps per second)
      omega = TAU / 1.05 * mul;
      theta1 += omega * dt;
      theta2 -= omega * dt;
      if (mode === 'overview') {
        ov += dt;
        if (!ovDone) E = ov < RAMP0 ? 450e9 : overviewEnergy();
        if (ov > REVEAL && !ovDone) { ovDone = true; }
        if (ovDone && !touring && !focus && ov > REVEAL + 2.2 && ov - dt <= REVEAL + 2.2 && !cardEl.classList.contains('show')) {
          touring = true; tourIdx = 0; nextTour();
        }
      } else if (mode === 'focus' && focus) {
        focus.t += dt;
        E = 6.8e12;
        const tDisp = 2.4;
        if (focus.major && focus.t > tDisp && !event) { event = makeEvent(focus.exp); event.t = 0; showCard(focus.exp); }
        if (!focus.major && focus.t > 1.8 && !cardEl.classList.contains('show')) showCard(focus.exp);
        if (event) event.t += dt;
        if (focus.fromTour && event && event.t > 6.2) nextTour();
      }
    }
  }

  function frame(dtMs) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h; FOC = H * .95; mobile = W < 700;
    const dt = playing ? dtMs / 1000 : 0;
    if (!started) { idle(dtMs / 1000); return; }
    clock += dt;
    update(dt);
    stepCamera(dt || 1e-6);
    setCam();

    drawBackdrop();
    drawGrid();
    drawMachines();
    drawMachineLabels();
    if (mode === 'path') {
      drawPathBeam();
      if (segAt(s).m === 'lhc' || segAt(s).m === 'sps') drawPoints(clamp01((cam.h - 600) / 800));
    } else if (mode === 'overview') {
      const beam2 = ov > 1.9 || ovDone;
      if (!ovDone && ov > 1.9 && ov < RAMP0) {
        // Beam 2 injection through TI8
        const u = clamp01((ov - 1.9) / 1.1);
        trailAlong(d => TI8.at(Math.max(0, Math.min(TI8.len, d))), u * TI8.len, 700, B2, 2.4, 3);
      }
      drawOverviewBeams(beam2);
      drawPoints(ovDone ? 1 : clamp01((ov - (REVEAL - 1)) / 1));
    } else if (mode === 'focus' && focus) {
      drawPoints(1);
      drawFocus(focus.t);
      if (event) drawDisplay(event.t);
    }
    if (!event) { drawScale(); drawLocator(); }
    root.classList.toggle('display-on', !!event && event.t > .2);
    hud();
  }

  // before starting: a slow establishing shot over the SPS / LHC region
  let idleT = 0;
  function idle(dt) {
    idleT += dt;
    Object.assign(cam, { x: 1200 * Math.cos(idleT * .05), y: 5200 + 400 * Math.sin(idleT * .05), h: 1600, p: 32 * DEG, hd: -100 * DEG + Math.sin(idleT * .05) * .3 });
    setCam();
    drawBackdrop(); drawGrid(); drawMachines(); drawMachineLabels();
    theta1 += dt * 1.5; theta2 -= dt * 1.5; omega = 1.5;
    drawOverviewBeams(true);
    drawPoints(1);
  }

  const lp = App.loop(frame);

  // ------------------------------------------------------------ events
  $('cxGo').onclick = () => { started = true; startEl.classList.add('hide'); jump('linac'); setPlaying(true); };
  playBtn.onclick = () => { if (!started) { started = true; startEl.classList.add('hide'); jump('linac'); setPlaying(true); return; } setPlaying(!playing); };
  restartBtn.onclick = () => { jump('linac'); setPlaying(true); };
  $('cxCardX').onclick = () => cardEl.classList.remove('show');
  document.addEventListener('keydown', e => {
    if (App.current !== 'accelerators' || e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
  });
  document.addEventListener('langchange', () => { buildNav(); if (cardEl.classList.contains('show') && focus) showCard(focus.exp); });

  buildNav();
  App.on('accelerators', { enter() { lp.start(); }, leave() { lp.stop(); setPlaying(false); } });
})();
