// =========================================================
//  scale.js — "Powers of ten" zoom from a sugar cube to quarks
// =========================================================

(() => {
  const canvas = document.getElementById('scaleCanvas');
  const range = document.getElementById('scaleRange');
  const sizeEl = document.getElementById('scaleSize');
  const nameEl = document.getElementById('scaleName');
  const descEl = document.getElementById('scaleDesc');
  const stepsEl = document.getElementById('scaleSteps');
  const tag = document.getElementById('cernTag');
  const marker = document.getElementById('logMarker');
  const playBtn = document.getElementById('scalePlay');
  let ctx, W, H, time = 0, value = 0, target = 0, lastStage = -1;

  const STAGES = [
    { exp: -2, size: '10⁻² m',
      name: { en: 'Sugar cube', el: 'Κύβος ζάχαρης' },
      short: { en: 'Sugar', el: 'Ζάχαρη' },
      desc: { en: 'About 1 cm. Something you can hold in your hand, and our starting point.', el: 'Περίπου 1 cm. Κάτι που χωράει στην παλάμη σου, και το σημείο που ξεκινάμε.' } },
    { exp: -9, size: '10⁻⁹ m',
      name: { en: 'Crystal of molecules', el: 'Κρύσταλλος μορίων' },
      short: { en: 'Molecules', el: 'Μόρια' },
      desc: { en: 'Zoom in ten million times and the sugar is a neat grid of molecules. Microscopes can just about see this.', el: 'Κάνε ζουμ δέκα εκατομμύρια φορές και η ζάχαρη είναι ένα τακτοποιημένο πλέγμα από μόρια. Εδώ φτάνουν μόλις τα μικροσκόπια.' } },
    { exp: -10, size: '10⁻¹⁰ m',
      name: { en: 'Atom', el: 'Άτομο' },
      short: { en: 'Atom', el: 'Άτομο' },
      desc: { en: 'Each molecule is made of atoms: a tiny nucleus with electrons around it. The atom is almost completely empty space.', el: 'Κάθε μόριο φτιάχνεται από άτομα: ένας μικροσκοπικός πυρήνας με ηλεκτρόνια γύρω του. Το άτομο είναι σχεδόν ολόκληρο κενός χώρος.' } },
    { exp: -14, size: '10⁻¹⁴ m',
      name: { en: 'Nucleus', el: 'Πυρήνας' },
      short: { en: 'Nucleus', el: 'Πυρήνας' },
      desc: { en: 'If the atom were a football stadium, the nucleus would be a pea in the middle, made of protons and neutrons.', el: 'Αν το άτομο ήταν ένα γήπεδο ποδοσφαίρου, ο πυρήνας θα ήταν ένα μπιζέλι στη μέση, φτιαγμένο από πρωτόνια και νετρόνια.' } },
    { exp: -15, size: '10⁻¹⁵ m',
      name: { en: 'Proton', el: 'Πρωτόνιο' },
      short: { en: 'Proton', el: 'Πρωτόνιο' },
      desc: { en: 'A proton isn\'t a solid ball. It\'s three quarks held together by gluons, the "glue" of the strong force. This is where accelerators take over.', el: 'Ένα πρωτόνιο δεν είναι συμπαγής μπάλα. Είναι τρία κουάρκ που τα κρατούν μαζί τα γλουόνια, η «κόλλα» της ισχυρής δύναμης. Εδώ αναλαμβάνουν οι επιταχυντές.' } },
    { exp: -18, size: '< 10⁻¹⁸ m',
      name: { en: 'Quarks & electrons', el: 'Κουάρκ & ηλεκτρόνια' },
      short: { en: 'Quark', el: 'Κουάρκ' },
      desc: { en: 'As far as we can measure, quarks and electrons have no size at all. They are truly elementary. This is where CERN looks for answers.', el: 'Όσο μπορούμε να μετρήσουμε, τα κουάρκ και τα ηλεκτρόνια δεν έχουν καθόλου μέγεθος. Είναι πραγματικά στοιχειώδη. Εδώ ψάχνει απαντήσεις το CERN.' } }
  ];

  // ---------- drawings (each fits in a circle of radius R around 0,0) ----------
  const D = [
    // 0 sugar cube
    (R) => {
      const s = R * .62;
      const top = [[0, -s], [s * .87, -s * .5], [0, 0], [-s * .87, -s * .5]];
      const left = [[-s * .87, -s * .5], [0, 0], [0, s], [-s * .87, s * .5]];
      const right = [[s * .87, -s * .5], [0, 0], [0, s], [s * .87, s * .5]];
      const poly = (p, c) => { ctx.fillStyle = c; ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke(); };
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(160,210,255,.5)'; ctx.shadowBlur = 40;
      poly(top, '#f5f8ff'); ctx.shadowBlur = 0;
      poly(left, '#c9d3ec'); poly(right, '#a9b6d8');
      // sugar grains
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 90; i++) {
        const u = rnd(), v = rnd();
        ctx.fillRect(s * .87 * (u - v), -s + s * .5 * (u + v), 1.6, 1.6);
      }
    },
    // 1 lattice
    (R) => {
      const n = 5, gap = R * .3, r = gap * .36;
      const iso = (i, j, k) => [(i - j) * gap * .87, (i + j) * gap * .5 - k * gap];
      const pts = [];
      for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) pts.push([i, j, k]);
      pts.sort((a, b) => (a[0] + a[1] + a[2] * .01) - (b[0] + b[1] + b[2] * .01));
      for (const [i, j, k] of pts) {
        const [x, y] = iso(i - 2, j - 2, k - 2);
        const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
        g.addColorStop(0, '#e6f0ff'); g.addColorStop(.6, '#6f8fe0'); g.addColorStop(1, '#2a3c7a');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y + Math.sin(time * 2 + i + j + k) * 1.2, r, 0, 7); ctx.fill();
      }
    },
    // 2 atom
    (R) => {
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        ctx.save(); ctx.rotate(k * Math.PI / 3 + time * .1);
        ctx.strokeStyle = 'rgba(120,200,255,.35)';
        ctx.beginPath(); ctx.ellipse(0, 0, R * .85, R * .3, 0, 0, 7); ctx.stroke();
        const a = time * (1.6 + k * .4) + k * 2;
        const x = Math.cos(a) * R * .85, y = Math.sin(a) * R * .3;
        ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#bff0ff';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * .12);
      g.addColorStop(0, '#ffd1f0'); g.addColorStop(1, '#8a3cc2');
      ctx.fillStyle = g;
      ctx.shadowColor = '#b38bff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(0, 0, R * .07, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    },
    // 3 nucleus
    (R) => {
      const balls = [[0, 0], [.3, .1], [-.28, .12], [.05, .32], [.1, -.3], [-.2, -.24], [.32, -.18], [-.34, -.08], [.22, .3], [-.14, .32], [.02, -.02], [.18, -.05], [-.1, .1], [.05, .15]];
      balls.forEach(([x, y], i) => {
        const r = R * .19;
        const jx = Math.sin(time * 3 + i) * 2, jy = Math.cos(time * 2.6 + i * 2) * 2;
        const proton = i % 2 === 0;
        const g = ctx.createRadialGradient(x * R + jx - r * .3, y * R + jy - r * .3, r * .1, x * R + jx, y * R + jy, r);
        if (proton) { g.addColorStop(0, '#ffb3bf'); g.addColorStop(.6, '#e0314f'); g.addColorStop(1, '#6d0a1b'); }
        else { g.addColorStop(0, '#fff1c9'); g.addColorStop(.6, '#d9a63c'); g.addColorStop(1, '#5a3e0a'); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x * R + jx, y * R + jy, r, 0, 7); ctx.fill();
      });
    },
    // 4 proton with 3 quarks + gluons
    (R) => {
      const g = ctx.createRadialGradient(0, 0, R * .2, 0, 0, R * .9);
      g.addColorStop(0, 'rgba(255,90,120,.35)'); g.addColorStop(1, 'rgba(255,60,100,.04)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * .9, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,150,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      const q = [0, 1, 2].map(i => {
        const a = i * Math.PI * 2 / 3 - Math.PI / 2 + Math.sin(time * .7 + i) * .3;
        const d = R * (.42 + Math.sin(time * 1.3 + i * 2) * .06);
        return [Math.cos(a) * d, Math.sin(a) * d];
      });
      // gluon springs
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % 3];
        const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const t = s / 60, w = Math.sin(t * Math.PI * 14 + time * 8) * 6;
          const x = x1 + (x2 - x1) * t + nx * w, y = y1 + (y2 - y1) * t + ny * w;
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      const cols = ['#ff4d6d', '#2ee59d', '#4d7cff'];
      const labels = ['u', 'u', 'd'];
      q.forEach(([x, y], i) => {
        ctx.shadowColor = cols[i]; ctx.shadowBlur = 24;
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(x, y, R * .11, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = `italic 700 ${Math.round(R * .12)}px Georgia, serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(labels[i], x, y + 1);
      });
    },
    // 5 point-like quark
    (R) => {
      const pulse = 1 + Math.sin(time * 3) * .15;
      for (let k = 4; k > 0; k--) {
        ctx.strokeStyle = `rgba(255,122,61,${.12 * k})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, R * .12 * k * pulse, 0, 7); ctx.stroke();
      }
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * .25);
      g.addColorStop(0, '#fff'); g.addColorStop(.15, '#ffb07a'); g.addColorStop(1, 'rgba(255,122,61,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * .25, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = `600 ${Math.round(R * .09)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('?', R * .32, -R * .26);
    }
  ];

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function frame(dt) {
    const r = App.fitCanvas(canvas);
    ctx = r.ctx; W = r.w; H = r.h;
    time += dt / 1000;
    value += (target - value) * Math.min(1, dt / 120);
    if (Math.abs(target - value) < .001) value = target;

    ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * .36;
    const i = Math.min(4, Math.floor(value));
    const f = value - i;

    // current stage zooms in and fades out
    const draw = (k, scale, alpha) => {
      if (alpha <= .01 || k > 5) return;
      ctx.save();
      ctx.translate(W / 2, H / 2 + 10);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      D[k](R);
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    if (value >= 5) draw(5, 1, 1);
    else {
      draw(i, 1 + f * f * 7, 1 - smooth(.45, .9, f));
      draw(i + 1, .15 + .85 * smooth(.3, 1, f), smooth(.35, .95, f));
      // zoom target ring
      if (f > .02 && f < .95) {
        ctx.strokeStyle = `rgba(76,201,240,${.6 * (1 - f)})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(W / 2, H / 2 + 10, R * (.12 + f * 1.8), 0, 7); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // labels
    const k = Math.round(value);
    if (k !== lastStage) setStage(k);
    const exp = STAGES[i].exp + (i < 5 ? (STAGES[i + 1].exp - STAGES[i].exp) * f : 0);
    marker.style.left = Math.min(100, Math.max(0, (exp + 18) / 18 * 100)) + '%';
    if (document.activeElement !== range) range.value = Math.round(value * 100);
  }

  function setStage(k) {
    lastStage = k;
    const s = STAGES[k];
    sizeEl.textContent = s.size;
    nameEl.textContent = T(s.name);
    descEl.textContent = T(s.desc);
    tag.classList.toggle('show', k >= 4);
    [...stepsEl.children].forEach((b, j) => b.classList.toggle('on', j === k));
  }

  function build() {
    STAGES.forEach((s, j) => {
      const b = document.createElement('button');
      b.textContent = T(s.short);
      b.onclick = () => { target = j; };
      stepsEl.appendChild(b);
    });
    range.addEventListener('input', () => { target = value = range.value / 100; });
    canvas.parentElement.addEventListener('wheel', e => {
      const next = Math.min(5, Math.max(0, target + e.deltaY * .0025));
      if (next !== target && !(next === 0 && e.deltaY < 0) && !(next === 5 && e.deltaY > 0)) e.preventDefault();
      target = next;
    }, { passive: false });
    canvas.parentElement.addEventListener('click', () => { target = Math.min(5, Math.floor(target) + 1); });
    playBtn.onclick = () => {
      target = 0; value = 0;
      let k = 0;
      const id = setInterval(() => { k++; target = k; if (k >= 5) clearInterval(id); }, 1400);
    };
    document.addEventListener('langchange', () => {
      [...stepsEl.children].forEach((b, j) => b.textContent = T(STAGES[j].short));
      lastStage = -1;
    });
  }

  build();
  const lp = App.loop(frame);
  App.on('scale', { enter() { lp.start(); }, leave() { lp.stop(); } });
})();
