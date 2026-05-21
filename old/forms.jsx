// forms.jsx — Asistencia + Viajes compartidos

/* ───────── ASISTENCIA ───────── */
function Asistencia() {
  const empty = {
    nombre: "",
    contacto: "",
    dias: { vie: false, sab: false, dom: false },
    llegada: "viernes-tarde",
    horaLlegada: "",
    salida: "domingo-tarde",
    horaSalida: "",
    transporte: "coche-propio",
    plazas: "",
    necesitaTransporte: false,
    traeFurgo: false,
    dormir: "tienda",
    ayudaTienda: false,
    dieta: [],
    alergias: "",
    aportar: [],
    aportarOtro: "",
    notas: "",
  };

  const [f, setF] = React.useState(empty);
  const [sent, setSent] = React.useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleArr = (k, v) => setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));
  const toggleDia = (d) => setF((s) => ({ ...s, dias: { ...s.dias, [d]: !s.dias[d] } }));

  const submit = (e) => {
    e.preventDefault();
    // mock — no persistence
    setSent(true);
    try {
      const all = JSON.parse(localStorage.getItem("finka-asistencia") || "[]");
      all.push({ ...f, ts: Date.now() });
      localStorage.setItem("finka-asistencia", JSON.stringify(all));
    } catch {}
    setTimeout(() => {
      document.querySelector("#asistencia")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  if (sent) {
    return (
      <section id="asistencia" style={{ background: "var(--ember)", color: "var(--cream)", borderTop: "2px solid var(--charcoal)", borderBottom: "2px solid var(--charcoal)" }}>
        <div className="container" style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="hand" style={{ fontSize: 40, transform: "rotate(-2deg)", color: "var(--cream)", marginBottom: 12 }}>
            ¡eso es!
          </div>
          <h2 className="display" style={{ fontSize: "clamp(48px, 10vw, 120px)", color: "var(--cream)" }}>
            <RisoText style={{ color: "var(--cream)" }}>NOS VEMOS</RisoText><br/>
            EN LA FINKA.
          </h2>
          <p style={{ marginTop: 18, fontSize: 17 }}>
            Tu confirmación está apuntada, <strong>{f.nombre || "peña"}</strong>.
            Te escribimos por <em>el grupo</em> con los detalles antes de junio.
          </p>
          <button className="btn ghost" style={{ marginTop: 22, color: "var(--cream)", borderColor: "var(--cream)" }} onClick={() => { setSent(false); setF(empty); }}>
            ← MANDAR OTRA RESPUESTA
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="asistencia" style={{ background: "var(--ember)", color: "var(--cream)", borderTop: "2px solid var(--charcoal)", borderBottom: "2px solid var(--charcoal)" }}>
      <div className="container">
        <div className="section-tag" style={{ color: "var(--cream)" }}>
          <span className="num" style={{ color: "var(--cream)" }}>04</span>
          <span style={{ color: "var(--cream)" }}>Confirmar asistencia</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "end", marginBottom: 30 }} className="asis-head">
          <h2 className="display" style={{ fontSize: "clamp(50px, 10vw, 130px)", color: "var(--cream)" }}>
            <span style={{ color: "var(--cream)" }}>VIENES,</span><br/>
            <span style={{ color: "var(--charcoal)" }}>¿NO?</span>
          </h2>
          <span className="hand" style={{ fontSize: 36, color: "var(--charcoal)", transform: "rotate(-3deg)", lineHeight: 1 }}>
            ↘ tarda dos minutos
          </span>
        </div>

        <form onSubmit={submit} style={{ background: "var(--cream)", color: "var(--charcoal)", border: "2.5px solid var(--charcoal)", padding: "26px 26px 28px", boxShadow: "8px 8px 0 var(--charcoal)" }}>
          {/* Datos básicos */}
          <FormSection title="Quién eres" num="01" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid-2">
            <Field label="Nombre o alias *">
              <input className="input" required value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="cómo te llamamos" />
            </Field>
            <Field label="Contacto" opt="(tel, ig, lo que quieras)">
              <input className="input" value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="opcional pero recomendable" />
            </Field>
          </div>

          {/* Cuándo vienes */}
          <FormSection title="Cuándo apareces" num="02" />
          <div>
            <Label>Días que vienes *</Label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[["vie", "Viernes 19"], ["sab", "Sábado 20"], ["dom", "Domingo 21"]].map(([k, lbl]) => (
                <span key={k} className={`chip ${f.dias[k] ? "on" : ""}`} onClick={() => toggleDia(k)}>
                  {f.dias[k] ? "✓ " : ""}{lbl}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }} className="grid-2">
            <Field label="Llegada · día y franja">
              <select className="select" value={f.llegada} onChange={(e) => set("llegada", e.target.value)}>
                <option value="viernes-tarde">Viernes tarde (16-20h)</option>
                <option value="viernes-noche">Viernes noche (a partir de 20h)</option>
                <option value="sabado-mañana">Sábado mañana</option>
                <option value="sabado-tarde">Sábado tarde</option>
                <option value="otro">Otro · indicar en notas</option>
              </select>
            </Field>
            <Field label="Hora aproximada llegada" opt="(opcional)">
              <input className="input" type="time" value={f.horaLlegada} onChange={(e) => set("horaLlegada", e.target.value)} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }} className="grid-2">
            <Field label="Salida">
              <select className="select" value={f.salida} onChange={(e) => set("salida", e.target.value)}>
                <option value="sabado-noche">Sábado noche (no duermo el domingo)</option>
                <option value="domingo-mañana">Domingo mañana</option>
                <option value="domingo-tarde">Domingo tarde</option>
                <option value="domingo-noche">Domingo noche / lunes</option>
                <option value="otro">Otro · notas</option>
              </select>
            </Field>
            <Field label="Hora aproximada salida" opt="(opcional)">
              <input className="input" type="time" value={f.horaSalida} onChange={(e) => set("horaSalida", e.target.value)} />
            </Field>
          </div>

          {/* Transporte */}
          <FormSection title="Cómo te mueves" num="03" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid-2">
            <Field label="Transporte">
              <select className="select" value={f.transporte} onChange={(e) => set("transporte", e.target.value)}>
                <option value="coche-propio">Coche propio (con plazas libres)</option>
                <option value="coche-lleno">Coche propio (sin plazas)</option>
                <option value="furgo">Furgo / camper</option>
                <option value="otro-coche">Voy con alguien</option>
                <option value="necesito">Necesito que alguien me lleve</option>
                <option value="tren">Tren / bus + que me recojan</option>
              </select>
            </Field>
            <Field label="Plazas libres en tu coche" opt="(si traes)">
              <input className="input" type="number" min="0" max="6" value={f.plazas} onChange={(e) => set("plazas", e.target.value)} placeholder="0-6" />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <span className={`chip ${f.necesitaTransporte ? "on" : ""}`} onClick={() => set("necesitaTransporte", !f.necesitaTransporte)}>
              {f.necesitaTransporte ? "✓ " : ""}Necesito transporte
            </span>
            <span className={`chip ${f.traeFurgo ? "on" : ""}`} onClick={() => set("traeFurgo", !f.traeFurgo)}>
              {f.traeFurgo ? "✓ " : ""}Traigo furgo
            </span>
          </div>
          <p className="mono" style={{ fontSize: 11, opacity: 0.65, marginTop: 10 }}>
            ↳ Pásate por <a href="#viajes" style={{ color: "var(--accent-a)" }}>Viajes compartidos</a> para publicar tu coche o pedir sitio.
          </p>

          {/* Dormir */}
          <FormSection title="Dónde duermes" num="04" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              ["tienda", "⛺ Tienda propia"],
              ["furgo", "🚐 Furgo"],
              ["dia", "☀️ Solo el día"],
              ["compartir", "🤝 Comparto tienda con alguien"],
            ].map(([k, lbl]) => (
              <span key={k} className={`chip ${f.dormir === k ? "on" : ""}`} onClick={() => set("dormir", k)}>
                {f.dormir === k ? "✓ " : ""}{lbl}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <span className={`chip ${f.ayudaTienda ? "on" : ""}`} onClick={() => set("ayudaTienda", !f.ayudaTienda)}>
              {f.ayudaTienda ? "✓ " : ""}🆘 Necesito ayuda para montar tienda
            </span>
          </div>

          {/* Comida */}
          <FormSection title="Cómo comes" num="05" />
          <div>
            <Label>Dieta</Label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["omnívora", "vegetariana", "vegana", "sin gluten", "sin lactosa"].map((d) => (
                <span key={d} className={`chip ${f.dieta.includes(d) ? "on" : ""}`} onClick={() => toggleArr("dieta", d)}>
                  {f.dieta.includes(d) ? "✓ " : ""}{d}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Alergias · intolerancias · cosas que no comes">
              <input className="input" value={f.alergias} onChange={(e) => set("alergias", e.target.value)} placeholder="frutos secos, marisco, lo que sea" />
            </Field>
          </div>

          {/* Participación */}
          <FormSection title="Qué aportas a la peña" num="06" subtitle="aquí está la gracia" />
          <p style={{ fontSize: 14, opacity: 0.8, marginTop: -6, marginBottom: 14 }}>
            Esto no es un festival con cartel cerrado: lo que pase, lo traemos entre todas.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["taller", "🎨 monto un taller"],
              ["actividad", "🎲 actividad / juego"],
              ["musica", "🎵 pongo música / DJ"],
              ["instrumento", "🎸 instrumento"],
              ["performance", "🎭 performance"],
              ["receta", "🍲 cocino algo"],
              ["foto", "📷 hago fotos"],
              ["furgo-sonido", "🔊 traigo equipo de sonido"],
              ["cuidados", "❤️ ayudo con cuidados"],
            ].map(([k, lbl]) => (
              <span key={k} className={`chip ${f.aportar.includes(k) ? "on" : ""}`} onClick={() => toggleArr("aportar", k)}>
                {f.aportar.includes(k) ? "✓ " : ""}{lbl}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Cuéntanos un poco más" opt="(qué taller, qué música, qué se te ocurre)">
              <textarea className="textarea" value={f.aportarOtro} onChange={(e) => set("aportarOtro", e.target.value)} placeholder="ej: tengo proyector y unas pelis raras de los 80, podemos montar cine bajo las estrellas" />
            </Field>
          </div>

          <div style={{ marginTop: 18 }}>
            <Field label="Algo más que tengamos que saber" opt="(opcional)">
              <textarea className="textarea" value={f.notas} onChange={(e) => set("notas", e.target.value)} placeholder="alergia importante, llego con bebé, soy alérgica al folk, etc" />
            </Field>
          </div>

          <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <p className="mono" style={{ fontSize: 11, opacity: 0.65, maxWidth: 420, margin: 0 }}>
              Solo guardamos esto entre las organizadoras para cuadrar comida, sitio, coches.
              Nada de spam, nada de marketing, nada de mierda.
            </p>
            <button type="submit" className="btn" style={{ fontSize: 16, padding: "16px 28px" }}>
              ENVIAR CONFIRMACIÓN →
            </button>
          </div>
        </form>

        <style>{`
          @media (max-width: 720px) {
            .asis-head { grid-template-columns: 1fr !important; }
            .grid-2 { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function FormSection({ title, num, subtitle }) {
  return (
    <div style={{ marginTop: 26, marginBottom: 14, paddingTop: 14, borderTop: "1.5px dashed var(--charcoal)", display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <span className="mono" style={{ color: "var(--accent-a)", fontSize: 12 }}>{num} /</span>
      <span className="sub" style={{ fontSize: 18 }}>{title}</span>
      {subtitle && <span className="hand" style={{ fontSize: 22, color: "var(--accent-c)", transform: "rotate(-2deg)" }}>{subtitle}</span>}
    </div>
  );
}

function Field({ label, opt, children }) {
  return (
    <div className="field">
      <label>
        {label}
        {opt && <span className="opt"> {opt}</span>}
      </label>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontFamily: "var(--body)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--charcoal-2)", marginBottom: 8 }}>{children}</div>;
}

/* ───────── VIAJES ───────── */
function Viajes() {
  const seedTrips = [
    { id: "t1",  tipo: "conductor", origen: "Madrid",       dia: "viernes",   hora: "15:00", flex: "±1h", plazas: 2, total: 4, contacto: "@laura_g (Telegram)",  ida: true,  vuelta: true,  notas: "salgo desde Moncloa · paso por Aravaca", token: "abc1" },
    { id: "t2",  tipo: "conductor", origen: "Bilbao",       dia: "viernes",   hora: "16:30", flex: "flexible", plazas: 1, total: 4, contacto: "612 33 44 55",       ida: true,  vuelta: false, notas: "vuelta a Bilbao en plan abierto, ya veremos", token: "ghi3" },
    { id: "t3",  tipo: "conductor", origen: "Valladolid",   dia: "sábado",    hora: "10:00", flex: "flexible", plazas: 3, total: 4, contacto: "@jorgealvarez",      ida: true,  vuelta: true,  notas: "voy directa, vuelvo domingo tarde", token: "jkl4" },
    { id: "t4",  tipo: "pasajero",  origen: "Madrid Sur",   dia: "viernes",   hora: "tarde", flex: "±2h", plazas: 0, total: 0, contacto: "@mariam_xy",            ida: true,  vuelta: true,  notas: "puedo poner gasolina y traigo música buena", token: "mno5" },
    { id: "t5",  tipo: "pasajero",  origen: "Burgos centro",dia: "viernes",   hora: "17:00", flex: "±30m", plazas: 0, total: 0, contacto: "654 77 88 99",         ida: true,  vuelta: false, notas: "vuelvo con cualquiera el domingo · llevo guitarra", token: "pqr6" },
    { id: "t6",  tipo: "conductor", origen: "Vitoria",      dia: "viernes",   hora: "18:00", flex: "flexible", plazas: 2, total: 4, contacto: "@andrea_v",         ida: true,  vuelta: true,  notas: "paso por Miranda si hace falta", token: "stu7" },
  ];

  const [trips, setTrips] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("finka-viajes") || "null");
      return saved && saved.length ? saved : seedTrips;
    } catch { return seedTrips; }
  });

  const [filter, setFilter] = React.useState("todos");
  const [modal, setModal] = React.useState(null); // {mode:'new'|'edit', trip?}
  const [tokenPrompt, setTokenPrompt] = React.useState(null);

  React.useEffect(() => {
    localStorage.setItem("finka-viajes", JSON.stringify(trips));
  }, [trips]);

  const visible = trips.filter((t) => !t.disabled).filter((t) => filter === "todos" ? true : t.tipo === filter);

  const saveTrip = (data) => {
    if (data.id) {
      setTrips((s) => s.map((t) => t.id === data.id ? { ...t, ...data } : t));
    } else {
      const id = "t" + Date.now().toString(36);
      const token = Math.random().toString(36).slice(2, 7);
      setTrips((s) => [...s, { ...data, id, token, disabled: false }]);
    }
    setModal(null);
  };

  const disableTrip = (id) => {
    setTrips((s) => s.map((t) => t.id === id ? { ...t, disabled: true } : t));
  };

  return (
    <section id="viajes" style={{ background: "var(--blue-night)", color: "var(--cream)", borderTop: "2px solid var(--charcoal)", borderBottom: "2px solid var(--charcoal)" }}>
      <div className="container">
        <div className="section-tag" style={{ color: "var(--cream)" }}>
          <span className="num" style={{ color: "var(--cream)" }}>08</span>
          <span style={{ color: "var(--cream)" }}>Viajes compartidos</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 30, alignItems: "end", marginBottom: 28 }} className="viajes-head">
          <h2 className="display" style={{ fontSize: "clamp(46px, 9vw, 120px)", color: "var(--cream)" }}>
            <span style={{ color: "var(--cream)" }}>NOS VAMOS</span><br/>
            <span style={{ color: "var(--accent-a)" }}>JUNTAS</span>{" "}
            <span className="hand" style={{ fontSize: 50, color: "var(--cream)", verticalAlign: "middle" }}>→ a la finca</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--cream)", opacity: 0.95, maxWidth: 380 }}>
            Tablón comunitario. Publica tu coche o pide sitio.
            La organización ocurre <span className="hand" style={{ fontSize: 22, color: "var(--accent-a)" }}>fuera de la web</span>: aquí solo se ven las opciones.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>FILTRAR:</span>
          {[["todos", `Todos (${trips.filter(t => !t.disabled).length})`], ["conductor", `🚗 Conductoras (${trips.filter(t => !t.disabled && t.tipo === "conductor").length})`], ["pasajero", `🙋 Pasajeras (${trips.filter(t => !t.disabled && t.tipo === "pasajero").length})`]].map(([k, lbl]) => (
            <span key={k} className={`chip ${filter === k ? "on" : ""}`}
              style={filter === k ? { background: "var(--cream)", color: "var(--charcoal)", borderColor: "var(--cream)" } : { background: "transparent", color: "var(--cream)", borderColor: "var(--cream)" }}
              onClick={() => setFilter(k)}>
              {lbl}
            </span>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={() => setTokenPrompt(true)} style={{ background: "transparent", color: "var(--cream)", borderColor: "var(--cream)", boxShadow: "3px 3px 0 var(--accent-a)" }}>
              ✎ EDITAR / DESACTIVAR
            </button>
            <button className="btn sm" onClick={() => setModal({ mode: "new" })} style={{ background: "var(--cream)", color: "var(--charcoal)", borderColor: "var(--cream)" }}>
              + PUBLICAR VIAJE
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {visible.map((t) => <TripCard key={t.id} trip={t} />)}
          {!visible.length && (
            <div className="card" style={{ background: "rgba(240,231,212,0.08)", color: "var(--cream)", borderColor: "var(--cream)" }}>
              <div className="hand" style={{ fontSize: 28, color: "var(--cream)" }}>
                aún no hay viajes por aquí
              </div>
              <p style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
                Sé la primera en publicar el suyo.
              </p>
            </div>
          )}
        </div>

        <p className="mono" style={{ fontSize: 11, opacity: 0.7, marginTop: 18 }}>
          ↳ Los viajes son una propuesta. Quien quiera coordinarse, lo hace por su cuenta — escribe al contacto que aparezca.
        </p>

        {modal && <TripModal mode={modal.mode} trip={modal.trip} onSave={saveTrip} onClose={() => setModal(null)} />}
        {tokenPrompt && <TokenPrompt trips={trips} onClose={() => setTokenPrompt(false)} onEdit={(trip) => { setTokenPrompt(false); setModal({ mode: "edit", trip }); }} onDisable={(id) => { disableTrip(id); setTokenPrompt(false); }} />}

        <style>{`
          @media (max-width: 760px) {
            .viajes-head { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function TripCard({ trip }) {
  const isC = trip.tipo === "conductor";
  return (
    <div style={{
      background: "var(--cream)",
      color: "var(--charcoal)",
      border: "2px solid var(--charcoal)",
      padding: 16,
      position: "relative",
      transform: `rotate(${(Math.random() - 0.5) * 0.6}deg)`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div className="sub" style={{ fontSize: 22, color: isC ? "var(--ember)" : "var(--blue-night)" }}>
          {isC ? "🚗 CONDUCTOR" : "🙋 PASAJERO"}
        </div>
        {isC && (
          <div style={{ textAlign: "right" }}>
            <div className="display" style={{ fontSize: 26, color: "var(--charcoal)", lineHeight: 1 }}>
              {trip.plazas}<span style={{ opacity: 0.4, fontSize: 18 }}>/{trip.total}</span>
            </div>
            <div className="mono" style={{ fontSize: 9, opacity: 0.6 }}>plazas libres</div>
          </div>
        )}
      </div>

      <div className="display" style={{ fontSize: 28, marginTop: 6, lineHeight: 1 }}>
        {trip.origen}
      </div>
      <div className="mono" style={{ fontSize: 12, marginTop: 4 }}>
        ↳ <strong>{trip.dia}</strong> · {trip.hora} <span style={{ opacity: 0.6 }}>· flex {trip.flex}</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {trip.ida && <span className="mono" style={{ fontSize: 10, padding: "3px 7px", border: "1px solid var(--charcoal)" }}>IDA</span>}
        {trip.vuelta && <span className="mono" style={{ fontSize: 10, padding: "3px 7px", border: "1px solid var(--charcoal)" }}>VUELTA</span>}
      </div>

      {trip.notas && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1.5px dashed var(--charcoal)", fontSize: 13, lineHeight: 1.5, fontStyle: "italic" }}>
          "{trip.notas}"
        </div>
      )}

      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1.5px dashed var(--charcoal)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{trip.contacto}</div>
        <span className="mono" style={{ fontSize: 9, opacity: 0.5 }}>id · {trip.id}</span>
      </div>
    </div>
  );
}

function TripModal({ mode, trip, onSave, onClose }) {
  const [t, setT] = React.useState(trip || {
    tipo: "conductor",
    origen: "", dia: "viernes", hora: "", flex: "flexible",
    plazas: 2, total: 4,
    contacto: "",
    ida: true, vuelta: true,
    notas: "",
  });
  const set = (k, v) => setT((s) => ({ ...s, [k]: v }));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,24,21,0.75)", backdropFilter: "blur(2px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--cream)", color: "var(--charcoal)", border: "2.5px solid var(--charcoal)", padding: 26, maxWidth: 600, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "10px 10px 0 var(--ember)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div className="mono" style={{ fontSize: 11, opacity: 0.6 }}>{mode === "edit" ? "EDITAR VIAJE" : "PUBLICAR VIAJE"}</div>
            <h3 className="display" style={{ fontSize: 36, marginTop: 4 }}>
              <RisoText>{mode === "edit" ? "EDITAR" : "NUEVO"}</RisoText>
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "2px solid var(--charcoal)", padding: "6px 10px", fontFamily: "var(--sub)", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[["conductor", "🚗 Conductor"], ["pasajero", "🙋 Pasajero"]].map(([k, lbl]) => (
            <span key={k} className={`chip ${t.tipo === k ? "on" : ""}`} onClick={() => set("tipo", k)} style={{ flex: 1, justifyContent: "center" }}>{lbl}</span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Origen *">
            <input className="input" required value={t.origen} onChange={(e) => set("origen", e.target.value)} placeholder="Madrid · Bilbao · Burgos centro..." />
          </Field>
          <Field label="Día">
            <select className="select" value={t.dia} onChange={(e) => set("dia", e.target.value)}>
              <option value="viernes">Viernes 19</option>
              <option value="sábado">Sábado 20</option>
              <option value="domingo">Domingo 21 (solo vuelta)</option>
            </select>
          </Field>
          <Field label="Hora aproximada">
            <input className="input" value={t.hora} onChange={(e) => set("hora", e.target.value)} placeholder="15:00 · tarde · cuando salga" />
          </Field>
          <Field label="Flexibilidad">
            <select className="select" value={t.flex} onChange={(e) => set("flex", e.target.value)}>
              <option>flexible</option>
              <option>±30m</option>
              <option>±1h</option>
              <option>±2h</option>
              <option>nada · hora fija</option>
            </select>
          </Field>
        </div>

        {t.tipo === "conductor" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
            <Field label="Plazas libres">
              <input className="input" type="number" min="0" max="8" value={t.plazas} onChange={(e) => set("plazas", parseInt(e.target.value || "0"))} />
            </Field>
            <Field label="Plazas totales (coche)">
              <input className="input" type="number" min="1" max="8" value={t.total} onChange={(e) => set("total", parseInt(e.target.value || "1"))} />
            </Field>
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <span className={`chip ${t.ida ? "on" : ""}`} onClick={() => set("ida", !t.ida)}>{t.ida ? "✓ " : ""}IDA</span>
          <span className={`chip ${t.vuelta ? "on" : ""}`} onClick={() => set("vuelta", !t.vuelta)}>{t.vuelta ? "✓ " : ""}VUELTA</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <Field label="Contacto *" opt="(tel, @ig, telegram...)">
            <input className="input" required value={t.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="@tu_user o 6XX XX XX XX" />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Notas" opt="(rutas, paradas, lo que necesites)">
            <textarea className="textarea" value={t.notas} onChange={(e) => set("notas", e.target.value)} placeholder="paso por X · llevo guitarra · puedo recoger en gasolinera..." />
          </Field>
        </div>

        <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 11, opacity: 0.6, maxWidth: 320 }}>
            {mode === "edit" ? "Cambios se aplican al instante." : "Al publicar recibirás un código secreto para editar más tarde."}
          </span>
          <button className="btn" onClick={() => onSave(t)}>
            {mode === "edit" ? "GUARDAR CAMBIOS" : "PUBLICAR"} →
          </button>
        </div>
      </div>
    </div>
  );
}

function TokenPrompt({ trips, onClose, onEdit, onDisable }) {
  const [tk, setTk] = React.useState("");
  const [error, setError] = React.useState("");
  const find = () => {
    const t = trips.find((x) => x.token === tk.trim());
    if (!t) { setError("Código no encontrado. Mira el correo de confirmación."); return; }
    if (t.disabled) { setError("Este viaje ya está desactivado."); return; }
    setError("");
    return t;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,24,21,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--cream)", color: "var(--charcoal)", border: "2.5px solid var(--charcoal)", padding: 26, maxWidth: 440, width: "100%", boxShadow: "10px 10px 0 var(--moss)" }}>
        <div className="mono" style={{ fontSize: 11, opacity: 0.6 }}>EDITAR VIAJE</div>
        <h3 className="display" style={{ fontSize: 36, marginTop: 4 }}>
          <RisoText>CÓDIGO</RisoText>
        </h3>
        <p style={{ fontSize: 14, marginTop: 8, opacity: 0.85, lineHeight: 1.5 }}>
          Introduce el código privado que te dimos al publicar tu viaje.
          Con eso puedes <strong>cambiar plazas, horario o desactivarlo</strong>.
        </p>
        <p className="hand" style={{ fontSize: 22, color: "var(--accent-a)", marginTop: 8 }}>
          ↳ ¿no lo tienes? prueba con <span style={{ background: "var(--cream-2)", padding: "2px 6px", fontFamily: "var(--body)", fontSize: 12 }}>abc1</span>
        </p>
        <div style={{ marginTop: 14 }}>
          <input className="input" value={tk} onChange={(e) => setTk(e.target.value)} placeholder="código privado..." />
          {error && <div style={{ marginTop: 8, color: "var(--ember)", fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn sm" onClick={() => { const t = find(); if (t) onEdit(t); }}>EDITAR →</button>
          <button className="btn sm ghost" onClick={() => { const t = find(); if (t && confirm("¿Desactivar este viaje?")) onDisable(t.id); }}>DESACTIVAR</button>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "2px solid var(--charcoal)", padding: "8px 14px", fontFamily: "var(--sub)", fontSize: 12, cursor: "pointer" }}>CANCELAR</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Asistencia, Viajes, FormSection, Field, Label, TripCard, TripModal, TokenPrompt });
