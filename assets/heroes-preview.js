/* One preview prevents Safari retaining filtered layers from earlier rows. */
(function () {
  var list = document.getElementById('glist');
  if (!list) return;
  var desktop = matchMedia('(hover: hover) and (min-width: 900px)');
  var layer = document.createElement('div');
  layer.className = 'gn-preview-layer';
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  var cache = new Map();
  var active = null;
  var revision = 0;

  function hide() {
    revision++;
    active = null;
    layer.hidden = true;
    layer.replaceChildren();
  }

  function prepare(thumb) {
    var src = thumb.currentSrc || thumb.src;
    if (!cache.has(src)) {
      var image = new Image(116, 116);
      image.alt = '';
      image.src = src;
      var ready = image.decode().then(function () { return image; });
      // Errors leave the normal thumbnail usable; a later hover can retry.
      ready.catch(function () { cache.delete(src); });
      cache.set(src, ready);
    }
    return cache.get(src);
  }

  list.querySelectorAll('.gn a').forEach(function (link) {
    var thumb = link.querySelector('.gn-av img');
    if (!thumb) return;
    // Warm the decoded image as the existing lazy thumbnail approaches view.
    function warm() { if (desktop.matches) prepare(thumb); }
    if (thumb.complete && thumb.naturalWidth) warm();
    else thumb.addEventListener('load', warm, { once: true });
    function show() {
      hide();
      if (!desktop.matches) return;
      active = link;
      var ticket = revision;
      prepare(thumb).then(function (image) {
        if (ticket !== revision || active !== link || !desktop.matches) return;
        var rect = thumb.getBoundingClientRect();
        layer.style.left = Math.round(Math.min(rect.left, innerWidth - 120)) + 'px';
        layer.style.top = Math.round(Math.max(4, rect.bottom - 46 - 116)) + 'px';
        layer.replaceChildren(image);
        layer.hidden = false;
      }).catch(function () { /* Keep the thumbnail when an image is unavailable. */ });
    }
    link.addEventListener('mouseenter', show);
    link.addEventListener('mousemove', function () {
      if (active !== link) show();
    });
    link.addEventListener('mouseleave', hide);
  });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', hide);
  desktop.addEventListener('change', hide);
})();
