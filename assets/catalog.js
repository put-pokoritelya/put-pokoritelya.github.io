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

/* Созвездие героев: 3D-сфера с настоящей перспективой, вращается сама,
   тянется за курсором. Точки — герои, дуги — соседи по части книги.
   Данные зашиты в страницу при сборке; наведение показывает имя,
   клик открывает выпуск. Проекция и сортировка по глубине — вручную,
   без библиотек: три десятка строк математики дешевле мегабайта Three.js. */
(function () {
  var cv = document.getElementById('globe');
  if (!cv) return;
  var data = JSON.parse(document.getElementById('globe-data').textContent);
  var ctx = cv.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, R, rx = -0.25, ry = 0, drag = null, spin = 0.0016, hot = null;

  // равномерное распределение по сфере — спираль Фибоначчи
  var pts = data.map(function (d, i) {
    var t = 1 - 2 * (i + 0.5) / data.length;
    var r = Math.sqrt(1 - t * t), a = Math.PI * (3 - Math.sqrt(5)) * i;
    return { x: Math.cos(a) * r, y: t, z: Math.sin(a) * r, d: d };
  });

  function resize() {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight; R = Math.min(W, H) * 0.36;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(p) {
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var x1 = p.x * cy - p.z * sy, z1 = p.x * sy + p.z * cy;
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var y1 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx;
    var k = 2.6 / (2.6 - z2);                    // перспектива: ближние крупнее
    return { sx: W / 2 + x1 * R * k, sy: H / 2 + y1 * R * k, k: k, z: z2 };
  }

  function frame() {
    if (!drag && !still) ry += spin;
    ctx.clearRect(0, 0, W, H);
    var sp = pts.map(function (p) { var q = project(p); q.p = p; return q; });

    for (var i = 0; i < sp.length; i++) {          // дуги между соседями по части
      var a = sp[i];
      for (var j = i + 1; j < sp.length; j++) {
        var b = sp[j];
        if (a.p.d.g !== b.p.d.g) continue;
        var dx = a.sx - b.sx, dy = a.sy - b.sy;
        if (dx * dx + dy * dy > 26000) continue;
        ctx.strokeStyle = 'rgba(159,179,200,' + (0.16 * Math.min(a.k, b.k) / 1.6) + ')';
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }
    }
    sp.sort(function (a, b) { return a.z - b.z; });  // дальние рисуем первыми
    sp.forEach(function (q) {
      var near = (q.z + 1) / 2;
      var r = 1.6 + near * 3.4;
      var on = hot === q.p;
      ctx.beginPath(); ctx.arc(q.sx, q.sy, on ? r + 2 : r, 0, 6.283);
      ctx.fillStyle = on ? '#DE2E26'
        : q.p.d.b ? 'rgba(222,46,38,' + (0.35 + near * 0.6) + ')'
                  : 'rgba(244,237,231,' + (0.2 + near * 0.65) + ')';
      ctx.fill();
    });
    if (hot) {
      var q = sp.filter(function (s) { return s.p === hot; })[0];
      ctx.font = '600 14px Inter,sans-serif';
      var w = ctx.measureText(hot.d.n).width;
      ctx.fillStyle = 'rgba(20,29,39,.92)';
      ctx.fillRect(q.sx + 12, q.sy - 26, w + 20, 30);
      ctx.fillStyle = '#F4EDE7';
      ctx.fillText(hot.d.n, q.sx + 22, q.sy - 6);
    }
    requestAnimationFrame(frame);
  }

  function pick(ev) {
    var r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    var best = null, bd = 18 * 18;
    pts.forEach(function (p) {
      var q = project(p), dx = q.sx - mx, dy = q.sy - my, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  cv.addEventListener('pointerdown', function (ev) { drag = { x: ev.clientX, y: ev.clientY }; });
  addEventListener('pointerup', function () { drag = null; });
  cv.addEventListener('pointermove', function (ev) {
    if (drag) {
      ry += (ev.clientX - drag.x) * 0.006;
      rx = Math.max(-1.2, Math.min(1.2, rx + (ev.clientY - drag.y) * 0.006));
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

/* Небо над хребтом: частицы-звёзды с линиями-связями и силуэт горного
   хребта — путь покорителя. Чистый canvas, без библиотек. При
   prefers-reduced-motion рисуется один статичный кадр. */
(function () {
  var cv = document.getElementById('sky');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, dpr, pts, ridge, mouse = { x: -1e4, y: -1e4 };

  function ridgeY(x) { // силуэт хребта: сумма синусов, главная вершина на 62% ширины
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
    for (var x = 0; x <= W; x += 6) ridge.push([x, ridgeY(x)]);
    var n = Math.min(150, Math.floor(W / 9));
    pts = [];
    for (var i = 0; i < n; i++) pts.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.86,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.5 + 0.5,
    });
    if (still) frame();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    var i, j, p, q;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (!still) {
        p.x += p.vx; p.y += p.vy;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 16900) { p.x += dx / Math.sqrt(d2) * 0.6; p.y += dy / Math.sqrt(d2) * 0.6; }
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H * 0.86; if (p.y > H * 0.9) p.y = -10;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = 'rgba(244,237,231,' + (0.25 + p.r * 0.25) + ')';
      ctx.fill();
    }
    ctx.lineWidth = 1;
    for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
      p = pts[i]; q = pts[j];
      var ddx = p.x - q.x, ddy = p.y - q.y, dd = ddx * ddx + ddy * ddy;
      if (dd < 10000) {
        ctx.strokeStyle = 'rgba(159,179,200,' + (0.14 * (1 - dd / 10000)) + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    // хребет: заливка-силуэт и красная нить пути к вершине
    ctx.beginPath(); ctx.moveTo(0, H);
    for (i = 0; i < ridge.length; i++) ctx.lineTo(ridge[i][0], ridge[i][1]);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = 'rgba(12,18,25,.72)'; ctx.fill();
    ctx.beginPath();
    for (i = 0; i < ridge.length; i++) i ? ctx.lineTo(ridge[i][0], ridge[i][1] - 1) : ctx.moveTo(ridge[i][0], ridge[i][1] - 1);
    ctx.strokeStyle = 'rgba(222,46,38,.8)'; ctx.lineWidth = 1.6; ctx.stroke();
    var peak = ridge.reduce(function (a, b) { return b[1] < a[1] ? b : a; });
    ctx.beginPath(); ctx.arc(peak[0], peak[1] - 4, 3, 0, 6.283);
    ctx.fillStyle = '#DE2E26'; ctx.fill();
    if (!still) requestAnimationFrame(frame);
  }

  cv.parentNode.addEventListener('pointermove', function (ev) {
    var r = cv.getBoundingClientRect();
    mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top;
  });
  cv.parentNode.addEventListener('pointerleave', function () { mouse.x = mouse.y = -1e4; });
  window.addEventListener('resize', resize);
  resize();
  if (!still) requestAnimationFrame(frame);
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
