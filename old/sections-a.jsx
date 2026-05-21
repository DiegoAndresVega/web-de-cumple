// sections-a.jsx — Nav, Hero, QueEs, Programa
// Exports to window for cross-script sharing.

const { useState, useEffect, useRef } = React;

/* ───────── NAV ───────── */
function Nav({ chaos }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
  }, [open]);

  const links = [
  ["#inicio", "Inicio"],
  ["#que-es", "Qué es"],
  ["#programa", "Programa"],
  ["#mapa", "Mapa"],
  ["#viajes", "Viajes"],
  ["#asistencia", "Confirmar"],
  ["#clima", "Clima"],
  ["#faq", "FAQ"]];


  const go = (href) => {
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        width: "calc(100% - 24px)",
        maxWidth: 1180,
        background: scrolled ? "rgba(240,231,212,0.92)" : "rgba(240,231,212,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "2px solid var(--charcoal)",
        boxShadow: scrolled ? "4px 4px 0 var(--accent-a)" : "2px 2px 0 var(--accent-a)",
        transition: "box-shadow .12s, background .12s"
      }}>
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
        <a href="#inicio" onClick={(e) => {e.preventDefault();go("#inicio");}} style={{ textDecoration: "none", color: "var(--charcoal)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--display)", fontSize: 18, letterSpacing: "-0.01em" }}>FINKAFEST</span>
          <span className="sticker" style={{ fontSize: 9, padding: "3px 7px", transform: "rotate(-3deg)" }}>VOL · IV</span>
        </a>

        <div className="nav-desk" style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {links.map(([href, label]) =>
          <a
            key={href}
            href={href}
            onClick={(e) => {e.preventDefault();go(href);}}
            style={{
              fontFamily: "var(--body)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--charcoal)",
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--charcoal)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            ref={(el) => {
              if (!el) return;
              el.onmouseenter = (ev) => {ev.currentTarget.style.background = "var(--charcoal)";ev.currentTarget.style.color = "var(--cream)";};
              el.onmouseleave = (ev) => {ev.currentTarget.style.background = "transparent";ev.currentTarget.style.color = "var(--charcoal)";};
            }}>
            
              {label}
            </a>
          )}
        </div>

        <button
          className="nav-mob"
          onClick={() => setOpen(!open)}
          style={{
            display: "none",
            border: "2px solid var(--charcoal)",
            background: "var(--cream)",
            padding: "8px 10px",
            fontFamily: "var(--sub)",
            fontSize: 11,
            letterSpacing: "0.1em",
            cursor: "pointer"
          }}>
          
          {open ? "CERRAR" : "MENÚ"}
        </button>
      </div>

      {open &&
      <div style={{ borderTop: "2px solid var(--charcoal)", padding: "8px 0", background: "var(--cream)" }}>
          {links.map(([href, label]) =>
        <a
          key={href}
          href={href}
          onClick={(e) => {e.preventDefault();go(href);}}
          style={{
            display: "block",
            padding: "14px 18px",
            fontFamily: "var(--sub)",
            fontSize: 18,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--charcoal)",
            textDecoration: "none",
            borderBottom: "1px dashed rgba(26,24,21,0.2)"
          }}>
          
              → {label}
            </a>
        )}
        </div>
      }

      <style>{`
        @media (max-width: 880px) {
          .nav-desk { display: none !important; }
          .nav-mob { display: block !important; }
        }
      `}</style>
    </nav>);

}

/* ───────── HERO ───────── */
function Hero() {
  return (
    <section id="inicio" style={{ minHeight: "100vh", paddingTop: 110, paddingBottom: 60, display: "flex", alignItems: "center", overflow: "hidden" }}>
      <div className="container" style={{ width: "100%" }}>
        {/* corner stickers */}
        <div style={{ position: "absolute", top: 0, right: 0, transform: "rotate(8deg)", zIndex: 4 }}>
          <div className="sticker" style={{ background: "var(--ember)", color: "var(--cream)", borderColor: "var(--charcoal)" }}>
            Vol · IV
          </div>
        </div>
        <div style={{ position: "absolute", top: 50, left: -10, transform: "rotate(-12deg)", zIndex: 4, display: "none" }} className="hero-stamp">
          <div className="stamp" style={{ background: "var(--cream-2)" }}>caos · organizado</div>
        </div>

        {/* big title block */}
        <div style={{ position: "relative" }}>
          <div className="hand" style={{ fontSize: "clamp(28px, 5vw, 48px)", color: "var(--accent-a)", transform: "rotate(-3deg)", marginBottom: 6, marginLeft: "2vw" }}>~ Fiestón o barbarie~

          </div>

          <h1 className="display" style={{ fontSize: "clamp(64px, 14vw, 200px)", lineHeight: 0.85 }}>
            <RisoText>FINKA</RisoText>
            <RisoText style={{ display: "block", marginLeft: "8vw" }}>FEST</RisoText>
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 18, marginLeft: "2vw" }}>
            <span className="sub" style={{ fontSize: "clamp(20px, 3vw, 36px)", color: "var(--charcoal)" }}>
              VOL <span style={{ color: "var(--accent-a)" }}>·</span> IV
            </span>
            <span className="hand" style={{ fontSize: 38, color: "var(--accent-c)", transform: "rotate(2deg)" }}>treinta cumpleaños 

            </span>
          </div>
        </div>

        {/* date strip */}
        <div style={{ marginTop: 40, position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "18px 26px",
              background: "var(--charcoal)",
              color: "var(--cream)",
              transform: "rotate(-0.6deg)",
              boxShadow: "6px 6px 0 var(--accent-a)",
              flexWrap: "wrap"
            }}>
            
            <span className="display" style={{ fontSize: "clamp(28px, 5vw, 56px)", color: "var(--cream)" }}>
              19 <span style={{ color: "var(--accent-a)" }}>·</span> 20 <span style={{ color: "var(--accent-a)" }}>·</span> 21
            </span>
            <span className="sub" style={{ fontSize: "clamp(14px, 1.8vw, 22px)" }}>JUNIO 2026</span>
            <span style={{ height: 28, width: 2, background: "var(--cream-3)" }} />
            <span className="mono" style={{ fontSize: 12, letterSpacing: "0.15em" }}>
              LA FINKA · ARCOS DE LA LLANA · BURGOS
            </span>
          </div>

          <div className="tape" style={{ top: -10, left: 40, transform: "rotate(-8deg)" }} />
          <div className="tape" style={{ bottom: -10, right: 60, transform: "rotate(6deg)", width: 70 }} />
        </div>

        {/* tagline + CTA */}
        <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "1fr auto", gap: 30, alignItems: "end" }} className="hero-bottom">
          <p style={{ fontSize: "clamp(15px, 1.6vw, 19px)", maxWidth: 560, margin: 0, lineHeight: 1.55 }}>
            Fin de semana de <span className="scribble">convivencia</span> entre peña maja. Música, actividades, comida, fogata y
            <span className="hand" style={{ color: "var(--accent-a)", fontSize: 26, marginLeft: 6 }}>cosas raras</span>.
            <br />
            <span style={{ opacity: 0.7 }}>Todo el mundo participa.</span>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
            <a className="btn" href="#asistencia" onClick={(e) => {e.preventDefault();document.querySelector("#asistencia").scrollIntoView({ behavior: "smooth" });}} style={{ height: "80px", fontSize: "20px", width: "390px" }}>
              CONFIRMAR ASISTENCIA →
            </a>
            <span className="mono" style={{ opacity: 0.6, fontSize: "20px", width: "380px" }}>tarda menos que liar un cigarro</span>
          </div>
        </div>

        {/* placeholder photo strip */}
        <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }} className="hero-photos">
          <PhotoPlaceholder label="ambiente fogata · noche" height={180} accent="ember" rotate={-1} />
          <PhotoPlaceholder label="detalle / cartel" height={180} accent="moss" rotate={1.5} />
          <PhotoPlaceholder label="finca · día" height={180} accent="blue" rotate={-0.8} />
        </div>

        <style>{`
          @media (max-width: 720px) {
            .hero-bottom { grid-template-columns: 1fr !important; }
            .hero-photos { grid-template-columns: 1fr 1fr !important; }
            .hero-photos > :nth-child(3) { display: none; }
          }
        `}</style>
      </div>
    </section>);

}

/* ───────── PhotoPlaceholder ───────── */
function PhotoPlaceholder({ label, height = 180, accent = "ember", rotate = 0 }) {
  const bg = accent === "ember" ? "var(--ember)" : accent === "moss" ? "var(--moss)" : accent === "blue" ? "var(--blue-night)" : "var(--charcoal)";
  return (
    <div
      style={{
        height,
        position: "relative",
        background: "var(--cream-2)",
        border: "2px solid var(--charcoal)",
        overflow: "hidden",
        transform: `rotate(${rotate}deg)`
      }}>
      
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `repeating-linear-gradient(45deg, ${bg} 0 2px, transparent 2px 14px)`,
        opacity: 0.35,
        mixBlendMode: "multiply"
      }} />
      <div style={{
        position: "absolute",
        bottom: 8, left: 8,
        background: "var(--cream)",
        border: "1.5px solid var(--charcoal)",
        padding: "4px 8px",
        fontFamily: "var(--body)",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase"
      }}>
        📷 {label}
      </div>
    </div>);

}

/* ───────── QUÉ ES ───────── */
function QueEs() {
  return (
    <section id="que-es" style={{ background: "var(--cream-2)", borderTop: "2px solid var(--charcoal)", borderBottom: "2px solid var(--charcoal)" }}>
      <div className="container">
        <div className="section-tag"><span className="num">01</span> Qué es esto</div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "start" }} className="que-grid">
          <div>
            <h2 className="display" style={{ fontSize: "clamp(40px, 7vw, 88px)", marginBottom: 24, height: "200px" }}>
              <RisoText> FINKA.</RisoText><br />
              <RisoText>TODO EL FIN DE SEMANA</RisoText><br />
              <RisoText></RisoText>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, maxWidth: 540 }}>
              Un montón de cumpleaños empalmados,
              
              <span className="hand" style={{ color: "var(--accent-a)", fontSize: 28 }}>una finka que cuidar</span>
              su plato.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 540, marginTop: 12, opacity: 0.85 }}>Tres días para cocinar juntas, montar talleres, sacar instrumentos, jugar a la petanca con cierta dignidad.



            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "2319.55px", width: "402.906px" }}>
            <Pill color="ember" rot={-2}>convivencia</Pill>
            <Pill color="moss" rot={1.5}>participación</Pill>
            <Pill color="blue" rot={-1}>creatividad</Pill>
            <Pill color="orange" rot={2.5}>improvisación organizada</Pill>
            <Pill color="charcoal" rot={-1.5}>fogata · siempre</Pill>
          </div>
        </div>

        <div className="wavy" style={{ marginTop: 50 }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginTop: 30 }} className="manifiesto">
          {[
          { n: "01", t: "Todas aportan algo", d: "comida, música, ideas, calma." },
          { n: "02", t: "Nadie es público", d: "el festival lo hacemos en el momento." },
          { n: "03", t: "La finca se cuida", d: "como si fuera nuestra. Lo es, un rato." },
          { n: "04", t: "El caos se organiza", d: "pero solo lo justo. La gracia es ésa." }].
          map((m) =>
          <div key={m.n} style={{ borderTop: "3px solid var(--accent-a)", paddingTop: 12 }}>
              <span className="mono" style={{ color: "var(--accent-a)" }}>{m.n}</span>
              <h4 className="sub" style={{ fontSize: 18, marginTop: 6, marginBottom: 4 }}>{m.t}</h4>
              <p style={{ fontSize: 13, opacity: 0.78, margin: 0 }}>{m.d}</p>
            </div>
          )}
        </div>

        <style>{`
          @media (max-width: 760px) {
            .que-grid { grid-template-columns: 1fr !important; }
            .manifiesto { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
      </div>
    </section>);

}

function Pill({ children, color = "ember", rot = 0 }) {
  const bg = `var(--${color === "charcoal" ? "charcoal" : color === "blue" ? "blue-night" : color})`;
  return (
    <div
      className="sub"
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        padding: "12px 20px",
        background: bg,
        color: "var(--cream)",
        fontSize: "clamp(18px, 2.2vw, 24px)",
        transform: `rotate(${rot}deg)`,
        border: "2px solid var(--charcoal)",
        boxShadow: "3px 3px 0 var(--charcoal)"
      }}>
      
      {children}
    </div>);

}

/* ───────── PROGRAMA ───────── */
function Programa() {
  const days = [
  {
    key: "vie",
    title: "VIERNES",
    date: "19 jun",
    tagline: "llegamos, montamos, encendemos",
    accent: "ember",
    blocks: [
    { t: "Llegadas + montar campamento", h: "16:00 →", note: "ayuda a la peña a clavar piquetas" },
    { t: "Juegos octogenarios", h: "18:00", note: "petanca · cartas · bingo · dominó vergonzoso" },
    { t: "Charla improvisada", h: "20:00", note: "alguien explicará algo. ya veremos qué." },
    { t: "Cena compartida", h: "21:30", note: "lo que cada quien traiga + cocina común" },
    { t: "Fogata + música acústica", h: "23:00 →", note: "instrumentos bienvenidos · voces también" }]

  },
  {
    key: "sab-d",
    title: "SÁBADO",
    date: "20 jun · día",
    tagline: "talleres, mercadillo, vermú",
    accent: "moss",
    blocks: [
    { t: "Desayuno largo", h: "10:00 →", note: "café de puchero · tostadas · sin prisas" },
    { t: "Taller de estampado / serigrafía", h: "11:30", note: "trae camiseta o tela vieja" },
    { t: "Mercadillo ropa & libros", h: "12:00 →", note: "vacía el armario, llénalo de otra peña" },
    { t: "Collages colectivos", h: "12:30", note: "revistas, tijeras, pegamento, paciencia" },
    { t: "Vermú casposo + concurso de pinchos", h: "13:30", note: "el jurado somos todas" },
    { t: "PAELLA", h: "14:30", note: "el momento sagrado del finde", big: true }]

  },
  {
    key: "sab-n",
    title: "SÁBADO",
    date: "20 jun · noche",
    tagline: "gymkana, conciertos, baile",
    accent: "blue",
    blocks: [
    { t: "Gymkana temática", h: "17:30", note: "pruebas absurdas · equipos al azar" },
    { t: "Posibles conciertos", h: "20:00", note: "el cartel se hace solo · apúntate al confirmar" },
    { t: "Cena ligera", h: "21:30", note: "lo que sobre + improvisación" },
    { t: "DJs + fiesta", h: "23:30 → ∞", note: "rave folk hasta que el galo cante", big: true }]

  },
  {
    key: "dom",
    title: "DOMINGO",
    date: "21 jun",
    tagline: "café, abrazos, recogida",
    accent: "orange",
    blocks: [
    { t: "Desayuno resaca", h: "11:00 →", note: "tortilla, café, silencios largos" },
    { t: "Recogida colectiva", h: "13:00", note: "todas. sí. todas." },
    { t: "Comida con lo que queda", h: "14:30", note: "improvisar y celebrar" },
    { t: "Abrazos y despedida", h: "17:00 →", note: "hasta el Vol · V" }]

  }];


  return (
    <section id="programa" style={{ background: "var(--cream)" }}>
      <div className="container">
        <div className="section-tag"><span className="num">02</span> Programa · cartel · más o menos</div>

        <h2 className="display" style={{ fontSize: "clamp(48px, 9vw, 120px)", marginBottom: 8 }}>
          <RisoText>LO QUE</RisoText>{" "}
          <RisoText style={{ color: "var(--accent-a)" }}>PASARÁ</RisoText>
        </h2>
        <p className="hand" style={{ fontSize: 28, color: "var(--accent-c)", transform: "rotate(-1deg)", marginBottom: 32 }}>(posiblemente...)

        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
          {days.map((d, i) =>
          <DayCard key={d.key} day={d} i={i} />
          )}
        </div>

        <p style={{ marginTop: 32, fontSize: 13, opacity: 0.7, fontStyle: "italic" }}>
          ↳ El programa es una sugerencia con buena intención. La realidad mandará.
        </p>
      </div>
    </section>);

}

function DayCard({ day, i }) {
  const accentVar = `var(--${day.accent === "blue" ? "blue-night" : day.accent})`;
  const rot = [-1.2, 0.8, -0.6, 1.1][i % 4];

  return (
    <div
      style={{
        background: "var(--cream-2)",
        border: "2.5px solid var(--charcoal)",
        padding: "18px 18px 22px",
        position: "relative",
        transform: `rotate(${rot}deg)`,
        boxShadow: "5px 5px 0 var(--charcoal)"
      }}>
      
      <div className="tape" style={{ top: -14, left: "50%", transform: "translateX(-50%) rotate(-2deg)" }} />

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <h3 className="display" style={{ fontSize: 38, color: accentVar }}>
          {day.title}
        </h3>
        <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>{day.date}</span>
      </div>
      <p className="hand" style={{ fontSize: 22, color: "var(--charcoal)", margin: "0 0 14px", transform: "rotate(-1deg)" }}>
        {day.tagline}
      </p>

      <div style={{ borderTop: "1.5px dashed var(--charcoal)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {day.blocks.map((b, j) =>
        <div key={j} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 10, alignItems: "start" }}>
            <span className="mono" style={{ fontSize: 12, color: accentVar, fontWeight: 700 }}>{b.h}</span>
            <div>
              <div className="sub" style={{ fontSize: b.big ? 18 : 14, color: "var(--charcoal)" }}>
                {b.big && "★ "}{b.t}
              </div>
              <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>{b.note}</div>
            </div>
          </div>
        )}
      </div>
    </div>);

}

Object.assign(window, { Nav, Hero, QueEs, Programa, PhotoPlaceholder, Pill });