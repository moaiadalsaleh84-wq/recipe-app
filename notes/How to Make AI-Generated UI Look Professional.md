# How to Make AI-Generated UI Look Professional

*The owner's note: a video transcript about using component libraries instead of building every component from scratch. The words are as given.*

## Short summary (for Claude)

- AI builds toasts, drawers, menus and loading states from scratch with default styling, and gets the details wrong (stacking, dragging, keyboard use). Bring in other people's taste through **component libraries**.
- **Foundations** (Shadcn, Base UI, Radix): behavior, focus and accessibility. Default Shadcn has its own "AI look" (same radius, grays, font), so change **radius, colors and fonts**: they carry most of a product's personality.
- **Specialists**, one component done really well: **Sonner** (toasts), **Vaul** (drawers you drag and flick closed), **Command K** (command menus), **Number Flow** (numbers that change smoothly instead of jumping).
- **Design components** (Beautiful UI, Rare UI, Magic UI, Aceternity, 21st.dev): styled pieces to copy in. Rule: **one impressive moment per page**. Ten of them looks AI-generated.
- Name the libraries in the prompt, install through their CLI so the code lives in the project, or use the Pick UI Libraries skill.

How it fits Pantry Pop: these libraries are for websites (React DOM). Pantry Pop is a React Native app, so the same ideas use native pieces: the app's own toast and bottom sheet (or `presentation: 'formSheet'` for real iOS sheets), Reanimated for motion, and `RollingNumber` (in `src/components/ui.tsx`) for numbers that roll instead of jumping, the Number Flow idea. The personality already lives in the radius, colors and fonts in `DESIGN.md`. "One impressive moment per page" matches the app's rule of one entrance per screen: the welcome screen's photo entrance is that moment for the first launch.

## The note

How to Make AI-Generated UI Look Professional. One of the easiest ways to make AI-generated UI look good is to stop it from building every component from scratch.

In this video, I'll go through the component libraries I use with Claude, the three important categories, what each one is good for, and how to get Claude to use them.

When you ask AI to create a toast, command menu, or loading state, it builds it from scratch with default styling every time. AI doesn't know how a toast should be stacked or how a drawer should feel when you drag it open.

The fastest way to bring someone else's taste into the model is through component libraries, and each category has a different job.

The first category is foundations, like Shadcn, Base UI, and Radix. These give you component behavior, keyboard navigation, focus, and accessibility that you would probably get wrong if you built them yourself.

Then you add the styling.

You would use these for most of your app: buttons, inputs, dialogs, dropdowns, tabs, and other components.

One thing to be aware of is that default Shadcn has become an AI look of its own. If you've used tools like Claude Code or Lovable enough, you can probably spot it immediately.

The same radius, the same gray colors, the same font.

So use it as a starting point, then change the radius, colors, and fonts to make it look like your product. Those three things carry most of the personality.

A small radius and serif headings can make the same component feel like an editorial product instead of a SaaS template.

Because Shadcn copies the code into your project instead of hiding it inside a package, Claude can fully customize it.

If you give Claude your brand colors and fonts upfront, it can do this really well.

The second category is specialists.

These are libraries that do one component really well.

Sonner is for toasts. It handles how toasts stack, expand on hover, and animate.

Vaul is for drawers, the ones you can pull up from the bottom on mobile and flick closed.

Command K is for command menus, the ones you open by pressing Command K.

And Number Flow animates numbers when they change, so a price or a calculation doesn't just jump but changes smoothly.

You can usually tell when these are missing.

When AI builds its own toast system, they stack on top of each other or disappear before you can read them.

Handmade drawers often don't drag. They just open and close.

And a homemade command menu usually breaks the moment you try to use it with a keyboard.

These aren't huge features, but they're the details that make a product feel finished, and they're exactly the things AI skips when it builds something from scratch.

Sonner and Vaul were both created by Emil Kowalski, and he also has a skill called Pick UI Libraries.

When Claude needs a component, it tells Claude which library to use from a short list and gives it a reason why.

So if Claude starts building its own toast system, it will use Sonner.

The third category is design components.

These are fully styled components that you can copy straight into your project.

Libraries like Beautiful UI, Rare UI, Magic UI, and Aceternity, along with sites like 21st.dev, collect components made by lots of different people.

If you're building an AI product, Beautiful UI is where I would look first.

It's built by Turborepo and is specifically designed for AI interfaces, streaming text, approval cards for agent permissions, dev views, and agent screens.

Most component libraries were built before AI products existed, so they don't cover these states yet.

Rare UI is mainly for impressive moments, animated buttons, text effects, and interactive backgrounds.

You can install a component with one command, and the code goes straight into your project so you can edit it.

Magic UI is pretty similar, with over 150 free animated components. It's built on top of Shadcn, so it fits perfectly with the foundation we discussed earlier.

Aceternity is best for landing page effects, 3D cards, background beams, and marquees.

And you can install its components using the Shadcn CLI or have your coding agent add them for you.

And 21st.dev is more like a marketplace. Lots of design engineers publish their components there, so it's a good place to look when you're searching for something specific and don't want to be locked into one library.

When working with this whole group, there's one rule I would keep in mind.

One impressive moment per page. One animated hero or one interactive background can make a page look great.

Put 10 things like that on the same page, and it starts looking AI-generated, where everything feels bright and dynamic, but nothing really stands out.

So how do you get Claude to use these?

The easiest way is to mention the library names in your prompt.

Tell it to use Shadcn for base components and Sonner for toasts, and that's what it will do.

Whenever possible, install them through the library's CLI or registry so the code lives in your own project.

That way, Claude can read the code, and you can modify it.

And if you don't want to think about this every time, install the Pick UI Libraries skill and let it choose for you.
