const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- nav: mobile menu + active section ---------- */
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
const sections = [...document.querySelectorAll('main section[id]')];
const linkFor = Object.fromEntries([...navLinks.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
function onScroll() {
  let current = null;
  for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.id;
  Object.entries(linkFor).forEach(([id, a]) => a.classList.toggle('active', id === current));
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- figures: labelled empty frame until the real plot exists ---------- */
document.querySelectorAll('img[data-file]').forEach((img) => {
  const swap = () => {
    const ph = document.createElement('div');
    ph.className = 'nofig';
    ph.innerHTML = `<span>Figure goes here</span><b>assets/img/${img.dataset.file}</b>`;
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

/* ---------- project filters ---------- */
document.querySelectorAll('.filters button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach((x) => x.classList.toggle('on', x === b));
  const f = b.dataset.filter;
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('hide', f !== 'all' && c.dataset.status !== f));
}));

/* ---------- 3D fallback: if WebGL never comes up, give lanes back to the text ---------- */
setTimeout(() => { if (!window.__cable3d) document.documentElement.classList.add('no3d'); }, 6000);

/* ---------- bench: interleaved boost waveforms (ideal, normalised) ---------- */
(function bench() {
  const cv = document.getElementById('benchScope');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const duty = document.getElementById('duty');
  const dutyOut = document.getElementById('dutyOut');
  const ph2Legend = document.querySelector('.scope-top .ph2');
  let D = +duty.value, Vin = 72, phases = 2, off = 0, running = false;
  // instrument-style trace colours: ch1 yellow, ch2 orange, ch3 copper, math white
  const C = { gate: '#e8b931', gate2: 'rgba(232,185,49,.45)', l1: '#e8692c', l2: '#c9a27e', tot: '#eef0f2' };
  const PERIOD = 190;

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
    document.getElementById('ripple').textContent = phases === 2 ? `${Math.round((ripple(2) / ripple(1)) * 100)}%` : '100%';
    ph2Legend.classList.toggle('off', phases === 1);
  }
  function trace(col, fn) {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) { const y = fn(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function draw() {
    ctx.fillStyle = '#111316'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(200,205,212,.08)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo((W / 10) * i, 0); ctx.lineTo((W / 10) * i, H); ctx.stroke(); }
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 8) * i); ctx.lineTo(W, (H / 8) * i); ctx.stroke(); }
    const ph = (x) => frac((x + off) / PERIOD);
    trace(C.gate, (x) => (ph(x) < D ? 26 : 62));
    if (phases === 2) trace(C.gate2, (x) => (frac(ph(x) - 0.5) < D ? 78 : 114));
    const yI = (v, base, amp) => base - (v - 1) * amp;
    trace(C.l1, (x) => yI(iL(ph(x), D), 190, 70));
    if (phases === 2) trace(C.l2, (x) => yI(iL(frac(ph(x) - 0.5), D), 190, 70));
    trace(C.tot, (x) => { const p = ph(x); return yI(phases === 2 ? (iL(p, D) + iL(frac(p - 0.5), D)) / 2 : iL(p, D), 310, 70); });
    ctx.fillStyle = 'rgba(200,205,212,.5)'; ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(phases === 2 ? 'gate 1 / gate 2, 180° apart' : 'gate', 10, 18);
    ctx.fillText('inductor currents', 10, 140);
    ctx.fillText(phases === 2 ? 'input current (phases summed)' : 'input current', 10, 262);
    if (running && !reduceMotion) { off += 0.6; requestAnimationFrame(draw); }
  }
  // only animate while the scope is on screen
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was) requestAnimationFrame(draw);
  }).observe(cv);
  duty.addEventListener('input', () => { D = +duty.value; update(); if (!running || reduceMotion) draw(); });
  document.querySelectorAll('[data-vin]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-vin]').forEach((x) => x.classList.toggle('on', x === b));
    Vin = +b.dataset.vin; update();
  }));
  document.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-ph]').forEach((x) => x.classList.toggle('on', x === b));
    phases = +b.dataset.ph; update(); if (!running || reduceMotion) draw();
  }));
  update(); draw();
})();
