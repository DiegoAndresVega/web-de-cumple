// punk-sections.jsx — Hero, Programa, Footer

const { useState, useEffect } = React;

/* ───────── FinkaKar fixed button (top right) ───────── */
function FinkaKarFloating() {
  const go = (e) => {
    e.preventDefault();
    document.querySelector("#finkakar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <a
      href="#finkakar"
      onClick={go}
      className="finkakar-float"
      style={{
        position: "fixed",
        top: 120,
        right: 16,
        zIndex: 100,
        textDecoration: "none",
        display: "block",
        background: "var(--green)",
        color: "#000",
        border: "3px solid #000",
        boxShadow: "6px 6px 0 #000",
        padding: "12px 18px 14px",
        transform: "rotate(-2deg)",
        maxWidth: 280,
      }}
    >
      <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>
        ¿Necesitas viaje?
      </div>
      <div className="display" style={{ fontSize: 32, lineHeight: 0.9, color: "#000" }}>
        FINKA<span style={{ color: "#fff", WebkitTextStroke: "1.5px #000" }}>KAR</span>
      </div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", marginTop: 6, fontWeight: 700, textAlign: "right" }}>
        TOCA AQUÍ →
      </div>
    </a>
  );
}

/* ───────── HERO ───────── */
function Hero() {
  const go = (id) => (e) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section id="inicio" style={{ paddingTop: 20, paddingBottom: 50 }}>
      <div className="container">
        <div className="hero-row">
          <div className="hero-row__text">
            {/* Eyebrow on zebra */}
            <div style={{ display: "inline-block", background: "#000", color: "var(--green)", padding: "6px 12px", border: "2px solid var(--green)", marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 12, letterSpacing: "0.22em", fontWeight: 700, textTransform: "uppercase" }}>
                X · FIESTA PRIVADA · VOL IV · 30 CUMPLEAÑOS · X
              </span>
            </div>

            {/* Title — black slabs stacked, sit on zebra */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <div
                className="display"
                style={{
                  fontSize: "clamp(64px, 14vw, 170px)",
                  background: "#000",
                  color: "var(--green)",
                  padding: "0 18px 8px",
                  lineHeight: 0.95,
                  border: "4px solid #000",
                  boxShadow: "8px 8px 0 #000",
                }}
              >
                FINKA
              </div>
              <div
                className="display"
                style={{
                  fontSize: "clamp(64px, 14vw, 170px)",
                  background: "var(--green)",
                  color: "#000",
                  padding: "0 18px 8px",
                  lineHeight: 0.95,
                  border: "4px solid #000",
                  boxShadow: "8px 8px 0 #000",
                  marginLeft: "6vw",
                }}
              >
                FEST
              </div>
            </div>

            {/* Date strip */}
            <div style={{
              marginTop: 26,
              display: "inline-block",
              background: "var(--ink)",
              color: "#000",
              padding: "12px 18px",
              border: "3px solid #000",
              boxShadow: "6px 6px 0 var(--green)",
            }}>
              <div className="display" style={{ fontSize: "clamp(28px, 4.6vw, 46px)", color: "#000", lineHeight: 1, whiteSpace: "nowrap" }}>
                19 · 20 · 21 JUN 2026
              </div>
              <div className="mono" style={{ marginTop: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                LA FINKA · a 15 minutos de Burgos
              </div>
            </div>

            {/* CTAs */}
            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                className="btn"
                href="#confirmar"
                onClick={go("#confirmar")}
                style={{ background: "var(--green)", color: "#000", outlineColor: "#000", borderColor: "#000", fontSize: 16, padding: "16px 24px" }}
              >
                CONFIRMAR →
              </a>
              <a
                className="btn"
                href="#finkakar"
                onClick={go("#finkakar")}
                style={{ background: "#000", color: "var(--green)", outlineColor: "var(--green)", borderColor: "var(--green)", fontSize: 16, padding: "16px 24px" }}
              >
                VIAJES ↘
              </a>
              <a
                className="btn"
                href="/buzon"
                style={{ background: "var(--red)", color: "var(--ink)", outlineColor: "var(--red)", borderColor: "var(--ink)", fontSize: 16, padding: "16px 24px" }}
              >
                BUZÓN DEL AMOR ♡
              </a>
            </div>
          </div>

          {/* Galería 2×2 */}
          <div className="hero-row__gallery">
            <div
              className="display"
              style={{ gridColumn: "1 / -1", background: "var(--green)", color: "#000", border: "3px solid #000", outline: "3px solid var(--green)", padding: "8px 14px", fontSize: "clamp(13px, 1.8vw, 20px)", letterSpacing: "0.08em", textAlign: "center" }}
            >
              ELIGE UN JUGADOR
            </div>
            <a href="/gallibird?char=2" style={{ display: "block" }}>
              <img src="images/gallilara.png" alt="Lara" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1", transition: "opacity .15s" }} onMouseOver={e => e.target.style.opacity=".75"} onMouseOut={e => e.target.style.opacity="1"} />
            </a>
            <a href="/gallibird?char=1" style={{ display: "block" }}>
              <img src="images/galliisthar.png" alt="Isthar" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1", transition: "opacity .15s" }} onMouseOver={e => e.target.style.opacity=".75"} onMouseOut={e => e.target.style.opacity="1"} />
            </a>
            <a href="/gallibird?char=0" style={{ display: "block" }}>
              <img src="images/gallidiego.png" alt="Diego" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1", transition: "opacity .15s" }} onMouseOver={e => e.target.style.opacity=".75"} onMouseOut={e => e.target.style.opacity="1"} />
            </a>
            <a href="/gallibird?char=3" style={{ display: "block" }}>
              <img src="images/gallilau.png" alt="Lau" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1", transition: "opacity .15s" }} onMouseOver={e => e.target.style.opacity=".75"} onMouseOut={e => e.target.style.opacity="1"} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── CONQUIS ───────── */
const CONQUIS_VIDEO = "https://www.youtube.com/embed/AVsR5lB--sw?si=sd5M-ZC0hCxgvyCg";

function Conquis() {
  return (
    <section id="conquis">
      <div className="container">
        <div className="eyebrow">// CONQUIS</div>
        <h2 className="display" style={{ fontSize: "clamp(40px, 8vw, 96px)", display: "inline-block", background: "#000", color: "var(--green)", padding: "10px 18px 16px", border: "4px solid #000", boxShadow: "8px 8px 0 var(--ink)", marginBottom: 26, lineHeight: 1 }}>
          CONQUIS
        </h2>

        <div className="panel-black" style={{ padding: 0, borderColor: "var(--green)", boxShadow: "8px 8px 0 var(--green)", overflow: "hidden" }}>
          {CONQUIS_VIDEO ? (
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src={CONQUIS_VIDEO}
                title="Conquis"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
          ) : (
            <div style={{ padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div className="display" style={{ fontSize: "clamp(28px, 5vw, 52px)", color: "var(--green)", lineHeight: 1 }}>
                PRONTO VIDEO
              </div>
              <div className="display" style={{ fontSize: "clamp(20px, 3vw, 36px)", color: "var(--ink-dim)", lineHeight: 1 }}>
                ATENTO.
              </div>
              <div className="mono" style={{ marginTop: 8, fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                ↳ Aquí irá el vídeo de instrucciones
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────── PROGRAMA ───────── */
function Programa() {
  const days = [
    {
      key: "vie", title: "VIE 19",
      blocks: [
        ["-", "Llegadas + montar"],
        ["-", "actividades"],
        ["-", "Cena compartida"],
        ["-", "Fogata" ],
        ["-", "JAM" ],
      ],
    },
    {
      key: "sab", title: "SÁB 20",
      blocks: [
        ["-", "Desayuno rico (invitamos)"],
        ["-", "Juegos populares · Serigrafía · Mercadillo"],
        ["-", "Vermú cuñado "],
        ["-", "Paella para todes  (invitamos)"],
        ["-", "Siesta · piscina · relax"],
        ["-", "CONQUISTADOR!!"],
        ["-", "actividades"],
        ["-", "Cena picoteo + fiesta "],
      ],
    },
    {
      key: "dom", title: "DOM 21",
      blocks: [
        ["-", "Desayuno resaca "],
        ["-", "Recogida + limpieza"],
        ["-", "Despedida"],
      ],
    },
  ];

  return (
    <section id="programa">
      <div className="container">
        <div className="eyebrow">// PROGRAMA</div>
        <h2 className="display" style={{ fontSize: "clamp(40px, 8vw, 96px)", display: "inline-block", background: "#000", color: "var(--green)", padding: "10px 18px 16px", border: "4px solid #000", boxShadow: "8px 8px 0 var(--ink)", marginBottom: 26, lineHeight: 1, whiteSpace: "nowrap" }}>
          QUÉ PASA
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {days.map((d) => (
            <div key={d.key} className="panel-ink" style={{ padding: 18, boxShadow: "6px 6px 0 var(--green)" }}>
              <div className="display" style={{ fontSize: 38, color: "#000", marginBottom: 12, borderBottom: "3px solid #000", paddingBottom: 8 }}>
                {d.title}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {d.blocks.map(([h, t], i) => (
                  <li key={i} style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 10, alignItems: "baseline" }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#000", background: "var(--green)", padding: "3px 6px", textAlign: "center", border: "2px solid #000" }}>{h}</span>
                    <span className="sub" style={{ fontSize: 14, color: "#000" }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mono" style={{ marginTop: 18, fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          ↳ Borrador · HABRA CAMBIOS , ATENTO. 
        </p>
      </div>
    </section>
  );
}

/* ───────── MARQUEE ───────── */
function Marquee({ items }) {
  return (
    <div className="marquee">
      <div className="marquee__track">
        {Array.from({ length: 3 }).flatMap((_, k) =>
          items.map((it, i) => <span key={`${k}-${i}`}>{it}</span>)
        )}
      </div>
    </div>
  );
}

/* ───────── INFO ───────── */
function Info() {
  const traer = [
    {
      cat: "IMPRESCINDIBLES",
      color: "var(--green)",
      items: [
        "Tienda de campaña",
        "Saco de dormir",
        "Botella de agua",
        "Plato · cubiertos",
        "Bañador · toalla",
        "Tapones de oídos",
      ],
    },
    {
      cat: "RECOMENDADAS",
      color: "var(--ink)",
      items: [
        "Instrumento musical",
        "Frontal · linterna",
        "Ropa para serigrafíar",
        "Pinchos para el vermú",
        "Bebida propia",
        "Esterilla · aislante",
        "Sudadera para la noche",
        "Protector solar · gorra",
        "Chanclas",
      ],
    },
  ];

  const normas = [
    { titulo: "Cero colillas al suelo", detalle: "Habra muchos ceniceros, USALOS." },
    { titulo: "Trae tu bebida", detalle: "Habra bebida comunitaria, ten en cuenta que lo que entre en neveras puede acabar siendo de todos." },
    { titulo: "Colabora con las tareas", detalle: "Si ves algo que hacer, hazlo." },
    { titulo: "La fiesta del sabado puede durar hasta por la mañana", detalle: "si quieres dormir trae tapones." },
    { titulo: "Animales bienvenidos, con responsabilidad", detalle: "Cuidemos entre todes que sea un espacio seguro para ellos y la finka." },
    { titulo: "Recoge tu basura", detalle: "Llevate una bolsa de basura al marchar." },
    { titulo: "Trae instrumentos para la jam del viernes", detalle: "Entre todos hacemos la JAM" },
    { titulo: "En el baño seco NO SE MEA", detalle: "Primero meas fuera, despues cagas." },
    { titulo: "Hay animales!", detalle: "En la finka hay animales, por favor no les molestes. Suficiente tienen con aguantar un finde de fiesta de fondo" },
  ];

  return (
    <section id="info">
      <div className="container">
        <div className="eyebrow">// INFO</div>
        <h2 className="display" style={{ fontSize: "clamp(40px, 8vw, 96px)", display: "inline-block", background: "#000", color: "var(--green)", padding: "10px 18px 16px", border: "4px solid #000", boxShadow: "8px 8px 0 var(--ink)", marginBottom: 26, lineHeight: 1, whiteSpace: "nowrap" }}>
          ANTES DE VENIR
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* INFORMACION */}
          <div className="panel-ink" style={{ padding: 24, boxShadow: "6px 6px 0 var(--green)" }}>
            <div className="sub" style={{ fontSize: 13, marginBottom: 16, borderBottom: "3px solid #000", paddingBottom: 8, color: "#000" }}>INFORMACION</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: "#000", background: "var(--green)", display: "inline-block", padding: "2px 8px", border: "1.5px solid #000", marginBottom: 14 }}>
              CUARTA EDICION!!
            </div>
            <p className="mono" style={{ fontSize: 14, color: "#000", lineHeight: 1.7, margin: "0 0 22px", maxWidth: 860 }}>
              Este año nos toca a Laura, Isthar, Lara y Diego celebrar nuestro 30 cumpleaños y queremos invitaros a este precioso evento.<br></br>
              Queremos preparar un fin de semana lleno de sorpresas, no solo una fiesta. <br></br>Pasaremos un fin de semana de acampada por lo que
              preparate para dormir en tienda o furgo. Por favor avisanos en cual para organizar los espacios y que todo el mundo pueda entrar con los coches!<br></br>
              y si necesitas una tienda dinos y quizas podemos ayudarte!<br></br>
              Para poder saber todo lo que necesitamos es muy importante que nos confirmes tu asistencia y si sera 1, 2 o los 3 dias. Asi podemos preparar comidas, desayunos, etc.
            </p>

            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: "var(--ink)", background: "#000", display: "inline-block", padding: "2px 8px", border: "1.5px solid #000", marginBottom: 12 }}>
              VERMU CUÑAO
            </div>
            <p className="mono" style={{ fontSize: 13, color: "#000", lineHeight: 1.6, margin: "0 0 10px", maxWidth: 860 }}>
              Aqui si que os pedimos que traigais vuestros mejores pinchos, chistes y punteria porque la programacion sera la siguiente:
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "Concurso de pinchos — gildas, picoteo, latas, encurtidos. tampoco te compliques, solo queremos que la mayor cantidad de gente participe.",
                "Concurso de frases cuñadiles (sin machistadas desgraciado, tampoco hay que ponerse tonto.)",
                "Tiro a la aceituna.",
              ].map((item, i) => (
                <li key={i} className="mono" style={{ fontSize: 13, color: "#000", display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ color: "#000", fontWeight: 700, flexShrink: 0 }}>—</span>
                  {item}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 20 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: "#000", background: "#fff", display: "inline-block", padding: "2px 8px", border: "1.5px solid #000", marginBottom: 12 }}>
                MERKADILLO
              </div>
              <p className="mono" style={{ fontSize: 13, color: "#000", lineHeight: 1.6, margin: 0, maxWidth: 860 }}>
                Queremos organizar un merkadillo de ropa gratuito, por lo que trae ropa que tengas EN BUEN ESTADO de la que te quieras desprender y te lleves lo que mas te guste. <br></br>
                Todo lo que sobre lo donaremos. Asi que trae ropa que quieras que otra persona disfrute!
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: "#000", background: "var(--green)", display: "inline-block", padding: "2px 8px", border: "1.5px solid #000", marginBottom: 12 }}>
                APORTACION
              </div>
              <p className="mono" style={{ fontSize: 13, color: "#000", lineHeight: 1.6, margin: 0, maxWidth: 860 }}>
                Esta tradicion es posible gracias al prestamo de la finka. Por lo que hay que cuidarla y respetarla. <br></br>
                Solo pedimos una aportacion de <span style={{ background: "var(--green)", color: "#000", fontWeight: 700, padding: "1px 6px", border: "1.5px solid #000", display: "inline-block", lineHeight: 1.4 }}>5€</span> o la voluntad para poder cubrir parte de los gastos de comida, bebida y poder dejar algo para el espacio.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>

          {/* QUÉ TRAER */}
          <div className="panel-black" style={{ padding: 20, borderColor: "var(--green)", boxShadow: "6px 6px 0 var(--green)" }}>
            <div className="sub" style={{ fontSize: 13, marginBottom: 16, borderBottom: "3px solid var(--green)", paddingBottom: 8, color: "var(--green)" }}>QUÉ TRAER</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {traer.map((grupo) => (
                <div key={grupo.cat}>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: "#000", background: grupo.color, display: "inline-block", padding: "2px 8px", border: "1.5px solid var(--green)", marginBottom: 8 }}>
                    {grupo.cat}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                    {grupo.items.map((item) => (
                      <li key={item} className="mono" style={{ fontSize: 13, color: "var(--ink)", display: "flex", gap: 8, alignItems: "baseline" }}>
                        <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* NORMAS */}
          <div className="panel-black" style={{ padding: 20, borderColor: "var(--green)", boxShadow: "6px 6px 0 var(--green)" }}>
            <div className="sub" style={{ fontSize: 13, marginBottom: 16, borderBottom: "3px solid var(--green)", paddingBottom: 8, color: "var(--green)" }}>IMPORTANTE</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
              {normas.map((n, i) => (
                <li key={i} style={{ paddingTop: 12, paddingBottom: 12, borderBottom: "1.5px dashed rgba(255,255,255,0.15)" }}>
                  <div className="sub" style={{ fontSize: 13, color: "var(--green)", letterSpacing: "0.04em" }}>— {n.titulo}</div>
                  {n.detalle && (
                    <div className="mono" style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.55, marginTop: 4, paddingLeft: 14 }}>{n.detalle}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          </div>

        </div>
      </div>
    </section>
  );
}

/* ───────── FOOTER ───────── */
function Footer() {
  const [visits, setVisits] = useState(null);

  useEffect(() => {
    try {
      let vid = localStorage.getItem("fk_vid");
      if (!vid) {
        vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("fk_vid", vid);
        firebase.database().ref("visits/" + vid).set(1);
      }
      firebase.database().ref("visits").once("value", s => setVisits(s.numChildren()));
    } catch(e) {}
  }, []);

  return (
    <footer style={{ paddingTop: 60, paddingBottom: 40 }}>
      <div className="container">
        <div className="panel-black" style={{ padding: "32px 24px", borderColor: "var(--green)", boxShadow: "8px 8px 0 var(--green)" }}>

          {/* Fila superior: título + galería */}
          <div className="footer-row">
            <div className="footer-row__text">
              <div className="display" style={{ fontSize: "clamp(56px, 12vw, 150px)", lineHeight: 0.85, color: "var(--green)" }}>
                FINKA<br/>FEST<br/>
                <span style={{ color: "var(--ink)" }}>·IV·</span>
              </div>
            </div>

            {/* Galería 2×2 */}
            <div className="footer-row__gallery">
              <img src="images/gallidiego.png" alt="Finkafest" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1" }} />
              <img src="images/galliisthar.png" alt="Finkafest" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1" }} />
              <img src="images/gallilara.png" alt="Finkafest" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1" }} />
              <img src="images/gallilau.png" alt="Finkafest" style={{ width: "100%", display: "block", objectFit: "cover", aspectRatio: "1" }} />
            </div>
          </div>

          {/* Info debajo de la línea punteada */}
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14, paddingTop: 20, borderTop: "2px dashed var(--green)" }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--green)", marginBottom: 6 }}>CUÁNDO</div>
              <div className="sub" style={{ fontSize: 16 }}>19 · 20 · 21 JUN 2026</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--green)", marginBottom: 6 }}>DÓNDE</div>
              <div className="sub" style={{ fontSize: 16 }}>LA FINKA · 15 min de Burgos</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--green)", marginBottom: 6 }}>SI VES ALGO RARO</div>
              <div className="sub" style={{ fontSize: 16 }}>COMUNICALO</div>
            </div>
          </div>

          <div className="mono" style={{ marginTop: 26, fontSize: 11, opacity: 0.6, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            FK·IV·2026 — GESTIONA TU MIERDA{visits !== null ? ` · ${visits}` : ""}
          </div>

        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { FinkaKarFloating, Hero, Programa, Marquee, Info, Conquis, Footer });
