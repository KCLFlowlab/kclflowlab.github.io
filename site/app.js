/* KCL FlowLab: an interactive swimmer, then the research. Real research media, locally hosted, no tracking. */
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = $('#project-dialog');
document.body.classList.add('js-ready');
const external = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
const figure = (src, alt, caption) => `<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

const projects = {
  deforming: {
    label: 'DEFORMING VFM / PREPRINT · 2026', title: 'Deforming Vortex Force Mapping for Undulating Swimmers',
    authors: 'Xingxin Yang · Matteo Liguori · Vedang Joshi · Juan Li',
    text: 'Swimming links changing body shape, surrounding flow and propulsion. We study this interaction to understand the physics behind bio-inspired motion. Deforming VFM separates reactive added-mass loading from signed vortex-pressure contributions and maps them onto a reference configuration. Eighty prescribed two-dimensional swimming cases compare anguilliform and carangiform kinematics at Re = 5,000.',
    links: external('https://arxiv.org/abs/2609.00461', 'Read preprint') + external('https://github.com/KCLFlowlab/deforming-vfm', 'Code & animations'),
    figures: figure('assets/force-map.png', 'Reference-configuration force maps for two swimming modes', 'Paper Figure 11 · Original color scales and annotations retained.') + '<details><summary>View phase-resolved fields</summary>' + figure('assets/flow-regimes.png', 'Phase-resolved vorticity and force-contribution fields', 'Paper Figure 5 · Four phase snapshots.') + '</details>'
  },
  vato: {
    label: 'MARSVATO / PREPRINT · 2026', title: 'VATO: A Vortex-Force-Aware Transformer Operator for Unsteady Separated Aerofoil Flows',
    authors: 'Xingxin Yang · Zhan Zhang · Yichen Li · Juan Li',
    text: 'Scientific AI can connect data-driven prediction with physical understanding. VATO makes this connection through the flow structures that generate aerodynamic forces. VATO-S adds training-time supervision of the VFM force-contribution field. VATO-A also uses force contribution and sensitivity to guide residual cross-attention. The benchmark spans 54 trajectories across nine double-edged plate aerofoil geometries.',
    links: external('https://arxiv.org/abs/2609.00507', 'Read preprint') + external('https://github.com/KCLFlowlab/MarsVATO', 'Code & animations'),
    figures: figure('assets/vato-model.png', 'VATO architecture, training and vortex-aware residual cross-attention', 'Repository README cover · VATO model architecture. The homepage animations show discrete prediction-lead and incidence sweeps.')
  },
  stco: {
    label: 'STCO / PREPRINT · 2026', title: 'STCO: Conditional Neural Operators for Time-Dependent PDEs',
    authors: 'Xingxin Yang · Zhan Zhang · Juan Li',
    text: 'Predicting a changing physical system requires knowing how it is driven, as well as what has been observed. The Spatiotemporal Conditional Operator supplies target-time motion, inflow and forcing fields to different neural-operator backbones. Flow-Aware Graph Leaf sampling and Dual-Site Feature-wise Linear Modulation form a common condition interface, evaluated across twelve matched backbones.',
    links: external('https://arxiv.org/abs/2608.20477', 'Read preprint') + external('https://github.com/YoungxxStar/FRO_Paper', 'Project & animations'),
    figures: figure('assets/stco-conditions.png', 'Prescribed-condition operator learning: observations, conditions and future responses', 'Repository README cover · Observed history and prescribed physical conditions define the future response.') + '<details><summary>View prediction comparisons and performance</summary>' + figure('assets/stco-spatial.png', 'STCO resolved velocity and pressure comparisons under prescribed physical conditions', 'Spatial comparisons from the current manuscript.') + figure('assets/stco-performance.png', 'STCO cross-backbone accuracy, condition dependence and inference cost', 'Accuracy, lead-time dependence, condition sensitivity and inference cost.') + '</details>'
  },
  ravfm: {
    label: 'RA-VFM / PREPRINT · 2026', title: 'The Reynolds-Averaged Vortex Force Map Method',
    authors: 'Matteo Liguori · Zhan Zhang · Francesco Ciriello · Juan Li',
    text: 'Bird flight offers a natural setting for studying how shape and flow interact. RA-VFM extends vortex-force mapping to Reynolds-averaged flows. Its decomposition distinguishes vortex-pressure and Reynolds-stress contributions to mean aerodynamic forces. A gliding goshawk and a matched aerofoil show where lift and drag originate in turbulent flow.',
    links: external('https://arxiv.org/abs/2603.13078', 'Read preprint') + external('https://github.com/KCLFlowlab/RAVFM', 'Code'),
    figures: figure('assets/ravfm-geometry.png', 'Gliding goshawk geometry and force definitions', 'Paper Figure 1 · Liguori, Zhang, Ciriello & Li · CC BY-NC-ND 4.0; unaltered image.') + '<details><summary>View lift-contribution map</summary>' + figure('assets/ravfm-bird.png', 'Vortex-pressure and Reynolds-stress lift-contribution isosurfaces', 'Paper Figure 5 isosurface image · CC BY-NC-ND 4.0; unaltered image.') + '</details>'
  }
};


const studyOrder = ['ravfm','stco','deforming','vato'];
const studyMeta = {
  ravfm: {name:'RA-VFM',date:'13 MAR 2026',category:'BIO-INSPIRED FLIGHT / FLOW PHYSICS',question:'What can we learn from bird flight?'},
  stco: {name:'STCO',date:'20 AUG 2026',category:'SCIENTIFIC AI / CHANGING SYSTEMS',question:'How do conditions shape a flow?'},
  deforming: {name:'Deforming VFM',date:'31 AUG 2026',category:'BIO-INSPIRED MOTION / FLOW PHYSICS',question:'How does a swimmer move?'},
  vato: {name:'MarsVATO',date:'01 SEP 2026',category:'SCIENTIFIC AI / PHYSICAL KNOWLEDGE',question:'Can AI learn the physics?'}
};
const movies = {
  deforming:{src:'assets/deforming-force-mapping.mp4',poster:'assets/deforming-poster.png',frames:64,caption:'64 original phases of a swimming cycle. Body motion, forces and flow fields are synchronized.'},
  stco:{src:'assets/stco-response.mp4',poster:'assets/stco-response-poster.png',frames:40,caption:'Four prescribed conditions. Each frame is an independently queried prediction lead, not an autoregressive rollout.'},
  vato:{src:'assets/vato-leadtime.mp4',poster:'assets/vato-leadtime-poster.png',frames:30,caption:'Target and VATO-A at 1–30 ms direct prediction leads. A discrete lead-time sweep, not a continuous rollout.'},
  incidence:{src:'assets/vato-incidence.mp4',poster:'assets/vato-incidence-poster.png',frames:6,caption:'Six incidence conditions: 3°, 5°, 6°, 9°, 11° and 12°, each at a fixed 20 ms prediction lead.'}
};

const directions={
 bio:{index:'01 / NATURE',title:'Bio-inspired motion & design',intro:'How do living systems move through fluids? We connect form, motion and flow to find new ways of thinking about engineering.',studies:['ravfm','deforming'],records:[4],topics:[
  {id:'flight',name:'Flight',text:'Bird flight connects biological form with the physics of turbulent flow. Explore the aerodynamic forces acting on a gliding goshawk.',studies:['ravfm'],records:[4]},
  {id:'swimming',name:'Swimming',text:'A swimmer changes both its shape and the surrounding flow. We investigate how these interactions produce propulsion.',studies:['deforming'],records:[]},
  {id:'collective',name:'Collective motion',text:'How does motion change when many individuals interact? Swarming behaviour is a research interest in the group, alongside unsteady flow and vortex shedding.',studies:[],records:[],interest:true,link:'https://www.kcl.ac.uk/people/vedang-joshi',linkText:'Vedang Joshi / research profile'}]},
 physics:{index:'02 / PHYSICS',title:'Complex flows & interactions',intro:'From vortices and turbulence to flexible wings: understanding how flow structures, moving bodies and forces interact.',studies:['ravfm','deforming','vato'],records:[1,2,4],topics:[
  {id:'vortices',name:'Vortices & forces',text:'Linking the structure of a flow to the loads it generates, through vortex dynamics, force mapping and unsteady-flow analysis.',studies:['ravfm','deforming'],records:[2]},
  {id:'turbulence',name:'Turbulence',text:'Reynolds-averaged descriptions connect turbulent flow, vortex-pressure contributions and Reynolds stresses to mean aerodynamic forces.',studies:['ravfm'],records:[4]},
  {id:'aeroelasticity',name:'Aeroelasticity',text:'When wings respond to the surrounding flow, aerodynamic modelling becomes part of a coupled problem. This work compares separated-flow models for slender-wing aeroelasticity.',studies:[],records:[1]}]},
 ai:{index:'03 / INTELLIGENCE',title:'Scientific AI & computation',intro:'Learning from physical systems, using physical knowledge, and building computational approaches to prediction and design.',studies:['stco','vato'],records:[0,3],topics:[
  {id:'operators',name:'Neural operators',text:'Predicting changing physical systems with prescribed conditions and physical knowledge: conditional operators and force-aware transformer models.',studies:['stco','vato'],records:[]},
  {id:'observations',name:'Incomplete data',text:'What can we infer when we can only observe part of a flow? Graph neural networks provide a way to reconstruct fluid dynamics from incomplete information.',studies:[],records:[0]},
  {id:'design',name:'Engineering design',text:'Connecting computational modelling with engineering choices, from CFD channel optimisation to machine-learning-assisted meta-wing design.',studies:[],records:[3],link:'https://www.kcl.ac.uk/people/xingxin-yang',linkText:'Xingxin Yang / design research'}]}
};


// ---------- Hero: only the swimmer at first; the interface appears once it has entered ----------
const hero = $('.hero'), canvas = $('#flow-canvas');
let heroShown = false;
function heroReady() { if (heroShown) return; heroShown = true; document.body.classList.add('hero-ready'); }
function heroRatio() { const r = hero.getBoundingClientRect(); return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight; }
let swimmer = null;
try {
  swimmer = window.createSwimmer ? window.createSwimmer(canvas, {
    onReady: heroReady,
    onLost: () => document.body.classList.add('no-webgl'),
    isBlocked: () => dialog.open,
    // Arrow keys steer the fish only while the water fills most of the view and nothing else has focus.
    canSteer: () => !dialog.open && heroRatio() > 0.6 && (document.activeElement === canvas || document.activeElement === document.body || document.activeElement === null)
  }) : null;
} catch (error) { console.warn(error); swimmer = null; }
if (!swimmer) { document.body.classList.add('no-webgl'); heroReady(); }
setTimeout(heroReady, 4500);
addEventListener('scroll', heroReady, {once: true, passive: true});
new IntersectionObserver(([entry]) => swimmer?.setVisible(entry.isIntersecting)).observe(hero);
const motionToggle = $('#motion-toggle');
function syncMotion() {
  const paused = !swimmer || swimmer.paused || reducedMotion.matches;
  motionToggle.textContent = paused ? 'Play' : 'Pause';
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.setAttribute('aria-label', paused ? 'Play the swimmer' : 'Pause the swimmer');
}
motionToggle.addEventListener('click', () => {
  if (!swimmer) return;
  if (reducedMotion.matches && swimmer.paused === false) { swimmer.kick(); return; }
  swimmer.setPaused(!swimmer.paused); syncMotion();
});
if (!swimmer) motionToggle.hidden = true;
if (reducedMotion.matches && swimmer) swimmer.setPaused(true);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) swimmer?.setPaused(true); syncMotion(); });
syncMotion();

// ---------- Header: transparent over the water, solid over the page; mobile menu; current section ----------
const header = $('.site-header'), menu = $('.menu-toggle');
function headerState() { header.classList.toggle('on-page', hero.getBoundingClientRect().bottom < 72); }
addEventListener('scroll', headerState, {passive: true}); headerState();
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); header.classList.toggle('menu-open', open); });
$$('.site-nav a').forEach(a => a.addEventListener('click', () => { menu.setAttribute('aria-expanded', 'false'); header.classList.remove('menu-open'); }));
const navLinks = new Map($$('.site-nav a').map(a => [a.hash.slice(1), a]));
const spy = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  navLinks.forEach((a, id) => { if (id === entry.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
}), {rootMargin: '-45% 0px -50% 0px'});
$$('main > section').forEach(section => spy.observe(section));
const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); reveal.unobserve(entry.target); } }), {rootMargin: '0px 0px -8% 0px'});
$$('.reveal').forEach(el => reveal.observe(el));


// ---------- Research directions: three tabs, nine questions, studies and records ----------
const records = $$('#kcl-outputs > a').map(a => ({url: a.href, title: $('.pub-title', a).textContent, year: $('.pub-type', a).firstChild.textContent.trim(), venue: $('.pub-venue', a).textContent}));
const studyImages = {ravfm: 'assets/ravfm-geometry.png', stco: 'assets/stco-conditions.png', deforming: 'assets/deforming-poster.png', vato: 'assets/vato-model.png'};
const directionText = {
  bio: 'Flight, swimming and collective motion raise a common question: how do form, movement and the surrounding fluid work together? We study these interactions as a foundation for bio-inspired engineering.',
  physics: 'Unsteady aerodynamics, vortex dynamics and turbulence connect motion with the loads and flow structures it creates. We develop methods to understand those connections in biological and engineered configurations.',
  ai: 'How can learning methods use physical knowledge as well as data? We develop neural operators for changing physical systems and investigate how machine learning can support aerodynamic modelling and design.'
};
let activeDomain = 'bio', activeTopic = null;
// The address reflects the open direction, and closing a study returns to it.
function rememberDirection(key) { history.replaceState(null, '', '#domain-' + key); lastPageHash = 'domain-' + key; }
const recordLink = r => '<a class="direction-record" href="' + r.url + '" target="_blank" rel="noopener noreferrer"><span>' + r.year + '</span><span>' + r.title + '</span><span aria-hidden="true">↗</span></a>';
function renderResults(topic) {
  const d = directions[activeDomain], item = topic ? d.topics.find(t => t.id === topic) : d;
  if (!item) return; activeTopic = topic;
  $$('.direction-topics button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.topic || null) === topic)));
  $('#direction-results').innerHTML = (topic ? '<h4>' + item.name + '</h4><p class="topic-description">' + item.text + '</p>' : '') +
    (item.interest ? '<p class="interest-note">Research interest</p>' : '') +
    (item.studies.length ? '<p class="results-label">Selected studies</p>' + item.studies.map(key => '<a class="direction-study" href="#study-' + key + '"><img src="' + studyImages[key] + '" alt="' + studyMeta[key].name + ' original research figure"><span><strong>' + studyMeta[key].name + '</strong><small>' + studyMeta[key].question + '</small></span><span aria-hidden="true">↗</span></a>').join('') : '') +
    (item.records.length ? '<p class="results-label">From the publication record</p>' + item.records.map(i => recordLink(records[i])).join('') : '') +
    (item.link ? '<div class="detail-links">' + external(item.link, item.linkText) + '</div>' : '');
}
function selectDirection(key, focusTab = false) {
  if (!directions[key]) return;
  activeDomain = key; activeTopic = null;
  $$('.direction-tabs [role=tab]').forEach(tab => { const on = tab.dataset.domain === key; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; if (on && focusTab) tab.focus(); });
  const d = directions[key], panel = $('#direction-panel');
  panel.dataset.direction = key; panel.setAttribute('aria-labelledby', 'domain-' + key);
  panel.innerHTML = '<div class="direction-copy"><p class="eyebrow">' + d.index + '</p><h3 id="direction-title">' + d.title + '</h3><p class="direction-intro">' + d.intro + '</p><p>' + directionText[key] + '</p></div>' +
    '<div class="direction-explore"><div class="direction-topics" role="group" aria-label="Explore questions"><button data-topic="" aria-pressed="true">Overview</button>' + d.topics.map(t => '<button data-topic="' + t.id + '" aria-pressed="false">' + t.name + '</button>').join('') + '</div><div id="direction-results" class="direction-results" aria-live="polite"></div></div>';
  $$('.direction-topics button').forEach(b => b.addEventListener('click', () => renderResults(b.dataset.topic || null)));
  renderResults(null);
}
$$('.direction-tabs [role=tab]').forEach((tab, i, tabs) => {
  tab.addEventListener('click', () => { selectDirection(tab.dataset.domain); rememberDirection(tab.dataset.domain); });
  tab.addEventListener('keydown', e => {
    const step = {ArrowRight: 1, ArrowLeft: -1}[e.key]; if (!step) return;
    e.preventDefault(); const next = tabs[(i + step + tabs.length) % tabs.length];
    selectDirection(next.dataset.domain, true); rememberDirection(next.dataset.domain);
  });
});
selectDirection('bio');


// ---------- Study workspace and information windows ----------
let pendingTrigger = null, currentStudy = null, dialogTrigger = null, mediaCleanup = () => {}, lastPageHash = '';
function stopMedia() {
  $$('video', dialog).forEach(video => video.pause());
  mediaCleanup(); mediaCleanup = () => {};
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function openDialog(html, kind = 'info', label = 'About') {
  stopMedia();
  if (!dialog.open) dialogTrigger = pendingTrigger || document.activeElement;
  pendingTrigger = null;
  dialog.dataset.kind = kind; $('#workspace-label').textContent = label;
  $('#dialog-content').innerHTML = html;
  if (!dialog.open) dialog.showModal();
  $('#dialog-content').scrollTop = 0;
  $('#dialog-title')?.setAttribute('tabindex', '-1');
  $('#dialog-title')?.focus({preventScroll: true});
}
function projectTabs(active) {
  return '<nav class="study-switcher" aria-label="Switch research study">' + studyOrder.map((key, i) => '<a href="#study-' + key + '" ' + (key === active ? 'aria-current="page"' : '') + '><span>0' + (i + 1) + '</span>' + studyMeta[key].name + '</a>').join('') + '</nav>';
}
function renderStudy(key) {
  currentStudy = key;
  const p = projects[key], meta = studyMeta[key], animated = !!movies[key];
  openDialog(projectTabs(key) + '<div class="study-layout"><section class="study-copy"><p class="eyebrow">' + meta.category + '</p><h2 id="dialog-title">' + meta.question + '</h2><p class="study-description">' + p.text + '</p><p class="study-authors">' + p.authors + '</p><div class="detail-links">' + p.links + '</div><div class="paper-record"><p class="paper-meta">Paper · first preprint ' + meta.date + '</p><p class="paper-title">' + p.title + '</p></div></section><section class="study-visual" aria-label="Research media"><div class="gallery-tabs" role="group" aria-label="Research media view">' + (animated ? '<button data-view="animation" aria-pressed="true">Animation</button>' : '') + '<button data-view="figures" aria-pressed="' + (!animated) + '">Paper figures</button><span class="gallery-kind">' + meta.name + ' / 2026</span></div><div id="study-gallery"></div></section></div>', 'study', 'Research');
  $$('.gallery-tabs button').forEach(button => button.addEventListener('click', () => renderGallery(button.dataset.view)));
  renderGallery(animated ? 'animation' : 'figures');
}

function renderGallery(view) {
  stopMedia();
  $$('.gallery-tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  const gallery=$('#study-gallery'), key=currentStudy;
  if (view==='figures') {
    gallery.innerHTML='<div class="figure-gallery">'+projects[key].figures+'</div>';
    return;
  }
  gallery.innerHTML='<div class="research-screen" id="research-screen"><div class="screen-bar"><span>'+studyMeta[key].name+' / RESEARCH MEDIA</span><div>'+(key==='vato'?'<label><span class="sr-only">Choose VATO sweep</span><select id="sweep-select"><option value="vato">Lead-time sweep</option><option value="incidence">Incidence sweep</option></select></label>':'')+'<button id="media-expand" aria-label="Enlarge research visualization">⤢</button></div></div><video id="research-video" muted loop playsinline preload="metadata"></video><div class="playback"><button id="video-play" aria-label="Play research animation">Play</button><label class="sr-only" for="media-position">Animation position</label><input id="media-position" type="range" min="0" max="1000" value="0"><output id="position-label" for="media-position"></output></div></div><p class="media-caption" id="media-caption"></p><p class="media-hint">Original research media · Full scientific panels retained</p>';
  const video=$('#research-video'), slider=$('#media-position'), output=$('#position-label'), play=$('#video-play'), screen=$('#research-screen');
  let selected=key, desired=!reducedMotion.matches, generation=0;
  const updatePlay=()=>{play.textContent=video.paused?'▶ Play':'Ⅱ Pause';play.setAttribute('aria-label',video.paused?'Play research animation':'Pause research animation');};
  const updatePosition=()=>{
    const m=movies[selected], ratio=Number.isFinite(video.duration)&&video.duration>0?video.currentTime/video.duration:0;
    const frame=Math.min(m.frames-1,Math.floor(ratio*m.frames));slider.value=Math.round(ratio*1000);
    output.value=selected==='incidence'?[3,5,6,9,11,12][frame]+'° / 20 ms':selected==='vato'?(frame+1)+' / 30 ms':(frame+1)+' / '+m.frames;
    slider.setAttribute('aria-valuetext',output.value);
  };
  const start=()=>{if(desired&&!document.hidden){const version=generation;video.play().catch(()=>{if(version===generation){desired=false;updatePlay();}});}};
  const setMedia=()=>{generation++;video.pause();const m=movies[selected];video.poster=m.poster;video.src=m.src;video.setAttribute('aria-label',m.caption);$('#media-caption').textContent=m.caption;video.load();updatePosition();start();};
  play.addEventListener('click',()=>{desired=video.paused;if(desired)start();else video.pause();});
  slider.addEventListener('input',()=>{desired=false;video.pause();if(Number.isFinite(video.duration))video.currentTime=Number(slider.value)/1000*Math.max(0,video.duration-.001);updatePosition();});
  ['play','pause','ended'].forEach(event=>video.addEventListener(event,updatePlay));
  ['loadedmetadata','timeupdate','seeked'].forEach(event=>video.addEventListener(event,updatePosition));
  $('#sweep-select')?.addEventListener('change',event=>{selected=event.target.value;setMedia();});
  $('#media-expand').addEventListener('click',async()=>{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(screen.classList.contains('expanded'))screen.classList.remove('expanded');
    else {try{await screen.requestFullscreen();}catch{screen.classList.add('expanded');}}
    $('#media-expand').setAttribute('aria-label',document.fullscreenElement||screen.classList.contains('expanded')?'Close enlarged visualization':'Enlarge research visualization');
  });
  const visibility=()=>{if(document.hidden)video.pause();else start();};
  const motionPreference=()=>{if(reducedMotion.matches){desired=false;video.pause();}};
  document.addEventListener('visibilitychange',visibility);reducedMotion.addEventListener('change',motionPreference);
  mediaCleanup=()=>{generation++;document.removeEventListener('visibilitychange',visibility);reducedMotion.removeEventListener('change',motionPreference);};
  setMedia();updatePlay();
}

function openAbout(){openDialog(
  '<p class="eyebrow">INSIDE THE VISUALIZATION</p><h2 id="dialog-title">Flow as a way<br>to explore.</h2><p>The opening scene is an interactive, three-dimensional swimming illustration rendered in the browser. A procedural fish follows its own path and swims with a prescribed travelling body wave whose amplitude grows towards the tail. At each reversal of the tail beat it sheds a vortex; these softened point vortices move one another, spread and fade, stirring the dye released from the tail and the particles drifting in the water. Move the pointer or touch to guide the fish, click or tap to make it dart, and use the arrow keys or W, A, S and D to steer it. The model conveys motion and flow intuitively; it is not a CFD simulation or measured research data, and its colours carry no quantitative meaning.</p><p>Inside the studies, visualisations come from the original research. This archived image uses a calculated-cell CFD snapshot from the Deforming VFM study: anguilliform swimming, St = 0.4, λ* = 1.5, Re = 5,000, at phase 0.00 T. The field is rendered with a dark diverging palette; cyan and copper distinguish opposite signs of vorticity.</p>'+figure('assets/wake-field.png','Archived CFD vorticity, body boundary and velocity streamlines at phase zero','Qualitative field view. Fixed displayed vorticity range: −30 to +30; values outside that range saturate.')+
  '<div class="flow-note"><p>The archived image is a single phase-0 snapshot, not a time-resolved simulation. The complete 64-phase research animation is available in the Deforming VFM study. The interactive fish and wake are a separate illustrative model.</p></div><div class="detail-links">'+external('https://github.com/KCLFlowlab/deforming-vfm','Source data & method')+'<button type="button" data-open-credits>Sources &amp; credits</button></div>'
,'info','About');}

function openCredits(){openDialog(
  '<p class="eyebrow">SOURCES & CREDITS</p><h2 id="dialog-title">Built around real research.</h2><p>Research media are attributed to their authors. Full scientific figures retain their original layouts and color scales; GIFs are transcoded to MP4. The homepage fish and wake are an interactive illustration using prescribed body motion and a simplified vortex-particle model, not a scientific simulation. The archived CFD snapshot is available in About the visual; original scientific animations remain in each study.</p><ul>'+
  '<li><strong>Deforming VFM.</strong> Yang, Liguori, Joshi & Li. README animation, Figures 5 and 11, and the calculated-cell phase-0 snapshot. '+external('https://github.com/KCLFlowlab/deforming-vfm','Research source')+'</li>'+
  '<li><strong>MarsVATO.</strong> Yang, Zhang, Li & Li. README architecture and discrete lead-time/incidence sweeps. '+external('https://github.com/KCLFlowlab/MarsVATO','Research source')+'</li>'+
  '<li><strong>STCO.</strong> Current manuscript and README in FRO_Paper. The response animation uses independently queried leads. '+external('https://github.com/YoungxxStar/FRO_Paper','Research source')+'</li>'+
  '<li><strong>RA-VFM.</strong> Liguori, Zhang, Ciriello & Li. Unaltered Figure 1 and the Figure 5 isosurface image from arXiv:2603.13078v1. '+external('https://creativecommons.org/licenses/by-nc-nd/4.0/','CC BY-NC-ND 4.0')+' · '+external('https://arxiv.org/abs/2603.13078','Paper')+'</li>'+
  '<li><strong>People.</strong> Portraits and profile information for '+external('https://www.kcl.ac.uk/people/juan-li','Juan Li')+', '+external('https://www.kcl.ac.uk/people/xingxin-yang','Xingxin Yang')+' and '+external('https://www.kcl.ac.uk/people/vedang-joshi','Vedang Joshi')+' come from their official King’s College London pages. Matteo’s institutional link is the '+external('https://kclpure.kcl.ac.uk/portal/en/persons/matteo-liguori/','King’s Research Portal')+'. Other research descriptions follow the named publications. Letterforms denote members without a sourced portrait.</li>'+
  '<li><strong>Research outputs.</strong> Titles, authors, venues and publication status follow the linked '+external('https://kclpure.kcl.ac.uk/portal/en/persons/juan.li/','King’s Research Portal')+' records. Featured studies follow first arXiv submission dates. The AIAA Journal in-press record and RA-VFM preprint are listed as separate records.</li>'+
  '<li><strong>Lab identity.</strong> The site logo and browser icon use the '+external('https://github.com/KCLFlowlab','KCLFlowlab GitHub organization avatar')+' in its original black-and-white form, without recoloring. The institutional logo beside the contact details is the original SVG from the '+external('https://www.kcl.ac.uk/','official KCL website')+'.</li>'+
  '<li><strong>Typography.</strong> Manrope and Space Grotesk, self-hosted under the SIL Open Font License. '+external('https://github.com/google/fonts','Font source')+'</li></ul>'
,'info','Sources');}

function closeWorkspace() {
  if (dialog.dataset.kind === 'study') {
    history.pushState(null, '', lastPageHash ? '#' + lastPageHash : location.pathname + location.search);
    route(false);
  } else dialog.close();
}
function route(scroll = true) {
  const key = location.hash.slice(1);
  if (key.startsWith('study-') && projects[key.slice(6)]) { renderStudy(key.slice(6)); return; }
  lastPageHash = key;
  if (dialog.open && dialog.dataset.kind === 'study') { stopMedia(); dialog.close(); }
  if (key.startsWith('domain-') && directions[key.slice(7)]) {
    if (activeDomain !== key.slice(7)) selectDirection(key.slice(7));
    if (scroll) $('#research').scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth'});
  }
}
$$('[data-domain-link]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); history.pushState(null, '', a.hash); route(); }));
$('.dialog-close').addEventListener('click', closeWorkspace);
dialog.addEventListener('cancel', event => { event.preventDefault(); if ($('.research-screen.expanded')) $('.research-screen.expanded').classList.remove('expanded'); else closeWorkspace(); });
// The close event is queued; if a new study opened meanwhile, it must not stop that study's media.
dialog.addEventListener('close', () => { if (dialog.open) return; stopMedia(); currentStudy = null; dialogTrigger?.focus({preventScroll: true}); swimmer?.kick(); });
dialog.addEventListener('click', event => {
  if (event.target.closest('[data-open-credits]')) { openCredits(); return; }
  if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeWorkspace(); }
});
// Study links open the workspace in place: no jump to the card, and focus returns to the link that was used.
document.addEventListener('click', event => {
  const a = event.target.closest('a[href^="#study-"]');
  if (!a || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault(); pendingTrigger = a;
  if (a.hash !== location.hash) history.pushState(null, '', a.hash);
  route();
});
addEventListener('hashchange', () => route());
$('#field-info').addEventListener('click', openAbout);
$('#field-info-footer').addEventListener('click', openAbout);
$('#credits-open').addEventListener('click', openCredits);
if (location.hash) route(); else lastPageHash = '';
