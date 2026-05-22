// punk-app.jsx — root

function App() {
  return (
    <>
      <FinkaKarFloating />

      <Hero />

      <Marquee items={[
        "19·20·21 JUN 2026",
        "LA FINKA · 15 minutos de Burgos",
        "CUIDA LA FINKA · CUIDA A LA PEÑA",
        "ESPACIO SEGURO",
        ,
      ]} />

      <Info />

      <Conquis />

      <Programa />

      <Confirmar />

      <FinkaKar />

      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
