

const container = document.getElementById('container');
const canvas = document.getElementById('c');

const W = container.clientWidth, H = container.clientHeight;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000308, 1);

const scene = new THREE.Scene();


const ambient = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambient);

const light1 = new THREE.PointLight(0xffffff, 2);
light1.position.set(300, 300, 300);
scene.add(light1);

const light2 = new THREE.PointLight(0x88aaff, 1.5);
light2.position.set(-300, -200, -300);
scene.add(light2);

light1.intensity =
  2 +
  audioAverage * 12;

light2.intensity =
  1.5 +
  audioAverage * 8;

// Fondo claro
scene.background = new THREE.Color(0x000814);
// Rejilla del suelo
const grid = new THREE.GridHelper(
  4000, // tamaño total
  120,  // divisiones
  0x444444, // líneas principales
  0x666666  // líneas secundarias
);

grid.position.y = -300; // ajusta según tu escena
scene.add(grid);
const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 2000);
camera.position.set(0, 60, 320);
camera.lookAt(0, 0, 0);

const PHI = 1.6180339887;
const R = 90;

// ── Orbit control simple ──────────────────────────────────────────
let isDragging = false, prevX = 0, prevY = 0;
let spherical = { theta: 0.3, phi: 1.1, radius: 320 };

container.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - prevX, dy = e.clientY - prevY;
  spherical.theta -= dx * 0.005;
  spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi - dy * 0.005));
  prevX = e.clientX; prevY = e.clientY;
});
container.addEventListener('wheel', e => {
  spherical.radius = Math.max(80, Math.min(600, spherical.radius + e.deltaY * 0.4));
  e.preventDefault();
}, { passive: false });

// Touch
let lastTouchDist = 0;
container.addEventListener('touchstart', e => {
  if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
  if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
}, { passive: true });
container.addEventListener('touchend', () => isDragging = false, { passive: true });
container.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && isDragging) {
    const dx = e.touches[0].clientX - prevX, dy = e.touches[0].clientY - prevY;
    spherical.theta -= dx * 0.005;
    spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi - dy * 0.005));
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  }
  if (e.touches.length === 2) {
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    spherical.radius = Math.max(80, Math.min(600, spherical.radius - (d - lastTouchDist) * 0.8));
    lastTouchDist = d;
  }
  e.preventDefault();
}, { passive: false });

// ── Helpers ───────────────────────────────────────────────────────
function lineMat(h, s, l, opacity = 10) {
  const c = new THREE.Color();
  c.setHSL(h, s, l);
  return new THREE.LineBasicMaterial({ color: c, transparent: opacity < 1, opacity });
}

function addLine(pts, mat) {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.Line(g, mat));
}

function addLineLoop(pts, mat) {  
  const g = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
  scene.add(new THREE.Line(g, mat));
}

function circlePoints(cx, cy, cz, r, n, axis = 'z') {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (axis === 'z') pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz));
    if (axis === 'x') pts.push(new THREE.Vector3(cx, cy + Math.cos(a) * r, cz + Math.sin(a) * r));
    if (axis === 'y') pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r));
  }
  return pts;
}

// ── Flor de la Vida 3D ────────────────────────────────────────────
const folCenters3 = [{ x: 0, y: 0, z: 0 }];
for (let i = 0; i < 6; i++) {
  const a = (Math.PI * 2 / 6) * i;
  folCenters3.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, z: 0 });
}
for (let i = 0; i < 6; i++) {
  const a = (Math.PI * 2 / 6) * i;
  const a2 = a + Math.PI / 6;
  folCenters3.push({ x: Math.cos(a) * R * 2,              y: Math.sin(a) * R * 2,              z: 0 });
  folCenters3.push({ x: Math.cos(a2) * R * Math.sqrt(3),  y: Math.sin(a2) * R * Math.sqrt(3),  z: 0 });
}

const folMat = lineMat(0.62, 0.5, 0.55, 1);
for (const c of folCenters3) {
  addLine(circlePoints(c.x, c.y, c.z, R, 80, 'z'), folMat);
    addLine(circlePoints(c.x, c.y, c.z, R, 80, 'z'), folMat);
      addLine(circlePoints(c.x, c.y, c.z, R, 80, 'z'), folMat);


  addLine(circlePoints(c.x, c.y, c.z, R, 80, 'x'), lineMat(0.62, 0.4, 0.45, 1));
    addLine(circlePoints(c.x, c.y, c.z, R, 80, 'x'), lineMat(0.62, 0.4, 0.45, 1));

  addLine(circlePoints(c.x, c.y, c.z, R, 80, 'y'), lineMat(0.62, 0.4, 0.45, 1));
    addLine(circlePoints(c.x, c.y, c.z, R, 80, 'y'), lineMat(0.62, 0.4, 0.45, 1));

}

// ── Cubo de Metatrón ──────────────────────────────────────────────
const metaNodes = [new THREE.Vector3(0, 0, 0)];
for (let i = 0; i < 6; i++) {
  const a = (Math.PI * 2 / 6) * i;
  metaNodes.push(new THREE.Vector3(Math.cos(a) * R,     Math.sin(a) * R,     0));
  metaNodes.push(new THREE.Vector3(Math.cos(a) * R * 2, Math.sin(a) * R * 2, 0));
}
// Profundidad en Z
const zLevels = [-R * 0.6, R * 0.6];
const baseXY = metaNodes.map(v => ({ x: v.x, y: v.y }));
for (const z of zLevels) {
  for (const b of baseXY.slice(1, 7)) {
    metaNodes.push(new THREE.Vector3(b.x * 0.6, b.y * 0.6, z));
  }
}
const metaMat = lineMat(0.78, 0.5, 0.6, 0.8);
for (let i = 0; i < metaNodes.length; i++)
  for (let j = i + 1; j < metaNodes.length; j++)
    addLine([metaNodes[i], metaNodes[j]], metaMat);

// ── Merkaba 3D (dos tetraedros opuestos) ─────────────────────────
const merkMat = lineMat(0.54, 0.7, 0.65, 1);
const tetR = R * 1.1;

function tetraPoints(flip) {
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI * 2 / 3) * i + (flip ? Math.PI / 3 : 0) - Math.PI / 2;
    pts.push(new THREE.Vector3(Math.cos(a) * tetR, Math.sin(a) * tetR, 0));
  }
  pts.push(new THREE.Vector3(0, 0, flip ? -tetR * 1.2 : tetR * 1.2));
  return pts;
}

for (let flip = 0; flip < 2; flip++) {
  const p = tetraPoints(flip);
  for (let i = 0; i < 3; i++) {
    addLine([p[i], p[(i + 1) % 3]], merkMat);
    addLine([p[i], p[3]], merkMat);
  }
}

// ── Sri Yantra (triángulos concéntricos inclinados) ───────────────
const sriMat = lineMat(0.08, 0.8, 0.65, 1);
for (const s of [0.38, 0.55, 0.72, 1]) {
  for (let t = 0; t < 2; t++) {
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 / 3) * i + (t ? Math.PI / 3 : 0) + Math.PI / 6;
      pts.push(new THREE.Vector3(
        Math.cos(a) * R * s,
        Math.sin(a) * R * s,
        t ? R * s * 0.1 : -R * s * 0.1
      ));
    }
    addLineLoop(pts, sriMat);
  }
}

// ── Espiral dorada 3D (hélice φ) ──────────────────────────────────
const spiralPts = [];
for (let a = 0; a < Math.PI * 2 * 6; a += 1) {
  const rr = 3 * Math.pow(PHI, a / (Math.PI * 2));
  if (rr > R * 2.2) break;
  spiralPts.push(new THREE.Vector3(
    Math.cos(a - Math.PI / 2) * rr,
    Math.sin(a - Math.PI / 2) * rr,
    (a / (Math.PI * 2)) * R * 0.25 - R * 0.75
  ));
}
addLine(spiralPts, lineMat(0.13, 0.85, 0.65, 1));

// ── Esferas y círculos sagrados ───────────────────────────────────
for (const rr of [R * 0.98, R * 1.98]) {
  addLine(circlePoints(0, 0, 0, rr, 120, 'z'), lineMat(0.56, 0.4, 0.65, 1));
  addLine(circlePoints(0, 0, 0, rr, 120, 'x'), lineMat(0.56, 0.4, 0.65, 1));
  addLine(circlePoints(0, 0, 0, rr, 120, 'y'), lineMat(0.56, 0.4, 0.65, 1));
}

// ── Polígonos sagrados inclinados ─────────────────────────────────
const polyDefs = [
  { sides: 5, hue: 0.33, tilt: 0.3  },
  { sides: 7, hue: 0.80, tilt: -0.4 },
  { sides: 9, hue: 0.50, tilt: 0.6  },
];
for (const pg of polyDefs) {
  const pts = [];
  for (let i = 0; i <= pg.sides; i++) {
    const a = (Math.PI * 2 / pg.sides) * i - Math.PI / 2;
    pts.push(new THREE.Vector3(
      Math.cos(a) * R * 1.98,
      Math.sin(a) * R * 1.98 * Math.cos(pg.tilt),
      Math.sin(a) * R * 1.98 * Math.sin(pg.tilt)
    ));
  }
  addLine(pts, lineMat(pg.hue, 1, 0.65, 1));
}

// ══════════════════════════════════════════════════════════════════
//  PARTÍCULAS (flow field 3D)MOVER SI QUIERES MÁS
// ══════════════════════════════════════════════════════════════════
const NUM = 50000; //40000//
const posArr = new Float32Array(NUM * 3);
const colArr = new Float32Array(NUM * 3);
const pData = [];

for (let i = 0; i < NUM; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const r     = 20 + Math.random() * R * 2.2;
  pData.push({
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
    vx: 0, vy: 0, vz: 0,
    life:    Math.random() * 200 + 80,
    maxLife: 280,
    speed:   0.6 + Math.random() * 1.8,
    hue:     Math.random()
  });
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
pGeo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
const pMat = new THREE.PointsMaterial({
  size: 1.6,
  vertexColors: true,
  transparent: true,
  opacity: 1,
  sizeAttenuation: true
});
const points = new THREE.Points(pGeo, pMat);
scene.add(points);

// Noise 3D (hash-based value noise)
function hash(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy), uz = fz*fz*(3-2*fz);
  const v000 = hash(ix,   iy,   iz  ), v100 = hash(ix+1, iy,   iz  );
  const v010 = hash(ix,   iy+1, iz  ), v110 = hash(ix+1, iy+1, iz  );
  const v001 = hash(ix,   iy,   iz+1), v101 = hash(ix+1, iy,   iz+1);
  const v011 = hash(ix,   iy+1, iz+1), v111 = hash(ix+1, iy+1, iz+1);
  return v000*(1-ux)*(1-uy)*(1-uz) + v100*ux*(1-uy)*(1-uz)
       + v010*(1-ux)*uy*(1-uz)     + v110*ux*uy*(1-uz)
       + v001*(1-ux)*(1-uy)*uz     + v101*ux*(1-uy)*uz
       + v011*(1-ux)*uy*uz         + v111*ux*uy*uz;
}

let zOff = 0;
const tmpColor = new THREE.Color();

function updateParticles() {
  for (let i = 0; i < NUM; i++) {
    const p = pData[i];
    const si = 0.025;

    const nx = noise3(p.x * si,        p.y * si,        p.z * si + zOff    ) * Math.PI * 4;
    const ny = noise3(p.x * si + 17.3, p.y * si + 31.1, p.z * si + zOff    ) * Math.PI * 4;
    const nz = noise3(p.x * si + 53.7, p.y * si + 7.9,  p.z * si + zOff + 5) * Math.PI * 4;

    let fx = Math.cos(nx) * p.speed;
    let fy = Math.sin(ny) * p.speed;
    let fz = Math.sin(nz) * p.speed;

    // Órbita tangencial cerca de la geometría
    const dx = p.x, dy = p.y, dz = p.z;
    const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (d < R * 2.2 && d > 8) {
      const tang = new THREE.Vector3(-dy, dx, dz * 0.2).normalize();
      const ringDir = (Math.floor(d / R) % 2 === 0) ? 1 : -1;
      const t = 1 - Math.min(d / (R * 2.2), 1);
      fx = fx * (1 - t * 0.7) + tang.x * ringDir * p.speed * t * 0.7;
      fy = fy * (1 - t * 0.7) + tang.y * ringDir * p.speed * t * 0.7;
      fz = fz * (1 - t * 0.7) + tang.z * ringDir * p.speed * t * 0.7;
    }

    p.vx = p.vx * 0.85 + fx * 0.15;
    p.vy = p.vy * 0.85 + fy * 0.15;
    p.vz = p.vz * 0.85 + fz * 0.15;
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;

    p.life--;
    if (p.life <= 0 || Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) > R * 3.5) {
      const phi2   = Math.acos(2 * Math.random() - 1);
      const theta2 = Math.random() * Math.PI * 2;
      const r2     = 10 + Math.random() * R * 2;
      p.x = r2 * Math.sin(phi2) * Math.cos(theta2);
      p.y = r2 * Math.sin(phi2) * Math.sin(theta2);
      p.z = r2 * Math.cos(phi2);
      p.vx = p.vy = p.vz = 0;
      p.life = Math.random() * 200 + 80;
      p.maxLife = p.life;
      p.hue = Math.random();
    }

    posArr[i*3]   = p.x;
    posArr[i*3+1] = p.y;
    posArr[i*3+2] = p.z;

    const alpha = p.life / p.maxLife;
    const dist2 = Math.min(Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) / (R * 2), 1);
    tmpColor.setHSL(p.hue, 0.75 + dist2 * 0.2, 0.55 + (1 - dist2) * 0.3);
    colArr[i*3]   = tmpColor.r * alpha;
    colArr[i*3+1] = tmpColor.g * alpha;
    colArr[i*3+2] = tmpColor.b * alpha;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate    = true;
}


const sacredGroup = new THREE.Group();

while(scene.children.length > 1){
  sacredGroup.add(scene.children[0]);
}

scene.add(sacredGroup);

sacredGroup.position.y = 40;


// ── loop de animación ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
const t = performance.now() * 0.001;
  
if(analyser){

  analyser.getByteFrequencyData(
    audioData
  );

  let sum = 0;

  for(let i=0;i<audioData.length;i++){
    sum += audioData[i];
  }

  audioAverage =
    sum /
    audioData.length /
    255;
}

  if (!isDragging) {
    spherical.theta += 0.002; // rotación automática suave
  }
  const { theta, phi, radius } = spherical;
  camera.position.set(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);

  updateParticles();
  zOff += 0.0365;

  
const pulse =
  1 +
  Math.sin(t * 0.8) * 0.05 +
  audioAverage * 0.25;

sacredGroup.scale.set(
  pulse,
  pulse,
  pulse
);

const corePulse =
  1 +
  audioAverage * 0.8;

core.scale.set(
  corePulse,
  corePulse,
  corePulse
);

core.material.emissiveIntensity =
  8 +
  audioAverage * 40;

sacredGroup.rotation.y += 0.001;
  renderer.render(scene, camera);
  

  camera.position.x =
Math.sin(t*0.15)*80;

camera.position.y =
Math.sin(t*0.12)*40;

camera.lookAt(0,0,0);
}
animate();

const t = performance.now() * 0.001;

const pulse = 1 + Math.sin(t*0.5)*0.05;

sacredGroup.scale.set(
  pulse,
  pulse,
  pulse
);

// ── Resize ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const W2 = container.clientWidth, H2 = container.clientHeight;
  camera.aspect = W2 / H2;
  camera.updateProjectionMatrix();
  renderer.setSize(W2, H2);
  
});



const coreGeo = new THREE.SphereGeometry(60, 72, 72, 1);

const coreMat = new THREE.MeshPhongMaterial({
  color: (3,255,255),
  emissive: 0x66ccff,
  emissiveIntensity: 9
});



const core = new THREE.Mesh(coreGeo, coreMat);

core.position.set(0,0,0);

sacredGroup.add(core);

// AUDIO REACTIVO

let analyser;
let audioData;
let audioAverage = 0;

const audioInput =
document.getElementById("audioUpload");

audioInput.addEventListener("change",(e)=>{

  const file = e.target.files[0];

  if(!file) return;

  const audio = new Audio(
    URL.createObjectURL(file)
  );

  audio.loop = true;

  const audioCtx =
    new (window.AudioContext ||
         window.webkitAudioContext)();

  const source =
    audioCtx.createMediaElementSource(audio);

  analyser =
    audioCtx.createAnalyser();

  analyser.fftSize = 512;

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  audioData =
    new Uint8Array(
      analyser.frequencyBinCount
    );

  audio.play();

});

for(let i=0; i<5; i++){

  const ringGeo = new THREE.TorusGeometry(
    100 + i*30,
    1,
    16,
    150
  );

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.5
  });

  const ring = new THREE.Mesh(ringGeo, ringMat);

  ring.rotation.x = Math.random()*Math.PI;
  ring.rotation.y = Math.random()*Math.PI;

  sacredGroup.add(ring);
}


