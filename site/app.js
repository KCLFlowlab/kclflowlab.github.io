/* Buildless, self-contained research showcase. No tracking or remote scripts. */
'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.body.classList.add('js-ready');
const menu = $('.menu-toggle');
const nav = $('#navigation');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);
});
$$('a', nav).forEach(a => a.addEventListener('click', closeMenu));

const media = {
  deforming: {
    title: 'A swimming cycle, mapped.', video: 'assets/deforming-force-mapping.mp4', poster: 'assets/deforming-poster.png',
    alt: 'One swimming cycle: synchronized body motion, force histories, vorticity, and force-contribution maps',
    caption: 'Anguilliform swimming · St = 0.4 · λ* = 1.5 · Re = 5,000. Motion and force maps over one cycle.',
    kind: 'SWIMMING CYCLE', source: 'https://github.com/KCLFlowlab/deforming-vfm#readme'
  },
  vato: {
    title: 'Learning the physics of separated flow.', video: 'assets/vato-leadtime.mp4', poster: 'assets/vato-leadtime-poster.png',
    alt: 'MarsVATO: target and VATO-A predictions of pressure and vorticity at discrete lead times from 1 to 30 milliseconds',
    caption: 'Target ↔ VATO-A · 1–30 ms prediction leads. Each frame is a direct prediction; this is a discrete lead-time sweep.',
    kind: 'DIRECT PREDICTIONS', frames: 30, source: 'https://github.com/KCLFlowlab/MarsVATO#readme'
  },
  incidence: {
    title: 'One model. Six incidence conditions.', video: 'assets/vato-incidence.mp4', poster: 'assets/vato-incidence-poster.png',
    alt: 'MarsVATO: target and VATO-A predictions at six angles of attack, all at a fixed 20 millisecond prediction lead',
    caption: 'Target ↔ VATO-A · 3°, 5°, 6°, 9°, 11° and 12° incidence at a fixed 20 ms lead. Discrete condition sweep.',
    kind: 'INCIDENCE SWEEP', frames: 6, source: 'https://github.com/KCLFlowlab/MarsVATO#readme'
  },
  stco: {
    title: 'Prescribed conditions. Predicted responses.', video: 'assets/stco-response.mp4', poster: 'assets/stco-response-poster.png',
    alt: 'STCO: ground truth, GAOT Base and STCO responses for prescribed yaw, vortical encounter, transverse gust and convecting gust',
    caption: 'GAOT Base ↔ STCO · Yaw, vortical encounter, transverse gust and convecting gust. Each marker identifies an independently queried lead.',
    kind: 'INDEPENDENT QUERIES', frames: 40, source: 'https://github.com/YoungxxStar/FRO_Paper#readme'
  },
  ravfm: {
    title: 'Tracing the forces of flight.',
    caption: 'Gliding goshawk · Geometry and lift-contribution isosurfaces. Vortex-pressure and Reynolds-stress contributions, shown in the original paper figures.',
    source: 'https://arxiv.org/abs/2603.13078'
  }
};
const video = $('#research-video');
const screen = $('#research-screen');
const slider = $('#media-position');
const dialog = $('#project-dialog');
video.controls = false;
let activeProject = 'deforming';
let activeMedia = media.deforming;
let wantsPlayback = !reducedMotion.matches;
let inView = true;
let generation = 0;

function updatePlaybackButton() {
  $('.play-symbol').textContent = video.paused ? '▶' : 'Ⅱ';
  $('#play-text').textContent = video.paused ? 'Play' : 'Pause';
  $('#video-play').setAttribute('aria-label', video.paused ? 'Play animation' : 'Pause animation');
}
function syncPlayback() {
  const canPlay = activeMedia.video && wantsPlayback && inView && !document.hidden && !dialog.open;
  if (canPlay) {
    const requestGeneration = generation;
    video.play().catch(error => {
      // A source switch or viewport pause may cancel a pending play request.
      if (error.name === 'NotAllowedError' && requestGeneration === generation) wantsPlayback = false;
      updatePlaybackButton();
    });
  } else video.pause();
}
function updatePosition() {
  const ratio = Number.isFinite(video.duration) && video.duration > 0 ? video.currentTime / video.duration : 0;
  slider.value = String(Math.round(ratio * 1000));
  const frame = Math.min(activeMedia.frames || 1, Math.floor(ratio * (activeMedia.frames || 1)) + 1);
  let label = `${ratio.toFixed(2)} T`;
  if (activeMedia === media.vato) label = `${frame} / 30 ms`;
  if (activeMedia === media.incidence) label = `${[3, 5, 6, 9, 11, 12][frame - 1]}° / 20 ms`;
  if (activeMedia === media.stco) label = `${frame} / 40`;
  $('#position-label').value = label;
  slider.setAttribute('aria-valuetext', label);
}
function showMedia(project) {
  generation += 1;
  activeProject = project;
  activeMedia = project === 'vato' && $('#sweep-select').value === 'incidence' ? media.incidence : media[project];
  video.pause();
  $$('[data-showcase]').forEach(tab => {
    const selected = tab.dataset.showcase === project;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
  });
  screen.setAttribute('aria-labelledby', `tab-${project}`);
  $('#screen-title').textContent = activeMedia.title;
  $('#media-caption').textContent = activeMedia.caption;
  $('#media-source').href = activeMedia.source;
  $('#sweep-label').hidden = project !== 'vato';
  $('#flight-figures').hidden = project !== 'ravfm';
  video.hidden = project === 'ravfm';
  $('#playback').hidden = project === 'ravfm';
  if (activeMedia.video) {
    $('#media-kind').textContent = activeMedia.kind;
    video.poster = activeMedia.poster;
    video.setAttribute('aria-label', activeMedia.alt);
    video.src = activeMedia.video;
    video.load();
  }
  updatePosition(); updatePlaybackButton(); syncPlayback();
}
$$('[data-showcase]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => showMedia(tab.dataset.showcase));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); tabs[next].focus(); showMedia(tabs[next].dataset.showcase); }
  });
});
$('#sweep-select').addEventListener('change', () => showMedia('vato'));
$('#video-play').addEventListener('click', () => { wantsPlayback = video.paused; syncPlayback(); });
slider.addEventListener('input', () => {
  wantsPlayback = false; video.pause();
  if (Number.isFinite(video.duration)) video.currentTime = Number(slider.value) / 1000 * Math.max(0, video.duration - .001);
  updatePosition();
});
['play', 'pause', 'ended'].forEach(name => video.addEventListener(name, updatePlaybackButton));
['timeupdate', 'loadedmetadata', 'seeked'].forEach(name => video.addEventListener(name, updatePosition));
video.addEventListener('error', () => {
  $('#play-text').textContent = 'Retry';
  $('#video-play').setAttribute('aria-label', 'Retry animation playback');
});
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncPlayback(); }, { threshold: .1 }).observe(screen);
}
document.addEventListener('visibilitychange', syncPlayback);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { wantsPlayback = false; syncPlayback(); } });
$$('[data-watch]').forEach(button => button.addEventListener('click', () => {
  wantsPlayback = true;
  showMedia(button.dataset.watch);
  $('#showcase').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  $(`#tab-${button.dataset.watch}`).focus({ preventScroll: true });
}));

function expandedState() {
  const expanded = !!document.fullscreenElement || screen.classList.contains('expanded');
  $('#media-expand').innerHTML = expanded ? 'Close <span aria-hidden="true">×</span>' : 'Expand <span aria-hidden="true">⤢</span>';
  $('#media-expand').setAttribute('aria-label', expanded ? 'Close enlarged visualization' : 'Enlarge research visualization');
  document.body.classList.toggle('dialog-open', expanded || dialog.open);
}
$('#media-expand').addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (screen.classList.contains('expanded')) screen.classList.remove('expanded');
  else {
    try { if (!screen.requestFullscreen) throw new Error('Fullscreen API unavailable'); await screen.requestFullscreen(); }
    catch { screen.classList.add('expanded'); }
  }
  expandedState();
});
document.addEventListener('fullscreenchange', expandedState);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeMenu(); screen.classList.remove('expanded'); expandedState(); }
});

const external = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
const figure = (src, alt, caption) => `<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
const projects = {
  deforming: {
    label: 'DEFORMING VFM / PREPRINT · 2026', title: 'Deforming Vortex Force Mapping for Undulating Swimmers',
    authors: 'Xingxin Yang · Matteo Liguori · Vedang Joshi · Juan Li',
    text: 'A deforming swimmer produces force through both body motion and the surrounding flow. Deforming VFM separates reactive added-mass loading from signed vortex-pressure contributions and maps them onto a reference configuration. Eighty prescribed two-dimensional swimming cases compare anguilliform and carangiform kinematics at Re = 5,000.',
    links: external('https://arxiv.org/abs/2609.00461', 'Read preprint') + external('https://github.com/KCLFlowlab/deforming-vfm', 'Code & animations'),
    figures: figure('assets/force-map.png', 'Reference-configuration force maps for two swimming modes', 'Paper Figure 11 · Original color scales and annotations retained.') + '<details><summary>View phase-resolved fields</summary>' + figure('assets/flow-regimes.png', 'Phase-resolved vorticity and force-contribution fields', 'Paper Figure 5 · Four phase snapshots.') + '</details>'
  },
  vato: {
    label: 'MARSVATO / MANUSCRIPT', title: 'VATO: A Vortex-Force-Aware Transformer Operator for Unsteady Separated Aerofoil Flows',
    authors: 'Xingxin Yang · Zhan Zhang · Yichen Li · Juan Li',
    text: 'VATO links flow prediction to the local structures that generate aerodynamic forces. VATO-S adds training-time supervision of the VFM force-contribution field. VATO-A also uses force contribution and sensitivity to guide residual cross-attention. The benchmark spans 54 trajectories across nine double-edged plate aerofoil geometries.',
    links: external('https://github.com/KCLFlowlab/MarsVATO/blob/main/paper/main.pdf', 'Read manuscript') + external('https://github.com/KCLFlowlab/MarsVATO', 'Code & animations'),
    figures: figure('assets/vato-model.png', 'VATO architecture, training and vortex-aware residual cross-attention', 'Repository README cover · VATO model architecture. The homepage animations show discrete prediction-lead and incidence sweeps.')
  },
  stco: {
    label: 'STCO / MANUSCRIPT', title: 'STCO: Conditional Neural Operators for Time-Dependent PDEs',
    authors: '',
    text: 'A future flow depends on what is prescribed as well as what has been observed. The Spatiotemporal Conditional Operator supplies target-time motion, inflow and forcing fields to different neural-operator backbones. Flow-Aware Graph Leaf sampling and Dual-Site Feature-wise Linear Modulation form a common condition interface, evaluated across twelve matched backbones.',
    links: external('https://github.com/YoungxxStar/FRO_Paper/blob/main/STCO_Paper/AAAI2027/STCO_AAAI2027_submission_7p/main.pdf', 'Read manuscript') + external('https://github.com/YoungxxStar/FRO_Paper', 'Project & animations'),
    figures: figure('assets/stco-conditions.png', 'Prescribed-condition operator learning: observations, conditions and future responses', 'Repository README cover · Observed history and prescribed physical conditions define the future response.') + '<details><summary>View prediction comparisons and performance</summary>' + figure('assets/stco-spatial.png', 'STCO resolved velocity and pressure comparisons under prescribed physical conditions', 'Spatial comparisons from the current manuscript.') + figure('assets/stco-performance.png', 'STCO cross-backbone accuracy, condition dependence and inference cost', 'Accuracy, lead-time dependence, condition sensitivity and inference cost.') + '</details>'
  },
  ravfm: {
    label: 'RA-VFM / PREPRINT · 2026', title: 'The Reynolds-Averaged Vortex Force Map Method',
    authors: 'Matteo Liguori · Zhan Zhang · Francesco Ciriello · Juan Li',
    text: 'RA-VFM extends vortex-force mapping to Reynolds-averaged flows. Its decomposition distinguishes vortex-pressure and Reynolds-stress contributions to mean aerodynamic forces. A gliding goshawk and a matched aerofoil show where lift and drag originate in turbulent flow.',
    links: external('https://arxiv.org/abs/2603.13078', 'Read preprint') + external('https://github.com/KCLFlowlab/RAVFM', 'Code'),
    figures: figure('assets/ravfm-geometry.png', 'Gliding goshawk geometry and force definitions', 'Paper Figure 1 · Liguori, Zhang, Ciriello & Li · CC BY-NC-ND 4.0; unaltered image.') + figure('assets/ravfm-bird.png', 'Vortex-pressure and Reynolds-stress lift-contribution isosurfaces', 'Paper Figure 5 isosurface image · CC BY-NC-ND 4.0; unaltered image.')
  }
};
let dialogTrigger;
function openDialog(html) {
  dialogTrigger = document.activeElement;
  $('#dialog-content').innerHTML = html;
  dialog.showModal(); dialog.scrollTop = 0;
  document.body.classList.add('dialog-open'); syncPlayback();
}
$$('[data-project]').forEach(button => button.addEventListener('click', () => {
  const p = projects[button.dataset.project];
  openDialog(`<p class="eyebrow">${p.label}</p><h2 id="dialog-title">${p.title}</h2>${p.authors ? `<p class="authors">${p.authors}</p>` : ''}<p>${p.text}</p><div class="detail-links">${p.links}</div>${p.figures}`);
}));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { expandedState(); dialogTrigger?.focus({ preventScroll: true }); syncPlayback(); });
$('#credits-open').addEventListener('click', () => openDialog(`<p class="eyebrow">RESEARCH MEDIA</p><h2 id="dialog-title">Sources & credits</h2><p>Images and animations come from the authors’ research materials. Scientific color scales, labels and full panel layouts are preserved. GIF animations are transcoded to MP4 for smaller downloads and playback controls.</p><ul><li><strong>Deforming VFM.</strong> Yang, Liguori, Joshi & Li. README force-mapping animation and paper Figures 5 and 11. ${external('https://github.com/KCLFlowlab/deforming-vfm', 'Source')}</li><li><strong>MarsVATO.</strong> Yang, Zhang, Li & Li. README architecture figure and two discrete condition-sweep animations. ${external('https://github.com/KCLFlowlab/MarsVATO', 'Source')}</li><li><strong>STCO.</strong> Current manuscript and README materials in FRO_Paper: prescribed-condition overview, prediction comparisons, performance figure and four-condition GAOT response animation. Frames show independently queried leads. ${external('https://github.com/YoungxxStar/FRO_Paper', 'Source')}</li><li><strong>RA-VFM.</strong> Liguori, Zhang, Ciriello & Li. Unaltered Figure 1 and Figure 5 isosurface image from arXiv:2603.13078v1. ${external('https://creativecommons.org/licenses/by-nc-nd/4.0/', 'CC BY-NC-ND 4.0')} · ${external('https://arxiv.org/abs/2603.13078', 'Paper')}</li></ul><p>Institutional affiliation and contact: ${external('https://www.kcl.ac.uk/people/juan-li', 'KCL profile')}. Access to linked repository materials follows each repository’s visibility settings.</p>`));
syncPlayback();
