# Despliegue Inicial - Soul Studios CRM a Hostinger

## 1. Subir a GitHub

```bash
# En la raíz del proyecto
git init
git add .
git commit -m "Initial commit: Soul Studios CRM"
gh repo create soul-studios-crm --private --source=. --push
# O manualmente en github.com → New repository → push existing
```

## 2. Configurar Secrets en GitHub

Ve a **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `SSH_HOST` | IP de tu VPS Hostinger (ej: `123.45.67.89`) |
| `SSH_USER` | Usuario SSH (ej: `u123456`) |
| `SSH_PORT` | `22` (o el que use Hostinger) |
| `SSH_PRIVATE_KEY` | Contenido de tu clave privada `~/.ssh/id_ed25519` |
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` (producción) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` |
| `NEXT_PUBLIC_APP_URL` | `https://crm.carwashgt.com` |
| `CRM_ADMIN_USER` | `souladmin` |
| `CRM_ADMIN_PASSWORD` | Contraseña segura producción |

## 3. Configurar SSH en Hostinger

```bash
# En TU máquina local
ssh-keygen -t ed25519 -C "github-actions-deploy"
cat ~/.ssh/id_ed25519.pub

# En Hostinger (SSH o panel):
# Agregar la clave pública a ~/.ssh/authorized_keys
```

## 4. Preparar servidor (PRIMERA VEZ - manual)

```bash
ssh usuario@host
cd ~/domains/crm.carwashgt.com

# Clonar repo
git clone git@github.com:TU_USUARIO/soul-studios-crm.git .

# Instalar Node 22 (si no está)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 global
npm install -g pm2

# Instalar deps y build
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

# Crear logs dir
mkdir -p logs

# Iniciar con PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Ejecuta el comando que te muestra
```

## 5. Configurar Nginx (Hostinger panel o SSH)

```nginx
# En Hostinger: Websites → tu dominio → Proxy Rules / Custom Nginx
# O crear /etc/nginx/sites-available/crm.carwashgt.com

server {
    listen 80;
    server_name crm.carwashgt.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.carwashgt.com;

    ssl_certificate /etc/letsencrypt/live/crm.carwashgt.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.carwashgt.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 6. SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d crm.carwashgt.com
```

## 7. Verificar

- Push a `main` → GitHub Actions build + deploy
- Ver en `https://crm.carwashgt.com`
- Logs: `pm2 logs soul-studios-crm`

---

## Comandos útiles post-deploy

```bash
pm2 logs soul-studios-crm --lines 100
pm2 restart soul-studios-crm
pm2 monit
npx prisma studio  # Solo local con SSH tunnel
```