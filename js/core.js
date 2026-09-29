// =========================================================
//  core.js — router, transitions, language, menu, helpers
// =========================================================

const App = (() => {
  const chapters = [...document.querySelectorAll('.chapter')];
  const ids = chapters.map(c => c.dataset.id);
  const hooks = {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = null;
  let leaveTimer = null;

  // ---------- language ----------
  const lang = () => document.documentElement.lang === 'el' ? 'el' : 'en';
  const T = o => (o == null ? '' : typeof o === 'string' ? o : (o[lang()] ?? o.en));

  function setLang(l) {
    document.documentElement.lang = l;
    try { localStorage.setItem('lang', l); } catch (e) {}
    updateChrome();
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }

  // ---------- chapter hooks ----------
  // App.on('scale', { enter() {}, leave() {} })
  function on(id, h) {
    (hooks[id] ||= []).push(h);
    if (current === id && h.enter) h.enter();
  }

  // ---------- navigation ----------
  function go(id) {
    if (!ids.includes(id)) id = 'home';
    if (id === current) return;

    const next = chapters[ids.indexOf(id)];
    const prevId = current;
    const prev = prevId ? chapters[ids.indexOf(prevId)] : null;
    const dir = prevId ? Math.sign(ids.indexOf(id) - ids.indexOf(prevId)) || 1 : 1;

    // clean up a transition that's still running
    clearTimeout(leaveTimer);
    chapters.forEach(c => { if (c !== prev && c !== next) c.classList.remove('active', 'leaving', 'entering'); });

    if (prevId) (hooks[prevId] || []).forEach(h => h.leave && h.leave());
    current = id;

    const show = () => {
      if (prev) prev.classList.remove('active', 'leaving');
      next.scrollTop = 0;
      next.style.setProperty('--dir', dir);
      next.classList.add('active', 'entering');
      next.querySelectorAll('.rv.in').forEach(el => el.classList.remove('in'));
      observeReveals(next);
      setTimeout(() => next.classList.remove('entering'), 850);
      (hooks[id] || []).forEach(h => h.enter && h.enter());
    };

    if (prev && !reduced) {
      prev.style.setProperty('--dir', dir);
      prev.classList.add('leaving');
      if (typeof BG !== 'undefined') BG.warp(dir);
      sweep(dir);
      leaveTimer = setTimeout(show, 360);
    } else {
      show();
    }

    updateChrome();
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
  }

  function step(d) {
    const i = ids.indexOf(current) + d;
    if (i >= 0 && i < ids.length) location.hash = ids[i];
  }

  function sweep(dir) {
    const s = document.querySelector('.sweep');
    s.classList.remove('go', 'rev');
    void s.offsetWidth;
    s.classList.add('go');
    if (dir < 0) s.classList.add('rev');
  }

  // ---------- top bar / pager / menu state ----------
  const titleEl = document.getElementById('chapterTitle');
  const bar = document.getElementById('progressBar');
  const dotsEl = document.getElementById('pagerDots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const chapterName = c => T({ en: c.dataset.en, el: c.dataset.el });
  const pad = n => String(n).padStart(2, '0');

  function updateChrome() {
    const i = ids.indexOf(current);
    if (i < 0) return;
    titleEl.innerHTML = i === 0 ? '' : `<b>${pad(i)}</b>${chapterName(chapters[i])}`;
    bar.style.width = (i / (ids.length - 1) * 100) + '%';
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === ids.length - 1;
    [...dotsEl.children].forEach((d, k) => d.classList.toggle('on', k === i));
    document.querySelectorAll('.menu-list a').forEach((a, k) => a.classList.toggle('on', k === i));
    document.querySelectorAll('.menu-ring .st').forEach((s, k) => s.classList.toggle('on', k === i));
    document.title = (i === 0 ? '' : chapterName(chapters[i]) + ' · ') + T({ en: 'My Weekend at CERN', el: 'Το τριήμερό μου στο CERN' });
    document.querySelectorAll('.next-card').forEach(nc => {
      const j = +nc.dataset.next;
      nc.querySelector('strong').textContent = chapterName(chapters[j]);
    });
    document.querySelectorAll('.menu-list a b').forEach((b, k) => b.textContent = chapterName(chapters[k]));
  }

  function buildChrome() {
    // pager dots
    ids.forEach((id, i) => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', 'Chapter ' + (i + 1));
      b.onclick = () => location.hash = id;
      dotsEl.appendChild(b);
    });
    prevBtn.onclick = () => step(-1);
    nextBtn.onclick = () => step(1);

    // "next chapter" card at the end of every chapter
    chapters.forEach((c, i) => {
      if (i === 0 || i === chapters.length - 1) return;
      const a = document.createElement('a');
      a.className = 'next-card';
      a.href = '#' + ids[i + 1];
      a.dataset.next = i + 1;
      a.innerHTML = `<div><small>${pad(i + 1)} · <t-en>Next up</t-en><t-el>Επόμενο</t-el></small><strong></strong></div><span class="go">→</span>`;
      c.querySelector('.inner').appendChild(a);
    });

    // menu list + ring
    const list = document.getElementById('menuList');
    const ring = document.getElementById('menuRing');
    const cx = 200, cy = 200, R = 150;
    let svg = `<circle class="r-main" cx="${cx}" cy="${cy}" r="${R}"/>
      <circle class="r-beam" cx="${cx}" cy="${cy}" r="${R}"/>
      <circle class="r-beam r-beam2" cx="${cx}" cy="${cy}" r="${R}"/>
      <text class="center-t" x="${cx}" y="${cy + 4}">CERN</text>
      <text class="center-s" x="${cx}" y="${cy + 26}">JOURNEY</text>`;
    ids.forEach((id, i) => {
      const a = -Math.PI / 2 + i / ids.length * Math.PI * 2;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      svg += `<g class="st" data-id="${id}"><circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y}">${pad(i)}</text></g>`;
      const li = document.createElement('li');
      li.style.setProperty('--i', i);
      li.innerHTML = `<a href="#${id}"><span>${pad(i)}</span><b></b></a>`;
      list.appendChild(li);
    });
    ring.innerHTML = svg;
    ring.querySelectorAll('.st').forEach(g => g.onclick = () => { location.hash = g.dataset.id; closeMenu(); });
    list.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  }

  const menu = document.getElementById('menu');
  function openMenu() { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); }
  function closeMenu() { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }

  // ---------- reveal on scroll ----------
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
        e.target.querySelectorAll('[data-count]').forEach(countUp);
        if (e.target.matches('[data-count]')) countUp(e.target);
      }
    });
  }, { threshold: 0.12 }) : null;

  function observeReveals(root) {
    root.querySelectorAll('.rv').forEach(el => {
      if (io && !reduced) io.observe(el);
      else el.classList.add('in');
    });
  }

  // ---------- count-up numbers ----------
  function countUp(el) {
    if (reduced) return;
    const target = +el.dataset.count;
    const prefix = el.dataset.prefix || '';
    const year = target > 1900 && target < 2100;
    const t0 = performance.now(), dur = 1400;
    const fmt = v => year ? String(Math.round(v)) : Math.round(v).toLocaleString('en-US');
    (function f(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + fmt(year ? target - (1 - e) * 60 : target * e);
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  // ---------- toast ----------
  let toastT;
  function toast(msg, ms = 2600) {
    const t = document.getElementById('toast');
    t.textContent = T(msg);
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- small helpers used by the simulations ----------
  // Makes a canvas sharp on retina screens. Returns {ctx, w, h}.
  function fitCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // A requestAnimationFrame loop you can start/stop (so hidden chapters don't waste battery)
  function loop(fn) {
    let id = null, last = 0;
    const tick = t => {
      const dt = Math.min(50, t - (last || t));
      last = t;
      fn(dt, t);
      id = requestAnimationFrame(tick);
    };
    return {
      start() { if (id == null) { last = 0; id = requestAnimationFrame(tick); } },
      stop() { if (id != null) cancelAnimationFrame(id); id = null; },
      get running() { return id != null; }
    };
  }

  const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  // ---------- init ----------
  function init() {
    buildChrome();

    document.getElementById('langBtn').onclick = () => setLang(lang() === 'en' ? 'el' : 'en');
    document.getElementById('menuBtn').onclick = openMenu;
    document.getElementById('menuClose').onclick = closeMenu;
    document.querySelectorAll('[data-open-menu]').forEach(b => b.onclick = openMenu);

    window.addEventListener('hashchange', () => go(location.hash.slice(1)));

    // keyboard
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (document.querySelector('.lightbox.open, .modal.open')) return;
      if (e.key === 'Escape') closeMenu();
      if (menu.classList.contains('open')) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });

    // swipe between chapters (not on simulations)
    let sx = 0, sy = 0, st = 0, ok = false;
    const main = document.getElementById('chapters');
    main.addEventListener('touchstart', e => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now();
      ok = !e.target.closest('.no-swipe, input, .gallery, .lightbox, .modal');
    }, { passive: true });
    main.addEventListener('touchend', e => {
      if (!ok) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st < 600 && Math.abs(dx) > 70 && Math.abs(dy) < 60) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    // author details from config.js
    const c = typeof CONFIG !== 'undefined' ? CONFIG : {};
    document.querySelectorAll('[data-author-name]').forEach(e => e.textContent = c.name || '');
    document.querySelectorAll('[data-author-school]').forEach(e => e.textContent = c.school || '');
    document.querySelectorAll('[data-author-age]').forEach(e => e.textContent = c.age ? c.age + ' ' + T({ en: 'years old', el: 'ετών' }) : '');
    document.addEventListener('langchange', () => {
      document.querySelectorAll('[data-author-age]').forEach(e => e.textContent = c.age ? c.age + ' ' + T({ en: 'years old', el: 'ετών' }) : '');
    });

    go(location.hash.slice(1) || 'home');
  }

  return { init, on, go, step, T, lang, toast, fitCanvas, loop, vibrate, reduced, get current() { return current; } };
})();

const T = App.T;
