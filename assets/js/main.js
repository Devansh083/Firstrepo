const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = getComputedStyle(document.documentElement);
const color = (name) => css.getPropertyValue(name).trim();

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- nav: mobile menu, active link, charge bar ---------- */
const toggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

const chargeFill = document.getElementById('chargeFill');
const sections = [...document.querySelectorAll('main section[id]')];
const linkFor = Object.fromEntries([...navLinks.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  chargeFill.style.width = `${Math.min(100, (scrollY / Math.max(1, max)) * 100)}%`;
  let current = null;
  for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id;
  Object.entries(linkFor).forEach(([id, a]) => a.classList.toggle('active', id === current));
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- hero: rotating focus word ---------- */
const rot = document.getElementById('rot');
const words = ['electric vehicles', 'renewable energy', 'smart grids'];
let wi = 0;
if (!reduceMotion) {
  setInterval(() => {
    rot.classList.add('out');
    setTimeout(() => { wi = (wi + 1) % words.length; rot.textContent = words[wi]; rot.classList.remove('out'); }, 300);
  }, 2600);
}

/* ---------- hero: schematic controls ---------- */
const schem = document.getElementById('schem');
const hvLabel = document.getElementById('hvLabel');
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
  schem.classList.toggle('buck', b.dataset.mode === 'buck');
}));
document.querySelectorAll('[data-hv]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-hv]').forEach((x) => x.classList.toggle('on', x === b));
  hvLabel.textContent = `${b.dataset.hv} V`;
}));
// Blink the switches in an interleaved pattern
const sw = [...schem.querySelectorAll('.sw rect')];
let tick = 0;
if (!reduceMotion) setInterval(() => { tick ^= 1; sw.forEach((r, i) => r.classList.toggle('on', (i % 2) === tick ^ (i > 1 ? 1 : 0))); }, 550);

/* ---------- count-up numbers ---------- */
function countUp(el) {
  const target = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
  if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
  const t0 = performance.now(), dur = 1400;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * e).toFixed(dec);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
document.querySelectorAll('[data-count]').forEach(countUp);

/* ---------- reveal on scroll ---------- */
const revealIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
}), { threshold: 0.1 });
document.querySelectorAll('.sec-head, .step, .proj-head, .shot, .card, .tl li, .panel, .bench > *, .contact h2').forEach((el) => {
  el.classList.add('reveal');
  revealIO.observe(el);
});

/* ---------- research scrollytelling ---------- */
const scenes = document.querySelectorAll('.scene');
const steps = document.querySelectorAll('.step');
const stepIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  const n = e.target.dataset.step;
  steps.forEach((s) => s.classList.toggle('active', s === e.target));
  scenes.forEach((s) => s.classList.toggle('on', s.dataset.scene === n));
  document.getElementById('stageCaption').textContent = e.target.dataset.caption;
  document.getElementById('stageMode').textContent = e.target.dataset.hud;
}), { rootMargin: '-45% 0px -45% 0px' });
steps.forEach((s) => stepIO.observe(s));
steps[0].classList.add('active');

/* ---------- figures: "no signal" placeholder + lightbox ---------- */
document.querySelectorAll('img[data-file]').forEach((img) => {
  const swap = () => {
    const ph = document.createElement('div');
    ph.className = 'nosig';
    ph.innerHTML = `<strong>NO SIGNAL</strong><span>add figure</span><em>assets/img/${img.dataset.file}</em>`;
    img.replaceWith(ph);
  };
  if (img.complete && img.naturalWidth === 0) swap(); else img.addEventListener('error', swap);
});
const lb = document.getElementById('lightbox');
document.querySelector('.gallery').addEventListener('click', (e) => {
  if (e.target.tagName !== 'IMG') return;
  lb.querySelector('img').src = e.target.src;
  lb.querySelector('img').alt = e.target.alt;
  lb.hidden = false;
});
lb.addEventListener('click', () => { lb.hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.hidden = true; });

/* ---------- project filters + card spotlight ---------- */
document.querySelectorAll('.filters button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b));
  const f = b.dataset.filter;
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('hide', f !== 'all' && c.dataset.status !== f));
}));
document.querySelectorAll('.card').forEach((c) => c.addEventListener('pointermove', (e) => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', `${e.clientX - r.left}px`);
  c.style.setProperty('--my', `${e.clientY - r.top}px`);
}));

/* ---------- 3D fallback: show 2D visuals if WebGL never comes up ---------- */
setTimeout(() => { if (!window.__board3d) document.documentElement.classList.add('no3d'); }, 6000);

/* ---------- bench: interleaved boost waveforms (ideal, normalised) ---------- */
(function bench() {
  const cv = document.getElementById('benchScope');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const duty = document.getElementById('duty');
  const dutyOut = document.getElementById('dutyOut');
  const ph2Legend = document.querySelector('.scope-top .ph2');
  let D = +duty.value, Vin = 72, phases = 2, off = 0;
  const C = { gate: color('--amber'), l1: color('--teal'), l2: color('--violet'), tot: color('--rose') };
  const PERIOD = 190; // px per switching period

  // Normalised inductor current: average 1, ripple proportional to D (fixed Vin, L, fsw)
  const iL = (ph, d) => { const r = 0.9 * d; return ph < d ? 1 - r / 2 + r * (ph / d) : 1 + r / 2 - r * ((ph - d) / (1 - d)); };
  const frac = (x) => ((x % 1) + 1) % 1;

  function ripple(n) {
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < 400; k++) {
      const ph = k / 400; let s = iL(ph, D);
      if (n === 2) s += iL(frac(ph - 0.5), D);
      s /= n; lo = Math.min(lo, s); hi = Math.max(hi, s);
    }
    return hi - lo;
  }

  function update() {
    dutyOut.textContent = D.toFixed(2);
    duty.style.setProperty('--p', `${((D - 0.1) / 0.8) * 100}%`);
    const g = 1 / (1 - D);
    document.getElementById('gain').textContent = `${g.toFixed(2)}×`;
    document.getElementById('vout').textContent = `${Math.round(Vin * g)} V`;
    const r = ripple(2) / ripple(1);
    document.getElementById('ripple').textContent = phases === 2 ? `${Math.round(r * 100)}%` : '100%';
    ph2Legend.classList.toggle('off', phases === 1);
  }

  function trace(col, fn, glow = 8) {
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.shadowColor = col; ctx.shadowBlur = glow;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 1) { const y = fn(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }

  function draw() {
    ctx.fillStyle = '#03070f'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(143,160,186,.09)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo((W / 10) * i, 0); ctx.lineTo((W / 10) * i, H); ctx.stroke(); }
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 8) * i); ctx.lineTo(W, (H / 8) * i); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(143,160,186,.2)';
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    const ph = (x) => frac((x + off) / PERIOD);
    trace(C.gate, (x) => (ph(x) < D ? 26 : 62));
    if (phases === 2) trace(C.gate + '88', (x) => (frac(ph(x) - 0.5) < D ? 78 : 114), 0);
    const yI = (v, base, amp) => base - (v - 1) * amp;
    trace(C.l1, (x) => yI(iL(ph(x), D), 190, 70));
    if (phases === 2) trace(C.l2, (x) => yI(iL(frac(ph(x) - 0.5), D), 190, 70));
    trace(C.tot, (x) => {
      const p = ph(x); const s = phases === 2 ? (iL(p, D) + iL(frac(p - 0.5), D)) / 2 : iL(p, D);
      return yI(s, 310, 70);
    });
    ctx.fillStyle = 'rgba(143,160,186,.55)'; ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText(phases === 2 ? 'gate 1 / gate 2 (180° shifted)' : 'gate', 10, 18);
    ctx.fillText('inductor currents', 10, 140);
    ctx.fillText(phases === 2 ? 'total input current (avg of phases)' : 'input current', 10, 262);
    if (!reduceMotion) { off += 0.6; requestAnimationFrame(draw); }
  }

  duty.addEventListener('input', () => { D = +duty.value; update(); if (reduceMotion) draw(); });
  document.querySelectorAll('[data-vin]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-vin]').forEach((x) => x.classList.toggle('on', x === b));
    Vin = +b.dataset.vin; update();
  }));
  document.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-ph]').forEach((x) => x.classList.toggle('on', x === b));
    phases = +b.dataset.ph; update(); if (reduceMotion) draw();
  }));
  update(); draw();
})();
