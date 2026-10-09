// 3D converter board that lives behind the page and changes with scroll.
// Built procedurally from Three.js primitives: no model files to load.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const canvas = document.getElementById('three');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = () => innerWidth < 1000;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no3d');
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall() ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 18);

scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x0a1222, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(4, 9, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0x2dd4bf, 1.6);
rim.position.set(-7, 3, -6);
scene.add(rim);
const fill = new THREE.PointLight(0x38bdf8, 40, 40);
fill.position.set(-6, -4, 8);
scene.add(fill);

// Wait briefly for the mono font so canvas-drawn labels use it
try {
  await Promise.race([document.fonts.load('600 32px "JetBrains Mono"'), new Promise((r) => setTimeout(r, 1500))]);
} catch { /* fall back to system monospace */ }
const MONO = '"JetBrains Mono", ui-monospace, monospace';

/* ------------------------------------------------------------------ */
/* materials                                                          */
/* ------------------------------------------------------------------ */
const solidMats = new Set();
const mat = (Type, opts) => { const m = new Type({ transparent: true, ...opts }); solidMats.add(m); return m; };
const std = (opts) => mat(THREE.MeshStandardMaterial, opts);

const M = {
  mask: mat(THREE.MeshPhysicalMaterial, { color: 0x0b3640, roughness: 0.45, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.25 }),
  copper: std({ color: 0x1f8a83, roughness: 0.35, metalness: 0.6, emissive: 0x2dd4bf, emissiveIntensity: 0.15 }),
  gold: std({ color: 0xd8b25a, roughness: 0.25, metalness: 1 }),
  epoxy: std({ color: 0x15171c, roughness: 0.55, metalness: 0.1 }),
  mosfet: std({ color: 0x16181d, roughness: 0.5, metalness: 0.1, emissive: 0x2dd4bf, emissiveIntensity: 0 }),
  mcu: std({ color: 0x14161b, roughness: 0.45, metalness: 0.15, emissive: 0x2dd4bf, emissiveIntensity: 0 }),
  tin: std({ color: 0xc9d1d9, roughness: 0.3, metalness: 1 }),
  alu: std({ color: 0xaab4c3, roughness: 0.32, metalness: 0.9 }),
  core: std({ color: 0x2b3240, roughness: 0.7, metalness: 0.2 }),
  wind1: std({ color: 0xc8733f, roughness: 0.28, metalness: 1, emissive: 0xff8a3d, emissiveIntensity: 0 }),
  wind2: std({ color: 0xc8733f, roughness: 0.28, metalness: 1, emissive: 0xff8a3d, emissiveIntensity: 0 }),
  sleeve: std({ color: 0x1d3f8f, roughness: 0.45, metalness: 0.15, emissive: 0x38bdf8, emissiveIntensity: 0 }),
  stripe: std({ color: 0xcbd5e1, roughness: 0.5, metalness: 0.1 }),
  rubber: std({ color: 0x1b1d22, roughness: 0.9, metalness: 0 }),
  terminal: std({ color: 0x15803d, roughness: 0.5, metalness: 0.05 }),
  hvTerm: std({ color: 0xea580c, roughness: 0.5, metalness: 0.05 }),
  hole: std({ color: 0x050608, roughness: 1, metalness: 0 }),
  res: std({ color: 0x1e2127, roughness: 0.6, metalness: 0.1 }),
  mlcc: std({ color: 0xb08d57, roughness: 0.6, metalness: 0.1 }),
  ledG: std({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 2.2 }),
  ledA: std({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 2.2 }),
  pack: std({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 }),
  packLid: std({ color: 0x334155, roughness: 0.35, metalness: 0.6 }),
  scSleeve: std({ color: 0x0f766e, roughness: 0.45, metalness: 0.2 }),
  cellOn: std({ color: 0x0f3d3a, emissive: 0x2dd4bf, emissiveIntensity: 0 }),
  red: std({ color: 0xdc2626, roughness: 0.4 }),
  black: std({ color: 0x0b0c0f, roughness: 0.5 }),
  cableLV: std({ color: 0x991b1b, roughness: 0.55, metalness: 0.05 }),
  cableHV: std({ color: 0xf97316, roughness: 0.5, metalness: 0.05 }),
  busbar: std({ color: 0xc8733f, roughness: 0.3, metalness: 1 }),
};
const lineMat = new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0, depthWrite: false });
const edgeLines = [];

function add(parent, geo, material, o = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  m.castShadow = o.cast !== false;
  m.receiveShadow = !!o.receive;
  parent.add(m);
  if (o.edges !== false) {
    const l = new THREE.LineSegments(o.edgeGeo || new THREE.EdgesGeometry(geo, 20), lineMat);
    m.add(l);
    edgeLines.push(l);
  }
  return m;
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();
function glow(color, size) {
  const m = new THREE.SpriteMaterial({ map: GLOW, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
}

function labelTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const labelMats = [];
function labelPlane(parent, tex, w, h, o) {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  labelMats.push(m);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(o.x || 0, o.y || 0, o.z || 0);
  p.rotation.set(o.rx ?? -Math.PI / 2, o.ry || 0, o.rz || 0);
  parent.add(p);
  return p;
}

/* ------------------------------------------------------------------ */
/* the board                                                          */
/* ------------------------------------------------------------------ */
const BW = 6.4, BD = 4.2, BT = 0.12, TOP = BT / 2;
const root = new THREE.Group();
const board = new THREE.Group();
root.add(board);
scene.add(root);

const parts = []; // exploded-view groups
function part(x, z, lift, o = {}) {
  const g = new THREE.Group();
  g.position.set(x, TOP, z);
  g.userData = { base: g.position.clone(), lift, dx: o.dx || 0, dz: o.dz || 0, spin: o.spin || 0 };
  board.add(g); parts.push(g);
  return g;
}

// PCB
add(board, new THREE.BoxGeometry(BW, BT, BD), M.mask, { receive: true });
for (const [x, z] of [[-2.95, -1.85], [2.95, -1.85], [-2.95, 1.85], [2.95, 1.85]]) {
  add(board, new THREE.CylinderGeometry(0.17, 0.17, BT + 0.012, 24), M.gold, { x, z, edges: false, cast: false });
  add(board, new THREE.CylinderGeometry(0.09, 0.09, BT + 0.02, 16), M.hole, { x, z, edges: false, cast: false });
}

// Copper traces (merged into one mesh)
const FLOW1 = [[-2.55, -1.15], [0, -1.15], [0, -1.95], [1.72, -1.95], [1.72, 0], [2.5, 0]];
const FLOW2 = [[-2.55, 1.15], [0, 1.15], [0, 1.95], [1.72, 1.95], [1.72, 0], [2.5, 0]];
const QZ = [-1.5, -0.5, 0.5, 1.5];
const traceGeos = [];
function trace(pts, w) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.BoxGeometry(len + w, 0.014, w);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
    g.translate((x0 + x1) / 2, TOP + 0.007, (z0 + z1) / 2);
    traceGeos.push(g);
  }
}
trace(FLOW1, 0.2); trace(FLOW2, 0.2);
trace([[0, -1.78], [0, -0.22]], 0.28); trace([[0, 0.22], [0, 1.78]], 0.28);
const vias = [];
for (const zq of QZ) {
  const s = Math.sign(zq);
  if (Math.abs(zq) < 1) trace([[-1.05, zq * 0.2], [-0.8, zq * 0.2], [-0.8, zq], [-0.52, zq]], 0.045);
  else {
    // outer gates hop to the bottom layer under the power trace
    trace([[-1.05, s * 0.3], [-0.8, s * 0.3], [-0.8, s * 0.92]], 0.045);
    trace([[-0.8, s * 1.38], [-0.8, zq], [-0.52, zq]], 0.045);
    vias.push([-0.8, s * 0.92], [-0.8, s * 1.38]);
  }
  trace([[-0.28, zq], [-0.02, zq]], 0.06);
}
trace([[2.5, 0], [2.5, 0.3]], 0.2);
add(board, mergeGeometries(traceGeos), M.copper, { cast: false, receive: true, edges: false });
for (const p of [[-2.2, 0.3], [-2.2, -0.3], [2.3, 1.2], [2.3, -1.2], [1.1, 2.0], [1.1, -2.0], [-0.2, 0], [-2.5, 1.7], [-2.5, -1.7]]) vias.push(p);
const viaMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, BT + 0.02, 12), M.gold, vias.length);
vias.forEach(([x, z], i) => viaMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0, z)));
board.add(viaMesh);

// Silkscreen: one canvas texture covering the board top
const SX = (x) => ((x + BW / 2) / BW) * 2048, SY = (z) => ((z + BD / 2) / BD) * 1344;
const silk = labelTexture(2048, 1344, (g) => {
  g.strokeStyle = 'rgba(232,241,245,.75)'; g.fillStyle = 'rgba(232,241,245,.85)'; g.lineWidth = 3;
  g.strokeRect(18, 18, 2048 - 36, 1344 - 36);
  const circ = (x, z, r) => { g.beginPath(); g.arc(SX(x), SY(z), (r / BW) * 2048, 0, Math.PI * 2); g.stroke(); };
  const rect = (x, z, w, d) => g.strokeRect(SX(x - w / 2), SY(z - d / 2), (w / BW) * 2048, (d / BD) * 1344);
  const text = (s, x, z, size = 26, align = 'left') => { g.font = `600 ${size}px ${MONO}`; g.textAlign = align; g.fillText(s, SX(x), SY(z)); };
  circ(-1.4, -1.15, 0.68); circ(-1.4, 1.15, 0.68);
  [-1.3, 0, 1.3].forEach((z) => { circ(1.72, z, 0.41); text('+', 1.72 + 0.48, z - 0.18, 30); });
  rect(-1.4, 0, 0.8, 0.8); rect(-2.82, -1.15, 0.62, 0.9); rect(-2.82, 1.15, 0.62, 0.9); rect(2.75, 0, 0.62, 1.1);
  g.setLineDash([14, 10]); rect(0.78, 0, 0.92, 3.86); g.setLineDash([]);
  QZ.forEach((z, i) => { rect(-0.4, z, 0.3, 0.38); text(`Q${i + 1}`, -0.12, z + 0.36, 22); text(`U${i + 2}`, -0.62, z - 0.24, 18); });
  text('MULTIPORT BIDIRECTIONAL DC-DC  ·  A-DLC', -3.05, -1.9, 32);
  text('HESS  ·  72 V / 48 V  ⇄  400 / 800 V', -3.05, 2.02, 28);
  text('PORT 1 · 72 V', -3.05, -1.67, 22); text('PORT 2 · 48 V', -3.05, 1.8, 22);
  text('L1', -0.62, -1.62, 26); text('L2', -0.62, 1.78, 26); text('U1', -1.86, -0.32, 22);
  text('C1', 2.2, -1.62, 22); text('C2', 2.2, 0.42, 22); text('C3', 2.2, 1.7, 22);
  text('HV', 2.55, 0.86, 30); text('400/800 V', 2.4, 1.04, 20);
  g.beginPath(); g.moveTo(SX(2.95), SY(0.62)); g.lineTo(SX(3.08), SY(0.86)); g.lineTo(SX(2.82), SY(0.86)); g.closePath(); g.stroke();
});
const silkPlane = labelPlane(board, silk, BW, BD, { y: TOP + 0.016 });

// Terminal blocks for the two low-voltage ports
for (const z of [-1.15, 1.15]) {
  const g = part(-2.82, z, 1.1, { dx: -0.5 });
  add(g, new THREE.BoxGeometry(0.56, 0.5, 0.82), M.terminal, { y: 0.25 });
  for (const dz of [-0.2, 0.2]) {
    add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), M.tin, { y: 0.52, z: dz, edges: false });
    add(g, new THREE.BoxGeometry(0.14, 0.18, 0.18), M.hole, { x: -0.22, y: 0.22, z: dz, edges: false });
  }
}

// Toroidal inductors L1, L2
class Winding extends THREE.Curve {
  constructor(R, r, turns) { super(); Object.assign(this, { R, r, turns }); }
  getPoint(t, target = new THREE.Vector3()) {
    const u = t * Math.PI * 2, v = u * this.turns;
    const rr = this.r * 1.06;
    return target.set((this.R + rr * Math.cos(v)) * Math.cos(u), rr * Math.sin(v), (this.R + rr * Math.cos(v)) * Math.sin(u));
  }
}
const inductors = [];
for (const [z, wm] of [[-1.15, M.wind1], [1.15, M.wind2]]) {
  const g = part(-1.4, z, 2.0, { spin: 0.8 });
  add(g, new THREE.TorusGeometry(0.44, 0.19, 18, 48), M.core, {
    y: 0.21, rx: -Math.PI / 2, edgeGeo: new THREE.WireframeGeometry(new THREE.TorusGeometry(0.44, 0.19, 6, 16)),
  });
  add(g, new THREE.TubeGeometry(new Winding(0.44, 0.19, 26), 26 * 20, 0.028, 6, true), wm, { y: 0.21, edges: false });
  inductors.push(g);
}

// Controller (QFP) + crystal
{
  const g = part(-1.4, 0, 2.8);
  add(g, new THREE.BoxGeometry(0.62, 0.09, 0.62), M.mcu, { y: 0.06 });
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.02, 0.025), M.tin, 48);
  const m4 = new THREE.Matrix4(); let k = 0;
  for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) {
    const a = -0.253 + i * 0.046;
    m4.makeRotationY((side * Math.PI) / 2).setPosition(...[[0.35, 0.02, a], [a, 0.02, -0.35], [-0.35, 0.02, a], [a, 0.02, 0.35]][side]);
    pins.setMatrixAt(k++, m4);
  }
  g.add(pins);
  add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16), M.stripe, { x: -0.22, y: 0.106, z: -0.22, edges: false });
  const lbl = labelTexture(256, 256, (c) => {
    c.fillStyle = 'rgba(180,190,205,.8)'; c.textAlign = 'center';
    c.font = `600 54px ${MONO}`; c.fillText('A-DLC', 128, 120);
    c.font = `500 30px ${MONO}`; c.fillText('CTRL', 128, 168);
  });
  labelPlane(g, lbl, 0.5, 0.5, { y: 0.107 });
  const xt = part(-1.92, 0, 2.3);
  add(xt, new THREE.BoxGeometry(0.14, 0.08, 0.32), M.tin, { y: 0.04 });
}

// Gate drivers (SOIC-8)
for (const z of QZ) {
  const g = part(-0.4, z, 1.6);
  add(g, new THREE.BoxGeometry(0.22, 0.07, 0.3), M.epoxy, { y: 0.05 });
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.02, 0.03), M.tin, 8);
  let k = 0;
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) pins.setMatrixAt(k++, new THREE.Matrix4().makeTranslation(sx * 0.14, 0.015, -0.105 + i * 0.07));
  g.add(pins);
}

// SiC MOSFETs (TO-247) against the heatsink
const legGeo = new THREE.BoxGeometry(0.03, 0.47, 0.07);
for (const z of QZ) {
  const g = part(0.17, z, 1.7, { dx: -0.8 });
  add(g, new THREE.BoxGeometry(0.2, 0.78, 0.6), M.mosfet, { y: 0.84 });
  add(g, new THREE.BoxGeometry(0.04, 1.05, 0.6), M.tin, { x: 0.12, y: 0.975 });
  add(g, new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), M.hole, { x: 0.12, y: 1.33, rz: Math.PI / 2, edges: false });
  for (const dz of [-0.2, 0, 0.2]) add(g, legGeo, M.tin, { y: 0.235, z: dz, edges: false });
}

// Heatsink (base plate + fins merged)
{
  const g = part(0.36, 0, 3.0, { dx: 1.2 });
  const geos = [new THREE.BoxGeometry(0.08, 1.5, 3.7).translate(0, 0.75, 0)];
  for (let k = 0; k < 13; k++) geos.push(new THREE.BoxGeometry(0.78, 1.5, 0.045).translate(0.43, 0.75, -1.8 + k * 0.3));
  add(g, mergeGeometries(geos), M.alu);
}

// DC-link electrolytic capacitors
const capParts = [];
for (const z of [-1.3, 0, 1.3]) {
  const g = part(1.72, z, 2.3, { dx: 0.8 });
  add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24), M.rubber, { y: 0.02, edges: false });
  add(g, new THREE.CylinderGeometry(0.36, 0.36, 1.25, 40), M.sleeve, { y: 0.665, edgeGeo: new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.36, 0.36, 1.25, 12), 1) });
  add(g, new THREE.CylinderGeometry(0.363, 0.363, 1.2, 16, 1, true, Math.PI * 0.85, 0.6), M.stripe, { y: 0.665, edges: false });
  add(g, new THREE.CylinderGeometry(0.33, 0.33, 0.03, 40), M.alu, { y: 1.3, edges: false });
  add(g, new THREE.BoxGeometry(0.46, 0.012, 0.025), M.hole, { y: 1.318, ry: Math.PI / 4, edges: false });
  add(g, new THREE.BoxGeometry(0.46, 0.012, 0.025), M.hole, { y: 1.318, ry: -Math.PI / 4, edges: false });
  capParts.push(g);
}

// HV terminal
{
  const g = part(2.75, 0, 1.4, { dx: 0.8 });
  add(g, new THREE.BoxGeometry(0.56, 0.56, 1.0), M.hvTerm, { y: 0.28 });
  for (const dz of [-0.24, 0.24]) {
    add(g, new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), M.tin, { y: 0.59, z: dz, edges: false });
    add(g, new THREE.BoxGeometry(0.14, 0.2, 0.2), M.hole, { x: 0.23, y: 0.24, z: dz, edges: false });
  }
}

// Status LEDs
const ledGroup = part(2.95, -1.5, 1.0);
const ledHalos = [];
[[0, -0.25, M.ledG, 0x34d399], [0, 0, M.ledG, 0x34d399], [0, 0.25, M.ledA, 0xfbbf24]].forEach(([x, z, m, c]) => {
  add(ledGroup, new THREE.BoxGeometry(0.08, 0.06, 0.12), m, { x, y: 0.03, z, edges: false });
  const s = glow(c, 0.42); s.position.set(x, 0.08, z); ledGroup.add(s); ledHalos.push(s.material);
});

// SMD passives
{
  const g = part(0, 0, 0.9);
  const R = [], C = [];
  for (const z of QZ) { R.push([-0.4, z + 0.26]); C.push([-0.4, z - 0.26]); R.push([-0.62, z + 0.08]); }
  for (const [x, z] of [[-1.82, 0.35], [-1.82, -0.35], [-0.98, 0.42], [-0.98, -0.42]]) C.push([x, z]);
  for (const [x, z] of [[-2.3, 0.35], [-2.3, -0.35], [-2.3, 0], [2.6, -1.05], [2.6, -1.25], [2.6, 1.3], [2.6, 1.5]]) R.push([x, z]);
  for (const [list, m] of [[R, M.res], [C, M.mlcc]]) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.05, 0.06), m, list.length);
    list.forEach(([x, z], i) => im.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 0.025, z)));
    im.castShadow = true; g.add(im);
  }
}

// Current pulses travelling along the power paths
function polyline(pts, y) {
  const P = pts.map(([x, z]) => new THREE.Vector3(x, y, z));
  const seg = []; let L = 0;
  for (let i = 1; i < P.length; i++) { const d = P[i].distanceTo(P[i - 1]); seg.push(d); L += d; }
  return { at(f, out) {
    let d = f * L;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) return out.lerpVectors(P[i], P[i + 1], d / seg[i]); d -= seg[i]; }
    return out.copy(P[P.length - 1]);
  } };
}
const pulses = [];
for (const path of [polyline(FLOW1, TOP + 0.05), polyline(FLOW2, TOP + 0.05)]) {
  for (let i = 0; i < 5; i++) {
    const s = glow(0x5eead4, 0.38); board.add(s);
    pulses.push({ s, path, f: i / 5 });
  }
}

// "Real-time" scan sweep (OPAL-RT step)
const scanMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const scanHaloMat = scanMat.clone();
const scan = new THREE.Group();
scan.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.7, BD + 0.1), scanMat));
scan.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, BD + 0.1), scanHaloMat));
scan.position.y = 0.85;
board.add(scan);

// Blueprint grid
const grid = new THREE.GridHelper(16, 32, 0x2dd4bf, 0x1f4f5a);
grid.material.transparent = true; grid.material.opacity = 0; grid.material.depthWrite = false;
grid.position.y = -0.1;
root.add(grid);

/* ------------------------------------------------------------------ */
/* HESS: battery + supercapacitor in, EV battery out                  */
/* ------------------------------------------------------------------ */
const hess = new THREE.Group();
root.add(hess);
const hessMods = [];
function mod(x, z, side) { const g = new THREE.Group(); g.position.set(x, -0.06, z); g.userData = { x, side }; hess.add(g); hessMods.push(g); return g; }
const cellsLit = [];
function chargeBar(g, n, x0, w, y, z) {
  for (let i = 0; i < n; i++) {
    const m = M.cellOn.clone(); solidMats.add(m); cellsLit.push(m);
    add(g, new THREE.BoxGeometry(w * 0.8, 0.14, 0.02), m, { x: x0 + i * w, y, z, edges: false, cast: false });
  }
}
function packLabel(g, a, b, w, x, y, z) {
  const t = labelTexture(512, 160, (c) => {
    c.fillStyle = 'rgba(232,241,245,.9)'; c.font = `700 64px ${MONO}`; c.fillText(a, 16, 78);
    c.fillStyle = 'rgba(143,160,186,.9)'; c.font = `500 36px ${MONO}`; c.fillText(b, 16, 136);
  });
  labelPlane(g, t, w, w * 0.3125, { x, y, z });
}
{ // 72 V battery (port 1)
  const g = mod(-5.5, -1.2, -1);
  add(g, new THREE.BoxGeometry(1.7, 0.9, 1.3), M.pack, { y: 0.45 });
  add(g, new THREE.BoxGeometry(1.6, 0.05, 1.2), M.packLid, { y: 0.92 });
  add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16), M.red, { x: 0.62, y: 1.0, z: -0.3, edges: false });
  add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16), M.black, { x: 0.62, y: 1.0, z: 0.3, edges: false });
  packLabel(g, '72 V', 'BATTERY · PORT 1', 1.1, -0.15, 0.96, 0);
  chargeBar(g, 6, -0.6, 0.24, 0.45, 0.66);
}
{ // 48 V supercapacitor bank (port 2)
  const g = mod(-5.5, 1.3, -1);
  for (const dx of [-0.55, 0, 0.55]) {
    add(g, new THREE.CylinderGeometry(0.25, 0.25, 1.0, 32), M.scSleeve, { x: dx, y: 0.5, edgeGeo: new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.25, 0.25, 1.0, 10), 1) });
    add(g, new THREE.CylinderGeometry(0.23, 0.23, 0.03, 32), M.alu, { x: dx, y: 1.01, edges: false });
  }
  add(g, new THREE.BoxGeometry(1.4, 0.04, 0.12), M.busbar, { y: 1.04, edges: false });
  packLabel(g, '48 V', 'SUPERCAP · PORT 2', 1.1, 0, 0.002, 0.62);
}
{ // EV battery (output)
  const g = mod(5.7, 0, 1);
  add(g, new THREE.BoxGeometry(1.9, 1.0, 2.8), M.pack, { y: 0.5 });
  add(g, new THREE.BoxGeometry(1.8, 0.05, 2.7), M.packLid, { y: 1.02 });
  for (const z of [-0.9, 0, 0.9]) add(g, new THREE.BoxGeometry(1.6, 0.02, 0.04), M.hole, { y: 1.055, z, edges: false });
  packLabel(g, 'EV', 'HV BATTERY', 1.3, 0, 1.06, 0.45);
  chargeBar(g, 8, -0.75, 0.22, 0.5, 1.41);
}
// Cables (drawn progressively)
const cables = [];
function cable(points, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 64, 0.055, 8, false);
  const mesh = add(hess, geo, material, { edges: false });
  const ps = [];
  for (let i = 0; i < 3; i++) { const s = glow(0x5eead4, 0.32); hess.add(s); ps.push({ s, f: i / 3 }); }
  cables.push({ mesh, curve, total: geo.index.count, ps });
}
cable([[-4.88, 0.98, -1.5], [-4.2, 1.2, -1.5], [-3.4, 0.7, -1.3], [-3.1, 0.2, -1.15]], M.cableLV);
cable([[-4.95, 0.95, 1.3], [-4.2, 1.15, 1.25], [-3.4, 0.7, 1.2], [-3.1, 0.2, 1.15]], M.cableLV);
cable([[3.03, 0.22, 0], [3.7, 0.7, 0], [4.3, 1.0, -0.2], [4.75, 0.6, -0.4]], M.cableHV);

/* ------------------------------------------------------------------ */
/* scroll states                                                      */
/* ------------------------------------------------------------------ */
const BASE = { fit: 0.95, rx: 0.6, ry: -0.5, explode: 0, wire: 0, glow: 0.6, hess: 0, scan: 0, spin: 0, dim: 1, zoom: 1, hlMcu: 0, hlQ: 0, hlL: 0, inter: 0, grid: 0, sx: 0.5, sy: 0.5, size: 0.8 };
const KEYS = Object.keys(BASE);
const S = (o) => ({ ...BASE, ...o });
const heroState = S({ slot: '#heroSlot', rx: 0.62, ry: -0.6, glow: 0.65 });
const stepM = { sx: 0.5, sy: 0.3, size: 1.05, dim: 0.4 };
const anchors = [
  { sel: '.hero', mode: 'top', st: heroState },
  { sel: '[data-step="0"]', mode: 'center', st: S({ slot: '#stage', rx: 1.12, ry: 0, wire: 1, grid: 1, glow: 0.25, m: stepM }) },
  { sel: '[data-step="1"]', mode: 'center', st: S({ slot: '#stage', rx: 0.72, ry: 0.6, glow: 0.95, hlMcu: 1, hlQ: 1, m: stepM }) },
  { sel: '[data-step="2"]', mode: 'center', st: S({ slot: '#stage', rx: 0.8, ry: -0.18, hess: 1, zoom: 0.58, glow: 1, m: { ...stepM, size: 1.1 } }) },
  { sel: '[data-step="3"]', mode: 'center', st: S({ slot: '#stage', rx: 1.0, ry: 0.3, scan: 1, glow: 1, hlQ: 0.6, m: stepM }) },
  { sel: '#bench', mode: 'top', st: S({ sx: 0.86, sy: 0.24, size: 0.5, rx: 0.5, ry: -1.0, inter: 1, hlL: 0.4, dim: 0.32, m: { sx: 0.5, sy: 0.22, size: 1, dim: 0.3 } }) },
  { sel: '#projects', mode: 'top', st: S({ sx: 0.62, sy: 0.6, size: 0.72, explode: 1, spin: 1, dim: 0.26, rx: 0.5, glow: 0.7, m: { sx: 0.5, size: 1.1, dim: 0.22 } }) },
  { sel: '#experience', mode: 'top', st: S({ sx: 0.82, sy: 0.3, size: 0.55, explode: 0.35, rx: 0.65, ry: 0.9, dim: 0.3, m: { sx: 0.5, sy: 0.5, size: 1, dim: 0.28 } }) },
  { sel: '#skills', mode: 'top', st: S({ sx: 0.78, sy: 0.24, size: 0.55, wire: 0.85, grid: 0.6, rx: 0.9, ry: -0.8, dim: 0.4, m: { sx: 0.5, sy: 0.5, size: 1, dim: 0.3 } }) },
  { sel: '#contact', mode: 'top', st: S({ slot: '#contactSlot', fit: 0.8, rx: 0.55, ry: -0.5, spin: 0.5, glow: 1, dim: 1 }) },
];
anchors.forEach((a) => { a.el = document.querySelector(a.sel); a.slotEl = a.st.slot ? document.querySelector(a.st.slot) : null; });

function measure() {
  const max = document.documentElement.scrollHeight - innerHeight;
  let prev = -1;
  for (const a of anchors) {
    const r = a.el.getBoundingClientRect(), top = r.top + scrollY;
    let s = a.mode === 'center' ? top + r.height / 2 - innerHeight / 2 : top - innerHeight * 0.3;
    s = Math.min(Math.max(0, s), max);
    if (s <= prev) s = prev + 1;
    a.s = s; prev = s;
  }
}

function resolve(a) {
  const st = isSmall() && a.st.m ? { ...a.st, ...a.st.m } : a.st;
  const slot = a.slotEl;
  if (slot && slot.offsetParent !== null) {
    const r = slot.getBoundingClientRect();
    return { st, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width * st.fit };
  }
  return { st, x: st.sx * innerWidth, y: st.sy * innerHeight, w: st.size * Math.min(innerWidth, innerHeight * 1.35) };
}

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
function target() {
  const y = scrollY;
  let i = 0;
  while (i < anchors.length - 1 && y >= anchors[i + 1].s) i++;
  const A = resolve(anchors[i]);
  if (i === anchors.length - 1) return { ...A.st, x: A.x, y: A.y, w: A.w };
  const B = resolve(anchors[i + 1]);
  const raw = (y - anchors[i].s) / (anchors[i + 1].s - anchors[i].s);
  const t = smooth(clamp01((raw - 0.2) / 0.6));
  const out = {};
  for (const k of KEYS) out[k] = A.st[k] + (B.st[k] - A.st[k]) * t;
  out.x = A.x + (B.x - A.x) * t; out.y = A.y + (B.y - A.y) * t; out.w = A.w + (B.w - A.w) * t;
  return out;
}

/* ------------------------------------------------------------------ */
/* interaction                                                        */
/* ------------------------------------------------------------------ */
let flowDir = 1, userYaw = 0, userPitch = 0, px = 0, py = 0, dragging = false, lastX = 0, lastY = 0;
const heroHud = document.getElementById('heroHudState');
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
  const v = b.dataset.view;
  heroState.explode = v === 'exploded' ? 1 : 0;
  heroState.wire = v === 'blueprint' ? 1 : 0;
  heroState.grid = v === 'blueprint' ? 1 : 0;
  heroHud.textContent = v.toUpperCase();
}));
document.querySelectorAll('[data-flow]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-flow]').forEach((x) => x.classList.toggle('on', x === b));
  flowDir = b.dataset.flow === 'buck' ? -1 : 1;
}));
const heroSlot = document.getElementById('heroSlot');
heroSlot.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; heroSlot.setPointerCapture(e.pointerId); });
heroSlot.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  userYaw += (e.clientX - lastX) * 0.008;
  userPitch = Math.max(-0.5, Math.min(0.6, userPitch + (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY;
});
const endDrag = () => { dragging = false; };
heroSlot.addEventListener('pointerup', endDrag);
heroSlot.addEventListener('pointercancel', endDrag);
addEventListener('pointermove', (e) => { px = (e.clientX / innerWidth) * 2 - 1; py = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    measure();
  }, 120);
});
addEventListener('load', measure);
setInterval(measure, 2000);
measure();

/* ------------------------------------------------------------------ */
/* frame loop                                                         */
/* ------------------------------------------------------------------ */
const cur = { ...target() };
const tmp = new THREE.Vector3();
const BOARD_SPAN = 7.8;
let spinAngle = 0, last = performance.now(), introStart = null, time = 0;
const ease = (t) => 1 - Math.pow(1 - t, 3);

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (introStart === null) introStart = now;
  time += reduceMotion ? 0 : dt;

  const tg = target();
  const k = 1 - Math.exp(-dt * 5);
  for (const key of Object.keys(tg)) cur[key] += (tg[key] - cur[key]) * k;

  // intro: the board materialises from blueprint to hardware
  const ip = reduceMotion ? 1 : clamp01((now - introStart) / 2600);
  const wire = Math.max(cur.wire, 1 - ease(clamp01(ip * 1.25)));
  const explode = Math.max(cur.explode, 0.9 * (1 - ease(ip)));

  // placement: screen position + pixel width -> world transform
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const visW = visH * camera.aspect;
  const s = ((cur.w / innerWidth) * visW / BOARD_SPAN) * cur.zoom * (1 - 0.18 * explode);
  root.scale.setScalar(s);
  root.position.set((cur.x / innerWidth - 0.5) * visW, -(cur.y / innerHeight - 0.5) * visH - explode * 1.1 * s, 0);

  spinAngle += dt * 0.35 * cur.spin;
  if (cur.spin < 0.3) spinAngle = Math.atan2(Math.sin(spinAngle), Math.cos(spinAngle)) * (1 - Math.min(1, dt * 2));
  if (!dragging) { userYaw *= 1 - Math.min(1, dt * 0.5); userPitch *= 1 - Math.min(1, dt * 0.8); }
  const idle = reduceMotion ? 0 : Math.sin(time * 0.4) * 0.08;
  root.rotation.set(cur.rx + userPitch + py * 0.05, cur.ry + spinAngle + userYaw + idle + px * 0.12, 0);

  // exploded view
  for (const g of parts) {
    const u = g.userData;
    g.position.set(u.base.x + u.dx * explode + u.base.x * 0.18 * explode, u.base.y + u.lift * explode, u.base.z + u.base.z * 0.25 * explode);
    g.rotation.y = u.spin * explode;
  }

  // blueprint <-> hardware
  const solidOp = 1 - wire;
  for (const m of solidMats) { m.opacity = solidOp; m.depthWrite = solidOp > 0.4; }
  for (const m of labelMats) m.opacity = solidOp;
  lineMat.opacity = wire * 0.85;
  const showLines = wire > 0.01;
  for (const l of edgeLines) l.visible = showLines;
  grid.material.opacity = Math.max(cur.grid, wire * 0.6) * 0.45;
  grid.visible = grid.material.opacity > 0.01;

  // glow + highlights
  M.copper.emissiveIntensity = 0.06 + cur.glow * 0.4;
  const blink = 0.5 + 0.5 * Math.sin(time * 9);
  M.mosfet.emissiveIntensity = cur.hlQ * (0.15 + 0.5 * blink);
  M.mcu.emissiveIntensity = cur.hlMcu * (0.35 + 0.2 * Math.sin(time * 3));
  const ph = time * 6;
  M.wind1.emissiveIntensity = cur.hlL * 0.15 + cur.inter * Math.max(0, Math.sin(ph)) * 0.9;
  M.wind2.emissiveIntensity = cur.hlL * 0.15 + cur.inter * Math.max(0, Math.sin(ph + Math.PI)) * 0.9;
  M.sleeve.emissiveIntensity = cur.hess * 0.08;

  const pulseOp = clamp01(cur.glow) * (1 - wire * 0.8);
  const speed = (0.16 + cur.scan * 0.22) * flowDir;
  for (const p of pulses) {
    p.f = ((p.f + dt * speed) % 1 + 1) % 1;
    p.path.at(p.f, p.s.position);
    p.s.material.opacity = pulseOp;
  }
  for (const m of ledHalos) m.opacity = solidOp;

  // real-time scan
  scanMat.opacity = cur.scan * 0.9; scanHaloMat.opacity = cur.scan * 0.12;
  scan.visible = cur.scan > 0.01;
  scan.position.x = -BW / 2 + ((time * 0.45) % 1) * BW;

  // HESS modules + cables
  const h = clamp01(cur.hess);
  hess.visible = h > 0.01;
  for (const g of hessMods) { g.position.x = g.userData.x + g.userData.side * (1 - ease(h)) * 2.5; g.scale.setScalar(0.6 + 0.4 * ease(h)); }
  for (const c of cables) {
    c.mesh.geometry.setDrawRange(0, Math.floor((c.total * clamp01(h * 1.4 - 0.3)) / 6) * 6);
    for (const p of c.ps) {
      p.f = ((p.f + dt * 0.35 * flowDir) % 1 + 1) % 1;
      c.curve.getPointAt(p.f, p.s.position);
      p.s.material.opacity = clamp01(h * 2 - 1) * solidOp;
    }
  }
  cellsLit.forEach((m, i) => { m.emissiveIntensity = h * (((time * 1.5 + i * 0.4) % 4) < 3 ? 1.2 : 0.2); });

  canvas.style.opacity = (cur.dim * clamp01(ip * 2.5)).toFixed(3);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.__board3d = true;
document.documentElement.classList.remove('no3d');
document.documentElement.classList.add('has3d');
requestAnimationFrame(frame);
