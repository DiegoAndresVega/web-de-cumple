/* ============================================================================
 * CHARCA PANIC — mini-arcade acuático para FinkaFarm
 * ----------------------------------------------------------------------------
 * Juego independiente que se monta como capa a pantalla completa sobre la
 * granja. Controlas un renacuajo que nada por una charca peligrosa invadida
 * por escarabajos buceadores: esquiva, recoge comida y burbujas de oxígeno y
 * llega a la zona segura de cada nivel.
 *
 * Se invoca con `CharcaPanic.abrir(callbackAlCerrar)`. Es autocontenido: crea
 * su propio <canvas>, su bucle RAF, sus controles (teclado + táctil) y, al
 * salir, lo desmonta todo y devuelve el control a la granja.
 *
 * Resolución interna fija 960×540 (16:9), escalada por CSS. Nada de esto vive
 * en window.Granja: el juego no toca el motor de la finca.
 * ========================================================================== */
(function () {
  "use strict";

  const ANCHO = 960, ALTO = 540;
  const MEJOR_KEY = "charca-panic-mejor";

  // Zona jugable vertical (deja sitio al HUD arriba y a los dedos abajo).
  const Y_MIN = 46, Y_MAX = 512;

  // ── física del renacuajo ────────────────────────────────────────────────
  const VEL_MAX = 205;        // px/s de crucero
  const RESP = 7.5;           // respuesta del nado (inercia): mayor = más ágil
  const BOOST_MULT = 2.5;     // multiplicador de velocidad durante el impulso
  const BOOST_DUR = 0.26;     // duración del impulso (s)
  const BOOST_CD = 2.0;       // recarga del impulso (s)
  const R_JUG = 11;           // radio de colisión del renacuajo

  // ── niveles ───────────────────────────────────────────────────────────────
  // Cada nivel se genera con una semilla fija para que el reparto sea estable.
  // Los 4 primeros son niveles de recolección; el 5º es la arena del jefe.
  const NIVELES = [
    { nombre: "La orilla tranquila", ancho: 1900, drenaje: 3.2, semilla: 101,
      comida: 16, comidaG: 2, burbujas: 9, dorada: 1, corazon: 0,
      rocas: 5, plantas: 12, corrientes: 0,
      enemigos: [{ modo: "patrulla", n: 3, vel: 48 }] },
    { nombre: "El jardín de algas", ancho: 2200, drenaje: 4.0, semilla: 202,
      comida: 18, comidaG: 3, burbujas: 8, dorada: 1, corazon: 0,
      rocas: 7, plantas: 22, corrientes: 0,
      enemigos: [{ modo: "patrulla", n: 4, vel: 58 }, { modo: "perseguidor", n: 1, vel: 70 }] },
    { nombre: "El fondo fangoso", ancho: 2400, drenaje: 4.6, semilla: 303,
      comida: 20, comidaG: 3, burbujas: 7, dorada: 2, corazon: 1,
      rocas: 9, plantas: 16, corrientes: 0, lodo: 4,
      enemigos: [{ modo: "patrulla", n: 4, vel: 62 }, { modo: "perseguidor", n: 1, vel: 76 }, { modo: "larva", n: 3 }] },
    { nombre: "Las corrientes profundas", ancho: 2600, drenaje: 5.2, semilla: 404,
      comida: 20, comidaG: 4, burbujas: 9, dorada: 2, corazon: 1,
      rocas: 8, plantas: 14, corrientes: 4,
      enemigos: [{ modo: "patrulla", n: 3, vel: 64 }, { modo: "perseguidor", n: 2, vel: 80 }, { modo: "rapido", n: 3, vel: 320 }] },
    // Arena cerrada para el duelo final: sin scroll, rocas alrededor, sólo el jefe.
    { nombre: "La guarida del escarabajo", ancho: ANCHO, drenaje: 4.4, semilla: 505,
      arena: true, jefe: true, plantas: 7 },
  ];

  // ── progresión / metamorfosis ──────────────────────────────────────────────
  // El renacuajo empieza con branquias (sin oxígeno). Al juntar PRESAS_PATAS
  // presas le crecen las patas y a partir de ahí necesita oxígeno (burbujas).
  const PRESAS_PATAS = 34;     // presas acumuladas para que le salgan las patas
  const PRESA_COMIDA = 1;      // cuánto suma cada larva pequeña al contador
  const PRESA_COMIDAG = 2;     // cuánto suma cada presa grande

  // Puntuación con cifras "de charca": pequeñas y comprensibles.
  const PUNTOS = {
    comida: 5, comidaG: 15, dorada: 40, burbuja: 5, meta: 60,
    porCorazon: 25, sinDanio: 100, todaComida: 80, golpeJefe: 50, jefe: 300,
  };

  // ── estado del módulo ─────────────────────────────────────────────────────
  let overlay, canvas, ctx, joyEl, joyKnob, btnBoostEl;
  let raf = 0, ultimo = 0, montado = false, onCerrar = null, alGanar = null;
  // titulo | briefing | controles | jugar | pausa | evolucion | nivelcompleto | gameover | victoria | finalrana
  let estado = "titulo";
  let nivelIdx = 0;
  let mundo = null, jugador = null;
  let puntos = 0, mejor = 0, resumen = null;
  let particulas = [], salpicaduras = [], disparos = [], estrellas = [];
  let tiempo = 0;

  // Progresión global (persiste entre niveles de una misma partida).
  let presasTotal = 0;     // presas acumuladas de cara a la metamorfosis
  let anim = null;         // animación bloqueante (evolucion / finalrana)
  let leyenda = null;      // { txt, t } aviso flotante temporal
  let sacudidaT = 0;       // temblor de cámara (golpe del jefe)

  const teclas = new Set();
  let boostPedido = false;
  const joy = { activo: false, dx: 0, dy: 0, id: null, cx: 0, cy: 0 };
  let boostTactil = false;
  let botones = []; // hit-rects de la pantalla actual

  const esMovil = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const esVertical = () => window.innerHeight > window.innerWidth;

  // ── utilidades ─────────────────────────────────────────────────────────────
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };

  /* ========================================================================
   * MONTAJE / DESMONTAJE
   * ====================================================================== */
  function abrir(cb, opts) {
    if (montado) return;
    montado = true;
    onCerrar = typeof cb === "function" ? cb : null;
    alGanar = opts && typeof opts.alGanar === "function" ? opts.alGanar : null;
    mejor = parseInt(localStorage.getItem(MEJOR_KEY) || "0", 10) || 0;

    overlay = document.createElement("div");
    overlay.id = "cp-overlay";
    overlay.innerHTML = `
      <canvas id="cp-canvas" width="${ANCHO}" height="${ALTO}"></canvas>
      <div id="cp-joy"><div id="cp-knob"></div></div>
      <button id="cp-boost">⚡</button>
      <button id="cp-salir" title="Salir">✕</button>
      <div id="cp-girar">⟳ Gira el móvil en horizontal para jugar mejor</div>`;
    const css = document.createElement("style");
    css.id = "cp-estilos";
    css.textContent = ESTILOS;
    document.head.appendChild(css);
    document.body.appendChild(overlay);

    canvas = overlay.querySelector("#cp-canvas");
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    joyEl = overlay.querySelector("#cp-joy");
    joyKnob = overlay.querySelector("#cp-knob");
    btnBoostEl = overlay.querySelector("#cp-boost");

    if (esMovil) { joyEl.style.display = "block"; btnBoostEl.style.display = "flex"; }

    conectarEntrada();
    estado = "titulo";
    ultimo = 0;
    raf = requestAnimationFrame(loop);
  }

  function cerrar() {
    if (!montado) return;
    montado = false;
    cancelAnimationFrame(raf);
    desconectarEntrada();
    if (overlay) overlay.remove();
    const s = document.getElementById("cp-estilos"); if (s) s.remove();
    overlay = canvas = ctx = null;
    teclas.clear();
    alGanar = null;
    if (onCerrar) { const f = onCerrar; onCerrar = null; f(); }
  }

  /* ========================================================================
   * ENTRADA (teclado, ratón/táctil, joystick, botón de boost)
   * ====================================================================== */
  function conectarEntrada() {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    canvas.addEventListener("pointerdown", onPunteroCanvas);
    overlay.querySelector("#cp-salir").addEventListener("click", confirmarSalida);
    joyEl.addEventListener("pointerdown", joyDown);
    joyEl.addEventListener("pointermove", joyMove);
    joyEl.addEventListener("pointerup", joyUp);
    joyEl.addEventListener("pointercancel", joyUp);
    btnBoostEl.addEventListener("pointerdown", (e) => { e.preventDefault();
      if (estado === "jugar" && mundo && mundo.cfg.arena) { disparar(); return; }
      boostTactil = true; boostPedido = true; });
    const fin = () => { boostTactil = false; };
    btnBoostEl.addEventListener("pointerup", fin);
    btnBoostEl.addEventListener("pointercancel", fin);
  }
  function desconectarEntrada() {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
  }
  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    teclas.add(k);
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "p"].includes(k)) e.preventDefault();
    e.stopPropagation();
    if (k === " ") { if (estado === "jugar" && mundo && mundo.cfg.arena) disparar(); else boostPedido = true; }
    if (k === "p" || k === "escape") togglePausa();
    if (k === "enter" || k === " ") accionPantalla();
  }
  function onKeyUp(e) { teclas.delete(e.key.toLowerCase()); e.stopPropagation(); }

  // Pulsar Enter/Espacio según pantalla (avanzar, reintentar, etc.)
  function accionPantalla() {
    if (estado === "titulo") estado = "briefing";
    else if (estado === "briefing") empezarPartida();
    else if (estado === "controles") estado = "titulo";
    else if (estado === "nivelcompleto") siguienteNivel();
    else if (estado === "gameover" || estado === "victoria") estado = "titulo";
  }

  function coordsCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * ANCHO, (e.clientY - r.top) / r.height * ALTO];
  }
  function onPunteroCanvas(e) {
    const [x, y] = coordsCanvas(e);
    for (const b of botones) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.accion(); return; }
    }
  }

  function joyDown(e) {
    e.preventDefault();
    const r = joyEl.getBoundingClientRect();
    joy.activo = true; joy.id = e.pointerId;
    joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2;
    joyMove(e);
  }
  function joyMove(e) {
    if (!joy.activo || e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
    const max = 48, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    joy.dx = dx / max; joy.dy = dy / max;
    joyKnob.style.transform = `translate(${dx - 23}px, ${dy - 23}px)`;
  }
  function joyUp(e) {
    if (e.pointerId !== joy.id) return;
    joy.activo = false; joy.dx = joy.dy = 0;
    joyKnob.style.transform = "translate(-23px, -23px)";
  }

  function togglePausa() {
    if (estado === "jugar") estado = "pausa";
    else if (estado === "pausa") estado = "jugar";
  }
  function confirmarSalida() {
    if (estado === "jugar") { estado = "pausa"; return; }
    cerrar();
  }

  /* ========================================================================
   * GENERACIÓN DE NIVEL
   * ====================================================================== */
  function empezarPartida() {
    puntos = 0;
    presasTotal = 0;
    nivelIdx = 0;
    anim = null; leyenda = null;
    cargarNivel(0, true);
    estado = "jugar";
  }
  function siguienteNivel() {
    nivelIdx++;
    if (nivelIdx >= NIVELES.length) { ganarPartida(); return; }
    cargarNivel(nivelIdx, false);
    estado = "jugar";
  }
  function guardarMejor() {
    if (puntos > mejor) { mejor = puntos; try { localStorage.setItem(MEJOR_KEY, String(mejor)); } catch (e) {} }
  }
  // Fin victorioso: registra mejor marca y avisa a la granja (ranking).
  function ganarPartida() {
    estado = "victoria";
    guardarMejor();
    if (alGanar) { try { alGanar(puntos); } catch (e) {} }
  }

  function cargarNivel(idx, reinicioVidas) {
    const cfg = NIVELES[idx];
    const rnd = mulberry32(cfg.semilla);
    const W = cfg.ancho;

    if (reinicioVidas || !jugador) {
      jugador = { x: 90, y: ALTO / 2, vx: 0, vy: 0, mirando: 1, vidas: 3,
        oxigeno: 100, invuln: 0, boostT: 0, boostCd: 0, animT: 0, danioFlash: 0,
        tienePatas: false, dispCd: 0 };
      presasTotal = 0;
    } else {
      jugador.x = 90; jugador.y = ALTO / 2; jugador.vx = jugador.vy = 0;
      jugador.invuln = 0; jugador.boostT = 0; jugador.boostCd = 0; jugador.dispCd = 0;
      jugador.oxigeno = Math.min(100, jugador.oxigeno + 35);
    }
    // Sin patas no se puede llegar al duelo: si toca, fuerza la metamorfosis ya.
    if (cfg.arena && !jugador.tienePatas) jugador.tienePatas = true;

    disparos = []; estrellas = [];

    if (cfg.arena) { mundo = generarArena(cfg, rnd); }
    else { mundo = generarNivel(cfg, rnd, W); }

    resumen = null;
    particulas = []; salpicaduras = [];
    for (let i = 0; i < 60; i++) particulas.push(nuevaParticula(true));
  }

  // Nivel de recolección normal con scroll horizontal.
  function generarNivel(cfg, rnd, W) {
    const rocas = [];
    for (let i = 0; i < cfg.rocas; i++) {
      rocas.push({ x: 220 + rnd() * (W - 420), y: Y_MIN + 30 + rnd() * (Y_MAX - Y_MIN - 60),
        r: 20 + rnd() * 26, sem: (rnd() * 1000) | 0 });
    }
    const plantas = [];
    for (let i = 0; i < cfg.plantas; i++) {
      const arriba = rnd() < 0.35;
      plantas.push({ x: 160 + rnd() * (W - 260), base: arriba ? Y_MIN : Y_MAX,
        arriba, alto: 50 + rnd() * 90, sem: rnd() * 6.28, ancho: 10 + rnd() * 8 });
    }
    const lodo = [];
    for (let i = 0; i < (cfg.lodo || 0); i++) {
      lodo.push({ x: 300 + rnd() * (W - 500), y: Y_MAX - 70, w: 120 + rnd() * 120, h: 90 });
    }
    const corrientes = [];
    for (let i = 0; i < (cfg.corrientes || 0); i++) {
      const vert = rnd() < 0.4;
      corrientes.push({ x: 300 + rnd() * (W - 500), y: Y_MIN + rnd() * (Y_MAX - Y_MIN - 120),
        w: vert ? 120 : 180, h: vert ? 150 : 100,
        fx: vert ? 0 : (rnd() < 0.5 ? -1 : 1) * 70, fy: vert ? (rnd() < 0.5 ? -1 : 1) * 70 : 0 });
    }

    // objetos recogibles, repartidos por el avance
    const items = [];
    const ponItem = (tipo, n, margenIni) => {
      for (let i = 0; i < n; i++) {
        items.push({ tipo, x: (margenIni || 180) + rnd() * (W - (margenIni || 180) - 200),
          y: Y_MIN + 25 + rnd() * (Y_MAX - Y_MIN - 50), vivo: true, fase: rnd() * 6.28 });
      }
    };
    ponItem("comida", cfg.comida);
    ponItem("comidaG", cfg.comidaG);
    // Las burbujas de oxígeno sólo aparecen una vez que tiene patas (necesita aire).
    if (jugador.tienePatas) ponItem("burbuja", cfg.burbujas);
    ponItem("dorada", cfg.dorada, 600);
    if (cfg.corazon) ponItem("corazon", cfg.corazon, 700);
    const comidaTotal = cfg.comida + cfg.comidaG;

    // enemigos
    const enemigos = [];
    for (const grupo of (cfg.enemigos || [])) {
      for (let i = 0; i < grupo.n; i++) {
        const ex = 320 + rnd() * (W - 560);
        const ey = Y_MIN + 30 + rnd() * (Y_MAX - Y_MIN - 60);
        if (grupo.modo === "patrulla") {
          const horiz = rnd() < 0.6;
          enemigos.push({ modo: "patrulla", x: ex, y: ey, vel: grupo.vel,
            dx: horiz ? 1 : 0, dy: horiz ? 0 : 1, a: horiz ? ex - 90 : ey - 80,
            b: horiz ? ex + 90 : ey + 80, horiz, r: 15, fase: rnd() * 6.28 });
        } else if (grupo.modo === "perseguidor") {
          enemigos.push({ modo: "perseguidor", x: ex, y: ey, vel: grupo.vel,
            baseX: ex, baseY: ey, dx: 1, persiguiendo: false, r: 16, fase: rnd() * 6.28 });
        } else if (grupo.modo === "rapido") {
          enemigos.push({ modo: "rapido", x: ex, y: ey, vel: grupo.vel,
            dir: rnd() < 0.5 ? 1 : -1, espera: rnd() * 2, r: 14, fase: rnd() * 6.28 });
        } else if (grupo.modo === "larva") {
          enemigos.push({ modo: "larva", x: ex, y: Y_MAX - 26, baseX: ex, baseY: Y_MAX - 26,
            estado: "espera", t: 0, vel: 240, r: 12, fase: rnd() * 6.28 });
        }
      }
    }

    return { cfg, W, rocas, plantas, lodo, corrientes, items, enemigos, jefe: null,
      comidaTotal, comidaCogida: 0, sinDanio: true, camX: 0,
      metaX: W - 80, completado: false, tApertura: 0 };
  }

  // Arena cerrada del jefe: rocas formando muros, sin scroll, sólo el escarabajo.
  function generarArena(cfg, rnd) {
    const W = ANCHO;
    const rocas = [];
    // muro perimetral de rocas (arriba, abajo, izquierda, derecha)
    const pushRoca = (x, y, r) => rocas.push({ x, y, r, sem: (rnd() * 1000) | 0, muro: true });
    for (let x = 40; x <= W - 40; x += 92) { pushRoca(x, Y_MIN + 18, 34); pushRoca(x, Y_MAX - 18, 34); }
    for (let y = Y_MIN + 70; y <= Y_MAX - 70; y += 92) { pushRoca(48, y, 34); pushRoca(W - 48, y, 34); }
    const plantas = [];
    for (let i = 0; i < cfg.plantas; i++) {
      const arriba = rnd() < 0.5;
      plantas.push({ x: 120 + rnd() * (W - 240), base: arriba ? Y_MIN + 30 : Y_MAX - 30,
        arriba, alto: 40 + rnd() * 60, sem: rnd() * 6.28, ancho: 9 + rnd() * 7 });
    }
    const jefe = { x: W - 200, y: ALTO / 2, vx: 0, vy: 0, r: 44, estado: "acecho",
      t: 1.6, vida: 9, vidaMax: 9, cargaX: -1, cargaY: 0, aturdido: 0, swirl: 0, hitFlash: 0 };
    // límites internos del recinto (dentro del muro de rocas)
    const arena = { x0: 86, x1: W - 86, y0: Y_MIN + 50, y1: Y_MAX - 50 };
    return { cfg, W, rocas, plantas, lodo: [], corrientes: [], items: [], enemigos: [], jefe,
      arena, comidaTotal: 0, comidaCogida: 0, sinDanio: true, camX: 0,
      metaX: W + 9999, completado: false, tApertura: 0 };
  }

  function nuevaParticula(inicial) {
    return { x: (mundo ? mundo.camX : 0) + Math.random() * ANCHO,
      y: inicial ? Math.random() * ALTO : ALTO + 10,
      r: 0.6 + Math.random() * 1.8, vel: 8 + Math.random() * 22, fase: Math.random() * 6.28 };
  }

  /* ========================================================================
   * BUCLE
   * ====================================================================== */
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!ultimo) ultimo = t;
    const dt = Math.max(0, Math.min(0.05, (t - ultimo) / 1000));
    ultimo = t;
    tiempo += dt;
    if (estado === "jugar") actualizar(dt);
    else if (estado === "evolucion" || estado === "finalrana") actualizarAnim(dt);
    dibujar(dt, tiempo);
  }

  function actualizar(dt) {
    const j = jugador, m = mundo;
    j.animT += dt;

    // ── lectura de entrada ──
    let ix = 0, iy = 0;
    if (teclas.has("a") || teclas.has("arrowleft")) ix -= 1;
    if (teclas.has("d") || teclas.has("arrowright")) ix += 1;
    if (teclas.has("w") || teclas.has("arrowup")) iy -= 1;
    if (teclas.has("s") || teclas.has("arrowdown")) iy += 1;
    if (joy.activo) { ix = joy.dx; iy = joy.dy; }
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    // ── impulso ──
    j.boostCd = Math.max(0, j.boostCd - dt);
    j.boostT = Math.max(0, j.boostT - dt);
    if (boostPedido && j.boostCd <= 0 && j.boostT <= 0 && (len > 0.05)) {
      j.boostT = BOOST_DUR; j.boostCd = BOOST_CD;
      crearSalpicadura(j.x, j.y);
    }
    boostPedido = false;
    const enBoost = j.boostT > 0;
    const vmax = VEL_MAX * (enBoost ? BOOST_MULT : 1);
    const resp = RESP * (enBoost ? 1.6 : 1);

    // lodo ralentiza
    let factor = 1;
    for (const l of m.lodo) {
      if (j.x > l.x && j.x < l.x + l.w && j.y > l.y && j.y < l.y + l.h) { factor = 0.5; break; }
    }

    // ── velocidad con inercia ──
    j.vx += (ix * vmax * factor - j.vx) * Math.min(1, resp * dt);
    j.vy += (iy * vmax * factor - j.vy) * Math.min(1, resp * dt);

    // corrientes empujan
    for (const c of m.corrientes) {
      if (j.x > c.x && j.x < c.x + c.w && j.y > c.y && j.y < c.y + c.h) { j.vx += c.fx * dt; j.vy += c.fy * dt; }
    }

    j.x += j.vx * dt; j.y += j.vy * dt;
    if (Math.abs(j.vx) > 6) j.mirando = j.vx > 0 ? 1 : -1;

    // límites del mundo
    j.x = clamp(j.x, R_JUG, m.W - R_JUG);
    j.y = clamp(j.y, Y_MIN + R_JUG, Y_MAX - R_JUG);

    // rocas sólidas (empuje fuera)
    for (const r of m.rocas) {
      const dd = dist2(j.x, j.y, r.x, r.y), min = r.r + R_JUG;
      if (dd < min * min) {
        const d = Math.sqrt(dd) || 0.01, nx = (j.x - r.x) / d, ny = (j.y - r.y) / d;
        j.x = r.x + nx * min; j.y = r.y + ny * min;
        const dot = j.vx * nx + j.vy * ny;
        if (dot < 0) { j.vx -= dot * nx; j.vy -= dot * ny; }
      }
    }

    // ── oxígeno (sólo cuando ya tiene patas; antes respira por branquias) ──
    if (j.tienePatas) {
      j.oxigeno -= m.cfg.drenaje * dt;
      if (j.oxigeno <= 0) { j.oxigeno = 55; perderVida(); }
    }

    j.invuln = Math.max(0, j.invuln - dt);
    j.danioFlash = Math.max(0, j.danioFlash - dt);
    j.dispCd = Math.max(0, j.dispCd - dt);

    // ── recogibles ──
    for (const it of m.items) {
      if (!it.vivo) continue;
      it.fase += dt;
      const rr = it.tipo === "comida" ? 14 : 17;
      if (dist2(j.x, j.y, it.x, it.y) < (rr + R_JUG) * (rr + R_JUG)) {
        it.vivo = false;
        recoger(it.tipo);
      }
    }

    // ── enemigos ──
    actualizarEnemigos(dt);
    if (m.jefe) actualizarJefe(dt);
    actualizarDisparos(dt);
    if (leyenda) { leyenda.t -= dt; if (leyenda.t <= 0) leyenda = null; }

    // ── meta (en la arena del jefe no hay meta: se gana derrotándolo) ──
    if (!m.cfg.arena && j.x > m.metaX) completarNivel();

    // ── cámara ──
    m.camX = clamp(j.x - ANCHO * 0.4, 0, Math.max(0, m.W - ANCHO));

    // ── partículas ──
    for (const p of particulas) {
      p.y -= p.vel * dt; p.x += Math.sin(tiempo + p.fase) * 6 * dt;
      if (p.y < -10) { p.x = m.camX + Math.random() * ANCHO; p.y = ALTO + 8; }
    }
    for (let i = salpicaduras.length - 1; i >= 0; i--) {
      const s = salpicaduras[i]; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt;
      if (s.t > s.vida) salpicaduras.splice(i, 1);
    }
  }

  function recoger(tipo) {
    const j = jugador, m = mundo;
    if (tipo === "comida") { puntos += PUNTOS.comida; m.comidaCogida++; presasTotal += PRESA_COMIDA; }
    else if (tipo === "comidaG") { puntos += PUNTOS.comidaG; m.comidaCogida++; presasTotal += PRESA_COMIDAG; }
    else if (tipo === "dorada") { puntos += PUNTOS.dorada; }
    else if (tipo === "burbuja") { j.oxigeno = Math.min(100, j.oxigeno + 22); puntos += PUNTOS.burbuja; }
    else if (tipo === "corazon") { if (j.vidas < 3) j.vidas++; else puntos += 30; }
    // ¿Suficientes presas para la metamorfosis?
    if (!j.tienePatas && (tipo === "comida" || tipo === "comidaG") && presasTotal >= PRESAS_PATAS)
      iniciarEvolucion();
  }

  function perderVida() {
    const j = jugador;
    if (j.invuln > 0) return;
    j.vidas--; j.invuln = 1.6; j.danioFlash = 0.35; mundo.sinDanio = false;
    crearSalpicadura(j.x, j.y);
    if (j.vidas <= 0) { estado = "gameover"; guardarMejor(); }
  }
  function golpeEnemigo(ex, ey) {
    const j = jugador;
    if (j.invuln > 0) return;
    // retroceso
    const d = Math.hypot(j.x - ex, j.y - ey) || 1;
    j.vx = (j.x - ex) / d * 280; j.vy = (j.y - ey) / d * 280;
    perderVida();
  }

  function actualizarEnemigos(dt) {
    const j = jugador, m = mundo;
    for (const e of m.enemigos) {
      e.fase += dt;
      if (e.modo === "patrulla") {
        if (e._d === undefined) e._d = 1;
        const pos = e.horiz ? e.x : e.y;
        let v = pos + e.vel * dt * e._d;
        if (v < e.a) { v = e.a; e._d = 1; } else if (v > e.b) { v = e.b; e._d = -1; }
        if (e.horiz) e.x = v; else e.y = v;
        e.dx = e.horiz ? e._d : 1;
      } else if (e.modo === "perseguidor") {
        const d = Math.hypot(j.x - e.x, j.y - e.y);
        if (d < 190) e.persiguiendo = true;
        else if (d > 320) e.persiguiendo = false;
        if (e.persiguiendo) {
          const nx = (j.x - e.x) / (d || 1), ny = (j.y - e.y) / (d || 1);
          e.x += nx * e.vel * dt; e.y += ny * e.vel * dt; e.dx = nx >= 0 ? 1 : -1;
        } else {
          // vuelve flotando a su base
          e.x += (e.baseX - e.x) * Math.min(1, dt); e.y += (e.baseY - e.y) * Math.min(1, dt);
          e.y += Math.sin(e.fase) * 10 * dt;
        }
      } else if (e.modo === "rapido") {
        e.espera -= dt;
        if (e.espera <= 0) { e.x += e.dir * e.vel * dt; }
        if (e.x < -30) { e.x = m.W + 20; e.dir = -1; e.espera = Math.random() * 1.5; e.y = Y_MIN + 30 + Math.random() * (Y_MAX - Y_MIN - 60); }
        if (e.x > m.W + 30) { e.x = -20; e.dir = 1; e.espera = Math.random() * 1.5; e.y = Y_MIN + 30 + Math.random() * (Y_MAX - Y_MIN - 60); }
      } else if (e.modo === "larva") {
        const d = Math.hypot(j.x - e.x, j.y - e.y);
        if (e.estado === "espera") {
          if (d < 95) { e.estado = "ataca"; e.t = 0;
            const dd = Math.hypot(j.x - e.x, j.y - e.y) || 1; e.ax = (j.x - e.x) / dd; e.ay = (j.y - e.y) / dd; }
        } else if (e.estado === "ataca") {
          e.t += dt; e.x += e.ax * e.vel * dt; e.y += e.ay * e.vel * dt;
          if (e.t > 0.35) e.estado = "vuelve";
        } else {
          e.x += (e.baseX - e.x) * Math.min(1, dt * 3); e.y += (e.baseY - e.y) * Math.min(1, dt * 3);
          if (Math.hypot(e.baseX - e.x, e.baseY - e.y) < 4) e.estado = "espera";
        }
      }
      if (dist2(j.x, j.y, e.x, e.y) < (e.r + R_JUG) * (e.r + R_JUG)) golpeEnemigo(e.x, e.y);
    }
  }

  // Jefe de la arena: acecha al renacuajo, embiste, se estrella contra los muros
  // de roca y queda aturdido (con remolino) ~5 s. Sólo recibe daño aturdido,
  // disparándole burbujas. Ver actualizarDisparos para el impacto.
  function actualizarJefe(dt) {
    const b = mundo.jefe, j = jugador, a = mundo.arena;
    b.hitFlash = Math.max(0, b.hitFlash - dt);
    if (b.vida <= 0) return; // derrotado: la animación final ya está en marcha

    if (b.aturdido > 0) {                 // ── aturdido: mareado, vulnerable ──
      b.aturdido -= dt; b.swirl += dt * 6;
      b.x = clamp(b.x + b.vx * dt, a.x0, a.x1); b.y = clamp(b.y + b.vy * dt, a.y0, a.y1);
      b.vx *= 0.86; b.vy *= 0.86;
      return;
    }

    const velCarga = 310 + (b.vidaMax - b.vida) * 20; // más rápido cuanto más herido
    if (b.estado === "acecho") {
      const d = Math.hypot(j.x - b.x, j.y - b.y) || 1;
      b.x = clamp(b.x + (j.x - b.x) / d * 72 * dt, a.x0, a.x1);
      b.y = clamp(b.y + (j.y - b.y) / d * 72 * dt, a.y0, a.y1);
      b.cargaX = (j.x - b.x) / d; b.cargaY = (j.y - b.y) / d;
      b.t -= dt;
      if (b.t <= 0) { b.estado = "aviso"; b.t = 0.5; } // telegrafía antes de embestir
    } else if (b.estado === "aviso") {
      b.t -= dt;
      if (b.t <= 0) {
        b.estado = "carga"; const d = Math.hypot(j.x - b.x, j.y - b.y) || 1;
        b.cargaX = (j.x - b.x) / d; b.cargaY = (j.y - b.y) / d;
      }
    } else if (b.estado === "carga") {
      b.x += b.cargaX * velCarga * dt; b.y += b.cargaY * velCarga * dt;
      if (b.x <= a.x0 || b.x >= a.x1 || b.y <= a.y0 || b.y >= a.y1) { // choca con el muro
        b.x = clamp(b.x, a.x0, a.x1); b.y = clamp(b.y, a.y0, a.y1);
        b.estado = "acecho"; b.aturdido = 5; b.swirl = 0; b.t = 1.5;
        b.vx = -b.cargaX * 150; b.vy = -b.cargaY * 150;
        crearSalpicadura(b.x, b.y); sacudida(0.4);
      }
    }
    // el contacto hace daño salvo cuando está aturdido
    if (b.aturdido <= 0 && dist2(j.x, j.y, b.x, b.y) < (b.r * 0.78 + R_JUG) * (b.r * 0.78 + R_JUG))
      golpeEnemigo(b.x, b.y);
  }

  function disparar() {
    const j = jugador;
    if (!j.tienePatas || j.dispCd > 0) return;
    j.dispCd = 0.3;
    disparos.push({ x: j.x + j.mirando * 14, y: j.y - 1, vx: j.mirando * 440, vy: 0, t: 0, vida: 1.7 });
  }

  function actualizarDisparos(dt) {
    const m = mundo, b = m.jefe;
    for (let i = disparos.length - 1; i >= 0; i--) {
      const p = disparos[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      let quita = p.t > p.vida || p.x < 0 || p.x > m.W;
      if (!quita) for (const r of m.rocas) {
        if (dist2(p.x, p.y, r.x, r.y) < (r.r + 5) * (r.r + 5)) { quita = true; break; }
      }
      if (!quita && b && b.vida > 0 && dist2(p.x, p.y, b.x, b.y) < (b.r + 6) * (b.r + 6)) {
        quita = true;
        if (b.aturdido > 0) {            // sólo le hace daño mientras está mareado
          b.vida--; b.hitFlash = 0.22; puntos += PUNTOS.golpeJefe; crearSalpicadura(p.x, p.y);
          if (b.vida <= 0) iniciarFinalRana();
        }
      }
      if (quita) disparos.splice(i, 1);
    }
  }

  function sacudida(s) { sacudidaT = Math.max(sacudidaT, s); }

  function completarNivel() {
    if (mundo.completado) return;
    mundo.completado = true;
    const j = jugador;
    const bonusMeta = PUNTOS.meta;
    const bonusOxig = Math.round(j.oxigeno * 2);
    const bonusVidas = j.vidas * PUNTOS.porCorazon;
    const bonusSinDanio = mundo.sinDanio ? PUNTOS.sinDanio : 0;
    const bonusComida = mundo.comidaCogida >= mundo.comidaTotal ? PUNTOS.todaComida : 0;
    const total = bonusMeta + bonusOxig + bonusVidas + bonusSinDanio + bonusComida;
    puntos += total;
    resumen = { bonusMeta, bonusOxig, bonusVidas, bonusSinDanio, bonusComida, total,
      comida: mundo.comidaCogida, comidaTotal: mundo.comidaTotal,
      ultimo: nivelIdx >= NIVELES.length - 1 };
    estado = "nivelcompleto";
    if (resumen.ultimo) guardarMejor();
  }

  function crearSalpicadura(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 6.28, v = 60 + Math.random() * 120;
      salpicaduras.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, vida: 0.4 + Math.random() * 0.3 });
    }
  }

  /* ========================================================================
   * METAMORFOSIS (animaciones bloqueantes estilo "evolución pokémon")
   * ====================================================================== */
  function nacenEstrellas(n) {
    estrellas = [];
    for (let i = 0; i < n; i++)
      estrellas.push({ a: i / n * 6.28, r: 26 + Math.random() * 24, vel: 1.2 + Math.random() * 1.6, fase: Math.random() * 6.28 });
  }

  function iniciarEvolucion() {
    if (jugador.tienePatas) return;
    estado = "evolucion";
    anim = { tipo: "evolucion", t: 0, dur: 3.8, hecho: false };
    jugador.vx = jugador.vy = 0;
    nacenEstrellas(14);
  }

  function iniciarFinalRana() {
    puntos += PUNTOS.jefe;
    estado = "finalrana";
    anim = { tipo: "finalrana", t: 0, dur: 4.6, hecho: false };
    jugador.vx = jugador.vy = 0; disparos = [];
    nacenEstrellas(18);
  }

  function actualizarAnim(dt) {
    if (!anim) return;
    anim.t += dt;
    for (const s of estrellas) s.a += s.vel * dt;
    if (leyenda) { leyenda.t -= dt; if (leyenda.t <= 0) leyenda = null; }
    if (anim.tipo === "evolucion") {
      if (!anim.hecho && anim.t > 1.9) {            // a mitad de animación brotan las patas
        anim.hecho = true; jugador.tienePatas = true; jugador.patasNuevas = true; brotarBurbujas();
        leyenda = { txt: "¡PATAS NUEVAS! Ahora respiras aire: atrapa BURBUJAS", t: 5 };
      }
      if (anim.t > anim.dur) { estado = "jugar"; anim = null; jugador.patasNuevas = false; }
    } else if (anim.tipo === "finalrana") {
      if (anim.t > anim.dur) { anim = null; ganarPartida(); }
    }
  }

  // Al ganar patas brotan burbujas de oxígeno por delante del renacuajo.
  function brotarBurbujas() {
    const m = mundo, n = (m.cfg.burbujas || 8) + 2;
    const desde = Math.max(140, jugador.x + 60);
    for (let i = 0; i < n; i++) {
      m.items.push({ tipo: "burbuja", vivo: true, fase: Math.random() * 6.28,
        x: desde + Math.random() * Math.max(200, m.W - desde - 160),
        y: Y_MIN + 25 + Math.random() * (Y_MAX - Y_MIN - 50) });
    }
  }

  /* ========================================================================
   * RENDER
   * ====================================================================== */
  function dibujar(dt, t) {
    botones = [];
    sacudidaT = Math.max(0, sacudidaT - dt * 2.2);
    if (estado === "titulo") { dibujarFondo(t, 0); pantallaTitulo(t); return; }
    if (estado === "controles") { dibujarFondo(t, 0); pantallaControles(); return; }
    if (estado === "briefing") { dibujarFondo(t, 0); pantallaBriefing(t); return; }

    const cam = mundo ? mundo.camX : 0;
    dibujarFondo(t, cam);
    if (mundo) dibujarMundo(t, cam);
    dibujarHUD();
    if (leyenda) dibujarLeyenda();

    if (estado === "evolucion") pantallaEvolucion(t, cam);
    else if (estado === "finalrana") pantallaFinalRana(t, cam);
    else if (estado === "pausa") capaModal("PAUSA", ["Continuar (P)", "Reiniciar nivel", "Salir al título"],
      [() => togglePausa(), () => { cargarNivel(nivelIdx, false); estado = "jugar"; }, () => { estado = "titulo"; }]);
    else if (estado === "nivelcompleto") pantallaResumen();
    else if (estado === "gameover") pantallaFin("GAME OVER", "#ff8a7a",
      ["Reintentar nivel", "Volver al título"], [() => { cargarNivel(nivelIdx, true); estado = "jugar"; }, () => estado = "titulo"]);
    else if (estado === "victoria") pantallaVictoria();

    if (esVertical() && esMovil) document.getElementById("cp-girar").style.display = "block";
    else { const g = document.getElementById("cp-girar"); if (g) g.style.display = "none"; }
  }

  // ── fondo acuático ──
  function dibujarFondo(t, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, ALTO);
    g.addColorStop(0, "#2e8aa0"); g.addColorStop(0.5, "#1c6a82"); g.addColorStop(1, "#0c3a4d");
    ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);
    // rayos de luz
    ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = "#dffaff";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 220 - cam * 0.3) % (ANCHO + 300)) - 100 + Math.sin(t * 0.2 + i) * 14;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 170, ALTO); ctx.lineTo(x + 40, ALTO); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // partículas
    if (estado === "jugar" || estado === "pausa") {
      ctx.fillStyle = "rgba(220,250,255,0.35)";
      for (const p of particulas) { ctx.beginPath(); ctx.arc(p.x - cam, p.y, p.r, 0, 6.28); ctx.fill(); }
    }
  }

  function dibujarMundo(t, cam) {
    ctx.save();
    const sk = sacudidaT > 0 ? sacudidaT * 14 : 0;
    ctx.translate(-cam + (sk ? (Math.random() - 0.5) * sk : 0), sk ? (Math.random() - 0.5) * sk : 0);
    const m = mundo;

    // plantas (detrás)
    for (const pl of m.plantas) dibujarPlanta(pl, t);
    // corrientes
    for (const c of m.corrientes) dibujarCorriente(c, t);
    // lodo
    for (const l of m.lodo) dibujarLodo(l);
    // meta (no en la arena)
    if (!m.cfg.arena) dibujarMeta(t);
    // rocas
    for (const r of m.rocas) dibujarRoca(r);
    // recogibles
    for (const it of m.items) if (it.vivo) dibujarItem(it, t);
    // enemigos
    for (const e of m.enemigos) dibujarEscarabajo(e, t);
    if (m.jefe) dibujarJefe(m.jefe, t);
    // disparos de burbuja
    for (const p of disparos) dibujarDisparo(p, t);
    // jugador
    dibujarRenacuajo(jugador, t);
    // salpicaduras
    ctx.fillStyle = "rgba(220,250,255,0.7)";
    for (const s of salpicaduras) { ctx.globalAlpha = Math.max(0, 1 - s.t / s.vida); ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, 6.28); ctx.fill(); }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function dibujarDisparo(p, t) {
    ctx.strokeStyle = "rgba(200,245,255,0.9)"; ctx.fillStyle = "rgba(150,220,255,0.4)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 6.28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 2, 0, 6.28); ctx.fill();
    // estelita
    ctx.strokeStyle = "rgba(200,245,255,0.35)";
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.sign(p.vx) * 12, p.y); ctx.stroke();
  }

  function dibujarPlanta(pl, t) {
    const seg = 6, balanceo = Math.sin(t * 1.2 + pl.sem) * 10;
    ctx.strokeStyle = "#1f7a4d"; ctx.lineWidth = pl.ancho; ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= seg; i++) {
      const f = i / seg;
      const x = pl.x + Math.sin(f * 3 + t + pl.sem) * balanceo * f;
      const y = pl.arriba ? pl.base + pl.alto * f : pl.base - pl.alto * f;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#2aa066"; ctx.lineWidth = pl.ancho * 0.45; ctx.stroke();
  }

  function dibujarCorriente(c, t) {
    ctx.save();
    ctx.fillStyle = "rgba(180,235,255,0.10)";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = "rgba(220,250,255,0.5)"; ctx.lineWidth = 2;
    const horiz = c.fx !== 0;
    for (let i = 0; i < 6; i++) {
      const off = (t * 90 * Math.sign(horiz ? c.fx : c.fy) + i * 40) % (horiz ? c.w : c.h);
      ctx.beginPath();
      if (horiz) { const x = c.x + (off + c.w) % c.w; ctx.moveTo(x, c.y + 12 + i * 14); ctx.lineTo(x + 22 * Math.sign(c.fx), c.y + 12 + i * 14); }
      else { const y = c.y + (off + c.h) % c.h; ctx.moveTo(c.x + 12 + i * 18, y); ctx.lineTo(c.x + 12 + i * 18, y + 22 * Math.sign(c.fy)); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function dibujarLodo(l) {
    ctx.fillStyle = "#5a4326";
    ctx.beginPath();
    ctx.moveTo(l.x, l.y + l.h);
    ctx.lineTo(l.x, l.y + 16);
    for (let i = 0; i <= 8; i++) ctx.lineTo(l.x + l.w * i / 8, l.y + 8 + Math.sin(i * 1.5 + l.x) * 8);
    ctx.lineTo(l.x + l.w, l.y + l.h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fill();
  }

  function dibujarMeta(t) {
    const m = mundo, x = m.metaX;
    const abierta = !m.jefe || m.jefe.golpes >= 3;
    const g = ctx.createRadialGradient(x + 30, ALTO / 2, 10, x + 30, ALTO / 2, 180);
    g.addColorStop(0, abierta ? "rgba(210,255,170,0.65)" : "rgba(120,160,160,0.2)");
    g.addColorStop(1, "rgba(120,255,170,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 120, 0, 260, ALTO);
    // raíces que enmarcan la salida
    ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 12; ctx.lineCap = "round";
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = ALTO / 2 + sgn * (70 + i * 26); const xx = x + 40 + Math.sin(i + t) * 14; if (i === 0) ctx.moveTo(x + 40, ALTO / 2 + sgn * 60); ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
    if (abierta) {
      ctx.fillStyle = "#dfff3c"; ctx.font = "bold 13px 'Press Start 2P', monospace"; ctx.textAlign = "center";
      ctx.fillText("META", x + 30, ALTO / 2 - 90);
    }
  }

  function dibujarRoca(r) {
    const rnd = mulberry32(r.sem + 7);
    ctx.fillStyle = r.jefe ? "#7d7468" : "#6b6258";
    ctx.beginPath();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a = i / n * 6.28; const rad = r.r * (0.82 + rnd() * 0.3);
      const x = r.x + Math.cos(a) * rad, y = r.y + Math.sin(a) * rad * 0.85;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.ellipse(r.x - r.r * 0.3, r.y - r.r * 0.3, r.r * 0.4, r.r * 0.28, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(r.x + r.r * 0.25, r.y + r.r * 0.35, r.r * 0.5, r.r * 0.3, 0, 0, 6.28); ctx.fill();
  }

  function dibujarItem(it, t) {
    const flot = Math.sin(t * 2 + it.fase) * 3;
    const x = it.x, y = it.y + flot;
    if (it.tipo === "comida") {
      ctx.fillStyle = "#8fe36a";
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 2.1) * 4, y + Math.sin(i * 2.1) * 4, 3, 0, 6.28); ctx.fill(); }
    } else if (it.tipo === "comidaG") {
      ctx.fillStyle = "#e8973a"; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#ffcf8a"; ctx.beginPath(); ctx.arc(x - 3, y - 3, 3, 0, 6.28); ctx.fill();
    } else if (it.tipo === "burbuja") {
      ctx.strokeStyle = "rgba(200,245,255,0.9)"; ctx.fillStyle = "rgba(150,220,255,0.32)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(x - 3, y - 3, 2.5, 0, 6.28); ctx.fill();
    } else if (it.tipo === "dorada") {
      const br = 9 + Math.sin(t * 4 + it.fase) * 1.5;
      ctx.fillStyle = "rgba(255,215,90,0.4)"; ctx.beginPath(); ctx.arc(x, y, br + 5, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#ffd24a"; ctx.beginPath(); ctx.arc(x, y, br, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#fff3b0"; ctx.beginPath(); ctx.arc(x - 3, y - 3, 3, 0, 6.28); ctx.fill();
    } else if (it.tipo === "corazon") {
      dibujarCorazon(x, y - 2, 9, "#e9504a");
    }
  }

  function dibujarCorazon(x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.7);
    ctx.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.5, y - s, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.5, y - s, x + s, y - s * 0.3, x, y + s * 0.7);
    ctx.fill();
  }

  function dibujarRenacuajo(j, t) {
    if (j.invuln > 0 && Math.floor(t * 12) % 2 === 0) return; // parpadeo de invulnerabilidad
    ctx.save();
    ctx.translate(j.x, j.y);
    ctx.scale(j.mirando, 1);
    const cola = Math.sin(t * 12) * (6 + Math.min(8, Math.hypot(j.vx, j.vy) / 30));
    // cola
    ctx.fillStyle = "#2f7d5b";
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-18, cola, -24, cola * 1.4);
    ctx.quadraticCurveTo(-18, cola - 3, -6, -3);
    ctx.closePath(); ctx.fill();
    // patitas traseras (sólo tras la metamorfosis); parpadean al recién salir
    if (j.tienePatas && !(j.patasNuevas && Math.floor(t * 12) % 2 === 0)) {
      ctx.strokeStyle = "#2f7d5b"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      const pat = Math.sin(t * 12) * 3;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-7, sy * 5);
        ctx.lineTo(-13, sy * 9 + pat * sy);
        ctx.lineTo(-9, sy * 13 + pat * sy);   // piecito
        ctx.stroke();
      }
    }
    // cuerpo
    ctx.fillStyle = j.danioFlash > 0 ? "#ffd2d2" : "#7fd39a";
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.ellipse(-2, -3, 6, 3.5, 0, 0, 6.28); ctx.fill();
    // ojo
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(5, -3, 3.4, 0, 6.28); ctx.fill();
    ctx.fillStyle = "#1a2a22"; ctx.beginPath(); ctx.arc(6, -3, 1.7, 0, 6.28); ctx.fill();
    ctx.restore();
    // aura de boost
    if (j.boostT > 0) {
      ctx.strokeStyle = "rgba(200,250,255,0.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(j.x, j.y, 16, 0, 6.28); ctx.stroke();
    }
  }

  // Escarabajo buceador (Dytiscidae): cuerpo oval aerodinámico con borde
  // amarillento y, sobre todo, patas traseras aplanadas en forma de remo con
  // flecos, que es lo que lo hace reconocible nadando.
  function dibujarEscarabajo(e, t) {
    if (e.modo === "larva") return dibujarLarva(e, t);
    const x = e.x, y = e.y, alerta = e.modo === "perseguidor" && e.persiguiendo;
    const dir = (e.dx !== undefined ? e.dx : (e.dir !== undefined ? e.dir : 1)) >= 0 ? 1 : -1;
    const rem = Math.sin(t * 11 + e.fase); // ciclo de remada
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);

    // ── patas traseras: grandes paletas aplanadas con flecos (las del remo) ──
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(-7, sy * 7);
      const ang = sy * (0.5 + rem * 0.45);
      ctx.rotate(ang);
      // segmento del muslo
      ctx.strokeStyle = "#14110c"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, sy * 3); ctx.stroke();
      // paleta aplanada
      ctx.translate(-9, sy * 4);
      ctx.fillStyle = alerta ? "#6a2a30" : "#23201a";
      ctx.beginPath(); ctx.ellipse(-5, 0, 11, 4.2, sy * 0.5, 0, 6.28); ctx.fill();
      // flecos de la paleta
      ctx.strokeStyle = "#14110c"; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) {
        const px = -10 + i * 5;
        ctx.beginPath(); ctx.moveTo(px, sy * 2); ctx.lineTo(px - 2, sy * 6); ctx.stroke();
      }
      ctx.restore();
    }
    // patas delanteras, pequeñas
    ctx.strokeStyle = "#14110c"; ctx.lineWidth = 2; ctx.lineCap = "round";
    for (const sy of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(7, sy * 5); ctx.lineTo(13, sy * 9 + rem * 1.5); ctx.stroke();
    }

    // ── caparazón oval con borde amarillo ──
    ctx.fillStyle = alerta ? "#7a2f1f" : "#34622f";        // verde oliva oscuro
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 11, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = alerta ? "#ffb24a" : "#c7b13a"; ctx.lineWidth = 2.4; // margen amarillento
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 10, 0, 0, 6.28); ctx.stroke();
    // costura de los élitros
    ctx.strokeStyle = "rgba(10,12,6,0.55)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(13, 0); ctx.stroke();
    // brillo del lomo
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath(); ctx.ellipse(-3, -4, 6, 3, 0, 0, 6.28); ctx.fill();

    // ── cabeza + ojos + antenas ──
    ctx.fillStyle = alerta ? "#5a2018" : "#22301a";
    ctx.beginPath(); ctx.ellipse(13, 0, 5.5, 6, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = "#14110c"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(15, -3); ctx.lineTo(22, -8); ctx.moveTo(15, 3); ctx.lineTo(22, 8); ctx.stroke();
    ctx.fillStyle = alerta ? "#ff5a5a" : "#ffcf3a";
    ctx.beginPath(); ctx.arc(15, -2.5, 2, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(15, 2.5, 2, 0, 6.28); ctx.fill();
    // burbuja de aire que cargan bajo los élitros
    ctx.fillStyle = "rgba(210,245,255,0.45)";
    ctx.beginPath(); ctx.arc(-13, 6, 2.6, 0, 6.28); ctx.fill();
    ctx.restore();
  }

  function dibujarLarva(e, t) {
    const x = e.x, y = e.y, atac = e.estado === "ataca";
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = atac ? "#d8c98a" : "#c8bd86";
    const seg = 5;
    for (let i = 0; i < seg; i++) {
      const wob = Math.sin(t * 6 + i) * 2;
      ctx.beginPath(); ctx.arc(-i * 7, wob, 6 - i * 0.6, 0, 6.28); ctx.fill();
    }
    ctx.fillStyle = "#5a2a2a"; ctx.beginPath(); ctx.arc(3, 0, 2, 0, 6.28); ctx.fill();
    if (atac) { ctx.fillStyle = "#8a2020"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.fill(); }
    ctx.restore();
  }

  function dibujarJefe(b, t) {
    const aturd = b.aturdido > 0, avisa = b.estado === "aviso";
    ctx.save(); ctx.translate(b.x, b.y);
    if (aturd && Math.floor(t * 10) % 2 === 0) ctx.globalAlpha = 0.7;
    const dir = b.cargaX >= 0 ? 1 : -1; ctx.scale(dir, 1);
    if (b.hitFlash > 0) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    const rem = Math.sin(t * (aturd ? 3 : 9));

    // patas traseras gigantes en forma de remo
    for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(-20, sy * 18);
      ctx.rotate(sy * (0.5 + rem * 0.4));
      ctx.strokeStyle = "#0d0b07"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-16, sy * 6); ctx.stroke();
      ctx.translate(-20, sy * 8);
      ctx.fillStyle = "#1c1a12";
      ctx.beginPath(); ctx.ellipse(-10, 0, 22, 8, sy * 0.5, 0, 6.28); ctx.fill();
      ctx.strokeStyle = "#0d0b07"; ctx.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) { const px = -20 + i * 7; ctx.beginPath(); ctx.moveTo(px, sy * 3); ctx.lineTo(px - 3, sy * 11); ctx.stroke(); }
      ctx.restore();
    }
    // patas delanteras
    ctx.strokeStyle = "#0d0b07"; ctx.lineWidth = 5; ctx.lineCap = "round";
    for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(20, sy * 12); ctx.lineTo(34, sy * 22 + rem * 3); ctx.stroke(); }

    // caparazón oval con borde amarillo (verde oliva como el pequeño, a lo bestia)
    const tinte = aturd ? "#3a3320" : (avisa ? "#5a2a1a" : "#2c4d22");
    ctx.fillStyle = tinte;
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 34, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = aturd ? "#9a8a3a" : "#c7b13a"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, 0, 43, 31, 0, 0, 6.28); ctx.stroke();
    ctx.strokeStyle = "rgba(8,10,5,0.6)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(38, 0); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.ellipse(-10, -12, 16, 8, 0, 0, 6.28); ctx.fill();

    // cabeza + mandíbulas
    ctx.fillStyle = aturd ? "#3a3320" : "#1f2c16";
    ctx.beginPath(); ctx.ellipse(40, 0, 14, 16, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = "#0d0b07"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(50, -8); ctx.lineTo(66, -20); ctx.moveTo(50, 8); ctx.lineTo(66, 18); ctx.stroke();
    // ojos: rojos rabioso / espirales si aturdido
    if (aturd) {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6;
      for (const ox of [38, 46]) { ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) { const rr = a * 0.7; const px = ox + Math.cos(a + b.swirl) * rr, py = -4 + Math.sin(a + b.swirl) * rr; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); }
    } else {
      ctx.fillStyle = avisa ? "#fff04a" : "#ff4040";
      ctx.beginPath(); ctx.arc(38, -4, 4, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.arc(46, -4, 4, 0, 6.28); ctx.fill();
    }
    ctx.restore();

    // ── remolino sobre la cabeza cuando está aturdido ──
    if (aturd) {
      ctx.save(); ctx.translate(b.x, b.y - 48);
      ctx.strokeStyle = "#dff6ff"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.3) { const rr = 3 + a * 1.4; const px = Math.cos(a * 1.6 + b.swirl) * rr, py = Math.sin(a * 1.6 + b.swirl) * rr * 0.5; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
      // estrellitas de mareo
      ctx.fillStyle = "#ffe34a";
      for (let i = 0; i < 3; i++) { const a = b.swirl * 1.4 + i * 2.1; estrellita(Math.cos(a) * 20, Math.sin(a) * 9, 3.4); }
      ctx.restore();
    }

    // barra de vida del jefe
    const bw = 220, bx = (ANCHO - bw) / 2 + mundo.camX;
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(bx, Y_MIN + 4, bw, 12);
    ctx.fillStyle = "#e9504a"; ctx.fillRect(bx, Y_MIN + 4, bw * clamp(b.vida / b.vidaMax, 0, 1), 12);
    ctx.strokeStyle = "#2b1c12"; ctx.lineWidth = 2; ctx.strokeRect(bx, Y_MIN + 4, bw, 12);
    texto("ESCARABAJO BUCEADOR", ANCHO / 2 + mundo.camX, Y_MIN, 8, "#ffd24a", "center");
  }

  // estrellita de 5 puntas (usada en mareo / metamorfosis)
  function estrellita(x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 === 0) ? s : s * 0.45;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  /* ========================================================================
   * HUD + PANTALLAS
   * ====================================================================== */
  function texto(str, x, y, tam, color, align) {
    ctx.fillStyle = color || "#f4ecd8";
    ctx.font = `${tam}px 'Press Start 2P', monospace`;
    ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(str, x, y);
  }

  function dibujarHUD() {
    const j = jugador, arena = mundo.cfg.arena;
    // barra superior
    ctx.fillStyle = "rgba(20,14,8,0.45)"; ctx.fillRect(0, 0, ANCHO, 38);
    // vidas
    for (let i = 0; i < 3; i++) dibujarCorazon(24 + i * 26, 19, 8, i < j.vidas ? "#e9504a" : "rgba(255,255,255,0.18)");
    const ox = 130, ow = 200;
    if (j.tienePatas) {
      // oxígeno (sólo en fase con patas)
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(ox, 13, ow, 14);
      const f = clamp(j.oxigeno / 100, 0, 1);
      const og = ctx.createLinearGradient(ox, 0, ox + ow, 0);
      og.addColorStop(0, f < 0.3 ? "#e9504a" : "#3aa0d0"); og.addColorStop(1, f < 0.3 ? "#ff8a7a" : "#9fe6ff");
      ctx.fillStyle = og; ctx.fillRect(ox, 13, ow * f, 14);
      ctx.strokeStyle = "#0c2530"; ctx.lineWidth = 2; ctx.strokeRect(ox, 13, ow, 14);
      texto("O2", ox - 4, 25, 9, "#cfeeff", "right");
    } else {
      // progreso de presas hacia las patas (branquias: sin oxígeno)
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(ox, 13, ow, 14);
      const f = clamp(presasTotal / PRESAS_PATAS, 0, 1);
      ctx.fillStyle = "#8fe36a"; ctx.fillRect(ox, 13, ow * f, 14);
      ctx.strokeStyle = "#0c2530"; ctx.lineWidth = 2; ctx.strokeRect(ox, 13, ow, 14);
      texto("PRESAS", ox - 4, 24, 7, "#cfeeff", "right");
      texto(`${Math.min(presasTotal, PRESAS_PATAS)}/${PRESAS_PATAS}`, ox + ow / 2, 24, 8, "#0c2530", "center");
    }
    // puntos + nivel (deja libre la esquina derecha para el botón ✕)
    texto("PTS " + puntos, ANCHO - 64, 17, 10, "#cbdf5a", "right");
    texto(mundo.cfg.nombre, ANCHO - 64, 32, 8, "#f4ecd8", "right");
    // acción contextual: disparar en la arena, impulso en el resto
    const bx = 360;
    if (arena) texto(esMovil ? "⚡ DISPARA" : "ESPACIO: DISPARA", bx, 25, 8, "#9fe6ff", "left");
    else texto("BOOST", bx, 25, 8, j.boostCd <= 0 ? "#cbdf5a" : "rgba(255,255,255,0.35)", "left");
    if (esMovil) btnBoostEl.style.opacity = arena ? "0.95" : (j.boostCd <= 0 ? "0.9" : "0.4");
  }

  function boton(label, x, y, w, h, accion, color) {
    ctx.fillStyle = color || "#4a3322"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#2b1c12"; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
    texto(label, x + w / 2, y + h / 2 + 5, 11, "#f4ecd8", "center");
    botones.push({ x, y, w, h, accion });
  }

  function velo() { ctx.fillStyle = "rgba(12,30,40,0.6)"; ctx.fillRect(0, 0, ANCHO, ALTO); }

  function pantallaTitulo(t) {
    velo();
    ctx.save(); ctx.translate(ANCHO / 2 + Math.sin(t) * 6, 150);
    dibujarRenacuajo({ x: 0, y: 0, vx: 40, vy: 0, mirando: 1, boostT: 0, invuln: 0, danioFlash: 0 }, t);
    ctx.restore();
    texto("CHARCA PANIC", ANCHO / 2, 240, 30, "#9fe6ff", "center");
    texto("Ayuda al renacuajo a escapar de los escarabajos", ANCHO / 2, 278, 10, "#f4ecd8", "center");
    texto("MEJOR: " + mejor, ANCHO / 2, 304, 10, "#cbdf5a", "center");
    boton(esMovil ? "TOCAR PARA JUGAR" : "JUGAR", ANCHO / 2 - 130, 330, 260, 46, () => estado = "briefing", "#3a7d4a");
    boton("CONTROLES", ANCHO / 2 - 130, 388, 260, 40, () => estado = "controles");
  }

  // Briefing inicial: qué es cada cosa, cuánto vale y el objetivo de la partida.
  function pantallaBriefing(t) {
    velo();
    texto("LA CHARCA", ANCHO / 2, 56, 20, "#9fe6ff", "center");
    texto("Eres un renacuajo con branquias: aún no necesitas aire.", ANCHO / 2, 84, 9, "#f4ecd8", "center");
    texto(`Junta ${PRESAS_PATAS} presas y te crecerán las PATAS.`, ANCHO / 2, 104, 9, "#cbdf5a", "center");

    // muestrario de assets dibujados de verdad + su valor
    const filas = [
      { tipo: "comida",  txt: "Larvas / algas — comida",        val: `+${PUNTOS.comida} · 1 presa` },
      { tipo: "comidaG", txt: "Presa grande — bien nutritiva",  val: `+${PUNTOS.comidaG} · ${PRESA_COMIDAG} presas` },
      { tipo: "dorada",  txt: "Bola dorada — tesoro raro",      val: `+${PUNTOS.dorada}` },
      { tipo: "burbuja", txt: "Burbuja de oxígeno (tras patas)", val: `+aire` },
      { tipo: "corazon", txt: "Corazón — recupera una vida",    val: `+vida` },
      { tipo: "escarabajo", txt: "Escarabajo buceador — ¡esquívalo!", val: "peligro" },
    ];
    const x0 = 150, y0 = 150, dy = 48;
    filas.forEach((f, i) => {
      const y = y0 + i * dy;
      ctx.save(); ctx.translate(x0, y);
      if (f.tipo === "escarabajo") dibujarEscarabajo({ x: 0, y: 0, dx: -1, modo: "patrulla", fase: i }, t);
      else dibujarItem({ tipo: f.tipo, x: 0, y: 0, fase: i }, t);
      ctx.restore();
      texto(f.txt, x0 + 34, y + 4, 9, "#f4ecd8", "left");
      texto(f.val, ANCHO - 150, y + 4, 9, "#cbdf5a", "right");
    });
    texto("Al ganar patas necesitarás OXÍGENO: atrapa burbujas.", ANCHO / 2, y0 + filas.length * dy + 12, 8, "#9fe6ff", "center");
    boton(esMovil ? "TOCAR PARA EMPEZAR" : "EMPEZAR (Enter)", ANCHO / 2 - 150, ALTO - 56, 300, 42, empezarPartida, "#3a7d4a");
  }

  function pantallaControles() {
    velo();
    texto("CONTROLES", ANCHO / 2, 110, 22, "#9fe6ff", "center");
    const lineas = esMovil
      ? ["Joystick izquierdo — nadar", "Botón ⚡ derecho — impulso", "Llega a la META de la derecha", "Recoge burbujas para no ahogarte"]
      : ["WASD / Flechas — nadar", "Espacio — impulso (boost)", "P o Esc — pausa", "Llega a la META de la derecha", "Recoge burbujas para no ahogarte"];
    lineas.forEach((l, i) => texto(l, ANCHO / 2, 180 + i * 38, 11, "#f4ecd8", "center"));
    boton("VOLVER", ANCHO / 2 - 110, 410, 220, 44, () => estado = "titulo");
  }

  function capaModal(titulo, opciones, acciones) {
    velo();
    texto(titulo, ANCHO / 2, 160, 24, "#9fe6ff", "center");
    opciones.forEach((o, i) => boton(o, ANCHO / 2 - 150, 220 + i * 64, 300, 48, acciones[i]));
  }

  function pantallaResumen() {
    velo();
    const r = resumen;
    texto("NIVEL COMPLETADO", ANCHO / 2, 90, 18, "#cbdf5a", "center");
    const filas = [
      ["Llegada a la meta", r.bonusMeta],
      [`Oxígeno restante`, r.bonusOxig],
      [`Corazones (${jugador.vidas})`, r.bonusVidas],
      ["Sin recibir daño", r.bonusSinDanio],
      [`Toda la comida (${r.comida}/${r.comidaTotal})`, r.bonusComida],
    ];
    filas.forEach((f, i) => {
      texto(f[0], ANCHO / 2 - 200, 150 + i * 34, 11, "#f4ecd8", "left");
      texto("+" + f[1], ANCHO / 2 + 200, 150 + i * 34, 11, f[1] > 0 ? "#cbdf5a" : "rgba(255,255,255,0.3)", "right");
    });
    texto("TOTAL NIVEL  +" + r.total, ANCHO / 2, 345, 13, "#9fe6ff", "center");
    texto("PUNTUACIÓN  " + puntos, ANCHO / 2, 375, 12, "#cbdf5a", "center");
    boton(r.ultimo ? "VER FINAL" : "SIGUIENTE NIVEL", ANCHO / 2 - 140, 410, 280, 46, siguienteNivel, "#3a7d4a");
  }

  function pantallaFin(titulo, color, opciones, acciones) {
    velo();
    texto(titulo, ANCHO / 2, 170, 28, color, "center");
    texto("PUNTUACIÓN  " + puntos, ANCHO / 2, 220, 13, "#f4ecd8", "center");
    texto("MEJOR  " + mejor, ANCHO / 2, 248, 11, "#cbdf5a", "center");
    opciones.forEach((o, i) => boton(o, ANCHO / 2 - 150, 290 + i * 60, 300, 46, acciones[i]));
  }

  function pantallaVictoria() {
    velo();
    ctx.save(); ctx.translate(ANCHO / 2, 150); dibujarRana(0, 0, 2.4, tiempo); ctx.restore();
    texto("¡ERES UNA RANA!", ANCHO / 2, 230, 24, "#cbdf5a", "center");
    texto("Venciste al escarabajo y completaste tu metamorfosis.", ANCHO / 2, 268, 9, "#f4ecd8", "center");
    texto("PUNTUACIÓN FINAL  " + puntos, ANCHO / 2, 300, 13, "#9fe6ff", "center");
    texto("MEJOR  " + mejor, ANCHO / 2, 326, 11, "#cbdf5a", "center");
    boton("VOLVER AL TÍTULO", ANCHO / 2 - 150, 356, 300, 44, () => estado = "titulo", "#3a7d4a");
    boton("SALIR A LA FINKA", ANCHO / 2 - 150, 410, 300, 42, cerrar);
  }

  // ── animación de metamorfosis: congela escena, foco en el renacuajo ──
  function pantallaEvolucion(t, cam) {
    ctx.fillStyle = "rgba(6,26,36,0.78)"; ctx.fillRect(0, 0, ANCHO, ALTO);
    const cx = jugador.x - cam, cy = jugador.y;
    const p = anim.t / anim.dur;
    const esc = 3 + Math.sin(t * 3) * 0.2;
    // halo de luz
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 150);
    g.addColorStop(0, `rgba(255,255,240,${0.35 + Math.sin(t * 10) * 0.15})`); g.addColorStop(1, "rgba(255,255,240,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 150, 0, 6.28); ctx.fill();
    // renacuajo ampliado (parpadea al cambiar)
    ctx.save(); ctx.translate(cx, cy); ctx.scale(esc, esc);
    const destello = anim.hecho && Math.floor(t * 16) % 2 === 0;
    if (!destello) dibujarRenacuajo({ x: 0, y: 0, vx: 0, vy: 0, mirando: 1, boostT: 0, invuln: 0,
      danioFlash: 0, tienePatas: anim.hecho, patasNuevas: true }, t);
    ctx.restore();
    // estrellitas girando alrededor (estilo evolución pokémon)
    ctx.fillStyle = "#ffe34a";
    for (const s of estrellas) estrellita(cx + Math.cos(s.a) * s.r * (1 + p * 0.6), cy + Math.sin(s.a) * s.r * (1 + p * 0.6), 4 + Math.sin(t * 8 + s.fase) * 1.5);
    texto(anim.hecho ? "¡METAMORFOSIS!" : "¿Qué le pasa al renacuajo?", ANCHO / 2, 80, 16, "#ffe34a", "center");
  }

  // ── animación final: el renacuajo se vuelve rana ──
  function pantallaFinalRana(t, cam) {
    ctx.fillStyle = "rgba(6,26,36,0.82)"; ctx.fillRect(0, 0, ANCHO, ALTO);
    const cx = ANCHO / 2, cy = ALTO / 2 + 10;
    const p = clamp(anim.t / anim.dur, 0, 1);
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 200);
    g.addColorStop(0, `rgba(255,255,240,${0.3 + Math.sin(t * 9) * 0.12})`); g.addColorStop(1, "rgba(255,255,240,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 200, 0, 6.28); ctx.fill();
    ctx.save(); ctx.translate(cx, cy);
    if (p < 0.55) {
      // renacuajo gigante parpadeando antes de cambiar
      const esc = 3 + p * 1.5;
      if (Math.floor(t * 14) % 2 === 0) { ctx.scale(esc, esc);
        dibujarRenacuajo({ x: 0, y: 0, vx: 0, vy: 0, mirando: 1, boostT: 0, invuln: 0, danioFlash: 0, tienePatas: true, patasNuevas: true }, t); }
    } else {
      dibujarRana(0, 0, 2.6 + Math.sin(t * 4) * 0.15, t);
    }
    ctx.restore();
    ctx.fillStyle = "#ffe34a";
    for (const s of estrellas) estrellita(cx + Math.cos(s.a) * (s.r + 40) , cy + Math.sin(s.a) * (s.r + 40), 4 + Math.sin(t * 8 + s.fase) * 1.6);
    texto(p < 0.55 ? "¡EL ESCARABAJO CAYÓ!" : "¡METAMORFOSIS COMPLETA!", ANCHO / 2, 86, 16, "#ffe34a", "center");
  }

  // ranita simple para los finales
  function dibujarRana(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const respira = Math.sin(t * 3) * 0.6;
    // patas traseras plegadas
    ctx.fillStyle = "#3f9a63";
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.scale(sx, 1);
      ctx.beginPath(); ctx.ellipse(11, 8, 7, 4, -0.5, 0, 6.28); ctx.fill();
      ctx.strokeStyle = "#2f7d4d"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(15, 9); ctx.lineTo(20, 12); ctx.moveTo(18, 9); ctx.lineTo(22, 13); ctx.stroke();
      ctx.restore();
    }
    // patas delanteras
    ctx.strokeStyle = "#2f7d4d"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 6, 6); ctx.lineTo(sx * 10, 11); ctx.stroke(); }
    // cuerpo
    ctx.fillStyle = "#56b977"; ctx.beginPath(); ctx.ellipse(0, 0 + respira, 13, 11, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = "#7fd39a"; ctx.beginPath(); ctx.ellipse(0, 3, 9, 6, 0, 0, 6.28); ctx.fill();
    // ojos saltones
    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#56b977"; ctx.beginPath(); ctx.arc(sx * 6, -9, 4.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx * 6, -9, 3, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#142a1e"; ctx.beginPath(); ctx.arc(sx * 6 + sx, -9, 1.5, 0, 6.28); ctx.fill();
    }
    // boca sonriente
    ctx.strokeStyle = "#1f5236"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 1, 7, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.restore();
  }

  function dibujarLeyenda() {
    const a = clamp(leyenda.t, 0, 1);
    ctx.save(); ctx.globalAlpha = a < 1 ? a : 1;
    const w = 640, x = (ANCHO - w) / 2, y = ALTO - 86;
    ctx.fillStyle = "rgba(12,30,40,0.85)"; ctx.fillRect(x, y, w, 40);
    ctx.strokeStyle = "#9fe6ff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 40);
    texto(leyenda.txt, ANCHO / 2, y + 25, 9, "#dff6ff", "center");
    ctx.restore();
  }

  /* ========================================================================
   * ESTILOS de la capa
   * ====================================================================== */
  const ESTILOS = `
    #cp-overlay { position: fixed; inset: 0; z-index: 200; background: #06222e;
      display: flex; align-items: center; justify-content: center; overflow: hidden; touch-action: none; }
    #cp-canvas { image-rendering: pixelated; width: 100vw; height: 100vh;
      max-width: 177.78vh; max-height: 56.25vw; }
    #cp-joy { position: fixed; left: 22px; bottom: 26px; width: 112px; height: 112px;
      border-radius: 50%; background: rgba(8,40,55,0.4); border: 3px solid rgba(160,230,255,0.4);
      display: none; z-index: 210; touch-action: none; }
    #cp-knob { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; border-radius: 50%;
      background: rgba(160,230,255,0.55); border: 3px solid #0c2530; transform: translate(-23px,-23px); pointer-events: none; }
    #cp-boost { position: fixed; right: 26px; bottom: 34px; width: 86px; height: 86px; border-radius: 50%;
      background: rgba(58,125,74,0.85); border: 4px solid #0c2530; color: #fff; font-size: 34px;
      display: none; align-items: center; justify-content: center; z-index: 210; touch-action: none; cursor: pointer; }
    #cp-salir { position: fixed; right: 14px; top: 14px; z-index: 215; width: 40px; height: 40px;
      background: rgba(20,14,8,0.6); border: 2px solid #0c2530; color: #f4ecd8; font-size: 18px;
      cursor: pointer; border-radius: 6px; }
    #cp-girar { position: fixed; inset: 0; z-index: 220; background: #06222e; color: #9fe6ff;
      display: none; align-items: center; justify-content: center; text-align: center; padding: 30px;
      font-family: 'Press Start 2P', monospace; font-size: 14px; line-height: 2; }
  `;

  window.CharcaPanic = { abrir, cerrar };
})();
