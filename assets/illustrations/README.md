# Location illustrations

These twelve original SVG illustrations were created for **Four Seasons to Grandma’s Table**. They are fictional environment artwork, not photographs, archaeological reconstructions, maps suitable for land claims, or evidence of a real family’s property or practices. No archival photograph or document image was traced, copied, embedded, or hotlinked into these files.

The visual style uses original vector shapes, a restrained forest/lake/seasonal palette, fine outlines, and paper and linen textures. Each file is self-contained, contains an accessible title and description, and has a `0 0 1200 600` viewBox. Display at a 2:1 ratio to preserve the full scene. There are no fonts, network dependencies, scripts, or audio in the artwork.

| File | Fictional scene |
| --- | --- |
| `kitchen.svg` | June’s modest present-day kitchen, everyday dishes, tote, illustrated food list, and fictional family keepsake |
| `trail.svg` | The common split-pine trail and branching seasonal paths |
| `weather.svg` | Present-day school weather station, collection pail, bare spring woods, and remaining snow |
| `grove.svg` | The fictional 1926 maple grove and existing folded-birch-bark collection bucket on a wooden stand |
| `sugarhouse.svg` | The fictional 1926 sugarhouse with an existing evaporator, steam, firewood, jars, and a covered notebook |
| `summeredge.svg` | Present-day picnic shelter, packing table, basket, and clip |
| `patch.svg` | Maintained family blueberry plot, markers, basket, and flapping picnic cloth |
| `landing.svg` | Present-day autumn dock and water-reading panel |
| `shed.svg` | Fictional 1926 work room with prepared, cooled rice, sorting tray, and basin |
| `hut.svg` | Present-day winter equipment hut, prepared equipment, and established path |
| `shelter.svg` | Present-day enclosed fishing shelter with prepared station, benches, and thermos |
| `archive.svg` | Present-day community reading room with shelving and a broad document table |

## Fiction and actual sources

The sepia family illustrations in `kitchen.svg` and `archive.svg` represent the invented story family. They are deliberately stylized drawings, not recovered 1926 family photographs. The framed boundary/parcel diagram in `archive.svg` is an abstract classroom illustration, not an actual reservation survey. Its colored parcels illustrate the difference between a boundary and ownership; no depicted parcel represents a real property. The game’s clickable labels and accessible descriptions identify these limits.

Actual treaty/statute page reproductions remain in `assets/documents/`. The scene UI displays these source scans separately, with their real titles, dates, credits, and source links. Do not replace a genuine source page with invented handwriting, AI-generated text, or one of these environmental illustrations.

The weather and water charts are fictional contemporary game props. The artworks do not document a specific historical sugar camp, home, wild-rice process, or lake condition. Fishing equipment and snow in the pictures provide story setting; they do not establish that a route or ice is safe.

## Editing manually

1. Open the relevant SVG in a vector editor such as Inkscape, or use GitHub’s text editor for a small color or shape change.
2. Keep the root `viewBox="0 0 1200 600"`, `<title>`, and `<desc>`. Update the description if the picture changes.
3. For text editing, common colors include forest `#365d4e`, deep green `#1e403d`, paper `#eee5cf`, lake blue `#86acb0`, gold `#bd8b50`, and rust `#ad6650`. Individual shapes may use lighter or darker related colors.
4. Reusable trees, plants, textures, and gradients live inside each file’s `<defs>`. A `<use href="#pine">` or similar element places a reusable drawing; its `translate(x y) scale(s)` controls position and size. All referenced definitions stay in the same file.
5. Clickable object names and positions belong to `sceneObjects` in `src/scene-view.js`, not to the SVG. Coordinates there are percentages: an object at SVG `(600, 450)` sits at `(50%, 75%)`. Move the label if you move its illustrated object. Keep labels clear of genuine document scans and other controls.
6. Actual source-document placement and date restrictions also belong to `src/scene-view.js`. Preserve the distinction between an in-world prop and an editorial comparison; a 2020 law must not become a 1926 prop.
7. Run `npm test`, `npm run test:browser`, `npm run test:sources`, and the visual browser check listed in `package.json` after changing scene interactions or layout.

No third-party illustration assets or archival photograph reuse licenses are required by these original vectors. Existing source-material credits and restrictions still apply to the separate source library.
