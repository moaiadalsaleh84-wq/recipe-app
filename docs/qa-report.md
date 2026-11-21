# QA report

Checked 21 Nov 2026 on branch `pop-redesign` (after the 7 bug fixes in 2033e42), in the browser build of the app.

**How:** every screen in the list below, at **375pt and 430pt** wide, with **normal text and the largest allowed text** (the app caps text at 1.3×; the browser can't use the iPhone text setting, so all text was scaled 1.3× by the test script). A script took ~400 screenshots, scrolling each screen to the end. It also flagged cut-off text ("…"), words split mid-word, a single word alone on the last line, numbers split from their unit, tap targets under 44pt and buttons with no label. Every flag and screenshot was then checked by eye.

**Screens:** onboarding (every step), paywall (Yearly + Monthly), Welcome to Pro, Home (to the bottom), Quick / My pantry / Cozy / Surprise me, search (results + none), recipe page (scrolled through, 1/2/4/6 people, Metric + US), Get ready, Cook Mode (every step; timers running, stopped and done), finish screen, Plan (filled + empty), Pantry (empty + with items), shopping list (empty, partly ticked, all ticked), You (filled + empty), Settings, Photo credits, Import.

**Screenshots** are in [`docs/qa/`](qa/). Names are `<width>-<n|L>-<screen>.jpg`: `n` = normal text, `L` = largest text.

Severity: **High** = breaks something · **Medium** = looks wrong · **Low** = polish.

## Problems

1. **Cook Mode (from Home, You, a reminder or a timer banner)** — opens at the recipe's own servings, not your household: Home "Cook it!" on a 4-serving recipe with a household of 2 shows double the amounts (600 g chicken where the recipe page shows 300 g). Only "Let's cook!" on the recipe page passes the servings. · **High** · `375-n-cook0-getready.jpg`
2. **Settings** — there is no way to change your diet after onboarding. Home now filters every recipe by it, and the empty search tells you to change it in Settings, which isn't possible: a dead end. · **High** · `375-n-settings.jpg`
3. **Get ready** — long ingredient names are cut off: "Boneless skinless chick…", "Small flour tortillas (15 …", "Canned chopped …". · **Medium** · `375-n-cook0-getready.jpg`, `375-n-cook0-getready~1.jpg`
4. **Cook Mode steps** — a number is split from its unit across lines ("cook for 1 / minute."), and the last word sits alone on its line. · **Medium** · `375-n-cook-step2.jpg`
5. **Finish screen** — when scrolled, the content slides under the status bar ("You made it!" behind the clock). · **Medium** · `375-n-finish~1.jpg`
6. **Finish screen, "Tomorrow" card** — the name is squeezed beside the button into one word per line ("Chicken / Fried / Rice"); at the largest text it breaks inside words ("Tom/orro/w", "Chi/cke/n…"). · **Medium** · `375-n-finish~1.jpg`, `375-L-finish~1.jpg`
7. **Paywall (largest text)** — the title splits a word ("everything unlo / cked"). · **Medium** · `375-L-paywall-yearly.jpg`
8. **Paywall (largest text)** — the main button text is cut off: "Start my 7-day free tr…", "Subscribe for $4.99/m…". · **Medium** · `375-L-paywall-yearly.jpg`, `375-L-paywall-monthly.jpg`
9. **Onboarding titles** — a single word alone on the last line: "What should we call / you?", "Tap what's in your / kitchen". · **Medium** · `375-n-ob2-name.jpg`, `375-n-ob8-pantry.jpg`
10. **Recipe cards (Home grid and rows, Plan ideas, You might also like)** — the last word of the name often sits alone ("Flaky Apple / Turnovers", "Chocolate Raspberry / Cake"). · **Medium** · `375-n-home~5.jpg`
11. **Pantry, "What can I cook"** — an ingredient used twice in a recipe is listed twice and counted twice: "Missing: greek yogurt, lemon juice, dried oregano, greek yogurt +7 more", "6 of 17". · **Medium** · `375-n-pantry-items~4.jpg`
12. **Pantry** — "8 of 10" next to "In your pantry" has no explanation (it's the free limit). · **Medium** · `375-n-pantry-items.jpg`
13. **Pantry, Tap to add** — suggests "Onions" when "Onion" is already in the pantry (only exact names are skipped). · **Medium** · `375-n-pantry-items.jpg`
14. **Pantry** — "+4 / more" splits across lines. · **Medium** · `375-n-pantry-items~5.jpg`
15. **You** — the XP line reads "125 XP· 125 XP to Line Cook" (no space before the dot). · **Medium** · `375-n-you.jpg`
16. **Settings** — the two switch rows have no top/bottom padding: "Daily dinner idea" touches the card's top edge, and "cook" sits alone on the last line. · **Medium** · `375-n-settings.jpg`
17. **Home, search** — typing a search keeps Favorites/cookbooks above the results. DESIGN.md: "Searching or filtering hides everything except the results." · **Medium** · `375-n-home-search.jpg`
18. **Tap targets under 44pt** — the Home tip's ✕ (36×36), "Clear" on a mood filter (57×35), the recipe page servings − / + (39×39) and the Metric / US switch (34pt high, recipe page and Settings). · **Medium** · `375-n-home.jpg`, `375-n-recipe~1.jpg`
19. **Ingredient names that hold an amount that doesn't scale** — "Feta (one block)" (Baked Feta Pasta) and "Pizza dough (200 g balls)" (Margherita Pizza): at 8 people the list reads "400 g feta (one block)". Changing them is recipe content, so it's on the decision list. · **Medium** · `430-n-pantry-items~3.jpg`
20. **Cook Mode** — on a step with many ingredients, the timer's buttons sit half behind the bottom bar until you scroll. · **Low** · `375-n-cook-step2-timer-running.jpg`
21. **Cook Mode step bar** — each step dot is 43×44 (a hair under 44). · **Low** · `375-n-cook-step1.jpg`
22. **Settings switches** — 40×20 in the browser (on iPhone the system switch is 51×31, still under 44pt tall). · **Low** · `375-n-settings.jpg`
23. **Single word alone on the last line in body text** — reminder ("Turn it off / anytime."), its preview ("…Steak / Bites"), all-ticked list ("…when you're / ready."), Import ("…YouTube and / Instagram."), chef tip ("…wet meat / steams."), Pantry "Missing:" lines. · **Low** · `375-n-ob7-reminder.jpg`, `375-n-list-allchecked.jpg`
24. **All-caps labels** — "TONIGHT'S PICK" sticker and the reminder preview "PANTRY POP · 6 PM" (DESIGN.md: no all-caps labels; both imitate a sticker / an iOS notification). · **Low** · `375-n-home~1.jpg`, `375-n-ob7-reminder.jpg`
25. **Cook Mode chips** — names keep their capital ("4 cloves Garlic") where the recipe page writes "4 cloves garlic". · **Low** · `375-n-cook-step2.jpg`
26. **Pantry "Missing:"** — lower-cases proper names ("greek yogurt"). · **Low** · `375-n-pantry-items~4.jpg`
27. **Get ready** — an ingredient used in two parts of a recipe shows as two tiles (Onion 150 g and Onion 40 g); correct, but can look like a duplicate. · **Low** · `375-n-cook0-getready~2.jpg`
28. **Shopping list, all ticked** — "Swipe left on an item to delete it." shows while every item is folded into "In the basket". · **Low** · `375-n-list-allchecked.jpg`
29. **Photo credits** — the intro says "Unsplash and Pexels"; every photo is from Unsplash. · **Low** · `375-n-credits.jpg`
30. **Paywall** — the skip link says "Not now", but "Continue with the free version" after onboarding. · **Low** · `375-n-ob11-after.jpg`
31. **Home, Cookbooks** — the subtitle says "1 collection" under the title "Cookbooks". · **Low** · `375-n-home~3.jpg`

## Checked and fine

- Amounts at 1/2/4/6 people, Metric and US (falafel, tacos, quesadillas): scale correctly; small produce now in grams in US.
- Streak (2 days from yesterday + the day before), week dots, XP, badges (2/3, 2/10), "Your kitchen" totals (80 minutes = 45 + 35).
- Shopping list counts: "3 left to buy" = "1 of 4 in your basket" = tab badge 3.
- Plan: today (Sat 21 Nov), dots on planned days, "4 meals planned", "Fill 2 empty nights".
- Timers: running, stopped (keeps the time), done.
- No JavaScript errors on any screen.

## Couldn't check

- **The real iPhone text-size setting and Expo Go:** checked in the browser; text was scaled 1.3× by script. Things that shrink to fit on iPhone (`adjustsFontSizeToFit`) can't shrink in the browser, so a few large-text "cut off" flags (the recipe stat tiles) are browser-only and not listed.
- **Real purchases, notifications, the camera ("Snap your plate"), haptics, and importing a link** (import isn't connected in this build).
- **Dark mode:** the app is light only.
