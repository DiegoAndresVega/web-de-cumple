// finkafarm-datos.js — datos del mapa de La Finka (granja estilo Stardew)
//
// Contiene la geometría real de la parcela, la cuadrícula derivada de ella,
// y la generación por defecto de zonas/objetos. Todo expuesto en `window.Granja`.

(function () {

  const METROS_POR_CELDA = 2;

  // Vértices reales del contorno (metros), en orden de recorrido del perímetro.
  const POLIGONO_M = [
    [133.9, -144.8],
    [166.6,  -91.6],
    [207.2, -105.5],
    [229.0,   98.1],
    [  0.0,    0.0],
  ];

  const xs = POLIGONO_M.map((p) => p[0]);
  const ys = POLIGONO_M.map((p) => p[1]);
  const MIN_X = Math.min(...xs);
  const MAX_X = Math.max(...xs);
  const MIN_Y = Math.min(...ys);
  const MAX_Y = Math.max(...ys);

  const COLS = Math.ceil((MAX_X - MIN_X) / METROS_POR_CELDA);
  const FILAS = Math.ceil((MAX_Y - MIN_Y) / METROS_POR_CELDA);

  function celdaACoordsM(col, fila) {
    return [MIN_X + (col + 0.5) * METROS_POR_CELDA, MIN_Y + (fila + 0.5) * METROS_POR_CELDA];
  }

  function puntoEnPoligono(x, y, poligono) {
    let dentro = false;
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const [xi, yi] = poligono[i];
      const [xj, yj] = poligono[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        dentro = !dentro;
      }
    }
    return dentro;
  }

  // Cuadrícula: 'dentro' (jugable) | 'valla' (cercado, anillo de 1 celda) | 'fuera'.
  function construirCuadricula() {
    const grid = [];
    for (let f = 0; f < FILAS; f++) {
      const fila = [];
      for (let c = 0; c < COLS; c++) {
        const [x, y] = celdaACoordsM(c, f);
        fila.push(puntoEnPoligono(x, y, POLIGONO_M) ? "dentro" : "fuera");
      }
      grid.push(fila);
    }
    // Las celdas 'fuera' que tocan una 'dentro' son la valla.
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[f][c] !== "fuera") continue;
        const vecinos = [[f - 1, c], [f + 1, c], [f, c - 1], [f, c + 1]];
        for (const [vf, vc] of vecinos) {
          if (vf >= 0 && vf < FILAS && vc >= 0 && vc < COLS && grid[vf][vc] === "dentro") {
            grid[f][c] = "valla";
            break;
          }
        }
      }
    }
    return grid;
  }

  // PRNG con semilla fija: la dispersión del bosque/olivar es siempre la misma.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Tamaño en celdas (ancho, alto) de cada tipo de objeto. Por defecto 1x1.
  const TAMANOS_OBJETO = {
    caseta: [4, 2], // 8 m x 3-4 m, una planta con paneles solares
    gallinero: [2, 2],
  };

  function tamanoObjeto(tipo) {
    return TAMANOS_OBJETO[tipo] || [1, 1];
  }

  function celdasDeObjeto(obj) {
    const [w, h] = tamanoObjeto(obj.tipo);
    const celdas = [];
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) celdas.push([obj.col + dx, obj.fila + dy]);
    }
    return celdas;
  }

  // Zonas (rectángulos de partida, en celdas) usadas solo para generar el
  // poblado por defecto. El recorte real lo decide la cuadrícula ('dentro').
  const ZONA_BOSQUE = { c0: 20, f0: 5, c1: 75, f1: 58 };
  const ZONA_OLIVAR = { c0: 5, f0: 60, c1: 65, f1: 110 };

  // Piscina rectangular, estanque natural circular y camino de tierra.
  const PISCINA_RECT = { c0: 96, f0: 72, c1: 100, f1: 74 };
  const ESTANQUE = { c: 69, f: 79, r2: 11.5 }; // círculo: centro y radio² en celdas
  const CAMINO_CELDAS = (() => {
    const celdas = [];
    for (let c = 82; c <= 88; c++) celdas.push([c, 64]);
    return celdas;
  })();

  function generarTerreno(cuadricula) {
    const terreno = [];
    for (let f = 0; f < FILAS; f++) terreno.push(new Array(COLS).fill("hierba"));
    for (let f = PISCINA_RECT.f0; f <= PISCINA_RECT.f1; f++) {
      for (let c = PISCINA_RECT.c0; c <= PISCINA_RECT.c1; c++) {
        if (cuadricula[f][c] === "dentro") terreno[f][c] = "agua";
      }
    }
    for (let f = 0; f < FILAS; f++) {
      for (let c = 0; c < COLS; c++) {
        const dc = c - ESTANQUE.c, df = f - ESTANQUE.f;
        if (dc * dc + df * df <= ESTANQUE.r2 && cuadricula[f][c] === "dentro") terreno[f][c] = "agua";
      }
    }
    for (const [c, f] of CAMINO_CELDAS) {
      if (cuadricula[f][c] === "dentro") terreno[f][c] = "camino";
    }
    return terreno;
  }

  // Anillo de valla (objetos por celda) alrededor de un rectángulo, con
  // huecos opcionales (puertas).
  function anillaValla(objetos, prefijo, c0, f0, c1, f1, huecos) {
    const esHueco = (c, f) => huecos.some(([hc, hf]) => hc === c && hf === f);
    let n = 0;
    for (let c = c0; c <= c1; c++) {
      for (const f of [f0, f1]) {
        if (!esHueco(c, f)) objetos.push({ id: `${prefijo}_${n++}`, tipo: "valla", col: c, fila: f });
      }
    }
    for (let f = f0 + 1; f < f1; f++) {
      for (const c of [c0, c1]) {
        if (!esHueco(c, f)) objetos.push({ id: `${prefijo}_${n++}`, tipo: "valla", col: c, fila: f });
      }
    }
  }

  // Genera el poblado inicial: bosque disperso, olivar en filas, edificios,
  // animales y árboles frutales/frutos secos en el patio.
  function generarObjetosDefecto(cuadricula) {
    const objetos = [];
    let n = 0;
    const rand = mulberry32(20260612);

    // bosque disperso (árboles grandes: menos densidad)
    for (let f = ZONA_BOSQUE.f0; f <= ZONA_BOSQUE.f1; f++) {
      for (let c = ZONA_BOSQUE.c0; c <= ZONA_BOSQUE.c1; c++) {
        if (cuadricula[f][c] !== "dentro") continue;
        if (rand() < 0.045) {
          const r = rand();
          objetos.push({ id: `bosque_${n++}`, tipo: r < 0.45 ? "pino" : r < 0.85 ? "roble" : "encina", col: c, fila: f });
        }
      }
    }

    for (let f = ZONA_OLIVAR.f0; f <= ZONA_OLIVAR.f1; f += 6) {
      for (let c = ZONA_OLIVAR.c0; c <= ZONA_OLIVAR.c1; c += 6) {
        if (cuadricula[f] && cuadricula[f][c] === "dentro") {
          objetos.push({ id: `olivo_${n++}`, tipo: "olivo", col: c, fila: f });
        }
      }
    }

    // caseta con paneles solares (4x2) y gallinero dentro de su corral
    objetos.push({ id: "caseta", tipo: "caseta", col: 80, fila: 62 });
    objetos.push({ id: "letrina", tipo: "letrina", col: 86, fila: 62 });
    objetos.push({ id: "gallinero", tipo: "gallinero", col: 91, fila: 63 });

    // corral de gallinas con puerta al sur
    anillaValla(objetos, "valla_g", 89, 62, 95, 68, [[92, 68]]);
    objetos.push({ id: "gallina_1", tipo: "gallina", col: 90, fila: 65 });
    objetos.push({ id: "gallina_2", tipo: "gallina", col: 93, fila: 65 });
    objetos.push({ id: "gallina_3", tipo: "gallina", col: 91, fila: 66 });
    objetos.push({ id: "gallina_4", tipo: "gallina", col: 94, fila: 66 });

    // corral de ovejas con puerta al norte
    anillaValla(objetos, "valla_o", 75, 69, 81, 74, [[78, 69]]);
    objetos.push({ id: "oveja_1", tipo: "oveja_negra", col: 77, fila: 71 });
    objetos.push({ id: "oveja_2", tipo: "oveja_negra", col: 79, fila: 72 });

    // huerto de frutales y frutos secos al sur del patio
    objetos.push({ id: "manzano_1", tipo: "manzano", col: 85, fila: 85 });
    objetos.push({ id: "peral_1", tipo: "peral", col: 90, fila: 88 });
    objetos.push({ id: "cerezo_1", tipo: "cerezo", col: 96, fila: 85 });
    objetos.push({ id: "ciruelo_1", tipo: "ciruelo", col: 101, fila: 80 });
    objetos.push({ id: "nogal_1", tipo: "nogal", col: 78, fila: 88 });
    objetos.push({ id: "almendro_1", tipo: "almendro", col: 86, fila: 95 });
    objetos.push({ id: "castano_1", tipo: "castano", col: 96, fila: 95 });
    objetos.push({ id: "pistacho_1", tipo: "pistacho", col: 92, fila: 92 });
    objetos.push({ id: "endrino_1", tipo: "endrino", col: 74, fila: 86 });
    objetos.push({ id: "encina_1", tipo: "encina", col: 70, fila: 90 });

    // plantas bajas junto al patio
    objetos.push({ id: "fresa_1", tipo: "fresa", col: 87, fila: 75 });
    objetos.push({ id: "fresa_2", tipo: "fresa", col: 88, fila: 75 });
    objetos.push({ id: "fresa_3", tipo: "fresa", col: 89, fila: 75 });
    objetos.push({ id: "arandano_1", tipo: "arandano", col: 84, fila: 77 });
    objetos.push({ id: "arandano_2", tipo: "arandano", col: 85, fila: 77 });
    objetos.push({ id: "lavanda_1", tipo: "lavanda", col: 82, fila: 76 });
    objetos.push({ id: "lavanda_2", tipo: "lavanda", col: 83, fila: 76 });
    objetos.push({ id: "flores_1", tipo: "flores", col: 86, fila: 72 });
    objetos.push({ id: "flores_2", tipo: "flores", col: 91, fila: 74 });
    objetos.push({ id: "flores_3", tipo: "flores", col: 79, fila: 77 });

    // matorral silvestre de la zona: retamas en el claro del bosque,
    // espinos y zarzas en los lindes, amapolas y tomillo sueltos
    objetos.push({ id: "retama_1", tipo: "retama", col: 40, fila: 30 });
    objetos.push({ id: "retama_2", tipo: "retama", col: 55, fila: 42 });
    objetos.push({ id: "retama_3", tipo: "retama", col: 30, fila: 50 });
    objetos.push({ id: "espino_1", tipo: "espino", col: 66, fila: 55 });
    objetos.push({ id: "espino_2", tipo: "espino", col: 25, fila: 22 });
    objetos.push({ id: "zarza_1", tipo: "zarza", col: 70, fila: 62 });
    objetos.push({ id: "zarza_2", tipo: "zarza", col: 35, fila: 60 });
    objetos.push({ id: "amapola_1", tipo: "amapola", col: 84, fila: 80 });
    objetos.push({ id: "amapola_2", tipo: "amapola", col: 92, fila: 78 });
    objetos.push({ id: "amapola_3", tipo: "amapola", col: 60, fila: 65 });
    objetos.push({ id: "tomillo_1", tipo: "tomillo", col: 99, fila: 90 });
    objetos.push({ id: "tomillo_2", tipo: "tomillo", col: 101, fila: 91 });
    objetos.push({ id: "romero_1", tipo: "romero", col: 97, fila: 89 });
    objetos.push({ id: "romero_2", tipo: "romero", col: 103, fila: 88 });

    // bichos con querencia: anfibios e insectos del estanque, y una liebre
    objetos.push({ id: "rana_1", tipo: "rana", col: 73, fila: 79 });
    objetos.push({ id: "sapo_1", tipo: "sapo", col: 66, fila: 83 });
    objetos.push({ id: "libelula_1", tipo: "libelula", col: 69, fila: 79 });
    objetos.push({ id: "oruga_1", tipo: "oruga", col: 87, fila: 76 });
    objetos.push({ id: "mariquita_1", tipo: "mariquita", col: 82, fila: 75 });
    objetos.push({ id: "liebre_1", tipo: "liebre", col: 50, fila: 55 });

    return objetos;
  }

  const CUADRICULA = construirCuadricula();
  const TERRENO_DEFECTO = generarTerreno(CUADRICULA);
  const OBJETOS_DEFECTO = generarObjetosDefecto(CUADRICULA);

  // Posición inicial del jugador, junto al patio.
  const JUGADOR_DEFECTO = { col: 88, fila: 70 };

  // Pinceles del editor agrupados por categorías. Los animales e insectos
  // colocados son "querencias": el bicho aparece ahí y pasea alrededor.
  const CATEGORIAS_OBJETO = [
    ["ESCENARIO", ["caseta", "gallinero", "letrina", "valla"]],
    ["ÁRBOLES", ["pino", "roble", "encina", "olivo", "manzano", "peral", "cerezo",
      "ciruelo", "endrino", "pistacho", "nogal", "almendro", "castano", "espino"]],
    ["PLANTAS", ["arandano", "lavanda", "fresa", "flores", "retama", "zarza",
      "amapola", "tomillo", "romero", "euforbio"]],
    ["ANIMALES", ["gallina", "oveja_negra", "liebre", "zorro", "gineta", "comadreja",
      "gorrion", "urraca", "abubilla", "ciguena", "aguila", "perdiz",
      "lagartija", "lagarto", "culebra", "rana", "sapo", "sapo_corredor"]],
    ["INSECTOS", ["libelula", "oruga", "mariquita", "sanjuanero"]],
  ];
  const TIPOS_OBJETO = CATEGORIAS_OBJETO.flatMap(([, tipos]) => tipos);

  // Tipos de objeto que bloquean el paso (además de agua/valla/fuera): solo
  // árboles y escenario. Plantas, animales, insectos y letreros se pueden
  // atravesar caminando.
  const OBJETOS_SOLIDOS = new Set(
    CATEGORIAS_OBJETO
      .filter(([categoria]) => categoria === "ESCENARIO" || categoria === "ÁRBOLES")
      .flatMap(([, tipos]) => tipos)
  );

  window.Granja = {
    METROS_POR_CELDA, COLS, FILAS,
    POLIGONO_M, MIN_X, MIN_Y,
    CUADRICULA, TERRENO_DEFECTO, OBJETOS_DEFECTO, JUGADOR_DEFECTO,
    TAMANOS_OBJETO, OBJETOS_SOLIDOS, TIPOS_OBJETO, CATEGORIAS_OBJETO,
    celdaACoordsM, tamanoObjeto, celdasDeObjeto,
  };
})();
