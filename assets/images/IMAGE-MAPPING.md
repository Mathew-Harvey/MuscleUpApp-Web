# Image mapping: Ring Muscle Up Program ↔ Web app

This folder contains **uniform programme images** aligned to *The Ring Muscle Up — The complete training guide* (31-page PDF). The web app uses them in **Level detail** exercise cards: each exercise shows one reference image or a **progression set** (multiple images in order) above the video. **Images are never cropped** (they use `object-fit: contain`).

## How images are served

- The server serves this folder at **`/assets`** (e.g. `/assets/images/ringhang.png`).
- In **`public/js/app.js`**, `EXERCISE_IMAGES` (single image) and `EXERCISE_PROGRESSION_IMAGES` (ordered array of filenames) map exercise keys to assets. `getImagesForExercise(ex)` returns an array of filenames; when a progression set exists for that exercise, the full set is shown.

## Exercise key → image (current mapping)

| Exercise key (API)              | Image file                    | Programme context (PDF)        |
|---------------------------------|-------------------------------|--------------------------------|
| `false_grip_stretch`            | `fgringstretch.png`           | Mobility — false grip stretch  |
| `arm_extension_stretch`         | `armExtensionStretch.png`     | Mobility — arm extension       |
| `ring_hang`                     | `ringhang.png`                | Level 1 — ring hang           |
| `false_grip`                    | `ringfalsegrip.png`           | Level 1 — false grip          |
| `false_grip_ring_rows`          | `fgringrowtop.png`            | Level 1 — false grip ring rows |
| `ring_push_ups` / `ring_push_ups_turn_out` | `ringpushuptop.png` | Level 1 — ring push ups        |
| `false_grip_hang`               | `fgringhang.png`              | Level 2 — false grip hang      |
| `transition_ring_rows`         | `ringrowtransitionmiddle.png` | Level 2 — transition ring rows |
| `pull_up`                       | `ringpulluptop.png`           | Level 2 — pull up             |
| `bar_dip`                       | `bardipbottom.png`            | Level 2 — bar dip             |
| `false_grip_pull_ups`          | `fgpulluptop.png`             | Level 3 — false grip pull ups |
| `ring_dips` / `ring_dips_turn_out` | `rgmuscledownbottomdip.png` | Level 3 — ring dips with turn out |
| `bent_arm_false_grip_hang`      | `fgpulluptop.png`             | Level 3 — bent arm false grip hang |
| `tempo_eccentric_ring_muscle_up`| `rgmuscledowntop.png`        | Level 4 — tempo eccentric     |
| `ring_muscle_up`                | `ringmu3.png`                 | Level 5 — ring muscle up      |
| `muscle_up_conditioning`       | `ringmu5.png`                 | Level 6 — conditioning        |

If the API uses a different key, add it to `EXERCISE_IMAGES` and/or `EXERCISE_PROGRESSION_IMAGES` in `public/js/app.js`.

## Progression sets (multiple images in order)

When an exercise has an entry in `EXERCISE_PROGRESSION_IMAGES`, the app shows **all** images in that set (no cropping):

| Exercise key | Progression images |
|---------------|--------------------|
| `ring_muscle_up`, `muscle_up_conditioning` | `ringmu1.png` … `ringmu5.png` |
| `tempo_eccentric_ring_muscle_up` | `rgmuscledowntop.png` → `rgmuscledowndiptransition.png` → `rgmuscledownbottomdip.png` → `rgmuscledownbottom.png` |
| `false_grip_ring_rows` | `fgringrowbottom.png`, `fgringrowtop.png` |
| `ring_push_ups`, `ring_push_ups_turn_out` | `ringpushupbottom.png`, `ringpushuptop.png` |
| `transition_ring_rows` | `ringrowtransitiontop.png`, `ringrowtransitionmiddle.png`, `ringrowtransistionbottom.png` |
| `pull_up` | `ringpullupbottom.png`, `ringpullupscapdownmiddle.png`, `ringpulluptop.png` |
| `bar_dip` | `bardiptop.png`, `bardipbottom.png` |
| `false_grip_stretch` | `wrist01.png`, `wrist02.png`, `wrist03.png` |

## Assets in this folder (reference)

| File | Use in programme |
|------|-------------------|
| `armExtensionStretch.png` | Arm extension stretch (mobility) |
| `bardipbottom.png`, `bardiptop.png` | Bar dip positions |
| `fgpulluptop.png` | False grip pull-up top / bent arm hold |
| `fgringhang.png` | False grip hang |
| `fgringrowbottom.png`, `fgringrowtop.png` | False grip ring rows |
| `fgringstretch.png` | False grip stretch (mobility) |
| `rgmuscledownbottom.png`, `rgmuscledownbottomdip.png`, `rgmuscledowndiptransition.png`, `rgmuscledowntop.png` | Eccentric / dip transition |
| `ringfalsegrip.png` | False grip on ring |
| `ringhang.png` | Ring hang |
| `ringmu1.png` … `ringmu5.png` | Ring muscle up progression |
| `ringpullupbottom.png`, `ringpulluptop.png`, etc. | Pull-up positions |
| `ringpushupbottom.png`, `ringpushuptop.png` | Ring push-ups |
| `ringrowtransistionbottom.png`, `ringrowtransitionmiddle.png`, `ringrowtransitiontop.png` | Transition ring rows |
| `wrist01.png` … `wrist03.png` | Wrist / false grip detail |

## Adding or changing images

1. Add or replace the `.png` in **`assets/images/`**.
2. To use it for an exercise, set the exercise key → filename in **`EXERCISE_IMAGES`** in `public/js/app.js`.
3. Restart the dev server so `/assets` static serving picks up new files.
