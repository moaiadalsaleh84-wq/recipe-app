# Pantry Pop design

How the app looks and sounds, as of commit `f9e6b04` (restored on 18 Nov 2026).
**Read this before changing anything visual.** If a change isn't asked for, don't make it.

All values live in code. This file describes them; the code is the source of truth:
- colors, type, spacing, radius, motion: [`src/theme/index.ts`](src/theme/index.ts)
- Biscuit's drawing and colors: [`src/components/mascot/art.tsx`](src/components/mascot/art.tsx)
- Biscuit's moods: [`src/components/mascot/moods.ts`](src/components/mascot/moods.ts)
- what Biscuit says: [`src/components/mascot/lines.ts`](src/components/mascot/lines.ts)

## The look in one line

A bright, playful kitchen: a warm cream page, white cards, dark brown text, chunky rounded
buttons that sit on a darker "lip" and press down when tapped, and Biscuit the chef cat.

## Colors

Each color has one job. Only ONE filled tomato button per screen.

### Brand

| Name | Hex | Job |
| --- | --- | --- |
| cream | `#FFF8EE` | the page background |
| cocoa | `#3D2314` | text |
| tomato | `#F2431F` | the brand red (decoration) |
| green | `#1F9A45` | brand green |
| yellow | `#FFC933` | rewards: streaks, badges, levels |
| plum | `#7A5C8E` | information, used sparingly |
| berry | `#F0546B` | favorites (hearts) |

### Light mode

| Token | Hex | Used for |
| --- | --- | --- |
| `tint` | `#B82D0C` | tomato text and icons, links |
| `tintFill` | `#D9381A` | the main button (white text, 4.6:1) |
| `tintDeep` | `#A5280C` | the lip under the main button |
| `tintSoft` | `#FFE6DC` | quiet tomato backgrounds, selected tab |
| `success` | `#178039` | done, "Clear done", selected chips |
| `successDeep` / `successSoft` / `successText` | `#0F5E28` / `#DDF4E3` / `#15703A` | |
| `reward` | `#FFC933` | streak card, badges, chef level |
| `rewardDeep` / `rewardSoft` / `rewardText` | `#E0A100` / `#FFF2C7` / `#8A5A00` | |
| `info` / `infoSoft` / `infoText` | `#7A5C8E` / `#F1E8F4` / `#6A4E7D` | |
| `accent` | `#F0546B` | hearts |
| `destructive` | `#E5342B` | delete |
| `protein` / `carbs` / `fat` | `#D46A57` / `#E2A93B` / `#6E9E86` | nutrition |
| `label` | `#3D2314` | main text |
| `secondaryLabel` | `#7A5E4D` | secondary text |
| `tertiaryLabel` | `#7F6655` | placeholders, quiet icons |
| `background` | `#FFF8EE` | page |
| `cell` / `elevated` | `#FFFFFF` | cards |
| `fill` / `fillStrong` | `#F8ECDB` / `#F1E2CC` | inputs, progress tracks |
| `separator` | `#F4E7D5` | lines between rows |
| `border` | `#F1E2CC` | the soft 2pt edge of cards |
| `lip` | `#EAD7BC` | the 3D edge under cards and white buttons |

### Dark mode

Warm darks; cards clearly lighter than the page.

| Token | Hex |
| --- | --- |
| `background` | `#211713` |
| `cell` / `elevated` | `#38281F` / `#423026` |
| `fill` / `fillStrong` | `#2E2019` / `#4A372B` |
| `border` / `separator` | `#4A372B` |
| `lip` | `#140D0A` |
| `label` / `secondaryLabel` / `tertiaryLabel` | `#FFF3E4` / `#C9AE98` / `#B09887` |
| `tint` / `tintFill` / `tintSoft` | `#FF8A66` / `#D9381A` / `#4A261B` |
| `success` / `successText` | `#178039` / `#6FD98C` |
| `reward` / `rewardText` | `#FFC933` / `#FFD666` |
| `accent` / `destructive` | `#FF7F92` / `#FF6A5E` |

Text must pass WCAG AA contrast (4.5:1, or 3:1 for large text).

## Fonts

| Use | Font |
| --- | --- |
| Titles, buttons, chips, numbers | **Fredoka** (`Fredoka_600SemiBold`, `Fredoka_700Bold`, `Fredoka_500Medium`) |
| Everything you read | the system font (SF Pro on iPhone) |

Fredoka weights are separate files, so `fontWeight` stays `'normal'` on Fredoka text.

| Style | Size / line height | Font |
| --- | --- | --- |
| `largeTitle` | 34 / 40 | Fredoka Bold |
| `title1` | 28 / 34 | Fredoka Bold |
| `title2` | 23 / 28 | Fredoka SemiBold |
| `title3` | 20 / 25 | Fredoka SemiBold |
| `headline` | 18 / 23 | Fredoka SemiBold |
| `button` | 19 / 24 | Fredoka SemiBold |
| `body` | 17 / 24 | system, regular |
| `callout` | 16 / 22 | system |
| `subhead` | 15 / 20 | system |
| `footnote` | 13 / 18 | system |
| `caption1` / `caption2` | 12 / 16, 11 / 13 | system, medium |

Sentence case everywhere. No all-caps labels.

## Spacing and layout

- An 8pt grid: 4, 8, 12, 16, 24, 32, 48.
- Screen side margin **16**. Gap between cards **16**. Between sections **24**. Inside cards **16**.
- Bottom padding of scrolling screens **32**.
- Every tap target is at least **44 × 44**.
- Tab screens use `TabScreen`: a large title that collapses into a small centered title on a
  blurred cream bar with a hairline. Content never goes under the status bar.

## Corners

| Size | Radius | Used for |
| --- | --- | --- |
| `xs` | 8 | small bits |
| `sm` | 12 | thumbnails |
| `md` | 16 | buttons, inputs, rows |
| `lg` | 20 | cards and photos (`layout.cardRadius`) |
| `xl` | 24 | sheets and big cards |
| `pill` | 999 | chips, small round buttons |

Use `borderCurve: 'continuous'` for Apple-style corners.

## Buttons and cards (the chunky style)

- **Buttons** (`<Button>` in `src/components/ui.tsx`, built on `<Chunky>`): a colored face on a
  darker **lip** (5pt for large buttons, 4pt for small). The face sinks onto the lip while pressed
  and springs back. Large: min height 52, radius 16. Medium: min height 44.
  - `filled`: the ONE main action (tomato face `#D9381A`, lip `#A5280C`, white text)
  - `success`: finishing something (green)
  - `reward`: claiming a reward (yellow)
  - `tinted`: every other action (white face, soft edge, tomato text)
  - `plain`: text only
- **Cards** (`t.chunky.card`): white, radius 20, a 2pt `border` edge and a 4pt `lip` underneath.
- **Chips**: pill shape, Fredoka label, 4pt lip. Selected chips turn **green with a check**, so
  tomato stays reserved for the main action.
- **Header buttons**: round, white, 44pt, tomato icon, small lip.
- **Tab bar**: white with a top border, big icons in a soft tomato pill on the selected tab,
  short labels (11pt Fredoka).
- **Photos**: radius 20. The recipe page opens with a full-width photo and a white sheet over it.
- **Motion**: springs from `motion` in the theme (press, release, pop, settle). Respect Reduce Motion.

## Biscuit, the character

Biscuit is an orange **chef cat**, the app's one mascot, drawn as layered vector art
(`src/components/mascot/art.tsx`) and animated by `BiscuitRig.tsx`. The app shows him only
through `<Mascot>` and `<MascotSays>`.

**Look**
- Sticker / emote style: one thick warm-brown outline on every shape (`#4A2A1A`, width 6.5 on a
  200 grid), flat colors with one soft shade tone and small highlights.
- Chibi proportions: the head is about 58% of his height.
- Orange tabby fur `#F7A24E` (shade `#E5832F`, light `#FFC889`, stripes `#CF6A22`), cream muzzle
  and belly `#FFF5E6`, pink inner ears `#F8A5AE`, nose `#EC6F86`, rosy cheeks `#FF8F8F`.
- Big dark eyes `#2E1A12` with white highlights.
- A white chef hat (shade `#ECE3D7`) and a red neckerchief `#E8402B` (shade `#B9301E`).
- Props: pot (red), cutting board and knife, spoon, bowl, cookie.

**Moods** (names are fixed, they may map to a Rive file later):
idle, happy, excited, love, thinking, hungry, eating, cooking, chopping, worried, shocked,
sleepy, proud, celebrating, oops, plus the timer actions wave, watch, alarm.
Each mood changes the eyes, brows, mouth, paws and body; the line he says carries the mood.

**Rules**
- Biscuit acts out his line, then relaxes. Busy moods (cooking, chopping, eating, sleepy, alarm)
  keep going.
- He blinks, breathes, and his eyes follow your finger. Tap him to pet him (he loves it).
- Where he appears: Recipes (greeting and tips), the recipe page, Cook Mode, Plan, Pantry,
  Groceries, Progress, onboarding, the paywall, import, empty states, and "Surprise me".
- Speech bubbles: white, rounded, a pointer toward his mouth, one short line (about 8 words).
- Keep him readable at small sizes (about 64pt in lists, up to 200pt in celebrations).

## Tone of voice

- Biscuit: warm, funny and encouraging. A little clumsy, "taste tests" half the ingredients,
  loves a nap in a sunny spot, and is your biggest fan. Never preachy about food. Short lines.
- Interface text: plain, friendly, sentence case. Buttons say exactly what happens
  ("Add to groceries", "Cook now", "Clear done"). Errors say what went wrong and what to do.
- Honest: no fake timers, invented reviews, pretend data or hidden prices.

## Do not change

Unless the owner explicitly asks for it:

1. The color palette above (cream page, tomato main action, green success, yellow rewards).
2. The fonts: Fredoka for titles and buttons, the system font for reading.
3. The chunky style: buttons and cards with a lip, pressing down when tapped.
4. Biscuit's design: the orange outlined chef cat, his hat, scarf, proportions and colors.
5. Biscuit's mood names and the places he appears.
6. The layout of the five tabs: Recipes, Plan, Pantry, Groceries, Progress.
7. The tab bar style and the collapsing large titles.
8. Corner radii, spacing and the 44pt minimum tap size.
9. Tone of voice and the honesty rules.
