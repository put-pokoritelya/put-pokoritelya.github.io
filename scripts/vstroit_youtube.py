#!/usr/bin/env python3
"""Встраивает плеер YouTube в страницы выпусков и добавляет разметку VideoObject.

До этого на странице были только три текстовые ссылки - смотреть уходили
на сторону. Теперь выпуск можно посмотреть у нас, а поисковики и ИИ видят,
что на странице есть видео.

Плеер ленивый: до клика лежит обложка, ютуб не грузится (assets/yt.js).

Запуск:  python3 scripts/vstroit_youtube.py          - показать, что изменится
         python3 scripts/vstroit_youtube.py --apply  - записать
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob('vypuski/*/index.html'))
APPLY = '--apply' in sys.argv

YT_ID = re.compile(r'https://(?:www\.)?(?:youtu\.be/|youtube\.com/watch\?v=)([A-Za-z0-9_-]{11})')
COVER = re.compile(r'<div class="ep-photo is-cover"><img src="([^"]+)" alt="([^"]*)"')
OG_IMG = re.compile(r'<meta property="og:image" content="([^"]+)"')
EPISODE_LD = re.compile(r'<script type="application/ld\+json">(\{"@context".*?"PodcastEpisode".*?\})</script>', re.S)
GRID = '<div class="ep-grid">'
CATALOG = re.compile(r'(<script src="(\.\./\.\./)assets/catalog\.js[^>]*></script>)')
MINUTES = re.compile(r'·\s*(\d+)\s*мин')


def section(vid, poster, alt, title):
    """Блок плеера. Кнопка - настоящая button, чтобы работала с клавиатуры."""
    return (
        '<section class="ep-video"><div class="wrap">\n'
        '  <p class="rubric">Смотреть выпуск</p>\n'
        f'  <div class="yt" data-yt="{vid}" data-title="{title}">\n'
        f'    <img src="{poster}" alt="{alt}" loading="lazy" decoding="async">\n'
        '    <button type="button" aria-label="Включить видео"><span aria-hidden="true"></span></button>\n'
        '  </div>\n'
        '</div></section>\n'
    )


def video_ld(vid, page, ld, poster_abs):
    data = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        'name': ld.get('name', ''),
        'description': ld.get('description', ''),
        'thumbnailUrl': poster_abs,
        'uploadDate': ld.get('datePublished', ''),
        'embedUrl': f'https://www.youtube.com/embed/{vid}',
        'contentUrl': f'https://www.youtube.com/watch?v={vid}',
        'url': ld.get('url', ''),
    }
    m = MINUTES.search(page)
    if m:
        data['duration'] = f'PT{int(m.group(1))}M'
    return ('<script type="application/ld+json">'
            + json.dumps(data, ensure_ascii=False) + '</script>')


def patch(path):
    page = path.read_text(encoding='utf-8')
    if 'class="ep-video"' in page:
        return 'уже встроен'
    m = YT_ID.search(page)
    if not m:
        return 'нет ссылки на youtube'
    if GRID not in page:
        return 'не нашёл место для вставки'
    vid = m.group(1)

    cov = COVER.search(page)
    if cov:
        poster, alt = cov.group(1), cov.group(2)
    else:
        og = OG_IMG.search(page)
        if not og:
            return 'нет обложки'
        poster, alt = og.group(1), 'Обложка выпуска'
    og = OG_IMG.search(page)
    poster_abs = og.group(1) if og else poster

    led = EPISODE_LD.search(page)
    try:
        ld = json.loads(led.group(1)) if led else {}
    except json.JSONDecodeError:
        ld = {}
    title = (ld.get('name') or 'Выпуск подкаста «Путь покорителя»').replace('"', '&quot;')

    page = page.replace(GRID, section(vid, poster, alt, title) + GRID, 1)
    if led:
        page = page.replace(led.group(0), led.group(0) + '\n' + video_ld(vid, page, ld, poster_abs), 1)
    if 'assets/yt.js' not in page:
        cat = CATALOG.search(page)
        if cat:
            page = page.replace(
                cat.group(1),
                cat.group(1) + f'\n<script src="{cat.group(2)}assets/yt.js" defer></script>', 1)
        else:
            return 'не нашёл, куда подключить скрипт'

    if APPLY:
        path.write_text(page, encoding='utf-8')
    return f'плеер {vid}' + (' + разметка' if led else '')


def main():
    done = skipped = 0
    for p in PAGES:
        res = patch(p)
        mark = 'ок ' if res.startswith('плеер') else '  -'
        if res.startswith('плеер'):
            done += 1
        else:
            skipped += 1
        print(f'{mark} {p.parent.name}: {res}')
    print(f'\nвстроено: {done}, пропущено: {skipped}')
    if not APPLY:
        print('это был показ. чтобы записать: python3 scripts/vstroit_youtube.py --apply')


if __name__ == '__main__':
    main()
