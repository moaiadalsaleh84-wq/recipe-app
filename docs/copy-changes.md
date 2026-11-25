# Copy changes

Every text changed in the friendly-copy pass (Part 7), **before → after**, by screen. Buttons are at most 3 words. Words in `<…>` are filled in by the app (a recipe name, a number). Numbers, amounts, prices, legal text, the paywall fine print and recipe content were not changed. Where one line covers several cases, they are separated by " / ".

| Screen | Before | After |
|---|---|---|
| Shopping list | Your list is empty | Nothing to buy yet |
| Shopping list | Add items here, or add a recipe’s ingredients from its page or your weekly plan. | Your fridge says thanks. Add items here, or from any recipe. |
| Shopping list | Everything’s in the basket! | Everything’s in the basket. |
| Shopping list | Nice shopping. Clear the list when you’re ready. | Go get cooking! |
| Shopping list | Nothing left to buy, nothing to share! | Nothing to share yet. Add a few items first. |
| Pantry | Your pantry is empty | Your pantry’s a little lonely |
| Pantry | Add a few things you have at home. You’ll see which recipes you can cook right now, and what’s missing. | Add a few things you have. We’ll show what you can cook right now. |
| You (streak) | Done for today! Back tomorrow for <streak + 1> / Cook today to keep it going / Cook anything today to start one | Day one, done. The pan’s warming up. / Back again! Your streak is sizzling. / Cook anything today to keep it going. / Fresh start today. Every chef takes a day off. |
| You (history) | Every meal you finish in Cook Mode shows up here. | Your first dish lands here. Pick something tasty! |
| Badges (toast) | Badge unlocked: <name>! +25 XP | New badge: <name>! Look at you go. +25 XP |
| Import | No recipe in the text | No recipe in there |
| Import | That isn’t a recipe | Hmm, that’s not a recipe |
| Import | You’re offline | No internet right now |
| Import | Slow down a little | Phew, that’s a lot |
| Import | Import didn’t work | Oops, that recipe got away |
| Import | You seem to be offline. Check your connection and try again. | No internet right now. Your saved recipes still work. |
| Import (buddy line) | Ooh, let me read this one… | Reading the recipe… so you don’t have to pause the video 40 times. |
| Import (buddy line) | Oops, that one slipped away! | Oops, that recipe got away. Try another link, or type it in yourself. |
| Recipe page | Note saved | Noted! |
| Recipe page | Still no photo. Try again later. | Still no photo. Try again in a bit. |
| Recipe page | Recipe not found / It may have been removed. | Oops, that recipe’s gone / It may have been removed. |
| Cook Mode | Recipe not found / It may have been removed. | Oops, that recipe’s gone / It may have been removed. |
| Cook Mode (timer) | Done! | Ding! Time’s up |
| Finish | Photo saved to your cooking history | Looking good! Photo saved. |
| Finish | Couldn’t open the camera or your photos | Oops, the camera wouldn’t open. Try again? |
| Recipe page | Couldn’t open your photos | Oops, your photos wouldn’t open |
| Links (everywhere) | Couldn’t open that link | Oops, that link wouldn’t open |
| Plan | Planned <n> dinners | Planned <n> dinners. Dinner’s sorted! |
| Home (search) | No recipes found | No matches yet |
| Home (search) | Try another word, or clear the filters to see everything. | Try fewer words or another dish. |
| Discover | No recipes match / Nothing here yet | No matches yet / Nothing here yet |
| Discover | Try fewer filters or another word. / New recipes appear here soon. | Try fewer words or another dish. / Fresh recipes are on their way. |
| Cookbook | No favorites yet / This cookbook is empty | No favorites yet / Nothing in here yet |
| Cookbook | Open a recipe and tap the bookmark to add it here. | Open a recipe, tap ⋯ and save it here. |
| Cookbook | Cookbook not found / It may have been deleted. | Oops, that cookbook’s gone / It may have been deleted. |
| Notification (timer) | Time’s up: <label> | Ding! Time’s up: <label> |
| Notification (streak) | Keep your <streak>-day run going? | Your <streak>-day streak is sizzling |
| Report | Thanks. It’s hidden until we’ve looked at it. | Thanks for the heads-up. It’s hidden while we check. |
| Recipe page (⋯ menu) (button) | Save to your recipes | Save to recipes |
| Recipe page (⋯ menu) (button) | Use the imported photo | Use imported photo |
| Shopping list (empty) (button) | Add tonight’s pick ingredients | Add tonight’s pick |
| Home (search) (button) | Clear search and filters | Clear all |
| Home (+ menu) (button) | Save from a link | Import a link |
| Plan (button) | Add all to list | Shop the week |
| Pantry (button) | Add missing to list | Add missing |

## Left as they were

- Already friendly and short: "Hungry? Let’s cook!", "You made it!", "How’d it taste?" (Meh / Good / Loved it), "Snap your plate", "Maybe later", "Grab your stuff", "Tap each one as it lands on the counter.", "Nothing to buy yet", "All done".
- Plain on purpose (instructions, money, safety): Settings notification help, App Store errors, the trial reminder, the paywall and its fine print, privacy text, timers and temperatures inside steps.
- Biscuit’s own lines (`src/components/mascot/lines.ts`): he is switched off; the two import lines above are the ones shown on that screen when he’s on.
