/* Лёгкая двойная спираль для первого экрана — canvas 2D, без зависимостей
   и без сборки. Альтернатива assets/hero-3d.js (Three.js, 129 КБ gzip).
   Трёхмерность здесь считается вручную: перспективная проекция плюс
   сортировка точек по глубине. Свечение — один спрайт с радиальным
   градиентом, нарисованный однажды и дальше только масштабируемый.

   Точка входа та же: элемент #hero3d. Поведение при
   prefers-reduced-motion, уходе из вида и неактивной вкладке — как
   в трёхмерной версии. */
(function () {
  var host = document.getElementById('hero3d');
  if (!host) return;

  var c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(c);
  var x = c.getContext('2d');
  if (!x) return;

  var still = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function sprite(r, g, b) {
    var s = document.createElement('canvas');
    s.width = s.height = 48;
    var q = s.getContext('2d');
    var gr = q.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0.00, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    gr.addColorStop(0.20, 'rgba(' + r + ',' + g + ',' + b + ',0.70)');
    gr.addColorStop(0.55, 'rgba(' + r + ',' + g + ',' + b + ',0.18)');
    gr.addColorStop(1.00, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    q.fillStyle = gr; q.fillRect(0, 0, 48, 48);
    return s;
  }
  var GOLD = sprite(255, 186, 92), COOL = sprite(150, 196, 246), DUST = sprite(196, 214, 236);

  function resize() {
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    c.width = W * DPR; c.height = H * DPR;
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); draw(); }).observe(host);
  else window.addEventListener('resize', function () { resize(); draw(); });

  var STEPS = 320, TURNS = 5.2, RUNG = 11, ph = 0;
  var motes = [];
  for (var i = 0; i < 140; i++) {
    motes.push({
      a: Math.random() * 6.2832, r: 0.8 + Math.random() * 1.5,
      y: Math.random() * 2 - 1, s: 0.4 + Math.random() * 1.1,
      o: 0.10 + Math.random() * 0.32
    });
  }

  function put(sp, px, py, sz, al) {
    if (al <= 0.004) return;
    x.globalAlpha = al > 1 ? 1 : al;
    x.drawImage(sp, px - sz / 2, py - sz / 2, sz, sz);
  }

  function draw() {
    if (!W || !H) return;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';

    var cx = W * 0.72, cy = H * 0.5;
    var R = Math.min(W * 0.19, 104), L = H * 1.5;
    var cz = Math.cos(-0.30), sz0 = Math.sin(-0.30);

    function proj(ax, ay, az) {
      var X = ax * cz - ay * sz0, Y = ax * sz0 + ay * cz, d = 430 / (430 + az);
      return { x: cx + X * d, y: cy + Y * d, d: d, z: az };
    }

    for (var i = 0; i < motes.length; i++) {
      var m = motes[i], an = m.a + ph * 0.4 * m.s;
      var q = proj(Math.cos(an) * R * m.r, m.y * L * 0.5, Math.sin(an) * R * m.r);
      put(DUST, q.x, q.y, 7 * q.d, m.o * Math.max(0, (q.d - 0.72) * 3));
    }

    var A = [], B = [];
    for (var i = 0; i <= STEPS; i++) {
      var t = i / STEPS, a = t * TURNS * 6.2832 + ph, yy = (t - 0.5) * L;
      var p = proj(Math.cos(a) * R, yy, Math.sin(a) * R);
      p.lit = (Math.cos(a - 0.6) + 1) / 2; A.push(p);
      var a2 = a + 3.1416, q2 = proj(Math.cos(a2) * R, yy, Math.sin(a2) * R);
      q2.lit = (Math.cos(a2 - 0.6) + 1) / 2; B.push(q2);
    }

    for (var i = 0; i <= STEPS; i += RUNG) {
      var p = A[i], q = B[i], o = (p.d + q.d) / 2, base = Math.max(0, (o - 0.66) * 1.9);
      if (base <= 0) continue;
      for (var k = 0; k <= 13; k++) {
        var f = k / 13;
        var rx = p.x + (q.x - p.x) * f, ry = p.y + (q.y - p.y) * f;
        var rd = p.d + (q.d - p.d) * f, lt = p.lit + (q.lit - p.lit) * f;
        put(GOLD, rx, ry, 9 * rd, base * lt * 0.50);
        put(COOL, rx, ry, 9 * rd, base * (1 - lt) * 0.42);
      }
    }

    var ord = [];
    for (var i = 0; i <= STEPS; i++) { ord.push(A[i]); ord.push(B[i]); }
    ord.sort(function (u, v) { return v.z - u.z; });
    for (var i = 0; i < ord.length; i++) {
      var p = ord[i], al = Math.max(0, (p.d - 0.62) * 1.7);
      if (al <= 0) continue;
      put(GOLD, p.x, p.y, 15 * p.d, al * p.lit * 0.78);
      put(COOL, p.x, p.y, 15 * p.d, al * (1 - p.lit) * 0.60);
      put(DUST, p.x, p.y, 5 * p.d, al * 0.50);
    }

    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
  }

  draw();
  if (still) return;

  var live = true, running = false;
  function loop() {
    if (!running) return;
    ph += 0.0042; draw();
    requestAnimationFrame(loop);
  }
  function start() { if (!running && live) { running = true; loop(); } }
  function stop() { running = false; }

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      es[0] && es[0].isIntersecting ? start() : stop();
    }, { threshold: 0.01 }).observe(host);
  } else { start(); }

  document.addEventListener('visibilitychange', function () {
    live = !document.hidden;
    live ? start() : stop();
  });
})();
