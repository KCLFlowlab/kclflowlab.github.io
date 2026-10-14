# KCL FlowLab website

Public website: **https://kclflowlab.github.io/**. Redesigned 13 October 2026 around
fluid physics, scientific machine learning and the people behind the work. The
complete deployable site is in `site/`: static HTML, CSS and JavaScript, with locally
hosted media and fonts, no framework, analytics, CDN dependency or backend.

## Design and content

The header, footer and browser icon use the original black-and-white KCLFlowlab
GitHub avatar, unchanged. The institutional KCL logo appears only beside the contact
details. Both source assets retain provenance in the asset manifest.

The opening reads “See the flow. Find the force.” Space Grotesk provides a consistent
geometric display voice, with Manrope for readable body copy and monospace only for
research metadata. Body text is 15–18 px on desktop and 15–16 px on mobile; source
captions remain secondary without shrinking into unreadable decoration. The hero
keeps the real CFD field, with clear research and team entry points.

A full-screen CFD field introduces the lab, followed by four research chapters ordered by first arXiv submission:
RA-VFM (13 March), STCO (20 August), Deforming VFM (31 August) and VATO
(1 September), all in 2026. This is a public dissemination timeline, not an inferred
project start date. Matteo Liguori’s RA-VFM study is the first research chapter.
Deep blue, warm ivory, copper highlights and generous typography establish a quiet
visual rhythm around the scientific images. The People section introduces Juan Li,
Xingxin Yang, Vedang Joshi, Matteo Liguori, Yichen Li and Zhan Zhang. Five selected publications from Juan Li’s KCL Pure record, an expandable four-preprint
index and a contact section close the page. The KCL list runs from 2022 to 2026 and
distinguishes published work from the AIAA Journal record marked accepted/in press.
That institutional record and the RA-VFM preprint have different titles and author
lists, so they are retained as separate records.

| Work | Research media | Status |
| --- | --- | --- |
| Deforming VFM | README swimming/force-mapping animation; Figures 5 and 11 | arXiv:2609.00461, preprint |
| MarsVATO | README architecture; lead-time and incidence sweeps | arXiv:2609.00507, preprint |
| STCO | FRO_Paper README overview, four-condition response animation, spatial and performance comparisons | arXiv:2608.20477, preprint |
| RA-VFM | Unaltered paper geometry and 3D lift-contribution figures | arXiv:2603.13078, preprint |

The hero is a **qualitative rendering of one archived phase-0 CFD snapshot**, using
calculated cells and a fixed display range of −30 to +30 for vorticity. Moving particles
are passive tracers advected through that frozen velocity field, not an unsteady
simulation. This distinction is explained by “About this flow”. The Deforming VFM
chapter and detail view retain the complete 64-phase source animation.

VATO clips are discrete direct-prediction sweeps. STCO frames represent independently
queried leads. Captions and seek labels preserve these distinctions. The four MP4s
retain the original GIF frame counts, timing and complete scientific panels, totaling
2,957,847 bytes. Controls provide pause, seek and fullscreen. Offscreen media,
background tabs and open dialogs suspend ambient playback; reduced-motion preferences
disable automatic playback. Research dialogs contain full figures, authors and sources.

Three portraits and profiles come from official KCL pages. Matteo links to KCL Pure.
Yichen and Zhan's introductions are limited to verified co-authorship because no
reliably matched institutional profiles were found. Members without sourced portraits
use typographic initials. The website does not claim this is an exhaustive team list.

## Preview and checks

```bash
python3 tools/serve.py
```

Open `http://127.0.0.1:8769/` on the same device. The loopback server supports MP4 byte
ranges. Stop it with Ctrl+C when finished. To generate `preview.html` (an offline,
single-file version with embedded fonts, field data, images and videos) and
`kclflowlab-website.zip` (a source archive):

```bash
python3 tools/package.py
node --check site/app.js
python3 tools/check_site.py
```

For Chromium interaction QA with the preview server running:

```bash
npm ci --prefix tools/browser
CHROMIUM_PATH=/absolute/path/to/chromium node tools/qa.cjs
```

`PREVIEW_URL` defaults to the local URL above. Reports and PNG screenshots go to ignored
`qa/`. Checks cover field animation, all four video sources, playback/seek, independent STCO and VATO players, four study dialogs, figure and portrait loading, fullscreen, chronological chapter order, five KCL records and four arXiv links, mobile menu,
320–1024px layouts, reduced motion, no-JavaScript fallback and failed resources.
Real Safari/iOS hardware has not been tested.

## Deployment

Repository: `KCLFlowlab/kclflowlab.github.io`. Pages Source is **GitHub Actions**.
Pushes to `main` run JavaScript and asset checks, then publish only `site/`. Local QA,
source data and tools are not deployed. The website repository and research
repositories remain separate.

## Editing and provenance

- Sections and people: `site/index.html`.
- Motion, media controls, captions and detail text: `site/app.js`.
- Responsive design: `site/styles.css`.
- Research chronology, publication metadata, source URLs, exact media commits and hashes: `asset-manifest.json`.
- Chinese design rationale: `SITE_PLAN.md`.

To regenerate the hero, install NumPy, SciPy and Matplotlib in your own development
environment, then run:

```bash
python3 tools/render_flow.py --source /path/to/snapshots_fourphase.npz
```

The archive is from Deforming VFM's `Afish_St0p40_Lam1p50_Re5000` field data, at the
commit recorded in the manifest. Rendering does not alter that archive. After changing
assets, refresh manifest hashes and regenerate the portable preview.

RA-VFM figures remain original arXiv:2603.13078v1 image files under CC BY-NC-ND 4.0,
credited on the site. Other scientific media are author-supplied repository materials;
the website does not relicense them. Official KCL profile pages are linked beside
portraits and in Sources & credits. Manrope and Space Grotesk are self-hosted with
their SIL Open Font License files in `site/assets/`.
