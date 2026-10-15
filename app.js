(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MENU = window.PAPAKHA_MENU || [];
  const fmt = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Шапка и навигация ---------- */
  const header = $('.header');
  const burger = $('#burger');
  const nav = $('#nav');
  const dock = $('#dock');
  const setNav = open => {
    burger.setAttribute('aria-expanded', open);
    nav.classList.toggle('is-open', open);
  };
  burger.addEventListener('click', () => setNav(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setNav(false)));

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    dock.classList.toggle('is-visible', y > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // подсветка активного раздела в навигации
  const navLinks = $$('a', nav);
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['menu', 'about', 'gallery', 'visit'].forEach(id => sectionObs.observe(document.getElementById(id)));

  /* ---------- Открыто / закрыто (время Махачкалы, UTC+3) ---------- */
  const HOURS = { 0: [9, 24], 1: [8, 24], 2: [8, 24], 3: [8, 24], 4: [8, 24], 5: [8, 24], 6: [8, 24] };
  const local = () => {
    const now = new Date();
    return new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
  };
  const updateStatus = () => {
    const t = local();
    const day = t.getDay();
    const h = t.getHours() + t.getMinutes() / 60;
    const [from, to] = HOURS[day];
    const fridayBreak = day === 5 && h >= 11 && h < 14;
    const open = h >= from && h < to && !fridayBreak;
    const el = $('#status');
    el.classList.toggle('is-closed', !open);
    let text;
    if (open) text = 'Открыто до 00:00';
    else if (fridayBreak) text = 'Перерыв до 14:00';
    else text = `Откроемся в ${String(HOURS[h < from ? day : (day + 1) % 7][0]).padStart(2, '0')}:00`;
    $('b', el).textContent = text;
    $$('#hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === day));
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Меню ---------- */
  const list = $('#menuList');
  const chips = $('#chips');
  const search = $('#search');
  const empty = $('#menuEmpty');
  const bar = $('#menuBar');

  const highlight = (text, q) => {
    const safe = esc(text);
    if (!q) return safe;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return safe;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  };

  const itemHTML = (it, q) => {
    const tag = it.tag === 'sign' ? '<i class="tag tag--sign">Papakha</i>' : it.tag === 'hit' ? '<i class="tag tag--hit">Хит</i>' : '';
    const prices = it.v.map(([size, p]) => `<span class="price"><small>${size}</small><b>${fmt(p)}</b></span>`).join('');
    return `<li class="item">
      <span class="item__name">${tag}${highlight(it.n, q)}</span>
      <span class="item__prices">${prices}</span>
      ${it.d ? `<p class="item__desc">${highlight(it.d, q)}</p>` : ''}
    </li>`;
  };

  const render = (q = '') => {
    q = q.trim().toLowerCase().replace(/ё/g, 'е');
    const norm = s => s.toLowerCase().replace(/ё/g, 'е');
    let total = 0;
    list.innerHTML = MENU.map(cat => {
      const items = q ? cat.items.filter(it => norm(it.n + ' ' + it.d).includes(q)) : cat.items;
      total += items.length;
      if (!items.length) return '';
      return `<section class="cat" id="cat-${cat.id}" data-cat="${cat.id}">
        <header class="cat__head">
          <h3>${cat.title}</h3>
          <span class="cat__count">${items.length}</span>
          ${cat.note && !q ? `<p class="cat__note">${cat.note}</p>` : ''}
        </header>
        <ul class="items" role="list" style="list-style:none;margin:0;padding:0">${items.map(it => itemHTML(it, q)).join('')}</ul>
      </section>`;
    }).join('');
    empty.hidden = total > 0;
    $$('.chip', chips).forEach(c => { c.hidden = !!q && !document.getElementById('cat-' + c.dataset.cat); });
    observeCats();
  };

  chips.innerHTML = MENU.map((c, i) =>
    `<button class="chip${i === 0 ? ' is-active' : ''}" role="tab" data-cat="${c.id}">${c.title}</button>`).join('');

  const goToCat = id => {
    const el = document.getElementById('cat-' + id);
    if (!el) return;
    const offset = header.offsetHeight + bar.offsetHeight - 24;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
  };
  chips.addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (c) goToCat(c.dataset.cat);
  });

  let activeLock = false;
  const setActiveChip = id => {
    $$('.chip', chips).forEach(c => {
      const on = c.dataset.cat === id;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', on);
      if (on && !activeLock) {
        const left = c.offsetLeft - chips.clientWidth / 2 + c.offsetWidth / 2;
        chips.scrollTo({ left, behavior: 'smooth' });
      }
    });
  };

  let catObs;
  function observeCats() {
    catObs && catObs.disconnect();
    catObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveChip(e.target.dataset.cat); });
    }, { rootMargin: '-30% 0px -65% 0px' });
    $$('.cat', list).forEach(s => catObs.observe(s));
  }

  let t;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => render(search.value), 120);
  });

  // липкая панель меню — тень при прилипании
  new IntersectionObserver(([e]) => bar.classList.toggle('is-stuck', e.intersectionRatio < 1),
    { rootMargin: `-${header.offsetHeight + 1}px 0px 0px 0px`, threshold: [1] }).observe(bar);

  // карточки «С чего начать» ведут к нужной категории
  $$('[data-jump]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    search.value = '';
    render();
    goToCat(a.dataset.jump);
  }));

  render();

  /* ---------- Галерея ---------- */
  const shots = () => $$('.g');
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  let idx = 0;
  const show = i => {
    const all = shots();
    idx = (i + all.length) % all.length;
    lbImg.src = all[idx].dataset.full;
    lbImg.alt = $('img', all[idx]).alt;
  };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; shots()[idx]?.focus(); };
  $('#galleryGrid').addEventListener('click', e => {
    const b = e.target.closest('.g');
    if (!b) return;
    show(shots().indexOf(b)); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus();
  });
  $('#lbClose').addEventListener('click', close);
  $('#lbPrev').addEventListener('click', () => show(idx - 1));
  $('#lbNext').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  // если фото с Яндекса не загрузилось — прячем плитку, чтобы не было дыр
  $$('.g img, .hit img').forEach(img => img.addEventListener('error', () => {
    const tile = img.closest('.g');
    if (tile) tile.remove(); else img.remove();
  }));

  /* ---------- Плавное появление ---------- */
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealObs.unobserve(e.target); }
    });
  }, { threshold: .12 });
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 80 + 'ms';
    revealObs.observe(el);
  });
})();
