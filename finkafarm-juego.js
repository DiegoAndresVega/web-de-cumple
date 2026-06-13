// finkafarm-juego.js — motor del juego: cámara, render por capas, jugador, editor.
//
// Render en dos capas:
//  1. "mundo": canvas offscreen con todo el terreno estático pre-renderizado
//     a 16px/celda (hierba, exterior, caminos con bordes, valla conectada,
//     árboles del exterior). Se reconstruye solo al editar terreno.
//  2. dinámica: agua animada, sombras, objetos y jugador ordenados por
//     profundidad, dibujados cada frame sobre la capa de mundo.

(function () {
  const G = window.Granja;
  const { COLS, FILAS, CUADRICULA, TERRENO_DEFECTO, OBJETOS_DEFECTO, JUGADOR_DEFECTO,
    tamanoObjeto, TAMANOS_OBJETO, OBJETOS_SOLIDOS, CATEGORIAS_OBJETO, TIPOS_OBJETO, SPRITES, PALETA, dibujarSprite, dibujarSombra, hash2,
    crearSpritesJugador, PEINADOS, gridACanvas } = G;

  const STORAGE_KEY = "granja-mapa-v1";
  const PX = 16; // píxeles de arte por celda
  const ZOOM_MIN = 0.5, ZOOM_MAX = 5;
  const VELOCIDAD = 4.5; // celdas / segundo
  const HITBOX = 0.32;

  const canvas = document.getElementById("juego");
  const ctx = canvas.getContext("2d");
  const elEstado = document.getElementById("estado");
  const elEditorPanel = document.getElementById("editor-panel");
  const elJson = document.getElementById("editor-json");

  // ── mapa compartido: Firebase es la fuente de verdad del mundo online ──
  // Todos los visitantes ven y editan el MISMO mapa (finkafarm/mapa).
  // localStorage queda como caché/fallback si Firebase no está disponible.
  const clienteId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let refMapa = null;
  try {
    if (window.firebase && firebase.database) refMapa = firebase.database().ref("finkafarm/mapa");
  } catch (e) {}

  function mapaDefecto() {
    return { objetos: OBJETOS_DEFECTO.map((o) => ({ ...o })), terreno: {} };
  }
  function cargarMapa() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const datos = JSON.parse(raw);
        if (datos && Array.isArray(datos.objetos) && datos.terreno) return datos;
      }
    } catch (e) {}
    return mapaDefecto();
  }
  let mapa = cargarMapa();

  let timerGuardado = null;
  function guardarMapa() {
    sincronizarFaunaMapa();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa)); } catch (e) {}
    if (!refMapa) return;
    clearTimeout(timerGuardado);
    timerGuardado = setTimeout(() => {
      refMapa.set({
        objetos: mapa.objetos,
        terreno: mapa.terreno,
        clienteId,
        ts: Date.now(),
      }).catch(() => {});
    }, 600);
  }

  // Cambios remotos: se aplican al instante salvo que estés arrastrando algo
  // en el editor (se difieren hasta soltar, para no pisarte a mitad de gesto).
  let mapaRemotoPendiente = null;
  function aplicarMapaRemoto(d) {
    // Firebase elimina objetos/arrays vacíos al guardar: restituir las formas
    mapa = { objetos: d.objetos || [], terreno: d.terreno || {} };
    recalcularOcupacion();
    reconstruirMundo();
    sincronizarFaunaMapa();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa)); } catch (e) {}
  }
  if (refMapa) {
    refMapa.on("value", (snap) => {
      const d = snap.val();
      if (!d) return; // aún no hay mapa publicado: se usa el local/por defecto
      if (d.clienteId === clienteId) return; // eco de nuestra propia escritura
      if (arrastre) { mapaRemotoPendiente = d; return; }
      aplicarMapaRemoto(d);
    });
  }

  let ocupacion = new Map();
  function recalcularOcupacion() {
    ocupacion = new Map();
    for (const obj of mapa.objetos) {
      if (!OBJETOS_SOLIDOS.has(obj.tipo)) continue;
      const [w, h] = tamanoObjeto(obj.tipo);
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) ocupacion.set(`${obj.col + dx},${obj.fila + dy}`, obj);
      }
    }
  }
  recalcularOcupacion();

  function terrenoEn(col, fila) {
    const k = `${col},${fila}`;
    if (mapa.terreno[k]) return mapa.terreno[k];
    if (TERRENO_DEFECTO[fila] && TERRENO_DEFECTO[fila][col]) return TERRENO_DEFECTO[fila][col];
    return "hierba";
  }
  function estadoCelda(col, fila) {
    if (col < 0 || col >= COLS || fila < 0 || fila >= FILAS) return "fuera";
    return CUADRICULA[fila][col];
  }
  function transitable(col, fila) {
    if (estadoCelda(col, fila) !== "dentro") return false;
    if (terrenoEn(col, fila) === "agua") return false;
    if (ocupacion.has(`${col},${fila}`)) return false;
    return true;
  }

  // ── capa de mundo pre-renderizada ──────────────────────────────────────
  const mundo = document.createElement("canvas");
  mundo.width = COLS * PX;
  mundo.height = FILAS * PX;
  const mctx = mundo.getContext("2d");
  let celdasAgua = []; // [col, fila] con agua sin esquinas redondeadas (animables)
  let algas = []; // {wx, wy, fase} en px de arte, algas superficiales de estanques

  function esAgua(col, fila) {
    return estadoCelda(col, fila) === "dentro" && terrenoEn(col, fila) === "agua";
  }

  function frameTerreno(col, fila) {
    const t = terrenoEn(col, fila);
    if (t === "agua") return SPRITES.agua.frames[0];
    if (t === "camino") return SPRITES.camino.frames[0];
    if (t === "grava") return SPRITES.grava.frames[(col * 5 + fila * 11) % 3];
    const h = hash2(col, fila);
    if (h > 0.96) return SPRITES.hierba_flor_b.frames[0];
    if (h > 0.93) return SPRITES.hierba_flor_r.frames[0];
    return SPRITES.hierba.frames[(col * 3 + fila * 7) % 4];
  }

  function reconstruirMundo() {
    mctx.imageSmoothingEnabled = false;
    celdasAgua = [];
    algas = [];
    // 1) terreno base
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * PX, y = f * PX;
        const estado = CUADRICULA[f][c];
        if (estado === "dentro") {
          mctx.drawImage(frameTerreno(c, f).canvas, x, y);
        } else {
          // exterior y valla: pradera oscura del entorno
          mctx.drawImage(SPRITES.exterior.frames[(c * 5 + f * 3) % 3].canvas, x, y);
        }
      }
    }
    // 2) transiciones de camino y borde de agua
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        if (CUADRICULA[f][c] !== "dentro") continue;
        const t = terrenoEn(c, f);
        const x = c * PX, y = f * PX;
        if (t === "camino" || t === "grava") {
          mctx.fillStyle = t === "camino" ? PALETA.tierra_d : PALETA.grava_dd;
          if (terrenoBorde(c, f - 1, t)) mctx.fillRect(x, y, PX, 1);
          if (terrenoBorde(c, f + 1, t)) mctx.fillRect(x, y + PX - 1, PX, 1);
          if (terrenoBorde(c - 1, f, t)) mctx.fillRect(x, y, 1, PX);
          if (terrenoBorde(c + 1, f, t)) mctx.fillRect(x + PX - 1, y, 1, PX);
        } else if (t === "agua") {
          // bordes rectos
          mctx.fillStyle = PALETA.borde_agua;
          const nA = esAgua(c, f - 1), sA = esAgua(c, f + 1), oA = esAgua(c - 1, f), eA = esAgua(c + 1, f);
          if (!nA) mctx.fillRect(x, y, PX, 2);
          if (!sA) mctx.fillRect(x, y + PX - 2, PX, 2);
          if (!oA) mctx.fillRect(x, y, 2, PX);
          if (!eA) mctx.fillRect(x + PX - 2, y, 2, PX);
          // esquinas redondeadas: si dos lados contiguos no son agua, la
          // esquina se curva (cuarto de círculo de radio 1 celda) para que
          // los estanques pintados celda a celda queden circulares
          const esquinas = [
            [!nA && !oA, 0, 0], [!nA && !eA, 1, 0],
            [!sA && !oA, 0, 1], [!sA && !eA, 1, 1],
          ];
          let redondeada = false;
          for (const [curva, ex, ey] of esquinas) {
            if (!curva) continue;
            redondeada = true;
            const mitad = PX / 2;
            for (let j = 0; j < mitad; j++) {
              for (let i = 0; i < mitad; i++) {
                const px = ex ? PX - 1 - i : i, py = ey ? PX - 1 - j : j;
                // distancia al centro de la celda (el arco pasa por los
                // puntos medios de los dos lados)
                const dx = px + 0.5 - PX / 2, dy = py + 0.5 - PX / 2;
                const d2 = dx * dx + dy * dy;
                if (d2 > 64) {
                  mctx.fillStyle = ((px + py * 3) % 5 === 0) ? PALETA.hierba_d : PALETA.hierba;
                  mctx.fillRect(x + px, y + py, 1, 1);
                } else if (d2 > 37) {
                  mctx.fillStyle = PALETA.borde_agua;
                  mctx.fillRect(x + px, y + py, 1, 1);
                }
              }
            }
          }
          // esquinas cóncavas: el agua invade en arco la esquina de la celda
          // de hierba diagonal, suavizando los "escalones" del estanque
          const diagonales = [
            [nA && oA, -1, -1], [nA && eA, 1, -1],
            [sA && oA, -1, 1], [sA && eA, 1, 1],
          ];
          for (const [lados, ex, ey] of diagonales) {
            if (!lados) continue;
            const dc = c + ex, df = f + ey;
            if (esAgua(dc, df) || estadoCelda(dc, df) !== "dentro") continue;
            // punto de esquina compartida (en px de mundo)
            const cxp = x + (ex > 0 ? PX : 0), cyp = y + (ey > 0 ? PX : 0);
            for (let j = 0; j < 6; j++) {
              for (let i = 0; i < 6; i++) {
                const pxx = cxp + (ex > 0 ? i : -1 - i);
                const pyy = cyp + (ey > 0 ? j : -1 - j);
                const d2 = (i + 0.5) * (i + 0.5) + (j + 0.5) * (j + 0.5);
                if (d2 <= 16) { mctx.fillStyle = PALETA.agua; mctx.fillRect(pxx, pyy, 1, 1); }
                else if (d2 <= 36) { mctx.fillStyle = PALETA.borde_agua; mctx.fillRect(pxx, pyy, 1, 1); }
              }
            }
          }
          if (!redondeada) celdasAgua.push([c, f]);
          // algas superficiales en celdas interiores de estanque
          if (nA && sA && oA && eA) {
            const h = hash2(c * 13, f * 17);
            if (h < 0.38) {
              const k = h < 0.15 ? 2 : 1;
              for (let a = 0; a < k; a++) {
                algas.push({
                  wx: x + 2 + Math.floor(hash2(c + a * 31, f) * 9),
                  wy: y + 2 + Math.floor(hash2(c, f + a * 47) * 10),
                  fase: hash2(c * 3, f * 5 + a) * Math.PI * 2,
                  variante: (c + f + a) % 2,
                });
              }
            }
          }
        }
      }
    }
    // 3) valla conectada (postes + travesaños hacia vecinos valla)
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        if (CUADRICULA[f][c] !== "valla") continue;
        const x = c * PX, y = f * PX;
        const n = estadoCelda(c, f - 1) === "valla";
        const s = estadoCelda(c, f + 1) === "valla";
        const o = estadoCelda(c - 1, f) === "valla";
        const e = estadoCelda(c + 1, f) === "valla";
        mctx.fillStyle = PALETA.madera;
        if (o) { mctx.fillRect(x, y + 5, 8, 2); mctx.fillRect(x, y + 10, 8, 2); }
        if (e) { mctx.fillRect(x + 8, y + 5, 8, 2); mctx.fillRect(x + 8, y + 10, 8, 2); }
        if (n) { mctx.fillRect(x + 7, y, 2, 8); mctx.fillRect(x + 11, y, 2, 8); }
        if (s) { mctx.fillRect(x + 7, y + 8, 2, 8); mctx.fillRect(x + 11, y + 8, 2, 8); }
        // poste
        mctx.fillStyle = PALETA.madera_d;
        mctx.fillRect(x + 6, y + 2, 4, 12);
        mctx.fillStyle = PALETA.madera_l;
        mctx.fillRect(x + 6, y + 2, 1, 12);
      }
    }
    // 4) arbolado oscuro del exterior (decorativo, fuera del polígono)
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        if (CUADRICULA[f][c] !== "fuera") continue;
        // lejos de la valla para no tapar el cercado
        if (estadoCelda(c - 1, f) === "valla" || estadoCelda(c + 1, f) === "valla" ||
            estadoCelda(c, f - 1) === "valla" || estadoCelda(c, f + 1) === "valla") continue;
        const h = hash2(c * 7, f * 5);
        if (h < 0.05) {
          const fr = (h < 0.025 ? SPRITES.pino : SPRITES.roble).frames[0];
          mctx.drawImage(fr.canvas, c * PX + (PX - fr.ancho) / 2, f * PX + PX - fr.alto);
        }
      }
    }
  }
  function terrenoBorde(col, fila, tipo) {
    if (estadoCelda(col, fila) !== "dentro") return tipo !== "agua"; // camino/grava marcan borde contra la valla; agua no
    return terrenoEn(col, fila) !== tipo;
  }

  // ── vallas colocables: se conectan con vecinas y con el cercado ────────
  function hayValla(col, fila) {
    if (estadoCelda(col, fila) === "valla") return true;
    const o = ocupacion.get(`${col},${fila}`);
    return !!o && o.tipo === "valla";
  }
  function dibujarVallaObjeto(x, y, col, fila) {
    const z = camara.zoom;
    const n = hayValla(col, fila - 1), s = hayValla(col, fila + 1);
    const o = hayValla(col - 1, fila), e = hayValla(col + 1, fila);
    ctx.fillStyle = PALETA.madera;
    if (o) { ctx.fillRect(x, y + 5 * z, 8 * z, 2 * z); ctx.fillRect(x, y + 10 * z, 8 * z, 2 * z); }
    if (e) { ctx.fillRect(x + 8 * z, y + 5 * z, 8 * z, 2 * z); ctx.fillRect(x + 8 * z, y + 10 * z, 8 * z, 2 * z); }
    if (n) { ctx.fillRect(x + 7 * z, y, 2 * z, 8 * z); ctx.fillRect(x + 11 * z, y, 2 * z, 8 * z); }
    if (s) { ctx.fillRect(x + 7 * z, y + 8 * z, 2 * z, 8 * z); ctx.fillRect(x + 11 * z, y + 8 * z, 2 * z, 8 * z); }
    ctx.fillStyle = PALETA.madera_d;
    ctx.fillRect(x + 6 * z, y + 2 * z, 4 * z, 12 * z);
    ctx.fillStyle = PALETA.madera_l;
    ctx.fillRect(x + 6 * z, y + 2 * z, z, 12 * z);
  }

  // ── modo, cámara, jugador ──────────────────────────────────────────────
  let modo = "jugar"; // 'jugar' | 'editor'

  const jugador = {
    x: JUGADOR_DEFECTO.col + 0.5, y: JUGADOR_DEFECTO.fila + 0.5,
    dir: "abajo", espejo: false, moviendo: false, animT: 0,
  };

  const camara = { x: jugador.x, y: jugador.y, zoom: 2.5, libre: false };
  const raton = { x: -1, y: -1 };
  // en móvil la cámara va fijada al personaje mientras se juega; solo el
  // editor (navegación con dos dedos) puede soltarla
  const esMovil = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  function tamCelda() { return PX * camara.zoom; }
  function celdaAPantalla(col, fila) {
    const tam = tamCelda();
    return [
      canvas.clientWidth / 2 + (col - camara.x) * tam,
      canvas.clientHeight / 2 + (fila - camara.y) * tam,
    ];
  }
  function pantallaACelda(x, y) {
    const tam = tamCelda();
    return [
      camara.x + (x - canvas.clientWidth / 2) / tam,
      camara.y + (y - canvas.clientHeight / 2) / tam,
    ];
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", resize);

  // ── jugador: movimiento y colisión ─────────────────────────────────────
  function puedeEstar(x, y) {
    for (const [ex, ey] of [[-HITBOX, -HITBOX], [HITBOX, -HITBOX], [-HITBOX, HITBOX], [HITBOX, HITBOX]]) {
      if (!transitable(Math.floor(x + ex), Math.floor(y + ey))) return false;
    }
    return true;
  }

  const teclas = new Set();
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
    teclas.add(e.key.toLowerCase());
    if (e.key === "Tab") { e.preventDefault(); camara.libre = !camara.libre; }
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.key.toLowerCase()));

  // ── joystick táctil (móvil) ────────────────────────────────────────────
  const joy = { activo: false, vx: 0, vy: 0 };
  const elJoy = document.getElementById("joystick");
  const elJoyKnob = document.getElementById("joystick-knob");
  let joyPointerId = null;
  function moverJoy(e) {
    const r = elJoy.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width / 2 - 10;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    elJoyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const zonaMuerta = 8;
    if (d < zonaMuerta) { joy.vx = 0; joy.vy = 0; }
    else { joy.vx = dx / max; joy.vy = dy / max; }
  }
  elJoy.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    joyPointerId = e.pointerId;
    try { elJoy.setPointerCapture(e.pointerId); } catch (err) {}
    joy.activo = true;
    moverJoy(e);
  });
  elJoy.addEventListener("pointermove", (e) => {
    if (e.pointerId === joyPointerId) moverJoy(e);
  });
  function soltarJoy(e) {
    if (e.pointerId !== joyPointerId) return;
    joyPointerId = null;
    joy.activo = false; joy.vx = 0; joy.vy = 0;
    elJoyKnob.style.transform = "translate(-50%, -50%)";
  }
  elJoy.addEventListener("pointerup", soltarJoy);
  elJoy.addEventListener("pointercancel", soltarJoy);

  function actualizarJugador(dt) {
    let dx = 0, dy = 0;
    if (teclas.has("w") || teclas.has("arrowup")) dy -= 1;
    if (teclas.has("s") || teclas.has("arrowdown")) dy += 1;
    if (teclas.has("a") || teclas.has("arrowleft")) dx -= 1;
    if (teclas.has("d") || teclas.has("arrowright")) dx += 1;
    if (!dx && !dy && joy.activo) { dx = joy.vx; dy = joy.vy; }

    if (dx || dy) {
      ocultarFicha(); // la ficha de especie se va en cuanto te mueves
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * VELOCIDAD * dt;
      dy = (dy / len) * VELOCIDAD * dt;
      if (puedeEstar(jugador.x + dx, jugador.y)) jugador.x += dx;
      if (puedeEstar(jugador.x, jugador.y + dy)) jugador.y += dy;
      if (Math.abs(dy) > Math.abs(dx)) jugador.dir = dy > 0 ? "abajo" : "arriba";
      else { jugador.dir = "lado"; jugador.espejo = dx < 0; }
      jugador.moviendo = true;
      jugador.animT += dt;
    } else {
      jugador.moviendo = false;
    }
  }

  function actualizarCamara() {
    if (!camara.libre) { camara.x = jugador.x; camara.y = jugador.y; }
    const m = 6;
    camara.x = Math.max(-m, Math.min(COLS + m, camara.x));
    camara.y = Math.max(-m, Math.min(FILAS + m, camara.y));
  }

  // ── editor: pinceles ────────────────────────────────────────────────────
  let pincel = { tipo: "mover", valor: null };
  let arrastre = null;

  function objetoEn(col, fila) {
    for (let i = mapa.objetos.length - 1; i >= 0; i--) {
      const obj = mapa.objetos[i];
      const [w, h] = tamanoObjeto(obj.tipo);
      if (col >= obj.col && col < obj.col + w && fila >= obj.fila && fila < obj.fila + h) return obj;
    }
    return null;
  }
  function borrarEn(col, fila) {
    const obj = objetoEn(col, fila);
    if (obj) {
      mapa.objetos = mapa.objetos.filter((o) => o !== obj);
      recalcularOcupacion();
      return;
    }
    // terreno: borrar = volver a hierba. Si el terreno por defecto del mapa
    // (piscina, estanque, camino de serie) no es hierba, hay que taparlo
    // con un override; si ya era hierba, basta con quitar el override.
    const k = `${col},${fila}`;
    const base = (TERRENO_DEFECTO[fila] && TERRENO_DEFECTO[fila][col]) || "hierba";
    const habia = terrenoEn(col, fila);
    if (base !== "hierba") mapa.terreno[k] = "hierba";
    else delete mapa.terreno[k];
    if (habia !== "hierba") reconstruirMundo();
  }
  function pintarTerreno(col, fila) {
    if (estadoCelda(col, fila) !== "dentro") return;
    if (mapa.terreno[`${col},${fila}`] === pincel.valor) return;
    mapa.terreno[`${col},${fila}`] = pincel.valor;
    reconstruirMundo();
  }
  function iniciarAccionEditor(e) {
    const [colF, filaF] = pantallaACelda(e.clientX, e.clientY);
    const col = Math.floor(colF), fila = Math.floor(filaF);
    if (pincel.tipo === "mover") {
      const obj = objetoEn(col, fila);
      if (obj) arrastre = { tipo: "objeto", obj, offCol: col - obj.col, offFila: fila - obj.fila };
    } else if (pincel.tipo === "terreno") {
      arrastre = { tipo: "terreno" };
      pintarTerreno(col, fila);
    } else if (pincel.tipo === "objeto") {
      mapa.objetos.push({ id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, tipo: pincel.valor, col, fila });
      recalcularOcupacion();
      guardarMapa();
    } else if (pincel.tipo === "borrar") {
      arrastre = { tipo: "borrar" };
      borrarEn(col, fila);
    } else if (pincel.tipo === "expulsar") {
      const cerca = personaEn(colF, filaF);
      if (cerca && confirm(`¿Sacar a "${cerca.nombre}" de la finka? Se le desconectará, pero podrá volver a entrar.`)) {
        expulsarPersona(cerca.id);
      }
    }
  }
  function continuarAccionEditor(e) {
    if (!arrastre) return;
    const [colF, filaF] = pantallaACelda(e.clientX, e.clientY);
    const col = Math.floor(colF), fila = Math.floor(filaF);
    if (arrastre.tipo === "objeto") {
      arrastre.obj.col = Math.max(0, Math.min(COLS - 1, col - arrastre.offCol));
      arrastre.obj.fila = Math.max(0, Math.min(FILAS - 1, fila - arrastre.offFila));
    } else if (arrastre.tipo === "terreno") {
      pintarTerreno(col, fila);
    } else if (arrastre.tipo === "borrar") {
      borrarEn(col, fila);
    }
  }

  // ── input de ratón / táctil ──────────────────────────────────────────────
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const [col, fila] = pantallaACelda(e.clientX, e.clientY);
    camara.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camara.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    const tam = tamCelda();
    camara.x = col - (e.clientX - canvas.clientWidth / 2) / tam;
    camara.y = fila - (e.clientY - canvas.clientHeight / 2) / tam;
  }, { passive: false });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // pellizco táctil: dos dedos hacen zoom y a la vez arrastran la cámara
  // (en el editor móvil es la única manera de desplazarse por el mapa)
  const punteros = new Map();
  let pellizco = null; // { dist0, zoom0, cx, cy }
  function distPunteros() {
    const [a, b] = [...punteros.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function centroPunteros() {
    const [a, b] = [...punteros.values()];
    return [(a.x + b.x) / 2, (a.y + b.y) / 2];
  }

  let toque = null; // candidato a "click corto" para la ficha de especies
  canvas.addEventListener("pointerdown", (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    detectarToquePino(e);
    if (modo === "jugar" && punteros.size === 1) {
      toque = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, multi: false };
    }
    if (punteros.size === 2) {
      if (toque) toque.multi = true;
      arrastre = null;
      const [cx, cy] = centroPunteros();
      pellizco = { dist0: distPunteros(), zoom0: camara.zoom, cx, cy };
      canvas.classList.remove("arrastrando");
      return;
    }
    if (e.button === 2 || (modo === "jugar" && e.button === 0)) {
      if (esMovil && modo === "jugar") return; // móvil: la cámara no se arrastra jugando
      arrastre = { tipo: "camara", x: e.clientX, y: e.clientY };
      canvas.classList.add("arrastrando");
      return;
    }
    if (modo === "editor") iniciarAccionEditor(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    raton.x = e.clientX; raton.y = e.clientY;
    if (punteros.has(e.pointerId)) punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pellizco && punteros.size === 2) {
      const d = distPunteros();
      if (d > 0 && pellizco.dist0 > 0) {
        camara.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pellizco.zoom0 * (d / pellizco.dist0)));
      }
      if (!(esMovil && modo === "jugar")) { // jugando en móvil: solo zoom, sin soltar la cámara
        const [cx, cy] = centroPunteros();
        const tam = tamCelda();
        camara.x -= (cx - pellizco.cx) / tam;
        camara.y -= (cy - pellizco.cy) / tam;
        pellizco.cx = cx; pellizco.cy = cy;
        camara.libre = true;
      }
      return;
    }
    if (!arrastre) return;
    if (arrastre.tipo === "camara") {
      const tam = tamCelda();
      camara.x -= (e.clientX - arrastre.x) / tam;
      camara.y -= (e.clientY - arrastre.y) / tam;
      arrastre.x = e.clientX; arrastre.y = e.clientY;
      camara.libre = true;
    } else if (modo === "editor") {
      continuarAccionEditor(e);
    }
  });
  function soltarPuntero(e) {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) pellizco = null;
    // click corto sin arrastre en modo juego → ficha de la especie tocada
    if (toque && e.pointerId === toque.id) {
      if (!toque.multi && modo === "jugar" && performance.now() - toque.t < 400 &&
          Math.hypot(e.clientX - toque.x, e.clientY - toque.y) < 8) {
        fichaEnPantalla(e.clientX, e.clientY);
      }
      toque = null;
    }
    if (arrastre && arrastre.tipo === "objeto") { recalcularOcupacion(); guardarMapa(); }
    if (arrastre && (arrastre.tipo === "terreno" || arrastre.tipo === "borrar")) guardarMapa();
    arrastre = null;
    canvas.classList.remove("arrastrando");
    if (mapaRemotoPendiente) { aplicarMapaRemoto(mapaRemotoPendiente); mapaRemotoPendiente = null; }
  }
  canvas.addEventListener("pointerup", soltarPuntero);
  canvas.addEventListener("pointercancel", soltarPuntero);

  // ── panel del editor ──────────────────────────────────────────────────
  const TIPOS_TERRENO = [["hierba", "HIERBA"], ["camino", "CAMINO"], ["grava", "GRAVA"], ["agua", "AGUA"]];
  const ETIQUETAS_OBJETO = {
    caseta: "CASETA", gallinero: "GALLINERO", letrina: "LETRINA", valla: "VALLA",
    pino: "PINO", roble: "ROBLE", encina: "ENCINA", olivo: "OLIVO",
    manzano: "MANZANO", peral: "PERAL", cerezo: "CEREZO", ciruelo: "CIRUELO",
    endrino: "ENDRINO", pistacho: "PISTACHO", nogal: "NOGAL", almendro: "ALMENDRO",
    castano: "CASTAÑO", arandano: "ARÁNDANO", lavanda: "LAVANDA", fresa: "FRESA",
    flores: "FLORES", retama: "RETAMA", espino: "ESPINO", zarza: "ZARZA",
    amapola: "AMAPOLA", tomillo: "TOMILLO", romero: "ROMERO",
    gallina: "GALLINA", oveja_negra: "OVEJA", liebre: "LIEBRE",
    zorro: "ZORRO", gineta: "GINETA", comadreja: "COMADREJA",
    gorrion: "GORRIÓN", urraca: "URRACA", abubilla: "ABUBILLA", ciguena: "CIGÜEÑA",
    aguila: "ÁGUILA", perdiz: "PERDIZ", lagartija: "LAGARTIJA", lagarto: "LAGARTO", culebra: "CULEBRA",
    rana: "RANA", sapo: "SAPO", sapo_corredor: "SAPO CORREDOR",
    libelula: "LIBÉLULA", oruga: "ORUGA", mariquita: "MARIQUITA", sanjuanero: "SANJUANERO",
  };

  const botones = [];
  function seleccionarPincel(tipo, valor, btn) {
    pincel = { tipo, valor };
    for (const b of botones) b.classList.remove("activo");
    btn.classList.add("activo");
  }
  function crearBoton(texto, onClick) {
    const b = document.createElement("button");
    b.textContent = texto;
    b.addEventListener("click", onClick);
    botones.push(b);
    return b;
  }

  const btnMover = document.getElementById("btn-mover");
  const btnBorrar = document.getElementById("btn-borrar");
  const btnExpulsar = document.getElementById("btn-expulsar");
  botones.push(btnMover, btnBorrar, btnExpulsar);
  btnMover.addEventListener("click", () => seleccionarPincel("mover", null, btnMover));
  btnBorrar.addEventListener("click", () => seleccionarPincel("borrar", null, btnBorrar));
  btnExpulsar.addEventListener("click", () => seleccionarPincel("expulsar", null, btnExpulsar));
  btnMover.classList.add("activo");

  // pinceles agrupados en pestañas: solo se despliega la categoría pulsada,
  // así el panel no enseña todos los assets a la vez
  const elPestanas = document.getElementById("pestanas-editor");
  const elContenido = document.getElementById("contenido-categorias");
  const pestanas = []; // [botónPestaña, filaDePinceles]
  const filasPorCategoria = new Map(); // título de categoría → fila de pinceles
  const pincelesAssetPorTipo = new Map(); // tipo de asset personalizado → su botón de pincel
  const assetsPersonalizados = new Map(); // tipo → definición del asset personalizado
  let elListaAssets = null; // contenedor de la lista de assets personalizados (lo crea construirCreadorAsset)
  let cargarAssetEnEditor = null; // (def) => carga ese asset en el pintor; lo asigna construirCreadorAsset
  function crearCategoria(titulo, construir) {
    const fila = document.createElement("div");
    fila.className = "fila pinceles";
    fila.style.display = "none";
    filasPorCategoria.set(titulo, fila);
    construir(fila);
    elContenido.appendChild(fila);
    const tab = document.createElement("button");
    tab.textContent = titulo;
    tab.addEventListener("click", () => {
      const estabaAbierta = fila.style.display !== "none";
      for (const [t, fl] of pestanas) { fl.style.display = "none"; t.classList.remove("activo"); }
      if (!estabaAbierta) { fila.style.display = "flex"; tab.classList.add("activo"); }
    });
    pestanas.push([tab, fila]);
    elPestanas.appendChild(tab);
  }
  crearCategoria("TERRENO", (fila) => {
    for (const [tipo, etiqueta] of TIPOS_TERRENO) {
      const b = crearBoton(etiqueta, () => seleccionarPincel("terreno", tipo, b));
      fila.appendChild(b);
    }
  });
  for (const [titulo, tipos] of CATEGORIAS_OBJETO) {
    crearCategoria(titulo, (fila) => {
      for (const tipo of tipos) {
        const b = crearBoton(ETIQUETAS_OBJETO[tipo] || tipo.toUpperCase(), () => seleccionarPincel("objeto", tipo, b));
        fila.appendChild(b);
      }
    });
  }
  // ── creador de assets: pintar a píxel un bicho/planta/objeto nuevo y
  // registrarlo como un pincel más (persistido en localStorage) ──────────
  const AC_MAX = 64; // lado máximo del lienzo en celdas (un asset de 64 = 4x4 celdas del mapa)
  const AC_LIENZO_PX = 360, AC_PREVIEW_PX = 120; // tamaño objetivo en pantalla; la escala por celda se ajusta sola
  const AC_PALETA = [ // subconjunto curado de PALETA, suficiente para bichos y plantas
    "negro", "negro_l", "gris", "blanco", "crema",
    "piel", "piel_d", "pardo", "pardo_d", "pardo_l",
    "rojo", "amarillo", "morado", "rosa",
    "hierba", "hierba_d", "hierba_l", "bosque", "bosque_d",
    "tronco", "tronco_d", "agua", "agua_d",
    "oliva", "oliva_l", "flor_a", "flor_r", "flor_b", "flor_m",
    "madera", "madera_d",
  ];
  const ASSETS_STORAGE_KEY = "granja-assets-v1";

  function gridVacio(ancho, alto) {
    return Array.from({ length: alto }, () => new Array(ancho).fill(null));
  }
  function clonarGrid(grid) {
    return grid.map((fila) => fila.slice());
  }
  // reescala un grid a otro tamaño por vecino más cercano (cada píxel se
  // estira/encoge): así un dibujo de 16x16 se puede llevar a 64x64 sin rehacerlo
  function escalarGrid(grid, nuevoAncho, nuevoAlto) {
    const alto = grid.length, ancho = grid[0].length;
    return Array.from({ length: nuevoAlto }, (_, ny) =>
      Array.from({ length: nuevoAncho }, (_, nx) =>
        grid[Math.min(alto - 1, Math.floor(ny * alto / nuevoAlto))][Math.min(ancho - 1, Math.floor(nx * ancho / nuevoAncho))]
      )
    );
  }
  function gridVacioDel(grid) {
    return grid.every((fila) => fila.every((c) => c === null));
  }
  function frameDesdeGrid(grid) {
    return { ancho: grid[0].length, alto: grid.length, canvas: gridACanvas(grid) };
  }
  function slugify(texto) {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  function numero(el, porDefecto) {
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : porDefecto;
  }
  function campo(etiqueta, input) {
    const lbl = document.createElement("label");
    lbl.className = "ac-campo";
    if (input.type === "checkbox") lbl.classList.add("ac-campo-check");
    const span = document.createElement("span");
    span.textContent = etiqueta;
    lbl.append(span, input);
    return lbl;
  }

  // botón del editor que se marca "activo" en exclusiva dentro de su grupo
  // (fotogramas, herramientas...), sin pasar por el sistema de pinceles
  function botonAlternable(texto, grupo, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.addEventListener("click", () => {
      for (const x of grupo) x.classList.remove("activo");
      b.classList.add("activo");
      onClick();
    });
    grupo.push(b);
    return b;
  }

  // pincel del editor para un asset personalizado: vive en la fila de su
  // categoría junto a los pinceles de fábrica
  function agregarPincelAsset(def) {
    const fila = filasPorCategoria.get(def.categoria);
    if (!fila) return; // categoría desconocida (defensivo)
    const anterior = pincelesAssetPorTipo.get(def.tipo);
    if (anterior) anterior.remove();
    const b = crearBoton(ETIQUETAS_OBJETO[def.tipo], () => seleccionarPincel("objeto", def.tipo, b));
    fila.appendChild(b);
    pincelesAssetPorTipo.set(def.tipo, b);
  }

  // registra (o actualiza) un asset personalizado en todas las tablas del
  // juego: sprite, etiqueta, ficha, fauna y sólidos. No toca localStorage.
  function registrarAssetPersonalizado(def) {
    const ancho = def.frames[0][0].length, alto = def.frames[0].length;
    SPRITES[def.tipo] = {
      frames: [frameDesdeGrid(def.frames[0]), frameDesdeGrid(def.frames[1])],
      sombra: def.fauna ? Math.max(1, Math.round(Math.min(ancho, alto) * 0.3)) : 0,
    };
    ETIQUETAS_OBJETO[def.tipo] = (def.nombreComun || def.tipo).toUpperCase();
    FICHAS[def.tipo] = [def.nombreComun, def.nombreCientifico || "", def.emoji || "❓"];
    if (def.fauna) ESPECIES_FAUNA[def.tipo] = { ...def.fauna };
    else delete ESPECIES_FAUNA[def.tipo];
    if (def.categoria === "ESCENARIO" || def.categoria === "ÁRBOLES") OBJETOS_SOLIDOS.add(def.tipo);
    else OBJETOS_SOLIDOS.delete(def.tipo);
    // huella en celdas: un asset grande (p. ej. 64px = 4 celdas) ocupa y
    // bloquea varias celdas como los edificios de fábrica. La fauna se mueve,
    // así que se queda en 1x1 (su tamaño solo afecta al dibujo, no a la huella).
    const celdasW = Math.max(1, Math.round(ancho / PX)), celdasH = Math.max(1, Math.round(alto / PX));
    if (!def.fauna && (celdasW > 1 || celdasH > 1)) TAMANOS_OBJETO[def.tipo] = [celdasW, celdasH];
    else delete TAMANOS_OBJETO[def.tipo];
    agregarPincelAsset(def);
  }

  function persistirAssetsPersonalizados() {
    try { localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify([...assetsPersonalizados.values()])); } catch (e) {}
  }
  function cargarAssetsPersonalizados() {
    let lista = [];
    try {
      const raw = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (raw) lista = JSON.parse(raw);
    } catch (e) {}
    for (const def of lista) {
      if (!def || !def.tipo || !Array.isArray(def.frames)) continue;
      assetsPersonalizados.set(def.tipo, def);
      registrarAssetPersonalizado(def);
    }
    redibujarListaAssets();
  }
  function redibujarListaAssets() {
    if (!elListaAssets) return;
    elListaAssets.innerHTML = "";
    for (const def of assetsPersonalizados.values()) {
      const item = document.createElement("div");
      item.className = "ac-lista-item";
      const ficha = FICHAS[def.tipo] || [def.nombreComun, "", "❓"];
      const ancho = def.frames[0][0].length, alto = def.frames[0].length;
      const info = document.createElement("span");
      info.textContent = `${ficha[2]} ${ficha[0]} — ${def.categoria} · ${ancho}×${alto}`;
      const btnEditar = document.createElement("button");
      btnEditar.type = "button";
      btnEditar.textContent = "✎ editar";
      btnEditar.addEventListener("click", () => { if (cargarAssetEnEditor) cargarAssetEnEditor(def); });
      const btnBorrar = document.createElement("button");
      btnBorrar.type = "button";
      btnBorrar.textContent = "🗑 eliminar";
      btnBorrar.addEventListener("click", () => eliminarAssetPersonalizado(def.tipo));
      item.append(info, btnEditar, btnBorrar);
      elListaAssets.appendChild(item);
    }
  }
  function guardarAssetDefinicion(def) {
    registrarAssetPersonalizado(def);
    assetsPersonalizados.set(def.tipo, def);
    persistirAssetsPersonalizados();
    redibujarListaAssets();
  }
  function eliminarAssetPersonalizado(tipo) {
    const def = assetsPersonalizados.get(tipo);
    if (!def) return;
    if (!confirm(`¿Eliminar el asset "${def.nombreComun}"? Los objetos ya colocados en el mapa con ese tipo dejarán de dibujarse.`)) return;
    assetsPersonalizados.delete(tipo);
    delete SPRITES[tipo];
    delete ETIQUETAS_OBJETO[tipo];
    delete FICHAS[tipo];
    delete ESPECIES_FAUNA[tipo];
    delete TAMANOS_OBJETO[tipo];
    OBJETOS_SOLIDOS.delete(tipo);
    const btn = pincelesAssetPorTipo.get(tipo);
    if (btn) { btn.remove(); pincelesAssetPorTipo.delete(tipo); }
    if (pincel.tipo === "objeto" && pincel.valor === tipo) seleccionarPincel("mover", null, btnMover);
    persistirAssetsPersonalizados();
    recalcularOcupacion();
    redibujarListaAssets();
  }

  // construye la interfaz del lienzo de píxeles + formulario del nuevo asset
  function construirCreadorAsset(fila) {
    const cont = document.createElement("div");
    cont.className = "asset-creador";
    fila.appendChild(cont);

    // estado del lienzo: dos fotogramas para animar (caminar/aletear)
    let frames = [gridVacio(16, 16), gridVacio(16, 16)];
    let activeFrame = 0;
    let colorActual = AC_PALETA[0];
    let herramienta = "pincel"; // "pincel" | "borrar"
    let pintando = false;
    let escalaLienzo = 16, escalaPreview = 8; // px por celda en pantalla; los ajusta aplicarTamanoLienzo

    // -- tamaño de lienzo --
    const elAncho = document.createElement("input");
    elAncho.type = "number"; elAncho.min = "4"; elAncho.max = String(AC_MAX); elAncho.value = "16";
    const elAlto = document.createElement("input");
    elAlto.type = "number"; elAlto.min = "4"; elAlto.max = String(AC_MAX); elAlto.value = "16";
    const btnNuevo = document.createElement("button");
    btnNuevo.type = "button"; btnNuevo.textContent = "Lienzo nuevo";
    const btnRedim = document.createElement("button");
    btnRedim.type = "button"; btnRedim.textContent = "↔ Redimensionar";
    btnRedim.title = "Cambia el tamaño escalando el dibujo actual (para agrandar lo ya pintado)";

    const filaTamano = document.createElement("div");
    filaTamano.className = "ac-fila";
    filaTamano.append(campo("Ancho", elAncho), campo("Alto", elAlto), btnNuevo, btnRedim);
    cont.appendChild(filaTamano);

    // -- fotogramas y herramientas --
    const filaHerr = document.createElement("div");
    filaHerr.className = "ac-fila";
    const gFrames = [];
    const btnF1 = botonAlternable("Fotograma 1", gFrames, () => { activeFrame = 0; redibujarLienzo(); });
    const btnF2 = botonAlternable("Fotograma 2", gFrames, () => { activeFrame = 1; redibujarLienzo(); });
    btnF1.classList.add("activo");
    const gHerr = [];
    const btnPincel = botonAlternable("Pincel", gHerr, () => { herramienta = "pincel"; });
    const btnBorrar = botonAlternable("Borrar", gHerr, () => { herramienta = "borrar"; });
    btnPincel.classList.add("activo");
    filaHerr.append(btnF1, btnF2, btnPincel, btnBorrar);
    cont.appendChild(filaHerr);

    // -- paleta de colores --
    const filaPaleta = document.createElement("div");
    filaPaleta.className = "ac-fila";
    const elPaleta = document.createElement("div");
    elPaleta.className = "ac-paleta";
    const swatches = [];
    for (const clave of AC_PALETA) {
      const sw = document.createElement("div");
      sw.className = "ac-color";
      sw.style.background = PALETA[clave] || clave;
      sw.title = clave;
      sw.addEventListener("click", () => {
        colorActual = clave;
        herramienta = "pincel";
        for (const x of gHerr) x.classList.remove("activo");
        btnPincel.classList.add("activo");
        for (const s of swatches) s.classList.remove("activo");
        sw.classList.add("activo");
      });
      swatches.push(sw);
      elPaleta.appendChild(sw);
    }
    swatches[0].classList.add("activo");
    const elColorLibre = document.createElement("input");
    elColorLibre.type = "color";
    elColorLibre.value = "#8a5524";
    elColorLibre.title = "Color personalizado";
    elColorLibre.addEventListener("input", () => {
      colorActual = elColorLibre.value;
      herramienta = "pincel";
      for (const x of gHerr) x.classList.remove("activo");
      btnPincel.classList.add("activo");
      for (const s of swatches) s.classList.remove("activo");
    });
    filaPaleta.append(elPaleta, elColorLibre);
    cont.appendChild(filaPaleta);

    // -- lienzo principal + vista previa --
    const filaLienzo = document.createElement("div");
    filaLienzo.className = "ac-fila";
    const lienzo = document.createElement("canvas");
    lienzo.className = "ac-lienzo";
    const colPreview = document.createElement("div");
    colPreview.className = "ac-campo";
    const preview = document.createElement("canvas");
    preview.className = "ac-preview";
    const btnAnimar = document.createElement("button");
    btnAnimar.type = "button"; btnAnimar.textContent = "▶ Animar";
    colPreview.append(preview, btnAnimar);
    filaLienzo.append(lienzo, colPreview);
    cont.appendChild(filaLienzo);

    function aplicarTamanoLienzo() {
      const ancho = frames[0][0].length, alto = frames[0].length;
      const lado = Math.max(ancho, alto);
      // la escala por celda se adapta al tamaño: lienzos grandes (64) usan
      // celdas pequeñas para no desbordar el panel; pequeños (16) celdas grandes
      escalaLienzo = Math.max(4, Math.min(20, Math.floor(AC_LIENZO_PX / lado)));
      escalaPreview = Math.max(2, Math.min(10, Math.floor(AC_PREVIEW_PX / lado)));
      lienzo.width = ancho * escalaLienzo;
      lienzo.height = alto * escalaLienzo;
      preview.width = ancho * escalaPreview;
      preview.height = alto * escalaPreview;
    }
    function redibujarLienzo() {
      const grid = frames[activeFrame];
      const c = lienzo.getContext("2d");
      c.clearRect(0, 0, lienzo.width, lienzo.height);
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
          const clave = grid[y][x];
          c.fillStyle = clave ? (PALETA[clave] || clave) : "#3a2a1c";
          c.fillRect(x * escalaLienzo, y * escalaLienzo, escalaLienzo, escalaLienzo);
        }
      }
      if (escalaLienzo >= 7) { // rejilla solo si las celdas son visibles (no en lienzos grandes)
        c.strokeStyle = "rgba(255,255,255,0.08)";
        c.lineWidth = 1;
        for (let x = 0; x <= grid[0].length; x++) {
          c.beginPath(); c.moveTo(x * escalaLienzo + 0.5, 0); c.lineTo(x * escalaLienzo + 0.5, lienzo.height); c.stroke();
        }
        for (let y = 0; y <= grid.length; y++) {
          c.beginPath(); c.moveTo(0, y * escalaLienzo + 0.5); c.lineTo(lienzo.width, y * escalaLienzo + 0.5); c.stroke();
        }
      }
      if (!previewAnimando) redibujarPreview(); // la vista estática sigue al fotograma que editas
    }
    // la vista previa no parpadea por defecto: muestra fija el fotograma en
    // edición, y solo anima los dos al pulsar ▶ (botón de más abajo)
    let previewAnimando = false;
    let previewFrame = 0;
    let previewTimer = null;
    function redibujarPreview() {
      const grid = frames[previewAnimando ? previewFrame : activeFrame];
      const c = preview.getContext("2d");
      c.clearRect(0, 0, preview.width, preview.height);
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
          const clave = grid[y][x];
          if (!clave) continue;
          c.fillStyle = PALETA[clave] || clave;
          c.fillRect(x * escalaPreview, y * escalaPreview, escalaPreview, escalaPreview);
        }
      }
    }
    btnAnimar.addEventListener("click", () => {
      previewAnimando = !previewAnimando;
      btnAnimar.textContent = previewAnimando ? "⏸ Parar" : "▶ Animar";
      btnAnimar.classList.toggle("activo", previewAnimando);
      if (previewAnimando) {
        previewFrame = 0;
        previewTimer = setInterval(() => { previewFrame = (previewFrame + 1) % 2; redibujarPreview(); }, 400);
      } else {
        clearInterval(previewTimer);
        redibujarPreview(); // vuelve a mostrar el fotograma en edición
      }
    });

    function pintarEn(e) {
      const r = lienzo.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) * (lienzo.width / r.width) / escalaLienzo);
      const y = Math.floor((e.clientY - r.top) * (lienzo.height / r.height) / escalaLienzo);
      const grid = frames[activeFrame];
      if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return;
      grid[y][x] = herramienta === "borrar" ? null : colorActual;
      redibujarLienzo();
      redibujarPreview();
    }
    lienzo.style.touchAction = "none";
    lienzo.addEventListener("pointerdown", (e) => { pintando = true; pintarEn(e); e.preventDefault(); });
    lienzo.addEventListener("pointermove", (e) => { if (pintando) pintarEn(e); });
    window.addEventListener("pointerup", () => { pintando = false; });
    lienzo.addEventListener("pointercancel", () => { pintando = false; });

    function tamanoPedido() {
      return [
        Math.max(4, Math.min(AC_MAX, Math.round(numero(elAncho, 16)))),
        Math.max(4, Math.min(AC_MAX, Math.round(numero(elAlto, 16)))),
      ];
    }
    btnNuevo.addEventListener("click", () => {
      const [ancho, alto] = tamanoPedido();
      elAncho.value = ancho; elAlto.value = alto;
      frames = [gridVacio(ancho, alto), gridVacio(ancho, alto)];
      activeFrame = 0;
      for (const x of gFrames) x.classList.remove("activo"); btnF1.classList.add("activo");
      aplicarTamanoLienzo();
      redibujarLienzo();
      redibujarPreview();
    });
    btnRedim.addEventListener("click", () => {
      const [ancho, alto] = tamanoPedido();
      elAncho.value = ancho; elAlto.value = alto;
      frames = [escalarGrid(frames[0], ancho, alto), escalarGrid(frames[1], ancho, alto)];
      aplicarTamanoLienzo();
      redibujarLienzo();
      redibujarPreview();
    });

    aplicarTamanoLienzo();
    redibujarLienzo();
    redibujarPreview();

    // -- datos del asset --
    const h4Datos = document.createElement("h4");
    h4Datos.textContent = "DATOS DEL ASSET";
    cont.appendChild(h4Datos);

    const elCategoria = document.createElement("select");
    for (const [titulo] of CATEGORIAS_OBJETO) {
      const opt = document.createElement("option");
      opt.value = titulo; opt.textContent = titulo;
      elCategoria.appendChild(opt);
    }
    elCategoria.value = "INSECTOS";

    const elTipo = document.createElement("input");
    elTipo.type = "text"; elTipo.placeholder = "identificador único";
    const elEmoji = document.createElement("input");
    elEmoji.type = "text"; elEmoji.maxLength = 4; elEmoji.style.width = "44px"; elEmoji.placeholder = "🦋";
    const elNombre = document.createElement("input");
    elNombre.type = "text"; elNombre.placeholder = "p. ej. Mariposa azul";
    const elCientifico = document.createElement("input");
    elCientifico.type = "text"; elCientifico.placeholder = "p. ej. Polyommatus icarus";

    let tipoManual = false;
    elNombre.addEventListener("input", () => { if (!tipoManual) elTipo.value = slugify(elNombre.value); });
    elTipo.addEventListener("input", () => { tipoManual = true; });

    const filaDatos1 = document.createElement("div");
    filaDatos1.className = "ac-fila";
    filaDatos1.append(campo("Categoría", elCategoria), campo("Tipo (id)", elTipo), campo("Emoji", elEmoji));
    cont.appendChild(filaDatos1);

    const filaDatos2 = document.createElement("div");
    filaDatos2.className = "ac-fila";
    filaDatos2.append(campo("Nombre común", elNombre), campo("Nombre científico", elCientifico));
    cont.appendChild(filaDatos2);

    // -- comportamiento (solo ANIMALES / INSECTOS) --
    const elFauna = document.createElement("div");
    elFauna.className = "asset-creador";
    const h4Fauna = document.createElement("h4");
    h4Fauna.textContent = "COMPORTAMIENTO (animal/insecto)";
    elFauna.appendChild(h4Fauna);

    const elModo = document.createElement("select");
    for (const [v, t] of [["terrestre", "Terrestre"], ["volador", "Volador"]]) {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = t;
      elModo.appendChild(opt);
    }
    const elVel = document.createElement("input");
    elVel.type = "number"; elVel.step = "0.1"; elVel.min = "0"; elVel.value = "2";
    const elRadio = document.createElement("input");
    elRadio.type = "number"; elRadio.step = "0.5"; elRadio.min = "0"; elRadio.value = "6";
    const elProb = document.createElement("input");
    elProb.type = "number"; elProb.step = "0.01"; elProb.min = "0"; elProb.max = "1"; elProb.value = "0.2";
    const elMax = document.createElement("input");
    elMax.type = "number"; elMax.step = "1"; elMax.min = "0"; elMax.value = "2";
    const elVidaMin = document.createElement("input");
    elVidaMin.type = "number"; elVidaMin.step = "1"; elVidaMin.min = "0"; elVidaMin.value = "30";
    const elVidaMax = document.createElement("input");
    elVidaMax.type = "number"; elVidaMax.step = "1"; elVidaMax.min = "0"; elVidaMax.value = "70";
    const elEsperaMin = document.createElement("input");
    elEsperaMin.type = "number"; elEsperaMin.step = "0.5"; elEsperaMin.min = "0"; elEsperaMin.value = "1";
    const elEsperaMax = document.createElement("input");
    elEsperaMax.type = "number"; elEsperaMax.step = "0.5"; elEsperaMax.min = "0"; elEsperaMax.value = "5";
    const elAgua = document.createElement("input");
    elAgua.type = "checkbox";
    const elAlturaMax = document.createElement("input");
    elAlturaMax.type = "number"; elAlturaMax.step = "0.1"; elAlturaMax.min = "0"; elAlturaMax.value = "1.6";

    const filaFauna1 = document.createElement("div");
    filaFauna1.className = "ac-fila";
    filaFauna1.append(campo("Modo", elModo), campo("Velocidad", elVel), campo("Radio de paseo", elRadio));
    const filaFauna2 = document.createElement("div");
    filaFauna2.className = "ac-fila";
    filaFauna2.append(campo("Rareza (0-1)", elProb), campo("Máximo a la vez", elMax), campo("Junto al agua", elAgua));
    const filaFauna3 = document.createElement("div");
    filaFauna3.className = "ac-fila";
    filaFauna3.append(campo("Vida mín (s)", elVidaMin), campo("Vida máx (s)", elVidaMax),
      campo("Espera mín (s)", elEsperaMin), campo("Espera máx (s)", elEsperaMax));
    const filaFauna4 = document.createElement("div");
    filaFauna4.className = "ac-fila";
    const campoAltura = campo("Altura máx. vuelo", elAlturaMax);
    filaFauna4.append(campoAltura);
    elFauna.append(filaFauna1, filaFauna2, filaFauna3, filaFauna4);

    elModo.addEventListener("change", () => {
      campoAltura.style.display = elModo.value === "volador" ? "" : "none";
    });
    campoAltura.style.display = "none";

    function actualizarVisibilidadFauna() {
      const esFauna = elCategoria.value === "ANIMALES" || elCategoria.value === "INSECTOS";
      elFauna.style.display = esFauna ? "flex" : "none";
    }
    elCategoria.addEventListener("change", actualizarVisibilidadFauna);
    actualizarVisibilidadFauna();
    cont.appendChild(elFauna);

    // carga un asset guardado de vuelta en el pintor para seguir editándolo
    // (recupera lienzo, fotogramas y todos los campos del formulario)
    cargarAssetEnEditor = function (def) {
      const val = (x, d) => (x === undefined || x === null ? d : x);
      frames = [clonarGrid(def.frames[0]), clonarGrid(def.frames[1] || def.frames[0])];
      elAncho.value = def.frames[0][0].length;
      elAlto.value = def.frames[0].length;
      activeFrame = 0;
      for (const x of gFrames) x.classList.remove("activo");
      btnF1.classList.add("activo");
      aplicarTamanoLienzo();
      redibujarLienzo();
      redibujarPreview();
      elCategoria.value = def.categoria;
      elTipo.value = def.tipo; tipoManual = true;
      elEmoji.value = def.emoji || "";
      elNombre.value = def.nombreComun || "";
      elCientifico.value = def.nombreCientifico || "";
      const fn = def.fauna;
      if (fn) {
        elModo.value = fn.modo || "terrestre";
        elVel.value = val(fn.vel, 2);
        elRadio.value = val(fn.radio, 6);
        elProb.value = val(fn.prob, 0.2);
        elMax.value = val(fn.max, 2);
        elVidaMin.value = val(fn.vida && fn.vida[0], 30);
        elVidaMax.value = val(fn.vida && fn.vida[1], 70);
        elEsperaMin.value = val(fn.espera && fn.espera[0], 1);
        elEsperaMax.value = val(fn.espera && fn.espera[1], 5);
        elAgua.checked = !!fn.agua;
        elAlturaMax.value = val(fn.alturaMax, 1.6);
      }
      campoAltura.style.display = (fn && fn.modo === "volador") ? "" : "none";
      actualizarVisibilidadFauna();
      lienzo.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // -- lectura del formulario: construye la definición completa del asset --
    function leerFormularioAsset() {
      const nombreComun = elNombre.value.trim();
      const tipo = slugify(elTipo.value.trim() || nombreComun);
      if (!nombreComun || !tipo) { alert("Ponle un nombre al asset."); return null; }
      if (gridVacioDel(frames[0])) { alert("Dibuja algo en el lienzo (fotograma 1) antes de continuar."); return null; }
      elTipo.value = tipo;
      let f1 = clonarGrid(frames[1]);
      if (gridVacioDel(f1)) f1 = clonarGrid(frames[0]); // sin 2º fotograma: estático, sin parpadeo

      const categoria = elCategoria.value;
      const esFauna = categoria === "ANIMALES" || categoria === "INSECTOS";
      let fauna = null;
      if (esFauna) {
        fauna = {
          modo: elModo.value,
          vel: numero(elVel, 2),
          radio: numero(elRadio, 5),
          prob: Math.min(1, Math.max(0, numero(elProb, 0.2))),
          max: Math.max(0, Math.round(numero(elMax, 2))),
          vida: [numero(elVidaMin, 30), numero(elVidaMax, 70)],
          espera: [numero(elEsperaMin, 1), numero(elEsperaMax, 5)],
          agua: elAgua.checked,
        };
        if (fauna.modo === "volador") fauna.alturaMax = numero(elAlturaMax, 1.6);
      }
      return {
        tipo, categoria, nombreComun,
        nombreCientifico: elCientifico.value.trim(),
        emoji: elEmoji.value.trim() || "❓",
        frames: [clonarGrid(frames[0]), f1],
        fauna,
      };
    }

    // -- botones de acción --
    const filaBotones = document.createElement("div");
    filaBotones.className = "ac-fila";
    const btnCrear = document.createElement("button");
    btnCrear.type = "button"; btnCrear.textContent = "✔ Crear / actualizar asset";
    const btnExportar = document.createElement("button");
    btnExportar.type = "button"; btnExportar.textContent = "⇩ Exportar JSON";
    filaBotones.append(btnCrear, btnExportar);
    cont.appendChild(filaBotones);

    const elJsonAsset = document.createElement("textarea");
    elJsonAsset.placeholder = "JSON del asset (botón Exportar)";
    elJsonAsset.rows = 4;
    cont.appendChild(elJsonAsset);

    btnCrear.addEventListener("click", () => {
      const def = leerFormularioAsset();
      if (!def) return;
      const esPersonalizado = assetsPersonalizados.has(def.tipo);
      if (!esPersonalizado && TIPOS_OBJETO.includes(def.tipo)) {
        alert(`Ya existe un objeto del juego con el identificador "${def.tipo}". Cambia el nombre o el "Tipo (id)".`);
        return;
      }
      guardarAssetDefinicion(def);
      const b = pincelesAssetPorTipo.get(def.tipo);
      if (b) seleccionarPincel("objeto", def.tipo, b);
      alert(`Asset "${def.nombreComun}" ${esPersonalizado ? "actualizado" : "creado"}. Ya puedes colocarlo en el mapa: el pincel está seleccionado.`);
    });
    btnExportar.addEventListener("click", () => {
      const def = leerFormularioAsset();
      if (!def) return;
      elJsonAsset.value = JSON.stringify(def, null, 1);
      elJsonAsset.select();
    });

    // -- lista de assets personalizados ya guardados --
    const h4Lista = document.createElement("h4");
    h4Lista.textContent = "ASSETS PERSONALIZADOS";
    cont.appendChild(h4Lista);
    elListaAssets = document.createElement("div");
    elListaAssets.className = "ac-lista";
    cont.appendChild(elListaAssets);
  }
  crearCategoria("✚ NUEVO ASSET", construirCreadorAsset);

  document.getElementById("btn-exportar").addEventListener("click", () => {
    elJson.value = JSON.stringify(mapa, null, 1);
  });
  document.getElementById("btn-importar").addEventListener("click", () => {
    try {
      const datos = JSON.parse(elJson.value);
      if (!Array.isArray(datos.objetos) || typeof datos.terreno !== "object") throw new Error("formato inválido");
      mapa = datos;
      recalcularOcupacion();
      reconstruirMundo();
      guardarMapa();
    } catch (err) {
      alert("JSON no válido: " + err.message);
    }
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("¿Reiniciar el mapa a los valores por defecto? OJO: el mapa es compartido, esto lo reinicia para TODOS.")) return;
    mapa = mapaDefecto();
    recalcularOcupacion();
    reconstruirMundo();
    guardarMapa();
  });

  // El editor requiere credencial: SHA-256(contraseña + "_fkiv26") debe
  // coincidir con _admin/hash en Firebase (mismo mecanismo que datos/notas).
  let editorDesbloqueado = sessionStorage.getItem("finkafarm-editor-ok") === "1";
  const elModalEditor = document.getElementById("modal-editor");
  const elPwEditor = document.getElementById("input-pw-editor");
  const elErrorPw = document.getElementById("error-pw-editor");

  async function hashPw(pw) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw + "_fkiv26"));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function comprobarPwEditor() {
    elErrorPw.textContent = "";
    try {
      const hash = await hashPw(elPwEditor.value);
      const snap = await firebase.database().ref("_admin/hash").once("value");
      if (snap.val() && snap.val() === hash) {
        editorDesbloqueado = true;
        try { sessionStorage.setItem("finkafarm-editor-ok", "1"); } catch (e) {}
        elModalEditor.classList.remove("activo");
        elPwEditor.value = "";
        abrirCerrarEditor();
      } else {
        elErrorPw.textContent = "Contraseña incorrecta.";
      }
    } catch (e) {
      elErrorPw.textContent = "No se pudo comprobar. ¿Sin conexión?";
    }
  }
  document.getElementById("btn-pw-entrar").addEventListener("click", comprobarPwEditor);
  document.getElementById("btn-pw-cancelar").addEventListener("click", () => {
    elModalEditor.classList.remove("activo");
    elPwEditor.value = "";
    elErrorPw.textContent = "";
  });
  elPwEditor.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") comprobarPwEditor();
    if (e.key === "Escape") elModalEditor.classList.remove("activo");
  });

  function abrirCerrarEditor() {
    modo = modo === "editor" ? "jugar" : "editor";
    elEditorPanel.classList.toggle("activo", modo === "editor");
    document.body.classList.toggle("modo-editor", modo === "editor");
    document.getElementById("chat-bar").style.display = modo === "editor" ? "none" : "flex";
    if (modo === "editor") camara.libre = true;
    else if (esMovil) camara.libre = false; // al cerrar el editor, volver al personaje
  }
  function toggleEditor() {
    if (modo !== "editor" && !editorDesbloqueado) {
      elModalEditor.classList.add("activo");
      elPwEditor.focus();
      return;
    }
    abrirCerrarEditor();
  }
  document.getElementById("btn-cerrar-editor").addEventListener("click", toggleEditor);

  // ── entrada secreta al editor ──────────────────────────────────────────
  // No hay botón ni tecla: se entra con doble click/toque sobre el pino del
  // exterior en la celda (110,59), junto a la valla este. El doble toque
  // abre el modal de contraseña (o el editor directamente si ya está
  // desbloqueado en esta sesión).
  const PINO_SECRETO = { col: 110, fila: 59 };
  let ultimoToquePino = 0;
  function esToqueEnPinoSecreto(x, y) {
    const [colF, filaF] = pantallaACelda(x, y);
    const fr = SPRITES.pino.frames[0];
    const anchoC = fr.ancho / PX, altoC = fr.alto / PX; // tamaño del sprite en celdas
    const cx = PINO_SECRETO.col + 0.5, base = PINO_SECRETO.fila + 1; // anclado abajo-centro
    return Math.abs(colF - cx) <= anchoC / 2 + 0.3 &&
      filaF >= base - altoC - 0.3 && filaF <= base + 0.3;
  }
  function detectarToquePino(e) {
    if (modo !== "jugar" || punteros.size !== 1) return;
    if (!esToqueEnPinoSecreto(e.clientX, e.clientY)) { ultimoToquePino = 0; return; }
    const ahora = performance.now();
    if (ahora - ultimoToquePino < 600) { ultimoToquePino = 0; toggleEditor(); }
    else ultimoToquePino = ahora;
  }

  // ── personajes online ──────────────────────────────────────────────────
  // Cada visitante es un personaje con nombre y aspecto aleatorio (único
  // entre los conectados). Presencia en finkafarm/online/<idJugador>.
  //
  // Identidad: idJugador persiste en localStorage → un solo personaje por
  // navegador aunque se abran varias pestañas; sesionId es único por pestaña
  // y la última que entra se queda con el personaje (las demás pasan a
  // espera con un aviso). La presencia se retira al ocultar/cerrar la
  // página (visibilitychange/pagehide) además del onDisconnect del
  // servidor, y siempre se escribe con set() completo: así no quedan nodos
  // a medias (los famosos "?"). Las presencias sin latido reciente no se
  // dibujan y las muy viejas las purga cualquier cliente.
  const PIELES = [
    "#efc296", "#d8a87c", "#a8744a", "#7a4f2c", // tonos humanos
    "#7ddb6a", "#f0a8c0", "#7ab8f0", "#c89af0", // verde, rosa, azul, lila
    "#f0d860", "#f08a5a", "#9af0d8", "#e06a6a", // amarillo, naranja, menta, rojo
  ];
  const PELOS = ["#5c3a22", "#2b2724", "#f2cf4e", "#e04848", "#8a55b0", "#3e7ca6", "#f7f3e8", "#3a7d44", "#f08ab8", "#e8923c"];
  const CAMISAS = ["#3e7ca6", "#e04848", "#3a7d44", "#f2cf4e", "#8a55b0", "#e8923c", "#2b2724", "#f0a8c0", "#26a69a", "#7a4f9e"];
  const PANTALONES = ["#54422e", "#2e4a66", "#3a3833", "#6e3434", "#3e5e3a", "#5a4a7a"];

  function oscurecer(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * factor);
    const v = Math.round(((n >> 8) & 255) * factor);
    const b = Math.round((n & 255) * factor);
    return "#" + ((r << 16) | (v << 8) | b).toString(16).padStart(6, "0");
  }
  function aspectoAleatorio() {
    const el = (a) => a[Math.floor(Math.random() * a.length)];
    return { piel: el(PIELES), pelo: el(PELOS), camisa: el(CAMISAS), pantalon: el(PANTALONES), peinado: el(PEINADOS) };
  }
  function coloresDeAspecto(a) {
    return {
      piel: a.piel, piel_d: oscurecer(a.piel, 0.8), pelo: a.pelo,
      camisa: a.camisa, camisa_d: oscurecer(a.camisa, 0.75),
      pantalon: a.pantalon, bota: oscurecer(a.pantalon, 0.6),
    };
  }

  let miAspecto = aspectoAleatorio();
  let spritesYo = crearSpritesJugador(coloresDeAspecto(miAspecto), miAspecto.peinado);
  let miNombre = "";
  let miMensaje = null;

  function idAleatorio(prefijo) {
    return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  const sesionId = idAleatorio("s");
  let idJugador = null;
  try {
    idJugador = localStorage.getItem("finkafarm-id");
    if (!idJugador) { idJugador = idAleatorio("j"); localStorage.setItem("finkafarm-id", idJugador); }
  } catch (e) {}
  if (!idJugador) idJugador = idAleatorio("j");

  let refYo = null;
  let refOnline = null;
  let presenciaActiva = false; // esta pestaña es la dueña del personaje
  let offsetServidor = 0;      // desfase reloj local ↔ servidor, para caducar presencias
  try {
    if (window.firebase && firebase.database) {
      refOnline = firebase.database().ref("finkafarm/online");
      firebase.database().ref(".info/serverTimeOffset").on("value", (s) => { offsetServidor = s.val() || 0; });
    }
  } catch (e) {}
  const otros = new Map(); // id → estado del jugador remoto (+pos interpolada)

  const INACTIVO_MS = 90000;  // sin latido (cada 30 s) en este tiempo → no se dibuja
  const ZOMBI_MS = 150000;    // más viejo todavía → cualquier cliente lo borra de la base

  function datosPresencia() {
    return {
      nombre: miNombre, aspecto: miAspecto, sesion: sesionId,
      x: +jugador.x.toFixed(2), y: +jugador.y.toFixed(2),
      dir: jugador.dir, espejo: jugador.espejo, moviendo: jugador.moviendo,
      mensaje: miMensaje || null,
      ts: firebase.database.ServerValue.TIMESTAMP,
    };
  }
  // set() completo siempre: un nodo de presencia existe entero o no existe
  function publicarPresencia() {
    if (!refYo || !miNombre) return;
    refYo.onDisconnect().remove();
    refYo.set(datosPresencia()).catch(() => {});
    ultimoEnviado = "";
  }
  function retirarPresencia() {
    if (!refYo) return;
    try { refYo.remove(); } catch (e) {}
  }

  // ── aviso de expulsión / sesión en otra pestaña ──
  const elModalAviso = document.getElementById("modal-aviso");
  const elAvisoTitulo = document.getElementById("aviso-titulo");
  const elAvisoTexto = document.getElementById("aviso-texto");
  const btnAvisoVolver = document.getElementById("btn-aviso-volver");

  function pasarAEspera(motivo) {
    presenciaActiva = false;
    if (motivo === "expulsado") {
      retirarPresencia();
      elAvisoTitulo.textContent = "TE HAN SACADO DE LA FINKA";
      elAvisoTexto.textContent = "La organización te ha desconectado. Puedes volver a entrar cuando quieras… portándote bien.";
      btnAvisoVolver.textContent = "VOLVER A ENTRAR →";
    } else {
      // el personaje se lo ha quedado otra pestaña: NO borrar el nodo, ya no es nuestro
      elAvisoTitulo.textContent = "FINKA ABIERTA EN OTRA PESTAÑA";
      elAvisoTexto.textContent = "Has abierto el juego en otra pestaña o ventana y tu personaje se ha ido allí.";
      btnAvisoVolver.textContent = "JUGAR AQUÍ →";
    }
    elModalAviso.classList.add("activo");
  }
  btnAvisoVolver.addEventListener("click", () => {
    elModalAviso.classList.remove("activo");
    presenciaActiva = true;
    publicarPresencia();
  });

  function entrarOnline(nombre) {
    miNombre = nombre;
    if (!refOnline) return;
    refYo = refOnline.child(idJugador);
    presenciaActiva = true;

    refOnline.once("value").then((snap) => {
      // aspecto único entre los conectados
      const conectados = snap.val() || {};
      const usados = new Set(Object.keys(conectados).filter((id) => id !== idJugador)
        .map((id) => JSON.stringify(conectados[id].aspecto || {})));
      let intentos = 0;
      while (usados.has(JSON.stringify(miAspecto)) && intentos++ < 40) miAspecto = aspectoAleatorio();
      spritesYo = crearSpritesJugador(coloresDeAspecto(miAspecto), miAspecto.peinado);
      publicarPresencia();
    }).catch(() => publicarPresencia());

    // tras una reconexión el servidor pudo habernos borrado (onDisconnect):
    // volver a publicar el estado completo y re-armar el onDisconnect
    try {
      firebase.database().ref(".info/connected").on("value", (s) => {
        if (s.val() && presenciaActiva && !document.hidden) publicarPresencia();
      });
    } catch (e) {}

    // vigilar nuestro propio nodo: expulsiones, robo de sesión por otra
    // pestaña, o borrado por error (purga de zombis) → reaparecer entero
    refYo.on("value", (snap) => {
      if (!presenciaActiva) return;
      const v = snap.val();
      if (!v) { if (!document.hidden) publicarPresencia(); return; }
      if (v.expulsado) { pasarAEspera("expulsado"); return; }
      if (v.sesion && v.sesion !== sesionId) pasarAEspera("otraPestana");
    });

    setInterval(sincronizarYo, 150);
    setInterval(() => {
      if (presenciaActiva && refYo && !document.hidden) {
        refYo.update({ ts: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
      }
    }, 30000);
  }

  // al ocultar la página (cambiar de app en el móvil, minimizar, cerrar)
  // el personaje se retira al instante; al volver, reaparece donde estaba.
  // onDisconnect queda como red de seguridad, no como único mecanismo.
  document.addEventListener("visibilitychange", () => {
    if (!presenciaActiva || !refYo) return;
    if (document.hidden) retirarPresencia();
    else publicarPresencia();
  });
  window.addEventListener("pagehide", () => {
    if (presenciaActiva) retirarPresencia();
  });

  let ultimoEnviado = "";
  function sincronizarYo() {
    if (!refYo || !presenciaActiva || document.hidden) return;
    const datos = {
      x: +jugador.x.toFixed(2), y: +jugador.y.toFixed(2),
      dir: jugador.dir, espejo: jugador.espejo, moviendo: jugador.moviendo,
    };
    const firma = JSON.stringify(datos);
    if (firma === ultimoEnviado) return;
    ultimoEnviado = firma;
    refYo.update(datos).catch(() => {});
  }

  if (refOnline) {
    refOnline.on("value", (snap) => {
      const v = snap.val() || {};
      const ahora = Date.now() + offsetServidor;
      for (const id of Object.keys(v)) {
        if (id === idJugador) continue;
        const p = v[id];
        // nodos a medias (sin nombre/aspecto), expulsados o sin latido
        // reciente: no se dibujan; los muy viejos se purgan de la base
        const incompleto = !p || !p.nombre || !p.aspecto;
        const inactivo = !p || !p.ts || ahora - p.ts > INACTIVO_MS;
        if (incompleto || inactivo || p.expulsado) {
          otros.delete(id);
          if (incompleto || !p.ts || ahora - p.ts > ZOMBI_MS) refOnline.child(id).remove().catch(() => {});
          continue;
        }
        let o = otros.get(id);
        if (!o) { o = { rx: p.x, ry: p.y }; otros.set(id, o); }
        const aspectoJson = JSON.stringify(p.aspecto || {});
        if (o.aspectoJson !== aspectoJson) {
          o.aspectoJson = aspectoJson;
          const asp = p.aspecto || aspectoAleatorio();
          o.sprites = crearSpritesJugador(coloresDeAspecto(asp), asp.peinado);
        }
        o.nombre = p.nombre || "?";
        o.x = p.x; o.y = p.y;
        o.ts = p.ts;
        o.dir = p.dir || "abajo"; o.espejo = !!p.espejo; o.moviendo = !!p.moviendo;
        o.mensaje = p.mensaje || null;
      }
      for (const id of [...otros.keys()]) if (!v[id]) otros.delete(id);
    });

    // barrido periódico por si nadie escribe en la base (p. ej. solo queda
    // un zombi): caducar y purgar presencias sin latido
    setInterval(() => {
      const ahora = Date.now() + offsetServidor;
      for (const [id, o] of [...otros]) {
        if (o.ts && ahora - o.ts > INACTIVO_MS) {
          otros.delete(id);
          refOnline.child(id).remove().catch(() => {});
        }
      }
    }, 20000);
  }

  // ── expulsar desde el editor ──
  function personaEn(colF, filaF) {
    let mejor = null, mejorDist = 0.75; // radio de click en celdas
    for (const [id, o] of otros) {
      const d = Math.hypot(o.rx - colF, o.ry - filaF);
      if (d < mejorDist) { mejorDist = d; mejor = { id, nombre: o.nombre }; }
    }
    return mejor;
  }
  function expulsarPersona(id) {
    if (!refOnline) return;
    // la marca avisa a su cliente (que se retira y ve el aviso); el borrado
    // diferido limpia el nodo aunque ese cliente ya no responda
    refOnline.child(id).update({ expulsado: true }).catch(() => {});
    setTimeout(() => refOnline.child(id).remove().catch(() => {}), 1500);
    otros.delete(id);
  }

  // ── fichas de especies: nombre común + nombre científico ──────────────
  const FICHAS = {
    pino: ["Pino silvestre", "Pinus sylvestris", "🌲"],
    roble: ["Roble melojo", "Quercus pyrenaica", "🌳"],
    encina: ["Encina", "Quercus ilex", "🌳"],
    olivo: ["Olivo", "Olea europaea", "🫒"],
    manzano: ["Manzano", "Malus domestica", "🍎"],
    peral: ["Peral", "Pyrus communis", "🍐"],
    cerezo: ["Cerezo", "Prunus avium", "🍒"],
    ciruelo: ["Ciruelo", "Prunus domestica", "🌳"],
    endrino: ["Endrino", "Prunus spinosa", "🌿"],
    pistacho: ["Pistacho", "Pistacia vera", "🌳"],
    nogal: ["Nogal", "Juglans regia", "🌳"],
    almendro: ["Almendro", "Prunus dulcis", "🌸"],
    castano: ["Castaño", "Castanea sativa", "🌰"],
    arandano: ["Arándano", "Vaccinium corymbosum", "🫐"],
    lavanda: ["Lavanda", "Lavandula angustifolia", "💜"],
    fresa: ["Fresa", "Fragaria × ananassa", "🍓"],
    flores: ["Flores silvestres", "varias especies", "🌼"],
    retama: ["Retama escoba", "Cytisus scoparius", "🌼"],
    espino: ["Espino albar", "Crataegus monogyna", "🌳"],
    zarza: ["Zarzamora", "Rubus ulmifolius", "🫐"],
    amapola: ["Amapola", "Papaver rhoeas", "🌺"],
    tomillo: ["Tomillo salsero", "Thymus zygis", "🌿"],
    romero: ["Romero", "Salvia rosmarinus", "🌿"],
    gallina: ["Gallina", "Gallus gallus domesticus", "🐔"],
    oveja_negra: ["Oveja negra", "Ovis aries", "🐑"],
    gorrion: ["Gorrión común", "Passer domesticus", "🐦"],
    urraca: ["Urraca", "Pica pica", "🐦‍⬛"],
    abubilla: ["Abubilla", "Upupa epops", "🐦"],
    ciguena: ["Cigüeña blanca", "Ciconia ciconia", "🦢"],
    perdiz: ["Perdiz roja", "Alectoris rufa", "🐦"],
    lagartija: ["Lagartija roquera", "Podarcis muralis", "🦎"],
    lagarto: ["Lagarto ocelado", "Timon lepidus", "🦎"],
    culebra: ["Culebra de escalera", "Zamenis scalaris", "🐍"],
    rana: ["Rana común", "Pelophylax perezi", "🐸"],
    sapo: ["Sapo común", "Bufo spinosus", "🐸"],
    sapo_corredor: ["Sapo corredor", "Epidalea calamita", "🐸"],
    aguila: ["Águila calzada", "Hieraaetus pennatus", "🦅"],
    libelula: ["Libélula emperador", "Anax imperator", "🪰"],
    oruga: ["Oruga de la col", "Pieris brassicae (larva)", "🐛"],
    mariquita: ["Mariquita de siete puntos", "Coccinella septempunctata", "🐞"],
    sanjuanero: ["Escarabajo sanjuanero", "Melolontha melolontha", "🪲"],
    liebre: ["Liebre ibérica", "Lepus granatensis", "🐇"],
    zorro: ["Zorro rojo", "Vulpes vulpes", "🦊"],
    gineta: ["Gineta", "Genetta genetta", "🐾"],
    comadreja: ["Comadreja", "Mustela nivalis", "🐾"],
  };

  const elFicha = document.getElementById("ficha");
  let timerFicha = null;
  let fichaVisible = false;
  function mostrarFicha(tipo) {
    const fi = FICHAS[tipo];
    if (!fi) return;
    document.getElementById("ficha-icono").textContent = fi[2];
    document.getElementById("ficha-nombre").textContent = fi[0];
    document.getElementById("ficha-latin").textContent = fi[1];
    elFicha.classList.add("activo");
    fichaVisible = true;
    // se va sola a los 5 s (o antes, si el personaje se mueve)
    clearTimeout(timerFicha);
    timerFicha = setTimeout(ocultarFicha, 5000);
  }
  function ocultarFicha() {
    if (!fichaVisible) return;
    clearTimeout(timerFicha);
    elFicha.classList.remove("activo");
    fichaVisible = false;
  }
  elFicha.addEventListener("click", ocultarFicha);
  // la misma ventanita sirve para leer los letreros de la peña
  function mostrarLetrero(obj) {
    document.getElementById("ficha-icono").textContent = "🪧";
    document.getElementById("ficha-nombre").textContent = obj.texto || "(sin texto)";
    document.getElementById("ficha-latin").textContent = obj.nombre ? "letrero de " + obj.nombre : "letrero anónimo";
    elFicha.classList.add("activo");
    fichaVisible = true;
    clearTimeout(timerFicha);
    timerFicha = setTimeout(ocultarFicha, 5000);
  }

  // ── fauna: aves, reptiles, anfibios e insectos de la zona, a su bola ───
  // Cada bicho tiene una querencia (cx, cy) y un radio: alterna pausas con
  // paseos a puntos aleatorios alrededor de ella, siempre DENTRO de la
  // finca (nunca al arbolado exterior). Hay bichos anclados a un objeto del
  // mapa colocado con el editor (rondan ese punto y no se van), y bichos
  // libres ESPORÁDICOS: cada ~5 s se tira el dado por especie (prob =
  // rareza, max = tope simultáneo) y los que salen viven `vida` segundos y
  // luego se marchan (las aves alzan el vuelo, el resto se escabulle).
  // radio = radio de paseo; agua = vive junto al agua; alturaMax = vuelo.
  const ESPECIES_FAUNA = {
    gorrion: { max: 5, prob: 0.50, vida: [40, 90], modo: "volador", vel: 7, espera: [2, 7], radio: 60 },
    urraca: { max: 3, prob: 0.30, vida: [30, 80], modo: "volador", vel: 8, espera: [3, 9], radio: 60 },
    abubilla: { max: 2, prob: 0.20, vida: [25, 60], modo: "volador", vel: 6.5, espera: [4, 10], radio: 60 },
    ciguena: { max: 2, prob: 0.20, vida: [30, 70], modo: "volador", vel: 5.5, espera: [6, 14], radio: 60 },
    perdiz: { max: 3, prob: 0.20, vida: [30, 80], modo: "terrestre", vel: 2.4, espera: [2, 6], radio: 6 },
    lagartija: { max: 4, prob: 0.40, vida: [30, 90], modo: "terrestre", vel: 3.6, espera: [1, 4], radio: 5 },
    lagarto: { max: 2, prob: 0.20, vida: [25, 60], modo: "terrestre", vel: 2.0, espera: [3, 8], radio: 5 },
    culebra: { max: 3, prob: 0.20, vida: [25, 60], modo: "terrestre", vel: 1.3, espera: [4, 9], radio: 6 },
    liebre: { max: 2, prob: 0.20, vida: [20, 50], modo: "terrestre", vel: 6, espera: [2, 7], radio: 9 },
    zorro: { max: 1, prob: 0.04, vida: [25, 50], modo: "terrestre", vel: 3.2, espera: [2, 6], radio: 10 },
    gineta: { max: 1, prob: 0.04, vida: [20, 45], modo: "terrestre", vel: 3.0, espera: [2, 6], radio: 7 },
    comadreja: { max: 2, prob: 0.07, vida: [20, 45], modo: "terrestre", vel: 4.0, espera: [1, 4], radio: 5 },
    gallina: { max: 0, prob: 0, modo: "terrestre", vel: 1.2, espera: [1, 5], radio: 2.5 },
    oveja_negra: { max: 0, prob: 0, modo: "terrestre", vel: 1.0, espera: [2, 8], radio: 3 },
    rana: { max: 3, prob: 0.35, vida: [40, 90], modo: "terrestre", vel: 2.5, espera: [2, 6], radio: 2.5, agua: true },
    sapo: { max: 2, prob: 0.20, vida: [40, 80], modo: "terrestre", vel: 1.2, espera: [3, 9], radio: 2.5, agua: true },
    sapo_corredor: { max: 2, prob: 0.20, vida: [35, 75], modo: "terrestre", vel: 3.0, espera: [1, 4], radio: 4, agua: true },
    aguila: { max: 1, prob: 0.10, vida: [25, 60], modo: "volador", vel: 7.5, espera: [5, 12], radio: 60, alturaMax: 2.6 },
    libelula: { max: 4, prob: 0.40, vida: [30, 70], modo: "volador", vel: 5, espera: [1, 3], radio: 4, agua: true, alturaMax: 0.5 },
    oruga: { max: 5, prob: 0.30, vida: [60, 120], modo: "terrestre", vel: 0.5, espera: [2, 6], radio: 1.5 },
    mariquita: { max: 2, prob: 0.35, vida: [40, 90], modo: "terrestre", vel: 0.8, espera: [1, 4], radio: 2 },
    sanjuanero: { max: 4, prob: 0.25, vida: [40, 90], modo: "terrestre", vel: 0.7, espera: [1, 4], radio: 2 },
  };
  const fauna = [];
  const faunaPorId = new Map(); // id de objeto del mapa → bicho anclado

  function crearBicho(especie, x, y, anclado) {
    const def = ESPECIES_FAUNA[especie];
    const b = {
      especie, x, y, tx: x, ty: y, cx: x, cy: y, radio: def.radio,
      estado: "quieto", espera: 1 + Math.random() * 6,
      espejo: Math.random() < 0.5, altura: 0, anclado: anclado || null,
    };
    fauna.push(b);
    return b;
  }

  function celdaFaunaAleatoria() {
    for (let i = 0; i < 200; i++) {
      const c = 2 + Math.floor(Math.random() * (COLS - 4));
      const f = 2 + Math.floor(Math.random() * (FILAS - 4));
      if (transitable(c, f)) return [c + 0.5, f + 0.5];
    }
    return [jugador.x + 2, jugador.y + 2];
  }
  // orilla o lámina de agua para los bichos acuáticos libres
  function puntoDeAgua(enTierra) {
    if (!celdasAgua.length) return null;
    for (let i = 0; i < 60; i++) {
      const [c, f] = celdasAgua[Math.floor(Math.random() * celdasAgua.length)];
      if (!enTierra) return [c + 0.5, f + 0.5];
      const vecinos = [[c + 1, f], [c - 1, f], [c, f + 1], [c, f - 1]];
      const [vc, vf] = vecinos[Math.floor(Math.random() * 4)];
      if (transitable(vc, vf)) return [vc + 0.5, vf + 0.5];
    }
    return null;
  }
  // tirada de aparición: cada especie sale según su rareza, hasta su tope
  function pasoAparicion(factor = 1) {
    const cuenta = {};
    for (const b of fauna) if (!b.anclado) cuenta[b.especie] = (cuenta[b.especie] || 0) + 1;
    for (const [especie, def] of Object.entries(ESPECIES_FAUNA)) {
      if (!def.max || (cuenta[especie] || 0) >= def.max) continue;
      if (Math.random() > def.prob * factor) continue;
      const p = def.agua ? puntoDeAgua(def.modo === "terrestre") : celdaFaunaAleatoria();
      if (!p) continue;
      const b = crearBicho(especie, p[0], p[1]);
      b.vida = def.vida[0] + Math.random() * (def.vida[1] - def.vida[0]);
      cuenta[especie] = (cuenta[especie] || 0) + 1;
    }
  }
  // arranque con algo de vidilla, y a partir de ahí el dado cada 5 s
  function crearFaunaLibre() {
    for (let i = 0; i < 3; i++) pasoAparicion(1.5);
    setInterval(pasoAparicion, 5000);
  }
  // objetos animal/insecto del mapa ⇄ bichos anclados (querencia editable)
  function sincronizarFaunaMapa() {
    const vivos = new Set();
    for (const obj of mapa.objetos) {
      if (!ESPECIES_FAUNA[obj.tipo]) continue;
      vivos.add(obj.id);
      const hx = obj.col + 0.5, hy = obj.fila + 0.5;
      let b = faunaPorId.get(obj.id);
      if (!b) {
        b = crearBicho(obj.tipo, hx, hy, obj.id);
        faunaPorId.set(obj.id, b);
      } else if (b.cx !== hx || b.cy !== hy) {
        // lo han movido en el editor: el bicho se muda con su querencia
        b.cx = hx; b.cy = hy; b.x = hx; b.y = hy;
        b.estado = "quieto"; b.espera = 1;
      }
    }
    for (const [id, b] of [...faunaPorId]) {
      if (!vivos.has(id)) {
        faunaPorId.delete(id);
        const i = fauna.indexOf(b);
        if (i >= 0) fauna.splice(i, 1);
      }
    }
  }

  // el camino a pie se muestrea cada ~0,4 celdas: nadie atraviesa vallas,
  // objetos sólidos ni el agua (ovejas y gallinas incluidas)
  function caminoLibre(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const pasos = Math.max(1, Math.ceil(d / 0.4));
    for (let i = 1; i <= pasos; i++) {
      const t = i / pasos;
      if (!transitable(Math.floor(x0 + (x1 - x0) * t), Math.floor(y0 + (y1 - y0) * t))) return false;
    }
    return true;
  }

  function nuevoDestinoFauna(b) {
    const def = ESPECIES_FAUNA[b.especie];
    for (let i = 0; i < 14; i++) {
      // candidato alrededor de la querencia, siempre dentro de la finca
      const ang = Math.random() * Math.PI * 2;
      const dist = 1 + Math.random() * Math.max(1, b.radio - 1);
      const c = b.cx + Math.cos(ang) * dist, f = b.cy + Math.sin(ang) * dist;
      const cc = Math.floor(c), ff = Math.floor(f);
      if (def.modo === "volador") {
        if (estadoCelda(cc, ff) !== "dentro") continue;
        if (!def.agua && (terrenoEn(cc, ff) === "agua" || ocupacion.has(`${cc},${ff}`))) continue;
      } else {
        if (!transitable(cc, ff) || !caminoLibre(b.x, b.y, c, f)) continue;
      }
      b.tx = c; b.ty = f;
      return true;
    }
    return false;
  }

  function actualizarFauna(dt) {
    const seVan = [];
    for (const b of fauna) {
      const def = ESPECIES_FAUNA[b.especie];
      // los libres tienen los días contados: al agotarse, último viaje
      if (!b.anclado && b.vida !== undefined && !b.partiendo) {
        b.vida -= dt;
        if (b.vida <= 0 && b.estado === "quieto") {
          b.partiendo = true;
          if (nuevoDestinoFauna(b)) b.estado = "moviendo";
          else { seVan.push(b); continue; }
        }
      }
      if (b.partiendo && def.modo === "volador") {
        // las aves se marchan ganando cielo hasta perderse de vista
        b.partiendoT = (b.partiendoT || 0) + dt;
        if (b.partiendoT > 3) { seVan.push(b); continue; }
      }
      if (b.estado === "quieto") {
        b.altura = Math.max(0, b.altura - dt * 3);
        b.espera -= dt;
        if (b.espera <= 0 && nuevoDestinoFauna(b)) b.estado = "moviendo";
        continue;
      }
      const dx = b.tx - b.x, dy = b.ty - b.y;
      const d = Math.hypot(dx, dy);
      if (def.modo === "volador") {
        // ganar altura al despegar y perderla al acercarse al destino
        const objetivo = b.partiendo ? 2.6 : Math.min(def.alturaMax || 1.6, d * 0.6);
        b.altura += (objetivo - b.altura) * Math.min(1, dt * 4);
      }
      const paso = def.vel * dt;
      if (d <= paso) {
        if (b.partiendo) { seVan.push(b); continue; } // se escabulle
        b.x = b.tx; b.y = b.ty;
        b.estado = "quieto";
        b.espera = def.espera[0] + Math.random() * (def.espera[1] - def.espera[0]);
        // los bichos libres no acuáticos llevan su querencia consigo:
        // así van derivando por toda la finca
        if (!b.anclado && !def.agua) { b.cx = b.x; b.cy = b.y; }
      } else {
        b.x += (dx / d) * paso;
        b.y += (dy / d) * paso;
        if (Math.abs(dx) > 0.1) b.espejo = dx < 0;
      }
    }
    for (const b of seVan) {
      const i = fauna.indexOf(b);
      if (i >= 0) fauna.splice(i, 1);
    }
  }

  function dibujarAnimal(a, tiempo, tam) {
    const spr = SPRITES[a.especie];
    const def = ESPECIES_FAUNA[a.especie];
    const [x, y] = celdaAPantalla(a.x - 0.5, a.y - 0.5);
    let fr;
    if (def.modo === "volador" && a.altura > 0.15) fr = spr.vuelo[Math.floor(tiempo * 8) % 2];
    else if (a.estado === "moviendo" && spr.frames.length > 1) fr = spr.frames[Math.floor(tiempo * 7) % 2];
    else fr = spr.frames[0];
    dibujarSombra(ctx, x + tam / 2, y + tam - camara.zoom, spr.sombra, camara.zoom * (1 - a.altura * 0.3));
    dibujarSprite(ctx, fr, x, y - a.altura * tam, tam, tam, camara.zoom, a.espejo);
  }

  // árboles decorativos del exterior: misma lógica que el pintado del mundo
  function arbolExteriorEn(c, f) {
    if (estadoCelda(c, f) !== "fuera") return null;
    if (estadoCelda(c - 1, f) === "valla" || estadoCelda(c + 1, f) === "valla" ||
        estadoCelda(c, f - 1) === "valla" || estadoCelda(c, f + 1) === "valla") return null;
    const h = hash2(c * 7, f * 5);
    if (h >= 0.05) return null;
    return h < 0.025 ? "pino" : "roble";
  }

  // qué especie hay bajo un punto de pantalla (fauna > objetos > exterior)
  function fichaEnPantalla(px, py) {
    const [colF, filaF] = pantallaACelda(px, py);
    let mejor = null, mejorD = 1.0;
    for (const a of fauna) {
      const d = Math.min(
        Math.hypot(a.x - colF, a.y - filaF),
        Math.hypot(a.x - colF, a.y - a.altura - filaF) // pájaro en vuelo: donde se le ve
      );
      if (d < mejorD) { mejorD = d; mejor = a.especie; }
    }
    if (mejor) { mostrarFicha(mejor); return; }
    // objetos del mapa, contando toda la silueta del sprite (copa incluida);
    // si hay varios solapados gana el de base más baja (el que se ve delante).
    // Los letreros de la peña van en su propia capa por delante de todo lo
    // demás (árboles incluidos), si no un árbol cercano se "comería" el click.
    let elegido = null, baseMax = -1;
    let letrero = null, letreroBaseMax = -1;
    for (const obj of mapa.objetos) {
      if (ESPECIES_FAUNA[obj.tipo]) continue; // animales: ya buscados como bichos
      if (!FICHAS[obj.tipo] && obj.tipo !== "letrero") continue;
      const spr = SPRITES[obj.tipo];
      if (!spr) continue;
      const [w, h] = tamanoObjeto(obj.tipo);
      const aw = Math.max(spr.frames[0].ancho / PX, w), ah = Math.max(spr.frames[0].alto / PX, h);
      const cx = obj.col + w / 2, base = obj.fila + h;
      if (Math.abs(colF - cx) <= aw / 2 && filaF >= base - ah && filaF <= base) {
        if (obj.tipo === "letrero") {
          if (base > letreroBaseMax) { letreroBaseMax = base; letrero = obj; }
        } else if (base > baseMax) {
          baseMax = base; elegido = obj;
        }
      }
    }
    if (letrero) { mostrarLetrero(letrero); return; }
    if (elegido) { mostrarFicha(elegido.tipo); return; }
    const c0 = Math.floor(colF);
    for (let df = 0; df <= 5; df++) {
      for (const c of [c0, c0 - 1, c0 + 1]) {
        const f = Math.floor(filaF) + df;
        const tipo = arbolExteriorEn(c, f);
        if (!tipo) continue;
        const spr = SPRITES[tipo];
        const aw = spr.frames[0].ancho / PX, ah = spr.frames[0].alto / PX;
        if (Math.abs(colF - (c + 0.5)) <= aw / 2 && filaF >= f + 1 - ah && filaF <= f + 1) {
          mostrarFicha(tipo);
          return;
        }
      }
    }
  }

  function actualizarOtros(dt) {
    for (const o of otros.values()) {
      o.rx += (o.x - o.rx) * Math.min(1, dt * 10);
      o.ry += (o.y - o.ry) * Math.min(1, dt * 10);
    }
  }

  // ── letreros: carteles con mensaje que planta la peña (máx. 3 por persona)
  const btnLetrero = document.getElementById("btn-letrero");
  const elLetreroInput = document.getElementById("letrero-input");
  function plantarLetrero(texto) {
    const mios = mapa.objetos.filter((o) => o.tipo === "letrero" && o.autor === idJugador);
    if (mios.length >= 3) {
      alert("Ya tienes 3 letreros plantados en la finka, que no es un tablón de anuncios. La organización puede borrarlos desde el editor.");
      return;
    }
    // delante del jugador según mira, o en una celda libre pegada a él
    const dx = jugador.dir === "lado" ? (jugador.espejo ? -1 : 1) : 0;
    const dy = jugador.dir === "abajo" ? 1 : jugador.dir === "arriba" ? -1 : 0;
    const jc = Math.floor(jugador.x), jf = Math.floor(jugador.y);
    const candidatos = [[jc + dx, jf + dy], [jc, jf + 1], [jc + 1, jf], [jc - 1, jf], [jc, jf - 1]];
    for (const [c, f] of candidatos) {
      if (estadoCelda(c, f) !== "dentro" || terrenoEn(c, f) === "agua" || ocupacion.has(`${c},${f}`)) continue;
      mapa.objetos.push({
        id: idAleatorio("letrero"), tipo: "letrero", col: c, fila: f,
        texto, autor: idJugador, nombre: miNombre || "",
      });
      recalcularOcupacion();
      guardarMapa();
      return;
    }
    alert("No hay sitio libre a tu alrededor para clavar el letrero.");
  }
  btnLetrero.addEventListener("click", () => {
    elLetreroInput.classList.toggle("activo");
    if (elLetreroInput.classList.contains("activo")) elLetreroInput.focus();
  });
  elLetreroInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { elLetreroInput.classList.remove("activo"); elLetreroInput.blur(); }
    if (e.key !== "Enter") return;
    const texto = elLetreroInput.value.trim().slice(0, 80);
    if (!texto) return;
    plantarLetrero(texto);
    elLetreroInput.value = "";
    elLetreroInput.classList.remove("activo");
    elLetreroInput.blur();
  });

  // ── chat: bocadillo sobre la cabeza ────────────────────────────────────
  const elChatInput = document.getElementById("chat-input");
  const btnHablar = document.getElementById("btn-hablar");
  const btnQuitarMsg = document.getElementById("btn-quitar-msg");

  btnHablar.addEventListener("click", () => {
    elChatInput.classList.toggle("activo");
    if (elChatInput.classList.contains("activo")) elChatInput.focus();
  });
  elChatInput.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") { elChatInput.classList.remove("activo"); elChatInput.blur(); }
    if (e.key !== "Enter") return;
    const texto = elChatInput.value.trim().slice(0, 120);
    if (!texto) return;
    miMensaje = texto;
    if (refYo && presenciaActiva) refYo.update({ mensaje: texto }).catch(() => {});
    btnQuitarMsg.classList.add("activo");
    elChatInput.value = "";
    elChatInput.classList.remove("activo");
    elChatInput.blur();
  });
  btnQuitarMsg.addEventListener("click", () => {
    miMensaje = null;
    if (refYo && presenciaActiva) refYo.update({ mensaje: null }).catch(() => {});
    btnQuitarMsg.classList.remove("activo");
  });

  // ── modal de nombre ────────────────────────────────────────────────────
  const elModal = document.getElementById("modal-nombre");
  const elInputNombre = document.getElementById("input-nombre");
  elInputNombre.value = localStorage.getItem("finkafarm-nombre") || "";
  function confirmarNombre() {
    const n = elInputNombre.value.trim().slice(0, 16) || "PEÑA";
    try { localStorage.setItem("finkafarm-nombre", n); } catch (e) {}
    elModal.style.display = "none";
    entrarOnline(n);
  }
  document.getElementById("btn-entrar").addEventListener("click", confirmarNombre);
  elInputNombre.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") confirmarNombre();
  });
  elInputNombre.focus();

  // ── rótulos sobre el mapa: nombres y bocadillos ────────────────────────
  function dibujarNombre(nombre, sx, sy) {
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20,14,8,0.8)";
    ctx.strokeText(nombre, sx, sy);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(nombre, sx, sy);
  }
  function dibujarBocadillo(texto, sx, syCabeza) {
    ctx.font = "11px 'Space Mono', monospace";
    const maxCar = 22;
    const lineas = [];
    let linea = "";
    for (const palabra of texto.split(" ")) {
      if ((linea + " " + palabra).trim().length > maxCar && linea) { lineas.push(linea); linea = palabra; }
      else linea = linea ? linea + " " + palabra : palabra;
    }
    if (linea) lineas.push(linea);
    const anchoTxt = Math.max(...lineas.map((t) => ctx.measureText(t).width));
    const pad = 8, lh = 14;
    const bw = anchoTxt + pad * 2;
    const bh = lineas.length * lh + pad * 2 - 4;
    const bx = sx - bw / 2;
    const by = syCabeza - bh - 12;
    ctx.fillStyle = "#fffdf2";
    ctx.strokeStyle = "#2b1c12";
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);
    // colita del bocadillo
    ctx.beginPath();
    ctx.moveTo(sx - 5, by + bh);
    ctx.lineTo(sx + 5, by + bh);
    ctx.lineTo(sx, by + bh + 7);
    ctx.closePath();
    ctx.fillStyle = "#fffdf2";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2b1c12";
    ctx.textAlign = "center";
    lineas.forEach((t, i) => ctx.fillText(t, sx, by + pad + 9 + i * lh));
  }

  // ── render ────────────────────────────────────────────────────────────
  function dibujar(tiempo) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const tam = tamCelda();

    // fondo: pradera oscura infinita
    ctx.fillStyle = PALETA.ext;
    ctx.fillRect(0, 0, w, h);

    // capa de mundo (terreno estático) escalada
    const [origenX, origenY] = celdaAPantalla(0, 0);
    ctx.drawImage(mundo, origenX, origenY, COLS * tam, FILAS * tam);

    const colMin = Math.max(0, Math.floor(camara.x - w / 2 / tam) - 3);
    const colMax = Math.min(COLS - 1, Math.ceil(camara.x + w / 2 / tam) + 3);
    const filaMin = Math.max(0, Math.floor(camara.y - h / 2 / tam) - 3);
    const filaMax = Math.min(FILAS - 1, Math.ceil(camara.y + h / 2 / tam) + 5);

    // agua animada sobre la capa estática
    const aguaFrame = Math.floor(tiempo * 2) % 3;
    if (aguaFrame > 0) {
      for (const [c, f] of celdasAgua) {
        if (c < colMin || c > colMax || f < filaMin || f > filaMax) continue;
        const [x, y] = celdaAPantalla(c, f);
        // dejar el borde pintado en la capa estática
        ctx.drawImage(SPRITES.agua.frames[aguaFrame].canvas, 2, 2, 12, 12, x + 2 * camara.zoom, y + 2 * camara.zoom, 12 * camara.zoom, 12 * camara.zoom);
      }
    }
    // algas superficiales con un balanceo suave
    for (const alga of algas) {
      const ax = origenX + alga.wx * camara.zoom;
      const ay = origenY + (alga.wy + Math.sin(tiempo * 1.6 + alga.fase) * 0.8) * camara.zoom;
      if (ax < -20 || ax > w + 20 || ay < -20 || ay > h + 20) continue;
      const fr = SPRITES.alga.frames[alga.variante];
      ctx.drawImage(fr.canvas, ax, ay, fr.ancho * camara.zoom, fr.alto * camara.zoom);
    }

    // objetos + jugador, con sombra, ordenados por profundidad
    const animFrame = Math.floor(tiempo * 1.5) % 2;
    const dibujables = [];
    for (const obj of mapa.objetos) {
      // los animales/insectos del mapa son querencias: en juego los dibuja
      // su bicho paseando; en el editor se muestran quietos para editarlos
      if (modo !== "editor" && ESPECIES_FAUNA[obj.tipo]) continue;
      const [aw, ah] = tamanoObjeto(obj.tipo);
      if (obj.col + aw + 1 < colMin || obj.col - 1 > colMax) continue;
      if (obj.fila + ah < filaMin - 1 || obj.fila > filaMax + 2) continue;
      dibujables.push({
        orden: obj.fila + ah,
        dibujar: () => {
          const [x, y] = celdaAPantalla(obj.col, obj.fila);
          if (obj.tipo === "valla") { dibujarVallaObjeto(x, y, obj.col, obj.fila); return; }
          const spr = SPRITES[obj.tipo];
          if (!spr) return;
          dibujarSombra(ctx, x + (aw * tam) / 2, y + ah * tam - 2 * camara.zoom, spr.sombra, camara.zoom);
          dibujarSprite(ctx, spr.frames[spr.frames.length > 1 ? animFrame : 0], x, y, aw * tam, ah * tam, camara.zoom);
        },
      });
    }
    dibujables.push({
      orden: jugador.y + 0.5,
      dibujar: () => {
        const [x, y] = celdaAPantalla(jugador.x - 0.5, jugador.y - 0.5);
        const grupo = spritesYo[jugador.dir];
        const frIdx = jugador.moviendo ? Math.floor(jugador.animT * 8) % 2 : 0;
        dibujarSombra(ctx, x + tam / 2, y + tam - camara.zoom, grupo.sombra, camara.zoom);
        dibujarSprite(ctx, grupo.frames[frIdx], x, y, tam, tam, camara.zoom, jugador.espejo);
      },
    });
    // jugadores online
    for (const o of otros.values()) {
      if (o.rx < colMin - 1 || o.rx > colMax + 1 || o.ry < filaMin - 1 || o.ry > filaMax + 1) continue;
      const rem = o;
      dibujables.push({
        orden: rem.ry + 0.5,
        dibujar: () => {
          const [x, y] = celdaAPantalla(rem.rx - 0.5, rem.ry - 0.5);
          const grupo = (rem.sprites || spritesYo)[rem.dir] || (rem.sprites || spritesYo).abajo;
          const frIdx = rem.moviendo ? Math.floor(tiempo * 8) % 2 : 0;
          dibujarSombra(ctx, x + tam / 2, y + tam - camara.zoom, grupo.sombra, camara.zoom);
          dibujarSprite(ctx, grupo.frames[frIdx], x, y, tam, tam, camara.zoom, rem.espejo);
        },
      });
    }
    // fauna en tierra: entra en el orden de profundidad; en vuelo: encima de todo
    const enVuelo = [];
    if (modo !== "editor") {
      for (const a of fauna) {
        if (a.x < colMin - 2 || a.x > colMax + 2 || a.y < filaMin - 2 || a.y > filaMax + 2) continue;
        if (a.altura > 0.15) { enVuelo.push(a); continue; }
        const bicho = a;
        dibujables.push({ orden: bicho.y + 0.5, dibujar: () => dibujarAnimal(bicho, tiempo, tam) });
      }
    }
    dibujables.sort((a, b) => a.orden - b.orden);
    for (const d of dibujables) d.dibujar();
    for (const a of enVuelo) dibujarAnimal(a, tiempo, tam);

    // nombres y bocadillos por encima de todo
    const rotulos = [];
    if (miNombre) rotulos.push({ nombre: miNombre, x: jugador.x, y: jugador.y, mensaje: miMensaje });
    for (const o of otros.values()) {
      if (o.rx < colMin - 1 || o.rx > colMax + 1 || o.ry < filaMin - 1 || o.ry > filaMax + 1) continue;
      rotulos.push({ nombre: o.nombre, x: o.rx, y: o.ry, mensaje: o.mensaje });
    }
    for (const r of rotulos) {
      const [sx, syPies] = celdaAPantalla(r.x, r.y + 0.5);
      dibujarNombre(r.nombre, sx, syPies + 13);
    }
    for (const r of rotulos) {
      if (!r.mensaje) continue;
      const [sx, syPies] = celdaAPantalla(r.x, r.y + 0.5);
      dibujarBocadillo(r.mensaje, sx, syPies - 26 * camara.zoom);
    }

    // overlay del editor: rejilla sutil + celda bajo el cursor
    if (modo === "editor") {
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = colMin; c <= colMax + 1; c++) {
        const [x] = celdaAPantalla(c, 0);
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let f = filaMin; f <= filaMax + 1; f++) {
        const [, y] = celdaAPantalla(0, f);
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
      if (raton.x >= 0) {
        const [colF, filaF] = pantallaACelda(raton.x, raton.y);
        const [hx, hy] = celdaAPantalla(Math.floor(colF), Math.floor(filaF));
        ctx.strokeStyle = "#ffe600";
        ctx.lineWidth = 2;
        ctx.strokeRect(hx, hy, tam, tam);
      }
    }

    elEstado.textContent = `Celda ${Math.floor(jugador.x)},${Math.floor(jugador.y)} · zoom ${camara.zoom.toFixed(1)}x · ${camara.libre ? "cámara libre" : "siguiendo"} · ${modo === "editor" ? "EDITOR" : "jugando"}`;
  }

  // ── bucle principal ──────────────────────────────────────────────────────
  let ultimo = performance.now();
  let tAcum = 0;
  function loop(ahora) {
    // clamp inferior: el primer timestamp de RAF puede ser anterior a
    // performance.now() capturado al cargar, y un dt negativo rompe los
    // índices de animación (Math.floor(t)%2 → -1)
    const dt = Math.max(0, Math.min(0.05, (ahora - ultimo) / 1000));
    ultimo = ahora;
    tAcum += dt;
    actualizarJugador(dt);
    actualizarOtros(dt);
    actualizarFauna(dt);
    actualizarCamara();
    dibujar(tAcum);
    requestAnimationFrame(loop);
  }
  // los assets personalizados pueden añadir tipos sólidos o fauna nueva:
  // se cargan antes de calcular ocupación y arrancar la fauna
  cargarAssetsPersonalizados();
  recalcularOcupacion();
  reconstruirMundo();
  resize();
  crearFaunaLibre();
  sincronizarFaunaMapa();
  requestAnimationFrame(loop);
})();
