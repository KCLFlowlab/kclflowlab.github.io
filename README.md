# KCL FlowLab website

Public website: **https://kclflowlab.github.io/**. Updated 14 October 2026 around
bio-inspired engineering, fluid physics and scientific AI. The deployable site is in
`site/`: static HTML, CSS and JavaScript, locally hosted fonts and research media,
with no framework, analytics, CDN dependency or backend.

## Experience

“Nature in motion. Ideas in flow.” introduces an immersive **research landscape**.
A generative three-dimensional ribbon sculpture provides the spatial setting, with
three entrances: bio-inspired motion and design, complex flows and interactions,
and scientific AI and computation. Visitors drag to orbit, scroll or pinch to zoom,
or use the equivalent keyboard/button controls. Selecting a direction moves the
view and highlights its colour. Motion can be paused and respects reduced motion.

A direction opens an in-scene panel, rather than another modal. Nine topic branches
connect biological motion, flow physics, predictive learning and design to the actual
research. Topics link to selected studies, earlier publication records or explicitly
labelled research interests. The collective-motion branch links to Vedang's official
profile; it is not presented as an additional completed project. A publication preview
on the homepage also surfaces the longer research record, with manual cycling and
an automatic nine-second change only while motion is enabled and the page is visible.

The research index combines four **selected** studies with five KCL publication
records from 2022–2026. The homepage does not label four studies as the whole lab.
Featured studies and the workspace switcher follow first arXiv submission:
RA-VFM (13 March), STCO (20 August), Deforming VFM (31 August), VATO (1 September),
all in 2026. These are not inferred project-start or acceptance dates.

Selecting a study opens the research workspace with the question, authors, paper/code
links, original scientific figures and controlled animations. Closing returns to the
previous direction and selected topic. Hash URLs support direct study/direction links
and browser Back. The normal homepage fills one viewport; only content panels scroll.
Very short windows permit necessary page scrolling. Phones prioritise research media.

Vision, People, publication details and Contact remain separate workspace panels.
Juan Li leads the team presentation; students follow the user-specified cohort order:
Yichen Li, Matteo Liguori, Vedang Joshi, Xingxin Yang, Zhan Zhang. Three portraits
come from official KCL profiles; other members retain typographic initials. No exact
student years or unsupported biographies are inferred. The unchanged black-and-white
GitHub avatar identifies the lab; the KCL institutional mark stays in Contact.
Space Grotesk and Manrope are self-hosted.

## Science and provenance

The interactive homepage sculpture is **generative navigation artwork**, not CFD,
a measured field, a research result or a physical connection between studies. Its
colours distinguish research directions. “About the visual” explains this distinction.
The archived CFD snapshot remains there and as a static fallback; it uses calculated
cells, phase 0 of `Afish_St0p40_Lam1p50_Re5000`, and a qualitative vorticity display
range of −30 to +30. The original velocity display grid remains archived with the site.

Scientific media in the study workspaces are unchanged. The Deforming VFM animation
retains its complete 64-phase cycle. VATO clips are discrete direct-prediction lead
and incidence sweeps; STCO frames are independently queried leads. Captions and seek
labels preserve these meanings. The four MP4s retain original frame counts, timing,
labels and complete scientific panels, totaling 2,957,847 bytes. Controls provide
pause, seek and fullscreen. Closing or switching studies, selecting figures or hiding
the page stops hidden media. The sculpture pauses behind dialogs and in background tabs.

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
ranges. Stop it with Ctrl+C. Generate the self-contained offline preview and source zip:

```bash
python3 tools/package.py
node --check site/app.js
python3 tools/check_site.py
```

For Chromium interaction QA, with the server running:

```bash
npm ci --prefix tools/browser
CHROMIUM_PATH=/absolute/path/to/chromium node tools/qa.cjs
```

`PREVIEW_URL` defaults to the local server. Reports and PNGs go to ignored `qa/`.
Checks cover rotation, zoom, touch pinch, keyboard controls, motion preferences,
direction/topic navigation, closing and restoring focus, browser Back, the research
index and archive, all research videos and figures, team order, source credits,
320–1440px layouts and the JavaScript-free fallback. Real Safari/iOS hardware has not
been tested. The offline `preview.html` embeds every asset and needs no network fetches.

## Deployment and editing

Repository: `KCLFlowlab/kclflowlab.github.io`. GitHub Actions checks JavaScript and
asset integrity and deploys only `site/` on pushes to `main`. QA outputs, tools and the
offline preview are not deployed. This website repository is separate from the research
repositories.

- Page structure, portals, templates and bibliography: `site/index.html`.
- Generative renderer, direction/topic associations, routing and media: `site/app.js`.
- Typography, responsive layout and transitions: `site/styles.css`.
- Provenance and exact research records: `asset-manifest.json`.
- Chinese design rationale: `SITE_PLAN.md`.

`tools/render_flow.py` can regenerate the archived scientific field with NumPy, SciPy
and Matplotlib from the source recorded in the manifest. It does not generate the
homepage sculpture or modify the source archive. Refresh hashes after changing assets.
