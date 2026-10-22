# Fons Legal — MVP inicial

Dashboard de gestión jurídica en Next.js con endpoint MCP preliminar y esquema de referencia para Supabase.

## Netlify
El archivo `netlify.toml` configura el build del workspace web. Conectá este repositorio desde Netlify para habilitar despliegues automáticos en cada push.

Variables de entorno web:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No incluyas la service-role key en la web ni en GitHub. Configurá secretos en la configuración del sitio Netlify.

## Estado y límites
El dashboard usa registros ficticios y todavía no consulta Supabase. SCBA/PJN no están conectados y no se calculan vencimientos procesales. No cargar datos personales o confidenciales hasta completar autenticación, autorización por usuario, revisión de RLS y auditoría.

## Desarrollo
Requiere Node.js 20+ y npm. Ejecutá `npm install` y luego `npm run dev:web`.
