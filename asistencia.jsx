// asistencia.jsx — Confirmar asistencia, directo

function Confirmar() {
  const empty = {
    nombre: "", contacto: "",
    dias: { vie: false, sab: false, dom: false },
    transporte: "coche",
    dormir: "tienda",
    dieta: [],
    alergias: "",
    aportar: [],
    notas: "",
  };

  const [f, setF] = React.useState(empty);
  const [sent, setSent] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleArr = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const toggleDia = (d) => setF((s) => ({ ...s, dias: { ...s.dias, [d]: !s.dias[d] } }));

  const submit = (e) => {
    e.preventDefault();
    firebase.database().ref("confirmaciones").push({ ...f, ts: Date.now() });
    setSent(true);
  };

  if (sent) {
    return (
      <section id="confirmar">
        <div className="container">
          <div className="panel-green" style={{ padding: "40px 28px", boxShadow: "10px 10px 0 #000", textAlign: "center" }}>
            <h2 className="display" style={{ fontSize: "clamp(60px, 11vw, 130px)", color: "#000" }}>
              NOS<br/>VEMOS.
            </h2>
            <p className="mono" style={{ marginTop: 16, fontSize: 14, color: "#000", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Apuntado, <strong>{f.nombre || "PEÑA"}</strong>.
            </p>
            <button
              className="btn"
              onClick={() => { setSent(false); setF(empty); }}
              style={{ marginTop: 22, background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000" }}
            >
              ← OTRA RESPUESTA
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="confirmar">
      <div className="container">
        <div className="eyebrow">// CONFIRMAR</div>
        <h2 className="display" style={{ fontSize: "clamp(50px, 10vw, 120px)", display: "inline-block", background: "#000", color: "var(--green)", padding: "10px 20px 18px", border: "4px solid #000", boxShadow: "8px 8px 0 var(--ink)", marginBottom: 26, lineHeight: 1, whiteSpace: "nowrap" }}>
          ¿VIENES?
        </h2>

        <form onSubmit={submit} className="panel-ink" style={{ padding: "24px 22px 26px", boxShadow: "10px 10px 0 var(--green)" }}>
          {/* Quién */}
          <FRow label="QUIÉN">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="grid-2">
              <div className="field">
                <label>Nombre y apellido *</label>
                <input className="input" required value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="nombre y apellido" />
              </div>
              <div className="field">
                <label>Teléfono <span className="opt">(9 dígitos)</span></label>
                <input className="input" type="tel" inputMode="numeric" pattern="[0-9]{9}" maxLength={9} value={f.contacto} onChange={(e) => set("contacto", e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="612345678" />
              </div>
            </div>
          </FRow>

          {/* Días */}
          <FRow label="DÍAS">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["vie", "VIE 19"], ["sab", "SÁB 20"], ["dom", "DOM 21"]].map(([k, lbl]) => (
                <span key={k} className={`chip ${f.dias[k] ? "on" : ""}`} onClick={() => toggleDia(k)}>
                  {f.dias[k] ? "✓ " : ""}{lbl}
                </span>
              ))}
            </div>
          </FRow>

          {/* Transporte */}
          <FRow label="CÓMO LLEGAS">
            <div className="field">
              <select className="select" value={f.transporte} onChange={(e) => set("transporte", e.target.value)}>
                <option value="coche">Llevo coche</option>
                <option value="furgo">Llevo furgo</option>
                <option value="otro-coche">El vehículo de alguien</option>
                <option value="necesito">Necesito sitio</option>
              </select>
            </div>
            <p className="mono" style={{ fontSize: 11, marginTop: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
              ↳ <a href="#finkakar" onClick={(e) => { e.preventDefault(); document.querySelector("#finkakar")?.scrollIntoView({ behavior: "smooth" }); }} style={{ color: "var(--green-2)" }}>PASA POR FINKAKAR</a> PARA PUBLICAR O PEDIR VIAJE
            </p>
          </FRow>

          {/* Dormir */}
          <FRow label="DÓNDE DUERMES">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["tienda", "TIENDA"], ["furgo", "LLEVO FURGO"], ["furgo-ajena", "EN LA FURGO DE ALGUIEN"], ["dia", "SOLO DÍA"], ["necesito", " NECESITO LUGAR"], ["otro", "OTRO"]].map(([k, lbl]) => (
                <span key={k} className={`chip ${f.dormir === k ? "on" : ""}`} onClick={() => set("dormir", k)}>
                  {f.dormir === k ? "✓ " : ""}{lbl}
                </span>
              ))}

            </div>
          </FRow>

          {/* Comida */}
          <FRow label="COMIDA">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[ "VEGETARIANA", "VEGANA", "SIN GLUTEN"].map((d) => (
                <span key={d} className={`chip ${f.dieta.includes(d) ? "on" : ""}`} onClick={() => toggleArr("dieta", d)}>
                  {f.dieta.includes(d) ? "✓ " : ""}{d}
                </span>
              ))}
            </div>
            <div className="field">
              <label>Alergias · intolerancias</label>
              <input className="input" value={f.alergias} onChange={(e) => set("alergias", e.target.value)} placeholder="frutos secos, marisco..." />
            </div>
          </FRow>

          {/* Aportas */}
          <FRow label="SI QUIERES PUEDES APORTAR...">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                 ["cocino", "COCINO"], ["limpieza", "LIMPIEZA"] ,["taller", "TALLER"], ["juego", "JUEGO"], ["dj", "DJ"],
                ["instrumento", "INSTRUMENTO"],
                ["sonido", "SONIDO"],["otro", "OTRO"],
              ].map(([k, lbl]) => (
                <span key={k} className={`chip ${f.aportar.includes(k) ? "on" : ""}`} onClick={() => toggleArr("aportar", k)}>
                  {f.aportar.includes(k) ? "✓ " : ""}{lbl}
                </span>
              ))}
            </div>
          </FRow>

          <FRow label="NOTAS">
            <div className="field">
              <textarea className="textarea" value={f.notas} onChange={(e) => set("notas", e.target.value)} placeholder="lo que tengamos que saber" />
            </div>
          </FRow>

          <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn" style={{ background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000", fontSize: 16, padding: "16px 28px" }}>
              ENVIAR →
            </button>
          </div>
        </form>

        <style>{`@media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </section>
  );
}

function FRow({ label, children }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "2px dashed #000" }}>
      <div className="sub" style={{ fontSize: 14, color: "#000", letterSpacing: "0.12em", marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

Object.assign(window, { Confirmar, FRow });
