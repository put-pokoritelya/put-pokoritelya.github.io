# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Путь Покорителя
**Generated:** 2026-08-06 14:22:58
**Updated:** 2026-08-19 — synced to the live site (put-pokoritelya.ru)
**Category:** News/Media Platform
**Design Dials:** Variance 6/10 (Editorial / Print) | Motion 5/10 (Standard) | Density 4/10 (Standard)

---

## Global Rules

### Color Palette

Warm cream paper with a single dark hero and rationed red. Neutrals are warm-tinted
(R > G > B) — never pure grey. Sections are separated by stepping the warm neutral
darker, not by rules or shadows.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background (paper) | `#FBF9F5` | `--color-background` |
| Background band | `#F2F0ED` | `--color-band` |
| Background band deep | `#E4E2DE` | `--color-band-deep` |
| Hero / dark surface | `#141D27` | `--color-dark` |
| Foreground (ink) | `#1B1C1A` | `--color-foreground` |
| Muted text | `#474743` | `--color-ink-muted` |
| Text on dark | `#AFC1D2` | `--color-on-dark` |
| Primary / accent (links, rubric) | `#B6171E` | `--color-primary` |
| Accent CTA (button fill) | `#C42221` | `--color-accent` |
| On Primary / On Accent | `#FBF9F5` | `--color-on-primary` |
| Border (hairline) | `rgba(27,28,26,.14)` | `--color-border` |

**Color Notes:** One dark navy room (hero only, ~9% of the page), then daylight cream
for everything below. Red is spent only on rubric dashes, inline links, and the single
primary CTA — never on backgrounds or large fills.

### Typography

Three typefaces, one job each — never crossed.

- **Display Font:** Prata (all headings h1–h3, weight 400, negative letter-spacing)
- **Body Font:** Golos Text (body copy, nav, ledes; weights 400/500/600/700)
- **Label / Mono Font:** IBM Plex Mono (uppercase rubrics, buttons, meta; weight 600, letter-spacing 1.2–1.44px)
- **Mood:** editorial, print, science, human, precise
- **Google Fonts:** [Golos Text + IBM Plex Mono + Prata](https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Prata&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Prata&display=swap');
```

**Type Scale (two-tier: monumental display vs quiet text — no middle):**

| Role | Size | Font | Weight | Notes |
|------|------|------|--------|-------|
| Display h1 | `clamp(48px, 8vw, 108px)` | Prata | 400 | letter-spacing −1.62px, line-height 1.02 |
| h2 | `clamp(28px, 4vw, 48px)` | Prata | 400 | letter-spacing −1.06px |
| h3 | `32px` | Prata | 400 | letter-spacing −0.7px |
| Lede | `19–22px` | Golos Text | 400 | intro paragraphs |
| Body | `14–15px` | Golos Text | 400 | line-length capped in `ch` (48–62ch) |
| Rubric / label | `12–13px` | IBM Plex Mono | 600 | UPPERCASE, letter-spacing 1.2–1.44px |

### Spacing Variables

*Density: 4/10 — Standard. No strict base unit; mixes `gap` and `margin`. Section rhythm ~78px.*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps |
| `--space-sm` | `10px` | Inline spacing, paragraph gaps |
| `--space-md` | `16px` | Standard padding |
| `--space-lg` | `26px` | Nav gaps, section padding |
| `--space-xl` | `28px` | Large gaps |
| `--space-section` | `78px` | Vertical padding inside bands |

### Depth

**No shadows.** Depth is carried by warm background bands and 1px hairline borders only.
Do not add `box-shadow` anywhere.

### Corners

**All corners are sharp — `border-radius: 0`** on buttons, cards, images, tags. Print-like
flatness that reads as an edited publication, not an app. No rounded components.

---

## Component Specs

### Buttons

```css
/* Primary Button — the single loud action */
.btn-primary {
  background: #C42221;
  color: #FBF9F5;
  padding: 15px 26px;
  border: 0;
  border-radius: 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.44px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  cursor: pointer;
}

.btn-primary:hover {
  background: #B6171E;
}

/* Ghost Button — bordered, quiet */
.btn-ghost {
  background: transparent;
  color: #1B1C1A;
  padding: 13px 18px;
  border: 1px solid rgba(27,28,26,.28);
  border-radius: 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  transition: border-color 0.2s, color 0.2s;
  cursor: pointer;
}

.btn-ghost:hover {
  border-color: #1B1C1A;
}
```

### Rubric (section label)

```css
/* Red dash + uppercase mono label — precedes every section head */
.rubric {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.44px;
  color: #474743;
}
.rubric::before {
  content: "";
  width: 24px;
  height: 1px;
  background: #B6171E;
}
```

### Cards (flat cells)

```css
/* Not a lifted object — a bordered cell. No radius, no shadow. */
.card {
  background: #FBF9F5;
  border: 1px solid rgba(27,28,26,.14);
  border-radius: 0;
  padding: 24px;
  transition: border-color 0.25s, transform 0.25s;
  cursor: pointer;
}

.card:hover {
  border-color: rgba(27,28,26,.4);
}

/* Hairline grid: cells divided by 1px gutters, not gaps of whitespace */
.works {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: rgba(27,28,26,.14); /* gutter shows through as hairlines */
}
```

### Inputs

```css
.input {
  padding: 13px 16px;
  background: #FBF9F5;
  border: 1px solid rgba(27,28,26,.28);
  border-radius: 0;
  font-family: 'Golos Text', sans-serif;
  font-size: 15px;
  color: #1B1C1A;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #B6171E;
  outline: none;
}
```

### Dark Hero

```css
/* One dark room at the top; a constellation canvas sits behind the copy. */
.hero-sky {
  background: #141D27;
  color: #AFC1D2;
  position: relative;
}
.hero-sky h1 { color: #FBF9F5; }        /* Prata display, cream on navy */
.hero-sky .rubric { color: #AFC1D2; }
.hero-sky #sky {                          /* full-bleed canvas */
  position: absolute; inset: 0; width: 100%; height: 100%;
}
```

---

## Style Guidelines

**Style:** Editorial / Print Flat

**Keywords:** magazine, warm paper, sharp corners, hairline dividers, serif display,
mono labels, rationed accent, left-aligned spine

**Best For:** media platforms, podcasts, long-form reading, author/brand sites

**Key Effects:** No shadows, no radius; depth from warm background bands + 1px borders;
hover shifts color/border only (150–250ms); a single dark hero threshold; centering
reserved for pull-quotes.

### Layout

- **Container:** `.wrap` max-width **1240px**; section bands are full-bleed outside it.
- **Alignment:** Left-aligned spine throughout (hero, heads, cards, footer). Center only
  for pull-quote bands and the "Листайте" scroll cue.
- **Sectioning:** Alternate `#FBF9F5` / `#F2F0ED` bands; no horizontal rules.

### Page Pattern

**Pattern Name:** Editorial threshold → daylight reading

- **Section Order:** 1. Dark hero (title card + latest/featured), 2. Orgs ticker + stats,
  3. Alternating content bands (episodes, book, takeaways, topics, projects, voices),
  4. Invitation / partners CTA band.
- **CTA Placement:** Primary red CTA in the hero; ghost buttons for secondary paths;
  `link-more →` at each section head.

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300–450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Hover transitions:** animate `color`, `border-color`, `transform`, `filter` only —
durations 0.2s (hovers) to 0.45s (reveals). Never animate `box-shadow` (there are none)
or layout properties.

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Rounded corners (`border-radius` > 0) — the system is strictly sharp
- ❌ Box-shadows / drop shadows — depth comes from bands + hairlines
- ❌ Red backgrounds or large red fills — red is rationed to dashes, links, one CTA
- ❌ Pure grey neutrals — all neutrals are warm-tinted
- ❌ Mixing typeface roles (Prata in body, Golos in labels, etc.)
- ❌ Cluttered layout
- ❌ Slow loading

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150–300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] All corners sharp (`border-radius: 0`); no box-shadows
- [ ] Neutrals warm-tinted; red only on dashes/links/primary CTA
- [ ] Prata for headings, Golos Text for body/nav, IBM Plex Mono for labels/buttons — roles not crossed
- [ ] Rubric labels UPPERCASE mono with red dash
- [ ] Left-aligned; centering only for pull-quotes
- [ ] No emojis used as icons (use SVG instead)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states shift color/border only, smooth transitions (150–300ms)
- [ ] Light mode: text contrast 4.5:1 minimum (check `#474743` muted on bands)
- [ ] Focus states visible for keyboard navigation (`:focus-visible`)
- [ ] `prefers-reduced-motion` respected (canvas hero + video reel must pause)
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
