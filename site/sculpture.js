/* KCL FlowLab research landscape: real research, locally hosted media, no tracking. */
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = $('#project-dialog');
let heroPaused = reducedMotion.matches, resumeScene = () => {};
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

// Generative navigation artwork. Geometry and motion below are not CFD measurements.
const scene = (() => {
  const canvas=$('#flow-canvas'), ctx=canvas.getContext('2d');
  if(!ctx){canvas.hidden=true;$('.orbit-tools').hidden=true;$('.orbit-hint').hidden=true;return {resume(){},focus(){},hover(){},zoom(){},reset(){}};}
  document.body.classList.add('canvas-ready');
  let width=1,height=1,dpr=1,raf=0,previous=0,elapsed=0,dirty=true;
  let yaw=.56,pitch=.57,roll=-.23,zoom=1,hover=null,focus=null;
  let target={yaw,pitch,roll,zoom}, drag=null, pinchDistance=0;
  const pointers=new Map(), colors=['161,234,211','222,183,156','175,191,247'];
  const order=['bio','physics','ai'], strands=[], N=144, total=innerWidth<701?32:48;
  for(let j=0;j<total;j++){
    const line=[];
    for(let i=0;i<=N;i++){
      const t=i/N*Math.PI*2, phi=j/total*Math.PI*2+t*3;
      const radius=1.50+.12*Math.sin(t*3+.4), tube=.38+.075*Math.sin(t*2+1);
      line.push([Math.cos(t)*(radius+tube*Math.cos(phi)),Math.sin(t)*(radius+tube*Math.cos(phi))*.91,.33*Math.sin(t*2)+tube*Math.sin(phi)]);
    }
    strands.push(line);
  }
  function request(){dirty=true;if(!raf&&!document.hidden&&!dialog.open)raf=requestAnimationFrame(draw);}
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);request();}
  function draw(now){
    raf=0;if(document.hidden||dialog.open){previous=0;return;}
    if(previous&&now-previous<30){raf=requestAnimationFrame(draw);return;}
    const dt=previous?Math.min((now-previous)/1000,.08):.033;previous=now;
    const ease=reducedMotion.matches?1:Math.min(1,dt*6);
    let moving=false;
    for(const key of ['yaw','pitch','roll','zoom']){
      const value=({yaw,pitch,roll,zoom})[key], delta=target[key]-value;
      if(Math.abs(delta)>.001)moving=true;
      const next=Math.abs(delta)<.001?target[key]:value+delta*ease;
      if(key==='yaw')yaw=next;if(key==='pitch')pitch=next;if(key==='roll')roll=next;if(key==='zoom')zoom=next;
    }
    if(!heroPaused)elapsed+=dt;
    if(heroPaused&&!dirty&&!moving){previous=0;return;}dirty=false;
    ctx.clearRect(0,0,width,height);
    const mobile=width<=700;
    const cx=width*(mobile?.53:.65),cy=height*(mobile?(focus?.43:.61):.5);
    const scale=(mobile?Math.min(width*.35,height*.19):Math.min(width*.19,height*.27))*zoom;
    const ry=yaw+Math.sin(elapsed*.12)*.06,rx=pitch,rz=roll;
    const cosy=Math.cos(ry),siny=Math.sin(ry),cosx=Math.cos(rx),sinx=Math.sin(rx),cosz=Math.cos(rz),sinz=Math.sin(rz);
    const project=p=>{
      const ax=p[0]*cosy+p[2]*siny,az=-p[0]*siny+p[2]*cosy;
      const by=p[1]*cosx-az*sinx,bz=p[1]*sinx+az*cosx;
      const perspective=5.8/(5.8-bz);
      return [cx+(ax*cosz-by*sinz)*scale*perspective,cy+(ax*sinz+by*cosz)*scale*perspective,bz,perspective];
    };
    // Gentle atmospheric light makes depth legible; it does not encode a physical field.
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*2.4);
    glow.addColorStop(0,'rgba(52,103,106,.10)');glow.addColorStop(.55,'rgba(20,61,68,.09)');glow.addColorStop(1,'rgba(5,11,16,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.globalCompositeOperation='screen';
    for(let j=0;j<strands.length;j++){
      const line=strands[j], coords=line.map(project);
      for(let group=0;group<3;group++){
        const start=group*N/3,end=(group+1)*N/3, depth=coords[Math.floor((start+end)/2)][2];
        const emphasized=(hover||focus)===order[group], quiet=(hover||focus)&&!emphasized;
        const opacity=(.15+(depth+2)*.078)*(quiet?.28:emphasized?1.75:1);
        ctx.strokeStyle='rgba('+colors[group]+','+Math.min(.8,opacity)+')';ctx.lineWidth=j%11===0?1.15:.65;
        ctx.beginPath();ctx.moveTo(coords[start][0],coords[start][1]);
        for(let i=start+1;i<=end;i++)ctx.lineTo(coords[i][0],coords[i][1]);ctx.stroke();
      }
        // Moving light travels along the parametric ribbons, with no fabricated readouts.
      for(let k=0;k<9;k++){
        const offset=(k/9*N+j*.37+elapsed*(3.8+j%5*.2))%N, i=Math.floor(offset), f=offset-i;
        const a=coords[i],b=coords[i+1], group=Math.min(2,Math.floor(offset/N*3));
        const quiet=(hover||focus)&&(hover||focus)!==order[group];
        const alpha=(.3+(a[2]+2)*.12)*(quiet?.3:1);
        ctx.fillStyle='rgba('+colors[group]+','+Math.min(.93,alpha)+')';ctx.beginPath();ctx.arc(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,(j%7===0?1.2:.65)*a[3],0,Math.PI*2);ctx.fill();
      }
    }
    // A sparse orbit grid adds spatial orientation around the sculpture.
    ctx.lineWidth=.55;ctx.strokeStyle='rgba(130,168,164,.12)';
    for(let ring=0;ring<2;ring++){
      ctx.beginPath();for(let i=0;i<=100;i++){const t=i/100*Math.PI*2,p=project([2.28*Math.cos(t),2.28*Math.sin(t),ring?.13:-.13]);if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
    canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.zoom=zoom.toFixed(3);canvas.dataset.direction=focus||'overview';
    $('#zoom-level').value=zoom.toFixed(1)+'×';
    $('#zoom-out').disabled=target.zoom<=.7;$('#zoom-in').disabled=target.zoom>=1.6;
    if(!heroPaused||moving)raf=requestAnimationFrame(draw);else previous=0;
  }
  function changeZoom(amount){target.zoom=Math.max(.7,Math.min(1.6,target.zoom+amount));request();}
  function reset(){target={yaw:.56,pitch:.57,roll:-.23,zoom:1};request();}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};canvas.classList.add('dragging');if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const p=[...pointers.values()], distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)changeZoom((distance-pinchDistance)/250);pinchDistance=distance;drag=null;}
    else if(drag){target.yaw+=(e.clientX-drag.x)*.006;target.pitch=Math.max(-1.3,Math.min(1.3,target.pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};request();}
  });
  const release=e=>{pointers.delete(e.pointerId);pinchDistance=0;drag=pointers.size===1?[...pointers.values()][0]:null;if(!pointers.size)canvas.classList.remove('dragging');};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,release));
  canvas.addEventListener('wheel',e=>{e.preventDefault();changeZoom(-Math.sign(e.deltaY)*.08);},{passive:false});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')target.yaw-=.17;if(e.key==='ArrowRight')target.yaw+=.17;if(e.key==='ArrowUp')target.pitch=Math.max(-1.3,target.pitch-.12);if(e.key==='ArrowDown')target.pitch=Math.min(1.3,target.pitch+.12);if(e.key==='+'||e.key==='=')changeZoom(.1);if(e.key==='-')changeZoom(-.1);if(e.key==='0')reset();request();}});
  new ResizeObserver(resize).observe(canvas);resize();
  return {resume:request,hover(key){hover=key;request();},focus(key){focus=key;const positions={bio:[.16,.38,-.4],physics:[-1.04,.74,.1],ai:[1.18,-.35,-.6]};const p=positions[key]||[.56,.57,-.23];target={yaw:p[0],pitch:p[1],roll:p[2],zoom:key?1.12:1};request();},zoom:changeZoom,reset};
})();
resumeScene=()=>scene.resume();

$('#field-info').addEventListener('click',()=>openDialog(
  '<p class="eyebrow">INSIDE THE VISUALIZATION</p><h2 id="dialog-title">Flow as a way<br>to explore.</h2><p>The homepage sculpture is a generative, three-dimensional navigation artwork. Its ribbons, colours and motion connect research themes; they do not represent measured data or a CFD simulation. Drag to rotate, scroll or pinch to zoom, and enter a direction to discover the related research.</p><p>Inside the studies, visualisations come from the original research. This archived image uses a calculated-cell CFD snapshot from the Deforming VFM study: anguilliform swimming, St = 0.4, λ* = 1.5, Re = 5,000, at phase 0.00 T. The field is rendered with a dark diverging palette; cyan and copper distinguish opposite signs of vorticity.</p>'+figure('assets/wake-field.png','Archived CFD vorticity, body boundary and velocity streamlines at phase zero','Qualitative field view. Fixed displayed vorticity range: −30 to +30; values outside that range saturate.')+
  '<div class="flow-note"><p>The archived image is a single phase-0 snapshot, not a time-resolved simulation. The complete 64-phase research animation is available in the Deforming VFM study. The homepage sculpture is a separate generative artwork.</p></div><div class="detail-links">'+external('https://github.com/KCLFlowlab/deforming-vfm','Source data & method')+'</div>'
));
$('#credits-open').addEventListener('click',()=>openDialog(
  '<p class="eyebrow">SOURCES & CREDITS</p><h2 id="dialog-title">Built around real research.</h2><p>Research media are attributed to their authors. Full scientific figures retain their original layouts and color scales; GIFs are transcoded to MP4. The homepage sculpture is a generative navigation artwork, not a scientific simulation. The archived CFD snapshot is available in About the visual; original scientific animations remain in each study.</p><ul>'+
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
  $('#motion-toggle').textContent = heroPaused ? 'Play' : 'Pause';
  $('#motion-toggle').setAttribute('aria-pressed', String(heroPaused));
  $('#motion-toggle').setAttribute('aria-label', heroPaused ? 'Play sculpture motion' : 'Pause sculpture motion');
  resumeScene();
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
  const destination=activeDomain?'#domain-'+activeDomain:'#research';
  if (location.hash !== destination) history.pushState(null,'',destination);
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
  $$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===(key.startsWith('domain-')?'research':key.startsWith('study-')?'library':key)));
  if(key.startsWith('study-')&&projects[key.slice(6)]){renderStudy(key.slice(6));return;}
  const template=document.getElementById(key+'-template');
  if(template){
    const content=template.content.cloneNode(true), heading=content.querySelector('h2');
    if(heading){const previous=heading.id;heading.id='dialog-title';content.querySelector('[aria-labelledby="'+previous+'"]')?.setAttribute('aria-labelledby','dialog-title');}
    if(key==='library')content.querySelector('.library-records').innerHTML=records.map(r=>recordLink(r,'library-record')).join('');
    const wrapper=document.createElement('div');wrapper.className='information-panel';wrapper.append(content);
    openDialog(wrapper.outerHTML,key);return;
  }
  if(dialog.open){stopMedia();dialog.close();}
  showDirection(key.startsWith('domain-')&&directions[key.slice(7)]?key.slice(7):null);
}
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
  if(a.hash===location.hash){event.preventDefault();route();}
}));
$('.dialog-close').addEventListener('click',closeWorkspace);
dialog.addEventListener('cancel',event=>{event.preventDefault();if($('.research-screen.expanded'))$('.research-screen.expanded').classList.remove('expanded');else closeWorkspace();});
dialog.addEventListener('close',()=>{if(dialog.open)return;stopMedia();currentStudy=null;dialogTrigger?.focus({preventScroll:true});syncMotion();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeWorkspace();}});
window.addEventListener('hashchange',route);
$('#motion-toggle').addEventListener('click',()=>{heroPaused=!heroPaused;syncMotion();});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)heroPaused=true;syncMotion();});
document.addEventListener('visibilitychange',syncMotion);

// Directions connect featured methods, the longer publication record and sourced interests.
const recordNodes=[...$('#publications-template').content.querySelectorAll('#kcl-outputs>a')];
const records=recordNodes.map(a=>({url:a.href,title:$('.pub-title',a).textContent,year:$('.pub-type',a).firstChild.textContent.trim(),venue:$('.pub-venue',a).textContent,authors:$('.pub-authors',a).textContent}));
const studyImages={ravfm:'assets/ravfm-geometry.png',stco:'assets/stco-conditions.png',deforming:'assets/deforming-poster.png',vato:'assets/vato-model.png'};
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
let activeDomain=null,activeTopic=null;
const recordLink=(r,kind='direction-record')=>'<a class="'+kind+'" href="'+r.url+'" target="_blank" rel="noopener noreferrer"><span>'+r.year+'</span><span>'+(kind==='library-record'?'<strong>'+r.title+'</strong><small>'+r.venue+'</small>':r.title)+'</span><span aria-hidden="true">↗</span></a>';
function renderResults(topic){
  const d=directions[activeDomain], item=topic?d.topics.find(t=>t.id===topic):d;
  if(!item)return;activeTopic=topic;
  $$('.direction-topics button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.topic||null)===topic)));
  $('#direction-results').innerHTML=(topic?'<h3>'+item.name+'</h3><p class="topic-description">'+item.text+'</p>':'')+
    (item.interest?'<p class="interest-note">RESEARCH INTEREST</p>':'')+
    (item.studies.length?'<p class="eyebrow">SELECTED STUDIES</p>'+item.studies.map(key=>'<a class="direction-study" href="#study-'+key+'"><img src="'+studyImages[key]+'" alt="'+studyMeta[key].name+' original research figure"><span><strong>'+studyMeta[key].name+'</strong><small>'+studyMeta[key].question+'</small></span><span aria-hidden="true">↗</span></a>').join(''):'')+
    (item.records.length?'<p class="eyebrow">FROM THE PUBLICATION RECORD</p>'+item.records.map(i=>recordLink(records[i])).join(''):'')+
    (item.link?'<div class="detail-links">'+external(item.link,item.linkText)+'</div>':'')+
    '<a class="direction-end" href="#library">Explore the wider research <span aria-hidden="true">↗</span></a>';
}
function showDirection(key){
  if(activeDomain===key)return;
  activeDomain=key;activeTopic=null;const root=$('.observatory'), panel=$('#direction-panel');
  root.classList.toggle('has-direction',!!key);root.dataset.direction=key||'overview';
  $$('.domain-portal').forEach(a=>{if(a.dataset.domain===key)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  scene.focus(key);
  if(!key){panel.hidden=true;panel.innerHTML='';$('#landscape-status').textContent='Overview. Explore three connected research directions.';return;}
  const d=directions[key];panel.hidden=false;
  panel.innerHTML='<div class="direction-top"><p class="eyebrow">'+d.index+'</p><a class="direction-back" href="#research">← Overview</a></div><h2 id="direction-title" tabindex="-1">'+d.title+'</h2><p>'+d.intro+'</p><div class="direction-topics" role="group" aria-label="Explore questions"><button data-topic="" aria-pressed="true">Overview</button>'+d.topics.map(t=>'<button data-topic="'+t.id+'" aria-pressed="false">'+t.name+'</button>').join('')+'</div><div id="direction-results" class="direction-results" aria-live="polite"></div>';
  $$('.direction-topics button').forEach(b=>b.addEventListener('click',()=>renderResults(b.dataset.topic||null)));
  renderResults(null);panel.scrollTop=0;$('#direction-title').focus({preventScroll:true});$('#landscape-status').textContent=d.title+'. Choose a question or explore the research below.';
}
$$('.domain-portal').forEach(a=>{
  a.addEventListener('pointerenter',()=>scene.hover(a.dataset.domain));a.addEventListener('pointerleave',()=>scene.hover(null));
  a.addEventListener('focus',()=>scene.hover(a.dataset.domain));a.addEventListener('blur',()=>scene.hover(null));
});
$('#zoom-in').addEventListener('click',()=>scene.zoom(.15));$('#zoom-out').addEventListener('click',()=>scene.zoom(-.15));$('#reset-view').addEventListener('click',()=>scene.reset());
const archiveTitles=['Flow completion with graph neural networks','Separated-flow models for flexible wings','Vortex shedding and induced forces','CFD for fuel-cell channel design','Unsteady forces in turbulence-modelled flows'];
let archiveIndex=0;
function showArchive(){const r=records[archiveIndex];$('#archive-title').textContent=archiveTitles[archiveIndex];$('#archive-year').textContent=r.year;$('#archive-link').href=r.url;$('#archive-link').target='_blank';$('#archive-link').rel='noopener noreferrer';$('#archive-link').setAttribute('aria-label',r.year+' · '+r.title);}
$('#archive-next').addEventListener('click',()=>{archiveIndex=(archiveIndex+1)%records.length;showArchive();});
setInterval(()=>{if(!heroPaused&&!document.hidden&&!dialog.open){archiveIndex=(archiveIndex+1)%records.length;showArchive();}},9000);
showArchive();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open&&activeDomain){location.hash='research';$('#domain-'+activeDomain)?.focus({preventScroll:true});}});

syncMotion();route();
