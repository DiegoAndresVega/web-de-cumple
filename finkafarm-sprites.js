// finkafarm-sprites.js — pixel-art procedural para "La Finka" (v3)
//
// Cada sprite se pre-renderiza a un <canvas> 1px=1px y el motor lo escala
// con drawImage (imageSmoothing off). Convención de tamaño: 16px = 1 celda.
// Los árboles ocupan huella 1x1 pero su copa mide hasta 4 celdas de ancho y
// sobresale solapando a los vecinos, como en Stardew. Anclaje: abajo-centro.

(function () {

  const PALETA = {
    // hierba interior (clara, pradera)
    hierba: "#69b647", hierba_d: "#58a23a", hierba_l: "#7fc857", hierba_ll: "#94d967",
    flor_b: "#f5f2e8", flor_a: "#f2d450", flor_r: "#e06a6a", flor_m: "#b58ae0",
    // hierba exterior (bosque oscuro de alrededor)
    ext: "#2e5232", ext_d: "#27462b", ext_l: "#38613c",
    // tierra / camino
    tierra: "#c49a62", tierra_d: "#ab8350", tierra_l: "#d6b078", piedra: "#9b9281",
    // grava
    grava: "#a8a49b", grava_d: "#8e8a81", grava_l: "#beb9af", grava_ll: "#d2cdc2", grava_dd: "#76726a",
    // agua
    agua: "#3e9ad6", agua_d: "#2f7fb8", agua_l: "#6cc0ec", agua_ll: "#a8e0f8",
    borde_agua: "#d8d3c0",
    alga: "#6db84f", alga_d: "#549539", alga_l: "#8fd36b",
    // madera / valla
    madera: "#b07b3e", madera_d: "#82592b", madera_l: "#cf9b58",
    // troncos
    tronco: "#7a4f2c", tronco_d: "#5c3a1f", tronco_l: "#946540",
    // copas
    bosque: "#3a7d44", bosque_d: "#2c6336", bosque_l: "#4f9a55", bosque_ll: "#69b667",
    pino_v: "#2f6b46", pino_d: "#245538", pino_l: "#3f8757",
    oliva: "#8a9a5b", oliva_d: "#71814a", oliva_l: "#a4b472",
    frutal: "#4f9a48", frutal_d: "#3d7d38", frutal_l: "#67b65c",
    seco: "#5f9455", seco_d: "#4a7843", seco_l: "#77ad68",
    encina_v: "#4a7048", encina_d: "#3a5a39", encina_l: "#5e8a5b",
    endrino_v: "#3e5e3a", endrino_d: "#2f4a2c", endrino_l: "#527a4d",
    arbusto: "#4e8a44", arbusto_d: "#3c6e34", arbusto_l: "#65a857",
    // frutos
    rojo: "#e04848", amarillo: "#f2cf4e", morado: "#8a55b0", rosa: "#f0a8c0",
    nuez: "#8a5a34", bellota: "#b08648", endrina: "#3c4a8a", arandano_f: "#5566c8",
    fresa_f: "#e03c3c", pistacho_f: "#d8907a",
    lavanda_f: "#9a7ad0", lavanda_l: "#b89ae6",
    // animales
    blanco: "#f7f3e8", crema: "#e3d8bd", cresta: "#e04848", pico: "#efa23b",
    negro: "#2b2724", negro_l: "#3d3833", gris: "#6b645c", rosa_oveja: "#e8b4ac",
    // caseta
    tejado: "#c25744", tejado_d: "#9b4234", tejado_l: "#d4705c", pared: "#efe3c4",
    pared_d: "#d4c49c", zocalo: "#a89878",
    panel: "#26354e", panel_l: "#3d5478", panel_ll: "#5a7aa8", marco: "#9aa0a8",
    // gallinero
    g_tejado: "#8a6a3a", g_tejado_d: "#6d5229", g_pared: "#c49a62",
    // jugador
    piel: "#efc296", piel_d: "#d8a87c", pelo: "#5c3a22", camisa: "#3e7ca6",
    camisa_d: "#2e6086", pantalon: "#54422e", bota: "#3a2c1c",
  };

  // ── helpers de dibujo sobre grids ─────────────────────────────────────
  function crearGrid(ancho, alto) {
    return Array.from({ length: alto }, () => new Array(ancho).fill(null));
  }
  function rect(g, x, y, w, h, color) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const px = x + i, py = y + j;
        if (py >= 0 && py < g.length && px >= 0 && px < g[0].length) g[py][px] = color;
      }
    }
  }
  function circulo(g, cx, cy, r, color) {
    for (let py = 0; py < g.length; py++) {
      for (let px = 0; px < g[0].length; px++) {
        const dx = px - cx, dy = py - cy;
        if (dx * dx + dy * dy <= r * r + 0.5) g[py][px] = color;
      }
    }
  }
  function punto(g, x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = color;
  }
  function fruto(g, x, y, color) { // fruto de 2x2 px, visible en árboles grandes
    rect(g, x, y, 2, 2, color);
  }
  function triangulo(g, cx, yTop, alto, anchoBase, color) {
    for (let j = 0; j < alto; j++) {
      const w = Math.max(1, Math.round((anchoBase * (j + 1)) / alto));
      rect(g, cx - Math.floor(w / 2), yTop + j, w, 1, color);
    }
  }

  function gridACanvas(grid) {
    const alto = grid.length, ancho = grid[0].length;
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const c = canvas.getContext("2d");
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const key = grid[y][x];
        if (key) { c.fillStyle = PALETA[key] || key; c.fillRect(x, y, 1, 1); }
      }
    }
    return canvas;
  }
  function frame(grid) {
    return { ancho: grid[0].length, alto: grid.length, canvas: gridACanvas(grid) };
  }

  // ── terreno ────────────────────────────────────────────────────────────
  function hash2(c, f) {
    let h = (c * 374761393 + f * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  function spriteHierba(variante) {
    const g = crearGrid(16, 16);
    rect(g, 0, 0, 16, 16, "hierba");
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if ((x + y) % 7 === 0 && (x * 3 + y) % 5 === 0) g[y][x] = "hierba_d";
      }
    }
    const briznas = [
      [[3, 4], [11, 2], [6, 9], [13, 12], [2, 13]],
      [[8, 3], [2, 7], [12, 6], [5, 13], [10, 11]],
      [[5, 2], [13, 5], [3, 10], [9, 8], [14, 14]],
      [[7, 5], [1, 3], [11, 9], [4, 12], [15, 7]],
    ][variante % 4];
    for (const [x, y] of briznas) { punto(g, x, y, "hierba_l"); punto(g, x, y - 1, "hierba_ll"); }
    return frame(g);
  }
  function spriteHierbaFlor(colorFlor) {
    const g = crearGrid(16, 16);
    rect(g, 0, 0, 16, 16, "hierba");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((x + y) % 7 === 0 && (x * 3 + y) % 5 === 0) g[y][x] = "hierba_d";
    }
    for (const [cx, cy] of [[4, 5], [11, 10]]) {
      punto(g, cx, cy - 1, colorFlor); punto(g, cx - 1, cy, colorFlor);
      punto(g, cx + 1, cy, colorFlor); punto(g, cx, cy + 1, colorFlor);
      punto(g, cx, cy, "flor_a");
    }
    return frame(g);
  }
  function spriteExterior(variante) {
    const g = crearGrid(16, 16);
    rect(g, 0, 0, 16, 16, "ext");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if ((x * 5 + y * 3 + variante) % 11 === 0) g[y][x] = "ext_d";
      if ((x * 3 + y * 7 + variante) % 13 === 0) g[y][x] = "ext_l";
    }
    return frame(g);
  }
  function spriteCamino() {
    const g = crearGrid(16, 16);
    rect(g, 0, 0, 16, 16, "tierra");
    for (const [x, y] of [[2, 2], [9, 4], [5, 9], [12, 12], [3, 13], [8, 7], [14, 3]]) punto(g, x, y, "tierra_d");
    for (const [x, y] of [[6, 3], [13, 8], [2, 10], [10, 14]]) punto(g, x, y, "tierra_l");
    for (const [x, y] of [[4, 6], [11, 11]]) { punto(g, x, y, "piedra"); punto(g, x + 1, y, "piedra"); }
    return frame(g);
  }
  function spriteGrava(variante) {
    // grava gris: base de piedrilla con muchas motas de varios tonos
    const g = crearGrid(16, 16);
    rect(g, 0, 0, 16, 16, "grava");
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const h = hash2(x * 7 + variante * 101, y * 11 + variante * 53);
        if (h < 0.14) g[y][x] = "grava_d";
        else if (h < 0.26) g[y][x] = "grava_l";
        else if (h < 0.31) g[y][x] = "grava_ll";
        else if (h < 0.36) g[y][x] = "grava_dd";
      }
    }
    // alguna piedrilla suelta de 2px para dar textura de grano grueso
    const piedras = [[3, 4], [11, 8], [6, 12], [13, 2]];
    for (let i = 0; i < piedras.length; i++) {
      const [x, y] = piedras[(i + variante) % piedras.length];
      punto(g, x, y, "grava_ll"); punto(g, x + 1, y, "grava_l"); punto(g, x, y + 1, "grava_dd");
    }
    return frame(g);
  }
  function spriteAgua(variante) {
    const g = crearGrid(16, 16);
    rect(g, 0, 0, 16, 16, "agua");
    const off = variante * 3;
    for (let x = 0; x < 16; x++) {
      const y1 = (3 + off + ((x / 4) | 0) * 2 + x) % 16;
      punto(g, x, y1, "agua_l");
      const y2 = (9 + off + ((x / 5) | 0) + x) % 16;
      punto(g, x, y2, "agua_d");
    }
    punto(g, (5 + off * 2) % 16, (4 + off) % 16, "agua_ll");
    punto(g, (12 + off * 3) % 16, (11 + off) % 16, "agua_ll");
    return frame(g);
  }
  function spriteAlga(variante) {
    // nenúfar / alga superficial pequeña
    const g = crearGrid(7, 5);
    rect(g, 1, 1, 5, 3, "alga");
    rect(g, 2, 0, 3, 1, "alga");
    rect(g, 2, 4, 3, 1, "alga_d");
    punto(g, 1, 1, "alga_d"); punto(g, 5, 3, "alga_d");
    punto(g, 2, 1, "alga_l"); punto(g, 3, 2, "alga_l");
    if (variante === 1) { punto(g, 6, 2, null); punto(g, 5, 2, null); } // muesca
    return frame(g);
  }

  // ── árboles (DOBLE de tamaño: copas de hasta 4 celdas de ancho) ───────
  function copaFrondosa(g, cx, cy, r, base, oscuro, claro, brillo) {
    circulo(g, cx, cy + 2, r - 1, oscuro);
    circulo(g, cx - r * 0.45, cy, r * 0.62, base);
    circulo(g, cx + r * 0.45, cy, r * 0.62, base);
    circulo(g, cx, cy - r * 0.4, r * 0.66, base);
    circulo(g, cx, cy + r * 0.3, r * 0.6, base);
    circulo(g, cx - r * 0.35, cy - r * 0.35, r * 0.42, claro);
    circulo(g, cx + r * 0.5, cy - r * 0.15, r * 0.3, claro);
    circulo(g, cx - r * 0.5, cy - r * 0.55, r * 0.16, brillo);
    circulo(g, cx + r * 0.25, cy - r * 0.5, r * 0.12, brillo);
  }
  function troncoArbol(g, cx, yBase, alto, ancho) {
    rect(g, cx - (ancho >> 1), yBase - alto, ancho, alto, "tronco");
    rect(g, cx - (ancho >> 1), yBase - alto, 2, alto, "tronco_l");
    rect(g, cx + (ancho >> 1) - 2, yBase - alto, 2, alto, "tronco_d");
    rect(g, cx - (ancho >> 1) - 2, yBase - 3, 2, 3, "tronco_d");
    rect(g, cx + (ancho >> 1), yBase - 3, 2, 3, "tronco_d");
  }
  function spriteArbolFrondoso({ ancho = 64, alto = 80, r = 22, base, oscuro, claro, brillo, frutos = [], colorFruto }) {
    const g = crearGrid(ancho, alto);
    const cx = ancho >> 1, cy = alto - 50;
    troncoArbol(g, cx, alto, 32, 8);
    copaFrondosa(g, cx, cy, r, base, oscuro, claro, brillo);
    for (const [dx, dy] of frutos) fruto(g, cx + dx, cy + dy, colorFruto);
    return frame(g);
  }
  function spritePino() {
    const g = crearGrid(56, 88);
    const cx = 28;
    troncoArbol(g, cx, 88, 16, 8);
    triangulo(g, cx, 42, 30, 48, "pino_v");
    triangulo(g, cx, 22, 26, 36, "pino_v");
    triangulo(g, cx, 6, 22, 24, "pino_v");
    for (const [yT, w] of [[70, 44], [46, 32], [26, 20]]) {
      rect(g, cx - (w >> 1), yT, w, 2, "pino_d");
    }
    for (let y = 12; y < 68; y += 5) { punto(g, cx - 5 - ((y / 8) | 0), y, "pino_l"); punto(g, cx - 4 - ((y / 8) | 0), y, "pino_l"); }
    return frame(g);
  }
  function spriteRoble() {
    return spriteArbolFrondoso({ base: "bosque", oscuro: "bosque_d", claro: "bosque_l", brillo: "bosque_ll" });
  }
  function spriteEncina() {
    return spriteArbolFrondoso({
      base: "encina_v", oscuro: "encina_d", claro: "encina_l", brillo: "encina_l",
      frutos: [[-12, 4], [10, 6], [-2, 9], [14, -2], [-8, -6], [4, 2]], colorFruto: "bellota",
    });
  }
  function spriteOlivo() {
    const g = crearGrid(52, 64);
    const cx = 26;
    // tronco retorcido típico de olivo
    rect(g, cx - 4, 48, 8, 16, "tronco_d");
    rect(g, cx - 6, 52, 2, 8, "tronco_d");
    rect(g, cx + 4, 56, 2, 8, "tronco_d");
    rect(g, cx - 2, 48, 2, 16, "tronco_l");
    copaFrondosa(g, cx, 26, 18, "oliva", "oliva_d", "oliva_l", "oliva_l");
    return frame(g);
  }
  function frutal(frutos, colorFruto, ancho = 60, alto = 76, r = 21) {
    return spriteArbolFrondoso({
      ancho, alto, r, base: "frutal", oscuro: "frutal_d", claro: "frutal_l", brillo: "frutal_l",
      frutos, colorFruto,
    });
  }
  function frutoSeco(frutos, colorFruto, ancho = 64, alto = 84, r = 24) {
    return spriteArbolFrondoso({
      ancho, alto, r, base: "seco", oscuro: "seco_d", claro: "seco_l", brillo: "seco_l",
      frutos, colorFruto,
    });
  }
  function spritePistacho() {
    return spriteArbolFrondoso({
      ancho: 48, alto: 60, r: 16, base: "seco", oscuro: "seco_d", claro: "seco_l", brillo: "seco_l",
      frutos: [[-8, -2], [6, 0], [-2, 5], [10, -5], [-12, 3]], colorFruto: "pistacho_f",
    });
  }

  // ── arbustos y plantas bajas ───────────────────────────────────────────
  function spriteEndrino() {
    const g = crearGrid(30, 28);
    circulo(g, 15, 16, 10, "endrino_d");
    circulo(g, 10, 13, 7, "endrino_v");
    circulo(g, 20, 14, 7, "endrino_v");
    circulo(g, 15, 10, 6, "endrino_v");
    circulo(g, 11, 10, 3, "endrino_l");
    // espinas
    punto(g, 4, 10, "tronco_d"); punto(g, 26, 12, "tronco_d"); punto(g, 15, 2, "tronco_d");
    // endrinas azul oscuro
    for (const [x, y] of [[8, 16], [18, 11], [13, 19], [22, 17], [15, 13]]) fruto(g, x, y, "endrina");
    rect(g, 13, 26, 4, 2, "tronco_d");
    return frame(g);
  }
  function spriteArandano() {
    const g = crearGrid(26, 24);
    circulo(g, 13, 13, 9, "arbusto_d");
    circulo(g, 9, 11, 6, "arbusto");
    circulo(g, 17, 12, 6, "arbusto");
    circulo(g, 13, 8, 5, "arbusto");
    circulo(g, 10, 8, 3, "arbusto_l");
    for (const [x, y] of [[7, 13], [15, 9], [11, 16], [19, 14], [14, 12], [9, 7]]) fruto(g, x, y, "arandano_f");
    return frame(g);
  }
  function spriteLavanda() {
    const g = crearGrid(24, 26);
    // mata verde baja
    circulo(g, 12, 21, 7, "arbusto_d");
    circulo(g, 9, 20, 4, "arbusto");
    circulo(g, 15, 20, 4, "arbusto");
    // espigas moradas
    for (const [x, h] of [[4, 8], [8, 11], [12, 13], [16, 11], [20, 8]]) {
      rect(g, x, 20 - h, 2, h, "lavanda_f");
      rect(g, x, 20 - h, 2, 3, "lavanda_l");
      punto(g, x, 21 - h + ((x * 3) % 4), "lavanda_l");
    }
    return frame(g);
  }
  function spriteFresa() {
    const g = crearGrid(16, 12);
    // mata baja de hojas
    circulo(g, 5, 8, 4, "arbusto");
    circulo(g, 11, 8, 4, "arbusto");
    circulo(g, 8, 6, 4, "arbusto_l");
    punto(g, 4, 5, "arbusto_l"); punto(g, 12, 5, "arbusto_l");
    // fresas
    fruto(g, 2, 9, "fresa_f"); fruto(g, 12, 9, "fresa_f"); fruto(g, 7, 10, "fresa_f");
    punto(g, 3, 9, "flor_b"); punto(g, 13, 9, "flor_b"); // brillo/semillas
    return frame(g);
  }
  function spriteFlores() {
    const g = crearGrid(16, 14);
    // matita con 3 flores de colores
    rect(g, 7, 9, 2, 5, "arbusto_d");
    rect(g, 3, 11, 2, 3, "arbusto_d");
    rect(g, 12, 11, 2, 3, "arbusto_d");
    punto(g, 5, 10, "arbusto"); punto(g, 10, 10, "arbusto");
    for (const [cx, cy, col] of [[4, 8, "flor_r"], [8, 5, "flor_m"], [13, 8, "flor_a"]]) {
      punto(g, cx, cy - 1, col); punto(g, cx - 1, cy, col);
      punto(g, cx + 1, cy, col); punto(g, cx, cy + 1, col);
      punto(g, cx, cy, "flor_b");
    }
    return frame(g);
  }

  // ── edificios ──────────────────────────────────────────────────────────
  function spriteCaseta() {
    // caseta rectangular de una planta, 8 m de ancho x 3 m de fondo
    // (huella 4x2 celdas = 64x32 px) con paneles solares en el tejado.
    const g = crearGrid(64, 46);
    // muro
    rect(g, 1, 20, 62, 26, "pared");
    rect(g, 1, 42, 62, 4, "zocalo");
    rect(g, 1, 20, 62, 2, "pared_d");
    // puerta
    rect(g, 27, 26, 10, 20, "madera_d");
    rect(g, 28, 27, 8, 19, "madera");
    fruto(g, 34, 36, "amarillo"); // pomo
    // ventanas
    for (const wx of [7, 47]) {
      rect(g, wx, 26, 10, 9, "madera_d");
      rect(g, wx + 1, 27, 8, 7, "agua_ll");
      rect(g, wx + 5, 27, 1, 7, "madera_d");
      rect(g, wx + 1, 30, 8, 1, "madera_d");
    }
    // tejado de poca pendiente
    for (let j = 0; j < 16; j++) {
      const w = Math.round(56 + (64 - 56) * (j / 15));
      rect(g, Math.round((64 - w) / 2), j + 2, w, 1, j > 13 ? "tejado_d" : "g_tejado");
    }
    rect(g, 0, 18, 64, 2, "g_tejado_d"); // alero
    // paneles solares: 2 filas x 4 paneles con marco y reflejo
    for (let fila = 0; fila < 2; fila++) {
      for (let k = 0; k < 4; k++) {
        const px = 7 + k * 13, py = 4 + fila * 7;
        rect(g, px, py, 12, 6, "marco");
        rect(g, px + 1, py + 1, 10, 4, "panel");
        rect(g, px + 1, py + 1, 10, 1, "panel_l");
        punto(g, px + 2, py + 2, "panel_ll");
        punto(g, px + 6, py + 1, "panel_ll");
        rect(g, px + 5, py + 1, 1, 4, "panel_l");
      }
    }
    return frame(g);
  }
  function spriteLetrina() {
    // caseta de letrina estrecha de madera, huella 1x1, con luna en la puerta
    const g = crearGrid(18, 36);
    // cuerpo de tablones verticales
    rect(g, 2, 8, 14, 28, "madera");
    for (let x = 4; x < 16; x += 3) rect(g, x, 8, 1, 28, "madera_d");
    rect(g, 2, 8, 1, 28, "madera_l");
    // tejadillo inclinado con vuelo
    for (let j = 0; j < 6; j++) {
      rect(g, 1 - (j > 3 ? 1 : 0), 6 - j, 16 + (j > 3 ? 2 : 0), 1, j < 2 ? "g_tejado" : "g_tejado_d");
    }
    rect(g, 0, 6, 18, 2, "g_tejado_d");
    // puerta con marco y luna creciente
    rect(g, 5, 14, 8, 22, "madera_d");
    rect(g, 6, 15, 6, 21, "tronco_d");
    punto(g, 9, 18, "amarillo"); punto(g, 10, 18, "amarillo");
    punto(g, 10, 19, "amarillo"); punto(g, 10, 17, "amarillo");
    punto(g, 11, 28, "amarillo"); // pomo
    // respiradero
    rect(g, 7, 10, 4, 1, "tronco_d");
    return frame(g);
  }
  function spriteGallinero() {
    const g = crearGrid(32, 40);
    rect(g, 3, 16, 26, 20, "g_pared");
    rect(g, 3, 16, 26, 2, "tierra_d");
    for (let x = 6; x < 29; x += 5) rect(g, x, 18, 1, 18, "tierra_d");
    rect(g, 12, 24, 8, 12, "tronco_d");
    triangulo(g, 16, 22, 3, 8, "tronco_d");
    for (let j = 0; j < 10; j++) {
      const w = Math.round(8 + (32 - 8) * (j / 9));
      rect(g, Math.round((32 - w) / 2), j + 4, w, 1, j < 2 ? "g_tejado_d" : "g_tejado");
    }
    rect(g, 1, 13, 30, 3, "g_tejado_d");
    rect(g, 13, 36, 6, 4, "madera");
    rect(g, 13, 37, 6, 1, "madera_d");
    return frame(g);
  }

  // ── animales ───────────────────────────────────────────────────────────
  function spriteGallina(frameIdx) {
    const g = crearGrid(16, 16);
    circulo(g, 7, 9, 4.5, "blanco");
    rect(g, 3, 8, 3, 3, "crema");
    circulo(g, 11, 5, 2.5, "blanco");
    punto(g, 11, 2, "cresta"); punto(g, 12, 2, "cresta");
    rect(g, 13, 5, 2, 1, "pico");
    punto(g, 11, 4, "negro");
    punto(g, 7, 9, "crema"); punto(g, 8, 9, "crema"); punto(g, 6, 10, "crema");
    if (frameIdx === 0) { rect(g, 5, 13, 1, 3, "pico"); rect(g, 9, 13, 1, 3, "pico"); }
    else { rect(g, 6, 13, 1, 3, "pico"); rect(g, 8, 14, 1, 2, "pico"); }
    return frame(g);
  }
  function spriteOveja(frameIdx) {
    const g = crearGrid(18, 16);
    circulo(g, 8, 8, 5, "negro");
    circulo(g, 5, 6, 3, "negro"); circulo(g, 11, 6, 3, "negro");
    circulo(g, 12, 9, 3.5, "negro");
    punto(g, 4, 4, "negro_l"); punto(g, 8, 3, "negro_l"); punto(g, 12, 4, "negro_l");
    punto(g, 6, 5, "negro_l"); punto(g, 10, 8, "negro_l");
    rect(g, 13, 6, 4, 4, "rosa_oveja");
    punto(g, 15, 7, "negro");
    punto(g, 13, 5, "negro");
    rect(g, 5, 13, 1, 3, "gris");
    rect(g, 11, 13, 1, 3, "gris");
    rect(g, frameIdx === 0 ? 8 : 7, 13, 1, 3, "gris");
    rect(g, frameIdx === 0 ? 13 : 14, 13, 1, 3, "gris");
    return frame(g);
  }

  // ── jugador (parametrizado por colores, para personajes online) ───────
  // c: { piel, piel_d, pelo, camisa, camisa_d, pantalon, bota } en hex
  // (gridACanvas acepta colores que no estén en la PALETA). Los ojos llevan
  // blanco + pupila oscura para que se vean sobre cualquier color de piel.
  const BLANCO_OJO = "#ffffff", PUPILA = "#1a1a1a";
  function spriteJugador(dir, frameIdx, c) {
    const g = crearGrid(16, 26);
    const pasoIzq = frameIdx === 0 ? 0 : 1, pasoDer = frameIdx === 0 ? 1 : 0;
    rect(g, 5, 18 + pasoIzq, 3, 6 - pasoIzq, c.pantalon);
    rect(g, 9, 18 + pasoDer, 3, 6 - pasoDer, c.pantalon);
    rect(g, 5, 23 + pasoIzq, 3, 2, c.bota);
    rect(g, 9, 23 + pasoDer, 3, 2, c.bota);
    rect(g, 4, 10, 9, 9, c.camisa);
    rect(g, 4, 10, 9, 2, c.camisa_d);
    rect(g, 4, 17, 9, 2, c.pantalon);
    rect(g, 2, 11, 2, 7, c.camisa_d); punto(g, 2, 17, c.piel);
    rect(g, 13, 11, 2, 7, c.camisa_d); punto(g, 14, 17, c.piel);
    circulo(g, 8, 5, 4.5, c.piel);
    if (dir === "abajo") {
      rect(g, 3, 1, 11, 3, c.pelo);
      punto(g, 3, 4, c.pelo); punto(g, 13, 4, c.pelo);
      punto(g, 5, 5, BLANCO_OJO); punto(g, 6, 5, PUPILA);
      punto(g, 10, 5, PUPILA); punto(g, 11, 5, BLANCO_OJO);
      punto(g, 6, 8, c.piel_d); punto(g, 10, 8, c.piel_d);
      rect(g, 7, 8, 3, 1, c.piel_d);
    } else if (dir === "arriba") {
      rect(g, 3, 0, 11, 8, c.pelo);
      rect(g, 4, 7, 9, 1, c.pelo);
    } else {
      rect(g, 3, 1, 11, 4, c.pelo);
      punto(g, 3, 5, c.pelo);
      punto(g, 10, 5, BLANCO_OJO); punto(g, 11, 5, PUPILA);
      punto(g, 13, 7, c.piel_d);
    }
    return frame(g);
  }

  // Juego completo de sprites de un personaje con sus colores.
  function crearSpritesJugador(c) {
    return {
      abajo: { frames: [spriteJugador("abajo", 0, c), spriteJugador("abajo", 1, c)], sombra: 6 },
      arriba: { frames: [spriteJugador("arriba", 0, c), spriteJugador("arriba", 1, c)], sombra: 6 },
      lado: { frames: [spriteJugador("lado", 0, c), spriteJugador("lado", 1, c)], sombra: 6 },
    };
  }

  const COLORES_JUGADOR_DEFECTO = {
    piel: PALETA.piel, piel_d: PALETA.piel_d, pelo: PALETA.pelo,
    camisa: PALETA.camisa, camisa_d: PALETA.camisa_d,
    pantalon: PALETA.pantalon, bota: PALETA.bota,
  };

  // ── registro de sprites ───────────────────────────────────────────────
  const SPRITES = {
    hierba: { frames: [spriteHierba(0), spriteHierba(1), spriteHierba(2), spriteHierba(3)] },
    hierba_flor_b: { frames: [spriteHierbaFlor("flor_b")] },
    hierba_flor_r: { frames: [spriteHierbaFlor("flor_r")] },
    exterior: { frames: [spriteExterior(0), spriteExterior(1), spriteExterior(2)] },
    camino: { frames: [spriteCamino()] },
    grava: { frames: [spriteGrava(0), spriteGrava(1), spriteGrava(2)] },
    agua: { frames: [spriteAgua(0), spriteAgua(1), spriteAgua(2)] },
    alga: { frames: [spriteAlga(0), spriteAlga(1)] },

    pino: { frames: [spritePino()], sombra: 14 },
    roble: { frames: [spriteRoble()], sombra: 16 },
    encina: { frames: [spriteEncina()], sombra: 16 },
    olivo: { frames: [spriteOlivo()], sombra: 13 },
    manzano: { frames: [frutal([[-10, -3], [8, -1], [-2, 5], [12, -7], [-14, 2]], "rojo")], sombra: 14 },
    peral: { frames: [frutal([[-8, 0], [6, -6], [12, 2], [-2, -10], [-13, -4]], "amarillo")], sombra: 14 },
    cerezo: { frames: [frutal([[-10, -4], [8, -6], [0, 2], [-4, -10], [12, 0], [-14, 1]], "rojo", 56, 70, 19)], sombra: 13 },
    ciruelo: { frames: [frutal([[-8, -4], [8, 0], [0, -8], [6, 6], [-12, 2]], "morado", 56, 70, 19)], sombra: 13 },
    nogal: { frames: [frutoSeco([[-12, 4], [10, 6], [0, 8], [-6, -4], [14, -2]], "nuez")], sombra: 16 },
    almendro: { frames: [frutoSeco([[-10, -8], [6, -10], [-2, -12], [12, -4], [-14, -2], [8, 4]], "rosa", 60, 78, 22)], sombra: 14 },
    castano: { frames: [frutoSeco([[-12, 0], [10, -2], [-2, 8], [6, 10], [-8, -8], [14, 4]], "nuez", 64, 84, 24)], sombra: 16 },
    pistacho: { frames: [spritePistacho()], sombra: 11 },

    endrino: { frames: [spriteEndrino()], sombra: 9 },
    arandano: { frames: [spriteArandano()], sombra: 8 },
    lavanda: { frames: [spriteLavanda()], sombra: 7 },
    fresa: { frames: [spriteFresa()], sombra: 0 },
    flores: { frames: [spriteFlores()], sombra: 0 },

    caseta: { frames: [spriteCaseta()], sombra: 0 },
    gallinero: { frames: [spriteGallinero()], sombra: 0 },
    letrina: { frames: [spriteLetrina()], sombra: 0 },
    gallina: { frames: [spriteGallina(0), spriteGallina(1)], sombra: 5 },
    oveja_negra: { frames: [spriteOveja(0), spriteOveja(1)], sombra: 7 },

    jugador_abajo: { frames: [spriteJugador("abajo", 0, COLORES_JUGADOR_DEFECTO), spriteJugador("abajo", 1, COLORES_JUGADOR_DEFECTO)], sombra: 6 },
    jugador_arriba: { frames: [spriteJugador("arriba", 0, COLORES_JUGADOR_DEFECTO), spriteJugador("arriba", 1, COLORES_JUGADOR_DEFECTO)], sombra: 6 },
    jugador_lado: { frames: [spriteJugador("lado", 0, COLORES_JUGADOR_DEFECTO), spriteJugador("lado", 1, COLORES_JUGADOR_DEFECTO)], sombra: 6 },
  };

  function dibujarSprite(ctx, fr, fx, fy, fw, fh, escala, espejo) {
    const w = fr.ancho * escala, h = fr.alto * escala;
    const x = fx + (fw - w) / 2;
    const y = fy + fh - h;
    if (espejo) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(fr.canvas, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(fr.canvas, x, y, w, h);
    }
  }

  function dibujarSombra(ctx, cx, cy, radio, escala) {
    if (!radio) return;
    ctx.save();
    ctx.fillStyle = "rgba(20, 40, 20, 0.28)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, radio * escala, radio * escala * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  Object.assign(window.Granja, { PALETA, SPRITES, dibujarSprite, dibujarSombra, hash2, crearSpritesJugador });
})();
