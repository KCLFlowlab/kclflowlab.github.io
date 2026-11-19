# KCL FlowLab website

Public website: **https://kclflowlab.github.io/**. Redesigned 19 November 2026 around
bio-inspired engineering, fluid physics and scientific AI. The deployable site is in
`site/`: static HTML, CSS and JavaScript, locally hosted fonts and research media,
with no framework, analytics, CDN dependency or backend.

## Two visual experiences

- **Swimmer** (default): https://kclflowlab.github.io/ — an interactive WebGL fish, then the research page.
- **Flow form**: https://kclflowlab.github.io/sculpture.html — the earlier rotating ribbon sculpture.

The footer of the Swimmer page and the in-scene switch of the Flow form page link the two.
The Flow form HTML, JavaScript and CSS were restored from commit `c05e741`; `sculpture.js`
and `sculpture.css` must stay byte-identical to that commit (checked by `qa-versions.cjs`).
It uses `experiences.css`; the Swimmer page does not. Research assets are shared from
`site/assets/`. Research-content corrections apply to both HTML pages.

## Experience

The page opens on open water with no text: a fish swims in from the left. After about
2.6 seconds (or the first click, tap or key) a quiet header, an interaction hint and a
scroll cue fade in. Pointer movement guides the fish; a click or tap makes it dart; the
arrow keys or W/A/S/D steer it on screen and Shift gives a burst. Arrow keys steer only
while the water fills most of the view and nothing else has focus, so they scroll the page
everywhere else. With no input the fish wanders. Pause and reduced motion stop autonomous
motion; direct input still animates the fish briefly. Rendering stops when the hero is off
screen, in background tabs and behind dialogs.

Scrolling leads to one calm, typographic page: introduction and three direction entrances;
the research vision; research directions (three tabs, nine topic branches linking studies,
KCL records and explicitly labelled research interests); four selected studies; the
publication record with the four preprints; people; contact. The header stays transparent
over the water and becomes solid over the page; on phones it collapses into a menu. A study
opens a workspace with the question, authors, paper/code links, the full paper title and
first-preprint date, original figures and controlled animations. Study links open in place,
and closing returns focus to the link used. `#study-…` and `#domain-…` links are deep links.
All text is in the HTML, so the page reads fully without JavaScript.

Featured studies follow first arXiv submission: RA-VFM (13 March), STCO (20 August),
Deforming VFM (31 August), VATO (1 September), all in 2026. These are not project-start
or acceptance dates. Juan Li leads the team presentation; students follow the user-specified
cohort order: Yichen Li, Matteo Liguori, Vedang Joshi, Xingxin Yang, Zhan Zhang. Three
portraits come from official KCL profiles; other members keep initials. No exact student
years or unsupported biographies are inferred. Space Grotesk and Manrope are self-hosted.

## Science and provenance

The opening scene is an **interactive swimming illustration**, not CFD, a measured field
or a research result. `site/swimmer.js` renders it with raw WebGL (no external library):
a procedural fish with smooth normals, multisampled anti-aliasing, countershaded colouring,
five translucent fin groups and a painted eye. The body follows its own path (a
follow-the-leader centreline with a bending limit) and carries a prescribed carangiform
travelling wave whose amplitude grows towards the tail. At each tail-beat reversal it sheds
a desingularised 2D point vortex, signed as in a reverse von Kármán (thrust) street; the
vortices advect one another, spread and fade. Dye from the trailing edge and drifting
particles are carried by that field. There is no pressure solve and no validated boundary
condition; colours are illustrative. "About the visual" explains this.

Bounds: at most 40 vortices, 1,400 dye particles (700 on phones) and 260 ambient particles
(150 on phones); device pixel ratio capped at 2. The archived CFD snapshot is the
JavaScript-free/WebGL-free fallback and appears in "About the visual": calculated cells,
phase 0 of `Afish_St0p40_Lam1p50_Re5000`, qualitative vorticity range −30 to +30.

Scientific media in the study workspaces are unchanged. The Deforming VFM animation
retains its complete 64-phase cycle. VATO clips are discrete direct-prediction lead
and incidence sweeps; STCO frames are independently queried leads. Captions and seek
labels preserve these meanings. The four MP4s retain original frame counts, timing,
labels and complete scientific panels. Controls provide pause, seek and fullscreen.
Closing or switching studies, selecting figures or hiding the page stops hidden media.

The five selected KCL records and four-preprint bibliography retain exact titles,
authors, sources and publication status. The AIAA Journal in-press record and RA-VFM
preprint remain separate records. The wider lab vision is editorial framing informed
by the user's direction and official profiles; engineering ambitions are not described
as delivered products or demonstrated applications.

`asset-manifest.json` records source URLs, exact media commits, processing and SHA-256
hashes. RA-VFM figures are unaltered arXiv images under CC BY-NC-ND 4.0 and use contain
sizing without cropping. Other scientific media remain author-supplied project material;
the website does not relicense them. Fonts retain their SIL Open Font License files.

## Preview and checks

```bash
python3 tools/serve.py
```

Open `http://127.0.0.1:8769/` on the same device. The loopback server supports MP4 byte
ranges. Stop it with Ctrl+C. Generate the self-contained offline previews and source zip:

```bash
python3 tools/package.py
node --check site/app.js && node --check site/swimmer.js && node --check site/sculpture.js
python3 tools/check_site.py
```

Chromium QA, with the server running (the scripts enable SwiftShader WebGL for headless runs):

```bash
npm ci --prefix tools/browser
CHROMIUM_PATH=/absolute/path/to/chromium node tools/qa.cjs          # page, directions, studies, media, layouts, no-JS
CHROMIUM_PATH=/absolute/path/to/chromium node tools/qa-swimmer.cjs  # opening, pointer/keyboard steering, bounds, pause
CHROMIUM_PATH=/absolute/path/to/chromium node tools/qa-versions.cjs # Flow form unchanged; switching both ways
```

`PREVIEW_URL` defaults to the local server. Reports and PNGs go to ignored `qa/`. Real
Safari/iOS hardware has not been tested. Keep `preview.html` and `preview-sculpture.html`
together to use their reciprocal version links.

## Deployment and editing

Repository: `KCLFlowlab/kclflowlab.github.io`. GitHub Actions checks JavaScript and
asset integrity and deploys only `site/` on pushes to `main`. QA outputs, tools and the
offline preview are not deployed. This website repository is separate from the research
repositories.

- Page content, sections and bibliography: `site/index.html`.
- WebGL swimmer, wake and input handling: `site/swimmer.js`.
- Hero states, header, directions/topics, study workspace, routing and media: `site/app.js`.
- Typography, layout and responsive rules for the Swimmer page: `site/styles.css`.
- Preserved flow-form experience: `site/sculpture.html`, `site/sculpture.js`, `site/sculpture.css`, `site/experiences.css`.
- Provenance and exact research records: `asset-manifest.json`.
- Chinese design rationale: `SITE_PLAN.md`.

`tools/render_flow.py` can regenerate the archived scientific field with NumPy, SciPy
and Matplotlib from the source recorded in the manifest. It does not generate the
interactive swimmer or modify the source archive. Refresh hashes after changing assets.
