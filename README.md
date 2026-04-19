# Future Readiness Simulator 2050

A static PWA strategy/simulation game built with vanilla HTML, CSS, and JavaScript for GitHub Pages.

It places the player inside a plausible 2025–2050 world shaped by:
- AI disruption
- job compression and forced pivots
- financial stress
- misinformation and reputation risk
- crisis leadership under partial information
- long-horizon strategic and ethical tradeoffs

This is **not** a quiz app. It is a scenario engine with consequences, stat changes, stage debriefs, and end-of-run behavioral analysis.

## Features

- Vanilla HTML/CSS/JS only
- Mobile-first responsive UI
- Serious dark-mode presentation
- Local save/continue flow
- Offline-capable PWA with service worker
- GitHub Pages compatible with relative paths
- Multiple unlockable modes
- Six stages with substantial scenario content
- Mandatory briefing/rules screen before every task
- Local run history and replayability

## Project Structure

```text
index.html
css/styles.css
js/app.js
js/storage.js
js/gameData.js
js/scoring.js
js/ui.js
js/utils.js
manifest.json
service-worker.js
icons/icon-192.svg
icons/icon-512.svg
README.md
```

## How to Run Locally

Because this uses ES modules and a service worker, use a local web server rather than opening the file directly.

### Option 1: Python
```bash
python3 -m http.server 8000
```

Then open:
```text
http://localhost:8000
```

### Option 2: VS Code Live Server
Open the project folder and run **Live Server**.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In the GitHub repository, open **Settings → Pages**.
3. Set the source to:
   - **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
4. Save.
5. GitHub Pages will publish the static site.

Because all asset URLs are relative (`./...` or folder-relative), it is safe for GitHub Pages project hosting.

## Offline Caching

The service worker caches the app shell and core files:
- HTML
- CSS
- JS modules
- manifest
- icons

Notes:
- The current run and history are stored locally in browser storage.
- New deployments may require one refresh before the updated cache becomes active.

## Save Data Location

This project stores save data in `localStorage`.

Current key:
- `frs2050_state_v1`

Stored data includes:
- current run
- unlocked modes
- settings
- completed run history

## How to Edit / Expand Content

### Scenarios, stage copy, rules, unlock conditions
Edit:
- `js/gameData.js`

This is the main content file. Add more levels, change stat effects, edit briefings, or expand stage difficulty here.

### Scoring logic and behavioral analysis
Edit:
- `js/scoring.js`

This file controls:
- stat baselines
- effect application
- level evaluation
- mode unlock logic
- end-of-run profiling

### UI copy and screen layouts
Edit:
- `js/ui.js`

This file contains rendering for:
- home
- new run
- stage intro
- briefing
- gameplay
- outcome
- stage debrief
- final analysis
- history
- settings
- help

### App flow
Edit:
- `js/app.js`

This file controls:
- navigation
- run creation
- gameplay state
- timers
- persistence
- service worker registration

## Design Notes

- The game is data-driven rather than hard-coded per screen.
- Each level type has its own interaction pattern:
  - decision
  - allocation
  - priority ranking
  - contradiction filtering
- Every level starts with a required briefing screen explaining rules, constraints, resources, success/failure framing, and scoring.

## Future Expansion Ideas

- Add more levels per stage
- Add deeper delayed consequence chains between early and late choices
- Add more hidden stats and event mutation logic
- Add richer mode-specific scenario variants
- Add richer end-of-run comparative analytics across history

## Browser Support

Modern Chromium, Safari, and Firefox should work. Best experience is on current evergreen browsers with service worker and ES module support.
