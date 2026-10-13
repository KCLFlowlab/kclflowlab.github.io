# KCL FlowLab website

GitHub Pages website, revised 13 October 2026. Minimal graphite-and-cyan design,
with real research media as the main visual. The complete deployable website is in
`site/`: static HTML, CSS and JavaScript, without a framework, CDN, analytics or backend.

## Preview

Open `preview.html` directly in a browser or a compatible HTML artifact viewer.
It embeds the images, four videos, styles and scripts for a portable review.
Regenerate it and the clean source archive with:

```bash
python3 tools/package.py
```

For local development, run `python3 tools/serve.py` and open
`http://127.0.0.1:8769/` on the same device. The loopback server supports video byte
ranges for seeking. Stop it with Ctrl+C when finished.

## Included work

| Project | Featured media | Scientific status |
| --- | --- | --- |
| Deforming VFM | README swimming/force-mapping animation; Figures 5 and 11 | arXiv:2609.00461, preprint |
| MarsVATO | README architecture cover; lead-time and incidence animations | Manuscript |
| STCO | FRO_Paper README overview, four-condition response animation, spatial and performance comparisons | Manuscript |
| RA-VFM | Unaltered paper geometry and 3D lift-contribution figures | arXiv:2603.13078, preprint |

The hero has four manually selected project tabs; MarsVATO has two animation modes.
Videos support play/pause, seeking and fullscreen. Only the selected video plays,
and playback pauses offscreen, in background tabs and while a project dialog is open.
The operating system's reduced-motion preference disables automatic playback.
Four compact project summaries lead to detail dialogs, research papers and repositories.
No publication acceptance or team membership is inferred from a repository.

The VATO clips show discrete direct-prediction sweeps. STCO frames represent independently
queried leads. Their captions and seek labels distinguish these from the Deforming VFM
swimming cycle. Original frame counts, presentation timings, color scales and panels
are retained. Four MP4 files total 2,957,847 bytes, compared with much larger source GIFs.

## Checks

```bash
node --check site/app.js
python3 tools/check_site.py
```

Optional Chromium QA, with the preview server running:

```bash
npm ci --prefix tools/browser
CHROMIUM_PATH=/absolute/path/to/chromium node tools/qa.cjs
```

`PREVIEW_URL` defaults to `http://127.0.0.1:8769/`. Screenshots and the browser report
go to ignored `qa/`. QA covers all media sources, playback/seek, tabs/keyboard, project
dialogs, image loading, fullscreen, 390px and 320px mobile layouts, reduced motion,
no-JavaScript fallback, script errors and failing resource requests.
Safari/iOS hardware and a live GitHub Pages deployment are not yet verified.

## GitHub Pages deployment

Intended repository: `KCLFlowlab/kclflowlab.github.io`  
Intended public URL: `https://kclflowlab.github.io/`

Create the dedicated website repository in the KCLFlowlab organization and push this
directory's source to `main`. Set Settings → Pages → Source to **GitHub Actions**.
The workflow checks JavaScript and local assets, then uploads only `site/`. Subsequent
pushes to `main` deploy automatically. Preserve existing website history when integrating
updates. The research repositories remain separate; their source commits are recorded
in `asset-manifest.json`.

## Editing and provenance

- Homepage sections: `site/index.html`.
- Media selection, captions and detail text: `site/app.js`.
- Design and responsive layout: `site/styles.css`.
- Source URLs, exact commits, transformations and file hashes: `asset-manifest.json`.
- Chinese design and content plan: `SITE_PLAN.md`.

RA-VFM Figure 1 and Figure 5 isosurface image are unmodified arXiv:2603.13078v1 assets
under CC BY-NC-ND 4.0, credited in the site. Other scientific media are author-supplied
materials from the explicitly requested repositories; the website does not relicense
them. Institutional/contact information follows Dr Juan Li's public KCL profile.
Research-repository links remain subject to their original access settings.
