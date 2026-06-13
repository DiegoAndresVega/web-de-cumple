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
    // plantas silvestres nuevas
    retama_v: "#5f9243", retama_d: "#4a7634", retama_f: "#f4d83a",
    espino_v: "#557e3f", espino_d: "#446636", espino_l: "#6f9c54",
    zarza_v: "#3f6b35", zarza_d: "#2f5228", zarza_l: "#577f44", mora: "#352a4a",
    amapola_r: "#d83a30", amapola_d: "#7e1e18",
    tomillo_v: "#7e9a6e", tomillo_d: "#647e57", tomillo_f: "#d8a8c8",
    romero_v: "#5e8056", romero_d: "#4a6644", romero_l: "#7a9c70", romero_f: "#9ab4e6",
    euforbio_v: "#7a9a7c", euforbio_d: "#5f7a60", euforbio_f: "#d8e068", // ciatios verde-amarillentos
    // animales
    blanco: "#f7f3e8", crema: "#e3d8bd", cresta: "#e04848", pico: "#efa23b",
    negro: "#2b2724", negro_l: "#3d3833", gris: "#6b645c", rosa_oveja: "#e8b4ac",
    // fauna silvestre
    pardo: "#8a6644", pardo_d: "#6b4e33", pardo_l: "#a98a60",
    pata_roja: "#d6604a", abub: "#d8a878", abub_d: "#b8885c",
    perdiz_p: "#9a8268", perdiz_d: "#7a6650",
    lag_v: "#7ca24a", lag_d: "#5f8138", sierpe: "#a89058", sierpe_d: "#5e5030",
    rana_v: "#5fae3c", rana_d: "#47882c",
    libe: "#3da8c8", libe_d: "#2c80a0",
    oruga_v: "#9ac24e", oruga_l: "#c2da6e", oruga_d: "#5f7a2c",
    zorro_n: "#d8743a", zorro_d: "#b05a28",
    corredor_v: "#8a9a52", corredor_d: "#67753a",   // sapo corredor (oliva)
    calzada: "#6e5236", calzada_l: "#8a6a48",        // águila calzada (parda)
    sanjuan: "#8a5524", sanjuan_l: "#a86a30", sanjuan_d: "#5e3818", // escarabajo sanjuanero
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

  function spriteRetama() {
    // Cytisus scoparius: abanico de tallos verdes finos cuajados de flor amarilla
    const g = crearGrid(28, 26);
    rect(g, 12, 22, 4, 4, "tronco_d");
    const tallos = [[-10, 9], [-6, 5], [-2, 2], [2, 3], [6, 6], [10, 10]];
    for (const [dx, yTop] of tallos) {
      const pasos = 22 - yTop;
      for (let i = 0; i <= pasos; i++) {
        const x = Math.round(14 + (dx * i) / pasos);
        punto(g, x, 22 - i, i % 3 === 0 ? "retama_d" : "retama_v");
        if (i > 2 && i % 2 === 0) punto(g, x + (dx < 0 ? -1 : 1), 22 - i, "retama_v");
      }
    }
    // flor amarilla salpicada por los dos tercios superiores
    for (const [x, y] of [[4, 8], [7, 5], [10, 3], [14, 2], [18, 4], [21, 7], [24, 10],
      [6, 12], [11, 7], [16, 6], [20, 11], [9, 10], [13, 5], [17, 10], [23, 13], [3, 13]]) {
      punto(g, x, y, "retama_f");
      if ((x + y) % 3 === 0) punto(g, x + 1, y, "retama_f");
    }
    return frame(g);
  }
  function spriteEspino() {
    // Crataegus monogyna: arbolillo de copa densa con flor blanca y majuelas rojas
    const g = crearGrid(34, 38);
    rect(g, 15, 30, 4, 8, "tronco");
    rect(g, 15, 30, 1, 8, "tronco_l");
    rect(g, 18, 30, 1, 8, "tronco_d");
    copaFrondosa(g, 17, 16, 12, "espino_v", "espino_d", "espino_l", "espino_l");
    for (const [x, y] of [[9, 11], [24, 9], [16, 5], [12, 19], [22, 17], [18, 12], [6, 16], [27, 14]]) {
      punto(g, x, y, "flor_b");
    }
    for (const [x, y] of [[13, 15], [20, 8], [25, 19], [9, 8], [16, 22]]) fruto(g, x, y, "rojo");
    return frame(g);
  }
  function spriteZarza() {
    // Rubus ulmifolius: mata enmarañada baja con moras
    const g = crearGrid(32, 18);
    circulo(g, 10, 11, 7, "zarza_d");
    circulo(g, 21, 11, 8, "zarza_v");
    circulo(g, 14, 8, 6, "zarza_v");
    circulo(g, 9, 8, 4, "zarza_l");
    circulo(g, 19, 7, 3, "zarza_l");
    // sarmientos arqueados que sobresalen
    for (const [x0, y0, dx] of [[3, 6, -1], [27, 5, 1], [15, 2, 1]]) {
      punto(g, x0, y0, "zarza_d"); punto(g, x0 + dx, y0 - 1, "zarza_d"); punto(g, x0 + dx * 2, y0 - 2, "zarza_v");
    }
    for (const [x, y] of [[7, 11], [13, 13], [19, 10], [25, 12], [16, 7], [22, 15]]) fruto(g, x, y, "mora");
    punto(g, 11, 6, "flor_b"); punto(g, 24, 8, "flor_b");
    return frame(g);
  }
  function spriteAmapola() {
    // Papaver rhoeas: matita con amapolas rojas
    const g = crearGrid(18, 15);
    for (const [x, h] of [[4, 7], [9, 10], [14, 6]]) {
      rect(g, x, 14 - h, 1, h, "retama_v");
      punto(g, x - 1, 13, "retama_v"); punto(g, x + 1, 12, "retama_d");
      // corola roja con centro oscuro
      const cy = 13 - h;
      rect(g, x - 1, cy - 1, 3, 3, "amapola_r");
      punto(g, x - 2, cy, "amapola_r"); punto(g, x + 2, cy, "amapola_r");
      punto(g, x, cy, "amapola_d");
    }
    punto(g, 2, 13, "hierba_l"); punto(g, 12, 13, "hierba_l"); punto(g, 16, 14, "hierba_l");
    return frame(g);
  }
  function spriteRomero() {
    // Salvia rosmarinus: mata erguida de agujas verde grisáceo con flor azulada
    const g = crearGrid(22, 20);
    rect(g, 10, 17, 2, 3, "tronco_d");
    const ramas = [[-7, 8], [-4, 4], [-1, 2], [2, 3], [5, 5], [8, 9]];
    for (const [dx, yTop] of ramas) {
      const pasos = 17 - yTop;
      for (let i = 0; i <= pasos; i++) {
        const x = Math.round(11 + (dx * i) / pasos);
        punto(g, x, 17 - i, "romero_v");
        if (i % 2 === 1) { punto(g, x - 1, 17 - i, "romero_d"); punto(g, x + 1, 17 - i, "romero_l"); }
      }
    }
    for (const [x, y] of [[5, 9], [9, 5], [13, 4], [17, 8], [7, 13], [15, 12], [11, 8], [12, 3]]) {
      punto(g, x, y, "romero_f");
    }
    return frame(g);
  }
  function spriteTomillo() {
    // Thymus zygis: cojín bajo gris-verde con florecilla rosada
    const g = crearGrid(18, 11);
    circulo(g, 6, 7, 4, "tomillo_d");
    circulo(g, 12, 7, 4, "tomillo_v");
    circulo(g, 9, 5, 4, "tomillo_v");
    punto(g, 5, 4, "tomillo_v"); punto(g, 13, 4, "tomillo_d");
    for (const [x, y] of [[4, 4], [8, 2], [12, 3], [15, 5], [6, 6], [10, 5], [14, 7]]) {
      punto(g, x, y, "tomillo_f");
    }
    return frame(g);
  }
  function spriteEuforbio() {
    // Euphorbia serrata: mata erguida de hojas estrechas serradas, remata
    // en umbelas de ciatios verde-amarillentos (su rasgo más vistoso, y la
    // planta nutricia de la oruga de Hyles euphorbiae)
    const g = crearGrid(16, 16);
    circulo(g, 8, 13, 4, "euforbio_d");
    circulo(g, 5, 12, 3, "euforbio_v");
    circulo(g, 11, 12, 3, "euforbio_v");
    const tallos = [[4, 9], [7, 11], [10, 10], [13, 8]];
    for (const [x, h] of tallos) {
      rect(g, x, 13 - h, 1, h, "euforbio_v");
      for (let i = 1; i < h - 1; i += 2) {
        punto(g, x - 1, 13 - h + i, "euforbio_v");
        punto(g, x + 1, 13 - h + i + 1, "euforbio_d");
      }
    }
    for (const [x, h] of tallos) {
      rect(g, x - 1, 12 - h, 3, 2, "euforbio_f");
      punto(g, x, 11 - h, "euforbio_f");
    }
    return frame(g);
  }

  function spriteLetrero() {
    // cartel de madera donde la peña deja sus mensajes
    const g = crearGrid(16, 15);
    rect(g, 7, 10, 2, 5, "tronco_d");        // poste
    rect(g, 1, 1, 14, 9, "madera");          // tabla
    rect(g, 1, 1, 14, 1, "madera_l");
    rect(g, 1, 9, 14, 1, "madera_d");
    rect(g, 0, 1, 1, 9, "madera_d"); rect(g, 15, 1, 1, 9, "madera_d");
    rect(g, 3, 3, 10, 1, "tronco_d");        // renglones "escritos"
    rect(g, 3, 5, 8, 1, "tronco_d");
    rect(g, 3, 7, 9, 1, "tronco_d");
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

  // ── fauna silvestre (vista lateral mirando a la derecha) ──────────────
  function spriteGorrion() {
    const g = crearGrid(8, 7);
    rect(g, 0, 3, 2, 1, "pardo_d");          // cola
    circulo(g, 4, 4, 2, "pardo");            // cuerpo menudo
    rect(g, 2, 5, 3, 1, "crema");            // pecho claro
    rect(g, 2, 3, 3, 2, "pardo_d");          // ala plegada
    circulo(g, 6, 2, 1.3, "pardo_d");        // cabeza con capirote
    punto(g, 6, 3, "crema");                 // mejilla
    punto(g, 6, 2, "negro");                 // ojo
    punto(g, 7, 3, "negro");                 // pico
    punto(g, 3, 6, "pardo_d"); punto(g, 5, 6, "pardo_d"); // patitas
    return frame(g);
  }
  function spriteGorrionVuelo(f) {
    const g = crearGrid(10, 8);
    rect(g, 0, 4, 2, 1, "pardo_d");          // cola
    circulo(g, 5, 4, 2, "pardo");            // cuerpo
    rect(g, 3, 5, 3, 1, "crema");            // pecho
    circulo(g, 7, 3, 1.3, "pardo_d");        // cabeza
    punto(g, 7, 3, "negro"); punto(g, 9, 4, "negro"); // ojo y pico
    if (f === 0) { rect(g, 3, 1, 2, 3, "pardo_d"); rect(g, 4, 0, 2, 2, "pardo"); } // alas arriba
    else { rect(g, 3, 5, 2, 2, "pardo_d"); rect(g, 4, 6, 2, 1, "pardo"); }          // alas abajo
    return frame(g);
  }
  function spriteUrraca() {
    const g = crearGrid(16, 11);
    rect(g, 0, 3, 6, 2, "negro");            // cola larga
    punto(g, 0, 2, "negro_l");
    circulo(g, 9, 6, 2.8, "negro");          // cuerpo
    rect(g, 8, 7, 4, 2, "blanco");           // vientre blanco
    rect(g, 6, 5, 3, 2, "blanco");           // hombro blanco
    circulo(g, 12, 4, 1.9, "negro");         // cabeza
    punto(g, 12, 4, "blanco");               // ojo
    rect(g, 14, 4, 2, 1, "gris");            // pico
    punto(g, 9, 9, "gris"); punto(g, 11, 9, "gris"); // patas
    return frame(g);
  }
  function spriteUrracaVuelo(f) {
    const g = crearGrid(18, 11);
    rect(g, 0, 5, 6, 2, "negro");
    circulo(g, 9, 6, 2.6, "negro");
    rect(g, 8, 7, 4, 1, "blanco");
    circulo(g, 13, 5, 1.8, "negro");
    punto(g, 13, 5, "blanco"); rect(g, 15, 5, 2, 1, "gris");
    if (f === 0) { rect(g, 6, 1, 3, 5, "negro"); rect(g, 7, 2, 2, 2, "blanco"); }
    else { rect(g, 6, 7, 3, 4, "negro"); rect(g, 7, 8, 2, 2, "blanco"); }
    return frame(g);
  }
  function spriteAbubilla() {
    const g = crearGrid(14, 12);
    rect(g, 0, 5, 4, 2, "negro");            // cola con banda
    punto(g, 1, 5, "blanco"); punto(g, 2, 6, "blanco");
    circulo(g, 6, 7, 2.6, "abub");           // cuerpo canela
    rect(g, 4, 5, 5, 3, "negro");            // ala rayada
    punto(g, 5, 6, "blanco"); punto(g, 7, 6, "blanco"); punto(g, 6, 7, "blanco");
    circulo(g, 9, 5, 1.8, "abub");           // cabeza
    punto(g, 9, 5, "negro");                 // ojo
    rect(g, 11, 5, 3, 1, "negro");           // pico largo curvo
    punto(g, 13, 6, "negro");
    // cresta abierta con puntas negras
    punto(g, 8, 2, "abub"); punto(g, 9, 1, "abub"); punto(g, 10, 2, "abub");
    punto(g, 8, 1, "negro"); punto(g, 9, 0, "negro"); punto(g, 10, 1, "negro");
    punto(g, 6, 10, "gris"); punto(g, 8, 10, "gris");
    return frame(g);
  }
  function spriteAbubillaVuelo(f) {
    const g = crearGrid(15, 12);
    rect(g, 0, 6, 4, 1, "negro"); punto(g, 1, 6, "blanco");
    circulo(g, 7, 6, 2.4, "abub");
    circulo(g, 10, 5, 1.6, "abub");
    punto(g, 10, 5, "negro"); rect(g, 12, 5, 3, 1, "negro");
    punto(g, 9, 2, "abub"); punto(g, 9, 1, "negro");
    if (f === 0) { rect(g, 5, 1, 3, 5, "negro"); punto(g, 6, 2, "blanco"); punto(g, 6, 4, "blanco"); }
    else { rect(g, 5, 7, 3, 4, "negro"); punto(g, 6, 8, "blanco"); punto(g, 6, 10, "blanco"); }
    return frame(g);
  }
  function spriteCiguena() {
    const g = crearGrid(14, 20);
    rect(g, 6, 13, 1, 6, "pata_roja");       // patas largas
    rect(g, 9, 13, 1, 6, "pata_roja");
    circulo(g, 7, 10, 3.4, "blanco");        // cuerpo
    rect(g, 3, 8, 5, 4, "negro");            // remeras negras plegadas
    punto(g, 3, 12, "negro");
    rect(g, 10, 4, 2, 6, "blanco");          // cuello
    circulo(g, 11, 3, 1.7, "blanco");        // cabeza
    punto(g, 11, 3, "negro");                // ojo
    rect(g, 13, 3, 4, 1, "pata_roja");       // pico largo rojo
    return frame(g);
  }
  function spriteCiguenaVuelo(f) {
    const g = crearGrid(22, 13);
    rect(g, 0, 6, 5, 1, "negro");            // patas estiradas atrás
    rect(g, 0, 7, 3, 1, "pata_roja");
    circulo(g, 9, 6, 2.8, "blanco");         // cuerpo
    rect(g, 13, 5, 4, 2, "blanco");          // cuello extendido
    circulo(g, 17, 5, 1.5, "blanco");
    punto(g, 17, 5, "negro");
    rect(g, 19, 5, 3, 1, "pata_roja");
    if (f === 0) { rect(g, 6, 0, 7, 3, "blanco"); rect(g, 6, 0, 7, 1, "negro"); rect(g, 5, 2, 3, 2, "negro"); }
    else { rect(g, 6, 9, 7, 3, "blanco"); rect(g, 6, 11, 7, 1, "negro"); rect(g, 5, 8, 3, 2, "negro"); }
    return frame(g);
  }
  function spritePerdiz(f) {
    const g = crearGrid(13, 11);
    circulo(g, 6, 6, 3.6, "perdiz_p");       // cuerpo rechoncho
    rect(g, 0, 4, 3, 2, "perdiz_d");         // cola corta
    rect(g, 3, 7, 3, 2, "perdiz_d");         // flanco barrado
    punto(g, 4, 7, "blanco"); punto(g, 5, 8, "negro");
    circulo(g, 9, 4, 2, "perdiz_p");         // cabeza
    rect(g, 9, 5, 3, 1, "blanco");           // garganta blanca
    punto(g, 9, 6, "negro"); punto(g, 10, 6, "negro"); // collar negro
    punto(g, 9, 3, "negro");                 // ojo
    rect(g, 11, 4, 2, 1, "pata_roja");       // pico rojo
    rect(g, f === 0 ? 5 : 6, 9, 1, 2, "pata_roja"); // patas rojas
    rect(g, f === 0 ? 8 : 7, 9, 1, 2, "pata_roja");
    return frame(g);
  }
  function spriteLagartija(f) {
    const g = crearGrid(12, 5);
    rect(g, 3, 2, 6, 2, "gris");             // cuerpo
    rect(g, 0, 3 - (f === 0 ? 0 : 1), 3, 1, "gris");   // cola que culebrea
    rect(g, 9, 1, 3, 2, "gris");             // cabeza
    punto(g, 10, 1, "negro");                // ojo
    punto(g, 4, 2, "pardo_d"); punto(g, 6, 3, "pardo_d"); // moteado dorsal
    // patitas alternas
    punto(g, 4, f === 0 ? 4 : 1, "gris"); punto(g, 8, f === 0 ? 1 : 4, "gris");
    return frame(g);
  }
  function spriteLagarto(f) {
    const g = crearGrid(18, 7);
    rect(g, 5, 2, 8, 3, "lag_v");            // cuerpo
    rect(g, 0, 4 - (f === 0 ? 0 : 1), 5, 2, "lag_v");  // colaza
    rect(g, 0, 4 - (f === 0 ? 0 : 1), 3, 1, "lag_d");
    rect(g, 13, 1, 4, 3, "lag_v");           // cabezón
    punto(g, 15, 1, "negro");                // ojo
    rect(g, 6, 2, 6, 1, "lag_d");            // lomo
    punto(g, 7, 3, "agua"); punto(g, 10, 4, "agua"); // ocelos azules
    // patas
    rect(g, 6, f === 0 ? 5 : 4, 1, 2, "lag_d"); rect(g, 11, f === 0 ? 4 : 5, 1, 2, "lag_d");
    return frame(g);
  }
  function spriteCulebra(f) {
    const g = crearGrid(18, 6);
    // cuerpo ondulado en S, dos fases de reptación
    for (let x = 0; x < 15; x++) {
      const y = 2 + Math.round(Math.sin(x / 2.2 + (f === 0 ? 0 : Math.PI)) * 1.4);
      punto(g, x, y, "sierpe"); punto(g, x, y + 1, "sierpe");
      if (x % 3 === 1) punto(g, x, y, "sierpe_d"); // peldaños de la escalera
    }
    rect(g, 14, 1, 3, 2, "sierpe");          // cabeza
    punto(g, 15, 1, "sierpe_d"); punto(g, 16, 1, "negro"); // ojo
    punto(g, 17, 2, "amapola_r");            // lengua
    return frame(g);
  }
  function spriteRana(f) {
    const g = crearGrid(9, 7);
    circulo(g, 4, 4, 2.6, "rana_v");         // cuerpo
    rect(g, 2, 5, 5, 1, "crema");            // papada clara
    punto(g, 2, 1, "rana_v"); punto(g, 6, 1, "rana_v"); // ojos saltones
    punto(g, 2, 2, "rana_d"); punto(g, 6, 2, "rana_d");
    punto(g, 2, 1, "negro"); punto(g, 6, 1, "negro");
    punto(g, 4, 3, "rana_d");                // raya dorsal
    if (f === 0) { rect(g, 2, 6, 2, 1, "rana_d"); rect(g, 5, 6, 2, 1, "rana_d"); }
    else { rect(g, 0, 5, 2, 2, "rana_d"); rect(g, 7, 5, 2, 2, "rana_d"); } // ancas estiradas
    return frame(g);
  }
  function spriteSapo(f) {
    const g = crearGrid(12, 9);
    // ancas/patas traseras potentes que alternan al andar (no salta: camina)
    if (f === 0) { rect(g, 0, 4, 3, 2, "pardo_d"); rect(g, 9, 6, 3, 2, "pardo_d"); }
    else         { rect(g, 0, 6, 3, 2, "pardo_d"); rect(g, 9, 4, 3, 2, "pardo_d"); }
    circulo(g, 6, 5, 4, "pardo");            // cuerpo ancho y rechoncho
    rect(g, 3, 7, 6, 2, "pardo_d");          // vientre en sombra
    // patitas delanteras que asoman al frente, alternando
    rect(g, 4, 7, 1, 2, f === 0 ? "pardo_l" : "pardo_d");
    rect(g, 7, 7, 1, 2, f === 0 ? "pardo_d" : "pardo_l");
    // glándulas paratoides marcadas detrás de cada ojo
    punto(g, 3, 3, "pardo_l"); punto(g, 9, 3, "pardo_l");
    // ojos saltones con iris cobrizo y pupila
    punto(g, 4, 2, "amarillo"); punto(g, 8, 2, "amarillo");
    punto(g, 4, 2, "negro");    punto(g, 8, 2, "negro");
    punto(g, 6, 2, "pardo");                 // hocico romo entre los ojos
    // verrugas dispersas (su piel rugosa, no de piedra)
    punto(g, 5, 5, "pardo_d"); punto(g, 7, 4, "pardo_d"); punto(g, 6, 6, "pardo_d");
    punto(g, 4, 4, "pardo_l"); punto(g, 8, 5, "pardo_l");
    return frame(g);
  }
  function spriteLibelula(f) {
    // f 0: posada (alas plegadas a lo largo); 1-2: volando (alas finas batiendo)
    const g = crearGrid(14, 9);
    if (f === 1) {                            // alas en vertical
      rect(g, 5, 0, 1, 4, "agua_ll"); rect(g, 8, 0, 1, 4, "agua_ll");
      rect(g, 5, 5, 1, 4, "agua_ll"); rect(g, 8, 5, 1, 4, "agua_ll");
    } else if (f === 2) {                     // alas abiertas en diagonal
      rect(g, 3, 2, 3, 1, "agua_ll"); rect(g, 8, 2, 3, 1, "agua_ll");
      rect(g, 3, 6, 3, 1, "agua_ll"); rect(g, 8, 6, 3, 1, "agua_ll");
    }
    rect(g, 0, 4, 10, 1, "libe");            // abdomen fino azul
    punto(g, 1, 4, "libe_d"); punto(g, 3, 4, "libe_d"); punto(g, 5, 4, "libe_d");
    if (f === 0) rect(g, 2, 3, 8, 1, "agua_ll"); // alas plegadas encima
    rect(g, 10, 3, 2, 3, "libe");            // tórax
    punto(g, 12, 3, "negro"); punto(g, 12, 5, "negro"); // ojazos
    return frame(g);
  }
  function spriteOruga(f) {
    const g = crearGrid(11, 5);
    const seg = f === 0 ? [0, 2, 4, 6] : [1, 3, 4, 6];   // se encoge y estira
    for (let i = 0; i < seg.length; i++) {
      rect(g, Math.round(seg[i]), 1 + (i % 2 === 0 ? 1 : 0), 3, 3, i % 2 ? "oruga_l" : "oruga_v");
    }
    rect(g, 8, 1, 3, 3, "oruga_d");          // cabeza
    punto(g, 10, 2, "negro");                // ojo
    punto(g, 8, 0, "oruga_d"); punto(g, 10, 0, "oruga_d"); // antenitas
    return frame(g);
  }
  function spriteMariquita(f) {
    const g = crearGrid(6, 5);
    circulo(g, 3, 2, 2.2, "rojo");           // élitros
    rect(g, 3, 0, 1, 4, "negro_l");          // línea central
    punto(g, 0, 2, "negro"); punto(g, 1, 2, "negro"); // cabeza
    punto(g, 2, 1, "negro"); punto(g, 4, 1, "negro"); punto(g, 4, 3, "negro"); punto(g, 2, 3, "negro"); // puntos
    punto(g, f === 0 ? 2 : 3, 4, "negro"); punto(g, f === 0 ? 4 : 5, 4, "negro"); // patitas
    return frame(g);
  }
  function spriteZorro(f) {
    const g = crearGrid(17, 11);
    circulo(g, 3, 6, 2.4, "zorro_n");        // cola tupida
    punto(g, 1, 5, "blanco"); punto(g, 1, 6, "blanco"); punto(g, 2, 6, "blanco"); // punta blanca
    rect(g, 5, 4, 7, 4, "zorro_n");          // cuerpo
    rect(g, 5, 4, 7, 1, "zorro_d");          // lomo
    rect(g, 11, 2, 4, 4, "zorro_n");         // cabeza
    punto(g, 11, 1, "zorro_n"); punto(g, 14, 1, "zorro_n"); // orejas puntiagudas
    punto(g, 11, 0, "negro_l"); punto(g, 14, 0, "negro_l"); // puntas oscuras
    punto(g, 13, 3, "negro");                // ojo
    rect(g, 15, 4, 2, 2, "blanco"); punto(g, 16, 4, "negro"); // hocico blanco y trufa
    rect(g, 11, 6, 3, 2, "blanco");          // pecho blanco
    rect(g, f === 0 ? 6 : 7, 8, 1, 3, "negro_l"); // patas oscuras alternas
    rect(g, f === 0 ? 10 : 9, 8, 1, 3, "negro_l");
    return frame(g);
  }
  function spriteGineta(f) {
    const g = crearGrid(17, 8);
    for (let x = 0; x < 6; x++) rect(g, x, 4, 1, 2, x % 2 ? "negro" : "crema"); // colaza anillada
    rect(g, 6, 3, 7, 3, "crema");            // cuerpo moteado
    punto(g, 7, 3, "negro"); punto(g, 9, 4, "negro"); punto(g, 11, 3, "negro");
    punto(g, 8, 5, "negro"); punto(g, 12, 5, "negro");
    rect(g, 13, 2, 3, 3, "crema");           // cabeza
    punto(g, 13, 1, "crema"); punto(g, 15, 1, "crema"); // orejotas
    punto(g, 14, 3, "negro");                // ojo
    punto(g, 16, 4, "negro");                // hocico
    rect(g, f === 0 ? 7 : 8, 6, 1, 2, "crema");
    rect(g, f === 0 ? 11 : 10, 6, 1, 2, "crema");
    return frame(g);
  }
  function spriteComadreja(f) {
    const g = crearGrid(14, 7);
    rect(g, 0, 2, 2, 1, "pardo_d");          // colita
    rect(g, 2, 2, 9, 2, "pardo");            // cuerpo alargado
    rect(g, 3, 4, 7, 1, "blanco");           // vientre blanco
    rect(g, 10, 1, 3, 3, "pardo");           // cabeza
    punto(g, 11, 1, "negro");                // ojo
    punto(g, 13, 2, "negro");                // hocico
    rect(g, f === 0 ? 4 : 5, 5, 1, 2, "pardo_d");
    rect(g, f === 0 ? 9 : 8, 5, 1, 2, "pardo_d");
    return frame(g);
  }
  function spriteLiebre(f) {
    const g = crearGrid(14, 13);
    rect(g, 8, 0, 2, 5, "pardo_l");          // orejazas
    rect(g, 11, 0, 2, 5, "pardo_l");
    punto(g, 8, 1, "rosa_oveja"); punto(g, 11, 1, "rosa_oveja");
    circulo(g, 10, 6, 2.2, "pardo_l");       // cabeza
    punto(g, 11, 5, "negro");                // ojo
    punto(g, 13, 7, "pardo_d");              // hocico
    circulo(g, 5, 9, 3.4, "pardo_l");        // cuerpo agazapado
    rect(g, 2, 10, 8, 2, "pardo");
    punto(g, 1, 8, "blanco");                // rabito
    if (f === 0) { rect(g, 3, 12, 3, 1, "pardo_d"); rect(g, 8, 12, 3, 1, "pardo_d"); }
    else { rect(g, 1, 12, 3, 1, "pardo_d"); rect(g, 9, 12, 3, 1, "pardo_d"); } // zancada
    return frame(g);
  }
  function spriteSapoCorredor(f) {
    const g = crearGrid(11, 8);
    circulo(g, 5, 5, 3.2, "corredor_v");      // cuerpo achatado oliva
    rect(g, 2, 6, 7, 2, "corredor_d");
    rect(g, 2, 3, 7, 1, "flor_a");            // raya dorsal amarilla (su seña)
    punto(g, 3, 2, "corredor_v"); punto(g, 8, 2, "corredor_v"); // bultos oculares
    punto(g, 3, 2, "negro"); punto(g, 8, 2, "negro");
    punto(g, 4, 5, "corredor_d"); punto(g, 6, 5, "corredor_d"); // verrugas
    // corre con zancada amplia en vez de saltar
    rect(g, f === 0 ? 0 : 2, 7, 2, 1, "corredor_d");
    rect(g, f === 0 ? 9 : 7, 7, 2, 1, "corredor_d");
    return frame(g);
  }
  function spriteAguila() {
    const g = crearGrid(18, 17);
    // cola larga con banda terminal oscura
    rect(g, 1, 9, 5, 3, "pardo_d");
    rect(g, 1, 11, 5, 1, "negro");
    // cuerpo robusto y ancho de rapaz
    circulo(g, 9, 9, 5, "calzada");
    rect(g, 5, 9, 9, 6, "crema");             // pecho y vientre claros (morfo claro)
    punto(g, 7, 11, "calzada"); punto(g, 10, 12, "calzada"); punto(g, 12, 11, "calzada"); // motas pardas
    // ala plegada parda y potente sobre el lomo
    rect(g, 4, 4, 7, 6, "pardo_d");
    rect(g, 4, 4, 7, 1, "calzada_l");         // borde superior más claro
    punto(g, 5, 9, "negro"); punto(g, 7, 9, "negro"); punto(g, 9, 9, "negro"); // filo de las plumas
    // cabeza con capuchón claro y mirada fiera
    circulo(g, 13, 5, 2.6, "calzada");
    rect(g, 11, 4, 4, 2, "crema");
    punto(g, 14, 5, "flor_a"); punto(g, 15, 5, "negro"); // ojo
    rect(g, 15, 5, 2, 1, "flor_a"); rect(g, 16, 5, 1, 2, "negro"); punto(g, 16, 6, "negro"); // pico ganchudo
    // patas "calzadas" emplumadas con garras amarillas
    rect(g, 7, 14, 2, 2, "crema"); rect(g, 11, 14, 2, 2, "crema");
    punto(g, 7, 16, "flor_a"); punto(g, 8, 16, "flor_a");
    punto(g, 11, 16, "flor_a"); punto(g, 12, 16, "flor_a");
    return frame(g);
  }
  function spriteAguilaVuelo(f) {
    // silueta lateral, como el resto de aves: cabeza al frente, cola atrás,
    // y un ala potente que bate arriba/abajo. Cuerpo siempre macizo (sin huecos).
    const g = crearGrid(24, 14);
    rect(g, 0, 7, 4, 3, "pardo_d");           // cola en abanico
    rect(g, 0, 9, 4, 1, "negro");             // banda terminal
    rect(g, 4, 7, 11, 3, "calzada");          // cuerpo alargado y robusto
    rect(g, 5, 9, 9, 1, "crema");             // vientre claro
    circulo(g, 17, 7, 2, "calzada");          // cabeza adelantada
    rect(g, 16, 6, 3, 1, "crema");            // nuca clara
    punto(g, 18, 7, "flor_a");                // ojo amarillo
    rect(g, 19, 7, 2, 1, "negro"); punto(g, 20, 8, "negro"); // pico ganchudo
    if (f === 0) {                            // ala alzada (planeo / remonte)
      rect(g, 7, 1, 8, 6, "pardo_d");
      rect(g, 7, 1, 8, 1, "calzada_l");
      for (const x of [7, 9, 11, 13]) punto(g, x, 0, "pardo_d"); // plumas digitadas
    } else {                                  // ala batida hacia abajo
      rect(g, 7, 7, 8, 6, "pardo_d");
      rect(g, 7, 11, 8, 1, "calzada_l");
      for (const x of [7, 9, 11, 13]) punto(g, x, 13, "pardo_d");
    }
    return frame(g);
  }
  function spriteSanjuanero(f) {
    const g = crearGrid(8, 8);
    circulo(g, 4, 5, 2.6, "sanjuan");         // élitros pardos
    rect(g, 3, 3, 3, 4, "sanjuan_l");         // brillo dorsal
    punto(g, 4, 4, "sanjuan_d"); punto(g, 4, 6, "sanjuan_d"); // costura
    rect(g, 3, 1, 2, 2, "negro");             // cabeza/pronoto oscuro
    // antenas laminadas en abanico (su rasgo)
    punto(g, 2, 0, "sanjuan_l"); punto(g, 1, 0, "sanjuan_l"); punto(g, 1, 1, "sanjuan_l");
    punto(g, 5, 0, "sanjuan_l"); punto(g, 6, 0, "sanjuan_l"); punto(g, 6, 1, "sanjuan_l");
    // patitas alternas
    punto(g, f === 0 ? 1 : 2, 5, "negro"); punto(g, f === 0 ? 6 : 5, 5, "negro");
    punto(g, f === 0 ? 2 : 1, 7, "negro"); punto(g, f === 0 ? 5 : 6, 7, "negro");
    return frame(g);
  }

  // ── jugador (parametrizado por colores, para personajes online) ───────
  // c: { piel, piel_d, pelo, camisa, camisa_d, pantalon, bota } en hex
  // (gridACanvas acepta colores que no estén en la PALETA). Los ojos llevan
  // blanco + pupila oscura para que se vean sobre cualquier color de piel.
  const BLANCO_OJO = "#ffffff", PUPILA = "#1a1a1a";
  const CUERNO = "#e8dcc0", CUERNO_D = "#c9bb98"; // marfil para los cuernos

  // Peinados: cómo se pinta el pelo en cada dirección. "calvo" no pinta nada.
  const PEINADOS = ["corto", "largo", "pinchos", "loco", "cresta", "punk", "coletas", "cuernos", "calvo"];
  function dibujarPelo(g, dir, peinado, pelo) {
    if (peinado === "calvo") return;
    if (dir === "abajo") {
      if (peinado === "largo") {
        rect(g, 3, 1, 11, 3, pelo);
        rect(g, 2, 3, 2, 9, pelo); rect(g, 13, 3, 2, 9, pelo); // melena a los hombros
      } else if (peinado === "pinchos") {
        rect(g, 3, 2, 11, 2, pelo);
        for (const x of [3, 5, 7, 9, 11, 13]) punto(g, x, 1, pelo);
        for (const x of [4, 8, 12]) punto(g, x, 0, pelo);
      } else if (peinado === "loco") {
        rect(g, 3, 1, 11, 3, pelo);
        for (const [x, y] of [[1, 2], [14, 2], [3, 0], [8, 0], [12, 0], [0, 4], [15, 4], [6, 0], [10, 0], [15, 1]]) punto(g, x, y, pelo);
      } else if (peinado === "cresta") {
        // cresta tipo gallo: tira central alzada, laterales rapados (piel a la vista)
        rect(g, 6, 1, 4, 3, pelo);
        rect(g, 7, 0, 2, 4, pelo);
      } else if (peinado === "punk") {
        // crestón de púas gruesas que recorren toda la coronilla
        rect(g, 5, 1, 7, 2, pelo);
        for (const x of [5, 7, 9, 11]) rect(g, x, 0, 1, 2, pelo);
      } else if (peinado === "coletas") {
        rect(g, 3, 1, 11, 3, pelo);
        punto(g, 3, 4, pelo); punto(g, 13, 4, pelo);
        rect(g, 1, 4, 2, 6, pelo); rect(g, 13, 4, 2, 6, pelo); // dos coletas a los lados
        punto(g, 1, 10, pelo); punto(g, 14, 10, pelo);         // puntas
      } else if (peinado === "cuernos") {
        rect(g, 4, 1, 9, 3, pelo); // pelo corto entre los cuernos
        // cuernos de marfil curvándose hacia arriba desde las sienes
        punto(g, 2, 2, CUERNO_D); punto(g, 2, 1, CUERNO); punto(g, 3, 0, CUERNO);
        punto(g, 13, 2, CUERNO_D); punto(g, 13, 1, CUERNO); punto(g, 12, 0, CUERNO);
      } else { // corto
        rect(g, 3, 1, 11, 3, pelo);
        punto(g, 3, 4, pelo); punto(g, 13, 4, pelo);
      }
    } else if (dir === "arriba") {
      if (peinado === "largo") {
        rect(g, 3, 0, 11, 8, pelo);
        rect(g, 3, 8, 11, 3, pelo); rect(g, 4, 11, 9, 1, pelo);
      } else if (peinado === "pinchos") {
        rect(g, 3, 2, 11, 6, pelo);
        for (const x of [3, 5, 7, 9, 11, 13]) punto(g, x, 1, pelo);
        for (const x of [4, 8, 12]) punto(g, x, 0, pelo);
      } else if (peinado === "loco") {
        rect(g, 3, 1, 11, 7, pelo);
        for (const [x, y] of [[1, 3], [14, 2], [2, 0], [8, 0], [13, 0], [0, 5], [15, 5], [5, 0], [10, 0]]) punto(g, x, y, pelo);
      } else if (peinado === "cresta") {
        rect(g, 6, 0, 4, 9, pelo);   // franja central por el cogote, cráneo a los lados
        rect(g, 7, 0, 2, 10, pelo);
      } else if (peinado === "punk") {
        rect(g, 4, 1, 9, 7, pelo);
        for (const x of [4, 6, 8, 10, 12]) punto(g, x, 0, pelo);
      } else if (peinado === "coletas") {
        rect(g, 3, 0, 11, 6, pelo);                            // melenita corta arriba
        rect(g, 2, 5, 2, 6, pelo); rect(g, 12, 5, 2, 6, pelo); // dos coletas colgando
      } else if (peinado === "cuernos") {
        rect(g, 3, 0, 11, 8, pelo); rect(g, 4, 7, 9, 1, pelo); // como corto
        punto(g, 2, 1, CUERNO_D); punto(g, 2, 0, CUERNO); punto(g, 3, 0, CUERNO);
        punto(g, 13, 1, CUERNO_D); punto(g, 13, 0, CUERNO); punto(g, 12, 0, CUERNO);
      } else {
        rect(g, 3, 0, 11, 8, pelo);
        rect(g, 4, 7, 9, 1, pelo);
      }
    } else { // lado
      if (peinado === "largo") {
        rect(g, 3, 1, 11, 4, pelo);
        rect(g, 3, 5, 4, 8, pelo); // melena cayendo por la espalda
      } else if (peinado === "pinchos") {
        rect(g, 3, 2, 11, 3, pelo);
        for (const x of [4, 6, 8, 10, 12]) punto(g, x, 1, pelo);
        for (const x of [5, 9, 13]) punto(g, x, 0, pelo);
      } else if (peinado === "loco") {
        rect(g, 3, 1, 11, 4, pelo);
        for (const [x, y] of [[2, 2], [1, 5], [3, 0], [7, 0], [11, 0], [14, 1], [15, 3], [5, 0]]) punto(g, x, y, pelo);
      } else if (peinado === "cresta") {
        rect(g, 4, 1, 8, 1, pelo);   // raíz sobre el cráneo
        rect(g, 4, 0, 7, 2, pelo);   // cresta alzada en perfil
      } else if (peinado === "punk") {
        rect(g, 3, 2, 9, 1, pelo);
        for (const x of [3, 5, 7, 9, 11]) rect(g, x, 0, 1, 2, pelo);
      } else if (peinado === "coletas") {
        rect(g, 3, 1, 11, 4, pelo);
        rect(g, 1, 4, 2, 6, pelo); punto(g, 1, 10, pelo); // coleta colgando por detrás
      } else if (peinado === "cuernos") {
        rect(g, 3, 1, 11, 4, pelo); punto(g, 3, 5, pelo);
        punto(g, 4, 0, CUERNO); punto(g, 3, 0, CUERNO); punto(g, 3, 1, CUERNO_D); // cuerno en perfil
      } else {
        rect(g, 3, 1, 11, 4, pelo);
        punto(g, 3, 5, pelo);
      }
    }
  }

  function spriteJugador(dir, frameIdx, c, peinado) {
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
      punto(g, 5, 5, BLANCO_OJO); punto(g, 6, 5, PUPILA);
      punto(g, 10, 5, PUPILA); punto(g, 11, 5, BLANCO_OJO);
      punto(g, 6, 8, c.piel_d); punto(g, 10, 8, c.piel_d);
      rect(g, 7, 8, 3, 1, c.piel_d);
    } else if (dir === "lado") {
      punto(g, 10, 5, BLANCO_OJO); punto(g, 11, 5, PUPILA);
      punto(g, 13, 7, c.piel_d);
    }
    dibujarPelo(g, dir, peinado || "corto", c.pelo);
    return frame(g);
  }

  // Juego completo de sprites de un personaje con sus colores y peinado.
  function crearSpritesJugador(c, peinado) {
    return {
      abajo: { frames: [spriteJugador("abajo", 0, c, peinado), spriteJugador("abajo", 1, c, peinado)], sombra: 6 },
      arriba: { frames: [spriteJugador("arriba", 0, c, peinado), spriteJugador("arriba", 1, c, peinado)], sombra: 6 },
      lado: { frames: [spriteJugador("lado", 0, c, peinado), spriteJugador("lado", 1, c, peinado)], sombra: 6 },
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
    retama: { frames: [spriteRetama()], sombra: 9 },
    espino: { frames: [spriteEspino()], sombra: 11 },
    zarza: { frames: [spriteZarza()], sombra: 10 },
    amapola: { frames: [spriteAmapola()], sombra: 0 },
    tomillo: { frames: [spriteTomillo()], sombra: 0 },
    romero: { frames: [spriteRomero()], sombra: 7 },
    euforbio: { frames: [spriteEuforbio()], sombra: 5 },

    caseta: { frames: [spriteCaseta()], sombra: 0 },
    gallinero: { frames: [spriteGallinero()], sombra: 0 },
    letrina: { frames: [spriteLetrina()], sombra: 0 },
    gallina: { frames: [spriteGallina(0), spriteGallina(1)], sombra: 5 },
    oveja_negra: { frames: [spriteOveja(0), spriteOveja(1)], sombra: 7 },

    // fauna silvestre: frames[0] = posado/quieto; las aves llevan además
    // .vuelo con 2 frames de aleteo; los terrestres alternan frames[0..1]
    gorrion: { frames: [spriteGorrion()], vuelo: [spriteGorrionVuelo(0), spriteGorrionVuelo(1)], sombra: 3 },
    urraca: { frames: [spriteUrraca()], vuelo: [spriteUrracaVuelo(0), spriteUrracaVuelo(1)], sombra: 4 },
    abubilla: { frames: [spriteAbubilla()], vuelo: [spriteAbubillaVuelo(0), spriteAbubillaVuelo(1)], sombra: 4 },
    ciguena: { frames: [spriteCiguena()], vuelo: [spriteCiguenaVuelo(0), spriteCiguenaVuelo(1)], sombra: 5 },
    perdiz: { frames: [spritePerdiz(0), spritePerdiz(1)], sombra: 4 },
    lagartija: { frames: [spriteLagartija(0), spriteLagartija(1)], sombra: 0 },
    lagarto: { frames: [spriteLagarto(0), spriteLagarto(1)], sombra: 0 },
    culebra: { frames: [spriteCulebra(0), spriteCulebra(1)], sombra: 0 },
    rana: { frames: [spriteRana(0), spriteRana(1)], sombra: 0 },
    sapo: { frames: [spriteSapo(0), spriteSapo(1)], sombra: 0 },
    sapo_corredor: { frames: [spriteSapoCorredor(0), spriteSapoCorredor(1)], sombra: 0 },
    aguila: { frames: [spriteAguila()], vuelo: [spriteAguilaVuelo(0), spriteAguilaVuelo(1)], sombra: 6 },
    libelula: { frames: [spriteLibelula(0)], vuelo: [spriteLibelula(1), spriteLibelula(2)], sombra: 2 },
    oruga: { frames: [spriteOruga(0), spriteOruga(1)], sombra: 0 },
    mariquita: { frames: [spriteMariquita(0), spriteMariquita(1)], sombra: 0 },
    sanjuanero: { frames: [spriteSanjuanero(0), spriteSanjuanero(1)], sombra: 0 },
    liebre: { frames: [spriteLiebre(0), spriteLiebre(1)], sombra: 5 },
    zorro: { frames: [spriteZorro(0), spriteZorro(1)], sombra: 6 },
    gineta: { frames: [spriteGineta(0), spriteGineta(1)], sombra: 5 },
    comadreja: { frames: [spriteComadreja(0), spriteComadreja(1)], sombra: 4 },
    letrero: { frames: [spriteLetrero()], sombra: 5 },

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

  Object.assign(window.Granja, { PALETA, SPRITES, dibujarSprite, dibujarSombra, hash2, crearSpritesJugador, PEINADOS, gridACanvas });
})();
