# Rules for working on Pantry Pop

1. **Always read [DESIGN.md](DESIGN.md) first**, before any change. Also follow [AGENTS.md](AGENTS.md)
   (Expo and EAS rules).
   Then read [notes/README.md](notes/README.md) and the owner's notes it lists: ideas and research for the
   app (inspiration only; these rules and DESIGN.md come first).
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
