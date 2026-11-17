/* ============================================================
   GENESIS — live level preview
   A self-contained canvas animation that shows what a generated
   level looks like as it scrolls past the player.
   ============================================================ */
(function () {
  const canvas = document.getElementById('level-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const hud = {
    seed: document.getElementById('pv-seed'),
    bpm: document.getElementById('pv-bpm'),
    objs: document.getElementById('pv-objs'),
    sec: document.getElementById('pv-sec'),
    mode: document.getElementById('pv-mode'),
    pct: document.getElementById('pv-pct')
  };
  const btnPlay = document.getElementById('pv-play');
  const btnReroll = document.getElementById('pv-reroll');
  const modeBtns = document.querySelectorAll('.pv-toggle button');

  const C = {
    cyan: '#31e3d8',
    violet: '#9b6bff',
    lime: '#b9f227',
    orange: '#ff9f43',
    pink: '#ff4fa3'
  };

  let W = 0, H = 0, dpr = 1;

  const S = {
    seed: 4821,
    bpm: 174,
    playing: true,
    decorated: false,
    speed: 355,
    scroll: 0,
    t: 0,
    beatT: 0,
    objects: [],
    nextX: 820,
    placed: 0,
    player: { y: 0, vy: 0, rot: 0, ground: true },
    trail: [],
    particles: [],
    rng: null
  };

  /* ---------- helpers ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, r.width);
    H = Math.max(200, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
  }

  const GROUND = () => H - 58;          // ground surface y
  const PLAYER_X = () => Math.max(90, W * 0.24);
  const CELL = () => (S.speed * 60 / S.bpm) * 2;  // two beats of travel
  const JUMP_V = 780;
  const GRAVITY = 2450;
  const AIR_TIME = (2 * JUMP_V) / GRAVITY;
  const JUMP_RANGE = () => S.speed * AIR_TIME;
  const PH = 26;                         // player size

  /* ---------- generation ---------- */
  function rebuild() {
    S.rng = mulberry32(S.seed);
    S.objects = [];
    S.nextX = 820;
    S.placed = 0;
    S.scroll = 0;
    S.t = 0;
    S.player = { y: 0, vy: 0, rot: 0, ground: true };
    S.trail = [];
    S.particles = [];
    generate();
  }

  function generate() {
    const horizon = S.scroll + W + 700;
    while (S.nextX < horizon) {
      const r = S.rng();
      let type = 'empty';
      if (r < 0.42) type = 'spike';
      else if (r < 0.62) type = 'pillar';
      else if (r < 0.75) type = 'orb';
      else if (r < 0.85) type = 'pad';
      else if (r < 0.93) type = 'gap';

      if (type === 'empty') {
        S.nextX += CELL();
        continue;
      }

      const obj = { x: S.nextX, type: type, seedOff: S.rng(), born: S.placed };
      if (type === 'spike') {
        const n = S.rng() < 0.28 ? 2 : S.rng() < 0.2 ? 3 : 1;
        obj.count = n;
        obj.h = 30 + n * 2;
      } else if (type === 'pillar') {
        obj.w = 34 + Math.round(S.rng() * 18);
        obj.h = 34 + Math.round(S.rng() * 24);
      } else if (type === 'orb') {
        obj.inset = 0.30 + S.rng() * 0.18;
      } else if (type === 'pad') {
        obj.w = 26;
      } else if (type === 'gap') {
        obj.w = 58;
      }
      S.objects.push(obj);
      S.placed++;
      // keep at least two beats of clearance after any feature
      S.nextX += CELL() * (type === 'orb' || type === 'pad' ? 3 : 2);
    }
  }

  function prune() {
    const cut = S.scroll - 260;
    if (!S.objects.length || S.objects[0].x > cut) return;
    let i = 0;
    while (i < S.objects.length && S.objects[i].x < cut) i++;
    if (i) S.objects.splice(0, i);
  }

  /* ---------- simulation ---------- */
  function jump() {
    const p = S.player;
    if (!p.ground) return;
    p.vy = -JUMP_V;
    p.ground = false;
    for (let i = 0; i < 5; i++) {
      S.particles.push({
        x: PLAYER_X() - 4, y: GROUND() - 2,
        vx: -60 - Math.random() * 110,
        vy: -Math.random() * 90,
        life: 0.5, col: C.cyan
      });
    }
  }

  function step(dt) {
    S.t += dt;
    S.beatT = 60 / S.bpm;
    S.scroll += S.speed * dt;
    generate();
    prune();

    const p = S.player;
    const px = PLAYER_X();
    const worldPx = PLAYER_X(); // player's fixed screen x

    // auto-pilot: jump before the next obstacle
    const lead = Math.min(JUMP_RANGE() * 0.62, S.speed * 0.30);
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (o.type === 'orb' || o.type === 'pad') continue;
      const dist = (o.x - S.scroll);
      if (dist > 0 && dist < lead) { jump(); break; }
    }

    // physics
    if (!p.ground) {
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      p.rot += dt * 4.2;
      if (p.y >= 0) {
        p.y = 0; p.vy = 0; p.ground = true;
        p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2);
        for (let i = 0; i < 4; i++) {
          S.particles.push({
            x: px + 4, y: GROUND(),
            vx: -40 - Math.random() * 80, vy: -Math.random() * 50,
            life: 0.4, col: C.violet
          });
        }
      }
    }

    // orbs and pads give a nudge when they pass the player
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      const sx = o.x - S.scroll + px;
      if (o.type === 'orb' && o.x - S.scroll < 0 && o.x - S.scroll > -S.speed * dt - 2) {
        if (!p.ground && p.vy > -160) { p.vy = -JUMP_V * 0.78; p.rot += 0.6; }
      }
      if (o.type === 'pad' && o.x - S.scroll < 0 && o.x - S.scroll > -S.speed * dt - 2) {
        p.vy = -JUMP_V * 0.9; p.ground = false;
      }
      if (sx < -120) { /* handled by prune */ }
    }

    // trail
    S.trail.unshift({ x: px, y: GROUND() - PH + p.y, rot: p.rot });
    if (S.trail.length > 12) S.trail.pop();

    // particles
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const q = S.particles[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 320 * dt;
      q.life -= dt;
      if (q.life <= 0) S.particles.splice(i, 1);
    }
  }

  /* ---------- drawing ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(time) {
    const g = GROUND();
    const px = PLAYER_X();
    const beatPhase = (S.t % S.beatT) / S.beatT;
    const pulse = Math.pow(1 - beatPhase, 2.4);

    ctx.clearRect(0, 0, W, H);

    /* ---- sky ---- */
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (S.decorated) {
      sky.addColorStop(0, '#150e2c');
      sky.addColorStop(0.55, '#1a1240');
      sky.addColorStop(1, '#0a0816');
    } else {
      sky.addColorStop(0, '#0b0b17');
      sky.addColorStop(1, '#08080f');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* ---- beat glow ---- */
    const gl = ctx.createRadialGradient(W * 0.5, g + 40, 20, W * 0.5, g + 40, W * 0.72);
    gl.addColorStop(0, S.decorated
      ? `rgba(155,107,255,${0.30 + pulse * 0.34})`
      : `rgba(49,227,216,${0.09 + pulse * 0.12})`);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);

    /* ---- parallax grid ---- */
    ctx.strokeStyle = S.decorated ? 'rgba(155,107,255,.10)' : 'rgba(255,255,255,.045)';
    ctx.lineWidth = 1;
    const cellW = 58;
    const off = (S.scroll * 0.35) % cellW;
    for (let x = -off; x < W + cellW; x += cellW) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, g);
      ctx.stroke();
    }
    for (let y = 0; y < g; y += 58) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    /* ---- decorations behind ---- */
    if (S.decorated) {
      for (let i = 0; i < 22; i++) {
        const sx = ((i * 137.5 - S.scroll * (0.12 + (i % 3) * 0.05)) % (W + 80) + W + 80) % (W + 80) - 40;
        const sy = 30 + ((i * 53) % (g - 90));
        const a = 0.10 + 0.18 * pulse;
        ctx.fillStyle = i % 3 === 0 ? `rgba(49,227,216,${a})` : `rgba(155,107,255,${a})`;
        const sz = 3 + (i % 4);
        ctx.fillRect(sx, sy, sz, sz);
      }
      // floating deco blocks
      for (let i = 0; i < 6; i++) {
        const bx = ((i * 340 - S.scroll * 0.45) % (W + 300) + W + 300) % (W + 300) - 150;
        const by = 40 + (i % 4) * 46 + Math.sin(time / 900 + i) * 8;
        ctx.globalAlpha = 0.16 + 0.1 * pulse;
        ctx.fillStyle = C.violet;
        rr(bx, by, 26, 26, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    /* ---- ground ---- */
    const gr = ctx.createLinearGradient(0, g, 0, H);
    if (S.decorated) {
      gr.addColorStop(0, '#241a44');
      gr.addColorStop(1, '#0d0a1a');
    } else {
      gr.addColorStop(0, '#191929');
      gr.addColorStop(1, '#0c0c15');
    }
    ctx.fillStyle = gr;
    ctx.fillRect(0, g, W, H - g);

    // ground top line
    ctx.fillStyle = S.decorated ? `rgba(185,242,39,${0.55 + pulse * 0.35})` : `rgba(49,227,216,${0.45 + pulse * 0.3})`;
    ctx.fillRect(0, g - 2, W, 2);

    // moving ground ticks
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    const tickOff = S.scroll % 34;
    for (let x = -tickOff; x < W; x += 34) ctx.fillRect(x, g + 6, 1, 8);

    /* ---- objects ---- */
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      const x = o.x - S.scroll + px;
      if (x < -160 || x > W + 160) continue;
      drawObject(o, x, g, pulse);
    }

    /* ---- particles ---- */
    for (let i = 0; i < S.particles.length; i++) {
      const q = S.particles[i];
      ctx.globalAlpha = Math.max(0, q.life) * 1.1;
      ctx.fillStyle = q.col;
      ctx.fillRect(q.x, q.y, 3, 3);
      ctx.globalAlpha = 1;
    }

    /* ---- player ---- */
    const p = S.player;
    const py = g - PH + p.y;

    // trail
    for (let i = S.trail.length - 1; i >= 1; i--) {
      const t = S.trail[i];
      ctx.globalAlpha = (1 - i / S.trail.length) * 0.22;
      ctx.fillStyle = C.violet;
      rr(t.x, t.y, PH, PH, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(px + PH / 2, py + PH / 2);
    ctx.rotate(p.rot);
    const pg = ctx.createLinearGradient(-PH / 2, -PH / 2, PH / 2, PH / 2);
    pg.addColorStop(0, C.cyan);
    pg.addColorStop(0.55, C.violet);
    pg.addColorStop(1, C.pink);
    ctx.shadowColor = 'rgba(155,107,255,.9)';
    ctx.shadowBlur = 22 + pulse * 14;
    ctx.fillStyle = pg;
    rr(-PH / 2, -PH / 2, PH, PH, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(8,8,15,.85)';
    rr(-PH / 2 + 6, -PH / 2 + 6, 7, 7, 2);
    ctx.fill();
    rr(PH / 2 - 13, -PH / 2 + 6, 7, 7, 2);
    ctx.fill();
    ctx.restore();

    /* ---- progress bar ---- */
    const total = 100;
    const prog = (S.t * 1.4) % total / total;
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(0, H - 6, W, 3);
    const barG = ctx.createLinearGradient(0, 0, W, 0);
    barG.addColorStop(0, C.cyan);
    barG.addColorStop(0.6, C.violet);
    barG.addColorStop(1, C.pink);
    ctx.fillStyle = barG;
    ctx.fillRect(0, H - 6, W * prog, 3);
  }

  function drawObject(o, x, g, pulse) {
    if (o.type === 'spike') {
      const n = o.count || 1;
      for (let i = 0; i < n; i++) {
        const sx = x + i * 20;
        const h = o.h;
        const grad = ctx.createLinearGradient(sx, g - h, sx, g);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, S.decorated ? '#cfc4ff' : '#b9b9d4');
        ctx.fillStyle = grad;
        if (S.decorated) {
          ctx.shadowColor = 'rgba(255,255,255,.45)';
          ctx.shadowBlur = 10 + pulse * 8;
        }
        ctx.beginPath();
        ctx.moveTo(sx, g);
        ctx.lineTo(sx + 9, g - h);
        ctx.lineTo(sx + 18, g);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else if (o.type === 'pillar' || o.type === 'gap') {
      const w = o.w, h = o.h || 30;
      const grad = ctx.createLinearGradient(x, g - h, x, g);
      if (S.decorated) {
        grad.addColorStop(0, '#5f3fb8');
        grad.addColorStop(1, '#2b1d5c');
      } else {
        grad.addColorStop(0, '#2f6fbf');
        grad.addColorStop(1, '#214f8c');
      }
      ctx.fillStyle = grad;
      rr(x, g - h, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = S.decorated
        ? `rgba(185,242,39,${0.4 + pulse * 0.4})`
        : 'rgba(255,255,255,.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (S.decorated) {
        ctx.fillStyle = `rgba(185,242,39,${0.16 + pulse * 0.2})`;
        ctx.fillRect(x + 4, g - h - 3, w - 8, 3);
      }
    } else if (o.type === 'orb') {
      const cy = g - 30 - (o.inset || 0.3) * 110;
      ctx.shadowColor = 'rgba(185,242,39,.85)';
      ctx.shadowBlur = 16 + pulse * 12;
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 8, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(185,242,39,.3)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + 8, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.type === 'pad') {
      ctx.shadowColor = 'rgba(255,159,67,.8)';
      ctx.shadowBlur = 14 + pulse * 10;
      ctx.fillStyle = C.orange;
      rr(x, g - 8, o.w || 26, 8, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(x + 4, g - 7, (o.w || 26) - 8, 2);
    }
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  let accumHud = 0;

  function frame(now) {
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(raw, 0.05);

    if (S.playing) step(dt);
    draw(now);

    accumHud += raw;
    if (accumHud > 0.12) {
      accumHud = 0;
      updateHud();
    }
    requestAnimationFrame(frame);
  }

  function sectionName() {
    const p = (S.t % 60) / 60;
    if (p < 0.14) return 'intro';
    if (p < 0.34) return 'build';
    if (p < 0.66) return 'drop';
    if (p < 0.84) return 'variation';
    return 'outro';
  }

  function updateHud() {
    if (hud.seed) hud.seed.textContent = S.seed;
    if (hud.bpm) hud.bpm.textContent = S.bpm;
    if (hud.objs) hud.objs.textContent = S.placed;
    if (hud.sec) hud.sec.textContent = sectionName();
    if (hud.mode) hud.mode.textContent = S.decorated ? 'full decorated' : 'layout';
    if (hud.pct) hud.pct.textContent = Math.round(((S.t * 1.4) % 100)) + '%';
  }

  /* ---------- controls ---------- */
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      S.playing = !S.playing;
      btnPlay.classList.toggle('act', S.playing);
      btnPlay.querySelector('.lbl').textContent = S.playing ? 'Pause' : 'Play';
      btnPlay.querySelector('use').setAttribute('href', S.playing ? '#ic-pause' : '#ic-play');
    });
  }
  if (btnReroll) {
    btnReroll.addEventListener('click', () => {
      S.seed = Math.floor(Math.random() * 9000) + 1000;
      S.bpm = [140, 150, 155, 160, 170, 174, 180, 190][Math.floor(Math.random() * 8)];
      rebuild();
      updateHud();
      if (!S.playing) {
        S.playing = true;
        btnPlay.classList.add('act');
        btnPlay.querySelector('.lbl').textContent = 'Pause';
        btnPlay.querySelector('use').setAttribute('href', '#ic-pause');
      }
    });
  }
  modeBtns.forEach(b => {
    b.addEventListener('click', () => {
      modeBtns.forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      S.decorated = b.dataset.mode === 'decorated';
      updateHud();
    });
  });

  addEventListener('resize', () => { resize(); });
  resize();
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    S.playing = false;
    if (btnPlay) {
      btnPlay.classList.remove('act');
      btnPlay.querySelector('.lbl').textContent = 'Play';
      btnPlay.querySelector('use').setAttribute('href', '#ic-play');
    }
  }
  requestAnimationFrame(frame);
})();
