/* Плеер выпуска грузится только по клику.
   До клика на странице лежит обычная картинка, а не тяжёлый плеер.
   Основной плеер — VK Video (data-vk="oid_id"); data-yt оставлен как запасной. */
(function () {
  document.querySelectorAll('.yt[data-vk], .yt[data-yt]').forEach(function (box) {
    box.addEventListener('click', function () {
      if (box.querySelector('iframe')) return;
      var f = document.createElement('iframe');
      if (box.dataset.vk) {
        var p = box.dataset.vk.split('_');
        f.src = 'https://vkvideo.ru/video_ext.php?oid=' + p[0] + '&id=' + p[1] + '&hd=2&autoplay=1';
        f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';
      } else {
        f.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt + '?autoplay=1&rel=0&hl=ru';
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      }
      f.allowFullscreen = true;
      f.title = box.dataset.title || 'Выпуск подкаста «Путь покорителя»';
      box.appendChild(f);
    }, { once: true });
  });
})();
