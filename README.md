# Four Seasons to Grandma’s Table

A complete browser text adventure for high school students. Start at Grandma June’s kitchen in northern Minnesota, follow a fictional trail across four seasons and 1926/2026, and contribute syrup, blueberries, prepared wild rice, and fish to a larger family feast.

The game has 11 compact locations, four multi-step seasonal puzzles, character conversations, three-tier hints, inventory, an explored map, a journal, all seven teaching reflections, command history, local autosave, manual checkpoints, repairable mistakes, and an ending that remembers your actions. About 25 minutes is the design target; no timed classroom pilot has been conducted.

## Run locally

Install Node.js 22 or newer. In the game folder run:

```sh
npm start
```

Open `http://localhost:8000` **on that same computer**. For the shared cloud workspace, run from `/workspace/ojibwe`; cloud localhost is not a public game link. Alternatively serve the folder with Python 3: `python3 -m http.server 8000`.

There are no package dependencies, installation steps, accounts, API keys, backend, runtime AI calls, or analytics. This uses the repository’s existing plain-JavaScript browser stack with separate ES modules. Double-clicking HTML is not the supported launch method because browsers restrict local module loading; use a local server or the hosted website.

## Play

Start with `TALK TO GRANDMA`, `EXAMINE PHOTO`, and `TAKE LIST`. Type `HELP` for all commands. `HINT` provides three levels of assistance per step. `GO SUMMER` and other named destinations retrace connecting paths without bypassing puzzle locks. English equivalents work; no exact Ojibwe spelling is required.

Arrow Up/Down recalls typed commands. All buttons are optional keyboard-accessible shortcuts. `SAVE` makes a checkpoint; `LOAD` restores it while autosave continues separately. `RESTART` asks before clearing both. Saves stay in this browser on this website’s origin. Browser storage restrictions do not prevent playing the current session.

## Website publication

The included `.github/workflows/pages.yml` builds and deploys the static site from `main`. In repository **Settings → Pages**, choose **GitHub Actions** as the source, then run **Publish game website** or push an authorized update to `main`. GitHub reports the public address after successful deployment. A local test or Git upload alone does not prove the website is live.

`npm run build` copies only `index.html` and the runtime `src/` directory into `dist/`. Host `dist/` with any static website host. Links to teacher/review documents are included in the built website too.

## Validation

```sh
npm test
npm run build
```

The Node test suite covers the complete route, all seven teaching encounters, parser aliases, three-level hint progression, safe route gates, puzzle prerequisites, wrong commands, dropped-object recovery, separate manual/autosaves, and save validation.

For browser integration checks, provide Playwright and its Chromium browser (or system Chromium), then run `npm run test:browser`. The browser test starts and stops its own server, plays the complete route, checks reload/checkpoints/restart/history, tests blocked storage, and checks 1366×768 Chromebook and narrow-phone layouts. Playwright is optional test tooling, not an application dependency.

## Files and classroom review

- `src/content.js`: editable story, cultural/teaching explanations, vocabulary review metadata, and sources.
- `src/parser.js`, `src/engine.js`, `src/storage.js`, `src/ui.js`: parser, deterministic state, persistence, and interface.
- [Teacher guide](TEACHER_GUIDE.md): goals, timing, and three discussion questions.
- [Content review](CONTENT_REVIEW.md) and [source notes](SOURCE_NOTES.md): unverified details and required local review.
- [Spoiler walkthrough](WALKTHROUGH.md): a complete tested route and accepted variants.

This is **not culturally reviewed**. Dictionary access was blocked, so the game uses conservative English vocabulary with explicit pending Ojibwe terms. Review with appropriate local American Indian Education and tribal language partners before classroom use. Time travel is fiction, not an Ojibwe belief. No student identifiers are collected.
