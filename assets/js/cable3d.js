// One orange HV cable runs the length of the page: it starts plugged into a Li-ion cell in the
// hero, passes through the converter module in Research, and plugs into a supercapacitor in
// Contact. The cable is drawn out as you scroll, its tip travelling with the viewport.
// World units are CSS pixels (x right, y up = -document y), so 3D objects line up with DOM slots.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('cable3d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = () => innerWidth < 760;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no3d');
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

const FOV = 22;
const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 10, 20000);
let D = 1;
function fitCamera() {
  D = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  camera.aspect = innerWidth / innerHeight;
  camera.near = Math.max(10, D - 3000);
  camera.far = D + 4000;
  camera.updateProjectionMatrix();
}
fitCamera();

// studio lighting: soft key from top-left, warm rim, environment reflections
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bdc3, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.castShadow = true;
key.shadow.mapSize.set(isSmall() ? 1024 : 2048, isSmall() ? 1024 : 2048);
key.shadow.radius = 10;
key.shadow.blurSamples = 20;
key.shadow.bias = -0.0004;
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xffe1c8, 0.7);
scene.add(rim, rim.target);
// shadow catcher: an invisible plane behind everything that only shows shadows on the page
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x15171a, opacity: 0.2 }));
catcher.receiveShadow = true;
scene.add(catcher);

/* ------------------------------------------------------------------ */
/* textures                                                           */
/* ------------------------------------------------------------------ */
try {
  await Promise.race([
    Promise.all([document.fonts.load('800 80px "Archivo"'), document.fonts.load('500 30px "IBM Plex Mono"')]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
} catch { /* system fonts are fine */ }
const DISPLAY = '"Archivo", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  try { g.fontStretch = 'expanded'; } catch { /* optional */ }
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function vtext(g, s, x, y, font, color) { // text running up the cylinder
  g.save(); g.translate(x, y); g.rotate(-Math.PI / 2);
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(s, 0, 0); g.restore();
}

const cellLabel = canvasTex(1024, 1024, (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#191c20'); bg.addColorStop(0.5, '#22262b'); bg.addColorStop(1, '#191c20');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#a8683a'; g.fillRect(0, 34, w, 22); g.fillRect(0, h - 50, w, 14);
  g.fillStyle = 'rgba(168,104,58,.55)'; g.fillRect(0, 64, w, 4);
  vtext(g, 'Li-ion', 512, 560, `800 170px ${DISPLAY}`, '#ece8e1');
  vtext(g, '21700 · 3.6 V · 5000 mAh', 650, 540, `500 40px ${MONO}`, '#c98f5f');
  vtext(g, 'PORT 1 · BATTERY', 380, 600, `500 30px ${MONO}`, '#8d949b');
  g.fillStyle = '#ece8e1'; g.font = `700 74px ${DISPLAY}`; g.textAlign = 'center'; g.fillText('+', 512, 150);
  // back side: small print + barcode
  g.fillStyle = '#6f767e'; g.font = `400 22px ${MONO}`;
  vtext(g, 'RECHARGEABLE · DO NOT SHORT-CIRCUIT · KEEP BELOW 60 °C', 70, 520, `400 22px ${MONO}`, '#6f767e');
  for (let i = 0; i < 46; i++) { g.fillStyle = '#9aa1a8'; g.fillRect(900 + (i % 2 ? 0 : 2), 200 + i * 9, 54 + ((i * 37) % 30), i % 3 ? 3 : 6); }
});
const capLabel = canvasTex(1024, 680, (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#1d2220'); bg.addColorStop(0.5, '#262c29'); bg.addColorStop(1, '#1d2220');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#a8683a'; g.fillRect(0, 26, w, 14); g.fillRect(0, h - 40, w, 14);
  g.textAlign = 'center';
  g.fillStyle = '#ece8e1'; g.font = `800 150px ${DISPLAY}`; g.fillText('3000 F', 512, 300);
  g.fillStyle = '#c98f5f'; g.font = `500 40px ${MONO}`; g.fillText('2.7 V · SUPERCAPACITOR', 512, 380);
  g.fillStyle = '#8d949b'; g.font = `500 30px ${MONO}`; g.fillText('PORT 2', 512, 450);
  g.fillStyle = '#6f767e'; g.font = `400 22px ${MONO}`; g.fillText('DO NOT REVERSE POLARITY · DISCHARGE BEFORE HANDLING', 1024 - 40, 560);
  g.fillText('DO NOT REVERSE POLARITY', 40 + 160, 560);
});
const cablePrint = canvasTex(1024, 64, (g, w, h) => {
  g.fillStyle = '#dc5a1e'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(70,22,4,.42)'; g.font = `500 22px ${MONO}`; g.textBaseline = 'middle';
  g.fillText('EV HV  ·  1×35 mm²  ·  1000 V DC  ·  −40…+125 °C', 30, 40);
});
cablePrint.wrapS = THREE.RepeatWrapping;
const moduleFace = canvasTex(512, 660, (g, w, h) => {
  g.fillStyle = '#1b1e22'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(200,205,212,.18)'; g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#d4521a'; g.fillRect(40, 70, 46, 6);
  g.fillStyle = '#e8e6e1'; g.font = `800 96px ${DISPLAY}`; g.fillText('A-DLC', 36, 190);
  g.fillStyle = '#9aa1a8'; g.font = `500 24px ${MONO}`;
  g.fillText('MULTIPORT', 40, 240); g.fillText('BIDIRECTIONAL DC-DC', 40, 272);
  const rows = [['P1', '72 V', 'BATTERY'], ['P2', '48 V', 'SUPERCAP'], ['HV', '400/800 V', 'DC LINK']];
  rows.forEach(([a, b, c], i) => {
    const y = 380 + i * 62;
    g.fillStyle = 'rgba(200,205,212,.14)'; g.fillRect(40, y - 36, w - 80, 1.5);
    g.fillStyle = '#e8e6e1'; g.font = `500 26px ${MONO}`; g.fillText(a, 40, y); g.fillText(b, 120, y);
    g.fillStyle = '#7d848b'; g.font = `400 20px ${MONO}`; g.fillText(c, 320, y);
  });
  g.fillStyle = '#7d848b'; g.font = `400 20px ${MONO}`; g.fillText('RUN', 92, h - 58);
});

/* ------------------------------------------------------------------ */
/* materials                                                          */
/* ------------------------------------------------------------------ */
const M = {
  wrap: new THREE.MeshPhysicalMaterial({ map: cellLabel, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
  wrapPlain: new THREE.MeshPhysicalMaterial({ color: 0x1d2024, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
  nickel: new THREE.MeshStandardMaterial({ color: 0xd3d6da, metalness: 1, roughness: 0.2 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xe6e0d2, roughness: 0.9 }),
  capSleeve: new THREE.MeshPhysicalMaterial({ map: capLabel, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc4c9ce, metalness: 1, roughness: 0.33 }),
  anod: new THREE.MeshPhysicalMaterial({ color: 0x2b2f34, metalness: 0.75, roughness: 0.42, clearcoat: 0.3 }),
  face: new THREE.MeshPhysicalMaterial({ map: moduleFace, roughness: 0.25, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
  nylon: new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.6 }),
  cable: new THREE.MeshPhysicalMaterial({ map: cablePrint, roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
  boot: new THREE.MeshPhysicalMaterial({ color: 0xb6461a, roughness: 0.55, clearcoat: 0.2 }),
  tin: new THREE.MeshStandardMaterial({ color: 0xcfcac2, metalness: 1, roughness: 0.28 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd8ab55, metalness: 1, roughness: 0.22 }),
  hole: new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 1 }),
  ledOff: new THREE.MeshStandardMaterial({ color: 0x2e3a33, emissive: 0x3ddc84, emissiveIntensity: 0, roughness: 0.3 }),
  ring: new THREE.MeshStandardMaterial({ color: 0x2b302d, emissive: 0x3ddc84, emissiveIntensity: 0, roughness: 0.4 }),
};

const mesh = (geo, mat, o = {}) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(o.x || 0, o.y || 0, o.z || 0);
  m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
  m.castShadow = o.cast !== false;
  return m;
};
const lathe = (pts, segs = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);

/* ------------------------------------------------------------------ */
/* models                                                             */
/* ------------------------------------------------------------------ */
// 21700 cell, 300 units tall. Outer group = placement + tilt; inner = spin about its own axis.
function buildCell() {
  const H = 300, R = 46, sh = 6;
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.add(inner);
  inner.add(mesh(new THREE.CylinderGeometry(R, R, H - 2 * sh, 128, 1, true, Math.PI), M.wrap));
  inner.add(mesh(new THREE.TorusGeometry(R - sh, sh, 24, 128), M.wrapPlain, { y: H / 2 - sh, rx: Math.PI / 2 }));
  inner.add(mesh(new THREE.TorusGeometry(R - sh, sh, 24, 128), M.wrapPlain, { y: -H / 2 + sh, rx: Math.PI / 2 }));
  const capY = H / 2 - sh * 0.7;
  inner.add(mesh(new THREE.CylinderGeometry(R - sh, R - sh, 2, 96), M.nickel, { y: capY }));
  inner.add(mesh(lathe([[R * 0.42, 0], [R - sh - 1, 0], [R - sh - 1, 1.6], [R * 0.42, 1.6]], 96), M.paper, { y: capY + 1 }));
  inner.add(mesh(lathe([[0, 8], [R * 0.3, 8], [R * 0.35, 6.8], [R * 0.38, 3], [R * 0.38, 0]], 96), M.nickel, { y: capY + 1 }));
  inner.add(mesh(new THREE.CylinderGeometry(R - sh, R - sh, 2, 96), M.nickel, { y: -capY }));
  return { outer, inner, H, R, topY: capY + 9 };
}

// Supercapacitor cell, 320 units tall; socket is scaled separately to match the cable.
function buildCap() {
  const H = 320, R = 68;
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.add(inner);
  inner.add(mesh(new THREE.CylinderGeometry(R, R, H, 128), M.alu));
  inner.add(mesh(new THREE.CylinderGeometry(R + 0.8, R + 0.8, H - 40, 128, 1, true, Math.PI), M.capSleeve));
  inner.add(mesh(new THREE.TorusGeometry(R - 4, 4, 20, 128), M.alu, { y: H / 2, rx: Math.PI / 2 }));
  inner.add(mesh(new THREE.CylinderGeometry(R - 6, R - 6, 3, 96), M.alu, { y: H / 2 - 1 }));
  inner.add(mesh(new THREE.CylinderGeometry(7, 7, 3, 24), M.hole, { x: 30, y: H / 2 + 1, z: -14 }));
  const ring = mesh(new THREE.TorusGeometry(24, 2.4, 16, 64), M.ring, { y: H / 2 + 1.5, rx: Math.PI / 2 });
  inner.add(ring);
  const socket = new THREE.Group(); // built in "connector units" (cable radius 9)
  socket.add(mesh(new THREE.CylinderGeometry(17, 17, 8, 6), M.tin, { y: 4 }));
  socket.add(mesh(new THREE.CylinderGeometry(10, 10, 24, 32), M.tin, { y: 20 }));
  socket.add(mesh(new THREE.CylinderGeometry(4.8, 4.8, 1, 24), M.hole, { y: 32.2 }));
  socket.position.y = H / 2 + 1;
  outer.add(socket); // on the axis, so it does not need to spin
  return { outer, inner, socket, H, R, socketTop: 32 };
}

// Converter module, 230 units tall; the cable runs vertically through its glands.
function buildModule() {
  const W = 176, H = 230, Dp = 84;
  const outer = new THREE.Group();
  outer.add(mesh(new RoundedBoxGeometry(W, H, Dp, 6, 10), M.anod));
  const face = mesh(new THREE.PlaneGeometry(W - 26, (W - 26) * 660 / 512), M.face, { z: Dp / 2 + 0.6, cast: false });
  face.scale.y = (H - 30) / ((W - 26) * 660 / 512);
  outer.add(face);
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    outer.add(mesh(new THREE.BoxGeometry(12, H * 0.82, 4), M.anod, { x: s * (W / 2 + 5), z: -Dp / 2 + 14 + i * 11.2 }));
  }
  const led = mesh(new THREE.SphereGeometry(4.5, 20, 12), M.ledOff, { x: -W / 2 + 34, y: -H / 2 + 34, z: Dp / 2 + 1.5 });
  outer.add(led);
  const glands = [];
  for (const s of [1, -1]) {
    const gl = new THREE.Group(); // connector units
    gl.add(mesh(new THREE.CylinderGeometry(20, 20, 9, 6), M.nylon, { y: 4.5 }));
    gl.add(mesh(new THREE.CylinderGeometry(15, 17, 16, 32), M.nylon, { y: 17 }));
    gl.position.y = s * H / 2;
    if (s < 0) gl.rotation.x = Math.PI;
    outer.add(gl); glands.push(gl);
  }
  return { outer, glands, W, H };
}

// Cable connector (boot + collar + pin) in connector units; local forward is -Y.
function buildConnector() {
  const g = new THREE.Group();
  g.add(mesh(lathe([[9.2, 0], [10.6, -4], [12.6, -12], [12.6, -34], [11.6, -38], [10.8, -40]], 48), M.boot));
  for (const y of [-18, -24, -30]) g.add(mesh(new THREE.TorusGeometry(12.7, 0.9, 10, 48), M.boot, { y, rx: Math.PI / 2 }));
  g.add(mesh(new THREE.CylinderGeometry(8.5, 8.5, 10, 32), M.tin, { y: -45 }));
  g.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 22, 24), M.gold, { y: -61 }));
  g.add(mesh(new THREE.CylinderGeometry(1, 4.2, 4, 24), M.gold, { y: -74 }));
  return g;
}
const CONN_LEN = 76;

const cell = buildCell(), cap = buildCap(), mod = buildModule();
const startConn = buildConnector(), tipConn = buildConnector();
scene.add(cell.outer, cap.outer, mod.outer, startConn, tipConn);

/* ------------------------------------------------------------------ */
/* layout: place objects in their DOM slots and route the cable       */
/* ------------------------------------------------------------------ */
const slots = { cell: document.getElementById('slotBattery'), mod: document.getElementById('slotModule'), cap: document.getElementById('slotCap') };
const laneSections = ['research', 'bench', 'projects', 'experience', 'skills'];
const RADIAL = 16;
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const docRect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; };

let curve = null, tube = null, segs = 1, env = new Float32Array(1), docH = 0;
let uModIn = 2, cableR = 9, connScale = 1, endDir = V(0, -1, 0);
const UP = V(0, 1, 0);

function place(obj, rect, heightPx, modelH, rot) {
  const s = heightPx / modelH;
  obj.outer.position.set(rect.x + rect.w / 2, -(rect.y + rect.h / 2), 0);
  obj.outer.scale.setScalar(s);
  obj.outer.rotation.set(rot[0], rot[1], rot[2]);
  obj.outer.updateMatrixWorld(true);
  return s;
}

function layout() {
  const small = isSmall();
  cableR = small ? 6.5 : 9;
  connScale = cableR / 9;
  docH = document.documentElement.scrollHeight;

  // objects
  const rc = docRect(slots.cell), rm = docRect(slots.mod), rp = docRect(slots.cap);
  const sCell = place(cell, { ...rc, y: rc.y + rc.h * 0.05 }, Math.min(rc.h * 0.66, rc.w * 1.4, 480), cell.H, [0.14, 0, -0.1]);
  const sMod = place(mod, rm, Math.min(rm.h * 0.78, rm.w * 1.1), mod.H, [0, -0.35, 0]);
  const sCap = place(cap, rp, Math.min(rp.h * 0.62, 400), cap.H + 40, [0.18, 0, 0.06]);
  cap.socket.scale.setScalar(connScale / sCap);
  mod.glands.forEach((g) => g.scale.setScalar(connScale / sMod));
  cell.outer.updateMatrixWorld(true); cap.outer.updateMatrixWorld(true); mod.outer.updateMatrixWorld(true);

  // start: connector plugged into the cell's positive terminal
  const cellUp = UP.clone().applyQuaternion(cell.outer.quaternion).normalize();
  const term = cell.outer.localToWorld(V(0, cell.topY, 0));
  const L = CONN_LEN * connScale;
  const start = term.clone().addScaledVector(cellUp, L - 3);
  startConn.position.copy(start);
  startConn.quaternion.setFromUnitVectors(V(0, -1, 0), cellUp.clone().negate());
  startConn.scale.setScalar(connScale);

  // end: connector seated in the supercapacitor socket
  const capUp = UP.clone().applyQuaternion(cap.outer.quaternion).normalize();
  const sockTop = cap.socket.localToWorld(V(0, cap.socketTop, 0));
  const end = sockTop.clone().addScaledVector(capUp, L);
  endDir = capUp.clone().negate();

  // module glands
  const mc = mod.outer.position.clone();
  const half = (mod.H / 2) * sMod + 26 * connScale;

  const pts = [];
  const push = (p) => { const last = pts[pts.length - 1]; if (!last || last.distanceTo(p) > 4) pts.push(p); };
  const bridge = (p) => { // S-curve between lanes
    const last = pts[pts.length - 1];
    push(V((last.x + p.x) / 2, (last.y + p.y) / 2, 40));
  };

  // hero: rise from the terminal, arc outwards, drop past the cell
  const out = Math.min(innerWidth - 24, cell.outer.position.x + cell.R * sCell + (small ? 60 : 110));
  push(start);
  push(start.clone().addScaledVector(cellUp, 28));
  push(V(start.x + 40, start.y + 48, 18));
  push(V((start.x + out) / 2 + 20, start.y + 34, 28));
  push(V(out, start.y - 30, 24));
  push(V(out - 10, cell.outer.position.y - cell.H * sCell * 0.45, 14));

  // into the converter module and out again
  push(V(mc.x, mc.y + half + 140, 0));
  push(V(mc.x, mc.y + half + 10, 0));
  push(V(mc.x, mc.y, 0));
  push(V(mc.x, mc.y - half - 10, 0));
  push(V(mc.x, mc.y - half - 120, 0));

  // lanes, alternating sides section by section
  laneSections.forEach((id, k) => {
    const lane = document.querySelector(`#${id} .lane`);
    const r = docRect(lane);
    let yA = r.y, yB = r.y + r.h;
    if (id === 'research') yA = Math.max(yA, -(mc.y - half) + 220);
    if (yB - yA < 60) return;
    const cx = r.x + r.w / 2;
    const amp = small ? Math.min(r.w * 0.22, 7) : Math.min(r.w * 0.26, 58);
    const n = Math.max(2, Math.round((yB - yA) / 380));
    for (let i = 0; i <= n; i++) {
      const y = yA + ((yB - yA) * i) / n;
      const wig = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * amp;
      const p = V(cx + wig, -y, (i % 2 ? 1 : -1) * 16);
      if (i === 0 && k > 0) bridge(p);
      push(p);
    }
  });

  // into the supercapacitor
  const approach = end.clone().addScaledVector(capUp, 240);
  approach.x += small ? 30 : 70; approach.z += 20;
  bridge(approach);
  push(approach);
  push(end.clone().addScaledVector(capUp, 110));
  push(end.clone().addScaledVector(capUp, 35));
  push(end);

  curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 4000;
  curve.updateArcLengths();
  const length = curve.getLength();
  segs = Math.min(6000, Math.max(300, Math.round(length / 5)));
  const geo = new THREE.TubeGeometry(curve, segs, cableR, RADIAL, false);
  cablePrint.repeat.set(length / 420, 1);
  if (tube) { tube.geometry.dispose(); tube.geometry = geo; } else {
    tube = new THREE.Mesh(geo, M.cable);
    tube.castShadow = true;
    tube.frustumCulled = false;
    scene.add(tube);
  }

  // scroll mapping: running max of document-y along the cable
  env = new Float32Array(segs + 1);
  const p = new THREE.Vector3();
  let m = -Infinity; uModIn = 2;
  const modTopDoc = -(mc.y + half);
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, p);
    m = Math.max(m, -p.y);
    env[i] = m;
    if (uModIn > 1 && -p.y > modTopDoc) uModIn = i / segs;
  }
  tipConn.scale.setScalar(connScale);
}

function uForDoc(y) {
  if (y >= env[segs]) return 1;
  let lo = 0, hi = segs;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (env[mid] < y) lo = mid + 1; else hi = mid; }
  return lo / segs;
}

/* ------------------------------------------------------------------ */
/* interaction                                                        */
/* ------------------------------------------------------------------ */
let spin = 0.6, spinVel = 0, dragging = false, lastX = 0;
slots.cell.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; slots.cell.setPointerCapture(e.pointerId); });
slots.cell.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX; lastX = e.clientX;
  spin += dx * 0.012; spinVel = dx * 0.012 * 60;
});
const endDrag = () => { dragging = false; };
slots.cell.addEventListener('pointerup', endDrag);
slots.cell.addEventListener('pointercancel', endDrag);

let relayout = null;
const scheduleLayout = () => { clearTimeout(relayout); relayout = setTimeout(layout, 120); };
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  key.shadow.mapSize.set(isSmall() ? 1024 : 2048, isSmall() ? 1024 : 2048);
  fitCamera();
  scheduleLayout();
});
new ResizeObserver(scheduleLayout).observe(document.querySelector('main'));
addEventListener('load', layout);
document.fonts.ready.then(layout);

/* ------------------------------------------------------------------ */
/* frame loop                                                         */
/* ------------------------------------------------------------------ */
const statusEl = document.getElementById('linkStatus');
const moduleNote = document.getElementById('moduleNote');
let tipU = 0, last = performance.now(), t0 = null, time = 0, connected = false, powered = false;
const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
const ease = (t) => 1 - Math.pow(1 - t, 3);

function setConnected(on) {
  if (on === connected) return;
  connected = on;
  statusEl.classList.toggle('on', on);
  statusEl.querySelector('span').textContent = on ? 'Port 2 · supercapacitor · connected' : 'Port 2 · supercapacitor · not connected';
}
function setPowered(on) {
  if (on === powered) return;
  powered = on;
  moduleNote.textContent = on ? 'Multiport converter · Port 1 → Port 2 · running' : 'Multiport converter · no input';
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (t0 === null) t0 = now;
  time += dt;
  const W = innerWidth, H = innerHeight, sy = scrollY;
  const cx = W / 2, cy = -(sy + H / 2);

  camera.position.set(cx, cy, D);
  catcher.position.set(cx, cy, -85);
  catcher.scale.set(W * 1.6, H * 1.6, 1);
  key.position.set(cx - 520, cy + 900, 1100); key.target.position.set(cx, cy, 0);
  Object.assign(key.shadow.camera, { left: -W * 0.85, right: W * 0.85, top: H * 0.85, bottom: -H * 0.85, near: 400, far: 2800 });
  key.shadow.camera.updateProjectionMatrix();
  rim.position.set(cx + 900, cy + 200, -400); rim.target.position.set(cx, cy, 0);

  // intro: the cable pays out of the cell
  const ip = reduceMotion ? 1 : Math.min(1, (now - t0) / 1800);

  if (!dragging) { spinVel *= Math.pow(0.04, dt); spin += (reduceMotion ? 0 : 0.22) * dt + spinVel * dt; }
  cell.inner.rotation.y = spin;
  mod.outer.rotation.y = -0.35 + (reduceMotion ? 0 : Math.sin(time * 0.4) * 0.12);
  cap.inner.rotation.y = reduceMotion ? 0 : Math.sin(time * 0.3) * 0.5;

  // cable tip follows the viewport
  let target = sy + H * (isSmall() ? 0.66 : 0.72);
  if (sy >= docH - H - 2) target = Infinity;
  const goal = uForDoc(target) * ease(Math.max(0, ip * 1.4 - 0.35));
  tipU = reduceMotion ? goal : tipU + (goal - tipU) * (1 - Math.exp(-dt * 6));
  const shown = Math.floor(tipU * segs);
  tube.geometry.setDrawRange(0, shown * RADIAL * 6);

  tipConn.visible = shown > 2;
  curve.getPointAt(Math.min(1, shown / segs), tmpP);
  curve.getTangentAt(Math.min(1, shown / segs), tmpT);
  if (tipU > 0.998) tmpT.copy(endDir);
  tipConn.position.copy(tmpP);
  tipConn.quaternion.setFromUnitVectors(V(0, -1, 0), tmpT.normalize());

  setPowered(tipU > uModIn);
  setConnected(tipU > 0.998);
  M.ledOff.emissiveIntensity += ((powered ? 2.2 : 0) - M.ledOff.emissiveIntensity) * Math.min(1, dt * 6);
  M.ring.emissiveIntensity += ((connected ? 1.6 + Math.sin(time * 3) * 0.3 : 0) - M.ring.emissiveIntensity) * Math.min(1, dt * 5);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

layout();
window.__cable3d = true;
document.documentElement.classList.remove('no3d');
document.documentElement.classList.add('has3d');
requestAnimationFrame(frame);
