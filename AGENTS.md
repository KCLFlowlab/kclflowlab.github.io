# KCL FlowLab website: working conventions

Public lab website **https://kclflowlab.github.io/** (repo `KCLFlowlab/kclflowlab.github.io`). Static HTML/CSS/JS in `site/`; no framework, build step, CDN, analytics or backend. `README.md` (English) and `SITE_PLAN.md` (Chinese design rationale) describe the experience in detail; read them before changing content or interaction.

This is an independent Git repository. `FlowLens/` sits beside it in the workspace with its own history; it is not a submodule, and neither repository should reference the other's files.

## Publishing

- GitHub Actions (`.github/workflows/pages.yml`) checks the JavaScript and assets, then deploys `site/` on every push to `main`. **A push to `main` is a live release.** Pushing requires an explicit user instruction (workspace rule). Commit locally as normal when a task is finished and the checks pass.
- After a requested push, confirm the Actions run and the live HTTPS page. QA records go to the ignored `qa/` directory.

## Layout

| Path | Role |
|---|---|
| `site/index.html`, `site/styles.css` | Default **Swimmer** page: all content in HTML (works without JS), light typographic layout below a dark hero |
| `site/swimmer.js` | Raw-WebGL fish, travelling-wave kinematics, point-vortex wake, pointer/keyboard input |
| `site/app.js` | Hero states, header/menu, research directions and topics, study workspace, hash routing, media controls |
| `site/sculpture.html`, `site/sculpture.js`, `site/sculpture.css`, `site/experiences.css` | Preserved **Flow form** page, restored from commit `c05e741` |
| `site/assets/` | Self-hosted fonts, portraits, logos, research figures, MP4s and `flow-field.json` |
| `asset-manifest.json` | Source, transformation, credit, byte size and SHA-256 for each asset |
| `tools/` | Local server, checks, packaging, Playwright QA, and `render_flow.py` (regenerates the archived CFD field) |

Generated and ignored files: `preview.html`, `preview-sculpture.html`, `kclflowlab-website.zip`, `qa/`, `tools/browser/node_modules/`.

## Commands

```bash
python3 tools/check_site.py          # links, anchors, duplicate IDs, asset hashes vs manifest (CI runs this)
node --check site/app.js && node --check site/swimmer.js && node --check site/sculpture.js
python3 tools/serve.py               # http://127.0.0.1:8769/ with MP4 byte ranges
python3 tools/package.py             # offline previews + source zip

# Browser QA, with the server running
npm ci --prefix tools/browser
CHROMIUM_PATH=/path/to/chromium node tools/qa.cjs          # page, directions, studies, media, layouts, no-JS
CHROMIUM_PATH=/path/to/chromium node tools/qa-swimmer.cjs  # opening, steering, wake bounds, pause, reduced motion
CHROMIUM_PATH=/path/to/chromium node tools/qa-versions.cjs # version switch; sculpture files == c05e741
```

`PREVIEW_URL` overrides the local URL, for example to run the same QA against the live site.

## Design principle: as little text as possible (user-confirmed 2026-11-19)

The owner dislikes on-screen text. Decide every word in this order:

1. **Say nothing** if the visitor understands without it (the fish follows the cursor; a section heading already names the section).
2. **Use a graphic** (icon, shape, position, colour, motion) if it can carry the meaning.
3. **Abbreviate** if a short form is well known (arXiv, KCL, CFD, PhD, `2026.03`, `01`).
4. **Be concise** otherwise: one word for labels, one sentence at most for an introduction.

How this applies in practice:

- **Show, don't tell.** Interaction should be discoverable by its response. Hints appear only when needed, stay quiet (low opacity), and leave once the visitor has used them.
- **Details on demand.** Put secondary information behind hover tips, topic chips or the study workspace, not on the page by default.
- **One icon family.** Thin line icons (1.3–1.5 px stroke, round caps, `currentColor`, 18–24 px). Low opacity at rest, full opacity on hover and focus. Universal icons (close, play/pause, arrows) get no visible label. Any other icon may get a hover tip of one or two words.
- **Headings carry sections.** No eyebrow + heading + lead stacks, no explanatory asides, no generic calls to action ("Read more", "Explore…", "Click here"). External links use a short noun plus ↗ (`arXiv ↗`, `Code ↗`, `KCL ↗`).
- **Hierarchy through space, scale and colour.** Use generous whitespace, large display type and one accent colour per research direction. Do not add labels, badges, counters or decorative text.
- **Restraint.** One primary focus per view; in the hero, nothing competes with the fish. Motion must mean something and respect reduced motion.
- **Never trimmed.** Scientific captions and their qualifiers (e.g. "not a continuous rollout"), paper titles, authors, venues and status, the "research interest" label, licences, provenance and the illustration disclaimer in About stay exact. Accessibility text (`aria-label`, `alt`, `sr-only`) is not on-screen text and stays complete.
- **Before adding any text, ask:** would a visitor miss it? Could an icon, position or colour say it? Is there a shorter form?

## Invariants that are easy to break

- **Team login is static and encrypted.** Never commit anything from `private/` or plaintext team data; only `site/members/vault.json` (ciphertext) is published. Regenerate it with `tools/team_admin.py`, not by hand. Do not add server calls, storage of credentials, or sensitive material to the team area. Never write team passwords into files or commit messages; pass them to `qa-team.cjs` through the environment.

- **Two experiences.** Apply research-content corrections to both HTML pages. `qa-versions.cjs` asserts that `sculpture.js`/`sculpture.css` match `c05e741:site/app.js`/`styles.css` byte for byte. Any intended change to the Flow form renderer or data must update that check and the README together.
- **Asset integrity.** `check_site.py` fails when an asset's size or hash differs from `asset-manifest.json`. When adding or replacing an asset, record its source, transformation, credit, bytes and SHA-256. Never crop, re-time or relabel scientific figures or videos. Keep RA-VFM figures unaltered (CC BY-NC-ND 4.0, contain sizing), the full 64-phase Deforming VFM cycle, and the original frame counts and labels in the MP4s.
- **Science versus illustration.** The swimmer and wake are a procedural illustration (prescribed body wave, softened point vortices, no pressure solve), not CFD or a measured result. Do not add invented scientific readings or quantitative colour scales. The archived CFD snapshot (phase 0, `Afish_St0p40_Lam1p50_Re5000`, vorticity −30 to +30) stays in "About the visual" and as the no-WebGL/no-JS fallback.
- **Performance bounds.** At most 40 vortices, 1,400 dye and 260 ambient particles (700/150 on phones); DPR capped at 2. Pause, reduced motion, hidden tabs, open dialogs and an off-screen hero stop autonomous rendering; direct input still animates briefly. The opening (no text for ~2.6 s) must not be ended by synthetic pointer moves.
- **Research records.** Keep exact titles, authors, venues and status. Keep the AIAA Journal in-press record separate from the RA-VFM preprint. Featured studies follow first arXiv submission: RA-VFM, STCO, Deforming VFM, VATO. These are not project-start dates. Present research interests (for example collective motion) as interests, not completed work.
- **People.** Juan Li leads. Students appear in the user-specified order: Yichen Li, Matteo Liguori, Vedang Joshi, Xingxin Yang, Zhan Zhang. Use portraits only from official KCL profiles; other members keep initials. Do not infer years or biographies.
- **Self-hosted and accessible.** Fonts are Space Grotesk and Manrope, with their OFL files; no external 3D or UI libraries. Arrow keys steer the fish only while the hero fills most of the view and nothing else is focused. Keep tab/arrow navigation for directions, focus return after closing a study, deep links (`#study-…`, `#domain-…`), the JavaScript-free reading of the whole page, and 320–1440 px layouts.
