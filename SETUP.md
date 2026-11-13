# Pantry Pop setup

What you have to do by hand to turn on the real services: **recipe import** (needs a
server and an AI key), **payments** (needs Apple and RevenueCat) and **background timers**
(needs a development build, section 3). Until you do, the app
works with import switched off (it says so) and payments in test mode (nothing is charged).

You need:

| What | Cost | Used for |
| --- | --- | --- |
| Anthropic account + API key | pay per use | reading recipes (Claude) |
| Supabase account (free plan is enough to start) | free | the import server, rate limits |
| Apple Developer Program | $99 / year | App Store, subscriptions |
| RevenueCat account | free up to $2.5k/month revenue | checking purchases |
| Expo account | free | building the app (EAS) |

---

## 1. Recipe import backend

### Why Supabase (and not Vercel)

The import server needs three things: somewhere to run code, a secret store for the AI key,
and a small database for rate limits and the result cache. Supabase gives all three in one free
project (Edge Functions + Postgres + `supabase secrets`). On Vercel the function is just as easy,
but rate limiting needs a second service (for example Upstash Redis) and a second account.
Supabase also leaves room for accounts and syncing later.

The code is plain TypeScript using only `fetch`, so moving it to Vercel or Cloudflare later
means rewriting about 20 lines (`supabase/functions/import-recipe/index.ts`).

### 1a. Anthropic API key

1. Go to <https://console.anthropic.com>, create an account and add a payment method.
2. **Set a monthly spend limit first** (Settings → Limits). Start low, for example $20. This is
   your hard ceiling, whatever happens to the server.
3. Create an API key (Settings → API keys). Copy it. Never put it in the app or in git.

### 1b. Supabase project

1. Create a project at <https://supabase.com/dashboard>. Note the **project ref** (the
   `abcdefghijkl` part of `https://abcdefghijkl.supabase.co`).
2. Install the CLI on your computer: `brew install supabase/tap/supabase`
   (or see <https://supabase.com/docs/guides/cli>).
3. In the `recipe-app` folder:

```bash
supabase login
```
```bash
supabase link --project-ref YOUR-PROJECT-REF
```
```bash
supabase db push --remote
```
That last command creates the rate-limit and cache tables (`supabase/migrations/`). Answer `y` when
asked. (`--remote` is needed with Supabase CLI 3 and later, which otherwise targets a local database.)

4. Set the secrets (they live on Supabase's servers, not in the app). Easiest is the website,
   so the key never goes into your Terminal history: your project → Edge Functions → Secrets.
   For the salt, run `openssl rand -hex 32 | pbcopy` and paste with ⌘V. Or from Terminal:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-PASTE-YOUR-KEY RATE_LIMIT_SALT=$(openssl rand -hex 32) IMPORT_DAILY_CAP=30 --remote=YOUR-PROJECT-REF
```

| Secret | Required | What it does |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Claude reads the recipe text |
| `RATE_LIMIT_SALT` | yes | random string used to hash device ids and IP addresses |
| `IMPORT_DAILY_CAP` | no (default 500) | most AI imports per day for the whole app |
| `IMPORT_MODEL` | no (default `claude-opus-5-5`) | which Claude model reads recipes |

5. Deploy the function:

```bash
supabase functions deploy import-recipe --remote=YOUR-PROJECT-REF
```
Choose **Yes** when asked (← arrow, then Enter). A "Docker is not running" warning is fine: Supabase
bundles the code on its servers. Check it's up: `curl https://YOUR-PROJECT-REF.supabase.co/functions/v1/import-recipe`
should print `{"ok":true,"pong":true}`.

6. Turn on daily cleanup: Supabase dashboard → Integrations → Cron → new job, daily, SQL:
   `select import_cleanup();`

### 1c. Point the app at it

Copy `.env.example` to `.env` and set:

```
EXPO_PUBLIC_IMPORT_URL=https://YOUR-PROJECT-REF.supabase.co/functions/v1/import-recipe
```

Restart `npx expo start` (env values are read at start).

### 1d. Test it with real links

```bash
node scripts/test-import.ts --endpoint https://YOUR-PROJECT-REF.supabase.co/functions/v1/import-recipe
```

This imports 10 real links (8 recipe sites, 1 YouTube video, 1 TikTok) and prints a pass/fail
table. Each one is a real AI call, about 10 for the run. Edit the list in the script to match
links your users share.

### Cost and abuse protection

- **Per import:** a recipe page is roughly 3,000–8,000 tokens in and 1,000–2,000 out. With
  `claude-opus-5-5` ($4 in / $20 out per million tokens) that's about **$0.03–0.08 per import**.
  `IMPORT_MODEL=claude-haiku-5-5` is far cheaper ($0.10 / $0.50 per million). Run the test script
  with both and compare the results before deciding.
- **Limits on the server** (`supabase/functions/import-recipe/lib/limits.ts`):
  - 6 imports per device per 10 minutes, and 30 per day
  - 60 per IP address per day
  - `IMPORT_DAILY_CAP` AI imports per day for everyone together
- **Request limits:** request size 64 KB, page size 3 MB, 12-second page timeout, private
  network addresses refused.
- **Cache:** a link imported in the last 7 days is served from the cache at no AI cost.
- **Worst case:** your daily bill is about `IMPORT_DAILY_CAP × $0.08`. At 200 that's about $16
  a day, and your Anthropic spend limit stops it entirely.
- **Weak spot:** the app has no accounts, so the free-plan "3 imports" is counted on the phone.
  Reinstalling resets it. The server limits still cap the cost. To enforce it for real, add
  accounts or Apple's App Attest later.

### Running it on your computer instead

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/import-dev-server.ts
```
Then set `EXPO_PUBLIC_IMPORT_URL=http://YOUR-COMPUTER-IP:8787/functions/v1/import-recipe`.
`FAKE_AI=1` runs without a key, using a crude parser (for UI work only).

### Share sheet ("Share → Pantry Pop" from TikTok)

Not built yet. iOS needs a separate Share Extension, which requires a native config plugin
(for example `expo-share-intent`) and a development build. It won't work in Expo Go. The app
already opens import links like `pantrypop://import?url=<encoded link>`, which is what a share
extension would call.

Until then there's a no-code workaround on iPhone: make a Shortcut that shows in the share
sheet, takes the URL, URL-encodes it, and opens `pantrypop://import?url=` followed by the
encoded text. This works once the app is installed as a real build. Expo Go uses a different
scheme.

---

## 2. Payments (App Store + RevenueCat)

The app uses one setting for purchases: `EXPO_PUBLIC_PURCHASES_MODE`.

- `mock` (default): test mode. The paywall says "Test mode: no real payment is made." and
  Pro is granted on the phone.
- `revenuecat`: real purchases through `react-native-purchases`
  (`src/lib/revenuecat.ts`). This needs everything below, plus a development or App Store build.
  **Real payments have not been tested yet.** Test them in Apple's sandbox before release.

### 2a. App Store Connect (needs the paid Apple Developer Program)

1. Join the Apple Developer Program: <https://developer.apple.com/programs/>.
2. Add a bundle identifier to `app.json` (`expo.ios.bundleIdentifier`, for example
   `com.yourname.pantrypop`). Create the app in App Store Connect → Apps → + New App with
   that bundle ID.
3. **Agreements, Tax and Banking:** accept the Paid Apps agreement and fill in bank and tax
   details. In-app purchases won't load until this is active.
4. **Subscriptions:** Apps → Pantry Pop → Subscriptions → create a group "Pantry Pop Pro",
   then two auto-renewable subscriptions:

| Product ID | Duration | Price | Intro offer |
| --- | --- | --- | --- |
| `pro_yearly` | 1 year | $29.99 | Free trial, 1 week |
| `pro_monthly` | 1 month | $4.99 | none |

   Give each a display name and description, and a review screenshot of the paywall.
   (The IDs match `PLANS` in `src/lib/purchases.ts`. Change both if you rename.)
5. **Key for RevenueCat:** Users and Access → Integrations → In-App Purchase → generate a
   key. Download the `.p8` file (only once!) and note the Key ID and Issuer ID.
6. **Sandbox tester:** Users and Access → Sandbox → add a test Apple ID for trying purchases.
7. **App Privacy:** fill in the questionnaire to match the in-app Privacy screen. The app
   collects no data linked to the user. Import sends user content (links and text) and a
   random identifier for rate limiting, which isn't used for tracking.
8. **Privacy policy and terms:** publish the Privacy screen's text at a public URL and set
   `PRIVACY_URL` (and your own `TERMS_URL`, or keep Apple's standard EULA) in
   `src/lib/purchases.ts`. Apple requires both links on the paywall and in App Store Connect.

### 2b. RevenueCat

1. Create an account and a project at <https://app.revenuecat.com>.
2. Add an **App Store app** with the same bundle ID. Upload the `.p8` key with its Key ID and
   Issuer ID.
3. **Products:** add `pro_yearly` and `pro_monthly`.
4. **Entitlement:** create one with identifier `pro` (must match `PRO_ENTITLEMENT` in
   `src/config.ts`) and attach both products.
5. **Offering:** make the `default` offering current, with two packages: **Annual** → `pro_yearly`,
   **Monthly** → `pro_monthly`.
6. Copy the **public Apple SDK key** (starts with `appl_`). It's meant to be in the app.

### 2c. Switch the app to real purchases

In `.env`:

```
EXPO_PUBLIC_PURCHASES_MODE=revenuecat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_YOUR_KEY
```

Then make a development build (Expo Go can't make purchases):

```bash
npx eas-cli@latest build:configure
```
```bash
npx eas-cli@latest build --profile development --platform ios
```

Install it, sign in with the sandbox tester when asked, and check:
- buying yearly starts a trial and unlocks Pro
- Restore works after reinstalling
- cancelling in Settings → Subscriptions removes Pro after expiry (the app re-checks on launch)

The "Test mode" note on the paywall disappears automatically when `PURCHASES_MODE` is
`revenuecat`, so don't ship that setting until these checks pass.

---

## 3. Development build (timers on the Lock Screen)

Background timers (notifications, Live Activity, Dynamic Island) use native code that **Expo Go
doesn't include**. In Expo Go the app still works; timers then only ring while it's open, and Cook
Mode says so. To get the full timers on your iPhone you install your own build of the app once.
How the timers work and what's tested: [TIMERS.md](TIMERS.md).

### What you need

- **Apple Developer Program** ($99/year): required to install your own builds on an iPhone.
  Join at <https://developer.apple.com/programs/>. Approval can take a day or two.
- **A free Expo account**: <https://expo.dev/signup>.
- Your iPhone, iOS 16.4 or later (Live Activities buttons need iOS 17).

The bundle ID is set to `com.moaiadalsaleh.pantrypop` in `app.json`. Change it now if you want a
different one: it can't be changed after the app is in the App Store.

### Commands (on your Mac, in the `recipe-app` folder)

1. Log in to Expo:
```bash
npx eas-cli@latest login
```
2. Link the project to your Expo account (adds a project ID to `app.json`, answer **Y**):
```bash
npx eas-cli@latest init
```
3. Register your iPhone. It shows a QR code: scan it with the iPhone camera and install the profile
   it offers (Settings → General → VPN & Device Management):
```bash
npx eas-cli@latest device:create
```
4. Build. It asks to log in to your Apple account (answer **Y** to let EAS handle certificates,
   provisioning profiles, the App Group and the widget extension). The build runs on Expo's
   servers and takes about 15–25 minutes:
```bash
npx eas-cli@latest build --profile development --platform ios
```
5. When it's done, open the link or scan the QR code it shows **on your iPhone** and install.
   The first time, iOS asks you to turn on **Developer Mode** (Settings → Privacy & Security →
   Developer Mode, then restart).
6. Start the app server as usual and open the **Pantry Pop** app you installed (not Expo Go):
```bash
npx expo start
```

You only rebuild (step 4) when native things change: new packages with native code, `app.json`
plugins, the Live Activity layout, sounds or images in `assets/live-activity`. Everyday code
changes load from `npx expo start` like before.

### Try it

1. Open a recipe → **Cook Now** → start a timer. The cat asks about notifications: **Allow**.
2. Lock the phone. The Lock Screen shows the timer with the cat; on iPhones with a Dynamic Island,
   swipe home to see it in the island.
3. Wait for it to end: the alarm notification rings (also through Focus, if you allow
   time-sensitive notifications for Pantry Pop when iOS asks).
