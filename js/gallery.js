// =========================================================
//  gallery.js — my photos, with filters and a lightbox
//  (to add a photo: put it in assets/photos/ as NAME.webp +
//   NAME-sm.webp and add a line to PHOTOS below)
// =========================================================

(() => {
  const CATS = {
    all: { en: 'All', el: 'Όλες' },
    gateway: { en: 'Science Gateway', el: 'Science Gateway' },
    alice: { en: 'ALICE', el: 'ALICE' },
    lab: { en: 'Hands-on', el: 'Στην πράξη' },
    moments: { en: 'Moments', el: 'Στιγμές' }
  };

  const PHOTOS = [
    { f: '20260926-wa0031', cat: 'alice', cap: { en: 'The ALICE detector in its underground cavern: the huge red magnet, up close', el: 'Ο ανιχνευτής ALICE στο υπόγειο σπήλαιό του: ο τεράστιος κόκκινος μαγνήτης από κοντά' } },
    { f: '20260927-wa0027', cat: 'moments', cap: { en: 'Our group at night, with the Globe of Science and Innovation glowing behind us', el: 'Η ομάδα μας το βράδυ, με τη Σφαίρα της Επιστήμης και της Καινοτομίας να λάμπει πίσω μας' } },
    { f: '20260926-wa0074', cat: 'gateway', cap: { en: 'A giant sculpture floating inside the Science Gateway tube', el: 'Ένα γιγάντιο γλυπτό που «αιωρείται» μέσα στον σωλήνα του Science Gateway' } },
    { f: '20260927-wa0034', cat: 'lab', cap: { en: 'Cloud chambers in the dark: watching cosmic particles leave trails', el: 'Θάλαμοι νεφώσεως στο σκοτάδι: βλέπουμε κοσμικά σωματίδια να αφήνουν ίχνη' } },
    { f: '20260927-wa0021', cat: 'alice', cap: { en: 'ALICE from above: 10,000 tonnes of detector, 56 m under the ground', el: 'Το ALICE από ψηλά: 10.000 τόνοι ανιχνευτή, 56 m κάτω από τη γη' } },
    { f: '20260926-wa0043', cat: 'gateway', cap: { en: 'Inside an LHC dipole magnet: the two holes are the two beam pipes, one for each direction', el: 'Μέσα σε έναν δίπολο μαγνήτη του LHC: οι δύο τρύπες είναι οι δύο σωλήνες δέσμης, μία για κάθε κατεύθυνση' } },
    { f: '20260926_145132', cat: 'alice', cap: { en: 'The ALICE building, with the detector painted on the wall', el: 'Το κτίριο του ALICE, με τον ανιχνευτή ζωγραφισμένο στον τοίχο' } },
    { f: '20260927-wa0029', cat: 'alice', cap: { en: 'Helmets on, going underground', el: 'Κράνη στο κεφάλι, πάμε κάτω από τη γη' } },
    { f: '20260926-wa0030', cat: 'gateway', cap: { en: 'A real piece of ALICE, up close: every one of those cables carries signals from the detector', el: 'Ένα πραγματικό κομμάτι του ALICE από κοντά: κάθε καλώδιο μεταφέρει σήματα από τον ανιχνευτή' } },
    { f: '20260927-wa0024', cat: 'lab', cap: { en: '"How does the cloud chamber work?" The workshop begins', el: '«Πώς δουλεύει ο θάλαμος νεφώσεως;» Ξεκινάει το εργαστήριο' } },
    { f: '20260927-wa0018', cat: 'alice', cap: { en: 'The ALICE Run Control Center: "where the journey of discovery begins"', el: 'Το ALICE Run Control Center: «εκεί που ξεκινά το ταξίδι της ανακάλυψης»' } },
    { f: '20260926-wa0064', cat: 'gateway', cap: { en: 'The Science Gateway: tubes inspired by the accelerators themselves', el: 'Το Science Gateway: σωλήνες εμπνευσμένοι από τους ίδιους τους επιταχυντές' } },
    { f: '20260927-wa0025', cat: 'alice', cap: { en: 'Looking up the access shaft from the ALICE cavern', el: 'Κοιτάζοντας ψηλά το φρεάτιο πρόσβασης από το σπήλαιο του ALICE' } },
    { f: '20260927-wa0028', cat: 'lab', cap: { en: 'Everyone leaning in to see the tracks', el: 'Όλοι σκυμμένοι για να δούμε τα ίχνη' } },
    { f: '20260926-wa0029', cat: 'gateway', cap: { en: 'Detector electronics: thousands of cables, all needed to read one collision', el: 'Ηλεκτρονικά ανιχνευτή: χιλιάδες καλώδια για να «διαβαστεί» μία σύγκρουση' } },
    { f: '20260927-wa0014', cat: 'alice', cap: { en: 'Learning about ALICE at the visitor centre', el: 'Μαθαίνοντας για το ALICE στο κέντρο επισκεπτών' } },
    { f: '20260926-wa0054', cat: 'gateway', cap: { en: 'Vacuum and cryogenics: the "plumbing" that makes physics possible', el: 'Κενό και κρυογονική: τα «υδραυλικά» που κάνουν τη φυσική δυνατή' } },
    { f: '20260927-wa0031', cat: 'alice', cap: { en: 'The ALICE site, on a perfect September morning', el: 'Οι εγκαταστάσεις του ALICE, ένα τέλειο πρωινό του Σεπτέμβρη' } },
    { f: '20260926-wa0067', cat: 'gateway', cap: { en: 'A beamline on an optical table, where every millimetre matters', el: 'Μια γραμμή δέσμης πάνω σε οπτικό τραπέζι, όπου κάθε χιλιοστό μετράει' } },
    { f: '20260927-wa0032', cat: 'lab', cap: { en: 'The glow of the chambers was the only light in the room', el: 'Η λάμψη των θαλάμων ήταν το μόνο φως στο δωμάτιο' } },
    { f: '20260926-wa0050', cat: 'gateway', cap: { en: 'The same sculpture from below', el: 'Το ίδιο γλυπτό από κάτω' } },
    { f: '20260927-wa0023', cat: 'alice', cap: { en: 'A corridor full of history: photos from the building of the experiments', el: 'Ένας διάδρομος γεμάτος ιστορία: φωτογραφίες από την κατασκευή των πειραμάτων' } },
    { f: '20260927-wa0026', cat: 'lab', cap: { en: 'The labs at the Science Gateway, where school groups do real experiments', el: 'Τα εργαστήρια στο Science Gateway, όπου οι σχολικές ομάδες κάνουν αληθινά πειράματα' } },
    { f: '20260926-wa0042', cat: 'gateway', cap: { en: 'Accelerator hardware under blue light', el: 'Εξοπλισμός επιταχυντή κάτω από μπλε φως' } },
    { f: '20260927-wa0030', cat: 'lab', cap: { en: 'Setting up the cloud chambers', el: 'Στήνοντας τους θαλάμους νεφώσεως' } },
    { f: '20260926-wa0066', cat: 'gateway', cap: { en: 'Walking through the tube', el: 'Περπατώντας μέσα στον σωλήνα' } },
    { f: '20260926-wa0073', cat: 'gateway', cap: { en: 'Precision instruments: vacuum gauges, magnets and sensors', el: 'Όργανα ακριβείας: μετρητές κενού, μαγνήτες και αισθητήρες' } },
    { f: '20260925-wa0022', cat: 'moments', cap: { en: 'Friday: our first meeting at CERN', el: 'Παρασκευή: η πρώτη μας συνάντηση στο CERN' } }
  ];

  const gal = document.getElementById('gallery');
  const filters = document.getElementById('galFilters');
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCap = document.getElementById('lbCap');
  let filter = 'all', visible = [], idx = 0;

  const DAYS = {
    25: { en: 'Friday', el: 'Παρασκευή' },
    26: { en: 'Saturday', el: 'Σάββατο' },
    27: { en: 'Sunday', el: 'Κυριακή' }
  };
  const dateOf = f => {
    const m = f.match(/202609(\d\d)/);
    return m && DAYS[+m[1]] ? T(DAYS[+m[1]]) : '';
  };

  function renderFilters() {
    filters.innerHTML = '';
    Object.keys(CATS).forEach(k => {
      const n = k === 'all' ? PHOTOS.length : PHOTOS.filter(p => p.cat === k).length;
      const b = document.createElement('button');
      b.className = k === filter ? 'active' : '';
      b.innerHTML = `${T(CATS[k])}<span>${n}</span>`;
      b.onclick = () => { filter = k; renderFilters(); applyFilter(); };
      filters.appendChild(b);
    });
  }

  function renderGallery() {
    gal.innerHTML = '';
    PHOTOS.forEach((p, i) => {
      const fig = document.createElement('figure');
      fig.className = 'shot';
      fig.dataset.cat = p.cat;
      fig.dataset.i = i;
      fig.innerHTML = `<img loading="lazy" decoding="async" src="assets/photos/${p.f}-sm.webp" alt=""><figcaption><span class="tagline">${T(CATS[p.cat])} · ${dateOf(p.f)}</span>${T(p.cap)}</figcaption>`;
      const img = fig.querySelector('img');
      img.alt = T(p.cap);
      img.onload = () => img.classList.add('loaded');
      if (img.complete) img.classList.add('loaded');
      fig.onclick = () => open(i);
      gal.appendChild(fig);
    });
    applyFilter();
  }

  function applyFilter() {
    visible = [];
    gal.querySelectorAll('.shot').forEach(s => {
      const show = filter === 'all' || s.dataset.cat === filter;
      s.classList.toggle('hide', !show);
      if (show) visible.push(+s.dataset.i);
    });
  }

  function show(i) {
    idx = i;
    const p = PHOTOS[i];
    lbImg.classList.add('swap');
    const img = new Image();
    img.onload = () => {
      lbImg.src = img.src;
      lbImg.alt = T(p.cap);
      lbImg.classList.remove('swap');
    };
    img.src = `assets/photos/${p.f}.webp`;
    lbCap.textContent = T(p.cap);
  }
  function open(i) {
    show(i);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }
  function close() { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); }
  function move(d) {
    const k = visible.indexOf(idx);
    show(visible[(k + d + visible.length) % visible.length]);
  }

  lb.querySelector('.lb-close').onclick = close;
  lb.querySelector('.lb-prev').onclick = e => { e.stopPropagation(); move(-1); };
  lb.querySelector('.lb-next').onclick = e => { e.stopPropagation(); move(1); };
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowLeft') move(-1);
  });
  let sx = 0;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
  }, { passive: true });

  renderFilters();
  renderGallery();
  document.addEventListener('langchange', () => { renderFilters(); renderGallery(); if (lb.classList.contains('open')) show(idx); });
  App.on('visit', { leave: close });
})();
