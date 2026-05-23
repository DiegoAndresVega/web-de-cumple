// punk-viajes.jsx — FinkaKar: tablón de coches compartidos (Firebase)

function NumStepper({ value, min, max, onChange }) {
  const dec = () => { if (value > min) onChange(value - 1); };
  const inc = () => { if (value < max) onChange(value + 1); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, border: "3px solid #000", background: "#fff", width: "100%" }}>
      <button type="button" onClick={dec} style={{
        width: 52, height: 52, background: value <= min ? "#eee" : "#000",
        color: value <= min ? "#aaa" : "var(--green)", border: "none",
        fontSize: 28, fontWeight: 900, cursor: value <= min ? "default" : "pointer",
        fontFamily: "Arial Black, sans-serif", flexShrink: 0,
      }}>−</button>
      <div style={{
        flex: 1, textAlign: "center", fontSize: 24, fontWeight: 700,
        fontFamily: "Archivo Black, sans-serif", color: "#000", userSelect: "none",
      }}>{value}</div>
      <button type="button" onClick={inc} style={{
        width: 52, height: 52, background: value >= max ? "#eee" : "#000",
        color: value >= max ? "#aaa" : "var(--green)", border: "none",
        fontSize: 28, fontWeight: 900, cursor: value >= max ? "default" : "pointer",
        fontFamily: "Arial Black, sans-serif", flexShrink: 0,
      }}>+</button>
    </div>
  );
}

function FinkaKar() {
  const [trips, setTrips] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(null);
  const [passengers, setPassengers] = React.useState([]);
  const [loadingPax, setLoadingPax] = React.useState(true);
  const [paxModal, setPaxModal] = React.useState(null);

  React.useEffect(() => {
    const ref = firebase.database().ref("trips");
    const handler = ref.on("value", (snap) => {
      const val = snap.val();
      setTrips(val ? Object.values(val).filter((t) => !t.disabled) : []);
      setLoading(false);
    });
    const pRef = firebase.database().ref("passengers");
    const pHandler = pRef.on("value", (snap) => {
      const val = snap.val();
      setPassengers(val ? Object.values(val).filter((p) => !p.disabled) : []);
      setLoadingPax(false);
    });
    return () => {
      ref.off("value", handler);
      pRef.off("value", pHandler);
    };
  }, []);

  const genId = () => {
    const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let id;
    do {
      const letra = letras[Math.floor(Math.random() * letras.length)];
      const nums = String(Math.floor(Math.random() * 900) + 100);
      id = letra + nums;
    } while (trips.some((t) => t.id === id));
    return id;
  };

  const save = (data) => {
    const db = firebase.database();
    if (data.id) {
      db.ref("trips/" + data.id).update(data);
    } else {
      const id = genId();
      db.ref("trips/" + id).set({ ...data, id, disabled: false });
    }
    setModal(null);
  };

  const remove = (id) => {
    firebase.database().ref("trips/" + id).remove();
    setModal(null);
  };

  const savePax = (data) => {
    const db = firebase.database();
    if (data.id) {
      db.ref("passengers/" + data.id).update(data);
    } else {
      const id = genId();
      db.ref("passengers/" + id).set({ ...data, id, disabled: false });
    }
    setPaxModal(null);
  };

  const removePax = (id) => {
    firebase.database().ref("passengers/" + id).remove();
    setPaxModal(null);
  };

  return (
    <section id="finkakar" style={{ position: "relative" }}>
      <div className="container">
        <div className="panel-green" style={{ padding: "26px 22px 28px", boxShadow: "10px 10px 0 #000", position: "relative" }}>
          <div className="tape" style={{ top: -16, right: 20, transform: "rotate(4deg)", background: "#000", color: "var(--green)", borderColor: "var(--green)" }}>
            ↘ TABLÓN COMÚN
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

            {/* Izquierda: eyebrow + título + subtítulo + count */}
            <div style={{ flex: "1 1 280px" }}>
              <div className="mono" style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, color: "#000" }}>
                // VIAJES COMPARTIDOS
              </div>
              <h2 className="display" style={{ fontSize: "clamp(60px, 12vw, 140px)", color: "#000", marginTop: 4 }}>
                FINKA<span style={{ color: "var(--ink)", WebkitTextStroke: "2px #000" }}>KAR</span>
              </h2>
              <p className="mono" style={{ fontSize: 14, color: "#000", marginTop: 8, fontWeight: 700 }}>
                PUBLICA TU COCHE Y COORDINA CON QUIEN NECESITE SITIO.
              </p>
              <span className="mono" style={{ display: "block", marginTop: 16, fontSize: 13, fontWeight: 700, color: "#000", letterSpacing: "0.08em" }}>
                {loading
                  ? "Cargando..."
                  : `${trips.length} COCHE${trips.length !== 1 ? "S" : ""} PUBLICADO${trips.length !== 1 ? "S" : ""}`
                }
              </span>
            </div>

            {/* Derecha: nota conductor + botones */}
            <div className="finkakar-right" style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 8 }}>
              <p className="mono" style={{ fontSize: 13, color: "#000", fontWeight: 700, margin: 0, maxWidth: 340 }}>
                - CONDUCTOR:<br/>Los viajes tienen un ID, este se usa para editar el viaje. Edítalo por favor cuando vayas llenando plazas.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  onClick={() => setModal({ mode: "find" })}
                  style={{ background: "var(--ink)", color: "#000", outlineColor: "#000", borderColor: "#000", fontSize: 14, padding: "12px 18px" }}
                >
                  EDITAR MI VIAJE
                </button>
                <button
                  className="btn"
                  onClick={() => setModal({ mode: "new" })}
                  style={{ background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000", fontSize: 14, padding: "12px 18px" }}
                >
                  + PUBLICAR MI COCHE
                </button>
              </div>
            </div>

          </div>

          {/* Cards */}
          <style>{`@media(max-width:700px){.trips-grid{grid-template-columns:1fr!important}}@media(min-width:701px)and(max-width:960px){.trips-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
          <div className="trips-grid" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, alignItems: "start" }}>
            {loading && (
              <div style={{ padding: 22, border: "3px dashed #000", color: "#000" }}>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>Conectando...</div>
              </div>
            )}
            {!loading && trips.map((t) => <TripCard key={t.id} trip={t} />)}
            {!loading && !trips.length && (
              <div style={{ padding: 22, border: "3px dashed #000", color: "#000" }}>
                <div className="sub" style={{ fontSize: 22 }}>NADA AUN</div>
                <p className="mono" style={{ fontSize: 13, marginTop: 6, fontWeight: 700 }}>Sé la primera en publicar.</p>
              </div>
            )}
          </div>

          {/* ── BUSCO VIAJE ── */}
          <div style={{ marginTop: 36, paddingTop: 28, borderTop: "3px solid #000" }}>

            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 18 }}>
              <div style={{ flex: "1 1 280px" }}>
                <div className="mono" style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, color: "#000" }}>
                  // PASAJEROS
                </div>
                <h3 className="display" style={{ fontSize: "clamp(44px, 9vw, 110px)", color: "#000", marginTop: 4, lineHeight: 0.9 }}>
                  BUSCO VIAJE
                </h3>
                <p className="mono" style={{ fontSize: 14, color: "#000", marginTop: 8, fontWeight: 700 }}>
                  ¿NO TIENES COCHE? PUBLICA TU ORIGEN Y COORDÍNATE CON UN CONDUCTOR.
                </p>
                <span className="mono" style={{ display: "block", marginTop: 14, fontSize: 13, fontWeight: 700, color: "#000", letterSpacing: "0.08em" }}>
                  {loadingPax ? "Cargando..." : `${passengers.length} PASAJERO${passengers.length !== 1 ? "S" : ""} BUSCANDO`}
                </span>
              </div>
              <div className="finkakar-right" style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start", paddingTop: 8 }}>
                <p className="mono" style={{ fontSize: 13, color: "#000", fontWeight: 700, margin: 0, maxWidth: 340 }}>
                  - PASAJERO:<br/>Usa tu ID para editar o borrar tu petición cuando ya hayas encontrado viaje.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn" onClick={() => setPaxModal({ mode: "find" })} style={{ background: "var(--ink)", color: "#000", outlineColor: "#000", borderColor: "#000", fontSize: 14, padding: "12px 18px" }}>
                    EDITAR MI PETICIÓN
                  </button>
                  <button className="btn" onClick={() => setPaxModal({ mode: "new" })} style={{ background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000", fontSize: 14, padding: "12px 18px" }}>
                    + BUSCO VIAJE
                  </button>
                </div>
              </div>
            </div>

            <div className="trips-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, alignItems: "start" }}>
              <PassengerCard example passenger={{ nombre: "Marta", origen: "Granada", dia: "VIE", hora: "Mañana", contacto: "@marta_g", notas: "Puedo adaptarme a horario si alguien viene del sur!" }} />
              {!loadingPax && passengers.map((p) => <PassengerCard key={p.id} passenger={p} />)}
            </div>
          </div>
        </div>

        {modal?.mode === "new"  && <TripModal onSave={save} onClose={() => setModal(null)} />}
        {modal?.mode === "find" && <FindModal trips={trips} onSave={save} onDelete={remove} onClose={() => setModal(null)} />}
        {paxModal?.mode === "new"  && <PassengerModal onSave={savePax} onClose={() => setPaxModal(null)} />}
        {paxModal?.mode === "find" && <FindPassengerModal passengers={passengers} onSave={savePax} onDelete={removePax} onClose={() => setPaxModal(null)} />}
      </div>
    </section>
  );
}

function TripCard({ trip }) {
  return (
    <div style={{
      background: "#000",
      color: "var(--ink)",
      border: "3px solid #000",
      padding: 16,
      position: "relative",
      outline: "3px solid var(--ink)",
      outlineOffset: "-7px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div className="sub" style={{ fontSize: 16, color: "var(--green)", letterSpacing: "0.06em" }}>
          COCHE
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="display" style={{ fontSize: 32, color: "var(--green)", lineHeight: 1 }}>
            {trip.plazas}<span style={{ opacity: 0.45, fontSize: 18, color: "var(--ink)" }}>/{trip.total}</span>
          </div>
          <div className="mono" style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase" }}>plazas libres</div>
        </div>
      </div>

      {trip.nombre && (
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.1em", marginTop: 6, textTransform: "uppercase" }}>
          {trip.nombre}
        </div>
      )}

      <div className="display" style={{ fontSize: 30, marginTop: 4, lineHeight: 1, color: "var(--ink)" }}>
        {trip.origen}
      </div>

      <div className="mono" style={{ fontSize: 12, marginTop: 8, color: "var(--green)", fontWeight: 700, letterSpacing: "0.1em" }}>
        {trip.dia} · {trip.hora}
      </div>

      {trip.notas && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1.5px dashed var(--green)", fontSize: 12, lineHeight: 1.5, color: "var(--ink-dim)" }}>
          {trip.notas}
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1.5px dashed var(--green)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{trip.contacto}</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--green)", opacity: 0.8, letterSpacing: "0.14em" }}>ID: {trip.id}</div>
      </div>
    </div>
  );
}

function FindModal({ trips, onSave, onDelete, onClose }) {
  const [step, setStep] = React.useState("find");
  const [idInput, setIdInput] = React.useState("");
  const [trip, setTrip] = React.useState(null);
  const [error, setError] = React.useState(false);

  const lookup = (e) => {
    e.preventDefault();
    const found = trips.find((t) => t.id === idInput.trim().toUpperCase());
    if (found) { setTrip(found); setStep("edit"); setError(false); }
    else setError(true);
  };

  if (step === "edit") {
    return <TripModal trip={trip} onSave={onSave} onDelete={onDelete} onClose={onClose} />;
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--green)", color: "#000", border: "3px solid #000", padding: 28, maxWidth: 400, width: "100%", boxShadow: "10px 10px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 className="display" style={{ fontSize: 34, color: "#000" }}>EDITAR VIAJE</h3>
          <button onClick={onClose} style={{ background: "#000", border: "3px solid #000", color: "var(--green)", padding: "6px 12px", fontFamily: "var(--sub)", fontSize: 14, cursor: "pointer" }}>X</button>
        </div>
        <p className="mono" style={{ fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>
          Introduce el ID que aparece en tu tarjeta
        </p>
        <form onSubmit={lookup}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>ID del viaje</label>
            <input
              className="input"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="A241"
              autoFocus
              style={{ textTransform: "uppercase", fontSize: 24, letterSpacing: "0.25em", fontWeight: 700, textAlign: "center" }}
            />
          </div>
          {error && (
            <p className="mono" style={{ color: "var(--red)", fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: "0.08em" }}>
              ID no encontrado. Comprueba la tarjeta.
            </p>
          )}
          <button type="submit" className="btn" style={{ background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000", width: "100%", justifyContent: "center" }}>
            BUSCAR →
          </button>
        </form>
      </div>
    </div>
  );
}

function TripModal({ trip, onSave, onDelete, onClose }) {
  const isEdit = !!trip?.id;
  const [t, setT] = React.useState(trip || {
    nombre: "", origen: "", dia: "VIE", hora: "", plazas: 2, total: 4, contacto: "", notas: "",
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const set = (k, v) => setT((s) => ({ ...s, [k]: v }));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--green)", color: "#000", border: "3px solid #000", padding: 22, maxWidth: 540, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "10px 10px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="display" style={{ fontSize: 34, color: "#000" }}>
            {isEdit ? "EDITAR VIAJE" : "NUEVO VIAJE"}
          </h3>
          <button onClick={onClose} style={{ background: "#000", border: "3px solid #000", color: "var(--green)", padding: "6px 12px", fontFamily: "var(--sub)", fontSize: 14, cursor: "pointer" }}>X</button>
        </div>

        {isEdit && (
          <div className="mono" style={{ fontSize: 11, marginBottom: 16, opacity: 0.6, letterSpacing: "0.12em" }}>
            ID: {t.id}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="modal-grid">
          <div className="field">
            <label>Nombre *</label>
            <input className="input" required value={t.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="como te llamamos" />
          </div>
          <div className="field">
            <label>Origen *</label>
            <input className="input" required value={t.origen} onChange={(e) => set("origen", e.target.value)} placeholder="Madrid · Bilbao..." />
          </div>
          <div className="field">
            <label>Dia</label>
            <select className="select" value={t.dia} onChange={(e) => set("dia", e.target.value)}>
              <option value="VIE">Viernes 19</option>
              <option value="SAB">Sabado 20</option>
              <option value="DOM">Domingo 21 (vuelta)</option>
            </select>
          </div>
          <div className="field">
            <label>Hora</label>
            <input className="input" value={t.hora} onChange={(e) => set("hora", e.target.value)} placeholder="15:00 · tarde" />
          </div>
          <div className="field">
            <label>Contacto *</label>
            <input className="input" required value={t.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="@tu_user · 6XX..." />
          </div>
          <div className="field">
            <label>Plazas libres</label>
            <NumStepper value={t.plazas} min={0} max={8} onChange={(v) => set("plazas", v)} />
          </div>
          <div className="field">
            <label>Plazas totales</label>
            <NumStepper value={t.total} min={1} max={8} onChange={(v) => set("total", v)} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>Notas <span className="opt">(rutas · paradas · lo que sea)</span></label>
          <textarea className="textarea" value={t.notas} onChange={(e) => set("notas", e.target.value)} placeholder="paso por X · llevo guitarra..." />
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isEdit && onDelete && (
            confirmDelete
              ? <button className="btn danger" onClick={() => onDelete(t.id)}>BORRAR DE VERDAD? →</button>
              : <button className="btn" onClick={() => setConfirmDelete(true)} style={{ background: "transparent", color: "#000", border: "2px solid #000", outlineColor: "transparent" }}>BORRAR</button>
          )}
          <button className="btn" onClick={() => onSave(t)} style={{ marginLeft: "auto", background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000" }}>
            {isEdit ? "GUARDAR" : "PUBLICAR"} →
          </button>
        </div>

        <style>{`@media (max-width: 560px) { .modal-grid { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </div>
  );
}

function PassengerCard({ passenger, example }) {
  return (
    <div style={{
      background: "var(--ink)",
      color: "#000",
      border: "3px solid #000",
      padding: 16,
      position: "relative",
      boxShadow: "4px 4px 0 #000",
    }}>
      {example && (
        <div style={{
          position: "absolute", top: -12, right: 12,
          background: "var(--yellow)", color: "#000", border: "2px solid #000",
          padding: "2px 8px", fontFamily: "var(--sub)", fontSize: 10,
          letterSpacing: "0.1em", textTransform: "uppercase", transform: "rotate(2deg)",
        }}>EJEMPLO</div>
      )}
      <div className="sub" style={{ fontSize: 16, color: "#000", letterSpacing: "0.06em" }}>PASAJERO/A</div>
      {passenger.nombre && (
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#000", letterSpacing: "0.1em", marginTop: 6, textTransform: "uppercase" }}>
          {passenger.nombre}
        </div>
      )}
      <div className="display" style={{ fontSize: 30, marginTop: 4, lineHeight: 1, color: "#000" }}>
        {passenger.origen}
      </div>
      <div className="mono" style={{ fontSize: 12, marginTop: 8, fontWeight: 700, letterSpacing: "0.1em", color: "#000" }}>
        {passenger.dia} · {passenger.hora}
      </div>
      {passenger.notas && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1.5px dashed #000", fontSize: 12, lineHeight: 1.5, color: "#000" }}>
          {passenger.notas}
        </div>
      )}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1.5px dashed #000", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: "#000" }}>{passenger.contacto}</div>
        {!example && <div className="mono" style={{ fontSize: 10, color: "#000", opacity: 0.6, letterSpacing: "0.14em" }}>ID: {passenger.id}</div>}
      </div>
    </div>
  );
}

function PassengerModal({ passenger, onSave, onDelete, onClose }) {
  const isEdit = !!passenger?.id;
  const [p, setP] = React.useState(passenger || { nombre: "", origen: "", dia: "VIE", hora: "", contacto: "", notas: "" });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--green)", color: "#000", border: "3px solid #000", padding: 22, maxWidth: 540, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "10px 10px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="display" style={{ fontSize: 34, color: "#000" }}>{isEdit ? "EDITAR PETICIÓN" : "BUSCO VIAJE"}</h3>
          <button onClick={onClose} style={{ background: "#000", border: "3px solid #000", color: "var(--green)", padding: "6px 12px", fontFamily: "var(--sub)", fontSize: 14, cursor: "pointer" }}>X</button>
        </div>
        {isEdit && <div className="mono" style={{ fontSize: 11, marginBottom: 16, opacity: 0.6, letterSpacing: "0.12em" }}>ID: {p.id}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="modal-grid">
          <div className="field">
            <label>Nombre *</label>
            <input className="input" required value={p.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="como te llamamos" />
          </div>
          <div className="field">
            <label>Origen *</label>
            <input className="input" required value={p.origen} onChange={(e) => set("origen", e.target.value)} placeholder="Granada · Sevilla..." />
          </div>
          <div className="field">
            <label>Día</label>
            <select className="select" value={p.dia} onChange={(e) => set("dia", e.target.value)}>
              <option value="VIE">Viernes 19</option>
              <option value="SAB">Sábado 20</option>
              <option value="DOM">Domingo 21 (vuelta)</option>
            </select>
          </div>
          <div className="field">
            <label>Hora aproximada</label>
            <input className="input" value={p.hora} onChange={(e) => set("hora", e.target.value)} placeholder="mañana · tarde" />
          </div>
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label>Contacto *</label>
            <input className="input" required value={p.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="@tu_user · 6XX..." />
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Notas <span className="opt">(ruta · flexibilidad · lo que sea)</span></label>
          <textarea className="textarea" value={p.notas} onChange={(e) => set("notas", e.target.value)} placeholder="puedo cambiar horario · necesito llevar mochila grande..." />
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isEdit && onDelete && (
            confirmDelete
              ? <button className="btn danger" onClick={() => onDelete(p.id)}>BORRAR DE VERDAD? →</button>
              : <button className="btn" onClick={() => setConfirmDelete(true)} style={{ background: "transparent", color: "#000", border: "2px solid #000", outlineColor: "transparent" }}>BORRAR</button>
          )}
          <button className="btn" onClick={() => onSave(p)} style={{ marginLeft: "auto", background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000" }}>
            {isEdit ? "GUARDAR" : "PUBLICAR"} →
          </button>
        </div>
        <style>{`@media (max-width: 560px) { .modal-grid { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </div>
  );
}

function FindPassengerModal({ passengers, onSave, onDelete, onClose }) {
  const [step, setStep] = React.useState("find");
  const [idInput, setIdInput] = React.useState("");
  const [passenger, setPassenger] = React.useState(null);
  const [error, setError] = React.useState(false);

  const lookup = (e) => {
    e.preventDefault();
    const found = passengers.find((p) => p.id === idInput.trim().toUpperCase());
    if (found) { setPassenger(found); setStep("edit"); setError(false); }
    else setError(true);
  };

  if (step === "edit") return <PassengerModal passenger={passenger} onSave={onSave} onDelete={onDelete} onClose={onClose} />;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--green)", color: "#000", border: "3px solid #000", padding: 28, maxWidth: 400, width: "100%", boxShadow: "10px 10px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 className="display" style={{ fontSize: 34, color: "#000" }}>EDITAR PETICIÓN</h3>
          <button onClick={onClose} style={{ background: "#000", border: "3px solid #000", color: "var(--green)", padding: "6px 12px", fontFamily: "var(--sub)", fontSize: 14, cursor: "pointer" }}>X</button>
        </div>
        <p className="mono" style={{ fontSize: 13, fontWeight: 700, marginBottom: 18, letterSpacing: "0.06em" }}>
          Introduce el ID que aparece en tu tarjeta
        </p>
        <form onSubmit={lookup}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>ID de la petición</label>
            <input className="input" value={idInput} onChange={(e) => setIdInput(e.target.value)} placeholder="A241" autoFocus style={{ textTransform: "uppercase", fontSize: 24, letterSpacing: "0.25em", fontWeight: 700, textAlign: "center" }} />
          </div>
          {error && <p className="mono" style={{ color: "var(--red)", fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: "0.08em" }}>ID no encontrado.</p>}
          <button type="submit" className="btn" style={{ background: "#000", color: "var(--green)", outlineColor: "#000", borderColor: "#000", width: "100%", justifyContent: "center" }}>BUSCAR →</button>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { FinkaKar, TripCard, FindModal, TripModal, PassengerCard, PassengerModal, FindPassengerModal });
