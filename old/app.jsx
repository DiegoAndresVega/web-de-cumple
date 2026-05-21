// app.jsx — main App, palette/font tweaks, root render

const PALETTES = {
  ember: {
    label: "Ember & moss",
    swatches: ["#c63d2f", "#5a6b3a", "#1f3a5f"],
    css: {
      "--accent-a": "var(--ember)",
      "--accent-b": "var(--moss)",
      "--accent-c": "var(--blue-night)",
    },
  },
  fire: {
    label: "Fire night",
    swatches: ["#e6622a", "#c63d2f", "#1a1815"],
    css: {
      "--accent-a": "var(--orange)",
      "--accent-b": "var(--ember)",
      "--accent-c": "var(--charcoal)",
    },
  },
  meadow: {
    label: "Meadow rave",
    swatches: ["#5a6b3a", "#1f3a5f", "#e6622a"],
    css: {
      "--accent-a": "var(--moss)",
      "--accent-b": "var(--blue-night)",
      "--accent-c": "var(--orange)",
    },
  },
};

const TYPOS = {
  bungee: {
    label: "Bungee · Space Mono · Caveat",
    display: '"Bungee", "Archivo Black", system-ui, sans-serif',
    sub: '"Archivo Black", system-ui, sans-serif',
    body: '"Space Mono", ui-monospace, monospace',
    hand: '"Caveat", cursive',
  },
  bowlby: {
    label: "Major Mono · DM Mono · Caveat",
    display: '"Major Mono Display", "Bungee", system-ui, sans-serif',
    sub: '"Bungee Inline", "Archivo Black", system-ui, sans-serif',
    body: '"DM Mono", "Space Mono", ui-monospace, monospace',
    hand: '"Caveat", cursive',
  },
  archivo: {
    label: "Archivo Black · DM Mono · Caveat",
    display: '"Archivo Black", system-ui, sans-serif',
    sub: '"Archivo Black", system-ui, sans-serif',
    body: '"DM Mono", "Space Mono", monospace',
    hand: '"Caveat", cursive',
  },
};

function App() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  // Apply tweaks to :root via inline style
  React.useEffect(() => {
    const root = document.documentElement;
    const pal = PALETTES[t.palette] || PALETTES.ember;
    Object.entries(pal.css).forEach(([k, v]) => root.style.setProperty(k, v));

    const tp = TYPOS[t.typo] || TYPOS.bungee;
    root.style.setProperty("--display", tp.display);
    root.style.setProperty("--sub", tp.sub);
    root.style.setProperty("--body", tp.body);
    root.style.setProperty("--hand", tp.hand);

    root.style.setProperty("--chaos", String(t.chaos));
    // recompute rotation tokens
    const c = t.chaos;
    root.style.setProperty("--rot-1", `${(c - 5) * 0.25}deg`);
    root.style.setProperty("--rot-2", `${(c - 5) * -0.35}deg`);
    root.style.setProperty("--rot-3", `${(c - 5) * 0.5}deg`);

    document.body.style.setProperty("--grain-opacity", t.showGrain ? "0.35" : "0");
    const grain = document.querySelector("#grain-toggle");
  }, [t]);

  return (
    <>
      <GrainToggle on={t.showGrain} />
      <Nav chaos={t.chaos} />
      <Hero />
      <QueEs />
      <Programa />
      <Mapa />
      <Asistencia />
      <Cuidados />
      <QueTraer />
      <Viajes />
      <Clima />
      <FAQ />
      <Footer />

      <TweaksPanel>
        <TweakSection label="Paleta" />
        <PaletteSwatches palette={t.palette} onChange={(v) => setTweak("palette", v)} />

        <TweakSection label="Tipografía" />
        <TweakSelect
          label="Pairing"
          value={t.typo}
          options={Object.entries(TYPOS).map(([k, v]) => ({ value: k, label: v.label }))}
          onChange={(v) => setTweak("typo", v)}
        />

        <TweakSection label="Carácter" />
        <TweakSlider
          label="Caos intencional"
          value={t.chaos}
          min={0}
          max={10}
          step={1}
          onChange={(v) => setTweak("chaos", v)}
        />
        <TweakToggle
          label="Grano de papel"
          value={t.showGrain}
          onChange={(v) => setTweak("showGrain", v)}
        />
      </TweaksPanel>
    </>
  );
}

function GrainToggle({ on }) {
  // adjust the body::before opacity via injected style
  return (
    <style>{`body::before { opacity: ${on ? 0.35 : 0} !important; }`}</style>
  );
}

function PaletteSwatches({ palette, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 2 }}>
      {Object.entries(PALETTES).map(([k, pal]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            border: palette === k ? "2px solid #29261b" : "1px solid rgba(0,0,0,0.18)",
            background: "rgba(255,255,255,0.5)",
            padding: 4,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            borderRadius: 4,
          }}
          title={pal.label}
        >
          <div style={{ display: "flex", height: 22 }}>
            {pal.swatches.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
          </div>
          <span style={{ fontSize: 9, color: "#29261b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</span>
        </button>
      ))}
    </div>
  );
}

// RisoText — three real spans so back layers are editable too
function RisoText({ children, backA, backB, style, className }) {
  return (
    <span className={"riso-text " + (className || "")} style={style}>
      <span className="riso-back-a" aria-hidden="true">{backA !== undefined ? backA : children}</span>
      <span className="riso-back-b" aria-hidden="true">{backB !== undefined ? backB : children}</span>
      <span className="riso-front">{children}</span>
    </span>
  );
}
Object.assign(window, { RisoText });

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
