# Bot de WhatsApp — Guía de Despliegue

## Estructura del proyecto

```
bot-2026/
├── bot/                    # Proceso del bot (Node.js, EC2)
│   ├── src/
│   │   ├── index.js        # Punto de entrada
│   │   ├── auth/           # Autenticación/sesión persistente
│   │   ├── firebase/       # Capa de acceso a Firestore
│   │   ├── handlers/       # Manejadores de eventos
│   │   ├── registry/       # Registro y enrutador de comandos
│   │   ├── commands/       # Comandos por categoría
│   │   ├── services/       # Lógica de dominio reutilizable
│   │   ├── scheduler/      # Tareas periódicas (alertas, préstamos)
│   │   └── utils/          # Utilidades transversales
│   └── package.json
├── panel-web/              # Panel web (Next.js, Vercel)
│   ├── src/app/
│   │   ├── page.jsx        # Página principal
│   │   ├── update/         # /update — perfil público
│   │   ├── admin/          # /admin — panel protegido
│   │   └── api/            # Route Handlers (Firebase Admin)
│   └── package.json
└── ecosystem.config.cjs    # Configuración PM2
```

## 1. Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activa **Firestore** en modo producción
3. Ve a Configuración del proyecto → Cuentas de servicio
4. Genera una clave privada (descarga el JSON)
5. Crea los índices en Firestore:
   - Colección `alerts`: índices en `groupDocId` y `active`
   - Colección `vouchers`: índice en `status` y `createdAt`

## 2. Despliegue del Bot en AWS EC2

### Requisitos
- Ubuntu 22.04 LTS o superior
- Node.js 20 LTS (instalar con `nvm`)
- PM2 instalado globalmente

### Pasos

```bash
# 1. Instalar nvm y Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 2. Instalar PM2
npm install -g pm2

# 3. Clonar el repositorio
git clone <tu-repo> bot-2026
cd bot-2026/bot

# 4. Instalar dependencias
npm install

# 5. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores reales

# 6. Primera ejecución para vincular WhatsApp (muestra el QR)
node src/index.js
# Escanea el QR con WhatsApp → esperar conexión → Ctrl+C

# 7. Iniciar con PM2
cd ..
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Seguir las instrucciones para auto-inicio

# 8. Ver logs
pm2 logs whatsapp-bot
```

### Variables de entorno del bot (`.env`)

```env
OWNER_JID=51999999999@s.whatsapp.net
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
AUTH_STATE_DIR=./auth_state
PANEL_WEB_URL=https://tu-panel.vercel.app
PLIN_NUMBER=999999999
EXCHANGE_RATE=1000
```

### Seguridad del grupo EC2
- No abrir puertos entrantes para el bot (solo salientes)
- Puerto 22 (SSH) solo desde tu IP
- El bot se conecta de forma saliente a WhatsApp y Firebase

## 3. Despliegue del Panel Web en Vercel

```bash
# 1. Ir a la carpeta del panel
cd panel-web

# 2. Instalar Vercel CLI (opcional, o usar el dashboard)
npm install -g vercel

# 3. Desplegar
vercel --prod
```

### Variables de entorno en Vercel (Settings → Environment Variables)

```
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
ADMIN_PASSWORD=tu-contraseña-segura
JWT_SECRET=tu-secreto-jwt-minimo-32-caracteres
NEXT_PUBLIC_PANEL_URL=https://tu-panel.vercel.app
NEXT_PUBLIC_PLIN_NUMBER=999999999
NEXT_PUBLIC_EXCHANGE_RATE=1000
```

**Importante:** Nunca usar variables `NEXT_PUBLIC_` para credenciales de Firebase.

## 4. Primeros pasos después del despliegue

### Activar el bot en un grupo
1. El bot está vinculado a tu WhatsApp
2. Añade el bot a un grupo
3. Envíate a ti mismo (al bot, en chat privado): `!bot on 123456789-123345@g.us`
4. El bot confirma en el DM, no en el grupo
5. Ya funciona en ese grupo

### Ver grupos disponibles
```
!groups
```
(Solo funciona en el DM con el dueño del bot)

## 5. Comandos principales

### Moderación
| Comando | Descripción | Permiso |
|---------|-------------|---------|
| `!warn @usuario [motivo]` | Advertir usuario | Admin |
| `!unwarn @usuario [all]` | Quitar advertencia | Admin |
| `!kick @usuario` | Expulsar usuario | Admin |
| `!antilink on/off/add/remove` | Gestión antilinks | Admin |
| `!antiwords on/off/add/remove` | Palabras prohibidas | Admin |
| `!welcome on/off [texto]` | Bienvenida automática | Admin |
| `!tagall [texto]` | Mencionar todos | Admin |
| `!tagnoadmin [texto]` | Mencionar no-admins | Admin |
| `!lock/!unlock [formato]` | Bloqueo de contenido | Admin/Tienda |
| `!alerts on/off/list/update` | Sistema de alertas | Admin |

### Economía
| Comando | Descripción |
|---------|-------------|
| `!work` | Trabajar (CD: 5-10 min) |
| `!balance` / `!wallet` | Ver saldo |
| `!deposit/!withdraw [all]` | Gestión banco |
| `!transfer/!yapear @u [monto]` | Transferir |
| `!rob @usuario` | Robar (45% éxito) |
| `!crime` | Crimen en Ravehub City (55% éxito) |
| `!crime @usuario` | Crimen contra usuario (55% éxito) |
| `!loan [monto]` | Solicitar préstamo (20% interés) |
| `!infocorp` | Lista de deudores |
| `!top` | Ranking de riqueza |

### Juegos
| Comando | Descripción |
|---------|-------------|
| `!slot [monto]` | Tragamonedas |
| `!fstudio [home\|away\|ties] [monto]` | Football Studio |
| `!roulette [tipo] [valor] [monto]` | Ruleta |
| `!coinflip [cara\|sello] [monto]` | Cara o sello |
| `!dado [1-6] [monto]` | Dado (x5) |
| `!ppt [p\|p\|t] [monto]` | Piedra, papel, tijera |
| `!stats [roulette\|fstudio]` | Historial de juegos |

### Tienda
| Comando | Descripción |
|---------|-------------|
| `!shop` | Ver tienda |
| `!buy [id]` | Comprar artículo |
| `!inventory` / `!inv` | Ver inventario |
| `!use [id]` | Activar artículo |

### Utilidades
| Comando | Descripción |
|---------|-------------|
| `!ping` | Latencia del bot |
| `!me` | Tu perfil + enlace web |
| `!sticker` / `!s` | Crear sticker |
| `.insta [url]` | Descargar Instagram |
| `!vv` | Ver mensaje "ver una vez" |
| `!groups` | Listar grupos (solo dueño) |
| `!bot on/off [ID]` | Activar/desactivar grupo (solo dueño) |

## 6. Artículos de la tienda

| ID | Nombre | Precio | Efecto |
|----|--------|--------|--------|
| `shield` | Escudo Antirrobos | 10 RC | Protege de robos 24h |
| `eraser` | Borrador de Advertencias | 200 RC | Elimina 1 advertencia |
| `multiplier` | Multiplicador de Ganancias | 10 RC | x2 en !work por 24h |
| `vv` | Ver mensajes VV | 250 RC | Usar !vv |
| `lock` | Bloqueo de Formato | 120 RC | Bloquear tipo de contenido |
| `unlock` | Desbloqueo de Formato | 100 RC | Desbloquear contenido |
| `insta` | Descarga Instagram | 150 RC | Usar .insta |

## 7. Sistema de niveles

- Cada mensaje suma XP en ese grupo específico
- Nivel máximo: **100**
- XP requerida = `nivel_actual × 50 mensajes`
- Los datos están aislados por grupo (cada grupo es una economía independiente)

## 8. Sistema de préstamos

- Tasa: **20% de interés**
- Plazo: **24 horas**
- Si no paga: entra a **Infocorp** y todos sus ingresos van al pago
- Tras pagar: **72 horas de espera** antes de pedir otro préstamo
- No puede pedir préstamo si está en Infocorp o en el período de espera

## 9. Identificadores de usuario (LID)

Este bot usa el sistema LID de WhatsApp 7.x. El identificador primario de cada usuario es el JID/LID que entrega Baileys, no el número de teléfono. Esto garantiza:
- Sin duplicados de usuarios en la base de datos
- Compatibilidad con grupos grandes donde el número de teléfono no está visible
- Los datos están aislados por grupo automáticamente
