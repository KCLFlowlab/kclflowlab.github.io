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

// Interactive illustration: a skinned 3D swimmer and a bounded, softened vortex wake.
// The kinematics and particle model are designed for interaction, not CFD inference.
const scene = (() => {
  const canvas=$('#flow-canvas'), ctx=canvas.getContext('2d');
  if(!ctx){canvas.hidden=true;$('.orbit-tools').hidden=true;$('.orbit-hint').hidden=true;return {resume(){},focus(){},hover(){},zoom(){},reset(){}};}
  document.body.classList.add('canvas-ready');
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>mul(a,1/(Math.hypot(...a)||1));
  let seed=41;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  let width=1,height=1,dpr=1,raf=0,previous=0,elapsed=0,dirty=true;
  let yaw=.56,pitch=.46,roll=.10,zoom=1,hover=null,focus=null,fishHover=false;
  let target={yaw,pitch,roll,zoom},drag=null,pinchDistance=0,projection=null,hitShapes=[];
  const pointers=new Map(), vortices=[],particles=[];
  const fish={pos:[0,0,0],aim:[0,0,0],velocity:[0,0,0],heading:0,bearing:0,phase:1.1,speed:0};
  let shedClock=0,particleClock=0,lastShed=[0,0,0],polarity=1;
  const rings=42,sides=28;
  const profile=[[0,.018,.018],[.07,.16,.12],[.19,.29,.205],[.34,.335,.235],[.48,.30,.21],[.65,.225,.15],[.81,.105,.077],[.94,.045,.037],[1,.035,.029]];
  function radius(s){
    let i=0;while(i<profile.length-2&&s>profile[i+1][0])i++;
    const a=profile[i],b=profile[i+1],f=clamp((s-a[0])/(b[0]-a[0]),0,1),t=f*f*(3-2*f);
    return [a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  }
  function bend(s){return (.012+.23*s*s)*Math.sin(s*6.2-fish.phase);}
  function bodyPoint(s,angle){const r=radius(s);return [-1.22+2.30*s,Math.cos(angle)*r[0],Math.sin(angle)*r[1]+bend(s)];}
  function world(p){
    const c=Math.cos(fish.heading),s=Math.sin(fish.heading);
    return [p[0]*c-p[1]*s+fish.pos[0],p[0]*s+p[1]*c+fish.pos[1],p[2]+fish.pos[2]];
  }
  function skin(p){const s=clamp((p[0]+1.22)/2.30,0,1);return world([p[0],p[1],p[2]+bend(s)]);}
  function frame(){
    const c=Math.cos(fish.heading),s=Math.sin(fish.heading);
    return {down:[c,s,0],axis:[-s,c,0],side:[0,0,1]};
  }
  function shed(extra=0){
    const basis=frame(),tail=skin([1.40,0,0]),sign=polarity;polarity*=-1;
    const center=add(tail,mul(basis.side,sign*(.13+fish.speed*.015)));
    vortices.push({p:center,down:basis.down,axis:basis.axis,side:basis.side,sign,age:0,life:7.5,strength:.075+Math.min(fish.speed,4)*.045+extra});
    if(vortices.length>30)vortices.shift();lastShed=fish.pos.slice();
  }
  function emit(){
    const basis=frame();
    for(let i=0;i<3;i++){
      const p=skin([1.42+(random()-.5)*.08,(random()-.5)*.48,(random()-.5)*.08]);
      particles.push({p,history:[p.slice()],age:0,life:4.5+random()*2.7,down:basis.down,sign:Math.sin(fish.phase)>0?1:-1,size:random()});
    }
    const limit=width<=700?240:390;if(particles.length>limit)particles.splice(0,particles.length-limit);
  }
  function step(dt,warm=false){
    elapsed+=dt;
    if(!warm){
      if(drag?.mode!=='fish')fish.aim=mul(fish.aim,Math.exp(-dt*.065));
      const old=fish.pos.slice();fish.pos=add(fish.pos,mul(sub(fish.aim,fish.pos),1-Math.exp(-dt*12)));
      fish.velocity=mul(sub(fish.pos,old),1/dt);fish.speed+= (Math.min(6,Math.hypot(...fish.velocity))-fish.speed)*(1-Math.exp(-dt*7));
      if(drag?.mode!=='fish'){
        const homeward=Math.hypot(...fish.aim)>.2?Math.atan2(fish.aim[1],fish.aim[0]):0;
        fish.bearing+=Math.atan2(Math.sin(homeward-fish.bearing),Math.cos(homeward-fish.bearing))*(1-Math.exp(-dt*.8));
      }
      const angle=Math.atan2(Math.sin(fish.bearing-fish.heading),Math.cos(fish.bearing-fish.heading));
      fish.heading+=angle*(1-Math.exp(-dt*5));
    }
    fish.phase+=dt*(7.8+fish.speed*.8);
    shedClock+=dt;particleClock+=dt;
    if(shedClock>.39||Math.hypot(...sub(fish.pos,lastShed))>.21){shed(fish.speed*.012);shedClock=0;}
    if(particleClock>.032){emit();particleClock=0;}
    for(let i=vortices.length-1;i>=0;i--){
      const v=vortices[i];v.age+=dt;if(v.age>v.life){vortices.splice(i,1);continue;}
      v.p=add(v.p,mul(v.down,dt*(.43+.06*Math.exp(-v.age))));
      v.p[2]+=v.sign*dt*.022;
    }
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}
      let vx=p.down[0]*.43,vy=p.down[1]*.43,vz=0;
      // Regularized point-vortex induction in each shed vortex's swimming plane.
      // Finite cores, fading circulation and a velocity cap prevent singularities.
      for(const v of vortices){
        const dx=p.p[0]-v.p[0],dy=p.p[1]-v.p[1],dz=p.p[2]-v.p[2];
        const axial=dx*v.axis[0]+dy*v.axis[1],r2=dx*dx+dy*dy+dz*dz;
        if(r2>1.6)continue;
        const core=.028+.008*v.age;
        const strength=v.sign*v.strength*Math.exp(-v.age*.25-axial*axial*7-r2*1.1)/(r2+core);
        vx+=v.axis[1]*dz*strength;vy-=v.axis[0]*dz*strength;vz+=(v.axis[0]*dy-v.axis[1]*dx)*strength;
      }
      const dx=p.p[0]-fish.pos[0],dy=p.p[1]-fish.pos[1],dz=p.p[2]-fish.pos[2];
      const entrainment=Math.exp(-(dx*dx+dy*dy+dz*dz)*3)*.34;
      vx+=fish.velocity[0]*entrainment;vy+=fish.velocity[1]*entrainment;vz+=fish.velocity[2]*entrainment;
      const speed=Math.hypot(vx,vy,vz),factor=speed>2.8?2.8/speed:1;
      p.p[0]+=vx*dt*factor;p.p[1]+=vy*dt*factor;p.p[2]+=vz*dt*factor;
      p.history.push(p.p.slice());if(p.history.length>24)p.history.shift();
    }
  }
  // A developed, deterministic wake is visible immediately, including with reduced motion.
  for(let i=0;i<210;i++)step(1/30,true);
  function request(){dirty=true;if(!raf&&!document.hidden&&!dialog.open)raf=requestAnimationFrame(draw);}
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);request();}
  function makeProjection(){
    const mobile=width<=700;
    const cx=width*(mobile?.40:.61),cy=height*(mobile?(focus?.38:.56):.50);
    const scale=(mobile?Math.min(width*.17,height*.11):Math.min(width*.101,height*.17))*zoom;
    const cosy=Math.cos(yaw),siny=Math.sin(yaw),cosx=Math.cos(pitch),sinx=Math.sin(pitch),cosz=Math.cos(roll),sinz=Math.sin(roll);
    const rotate=p=>{const ax=p[0]*cosy+p[2]*siny,az=-p[0]*siny+p[2]*cosy,by=p[1]*cosx-az*sinx,bz=p[1]*sinx+az*cosx;return [ax*cosz-by*sinz,ax*sinz+by*cosz,bz];};
    const project=p=>{const q=rotate(p),f=7.5/(7.5-q[2]);return [cx+q[0]*scale*f,cy+q[1]*scale*f,q[2],f];};
    // Inverse camera rotation maps pointer motion to the camera-facing world plane.
    const unproject=(dx,dy)=>{const ax=(dx*cosz+dy*sinz)/scale,by=(-dx*sinz+dy*cosz)/scale,ay=by*cosx,az=-by*sinx;return [ax*cosy-az*siny,ay,ax*siny+az*cosy];};
    return {cx,cy,scale,rotate,project,unproject};
  }
  function stroke3(points,color,lineWidth=1){
    if(points.length<2)return;ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.beginPath();
    points.forEach((p,i)=>{const q=projection.project(p);if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);});ctx.stroke();
  }
  function drawWake(){
    ctx.globalCompositeOperation='screen';
    const quiet=hover==='bio'?.72:1;
    for(const v of vortices){
      const fade=Math.pow(1-v.age/v.life,1.4)*quiet,r=.075+v.age*.095;
      const color=v.sign>0?'109,219,205':'179,159,227';
      // Open, offset filaments reveal rolling vortices without enclosing a tube.
      for(let band=0;band<2;band++){
        const points=[];
        for(let j=0;j<=38;j++){
          const a=j/38*TAU*.87+v.sign*v.age*.8+band*.6;
          const radius=r*(.68+band*.30)*(1+.12*Math.sin(a*3+v.age));
          points.push(add(add(v.p,mul(v.down,Math.cos(a)*radius)),add(mul(v.side,Math.sin(a)*radius),mul(v.axis,Math.sin(a*2+v.age)*.045+band*.035))));
        }
        stroke3(points,`rgba(${color},${fade*(band?.32:.58)})`,band?.6:.85);
      }
    }
    for(const p of particles){
      const fade=Math.sin(Math.min(1,p.age/.28)*Math.PI/2)*Math.pow(1-p.age/p.life,1.25)*quiet;
      const color=p.sign>0?'139,237,217':'179,173,231';
      stroke3(p.history,`rgba(${color},${fade*(.30+p.size*.36)})`,.55+p.size*.45);
      if(p.size>.78){const q=projection.project(p.p);ctx.fillStyle=`rgba(${color},${fade*.8})`;ctx.fillRect(q[0],q[1],1.35,1.35);}
    }
    ctx.globalCompositeOperation='source-over';
  }
  function drawFish(){
    const faces=[],lines=[],geometry=[],light=unit([-.35,-.65,1]);
    hitShapes=[];
    for(let i=0;i<=rings;i++){
      const ring=[];for(let j=0;j<sides;j++)ring.push(world(bodyPoint(i/rings,j/sides*TAU)));geometry.push(ring);
    }
    for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
      const k=(j+1)%sides,verts=[geometry[i][j],geometry[i+1][j],geometry[i+1][k],geometry[i][k]];
      const normal=unit(cross(sub(verts[1],verts[0]),sub(verts[3],verts[0]))),n=projection.rotate(normal);
      if(n[2]<-.08)continue;
      const points=verts.map(projection.project),shade=Math.max(0,dot(n,light)),fresnel=Math.pow(1-Math.max(0,n[2]),2);
      const belly=(Math.cos((j+.5)/sides*TAU)+1)/2;
      const glint=Math.pow(shade,14)*55,boost=fishHover||drag?.mode==='fish'?15:0;
      const r=38+shade*77+belly*18+glint+fresnel*20+boost;
      const g=77+shade*88+belly*19+glint+fresnel*36+boost;
      const b=86+shade*88+belly*17+glint+fresnel*38+boost;
      faces.push({points,depth:points.reduce((s,p)=>s+p[2],0)/4,color:`rgb(${r|0},${g|0},${b|0})`,edge:true});
    }
    function fin(root,outline){
      const pivot=skin(root),edge=outline.map(skin);
      for(let i=0;i<edge.length-1;i++){
        const verts=[pivot,edge[i],edge[i+1]],points=verts.map(projection.project);
        faces.push({points,depth:points.reduce((s,p)=>s+p[2],0)/3,color:'rgba(90,167,169,.40)',edge:false});
      }
      lines.push({points:[pivot,...edge,pivot],color:'rgba(163,229,215,.48)',width:.7});
      for(let i=0;i<edge.length;i++)lines.push({points:[pivot,edge[i]],color:'rgba(143,214,207,.26)',width:.6});
    }
    // A tall dorsal fin, paired pectoral fins and a forked caudal fin make the silhouette readable.
    fin([-.12,-.27,0],[[-.61,-.27,0],[-.38,-.64,.014],[-.18,-.59,.018],[.06,-.47,.016],[.36,-.26,0],[.57,-.16,0]]);
    fin([.37,.17,0],[[.19,.24,0],[.48,.43,0],[.73,.25,0],[.78,.11,0]]);
    for(const side of [-1,1])fin([-.53,.12,side*.16],[[-.41,.14,side*.20],[-.02,.38,side*(.40+.035*Math.sin(fish.phase*.7))],[.05,.26,side*.33],[-.21,.12,side*.13]]);
    const swing=Math.sin(6.2-fish.phase)*.19;
    fin([1.02,0,0],[[1.1,-.07,0],[1.69,-.58,swing],[1.60,-.31,swing*.8],[1.43,-.09,swing*.6],[1.37,0,swing*.5],[1.43,.09,swing*.6],[1.60,.31,swing*.8],[1.69,.58,swing],[1.1,.07,0]]);
    faces.sort((a,b)=>a.depth-b.depth);
    for(const face of faces){
      const p=face.points;ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();
      ctx.fillStyle=face.color;ctx.fill();if(face.edge){ctx.strokeStyle=face.color;ctx.lineWidth=.45;ctx.stroke();}hitShapes.push(p);
    }
    // Sparse surface meridians suggest a computational model while keeping a solid body.
    for(let i=3;i<rings;i+=3){
      let segment=[];
      for(let j=0;j<=sides;j++){
        const a=j%sides,normal=projection.rotate([0,Math.cos(a/sides*TAU),Math.sin(a/sides*TAU)]);
        if(normal[2]>.12)segment.push(geometry[i][a]);else{stroke3(segment,'rgba(184,242,224,.14)',.55);segment=[];}
      }
      stroke3(segment,'rgba(184,242,224,.14)',.55);
    }
    for(const line of lines)stroke3(line.points,line.color,line.width);
    for(const side of [-1,1]){
      const normal=projection.rotate([0,0,side]);if(normal[2]<.08)continue;
      const eye=skin([-.88,-.055,side*.155]),q=projection.project(eye),r=Math.max(2.1,projection.scale*.035*q[3]);
      ctx.fillStyle='#a5e5d3';ctx.beginPath();ctx.ellipse(q[0],q[1],r*.9,r,0,0,TAU);ctx.fill();
      ctx.fillStyle='#08191d';ctx.beginPath();ctx.arc(q[0]-r*.12,q[1],r*.66,0,TAU);ctx.fill();
      ctx.fillStyle='#e5fff0';ctx.beginPath();ctx.arc(q[0]-r*.25,q[1]-r*.25,r*.19,0,TAU);ctx.fill();
      const gill=[];for(let j=0;j<=20;j++){const a=-1.0+j/20*2.4;gill.push(skin([-.64+Math.cos(a)*.095,Math.sin(a)*.235,side*(.14+Math.cos(a)*.055)]));}
      stroke3(gill,'rgba(8,35,38,.8)',1.2);stroke3([skin([-1.20,.025,side*.018]),skin([-1.02,.07,side*.11])],'rgba(13,38,40,.75)',.8);
    }
    const center=projection.project(fish.pos);
    canvas.dataset.fishX=center[0].toFixed(1);canvas.dataset.fishY=center[1].toFixed(1);
    canvas.dataset.wakeCount=String(vortices.length);canvas.dataset.particleCount=String(particles.length);
    if(fishHover||drag?.mode==='fish'){
      ctx.font='9px Consolas, monospace';ctx.fillStyle='rgba(180,229,214,.85)';ctx.textAlign='center';
      ctx.fillText(drag?.mode==='fish'?'SHAPING THE WAKE':'DRAG TO DISTURB THE FLOW',center[0],center[1]+projection.scale*.78);
    }
  }
  function draw(now){
    raf=0;if(document.hidden||dialog.open){previous=0;return;}
    if(previous&&now-previous<30){raf=requestAnimationFrame(draw);return;}
    const dt=previous?Math.min((now-previous)/1000,.065):.033;previous=now;
    const ease=reducedMotion.matches?1:Math.min(1,dt*6);let moving=false;
    for(const key of ['yaw','pitch','roll','zoom']){
      const value=({yaw,pitch,roll,zoom})[key],delta=target[key]-value;if(Math.abs(delta)>.001)moving=true;
      const next=Math.abs(delta)<.001?target[key]:value+delta*ease;
      if(key==='yaw')yaw=next;if(key==='pitch')pitch=next;if(key==='roll')roll=next;if(key==='zoom')zoom=next;
    }
    if(heroPaused&&!dirty&&!moving){previous=0;return;}dirty=false;
    if(!heroPaused){const steps=Math.ceil(dt/(1/30));for(let i=0;i<steps;i++)step(dt/steps);}
    projection=makeProjection();ctx.clearRect(0,0,width,height);
    const {cx,cy,scale}=projection;
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*3.6);
    glow.addColorStop(0,'rgba(43,107,109,.13)');glow.addColorStop(.5,'rgba(24,66,81,.06)');glow.addColorStop(1,'rgba(5,11,16,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    // Quiet suspended particles provide depth, with no enclosing geometry or fake readouts.
    for(let i=0;i<64;i++){
      const p=[((i*.6180339+elapsed*.007)%1)*8-3,Math.sin(i*17.3)*1.65,Math.cos(i*13.7)*1.8];
      const q=projection.project(p);ctx.fillStyle=`rgba(141,192,193,${.12+(i%4)*.035})`;ctx.fillRect(q[0],q[1],i%7===0?1.6:.8,i%7===0?1.6:.8);
    }
    drawWake();drawFish();
    canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.zoom=zoom.toFixed(3);canvas.dataset.direction=focus||'overview';
    $('#zoom-level').value=zoom.toFixed(1)+'×';$('#zoom-out').disabled=target.zoom<=.7;$('#zoom-in').disabled=target.zoom>=1.6;
    if(!heroPaused||moving)raf=requestAnimationFrame(draw);else previous=0;
  }
  function hitFish(x,y){
    return hitShapes.some(poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;});
  }
  function pointer(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function moveFish(delta){
    let next=add(fish.aim,delta);
    const distance=Math.hypot(...next);if(distance>3.6)next=mul(next,3.6/distance);
    const projected=projection.project(next);
    const minY=height<=700?height*.22:100;
    if(projected[0]>=28&&projected[0]<=width-28&&projected[1]>=minY&&projected[1]<=height-120)fish.aim=next;
    if(Math.hypot(delta[0],delta[1])>.008)fish.bearing=Math.atan2(-delta[1],-delta[0]);
    if(heroPaused){fish.pos=fish.aim.slice();fish.heading=fish.bearing;shed(.05);}request();
  }
  function changeZoom(amount){target.zoom=clamp(target.zoom+amount,.7,1.6);request();}
  function reset(){target={yaw:.56,pitch:.46,roll:.10,zoom:1};fish.aim=[0,0,0];fish.bearing=0;if(heroPaused){fish.pos=[0,0,0];fish.heading=0;}request();}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    const p=pointer(e);canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,p);
    drag={...p,mode:hitFish(p.x,p.y)?'fish':'orbit'};canvas.classList.add('dragging');
    if(pointers.size===2){const ps=[...pointers.values()];pinchDistance=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);drag=null;}
    canvas.dataset.interaction=drag?.mode||'pinch';request();
  });
  canvas.addEventListener('pointermove',e=>{
    const p=pointer(e);
    if(!pointers.has(e.pointerId)){const over=hitFish(p.x,p.y);if(fishHover!==over){fishHover=over;canvas.classList.toggle('fish-hover',over);request();}return;}
    pointers.set(e.pointerId,p);
    if(pointers.size===2){const ps=[...pointers.values()],distance=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(pinchDistance>0)changeZoom((distance-pinchDistance)/250);pinchDistance=distance;}
    else if(drag){
      if(drag.mode==='fish')moveFish(projection.unproject(p.x-drag.x,p.y-drag.y));
      else {target.yaw+=(p.x-drag.x)*.006;target.pitch=clamp(target.pitch+(p.y-drag.y)*.005,-1.3,1.3);request();}
      drag.x=p.x;drag.y=p.y;
    }
  });
  const release=e=>{pointers.delete(e.pointerId);pinchDistance=0;drag=pointers.size===1?{...[...pointers.values()][0],mode:'orbit'}:null;if(!pointers.size){canvas.classList.remove('dragging');canvas.dataset.interaction='idle';}request();};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,release));
  canvas.addEventListener('pointerleave',()=>{fishHover=false;canvas.classList.remove('fish-hover');request();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();changeZoom(-Math.sign(e.deltaY)*.08);},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))return;e.preventDefault();
    if(e.shiftKey&&e.key.startsWith('Arrow'))moveFish(projection.unproject(e.key==='ArrowLeft'?-22:e.key==='ArrowRight'?22:0,e.key==='ArrowUp'?-22:e.key==='ArrowDown'?22:0));
    else {if(e.key==='ArrowLeft')target.yaw-=.17;if(e.key==='ArrowRight')target.yaw+=.17;if(e.key==='ArrowUp')target.pitch=clamp(target.pitch-.12,-1.3,1.3);if(e.key==='ArrowDown')target.pitch=clamp(target.pitch+.12,-1.3,1.3);}
    if(e.key==='+'||e.key==='=')changeZoom(.1);if(e.key==='-')changeZoom(-.1);if(e.key==='0')reset();request();
  });
  new ResizeObserver(resize).observe(canvas);resize();
  return {resume:request,hover(key){hover=key;request();},focus(key){focus=key;const views={bio:[.35,.20,.14],physics:[.88,.70,-.12],ai:[-.28,.48,.28]};const p=views[key]||[.56,.46,.10];target={yaw:p[0],pitch:p[1],roll:p[2],zoom:key?1.08:1};request();},zoom:changeZoom,reset};
})();
resumeScene=()=>scene.resume();

$('#field-info').addEventListener('click',()=>openDialog(
  '<p class="eyebrow">INSIDE THE VISUALIZATION</p><h2 id="dialog-title">Flow as a way<br>to explore.</h2><p>The homepage is an interactive, three-dimensional swimming illustration. A flexible fish sheds alternating vortices that carry and curl nearby particles. Drag the fish to change its path and disturb the wake; drag the open water to orbit. Scroll or pinch to zoom. With the scene focused, Shift + arrow keys move the fish, arrow keys rotate, and 0 resets the view. The softened vortex model conveys motion and flow intuitively; it is not a CFD simulation or measured research data.</p><p>Inside the studies, visualisations come from the original research. This archived image uses a calculated-cell CFD snapshot from the Deforming VFM study: anguilliform swimming, St = 0.4, λ* = 1.5, Re = 5,000, at phase 0.00 T. The field is rendered with a dark diverging palette; cyan and copper distinguish opposite signs of vorticity.</p>'+figure('assets/wake-field.png','Archived CFD vorticity, body boundary and velocity streamlines at phase zero','Qualitative field view. Fixed displayed vorticity range: −30 to +30; values outside that range saturate.')+
  '<div class="flow-note"><p>The archived image is a single phase-0 snapshot, not a time-resolved simulation. The complete 64-phase research animation is available in the Deforming VFM study. The interactive fish and wake are a separate illustrative model.</p></div><div class="detail-links">'+external('https://github.com/KCLFlowlab/deforming-vfm','Source data & method')+'</div>'
));
$('#credits-open').addEventListener('click',()=>openDialog(
  '<p class="eyebrow">SOURCES & CREDITS</p><h2 id="dialog-title">Built around real research.</h2><p>Research media are attributed to their authors. Full scientific figures retain their original layouts and color scales; GIFs are transcoded to MP4. The homepage fish and wake are an interactive illustration using prescribed body motion and a simplified vortex-particle model, not a scientific simulation. The archived CFD snapshot is available in About the visual; original scientific animations remain in each study.</p><ul>'+
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
  $('#motion-toggle').setAttribute('aria-label', heroPaused ? 'Play swimmer and wake' : 'Pause swimmer and wake');
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
