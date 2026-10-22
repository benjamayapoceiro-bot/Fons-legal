"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { getSupabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { createWorker } from "tesseract.js";

type DocRow = { id: string; original_name: string; status: string; ocr_text: string | null; ocr_error: string | null; file_size: number; created_at: string; matter_id: string | null };
type MatterRow = { id: string; title: string; case_number: string };

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b0913", color: "#f5f1ff", padding: "28px clamp(16px,4vw,56px)", fontFamily: "Inter,system-ui,sans-serif" },
  wrap: { maxWidth: 1180, margin: "0 auto" },
  panel: { background: "#151120", border: "1px solid #302641", borderRadius: 18, padding: 22, marginTop: 18 },
  button: { background: "#a78bfa", color: "#170f26", border: 0, borderRadius: 10, padding: "11px 16px", fontWeight: 750, cursor: "pointer" },
  input: { width: "100%", background: "#0e0b16", border: "1px solid #40344f", color: "#f5f1ff", padding: 11, borderRadius: 9, marginTop: 6 },
  muted: { color: "#b9aecb", fontSize: 14, lineHeight: 1.6 },
  pill: { display: "inline-block", border: "1px solid #59436f", color: "#d9c6ff", borderRadius: 999, padding: "5px 10px", fontSize: 12 }
};

export default function DocumentosPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [matters, setMatters] = useState<MatterRow[]>([]);
  const [matterId, setMatterId] = useState("");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null);

  useEffect(() => {
    let alive = true;
    let supabase;
    try { supabase = getSupabase(); } catch (e) { setError(e instanceof Error ? e.message : "Supabase no está configurado"); setReady(true); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session) {
        const [m, d] = await Promise.all([
          supabase.from("matters").select("id,title,case_number").order("created_at", { ascending: false }),
          supabase.from("case_documents").select("id,original_name,status,ocr_text,ocr_error,file_size,created_at,matter_id").order("created_at", { ascending: false }).limit(300)
        ]);
        if (m.error) setError(m.error.message); else setMatters((m.data || []) as MatterRow[]);
        if (d.error) setError(d.error.message); else setDocs((d.data || []) as DocRow[]);
      }
      setReady(true);
    });
    return () => { alive = false; void workerRef.current?.terminate(); };
  }, []);

  function chooseFiles(e: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files || []);
    const allowed = incoming.filter(f => f.type.startsWith("image/") && f.size <= 50 * 1024 * 1024);
    setFiles(prev => [...prev, ...allowed]);
    if (allowed.length !== incoming.length) setError("Solo se admiten imágenes de hasta 50 MB cada una. Los PDF se agregarán en otra etapa.");
    else setError("");
    e.target.value = "";
  }

  async function processQueue() {
    if (!session || !files.length || busy) return;
    const supabase = getSupabase();
    setBusy(true); setError("");
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    let succeeded = 0;
    try {
      setProgress("Preparando OCR local en español…");
      worker = await createWorker("spa", 1, { logger: m => { if (m.status === "recognizing text") setProgress("OCR local: " + Math.round(m.progress * 100) + "% del documento actual"); } });
      workerRef.current = worker;
      const queue = [...files];
      for (let i = 0; i < queue.length; i++) {
        const file = queue[i];
        setProgress(`Procesando ${i + 1}/${queue.length}: ${file.name}`);
        const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "documento";
        const path = `${session.user.id}/${Date.now()}-${i}-${safeName}`;
        const upload = await supabase.storage.from("case-documents").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) { setError(`${file.name}: no se pudo subir: ${upload.error.message}`); continue; }
        const { data: ocr, error: ocrError } = await worker.recognize(file);
        const insert = await supabase.from("case_documents").insert({
          user_id: session.user.id, matter_id: matterId || null, original_name: file.name,
          storage_path: path, mime_type: file.type, file_size: file.size,
          status: ocrError ? "ocr_failed" : "ocr_done", ocr_text: ocr?.text || "",
          ocr_language: "spa", ocr_engine: "tesseract.js-browser", ocr_error: ocrError ? String(ocrError) : null
        }).select("id,original_name,status,ocr_text,ocr_error,file_size,created_at,matter_id").single();
        if (insert.error) { setError(`${file.name}: OCR listo, pero no se guardó el registro: ${insert.error.message}`); continue; }
        setDocs(prev => [insert.data as DocRow, ...prev]);
        succeeded++;
      }
      setFiles([]);
      setProgress(`Terminado: ${succeeded} de ${queue.length} documentos procesados. El OCR se ejecutó en tu navegador y no consumió tokens de IA.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falló el procesamiento de la cola.");
    } finally {
      if (worker) await worker.terminate();
      workerRef.current = null;
      setBusy(false);
    }
  }

  const visible = docs.filter(d => (d.original_name + " " + (d.ocr_text || "")).toLowerCase().includes(search.toLowerCase()));
  if (!ready) return <main style={styles.page}>Cargando espacio documental…</main>;
  if (!session) return <main style={styles.page}><div style={styles.wrap}><h1>Fons Legal · Documentos</h1><p style={styles.muted}>Necesitás iniciar sesión en el panel principal para administrar expedientes.</p><a href="/" style={{ color: "#c4b5fd" }}>Volver al inicio →</a>{error && <p>{error}</p>}</div></main>;

  return <main style={styles.page}><div style={styles.wrap}>
    <a href="/" style={{ color: "#c4b5fd", textDecoration: "none" }}>← Volver al panel</a>
    <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginTop: 18 }}>
      <div><div style={styles.pill}>OCR LOCAL · SIN TOKENS</div><h1 style={{ fontSize: "clamp(28px,4vw,42px)", margin: "12px 0 4px" }}>Documentos de expedientes</h1><p style={styles.muted}>Carga por lotes de más de 200 imágenes. El reconocimiento se ejecuta en tu navegador; la IA generativa es opcional y no participa del OCR.</p></div>
      <a href="/configuracion" style={{ color: "#c4b5fd" }}>Configurar IA y portales →</a>
    </div>
    <section style={styles.panel}>
      <h2 style={{ marginTop: 0 }}>1. Agregar imágenes</h2>
      <p style={styles.muted}>Admite JPG, PNG, WEBP, TIFF y otras imágenes reconocidas por el navegador, hasta 50 MB por archivo. Seleccioná cientos de archivos de una vez o agregá más tandas. Para proteger la privacidad, el OCR corre localmente y solo el original y el texto extraído se guardan en tu espacio privado de Supabase.</p>
      <label style={{ display: "block", margin: "16px 0" }}>Asociar a expediente (opcional)
        <select style={styles.input} value={matterId} onChange={e => setMatterId(e.target.value)}><option value="">Sin expediente asociado</option>{matters.map(m => <option key={m.id} value={m.id}>{m.case_number} · {m.title}</option>)}</select>
      </label>
      <input type="file" accept="image/*" multiple onChange={chooseFiles} disabled={busy} style={{ display: "block", maxWidth: "100%", margin: "16px 0" }} />
      <p style={styles.muted}>{files.length} imágenes en cola. Se procesan una por una para no agotar la memoria del navegador.</p>
      {files.length > 0 && <div style={{ maxHeight: 150, overflow: "auto", border: "1px solid #302641", borderRadius: 9, padding: 10, marginBottom: 14 }}>{files.slice(0, 12).map((f,i)=><div key={i} style={{ fontSize: 13, padding: 4 }}>{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</div>)}{files.length > 12 && <div style={styles.muted}>y {files.length - 12} archivos más…</div>}</div>}
      <button style={{ ...styles.button, opacity: busy || !files.length ? .5 : 1 }} disabled={busy || !files.length} onClick={() => void processQueue()}>{busy ? "Procesando lote…" : `Subir y hacer OCR de ${files.length} imágenes`}</button>
      {progress && <p style={{ ...styles.muted, marginTop: 14 }}>{progress}</p>}
      {error && <p role="alert" style={{ color: "#fca5a5", marginTop: 14 }}>{error}</p>}
    </section>
    <section style={styles.panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>2. Archivo documental</h2><p style={styles.muted}>{docs.length} documentos guardados</p></div><input aria-label="Buscar en documentos y OCR" placeholder="Buscar nombre o texto reconocido…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...styles.input, maxWidth: 360, marginTop: 0 }} /></div>
      {visible.length === 0 ? <p style={styles.muted}>Todavía no hay documentos o no hay coincidencias.</p> : visible.map(d => <details key={d.id} style={{ borderTop: "1px solid #302641", padding: "14px 0" }}><summary style={{ cursor: "pointer", display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}><span><b>{d.original_name}</b><small style={{ display: "block", color: "#b9aecb", marginTop: 5 }}>{new Date(d.created_at).toLocaleString("es-AR")} · {(d.file_size / 1024 / 1024).toFixed(2)} MB</small></span><span style={styles.pill}>{d.status === "ocr_done" ? "OCR listo" : d.status}</span></summary><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 360, overflow: "auto", background: "#0e0b16", borderRadius: 10, padding: 14, marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>{d.ocr_text || d.ocr_error || "No hay texto OCR guardado."}</div><button style={{ ...styles.button, marginTop: 10 }} onClick={() => void navigator.clipboard.writeText(d.ocr_text || "")}>Copiar texto OCR</button></details>)}
    </section>
    <p style={{ ...styles.muted, marginTop: 22 }}>Nota: el OCR puede equivocarse con sellos, manuscritos o imágenes borrosas. Revisá siempre el original antes de usar fechas, nombres o plazos procesales. Esta primera versión procesa imágenes; los PDF escaneados y la extracción automática de movimientos judiciales requieren módulos adicionales.</p>
  </div></main>;
}
