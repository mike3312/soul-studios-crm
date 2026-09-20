# Acceso administrativo

El CRM usa /login con una sesión almacenada en MySQL. Ya no utiliza el cuadro emergente de autenticación HTTP Basic.

- Usuario inicial: CRM_ADMIN_USER.
- Contraseña inicial: CRM_ADMIN_PASSWORD. Solo inicializa AdminCredential cuando todavía no existe; no permite volver a usar una contraseña antigua después de cambiarla.
- La contraseña se almacena como hash scrypt con sal aleatoria.
- La cookie es HttpOnly, SameSite=Lax, y Secure con prefijo __Host- en producción. Expira después de 8 horas.
- La base almacena solo el hash del token de sesión, no el token original.
- Administrador → Cambiar contraseña requiere la contraseña actual y una nueva de 12–128 caracteres. Revoca todas las sesiones.
- Administrador → Cerrar sesión revoca la sesión actual.
- Las peticiones administrativas que modifican datos requieren un Origin igual a NEXT_PUBLIC_APP_URL.
- Los límites persistentes son 20 intentos de login y 10 intentos de cambio de contraseña por 15 minutos para esta instalación de un solo administrador.
- /api/webhooks/whatsapp permanece fuera del login y conserva la verificación de firma de Meta.

## Entornos

Local: http://localhost:3000, base MySQL local soul_crm_local, configurada en .env. Ejecutar npm run dev con MySQL de XAMPP iniciado.

Producción: https://crmsoul.oficinabetel.com, base administrada de Hostinger u596117916_crmsoul. Las variables se conservan en Hostinger; nunca se sube .env.

Ambos usan el mismo código y migraciones. Sus datos, contraseñas y sesiones son independientes. Cambiar la contraseña en uno no la cambia en el otro.

SQLite se conserva como respaldo original, pero ninguno de estos dos entornos lo usa como base activa.

## Verificación

- npm run test:auth
- npm run lint
- npm run typecheck
- npm run build (ejecuta prisma generate, prisma migrate deploy y next build).
- Con el servidor local activo: node --env-file=.env scripts/auth-local-smoke.mjs. Este script se limita a la base local dedicada, prueba un cambio temporal de contraseña y restaura la original. No debe ejecutarse después de que el usuario cambie su contraseña local salvo que CRM_ADMIN_PASSWORD se actualice al valor actual.

No ejecutar seed para actualizar el esquema. La migración 20260903160000_admin_sessions solo añade tablas de autenticación; no modifica ni borra los registros comerciales.
