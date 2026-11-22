# Rules for working on Pantry Pop

1. **Always read [DESIGN.md](DESIGN.md) first**, before any change. Also follow [AGENTS.md](AGENTS.md)
   (Expo and EAS rules).
2. **Make only the change that was requested.** Nothing extra.
3. **Keep changes small.** One thing at a time, in small commits.
4. **Never redesign anything that wasn't asked for.** No new colors, fonts, layouts, or
   character changes unless the owner asks for exactly that. If something else looks wrong,
   mention it and ask; don't fix it on your own.
5. **Test in the browser and send screenshots before pushing.** Run the app, look at every
   screen the change touches, and show the owner the screenshots. Push only after that.
6. Run `npx tsc --noEmit` and `npx expo lint` before declaring a task done.
7. When giving the owner terminal commands, start with `cd recipe-app`, and put each command
   in its own box. If a package was added or changed, include `npm install`.

## Session notes (Obsidian)

The owner keeps notes about this project in their Obsidian vault, on their Mac:

`/Users/moaiadalsaleh/Documents/claude memory/recipe app session 1.md`

**Update that note whenever:**
- an important decision is made,
- a feature is finished,
- or a session ends.

**Keep it as one up-to-date summary:**
- what the app is and what we built
- decisions made
- saved versions (branches)
- what's real and what's mock
- lessons learned
- open tasks and next steps

Update or rewrite the sections that changed. Don't just keep appending.

That folder is on the owner's Mac, so a cloud session can't reach it on its own:
- **In a cloud session:** ask for access to the folder (it must be shared from the Claude desktop app on the Mac: Settings → Claude Code → Remote Control).
- **If access isn't possible:** give the owner the updated note text to paste into Obsidian.
- **Never say the note was saved unless it really was.**
