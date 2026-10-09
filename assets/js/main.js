// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
links.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

// Missing figures: show a labelled placeholder telling you which file to add
document.querySelectorAll('img[data-file]').forEach((img) => {
  const swap = () => {
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.innerHTML = `<span>Add your figure</span><b>assets/img/${img.dataset.file}</b>`;
    img.replaceWith(ph);
  };
  if (img.complete && img.naturalWidth === 0) swap();
  else img.addEventListener('error', swap);
});

// Reveal sections on scroll
const reveals = document.querySelectorAll('.section, .card, .plot, .mini');
reveals.forEach((el) => el.classList.add('reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
reveals.forEach((el) => io.observe(el));

// Oscilloscope hero: illustrative boost-converter waveforms (decorative only)
(function scope() {
  const canvas = document.getElementById('scope');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const col = {
    ch1: css.getPropertyValue('--amber').trim(),
    ch2: css.getPropertyValue('--teal').trim(),
    ch3: css.getPropertyValue('--violet').trim(),
  };
  const period = 140;   // px per switching period
  const duty = 0.62;    // illustrative duty cycle

  function grid() {
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(147,163,187,.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += W / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += H / 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(147,163,187,.22)';
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }

  function trace(color, fn) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let x = 0; x <= W; x++) {
      const y = fn(x);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function draw(t) {
    grid();
    const off = (t * 0.04) % period;
    const phase = (x) => (((x + off) % period) + period) % period / period;
    // CH1: gate PWM
    trace(col.ch1, (x) => (phase(x) < duty ? 52 : 92));
    // CH2: inductor current ripple (rises during on-time, falls during off-time)
    trace(col.ch2, (x) => {
      const p = phase(x);
      const r = p < duty ? p / duty : 1 - (p - duty) / (1 - duty);
      return 190 - r * 34;
    });
    // CH3: output voltage settling to a regulated level
    trace(col.ch3, (x) => {
      const settle = 1 - Math.exp(-x / 90) * Math.cos(x / 22);
      const ripple = Math.sin(((x + off) / period) * Math.PI * 2) * 1.5;
      return 296 - settle * 42 + ripple;
    });
    if (!reduce) requestAnimationFrame(draw);
  }
  draw(0);
})();
