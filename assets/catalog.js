/* Согласование числительных по-русски: 1 запись, 2 записи, 5 записей. */
function plural(n, one, few, many) {
  n = Math.abs(n | 0);
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14)) return few;
  return many;
}

/* Фильтры каталога. Карточки уже отрендерены в HTML — JS только прячет лишние,
   поэтому без JS каталог остаётся полным и рабочим. Состояние живёт в URL. */
(function () {
  var list = document.getElementById('list');
  if (!list) return;

  var cards = [].slice.call(list.querySelectorAll('[data-topics]'));
  var chips = [].slice.call(document.querySelectorAll('.chip[data-topic],.chip[data-plat],.chip[data-book]'));
  var search = document.getElementById('q');
  var count = document.getElementById('count');
  var reset = document.getElementById('reset');

  var state = { topics: [], plats: [], book: false, q: '' };

  function matches(card) {
    if (state.book && card.dataset.book !== '1') return false;
    if (state.topics.length) {
      var t = card.dataset.topics.split(',');
      if (!state.topics.some(function (x) { return t.indexOf(x) > -1; })) return false;
    }
    if (state.plats.length) {
      var p = card.dataset.plats.split(',');
      if (!state.plats.some(function (x) { return p.indexOf(x) > -1; })) return false;
    }
    if (state.q) {
      var hay = card.dataset.search;
      var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.every(function (w) { return hay.indexOf(w) > -1; })) return false;
    }
    return true;
  }

  function apply(pushUrl) {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = matches(c);
      c.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown ? shown + ' ' + plural(shown, 'выпуск', 'выпуска', 'выпусков') : '';
    var empty = document.getElementById('empty');
    if (empty) empty.hidden = shown > 0;

    if (pushUrl !== false) {
      var p = new URLSearchParams();
      if (state.topics.length) p.set('tema', state.topics.join(','));
      if (state.plats.length) p.set('gde', state.plats.join(','));
      if (state.book) p.set('kniga', '1');
      if (state.q) p.set('q', state.q);
      var qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    }
  }

  function syncChips() {
    chips.forEach(function (b) {
      var on = b.dataset.topic ? state.topics.indexOf(b.dataset.topic) > -1
             : b.dataset.plat ? state.plats.indexOf(b.dataset.plat) > -1
             : state.book;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (search) search.value = state.q;
  }

  function toggle(arr, v) {
    var i = arr.indexOf(v);
    if (i > -1) arr.splice(i, 1); else arr.push(v);
  }

  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.topic) toggle(state.topics, b.dataset.topic);
      else if (b.dataset.plat) toggle(state.plats, b.dataset.plat);
      else state.book = !state.book;
      syncChips(); apply();
    });
  });

  if (search) {
    search.addEventListener('input', function () { state.q = search.value.trim(); apply(); });
  }

  if (reset) {
    reset.addEventListener('click', function () {
      state = { topics: [], plats: [], book: false, q: '' };
      syncChips(); apply();
      if (search) search.focus();
    });
  }

  // восстановление из URL при загрузке и по кнопке «назад»
  function fromUrl() {
    var p = new URLSearchParams(location.search);
    state.topics = (p.get('tema') || '').split(',').filter(Boolean);
    state.plats = (p.get('gde') || '').split(',').filter(Boolean);
    state.book = p.get('kniga') === '1';
    state.q = p.get('q') || '';
    syncChips(); apply(false);
  }
  window.addEventListener('popstate', fromUrl);
  fromUrl();
})();

/* Отправка форм в Telegram через воркер. Адрес приёмника кладётся в <meta> при
   сборке; пока он не задан, форма честно говорит, что приём ещё не подключён. */
(function () {
  var meta = document.querySelector('meta[name="form-endpoint"]');
  var endpoint = meta && meta.content;

  [].slice.call(document.querySelectorAll('form[data-form]')).forEach(function (form) {
    var status = form.querySelector('[data-status]');
    var button = form.querySelector('button');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!endpoint) {
        status.textContent = 'Приём заявок ещё не подключён. Напишите нам в Telegram.';
        return;
      }
      var email = form.querySelector('input[type=email]').value.trim();
      button.disabled = true;
      status.textContent = 'Отправляем…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          kind: form.dataset.form,
          company: form.querySelector('input[name=company]').value,
          note: [
            (form.querySelector('input[name=name]') || {}).value,
            (form.querySelector('textarea[name=note]') || {}).value,
          ].filter(Boolean).join('\n'),
        }),
      })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (r) {
          if (r.ok) {
            status.textContent = 'Готово. Напишем, когда книга выйдет.';
            form.querySelector('input[type=email]').value = '';
          } else {
            status.textContent = r.error || 'Не отправилось. Попробуйте ещё раз.';
            button.disabled = false;
          }
        })
        .catch(function () {
          status.textContent = 'Нет связи с сервером. Попробуйте позже.';
          button.disabled = false;
        });
    });
  });
})();

/* Поиск по всему сайту. Индекс подгружается один раз при первом вводе,
   дальше всё считается в браузере — сервер не нужен. Запрос живёт в адресе,
   поэтому результатом можно поделиться ссылкой. */
(function () {
  var input = document.getElementById('gq');
  if (!input) return;
  var out = document.getElementById('gq-out');
  var count = document.getElementById('gq-count');
  var empty = document.getElementById('gq-empty');
  var idx = null, timer = null;

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function mark(text, words) {                 // подсветка совпадений
    var safe = esc(text);
    words.forEach(function (w) {
      safe = safe.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
                          '<mark>$1</mark>');
    });
    return safe;
  }

  function render(q) {
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) { out.innerHTML = ''; count.textContent = ''; empty.hidden = true; return; }
    var hits = idx.filter(function (it) {
      var hay = (it.t + ' ' + it.s + ' ' + it.x).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) > -1; });
    });
    // заголовок важнее описания: сначала то, где совпало прямо в названии
    hits.sort(function (a, b) {
      var an = a.t.toLowerCase().indexOf(words[0]) > -1 ? 0 : 1;
      var bn = b.t.toLowerCase().indexOf(words[0]) > -1 ? 0 : 1;
      return an - bn;
    });
    count.textContent = hits.length ? hits.length + ' ' + plural(hits.length, 'результат', 'результата', 'результатов') : '';
    empty.hidden = hits.length > 0;
    out.innerHTML = hits.slice(0, 60).map(function (it) {
      return '<li class="sr-item"><a href="../' + it.u + '">' +
        '<span class="sr-kind">' + it.k + '</span>' +
        '<b>' + mark(it.t, words) + '</b>' +
        '<i>' + esc(it.s) + '</i></a></li>';
    }).join('');
    history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);
  }

  function run() {
    var q = input.value.trim();
    if (idx) return render(q);
    fetch('index.json').then(function (r) { return r.json(); })
      .then(function (d) { idx = d; render(q); })
      .catch(function () { count.textContent = 'Не удалось загрузить индекс поиска.'; });
  }

  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 120);             // не считаем на каждое нажатие
  });

  var start = new URLSearchParams(location.search).get('q');
  if (start) { input.value = start; run(); }
})();

/* Интерактив ленты цитат: поиск, фильтр по частям, перемешивание,
   копирование и ссылка на конкретную цитату. */
(function () {
  var list = document.getElementById('q-list');
  if (!list) return;
  var cards = [].slice.call(list.children);
  var chips = [].slice.call(document.querySelectorAll('.chip[data-qpart]'));
  var search = document.getElementById('qq');
  var count = document.getElementById('q-count');
  var empty = document.getElementById('q-empty');
  var parts = [], query = '';

  function apply() {
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!parts.length || parts.indexOf(c.dataset.part) > -1) &&
               (!query || query.split(/\s+/).every(function (w) {
                 return c.dataset.search.indexOf(w) > -1;
               }));
      c.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = (parts.length || query) ? shown + ' ' + plural(shown, 'цитата', 'цитаты', 'цитат') : '';
    empty.hidden = shown > 0;
  }

  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = parts.indexOf(b.dataset.qpart);
      if (i > -1) parts.splice(i, 1); else parts.push(b.dataset.qpart);
      b.setAttribute('aria-pressed', i === -1 ? 'true' : 'false');
      apply();
    });
  });
  if (search) search.addEventListener('input', function () {
    query = search.value.trim().toLowerCase(); apply();
  });

  var shuffle = document.getElementById('q-shuffle');
  if (shuffle) shuffle.addEventListener('click', function () {
    cards.sort(function () { return Math.random() - 0.5; })
         .forEach(function (c) { list.appendChild(c); });
    window.scrollTo({ top: list.getBoundingClientRect().top + window.scrollY - 120 });
  });

  function flash(btn, text) {
    var old = btn.textContent;
    btn.textContent = text;
    setTimeout(function () { btn.textContent = old; }, 1400);
  }

  list.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn) return;
    var card = btn.closest('.q-card');
    if (btn.hasAttribute('data-copy')) {
      navigator.clipboard.writeText('«' + card.dataset.quote + '» — ' + card.dataset.author)
        .then(function () { flash(btn, 'Скопировано ✓'); });
    }
    if (btn.hasAttribute('data-share')) {
      var url = location.origin + location.pathname + '#' + card.id;
      if (navigator.share) {
        navigator.share({ text: '«' + card.dataset.quote + '» — ' + card.dataset.author, url: url });
      } else {
        navigator.clipboard.writeText(url).then(function () { flash(btn, 'Ссылка ✓'); });
      }
    }
  });

  // пришли по ссылке на цитату — подсветить и показать, даже если фильтр её прятал
  if (location.hash && /^#q-\d+$/.test(location.hash)) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) {
      target.hidden = false;
      target.scrollIntoView({ block: 'center' });
    }
  }
})();

/* Полоса прочитанного: показывается только там, где есть длинный текст —
   на страницах глав. Считается по позиции самой статьи, а не всей страницы,
   чтобы блоки после текста не смазывали прогресс. */
(function () {
  var bar = document.getElementById('readbar');
  var art = document.querySelector('.ch-body');
  if (!bar || !art) return;
  function upd() {
    var r = art.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var done = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 0;
    bar.style.width = (done * 100).toFixed(1) + '%';
  }
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  upd();
})();

/* Меню закрывается при клике мимо и при переходе по ссылке. */
(function () {
  var m = document.querySelector('.menu');
  if (!m) return;
  document.addEventListener('click', function (ev) {
    if (m.open && !m.contains(ev.target)) m.open = false;
  });
  m.addEventListener('click', function (ev) {
    if (ev.target.closest('.menu-panel a')) m.open = false;
  });
})();

/* Клавиша «/» ставит курсор в поиск — привычка тех, кто много читает. */
(function () {
  addEventListener('keydown', function (ev) {
    if (ev.key !== '/' || ev.metaKey || ev.ctrlKey) return;
    var t = ev.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    var f = document.getElementById('q') || document.getElementById('qq');
    if (f) { ev.preventDefault(); f.focus(); }
  });
})();

/* Схема связей на первом экране: узлы-герои в решётке, соединения — между
   соседями по части книги. Это не декорация: сетка узлов ровно та, что в
   данных. Гор нет — метафора восхождения ушла в типографику и ритм. */
(function () {
  var cv = document.getElementById('lattice');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, t = 0, nodes = [], COLS = 9, ROWS = 7;

  function build() {
    nodes = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      nodes.push({
        gx: c / (COLS - 1), gy: r / (ROWS - 1),
        ph: Math.random() * 6.28,                 // своя фаза дыхания
        on: Math.random() < 0.22,                 // подсвеченные узлы
      });
    }
  }

  function resize() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    var pad = 10, w = W - pad * 2, h = H - pad * 2;

    nodes.forEach(function (n) {
      n.x = pad + n.gx * w;
      n.y = pad + n.gy * h;
      if (!still) n.a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t / 40 + n.ph));
      else n.a = 0.6;
    });

    ctx.lineWidth = 1;                            // связи по горизонтали и вертикали
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = Math.abs(a.gx - b.gx), dy = Math.abs(a.gy - b.gy);
        var near = (dx < 1.01 / (COLS - 1) && dy < 0.01) || (dy < 1.01 / (ROWS - 1) && dx < 0.01);
        if (!near) continue;
        var lit = a.on && b.on;
        ctx.strokeStyle = lit ? 'rgba(218,52,51,' + (0.5 * Math.min(a.a, b.a)) + ')'
                              : 'rgba(27,28,26,' + (0.13 * Math.min(a.a, b.a)) + ')';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    nodes.forEach(function (n) {                  // сами узлы
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.on ? 3.2 : 2, 0, 6.283);
      ctx.fillStyle = n.on ? 'rgba(218,52,51,' + (0.55 + n.a * 0.45) + ')'
                           : 'rgba(27,28,26,' + (0.2 + n.a * 0.35) + ')';
      ctx.fill();
    });

    t++;
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener('resize', function () { resize(); if (still) frame(); });
  build(); resize();
  if (still) frame(); else requestAnimationFrame(frame);
})();

/* Счётчики: числа набегают при появлении в кадре. Без JS в разметке нули,
   поэтому данные зашиты в data-n и подставляются сразу же как фолбэк. */
(function () {
  var els = [].slice.call(document.querySelectorAll('[data-n]'));
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.textContent = el.dataset.n; });
    return;
  }
  els.forEach(function (el) { el.textContent = '0'; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      var end = +en.target.dataset.n, t0 = null;
      (function tick(t) {
        if (!t0) t0 = t;
        var k = Math.min((t - t0) / 900, 1);
        en.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      })(performance.now());
    });
  }, { threshold: 0.6 });
  els.forEach(function (el) { io.observe(el); });
})();

/* Ротация цитаты на главной: пул зашит в страницу при сборке,
   при каждом открытии показывается случайная. Без JS остаётся первая. */
(function () {
  var pool = document.getElementById('rq-pool');
  if (!pool) return;
  var list = JSON.parse(pool.textContent);
  var bq = document.querySelector('#rq p');
  var cite = document.getElementById('rq-a');
  var next = document.getElementById('rq-next');

  function show(q) {
    bq.textContent = q.t;
    cite.innerHTML = '<a href="' + q.u + '" style="text-decoration:none;color:inherit">' + q.a + '</a>';
  }
  function pick() { return list[Math.floor(Math.random() * list.length)]; }

  if (bq) show(pick());
  if (next) {
    next.hidden = false;
    next.addEventListener('click', function () { show(pick()); });
  }
})();

/* Появление блоков при скролле. Без JS всё остаётся видимым — класс .reveal
   ставится здесь же, а не в разметке, поэтому ничего не пропадает. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px' });
  [].slice.call(document.querySelectorAll('[data-reveal]')).forEach(function (el) {
    el.classList.add('reveal'); io.observe(el);
  });
})();
