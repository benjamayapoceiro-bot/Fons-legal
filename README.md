# Fons Legal — MVP inicial

Scaffold de desarrollo para gestión jurídica con Next.js, Supabase y un endpoint MCP inicial.

**Estado:** no es producción. No incluye conectores judiciales reales. Usá datos ficticios hasta completar autenticación, autorización por asunto y revisión de seguridad.

## Estructura
- `apps/web`: dashboard Next.js.
- `apps/mcp`: endpoint HTTP protegido de herramientas.
- `supabase/schema.sql`: esquema de referencia.

## Desarrollo
Requiere Node.js 20+ y npm. Copiá los archivos `.env.example` a los archivos `.env.local`/`.env` correspondientes y completá las variables localmente. Nunca subas secretos ni claves.

SCBA/PJN no están conectados. No evadir CAPTCHA/MFA ni controles de acceso. Toda fecha procesal requiere verificación profesional. Revisar RLS y autenticación antes de cargar datos reales.
