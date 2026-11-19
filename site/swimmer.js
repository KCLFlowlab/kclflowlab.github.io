/* KCL FlowLab hero: an interactive swimming illustration rendered with raw WebGL.
   Prescribed travelling-wave kinematics, a follow-the-leader body path and a bounded,
   desingularised 2D point-vortex wake. Built for intuition and interaction: it is not CFD,
   and neither its motion nor its colours carry quantitative meaning. */
'use strict';
window.createSwimmer = function createSwimmer(canvas, hooks = {}) {
  const gl = canvas.getContext('webgl', {antialias: true, alpha: false, depth: true, powerPreference: 'high-performance'});
  if (!gl) return null;

  // ---------- Small vector and matrix helpers (column-major, WebGL convention) ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(eye, center, up) {
    const z = unit(sub(eye, center)), x = unit(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  }
  function multiply(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
    }
    return o;
  }
  function invert(m) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    return [(a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det];
  }
  const apply = (m, p) => [0, 1, 2, 3].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r] * p[3]);

  // ---------- Shaders ----------
  const NODES = 40;
  const fishVertex = `
    precision highp float;
    attribute vec3 aLocal; attribute vec3 aNormal; attribute vec4 aInfo;
    uniform vec4 uSpine[${NODES}]; uniform vec4 uFrame[${NODES}];
    uniform mat4 uViewProj; uniform float uLen, uTime, uRoll, uFlap, uTailLag;
    varying vec3 vWorld, vNormal, vLocal, vLocalNormal; varying vec4 vInfo;
    void main(){
      float f = clamp(aLocal.x, 0.0, 1.0) * ${NODES - 1}.0;
      float i0 = floor(f); float t = f - i0;
      int a = int(i0); int b = int(min(i0 + 1.0, ${NODES - 1}.0));
      vec3 P = mix(uSpine[a].xyz, uSpine[b].xyz, t);
      vec3 F = normalize(mix(uFrame[a].xyz, uFrame[b].xyz, t));
      vec3 S = normalize(cross(F, vec3(0.0, 1.0, 0.0)));
      vec3 U = cross(S, F);
      float roll = uRoll * smoothstep(0.0, 0.6, aLocal.x);
      vec3 S2 = S * cos(roll) + U * sin(roll); vec3 U2 = U * cos(roll) - S * sin(roll);
      vec2 local = aLocal.yz; vec3 n = aNormal; float group = aInfo.w;
      if (group > 0.5 && group < 2.5) {
        // Paired fins rotate about their root; a travelling phase along the span softens the stroke.
        float side = sign(aLocal.y); float span = aNormal.x;
        float theta = group < 1.5 ? 0.42 + 0.30 * sin(uTime * uFlap + aInfo.y * 1.3 + side * 0.7)
                                  : 1.05 + 0.12 * sin(uTime * uFlap * 0.8 + aInfo.y);
        local = vec2(aLocal.y + side * span * cos(theta), aLocal.z - span * sin(theta));
        n = vec3(side * sin(theta), cos(theta), 0.0);
      } else if (group > 3.5) {
        float e = aInfo.y;
        local.x += 0.010 * e * e * sin(uTime * 7.0 + aLocal.x * 22.0);
        if (group < 4.5) local.x += uTailLag * e * (0.55 + 0.45 * abs(aInfo.z));
      }
      vec3 world = P + (S2 * local.x + U2 * local.y) * uLen;
      vWorld = world; vNormal = normalize(S2 * n.x + U2 * n.y + F * n.z);
      vLocal = vec3(aLocal.x, local); vLocalNormal = n; vInfo = aInfo;
      gl_Position = uViewProj * vec4(world, 1.0);
    }`;
  const fishFragment = `
    precision highp float;
    varying vec3 vWorld, vNormal, vLocal, vLocalNormal; varying vec4 vInfo;
    uniform vec3 uEye, uLight, uWater; uniform float uTime, uFog;
    float caustic(vec2 p){
      float c = 0.0; vec2 q = p; float t = uTime * 0.35;
      for (int i = 0; i < 3; i++) { q = vec2(q.x + 0.55 * sin(q.y * 1.7 + t), q.y + 0.55 * cos(q.x * 1.4 - t * 1.1)); c += abs(sin(q.x * 2.2) + sin(q.y * 2.4)); }
      return pow(max(0.0, 1.0 - c * 0.24), 3.0) * 1.6;
    }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 N = normalize(vNormal); vec3 V = normalize(uEye - vWorld); vec3 L = normalize(uLight);
      bool fin = vInfo.x > 0.5;
      if (fin && dot(N, V) < 0.0) N = -N;
      float s = vLocal.x; float ny = vLocalNormal.y; float nx = abs(vLocalNormal.x);
      vec3 col; float alpha = 1.0; float shine = 0.0;
      if (!fin) {
        vec3 back = vec3(0.10, 0.25, 0.28), flank = vec3(0.72, 0.80, 0.82), belly = vec3(0.95, 0.96, 0.94);
        col = mix(flank, back, smoothstep(0.02, 0.62, ny));
        col = mix(col, belly, smoothstep(-0.2, -0.72, ny));
        float bars = sin(s * 92.0 + sin(vLocal.z * 70.0 + s * 18.0) * 1.3);
        col = mix(col, back * 0.55, smoothstep(0.28, 0.85, ny) * smoothstep(0.25, 0.95, bars) * 0.5 * smoothstep(0.1, 0.16, s) * smoothstep(0.8, 0.7, s));
        col *= 1.0 - 0.16 * smoothstep(0.05, 0.0, abs(ny - 0.2)) * smoothstep(0.18, 0.24, s) * smoothstep(0.82, 0.7, s);
        vec2 q = vec2(s * 210.0, atan(vLocalNormal.y, vLocalNormal.x) * 19.0);
        vec2 g = fract(q + vec2(0.0, floor(q.x) * 0.5)) - 0.5;
        float scale = smoothstep(0.5, 0.2, length(g));
        col *= 0.94 + 0.06 * scale * smoothstep(0.7, 0.0, abs(ny));
        float op = 0.172 + 0.02 * ny * ny;
        col *= 1.0 - 0.13 * smoothstep(0.006, 0.0, abs(s - op)) * smoothstep(0.25, 0.45, nx) * smoothstep(-0.8, -0.5, ny) * smoothstep(0.8, 0.5, ny);
        float d = length(vec2(s - 0.061, vLocal.z - 0.020));
        float onSide = smoothstep(0.3, 0.5, nx);
        if (d < 0.021 && onSide > 0.0) {
          float r = 0.0165;
          vec3 iris = mix(vec3(0.85, 0.66, 0.30), vec3(0.42, 0.33, 0.16), smoothstep(0.0, r, d));
          vec3 eye = mix(iris, vec3(0.015), smoothstep(r * 0.62, r * 0.52, d));
          eye = mix(eye, vec3(0.12, 0.16, 0.16), smoothstep(r * 0.95, r * 1.1, d));
          float glint = smoothstep(0.0042, 0.0018, length(vec2(s - 0.057, vLocal.z - 0.0255)));
          col = mix(col, eye + glint, onSide * smoothstep(0.021, 0.0185, d));
          shine = 1.0;
        }
        shine = max(shine, smoothstep(0.75, -0.1, ny) * 0.9);
      } else {
        float rays = vInfo.w < 4.5 && vInfo.w > 3.5 ? abs(sin(vInfo.z * 22.0)) : abs(sin(vInfo.z * 40.0));
        col = mix(vec3(0.50, 0.64, 0.67), vec3(0.20, 0.36, 0.42), smoothstep(0.65, 1.0, rays) * 0.75);
        col = mix(col, vec3(0.16, 0.28, 0.33), vInfo.y * 0.35);
        alpha = (0.86 - 0.42 * vInfo.y) * (0.82 + 0.18 * rays);
      }
      float diffuse = 0.42 + 0.95 * max(dot(N, L), 0.0);
      vec3 light = vec3(diffuse) + vec3(0.18, 0.40, 0.46) * max(-N.y, 0.0) * 0.35;
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 80.0) * (0.25 + 0.95 * shine) + pow(max(dot(N, H), 0.0), 10.0) * 0.06;
      float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
      vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres * 0.9 + vec3(0.0, 0.33, 0.67)));
      col = col * light + spec * vec3(0.92, 0.98, 1.0) + fres * mix(vec3(0.25, 0.58, 0.66), irid * 0.5, 0.35 * shine) * 0.5;
      col += caustic(vWorld.xz * 1.25) * max(N.y, 0.0) * 0.22 * vec3(0.72, 0.95, 1.0);
      float dist = length(uEye - vWorld);
      col = mix(col, uWater, smoothstep(uFog * 1.05, uFog * 2.6, dist) * 0.55);
      col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
      gl_FragColor = vec4(col, alpha);
    }`;
  const pointVertex = `
    precision highp float;
    attribute vec3 aPos; attribute vec3 aParam;
    uniform mat4 uViewProj; uniform float uScale;
    varying float vAlpha; varying float vHue;
    void main(){
      gl_Position = uViewProj * vec4(aPos, 1.0);
      gl_PointSize = max(1.0, aParam.x * uScale / gl_Position.w);
      vAlpha = aParam.y; vHue = aParam.z;
    }`;
  const pointFragment = `
    precision mediump float;
    varying float vAlpha; varying float vHue;
    void main(){
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = vAlpha * pow(max(0.0, 1.0 - d), 1.6);
      vec3 c = vHue < 0.5 ? vec3(0.50, 0.93, 0.92) : vHue < 1.5 ? vec3(0.70, 0.68, 1.0) : vHue < 2.5 ? vec3(0.95, 1.0, 0.98) : vec3(0.62, 0.80, 0.84);
      gl_FragColor = vec4(c, a);
    }`;
  const backVertex = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const backFragment = `
    precision mediump float;
    uniform vec2 uRes; uniform float uTime;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec3 bottom = vec3(0.004, 0.024, 0.036), middle = vec3(0.012, 0.078, 0.102), top = vec3(0.038, 0.165, 0.198);
      vec3 col = mix(bottom, middle, smoothstep(0.0, 0.55, uv.y));
      col = mix(col, top, smoothstep(0.55, 1.05, uv.y));
      float glow = exp(-pow((uv.x - 0.6) * 1.5, 2.0) - pow((1.0 - uv.y) * 2.3, 2.0));
      col += vec3(0.04, 0.14, 0.15) * glow * 0.7;
      float x = uv.x * uRes.x / uRes.y + uv.y * 0.32;
      float rays = pow(max(0.0, sin(x * 6.5 + uTime * 0.05)), 16.0) + 0.8 * pow(max(0.0, sin(x * 10.7 - uTime * 0.04 + 1.7)), 20.0) + 0.6 * pow(max(0.0, sin(x * 3.9 + uTime * 0.03 + 3.0)), 12.0);
      col += vec3(0.10, 0.24, 0.24) * rays * smoothstep(0.2, 1.0, uv.y) * 0.16;
      vec2 c = uv - 0.5; col *= 1.0 - dot(c, c) * 0.6;
      col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }`;
  function program(vs, fs) {
    const make = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, make(gl.VERTEX_SHADER, vs)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const info = {p, a: {}, u: {}};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; info.a[n] = gl.getAttribLocation(p, n); }
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name.replace('[0]', ''); info.u[n] = gl.getUniformLocation(p, n); }
    return info;
  }
  let fishProg, pointProg, backProg;
  try { fishProg = program(fishVertex, fishFragment); pointProg = program(pointVertex, pointFragment); backProg = program(backVertex, backFragment); }
  catch (error) { console.warn('Swimmer unavailable:', error.message); return null; }

  // ---------- Procedural fish geometry (units: body lengths; s runs head 0 → tail 1) ----------
  const BODY_END = 0.80;
  function bodyHalf(s) {
    const x = clamp(s / BODY_END, 0, 1);
    const nose = Math.pow(Math.min(x / 0.17, 1), 0.48);
    const h = (0.024 + 0.104 * Math.pow(Math.sin(Math.PI * Math.pow(x, 0.68)), 0.95)) * nose;
    return [h * (0.50 + 0.22 * (1 - x)), h];
  }
  const verts = [], idx = [];
  const vertex = (local, normal, info) => { verts.push(...local, ...normal, ...info); return verts.length / 10 - 1; };
  const RINGS = 110, SEG = 44;
  for (let i = 0; i <= RINGS; i++) {
    const s = BODY_END * Math.pow(i / RINGS, 1.15);
    const [w, h] = bodyHalf(s), e = 1e-3, [w1, h1] = bodyHalf(s + e), [w0, h0] = bodyHalf(Math.max(0, s - e));
    const dw = (w1 - w0) / (2 * e), dh = (h1 - h0) / (2 * e);
    for (let j = 0; j <= SEG; j++) {
      const a = j / SEG * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const ds = [dw * c, dh * sn, -1], da = [-w * sn, h * c, 0];
      let n = cross(ds, da); n = Math.hypot(...n) < 1e-6 ? [0, 0, 1] : unit(n);
      vertex([s, w * c, h * sn], n, [0, 0, 0, 0]);
    }
  }
  const tip = vertex([BODY_END + 0.012, 0, 0], [0, 0, -1], [0, 0, 0, 0]);
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
    const a = i * (SEG + 1) + j, b = a + SEG + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  for (let j = 0; j < SEG; j++) idx.push(RINGS * (SEG + 1) + j, tip, RINGS * (SEG + 1) + j + 1);
  const bodyCount = idx.length;
  function grid(nu, nv, make) {
    const start = verts.length / 10;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) make(i / nu, j / nv);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = start + i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  grid(14, 24, (u, t) => { // Forked caudal fin.
    const v = t * 2 - 1, edge = BODY_END + 0.20 * (0.6 + 0.4 * Math.pow(Math.abs(v), 1.25));
    const s = BODY_END - 0.02 + u * (edge - BODY_END + 0.02), half = 0.022 + 0.17 * Math.pow(u, 0.85);
    vertex([s, 0, v * half], [1, 0, 0], [1, u, v, 4]);
  });
  grid(16, 8, (u, e) => { // Dorsal fin.
    const base = 0.29 + 0.25 * u, height = 0.088 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.55)), 0.8);
    vertex([base + 0.065 * e * (0.35 + 0.65 * u), 0, bodyHalf(base)[1] * 0.95 + e * height], [1, 0, 0], [1, e, u, 5]);
  });
  grid(12, 6, (u, e) => { // Anal fin.
    const base = 0.58 + 0.13 * u, height = 0.052 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.55)), 0.8);
    vertex([base + 0.04 * e * (0.4 + 0.6 * u), 0, -(bodyHalf(base)[1] * 0.95 + e * height)], [1, 0, 0], [1, e, u, 5]);
  });
  for (const side of [1, -1]) {
    grid(8, 8, (u, e) => { // Pectoral fins.
      const base = 0.20 + 0.03 * u, [w, h] = bodyHalf(base);
      vertex([base + 0.075 * e * (0.7 + 0.5 * u), side * w * 0.86, -0.32 * h], [e * 0.088 * (1 - 0.45 * u) + 0.004, 0, 0], [1, e, u, 1]);
    });
    grid(6, 6, (u, e) => { // Pelvic fins.
      const base = 0.43 + 0.025 * u, [w, h] = bodyHalf(base);
      vertex([base + 0.05 * e, side * w * 0.45, -0.86 * h], [e * 0.046 * (1 - 0.4 * u) + 0.003, 0, 0], [1, e, u, 2]);
    });
  }
  const fishBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fishBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const indexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const finCount = idx.length - bodyCount;
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pointBuffer = gl.createBuffer();

  // ---------- Simulation state ----------
  const LEN = 2.0, SEG_LEN = LEN / (NODES - 1);
  const phone = () => Math.min(innerWidth, innerHeight) < 600;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let W = 1, H = 1, dpr = 1, viewProj = null, inverse = null, eye = [0, 9, 8], camDist = 13, bounds = {minX: -4, maxX: 4, minZ: -2, maxZ: 2};
  const fish = {pos: [0, 0, 0], heading: 0, speed: 1.2, omega: 0, phase: 0, amp: 1, burst: 0, roll: 0, tailLag: 0, lastLat: 0, lastVel: 0};
  let chain = [], spine = new Float32Array(NODES * 4), frames = new Float32Array(NODES * 4);
  const vortices = [], dye = [], ambient = [];
  let time = 0, mode = 'intro', readySent = false, frameCount = 0;
  const pointer = {inside: false, target: null, moved: -1e9, screen: [0, 0], parallax: [0, 0]};
  const cam = [0, 0];
  const keys = new Set(); let lastKey = -1e9;
  let random = (() => { let seed = 7; return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296; })();

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = W / H;
    camDist = 10.2 * (aspect < 1 ? 0.62 * 1.5 / aspect : Math.max(1, 1.5 / aspect));
    camera(); computeBounds(); draw();
  }
  function camera() {
    const px = cam[0], py = cam[1];
    eye = [px * 0.6, camDist * 0.74 + py * 0.4, camDist * 0.62];
    const view = lookAt(eye, [px * 0.25, 0, 0.35], [0, 1, 0]);
    viewProj = multiply(perspective(0.6, W / H, 0.5, 120), view); inverse = invert(viewProj);
  }
  function toPlane(nx, ny) {
    const a = apply(inverse, [nx, ny, -1, 1]), b = apply(inverse, [nx, ny, 1, 1]);
    const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    const t = -p0[1] / (p1[1] - p0[1]);
    return add(p0, mul(sub(p1, p0), t));
  }
  function computeBounds() {
    const top = toPlane(0.82, 0.72), bottom = toPlane(0.82, -0.72);
    const half = Math.min(Math.abs(top[0]), Math.abs(bottom[0]));
    bounds = {minX: -half, maxX: half, minZ: top[2], maxZ: bottom[2]};
  }
  function screenOf(p) { const c = apply(viewProj, [p[0], p[1], p[2], 1]); return [(c[0] / c[3] * 0.5 + 0.5) * W, (0.5 - c[1] / c[3] * 0.5) * H]; }
  function resetChain() { chain = Array.from({length: NODES}, (_, i) => sub(fish.pos, mul([Math.cos(fish.heading), 0, Math.sin(fish.heading)], i * SEG_LEN))); }
  function seedAmbient() {
    ambient.length = 0;
    const n = phone() ? 150 : 260;
    for (let i = 0; i < n; i++) ambient.push({p: [bounds.minX * 1.4 + random() * (bounds.maxX - bounds.minX) * 1.4, -2.4 + random() * 3.4, bounds.minZ * 1.3 + random() * (bounds.maxZ - bounds.minZ) * 1.5], drift: [(random() - .5) * .05, .015 + random() * .02, (random() - .5) * .05], size: 2 + random() * 2.6, alpha: .12 + random() * .2});
  }

  // Desingularised (Lamb–Oseen-like) point vortices in the swimming plane.
  function velocityAt(x, z, skip = -1) {
    let u = 0, w = 0;
    for (let i = 0; i < vortices.length; i++) {
      if (i === skip) continue;
      const v = vortices[i], dx = x - v.x, dz = z - v.z, k = v.g / (2 * Math.PI * (dx * dx + dz * dz + v.core2));
      u += -dz * k; w += dx * k;
    }
    const m = Math.hypot(u, w); if (m > 2.6) { u *= 2.6 / m; w *= 2.6 / m; }
    return [u, w];
  }
  function steerTarget() {
    const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2, hx = (bounds.maxX - bounds.minX) / 2, hz = (bounds.maxZ - bounds.minZ) / 2;
    if (mode === 'intro') return [cx + hx * 0.18, 0, cz + hz * 0.25 * Math.sin(time * 1.1)];
    if (pointer.target && (pointer.inside || time - pointer.moved < 2.5) && time - pointer.moved < 8) return pointer.target;
    return [cx + hx * 0.55 * Math.sin(time * 0.11 + 0.6), 0, cz + hz * 0.45 * Math.sin(time * 0.17 + 1.2)];
  }
  function keyboardDirection() {
    let x = 0, z = 0;
    if (keys.has('left')) x -= 1; if (keys.has('right')) x += 1; if (keys.has('up')) z -= 1; if (keys.has('down')) z += 1;
    return x || z ? Math.atan2(z, x) : null;
  }
  function update(dt) {
    time += dt;
    if (mode === 'intro' && time > 2.6) ready();
    for (const i of [0, 1]) cam[i] += (pointer.parallax[i] - cam[i]) * (1 - Math.exp(-dt * 1.5));
    camera();
    const keyAngle = keyboardDirection(), keyboard = keyAngle !== null || time - lastKey < 1.6;
    let omegaDesired, speedDesired;
    if (keyboard) {
      const err = keyAngle === null ? 0 : wrap(keyAngle - fish.heading);
      omegaDesired = clamp(err * 3.2, -2.9, 2.9);
      speedDesired = keyAngle === null ? 0.9 : 2.1;
    } else {
      const target = steerTarget(), dx = target[0] - fish.pos[0], dz = target[2] - fish.pos[2], dist = Math.hypot(dx, dz);
      const err = wrap(Math.atan2(dz, dx) - fish.heading), limit = Math.min(3.4, 0.8 + fish.speed * 1.7);
      omegaDesired = clamp(err * 3.2, -limit, limit) * smooth(0.12, 0.7, dist / LEN);
      speedDesired = clamp(dist * 0.8, 0.38, 2.3) * (Math.abs(err) > 1.7 ? 0.65 : 1);
    }
    // Soft walls: turn back towards the visible water before leaving it.
    const margin = LEN * 0.35;
    if (mode !== 'intro' && (fish.pos[0] < bounds.minX + margin || fish.pos[0] > bounds.maxX - margin || fish.pos[2] < bounds.minZ + margin || fish.pos[2] > bounds.maxZ - margin)) {
      const home = Math.atan2(-fish.pos[2] + (bounds.minZ + bounds.maxZ) / 2, -fish.pos[0]);
      omegaDesired += clamp(wrap(home - fish.heading) * 2.4, -2.2, 2.2);
    }
    speedDesired += fish.burst * 3.0;
    fish.burst *= Math.exp(-dt * 2.0);
    fish.omega += (omegaDesired - fish.omega) * (1 - Math.exp(-dt * 6));
    fish.heading = wrap(fish.heading + fish.omega * dt);
    fish.speed += (speedDesired - fish.speed) * (1 - Math.exp(-dt * (speedDesired > fish.speed ? 3.0 : 1.3)));
    fish.pos = add(fish.pos, [Math.cos(fish.heading) * fish.speed * dt, 0, Math.sin(fish.heading) * fish.speed * dt]);
    fish.pos[1] = 0.05 * Math.sin(time * 0.8);
    const frequency = 1.15 + 1.05 * fish.speed;
    fish.phase += Math.PI * 2 * frequency * dt;
    const ampTarget = 0.72 + 0.16 * Math.min(fish.speed, 2.6) + 0.55 * fish.burst + 0.22 * Math.min(Math.abs(fish.omega), 2);
    fish.amp += (ampTarget - fish.amp) * (1 - Math.exp(-dt * 4));
    fish.roll += (clamp(-fish.omega * 0.11, -0.28, 0.28) - fish.roll) * (1 - Math.exp(-dt * 4));

    // Follow-the-leader centreline with a bending limit, so turns travel down the body.
    chain[0] = fish.pos.slice();
    for (let i = 1; i < NODES; i++) {
      let d = sub(chain[i], chain[i - 1]);
      let a = Math.atan2(d[2], d[0]);
      if (!Number.isFinite(a) || Math.hypot(d[0], d[2]) < 1e-6) a = fish.heading + Math.PI;
      const prev = i > 1 ? Math.atan2(chain[i - 1][2] - chain[i - 2][2], chain[i - 1][0] - chain[i - 2][0]) : fish.heading + Math.PI;
      const bend = wrap(a - prev), limit = 0.085;
      if (Math.abs(bend) > limit) a = prev + Math.sign(bend) * limit;
      const y = clamp(d[1], -SEG_LEN * 0.3, SEG_LEN * 0.3);
      chain[i] = add(chain[i - 1], [Math.cos(a) * SEG_LEN, y, Math.sin(a) * SEG_LEN]);
    }
    // Carangiform travelling wave: small head yaw, amplitude growing towards the tail.
    const points = [];
    for (let i = 0; i < NODES; i++) {
      const s = i / (NODES - 1), a = chain[Math.max(0, i - 1)], b = chain[Math.min(NODES - 1, i + 1)];
      const t = unit(sub(b, a)), n = [-t[2], 0, t[0]];
      const lateral = LEN * (0.02 - 0.06 * s + 0.14 * s * s) * fish.amp * Math.sin(Math.PI * 2 * s / 0.95 - fish.phase);
      points.push(add(chain[i], mul(n, lateral)));
      if (i === NODES - 1) {
        const velocity = (lateral - fish.lastLat) / Math.max(dt, 1e-3);
        fish.tailLag += (clamp(velocity * 0.012, -0.06, 0.06) - fish.tailLag) * (1 - Math.exp(-dt * 10));
        if (velocity * fish.lastVel < 0 && fish.speed > 0.25 && time > 0.2) shed(points[i], mul(n, Math.sign(lateral) || 1), t);
        fish.lastLat = lateral; fish.lastVel = velocity;
      }
    }
    for (let i = 0; i < NODES; i++) {
      const f = unit(sub(points[Math.max(0, i - 1)], points[Math.min(NODES - 1, i + 1)]));
      spine.set([...points[i], 0], i * 4); frames.set([...f, 0], i * 4);
    }

    // Wake vortices advect each other, diffuse and fade.
    const velocities = vortices.map((v, i) => velocityAt(v.x, v.z, i));
    for (let i = vortices.length - 1; i >= 0; i--) {
      const v = vortices[i]; v.age += dt; v.x += velocities[i][0] * dt; v.z += velocities[i][1] * dt;
      v.g *= Math.exp(-dt / 5.5); v.core2 += 0.012 * dt;
      if (v.age > 9) vortices.splice(i, 1);
    }
    // Dye from the trailing edge marks the wake; ambient particles show the stirred water.
    const tail = points[NODES - 1], rate = 130 * (0.35 + Math.min(fish.speed, 2.5) / 2.5);
    dyeClock += dt * rate;
    while (dyeClock > 1) {
      dyeClock -= 1;
      const side = random() < 0.5 ? 1 : -1, jitter = (random() - 0.5) * 0.12;
      dye.push({p: [tail[0] + jitter, tail[1] + (random() - 0.5) * 0.05, tail[2] + (random() - 0.5) * 0.12], v: [0, 0], age: 0, life: 3.4 + random() * 2.4, size: 13 + random() * 9, hue: side > 0 ? 0 : 1});
    }
    const maxDye = phone() ? 700 : 1400;
    if (dye.length > maxDye) dye.splice(0, dye.length - maxDye);
    for (let i = dye.length - 1; i >= 0; i--) {
      const d = dye[i]; d.age += dt; if (d.age > d.life) { dye.splice(i, 1); continue; }
      const [u, w] = velocityAt(d.p[0], d.p[2]);
      d.v[0] *= Math.exp(-dt * 2.2); d.v[1] *= Math.exp(-dt * 2.2);
      d.p[0] += (u + d.v[0]) * dt; d.p[2] += (w + d.v[1]) * dt; d.p[1] += 0.02 * dt;
    }
    const pushers = [0, 6, 12, 18, 24, 30].map(i => points[i]);
    for (const a of ambient) {
      const [u, w] = velocityAt(a.p[0], a.p[2]), k = Math.exp(-a.p[1] * a.p[1] * 0.9);
      a.p[0] += (a.drift[0] + u * k) * dt; a.p[1] += a.drift[1] * dt * 0.4; a.p[2] += (a.drift[2] + w * k) * dt;
      for (const q of pushers) {
        const dx = a.p[0] - q[0], dy = a.p[1] - q[1], dz = a.p[2] - q[2], r = Math.hypot(dx, dy, dz);
        if (r < 0.42 && r > 1e-4) { const push = (0.42 - r) * (1.2 + fish.speed) * dt * 2.4 / r; a.p[0] += dx * push; a.p[1] += dy * push; a.p[2] += dz * push; }
      }
      const spanX = (bounds.maxX - bounds.minX) * 0.75, spanZ = (bounds.maxZ - bounds.minZ) * 0.8;
      if (a.p[0] < bounds.minX * 1.45) a.p[0] += spanX * 2.9; else if (a.p[0] > bounds.maxX * 1.45) a.p[0] -= spanX * 2.9;
      if (a.p[2] < bounds.minZ * 1.35) a.p[2] += spanZ * 2.6; else if (a.p[2] > bounds.maxZ + spanZ * 0.3) a.p[2] -= spanZ * 2.6;
      if (a.p[1] > 1.2) a.p[1] = -2.4;
    }
  }
  let dyeClock = 0;
  function shed(at, side, tailward) {
    // Thrust wake (reverse von Kármán street): each vortex is signed so that the induced jet between rows points away from the fish.
    const strength = 1.25 * fish.speed * fish.amp + 0.8 * fish.burst;
    const perp = [-side[2], side[0]], sign = -Math.sign(perp[0] * tailward[0] + perp[1] * tailward[2]) || 1;
    vortices.push({x: at[0] + side[0] * 0.04, z: at[2] + side[2] * 0.04, g: sign * strength, core2: 0.022, age: 0});
    if (vortices.length > 40) vortices.shift();
  }
  function ripple(p) {
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2;
      dye.push({p: [p[0], 0.02, p[2]], v: [Math.cos(a) * 0.9, Math.sin(a) * 0.9], age: 0, life: 1.1, size: 3, hue: 2});
    }
  }
  function ready() {
    if (mode === 'intro') mode = 'free';
    if (!readySent) { readySent = true; hooks.onReady?.(); }
  }

  // ---------- Rendering ----------
  const pointData = new Float32Array((1400 + 260 + 80) * 6);
  function bindFish() {
    gl.useProgram(fishProg.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, fishBuffer); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    const stride = 40;
    gl.enableVertexAttribArray(fishProg.a.aLocal); gl.vertexAttribPointer(fishProg.a.aLocal, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(fishProg.a.aNormal); gl.vertexAttribPointer(fishProg.a.aNormal, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(fishProg.a.aInfo); gl.vertexAttribPointer(fishProg.a.aInfo, 4, gl.FLOAT, false, stride, 24);
    const u = fishProg.u;
    gl.uniformMatrix4fv(u.uViewProj, false, new Float32Array(viewProj));
    gl.uniform4fv(u.uSpine, spine); gl.uniform4fv(u.uFrame, frames);
    gl.uniform1f(u.uLen, LEN); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uRoll, fish.roll); gl.uniform1f(u.uFlap, 3.2 + fish.speed * 0.8); gl.uniform1f(u.uTailLag, fish.tailLag);
    gl.uniform1f(u.uFog, camDist); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uLight, unit([0.35, 1.0, 0.3])); gl.uniform3fv(u.uWater, [0.02, 0.09, 0.115]);
  }
  function draw() {
    if (!viewProj || !chain.length) return;
    gl.clearColor(0.01, 0.05, 0.07, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(backProg.p); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(backProg.a.aPos); gl.vertexAttribPointer(backProg.a.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(backProg.u.uRes, canvas.width, canvas.height); gl.uniform1f(backProg.u.uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(backProg.a.aPos);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    bindFish();
    gl.drawElements(gl.TRIANGLES, bodyCount, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, finCount, gl.UNSIGNED_SHORT, bodyCount * 2);
    [fishProg.a.aLocal, fishProg.a.aNormal, fishProg.a.aInfo].forEach(a => gl.disableVertexAttribArray(a));
    let n = 0;
    const put = (p, size, alpha, hue) => { if (n * 6 >= pointData.length) return; pointData.set([p[0], p[1], p[2], size, alpha, hue], n * 6); n++; };
    for (const a of ambient) put(a.p, a.size, a.alpha, 3);
    for (const d of dye) { const life = 1 - d.age / d.life; put(d.p, d.size * (d.hue === 2 ? 0.6 : 0.7 + 0.8 * (1 - life)), (d.hue === 2 ? 0.7 : 0.075) * Math.pow(life, 1.2), d.hue); }
    gl.useProgram(pointProg.p); gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer); gl.bufferData(gl.ARRAY_BUFFER, pointData.subarray(0, n * 6), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(pointProg.a.aPos); gl.vertexAttribPointer(pointProg.a.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(pointProg.a.aParam); gl.vertexAttribPointer(pointProg.a.aParam, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(pointProg.u.uViewProj, false, new Float32Array(viewProj)); gl.uniform1f(pointProg.u.uScale, camDist * dpr);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disableVertexAttribArray(pointProg.a.aPos); gl.disableVertexAttribArray(pointProg.a.aParam);
    gl.depthMask(true); gl.disable(gl.BLEND);
    frameCount++;
    if (frameCount % 3 === 0 || !running) report();
  }
  function report() {
    const head = screenOf(fish.pos), d = canvas.dataset;
    d.renderer = 'webgl'; d.mode = mode; d.fishX = head[0].toFixed(1); d.fishY = head[1].toFixed(1);
    d.speed = fish.speed.toFixed(3); d.heading = fish.heading.toFixed(3); d.vortices = vortices.length; d.dye = dye.length; d.ambient = ambient.length; d.frames = frameCount;
  }

  // ---------- Loop: autonomous motion respects pause/reduced motion; direct input always animates briefly ----------
  let raf = 0, last = 0, running = false, visible = true, paused = false, activeUntil = 0;
  const now = () => performance.now() / 1000;
  const autoplay = () => !paused && !reduced.matches;
  const allowed = () => visible && !document.hidden && !(hooks.isBlocked && hooks.isBlocked());
  function loop(ts) {
    raf = 0; const t = ts / 1000, dt = last ? Math.min(0.05, Math.max(0.001, t - last)) : 1 / 60; last = t;
    running = true; update(dt); draw();
    if (allowed() && (autoplay() || now() < activeUntil)) raf = requestAnimationFrame(loop); else { running = false; last = 0; report(); }
  }
  function kick() { if (!raf && allowed() && (autoplay() || now() < activeUntil)) raf = requestAnimationFrame(loop); }
  // Clicks and keys end the opening; plain pointer movement only guides the fish once the opening is over.
  function interact(seconds = 3, decisive = true) { activeUntil = Math.max(activeUntil, now() + seconds); if (decisive) ready(); kick(); }

  // ---------- Input ----------
  function planeFromEvent(e) {
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    pointer.screen = [x, y];
    const p = toPlane(x * 2 - 1, 1 - y * 2);
    return [clamp(p[0], bounds.minX + 0.3, bounds.maxX - 0.3), 0, clamp(p[2], bounds.minZ + 0.3, bounds.maxZ - 0.3)];
  }
  let lastClient = null;
  canvas.addEventListener('pointermove', e => {
    // Browsers emit synthetic moves under a resting cursor (on load, after layout); only real movement counts.
    const moved = lastClient && Math.hypot(e.clientX - lastClient[0], e.clientY - lastClient[1]) > 0.5;
    lastClient = [e.clientX, e.clientY];
    if (!moved) return;
    pointer.inside = true; pointer.target = planeFromEvent(e); pointer.moved = time;
    pointer.parallax = [(pointer.screen[0] - 0.5) * 2, (0.5 - pointer.screen[1]) * 2];
    if (e.pointerType === 'mouse') interact(2.5, false);
  });
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointer.inside = e.pointerType === 'mouse'; pointer.target = planeFromEvent(e); pointer.moved = time;
    fish.burst = Math.min(1.2, fish.burst + 0.9); ripple(pointer.target); interact(3.5);
  });
  const keyMap = {ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down'};
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const steer = hooks.canSteer ? hooks.canSteer(e) : document.activeElement === canvas;
    if (!steer) return;
    if (e.key === 'Shift') { fish.burst = Math.min(1.2, fish.burst + 0.8); interact(3); return; }
    const dir = keyMap[e.key]; if (!dir) return;
    e.preventDefault(); keys.add(dir); lastKey = time; interact(3);
  });
  addEventListener('keyup', e => { const dir = keyMap[e.key]; if (dir) { keys.delete(dir); lastKey = time; } });
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; hooks.onLost?.(); });
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  reduced.addEventListener('change', () => { if (reduced.matches) ready(); kick(); });

  // ---------- Start: the swimmer enters from the left; with reduced motion it rests in view ----------
  resize();
  if (reduced.matches) { fish.pos = [(bounds.minX + bounds.maxX) * 0.5 + 0.6, 0, (bounds.minZ + bounds.maxZ) * 0.5]; fish.speed = 0.6; }
  else fish.pos = [bounds.minX - LEN * 1.4, 0, (bounds.minZ + bounds.maxZ) * 0.5 + 0.4];
  resetChain(); seedAmbient();
  for (let i = 0; i < 4; i++) update(1 / 60);
  time = 0;
  if (reduced.matches) ready();
  draw(); kick();

  return {
    setVisible(v) { visible = v; if (v) kick(); },
    setPaused(v) { paused = v; if (!v) kick(); else report(); },
    get paused() { return paused; },
    kick, resize,
    get autoplaying() { return autoplay(); }
  };
};
