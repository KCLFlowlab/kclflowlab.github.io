/* KCL FlowLab: local research media, verified people, no tracking. */
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = $('#project-dialog');
document.body.classList.add('js-ready');
const menu = $('.menu-toggle');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); $('#navigation').classList.remove('open'); }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); $('#navigation').classList.toggle('open', open);
});
$$('#navigation a').forEach(a => a.addEventListener('click', closeMenu));
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  }), {threshold: .08});
  $$('.manifesto h2, .chapter-copy, .intelligence-heading, .people-heading, .principal, .person, .publication-list>a').forEach(e => { e.classList.add('reveal'); observer.observe(e); });
}

let heroVisible = true;
let heroPaused = reducedMotion.matches;
let resumeTracers = () => {};
const players = [];
function updateButtons() {
  players.forEach(player => player.updateButton());
  $('#motion-toggle').innerHTML = heroPaused ? '<span aria-hidden="true">▶</span> Play motion' : '<span aria-hidden="true">Ⅱ</span> Pause motion';
  $('#motion-toggle').setAttribute('aria-pressed', String(heroPaused));
  $('#motion-toggle').setAttribute('aria-label', heroPaused ? 'Play flow tracers' : 'Pause flow tracers');
}
function updatePosition() { players.forEach(player => player.updatePosition()); }
function syncMotion() { players.forEach(player => player.sync()); resumeTracers(); updateButtons(); }
function expandedState() {
  const expanded = document.fullscreenElement || $('.operator-screen.expanded');
  players.forEach(player => {
    if (!player.expand) return;
    const open = expanded === player.screen;
    player.expand.textContent = open ? '×' : '⤢';
    player.expand.setAttribute('aria-label', (open ? 'Close enlarged ' : 'Enlarge ') + player.name + ' visualization');
  });
  document.body.classList.toggle('dialog-open', !!expanded || dialog.open);
  syncMotion();
}
function createPlayer({video, screen, play, slider, output, expand, name, position}) {
  const player = {video, screen, expand, name, desired: !reducedMotion.matches, visible: false, generation: 0};
  video.controls = false;
  player.updateButton = () => {
    const symbol = $('.play-symbol', play), label = $('.play-text, #play-text', play);
    if (symbol && label) { symbol.textContent = video.paused ? '▶' : 'Ⅱ'; label.textContent = video.paused ? 'Play' : 'Pause'; }
    else play.textContent = video.paused ? 'Play ↗' : 'Pause Ⅱ';
    play.setAttribute('aria-label', (video.paused ? 'Play ' : 'Pause ') + name + ' animation');
  };
  player.updatePosition = () => {
    if (!slider) return;
    const ratio = Number.isFinite(video.duration) && video.duration > 0 ? video.currentTime / video.duration : 0;
    slider.value = Math.round(ratio * 1000);
    output.value = position(ratio); slider.setAttribute('aria-valuetext', output.value);
  };
  player.sync = () => {
    const enlarged = document.fullscreenElement || $('.operator-screen.expanded');
    const available = !document.hidden && !dialog.open && (!enlarged || enlarged === screen);
    if (available && player.desired && player.visible) {
      const generation = player.generation;
      video.play().catch(error => {
        if (error.name === 'NotAllowedError' && generation === player.generation) player.desired = false;
        player.updateButton();
      });
    } else video.pause();
  };
  player.setMedia = media => {
    player.generation++; video.pause(); video.poster = media.poster; video.src = media.src;
    video.setAttribute('aria-label', name + '. ' + media.caption);
    video.load(); player.updatePosition(); player.sync();
  };
  play.addEventListener('click', () => { player.desired = video.paused; syncMotion(); });
  slider?.addEventListener('input', () => {
    player.desired = false; video.pause();
    if (Number.isFinite(video.duration)) video.currentTime = Number(slider.value) / 1000 * Math.max(0, video.duration - .001);
    player.updatePosition();
  });
  ['play','pause','ended'].forEach(event => video.addEventListener(event, player.updateButton));
  ['timeupdate','loadedmetadata','seeked'].forEach(event => video.addEventListener(event, player.updatePosition));
  if (expand) expand.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (screen.classList.contains('expanded')) screen.classList.remove('expanded');
    else {
      try { if (!screen.requestFullscreen) throw new Error('Fullscreen unavailable'); await screen.requestFullscreen(); }
      catch { screen.classList.add('expanded'); }
    }
    expandedState();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { player.visible = entries[0].isIntersecting; player.sync(); }, {threshold: .12});
    observer.observe(video);
  } else player.visible = true;
  players.push(player);
  return player;
}
const vatoMedia = {
  leadtime: {src:'assets/vato-leadtime.mp4',poster:'assets/vato-leadtime-poster.png',frames:30,caption:'Direct predictions at 1–30 ms leads. A discrete lead-time sweep, not a continuous rollout.'},
  incidence: {src:'assets/vato-incidence.mp4',poster:'assets/vato-incidence-poster.png',frames:6,caption:'Six incidence conditions: 3°, 5°, 6°, 9°, 11° and 12°, all at a fixed 20 ms lead. A discrete condition sweep.'}
};
const vatoPlayer = createPlayer({
  video:$('#research-video'),screen:$('#research-screen'),play:$('#video-play'),slider:$('#media-position'),output:$('#position-label'),expand:$('#media-expand'),name:'VATO',
  position:ratio => {
    const incidence = $('#sweep-select').value === 'incidence', frames = incidence ? 6 : 30;
    const frame = Math.min(frames - 1, Math.floor(ratio * frames));
    return incidence ? [3,5,6,9,11,12][frame] + '° / 20 ms' : (frame + 1) + ' / 30 ms';
  }
});
createPlayer({video:$('#stco-video'),screen:$('#stco-screen'),play:$('#stco-play'),slider:$('#stco-position'),output:$('#stco-position-label'),expand:$('#stco-expand'),name:'STCO',position:ratio => (Math.min(39, Math.floor(ratio * 40)) + 1) + ' / 40'});
createPlayer({video:$('#swimming-video'),screen:$('.force-film'),play:$('.film-pause'),name:'swimming'});
$('#sweep-select').addEventListener('change', () => {
  const media = vatoMedia[$('#sweep-select').value];
  $('#media-caption').textContent = media.caption; vatoPlayer.setMedia(media);
});
$('#motion-toggle').addEventListener('click', () => { heroPaused = !heroPaused; syncMotion(); });
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; syncMotion(); }, {threshold: .12});
  observer.observe($('.hero'));
}
document.addEventListener('visibilitychange', syncMotion);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) { players.forEach(player => player.desired = false); heroPaused = true; syncMotion(); }
});
document.addEventListener('fullscreenchange', expandedState);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeMenu(); $$('.operator-screen.expanded').forEach(screen => screen.classList.remove('expanded')); expandedState(); }
});

// Passive tracers: bilinear sampling of a frozen, author-supplied CFD velocity field.
(async () => {
  const canvas = $('#flow-canvas'), ctx = canvas.getContext('2d');
  if (!ctx) return;
  let field;
  try {
    const response = await fetch('assets/flow-field.json');
    if (!response.ok) throw new Error('Flow field unavailable');
    field = await response.json();
  } catch { canvas.hidden = true; $('#motion-toggle').hidden = true; return; }
  const [x0,x1,y0,y1] = field.imageBounds, [gx0,gx1,gy0,gy1] = field.bounds;
  let width = 1, height = 1, raf = 0, previous = 0, seed = 73;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const particles = Array.from({length: 440}, () => ({}));
  const reset = p => { p.x = x0 + random()*(x1-x0); p.y = y0 + random()*(y1-y0); p.life = 50 + random()*180; };
  particles.forEach(reset);
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = r.width; height = r.height;
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function sample(x,y,values) {
    const fx = Math.max(0,Math.min(field.nx-1.001,(x-gx0)/(gx1-gx0)*(field.nx-1)));
    const fy = Math.max(0,Math.min(field.ny-1.001,(y-gy0)/(gy1-gy0)*(field.ny-1)));
    const ix = Math.floor(fx), iy = Math.floor(fy), dx=fx-ix, dy=fy-iy, j=iy*field.nx+ix;
    return values[j]*(1-dx)*(1-dy)+values[j+1]*dx*(1-dy)+values[j+field.nx]*(1-dx)*dy+values[j+field.nx+1]*dx*dy;
  }
  function draw(now) {
    raf = 0;
    if (heroPaused || !heroVisible || document.hidden || dialog.open) { previous = 0; return; }
    if (previous && now - previous < 32) { raf = requestAnimationFrame(draw); return; }
    const dt = previous ? Math.min((now-previous)/1000,.08) : .033; previous=now;
    ctx.globalCompositeOperation='destination-out'; ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,0,width,height);
    ctx.globalCompositeOperation='source-over';
    for (const p of particles) {
      const u=sample(p.x,p.y,field.u),v=sample(p.x,p.y,field.v),omega=sample(p.x,p.y,field.omega);
      const ax=(p.x-x0)/(x1-x0)*width, ay=(1-(p.y-y0)/(y1-y0))*height;
      p.x+=u*dt*.22;p.y+=v*dt*.22;p.life--;
      if(p.x>x1||p.x<x0||p.y>y1||p.y<y0||p.life<0||Math.hypot(u,v)<.035){reset(p);continue;}
      const b=Math.min(1,Math.abs(omega)/18);
      ctx.strokeStyle=omega<0?'rgba(154,229,227,'+(.14+b*.62)+')':'rgba(239,184,132,'+(.14+b*.62)+')';
      ctx.lineWidth=.55+b*.65;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo((p.x-x0)/(x1-x0)*width,(1-(p.y-y0)/(y1-y0))*height);ctx.stroke();
    }
    raf=requestAnimationFrame(draw);
  }
  resumeTracers=()=>{if(!raf&&!heroPaused&&heroVisible&&!document.hidden&&!dialog.open)raf=requestAnimationFrame(draw);};
  new ResizeObserver(resize).observe(canvas);
  resize();resumeTracers();
})();

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
    label: 'MARSVATO / PREPRINT · 2026', title: 'VATO: A Vortex-Force-Aware Transformer Operator for Unsteady Separated Aerofoil Flows',
    authors: 'Xingxin Yang · Zhan Zhang · Yichen Li · Juan Li',
    text: 'VATO links flow prediction to the local structures that generate aerodynamic forces. VATO-S adds training-time supervision of the VFM force-contribution field. VATO-A also uses force contribution and sensitivity to guide residual cross-attention. The benchmark spans 54 trajectories across nine double-edged plate aerofoil geometries.',
    links: external('https://arxiv.org/abs/2609.00507', 'Read preprint') + external('https://github.com/KCLFlowlab/MarsVATO', 'Code & animations'),
    figures: figure('assets/vato-model.png', 'VATO architecture, training and vortex-aware residual cross-attention', 'Repository README cover · VATO model architecture. The homepage animations show discrete prediction-lead and incidence sweeps.')
  },
  stco: {
    label: 'STCO / PREPRINT · 2026', title: 'STCO: Conditional Neural Operators for Time-Dependent PDEs',
    authors: 'Xingxin Yang · Zhan Zhang · Juan Li',
    text: 'A future flow depends on what is prescribed as well as what has been observed. The Spatiotemporal Conditional Operator supplies target-time motion, inflow and forcing fields to different neural-operator backbones. Flow-Aware Graph Leaf sampling and Dual-Site Feature-wise Linear Modulation form a common condition interface, evaluated across twelve matched backbones.',
    links: external('https://arxiv.org/abs/2608.20477', 'Read preprint') + external('https://github.com/YoungxxStar/FRO_Paper', 'Project & animations'),
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
const studyMovies = {
  deforming: {src:'assets/deforming-force-mapping.mp4',poster:'assets/deforming-poster.png',caption:'64 original phases of the swimming cycle. Motion, force histories, vorticity and force maps are synchronized.'},
  vato: {src:'assets/vato-leadtime.mp4',poster:'assets/vato-leadtime-poster.png',caption:'Target and VATO-A at 1–30 ms direct prediction leads. Discrete lead-time sweep.'},
  stco: {src:'assets/stco-response.mp4',poster:'assets/stco-response-poster.png',caption:'Four prescribed conditions. Each frame shows an independently queried lead, not an autoregressive rollout.'}
};
function openDialog(html) {
  dialogTrigger=document.activeElement;
  $('#dialog-content').innerHTML=html;
  dialog.showModal();dialog.scrollTop=0;
  document.body.classList.add('dialog-open');syncMotion();
}
$$('[data-project]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.project,p=projects[key],m=studyMovies[key];
  const film=m?'<figure><video controls muted loop playsinline preload="metadata" poster="'+m.poster+'" aria-label="'+m.caption+'"><source src="'+m.src+'" type="video/mp4"></video><figcaption>'+m.caption+'</figcaption></figure>':'';
  openDialog('<p class="eyebrow">'+p.label+'</p><h2 id="dialog-title">'+p.title+'</h2>'+(p.authors?'<p class="authors">'+p.authors+'</p>':'')+'<p>'+p.text+'</p><div class="detail-links">'+p.links+'</div>'+film+p.figures);
}));
$('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{
  if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
});
dialog.addEventListener('close',()=>{
  $$('video',dialog).forEach(v=>v.pause());
  expandedState();dialogTrigger?.focus({preventScroll:true});syncMotion();
});
$('#field-info').addEventListener('click',()=>openDialog(
  '<p class="eyebrow">INSIDE THE VISUALIZATION</p><h2 id="dialog-title">A real field.<br>A closer look.</h2><p>The homepage uses a calculated-cell CFD snapshot from the Deforming VFM study: anguilliform swimming, St = 0.4, λ* = 1.5, Re = 5,000, at phase 0.00 T. The field is rendered with a dark diverging palette; cyan and copper distinguish opposite signs of vorticity.</p>'+figure('assets/wake-field.png','Archived CFD vorticity, body boundary and velocity streamlines at phase zero','Qualitative field view. Fixed displayed vorticity range: −30 to +30; values outside that range saturate.')+
  '<div class="flow-note"><p>The moving particles are passive tracers in this frozen velocity field. They show local flow direction; they are not a time-resolved simulation of the swimmer. The complete 64-phase research animation is available in the Deforming VFM study.</p></div><div class="detail-links">'+external('https://github.com/KCLFlowlab/deforming-vfm','Source data & method')+'</div>'
));
$('#credits-open').addEventListener('click',()=>openDialog(
  '<p class="eyebrow">SOURCES & CREDITS</p><h2 id="dialog-title">Built around real research.</h2><p>Research media are attributed to their authors. Full scientific figures retain their original layouts and color scales; GIFs are transcoded to MP4. The homepage is a separate qualitative rendering of an archived CFD snapshot with passive tracers.</p><ul>'+
  '<li><strong>Deforming VFM.</strong> Yang, Liguori, Joshi & Li. README animation, Figures 5 and 11, and the calculated-cell phase-0 snapshot. '+external('https://github.com/KCLFlowlab/deforming-vfm','Research source')+'</li>'+
  '<li><strong>MarsVATO.</strong> Yang, Zhang, Li & Li. README architecture and discrete lead-time/incidence sweeps. '+external('https://github.com/KCLFlowlab/MarsVATO','Research source')+'</li>'+
  '<li><strong>STCO.</strong> Current manuscript and README in FRO_Paper. The response animation uses independently queried leads. '+external('https://github.com/YoungxxStar/FRO_Paper','Research source')+'</li>'+
  '<li><strong>RA-VFM.</strong> Liguori, Zhang, Ciriello & Li. Unaltered Figure 1 and the Figure 5 isosurface image from arXiv:2603.13078v1. '+external('https://creativecommons.org/licenses/by-nc-nd/4.0/','CC BY-NC-ND 4.0')+' · '+external('https://arxiv.org/abs/2603.13078','Paper')+'</li>'+
  '<li><strong>People.</strong> Portraits and profile information for '+external('https://www.kcl.ac.uk/people/juan-li','Juan Li')+', '+external('https://www.kcl.ac.uk/people/xingxin-yang','Xingxin Yang')+' and '+external('https://www.kcl.ac.uk/people/vedang-joshi','Vedang Joshi')+' come from their official King’s College London pages. Matteo’s institutional link is the '+external('https://kclpure.kcl.ac.uk/portal/en/persons/matteo-liguori/','King’s Research Portal')+'. Other research descriptions follow the named publications. Letterforms denote members without a sourced portrait.</li>'+
  '<li><strong>Research outputs.</strong> Titles, authors, venues and publication status follow the linked '+external('https://kclpure.kcl.ac.uk/portal/en/persons/juan.li/','King’s Research Portal')+' records. Featured studies follow first arXiv submission dates. The AIAA Journal in-press record and RA-VFM preprint are listed as separate records.</li>'+
  '<li><strong>Lab identity.</strong> The site logo and browser icon use the '+external('https://github.com/KCLFlowlab','KCLFlowlab GitHub organization avatar')+' as a white vortex mark on King’s red. A local SVG applies the color treatment while retaining the source artwork. The institutional logo beside the contact details is the original SVG from the '+external('https://www.kcl.ac.uk/','official KCL website')+'.</li>'+
  '<li><strong>Typography.</strong> Manrope and Space Grotesk, self-hosted under the SIL Open Font License. '+external('https://github.com/google/fonts','Font source')+'</li></ul>'
));
updateButtons();updatePosition();syncMotion();
