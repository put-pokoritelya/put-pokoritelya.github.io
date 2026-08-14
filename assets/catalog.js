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

/* Хребет проекта: 57 вершин в 3D. У каждого героя своя настоящая гора —
   высота пика пропорциональна реальной, а место в массиве зависит от неё же:
   восьмитысячники в центре, невысокие по краям. Гребни связывают соседей
   по части книги. Проекция, сортировка по глубине и силуэты — вручную,
   без библиотек. */
(function () {
  var cv = document.getElementById('globe');
  if (!cv) return;
  var data = JSON.parse(document.getElementById('globe-data').textContent);
  var ctx = cv.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, S, rot = 0.5, tilt = 0.44, drag = null, hot = null;

  var hMin = Math.min.apply(null, data.map(function (d) { return d.h; }));
  var hMax = Math.max.apply(null, data.map(function (d) { return d.h; }));

  // расстановка: чем выше гора, тем ближе к центру массива
  var pk = data.map(function (d, i) {
    var t = (d.h - hMin) / (hMax - hMin);          // 0 низкая … 1 высочайшая
    var a = i * 2.399963;                          // золотой угол — без решётки
    var r = 0.22 + (1 - t) * 0.92;
    return {
      x: Math.cos(a) * r, z: Math.sin(a) * r,
      hh: 0.10 + t * 0.62,                          // высота пика в сцене
      t: t, d: d
    };
  });

  function resize() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight; S = Math.min(W, H) * 0.42;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function proj(x, y, z) {
    var c = Math.cos(rot), s = Math.sin(rot);
    var x1 = x * c - z * s, z1 = x * s + z * c;
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
    var k = 3.1 / (3.1 - z2);
    return { x: W / 2 + x1 * S * k, y: H / 2 + 40 - y1 * S * k, k: k, z: z2 };
  }

  function frame() {
    if (!drag && !still) rot += 0.0022;
    ctx.clearRect(0, 0, W, H);

    var sp = pk.map(function (p) {
      var base = proj(p.x, 0, p.z);
      var top = proj(p.x, p.hh, p.z);
      return { p: p, b: base, t: top };
    });

    // гребни между соседями по части книги
    for (var i = 0; i < sp.length; i++) {
      for (var j = i + 1; j < sp.length; j++) {
        var a = sp[i], b = sp[j];
        if (a.p.d.g !== b.p.d.g) continue;
        var dx = a.p.x - b.p.x, dz = a.p.z - b.p.z;
        if (dx * dx + dz * dz > 0.28) continue;
        ctx.strokeStyle = 'rgba(150,172,196,' + (0.30 * Math.min(a.t.k, b.t.k) / 1.5) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.t.x, a.t.y); ctx.lineTo(b.t.x, b.t.y); ctx.stroke();
      }
    }

    sp.sort(function (u, v) { return u.b.z - v.b.z; });   // дальние сначала
    sp.forEach(function (q) {
      var near = (q.b.z + 1.1) / 2.2;
      var w = (14 + q.p.t * 26) * q.b.k * (S / 260);      // ширина подошвы
      var on = hot === q.p;
      var lx = q.b.x - w, rx = q.b.x + w;

      var g = ctx.createLinearGradient(lx, q.t.y, rx, q.b.y);
      if (on) { g.addColorStop(0, '#F0564E'); g.addColorStop(1, '#B01B14'); }
      else if (q.p.d.b) { g.addColorStop(0, 'rgba(222,46,38,' + (0.45 + near * 0.5) + ')');
                          g.addColorStop(1, 'rgba(140,26,20,' + (0.4 + near * 0.5) + ')'); }
      else { g.addColorStop(0, 'rgba(196,210,224,' + (0.30 + near * 0.55) + ')');
             g.addColorStop(1, 'rgba(88,110,134,' + (0.3 + near * 0.5) + ')'); }

      ctx.beginPath();
      ctx.moveTo(lx, q.b.y);
      ctx.lineTo(q.t.x, q.t.y);
      ctx.lineTo(rx, q.b.y);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();

      if (q.p.t > 0.55) {                                  // снежная шапка
        var sh = 0.26;
        ctx.beginPath();
        ctx.moveTo(q.t.x - w * sh, q.t.y + (q.b.y - q.t.y) * sh);
        ctx.lineTo(q.t.x, q.t.y);
        ctx.lineTo(q.t.x + w * sh, q.t.y + (q.b.y - q.t.y) * sh);
        ctx.closePath();
        ctx.fillStyle = 'rgba(244,237,231,' + (0.5 + near * 0.45) + ')';
        ctx.fill();
      }
      q.w = w;
    });

    if (hot) {
      var q = sp.filter(function (s) { return s.p === hot; })[0];
      card(q, hot.d);
    }
    requestAnimationFrame(frame);
  }

  function card(q, d) {                                    // подпись у вершины
    var pad = 14, x = q.t.x + 18, y = q.t.y - 76;
    ctx.font = '700 17px "PT Serif",Georgia,serif';
    var w1 = ctx.measureText(d.m).width;
    ctx.font = '500 13px Inter,sans-serif';
    var w2 = Math.max(ctx.measureText(d.w).width, ctx.measureText(d.n).width);
    var bw = Math.max(w1, w2, ctx.measureText(d.h.toLocaleString('ru') + ' м').width) + pad * 2;
    if (x + bw > W - 8) x = q.t.x - bw - 18;
    if (y < 8) y = 8;

    ctx.fillStyle = 'rgba(12,20,28,.93)';
    ctx.fillRect(x, y, bw, 92);
    ctx.fillStyle = '#DE2E26';
    ctx.fillRect(x, y, 3, 92);

    ctx.fillStyle = '#F4EDE7';
    ctx.font = '700 17px "PT Serif",Georgia,serif';
    ctx.fillText(d.m, x + pad, y + 26);
    ctx.fillStyle = '#DE2E26';
    ctx.font = '700 15px "PT Serif",Georgia,serif';
    ctx.fillText(d.h.toLocaleString('ru') + ' м', x + pad, y + 48);
    ctx.fillStyle = '#8FA2B5';
    ctx.font = '400 12px Inter,sans-serif';
    ctx.fillText(d.w, x + pad, y + 66);
    ctx.fillStyle = '#C9D4DF';
    ctx.font = '600 13px Inter,sans-serif';
    ctx.fillText(d.n, x + pad, y + 84);
  }

  function pick(ev) {
    var r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    var best = null, bd = 1e9;
    pk.forEach(function (p) {
      var t = proj(p.x, p.hh, p.z), b = proj(p.x, 0, p.z);
      if (my < t.y - 14 || my > b.y + 8) return;           // курсор вне пика по высоте
      var w = (14 + p.t * 26) * b.k * (S / 260);
      var k = (my - t.y) / Math.max(b.y - t.y, 1);         // ширина на этой высоте
      var half = w * Math.min(Math.max(k, 0), 1) + 6;
      var dx = Math.abs(mx - t.x - (b.x - t.x) * k);
      if (dx < half && dx < bd) { bd = dx; best = p; }
    });
    return best;
  }

  cv.addEventListener('pointerdown', function (ev) { drag = { x: ev.clientX, y: ev.clientY }; });
  addEventListener('pointerup', function () { drag = null; });
  cv.addEventListener('pointermove', function (ev) {
    if (drag) {
      rot += (ev.clientX - drag.x) * 0.006;
      tilt = Math.max(0.12, Math.min(1.1, tilt + (ev.clientY - drag.y) * 0.004));
      drag = { x: ev.clientX, y: ev.clientY };
      hot = null; cv.style.cursor = 'grabbing';
      return;
    }
    hot = pick(ev);
    cv.style.cursor = hot ? 'pointer' : 'grab';
  });
  cv.addEventListener('pointerleave', function () { hot = null; });
  cv.addEventListener('click', function (ev) {
    var p = pick(ev);
    if (p) location.href = p.d.u;
  });

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
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

/* Хребет в четырёх сезонах. Небо, склоны, снеговая линия и осадки
   меняются по кругу: зима → весна → лето → осень. Всё рисуется в canvas,
   переходы — линейная интерполяция палитр, поэтому смена плавная и
   не требует ни картинок, ни библиотек. Сезон можно переключить вручную. */
(function () {
  var cv = document.getElementById('sky');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SEASONS = [
    { k: 'winter', name: 'Зима',
      sky: [[14, 26, 42], [44, 72, 102]],        // от зенита к горизонту
      rock: [22, 32, 44], snow: [236, 244, 250],
      line: 0.10,                                 // доля высоты, ниже которой снега нет
      star: [226, 238, 250], fall: 'snow' },
    { k: 'spring', name: 'Весна',
      sky: [[20, 40, 58], [78, 116, 132]],
      rock: [46, 66, 54], snow: [232, 240, 244],
      line: 0.52, star: [206, 226, 232], fall: 'haze' },
    { k: 'summer', name: 'Лето',
      sky: [[16, 44, 70], [64, 128, 158]],
      rock: [40, 72, 50], snow: [240, 246, 248],
      line: 0.88, star: [214, 232, 240], fall: 'warm' },
    { k: 'autumn', name: 'Осень',
      sky: [[34, 30, 44], [116, 84, 58]],
      rock: [74, 56, 38], snow: [238, 240, 242],
      line: 0.66, star: [236, 214, 190], fall: 'leaf' },
  ];
  var HOLD = 9000, FADE = 2600;                   // держим сезон / плавный переход

  var W, H, dpr, pts, ridge, mouse = { x: -1e4, y: -1e4 };
  var idx = 0, t0 = performance.now(), manual = false, label;

  function ridgeY(x) {                            // силуэт хребта
    var t = x / W;
    return H - H * (0.16 + 0.10 * Math.sin(t * 5.1 + 0.6)
                         + 0.13 * Math.exp(-Math.pow((t - 0.62) * 5.2, 2))
                         + 0.05 * Math.sin(t * 11.3));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ridge = [];
    for (var x = 0; x <= W; x += 5) ridge.push([x, ridgeY(x)]);
    var n = Math.min(130, Math.floor(W / 11));
    pts = [];
    for (var i = 0; i < n; i++) pts.push({
      x: Math.random() * W, y: Math.random() * H * 0.86,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.5 + 0.5, s: Math.random(),
    });
  }

  function mix(a, b, k) { return a.map(function (v, i) { return v + (b[i] - v) * k; }); }
  function rgb(c, a) {
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
  }

  function palette(now) {                          // текущая палитра с учётом перехода
    var a = SEASONS[idx], b = SEASONS[(idx + 1) % SEASONS.length];
    var dt = now - t0, k = 0;
    if (!manual && !still) {
      if (dt > HOLD + FADE) { idx = (idx + 1) % SEASONS.length; t0 = now; dt = 0; }
      k = dt > HOLD ? (dt - HOLD) / FADE : 0;
      a = SEASONS[idx]; b = SEASONS[(idx + 1) % SEASONS.length];
    }
    if (label) label.textContent = (k > 0.5 ? b : a).name;
    return {
      sky0: mix(a.sky[0], b.sky[0], k), sky1: mix(a.sky[1], b.sky[1], k),
      rock: mix(a.rock, b.rock, k), snow: mix(a.snow, b.snow, k),
      star: mix(a.star, b.star, k),
      line: a.line + (b.line - a.line) * k,
      fall: k > 0.5 ? b.fall : a.fall, fk: k,
    };
  }

  function frame(now) {
    var p = palette(now || performance.now());

    var g = ctx.createLinearGradient(0, 0, 0, H);   // небо
    g.addColorStop(0, rgb(p.sky0, 1));
    g.addColorStop(1, rgb(p.sky1, 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var i, j, q;
    for (i = 0; i < pts.length; i++) {              // осадки и частицы
      var pt = pts[i];
      if (!still) {
        if (p.fall === 'snow') { pt.x += pt.vx * 0.6; pt.y += 0.35 + pt.r * 0.35; }
        else if (p.fall === 'leaf') { pt.x += Math.sin(pt.y / 40 + pt.s * 6) * 0.5; pt.y += 0.28 + pt.r * 0.2; }
        else if (p.fall === 'warm') { pt.x += pt.vx; pt.y -= 0.06 + pt.r * 0.05; }
        else { pt.x += pt.vx * 0.8; pt.y += pt.vy * 0.5; }
        var dx = pt.x - mouse.x, dy = pt.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 16900) { pt.x += dx / Math.sqrt(d2) * 0.7; pt.y += dy / Math.sqrt(d2) * 0.7; }
        if (pt.x < -10) pt.x = W + 10; if (pt.x > W + 10) pt.x = -10;
        if (pt.y > H * 0.9) pt.y = -10; if (pt.y < -12) pt.y = H * 0.86;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * (p.fall === 'snow' ? 1.35 : 1), 0, 6.283);
      ctx.fillStyle = rgb(p.star, 0.22 + pt.r * 0.28);
      ctx.fill();
    }

    ctx.lineWidth = 1;                              // связи между частицами
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      var a = pts[i], b = pts[j];
      var ddx = a.x - b.x, ddy = a.y - b.y, dd = ddx * ddx + ddy * ddy;
      if (dd < 9000) {
        ctx.strokeStyle = rgb(p.star, 0.1 * (1 - dd / 9000));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    ctx.beginPath();                                // склон
    ctx.moveTo(0, H);
    for (i = 0; i < ridge.length; i++) ctx.lineTo(ridge[i][0], ridge[i][1]);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = rgb(p.rock, 0.94); ctx.fill();

    // снеговая линия: чем ниже line, тем больше снега — зимой почти до подошвы
    var top = Math.min.apply(null, ridge.map(function (r) { return r[1]; }));
    var snowY = top + (H - top) * p.line;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (i = 0; i < ridge.length; i++) ctx.lineTo(ridge[i][0], ridge[i][1]);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.clip();
    var sg = ctx.createLinearGradient(0, top, 0, snowY);
    sg.addColorStop(0, rgb(p.snow, 0.92));
    sg.addColorStop(0.75, rgb(p.snow, 0.5));
    sg.addColorStop(1, rgb(p.snow, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, top - 4, W, snowY - top + 4);
    ctx.restore();

    ctx.beginPath();                                // красная нить пути
    for (i = 0; i < ridge.length; i++)
      i ? ctx.lineTo(ridge[i][0], ridge[i][1] - 1) : ctx.moveTo(ridge[i][0], ridge[i][1] - 1);
    ctx.strokeStyle = 'rgba(222,46,38,.85)'; ctx.lineWidth = 1.6; ctx.stroke();

    var peak = ridge.reduce(function (u, v) { return v[1] < u[1] ? v : u; });
    ctx.beginPath(); ctx.arc(peak[0], peak[1] - 4, 3.2, 0, 6.283);
    ctx.fillStyle = '#DE2E26'; ctx.fill();

    if (!still) requestAnimationFrame(frame);
  }

  // переключатель сезонов: клик фиксирует сезон, повторный клик по нему — снимает
  var host = cv.parentNode;
  var bar = document.createElement('div');
  bar.className = 'seasons';
  label = document.createElement('span');
  label.className = 'seasons-now';
  bar.appendChild(label);
  SEASONS.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = s.name; b.setAttribute('aria-label', 'Показать: ' + s.name);
    b.addEventListener('click', function () {
      if (manual && idx === i) { manual = false; t0 = performance.now(); }
      else { manual = true; idx = i; }
      [].forEach.call(bar.querySelectorAll('button'), function (x, j) {
        x.setAttribute('aria-pressed', manual && j === i ? 'true' : 'false');
      });
      if (still) frame(performance.now());
    });
    bar.appendChild(b);
  });
  host.appendChild(bar);

  host.addEventListener('pointermove', function (ev) {
    var r = cv.getBoundingClientRect();
    mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top;
  });
  host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -1e4; });
  window.addEventListener('resize', function () { resize(); if (still) frame(performance.now()); });

  resize();
  if (still) { idx = 2; frame(performance.now()); }   // без анимации показываем лето
  else requestAnimationFrame(frame);
})();

/* Счётчики — это содержательные данные, поэтому они видны сразу и не
   подменяются нулями во время загрузки или чтения вспомогательными технологиями. */
(function () {
  var els = [].slice.call(document.querySelectorAll('[data-n]'));
  els.forEach(function (el) { el.textContent = el.dataset.n; });
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

/* Маршрут главной: активная станция и высота меняются по реальному положению
   разделов. Прогресс рисуется через transform — без перерасчёта раскладки. */
(function () {
  var nav = document.querySelector('.route-nav');
  if (!nav) return;
  var links = [].slice.call(nav.querySelectorAll('[data-route]'));
  var sections = links.map(function (link) {
    return document.querySelector(link.getAttribute('href'));
  });
  var altitude = document.getElementById('route-alt');
  var progress = document.getElementById('route-progress');
  var ticking = false;

  function update() {
    var marker = window.scrollY + window.innerHeight * 0.36;
    var active = 0;
    sections.forEach(function (section, i) {
      if (section && section.offsetTop <= marker) active = i;
    });
    links.forEach(function (link, i) {
      if (i === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (altitude) altitude.textContent = links[active].dataset.alt;

    var first = sections[0];
    var last = sections[sections.length - 1];
    if (first && last && progress) {
      var start = first.offsetTop;
      var finish = last.offsetTop + last.offsetHeight - window.innerHeight;
      var ratio = Math.min(Math.max((window.scrollY - start) / Math.max(finish - start, 1), 0), 1);
      progress.style.transform = 'scaleX(' + ratio.toFixed(3) + ')';
    }
    ticking = false;
  }

  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  update();
})();
