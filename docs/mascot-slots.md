# Fox mascot slots (Phase 2)

The component is `src/components/mascot/FoxMascot.tsx`: `<FoxMascot mood="…" size={…} />`.
Moods: `happy`, `excited`, `chef`, `celebration`, `playful`, `studying`, `champion`, `loving`.

Until the art exists it draws nothing (`FOX_READY = false`), so screens look finished without it.
To see every slot while designing, set `SHOW_MASCOT_PLACEHOLDER = true` in
`src/components/pop/MascotSlot.tsx`: each slot then shows a dashed circle with its mood.

## Plugging the art in

1. Add the files to `assets/mascot/fox/` (one per mood: PNG/WebP, or Lottie/Rive).
2. Fill `FOX_ART` in `FoxMascot.tsx` (mood → `require(...)`) and render it in place of the
   placeholder circle.
3. Set `FOX_READY = true`.

## Where the slots are

| Screen | File | Mood | Size |
| --- | --- | --- | --- |
| Welcome (first screen), above the headline | `src/app/onboarding.tsx` (Welcome) | `happy` | 88 |
| "Setting up your kitchen…" | `src/app/onboarding.tsx` (Building) | `studying` | 96 |
| Cook Mode finish screen | `src/app/cook/[id].tsx` (Finish) | `celebration` | 120 |
| Empty shopping list (replaces the basket circle) | `src/app/(tabs)/groceries/index.tsx` | `playful` | 128 |
| Empty pantry card | `src/app/(tabs)/pantry/index.tsx` | `chef` | 88 |
| You tab header, before your name | `src/app/(tabs)/progress/index.tsx` | `champion` | 64 |
| Paywall, top | `src/app/paywall.tsx` | `loving` | 104 |

`excited` is free for the streak moments (e.g. the streak card on You) when the art arrives.
