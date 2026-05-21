// sections-b.jsx — Cuidados, QueTraer, FAQ, Footer

/* ───────── CUIDADOS ───────── */
function Cuidados() {
  const cards = [
    {
      icon: "🔥",
      title: "Cuidado con el fuego",
      d: "La fogata es de todas y para todas. Si te apartas, alguien se queda mirándola. Cenizas siempre sobre tierra.",
      accent: "ember",
    },
    {
      icon: "🐔",
      title: "Los animales son de la finca",
      d: "Hay gallinas, perros y algún bicho más. Se observa, no se persigue. Las gallinas no son DJs.",
      accent: "moss",
    },
    {
      icon: "💧",
      title: "El pozo es un pozo",
      d: "No es atrezzo. Está señalizado y tapado, pero no nos sentamos encima ni nos asomamos por gracia.",
      accent: "blue",
    },
    {
      icon: "♻️",
      title: "Lo que entra, sale (mejor)",
      d: "Cada zona con su cubo: orgánico, envases, vidrio. Si dudas, pregunta a quien tengas al lado.",
      accent: "moss",
    },
    {
      icon: "🤝",
      title: "Compartimos espacios",
      d: "Las tiendas están cerca. Tu música a las 6am no es para todas. Hablamos las cosas en el momento.",
      accent: "orange",
    },
    {
      icon: "🚿",
      title: "Cuidamos el agua",
      d: "Las duchas son cortas y solidarias. Hay una manguera al sol que es lo más cerca del cielo.",
      accent: "blue",
    },
  ];

  return (
    <section id="cuidados" style={{ background: "var(--cream)" }}>
      <div className="container">
        <div className="section-tag"><span className="num">05</span> Cómo cuidar la finca · y cuidarnos</div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 30, alignItems: "end", marginBottom: 32 }} className="cuidados-head">
          <h2 className="display" style={{ fontSize: "clamp(40px, 8vw, 96px)" }}>
            <RisoText>ESTO NO SON</RisoText><br/>
            <RisoText style={{ color: "var(--accent-a)" }}>NORMAS.</RisoText>{" "}
            <span className="hand" style={{ fontSize: 36, color: "var(--accent-c)", verticalAlign: "middle" }}>son cuidados.</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 360 }}>
            Un fin de semana de convivencia funciona si nos miramos un poco.
            Esto es lo mínimo para que la finca, los bichos y nosotras
            <span className="hand" style={{ color: "var(--accent-a)", fontSize: 24 }}> salgamos enteras</span>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {cards.map((c, i) => {
            const accentVar = `var(--${c.accent === "blue" ? "blue-night" : c.accent})`;
            return (
              <div key={i} style={{
                background: "var(--cream-2)",
                border: "2px solid var(--charcoal)",
                padding: 18,
                position: "relative",
                transform: `rotate(${[-0.6, 0.4, -0.3, 0.7, -0.5, 0.6][i]}deg)`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                <div className="sub" style={{ fontSize: 17, color: accentVar, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{c.d}</div>
              </div>
            );
          })}
        </div>

        {/* Bebida bloque */}
        <div
          style={{
            marginTop: 36,
            background: "var(--charcoal)",
            color: "var(--cream)",
            padding: "28px 26px",
            border: "2.5px solid var(--charcoal)",
            position: "relative",
            transform: "rotate(-0.4deg)",
            boxShadow: "6px 6px 0 var(--accent-a)",
          }}
        >
          <div className="tape" style={{ top: -12, right: 30, transform: "rotate(8deg)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "center" }} className="bebida-grid">
            <div className="display" style={{ fontSize: "clamp(40px, 8vw, 88px)", color: "var(--accent-a)" }}>
              LA<br/>BEBIDA
            </div>
            <div>
              <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, color: "var(--cream)" }}>
                Habrá <strong>bebida comunitaria</strong> (vino, cerveza, refrescos, agua, hielo cuando llegue).
                Aún así, <strong>cada quien trae lo suyo</strong>: nadie quiere quedarse seca.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 12, color: "var(--cream-3)" }}>
                Filosofía importante: <span className="hand" style={{ fontSize: 22, color: "var(--accent-a)" }}>lo que va a la nevera, es de la peña</span>.
                Si lo quieres tuyo, te lo guardas en tu tienda y rezas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .cuidados-head { grid-template-columns: 1fr !important; }
          .bebida-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* ───────── QUÉ TRAER ───────── */
function QueTraer() {
  const items = [
    { t: "tienda de campaña", e: "⛺", crit: true },
    { t: "saco de dormir", e: "🛏️", crit: true },
    { t: "linterna frontal", e: "🔦", crit: true },
    { t: "botella de agua", e: "🫗", crit: true },
    { t: "plato + cubiertos + vaso", e: "🍽️", crit: true },
    { t: "bañador", e: "🩱" },
    { t: "toalla", e: "🟦" },
    { t: "tapones de oídos", e: "👂" },
    { t: "instrumentos", e: "🎸" },
    { t: "tu bebida favorita", e: "🍺" },
    { t: "ganas de fregar", e: "🧽" },
    { t: "ropa de noche y de día", e: "🧥" },
    { t: "crema solar", e: "☀️" },
    { t: "algo para compartir", e: "🎁" },
    { t: "manta finita", e: "🧣" },
    { t: "ropa para mancharse", e: "🎨" },
  ];

  return (
    <section id="que-traer" style={{ background: "var(--cream-2)", borderTop: "2px solid var(--charcoal)", borderBottom: "2px solid var(--charcoal)" }}>
      <div className="container">
        <div className="section-tag"><span className="num">06</span> Qué traer</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "end", marginBottom: 28 }} className="qt-head">
          <h2 className="display" style={{ fontSize: "clamp(40px, 8vw, 96px)" }}>
            <RisoText>CHECKLIST</RisoText>{" "}
            <RisoText style={{ color: "var(--accent-a)" }}>MÍNIMO</RisoText>
          </h2>
          <span className="hand" style={{ fontSize: 30, color: "var(--accent-c)", transform: "rotate(-3deg)" }}>
            si te falta algo, pregunta antes
          </span>
        </div>

        <ChecklistGrid items={items} />

        <p style={{ marginTop: 20, fontSize: 13.5, opacity: 0.75 }}>
          ★ = imprescindible · el resto = mejor con que sin · <span className="hand" style={{ fontSize: 22, color: "var(--accent-a)" }}>guardamos los ticks en tu navegador</span> para que no se te olvide.
        </p>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .qt-head { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function ChecklistGrid({ items }) {
  const [checked, setChecked] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("finka-checklist") || "{}"); } catch { return {}; }
  });

  React.useEffect(() => {
    localStorage.setItem("finka-checklist", JSON.stringify(checked));
  }, [checked]);

  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
      {items.map((it, i) => (
        <label
          key={i}
          onClick={() => toggle(i)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: checked[i] ? "var(--charcoal)" : "var(--cream)",
            color: checked[i] ? "var(--cream)" : "var(--charcoal)",
            border: "2px solid var(--charcoal)",
            cursor: "pointer",
            userSelect: "none",
            transition: "transform .08s",
            textDecoration: checked[i] ? "line-through" : "none",
            transform: `rotate(${(i % 3 - 1) * 0.25}deg)`,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              minWidth: 22,
              border: "2px solid currentColor",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            {checked[i] ? "✕" : ""}
          </span>
          <span style={{ fontSize: 14, fontFamily: "var(--body)" }}>
            {it.crit && <span style={{ color: "var(--accent-a)", marginRight: 4 }}>★</span>}
            {it.t}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 18 }}>{it.e}</span>
        </label>
      ))}
    </div>
  );
}

/* ───────── FAQ ───────── */
function FAQ() {
  const qs = [
    { q: "¿Puedo venir solo un día?", a: "Sí. Avisa al confirmar si llegas viernes/sábado/domingo y a qué hora más o menos. La finca es nuestra los tres días, tú vienes cuando puedas." },
    { q: "¿Hay duchas?", a: "Hay una ducha exterior y una interior que se hace cola. La manguera al sol es la opción favorita. Lleva chanclas." },
    { q: "¿Hay cobertura?", a: "Hay cobertura suficiente para mandar audios y poco más. WiFi no esperes. Si necesitas estar conectada el finde, FinkaFest no es tu sitio." },
    { q: "¿Se puede dormir en el coche o furgo?", a: "Sí, hay zona de furgo/coche habilitada. Indícalo al confirmar para reservar sitio." },
    { q: "¿Qué pasa si llueve?", a: "Llueve. Tenemos un porche grande, una nave y muchas ganas. Trae chubasquero y unas zapas que se puedan mojar." },
    { q: "¿Puedo llevar perro?", a: "Pregunta primero. La finca tiene gallinas y otros perros residentes. No todos los peques se llevan bien con todo, así que caso por caso." },
    { q: "¿Habrá hielo?", a: "Compraremos hielo el sábado por la mañana. Si vienes en coche desde un sitio con gasolinera, eres un mito si traes una bolsa más." },
    { q: "¿Es seguro para mis criaturas?", a: "Sí, con cabeza. Hay un pozo tapado pero señalizado, fogata por la noche y caminos sin asfaltar. Apta para peques con adulto al lado." },
    { q: "¿Coste?", a: "Bote común al estilo finkafest: cada quien aporta lo que pueda al gasto compartido (comida, hielo, gasoil de la peña que conduce). Detallaremos cifras antes." },
    { q: "¿Y si no conozco a casi nadie?", a: "Mejor. Llegas, te enseñamos dónde está el agua, te damos un abrazo y a las dos horas estás cortando cebolla con alguien. Te lo prometemos." },
  ];

  return (
    <section id="faq" style={{ background: "var(--cream)" }}>
      <div className="container">
        <div className="section-tag"><span className="num">07</span> FAQ · dudas habituales</div>

        <h2 className="display" style={{ fontSize: "clamp(48px, 9vw, 120px)", marginBottom: 30 }}>
          <RisoText>PREGUNTAS</RisoText>{" "}
          <span className="hand" style={{ fontSize: 40, color: "var(--accent-a)", verticalAlign: "middle" }}>(de la peña)</span>
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="faq-grid">
          {qs.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} i={i} />)}
        </div>

        <style>{`
          @media (max-width: 760px) {
            .faq-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function FAQItem({ q, a, i }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      style={{
        background: open ? "var(--cream-2)" : "var(--cream)",
        border: "2px solid var(--charcoal)",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "background .15s",
        boxShadow: open ? "4px 4px 0 var(--accent-a)" : "none",
        transform: open ? "translate(-2px, -2px)" : "none",
      }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div className="sub" style={{ fontSize: 15, lineHeight: 1.25 }}>{q}</div>
        <div style={{ fontFamily: "var(--display)", fontSize: 22, lineHeight: 0.8, color: "var(--accent-a)", marginTop: 0, transform: open ? "rotate(45deg)" : "none", transition: "transform .15s" }}>+</div>
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1.5px dashed var(--charcoal)", fontSize: 14, lineHeight: 1.55 }}>
          {a}
        </div>
      )}
    </div>
  );
}

/* ───────── FOOTER ───────── */
function Footer() {
  return (
    <footer style={{ background: "var(--charcoal)", color: "var(--cream)", padding: "60px 24px 28px", borderTop: "2px solid var(--charcoal)" }}>
      <div className="container">
        <div className="display" style={{ fontSize: "clamp(60px, 14vw, 200px)", lineHeight: 0.85, color: "var(--cream)" }}>
          <span style={{ color: "var(--accent-a)" }}>HASTA</span><br/>
          PRONTO,<br/>
          PEÑA.
        </div>
        <p className="hand" style={{ fontSize: 36, color: "var(--cream)", marginTop: 8, transform: "rotate(-2deg)" }}>
          —— nos vemos en la finca ——
        </p>

        <div style={{ marginTop: 50, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, paddingTop: 26, borderTop: "1.5px dashed rgba(240,231,212,0.4)" }} className="footer-grid">
          <div>
            <div className="mono" style={{ opacity: 0.6, marginBottom: 8 }}>EVENTO</div>
            <div className="sub" style={{ fontSize: 18 }}>FinkaFest Vol · IV</div>
            <div className="mono" style={{ marginTop: 6, opacity: 0.8 }}>19 · 20 · 21 Junio 2026</div>
          </div>
          <div>
            <div className="mono" style={{ opacity: 0.6, marginBottom: 8 }}>LUGAR</div>
            <div className="sub" style={{ fontSize: 18 }}>La FinKa</div>
            <div className="mono" style={{ marginTop: 6, opacity: 0.8 }}>Arcos de la Llana · Burgos</div>
          </div>
          <div>
            <div className="mono" style={{ opacity: 0.6, marginBottom: 8 }}>SI ALGO RARO</div>
            <div className="sub" style={{ fontSize: 18 }}>la peña organizadora</div>
            <div className="mono" style={{ marginTop: 6, opacity: 0.8 }}>llama, escribe, envía paloma</div>
          </div>
        </div>

        <div style={{ marginTop: 36, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 11, opacity: 0.6 }}>
          <span className="mono">FK · IV · 2026 · hecho con cariño y caos</span>
          <span className="mono">no hay sponsors · no hay marca · hay peña</span>
        </div>

        <style>{`
          @media (max-width: 720px) {
            .footer-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </footer>
  );
}

Object.assign(window, { Cuidados, QueTraer, ChecklistGrid, FAQ, FAQItem, Footer });
