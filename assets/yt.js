/* Плеер выпуска грузится только по клику.
   До клика на странице лежит обычная картинка, а не полтора мегабайта ютуба. */
(function () {
  document.querySelectorAll('.yt[data-yt]').forEach(function (box) {
    box.addEventListener('click', function () {
      if (box.querySelector('iframe')) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt +
              '?autoplay=1&rel=0&hl=ru';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      f.title = box.dataset.title || 'Выпуск подкаста «Путь покорителя»';
      box.appendChild(f);
    }, { once: true });
  });
})();
