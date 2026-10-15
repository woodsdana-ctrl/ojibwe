# Four Seasons to Grandma’s Table

A playable illustrated browser adventure for high school students, blending Ojibwe vocabulary, family humor, seasonal problem solving, and Leech Lake history. Begin at Nookomis’s present-day rented home near Cass Lake, compare land-history records, then follow four seasonal paths to bring syrup, blueberries, prepared wild rice, and fish to the family table.

[Play the website](https://woodsdana-ctrl.github.io/ojibwe/). For the full revised opening, start a new game; saves keep earlier progress.

The game has **12 compact locations**, a records-room investigation, four seasonal puzzles, a sap-labeling task, character conversations, three-level hints, bilingual inventory, an explored map, a word journal, seven teaching reflections, explicit time-crossing notices, and a timeline. The original 25-minute target is now approximately **28–30 minutes** with the history opening, depending on reading and exploration. This is an estimate; no timed classroom pilot has been conducted.

## Play

Start with `TALK TO NOOKOMIS`, `EXAMINE PHOTO`, `TAKE LIST`, and `TAKE TOTE`. Visit the records room east before following the trail. `HELP` lists controls; `HINT` advances from a nudge to explicit commands.

Ojibwe food words appear in requests and tasks: try `ASK NIIBIN ABOUT MIINAN`, `TRANSLATE MANOOMIN`, or `GIVE GIIGOONH TO NOOKOMIS`. English equivalents work throughout, including `LABEL SAP AS SAP`. Exact Ojibwe spelling is not required. Earlier English character names remain accepted aliases.

`TIMELINE` separates your fictional 1926/2026 crossings from the dated land-history events. `GO SUMMER` and other named destinations retrace connecting paths without bypassing puzzle locks. The trail returns home in 2026.

Arrow Up/Down recalls commands. Buttons are keyboard-accessible shortcuts. `SAVE` makes a checkpoint; `LOAD` restores it while autosave continues separately. `RESTART` asks before clearing both. Saves stay in this browser on this website’s origin. Restricted browser storage does not prevent playing the current session.

## Real source shelf

Click **Sources & photos** or type `SOURCES`. `VIEW TREATY`, `VIEW NELSON ACT`, and `VIEW RESTORATION LAW` open the relevant original. The shelf includes official 1855/1889/2020 printed-page facsimiles and complete PDFs, exact excerpts, dates, creators, places, and questions for comparing evidence. It works without a PDF browser plugin because the selected pages are also images.

Seasonal photograph/object cards link to the actual archive records. Museum images are not reproduced where an item-specific reuse license is missing. Summer currently has drying-rack objects and a household record; no verified blueberry-picking photo is claimed. Browsing the source shelf does not change puzzle progress. Selecting a document on the illustrated records-room table also examines its paired exhibit card, just like the corresponding typed `EXAMINE` command.

Source captions and metadata are editable in `content.sourceLibrary` in `src/content.js`; document files are under `assets/documents/`. Preserve provenance, accurate captions, and rights information when adding material. The build copies those assets for static hosting.

## Illustrated field journal

Each of the twelve locations has its own original SVG illustration. Select a scene label to examine an object, use **Within reach** buttons to pick up portable items, or select a portrait to talk. The typed-command story remains available alongside the scene. A year badge identifies every location, and the map separates present-day paths from the two century crossings.

**Map** opens the illustrated story map. It names visited locations and exits from your current location; choosing an open destination uses the same paths and prerequisites as typed travel. **Inventory** opens illustrated item cards; select an item to examine it. **Journal** opens your collected observations, vocabulary with dictionary links and recorded-speaker context, and teaching reflections. These tools work with keyboard controls and on small screens.

Actual treaty and statute scans appear in the kitchen and records-room visuals and open the original source reader. Earlier legal records also appear as explicitly labeled editorial notebook evidence beside the fictional 1926 scenes. The 2020 law appears only in present-day scenes. Scans retain their original page content, dates, and public-domain GovInfo credits. Fictional scenery and portraits are labeled separately from historical evidence.

To edit the visuals, use `assets/illustrations/{location}.svg` and `assets/portraits/{character-key}.svg` in a vector editor or edit their SVG markup. The READMEs in those folders explain their provenance. `src/scene-view.js` sets object-label positions as percentages and source placement; `src/map-view.js` sets story-map positions; `src/illustration-icons.js` holds the small inventory drawings. The overall colors and page layout are in `src/style.css`; scene, map, and archive-reader styles have their own CSS files. Displayed names and story text remain in `src/content.js`. This visual edition includes no audio.

## Run locally

Install Node.js 22 or newer. In the game folder run:

```sh
npm start
```

Open `http://localhost:8000` **on that same computer**. In the shared cloud workspace, run from `/workspace/ojibwe`; cloud localhost is not a public website address. Alternatively serve the folder with Python 3: `python3 -m http.server 8000`.

The game uses plain JavaScript and separate browser modules. There are no application dependencies, install steps, accounts, API keys, backend, runtime AI calls, analytics, or student identifiers. Serve the files locally or use the hosted website; double-clicking HTML is unsupported because browsers restrict local module loading.

## Build and publish

`.github/workflows/pages.yml` builds and deploys the static site from `main`. In repository **Settings → Pages**, choose **GitHub Actions**, then run **Publish game website** or push an authorized update to `main`. A successful upload alone does not verify deployment.

`npm run build` copies `index.html`, runtime `src/`, all `assets/` including illustrations and original documents, and the linked teacher, review, source, and walkthrough documents into `dist/`. Any static website host can serve that folder.

## Validation

```sh
npm test
npm run build
```

The Node suite covers the complete route, history comparison and caption, sap labeling, teaching encounters, aliases, hints, puzzle prerequisites, route gates, recoverable mistakes, storage, and save validation. Browser checks use the same complete route.

For browser integration, provide Playwright and Chromium, then run `npm run test:browser`. It checks the ending, reload/checkpoints/restart, command history, restricted storage, and Chromebook and phone layouts. Playwright is optional test tooling, not an application dependency. `npm run test:sources` checks actual scan/PDF loading, page navigation, archive links, source metadata, keyboard focus, and unchanged game progress.

`npm run test:visuals` checks all twelve scene images, eight portraits, clickable objects, recoverable inventory, document thumbnails, the 1926/2026 separation, map travel and locks, keyboard focus, and desktop/phone layouts. Browser checks start their own servers on ports 8011–8013 and stop them afterward.

## Classroom and source documents

- [Teacher guide](TEACHER_GUIDE.md): goals, pacing, timeline, and discussion.
- [Content review](CONTENT_REVIEW.md): specific items for local review.
- [Source notes](SOURCE_NOTES.md): live dictionary entries, historical evidence, and source limits.
- [Spoiler walkthrough](WALKTHROUGH.md): the complete tested route and command variants.

`src/content.js` holds story, vocabulary, character names, history, and source metadata. Parser, engine, storage, and interface code are separate modules under `src/`.

Official GovInfo treaty/statute PDFs, live Ojibwe People’s Dictionary entries, and selected historical object records were checked on October 14, 2026. **Local cultural/classroom review remains pending.** Character names use verified ordinary words; the story does not assert ceremonial naming customs. The household and ancestors are fictional; the documented land-history events are identified by source. Time travel is a storytelling invention. A present-day home does not imply that dispossession was repaired, and the adventure cannot undo that history.
