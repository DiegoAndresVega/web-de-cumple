// mapa.jsx — Mapa esquemático tipo plano de campamento

function Mapa() {
  const [hover, setHover] = React.useState(null);

  const zones = [
    { id: "parking",  x: 30,  y: 80,  w: 180, h: 80,  label: "PARKING",    icon: "🚗", accent: "moss",       note: "deja aquí el coche · no bloquees la entrada" },
    { id: "entrada",  x: 235, y: 110, w: 70,  h: 28,  label: "ENTRADA",    icon: "→",  accent: "charcoal",   note: "puerta principal · saluda al pasar" },
    { id: "cocina",   x: 340, y: 60,  w: 130, h: 110, label: "COCINA",     icon: "🍳", accent: "ember",      note: "el corazón · siempre hay alguien fregando" },
    { id: "comedor",  x: 490, y: 70,  w: 160, h: 100, label: "COMEDOR",    icon: "🍽️", accent: "orange",     note: "mesa larga bajo el porche" },
    { id: "banos",    x: 670, y: 60,  w: 100, h: 70,  label: "BAÑOS",      icon: "🚽", accent: "blue",       note: "dos cabinas + ducha · cierra el grifo" },
    { id: "ducha",    x: 670, y: 150, w: 100, h: 50,  label: "MANGUERA",   icon: "🚿", accent: "blue",       note: "agua al sol · gloria pura" },

    { id: "tiendas1", x: 60,  y: 200, w: 240, h: 110, label: "TIENDAS A",  icon: "⛺", accent: "moss",       note: "campamento principal · arboles para colgar" },
    { id: "tiendas2", x: 60,  y: 330, w: 180, h: 90,  label: "TIENDAS B",  icon: "⛺", accent: "moss",       note: "zona alternativa · más tranquila" },
    { id: "furgo",    x: 260, y: 340, w: 120, h: 80,  label: "FURGOS",     icon: "🚐", accent: "moss",       note: "aparca paralelo · sin bloquear paso" },

    { id: "escenario",x: 410, y: 220, w: 200, h: 110, label: "ESCENARIO",  icon: "🎤", accent: "ember",      note: "tarima + sombrilla · DJs por la noche" },
    { id: "fogata",   x: 640, y: 240, w: 120, h: 120, label: "FOGATA",     icon: "🔥", accent: "ember",      note: "el centro emocional · cuidado con chispas", round: true },

    { id: "talleres", x: 410, y: 350, w: 180, h: 80,  label: "TALLERES",   icon: "🎨", accent: "blue",       note: "estampado, collage, lo que surja" },

    { id: "pozo",     x: 280, y: 130, w: 40,  h: 40,  label: "POZO",       icon: "⚠️", accent: "ember",      note: "PELIGRO · tapado pero respeto", round: true, danger: true },
    { id: "animales", x: 30,  y: 430, w: 230, h: 60,  label: "GALLINERO",  icon: "🐔", accent: "orange",     note: "los animales son de la finca · ojo perros" },
    { id: "basura",   x: 620, y: 380, w: 140, h: 60,  label: "RECICLAJE",  icon: "♻️", accent: "moss",       note: "tres cubos · orgánico / envases / vidrio" },
    { id: "privada",  x: 290, y: 430, w: 320, h: 60,  label: "ZONA PRIVADA · NO PASAR", icon: "🚫", accent: "charcoal", note: "casa de quienes nos prestan la finca · respeto" },
  ];

  const w = 800;
  const h = 520;

  return (
    <section id="mapa" style={{ background: "var(--cream-2)" }}>
      <div className="container">
        <div className="section-tag"><span className="num">03</span> Mapa · plano de campamento</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "end", marginBottom: 22 }} className="mapa-head">
          <h2 className="display" style={{ fontSize: "clamp(40px, 8vw, 96px)" }}>
            <RisoText>LA FINKA</RisoText><br/>
            <span className="hand" style={{ fontSize: 36, color: "var(--accent-a)", transform: "rotate(-2deg)", display: "inline-block" }}>
              (más o menos a escala)
            </span>
          </h2>
          <p style={{ fontSize: 14, maxWidth: 320, opacity: 0.85, lineHeight: 1.5 }}>
            Toca cualquier zona para ver detalles. El norte está donde sale el sol · los detalles los pones tú al llegar.
          </p>
        </div>

        <div style={{
          background: "var(--cream)",
          border: "2.5px solid var(--charcoal)",
          padding: 16,
          position: "relative",
          boxShadow: "6px 6px 0 var(--charcoal)",
        }}>
          {/* Brújula + leyenda corner */}
          <div style={{ position: "absolute", top: 12, right: 18, display: "flex", alignItems: "center", gap: 8, zIndex: 2 }}>
            <div className="mono" style={{ fontSize: 10, opacity: 0.7 }}>N</div>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--charcoal)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--display)", fontSize: 14, color: "var(--accent-a)",
            }}>↑</div>
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
            {/* paper bg dots */}
            <defs>
              <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="rgba(26,24,21,0.18)" />
              </pattern>
              <pattern id="grass" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--moss)" strokeWidth="1.5" opacity="0.25" />
              </pattern>
              <pattern id="diag" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
              </pattern>
              <pattern id="danger" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="var(--ember)" />
                <line x1="0" y1="10" x2="10" y2="0" stroke="var(--charcoal)" strokeWidth="2" />
              </pattern>
            </defs>

            <rect width={w} height={h} fill="url(#dots)" />

            {/* Outer finca boundary — hand-drawn-ish */}
            <path
              d="M 14 30 Q 200 22 400 28 T 786 36 Q 790 250 784 490 Q 500 502 250 496 T 18 488 Q 10 280 14 30 Z"
              fill="url(#grass)"
              stroke="var(--charcoal)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeDasharray="0"
            />

            {/* trees scattered */}
            {[
              [320, 200], [380, 195], [620, 340], [380, 320],
              [340, 410], [610, 200], [340, 250], [375, 250],
            ].map(([cx, cy], i) => (
              <g key={i} transform={`translate(${cx},${cy})`}>
                <circle r="8" fill="var(--moss)" opacity="0.55" />
                <circle r="5" cx="3" cy="-2" fill="var(--moss)" opacity="0.85" />
              </g>
            ))}

            {/* path */}
            <path d="M 270 140 Q 320 170 370 200 T 480 280 T 660 300" fill="none" stroke="var(--charcoal)" strokeWidth="2" strokeDasharray="3 5" opacity="0.55" />

            {/* zones */}
            {zones.map((z) => <Zone key={z.id} z={z} onHover={setHover} active={hover === z.id} />)}
          </svg>

          {/* Hover/tap detail */}
          <div style={{ marginTop: 12, minHeight: 56, display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "var(--cream-2)", border: "1.5px dashed var(--charcoal)" }}>
            {hover ? (
              (() => {
                const z = zones.find((x) => x.id === hover);
                return (
                  <>
                    <span style={{ fontSize: 28 }}>{z.icon}</span>
                    <div>
                      <div className="sub" style={{ fontSize: 16 }}>{z.label}</div>
                      <div style={{ fontSize: 13, opacity: 0.78 }}>{z.note}</div>
                    </div>
                  </>
                );
              })()
            ) : (
              <span className="mono" style={{ fontSize: 12, opacity: 0.65 }}>
                ↑ Pasa el cursor o toca cualquier zona para saber más
              </span>
            )}
          </div>
        </div>

        {/* Avisos */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Aviso color="ember" icon="⚠️" title="Pozo señalizado" d="Está tapado, pero no es sitio para hacer el ganso." />
          <Aviso color="ember" icon="🔥" title="Fuego con cabeza" d="La fogata se vigila. Cenizas siempre sobre tierra." />
          <Aviso color="orange" icon="🐔" title="Animales residentes" d="Las gallinas viven aquí. No las perseguimos." />
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .mapa-head { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function Zone({ z, onHover, active }) {
  const fill = z.danger ? "url(#danger)" : `var(--${z.accent === "blue" ? "blue-night" : z.accent})`;
  const stroke = "var(--charcoal)";
  const handlers = {
    onMouseEnter: () => onHover(z.id),
    onMouseLeave: () => onHover(null),
    onClick: () => onHover(z.id),
    style: { cursor: "pointer" },
  };

  return (
    <g {...handlers} opacity={active ? 1 : 0.95}>
      {z.round ? (
        <ellipse
          cx={z.x + z.w / 2}
          cy={z.y + z.h / 2}
          rx={z.w / 2}
          ry={z.h / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={active ? 3.5 : 2.5}
        />
      ) : (
        <rect
          x={z.x} y={z.y} width={z.w} height={z.h}
          fill={fill}
          stroke={stroke}
          strokeWidth={active ? 3.5 : 2.5}
        />
      )}
      {active && !z.round && (
        <rect
          x={z.x - 4} y={z.y - 4} width={z.w + 8} height={z.h + 8}
          fill="none"
          stroke="var(--accent-a)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      )}
      <text
        x={z.x + z.w / 2}
        y={z.y + z.h / 2 - 2}
        textAnchor="middle"
        fontFamily="var(--sub)"
        fontSize={z.w < 70 ? 9 : z.w < 130 ? 11 : 13}
        fill="var(--cream)"
        style={{ pointerEvents: "none", letterSpacing: "0.05em" }}
      >
        {z.label}
      </text>
      <text
        x={z.x + z.w / 2}
        y={z.y + z.h / 2 + 16}
        textAnchor="middle"
        fontSize="14"
        style={{ pointerEvents: "none" }}
      >
        {z.icon}
      </text>
    </g>
  );
}

function Aviso({ color, icon, title, d }) {
  const c = `var(--${color === "blue" ? "blue-night" : color})`;
  return (
    <div style={{ background: c, color: "var(--cream)", padding: 14, border: "2px solid var(--charcoal)", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div className="sub" style={{ fontSize: 14, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12.5, opacity: 0.9 }}>{d}</div>
      </div>
    </div>
  );
}

Object.assign(window, { Mapa, Zone, Aviso });
