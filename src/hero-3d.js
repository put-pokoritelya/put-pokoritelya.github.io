/* Трёхмерная двойная спираль для первого экрана.
   Собирается в assets/hero-3d.js командой `npm run build:hero`.
   Собранный файл коммитится в репозиторий — GitHub Pages отдаёт файлы
   напрямую, сборки на их стороне нет.

   Точка входа — элемент #hero3d. Если его нет, WebGL недоступен или
   пользователь просил меньше движения, скрипт молча ничего не делает,
   и первый экран остаётся таким, каким свёрстан. */

import {
  Scene, PerspectiveCamera, WebGLRenderer, Group,
  BufferGeometry, BufferAttribute, Points, PointsMaterial,
  CanvasTexture, AdditiveBlending, Color
} from 'three';

var GOLD = new Color(1.0, 0.73, 0.36);
var COOL = new Color(0.59, 0.77, 0.96);

/* Спрайт свечения: рисуется один раз в offscreen-canvas и дальше
   используется всеми точками как текстура. Дешевле, чем шейдер. */
function glowTexture() {
  var s = document.createElement('canvas');
  s.width = s.height = 64;
  var q = s.getContext('2d');
  var g = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.50, 'rgba(255,255,255,0.16)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  q.fillStyle = g;
  q.fillRect(0, 0, 64, 64);
  return new CanvasTexture(s);
}

/* Двойная спираль: две цепи плюс перекладины между ними.
   Цвет точки зависит от того, какой стороной она повёрнута к свету, —
   так получается тёплый край с одной стороны и холодный с другой. */
function helix(turns, steps, radius, height, rungEvery, rungPoints) {
  var pos = [], col = [], c = new Color();

  function push(a, y) {
    pos.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
    var lit = (Math.cos(a - 0.6) + 1) / 2;
    c.copy(COOL).lerp(GOLD, lit);
    col.push(c.r, c.g, c.b);
  }

  for (var i = 0; i <= steps; i++) {
    var t = i / steps, a = t * turns * Math.PI * 2, y = (t - 0.5) * height;
    push(a, y);
    push(a + Math.PI, y);

    if (i % rungEvery === 0) {
      var ax = Math.cos(a) * radius, az = Math.sin(a) * radius;
      var bx = -ax, bz = -az;
      for (var k = 1; k < rungPoints; k++) {
        var f = k / rungPoints;
        pos.push(ax + (bx - ax) * f, y, az + (bz - az) * f);
        var lit2 = (Math.cos(a - 0.6) + 1) / 2;
        c.copy(COOL).lerp(GOLD, lit2).multiplyScalar(0.72);
        col.push(c.r, c.g, c.b);
      }
    }
  }

  var g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  return g;
}

/* Взвесь вокруг спирали — то, что на референсе читается как частицы. */
function dust(count, radius, height) {
  var pos = [], col = [], c = new Color();
  for (var i = 0; i < count; i++) {
    var a = Math.random() * Math.PI * 2;
    var r = radius * (0.8 + Math.random() * 1.8);
    pos.push(Math.cos(a) * r, (Math.random() - 0.5) * height, Math.sin(a) * r);
    c.copy(COOL).lerp(GOLD, Math.random()).multiplyScalar(0.35 + Math.random() * 0.4);
    col.push(c.r, c.g, c.b);
  }
  var g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  return g;
}

function init() {
  var host = document.getElementById('hero3d');
  if (!host) return;

  var still = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) { return; }
  if (!renderer || !renderer.getContext()) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  var scene = new Scene();
  var camera = new PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);

  var tex = glowTexture();
  var group = new Group();
  group.rotation.z = -0.28;
  group.position.x = 1.5;

  var strands = new Points(
    helix(5.2, 360, 1.15, 11, 11, 13),
    new PointsMaterial({
      size: 0.135, map: tex, vertexColors: true, transparent: true,
      blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true
    })
  );

  var motes = new Points(
    dust(420, 1.15, 11),
    new PointsMaterial({
      size: 0.07, map: tex, vertexColors: true, transparent: true,
      blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true, opacity: 0.75
    })
  );

  group.add(strands);
  group.add(motes);
  scene.add(group);

  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize', resize);

  renderer.render(scene, camera);
  if (still) return;

  /* Крутим только пока первый экран в кадре: ушёл вниз — кадры не тратим. */
  var live = true, running = false;
  function loop() {
    if (!running) return;
    group.rotation.y += 0.0016;
    motes.rotation.y -= 0.0007;
    renderer.render(scene, camera);
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
}

/* Инициализация после первой отрисовки: текст первого экрана не ждёт WebGL. */
if (document.readyState === 'complete') {
  requestAnimationFrame(init);
} else {
  window.addEventListener('load', function () { requestAnimationFrame(init); });
}
