// Porous Metamaterial Dispersion Explorer
// Pore boundary: r(φ) = r0 [1 + Σ_{n=1..5} c_n cos(4nφ)],  r0 = (a − h)/2,  a = 1.

// Waits for MathJax (loaded from cdnjs) so every symbol renders as LaTeX.
const startExplorer = () => {
  const NS = 'http://www.w3.org/2000/svg';
  const N_C = 5;
  const C_MIN = -0.3, C_MAX = 0.3, C_STEP = 0.01;
  const H_MIN = 5, H_MAX = 100, H_DEFAULT = 30;          // h/a in percent
  const SAMPLES = 720;                                    // points along the pore boundary

  const state = { c: new Array(N_C).fill(0), h: H_DEFAULT };

  // ---------- helpers ----------
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const fmt = (v, d = 3) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(d);
  const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

  // LaTeX via MathJax SVG output (falls back to plain text if MathJax is unavailable)
  const tex = (s, display = false) =>
    window.MathJax && MathJax.tex2svg ? MathJax.tex2svg(s, { display }).outerHTML : s;
  document.querySelectorAll('[data-tex]').forEach(e => { e.innerHTML = tex(e.dataset.tex); });
  document.querySelectorAll('[data-tex-display]').forEach(e => { e.innerHTML = tex(e.dataset.texDisplay, true); });
  const A = tex('a');                                     // unit symbol

  const radius = (phi, c, r0) => {
    let s = 1;
    for (let n = 0; n < c.length; n++) s += c[n] * Math.cos(4 * (n + 1) * phi);
    return r0 * s;
  };

  // Geometry summary for the current parameters
  const analyse = () => {
    const h = state.h / 100;
    const r0 = (1 - h) / 2;
    let rMin = Infinity, rMax = -Infinity, ext = 0, area = 0;
    const pts = [];
    for (let i = 0; i < SAMPLES; i++) {
      const phi = (i / SAMPLES) * 2 * Math.PI;
      const r = radius(phi, state.c, r0);
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
      const rr = Math.max(0, r);
      const x = rr * Math.cos(phi), y = rr * Math.sin(phi);
      ext = Math.max(ext, Math.abs(x), Math.abs(y));
      pts.push([x, y]);
    }
    for (let i = 0; i < pts.length; i++) {              // shoelace area
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      area += x1 * y2 - x2 * y1;
    }
    area = Math.abs(area) / 2;
    const solid = r0 <= 1e-9;
    const negative = !solid && rMin < 0;
    const overlap = !solid && ext >= 0.5 - 1e-9;
    return {
      h, r0, rMin, rMax, pts, solid, negative, overlap,
      ligament: solid ? 1 : 1 - 2 * ext,
      porosity: solid ? 0 : area,                      // a = 1, so area = porosity
      circular: state.c.every(v => Math.abs(v) < 1e-9),
    };
  };

  // ---------- sliders ----------
  const sliderBox = document.getElementById('px-sliders');
  const inputs = [];

  const addSlider = (key, label, min, max, step, value, format) => {
    const row = document.createElement('div');
    row.className = 'px-slider';
    const id = `px-${key}`;
    row.innerHTML =
      `<label for="${id}">${label}</label>` +
      `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">` +
      `<output for="${id}"></output>`;
    sliderBox.appendChild(row);
    const input = row.querySelector('input'), out = row.querySelector('output');
    const sync = () => { out.textContent = format(parseFloat(input.value)); };
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (key === 'h') state.h = v; else state.c[+key.slice(1) - 1] = v;
      sync(); update();
    });
    sync();
    inputs.push({ key, input, sync });
  };

  for (let n = 1; n <= N_C; n++) {
    addSlider(`c${n}`, tex(`c_${n}`), C_MIN, C_MAX, C_STEP, 0, signed);
  }
  const divider = document.createElement('div');
  divider.className = 'px-slider-divider';
  sliderBox.appendChild(divider);
  addSlider('h', tex('h/a'), H_MIN, H_MAX, 1, H_DEFAULT, v => `${v.toFixed(0)}%`);

  document.getElementById('px-reset').addEventListener('click', () => {
    state.c.fill(0); state.h = H_DEFAULT;
    for (const s of inputs) { s.input.value = s.key === 'h' ? H_DEFAULT : 0; s.sync(); }
    update();
  });

  // ---------- schematic (static illustration) ----------
  const drawSchematic = () => {
    const svg = document.getElementById('px-schematic');
    const wrap = document.getElementById('px-schem-wrap');
    const VBW = 440, VBH = 270;
    // KaTeX label centred on a point given in viewBox units
    const label = (x, y, s, cls) => {
      const d = document.createElement('div');
      d.className = `px-s-tex ${cls || ''}`;
      d.style.left = `${(x / VBW) * 100}%`;
      d.style.top = `${(y / VBH) * 100}%`;
      d.innerHTML = tex(s);
      wrap.appendChild(d);
    };
    const scaleLabels = () => { wrap.style.fontSize = `${(wrap.clientWidth / VBW) * 20}px`; };
    scaleLabels();
    window.addEventListener('resize', scaleLabels);
    const S = 190, X0 = 20, Y0 = 26;
    const demoC = [0, 0.3, 0, 0, 0], demoR0 = 0.31;       // illustrative shape: c2 = 0.3 only
    el('defs', {}, svg).innerHTML =
      '<marker id="px-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0L10 5L0 10z" fill="currentColor"/></marker>';

    const cells = [X0, X0 + S];
    for (const x of cells) el('rect', { x, y: Y0, width: S, height: S, class: 'px-s-solid' }, svg);
    for (const x of cells) {
      const cx = x + S / 2, cy = Y0 + S / 2;
      let d = '';
      for (let i = 0; i <= 720; i++) {
        const p = (i / 720) * 2 * Math.PI, r = radius(p, demoC, demoR0) * S;
        d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(p)).toFixed(1)} ${(cy - r * Math.sin(p)).toFixed(1)}`;
      }
      el('path', { d: d + 'Z', class: 'px-s-pore' }, svg);
      el('circle', { cx, cy, r: demoR0 * S, class: 'px-s-ref' }, svg);
    }
    for (const x of cells) el('rect', { x, y: Y0, width: S, height: S, class: 'px-s-cell' }, svg);

    const cx = X0 + S / 2, cy = Y0 + S / 2, r0 = demoR0 * S;
    el('circle', { cx, cy, r: 2.5, class: 'px-s-dot' }, svg);

    // r0 (down-left)
    const a0 = (-140 * Math.PI) / 180;
    el('line', { x1: cx, y1: cy, x2: cx + r0 * Math.cos(a0), y2: cy - r0 * Math.sin(a0), class: 'px-s-r0', 'marker-end': 'url(#px-arrow)' }, svg);
    label(cx - 42, cy + 2, 'r_0', 'px-s-r0t');

    // r(φ) at φ = 45°, a lobe tip (cos(8φ) = 1), so r(φ) is clearly larger than r0
    const ph = (45 * Math.PI) / 180, rp = radius(ph, demoC, demoR0) * S;
    el('line', { x1: cx, y1: cy, x2: cx + rp * Math.cos(ph), y2: cy - rp * Math.sin(ph), class: 'px-s-r', 'marker-end': 'url(#px-arrow)' }, svg);
    label(cx + 56, cy - 80, 'r(\\phi)', 'px-s-rt');      // grey corner, just beyond the arrow tip
    // reference axis + angle arc
    el('line', { x1: cx, y1: cy, x2: cx + r0 * 0.9, y2: cy, class: 'px-s-axis' }, svg);
    const ar = 22;
    el('path', { d: `M${cx + ar} ${cy} A${ar} ${ar} 0 0 0 ${cx + ar * Math.cos(ph)} ${cy - ar * Math.sin(ph)}`, class: 'px-s-arc' }, svg);
    label(cx + 31, cy - 12, '\\phi', 'px-s-rt px-s-small');

    // h: between the reference circles of neighbouring cells
    const hx1 = cx + r0, hx2 = X0 + S + S / 2 - r0, hy = cy + 0;
    el('line', { x1: hx1, y1: hy, x2: hx2, y2: hy, class: 'px-s-h', 'marker-start': 'url(#px-arrow)', 'marker-end': 'url(#px-arrow)' }, svg);
    label((hx1 + hx2) / 2 + 16, hy - 18, 'h', 'px-s-ht');   // offset from the cell-boundary line

    // a: width of one cell
    const ay = Y0 + S + 22;
    el('line', { x1: X0, y1: Y0 + S + 6, x2: X0, y2: ay + 6, class: 'px-s-tick' }, svg);
    el('line', { x1: X0 + S, y1: Y0 + S + 6, x2: X0 + S, y2: ay + 6, class: 'px-s-tick' }, svg);
    el('line', { x1: X0 + 2, y1: ay, x2: X0 + S - 2, y2: ay, class: 'px-s-dim', 'marker-start': 'url(#px-arrow)', 'marker-end': 'url(#px-arrow)' }, svg);
    label(X0 + S / 2, ay - 15, 'a', '');
  };

  // ---------- unit cell view ----------
  const shapeSvg = document.getElementById('px-shape');
  const drawShape = g => {
    shapeSvg.replaceChildren();
    const S = 100;
    el('rect', { x: 0, y: 0, width: 300, height: 300, class: 'px-solid' }, shapeSvg);
    if (!g.solid) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const cx = S * i + S / 2, cy = S * j + S / 2;
        let d = '';
        g.pts.forEach(([x, y], k) => { d += `${k ? 'L' : 'M'}${(cx + x * S).toFixed(2)} ${(cy - y * S).toFixed(2)}`; });
        el('path', { d: d + 'Z', class: 'px-pore' }, shapeSvg);
      }
    }
    el('rect', { x: S, y: S, width: S, height: S, class: 'px-cell-outline' }, shapeSvg);
  };

  // ---------- band structure ----------
  const data = window.CIRCULAR_BANDS;
  const bandSvg = document.getElementById('px-band');
  const tip = document.getElementById('px-tip');
  const bandNote = document.getElementById('px-band-note');
  let Y_MAX = 1;
  if (data) {
    let m = 0;
    for (const rows of Object.values(data.bands)) for (const row of rows) m = Math.max(m, ...row);
    Y_MAX = Math.ceil(m * 10) / 10;
  }
  let plot = null;   // geometry of the last drawn plot, for hover

  const nearestH = h => {
    const keys = Object.keys(data.bands).map(Number);
    return keys.reduce((best, k) => (Math.abs(k - h) < Math.abs(best - h) ? k : best), keys[0]);
  };

  const bandWrap = bandSvg.parentElement;
  const overlay = (x, y, s, cls) => {
    const d = document.createElement('div');
    d.className = `px-b-tex ${cls || ''}`;
    d.style.left = `${x}px`; d.style.top = `${y}px`;
    d.innerHTML = tex(s);
    bandWrap.appendChild(d);
    return d;
  };
  const TICK_TEX = { 'Γ': '\\Gamma', 'X': 'X', 'M': 'M' };

  const drawBands = g => {
    bandSvg.replaceChildren();
    bandWrap.querySelectorAll('.px-b-tex').forEach(e => e.remove());
    tip.hidden = true;
    const W = Math.max(240, bandSvg.clientWidth || 360);
    const H = Math.round(Math.min(360, Math.max(240, W * 0.82)));
    bandSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    bandSvg.setAttribute('height', H);
    const M = { l: 48, r: 12, t: 12, b: 30 };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;

    if (!data) {
      el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'px-empty' }, bandSvg).textContent = 'Band data not loaded';
      return;
    }
    const kMax = data.k[data.k.length - 1];
    const X = k => M.l + (k / kMax) * pw;
    const Y = f => M.t + ph - (f / Y_MAX) * ph;

    // grid + axes
    for (let f = 0; f <= Y_MAX + 1e-9; f += 0.2) {
      el('line', { x1: M.l, x2: M.l + pw, y1: Y(f), y2: Y(f), class: 'px-gridline' }, bandSvg);
      el('text', { x: M.l - 8, y: Y(f) + 4, 'text-anchor': 'end', class: 'px-axis-text' }, bandSvg).textContent = f.toFixed(1);
    }
    data.ticks.forEach((k, i) => {
      el('line', { x1: X(k), x2: X(k), y1: M.t, y2: M.t + ph, class: i === 0 || i === data.ticks.length - 1 ? 'px-frame' : 'px-gridline' }, bandSvg);
      overlay(X(k), M.t + ph + 14, TICK_TEX[data.tickLabels[i]] || data.tickLabels[i], 'px-b-tick');
    });
    el('line', { x1: M.l, x2: M.l + pw, y1: M.t + ph, y2: M.t + ph, class: 'px-frame' }, bandSvg);
    el('line', { x1: M.l, x2: M.l + pw, y1: M.t, y2: M.t, class: 'px-frame' }, bandSvg);
    overlay(11, M.t + ph / 2, '\\omega a/2\\pi c_T', 'px-b-ylabel');

    const hKey = nearestH(state.h);
    const rows = data.bands[String(hKey)];
    const nb = rows[0].length;
    const ref = !g.circular;

    for (let b = 0; b < nb; b++) {
      let d = '';
      rows.forEach((row, i) => { d += `${i ? 'L' : 'M'}${X(data.k[i]).toFixed(1)} ${Y(row[b]).toFixed(1)}`; });
      el('path', { d, class: ref ? 'px-line px-line-ref' : 'px-line' }, bandSvg);
    }

    if (ref) {
      const box = el('g', {}, bandSvg);
      el('rect', { x: M.l + pw / 2 - 118, y: M.t + ph / 2 - 26, width: 236, height: 52, rx: 6, class: 'px-pending' }, box);
      el('text', { x: M.l + pw / 2, y: M.t + ph / 2 - 4, 'text-anchor': 'middle', class: 'px-pending-t' }, box).textContent = 'Data for this pore shape';
      el('text', { x: M.l + pw / 2, y: M.t + ph / 2 + 14, 'text-anchor': 'middle', class: 'px-pending-t' }, box).textContent = 'will be added soon';
      bandNote.innerHTML = `Grey: circular pore at ${tex('h/a')} = ${hKey}% for reference.`;
    } else {
      const snap = hKey !== state.h ? ` (nearest computed value; data in 5% steps)` : '';
      bandNote.innerHTML = `Circular pore, ${tex('h/a')} = ${hKey}%${snap}. ` +
        (hKey === 100 ? 'Solid plate (analytic).' : `Finite-element Bloch analysis, plane strain, ${tex('\\nu')} = ${data.nu}.`);
    }

    // hover layer
    const cross = el('line', { y1: M.t, y2: M.t + ph, class: 'px-cross', visibility: 'hidden' }, bandSvg);
    const dots = Array.from({ length: nb }, () => el('circle', { r: 3.5, class: ref ? 'px-dot px-dot-ref' : 'px-dot', visibility: 'hidden' }, bandSvg));
    const hit = el('rect', { x: M.l, y: M.t, width: pw, height: ph, class: 'px-hit' }, bandSvg);
    plot = { X, Y, rows, hit, cross, dots, W, H, M, pw };

    const show = evt => {
      const r = bandSvg.getBoundingClientRect();
      const sx = ((evt.clientX - r.left) / r.width) * W;
      const kx = ((sx - M.l) / pw) * kMax;
      let i = 0;
      data.k.forEach((k, j) => { if (Math.abs(k - kx) < Math.abs(data.k[i] - kx)) i = j; });
      const x = X(data.k[i]);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      rows[i].forEach((f, b) => { dots[b].setAttribute('cx', x); dots[b].setAttribute('cy', Y(f)); dots[b].setAttribute('visibility', 'visible'); });
      const ti = data.ticks.findIndex(t => Math.abs(t - data.k[i]) < 1e-6);
      const where = ti >= 0 ? tex(TICK_TEX[data.tickLabels[ti]]) : `k-path ${(data.k[i] / kMax * 100).toFixed(0)}%`;
      tip.innerHTML = `<strong>${where}</strong>` + rows[i].map((f, b) => `<span>Band ${b + 1}</span><span>${f.toFixed(3)}</span>`).join('');
      tip.hidden = false;
      const left = (x / W) * r.width;
      tip.style.left = `${left > r.width / 2 ? left - tip.offsetWidth - 12 : left + 12}px`;
      tip.style.top = `${M.t / H * r.height + 4}px`;
    };
    const hide = () => {
      cross.setAttribute('visibility', 'hidden');
      dots.forEach(d => d.setAttribute('visibility', 'hidden'));
      tip.hidden = true;
    };
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);
  };

  // ---------- values + status ----------
  const valuesBox = document.getElementById('px-values');
  const statusBox = document.getElementById('px-status');

  const drawValues = g => {
    const items = [];
    state.c.forEach((v, n) => items.push([tex(`c_${n + 1}`), signed(v)]));
    items.push([tex('h/a'), `${state.h.toFixed(0)}%`]);
    items.push([tex('h'), `${fmt(g.h, 2)} ${A}`]);
    items.push([tex('r_0'), `${fmt(g.r0)} ${A}`]);
    items.push([tex('r_{\\min}'), g.solid ? '—' : `${fmt(g.rMin)} ${A}`]);
    items.push([tex('r_{\\max}'), g.solid ? '—' : `${fmt(g.rMax)} ${A}`]);
    items.push(['Min. ligament', g.negative || g.overlap ? '—' : `${fmt(g.ligament)} ${A}`]);
    items.push(['Porosity', g.overlap ? '—' : `${(g.porosity * 100).toFixed(1)}%`]);
    valuesBox.innerHTML = items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    let msg, cls;
    if (g.solid) { msg = `Solid plate: no pore at ${tex('h/a')} = 100%.`; cls = 'ok'; }
    else if (g.negative) { msg = `${tex('r(\\phi)')} becomes negative at some angles. Reduce the coefficients.`; cls = 'warn'; }
    else if (g.overlap) { msg = 'Pores reach the cell edge and merge with their neighbours.'; cls = 'warn'; }
    else { msg = `Valid geometry. Thinnest ligament ≈ ${fmt(g.ligament)} ${A}.`; cls = 'ok'; }
    statusBox.innerHTML = msg;
    statusBox.className = `px-status px-status-${cls}`;
  };

  // ---------- update loop ----------
  let pending = false;
  const update = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const g = analyse();
      drawShape(g);
      drawBands(g);
      drawValues(g);
    });
  };

  drawSchematic();
  update();
  window.addEventListener('resize', update);
};

{
  const ready = window.MathJax && MathJax.startup && MathJax.startup.promise
    ? MathJax.startup.promise : Promise.resolve();
  const timeout = new Promise(res => setTimeout(res, 4000));   // don't wait forever for the CDN
  let started = false;
  const go = () => { if (!started) { started = true; startExplorer(); } };
  Promise.race([ready, timeout]).then(go, go);
}
