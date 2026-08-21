# Design Map

*Analyzed across 3 pages: home, /mathematics/, /archive/. Values agree unless noted.*

## Spacing Scale
- ~8px base rhythm; frequent 8 / 16 / 20 / 40px
- Section gaps generous and variable: 32 / 48 / 50 / 96px
- Mixes `gap` and `margin`

## Font Hierarchy
- Section title — 45px Noe Display, weight 700 (centered on grey band)
- Featured headline — 40px Noe Display, weight 700
- List headline — 22px Noe Display, weight 700
- UI heading ("Latest Articles", "Filter by Topics") — 22px Pangram, weight 700–800
- Body / dek — 16–18px Merriweather, weight 400
- Byline / date — 13px Pangram, UPPERCASE
- Category kicker — 10px Pangram, weight 600, UPPERCASE, letter-spacing 2px

## Color Palette
- Surface — `#FFFFFF`
- Surface band — `#EFEFEF` (section-title band + newsletter)
- Ink / dark surface — `#1A1A1A` (text; full-bleed hero + footer bar)
- Text muted — `#6B6B6B`, `#767676`
- Text faint — `#999999`
- Accent — `#FF8600` (the only hue: active nav, link/kicker underlines, logo "magazine", social icons)
- Text on dark — `#FFFFFF`

## Image Ratios
- Hero — 2.36:1 full-bleed
- List thumbnails — 16:9 (520×292 source), identical across pages

## Component Tokens
- Border-radius: `0` on all photos/inputs; `50%` only on social/action icons and avatars
- Shadows: minimal, single-layer `0 2px 5px rgba(0,0,0,0.2)` — no systemic depth
- Grid: content column ~1200px; article list = single-column rows + right rail; homepage `card-list` 3-col
- Motion: `transform`/`opacity`/`background` 0.5s `cubic-bezier(0.09,0.47,0.18,0.99)`; `color`/`fill` 0.2s
- Accessibility: `:focus-visible` present; `prefers-reduced-motion` not detected

---

# Taste DNA

### Two Serifs and a Sans, Split by Job
- **Trigger**: When a story index must show editorial headlines, readable article prose, and dozens of small navigational labels on one screen.
- **Decision**: Ran three typefaces with hard role boundaries — Noe Display for headlines, Merriweather for body/deks, Pangram for all UI chrome — over the common economy of one serif + one sans, or a single superfamily.
- **Reason**: A reader should feel the difference between the writer's voice and the site's plumbing without thinking about it; a tracked 10px Pangram kicker is obviously a label, a Noe headline is obviously the story.
- **Evidence**: Headlines sampled as Noe (22/40/45px, wt 700); Merriweather dominant by count (558–647×); kickers/bylines/nav/sidebar heads all Pangram (10–22px, kicker letter-spacing 2px) — consistent across home, /mathematics/, /archive/.

### Orange Is Reserved for "Clickable / You Are Here"
- **Trigger**: When a page is a dense wall of equally-weighted headlines and the design needs one signal for interactivity.
- **Decision**: Spent a single warm orange only on the interactive layer — active-nav underline, link/kicker underlines, the logo's "magazine", social icons — over using color to rank or decorate content.
- **Reason**: If the accent also colored headings or backgrounds, "clickable" would lose its meaning; scarcity is what lets one orange underline carry the entire wayfinding load.
- **Evidence**: `#FF8600` present 25–27× but only ~0.2% of surface; it is the palette's *only* hue against pure neutrals (`#1A1A1A`, `#6B6B6B`, `#EFEFEF`); appears identically on all three pages.

### Photography Leads, Then Gets Out of the Way
- **Trigger**: When choosing how much visual drama the chrome itself should carry.
- **Decision**: Front-loaded all spectacle into a full-bleed hero image and kept everything else on white with near-zero shadow and one accent — over a decorated gradient-and-shadow interface competing with the photos.
- **Reason**: Science imagery is the hook; a loud UI around it would fight the very thing meant to pull you in, and long reading needs a calm field.
- **Evidence**: Home hero 2.36:1 edge-to-edge, `#1A1A1A` ≈49% area there vs white 35.9%; section pages drop the image for a quiet textured `#EFEFEF` band; shadows minimal/single-layer; `cards: []` (rows, not decorated containers).

### Square Photos, Round Only for Who and What
- **Trigger**: When deciding the corner language for images versus icons.
- **Decision**: Kept every content image hard-cornered and reserved rounding entirely for small circles — avatars and social/action icons — over the ubiquitous rounded-thumbnail card look.
- **Reason**: A square, un-styled photo reads as documentary evidence for the story; a circle reliably means "a person, a brand, or an action," so shape itself becomes a legend.
- **Evidence**: `border-radius: 0` on all 16:9 thumbnails (520×292) and the newsletter input; `50%` used 23× exclusively on icons/avatars; no round-in-round nesting.
