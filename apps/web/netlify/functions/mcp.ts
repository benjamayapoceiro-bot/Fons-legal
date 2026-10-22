import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

declare const Netlify: { env: { get(name: string): string | undefined } };

const env = (name: string) => Netlify.env.get(name);

function authorized(req: Request) {
  const expected = env("MCP_BEARER_TOKEN");
  const actual = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return Boolean(expected && actual && actual.length === expected.length && actual === expected);
}

function makeServer() {
  const server = new McpServer({ name: "fons-legal", version: "0.2.0" });
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const userId = env("FONS_MCP_USER_ID");
  const db = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  }) : null;

  const needDb = () => {
    if (!db || !userId) throw new Error("MCP sin configurar: faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o FONS_MCP_USER_ID en Netlify.");
    return { db, userId };
  };

  server.tool("estado_fons", "Comprueba la configuración del conector Fons Legal y enumera sus capacidades.", {}, async () => ({
    content: [{ type: "text", text: JSON.stringify({
      service: "Fons Legal MCP",
      databaseConfigured: Boolean(db && userId),
      capabilities: ["expedientes", "documentos OCR", "enlaces firmados a archivos", "vencimientos", "movimientos cargados", "portales oficiales"],
      courtPortalAutomation: false
    }, null, 2) }]
  }));

  server.tool("listar_expedientes", "Lista los expedientes del usuario autenticado por la configuración privada del conector. No devuelve expedientes de otros usuarios.", {
    query: z.string().optional().describe("Filtro opcional por carátula, número, juzgado o cliente."),
    limit: z.number().int().min(1).max(50).optional().describe("Cantidad máxima, por defecto 20.")
  }, async ({ query, limit }) => {
    const { db, userId } = needDb();
    let q = db.from("matters").select("id,court,case_number,title,client_name,status,source,external_url,notes,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit ?? 20);
    if (query?.trim()) q = q.or("title.ilike.%"+query.trim().replace(/[%_,]/g, " ")+"%,case_number.ilike.%"+query.trim().replace(/[%_,]/g, " ")+"%,court.ilike.%"+query.trim().replace(/[%_,]/g, " ")+"%,client_name.ilike.%"+query.trim().replace(/[%_,]/g, " ")+"%");
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
  });

  server.tool("buscar_documentos", "Busca documentos cargados en Fons Legal por nombre o texto OCR. Devuelve metadatos y fragmentos, no todo el archivo.", {
    query: z.string().optional().describe("Palabra o frase que se busca en nombre y OCR."),
    matter_id: z.string().uuid().optional().describe("Limita la búsqueda a un expediente."),
    limit: z.number().int().min(1).max(30).optional().describe("Cantidad máxima, por defecto 10.")
  }, async ({ query, matter_id, limit }) => {
    const { db, userId } = needDb();
    let q = db.from("case_documents").select("id,matter_id,original_name,mime_type,file_size,status,ocr_text,ocr_error,page_count,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit ?? 10);
    if (matter_id) q = q.eq("matter_id", matter_id);
    if (query?.trim()) q = q.or("original_name.ilike.%"+query.trim().replace(/[%_,]/g, " ")+"%,ocr_text.ilike.%"+query.trim().replace(/[%_,]/g, " ")+"%");
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const compact = (data ?? []).map((d: any) => ({ ...d, ocr_text: d.ocr_text ? d.ocr_text.slice(0, 7000) : null }));
    return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
  });

  server.tool("leer_documento", "Recupera el texto OCR de un documento específico y un enlace temporal privado al archivo original para que el cliente compatible pueda abrir la imagen o archivo.", {
    document_id: z.string().uuid().describe("ID del documento devuelto por buscar_documentos.")
  }, async ({ document_id }) => {
    const { db, userId } = needDb();
    const { data, error } = await db.from("case_documents").select("id,matter_id,original_name,mime_type,file_size,status,ocr_text,ocr_error,page_count,storage_path,created_at").eq("user_id", userId).eq("id", document_id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Documento no encontrado para este usuario.");
    const { data: signed, error: signError } = await db.storage.from("case-documents").createSignedUrl(data.storage_path, 300);
    if (signError) throw new Error("No se pudo crear enlace temporal al archivo: " + signError.message);
    return { content: [{ type: "text", text: JSON.stringify({ ...data, signed_file_url: signed.signedUrl, signed_url_expires_in_seconds: 300 }, null, 2) }] };
  });

  server.tool("listar_vencimientos", "Lista vencimientos pendientes o de otros estados del usuario; incluye el expediente asociado cuando existe.", {
    status: z.enum(["pending", "completed", "dismissed", "all"]).optional().describe("Estado a filtrar, por defecto pending."),
    limit: z.number().int().min(1).max(100).optional().describe("Cantidad máxima, por defecto 30.")
  }, async ({ status, limit }) => {
    const { db, userId } = needDb();
    let q = db.from("deadlines").select("id,matter_id,title,due_at,status,notes,verified_by_user,created_at").eq("user_id", userId).order("due_at", { ascending: true }).limit(limit ?? 30);
    const wanted = status ?? "pending";
    if (wanted !== "all") q = q.eq("status", wanted);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
  });

  server.tool("movimientos_expediente", "Consulta movimientos que ya estén guardados en Fons Legal. No realiza scraping ni afirma que los movimientos estén sincronizados en vivo con el portal.", {
    matter_id: z.string().uuid().describe("ID del expediente en Fons Legal."),
    limit: z.number().int().min(1).max(100).optional().describe("Cantidad máxima, por defecto 30.")
  }, async ({ matter_id, limit }) => {
    const { db, userId } = needDb();
    const { data: matter, error: matterError } = await db.from("matters").select("id,title,case_number,court,external_url").eq("user_id", userId).eq("id", matter_id).maybeSingle();
    if (matterError) throw new Error(matterError.message);
    if (!matter) throw new Error("Expediente no encontrado para este usuario.");
    const { data, error } = await db.from("docket_events").select("id,event_date,title,description,source,source_reference,verified_by_user,created_at").eq("user_id", userId).eq("matter_id", matter_id).order("event_date", { ascending: false }).limit(limit ?? 30);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify({ matter, events: data ?? [], livePortalSync: false }, null, 2) }] };
  });

  server.tool("enlaces_portales", "Devuelve los enlaces oficiales a los portales judiciales para abrirlos manualmente. No accede ni inicia sesión por el usuario.", {}, async () => ({
    content: [{ type: "text", text: JSON.stringify([
      { portal: "SCBA / MEV", url: "https://mev.scba.gov.ar/loguin.asp?familiadepto=40" },
      { portal: "Poder Judicial de la Nación", url: "https://scw.pjn.gov.ar/scw/home.seam" },
      { portal: "INPI", url: "https://portaltramites.inpi.gob.ar/" },
      { portal: "Bus Federal Justicia", url: "https://www.bus-justicia.org.ar/" }
    ], null, 2) }]
  }));

  return server;
}

export default async (req: Request) => {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const server = makeServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
};

export const config = {
  path: "/mcp",
  rateLimit: { windowSize: 60, windowLimit: 60, aggregateBy: ["ip"] }
};
