---
version: alpha
name: Путь Покорителя
description: Подкаст и книга о людях, которые развивают науку, образование и технологии

colors:
  primary: "#1B1C1A"
  secondary: "#474743"
  tertiary: "#B6171E"
  tertiary-cta: "#C42221"
  neutral: "#FBF9F5"
  neutral-band: "#F2F0ED"
  neutral-band-deep: "#E4E2DE"
  border-hairline: "#E4E2DE"
  inverse: "#141D27"
  on-inverse: "#AFC1D2"

typography:
  display:
    fontFamily: Prata
    fontSize: 108px
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: -1.62px
  h2:
    fontFamily: Prata
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1.06px
  h3:
    fontFamily: Prata
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.2
  lede:
    fontFamily: Golos Text
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Golos Text
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 1.44px

spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  2xl: 80px

rounded:
  none: 0px
  full: 9999px

components:
  button-primary:
    backgroundColor: "{colors.tertiary-cta}"
    textColor: "{colors.neutral}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  hero:
    backgroundColor: "{colors.inverse}"
    textColor: "{colors.on-inverse}"
    typography: "{typography.display}"
    padding: "{spacing.2xl}"
  band-deep:
    backgroundColor: "{colors.neutral-band-deep}"
    textColor: "{colors.primary}"
    padding: "{spacing.2xl}"
  card-episode:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
  rubric:
    textColor: "{colors.tertiary}"
    typography: "{typography.label}"
  band:
    backgroundColor: "{colors.neutral-band}"
    padding: "{spacing.2xl}"
---

# Дизайн-система «Путь Покорителя»

Токены сняты с живого сайта put-pokoritelya.ru 19.08.2026 через `/taste`.
Файл заменяет прежний `design-system/default/MASTER.md`, описывавший
неактуальную систему (Exo + Roboto Mono, палитра `#DC2626`).

## Overview

Подкаст и книга о людях, которые развивают науку, образование и технологии
в России. Продукт проекта — чтение и слушание: 56 выпусков, 77 героев,
46 глав книги.

Интонация — журнальная, не интерфейсная. Страница должна читаться как
отредактированный разворот, а не как лента для свайпа: плотно, спокойно,
с уважением к длинному тексту. Плотность выше средней, декора нет,
иерархия держится на кегле и белом пространстве, а не на подъёме карточек
над фоном.

## Colors

Палитра построена на тёплых нейтральных с единственным акцентом.

- **Primary (#1B1C1A):** тёплый почти-чёрный для заголовков и основного текста.
- **Secondary (#474743):** приглушённый для метаданных, подписей и второстепенного.
- **Tertiary (#B6171E):** приглушённый красный, единственный цвет в системе.
  Живёт только в чёрточках рубрик и инлайн-ссылках.
- **Tertiary CTA (#C42221):** заливка основной кнопки. Ровно одна на страницу.
- **Neutral (#FBF9F5):** тёплый кремовый, основа страницы.
- **Neutral band (#F2F0ED)** и **band deep (#E4E2DE):** чередующиеся полосы
  разделов, единственный способ разделить страницу по вертикали.
- **Inverse (#141D27):** глубокий navy. Только hero, около 9% площади.
- **On inverse (#AFC1D2):** холодный сине-серый для текста на navy.
  Больше нигде не встречается.

## Typography

Три гарнитуры с жёстко разделёнными ролями. Ни одна не заходит на чужую
территорию.

- **Prata** — только заголовки: display 108px, h2 48px, h3 32px, вес 400.
- **Golos Text** — только основной текст и навигация. Body 17px,
  межстрочный 1.6, длина строки не более 62ch.
- **IBM Plex Mono** — только капслочные метки и кнопки, 12px, вес 600,
  разрядка 1.44px.

Форма кодирует функцию: разряженная моноширинная метка опознаётся как метка
раньше, чем прочитывается, а строка Prata — как заголовок.

Body поднят с прежних 14–15px до 17px. Причина: продукт проекта — длинное
чтение, а 14px для расшифровок и глав книги мелко.

## Layout

Контейнер 1240px, фоновые полосы на всю ширину экрана.
Шаг сетки — 8px: 8 / 16 / 24 / 32 / 48 / 80.

Прежняя сетка (4 / 10 / 16 / 18 / 26 / 28px) базовой единицы не имела и
накопилась случайно. Приведение к 8px делается до генерации новых компонентов,
иначе хаос размножится.

Вертикальный ритм разделов — 80px внутри полосы.

## Elevation & Depth

Теней нет. Ни одной.

Глубина создаётся только сменой фона полос и волосяными линиями 1px.
Сетка выпусков разделяется зазором в 1px, который читается как разделитель,
а не как отступ.

Компромисс осознанный: карточку нельзя выделить подъёмом над фоном,
поэтому иерархия строится кеглем, весом и пространством.

## Shapes

Скругления — 0px везде: кнопки, карточки, изображения, теги.

Острые углы и плоская краска говорят «это отредактированный текст».
Скруглённая карточка с тенью говорит «это приложение», и для проекта
про чтение это неверный сигнал.

Единственное допустимое исключение — `rounded.full` для аватаров и иконок
действий, если круг вводится как легенда: круг означает человека или действие.
Решение отложено, сейчас портреты квадратные.

## Components

### Кнопки

12px IBM Plex Mono, капслок, разрядка 1.44px, радиус 0, паддинг 16px / 24px.
Основная — заливка `#C42221`, ровно одна на страницу. Остальные — обводка 1px.

### Карточки выпусков

Изображение 16:9 (источник 1280×720), радиус 0. Сетка 3 колонки,
зазор 1px. Рубрика сверху: 12px моно, капслок, красная чёрточка перед текстом.

### Полосы разделов

Чередование `#FBF9F5` и `#F2F0ED`, вертикальный паддинг 80px,
контент внутри контейнера 1240px, фон на всю ширину.

### Движение

Переходы `color` / `border-color` / `transform` / `filter`, 0.2–0.3s,
easing `cubic-bezier(0.25, 0.46, 0.45, 0.94)`. Ничего не двигается само
по себе, кроме canvas в hero.

## Do's and Don'ts

**Обязательно к исправлению.** Сейчас в стилях отсутствуют `:focus-visible`
и `prefers-reduced-motion`, при этом в hero работает canvas-анимация и
автоплеится ролик. Первое делает сайт непроходимым с клавиатуры, второе
показывает движение принудительно тем, кто его отключил в системе.

```css
:focus-visible {
  outline: 2px solid #B6171E;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Плюс в JS: не запускать canvas и не вызывать `video.play()`, если
`matchMedia('(prefers-reduced-motion: reduce)').matches`.

**Нельзя:**

- Добавлять тени. Глубина — только полосы и волосяные линии.
- Скруглять контентные изображения и карточки.
- Красить фоны, заголовки или рамки в красный. Акцент значит «смотри сюда»
  только пока он редок.
- Ставить больше одной основной кнопки на страницу.
- Использовать Prata в тексте, Golos в метках, моно в заголовках.
- Вводить второй акцентный цвет.
- Делать тёмную тему целиком: инверсия сломает переход «ночь → день»,
  на котором держится вход в чтение.

**Нужно:**

- Держать длину строки в пределах 62ch.
- Любой новый отступ брать из шкалы 8px.
- Рубрику раздела ставить капслочной моношириной с красной чёрточкой.
