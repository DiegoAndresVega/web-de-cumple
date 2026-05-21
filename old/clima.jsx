// clima.jsx — Open-Meteo · pronóstico cuando faltan ≤14 días

const EVENT_START = "2026-06-19";
const EVENT_END   = "2026-06-21";
const FINKA_LAT   = 42.246;
const FINKA_LON   = -3.798;
const FORECAST_HORIZON_DAYS = 16; // open-meteo daily max

// WMO codes → icono y label corto
const WMO = {
  0:  { icon: "☀️",  label: "Despejado" },
  1:  { icon: "🌤️",  label: "Casi despejado" },
  2:  { icon: "⛅",  label: "Parcialmente nublado" },
  3:  { icon: "☁️",  label: "Nublado" },
  45: { icon: "🌫️", label: "Niebla" },
  48: { icon: "🌫️", label: "Niebla helada" },
  51: { icon: "🌦️",  label: "Llovizna ligera" },
  53: { icon: "🌦️",  label: "Llovizna" },
  55: { icon: "🌧️",  label: "Llovizna intensa" },
  61: { icon: "🌧️",  label: "Lluvia ligera" },
  63: { icon: "🌧️",  label: "Lluvia" },
  65: { icon: "🌧️",  label: "Lluvia intensa" },
  66: { icon: "🌧️❄️", label: "Lluvia helada" },
  67: { icon: "🌧️❄️", label: "Lluvia helada fuerte" },
  71: { icon: "🌨️", label: "Nieve" },
  73: { icon: "🌨️", label: "Nieve" },
  75: { icon: "🌨️", label: "Nieve intensa" },
  80: { icon: "🌦️", label: "Chubascos" },
  81: { icon: "🌧️", label: "Chubascos fuertes" },
  82: { icon: "⛈️",  label: "Chubascos violentos" },
  95: { icon: "⛈️",  label: "Tormenta" },
  96: { icon: "⛈️",  label: "Tormenta con granizo" },
  99: { icon: "⛈️",  label: "Tormenta con granizo fuerte" },
};
const wmo = (c) => WMO[c] || { icon: "❓", label: "Vaya cosa rara" };

function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr + "T12:00:00");
  const ms = target - now;
  return Math.ceil(ms / 86400000);
}

function Clima() {
  const [state, setState] = React.useState({ status: "idle" });

  const daysLeft = daysUntil(EVENT_START);
  const tooFar = daysLeft > FORECAST_HORIZON_DAYS;

  React.useEffect(() => {
    if (tooFar) return;
    setState({ status: "loading" });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${FINKA_LAT}&longitude=${FINKA_LON}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset&timezone=Europe%2FMadrid&start_date=${EVENT_START}&end_date=${EVENT_END}`;
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        if (!data?.daily?.time?.length) throw new Error("sin datos");
        setState({ status: "ok", data });
      })
      .catch((err) => setState({ status: "error", err: String(err) }));
  }, [tooFar]);

  return (
    <section id="clima" style={{ background: "var(--moss)", color: "var(--cream)", borderTop: "2px solid var(--charcoal)", borderBottom: "2px solid var(--charcoal)" }}>
      <div className="container">
        <div className="section-tag" style={{ color: "var(--cream)" }}>
          <span className="num" style={{ color: "var(--cream)" }}>09</span>
          <span style={{ color: "var(--cream)" }}>El tiempo · qué dice el cielo</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 30, alignItems: "end", marginBottom: 26 }} className="clima-head">
          <h2 className="display" style={{ fontSize: "clamp(46px, 9vw, 116px)", color: "var(--cream)" }}>
            <span style={{ color: "var(--cream)" }}>¿VA A</span><br/>
            <span style={{ color: "var(--accent-a)" }}>LLOVER?</span>
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 360 }}>
            Datos reales de <strong>Open-Meteo</strong> para Arcos de la Llana.
            La predicción se ajusta cuando faltan menos de 14 días.
            Mientras tanto, esperamos sol y miramos al cielo con fe.
          </p>
        </div>

        <ClimaCountdown daysLeft={daysLeft} />

        <div style={{ marginTop: 22 }}>
          {tooFar && <ClimaTooFar daysLeft={daysLeft} />}
          {!tooFar && state.status === "loading" && <ClimaLoading />}
          {!tooFar && state.status === "error" && <ClimaError msg={state.err} />}
          {!tooFar && state.status === "ok" && <ClimaForecast data={state.data} />}
        </div>

        <div style={{ marginTop: 22, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 11, opacity: 0.85 }}>
          <span className="mono">FUENTE · open-meteo.com (libre, sin clave)</span>
          <span className="mono" style={{ marginLeft: "auto" }}>📍 42.246° N · −3.798° W</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .clima-head { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function ClimaCountdown({ daysLeft }) {
  let lbl, val, hand;
  if (daysLeft > 1) { lbl = "DÍAS PARA LA FINKA"; val = daysLeft; hand = "que no se te haga eterno"; }
  else if (daysLeft === 1) { lbl = "MAÑANA"; val = "1"; hand = "haz la mochila ya"; }
  else if (daysLeft === 0) { lbl = "HOY MISMO"; val = "0"; hand = "nos vemos en la finka"; }
  else if (daysLeft >= -2) { lbl = "EN PLENO FINDE", val = "★"; hand = "¡estamos dentro!"; }
  else { lbl = "HASTA EL VOL · V"; val = "—"; hand = "ya volveremos"; }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 22px", background: "var(--charcoal)", color: "var(--cream)", border: "2.5px solid var(--charcoal)", transform: "rotate(-0.4deg)", boxShadow: "5px 5px 0 var(--accent-a)" }}>
      <div className="display" style={{ fontSize: "clamp(48px, 8vw, 96px)", color: "var(--accent-a)", lineHeight: 0.85 }}>
        {val}
      </div>
      <div style={{ flex: 1 }}>
        <div className="sub" style={{ fontSize: 14, opacity: 0.85, letterSpacing: "0.1em" }}>{lbl}</div>
        <div className="hand" style={{ fontSize: 28, color: "var(--cream)", transform: "rotate(-1deg)" }}>↳ {hand}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="mono" style={{ fontSize: 10, opacity: 0.6 }}>FECHA</div>
        <div className="sub" style={{ fontSize: 16 }}>19·20·21 JUN</div>
      </div>
    </div>
  );
}

function ClimaTooFar({ daysLeft }) {
  return (
    <div style={{ background: "var(--cream)", color: "var(--charcoal)", border: "2px solid var(--charcoal)", padding: "22px 22px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <span style={{ fontSize: 44 }}>🔮</span>
        <div>
          <div className="sub" style={{ fontSize: 18 }}>Aún es pronto para mirar el tiempo</div>
          <div style={{ fontSize: 13.5, opacity: 0.78 }}>
            La predicción fiable empieza a {FORECAST_HORIZON_DAYS} días vista. Faltan {daysLeft}.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 16 }}>
        <Hint icon="📅" t="Vuelve cuando falten ≤14 días" d={`A partir del ${addDaysISO(EVENT_START, -FORECAST_HORIZON_DAYS)} ya tendremos datos reales.`} />
          <Hint icon="🌡️" t="Promedio histórico junio" d="Burgos en junio: 14–25 °C · agradable de día, fresco de noche." />
          <Hint icon="🌙" t="Llévate una sudadera" d="A 800m de altitud las noches engañan. Hace fresco aunque caiga el sol fuerte." />
      </div>
    </div>
  );
}

function Hint({ icon, t, d }) {
  return (
    <div style={{ padding: 14, background: "var(--cream-2)", border: "1.5px dashed var(--charcoal)" }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div className="sub" style={{ fontSize: 14, marginBottom: 4 }}>{t}</div>
      <div style={{ fontSize: 12.5, opacity: 0.82, lineHeight: 1.5 }}>{d}</div>
    </div>
  );
}

function ClimaLoading() {
  return (
    <div style={{ background: "var(--cream)", color: "var(--charcoal)", border: "2px solid var(--charcoal)", padding: 22, textAlign: "center" }}>
      <div className="hand" style={{ fontSize: 30, color: "var(--accent-a)" }}>mirando al cielo...</div>
    </div>
  );
}

function ClimaError({ msg }) {
  return (
    <div style={{ background: "var(--cream)", color: "var(--charcoal)", border: "2px solid var(--charcoal)", padding: 22 }}>
      <div className="sub" style={{ fontSize: 16, marginBottom: 4 }}>No hemos podido cargar la predicción</div>
      <div className="mono" style={{ fontSize: 12, opacity: 0.7 }}>error: {msg}</div>
      <div style={{ marginTop: 10, fontSize: 13 }}>Recarga la página o consulta directamente en <a href="https://open-meteo.com" style={{ color: "var(--accent-a)" }}>open-meteo.com</a>.</div>
    </div>
  );
}

function ClimaForecast({ data }) {
  const d = data.daily;
  const days = d.time.map((iso, i) => ({
    iso,
    code: d.weather_code[i],
    tmax: d.temperature_2m_max[i],
    tmin: d.temperature_2m_min[i],
    pop: d.precipitation_probability_max[i],
    prec: d.precipitation_sum[i],
    wind: d.wind_speed_10m_max[i],
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
  }));

  const labelDia = (iso) => {
    const dt = new Date(iso + "T12:00:00");
    return ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][dt.getDay()];
  };
  const labelFecha = (iso) => {
    const dt = new Date(iso + "T12:00:00");
    return `${dt.getDate()} jun`;
  };
  const fmtHora = (iso) => {
    try { const dt = new Date(iso); return dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }); } catch { return ""; }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 12 }} className="clima-grid">
      {days.map((day) => {
        const w = wmo(day.code);
        const wet = day.pop >= 50;
        return (
          <div key={day.iso} style={{
            background: wet ? "var(--blue-night)" : "var(--cream)",
            color: wet ? "var(--cream)" : "var(--charcoal)",
            border: "2px solid var(--charcoal)",
            padding: 18,
            position: "relative",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div>
                <div className="sub" style={{ fontSize: 16 }}>{labelDia(day.iso)}</div>
                <div className="mono" style={{ fontSize: 10.5, opacity: 0.7 }}>{labelFecha(day.iso)}</div>
              </div>
              <div style={{ fontSize: 36, lineHeight: 1 }}>{w.icon}</div>
            </div>

            <div className="display" style={{ fontSize: 44, marginTop: 8, color: wet ? "var(--accent-a)" : "var(--charcoal)", lineHeight: 0.9 }}>
              {Math.round(day.tmax)}°
            </div>
            <div className="mono" style={{ fontSize: 11.5, opacity: 0.78 }}>
              mín {Math.round(day.tmin)}°
            </div>

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px dashed ${wet ? "rgba(240,231,212,0.45)" : "var(--charcoal)"}`, display: "flex", flexDirection: "column", gap: 4 }}>
              <Row label="estado" v={w.label} />
              <Row label="lluvia" v={`${day.pop ?? 0}% · ${day.prec ?? 0}mm`} />
              <Row label="viento" v={`${Math.round(day.wind ?? 0)} km/h`} />
              <Row label="amanece" v={fmtHora(day.sunrise)} />
              <Row label="anochece" v={fmtHora(day.sunset)} />
            </div>

            {wet && (
              <div className="hand" style={{ fontSize: 22, marginTop: 10, color: "var(--accent-a)", transform: "rotate(-1deg)" }}>
                ↳ trae chubasquero
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @media (max-width: 760px) {
          .clima-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5 }}>
      <span className="mono" style={{ opacity: 0.62, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontFamily: "var(--body)", fontWeight: 700, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function addDaysISO(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

Object.assign(window, { Clima });
