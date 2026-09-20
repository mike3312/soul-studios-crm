# Configuración de WhatsApp Business Cloud API

El CRM recibe eventos en `GET/POST /api/webhooks/whatsapp`. La URL configurada en Meta debe ser pública y usar HTTPS; `localhost` no puede recibir webhooks desde Meta.

## 1. Crear y preparar la app en Meta

1. En [Meta for Developers](https://developers.facebook.com/apps/) crea una app de tipo **Business**.
2. Agrega el producto **WhatsApp** y vincula o crea el portafolio empresarial y la cuenta de WhatsApp Business (WABA).
3. En **WhatsApp > API Setup** copia el **Phone number ID** y el **WhatsApp Business Account ID**.
4. Para una prueba inicial puedes usar el token temporal del panel. Para producción crea un usuario del sistema en la configuración del negocio, asígnale la app y la WABA, y genera un token con `whatsapp_business_messaging` y `whatsapp_business_management`.

## 2. Configurar el CRM

Completa estas variables en `.env` y reinicia `npm run dev`:

```dotenv
WHATSAPP_ACCESS_TOKEN="token-de-meta"
WHATSAPP_PHONE_NUMBER_ID="id-del-numero"
WHATSAPP_BUSINESS_ACCOUNT_ID="id-de-la-waba"
WHATSAPP_VERIFY_TOKEN="una-frase-secreta-creada-por-ti"
WHATSAPP_API_VERSION="v23.0"
WHATSAPP_APP_SECRET="secreto-de-la-app"
```

Usa la versión de Graph API que muestre actualmente el panel de Meta si es distinta. `WHATSAPP_APP_SECRET` permite validar la firma `X-Hub-Signature-256` de los eventos; no expongas ninguna de estas variables al navegador ni las prefijes con `NEXT_PUBLIC_`.

## 3. Publicar y registrar el webhook

1. Expón el servidor con una URL HTTPS pública o despliega la aplicación en un servidor Node.js con base de datos persistente.
2. En **WhatsApp > Configuration > Webhook**, registra `https://tu-dominio.com/api/webhooks/whatsapp`.
3. Usa exactamente el valor de `WHATSAPP_VERIFY_TOKEN` como token de verificación.
4. Suscribe el campo **messages**. Si la WABA todavía no está suscrita a la app, suscríbela desde el panel o con `POST /{WABA-ID}/subscribed_apps` usando un token autorizado.

## 4. Probar primero con el número de Meta

1. Agrega tu teléfono como destinatario permitido en **API Setup**.
2. Envía el mensaje de prueba desde Meta hacia tu teléfono.
3. Responde desde tu WhatsApp al número de prueba de Meta.
4. Abre **Conversaciones** en el CRM. Debe aparecer un prospecto nuevo con canal **WhatsApp real**, el mensaje recibido y la clasificación de IA.
5. Reenvía el mismo evento desde Meta: el `externalId` único evita guardar el mensaje dos veces.

## 5. Pasar a un número real

1. En WhatsApp Manager agrega el número comercial, verifica su propiedad por SMS o llamada y completa el registro y la verificación en dos pasos solicitados por Meta.
2. Sustituye `WHATSAPP_PHONE_NUMBER_ID` por el ID del número real y usa un token de producción con acceso a esa WABA.
3. Confirma que la WABA continúa suscrita a la app y envía un mensaje desde un teléfono externo.
4. Pon la app de Meta en el modo y estado requeridos para producción y completa las verificaciones empresariales que Meta solicite para tu cuenta.

## Ventana de atención

El CRM solo envía texto libre durante las 24 horas posteriores al último mensaje del cliente. Fuera de esa ventana guarda el seguimiento, pero bloquea el envío libre y señala que se necesita una plantilla aprobada. `processPendingFollowUps()` queda preparado como punto de entrada para conectar un programador más adelante; este MVP no instala cron ni colas.
