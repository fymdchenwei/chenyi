# 陈一

An offline Progressive Web App that teaches English vocabulary from the FLTRP starter textbook (外研社英语 一年级上册 · 预备级) to a Chinese first-grader. Lessons are played as map levels. Stars from levels pay for a card draw. Everything runs in the browser: no backend, and after the first visit the app works offline.

The interface is Simplified Chinese. The words and sentences being learned are English.

Playable in this version: Unit 1 Hello!, Unit 2 Numbers, Unit 3 Family. Units 4–6 appear on the map as locked.

Hosted site: [https://fymdchenwei.github.io/chenyi/](https://fymdchenwei.github.io/chenyi/)

## Play

Open the site in Safari on an iPhone, then **Add to Home Screen**. The manifest asks for standalone display and landscape. A portrait phone shows a “turn sideways” card. Designed first for iPhone 15 Pro landscape (852×393 CSS pixels) and still usable on iPad landscape.

- **地图** — one island per unit, seven nodes (six lessons plus a Boss). Clear a node to open the next. Unit 2 opens after Unit 1’s Boss, Unit 3 after Unit 2’s Boss.
- **学一学** — word cards with a picture, English, and Chinese. Tap the speaker for an en-US voice at a slow rate, or **慢** for an even slower reading. If the device has no voice, a note asks a parent to read aloud.
- **闯关** — questions are generated from the unit JSON. A wrong answer gets a short hint and is asked again later. 3 stars with no mistakes, 2 stars with one mistake or hint, 1 star otherwise. Replaying a perfected level still grants 2 stars. At 2 stars per draw, a perfect level (3 stars) pays for one draw and banks 1 star, so two perfect levels pay for three draws — about 1–2 draws a level. A perfected replay pays for exactly one draw. The map still shows 1–3 stars; that rating is the currency gained on a first clear.
- **抽卡** — 2 stars for one draw, 18 stars for 十连抽 (ten draws, 2 stars off the 20-star full price). Rarities: 普通 / 稀有 / 史诗 / 传说. Pity: an 史诗 within 8 draws, a 传说 within 20. A duplicate raises that card’s star level by 1, up to Lv.10. At Lv.10, another copy refunds 1 star and shows MAX. A legendary draw fills the screen. 十连抽 flips through the ten cards (or 快进) and then shows a summary grid: 新卡, an upgrade level, or MAX, with the best rarity tagged 最佳.
- **相册** — four series, collected cards versus locked silhouettes, a chest when the series is complete (4 stars, two draws). Tap an owned card for the large art, rarity, Lv.1–10, flavor text, a short 知识点, and one related English word with a speaker button. A locked card shows the silhouette and a one-line hint only.
- **家长** — a two-digit addition gate, then today’s time limit, words learned, per-word accuracy, stars, and reset. Progress stays in `localStorage` under `chenyi.v1`.

Question types, picked from what each unit can support:

| Type | What the child does |
| --- | --- |
| Listen and choose a picture | Hear the word, tap the picture |
| Who says it | Hear a sentence from the story, tap the character |
| Meaning, both ways | English → Chinese, and Chinese → English |
| Fill the blank | A song line or sentence with a missing word |
| Put lines in order | Three lines of a dialogue or story |
| Count | Unit 2 only: see a number of balloons, or hear a number and pick the picture |
| Dictation | Hear the word and spell it with letter tiles. **慢** replays slowly. **提示** fills the next letter |
| Boss | Only dictation and meaning questions |

Words that share a Chinese meaning never compete as distractors. `I` / `me` (我) and `am` / `is` (是) stay out of each other’s options. `grandpa` is shown as 爷爷/外公 (the book’s 祖父；外祖父), and the same for grandma, sister, and brother — the two senses are one label, not two answers. Lines and exercises marked `"uncertain": true` are not used as questions. Uncertain *words* such as `photo` (the flag there is only about curriculum bold type) stay in the word list.

## Develop

```bash
npm install
npm run dev
npm run check   # question generator invariants
npm run build
npm run preview
```

Dev and preview both use the base path `/chenyi/`, so the local app is at `http://127.0.0.1:5173/chenyi/` (dev) or port 4173 (preview).

Stack: Vite, TypeScript, no UI framework. Sounds are synthesized with Web Audio. Pronunciation uses `speechSynthesis` (`en-US`, rate 0.72, turtle 0.45). Fredoka and ZCOOL KuaiLe are bundled so the rounded type works offline.

## Deploy

`.github/workflows/pages.yml` builds on every push to `main` and deploys the `dist/` folder with GitHub Actions. In the repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once. The Vite `base` is `/chenyi/`, matching `https://fymdchenwei.github.io/chenyi/`.

The service worker precaches the app shell, fonts, unit JSON, and card art. The first online visit fills the cache; later visits, including Home Screen launches, work with no network.

## Unit JSON

The game does not hard-code the word list. `public/content/units.json` is the registry:

```json
{
  "book": "外研社（FLTRP）英语 一年级 上册（预备级），2024 新版",
  "units": [
    { "unit": 1, "title_en": "Hello!", "title_zh": "你好！", "file": "unit1.json", "playable": true },
    { "unit": 4, "title_en": "My classroom", "title_zh": "我的教室", "file": null, "playable": false }
  ]
}
```

To drop in Unit 4 later: add `public/content/unit4.json`, point `file` at it, and set `"playable": true`. No other code change is required. Level *types* (learn, listen, who, meaning, fill, order, count, dictation, boss) are chosen from the unit number in `src/questions.ts`. Units 1–3 have hand-tuned mixes. Any later unit still gets a 7-node path; extend `PLANS` in that file if the new unit should emphasize different question types (for example counting only fits a numbers unit).

Each unit file can keep the full textbook notes. The loader reads only:

| Field | Use |
| --- | --- |
| `unit`, `title_en`, `title_zh` | Map label. `unit` must match the registry. |
| `words[]` | `id`, `en`, `zh`, optional `emoji_hint`. These become cards, meaning items, pictures, and dictation. |
| `sentences[]` | `en`, `zh`, optional `uncertain`. Fill-in-the-blank and “skip this line” checks. |
| `song.lines[]` | `en`, `zh`. Fill-in-the-blank from the song or chant. |
| `dialogues[]` | `id`, optional `uncertain`, `lines[]` with `speaker`, `en`, `zh`, optional `uncertain`. Who-says-it and ordering. |

Ignored on purpose: page numbers, `extra_activities`, `match_exercise`, phonics, and anything else. If a sentence or dialogue line has `"uncertain": true`, or its English matches an uncertain sentence, it is not turned into a question.

Headwords are normalized for display:

- `let's = let us` → **let's**
- `am (I'm = I am)` → **am**, with the note `I'm = I am` on the learn card

Dictation uses the headword only when it is 3–10 letters with no apostrophe, so `let's`, `I`, `am`, `my`, `is`, and `me` are practiced in other question types instead of spelling.

Kid-facing Chinese is a short label (`你好`, `爷爷/外公`, `谢谢`). The learn card also shows the book’s wording when it differs (`词表：喂，你好`, `词表：祖父；外祖父`).

`public/content/units_overview.json` is the scanned book outline only. The app does not need it at runtime.

## Card art

Card draws read `public/content/cards/manifest.json`. Balance numbers live here so they can change without a code edit:

| Field | Meaning |
| --- | --- |
| `drawCost` | Stars for one draw (2) |
| `tenDrawCost` | Stars for 十连抽 (18) |
| `pityEpic`, `pityLegendary` | Guaranteed rarity deadlines (8 and 20) |
| `weights` | Relative odds before pity (`common`, `rare`, `epic`, `legendary`) |
| `maxLevel` | Highest card star level (10). Each duplicate adds 1 |
| `maxRefund` | Stars returned when a draw hits a card already at `maxLevel` |
| `seriesReward` | Stars from the album chest (4) |
| `cardBack` | Filename of the card back, inside `images/` |
| `series[]` | `id`, `name`, `icon` (not shown; tabs use drawn icons), `color`, `cards[]` |

Each card:

```json
{
  "id": "star-knight",
  "name": "星盾骑士",
  "rarity": "common",
  "image": "heroes/star-knight.webp",
  "emoji": "🛡️",
  "blurb": "举着星星盾的小骑士"
}
```

`image` is a path relative to `public/content/cards/images/`. The four folders are `heroes/`, `journey/`, `digibeasts/`, and `zodiac/`.

**To replace a picture:** put your file at the same relative path (SVG, PNG, or WebP all work — the album and the reveal screen use an `<img>`). Keep the `image` string in the manifest pointed at that file. You do not need to change TypeScript. Rarity frames, the holographic legendary border, the Chinese rarity name, and the flip animation stay in CSS and wrap whatever image you supply.

If an image fails to load, the card `emoji` is only a data fallback in the manifest; the on-screen frame still shows. Prefer a square-ish illustration with the character large in the middle, because album tiles crop the image with `object-fit: cover`.

The checked-in art is original 3D chibi (Q版) WebP, about 400×520. Characters were generated with an image model from original prompts — big head, glossy soft shading, saturated colors, thick rim light — then cut out and placed on procedural gradients. Each rarity has its own frame, drawn in that step so every card of the same rarity matches: 普通 is a plain silver rim, 稀有 a blue rim with corner dots, 史诗 a purple rim with diamonds, 传说 a gold rim with corner stars and a stronger glow. The map monkey and the little map dragon use the same rendered style on a transparent background.

`public/content/cards/lore.json` is keyed by the same card `id`. Each entry has `hint` (locked cards), `lore` (two or three short Chinese sentences: a real Journey to the West or zodiac fact, or an original intro for heroes and digital beasts), and `word` (`en` + `zh`) for the speaker button. Card ids in the manifest do not change.

Owned cards in `localStorage` key `chenyi.v1` used to be copy counts. On load, a save without `ownedLevels` turns every owned id into level 1 and sets `ownedLevels`, then writes the save back. Later saves store the star level (1–10) and are left as-is. A broken save still falls back to a new game.

These are original figures. Journey to the West characters and the twelve zodiac animals are public-domain subjects drawn in this style. The hero series only borrows a general “colorful armored hero” feeling. Nothing is traced from Ultraman, Digimon, Pokémon, Dragon Ball, Disney, or any other copyrighted character.

Limitation: the figures come from an image model, so a hand or prop can be slightly uneven. Frames, glows, and backgrounds are procedural, which keeps the set consistent. Album tiles still crop with `object-fit: cover`, so the character stays large in the middle.

`scripts/generate-cards.mjs` no longer overwrites this art. It only rebuilds the old geometric SVG placeholders when `REGENERATE_PLACEHOLDERS=1`.

## Word pictures

Lesson pictures live in `public/content/words/` as square WebP (about 320×320). The service worker precaches every `webp` under the build, so they still load offline.

| File | Where it shows |
| --- | --- |
| `u1_w01.webp` … `u1_w12.webp` | Unit 1 learn cards, and level 2 (听音选意) options |
| `u2_w08.webp` … `u2_w11.webp` | balloon, thank-you gift, please (tea), number (abacus) |
| `u3_w01.webp` … `u3_w13.webp` | Unit 3 learn cards and the family pictures in 听音选图 |
| `face-taotao.webp` and the other `face-*.webp` | 谁说的 portraits |

Numbers one–seven are drawn in the page, not as files: a big colored numeral plus a row of balloons, so 3 and 4 cannot be confused. 数一数 uses the same balloons with no numeral, in rows a child can count. Greetings and other words that are not a single object (hello, I, am, please, …) are not picture-only choices. Unit 1 level 2 is 听音选意: hear the word, then tap a picture with its Chinese meaning. Unit 2 level 3 only offers one–seven and balloon. Unit 3 level 2 only offers family members a child can tell apart (mum, dad, grandpa, grandma, sister, brother, family, love).

The pictures are original flat cartoons from an image model (one subject, cream background). They are not the textbook’s illustrations. A hand or prop can still be slightly uneven. `how` is a puzzled owl with a question mark, which is a symbol rather than a letter.

## iPhone notes

- `viewport-fit=cover`, `user-scalable=no`, and `touch-action: manipulation` so the page does not pinch-zoom.
- `overscroll-behavior: none` plus a `touchmove` guard outside scroll areas, so the page does not rubber-band. Word lists and the album grid scroll inside `.scroll`.
- Safe-area insets pad the screen, including the Dynamic Island side in landscape.
- `apple-mobile-web-app-capable`, status bar, title, and a 180×180 `apple-touch-icon` are in `index.html`. Manifest `display` is `standalone` and `orientation` is `landscape`.
