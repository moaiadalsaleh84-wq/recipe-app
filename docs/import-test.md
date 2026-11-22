# Import test report

Tested 22 Nov 2026 in the browser at 375pt, on branch `pop-redesign`. Screenshots are in [`docs/import-test/`](import-test/).

**How it was tested.** This test computer can't reach TikTok, YouTube or recipe sites, and there's no Anthropic key here. So:
- TikTok, YouTube and the websites were **simulated** by saved answers in `scripts/import-fixtures.ts` (the same shapes the real services return: short-link redirects, TikTok refusing the page, oEmbed, JSON-LD, og:image).
- The AI was a **stand-in reader** (`FAKE_AI=1` in `scripts/import-dev-server.ts`) that copies lines from the text and writes three generic steps when there are none. It shows the screens and the flow working; it says nothing about the quality of Claude Haiku 5.5's recipes. **The quality test needs a real key** (see below).
- Everything else is the real app and the real server code: link resolution, preview, validation, saving, the recipe page.

## Results

| # | Case | Result | Screenshots |
|---|---|---|---|
| 1 | TikTok, ingredients but no method (hot honey crispy chicken burger) | Copied link offered ("Import this TikTok?") → thumbnail and "From @crispychef on TikTok" appear at once → three lines tick off → finished recipe opens in about 3 s. Steps written by the AI are tagged **est.**, the yellow banner says "Some steps were estimated". | `1-hot-honey-a-offer`, `-b-loading`, `-c-result`, `-d-ingredients`, `-e-steps` |
| 2 | vm.tiktok.com short link | Resolved to the full video link (TikTok refused the page; the redirect was enough), oEmbed credit and picture, recipe opens. | `2-vm-short-link-*` |
| 3 | TikTok with the full recipe in the caption | The caption's own steps are used (no **est.** on steps); servings/time from the caption. | `3-full-caption-*` |
| 4 | TikTok with no recipe in the caption | "No recipe in the text" with **Type it yourself**: the form opens with the title ("Best burger ever", hashtags and emojis removed), the TikTok picture and the link filled in. | `4-no-recipe-c-result`, `-d-form` |
| 5 | YouTube Short | Short link → the normal video link; "From @tacotuesday on YouTube"; recipe from the description. | `5-youtube-short-*` |
| 6 | Website with JSON-LD | Ingredients and steps straight from the page's recipe data; "Recipe by Falafel Friday" (site name); nothing estimated, no banner. | `6-site-jsonld-*` |
| 7 | Website without JSON-LD | Read from the page text; og:image as the picture; site name as the credit. | `7-site-no-jsonld-*` |
| 8 | Airplane mode | "You're offline" with **Try again** and **Type it yourself**; Back keeps the pasted link. | `8-airplane` |

Each import took about 3 s here (the server's answer was slowed by 2.5 s on purpose, to photograph the loading screen). With Claude Haiku 5.5 expect roughly 4–10 s.

## Cost per import

Claude Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens. A TikTok caption is about 2,500–4,000 tokens in (instructions + format + caption) and 1,500–4,000 out (thinking + recipe); a long web page up to 8,000 in.

**About $0.001–0.003 per import.** At 10 imports a day per device, at most about 3 cents per very active user per day. The same link imported again within 7 days comes from the cache (free).

If Haiku's steps or ingredients aren't good enough, Claude Sonnet 5.5 ($2 / $10 per million) would cost about $0.02–0.06 per import: set the `IMPORT_MODEL` secret to `claude-sonnet-5-5`, nothing else changes.

## What didn't work, or wasn't tested

1. **The real AI wasn't tested.** No Anthropic key here, so Haiku 5.5's quality (titles, estimated steps, amounts, splitting "salt, black pepper") is untested. The stand-in's titles and steps in the screenshots are not what Haiku writes. Run the eight links once with the real key (SETUP.md) before release.
2. **Real TikTok / YouTube / websites weren't reached**: simulated as described above.
3. **Share sheet** (Share → Pantry Pop) isn't built: it needs an iOS share extension, which can't run in Expo Go (a development build, an Apple Developer account and a new library).
4. **On iPhone, the copied-link offer** says "Import the link you copied?" rather than "Import this TikTok?": iOS asks permission before an app reads the clipboard, so the app only checks *that* a link is there, and reads it when you tap Import.
5. **Picture cropping (4:3, 1:1, WebP, blurhash) runs only on the phone**; the browser shows the original picture.
6. **Small, already there before this work:** importing a recipe unlocks the "Recipe Writer" badge, which is meant for writing your own recipe.
