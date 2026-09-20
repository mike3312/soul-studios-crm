# Soul Studios CRM

MVP local para gestionar prospectos, conversaciones simuladas y asistencia comercial con OpenRouter.

## Inicio rápido

1. Instala dependencias: `npm install`
2. Copia `.env.example` a `.env` y agrega tu `OPENROUTER_API_KEY`.
3. Crea la base de datos: `npm run db:push`
4. Carga los datos demo: `npm run db:seed`
5. Inicia el CRM: `npm run dev`
6. Abre `http://localhost:3000`.

## Variables

- `DATABASE_URL="file:./dev.db"`: base SQLite local.
- `OPENROUTER_API_KEY`: clave privada de OpenRouter; solo se usa en el servidor.
- `OPENROUTER_MODEL`: modelo por defecto. También puede cambiarse desde Configuración IA.
- `NEXT_PUBLIC_APP_URL`: URL base usada en metadatos sociales.

## Verificación

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## WhatsApp futuro

La conversación y los mensajes están desacoplados de la interfaz. Una integración futura puede recibir webhooks de WhatsApp, localizar o crear el prospecto y guardar mensajes con `role = customer`; el envío aprobado puede conectarse en la misma capa donde hoy se guarda un mensaje de agente. La IA no envía mensajes automáticamente.
