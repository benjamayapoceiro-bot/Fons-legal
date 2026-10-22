const sampleCases = [
  { title: "Expediente de ejemplo A", court: "SCBA · Demo", status: "Requiere revisión" },
  { title: "Expediente de ejemplo B", court: "PJN · Demo", status: "En seguimiento" },
  { title: "Expediente de ejemplo C", court: "Otro organismo · Demo", status: "Sin novedades cargadas" },
];
export default function Home() {
  return <main className="shell">
    <header className="top"><div><div className="brand">FONS LEGAL · OPERACIONES</div><h1 className="heading">Panel jurídico</h1><div className="muted">Seguimiento centralizado de asuntos, movimientos y vencimientos.</div></div><span className="pill">MVP · Datos ficticios</span></header>
    <section className="grid" aria-label="Resumen">
      {[
        ["Asuntos activos","—","Conectar base de datos"],
        ["Movimientos nuevos","—","Pendiente de integración"],
        ["Vencimientos próximos","—","Requiere verificación"],
        ["Integraciones","0/2","SCBA · PJN no conectados"],
      ].map(([title,value,desc]) => <div className="card" key={title}><div className="muted">{title}</div><div className="metric">{value}</div><small className="muted">{desc}</small></div>)}
    </section>
    <section className="card section"><h2>Asuntos de muestra</h2><p className="muted">Estos registros son ilustrativos; no representan causas reales ni se consultan automáticamente.</p>
      {sampleCases.map(item => <div className="case" key={item.title}><div><strong>{item.title}</strong><div className="muted">{item.court}</div></div><span className="tag">{item.status}</span></div>)}
    </section>
    <div className="notice"><strong>Importante:</strong> esta versión no consulta SCBA ni PJN y no calcula vencimientos procesales. Verificá manualmente toda actuación y fecha en la fuente oficial. No cargues datos sensibles hasta completar autenticación y revisión de permisos.</div>
  </main>;
}
