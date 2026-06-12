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
    tamanoObjeto, OBJETOS_SOLIDOS, TIPOS_OBJETO, SPRITES, PALETA, dibujarSprite, dibujarSombra, hash2 } = G;

  const STORAGE_KEY = "granja-mapa-v1";
  const PX = 16; // píxeles de arte por celda
  const ZOOM_MIN = 0.5, ZOOM_MAX = 5;
  const VELOCIDAD = 4.5; // celdas / segundo
  const HITBOX = 0.32;

  const canvas = document.getElementById("juego");
  const ctx = canvas.getContext("2d");
  const elEstado = document.getElementById("estado");
  const elEditorPanel = document.getElementById("editor-panel");
  const elEditorToggle = document.getElementById("editor-toggle");
  const elJson = document.getElementById("editor-json");

  // ── mapa editable (persistido en localStorage) ────────────────────────
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
  function guardarMapa() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa)); } catch (e) {}
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
    if (e.key.toLowerCase() === "e") toggleEditor();
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.key.toLowerCase()));

  function actualizarJugador(dt) {
    let dx = 0, dy = 0;
    if (teclas.has("w") || teclas.has("arrowup")) dy -= 1;
    if (teclas.has("s") || teclas.has("arrowdown")) dy += 1;
    if (teclas.has("a") || teclas.has("arrowleft")) dx -= 1;
    if (teclas.has("d") || teclas.has("arrowright")) dx += 1;

    if (dx || dy) {
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

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 2 || (modo === "jugar" && e.button === 0)) {
      arrastre = { tipo: "camara", x: e.clientX, y: e.clientY };
      canvas.classList.add("arrastrando");
      return;
    }
    if (modo === "editor") iniciarAccionEditor(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    raton.x = e.clientX; raton.y = e.clientY;
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
  canvas.addEventListener("pointerup", () => {
    if (arrastre && arrastre.tipo === "objeto") { recalcularOcupacion(); guardarMapa(); }
    if (arrastre && (arrastre.tipo === "terreno" || arrastre.tipo === "borrar")) guardarMapa();
    arrastre = null;
    canvas.classList.remove("arrastrando");
  });

  // ── panel del editor ──────────────────────────────────────────────────
  const TIPOS_TERRENO = [["hierba", "HIERBA"], ["camino", "CAMINO"], ["grava", "GRAVA"], ["agua", "AGUA"]];
  const ETIQUETAS_OBJETO = {
    caseta: "CASETA", gallinero: "GALLINERO", letrina: "LETRINA", valla: "VALLA",
    pino: "PINO", roble: "ROBLE", encina: "ENCINA", olivo: "OLIVO",
    manzano: "MANZANO", peral: "PERAL", cerezo: "CEREZO", ciruelo: "CIRUELO",
    endrino: "ENDRINO", pistacho: "PISTACHO", nogal: "NOGAL", almendro: "ALMENDRO",
    castano: "CASTAÑO", arandano: "ARÁNDANO", lavanda: "LAVANDA", fresa: "FRESA",
    flores: "FLORES", gallina: "GALLINA", oveja_negra: "OVEJA",
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
  botones.push(btnMover, btnBorrar);
  btnMover.addEventListener("click", () => seleccionarPincel("mover", null, btnMover));
  btnBorrar.addEventListener("click", () => seleccionarPincel("borrar", null, btnBorrar));
  btnMover.classList.add("activo");

  const elTerreno = document.getElementById("pinceles-terreno");
  const elObjetos = document.getElementById("pinceles-objetos");
  for (const [tipo, etiqueta] of TIPOS_TERRENO) {
    const b = crearBoton(etiqueta, () => seleccionarPincel("terreno", tipo, b));
    elTerreno.appendChild(b);
  }
  for (const tipo of TIPOS_OBJETO) {
    const b = crearBoton(ETIQUETAS_OBJETO[tipo] || tipo.toUpperCase(), () => seleccionarPincel("objeto", tipo, b));
    elObjetos.appendChild(b);
  }

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
    if (!confirm("¿Reiniciar el mapa a los valores por defecto? Se perderán los cambios guardados.")) return;
    mapa = mapaDefecto();
    recalcularOcupacion();
    reconstruirMundo();
    guardarMapa();
  });

  function toggleEditor() {
    modo = modo === "editor" ? "jugar" : "editor";
    elEditorPanel.classList.toggle("activo", modo === "editor");
    elEditorToggle.classList.toggle("activo", modo === "editor");
    if (modo === "editor") camara.libre = true;
  }
  elEditorToggle.addEventListener("click", toggleEditor);

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
        const grupo = SPRITES["jugador_" + jugador.dir];
        const frIdx = jugador.moviendo ? Math.floor(jugador.animT * 8) % 2 : 0;
        dibujarSombra(ctx, x + tam / 2, y + tam - camara.zoom, grupo.sombra, camara.zoom);
        dibujarSprite(ctx, grupo.frames[frIdx], x, y, tam, tam, camara.zoom, jugador.espejo);
      },
    });
    dibujables.sort((a, b) => a.orden - b.orden);
    for (const d of dibujables) d.dibujar();

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
    actualizarCamara();
    dibujar(tAcum);
    requestAnimationFrame(loop);
  }
  reconstruirMundo();
  resize();
  requestAnimationFrame(loop);
})();
