// WAVE LAB — shared site script. No libraries or external APIs.

// Mobile navigation toggle
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

function closeMenu() {
  nav?.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'Open navigation');
}

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

// Animated wave packet on the home page:
// a Gaussian envelope times a cosine carrier whose phase keeps moving,
// so the wave appears to propagate continuously through the packet.
const wavePath = document.getElementById('wave-packet');

if (wavePath) {
  const svg = wavePath.ownerSVGElement;
  let MID = 40, AMP = 34;                 // centre line and peak height (set from the SVG size)
  const WAVELENGTH = 19.56;              // pixels per oscillation (smaller = more peaks)
  const SIGMA = 0.3375;               // envelope width (smaller = longer flat ends)
  const SPEED = 1.6;                      // carrier speed, half-cycles per second
  const STEP = 1.5;                       // x resolution in pixels

  // Match the drawing to the SVG's real size, so stroke and peak
  // height stay right on any screen.
  let W = 360, CYCLES = 16;
  const resize = () => {
    const box = svg.getBoundingClientRect();
    W = Math.max(200, Math.round(box.width));
    const H = Math.max(30, Math.round(box.height));
    MID = H / 2;
    AMP = H * 0.42;
    CYCLES = W / WAVELENGTH;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  };
  resize();
  window.addEventListener('resize', resize);
  document.fonts?.ready.then(resize);     // re-measure once fonts load

  const drawWave = phase => {
    let d = '';
    for (let x = 0; x <= W; x += STEP) {
      const u = (x / W) * 2 - 1;                          // -1 … 1
      const envelope = Math.exp(-((u / SIGMA) ** 2));
      const y = MID - AMP * envelope * Math.cos(Math.PI * CYCLES * u - phase);
      d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(2)} `;
    }
    wavePath.setAttribute('d', d);
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    drawWave(0);                                          // static wave
  } else {
    const animate = time => {
      drawWave((time / 1000) * SPEED * Math.PI);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

// Box 1 — Nonreciprocity:
// the midpoint is excited by a Gaussian tone burst that starts from zero amplitude.
// The waves it emits travel outward: to the right they keep their amplitude,
// to the left they decay to zero well before the left edge.
const nrSvg = document.getElementById('anim-nonreciprocity');

if (nrSvg) {
  const wave = nrSvg.querySelector('.anim-wave');
  const axis = nrSvg.querySelector('.anim-axis');
  const source = nrSvg.querySelector('.anim-source');
  const massGroup = nrSvg.querySelector('.anim-masses');
  const MASS_SPACING = 4;  // px between masses
  const MASS_RADIUS = 1.6; // px
  let masses = [];         // [{x, el}]

  const SPEED = 31.875;    // packet speed, px per second
  const SIGMA = 20;        // packet width (Gaussian envelope), px
  const WAVELENGTH = 12;   // carrier wavelength, px (smaller = more peaks)
  const PAUSE = 0.8;       // pause before the next pulse, s

  // Source signal timing (Gaussian burst in time, matching the spatial width)
  const SIGMA_T = SIGMA / SPEED;            // burst width in seconds
  const T0 = 3.2 * SIGMA_T;                 // burst peak time (starts from ~zero)
  const OMEGA = 2 * Math.PI * SPEED / WAVELENGTH;

  let W = 300, H = 200, MID = 100, AMP = 60, period = 4, decayLen = 50;

  const resize = () => {
    const box = nrSvg.getBoundingClientRect();
    W = Math.max(120, box.width);
    H = Math.max(80, box.height);
    MID = H / 2;
    AMP = H * 0.36;
    nrSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    axis.setAttribute('x1', 0); axis.setAttribute('x2', W);
    axis.setAttribute('y1', MID); axis.setAttribute('y2', MID);
    source.setAttribute('cx', W / 2); source.setAttribute('cy', MID);
    // Whole burst leaves the right edge, then pause and repeat
    period = 2 * T0 + (W / 2) / SPEED + PAUSE;
    // Left-going wave falls to ~1% within 60% of the way to the left edge
    decayLen = (0.6 * W / 2) / 4.6;

    // Rebuild the chain of masses, symmetric about the source
    massGroup.replaceChildren();
    masses = [];
    const n = Math.floor((W / 2) / MASS_SPACING);
    for (let i = -n; i <= n; i++) {
      if (i === 0) continue;                              // source dot sits here
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('r', MASS_RADIUS);
      massGroup.appendChild(el);
      masses.push({ x: W / 2 + i * MASS_SPACING, el });
    }
  };
  resize();
  window.addEventListener('resize', resize);

  // Displacement of the source at time t: zero → grows → back to zero
  const sourceSignal = t => {
    if (t <= 0) return 0;
    const g = Math.exp(-((t - T0) ** 2) / (2 * SIGMA_T * SIGMA_T));
    return g * Math.sin(OMEGA * t);
  };

  // Displacement at position x and time t
  const displacement = (x, t) => {
    const c = W / 2;
    const dist = Math.abs(x - c);
    // signal emitted at the source arrives here after dist / SPEED seconds
    let u = sourceSignal(t - dist / SPEED);
    if (x < c) u *= Math.exp(-dist / decayLen);           // decay to the left only
    return MID - AMP * u;
  };

  const draw = t => {
    let d = '';
    const c = W / 2;
    let centreDone = false;
    for (let x = 0; x <= W; x += 1.5) {
      // include the exact source point so the line passes through the source dot
      if (!centreDone && x > c) {
        d += `L${c.toFixed(2)} ${displacement(c, t).toFixed(2)} `;
        centreDone = true;
      }
      d += `${x === 0 ? 'M' : 'L'}${x.toFixed(1)} ${displacement(x, t).toFixed(2)} `;
    }
    wave.setAttribute('d', d);

    for (const m of masses) {
      m.el.setAttribute('cx', m.x.toFixed(1));
      m.el.setAttribute('cy', displacement(m.x, t).toFixed(2));
    }
    // source moves with the chain too
    source.setAttribute('cy', displacement(W / 2, t).toFixed(2));
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(T0 + 2.5);                                       // static snapshot
  } else {
    let start = null;
    const loop = now => {
      if (start === null) start = now;
      const t = ((now - start) / 1000) % period;
      draw(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Box 2 — Fractal-like wave:
// the left end is excited with a plain Gaussian wave packet. As it travels right,
// third-order dispersion reshapes it: the trailing (left) side stays smooth while
// the leading (right) front breaks into Airy-like lobes that shrink in height and
// width. The envelope is computed exactly from the dispersion integral
//   A(ξ, t) = (2σ/√2π) ∫₀^∞ e^{-k²σ²/2} cos(kξ + β t k³) dk ,  β < 0
// and the displacement is A · cos(k₀ (x − v t)).
const frSvg = document.getElementById('anim-fractal');

if (frSvg) {
  const wave = frSvg.querySelector('.anim-wave');
  const axis = frSvg.querySelector('.anim-axis');
  const source = frSvg.querySelector('.anim-source');
  const massGroup = frSvg.querySelector('.anim-masses');
  const MASS_SPACING = 4;    // px between masses (same as box 1)
  const MASS_RADIUS = 1.6;   // px
  let masses = [];

  const SPEED = 39.84;       // group speed, px per second (box 1 speed + 25%)
  const SIGMA = 12;          // width of the exciting Gaussian packet, px
  const WAVELENGTH = 12;     // carrier wavelength, px (same as box 1)
  const BETA = -500;         // dispersion strength, px³ per second (negative → lobes on the right)
  const PAUSE = 0.8;         // pause before the next packet, s
  const SRC_X = 6;           // source position, px from the left edge
  const START = -4 * SIGMA;  // packet centre starts this far behind the source (so it grows in)

  // Pre-compute envelope shapes A(ξ, t) on a grid
  const XI_MIN = -6 * SIGMA, XI_MAX = 420, XI_STEP = 0.5;
  const NT = 90;             // number of time levels
  const NK = 260, K_MAX = 4.5 / SIGMA, DK = K_MAX / NK;
  const NXI = Math.round((XI_MAX - XI_MIN) / XI_STEP) + 1;
  let tables = [], tMax = 10;

  const buildTables = () => {
    tables = [];
    const weights = [];
    for (let j = 0; j <= NK; j++) {
      const k = j * DK;
      const trap = (j === 0 || j === NK) ? 0.5 : 1;
      weights.push(trap * DK * Math.exp(-0.5 * k * k * SIGMA * SIGMA) * 2 * SIGMA / Math.sqrt(2 * Math.PI));
    }
    for (let n = 0; n < NT; n++) {
      const bt = BETA * (tMax * n / (NT - 1));
      const row = new Float32Array(NXI);
      for (let i = 0; i < NXI; i++) {
        const xi = XI_MIN + i * XI_STEP;
        let sum = 0;
        for (let j = 0; j <= NK; j++) {
          const k = j * DK;
          sum += weights[j] * Math.cos(k * xi + bt * k * k * k);
        }
        row[i] = sum;
      }
      tables.push(row);
    }
  };

  // Envelope lookup with linear interpolation in time
  const envelope = (xi, t) => {
    if (xi < XI_MIN || xi > XI_MAX) return 0;
    const i = Math.round((xi - XI_MIN) / XI_STEP);
    const f = Math.min(NT - 1, Math.max(0, (t / tMax) * (NT - 1)));
    const n0 = Math.floor(f), n1 = Math.min(NT - 1, n0 + 1), w = f - n0;
    return tables[n0][i] * (1 - w) + tables[n1][i] * w;
  };

  let W = 300, H = 200, MID = 100, AMP = 70, period = 10;
  const K0 = 2 * Math.PI / WAVELENGTH;

  const resize = () => {
    const box = frSvg.getBoundingClientRect();
    W = Math.max(120, box.width);
    H = Math.max(80, box.height);
    MID = H / 2;
    AMP = H * 0.4;
    frSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    axis.setAttribute('x1', 0); axis.setAttribute('x2', W);
    axis.setAttribute('y1', MID); axis.setAttribute('y2', MID);
    source.setAttribute('cx', SRC_X);

    // Run until the smooth trailing side has left the right edge
    const newTMax = (W - SRC_X - START + 4 * SIGMA) / SPEED;
    if (!tables.length || Math.abs(newTMax - tMax) > 0.5) {
      tMax = newTMax;
      buildTables();
    }
    period = tMax + PAUSE;

    // Chain of masses to the right of the source
    massGroup.replaceChildren();
    masses = [];
    for (let x = SRC_X + MASS_SPACING; x <= W; x += MASS_SPACING) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('r', MASS_RADIUS);
      el.setAttribute('cx', x.toFixed(1));
      massGroup.appendChild(el);
      masses.push({ x, el });
    }
  };
  resize();
  window.addEventListener('resize', resize);

  // Vertical position at x, time t (only to the right of the source)
  const displacement = (x, t) => {
    if (t > tMax) return MID;                             // pause: chain at rest
    const centre = SRC_X + START + SPEED * t;
    const xi = x - centre;
    // dispersion acts only after the packet centre has left the source
    const tDisp = Math.max(0, t + START / SPEED);
    return MID - AMP * envelope(xi, tDisp) * Math.cos(K0 * xi);
  };

  const draw = t => {
    let d = '';
    for (let x = SRC_X; x <= W; x += 0.5) {
      d += `${x === SRC_X ? 'M' : 'L'}${x.toFixed(1)} ${displacement(x, t).toFixed(2)} `;
    }
    wave.setAttribute('d', d);
    for (const m of masses) m.el.setAttribute('cy', displacement(m.x, t).toFixed(2));
    source.setAttribute('cy', displacement(SRC_X, t).toFixed(2));
  };

  frSvg.__draw = draw; frSvg.__tMax = () => tMax;        // used for previews
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(tMax * 0.7);                                     // static snapshot
  } else {
    let start = null;
    const loop = now => {
      if (start === null) start = now;
      draw(((now - start) / 1000) % period);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Box 3 — Dynamic nonlocality:
// an 11×11 lattice of masses on a plane seen in perspective. Sequence (repeats):
//   1. masses fall in from above, one after another, and settle;
//   2. black springs are drawn along x, sweeping left → right;
//   3. black springs are drawn along y, sweeping bottom (front) → top (back);
//   4. two blue nonlocal springs attach to the centre mass and keep jumping
//      to new, randomly chosen distant masses;
//   5. fade out, start again.
const ltSvg = document.getElementById('anim-lattice');

if (ltSvg) {
  const NS = 'http://www.w3.org/2000/svg';
  const massLayer = ltSvg.querySelector('.lattice-masses');
  const shadowLayer = ltSvg.querySelector('.lattice-shadows');
  const springLayer = ltSvg.querySelector('.lattice-springs');
  const nonlocalLayer = ltSvg.querySelector('.lattice-nonlocal');

  const N = 11;              // masses per side
  const R = 0.2;             // sphere radius (lattice spacing = 1)
  const ELEV = 32 * Math.PI / 180;   // camera elevation above the plane
  const DIST = 14;           // camera distance from the lattice centre
  const DROP = 9;            // fall height
  const FALL_TIME = 0.75;    // s per mass
  const STAGGER = 0.025;     // s between successive masses
  const SWEEP_X = 1.4;       // s to draw all x-springs (left → right)
  const SWEEP_Y = 1.4;       // s to draw all y-springs (bottom → top)
  const GAP = 0.3;           // s between phases
  const HOLD = 8;            // s to show the finished lattice with nonlocal springs
  const NL_DELAY = 0.3;      // s after the lattice is complete
  const NL_SWITCH = 1.4;     // s between connection switches (per spring)
  const NL_MOVE = 0.55;      // s for a spring to glide to its new mass
  const NL_TARGETS = 12;     // targets prepared per cycle
  const FADE = 0.6;          // s fade-out before restarting

  const T_DROP = N * N * STAGGER + FALL_TIME;
  const T_X = T_DROP + GAP;                 // x-springs start
  const T_Y = T_X + SWEEP_X + GAP;          // y-springs start
  const T_DONE = T_Y + SWEEP_Y;
  const CYCLE = T_DONE + HOLD + FADE;

  // Project a 3D point (x across, y up, z into the screen) to camera space
  const project = (x, y, z) => ({
    x,
    y: z * Math.sin(ELEV) + y * Math.cos(ELEV),
    z: z * Math.cos(ELEV) - y * Math.sin(ELEV) + DIST,
  });

  // Lattice sites, drawn back-to-front
  const sites = [];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      sites.push({ i, j, x: i - (N - 1) / 2, z: j - (N - 1) / 2, delay: 0 });
    }
  }
  sites.sort((a, b) => b.z - a.z);
  for (const s of sites) {
    s.shadow = document.createElementNS(NS, 'ellipse');
    s.ball = document.createElementNS(NS, 'circle');
    shadowLayer.appendChild(s.shadow);
    massLayer.appendChild(s.ball);
  }

  // New random fall order for each cycle
  const shuffle = () => {
    const order = sites.map((_, k) => k);
    for (let k = order.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [order[k], order[r]] = [order[r], order[k]];
    }
    order.forEach((k, n) => { sites[k].delay = n * STAGGER; });
  };

  const CENTRE = { i: (N - 1) / 2, j: (N - 1) / 2 };
  const nonlocal = [0, 1].map(() => {
    const path = document.createElementNS(NS, 'path');
    const ring = document.createElementNS(NS, 'circle');
    nonlocalLayer.appendChild(path);
    nonlocalLayer.appendChild(ring);
    return { path, ring, targets: [] };
  });

  // Random distant masses (not the centre or its nearest neighbours)
  const pickTargets = () => {
    for (let n = 0; n < NL_TARGETS; n++) {
      for (let k = 0; k < nonlocal.length; k++) {
        let t;
        do {
          t = { i: Math.floor(Math.random() * N), j: Math.floor(Math.random() * N) };
        } while (
          Math.max(Math.abs(t.i - CENTRE.i), Math.abs(t.j - CENTRE.j)) < 2 ||
          (n > 0 && t.i === nonlocal[k].targets[n - 1].i && t.j === nonlocal[k].targets[n - 1].j) ||
          (k > 0 && t.i === nonlocal[0].targets[n].i && t.j === nonlocal[0].targets[n].j)
        );
        nonlocal[k].targets[n] = t;
      }
    }
  };

  const reshuffle = () => { shuffle(); pickTargets(); };
  reshuffle();

  // Springs: x-direction (i → i+1) and y-direction (j → j+1, front → back)
  const at = {};
  for (const s of sites) at[`${s.i},${s.j}`] = s;
  const springs = [];
  for (const s of sites) {
    const right = at[`${s.i + 1},${s.j}`], back = at[`${s.i},${s.j + 1}`];
    for (const [n, dir] of [[right, 'x'], [back, 'y']]) {
      if (!n) continue;
      const el = document.createElementNS(NS, 'line');
      springLayer.appendChild(el);
      springs.push({ a: s, b: n, dir, el });
    }
  }

  let W = 300, H = 200, F = 100, CX = 150, CY = 100;

  const resize = () => {
    const box = ltSvg.getBoundingClientRect();
    W = Math.max(120, box.width);
    H = Math.max(80, box.height);
    ltSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of sites) {
      const p = project(s.x, R, s.z);
      const sx = p.x / p.z, sy = -p.y / p.z, r = R / p.z;
      minX = Math.min(minX, sx - r); maxX = Math.max(maxX, sx + r);
      minY = Math.min(minY, sy - r); maxY = Math.max(maxY, sy + r);
    }
    F = Math.min((W * 0.88) / (maxX - minX), (H * 0.86) / (maxY - minY));
    CX = W / 2 - F * (minX + maxX) / 2;
    CY = H / 2 - F * (minY + maxY) / 2;
  };
  resize();

  // Fall with a small bounce at the end (height above the plane, 0 = landed)
  const height = t => {
    if (t <= 0) return DROP;
    if (t >= FALL_TIME) return 0;
    const u = t / FALL_TIME, fall = 0.78;
    if (u < fall) { const v = u / fall; return DROP * (1 - v * v); }
    const v = (u - fall) / (1 - fall);
    return DROP * 0.05 * 4 * v * (1 - v);
  };

  const clamp01 = v => Math.min(1, Math.max(0, v));
  const smooth = v => v * v * (3 - 2 * v);
  const toScreen = (x, y, z) => {
    const p = project(x, y, z);
    return [CX + F * p.x / p.z, CY - F * p.y / p.z, p.z];
  };
  const latticeX = i => i - (N - 1) / 2;

  const draw = t => {
    // Whole scene fades out at the end of the cycle
    const fade = 1 - clamp01((t - (T_DONE + HOLD)) / FADE);
    ltSvg.style.opacity = fade.toFixed(3);

    for (const s of sites) {
      const h = height(t - s.delay);
      const ground = project(s.x, 0, s.z);
      const p = project(s.x, h + R, s.z);
      const visible = t - s.delay > 0;

      s.sx = CX + F * p.x / p.z;
      s.sy = CY - F * p.y / p.z;
      s.ball.setAttribute('cx', s.sx.toFixed(2));
      s.ball.setAttribute('cy', s.sy.toFixed(2));
      s.ball.setAttribute('r', (F * R / p.z).toFixed(2));
      s.ball.style.opacity = visible ? 1 : 0;

      const close = Math.max(0, 1 - h / DROP);
      const rs = F * R * 1.1 / ground.z;
      s.shadow.setAttribute('cx', (CX + F * ground.x / ground.z).toFixed(2));
      s.shadow.setAttribute('cy', (CY - F * ground.y / ground.z).toFixed(2));
      s.shadow.setAttribute('rx', (rs * (0.4 + 0.6 * close)).toFixed(2));
      s.shadow.setAttribute('ry', (rs * Math.sin(ELEV) * (0.4 + 0.6 * close)).toFixed(2));
      s.shadow.style.opacity = visible ? (0.08 + 0.17 * close).toFixed(3) : 0;
    }

    // Springs grow along their direction as the sweep passes them
    const sweepX = clamp01((t - T_X) / SWEEP_X) * (N - 1);   // in lattice units
    const sweepY = clamp01((t - T_Y) / SWEEP_Y) * (N - 1);
    for (const sp of springs) {
      const k = sp.dir === 'x' ? sp.a.i : sp.a.j;
      const p = clamp01((sp.dir === 'x' ? sweepX : sweepY) - k);
      sp.el.setAttribute('x1', sp.a.sx.toFixed(2));
      sp.el.setAttribute('y1', sp.a.sy.toFixed(2));
      sp.el.setAttribute('x2', (sp.a.sx + (sp.b.sx - sp.a.sx) * p).toFixed(2));
      sp.el.setAttribute('y2', (sp.a.sy + (sp.b.sy - sp.a.sy) * p).toFixed(2));
      sp.el.style.opacity = p > 0 ? 1 : 0;
    }

    // Nonlocal springs: arcs from the centre mass to a moving, distant mass
    const c0 = [latticeX(CENTRE.i), R, latticeX(CENTRE.j)];
    nonlocal.forEach((nl, k) => {
      const tau = t - T_DONE - NL_DELAY - k * NL_SWITCH / 2;   // the two springs alternate
      if (tau < 0) {
        nl.path.style.opacity = 0; nl.ring.style.opacity = 0; return;
      }
      const n = Math.min(NL_TARGETS - 1, Math.floor(tau / NL_SWITCH));
      const q = smooth(clamp01((tau - n * NL_SWITCH) / NL_MOVE));
      const from = n === 0 ? CENTRE : nl.targets[n - 1];
      const to = nl.targets[n];
      const ti = from.i + (to.i - from.i) * q;
      const tj = from.j + (to.j - from.j) * q;
      const end = [latticeX(ti), R, latticeX(tj)];

      // Quadratic arc lifted above the plane; higher for longer connections
      const dist = Math.hypot(end[0] - c0[0], end[2] - c0[2]);
      const lift = 0.24 * dist + 0.5;                     // apex height above the masses
      const mid = [(c0[0] + end[0]) / 2, R + lift * 2, (c0[2] + end[2]) / 2];
      let d = '';
      for (let m = 0; m <= 24; m++) {
        const u = m / 24, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        const [sx, sy] = toScreen(
          a * c0[0] + b * mid[0] + c * end[0],
          a * c0[1] + b * mid[1] + c * end[1],
          a * c0[2] + b * mid[2] + c * end[2]);
        d += `${m ? 'L' : 'M'}${sx.toFixed(2)} ${sy.toFixed(2)} `;
      }
      nl.path.setAttribute('d', d);
      nl.path.style.opacity = 1;

      // Ring marks the mass currently connected (once the spring has arrived)
      const [rx, ry, rz] = toScreen(end[0], end[1], end[2]);
      nl.ring.setAttribute('cx', rx.toFixed(2));
      nl.ring.setAttribute('cy', ry.toFixed(2));
      nl.ring.setAttribute('r', (F * R * 1.7 / rz).toFixed(2));
      nl.ring.style.opacity = q >= 1 ? 1 : 0;
    });
  };

  let lastT = 0;
  window.addEventListener('resize', () => { resize(); draw(lastT); });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lastT = T_DONE;
    draw(T_DONE);                                          // finished lattice
  } else {
    draw(0);
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      let start = null, cycle = 0;
      const loop = now => {
        if (start === null) start = now;
        const elapsed = (now - start) / 1000;
        const c = Math.floor(elapsed / CYCLE);
        if (c !== cycle) { cycle = c; reshuffle(); }        // new fall order each time
        lastT = elapsed - c * CYCLE;
        draw(lastT);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };
    // Start when the box scrolls into view
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { run(); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(ltSvg);
    } else {
      run();
    }
  }
}

// Current year in footer
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
