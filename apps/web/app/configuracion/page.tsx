"use client";

import { useEffect, useState } from "react";

type Provider = "openai" | "anthropic" | "gemini" | "ollama" | "openai-compatible";
type AiConfig = { provider: Provider; baseUrl: string; model: string; apiKey: string };
const defaults: AiConfig = { provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKey: "" };
const presets: Record<Provider, Partial<AiConfig>> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-haiku-latest" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:7b" },
  "openai-compatible": { baseUrl: "", model: "" }
};
const panel: React.CSSProperties = { background: "#151120", border: "1px solid #302641", borderRadius: 16, padding: 22, marginTop: 18 };
const input: React.CSSProperties = { width: "100%", background: "#0e0b16", border: "1px solid #40344f", color: "#f5f1ff", padding: 11, borderRadius: 9, marginTop: 6 };
const muted: React.CSSProperties = { color: "#b9aecb", fontSize: 14, lineHeight: 1.6 };

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<AiConfig>(defaults);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fons-ai-config");
      if (raw) setConfig({ ...defaults, ...JSON.parse(raw) });
    } catch {}
  }, []);
  function changeProvider(provider: Provider) {
    setConfig(c => ({ ...c, provider, ...presets[provider], apiKey: c.apiKey }));
    setSaved(false); setMessage("");
  }
  function save() {
    sessionStorage.setItem("fons-ai-config", JSON.stringify(config));
    setSaved(true);
    setMessage("Configuración guardada solo en esta pestaña/sesión. No se envió ninguna clave a Supabase.");
  }
  function clear() {
    sessionStorage.removeItem("fons-ai-config"); setConfig(defaults); setSaved(false); setMessage("Configuración local eliminada.");
  }
  async function test() {
    setMessage("Probando conexión…");
    try {
      let response: Response;
      if (config.provider === "openai" || config.provider === "openai-compatible" || config.provider === "ollama") {
        response = await fetch(config.baseUrl.replace(/\/$/, "") + "/chat/completions", {
          method: "POST", headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: "Bearer " + config.apiKey } : {}) },
          body: JSON.stringify({ model: config.model, messages: [{ role: "user", content: "Respondé solamente: conexión OK" }], max_tokens: 20 })
        });
      } else if (config.provider === "anthropic") {
        response = await fetch(config.baseUrl.replace(/\/$/, "") + "/messages", {
          method: "POST", headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: config.model, max_tokens: 20, messages: [{ role: "user", content: "Respondé solamente: conexión OK" }] })
        });
      } else {
        response = await fetch(config.baseUrl.replace(/\/$/, "") + "/models/" + encodeURIComponent(config.model) + ":generateContent?key=" + encodeURIComponent(config.apiKey), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Respondé solamente: conexión OK" }] }] })
        });
      }
      if (response.ok) setMessage("Respuesta HTTP " + response.status + ": el proveedor respondió. Revisá la política de CORS y los permisos de la cuenta.");
      else setMessage("El proveedor respondió HTTP " + response.status + ". Revisá el modelo, la clave, el saldo y los permisos. No se guardó la clave en el servidor.");
    } catch (e) {
      setMessage("No se pudo completar la prueba desde el navegador (puede ser CORS, endpoint o red). " + (e instanceof Error ? e.message : ""));
    }
  }
  return <main style={{ minHeight: "100vh", background: "#0b0913", color: "#f5f1ff", padding: "28px clamp(16px,4vw,56px)", fontFamily: "Inter,system-ui,sans-serif" }}><div style={{ maxWidth: 1000, margin: "0 auto" }}>
    <a href="/" style={{ color: "#c4b5fd" }}>← Volver al panel</a><h1 style={{ fontSize: "clamp(28px,4vw,42px)", marginBottom: 4 }}>Conexiones e inteligencia artificial</h1><p style={muted}>Configurá el proveedor que quieras usar. El OCR documental funciona por separado y no consume tokens de IA.</p>
    <section style={panel}><h2 style={{ marginTop: 0 }}>Proveedor de IA</h2><p style={muted}>Podés elegir un proveedor o una API compatible con OpenAI. La clave se guarda en sessionStorage del navegador y se borra al cerrar la sesión de pestaña; no se manda a Supabase. Las llamadas directas desde el navegador pueden ser bloqueadas por CORS y no son la opción recomendada para un sistema multiusuario con expedientes confidenciales.</p>
      <label>Proveedor<select style={input} value={config.provider} onChange={e => changeProvider(e.target.value as Provider)}><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><option value="gemini">Google Gemini</option><option value="ollama">Ollama local</option><option value="openai-compatible">Otro proveedor compatible con OpenAI</option></select></label>
      <label style={{ display: "block", marginTop: 12 }}>Endpoint API<input style={input} value={config.baseUrl} onChange={e => { setConfig(c => ({ ...c, baseUrl: e.target.value })); setSaved(false); }} placeholder="https://…/v1" /></label>
      <label style={{ display: "block", marginTop: 12 }}>Modelo<input style={input} value={config.model} onChange={e => { setConfig(c => ({ ...c, model: e.target.value })); setSaved(false); }} placeholder="Nombre exacto del modelo" /></label>
      <label style={{ display: "block", marginTop: 12 }}>Clave API (no obligatoria para Ollama local)<input style={input} type="password" autoComplete="off" value={config.apiKey} onChange={e => { setConfig(c => ({ ...c, apiKey: e.target.value })); setSaved(false); }} placeholder="Se mantiene solo en esta sesión del navegador" /></label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}><button onClick={save} style={{ background: "#a78bfa", color: "#170f26", border: 0, borderRadius: 9, padding: "11px 15px", fontWeight: 750 }}>Guardar en esta sesión</button><button onClick={() => void test()} style={{ background: "#282035", color: "#f5f1ff", border: "1px solid #59436f", borderRadius: 9, padding: "11px 15px" }}>Probar conexión</button><button onClick={clear} style={{ background: "transparent", color: "#fca5a5", border: "1px solid #6b3341", borderRadius: 9, padding: "11px 15px" }}>Borrar configuración</button></div>
      {message && <p role="status" style={{ ...muted, marginTop: 14 }}>{message}</p>}
    </section>
    <section style={panel}><h2 style={{ marginTop: 0 }}>Portales judiciales y organismos</h2><p style={muted}>Estos accesos abren los portales oficiales. Para sincronizar movimientos automáticamente se necesita una API/documentación autorizada o un mecanismo de acceso permitido por cada organismo. No voy a simular que una consulta manual es una conexión real ni guardar contraseñas judiciales en el navegador.</p>
      {[{name:"SCBA · Mesa de Entradas Virtual",url:"https://mev.scba.gov.ar/loguin.asp?familiadepto=40",detail:"Ingreso oficial MEV. La consulta automática de causas no está habilitada aún."},{name:"PJN · Consulta de causas",url:"https://scw.pjn.gov.ar/scw/home.seam",detail:"Portal oficial nacional. El acceso depende del tipo de expediente y los permisos del usuario."},{name:"INPI · Trámites",url:"https://portaltramites.inpi.gob.ar/",detail:"Portal oficial de marcas y trámites. Requiere definir el flujo autorizado para importar estados."},{name:"BUS Federal Justicia",url:"https://www.bus-justicia.org.ar/",detail:"Interoperabilidad institucional; requiere credenciales y habilitación del organismo."}].map(p => <div key={p.name} style={{ borderTop: "1px solid #302641", padding: "15px 0", display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}><div><b>{p.name}</b><p style={{ ...muted, margin: "5px 0 0" }}>{p.detail}</p></div><a href={p.url} target="_blank" rel="noreferrer" style={{ color: "#c4b5fd", whiteSpace: "nowrap" }}>Abrir portal ↗</a></div>)}
    </section>
    <section style={panel}><h2 style={{ marginTop: 0 }}>Qué está conectado de verdad</h2><ul style={muted}><li>Supabase Auth y base de datos del panel.</li><li>Almacenamiento privado por usuario para imágenes de expedientes.</li><li>OCR de imágenes en el navegador mediante Tesseract.js, sin tokens generativos.</li><li>Configuración local del proveedor de IA y prueba de conectividad.</li><li>Portales oficiales: enlaces de acceso; todavía no hay sincronización automática autorizada de movimientos SCBA/PJN/INPI.</li></ul><p style={muted}>Siguiente fase recomendada: usar un backend seguro para las llamadas de IA (claves fuera del navegador), añadir PDF OCR por página y conectar solo las APIs para las que tengas autorización y credenciales.</p></section>
  </div></main>;
}
