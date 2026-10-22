const metrics = [
  ["Asuntos activos", "—", "Conexión a datos pendiente", "▤"],
  ["Movimientos nuevos", "—", "Sin sincronización", "↻"],
  ["Vencimientos", "—", "Verificar en fuente oficial", "◷"],
  ["Conectores", "0 / 2", "SCBA · PJN pendientes", "⌁"],
];
const matters = [
  { id:"DEMO-001", title:"Expediente de ejemplo A", court:"SCBA · Datos ficticios", status:"Revisión pendiente", tone:"amber" },
  { id:"DEMO-002", title:"Expediente de ejemplo B", court:"PJN · Datos ficticios", status:"En seguimiento", tone:"violet" },
  { id:"DEMO-003", title:"Expediente de ejemplo C", court:"Organismo · Datos ficticios", status:"Sin novedades", tone:"slate" },
];
export default function Home() {
 return <main className="layout">
  <aside className="sidebar">
   <a className="brand" href="#"><span className="brand-icon">F</span><span><b>FONS</b><small>LEGAL & CORP</small></span></a>
   <p className="nav-caption">ESPACIO DE TRABAJO</p>
   <a className="nav active" href="#resumen">◫　Resumen</a><a className="nav" href="#asuntos">▤　Asuntos <small>MVP</small></a><a className="nav" href="#vencimientos">◷　Vencimientos</a><a className="nav" href="#integraciones">⌁　Integraciones</a>
   <div className="user"><span>FT</span><div><b>Fons Legal</b><small>Área de trabajo</small></div></div>
  </aside>
  <section className="main">
   <header className="topbar"><span>Espacio de trabajo　/　<b>Resumen</b></span><span className="env"><i/> Entorno de desarrollo　 <b className="avatar">FT</b></span></header>
   <div className="content" id="resumen">
    <div className="intro"><div><p className="eyebrow">FONS LEGAL · OPERACIONES</p><h1>Tu práctica, en orden.</h1><p className="sub">Un espacio central para organizar asuntos, movimientos y próximos pasos.</p></div><span className="demo-pill">●　MVP · Datos de muestra</span></div>
    <section className="metrics">{metrics.map(([label,value,detail,icon])=><article className="metric" key={label}><div className="metric-head">{label}<span>{icon}</span></div><strong>{value}</strong><p>{detail}</p></article>)}</section>
    <section className="columns">
     <article className="panel" id="asuntos"><div className="panel-head"><div><h2>Asuntos recientes</h2><p>Vista previa con registros ilustrativos</p></div><span className="chip">DEMO</span></div>
      {matters.map(m=><div className="matter" key={m.id}><span className="matter-icon">§</span><div className="matter-info"><b>{m.title}</b><small>{m.id} · {m.court}</small></div><span className={"status "+m.tone}>{m.status}</span></div>)}
      <footer className="panel-foot">Mostrando 3 registros ficticios <span>Base de datos pendiente</span></footer>
     </article>
     <article className="panel" id="integraciones"><div className="panel-head"><div><h2>Plan de puesta en marcha</h2><p>Estado del producto</p></div></div>
      <div className="task"><span className="check">✓</span><div><b>Esquema inicial de base</b><small>Supabase preparado</small></div><em>LISTO</em></div>
      <div className="task"><span className="check">✓</span><div><b>Interfaz responsive</b><small>Panel adaptable a celular</small></div><em>LISTO</em></div>
      <div className="task"><span className="pending">3</span><div><b>Autenticación y permisos</b><small>Sesiones y aislamiento por usuario</small></div><em className="wait">PENDIENTE</em></div>
      <div className="task"><span className="pending">4</span><div><b>Conectores SCBA / PJN</b><small>Integración autorizada</small></div><em className="wait">PENDIENTE</em></div>
     </article>
    </section>
    <section className="warning" id="vencimientos"><span>!</span><div><b>Seguridad jurídica ante todo</b><p>Esta versión no consulta expedientes reales ni calcula plazos procesales. Verificá movimientos y vencimientos en la fuente oficial. No ingreses datos confidenciales hasta completar autenticación, autorización y revisión de seguridad.</p></div></section>
    <footer className="page-foot">FONS LEGAL & CORP <span>Panel de operaciones · Versión inicial</span></footer>
   </div>
  </section>
 </main>
}