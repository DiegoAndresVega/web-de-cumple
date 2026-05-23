// buzon-app.jsx — Buzón del Amor

const { useState, useEffect } = React;

async function hashPw(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw + "_fkiv26"));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const PROFILES = [
  { wide: false, rot: "-1.5deg", pad: 20 },
  { wide: false, rot: "1deg",    pad: 24 },
  { wide: true,  rot: "-0.5deg", pad: 22 },
  { wide: false, rot: "2deg",    pad: 18 },
  { wide: false, rot: "-1deg",   pad: 26 },
  { wide: true,  rot: "0.8deg",  pad: 20 },
  { wide: false, rot: "-2deg",   pad: 22 },
];

function NoteCard({ nota, index, isAdmin }) {
  const p = PROFILES[index % PROFILES.length];
  const autor = nota.nombre?.trim() || "Alguien";
  const bg = nota.color === "green" ? "var(--green)" : "var(--ink)";
  const [confirm, setConfirm] = useState(false);

  const eliminar = () => {
    firebase.database().ref("buzon/" + nota.id).remove();
  };

  return (
    <div
      className={p.wide ? "buzon-card buzon-card--wide" : "buzon-card"}
      style={{
        background: bg,
        color: "#000",
        border: "3px solid #000",
        padding: p.pad,
        transform: `rotate(${p.rot})`,
        boxShadow: "5px 5px 0 #000",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
      }}
    >
      <div
        className="mono"
        style={{ fontSize: "clamp(13px, 1.6vw, 16px)", lineHeight: 1.55, flex: 1, wordBreak: "break-word" }}
      >
        {nota.mensaje}
      </div>

      <div
        style={{ borderTop: "1.5px dashed #000", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
      >
        <span className="sub" style={{ fontSize: 12, opacity: 0.8 }}>— {autor}</span>

        {isAdmin && (
          confirm
            ? <button
                className="btn danger"
                onClick={eliminar}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                ¿BORRAR? →
              </button>
            : <button
                className="btn danger"
                onClick={() => setConfirm(true)}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                BORRAR
              </button>
        )}
      </div>
    </div>
  );
}

function PasswordModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const check = async (e) => {
    e.preventDefault();
    setError("");
    const hash = await hashPw(pw);
    const snap = await firebase.database().ref("_admin/hash").once("value");
    if (!snap.val()) {
      if (pw.length < 4) return setError("MÍNIMO 4 CARACTERES");
      await firebase.database().ref("_admin/hash").set(hash);
      onSuccess();
    } else if (snap.val() === hash) {
      onSuccess();
    } else {
      setError("CONTRASEÑA INCORRECTA");
      setPw("");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--ink)", color: "#000", border: "3px solid #000", padding: 28, maxWidth: 340, width: "100%", boxShadow: "8px 8px 0 var(--green)" }}
      >
        <div className="display" style={{ fontSize: 32, marginBottom: 18 }}>ADMIN</div>
        <form onSubmit={check}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label style={{ color: "#000" }}>CONTRASEÑA</label>
            <input
              className="input"
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(false); }}
              style={{ letterSpacing: "0.2em" }}
            />
          </div>
          {error && (
            <p className="mono" style={{ color: "var(--red)", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              {error}
            </p>
          )}
          <button className="btn" type="submit" style={{ background: "#000", color: "var(--green)", width: "100%" }}>
            ENTRAR →
          </button>
        </form>
      </div>
    </div>
  );
}

function FormSection() {
  const [mensaje, setMensaje] = useState("");
  const [nombre, setNombre] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!mensaje.trim()) return;
    firebase.database().ref("buzon").push({
      nombre: nombre.trim(),
      mensaje: mensaje.trim(),
      color: Math.random() < 0.5 ? "green" : "ink",
      ts: Date.now(),
    });
    setSent(true);
    setMensaje("");
    setNombre("");
  };

  if (sent) {
    return (
      <div className="panel-green" style={{ padding: "28px 24px", boxShadow: "8px 8px 0 #000", textAlign: "center", marginBottom: 40 }}>
        <div className="display" style={{ fontSize: "clamp(36px, 7vw, 80px)", color: "#000", lineHeight: 0.9 }}>
          ENVIADO ♡
        </div>
        <p className="mono" style={{ marginTop: 14, fontSize: 13, color: "#000" }}>
          Tu nota ya está en el buzón.
        </p>
        <button
          className="btn"
          onClick={() => setSent(false)}
          style={{ marginTop: 18, background: "#000", color: "var(--green)", borderColor: "#000" }}
        >
          ← OTRA NOTA
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel-ink" style={{ padding: "24px 22px 26px", boxShadow: "8px 8px 0 var(--green)", marginBottom: 40 }}>
      <div className="eyebrow" style={{ marginBottom: 18 }}>// DEJA TU NOTA</div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label style={{ color: "#000" }}>
          MENSAJE <span style={{ fontStyle: "italic", textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(required)</span>
        </label>
        <textarea
          className="textarea"
          required
          rows={4}
          placeholder="Escribe lo que quieras..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />
      </div>

      <div className="field" style={{ marginBottom: 20 }}>
        <label style={{ color: "#000" }}>
          NOMBRE <span style={{ fontStyle: "italic", textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(opcional — si no pones nada saldrá "Alguien")</span>
        </label>
        <input
          className="input"
          type="text"
          placeholder="anónimo/a"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <button
        className="btn"
        type="submit"
        style={{ background: "var(--red)", color: "var(--ink)", outlineColor: "var(--red)", borderColor: "#000", fontSize: 16, padding: "16px 28px" }}
      >
        ENVIAR ♡
      </button>
    </form>
  );
}

function BuzonApp() {
  const [liveNotas, setLiveNotas] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const ref = firebase.database().ref("buzon");
    const handler = ref.on("value", (snap) => {
      const val = snap.val();
      if (val) {
        const arr = Object.entries(val).map(([id, n]) => ({ ...n, id }));
        arr.sort((a, b) => b.ts - a.ts);
        setLiveNotas(arr);
      } else {
        setLiveNotas([]);
      }
    });
    return () => ref.off("value", handler);
  }, []);

  return (
    <>
      <style>{`
        .buzon-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          align-items: start;
        }
        .buzon-card--wide { grid-column: span 2; }
        @media (max-width: 860px) {
          .buzon-grid { grid-template-columns: repeat(2, 1fr); }
          .buzon-card--wide { grid-column: span 2; }
        }
        @media (max-width: 540px) {
          .buzon-grid { grid-template-columns: 1fr; }
          .buzon-card--wide { grid-column: span 1; }
          .buzon-card { transform: none !important; }
          .buzon-desc { padding: 0 30px; }
          .buzon-back { padding-left: 30px; }
        }
      `}</style>

      {showModal && (
        <PasswordModal
          onSuccess={() => { setIsAdmin(true); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Header */}
      <section id="inicio" style={{ paddingTop: 50, paddingBottom: 20 }}>
        <div className="container">
          <a
            href="index.html"
            className="btn buzon-back"
            style={{ background: "var(--green)", color: "#000", borderColor: "#000", outlineColor: "var(--green)", fontSize: 13, padding: "12px 20px", marginBottom: 28, display: "inline-flex", textDecoration: "none" }}
          >
            ← VOLVER A FINKAFEST
          </a>

          <div style={{ display: "block", background: "#000", color: "var(--green)", padding: "6px 12px", border: "2px solid var(--green)", marginBottom: 26 }}>
            <span className="mono" style={{ fontSize: 12, letterSpacing: "0.22em", fontWeight: 700, textTransform: "uppercase" }}>
              X · FINKAFEST · VOL IV · 30 CUMPLEAÑOS · X
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginBottom: 30 }}>
            <div className="display" style={{ fontSize: "clamp(52px, 12vw, 140px)", background: "#000", color: "var(--red)", padding: "0 18px 8px", lineHeight: 0.95, border: "4px solid #000", boxShadow: "8px 8px 0 #000" }}>
              BUZÓN
            </div>
            <div className="display" style={{ fontSize: "clamp(52px, 12vw, 140px)", background: "var(--red)", color: "var(--ink)", padding: "0 18px 8px", lineHeight: 0.95, border: "4px solid #000", boxShadow: "8px 8px 0 #000", marginLeft: "4vw" }}>
              DEL AMOR
            </div>
          </div>

          <p className="mono buzon-desc" style={{ fontSize: 13, color: "var(--ink-dim)", maxWidth: 560, lineHeight: 1.7, marginBottom: 40 }}>
            Deja una nota con tu nombre o anónima. Una confesión, un chiste malo. Lo que quieras.
          </p>

          <FormSection />
        </div>
      </section>

      {/* Notas */}
      <section style={{ paddingTop: 0, paddingBottom: 60 }}>
        <div className="container">
          <div
            className="eyebrow"
            style={{ marginBottom: 20, cursor: "default", userSelect: "none" }}
            onDoubleClick={() => !isAdmin && setShowModal(true)}
          >
            {isAdmin ? "// MODO ADMIN · " : "// "}{liveNotas.length} NOTAS
          </div>
          <div className="buzon-grid">
            {liveNotas.map((nota, i) => (
              <NoteCard key={nota.id} nota={nota} index={i} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<BuzonApp />);
