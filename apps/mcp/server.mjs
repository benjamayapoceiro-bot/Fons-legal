import express from "express";
const app = express();
app.use(express.json({ limit: "64kb" }));
const port = Number(process.env.PORT || 3333);
const token = process.env.MCP_BEARER_TOKEN;
app.get("/health", (_req, res) => res.json({ ok: true, service: "fons-legal-mcp", integrations: { scba: false, pjn: false } }));
app.post("/mcp", (req, res) => {
  if (!token || req.headers.authorization !== `Bearer ${token}`) return res.status(401).json({ error: "unauthorized" });
  const body = req.body ?? {};
  if (body.method === "tools/list") return res.json({ jsonrpc: "2.0", id: body.id ?? null, result: { tools: [
    { name: "estado_integraciones", description: "Informa qué integraciones judiciales están configuradas.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
    { name: "buscar_asuntos", description: "Búsqueda aún deshabilitada hasta implementar autorización por usuario.", inputSchema: { type: "object", properties: { query: { type: "string" } }, additionalProperties: false } }
  ] } });
  if (body.method === "tools/call" && body.params?.name === "estado_integraciones") return res.json({ jsonrpc: "2.0", id: body.id ?? null, result: { content: [{ type: "text", text: JSON.stringify({ scba: "no_configurado", pjn: "no_configurado" }) }] } });
  return res.status(400).json({ jsonrpc: "2.0", id: body.id ?? null, error: { code: -32601, message: "Método no disponible en este scaffold" } });
});
app.listen(port, () => console.log(`Fons Legal MCP scaffold listening on ${port}`));
