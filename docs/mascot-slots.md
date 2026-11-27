# The fox

`src/components/mascot/Fox.tsx`: `<Fox pose="…" size={…} />`, and `<FoxSays pose="…" text="…" />`
for the fox with one short speech bubble.

He breathes gently (up 2pt and back, 2.4 s) and blinks every 4–7 s. No scale pops. With Reduce
Motion he's a still picture. He only appears where he adds feeling, never as decoration.

## Poses

`idle`, `happy`, `wave`, `reading`, `oops`, `chef`, `alert`, `cheer`, `sleepy` (see `foxPoses.ts`).

## Adding the artwork

1. Put transparent PNGs in `assets/mascot/`, named `fox-<pose>.png` (for example `fox-happy.png`).
   For blinking, add the same pose with closed eyes as `fox-<pose>-blink.png` (optional).
2. Run `node scripts/fox-images.mjs`. It writes `src/components/mascot/foxImages.ts`.

A pose without a PNG uses the drawn fox (`FoxArt.tsx`), so every spot works before the art is in.

## Where he is

| Screen | Pose | What he says / does |
| --- | --- | --- |
| Recipes (Home), under the greeting | changes | One bubble: the streak, today's cooking, tonight's plan or the day's idea. Tap: opens it |
| Empty shopping list | `sleepy` | |
| Plan, when the week is empty | `idle` | "Plan one dinner and I'll write the shopping list." |
| You, empty cooking history | `sleepy` | |
| Search with no results (Recipes, Discover, recipe picker) | `oops` | |
| Empty mood, cookbook, Discover | `sleepy` | |
| Recipe or cookbook not found | `oops` | |
| Import: loading | `reading` | |
| Import: error | `oops` | |
| Get ready (Cook mode) | `chef`, then `cheer` | "Let's gather everything first." → "Everything's here. Let's cook!" |
| Cook mode step card | `chef` / `happy` / `alert` | Happy for a moment after each step; alert while a timer rings |
| Finish screen | `cheer` | |
| Full-screen celebrations (streak, level, badge) | `cheer` | On the card's top edge |
| Welcome (first screen) | `wave` | |
| "Setting up your kitchen" | `reading` | |
