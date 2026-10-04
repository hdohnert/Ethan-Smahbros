# Ethan's Birthday Showdown

A self-hosted Smash Bros king-of-the-hill leaderboard. **Display** runs full
screen on a TV (via AirPlay mirroring); **Control** runs on a phone.

Live at: **https://hdohnert.github.io/Ethan-Smahbros/**

- Display (TV): `https://hdohnert.github.io/Ethan-Smahbros/#/display`
- Control (phone): `https://hdohnert.github.io/Ethan-Smahbros/#/control` (phase 2)

## Status

| Phase | What | State |
| --- | --- | --- |
| 1 | TV-ready skeleton: PWA, start screen with full screen + wake lock, sample leaderboard, Pages deploy | ✅ built |
| 2 | Supabase sync, sign-in, rules module, Control, Undo, playoff, Ticket Bank, Stations, Prize Store, Demo mode | next |
| 3 | Animations, birthday effects, sound, offline badge | later |

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/#/display
npm test           # unit tests (rules module)
npm run build      # type-check + production build into dist/
npm run icons      # re-render public/icons/* from the SVG in scripts/make-icons.mjs
```

Reskin for another party by editing `src/theme.ts` (colors, fonts, title, age, photo).

## One-time GitHub Pages setup

1. GitHub → this repo → **Settings → Pages** → *Build and deployment* → **Source: GitHub Actions**.
2. Push to `main` (or run **Actions → Deploy to GitHub Pages → Run workflow**).
3. If the deploy job says the branch "is not allowed to deploy to github-pages",
   open **Settings → Environments → github-pages → Deployment branches** and add the branch.

## Phase 1 TV test (game-night hardware)

**iPhone or iPad as the Display device**

1. Open `…/#/display` in Safari → Share → **Add to Home Screen**.
2. Launch **Showdown** from the home screen (no Safari bars), turn the device to landscape.
3. Tap **Tap to start the show**. A pill confirms "Screen will stay on".
4. Control Center → **Screen Mirroring** → your Apple TV.
5. Backup: Settings → Display & Brightness → **Auto-Lock → Never**; turn on Do Not Disturb; plug in power.

**Mac as the Display device (true 16:9)**

1. Control Center → Screen Mirroring → TV → **Use As Separate Display**.
2. Open `…/#/display`, drag the window to the TV, tap the start button (it goes full screen; Ctrl+Cmd+F also works).

Check: nothing cut off at the TV edges, screen stays on 30 minutes untouched,
cursor hides after 2 seconds, portrait shows "Rotate to landscape".
