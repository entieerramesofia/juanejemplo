// ═══════════════════════════════════════════════════════════════════
//  GEOMETRÍA SAGRADA GLOW 3D — Three.js r128
//  HTML mínimo necesario:
//    <div id="wrap"><canvas id="c"></canvas></div>
//    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
//    <script src="geometria_sagrada_glow_3d.js"></script>
//
//  CSS sugerido:
//    #wrap { width:100vw; height:100vh; background:#00010a; overflow:hidden; }
//    canvas { display:block; width:100%; height:100%; }
// ═══════════════════════════════════════════════════════════════════

const wrap = document.getElementById('wrap');
const cv   = document.getElementById('c');
let W = wrap.clientWidth, H = wrap.clientHeight;

const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x00010a, 1);

const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x00010a, 0.0016);

const camera = new THREE.PerspectiveCamera(68, W / H, 0.5, 3000);
camera.position.set(0, 90, 400);
camera.lookAt(0, 0, 0);

const PHI = 1.6180339887;
const R   = 80;

// ── Orbit control ─────────────────────────────────────────────────
let drag = false, px = 0, py = 0;
let sph  = { theta: 0.4, phi: 1.15, r: 400 };

wrap.addEventListener('mousedown', e => { drag = true; px = e.clientX; py = e.clientY; });
window.addEventListener('mouseup', () => drag = false);
window.addEventListener('mousemove', e => {
  if (!drag) return;
  sph.theta -= (e.clientX - px) * 0.004; px = e.clientX;
  sph.phi = Math.max(0.15, Math.min(Math.PI - 0.15, sph.phi - (e.clientY - py) * 0.004)); py = e.clientY;
});
wrap.addEventListener('wheel', e => {
  sph.r = Math.max(60, Math.min(1200, sph.r + e.deltaY * 0.5));
  e.preventDefault();
}, { passive: false });

let ltd = 0;
wrap.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { drag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; }
  if (e.touches.length === 2) ltd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
}, { passive: true });
wrap.addEventListener('touchend', () => drag = false, { passive: true });
wrap.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && drag) {
    sph.theta -= (e.touches[0].clientX - px) * 0.004; px = e.touches[0].clientX;
    sph.phi = Math.max(0.15, Math.min(Math.PI - 0.15, sph.phi - (e.touches[0].clientY - py) * 0.004)); py = e.touches[0].clientY;
  }
  if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    sph.r = Math.max(60, Math.min(1200, sph.r - (d - ltd) * 0.8)); ltd = d;
  }
  e.preventDefault();
}, { passive: false });

// ── Tiempo global ─────────────────────────────────────────────────
let T = 0;

// Pool de geometrías dinámicas (animadas cada frame)
const dynamicLines = []; // { geo, arr, fn, npts }

// ── Helpers ───────────────────────────────────────────────────────
function hsl(h, s, l) {
  const c = new THREE.Color();
  c.setHSL(h, s, l);
  return c;
}

// Simula bloom con 3 capas superpuestas de LineBasicMaterial
function glowMat(h, s, l, op) {
  return new THREE.LineBasicMaterial({ color: hsl(h, s, l), transparent: true, opacity: op });
}

// Línea estática con capas de glow
function addGlow(pts, h, s, basOp, fade) {
  const op = basOp * fade;
  // núcleo brillante
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), glowMat(h, s,        1.00, op * 0.95)));
  // capa media
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), glowMat(h, s * 0.7,  0.75, op * 0.45)));
  // halo exterior (hue desplazado)
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), glowMat((h + 0.04) % 1, s * 0.5, 0.55, op * 0.18)));
}

// Línea dinámica animada con 3 capas de glow
// fn(t) debe devolver un Float32Array de npts*3 posiciones
function addDynGlow(fn, npts, h, s, basOp, fade) {
  const op = basOp * fade;
  if (op < 0.02) return;

  function makeDyn(opLayer, hs, ls) {
    const arr = new Float32Array(npts * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    scene.add(new THREE.Line(geo, glowMat(hs, s * 0.8 + 0.2 * ls, 0.6 + 0.4 * ls, op * opLayer)));
    dynamicLines.push({ geo, arr, fn, npts });
  }

  makeDyn(0.90,  h,              1.0);
  makeDyn(0.40,  h,              0.65);
  makeDyn(0.15, (h + 0.04) % 1, 0.4);
}

function circlePts(cx, cy, cz, r, n, axis) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (axis === 'z') pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz));
    if (axis === 'x') pts.push(new THREE.Vector3(cx, cy + Math.cos(a) * r, cz + Math.sin(a) * r));
    if (axis === 'y') pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r));
  }
  return pts;
}

// ── Construcción de cada tile de geometría sagrada ────────────────
const GRID = 3;
const STEP = R * 3.46;

function buildTile(ox, oy, oz, fade, isCentral) {

  // ── 1. Flor de la Vida ─────────────────────────────────────────
  const centers = [{ x: ox, y: oy, z: oz }];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 / 6) * i;
    centers.push({ x: ox + Math.cos(a) * R, y: oy + Math.sin(a) * R, z: oz });
  }
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 / 6) * i, a2 = a + Math.PI / 6;
    centers.push({ x: ox + Math.cos(a)  * R * 2,             y: oy + Math.sin(a)  * R * 2,             z: oz });
    centers.push({ x: ox + Math.cos(a2) * R * Math.sqrt(3),  y: oy + Math.sin(a2) * R * Math.sqrt(3),  z: oz });
  }
  for (const c of centers) {
    addGlow(circlePts(c.x, c.y, c.z, R, 72, 'z'), 0.60, 0.9, 0.55, fade);
    addGlow(circlePts(c.x, c.y, c.z, R, 48, 'x'), 0.62, 0.8, 0.22, fade);
    addGlow(circlePts(c.x, c.y, c.z, R, 48, 'y'), 0.64, 0.8, 0.22, fade);
  }

  // ── 2. Cubo de Metatrón ────────────────────────────────────────
  const mn = [new THREE.Vector3(ox, oy, oz)];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 / 6) * i;
    mn.push(new THREE.Vector3(ox + Math.cos(a) * R,     oy + Math.sin(a) * R,     oz));
    mn.push(new THREE.Vector3(ox + Math.cos(a) * R * 2, oy + Math.sin(a) * R * 2, oz));
  }
  for (const z of [-R * 0.6, R * 0.6])
    for (const b of mn.slice(1, 7).map(v => ({ x: v.x, y: v.y })))
      mn.push(new THREE.Vector3(b.x * 0.6, b.y * 0.6, oz + z));
  for (let i = 0; i < mn.length; i++)
    for (let j = i + 1; j < mn.length; j++)
      addGlow([mn[i], mn[j]], 0.77, 0.85, 0.12, fade);

  // ── 3. Merkaba animada (rotación + pulsación) ──────────────────
  const tR = R * 1.1;
  for (let flip = 0; flip < 2; flip++) {
    const ff = flip;
    // 6 aristas × 2 vértices = 12 puntos
    const N = 12;
    const fn = (t) => {
      const pulse = 1 + 0.06 * Math.sin(t * 1.8 + ff * Math.PI);
      const spin  = t * 0.22 * (ff ? -1 : 1);
      const arr   = new Float32Array(N * 3);
      const verts = [];
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i + (ff ? Math.PI / 3 : 0) - Math.PI / 2 + spin;
        verts.push([ox + Math.cos(a) * tR * pulse, oy + Math.sin(a) * tR * pulse, oz]);
      }
      verts.push([ox, oy, oz + (ff ? -tR * 1.18 : tR * 1.18) * pulse]);
      const edges = [[0,1],[1,2],[2,0],[0,3],[1,3],[2,3]];
      edges.forEach(([a, b], ei) => {
        arr[ei*6]   = verts[a][0]; arr[ei*6+1] = verts[a][1]; arr[ei*6+2] = verts[a][2];
        arr[ei*6+3] = verts[b][0]; arr[ei*6+4] = verts[b][1]; arr[ei*6+5] = verts[b][2];
      });
      return arr;
    };
    addDynGlow(fn, N, 0.53, 0.95, 0.75, fade);
  }

  // ── 4. Sri Yantra animado (pulsación por capa) ─────────────────
  for (const [si, s] of [[0, 0.40],[1, 0.58],[2, 0.76],[3, 0.92]]) {
    for (let t = 0; t < 2; t++) {
      const tt = t, ss = s, sii = si;
      const fn = (time) => {
        const pulse = 1 + 0.04 * Math.sin(time * 1.2 + sii * 0.6 + tt * Math.PI);
        const arr   = new Float32Array(4 * 3);
        const pts   = [];
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 / 3) * i + (tt ? Math.PI / 3 : 0) + Math.PI / 6;
          pts.push([ox + Math.cos(a) * R * ss * pulse, oy + Math.sin(a) * R * ss * pulse, oz + (tt ? R*ss*0.1 : -R*ss*0.1)]);
        }
        pts.push([...pts[0]]); // cierra el triángulo
        for (let i = 0; i < 4; i++) { arr[i*3] = pts[i][0]; arr[i*3+1] = pts[i][1]; arr[i*3+2] = pts[i][2]; }
        return arr;
      };
      addDynGlow(fn, 4, 0.08, 0.9, 0.55, fade);
    }
  }

  // ── 5. Espiral áurea animada (ondulación) ─────────────────────
  if (isCentral) {
    const spAngles = [];
    for (let a = 0; a < Math.PI * 2 * 5; a += 0.035) {
      const rr = 3 * Math.pow(PHI, a / (Math.PI * 2));
      if (rr > R * 2.1) break;
      spAngles.push(a);
    }
    const N = spAngles.length;
    const fn = (time) => {
      const arr = new Float32Array(N * 3);
      spAngles.forEach((a, i) => {
        const rr   = 3 * Math.pow(PHI, a / (Math.PI * 2));
        const wave = 1 + 0.05 * Math.sin(a * 2 - time * 1.5);
        arr[i*3]   = ox + Math.cos(a - Math.PI/2) * rr * wave;
        arr[i*3+1] = oy + Math.sin(a - Math.PI/2) * rr * wave;
        arr[i*3+2] = oz + (a / (Math.PI * 2)) * R * 0.22 - R * 0.65 + 4 * Math.sin(a - time);
      });
      return arr;
    };
    addDynGlow(fn, N, 0.12, 0.95, 0.65, 1.0);
  }

  // ── 6. Polígonos sagrados rotantes ────────────────────────────
  if (fade > 0.35) {
    const pdefs = [
      { n: 5, h: 0.33, tl:  0.30, sp:  0.18 },
      { n: 7, h: 0.80, tl: -0.38, sp: -0.12 },
      { n: 9, h: 0.50, tl:  0.55, sp:  0.08 },
    ];
    for (const pg of pdefs) {
      const pgg = pg;
      const N   = pgg.n + 1;
      const fn  = (time) => {
        const arr  = new Float32Array(N * 3);
        const spin = time * pgg.sp;
        for (let i = 0; i <= pgg.n; i++) {
          const a    = (Math.PI * 2 / pgg.n) * i - Math.PI / 2 + spin;
          arr[i*3]   = ox + Math.cos(a) * R * 1.94;
          arr[i*3+1] = oy + Math.sin(a) * R * 1.94 * Math.cos(pgg.tl);
          arr[i*3+2] = oz + Math.sin(a) * R * 1.94 * Math.sin(pgg.tl);
        }
        return arr;
      };
      addDynGlow(fn, N, pgg.h, 0.90, 0.45, fade);
    }
  }

  // ── 7. Círculos concéntricos ───────────────────────────────────
  for (const rr of [R * 0.97, R * 1.95]) {
    addGlow(circlePts(ox, oy, oz, rr, 100, 'z'), 0.55, 0.85, 0.45, fade);
    addGlow(circlePts(ox, oy, oz, rr,  80, 'x'), 0.57, 0.75, 0.18, fade);
    addGlow(circlePts(ox, oy, oz, rr,  80, 'y'), 0.59, 0.75, 0.18, fade);
  }
}

// Generar todos los tiles en cuadrícula hexagonal 3D
for (let gx = -GRID; gx <= GRID; gx++) {
  for (let gz = -GRID; gz <= GRID; gz++) {
    for (let gy = -1; gy <= 1; gy++) {
      const ox   = gx * STEP + (gz % 2) * STEP * 0.5;
      const oy   = gy * STEP * 0.55;
      const oz   = gz * STEP * 0.866;
      const dist = Math.sqrt(gx*gx + gz*gz + gy*gy*0.5);
      const fade = Math.max(0, 1 - dist / (GRID + 0.5));
      if (fade > 0.04) buildTile(ox, oy, oz, fade, gx === 0 && gz === 0 && gy === 0);
    }
  }
}

// ══════════════════════════════════════════════════════════════════
//  PARTÍCULAS (flow field 3D)
// ══════════════════════════════════════════════════════════════════
const NUM    = 1800;
const posA   = new Float32Array(NUM * 3);
const colA   = new Float32Array(NUM * 3);
const pd     = [];
const SPREAD = STEP * GRID * 0.85;

for (let i = 0; i < NUM; i++) {
  const t = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);
  const r = 30 + Math.random() * SPREAD;
  pd.push({
    x: r * Math.sin(p) * Math.cos(t),
    y: r * Math.sin(p) * Math.sin(t) * 0.45,
    z: r * Math.cos(p),
    vx: 0, vy: 0, vz: 0,
    life:    Math.random() * 200 + 80,
    maxLife: 280,
    speed:   0.7 + Math.random() * 2.0,
    hue:     Math.random()
  });
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
pGeo.setAttribute('color',    new THREE.BufferAttribute(colA, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 1.8, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true
})));

// Noise 3D (value noise con hash sinusoidal)
function hash(x, y, z) { let h = Math.sin(x*127.1 + y*311.7 + z*74.7) * 43758.5453; return h - Math.floor(h); }
function n3(x, y, z) {
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
  const fx=x-ix, fy=y-iy, fz=z-iz;
  const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy), uz=fz*fz*(3-2*fz);
  return hash(ix,iy,iz)*(1-ux)*(1-uy)*(1-uz) + hash(ix+1,iy,iz)*ux*(1-uy)*(1-uz)
       + hash(ix,iy+1,iz)*(1-ux)*uy*(1-uz)   + hash(ix+1,iy+1,iz)*ux*uy*(1-uz)
       + hash(ix,iy,iz+1)*(1-ux)*(1-uy)*uz   + hash(ix+1,iy,iz+1)*ux*(1-uy)*uz
       + hash(ix,iy+1,iz+1)*(1-ux)*uy*uz     + hash(ix+1,iy+1,iz+1)*ux*uy*uz;
}

let zOff = 0;
const tc  = new THREE.Color();

function updateParticles() {
  for (let i = 0; i < NUM; i++) {
    const p  = pd[i], si = 0.018;
    const nx = n3(p.x*si,       p.y*si,       p.z*si + zOff    ) * Math.PI * 4;
    const ny = n3(p.x*si + 17.3, p.y*si + 31.1, p.z*si + zOff  ) * Math.PI * 4;
    const nz = n3(p.x*si + 53.7, p.y*si + 7.9,  p.z*si + zOff+5) * Math.PI * 4;

    let fx = Math.cos(nx) * p.speed;
    let fy = Math.sin(ny) * p.speed * 0.4;
    let fz = Math.sin(nz) * p.speed;

    // Órbita alrededor del tile más cercano
    const tx  = Math.round(p.x / STEP) * STEP;
    const tz  = Math.round(p.z / STEP) * STEP;
    const ddx = p.x - tx, ddz = p.z - tz;
    const dd  = Math.sqrt(ddx*ddx + ddz*ddz);
    if (dd < R * 2.2 && dd > 8) {
      const tang   = new THREE.Vector3(-ddz, 0, ddx).normalize();
      const rd     = (Math.floor(dd / R) % 2 === 0) ? 1 : -1;
      const tt     = 1 - Math.min(dd / (R * 2.2), 1);
      fx = fx * (1 - tt*0.65) + tang.x * rd * p.speed * tt * 0.65;
      fz = fz * (1 - tt*0.65) + tang.z * rd * p.speed * tt * 0.65;
    }

    p.vx = p.vx*0.86 + fx*0.14;
    p.vy = p.vy*0.86 + fy*0.14;
    p.vz = p.vz*0.86 + fz*0.14;
    p.x += p.vx; p.y += p.vy; p.z += p.vz;
    p.life--;

    if (p.life <= 0 || Math.abs(p.x) > SPREAD*1.1 || Math.abs(p.z) > SPREAD*1.1) {
      const ph = Math.acos(2*Math.random()-1), th = Math.random()*Math.PI*2;
      const rr = 30 + Math.random() * SPREAD;
      p.x = rr*Math.sin(ph)*Math.cos(th); p.y = rr*Math.sin(ph)*Math.sin(th)*0.4; p.z = rr*Math.cos(ph);
      p.vx = p.vy = p.vz = 0;
      p.life = Math.random()*200 + 80; p.maxLife = p.life; p.hue = Math.random();
    }

    posA[i*3] = p.x; posA[i*3+1] = p.y; posA[i*3+2] = p.z;
    const al = p.life / p.maxLife;
    const d2 = Math.min(Math.sqrt(p.x*p.x + p.z*p.z) / SPREAD, 1);
    tc.setHSL(p.hue, 0.85 + d2*0.15, 0.6 + (1-d2)*0.35);
    colA[i*3] = tc.r*al; colA[i*3+1] = tc.g*al; colA[i*3+2] = tc.b*al;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate    = true;
}

// ── Loop de animación ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  T += 0.016;

  if (!drag) sph.theta += 0.0003;

  const { theta, phi, r } = sph;
  camera.position.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);

  // Actualizar geometrías dinámicas (Merkaba, Sri Yantra, espiral, polígonos)
  for (const dl of dynamicLines) {
    const newArr = dl.fn(T);
    dl.geo.attributes.position.array.set(newArr);
    dl.geo.attributes.position.needsUpdate = true;
    dl.geo.setDrawRange(0, newArr.length / 3);
  }

  updateParticles();
  zOff += 0.002;
  renderer.render(scene, camera);
}
animate();

// ── Resize ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  W = wrap.clientWidth; H = wrap.clientHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
});