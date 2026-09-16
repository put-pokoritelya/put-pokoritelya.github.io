#!/usr/bin/env python3
"""Плеер переезжает на место фотографии в шапке выпуска.

Было: фото 4:3 в шапке, ниже отдельная секция во всю ширину с тем же фото.
Один и тот же портрет дважды, YouTube в двух местах, контент уехал вниз.
Стало: в правой колонке шапки сразу плеер 16:9, отдельной секции нет,
ссылка «Смотреть на YouTube» убрана - видео и так здесь.
"""
import glob, re, sys

APPLY = '--apply' in sys.argv
VIDEO = re.compile(r'\n<section class="ep-video">.*?</section>', re.S)
PHOTO = re.compile(r'<div class="ep-photo is-cover"><img src="([^"]+)" alt="([^"]+)"[^>]*></div>')
YTLINK = re.compile(r'<a href="https://youtu\.be/[^"]*" rel="noopener">Смотреть на YouTube</a>')

done = skip = 0
for p in sorted(glob.glob('vypuski/*/index.html')):
    h = open(p, encoding='utf-8').read()
    m = VIDEO.search(h)
    if not m:
        skip += 1
        continue
    yt = re.search(r'<div class="yt" data-yt="([\w-]{11})" data-title="([^"]*)">', m.group(0))
    h = VIDEO.sub('', h, count=1)

    def swap(mm):
        return (f'<div class="ep-photo is-video">'
                f'<div class="yt" data-yt="{yt.group(1)}" data-title="{yt.group(2)}">'
                f'<img src="{mm.group(1)}" alt="{mm.group(2)}" width="2400" height="1800">'
                f'<button type="button" aria-label="Включить видео"><span aria-hidden="true"></span></button>'
                f'</div></div>')
    h, n = PHOTO.subn(swap, h, count=1)
    if not n:
        print(f'  ! {p}: не нашёл фото в шапке, пропускаю')
        continue
    h = YTLINK.sub('', h)
    if APPLY:
        open(p, 'w', encoding='utf-8').write(h)
    done += 1

print(f'{"переделано" if APPLY else "переделаю"}: {done}, без видео: {skip}')
