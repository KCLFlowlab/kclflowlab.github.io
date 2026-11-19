# KCL FlowLab website: working conventions

Public lab website **https://kclflowlab.github.io/** (repo `KCLFlowlab/kclflowlab.github.io`). Static HTML/CSS/JS in `site/`; no framework, build step, CDN, analytics or backend. `README.md` (English) and `SITE_PLAN.md` (Chinese design rationale) describe the experience in detail; read them before changing content or interaction.

This is an independent Git repository. `FlowLens/` sits beside it in the workspace with its own history; it is not a submodule, and neither repository should reference the other's files.

## Publishing

- GitHub Actions (`.github/workflows/pages.yml`) checks the JavaScript and assets, then deploys `site/` on every push to `main`. **A push to `main` is a live release.** Pushing requires an explicit user instruction (workspace rule). Commit locally as normal when a task is finished and the checks pass.
- After a requested push, confirm the Actions run and the live HTTPS page. QA records go to the ignored `qa/` directory.

## Layout

| Path | Role |
|---|---|
| `site/index.html`, `site/app.js`, `site/styles.css` | Default **Swimmer** experience: page structure and templates, bibliography, fish/wake renderer, direction/topic data, hash routing, media |
| `site/sculpture.html`, `site/sculpture.js`, `site/sculpture.css` | Preserved **Flow form** experience, restored from commit `c05e741` |
| `site/experiences.css` | Shared Swimmer / Flow form version switch |
| `site/assets/` | Self-hosted fonts, portraits, logos, research figures, MP4s and `flow-field.json` |
| `asset-manifest.json` | Source, transformation, credit, byte size and SHA-256 for each asset |
| `tools/` | Local server, checks, packaging, Playwright QA, and `render_flow.py` (regenerates the archived CFD field) |

Generated and ignored files: `preview.html`, `preview-sculpture.html`, `kclflowlab-website.zip`, `qa/`, `tools/browser/node_modules/`.

## Commands

```bash
python3 tools/check_site.py          # links, anchors, duplicate IDs, asset hashes vs manifest (CI runs this)
node --check site/app.js && node --check site/sculpture.js
python3 tools/serve.py               # http://127.0.0.1:8769/ with MP4 byte ranges
python3 tools/package.py             # offline previews + source zip

# Browser QA, with the server running
npm ci --prefix tools/browser
CHROMIUM_PATH=/path/to/chromium node tools/qa.cjs          # main page, routing, studies, layouts
CHROMIUM_PATH=/path/to/chromium node tools/qa-swimmer.cjs  # fish hit-testing, drag, wake bounds, fps
CHROMIUM_PATH=/path/to/chromium node tools/qa-versions.cjs # version switch; sculpture files == c05e741
```

`PREVIEW_URL` overrides the local URL, for example to run the same QA against the live site.

## Invariants that are easy to break

- **Two experiences.** Apply research-content corrections to both HTML pages. `qa-versions.cjs` asserts that `sculpture.js`/`sculpture.css` match `c05e741:site/app.js`/`styles.css` byte for byte. Any intended change to the Flow form renderer or data must update that check and the README together.
- **Asset integrity.** `check_site.py` fails when an asset's size or hash differs from `asset-manifest.json`. When adding or replacing an asset, record its source, transformation, credit, bytes and SHA-256. Never crop, re-time or relabel scientific figures or videos. Keep RA-VFM figures unaltered (CC BY-NC-ND 4.0, contain sizing), the full 64-phase Deforming VFM cycle, and the original frame counts and labels in the MP4s.
- **Science versus illustration.** The swimmer and wake are a procedural illustration (softened point vortices, with no pressure solve), not CFD or a measured result. Do not add invented scientific readings or quantitative colour scales. The archived CFD snapshot (phase 0, `Afish_St0p40_Lam1p50_Re5000`, vorticity −30 to +30) stays in "About the visual" and the no-canvas fallback.
- **Performance bounds.** At most 30 vortices and 390 particles (240 on phones); target 30 fps. Pause, reduced motion, hidden tabs and open dialogs stop rendering. Pause must not be silently undone.
- **Research records.** Keep exact titles, authors, venues and status. Keep the AIAA Journal in-press record separate from the RA-VFM preprint. Featured studies follow first arXiv submission: RA-VFM, STCO, Deforming VFM, VATO. These are not project-start dates. Present research interests (for example collective motion) as interests, not completed work.
- **People.** Juan Li leads. Students appear in the user-specified order: Yichen Li, Matteo Liguori, Vedang Joshi, Xingxin Yang, Zhan Zhang. Use portraits only from official KCL profiles; other members keep initials. Do not infer years or biographies.
- **Self-hosted and accessible.** Fonts are Space Grotesk and Manrope, with their OFL files. Keep the canvas keyboard controls and ARIA labels, focus restoration, browser Back with hash routes, and the JavaScript-free fallback. Layouts are checked from 320 to 1440 px.
