

const container = document.getElementById('container');
const canvas = document.getElementById('c');

console.log('geometriasagrada3d: script loaded');
window.addEventListener('error', (ev) => {
  console.error('geometriasagrada3d window error:', ev.message, ev.filename, ev.lineno, ev.error);
});
if (!container || !canvas) {
  console.error('geometriasagrada3d: missing DOM elements', { containerExists: !!container, canvasExists: !!canvas });
}

let analyser = null;
let audioData = null;
let audioAverage = 0;
let peakSmoothed = 0;
let audioSmoothed = 0;
let audioBass = 0;
let audioMids = 0;
let audioHighs = 0;
let distortionAmount = 0;
let waveshaper = null;
let audioCtx = null;

const W = container.clientWidth, H = container.clientHeight;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000308, 1);
} catch (e) {
  console.error('geometriasagrada3d: failed to create renderer', e);
  throw e;
}

// debug overlay to help detect if render loop runs
const _dbg = document.createElement('div');
_dbg.style.position = 'fixed';
_dbg.style.left = '8px';
_dbg.style.bottom = '8px';
_dbg.style.padding = '6px 8px';
_dbg.style.background = 'rgba(0,0,0,0.6)';
_dbg.style.color = '#9fe8ff';
_dbg.style.fontFamily = 'monospace';
_dbg.style.fontSize = '12px';
_dbg.style.zIndex = 9999;
_dbg.style.whiteSpace = 'pre';
_dbg.textContent = 'GEODESIGN: initializing...';
document.body.appendChild(_dbg);
let _frameCount = 0, _lastFpsTime = performance.now();
let _lastErrorMsg = '';
window.addEventListener('error', (ev) => {
  _lastErrorMsg = ev.message + ' @' + (ev.filename || '') + ':' + (ev.lineno || '');
});

// core size control (from UI)
let coreUserScale = 1;
let glowUserScale = 1;
let glowBrightness = 1;
let selectedSphereColor = '#66ccff';
let selectedGlowColor = '#66ccff';
const coreSizeSlider = document.getElementById('coreSizeSlider');
const coreSizeLabel = document.getElementById('coreSizeLabel');
if (coreSizeSlider) {
  coreSizeLabel.textContent = parseFloat(coreSizeSlider.value).toFixed(2);
  coreSizeSlider.addEventListener('input', (e) => {
    coreUserScale = parseFloat(e.target.value) || 1;
    if (coreSizeLabel) coreSizeLabel.textContent = coreUserScale.toFixed(2);
  });
}
const glowSizeSlider = document.getElementById('glowSizeSlider');
const glowSizeLabel = document.getElementById('glowSizeLabel');
if (glowSizeSlider && glowSizeLabel) {
  glowSizeLabel.textContent = parseFloat(glowSizeSlider.value).toFixed(2);
  glowSizeSlider.addEventListener('input', (e) => {
    glowUserScale = parseFloat(e.target.value) || 1;
    glowSizeLabel.textContent = glowUserScale.toFixed(2);
  });
}
const glowBrightnessSlider = document.getElementById('glowBrightnessSlider');
const glowBrightnessLabel = document.getElementById('glowBrightnessLabel');
if (glowBrightnessSlider && glowBrightnessLabel) {
  glowBrightnessLabel.textContent = parseFloat(glowBrightnessSlider.value).toFixed(2);
  glowBrightnessSlider.addEventListener('input', (e) => {
    glowBrightness = parseFloat(e.target.value) || 1;
    glowBrightnessLabel.textContent = glowBrightness.toFixed(2);
  });
}
const coreColorPicker = document.getElementById('coreColorPicker');
if (coreColorPicker) {
  selectedSphereColor = coreColorPicker.value || selectedSphereColor;
  coreColorPicker.addEventListener('input', (e) => {
    selectedSphereColor = e.target.value || selectedSphereColor;
    syncSphereColor();
  });
}
const glowColorPicker = document.getElementById('glowColorPicker');
if (glowColorPicker) {
  selectedGlowColor = glowColorPicker.value || selectedGlowColor;
  glowColorPicker.addEventListener('input', (e) => {
    selectedGlowColor = e.target.value || selectedGlowColor;
    syncGlowColor();
  });
}

const distortionSlider = document.getElementById('distortionSlider');
const distortionLabel = document.getElementById('distortionLabel');
if (distortionSlider && distortionLabel) {
  distortionLabel.textContent = parseFloat(distortionSlider.value).toFixed(2);
  distortionSlider.addEventListener('input', (e) => {
    distortionAmount = parseFloat(e.target.value) || 0;
    distortionLabel.textContent = distortionAmount.toFixed(2);
    updateDistortionCurve(distortionAmount);
  });
}

// geometry group scales (UI)
const groupScale = {
  fol: 1,
  metatron: 1,
  merkaba: 1,
  sri: 1,
  spiral: 1,
  polygons: 1,
  particles: 1
};

function hookSlider(id, labelId, key) {
  const s = document.getElementById(id);
  const l = document.getElementById(labelId);
  if (!s || !l) return;
  l.textContent = parseFloat(s.value).toFixed(2);
  s.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value) || 1;
    groupScale[key] = v;
    l.textContent = v.toFixed(2);
  });
}

hookSlider('folScale', 'folLabel', 'fol');
hookSlider('metatronScale', 'metatronLabel', 'metatron');
hookSlider('merkabaScale', 'merkabaLabel', 'merkaba');
hookSlider('sriScale', 'sriLabel', 'sri');
hookSlider('spiralScale', 'spiralLabel', 'spiral');
hookSlider('particlesScale', 'particlesLabel', 'particles');

function syncSphereColor() {
  if (typeof coreMat !== 'undefined' && coreMat) {
    coreMat.color.set(selectedSphereColor);
  }
}

function syncGlowColor() {
  if (typeof glowMat !== 'undefined' && glowMat) {
    glowMat.color.set(selectedGlowColor);
    glowMat.needsUpdate = true;
  }
}

function subdivideLinePoints(pts, minSegments = 18) {
  if (!pts || pts.length < 2) return pts || [];

  const subdivided = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const start = pts[i];
    const end = pts[i + 1];
    const distance = start.distanceTo(end);
    const segments = Math.max(minSegments, Math.ceil(distance / 18));

    for (let j = 0; j < segments; j++) {
      subdivided.push(start.clone().lerp(end, j / segments));
    }
  }

  subdivided.push(pts[pts.length - 1].clone());
  return subdivided;
}

function distortLineGeometry(mesh, t, amount, bandLevel) {
  const geometry = mesh && mesh.geometry;
  const position = geometry && geometry.attributes.position;
  const basePositions = geometry && geometry.userData.basePositions;
  if (!position || !basePositions) return;

  const arr = position.array;
  const seed = geometry.userData.distortionSeed || 0;
  const strength = amount * (4 + amount * 18) * (1 + bandLevel * 1.6);
  const frequency = 0.7 + amount * 5.5;
  const speed = 5 + amount * 16;

  for (let i = 0; i < arr.length; i += 3) {
    const vertexIndex = i / 3;
    const phase = vertexIndex * frequency + t * speed + seed;
    const zig = Math.sign(Math.sin(phase));
    const wave = Math.sin(phase * 0.73 + seed) * 0.55;
    const burst = Math.sin(phase * 2.17 + t * 3.5) * amount;
    const offset = strength * (zig * 0.65 + wave + burst * 0.35);

    arr[i] = basePositions[i] + Math.sin(phase + seed) * offset;
    arr[i + 1] = basePositions[i + 1] + Math.cos(phase * 0.91 + seed) * offset;
    arr[i + 2] = basePositions[i + 2] + Math.sin(phase * 1.31 + seed) * offset * 0.65;
  }

  position.needsUpdate = true;
}

const scene = new THREE.Scene();

// dynamic/reactive lines that will react to audio; kept in array for updates
const dynamicCircles = [];

function createDynamicLine(pts, mat, bandOrOpts = 'mids', speed = 1) {
  const opts = {};
  if (typeof bandOrOpts === 'string') opts.band = bandOrOpts;
  else Object.assign(opts, bandOrOpts);
  opts.band = opts.band || 'mids';
  opts.group = opts.group || 'fol';
  opts.speed = opts.speed || speed;
  opts.spinDir = opts.spinDir || 1;
  opts.spinAxis = opts.spinAxis || 'z';
  opts.strokeWidth = opts.strokeWidth || 0.55;
  opts.strokeLayers = opts.strokeLayers || 2;

  const group = new THREE.Group();
  const offsetDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
  const center = (opts.strokeLayers - 1) / 2;
  const strokeMeshes = [];
  const glowMeshes = [];
  const shouldSubdivide = opts.subdivide !== undefined ? opts.subdivide : pts.length <= 4;
  const renderPts = shouldSubdivide ? subdivideLinePoints(pts, opts.minSegments || 18) : pts;

  for (let i = 0; i < opts.strokeLayers; i++) {
    const material = mat.clone();
    material.transparent = true;
    material.opacity = Math.max(0.12, 1 - Math.abs(i - center) * 0.28);

    const layerOffset = (i - center) * opts.strokeWidth;
    const shiftedPts = renderPts.map((p) => p.clone().addScaledVector(offsetDir, layerOffset));
    const g = new THREE.BufferGeometry().setFromPoints(shiftedPts);
    g.userData.basePositions = g.attributes.position.array.slice();
    g.userData.distortionSeed = Math.random() * Math.PI * 2;
    const line = new THREE.Line(g, material);
    group.add(line);
    strokeMeshes.push(line);

    // Add glow layer with additive blending
    const glowMat = new THREE.LineBasicMaterial({
      color: mat.color.clone(),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 3.5
    });
    const glowLine = new THREE.Line(g, glowMat);
    glowLine.scale.set(1.6, 1.6, 1.6);
    group.add(glowLine);
    glowMeshes.push(glowLine);
  }

  group.userData = {
    band: opts.band,
    speed: opts.speed,
    group: opts.group,
    spinDir: opts.spinDir,
    spinAxis: opts.spinAxis,
    baseRot: Math.random() * Math.PI * 2,
    baseHue: Math.random(),
    hueJitter: Math.random(),
    strokeMeshes,
    glowMeshes,
  };
  scene.add(group);
  dynamicCircles.push(group);
  return group;
}


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
const GRID_SIZE = 3200;
const GRID_DIVISIONS = 128;
const GRID_WALL_DISTANCE = GRID_SIZE / 2;
const GRID_PRIMARY_COLOR = 0x335577;
const GRID_SECONDARY_COLOR = 0x17445f;
const GRID_OPACITY = 0.26;

function styleGridHelper(helper) {
  const materials = Array.isArray(helper.material) ? helper.material : [helper.material];
  for (const material of materials) {
    material.transparent = true;
    material.opacity = GRID_OPACITY;
    material.depthWrite = false;
  }
  helper.renderOrder = -10;
}

function makeGridPlane(name) {
  const helper = new THREE.GridHelper(
    GRID_SIZE,
    GRID_DIVISIONS,
    GRID_PRIMARY_COLOR,
    GRID_SECONDARY_COLOR
  );
  helper.name = name;
  styleGridHelper(helper);
  return helper;
}

function createRoomEdges() {
  const half = GRID_WALL_DISTANCE;
  const floorY = -600;
  const ceilingY = GRID_WALL_DISTANCE;
  const corners = [
    new THREE.Vector3(-half, floorY, -half),
    new THREE.Vector3(half, floorY, -half),
    new THREE.Vector3(half, floorY, half),
    new THREE.Vector3(-half, floorY, half),
    new THREE.Vector3(-half, ceilingY, -half),
    new THREE.Vector3(half, ceilingY, -half),
    new THREE.Vector3(half, ceilingY, half),
    new THREE.Vector3(-half, ceilingY, half)
  ];
  const edgePairs = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  const pts = [];
  for (const [a, b] of edgePairs) {
    pts.push(corners[a], corners[b]);
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(pts);
  const material = new THREE.LineBasicMaterial({
    color: GRID_PRIMARY_COLOR,
    transparent: true,
    opacity: GRID_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  return new THREE.LineSegments(geometry, material);
}

function createBackgroundGrid() {
  const group = new THREE.Group();
  const floor = makeGridPlane('grid-floor');
  const ceiling = makeGridPlane('grid-ceiling');
  const back = makeGridPlane('grid-back');
  const front = makeGridPlane('grid-front');
  const left = makeGridPlane('grid-left');
  const right = makeGridPlane('grid-right');

  floor.position.y = -600;
  ceiling.position.y = GRID_WALL_DISTANCE;

  back.rotation.x = Math.PI / 2;
  back.position.z = -GRID_WALL_DISTANCE;

  front.rotation.x = Math.PI / 2;
  front.position.z = GRID_WALL_DISTANCE;

  left.rotation.z = Math.PI / 2;
  left.position.x = -GRID_WALL_DISTANCE;

  right.rotation.z = Math.PI / 2;
  right.position.x = GRID_WALL_DISTANCE;

  group.add(floor, ceiling, back, front, left, right, createRoomEdges());
  group.userData.floor = floor;
  return group;
}

const backgroundGrid = createBackgroundGrid();
const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 6000);
camera.position.set(0, 60, 320);
camera.lookAt(0, 0, 0);

const PHI = 1.6180339887;
const R = 90;

// Use OrbitControls for mouse/touch rotation + zoom
let controls = null;
if (THREE && THREE.OrbitControls) {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 80;
  controls.maxDistance = 4000;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;
  controls.rotateSpeed = 0.6;
}

const groupSpinMultiplier = {
  fol: 1.0,
  metatron: 1.8,
  merkaba: 2.4,
  sri: 1.4,
  spiral: 3.0,
  polygons: 1.2,
  particles: 0.6,
};

// ── Helpers ───────────────────────────────────────────────────────
function createDistortionCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount * 50) * x * 20 * deg) / (Math.PI + amount * Math.abs(x) * 30);
  }
  return curve;
}

function updateDistortionCurve(amount) {
  if (waveshaper) {
    waveshaper.curve = createDistortionCurve(Math.max(0, Math.min(1, amount)));
  }
}

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

const folMat = lineMat(0.62, 0.5, 0.73, 1);
for (const c of folCenters3) {
  // concentric circles around each center - react to mids/highs
  createDynamicLine(circlePoints(c.x, c.y, c.z, R, 80, 'z'), folMat, { band: 'mids', group: 'fol', speed: 0.6, spinAxis: 'z', spinDir: 1 });
  createDynamicLine(circlePoints(c.x, c.y, c.z, R * 0.98, 80, 'z'), folMat, { band: 'mids', group: 'fol', speed: 0.9, spinAxis: 'z', spinDir: -1 });
  createDynamicLine(circlePoints(c.x, c.y, c.z, R * 1.02, 80, 'z'), folMat, { band: 'highs', group: 'fol', speed: 1.2, spinAxis: 'x', spinDir: 1 });

  createDynamicLine(circlePoints(c.x, c.y, c.z, R, 80, 'x'), lineMat(0.62, 0.4, 0.70, 1), { band: 'mids', group: 'fol', speed: 0.5, spinAxis: 'x', spinDir: -1 });
  createDynamicLine(circlePoints(c.x, c.y, c.z, R * 1.1, 80, 'x'), lineMat(0.62, 0.4, 0.70, 1), { band: 'highs', group: 'fol', speed: 0.8, spinAxis: 'y', spinDir: 1 });

  createDynamicLine(circlePoints(c.x, c.y, c.z, R, 80, 'y'), lineMat(0.62, 0.4, 0.70, 1), { band: 'mids', group: 'fol', speed: 0.5, spinAxis: 'y', spinDir: 1 });
  createDynamicLine(circlePoints(c.x, c.y, c.z, R * 1.15, 80, 'y'), lineMat(0.62, 0.4, 0.70, 1), { band: 'highs', group: 'fol', speed: 0.8, spinAxis: 'z', spinDir: -1 });

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
const metaMat = lineMat(0.78, 0.5, 0.75, 0.8);
for (let i = 0; i < metaNodes.length; i++)
  for (let j = i + 1; j < metaNodes.length; j++)
    createDynamicLine([metaNodes[i], metaNodes[j]], metaMat, { band: 'mids', group: 'metatron', speed: 0.15, spinAxis: 'y', spinDir: -1 });

// ── Merkaba 3D (dos tetraedros opuestos) ─────────────────────────
const merkMat = lineMat(0.54, 0.7, 0.78, 1);
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
    createDynamicLine([p[i], p[(i + 1) % 3]], merkMat, { band: 'mids', group: 'merkaba', speed: 0.6, spinAxis: flip ? 'x' : 'z', spinDir: flip ? -1 : 1 });
    createDynamicLine([p[i], p[3]], merkMat, { band: 'mids', group: 'merkaba', speed: 0.6, spinAxis: flip ? 'y' : 'z', spinDir: flip ? 1 : -1 });
  }
}

// ── Sri Yantra (triángulos concéntricos inclinados) ───────────────
const sriMat = lineMat(0.08, 0.8, 0.76, 1);
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
    createDynamicLine([...pts, pts[0]], sriMat, { band: 'mids', group: 'sri', speed: 0.5, spinAxis: t ? 'x' : 'z', spinDir: t ? -1 : 1 });
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
createDynamicLine(spiralPts, lineMat(0.13, 0.85, 0.77, 1), { band: 'highs', group: 'spiral', speed: 0.6, spinAxis: 'z', spinDir: -1 });

// ── Esferas y círculos sagrados ───────────────────────────────────
for (const rr of [R * 0.98, R * 1.98]) {
  // larger rings react more to bass
  createDynamicLine(circlePoints(0, 0, 0, rr, 120, 'z'), lineMat(0.56, 0.4, 0.74, 1), { band: 'bass', group: 'polygons', speed: 0.6, spinAxis: 'z', spinDir: 1 });
  createDynamicLine(circlePoints(0, 0, 0, rr, 120, 'x'), lineMat(0.56, 0.4, 0.74, 1), { band: 'bass', group: 'polygons', speed: 0.5, spinAxis: 'x', spinDir: -1 });
  createDynamicLine(circlePoints(0, 0, 0, rr, 120, 'y'), lineMat(0.56, 0.4, 0.74, 1), { band: 'bass', group: 'polygons', speed: 0.4, spinAxis: 'y', spinDir: 1 });
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
  createDynamicLine(pts, lineMat(pg.hue, 1, 0.76, 1), { band: 'mids', group: 'polygons', speed: 0.4 });
}

// ══════════════════════════════════════════════════════════════════
//  PARTÍCULAS (flow field 3D)MOVER SI QUIERES MÁS
// ══════════════════════════════════════════════════════════════════
const NUM = 8000; // más ligero para que la página cargue sin congelarse
const posArr = new Float32Array(NUM * 3);
const colArr = new Float32Array(NUM * 3);
const pData = [];

for (let i = 0; i < NUM; i++) {
  const theta = Math.random() * Math.PI * 2;
  const r     = 20 + Math.random() * R * 2.2;
  pData.push({
    x: r * Math.cos(theta),
    y: (Math.random() - 0.5) * 80 + 40,
    z: r * Math.sin(theta),
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
  size: 2.8,
  vertexColors: true,
  transparent: true,
  opacity: 1,
  sizeAttenuation: true
});
const points = new THREE.Points(pGeo, pMat);
scene.add(points);

const pGlowMat = new THREE.PointsMaterial({
  size: 4.2,
  vertexColors: true,
  transparent: true,
  opacity: 0.06,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
});
const pointsGlow = new THREE.Points(pGeo, pGlowMat);
scene.add(pointsGlow);

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
  const chaos = distortionAmount;
  const audioKick = 0.35 + audioSmoothed + peakSmoothed * 0.7;
  const chaosBoost = chaos * (1 + audioKick);

  for (let i = 0; i < NUM; i++) {
    const p = pData[i];
    const si = 0.025 + chaos * 0.035;

    const nx = noise3(p.x * si,        p.y * si,        p.z * si + zOff    ) * Math.PI * 4;
    const ny = noise3(p.x * si + 17.3, p.y * si + 31.1, p.z * si + zOff    ) * Math.PI * 4;
    const nz = noise3(p.x * si + 53.7, p.y * si + 7.9,  p.z * si + zOff + 5) * Math.PI * 4;

    const speedBoost = 1 + chaosBoost * 4.5;
    let fx = Math.cos(nx) * p.speed * speedBoost;
    let fy = Math.sin(ny) * p.speed * speedBoost;
    let fz = Math.sin(nz) * p.speed * speedBoost;

    if (chaos > 0) {
      const snap = Math.sin(zOff * 32 + i * 0.019);
      const burst = Math.max(0, snap) * chaos * (2.5 + peakSmoothed * 5);
      fx += (Math.random() - 0.5) * burst * 5;
      fy += (Math.random() - 0.5) * burst * 5;
      fz += (Math.random() - 0.5) * burst * 5;
    }

    // Órbita tangencial cerca de la geometría
    const dx = p.x, dy = p.y, dz = p.z;
    const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (d < R * 2.2 && d > 8) {
      const tang = new THREE.Vector3(-dy, dx, dz * 0.2).normalize();
      const ringDir = (Math.floor(d / R) % 2 === 0) ? 1 : -1;
      const t = 1 - Math.min(d / (R * 2.2), 1);
      fx = fx * (1 - t * 0.7) + tang.x * ringDir * p.speed * speedBoost * t * (0.7 + chaos * 1.2);
      fy = fy * (1 - t * 0.7) + tang.y * ringDir * p.speed * speedBoost * t * (0.7 + chaos * 1.2);
      fz = fz * (1 - t * 0.7) + tang.z * ringDir * p.speed * speedBoost * t * (0.7 + chaos * 1.2);
    }

    const drag = 0.85 - chaos * 0.18;
    const accel = 0.15 + chaos * 0.22;
    p.vx = p.vx * drag + fx * accel;
    p.vy = p.vy * drag + fy * accel;
    p.vz = p.vz * drag + fz * accel;
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;

    p.life -= 1 + chaos * 2;
    if (p.life <= 0 || Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) > R * (3.5 + chaos * 1.2)) {
      const phi2   = Math.acos(2 * Math.random() - 1);
      const theta2 = Math.random() * Math.PI * 2;
      const r2     = 10 + Math.random() * R * (2 + chaos * 1.2);
      p.x = r2 * Math.sin(phi2) * Math.cos(theta2);
      p.y = r2 * Math.sin(phi2) * Math.sin(theta2);
      p.z = r2 * Math.cos(phi2);
      p.vx = (Math.random() - 0.5) * chaos * 12;
      p.vy = (Math.random() - 0.5) * chaos * 12;
      p.vz = (Math.random() - 0.5) * chaos * 12;
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

  if (typeof pointsGlow !== 'undefined' && pointsGlow) {
    const glowBand = Math.min(1.6, 0.25 + audioSmoothed * 0.55 + audioHighs * 0.65 + chaos * 0.85);
    const glowOpacity = Math.min(0.9, 0.12 + glowBand * 0.38 + peakSmoothed * 0.18 + audioBass * 0.15);
    pGlowMat.opacity = glowOpacity;
    pGlowMat.size = 7.8 + glowBand * 6.2 + audioMids * 2.5 + chaos * 8;
    pointsGlow.rotation.y += 0.0004 + audioSmoothed * 0.001 + chaos * 0.006;
    pointsGlow.rotation.x -= 0.0002 + audioBass * 0.0006 + chaos * 0.003;
  }
}


const sacredGroup = new THREE.Group();

while(scene.children.length > 1){
  sacredGroup.add(scene.children[0]);
}

scene.add(sacredGroup);
scene.add(backgroundGrid);

sacredGroup.position.y = 40;


// ── loop de animación ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
const t = performance.now() * 0.001;
  
  let peak = 0;

  if(analyser){

  if (!audioData) {
    audioData = new Uint8Array(analyser.frequencyBinCount);
  }

  analyser.getByteFrequencyData(
    audioData
  );

  audioBass = 0;
  audioMids = 0;
  audioHighs = 0;

const len = audioData.length;

for(let i=0;i<len;i++){

  if(i < len*0.15){
    audioBass += audioData[i];
  }
  else if(i < len*0.5){
    audioMids += audioData[i];
  }
  else{
    audioHighs += audioData[i];
  }
}

audioBass /= (len*0.15)*255;
audioMids /= (len*0.35)*255;
audioHighs /= (len*0.5)*255;

    let sum = 0;

    for(let i=0;i<audioData.length;i++){
      sum += audioData[i];
    }

    audioAverage =
      sum /
      audioData.length /
      255;

    // compute peak (strongest bin) normalized 0..1
    let maxVal = 0;
    for (let i = 0; i < audioData.length; i++) {
      if (audioData[i] > maxVal) maxVal = audioData[i];
    }
    peak = maxVal / 255;
    // smooth the peak to avoid abrupt jumps (exponential moving average)
    peakSmoothed += (peak - peakSmoothed) * 0.12;
    // smooth the overall audio average energy (faster response)
    audioSmoothed += (audioAverage - audioSmoothed) * 0.14;
}

  if (controls) {
    controls.update();
  }

  updateParticles();
  zOff += 0.0365 + distortionAmount * (0.055 + audioSmoothed * 0.05);
  
const pulse =
  1 +
  Math.sin(t * 0.35) * 0.04 +
  audioBass * 0.15 +
  audioMids * 0.08;

sacredGroup.scale.set(
  pulse,
  pulse,
  pulse
);

// use the smoothed average energy (with a stronger peak boost) and allow larger growth
const corePulseRaw = 1 + audioSmoothed * 2.2 + peakSmoothed * 0.8;
const corePulse = Math.min(corePulseRaw, 2.6);
const coreDistortionEnergy = distortionAmount * (0.45 + audioSmoothed + peakSmoothed * 0.8);
const coreJitter = distortionAmount * distortionAmount * (4 + audioSmoothed * 18 + peakSmoothed * 12);
const coreScaleJitter = 1 + Math.sin(t * 42) * coreDistortionEnergy * 0.12;
const coreSquashX = 1 + Math.sin(t * 31.7) * coreDistortionEnergy * 0.08;
const coreSquashY = 1 + Math.cos(t * 38.2) * coreDistortionEnergy * 0.08;
const coreSquashZ = 1 + Math.sin(t * 35.5 + 1.4) * coreDistortionEnergy * 0.08;
const coreBaseScale = corePulse * coreUserScale * coreScaleJitter;
core.scale.set(coreBaseScale * coreSquashX, coreBaseScale * coreSquashY, coreBaseScale * coreSquashZ);
core.position.set(
  Math.sin(t * 47.0) * coreJitter,
  Math.cos(t * 43.0) * coreJitter,
  Math.sin(t * 51.0 + 0.8) * coreJitter * 0.7
);
core.rotation.x += distortionAmount * 0.018;
core.rotation.y += distortionAmount * 0.024;
if (typeof glow !== 'undefined' && glow) {
  glow.position.copy(core.position);
  glow.scale.set(380 * corePulse * coreUserScale * glowUserScale * (1 + coreDistortionEnergy * 0.18), 380 * corePulse * coreUserScale * glowUserScale * (1 + coreDistortionEnergy * 0.18), 1);
  glow.material.opacity = Math.min(1.8, (0.28 + audioSmoothed * 0.65 + peakSmoothed * 0.35 + distortionAmount * 0.22) * glowBrightness);
}

  // update dynamic circles based on bands
  for (const L of dynamicCircles) {
    const band = L.userData.band;
    let s = 1;
    if (band === 'bass') s = 1 + audioBass * 2.0;
    else if (band === 'mids') s = 1 + audioMids * 1.5;
    else s = 1 + audioHighs * 1.0;
    s = Math.min(s, 3.5);
    
    // apply user group scale
    const g = L.userData.group || 'fol';
    const gs = groupScale[g] || 1;
    const bandLevel = band === 'bass' ? audioBass : band === 'mids' ? audioMids : audioHighs;
    const distortionEnergy = distortionAmount * (0.35 + audioSmoothed + bandLevel * 1.2);
    const jitterAmount = distortionAmount * (1.5 + audioSmoothed * 10 + bandLevel * 12);
    const jitterX = Math.sin(t * 15 + L.userData.baseRot) * jitterAmount;
    const jitterY = Math.cos(t * 13 + L.userData.baseRot * 1.7) * jitterAmount;
    const jitterZ = Math.sin(t * 17 + L.userData.baseRot * 0.6) * jitterAmount * 0.7;
    const jitterScale = 1 + Math.sin(t * 19 + L.userData.baseRot) * distortionEnergy * 0.08;

    L.scale.set((s * gs * jitterScale), (s * gs * jitterScale), (s * gs * jitterScale));
    L.position.x = jitterX;
    L.position.y = jitterY;
    L.position.z = jitterZ;
    
    const spinDir = L.userData.spinDir || 1;
    const axis = L.userData.spinAxis || 'z';
      const spinBoost = groupSpinMultiplier[g] || 1;
      const rot = (0.0008 + L.userData.speed * bandLevel * 0.8 + distortionAmount * 0.012) * spinDir * spinBoost;
    if (axis === 'x') L.rotation.x += rot;
    else if (axis === 'y') L.rotation.y += rot;
    else L.rotation.z += rot;

    // randomize colors on audio peaks while keeping band-dependent palette shifts
    if (bandLevel > 0.28 || audioAverage > 0.18) {
      if (Math.random() < 0.035 + bandLevel * 0.08) {
        L.userData.baseHue = Math.random();
        L.userData.hueJitter = Math.random();
      }
    }

    const hue = (L.userData.baseHue + audioSmoothed * 0.45 + bandLevel * 0.25 + L.userData.hueJitter * 0.05) % 1;
    const sat = Math.min(1, 0.6 + bandLevel * 0.4);
    const lit = Math.min(0.78, 0.42 + audioSmoothed * 0.28 + bandLevel * 0.18);
    for (const mesh of (L.userData.strokeMeshes || [])) {
      if (mesh.material && mesh.material.color) {
        mesh.material.color.setHSL(hue, sat, lit);
        mesh.material.opacity = Math.min(1, 0.18 + bandLevel * 0.9);
      }
      distortLineGeometry(mesh, t, distortionAmount, bandLevel);
    }

    // Update glow meshes with audio reactivity
    for (const glowMesh of (L.userData.glowMeshes || [])) {
      if (glowMesh.material && glowMesh.material.color) {
        glowMesh.material.color.setHSL(hue, sat, lit);
        const glowOpacity = Math.min(0.45, 0.08 + bandLevel * 0.35 + audioSmoothed * 0.15);
        glowMesh.material.opacity = glowOpacity;
      }
    }
  }

  sacredGroup.rotation.y += 0.001 + audioSmoothed * 0.01;
  sacredGroup.rotation.x += (audioBass - audioHighs) * 0.0015;
  sacredGroup.position.y = 80 + audioAverage * 35;
  backgroundGrid.position.x = camera.position.x;
  backgroundGrid.position.z = camera.position.z;
  renderer.render(scene, camera);

  // update debug overlay
  _frameCount++;
  const now = performance.now();
  if (now - _lastFpsTime >= 500) {
    const fps = Math.round((_frameCount * 1000) / (now - _lastFpsTime));
    const hasCanvas = !!document.getElementById('c');
    const hasRenderer = !!renderer;
    const sceneCount = scene ? scene.children.length : 'no scene';
    const analyserState = analyser ? 'yes' : 'no';
    const audioInputExists = !!document.getElementById('audioUpload');
    const coreScale = core ? core.scale.x.toFixed(2) : 'n/a';
    _dbg.textContent =
      `GEODESIGN\nfps: ${fps} \ncanvas: ${hasCanvas} renderer: ${hasRenderer} \nscene children: ${sceneCount} \naudio input: ${audioInputExists} analyser: ${analyserState} \ncore: ${coreScale} \nlastErr: ${_lastErrorMsg}`;
    _frameCount = 0; _lastFpsTime = now;
  }
  // apply particle scale if present
  if (typeof points !== 'undefined' && points) {
    const pscale = groupScale.particles || 1;
    points.scale.set(pscale, pscale, pscale);
  }
  if (typeof pointsGlow !== 'undefined' && pointsGlow) {
    const pscale = groupScale.particles || 1;
    pointsGlow.scale.set(pscale, pscale, pscale);
  }
}

// ── Resize ────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const W2 = container.clientWidth, H2 = container.clientHeight;
  camera.aspect = W2 / H2;
  camera.updateProjectionMatrix();
  renderer.setSize(W2, H2);
  
});



const coreGeo = new THREE.SphereGeometry(40, 72, 72, 1);

const coreMat = new THREE.MeshBasicMaterial({
  color: 0x66ccff,
  transparent: false,
  opacity: 1,
  toneMapped: false
});



const core = new THREE.Mesh(coreGeo, coreMat);

core.position.set(0,0,0);

sacredGroup.add(core);

// --- Glow / halo around core (sprite with radial gradient)
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 256;
const gc = glowCanvas.getContext('2d');
const grad = gc.createRadialGradient(128,128,20,128,128,128);
grad.addColorStop(0, 'rgba(102,204,255,0.95)');
grad.addColorStop(0.2, 'rgba(102,204,255,0.6)');
grad.addColorStop(0.45, 'rgba(102,204,255,0.18)');
grad.addColorStop(1, 'rgba(102,204,255,0)');
gc.fillStyle = grad;
gc.fillRect(0,0,256,256);
const glowTex = new THREE.CanvasTexture(glowCanvas);
const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const glow = new THREE.Sprite(glowMat);
glow.scale.set(320, 320, 1);
glow.position.copy(core.position);
sacredGroup.add(glow);

syncSphereColor();
glowMat.opacity = 1 * glowBrightness;
syncGlowColor();

// AUDIO REACTIVO

const audioInput =
document.getElementById("audioUpload");

audioInput.addEventListener("change",(e)=>{

  const file = e.target.files[0];

  if(!file) return;

  const audio = new Audio(
    URL.createObjectURL(file)
  );

  audio.loop = true;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audio);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;

  // Create and connect WaveShaper for distortion
  waveshaper = audioCtx.createWaveShaper();
  waveshaper.curve = createDistortionCurve(distortionAmount);
  waveshaper.oversample = '4x';

  source.connect(waveshaper);
  waveshaper.connect(analyser);
  analyser.connect(audioCtx.destination);

  audioData = new Uint8Array(analyser.frequencyBinCount);

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

animate();
