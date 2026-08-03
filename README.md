# 🤖 Bot de WhatsApp con Sistema de Economía y Juegos

Bot multi-funcional para WhatsApp con sistema de economía, juegos de casino, moderación avanzada y más.

## 🌟 Características

### 💰 Sistema de Economía
- Trabajar, robar, crímenes
- Sistema bancario (depósitos/retiros)
- Transferencias entre usuarios
- Sistema de préstamos con interés (20%)
- Infocorp para deudores

### 🎮 Juegos de Casino
- Tragamonedas (slots)
- Ruleta (números, colores, paridades)
- Football Studio
- Coinflip (cara o sello)
- Dados
- Piedra, papel o tijera

### 🛡️ Moderación
- Sistema de advertencias
- Antilinks con whitelist
- Filtro de palabras prohibidas
- Kick automático/manual
- Sistema de bloqueos de contenido
- Bienvenidas personalizadas

### 🏪 Tienda de Items
- Escudos antirrobos
- Multiplicadores de ganancias
- Borrador de advertencias
- Permisos especiales (vv, insta, locks)

### 📊 Panel Web (Next.js)
- Perfil público de usuarios
- Panel administrativo
- Gestión de alertas programadas
- Sistema de vouchers

## 🚀 Despliegue

### Requisitos
- Node.js 20+
- Cuenta de Firebase (Firestore)
- AWS EC2 (Ubuntu 26.04) o cualquier VPS
- PM2 para proceso 24/7

### Instalación Rápida en EC2

```bash
# Clonar repositorio
git clone https://github.com/PercyTuncar/bot-2026-aws.git
cd bot-2026-aws

# Instalar dependencias del bot
cd bot
npm install

# Configurar variables de entorno
cp .env.example .env
nano .env

# Primera ejecución (escanear QR)
node src/index.js

# Iniciar con PM2 (24/7)
cd ..
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Variables de Entorno Requeridas

Edita el archivo `bot/.env`:

```env
OWNER_JID=TU_NUMERO@s.whatsapp.net
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_CLIENT_EMAIL=tu-email@firebase.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
PLIN_NUMBER=999999999
EXCHANGE_RATE=1000
```

## 📖 Documentación Completa

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas de despliegue, comandos disponibles y configuración avanzada.

## 🛠️ Tecnologías

- **Bot**: Node.js + Baileys 7.x
- **Base de datos**: Firebase Firestore
- **Panel Web**: Next.js 15 + React
- **Process Manager**: PM2
- **Deployment**: AWS EC2 + Vercel

## 📝 Licencia

MIT
