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
    // Слева хребет прижат к низу, вершина смещена вправо: текст первого
    // экрана живёт в левой колонке, и склон не должен в него въезжать.
    var t = x / W;
    var ramp = 0.35 + 0.65 * t * t;
    var h = 0.20 + 0.10 * Math.sin(t * 4.6 + 0.8)
                 + 0.16 * Math.exp(-Math.pow((t - 0.74) * 4.6, 2))
                 + 0.04 * Math.sin(t * 10.7);
    return H - H * h * ramp;
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
    ctx.strokeStyle = 'rgba(218,52,51,.85)'; ctx.lineWidth = 1.6; ctx.stroke();

    var peak = ridge.reduce(function (u, v) { return v[1] < u[1] ? v : u; });
    ctx.beginPath(); ctx.arc(peak[0], peak[1] - 4, 3.2, 0, 6.283);
    ctx.fillStyle = '#DA3433'; ctx.fill();

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

/* ------------------------------------------------------------------ фигуры
   Четыре анимированные схемы из предметного мира героев. Это не «наука
   вообще» со светящейся ДНК: каждая рисует ровно тот объект, которым герой
   занимается, и ведёт на его выпуск.

   Всё на чистом canvas 2D, без библиотек. Считаем только когда фигура на
   экране — IntersectionObserver; при системной настройке «уменьшить
   движение» рисуем один статичный кадр. */
(function () {
  var INK = '27,28,26', RED = '218,52,51';

  function setup(cv, draw) {
    var ctx = cv.getContext('2d'), W, H, t = 0, run = false;
    var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      var dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still) draw(ctx, W, H, 600);
    }

    function frame() {
      if (!run) return;
      ctx.clearRect(0, 0, W, H);
      draw(ctx, W, H, t += 1);
      requestAnimationFrame(frame);
    }

    addEventListener('resize', resize);
    resize();
    if (still) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !run) { run = true; requestAnimationFrame(frame); }
        else if (!e.isIntersecting) run = false;
      });
    }, { rootMargin: '80px' }).observe(cv);
  }

  /* Кристаллическая решётка: куб 3×3×3, изометрия, медленный поворот.
     Расположение атомов определяет свойства материала — это и есть предмет
     работы Оганова. */
  function lattice3d(ctx, W, H, t) {
    var n = 3, a = t / 260, s = Math.min(W, H) * 0.19, cx = W / 2, cy = H / 2, p = [];
    for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) for (var z = 0; z < n; z++) {
      var ox = (x - 1) * s, oy = (y - 1) * s, oz = (z - 1) * s;
      var rx = ox * Math.cos(a) - oz * Math.sin(a);
      var rz = ox * Math.sin(a) + oz * Math.cos(a);
      var k = 1 + rz / (s * 7);                       // слабая перспектива
      p.push({ x: cx + rx * k, y: cy + (oy - rz * 0.36) * k, z: rz, k: k,
               i: x + ',' + y + ',' + z, gx: x, gy: y, gz: z });
    }
    p.sort(function (u, v) { return u.z - v.z; });
    ctx.lineWidth = 1;
    p.forEach(function (u) {
      p.forEach(function (v) {
        var d = Math.abs(u.gx - v.gx) + Math.abs(u.gy - v.gy) + Math.abs(u.gz - v.gz);
        if (d !== 1) return;
        ctx.strokeStyle = 'rgba(' + INK + ',' + (0.06 + 0.1 * u.k) + ')';
        ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(v.x, v.y); ctx.stroke();
      });
    });
    p.forEach(function (u) {
      var core = u.gx === 1 && u.gy === 1 && u.gz === 1;     // атом замещения
      ctx.fillStyle = core ? 'rgba(' + RED + ',.9)' : 'rgba(' + INK + ',' + (0.25 + 0.35 * u.k) + ')';
      ctx.beginPath(); ctx.arc(u.x, u.y, (core ? 4.4 : 2.6) * u.k, 0, 6.2832); ctx.fill();
    });
  }

  /* Траектория оптимизации: линии уровня и спуск к минимуму.
     Шаги укорачиваются — так и работает градиентный метод. */
  function descent(ctx, W, H, t) {
    var cx = W * 0.56, cy = H * 0.54, s = Math.min(W, H) * 0.4;
    ctx.lineWidth = 1;
    for (var i = 1; i <= 6; i++) {                  // овраг: эллипсы под наклоном
      ctx.strokeStyle = 'rgba(' + INK + ',' + (0.16 - i * 0.017) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * i * 0.17, s * i * 0.085, -0.5, 0, 6.2832);
      ctx.stroke();
    }
    var steps = 22, prog = (t / 2.4) % (steps + 26);
    var px = cx - s * 0.95, py = cy - s * 0.34;
    ctx.strokeStyle = 'rgba(' + RED + ',.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (var k = 1; k <= Math.min(prog, steps); k++) {
      var d = Math.pow(0.82, k);
      px += (cx - px) * 0.42 + Math.sin(k * 2.1) * s * 0.1 * d;
      py += (cy - py) * 0.42 + Math.cos(k * 2.7) * s * 0.06 * d;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(' + RED + ',1)';
    ctx.beginPath(); ctx.arc(px, py, 3.4, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(' + INK + ',.5)';
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, 6.2832); ctx.fill();
  }

  /* Скрытые колебания: видимый режим затухает, а рядом живёт второй
     аттрактор, который не найти, стартовав из очевидной точки. */
  function oscill(ctx, W, H, t) {
    var m = 18, w = W - m * 2, h = H - m * 2, mid = m + h / 2;
    ctx.strokeStyle = 'rgba(' + INK + ',.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(m, mid); ctx.lineTo(m + w, mid); ctx.stroke();

    function curve(color, width, amp, decay, freq, phase, from) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      for (var i = 0; i <= w; i++) {
        var u = i / w, x = m + i;
        var y = mid - Math.sin(u * freq + phase) * h * amp * Math.exp(-u * decay);
        if (u < from) { ctx.moveTo(x, y); continue; }
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    var ph = -t / 46;
    curve('rgba(' + INK + ',.42)', 1.4, 0.34, 1.9, 17, ph, 0);
    curve('rgba(' + RED + ',.8)', 1.6, 0.15, -0.15, 9, ph * 0.6, 0.42);
  }

  /* Граф связей: случайные точки, рёбра между близкими. Красным — клика,
     плотно связанная группа: то, что ищут в комбинаторике графов. */
  function graph(ctx, W, H, t) {
    var N = 26, pts = graph.p;
    if (!pts || pts.length !== N || graph.w !== W) {
      graph.w = W; pts = graph.p = [];
      for (var i = 0; i < N; i++) pts.push({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0009, vy: (Math.random() - 0.5) * 0.0009,
        c: i < 5,
      });
    }
    var m = 14, w = W - m * 2, h = H - m * 2, R = 0.3;
    pts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > 1) p.vx *= -1;
      if (p.y < 0 || p.y > 1) p.vy *= -1;
      p.X = m + p.x * w; p.Y = m + p.y * h;
    });
    ctx.lineWidth = 1;
    for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
      var a = pts[i], b = pts[j];
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      var clique = a.c && b.c;
      if (d > R && !clique) continue;
      var o = clique ? 0.55 : 0.22 * (1 - d / R);
      ctx.strokeStyle = (clique ? 'rgba(' + RED + ',' : 'rgba(' + INK + ',') + o + ')';
      ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.stroke();
    }
    pts.forEach(function (p) {
      ctx.fillStyle = p.c ? 'rgba(' + RED + ',.9)' : 'rgba(' + INK + ',.45)';
      ctx.beginPath(); ctx.arc(p.X, p.Y, p.c ? 3.4 : 2.4, 0, 6.2832); ctx.fill();
    });
  }

  var kinds = { lattice3d: lattice3d, descent: descent, oscill: oscill, graph: graph };
  [].forEach.call(document.querySelectorAll('canvas[data-fig]'), function (cv) {
    var fn = kinds[cv.getAttribute('data-fig')];
    if (fn) setup(cv, fn);
  });
})();

/* Карточка на первом экране: при каждом открытии — другой разговор.
   В разметку зашит последний выпуск, поэтому без JS и на первом кадре
   карточка уже правильная; скрипт лишь подменяет её на случайную.
   Ярлык честный: «Новый разговор» только у свежего, у остальных «Разговор». */
(function () {
  var card = document.querySelector('.summit-card');
  var box = document.getElementById('summit-pool');
  if (!card || !box) return;

  var pool;
  try { pool = JSON.parse(box.textContent); } catch (e) { return; }
  if (!pool || pool.length < 2) return;

  var pick = pool[Math.floor(Math.random() * pool.length)];
  var img = card.querySelector('.summit-photo img');
  if (!img) return;                                  // без кадра не подменяем

  card.href = pick.u;
  card.setAttribute('aria-label', 'Выпуск: ' + pick.n);
  card.querySelector('.summit-label').textContent =
    (pick.new ? 'Новый разговор' : 'Разговор') + ' · Сигнал ' + pick.s;
  img.src = pick.p;
  img.alt = pick.n;
  img.removeAttribute('fetchpriority');               // приоритет нужен был первому кадру
  card.querySelector('.summit-meta').textContent = pick.m;
  card.querySelector('strong').textContent = pick.n;
  card.querySelector('.summit-role').textContent = pick.r;
})();

/* Ролик во всю ширину: включаем, когда доехали до блока, и глушим, когда
   уехали. Файл в десять мегабайт не должен тянуться у тех, кто до него не
   долистал, поэтому preload="none" в разметке, а load() зовём вручную.
   При системной настройке «уменьшить движение» остаётся постер. */
(function () {
  var v = document.getElementById('reel');
  if (!v) return;
  var btn = document.querySelector('.reel-sound');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (btn) btn.addEventListener('click', function () {
    v.muted = !v.muted;
    btn.setAttribute('aria-pressed', String(!v.muted));
    btn.textContent = v.muted ? 'Включить звук' : 'Выключить звук';
    if (!v.muted && v.paused) v.play().catch(function () {});
  });

  if (still) { if (btn) btn.hidden = true; return; }

  var loaded = false;
  new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        if (!loaded) { v.load(); loaded = true; }
        v.play().catch(function () {});          // браузер вправе отказать — это не ошибка
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { rootMargin: '200px' }).observe(v);
})();
