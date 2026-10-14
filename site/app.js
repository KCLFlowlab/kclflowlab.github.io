/* KCL FlowLab research field: real research, locally hosted media, no tracking. */
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = $('#project-dialog');
let heroPaused = reducedMotion.matches, heroVisible = true, resumeTracers = () => {};
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
  const particles = Array.from({length: innerWidth < 760 ? 550 : 1200}, () => ({}));
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
  '<li><strong>Lab identity.</strong> The site logo and browser icon use the '+external('https://github.com/KCLFlowlab','KCLFlowlab GitHub organization avatar')+' in its original black-and-white form, without recoloring. The institutional logo beside the contact details is the original SVG from the '+external('https://www.kcl.ac.uk/','official KCL website')+'.</li>'+
  '<li><strong>Typography.</strong> Manrope and Space Grotesk, self-hosted under the SIL Open Font License. '+external('https://github.com/google/fonts','Font source')+'</li></ul>'
));

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
let currentStudy = null, dialogTrigger = null, mediaCleanup = () => {};
function syncMotion() {
  $('#motion-toggle').textContent = heroPaused ? 'Play motion' : 'Pause motion';
  $('#motion-toggle').setAttribute('aria-pressed', String(heroPaused));
  $('#motion-toggle').setAttribute('aria-label', heroPaused ? 'Play flow tracers' : 'Pause flow tracers');
  resumeTracers();
}
function stopMedia() {
  $$('video', dialog).forEach(video => video.pause());
  mediaCleanup(); mediaCleanup = () => {};
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function openDialog(html, kind = 'info') {
  stopMedia();
  if (!dialog.open) dialogTrigger = document.activeElement;
  dialog.dataset.kind = kind;
  $('#workspace-label').textContent = kind === 'study' ? 'RESEARCH' : kind.toUpperCase();
  $('#dialog-content').innerHTML = html;
  if (!dialog.open) dialog.showModal();
  $('#dialog-content').scrollTop = 0;
  $('#dialog-title')?.setAttribute('tabindex','-1');
  $('#dialog-title')?.focus({preventScroll:true});
  syncMotion();
}
function closeWorkspace() {
  if (location.hash !== '#research' && location.hash !== '') history.pushState(null,'','#research');
  route();
}
function projectTabs(active) {
  return '<nav class="study-switcher" aria-label="Switch research study">'+studyOrder.map((key,i)=>'<a href="#study-'+key+'" '+(key===active?'aria-current="page"':'')+'><span>0'+(i+1)+'</span>'+studyMeta[key].name+'</a>').join('')+'</nav>';
}
function renderStudy(key) {
  currentStudy = key;
  const p=projects[key], meta=studyMeta[key], animated=!!movies[key];
  openDialog(projectTabs(key)+'<div class="study-layout"><section class="study-copy"><p class="eyebrow">'+meta.category+'</p><h2 id="dialog-title">'+meta.question+'</h2><p class="study-description">'+p.text+'</p><p class="study-authors">'+p.authors+'</p><div class="detail-links">'+p.links+'</div><details class="paper-record"><summary>Paper details</summary><p>'+p.title+'</p><p>First preprint · '+meta.date+'</p></details></section><section class="study-visual" aria-label="Research media"><div class="gallery-tabs" role="group" aria-label="Research media view">'+(animated?'<button data-view="animation" aria-pressed="true">Animation</button>':'')+'<button data-view="figures" aria-pressed="'+(!animated)+'">Paper figures</button><span class="gallery-kind">'+meta.name+' / 2026</span></div><div id="study-gallery"></div></section></div>', 'study');
  $$('.gallery-tabs button').forEach(button=>button.addEventListener('click',()=>renderGallery(button.dataset.view)));
  renderGallery(animated?'animation':'figures');
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
function route() {
  const key=location.hash.slice(1)||'research';
  $$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===(key.startsWith('study-')?'research':key)));
  if(key.startsWith('study-')&&projects[key.slice(6)]){renderStudy(key.slice(6));return;}
  const template=$('#'+key+'-template');
  if(template){
    const content=template.content.cloneNode(true), heading=content.querySelector('h2');
    if(heading){const previous=heading.id;heading.id='dialog-title';content.querySelector('[aria-labelledby="'+previous+'"]')?.setAttribute('aria-labelledby','dialog-title');}
    const wrapper=document.createElement('div');wrapper.className='information-panel';wrapper.append(content);
    openDialog(wrapper.outerHTML,key);return;
  }
  if(dialog.open)dialog.close();
}
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
  if(a.hash===location.hash){event.preventDefault();route();}
}));
$('.dialog-close').addEventListener('click',closeWorkspace);
dialog.addEventListener('cancel',event=>{event.preventDefault();if($('.research-screen.expanded'))$('.research-screen.expanded').classList.remove('expanded');else closeWorkspace();});
dialog.addEventListener('close',()=>{stopMedia();currentStudy=null;dialogTrigger?.focus({preventScroll:true});syncMotion();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeWorkspace();}});
window.addEventListener('hashchange',route);
$('#motion-toggle').addEventListener('click',()=>{heroPaused=!heroPaused;syncMotion();});
$('#layer-toggle').addEventListener('click',()=>{const shown=$('#layer-toggle').getAttribute('aria-pressed')!=='true';$('#layer-toggle').setAttribute('aria-pressed',String(shown));$('.hero-scene').classList.toggle('tracers-only',!shown);});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)heroPaused=true;syncMotion();});
document.addEventListener('visibilitychange',syncMotion);

// Links are navigation cues, not measurements or physical connections between studies.
function drawConnections() {
  const root=$('.atlas').getBoundingClientRect(), svg=$('.field-connections');
  svg.setAttribute('viewBox','0 0 '+root.width+' '+root.height);
  $('#connections').innerHTML=$$('.research-node').map(node=>{
    const r=node.getBoundingClientRect(),x=r.left-root.left+r.width/2,y=r.top-root.top+r.height/2;
    const ax=root.width*Number(node.dataset.anchorX),ay=root.height*Number(node.dataset.anchorY);
    return '<g data-connection="'+node.dataset.project+'"><path d="M '+x+' '+y+' Q '+ax+' '+y+' '+ax+' '+ay+'"/><circle cx="'+ax+'" cy="'+ay+'" r="4"/><circle class="anchor-ring" cx="'+ax+'" cy="'+ay+'" r="13"/></g>';
  }).join('');
}
new ResizeObserver(drawConnections).observe($('.atlas'));
$$('.research-node').forEach(node=>{
  const highlight=active=>{$$('[data-connection]').forEach(g=>g.classList.toggle('highlight',active&&g.dataset.connection===node.dataset.project));};
  node.addEventListener('pointerenter',()=>highlight(true));node.addEventListener('pointerleave',()=>highlight(false));
  node.addEventListener('focus',()=>highlight(true));node.addEventListener('blur',()=>highlight(false));
});
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  let count=0;$$('.research-node').forEach(node=>{const match=filter==='all'||node.dataset.category.split(' ').includes(filter);node.classList.toggle('filtered-out',!match);if(match)count++;});
  $('#study-count').textContent='0'+count+(filter==='all'?' STUDIES':' MATCHES');
}));
syncMotion();route();
