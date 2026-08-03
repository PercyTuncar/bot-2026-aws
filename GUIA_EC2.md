# 🚀 Guía Completa: Desplegar Bot de WhatsApp en AWS EC2

Esta guía te lleva paso a paso desde cero hasta tener tu bot funcionando 24/7 en AWS EC2.

---

## 📋 Requisitos Previos

- ✅ Cuenta de AWS con una instancia EC2 Ubuntu 26.04 corriendo
- ✅ Acceso SSH a tu EC2 (archivo .pem o contraseña)
- ✅ Proyecto Firebase creado con Firestore activado
- ✅ WhatsApp en tu teléfono para escanear el QR

---

## 🔌 PASO 1: Conectar a tu EC2 por SSH

Desde tu computadora local (Windows):

### Opción A: Con archivo .pem (recomendado)
```bash
ssh -i "tu-archivo.pem" ubuntu@tu-ip-publica-ec2
```

### Opción B: Con contraseña
```bash
ssh ubuntu@tu-ip-publica-ec2
# Ingresa tu contraseña cuando te la pida
```

**Reemplaza:**
- `tu-archivo.pem` → Ruta a tu archivo de clave privada
- `tu-ip-publica-ec2` → La IP pública de tu instancia EC2 (ejemplo: `18.191.123.45`)

---

## 📦 PASO 2: Actualizar el Sistema

Una vez dentro de tu EC2, ejecuta:

```bash
sudo apt update
sudo apt upgrade -y
```

Esto actualiza todos los paquetes del sistema. Toma unos minutos.

---

## 🟢 PASO 3: Instalar Node.js 20

El bot requiere Node.js 20 o superior. Vamos a instalarlo con `nvm`:

```bash
# Instalar nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Cargar nvm en la sesión actual
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalar Node.js 20
nvm install 20

# Usar Node.js 20 por defecto
nvm use 20
nvm alias default 20

# Verificar instalación
node -v   # Debe mostrar: v20.x.x
npm -v    # Debe mostrar: 10.x.x
```

**✅ Checkpoint:** Debes ver las versiones de Node.js y npm correctamente.

---

## 📥 PASO 4: Clonar el Repositorio desde GitHub

```bash
# Ir al directorio home
cd ~

# Clonar el repositorio
git clone https://github.com/PercyTuncar/bot-2026-aws.git

# Entrar al proyecto
cd bot-2026-aws

# Ver los archivos
ls -la
```

**✅ Checkpoint:** Debes ver las carpetas `bot/`, `panel-web/`, y archivos como `ecosystem.config.cjs`, `README.md`.

---

## ⚙️ PASO 5: Configurar Variables de Entorno

Este es el paso MÁS IMPORTANTE. Aquí defines tus credenciales de Firebase y configuraciones.

```bash
# Entrar a la carpeta del bot
cd ~/bot-2026-aws/bot

# Copiar el ejemplo de variables de entorno
cp .env.example .env

# Editar el archivo .env
nano .env
```

### 📝 Qué editar en el archivo `.env`:

Vas a reemplazar estos valores con TUS datos reales:

```env
# 1. TU NÚMERO DE WHATSAPP (el dueño del bot)
OWNER_JID=51999999999@s.whatsapp.net
# Formato: código_país + número + @s.whatsapp.net
# Ejemplo para Perú: 51944784488@s.whatsapp.net

# 2. CREDENCIALES DE FIREBASE
FIREBASE_PROJECT_ID=tu-proyecto-firebase
# Lo encuentras en: Firebase Console → Configuración del proyecto → ID del proyecto

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
# Lo encuentras en: Firebase Console → Configuración → Cuentas de servicio → Generar nueva clave privada
# Está en el archivo JSON que descargas

FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
# IMPORTANTE: Debe estar entre comillas dobles y con \n para los saltos de línea
# Copia la clave privada completa del JSON de Firebase
# NO QUITES los \n ni las comillas

# 3. CONFIGURACIÓN DEL BOT
AUTH_STATE_DIR=./auth_state
# NO CAMBIAR - carpeta donde se guarda la sesión de WhatsApp

PANEL_WEB_URL=https://tu-panel.vercel.app
# Si no tienes panel web, déjalo como está por ahora

PLIN_NUMBER=999999999
# Tu número de Plin para las recargas (sin prefijo)

EXCHANGE_RATE=1000
# Tasa de cambio: 1 sol = 1000 RCoins

BOT_NAME=RCoin Bot
# Nombre de tu bot (puedes cambiarlo)

LOG_MESSAGES=true
# Dejar en true para ver logs detallados
```

### 🔑 Cómo obtener las credenciales de Firebase:

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto (o créalo)
3. Ve a **⚙️ Configuración del proyecto** (rueda dentada arriba a la izquierda)
4. Ve a **Cuentas de servicio**
5. Haz clic en **Generar nueva clave privada**
6. Se descargará un archivo JSON
7. Abre ese JSON y copia:
   - `project_id` → va en `FIREBASE_PROJECT_ID`
   - `client_email` → va en `FIREBASE_CLIENT_EMAIL`
   - `private_key` → va en `FIREBASE_PRIVATE_KEY` (¡CON las comillas y \n!)

### 💾 Guardar el archivo .env:

1. Presiona `Ctrl + O` (guardar)
2. Presiona `Enter` (confirmar nombre)
3. Presiona `Ctrl + X` (salir)

**✅ Checkpoint:** Verifica que guardaste correctamente:
```bash
cat .env | head -5
# Debes ver tus valores reales, NO los de ejemplo
```

---

## 📦 PASO 6: Instalar Dependencias del Bot

```bash
# Asegúrate de estar en ~/bot-2026-aws/bot
cd ~/bot-2026-aws/bot

# Instalar todas las dependencias
npm install
```

Esto instalará:
- `baileys` (librería de WhatsApp)
- `firebase-admin` (para conectar a Firestore)
- `sharp` (para procesar imágenes/stickers)
- Y todas las demás dependencias

**⏱️ Toma 2-5 minutos.** Verás muchas líneas instalando paquetes.

**✅ Checkpoint:** Al final debe decir algo como:
```
added XXX packages in XXs
```

---

## 📱 PASO 7: Primera Ejecución - Vincular WhatsApp

Ahora vamos a ejecutar el bot por primera vez para vincular tu WhatsApp:

```bash
# Ejecutar el bot manualmente
node src/index.js
```

### 🔍 Qué debes ver:

1. **Si todo está bien configurado**, verás:
   ```
   📱 Escanea el QR con WhatsApp → Dispositivos vinculados
   
   [Un código QR aparecerá en la terminal]
   ```

2. **Escanea el QR:**
   - Abre WhatsApp en tu teléfono
   - Ve a **⋮ (menú)** → **Dispositivos vinculados**
   - Toca **"Vincular un dispositivo"**
   - Escanea el QR que aparece en tu terminal

3. **Espera la conexión:**
   ```
   ✅ Conexión con WhatsApp establecida.
   📱 Bot ID: 51999999999:XX@s.whatsapp.net
   🔑 Bot LID: 51999999999:XX@lid
   ```

4. **Verás un mensaje en tu WhatsApp** (en tu chat personal):
   ```
   🤖 Bot iniciado correctamente
   
   Listo para recibir comandos.
   📅 [fecha y hora]
   ```

**🎉 ¡Perfecto!** El bot está conectado.

### ⚠️ IMPORTANTE:
- **NO cierres la terminal todavía**
- El bot está corriendo, pero si cierras la terminal, se detendrá
- Primero vamos a probar que funcione

---

## ✅ PASO 8: Probar el Bot

**Mientras el bot sigue corriendo**, desde tu WhatsApp:

1. **Envía al bot por mensaje privado:**
   ```
   !ping
   ```
   
   **Debe responder:** 
   ```
   🏓 Pong! Latencia: XX ms
   ```

2. **Pide tu perfil:**
   ```
   !me
   ```
   
   **Debe mostrar:** Tu información de usuario

3. **Ver comandos disponibles:**
   ```
   !help
   ```

**✅ Si responde correctamente:** ¡El bot funciona! 🎉

---

## 🛑 PASO 9: Detener el Bot (por ahora)

Ahora que verificaste que funciona, detén el bot manualmente:

```bash
# En la terminal donde está corriendo, presiona:
Ctrl + C
```

El bot se detendrá. Esto es normal, ahora lo vamos a configurar para que corra 24/7.

---

## 🔄 PASO 10: Instalar PM2 (Gestor de Procesos)

PM2 es un gestor de procesos que mantendrá tu bot corriendo 24/7, incluso si se reinicia el servidor.

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Verificar instalación
pm2 -v
```

**✅ Checkpoint:** Debes ver la versión de PM2 (ejemplo: `5.x.x`)

---

## 🚀 PASO 11: Iniciar el Bot con PM2

Ahora vamos a iniciar el bot con PM2 para que corra permanentemente:

```bash
# Ir a la raíz del proyecto
cd ~/bot-2026-aws

# Crear carpeta de logs
mkdir -p bot/logs

# Iniciar el bot con PM2
pm2 start ecosystem.config.cjs

# Ver el estado
pm2 status
```

### 🔍 Qué debes ver:

```
┌────┬─────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id │ name            │ mode        │ status  │ cpu     │ memory   │
├────┼─────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0  │ whatsapp-bot    │ fork        │ online  │ 0%      │ 50.2mb   │
└────┴─────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

**✅ Si el `status` dice `online`:** ¡Perfecto! El bot está corriendo.

---

## 📊 PASO 12: Ver los Logs del Bot

Para ver lo que está haciendo el bot en tiempo real:

```bash
# Ver logs en vivo
pm2 logs whatsapp-bot

# Ver solo los últimos 100 líneas
pm2 logs whatsapp-bot --lines 100

# Salir de los logs: Ctrl + C
```

**✅ Debes ver:**
```
✅ Conexión con WhatsApp establecida.
📱 Bot ID: 51999999999:XX@s.whatsapp.net
```

---

## 💾 PASO 13: Guardar Configuración de PM2

Para que PM2 recuerde tu bot:

```bash
pm2 save
```

**Respuesta esperada:**
```
[PM2] Saving current process list...
[PM2] Successfully saved in ~/.pm2/dump.pm2
```

---

## 🔁 PASO 14: Auto-Inicio al Reiniciar EC2

Para que el bot se inicie automáticamente si tu servidor se reinicia:

```bash
pm2 startup
```

**Te mostrará un comando como este:**
```bash
sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/v20.x.x/bin /home/ubuntu/.nvm/versions/node/v20.x.x/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

**Copia y ejecuta ese comando completo** que PM2 te mostró.

Luego:
```bash
pm2 save
```

**✅ ¡Listo!** Ahora tu bot:
- Corre 24/7
- Se reinicia automáticamente si hay un error
- Se inicia automáticamente si reinician el servidor EC2

---

## 🎮 PASO 15: Activar el Bot en un Grupo

### 1. Añade el bot a un grupo de WhatsApp

Usa el número que vinculaste (tu WhatsApp).

### 2. Obtén el ID del grupo

Envía al bot por **mensaje privado**:
```
!groups
```

**Respuesta:**
```
📋 Grupos disponibles:

1. Mi Grupo Test
   ID: 120363123456789012@g.us
   Activo: ❌

2. Otro Grupo
   ID: 120363987654321098@g.us
   Activo: ❌
```

### 3. Activa el bot en ese grupo

Copia el ID del grupo y envía:
```
!bot on 120363123456789012@g.us
```

**Respuesta:**
```
✅ Bot activado en el grupo: Mi Grupo Test
```

### 4. Prueba en el grupo

Ve al grupo y escribe:
```
!ping
```

**El bot debe responder en el grupo:** 🏓 Pong!

---

## 📚 Comandos Útiles de PM2

### Ver estado del bot:
```bash
pm2 status
```

### Ver logs en tiempo real:
```bash
pm2 logs whatsapp-bot
```

### Reiniciar el bot:
```bash
pm2 restart whatsapp-bot
```

### Detener el bot:
```bash
pm2 stop whatsapp-bot
```

### Iniciar el bot (si está detenido):
```bash
pm2 start whatsapp-bot
```

### Eliminar el bot de PM2:
```bash
pm2 delete whatsapp-bot
```

### Ver información detallada:
```bash
pm2 info whatsapp-bot
```

### Ver uso de recursos:
```bash
pm2 monit
```

---

## 🔐 Seguridad: Configurar Security Group en AWS

Para mayor seguridad, configura el Security Group de tu EC2:

### Reglas de entrada (Inbound):
- ✅ **Puerto 22** (SSH) - Solo desde TU IP (no 0.0.0.0/0)

### Reglas de salida (Outbound):
- ✅ **Todo el tráfico** - Permitir (el bot hace conexiones salientes)

**El bot NO necesita puertos abiertos**, solo conexiones salientes a WhatsApp y Firebase.

---

## 🆘 Solución de Problemas

### ❌ El bot no muestra el QR

**Posible causa:** Variables de entorno mal configuradas.

**Solución:**
```bash
cd ~/bot-2026-aws/bot
cat .env
# Verifica que tus credenciales de Firebase estén correctas
```

### ❌ Error: "Firebase project not found"

**Solución:**
- Verifica que `FIREBASE_PROJECT_ID` sea correcto
- Verifica que el proyecto exista en Firebase Console
- Asegúrate de que Firestore esté activado

### ❌ El bot se desconecta constantemente

**Solución:**
```bash
# Ver los logs para identificar el error
pm2 logs whatsapp-bot --lines 200

# Reiniciar el bot
pm2 restart whatsapp-bot
```

### ❌ "ECONNREFUSED" o errores de red

**Solución:**
- Verifica tu conexión a internet en EC2: `ping google.com`
- Verifica que el Security Group permita tráfico saliente

### ❌ El bot no responde en los grupos

**Solución:**
1. Verifica que el bot esté online: `pm2 status`
2. Verifica que el grupo esté activado: `!groups` (por DM)
3. Activa el grupo: `!bot on ID_DEL_GRUPO`

### ❌ Perdiste la sesión de WhatsApp

**Solución:**
```bash
# Detener el bot
pm2 stop whatsapp-bot

# Borrar la sesión
rm -rf ~/bot-2026-aws/bot/auth_state/*

# Reiniciar el bot
pm2 restart whatsapp-bot

# Ver logs y escanear el nuevo QR
pm2 logs whatsapp-bot
```

---

## 🎯 Verificación Final: ¿Todo está corriendo?

Ejecuta este checklist:

```bash
# 1. ¿Node.js está instalado?
node -v  # Debe mostrar v20.x.x

# 2. ¿El bot está online en PM2?
pm2 status  # Status debe ser "online"

# 3. ¿Los logs muestran conexión exitosa?
pm2 logs whatsapp-bot --lines 20

# 4. ¿El bot responde en WhatsApp?
# Envía: !ping (por DM al bot)

# 5. ¿PM2 se auto-inicia?
systemctl status pm2-ubuntu  # Debe estar "active (running)"
```

**✅ Si todos dan OK:** ¡Tu bot está corriendo perfectamente 24/7! 🎉

---

## 📞 Comandos Básicos del Bot

### Para probar que funciona:

**En mensaje privado (DM con el bot):**
```
!ping          - Ver latencia
!me            - Tu perfil
!groups        - Lista de grupos
!bot on [ID]   - Activar en grupo
!bot off [ID]  - Desactivar en grupo
```

**En el grupo (después de activarlo):**
```
!work          - Trabajar y ganar RCoins
!balance       - Ver tu saldo
!shop          - Ver la tienda
!slot 100      - Jugar tragamonedas con 100 RC
!help          - Ver todos los comandos
```

---

## 🎉 ¡Felicitaciones!

Tu bot de WhatsApp está corriendo 24/7 en AWS EC2. Ahora puedes:

- ✅ Usarlo en múltiples grupos
- ✅ Desconectarte de SSH sin que se detenga
- ✅ Reiniciar el servidor EC2 y el bot volverá a iniciarse solo
- ✅ Ver los logs en cualquier momento con `pm2 logs`

---

## 📖 Documentación Adicional

- **Comandos completos:** Ver [DEPLOYMENT.md](DEPLOYMENT.md)
- **Repositorio GitHub:** https://github.com/PercyTuncar/bot-2026-aws
- **Firebase Console:** https://console.firebase.google.com
- **PM2 Documentación:** https://pm2.keymetrics.io/docs/

---

**¿Problemas?** Revisa la sección "Solución de Problemas" arriba o verifica los logs con `pm2 logs whatsapp-bot`.
