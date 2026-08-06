import makeWASocket, {
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
} from 'baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { loadAuthState } from './auth/authState.js';
import { initFirebase } from './firebase/firebaseClient.js';
import { handleMessage } from './handlers/messageHandler.js';
import { handleGroupParticipantsUpdate } from './handlers/groupParticipantsHandler.js';
import { startScheduler } from './scheduler/scheduler.js';
import { groupMetadataCache } from './utils/groupCache.js';
import { getMessageFromStore, storeMessage } from './utils/messageStore.js';
import { initSendQueue, pauseQueue, getQueueStatus } from './queue/sendQueue.js';
import { startHealthSignal } from './monitoring/healthSignal.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'warn',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

// ─── Estado global de la sesión ────────────────────────────────────────────────
let isFirstOpen = true;         // Solo true una vez por sesión QR nueva
let schedulerStarted = false;
let reconnectAttempts = 0;      // Para backoff exponencial
const MAX_RECONNECT_DELAY = 60000; // 60 segundos como techo de backoff

async function connectToWhatsApp() {
  // Inicializar Firebase (idempotente — safe llamar múltiples veces)
  await initFirebase();

  const { state, saveCreds } = await loadAuthState();

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    // PRD 0.3: Never mark online — evita notificaciones en el teléfono vinculado
    markOnlineOnConnect: false,
    // PRD 0.3: Identificador de navegador fijo — nunca cambiar entre reconexiones
    browser: Browsers.ubuntu('RCoinBot'),
    printQRInTerminal: false,
    // PRD 0.1: Caché de metadatos de grupo — evita requests en cada envío
    cachedGroupMetadata: async (jid) => groupMetadataCache.get(jid) || undefined,
    // PRD 0.1: getMessage — requerido para reintentos y descifrado de encuestas
    getMessage: async (key) => getMessageFromStore(key),
    // PRD 0.1: NO fijar versión del protocolo — dejar el valor por defecto
    // Solución para "Decrypted message with closed session"
    shouldIgnoreJid: () => false,
    // Configuración de retry para mensajes
    retryRequestDelayMs: 350,
  });

  // Inicializar la cola central de envío con el socket actual
  initSendQueue(sock);

  // ── Todos los eventos en sock.ev.process() — recomendado en Baileys 7.x ──
  sock.ev.process(async (events) => {

    // ── Credenciales actualizadas ─────────────────────────────────────────────
    if (events['creds.update']) {
      await saveCreds();
    }

    // ── Ciclo de vida de la conexión ──────────────────────────────────────────
    if (events['connection.update']) {
      const { connection, lastDisconnect, qr } = events['connection.update'];

      // Mostrar QR en terminal cuando no hay sesión válida
      if (qr) {
        const qrTerminal = (await import('qrcode-terminal')).default;
        qrTerminal.generate(qr, { small: true });
        console.log('\n📱 Escanea el QR con WhatsApp → Dispositivos vinculados\n');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode
          : undefined;

        // PRD 0.4: Distinguir motivos de desconexión
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isBadSession = statusCode === DisconnectReason.badSession;

        if (isLoggedOut || isBadSession) {
          // Sesión cerrada realmente — limpiar y pedir nuevo QR
          console.log('🔐 Sesión cerrada o inválida. Limpiando y generando nuevo QR...');
          const { clearAuth } = await import('./auth/authState.js');
          await clearAuth();
          isFirstOpen = true;
          reconnectAttempts = 0;
          connectToWhatsApp();
        } else {
          // PRD 0.3/0.4: Reconexión normal con backoff exponencial
          // Incluye la desconexión forzada post-QR, que es normal y esperada
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
          console.log(`⟳ Reconectando en ${delay}ms (intento ${reconnectAttempts}, código: ${statusCode})...`);

          // PRD 0.3: Pausar la cola ante señales de riesgo (muchos reintentos)
          if (reconnectAttempts >= 5) {
            console.warn('⚠️  Múltiples reconexiones — pausando cola de envío como medida de precaución.');
            pauseQueue();
          }

          setTimeout(connectToWhatsApp, delay);
        }
      } else if (connection === 'open') {
        reconnectAttempts = 0; // Reset backoff en conexión exitosa
        console.log('✅ Conexión con WhatsApp establecida.');
        console.log(`📱 Bot ID: ${sock.user?.id || 'unknown'}`);
        console.log(`🔑 Bot LID: ${sock.user?.lid || 'unknown'}`);

        // Aviso al dueño solo en la primera sesión real (no en cada reconexión menor)
        if (isFirstOpen) {
          isFirstOpen = false;
          const ownerJid = process.env.OWNER_JID;
          if (ownerJid) {
            try {
              // Este envío es directo (único mensaje de arranque, antes de que
              // la cola esté completamente inicializada)
              await sock.sendMessage(ownerJid, {
                text: `🤖 *Bot iniciado correctamente*\n\nListo para recibir comandos.\n📅 _${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}_`,
              });
            } catch (e) {
              console.error('No se pudo enviar el mensaje de inicio al dueño:', e.message);
            }
          }
        }

        // Iniciar el planificador de tareas (solo una vez por proceso)
        if (!schedulerStarted) {
          schedulerStarted = true;
          startScheduler(sock);
          startHealthSignal(); // PRD 0.4: señal de vida periódica
        }
      }
    }

    // ── Caché de metadatos — actualizar solo ante cambios reales ─────────────
    if (events['groups.update']) {
      for (const event of events['groups.update']) {
        try {
          const metadata = await sock.groupMetadata(event.id);
          groupMetadataCache.set(event.id, metadata);
        } catch { /* ignorar errores de fetch */ }
      }
    }

    if (events['group-participants.update']) {
      const event = events['group-participants.update'];
      try {
        const metadata = await sock.groupMetadata(event.id);
        groupMetadataCache.set(event.id, metadata);
      } catch { /* ignorar */ }
      await handleGroupParticipantsUpdate(sock, event);
    }

    // ── Mensajes entrantes ────────────────────────────────────────────────────
    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert'];
      if (type !== 'notify') return;
      for (const msg of messages) {
        storeMessage(msg); // Almacenar para reintentos y poll-decrypt
        await handleMessage(sock, msg);
      }
    }
  });

  return sock;
}

connectToWhatsApp().catch((err) => {
  console.error('[fatal] connectToWhatsApp failed:', err.message);
  process.exit(1);
});
