# KCL FlowLab website

Public website: **https://kclflowlab.github.io/**. Research-field experience updated 14 October 2026 around
bio-inspired engineering, fluid physics, scientific AI and the people behind the work. The
complete deployable site is in `site/`: static HTML, CSS and JavaScript, with locally
hosted media and fonts, no framework, analytics, CDN dependency or backend.

## Design and content

The homepage is a single, full-viewport **research field**, introduced by “Inspired by
nature.” A real CFD wake and passive particle tracers form the environment. Four
floating, clickable nodes use the studies' own cover images. Hover/focus highlights
navigation lines; these are interface cues, not scientific measurements. Filters
emphasize overlapping bio-inspired, flow-physics and scientific-AI directions. The field layer and motion can be
controlled independently.

The lab-level narrative connects learning from nature, understanding complex flows,
developing predictive tools and informing engineering design. A dedicated Vision panel
introduces three complementary directions and links them to the featured studies.
This is an editorial research vision, informed by the lab's requested direction and
official KCL profiles, rather than an institutional slogan or a claim that the listed
long-term engineering ambitions have already been realised. Vortex-force mapping
remains a specific method within this broader programme.

Selecting a node opens a research workspace over the field. It contains the research
question, authors, paper/code links, full scientific figures and controlled animations.
A study switcher moves between projects; hash URLs support direct links and browser
Back. On phones, media comes first. Only the workspace content scrolls during normal
use; very short landscape viewports allow a scrollable field to keep controls reachable.

Nodes and workspace tabs follow first arXiv submission: RA-VFM (13 March), STCO
(20 August), Deforming VFM (31 August), VATO (1 September), all in 2026. Matteo's work
comes first. These dates are not inferred project-start or acceptance dates.

Vision, People, Outputs and Contact open their own workspace panels. The six introductions,
three official portraits, five selected KCL records and four-preprint index are retained.
The AIAA Journal in-press record and RA-VFM preprint remain distinct records. The header
and browser icon use the unchanged black-and-white GitHub avatar. The institutional
KCL mark appears beside contact details. Space Grotesk supplies the geometric display
voice; Manrope supplies reading text. Both fonts and every research asset are self-hosted.

| Work | Research media | Status |
| --- | --- | --- |
| Deforming VFM | README swimming/force-mapping animation; Figures 5 and 11 | arXiv:2609.00461, preprint |
| MarsVATO | README architecture; lead-time and incidence sweeps | arXiv:2609.00507, preprint |
| STCO | FRO_Paper README overview, four-condition response animation, spatial and performance comparisons | arXiv:2608.20477, preprint |
| RA-VFM | Unaltered paper geometry and 3D lift-contribution figures | arXiv:2603.13078, preprint |

The hero is a **qualitative rendering of one archived phase-0 CFD snapshot**, using
calculated cells and a fixed display range of −30 to +30 for vorticity. Moving particles
are passive tracers advected through that frozen velocity field, not an unsteady
simulation. This distinction is explained by “About this field”. The Deforming VFM
workspace retains the complete 64-phase source animation.

VATO clips are discrete direct-prediction sweeps. STCO frames represent independently
queried leads. Captions and seek labels preserve these distinctions. The four MP4s
retain the original GIF frame counts, timing and complete scientific panels, totaling
2,957,847 bytes. Controls provide pause, seek and fullscreen. Closing a workspace,
switching studies or entering the figures view stops hidden media. Background tabs pause
playback; reduced-motion preferences disable autoplay. The background particle field
pauses while a workspace is open.

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
`qa/`. Checks cover the single-viewport field, all four nodes and media sources,
overlapping research filters, Vision-to-study links, field controls, study switching, direct links, browser Back, focus return,
Escape, video seeking/fullscreen, source images, people and output panels, cohort ordering, 320–1440px
layouts, reduced motion, no-JavaScript links and failing resources.
Real Safari/iOS hardware has not been tested.

## Deployment

Repository: `KCLFlowlab/kclflowlab.github.io`. Pages Source is **GitHub Actions**.
Pushes to `main` run JavaScript and asset checks, then publish only `site/`. Local QA,
source data and tools are not deployed. The website repository and research
repositories remain separate.

## Editing and provenance

- Field nodes and information-panel templates: `site/index.html`.
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
