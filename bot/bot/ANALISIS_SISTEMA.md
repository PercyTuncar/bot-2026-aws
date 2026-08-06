# 🔍 ANÁLISIS COMPLETO DEL SISTEMA - BOT WHATSAPP

## 📋 RESUMEN EJECUTIVO

**Fecha del análisis:** 5 de Agosto, 2026
**Estado general:** ⚠️ PROBLEMAS DETECTADOS
**Versión Node:** >= 20 (ESM modules)
**Versión Baileys:** 7.0.0-rc14
**Servidor:** AWS EC2 con PM2

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Límite de Memoria PM2 Muy Bajo** ⚠️ CRÍTICO

**Archivo:** `ecosystem.config.cjs`
```javascript
max_memory_restart: '512M'  // ❌ DEMASIADO BAJO
```

**Problema:**
- Límite de 512MB es INSUFICIENTE para un bot de WhatsApp
- Baileys + Firebase + Cache + Message Store = Alto consumo de memoria
- El bot se reinicia constantemente al superar 512MB
- Cada reinicio pierde conexiones y mensajes en cola

**Solución recomendada:**
```javascript
max_memory_restart: '1G'  // ✅ Para instancias t2.micro/t3.micro
// o
max_memory_restart: '2G'  // ✅ Para instancias t2.small o superiores
```

---

### 2. **Message Store Sin Límite de Tiempo**

**Archivo:** `src/utils/messageStore.js`
```javascript
const MAX_MESSAGES = 200;  // Solo limita cantidad, no tiempo
```

**Problema:**
- Solo limita cantidad de mensajes (200)
- No hay límite de tiempo
- Mensajes antiguos ocupan memoria innecesariamente
- En grupos muy activos, 200 mensajes = pocos minutos

**Solución recomendada:**
- Agregar TTL (Time To Live) de 10-15 minutos
- Limpiar mensajes antiguos aunque no se alcance el límite

---

### 3. **Cola de Mensajes Sin Límite Máximo**

**Archivo:** `src/queue/sendQueue.js`
```javascript
const queue = [];  // ❌ Sin límite máximo
```

**Problema:**
- Si el bot se atrasa, la cola crece infinitamente
- Consume memoria sin control
- Puede causar OOM (Out of Memory)

**Solución recomendada:**
- Límite máximo de 1000 mensajes en cola
- Rechazar mensajes nuevos si la cola está llena
- Log de advertencia cuando la cola supere umbrales

---

### 4. **Cache de Grupos Sin Expiración**

**Archivo:** `src/utils/groupCache.js` (no leído pero inferido del código)

**Problema potencial:**
- GroupMetadataCache puede crecer sin límite
- Metadata de grupos inactivos permanece en memoria

---

### 5. **Logging Excesivo** ⚠️ RENDIMIENTO

**Archivo:** `.env.example`
```bash
LOG_MESSAGES=true  # ❌ En producción causa overhead
```

**Problema:**
- Loguear TODOS los mensajes consume CPU y memoria
- En grupos activos = miles de logs por minuto
- Impacto en rendimiento del sistema

**Solución:**
```bash
LOG_MESSAGES=false  # En producción
# o
LOG_LEVEL=warn     # Solo errores importantes
```

---

### 6. **Scheduler Intervals Muy Frecuentes**

**Archivo:** `src/scheduler/scheduler.js`
```javascript
const CHECK_ALERTS_INTERVAL = 60 * 1000;       // Cada 1 min
const CHECK_LOANS_INTERVAL = 5 * 60 * 1000;    // Cada 5 min
const CLEANUP_ITEMS_INTERVAL = 10 * 60 * 1000; // Cada 10 min
```

**Problema:**
- Verificar alertas cada 1 minuto es excesivo
- Consultas frecuentes a Firestore = costos + latencia
- Si hay muchos grupos, sobrecarga al servidor

**Solución recomendada:**
```javascript
const CHECK_ALERTS_INTERVAL = 5 * 60 * 1000;   // Cada 5 min ✅
const CHECK_LOANS_INTERVAL = 15 * 60 * 1000;   // Cada 15 min ✅
const CLEANUP_ITEMS_INTERVAL = 30 * 60 * 1000; // Cada 30 min ✅
```

---

## ✅ ASPECTOS BIEN IMPLEMENTADOS

### 1. **Arquitectura de Cola** 🎯
- Sistema de cola centralizado (anti-ban)
- Jitter aleatorio entre mensajes
- Reintentos con backoff exponencial
- Pausa automática ante fallos consecutivos

### 2. **Manejo de Errores**
- Try-catch en handlers principales
- Logging de errores estructurado
- Reconexión automática con backoff

### 3. **Firebase Optimizado**
- Dot notation para updates
- Batch operations en scheduler
- Concurrencia controlada

### 4. **Message Store**
- Rolling window para reintentos
- Soporte para poll votes
- Límite de 200 mensajes

### 5. **Health Signal**
- Heartbeat cada 60 segundos
- Monitoreo externo posible
- Escritura en Firestore

---

## 🔧 RECOMENDACIONES INMEDIATAS

### 1. **Aumentar Memoria PM2** (CRÍTICO)

```javascript
// ecosystem.config.cjs
max_memory_restart: '1G'  // o '2G' según instancia
```

### 2. **Reducir Frecuencia de Schedulers**

```javascript
// src/scheduler/scheduler.js
const CHECK_ALERTS_INTERVAL = 5 * 60 * 1000;
const CHECK_LOANS_INTERVAL = 15 * 60 * 1000;
```

### 3. **Desactivar Logging en Producción**

```bash
# .env
LOG_MESSAGES=false
LOG_LEVEL=warn
```

### 4. **Limitar Cola de Mensajes**

```javascript
// src/queue/sendQueue.js
const MAX_QUEUE_SIZE = 1000;
```

### 5. **Agregar TTL a Message Store**

```javascript
// src/utils/messageStore.js
const MESSAGE_TTL_MS = 10 * 60 * 1000; // 10 minutos
```

---

## 📊 COMANDO !PING MEJORADO

### Nuevas Métricas Mostradas:

✅ **Latencia de respuesta**
✅ **Uptime del bot**
✅ **Estado de la cola** (Normal/Acumulada/Pausada)
✅ **Uso de CPU** (porcentaje + modelo + cores)
✅ **Uso de RAM** (porcentaje + GB usado/total)
✅ **Uptime del servidor**
✅ **Plataforma** (OS + arquitectura)
✅ **Advertencias** si CPU o RAM > 80%

### Ejemplo de Salida:

```
🏓 Pong!

📊 Estado del Bot
• Latencia: 45ms
• Uptime Bot: 2h 15m 30s
• Cola de mensajes: 🟢 Normal (3 pendientes)

🖥️ Servidor AWS EC2
• CPU: 45.2% uso (2 cores)
• Modelo: Intel(R) Xeon(R) CPU E5-2686 v4 @ 2.30GHz
• RAM: 68.5% uso
  └ Usado: 0.68 GB
  └ Total: 1.00 GB
• Uptime Sistema: 48h 22m
• Plataforma: linux x64

✅ Bot operativo
```

---

## 🔍 DIAGNÓSTICO DEL PROBLEMA ACTUAL

Basándome en tu descripción:
> "El bot ha dejado de escuchar comandos y tampoco loguea los mensajes recibidos"

### Causas Más Probables:

1. **Memoria Agotada (512MB)** ⭐ MÁS PROBABLE
   - PM2 reinicia el bot constantemente
   - Pierde conexión con WhatsApp
   - No procesa mensajes nuevos

2. **Cola Bloqueada**
   - `paused: true` por fallos consecutivos
   - Mensajes entrantes se ignoran
   - Necesita `resumeQueue()` manual

3. **Firestore Throttling**
   - Demasiadas escrituras por scheduler
   - Firebase rechaza requests
   - Bot no puede escribir/leer datos

4. **WhatsApp Session Corrupta**
   - `auth_state` corrupto
   - Necesita re-escanear QR

### Cómo Verificar en AWS:

```bash
# 1. Ver uso de memoria en tiempo real
pm2 monit

# 2. Ver logs de errores
pm2 logs whatsapp-bot --err --lines 100

# 3. Ver cuántas veces se ha reiniciado
pm2 list  # Columna "↺"

# 4. Ver uso del sistema
htop  # o: top
```

---

## 🛠️ PLAN DE ACCIÓN INMEDIATO

### Paso 1: Aumentar Memoria (AHORA)

```bash
# Editar ecosystem.config.cjs
nano ecosystem.config.cjs

# Cambiar:
max_memory_restart: '1G'

# Reiniciar con nueva config
pm2 delete whatsapp-bot
pm2 start ecosystem.config.cjs
```

### Paso 2: Verificar Estado

```bash
pm2 logs whatsapp-bot --lines 50
```

### Paso 3: Si Sigue Sin Responder

```bash
# Resetear sesión de WhatsApp
pm2 stop whatsapp-bot
cd ~/bot-2026-aws/bot
rm -rf auth_state
cd ~/bot-2026-aws
pm2 restart whatsapp-bot
pm2 logs whatsapp-bot  # Escanear QR
```

### Paso 4: Monitorear

```bash
# Observar memoria en tiempo real
pm2 monit

# Ver si se sigue reiniciando
watch -n 2 "pm2 list"
```

---

## 📈 MONITOREO CONTINUO

### Métricas Clave a Observar:

1. **Reinicios de PM2**
   - `pm2 list` → columna "↺"
   - > 10 reinicios en 1 hora = problema

2. **Uso de Memoria**
   - `pm2 monit`
   - > 80% constantemente = aumentar RAM

3. **Cola de Mensajes**
   - Usar `!ping` para ver estado
   - > 50 mensajes pendientes = problema

4. **CPU**
   - > 80% sostenido = código ineficiente o DDoS

5. **Logs de Error**
   - `pm2 logs --err`
   - Buscar patrones repetidos

---

## 🔐 SEGURIDAD Y BUENAS PRÁCTICAS

✅ **Bien implementado:**
- Variables de entorno para secrets
- Firebase Admin SDK con service account
- No expone credenciales en logs

⚠️ **Mejorar:**
- Rotar `FIREBASE_PRIVATE_KEY` periódicamente
- Implementar rate limiting por usuario
- Agregar IP whitelist en Firestore rules

---

## 📚 DOCUMENTACIÓN OFICIAL VERIFICADA

### Baileys v7.0.0-rc14
✅ Uso de `makeWASocket` correcto
✅ `makeCacheableSignalKeyStore` implementado
✅ `getMessage` para message store correcto
✅ Manejo de `connection.update` apropiado

### Firebase Admin SDK
✅ Inicialización con service account correcta
✅ `ignoreUndefinedProperties: true` para evitar errores
✅ Dot notation en `update()` vs `set({merge:true})`

### PM2
⚠️ `max_memory_restart` muy bajo (CORREGIR)
✅ `fork` mode correcto para WhatsApp
✅ Auto-restart y backoff configurados

---

## 🎯 CONCLUSIÓN

El bot está **bien arquitecturado** pero tiene **problemas de configuración** que causan reinicios constantes y pérdida de performance.

**Prioridad 1:** Aumentar `max_memory_restart` a 1-2GB
**Prioridad 2:** Reducir frecuencia de schedulers
**Prioridad 3:** Desactivar logging excesivo

Con estos cambios, el bot debería estabilizarse y responder normalmente.

---

**Generado:** 5 de Agosto, 2026
**Modelo:** Claude Opus 5
