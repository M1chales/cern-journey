// =========================================================
//  beyond.js — "CERN is more than the LHC" cards + popup
// =========================================================

(() => {
  const grid = document.getElementById('beyondGrid');
  const modal = document.getElementById('beyondModal');
  const body = document.getElementById('beyondModalBody');

  const ITEMS = [
    { icon: '', c: '#ffd166',
      title: { en: 'Fixed-target experiments', el: 'Πειράματα σταθερού στόχου' },
      short: { en: 'Aim the beam at a block of material and use what comes out.', el: 'Στόχευσε τη δέσμη σε ένα κομμάτι υλικού και χρησιμοποίησε ό,τι βγαίνει.' },
      sub: { en: 'North Area · beamlines H2, H4, H6, H8', el: 'Βόρεια Περιοχή · γραμμές H2, H4, H6, H8' },
      points: [
        { en: 'SPS protons hit a target and produce secondary beams: pions, kaons, muons, electrons.', el: 'Πρωτόνια του SPS χτυπούν έναν στόχο και βγάζουν δευτερεύουσες δέσμες: πιόνια, καόνια, μιόνια, ηλεκτρόνια.' },
        { en: 'Research groups bring new detectors here to try them out on a known, well-behaved beam before using them for real.', el: 'Ερευνητικές ομάδες φέρνουν εδώ νέους ανιχνευτές για να τους δοκιμάσουν σε μια γνωστή, «ήσυχη» δέσμη πριν τους χρησιμοποιήσουν στ\' αλήθεια.' },
        { en: 'Magnets along the line shape and focus these beams.', el: 'Μαγνήτες κατά μήκος της γραμμής διαμορφώνουν και εστιάζουν αυτές τις δέσμες.' }
      ] },
    { icon: '', c: '#ff7a3d',
      title: { en: 'HiRadMat', el: 'HiRadMat' },
      short: { en: 'Where materials get hit on purpose.', el: 'Εκεί όπου τα υλικά χτυπιούνται επίτηδες.' },
      sub: { en: 'High-Radiation to Materials · since 2011', el: 'High-Radiation to Materials · από το 2011' },
      points: [
        { en: 'Samples are hit with very intense pulses from the SPS.', el: 'Δείγματα δέχονται πολύ έντονους παλμούς από το SPS.' },
        { en: 'The point is to learn what survives a beam hit before it happens by accident inside an accelerator.', el: 'Ο σκοπός είναι να μάθουμε τι αντέχει ένα χτύπημα δέσμης πριν συμβεί κατά λάθος μέσα σε έναν επιταχυντή.' }
      ] },
    { icon: '', c: '#9ad8ff',
      title: { en: 'n_TOF', el: 'n_TOF' },
      short: { en: 'Timing neutrons over a 185 m flight.', el: 'Χρονομέτρηση νετρονίων σε μια πτήση 185 m.' },
      sub: { en: 'neutron Time-Of-Flight', el: 'neutron Time-Of-Flight' },
      points: [
        { en: 'Neutrons have no charge, so magnets can\'t push or steer them.', el: 'Τα νετρόνια δεν έχουν φορτίο, άρα οι μαγνήτες δεν μπορούν ούτε να τα σπρώξουν ούτε να τα στρίψουν.' },
        { en: 'Instead, 20 GeV/c protons hit a lead block and knock neutrons loose; their energy is found from how long they take to fly 185 m.', el: 'Αντί γι\' αυτό, πρωτόνια 20 GeV/c χτυπούν ένα κομμάτι μολύβδου και «ξεκολλάνε» νετρόνια· η ενέργειά τους βρίσκεται από το πόσο κάνουν να πετάξουν 185 m.' },
        { en: 'The results matter for nuclear reactors and for how stars make elements.', el: 'Τα αποτελέσματα μετράνε για τους πυρηνικούς αντιδραστήρες και για το πώς τα αστέρια φτιάχνουν στοιχεία.' }
      ] },
    { icon: '', c: '#2ee59d',
      title: { en: 'ISOLDE', el: 'ISOLDE' },
      short: { en: 'Rare, short-lived atomic nuclei made to order.', el: 'Σπάνιοι, βραχύβιοι πυρήνες κατά παραγγελία.' },
      sub: { en: 'Isotope Separator On-Line', el: 'Isotope Separator On-Line' },
      points: [
        { en: 'Beams from the PS Booster produce more than 1000 different isotopes.', el: 'Δέσμες από τον PS Booster παράγουν πάνω από 1000 διαφορετικά ισότοπα.' },
        { en: 'Used in nuclear physics, astrophysics, materials science and medicine.', el: 'Χρησιμοποιούνται στην πυρηνική φυσική, την αστροφυσική, την επιστήμη υλικών και την ιατρική.' }
      ] },
    { icon: '', c: '#b38bff',
      title: { en: 'Antimatter Factory', el: 'Εργοστάσιο Αντιύλης' },
      short: { en: 'Slowing antiprotons down instead of speeding them up.', el: 'Επιβραδύνει αντιπρωτόνια αντί να τα επιταχύνει.' },
      sub: { en: 'Antiproton Decelerator + ELENA', el: 'Antiproton Decelerator + ELENA' },
      points: [
        { en: 'Slow antiprotons can be trapped and combined with positrons into antihydrogen, first made here in 1995.', el: 'Αργά αντιπρωτόνια μπορούν να παγιδευτούν και να ενωθούν με ποζιτρόνια σε αντιυδρογόνο, που φτιάχτηκε πρώτη φορά εδώ το 1995.' },
        { en: 'In 2023 an experiment here showed that antimatter falls down, just like matter.', el: 'Το 2023 ένα πείραμα εδώ έδειξε ότι η αντιύλη πέφτει προς τα κάτω, όπως και η ύλη.' }
      ] },
    { icon: '', c: '#7fd1ff',
      title: { en: 'CLOUD', el: 'CLOUD' },
      short: { en: 'A cloud in a steel tank, to study the climate.', el: 'Ένα σύννεφο σε ατσάλινη δεξαμενή, για τη μελέτη του κλίματος.' },
      sub: { en: 'Cosmics Leaving OUtdoor Droplets', el: 'Cosmics Leaving OUtdoor Droplets' },
      points: [
        { en: 'A very clean chamber reproduces the air of the atmosphere.', el: 'Ένας πολύ καθαρός θάλαμος αναπαράγει τον αέρα της ατμόσφαιρας.' },
        { en: 'A particle beam stands in for cosmic rays, to see how they affect the way clouds start to form.', el: 'Μια δέσμη σωματιδίων παίζει τον ρόλο των κοσμικών ακτίνων, για να φανεί πώς επηρεάζουν το πώς αρχίζουν να σχηματίζονται τα σύννεφα.' }
      ] },
    { icon: '', c: '#ff5fa2',
      title: { en: 'Medicine', el: 'Ιατρική' },
      short: { en: 'Detectors and beams that ended up in hospitals.', el: 'Ανιχνευτές και δέσμες που κατέληξαν σε νοσοκομεία.' },
      sub: { en: 'Imaging and therapy', el: 'Απεικόνιση και θεραπεία' },
      points: [
        { en: 'Hadron therapy: proton or ion beams deposit most of their energy inside a tumour, sparing the tissue around it.', el: 'Αδρονοθεραπεία: δέσμες πρωτονίων ή ιόντων αφήνουν το μεγαλύτερο μέρος της ενέργειάς τους μέσα στον όγκο και γλιτώνουν τον ιστό γύρω του.' },
        { en: 'Detector technology developed for physics is used in medical scanners such as PET.', el: 'Τεχνολογία ανιχνευτών που φτιάχτηκε για τη φυσική χρησιμοποιείται σε ιατρικούς σαρωτές όπως το PET.' }
      ] },
    { icon: '', c: '#4cc9f0',
      title: { en: 'The World Wide Web', el: 'Ο Παγκόσμιος Ιστός' },
      short: { en: 'Invented here so physicists could share documents.', el: 'Εφευρέθηκε εδώ για να μοιράζονται οι φυσικοί έγγραφα.' },
      sub: { en: '1989', el: '1989' },
      points: [
        { en: 'Tim Berners-Lee proposed it at CERN in 1989; the first website went online in 1991.', el: 'Ο Tim Berners-Lee τον πρότεινε στο CERN το 1989· η πρώτη ιστοσελίδα βγήκε online το 1991.' },
        { en: 'In 1993 CERN made it free for anyone to use. This page runs on that decision.', el: 'Το 1993 το CERN τον έκανε ελεύθερο για όλους. Αυτή η σελίδα τρέχει χάρη σε εκείνη την απόφαση.' }
      ] },
    { icon: '', c: '#7b8cff',
      title: { en: 'Computing', el: 'Υπολογιστές' },
      short: { en: 'Too much data for one building.', el: 'Πάρα πολλά δεδομένα για ένα κτίριο.' },
      sub: { en: 'CERN Data Centre + the Grid', el: 'Κέντρο Δεδομένων CERN + το Grid' },
      points: [
        { en: 'The Worldwide LHC Computing Grid links about 170 computing centres in more than 40 countries.', el: 'Το Worldwide LHC Computing Grid συνδέει περίπου 170 υπολογιστικά κέντρα σε πάνω από 40 χώρες.' },
        { en: 'CERN\'s own data centre stores more than an exabyte, a billion gigabytes.', el: 'Το κέντρο δεδομένων του CERN αποθηκεύει πάνω από ένα exabyte, δηλαδή ένα δισεκατομμύριο gigabytes.' }
      ] },
    { icon: '', c: '#2ee59d',
      title: { en: 'Robotics', el: 'Ρομποτική' },
      short: { en: 'Machines that go where people shouldn\'t.', el: 'Μηχανές που πάνε εκεί που δεν πρέπει να πάνε άνθρωποι.' },
      sub: { en: 'Arms, tracked robots, a four-legged robot', el: 'Χέρια, ερπυστριοφόρα, ένα τετράποδο ρομπότ' },
      points: [
        { en: 'Parts of the accelerators become radioactive, so inspections and repairs there are done by robots when possible.', el: 'Κομμάτια των επιταχυντών γίνονται ραδιενεργά, οπότε οι επιθεωρήσεις και οι επισκευές εκεί γίνονται από ρομπότ όπου γίνεται.' }
      ] },
    { icon: '', c: '#ffd166',
      title: { en: 'Science Gateway', el: 'Science Gateway' },
      short: { en: 'CERN\'s visitor and education centre, which we visited.', el: 'Το κέντρο επισκεπτών και εκπαίδευσης του CERN, που επισκεφτήκαμε.' },
      sub: { en: 'Opened October 2023 · architect Renzo Piano', el: 'Άνοιξε τον Οκτώβριο του 2023 · αρχιτέκτονας Renzo Piano' },
      points: [
        { en: 'Long tubes on stilts, built to look like the beam pipes.', el: 'Μακριοί σωλήνες πάνω σε κολόνες, φτιαγμένοι να θυμίζουν τους σωλήνες της δέσμης.' },
        { en: 'Exhibitions with real detector parts, and labs where school groups do experiments, like cloud chambers.', el: 'Εκθέσεις με πραγματικά κομμάτια ανιχνευτών και εργαστήρια όπου οι σχολικές ομάδες κάνουν πειράματα, όπως οι θάλαμοι νεφώσεως.' }
      ] },
    { icon: '', c: '#4cc9f0',
      title: { en: 'Science for peace', el: 'Επιστήμη για την ειρήνη' },
      short: { en: 'Founded to bring European scientists back together.', el: 'Ιδρύθηκε για να ξαναφέρει κοντά τους Ευρωπαίους επιστήμονες.' },
      sub: { en: 'Since 1954', el: 'Από το 1954' },
      points: [
        { en: 'Set up after the Second World War, with Greece among the twelve founding states.', el: 'Στήθηκε μετά τον Β\' Παγκόσμιο Πόλεμο, με την Ελλάδα ανάμεσα στα δώδεκα ιδρυτικά κράτη.' },
        { en: 'Today people from more than 100 countries work on the same questions there.', el: 'Σήμερα άνθρωποι από πάνω από 100 χώρες δουλεύουν εκεί πάνω στα ίδια ερωτήματα.' }
      ] }
  ];

  function render() {
    grid.innerHTML = '';
    ITEMS.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'bcard rv in';
      b.style.setProperty('--c', it.c);
      b.style.setProperty('--i', i % 4);
      b.innerHTML = `<span class="b-icon">${String(i + 1).padStart(2, '0')}</span><h4>${T(it.title)}</h4><p>${T(it.short)}</p><span class="more">${T({ en: 'Read more →', el: 'Περισσότερα →' })}</span>`;
      b.onclick = () => open(i);
      grid.appendChild(b);
    });
  }

  let openIdx = -1;
  function open(i) {
    openIdx = i;
    const it = ITEMS[i];
    body.style.setProperty('--c', it.c);
    body.innerHTML = `<div class="m-icon">${String(i + 1).padStart(2, '0')}</div><h3>${T(it.title)}</h3><p class="m-sub">${T(it.sub)}</p><ul>${it.points.map(p => `<li>${T(p)}</li>`).join('')}</ul>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function close() {
    openIdx = -1;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal-close')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  render();
  document.addEventListener('langchange', () => { render(); if (openIdx >= 0) open(openIdx); });
  App.on('beyond', { leave: close });
})();
