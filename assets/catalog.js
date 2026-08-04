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
    count.textContent = shown ? 'Выпусков: ' + shown : '';
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
    count.textContent = (parts.length || query) ? 'Найдено: ' + shown : '';
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
