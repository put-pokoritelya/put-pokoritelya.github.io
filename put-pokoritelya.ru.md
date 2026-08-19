# Design Map

## Spacing Scale
- Component gaps: 4px, 10px, 16px, 18px, 26px, 28px (mixed `gap` + `margin`, no strict base unit)
- Section rhythm: ~78px vertical padding inside full-bleed bands
- Container: `.wrap` max-width 1240px, bands full-bleed outside it

## Font Hierarchy
- Display h1 — 108px Prata, weight 400, letter-spacing −1.62px, line-height 1.02
- h2 — 48px Prata, weight 400, letter-spacing −1.06px
- h3 — 32px Prata, weight 400
- Lede — 19–22px Golos Text, weight 400
- Body — 14–15px Golos Text, weight 400, line-length capped in `ch` (48–62ch)
- Label — 12–13px IBM Plex Mono, weight 600, UPPERCASE, letter-spacing 1.2–1.44px

## Color Palette
- Background — `#FBF9F5` (warm cream, ~24% area)
- Background band — `#F2F0ED` (~46% area)
- Background band deep — `#E4E2DE` (partner block, ~19%)
- Hero dark — `#141D27` (deep navy, hero only, ~9%)
- Text primary — `#1B1C1A` (warm near-black)
- Text muted — `#474743`
- Text on dark — `#AFC1D2` (cool blue-grey, hero only)
- Accent — `#B6171E` (rubric dashes, links)
- Accent CTA — `#C42221` (primary button fill)

## Image Ratios
- Episode / feature cards — 16:9 (1280×720 source)
- Voices avatars & book thumb — 16:9 cropped

## Component Tokens
- Border-radius: `0px` everywhere (buttons, cards, images, tags — no rounded components)
- Shadows: none (depth from background bands + 1px borders only)
- Primary grid: `ol.works` 3 columns, gutter **1px** (hairline dividers), 12 grids total
- Buttons: 12px mono, UPPERCASE, letter-spacing 1.44px, radius 0, padding ~15px 26px
- Motion: `color` / `border-color` / `transform` / `filter` transitions, 0.2–0.45s
- Accessibility gaps: no `:focus-visible`, no `prefers-reduced-motion` guard detected

---

# Taste DNA

### Print Flatness Over App Depth
- **Trigger**: When deciding how episode, quote, and topic blocks should sit on the page.
- **Decision**: Gave everything hard 0px corners and zero shadow, dividing cells with a 1px hairline, over the rounded-card-with-drop-shadow surface most podcast/CMS templates ship with.
- **Reason**: A reader trusts a magazine differently than an app; sharp edges and flat ink say "this is edited writing," not "this is a feed to swipe."
- **Evidence**: `radii: []` and `shadows: []` page-wide; `ol.works` grid gap = 1px; buttons `border-radius:0`.

### Three Typefaces as a Signage System
- **Trigger**: When one page had to carry a monumental brand name, dense interview prose, and dozens of small meta labels.
- **Decision**: Assigned each a dedicated typeface — Prata for display, Golos Text for body/nav, IBM Plex Mono for labels/buttons — over the economy of one family in several weights.
- **Reason**: People navigate faster when form encodes function; an all-caps mono tag is understood as a label before it's read, and a Prata line as a title.
- **Evidence**: Prata confined to h1/h2/h3 (108/48/32px, wt 400); Golos 313 uses in body/nav; Mono 179 uses at 12–13px, letter-spacing 1.2–1.44px — no family used outside its role.

### One Dark Room, Then Daylight
- **Trigger**: When choosing the site's overall value key.
- **Decision**: Lit a single dark navy hero with a constellation canvas, then dropped into warm cream for everything below, over committing to one consistent mode top-to-bottom.
- **Reason**: The dark opener reads as a night sky / title card matching the "покоритель" frontier theme, and crossing into daylight physically signals "the reading starts here."
- **Evidence**: `#141D27` navy = 8.6% of area, hero only; cream `#FBF9F5` + bands `#F2F0ED`/`#E4E2DE` ≈ 89%; hero body text shifts to cool `#AFC1D2`, unused elsewhere.

### Red Kept Scarce
- **Trigger**: When a red-accented brand could have washed headers, borders, and section fills in red.
- **Decision**: Rationed red to rubric dashes, inline links, and the single primary button, leaving all structure in warm neutrals — over spending the brand color for raw visibility.
- **Reason**: An accent only means "look here / act here" if it's rare; once red coats backgrounds, nothing is emphasized and the page starts to shout.
- **Evidence**: Red as text 23× vs ink `#1B1C1A` 160×; red background area ≈0.1%; exactly one `.btn-primary` fill `#C42221`; all section bands neutral.
