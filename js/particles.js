// =========================================================
//  particles.js — interactive Standard Model table
// =========================================================

(() => {
  const grid = document.getElementById('smGrid');
  const detail = document.getElementById('smDetail');
  const legend = document.getElementById('smLegend');

  // mass in eV (for the log bar), charge, spin
  const P = [
    // row 1
    { id: 'u', sym: 'u', g: 'quark', mass: 2.2e6, q: '+2/3', spin: '1/2', name: { en: 'up', el: 'πάνω (up)' },
      fact: { en: 'Two up quarks and one down quark make a proton. Every atom in your body has them.', el: 'Δύο up κι ένα down κουάρκ φτιάχνουν ένα πρωτόνιο. Κάθε άτομο του σώματός σου τα έχει.' },
      disc: { en: '1968 · SLAC (USA)', el: '1968 · SLAC (ΗΠΑ)' } },
    { id: 'c', sym: 'c', g: 'quark', mass: 1.27e9, q: '+2/3', spin: '1/2', name: { en: 'charm', el: 'γοητευτικό (charm)' },
      fact: { en: 'Its discovery in 1974 was so important that physicists call it the "November Revolution".', el: 'Η ανακάλυψή του το 1974 ήταν τόσο σημαντική που οι φυσικοί τη λένε «Επανάσταση του Νοεμβρίου».' },
      disc: { en: '1974 · BNL & SLAC (USA)', el: '1974 · BNL & SLAC (ΗΠΑ)' } },
    { id: 't', sym: 't', g: 'quark', mass: 172.7e9, q: '+2/3', spin: '1/2', name: { en: 'top', el: 'κορυφή (top)' },
      fact: { en: 'The heaviest known elementary particle, as heavy as a whole gold atom! It decays before it can even form a hadron.', el: 'Το βαρύτερο γνωστό στοιχειώδες σωματίδιο, όσο ένα ολόκληρο άτομο χρυσού! Διασπάται πριν προλάβει καν να φτιάξει αδρόνιο.' },
      disc: { en: '1995 · Fermilab (USA)', el: '1995 · Fermilab (ΗΠΑ)' } },
    { id: 'gamma', sym: 'γ', g: 'boson', mass: 0, q: '0', spin: '1', name: { en: 'photon', el: 'φωτόνιο' },
      fact: { en: 'The particle of light, and the carrier of the electromagnetic force. No mass, so it always moves at the speed of light.', el: 'Το σωματίδιο του φωτός και φορέας της ηλεκτρομαγνητικής δύναμης. Δεν έχει μάζα, οπότε κινείται πάντα με την ταχύτητα του φωτός.' },
      disc: { en: '1905 · Einstein (idea), 1923 · Compton', el: '1905 · Αϊνστάιν (ιδέα), 1923 · Compton' } },
    // row 2
    { id: 'd', sym: 'd', g: 'quark', mass: 4.7e6, q: '−1/3', spin: '1/2', name: { en: 'down', el: 'κάτω (down)' },
      fact: { en: 'One up and two down quarks make a neutron. Down + up + up = proton.', el: 'Ένα up και δύο down κουάρκ φτιάχνουν ένα νετρόνιο. Down + up + up = πρωτόνιο.' },
      disc: { en: '1968 · SLAC (USA)', el: '1968 · SLAC (ΗΠΑ)' } },
    { id: 's', sym: 's', g: 'quark', mass: 93e6, q: '−1/3', spin: '1/2', name: { en: 'strange', el: 'παράξενο (strange)' },
      fact: { en: 'Named "strange" because particles containing it lived much longer than expected.', el: 'Ονομάστηκε «παράξενο» γιατί τα σωματίδια που το περιείχαν ζούσαν πολύ περισσότερο απ\' όσο περίμεναν.' },
      disc: { en: '1947 · cosmic rays (UK)', el: '1947 · κοσμικές ακτίνες (Ηνωμένο Βασίλειο)' } },
    { id: 'b', sym: 'b', g: 'quark', mass: 4.18e9, q: '−1/3', spin: '1/2', name: { en: 'bottom', el: 'πυθμένας (bottom)' },
      fact: { en: 'Also called "beauty". The LHCb experiment is named after it and uses it to study matter vs antimatter.', el: 'Λέγεται και «beauty». Το πείραμα LHCb πήρε το όνομά του από αυτό και το χρησιμοποιεί για να μελετά ύλη vs αντιύλη.' },
      disc: { en: '1977 · Fermilab (USA)', el: '1977 · Fermilab (ΗΠΑ)' } },
    { id: 'g', sym: 'g', g: 'boson', mass: 0, q: '0', spin: '1', name: { en: 'gluon', el: 'γλουόνιο' },
      fact: { en: 'The "glue" of the strong force that holds quarks together. It\'s so strong that you can never pull a single quark out on its own.', el: 'Η «κόλλα» της ισχυρής δύναμης που κρατά τα κουάρκ ενωμένα. Είναι τόσο ισχυρή που δεν μπορείς ποτέ να βγάλεις ένα κουάρκ μόνο του.' },
      disc: { en: '1979 · DESY (Germany)', el: '1979 · DESY (Γερμανία)' } },
    // row 3
    { id: 've', sym: 'νₑ', g: 'lepton', mass: 0.8, q: '0', spin: '1/2', name: { en: 'electron neutrino', el: 'νετρίνο ηλεκτρονίου' },
      fact: { en: 'About 60 billion neutrinos from the Sun pass through every square centimetre of you every second, and almost none of them hit anything.', el: 'Περίπου 60 δισεκατομμύρια νετρίνα από τον Ήλιο περνούν από κάθε τετραγωνικό εκατοστό σου κάθε δευτερόλεπτο, και σχεδόν κανένα δεν χτυπάει τίποτα.' },
      disc: { en: '1956 · Savannah River reactor (USA)', el: '1956 · αντιδραστήρας Savannah River (ΗΠΑ)' }, massTxt: '< 0.8 eV' },
    { id: 'vm', sym: 'ν_μ', g: 'lepton', mass: 0.8, q: '0', spin: '1/2', name: { en: 'muon neutrino', el: 'νετρίνο μιονίου' },
      fact: { en: 'Neutrinos change "flavour" while they travel. That\'s how we know they have a (tiny) mass.', el: 'Τα νετρίνα αλλάζουν «γεύση» καθώς ταξιδεύουν. Έτσι ξέρουμε ότι έχουν (ελάχιστη) μάζα.' },
      disc: { en: '1962 · Brookhaven (USA)', el: '1962 · Brookhaven (ΗΠΑ)' }, massTxt: '< 0.8 eV' },
    { id: 'vt', sym: 'ν_τ', g: 'lepton', mass: 0.8, q: '0', spin: '1/2', name: { en: 'tau neutrino', el: 'νετρίνο ταυ' },
      fact: { en: 'The last matter particle to be seen directly. It took until the year 2000.', el: 'Το τελευταίο σωματίδιο ύλης που «είδαμε» απευθείας. Χρειάστηκε να φτάσουμε στο 2000.' },
      disc: { en: '2000 · Fermilab (USA)', el: '2000 · Fermilab (ΗΠΑ)' }, massTxt: '< 0.8 eV' },
    { id: 'Z', sym: 'Z', g: 'boson', mass: 91.19e9, q: '0', spin: '1', name: { en: 'Z boson', el: 'μποζόνιο Z' },
      fact: { en: 'Carrier of the weak force. Discovered at CERN, where it earned a Nobel Prize in 1984.', el: 'Φορέας της ασθενούς δύναμης. Ανακαλύφθηκε στο CERN και έφερε Νόμπελ το 1984.' },
      disc: { en: '1983 · CERN', el: '1983 · CERN' }, cern: true },
    // row 4
    { id: 'e', sym: 'e', g: 'lepton', mass: 0.511e6, q: '−1', spin: '1/2', name: { en: 'electron', el: 'ηλεκτρόνιο' },
      fact: { en: 'The first elementary particle ever discovered. Every electric current, every screen, every chemical bond is electrons.', el: 'Το πρώτο στοιχειώδες σωματίδιο που ανακαλύφθηκε ποτέ. Κάθε ηλεκτρικό ρεύμα, κάθε οθόνη, κάθε χημικός δεσμός είναι ηλεκτρόνια.' },
      disc: { en: '1897 · J.J. Thomson (UK)', el: '1897 · J.J. Thomson (Ηνωμένο Βασίλειο)' } },
    { id: 'mu', sym: 'μ', g: 'lepton', mass: 105.7e6, q: '−1', spin: '1/2', name: { en: 'muon', el: 'μιόνιο' },
      fact: { en: 'A "heavy electron", about 207 times heavier. It lives only 2.2 μs, yet it reaches the ground thanks to relativity (see chapter 9).', el: 'Ένα «βαρύ ηλεκτρόνιο», περίπου 207 φορές πιο βαρύ. Ζει μόλις 2,2 μs, κι όμως φτάνει στο έδαφος χάρη στη σχετικότητα (δες κεφάλαιο 9).' },
      disc: { en: '1936 · cosmic rays (USA)', el: '1936 · κοσμικές ακτίνες (ΗΠΑ)' } },
    { id: 'tau', sym: 'τ', g: 'lepton', mass: 1.777e9, q: '−1', spin: '1/2', name: { en: 'tau', el: 'ταυ' },
      fact: { en: 'Almost twice as heavy as a proton, even though it\'s "just" a lepton like the electron.', el: 'Σχεδόν διπλάσιο σε μάζα από ένα πρωτόνιο, αν και είναι «απλώς» λεπτόνιο σαν το ηλεκτρόνιο.' },
      disc: { en: '1975 · SLAC (USA)', el: '1975 · SLAC (ΗΠΑ)' } },
    { id: 'W', sym: 'W', g: 'boson', mass: 80.37e9, q: '±1', spin: '1', name: { en: 'W boson', el: 'μποζόνιο W' },
      fact: { en: 'Responsible for radioactive decay, and for making the Sun shine. Discovered at CERN in 1983.', el: 'Υπεύθυνο για τη ραδιενεργό διάσπαση, και για το ότι λάμπει ο Ήλιος. Ανακαλύφθηκε στο CERN το 1983.' },
      disc: { en: '1983 · CERN', el: '1983 · CERN' }, cern: true },
    // higgs
    { id: 'H', sym: 'H', g: 'higgs', mass: 125.1e9, q: '0', spin: '0', name: { en: 'Higgs boson', el: 'μποζόνιο Higgs' },
      fact: { en: 'It gives the other particles their mass. Predicted in 1964, found 48 years later by ATLAS and CMS at the LHC. Nobel Prize 2013.', el: 'Δίνει μάζα στα άλλα σωματίδια. Προβλέφθηκε το 1964 και βρέθηκε 48 χρόνια μετά από τα ATLAS και CMS στον LHC. Νόμπελ 2013.' },
      disc: { en: '4 July 2012 · CERN', el: '4 Ιουλίου 2012 · CERN' }, cern: true }
  ];

  const GROUP = {
    quark: { en: 'Quark · matter', el: 'Κουάρκ · ύλη' },
    lepton: { en: 'Lepton · matter', el: 'Λεπτόνιο · ύλη' },
    boson: { en: 'Force carrier', el: 'Φορέας δύναμης' },
    higgs: { en: 'Scalar boson', el: 'Βαθμωτό μποζόνιο' }
  };
  const COLOR = { quark: 'var(--violet)', lepton: 'var(--green)', boson: 'var(--hot)', higgs: 'var(--gold)' };

  function fmtMass(p) {
    if (p.massTxt) return p.massTxt;
    const m = p.mass;
    if (m === 0) return '0';
    if (m >= 1e9) return +(m / 1e9).toPrecision(4) + ' GeV';
    if (m >= 1e5) return +(m / 1e6).toPrecision(3) + ' MeV';
    return m + ' eV';
  }
  const symHTML = s => s.replace(/_(.)/, '<sub>$1</sub>').replace('ₑ', '<sub>e</sub>');

  let selected = 'H';

  function renderGrid() {
    grid.innerHTML = '';
    for (const p of P) {
      const b = document.createElement('button');
      b.className = `pc ${p.g}` + (p.id === selected ? ' sel' : '');
      b.dataset.id = p.id;
      b.dataset.group = p.g;
      b.innerHTML = `<span class="ms">${fmtMass(p)}</span><span class="ch">${p.q}</span><span class="sym">${symHTML(p.sym)}</span><span class="nm">${T(p.name)}</span>`;
      b.onclick = () => select(p.id);
      grid.appendChild(b);
    }
  }

  function select(id) {
    selected = id;
    grid.querySelectorAll('.pc').forEach(b => b.classList.toggle('sel', b.dataset.id === id));
    const p = P.find(x => x.id === id);
    // mass bar: log scale from 0.1 eV to 1 TeV
    const pos = p.mass === 0 ? 0 : Math.min(100, Math.max(2, (Math.log10(p.mass) + 1) / 13 * 100));
    detail.style.setProperty('--c', COLOR[p.g]);
    detail.innerHTML = `
      <div class="d-head">
        <div class="d-sym">${symHTML(p.sym)}</div>
        <div><p class="d-type">${T(GROUP[p.g])}</p><h3>${T(p.name)}</h3></div>
      </div>
      <dl class="props">
        <div><dt>${T({ en: 'Mass', el: 'Μάζα' })}</dt><dd>${fmtMass(p)}</dd></div>
        <div><dt>${T({ en: 'Charge', el: 'Φορτίο' })}</dt><dd>${p.q}</dd></div>
        <div><dt>Spin</dt><dd>${p.spin}</dd></div>
      </dl>
      <div class="massbar">
        <div class="massbar-track"><i style="left:${pos}%"></i></div>
        <div class="massbar-labels"><span>0</span><span>1 keV</span><span>1 MeV</span><span>1 GeV</span><span>1 TeV</span></div>
      </div>
      <p class="d-fact">${T(p.fact)}</p>
      <p class="d-disc">${T({ en: 'Discovered', el: 'Ανακάλυψη' })}: <b>${T(p.disc)}</b></p>`;
  }

  // hover a legend chip -> highlight that family
  legend.querySelectorAll('button').forEach(b => {
    const on = () => { grid.classList.add('dim-others'); grid.querySelectorAll('.pc').forEach(c => c.classList.toggle('grp-hl', c.dataset.group === b.dataset.group)); };
    const off = () => grid.classList.remove('dim-others');
    b.addEventListener('mouseenter', on);
    b.addEventListener('mouseleave', off);
    b.addEventListener('focus', on);
    b.addEventListener('blur', off);
    b.addEventListener('click', () => { const first = P.find(p => p.g === b.dataset.group); select(first.id); });
  });

  renderGrid();
  select(selected);
  document.addEventListener('langchange', () => { renderGrid(); select(selected); });

  // ---- hydrogen: strip the electron ----
  const atom = document.getElementById('hAtom');
  const stripBtn = document.getElementById('stripBtn');
  stripBtn.onclick = () => {
    const on = atom.classList.toggle('stripped');
    stripBtn.innerHTML = on
      ? T({ en: 'Put it back', el: 'Βάλ\' το πίσω' })
      : T({ en: 'Strip the electron', el: 'Αφαίρεσε το ηλεκτρόνιο' });
    if (on) { App.toast({ en: 'A bare proton, ready for the accelerator.', el: 'Ένα γυμνό πρωτόνιο, έτοιμο για τον επιταχυντή.' }); App.vibrate(20); }
  };
  App.on('particles', { leave() { atom.classList.remove('stripped'); stripBtn.innerHTML = T({ en: 'Strip the electron', el: 'Αφαίρεσε το ηλεκτρόνιο' }); } });
})();
