# Cook Mode timers in the background

How timers keep working when you lock the phone or leave the app, and what's tested.

## How it works

| Situation | What happens | Code |
| --- | --- | --- |
| App open | The countdown updates on screen 4 times a second. At 0:00 the chime loops and the phone vibrates (up to 60 s), with a red "Time's up" bar. On other screens a banner appears, and tapping it opens Cook Mode. | `src/state/timers.tsx`, `src/lib/alarm.ts` |
| Phone locked or app in the background | A **local notification** fires at the exact end time with the alarm sound (`assets/sounds/timer-alarm.wav`, 20 s), marked **time-sensitive** so it can break through Focus. | `src/lib/timerAlerts.ts` |
| Lock Screen and Dynamic Island | A **Live Activity** shows the recipe, the step, the cat's face, a countdown and a progress bar. iOS animates the countdown and bar itself from the end time, so the app doesn't update them every second. Pause/Resume and Cancel buttons need iOS 17+. | `src/widgets/CookTimerActivity.tsx` |
| App closed (killed) | Timers are saved on the phone, so the notification still fires. On reopening, a running timer continues with the right time. One that ended while closed shows as "finished while you were away", without ringing again. | `src/lib/cookTimers.ts` (`restore`) |

- **Timer data:** timers are stored by their **end time**, not by counting seconds, so they stay correct whatever iOS does to the app.
- **Alert plan:** every change (start, pause, resume, restart, stop) goes through one pure function, `planAlerts`. It decides which notification to schedule or cancel and which Live Activity to start, update or end. Each timer has exactly one pending notification while running and none while paused.
- **The cat's moods on the Lock Screen:**
  - **Calm** while counting.
  - **Worried** for the last 10 seconds. The app sets the activity's *stale date* to end minus 10 s, and iOS flips it with no app involvement.
  - **Time's up** once the app updates the activity: when the app is open at 0:00, or as soon as you open it. iOS gives a Live Activity no way to change by itself at an exact time except the stale date, which is already used for "worried". Push updates from a server could do it, but that would need a server and push setup.
- **Permission:** the first timer start shows the cat asking (`AskNotifications`), and only then does iOS ask. "Not now" isn't asked again; the setting stays in iOS Settings.
- **Design:** all colors come from `liveActivity` in `src/theme/index.ts`, in light and dark versions. The Dynamic Island is always black, so it has its own colors. The text is SF Pro Rounded. The cat faces are PNGs in `assets/live-activity/`, made from the app's own cat drawings.

## Expo Go and the web

There's no native code there for notifications or Live Activities, so `timerAlerts.ts` does nothing and only the in-app timer works. Cook Mode says so under the timer:
- *Expo Go:* "In Expo Go timers only ring while Pantry Pop is open. The full app also rings when your phone is locked."
- *Web:* "On the web, timers only ring while this page is open."

## AlarmKit (iOS 26): researched, not used yet

AlarmKit lets apps make alarms and timers that behave like the Clock app's.

**Pros for Pantry Pop:**
- Rings **even in silent mode** and through Focus, until stopped (a notification only vibrates in silent mode and plays its sound once, at most 30 s).
- The system runs the countdown, pause/resume and alert states, including Lock Screen buttons, with no app code running.
- A real full-screen alarm, with Stop or Snooze.

**Cons:**
- **iOS 26+ only.** Older iPhones still need the notification and Live Activity path, so you'd maintain both.
- **Its own permission prompt** ("Allow alarms"), on top of notifications.
- **A Swift widget extension is required** for timers (`ActivityConfiguration(for: AlarmAttributes<…>)`). Expo's `expo-widgets` can't draw AlarmKit's Live Activity, so the design would have to be redone in Swift. Without that extension, iOS may dismiss the timer without alerting.
- **No mature library.** The two React Native wrappers on npm:
  - `react-native-ios-alarmkit` 1.0.0: released Oct 2026, one maintainer, needs Nitro. Its README says it doesn't pass custom data (recipe, step, cat) to the widget.
  - `expo-alarm-kit` 0.1.x: alarms only.
- **Can't be built or tested here.** Swift can't be compiled in this Linux sandbox, so it would need a Mac build and a real device to check.

**Decision:** use notifications + Live Activity now (works on iOS 16.4+, all in TypeScript, Expo's official package). Add AlarmKit later as an iOS 26+ upgrade for "ring through silent mode", once there's a physical iPhone to test on. The alert plan (`planAlerts`) is the single place that decides alerts, so an AlarmKit executor can replace the notification one for iOS 26+ without touching Cook Mode.

## Tests

| What | How | Result |
| --- | --- | --- |
| Timer logic: start, pause, resume, restart, stop, several timers, app killed, saved-data garbage | `node --test scripts/timers.test.ts` | 15/15 pass |
| Alert plan: one notification per running timer, cancelled on pause or stop, rescheduled on resume or restart, not cancelled at 0:00 | same file | included above |
| Live Activity layout: built with the same Babel transform Expo uses, then run in a stand-in runtime; running, last 10 s, paused, ringing, dark mode, no face images | `node --test scripts/live-activity-layout.test.cjs` | 7/7 pass |
| Native project: widget extension, Live Activity support, time-sensitive entitlement, app group, alarm sound in the app | `npx expo prebuild --platform ios --no-install` in a copy | generated correctly |
| App on the web: two timers, timers outside Cook Mode, global banner, killed app, web note | Playwright end-to-end suite | all pass |

**Not tested (needs a real iPhone and a development build):**
- That the notification actually fires on a locked phone, with the custom sound, and breaks through Focus.
- How the Live Activity looks on the Lock Screen and in the Dynamic Island: layout, colors, rounded font, cat images, circular ring.
- That the countdown and bar animate natively, and the cat turns worried at 10 s.
- Pause/Resume/Cancel on the Lock Screen. iOS runs these buttons inside the app; whether the app's JavaScript gets the event while suspended has to be checked on a device. If it doesn't, the button opens nothing and the timer keeps going.
- The Swift side of `expo-widgets` compiling with this exact setup (checked only as far as `prebuild`).
- The permission prompt on iOS (on the web its design was checked, but it never opens there).
