# Photo Standard v2 — Living Editorial Portraits

Branch: `photo-v2-living-editorial`

## Goal

Build a coherent portrait system for «Путь покорителя» that feels like a living intellectual archive: human, editorial, credible and contemporary.

Consistency must come from balanced exposure, believable skin, restrained color, mid-tone density, clean crop and photographic authenticity — not from forcing every portrait through one global CSS filter.

## Non-negotiable technical rule

The current site applies one common color treatment to all files in `assets/photo/`. This is not suitable for heterogeneous source material. The v2 pipeline must therefore be:

`source photo → visual diagnosis → individual correction → export → website with no global color transform`

Do not merge removal of the legacy global filter into production until the control set of corrected portraits is approved.

## Diagnosis labels

Each portrait receives one or more labels before correction:

- `OVEREXPOSED` — face/highlights too bright, weak mid-tones
- `UNDEREXPOSED` — face too dark, blocked shadows
- `FLAT` — weak tonal separation and local contrast
- `OVERSATURATED` — distracting or excessive color
- `COLOR_CAST` — green/magenta/cyan/yellow contamination
- `MIXED_LIGHT` — incompatible light sources on skin/background
- `BUSY_BACKGROUND` — background competes with the face
- `STERILE_BACKGROUND` — clean but visually dead/clinical background
- `HARD_FLASH` — harsh highlights and abrupt shadow transition
- `LOW_RES` — insufficient detail / compression artifacts
- `GOOD_MINIMAL` — image already works and needs only small correction

## Editorial target

The subject should feel present, intelligent, confident, approachable, contemporary, credible, human and alive.

Avoid a corporate employee directory, passport photograph, memorial portrait, government dossier or obvious AI-generated look.

## Identity preservation

Do not change facial structure, proportions, age, expression, eye color, hairstyle, hairline, facial hair, body shape, wardrobe, accessories or pose.

No de-aging, beautification, face replacement, artificial smile, body reshaping or generated facial detail.

## Skin

- restore healthy warm-neutral skin;
- preserve real texture, pores, wrinkles and facial hair;
- recover mid-tone density in pale or washed-out faces;
- protect skin from global desaturation;
- avoid plastic skin and beauty retouching.

## Tone

- recover physically plausible highlights;
- preserve true blacks without crushing them;
- selectively lift facial shadows when needed;
- introduce subtle editorial contrast only when source is flat;
- keep meaningful tonal transitions across the face.

## Color

- set believable white balance based primarily on skin;
- correct unwanted green, magenta, cyan, orange or mixed-light casts;
- do not globally desaturate the whole image;
- if background is too colorful, reduce its saturation locally while protecting skin and clothing;
- retain environmental color when it adds character or context.

## Background

Preserve the authentic environment when it improves the portrait.

If distracting, reduce background saturation / local contrast / harsh highlights selectively. Do not automatically replace backgrounds with white, beige, gray or fake studio backdrops.

## Crop

Preferred master crop: vertical 4:5.

- eyes around upper third;
- sufficient headroom;
- shoulders / upper torso when source permits;
- no awkward cuts through forehead, chin, hands or joints;
- enough breathing room for responsive web layouts.

## Quality

Perform conservative restoration only. Remove obvious compression, noise and chromatic defects while keeping real texture. Do not hallucinate eyes, teeth, eyelashes, hair strands or skin detail.

## Master AI prompt

```text
Act as a world-class editorial portrait photographer, senior colorist, photo retoucher, and art director for a premium science, technology, education, and leadership media publication.

Your task is to enhance the supplied original portrait photograph, not redesign or regenerate the person.

The final image must feel like a portrait from a sophisticated contemporary editorial magazine: intelligent, human, natural, dimensional, credible, alive, and timeless.

CORE PRINCIPLE
Do not apply a generic preset. First visually diagnose the specific photograph and determine what it actually needs. Different source images may be overexposed, underexposed, oversaturated, flat, low-resolution, affected by mixed lighting, strongly colored backgrounds, harsh flash, poor white balance, or distracting environments. Apply only the corrections necessary for this particular photograph.

ABSOLUTE IDENTITY PRESERVATION
Preserve the person's identity exactly. Do not change facial structure or proportions, eyes, nose, mouth, jawline, ears, head shape, age, expression, eye color, hairstyle, hairline, beard, body shape, clothing, accessories or pose. Do not beautify, de-age, glamorize, slim, reshape or reinterpret the subject.

SKIN
Make skin look healthy, natural, dimensional and alive. Restore believable warm-neutral skin tones without orange, pink, yellow or gray casts. Protect skin from global desaturation. Recover midtone density so pale skin does not look washed out or lifeless. Maintain real skin texture, pores, wrinkles, facial hair and natural imperfections. No plastic skin or beauty retouching.

EXPOSURE AND TONE
Analyze subject and background independently. If overexposed, recover highlight detail where physically plausible, reduce facial hotspots and rebuild midtone density. If too dark, lift facial shadows selectively while retaining true blacks. If flat, add a subtle editorial S-curve, better black-point definition and natural local contrast. Avoid crushed blacks and blown highlights.

COLOR
Establish an accurate neutral white balance based primarily on believable skin. Correct unwanted green, magenta, cyan, orange or mixed-light color casts. Do not globally desaturate the photograph. If the background contains excessive or competing colors, reduce saturation and contrast selectively in the background only while protecting the subject and skin. Retain meaningful environmental colors when they contribute to character or context.

BACKGROUND
Preserve the authentic original environment whenever it improves the portrait. If distracting, reduce saturation selectively, lower local contrast and soften distracting highlights. Do not automatically replace real backgrounds with white, beige, gray or artificial studio backgrounds. Avoid sterile corporate headshot, passport, funeral portrait, memorial portrait, government dossier or artificial AI studio aesthetics.

EYES AND FACIAL DETAIL
Eyes should look naturally clear and present, not artificially enhanced. Use only subtle local contrast and catchlight recovery if the information already exists in the source. Never generate new eyelashes, iris detail, teeth, hair strands or facial features.

CLOTHING
Preserve the exact wardrobe and true material. Recover texture in dark suits, black shirts, jackets or uniforms without lifting blacks into gray. Control excessively bright or saturated clothing colors without eliminating their natural identity.

COMPOSITION
Prepare a strong editorial portrait crop suitable for a premium website. Preferred master crop: vertical 4:5. Keep eyes approximately around the upper third. Preserve sufficient headroom. Include shoulders and upper torso whenever the source allows it. Maintain natural proportions and enough visual breathing room for responsive layouts.

IMAGE QUALITY
If resolution is limited, perform conservative texture-preserving restoration and upscale only as necessary. Do not hallucinate facial details. Reduce compression artifacts, noise, chromatic aberration and obvious digital defects while maintaining authentic photographic texture. No oversharpening.

EDITORIAL CONSISTENCY
The complete portrait collection should feel like a living intellectual archive rather than a set of identically filtered employee photographs. Consistency must come from natural skin rendering, balanced exposure, controlled saturation, mid-tone dimensionality, clean tonal hierarchy, professional crop, background restraint and photographic authenticity. It must not come from forcing every photograph into the same palette or background.

DESIRED IMPRESSION
Present. Intelligent. Confident. Approachable. Contemporary. Credible. Human. Alive.

FORBIDDEN
No face replacement. No face reconstruction. No beauty filter. No skin plasticization. No de-aging. No artificial smile. No expression change. No eye-color change. No body reshaping. No wardrobe replacement. No hairstyle change. No fake studio lighting. No dramatic cinematic grading. No excessive teal-and-orange. No sepia. No washed-out or gray skin. No excessive background saturation. No crushed blacks. No blown facial highlights. No heavy vignette. No HDR look. No CGI appearance. No obvious AI aesthetic.

FINAL QUALITY TARGET
The finished portrait should look as though an experienced editorial photographer and professional colorist carefully refined the original photograph for publication — not as though an AI generated a new version of the person.

Natural first. Editorial second. Consistency third. Identity preservation is non-negotiable.
```

## Control set protocol

Before processing the whole archive, approve a deliberately diverse control set of 5 portraits:

1. bright / white-background portrait;
2. dark or low-key portrait;
3. colorful environmental portrait;
4. mixed-light or difficult source;
5. already-good source requiring minimal correction.

Only after the five look coherent as one editorial family should the same decision logic be scaled to the rest of the archive.

## First confirmed audit from supplied screenshots

### `sergey-ezhov.jpg`

Status: `OVEREXPOSED + LOW_MIDTONE_DENSITY + STERILE_BACKGROUND`

Treatment direction:
- recover facial highlight separation where source allows;
- rebuild skin mid-tones and subtle warm-neutral color;
- preserve dense black suit with fabric detail;
- keep clean background but reduce the clinical / memorial feeling through tonal separation rather than fake background replacement;
- avoid aggressive saturation or cosmetic retouching.

### `aleksandr-ermolchev.webp`

Status: `GOOD_MINIMAL`

Treatment direction:
- use as a tonal reference, not as a literal preset;
- preserve the existing depth between subject and environment;
- keep natural skin density and restrained color;
- only normalize crop / microcontrast if required by the final grid.

## QA checklist before export

- same person, same expression, same age;
- skin looks alive, not pale-gray or orange;
- eyes clear but not AI-sharp;
- no crushed jacket/suit detail;
- no clipped facial highlights;
- background supports the face;
- crop works in 4:5, 1:1 and responsive card contexts;
- image still looks photographic at 200% zoom;
- no single global filter required on the website.
