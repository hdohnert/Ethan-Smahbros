# Ethan's Birthday Showdown

A self-hosted Smash Bros king-of-the-hill leaderboard. **Display** runs full
screen on a TV (via AirPlay mirroring); **Control** runs on a phone.

Live at: **https://hdohnert.github.io/Ethan-Smahbros/**

- Display (TV): `https://hdohnert.github.io/Ethan-Smahbros/#/display`
- Control (phone): `https://hdohnert.github.io/Ethan-Smahbros/#/control` (phase 2)

## Status

| Phase | What | State |
| --- | --- | --- |
| 1 | TV-ready skeleton: PWA, start screen with full screen + wake lock, Pages deploy | ✅ built |
| 2 | Supabase sync, sign-in, rules module, Control, Undo, playoff, Ticket Bank, Stations, Prize Store, Demo mode | ✅ built |
| 3 | Animations, birthday effects, sound, reduce-motion polish | next |

## Views

| Route | Who | What |
| --- | --- | --- |
| `#/display?t=…` | TV device | Read-only scoreboard. The link comes from Control → Match → Get the Display link |
| `#/control` | You (signed in) | Score, undo, line, players, tickets, settings, demo mode |
| `#/station` | Helper parents (PIN) | Pick a game, tap a kid, +1/+2/+3/+5 |
| `#/prizes` | Prize table (PIN or you) | Spend tickets; locked until opened in Control |

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/#/display
npm test           # unit tests (rules module)
npm run build      # type-check + production build into dist/
npm run icons      # re-render public/icons/* from the SVG in scripts/make-icons.mjs
```

Reskin for another party by editing `src/theme.ts` (colors, fonts, default title, age).
Title, subtitle, age and the birthday photo can also be changed live in Control → Settings.

Code map: `src/rules/` is the pure, unit-tested game logic (queue, streaks, playoff,
tickets, undo by replay); `src/data/` talks to Supabase; `supabase/schema.sql` is the
whole database (tables, row-level security, functions).

## One-time Supabase setup

1. **Database:** Supabase dashboard → **SQL Editor** → New query → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. (Safe to re-run after updates.)
2. **Key:** **Project Settings → API Keys** → copy the **anon / publishable** key into
   `supabase.config.json` (`"anonKey"`). It is meant to be public; row-level security
   protects the data. (Or ask Claude to commit it.)
3. **Sign-in links:** **Authentication → URL Configuration**
   - Site URL: `https://hdohnert.github.io/Ethan-Smahbros/`
   - Redirect URLs: add `https://hdohnert.github.io/Ethan-Smahbros/**` and `http://localhost:5173/**`
4. **Sign-in code (for the home-screen app):** **Authentication → Emails → Magic Link** template:
   add a line such as `Your code: {{ .Token }}` so you can type the code into the installed app.
5. **Claim ownership:** open `…/#/control`, sign in with your email, tap **Claim as owner**.
6. **Lock it:** **Authentication → Sign In / Providers** → turn off **Allow new users to sign up**.
   Your account keeps working; nobody new can create one.
7. In Control: add players, set a **Station PIN** (Tickets tab), then **Get the Display link** for the TV.

Keep-alive: `.github/workflows/keepalive.yml` pings the database every 3 days so the free
project doesn't pause. The day before the party, check the project shows as active in the
Supabase dashboard and load the app once.

## One-time GitHub Pages setup

1. GitHub → this repo → **Settings → Pages** → *Build and deployment* → **Source: GitHub Actions**.
2. Push to `main` (or run **Actions → Deploy to GitHub Pages → Run workflow**).
3. If the deploy job says the branch "is not allowed to deploy to github-pages",
   open **Settings → Environments → github-pages → Deployment branches** and add the branch.

## TV test (game-night hardware)

**iPhone or iPad as the Display device**

1. Open the Display link (Control → Match → **Get the Display link**) in Safari, tap **Tap to start the show** once
   (this also copies the link), then Share → **Add to Home Screen**.
2. Launch **Showdown** from the home screen (no Safari bars), turn the device to landscape. If it asks to connect,
   tap **Paste link**.
3. Tap **Tap to start the show**. A pill confirms "Screen will stay on".
4. Control Center → **Screen Mirroring** → your Apple TV.
5. Backup: Settings → Display & Brightness → **Auto-Lock → Never**; turn on Do Not Disturb; plug in power.

**Mac as the Display device (true 16:9)**

1. Control Center → Screen Mirroring → TV → **Use As Separate Display**.
2. Open the Display link, drag the window to the TV, tap the start button (it goes full screen; Ctrl+Cmd+F also works).

Check: nothing cut off at the TV edges, screen stays on 30 minutes untouched,
cursor hides after 2 seconds, portrait shows "Rotate to landscape".
