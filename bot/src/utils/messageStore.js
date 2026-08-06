// In-memory message store for retry support and poll vote decryption.
// Baileys requires a getMessage function that retrieves a previously sent/received message.
// We keep the last 200 messages in memory (rolling window) with TTL of 10 minutes.

const MAX_MESSAGES = 200;
const MESSAGE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const messageMap = new Map();
const messageOrder = [];

export function storeMessage(msg) {
  if (!msg?.key?.id) return;
  const key = `${msg.key.remoteJid}-${msg.key.id}`;
  const timestamp = Date.now();

  messageMap.set(key, {
    message: msg.message,
    storedAt: timestamp,
  });

  messageOrder.push(key);

  // Limpiar mensajes antiguos por cantidad
  if (messageOrder.length > MAX_MESSAGES) {
    const oldest = messageOrder.shift();
    messageMap.delete(oldest);
  }

  // Limpiar mensajes antiguos por tiempo (TTL)
  cleanupExpiredMessages();
}

export function getMessageFromStore(key) {
  const storeKey = `${key.remoteJid}-${key.id}`;
  const entry = messageMap.get(storeKey);

  if (!entry) return undefined;

  // Verificar si el mensaje ha expirado
  const age = Date.now() - entry.storedAt;
  if (age > MESSAGE_TTL_MS) {
    messageMap.delete(storeKey);
    return undefined;
  }

  return entry.message;
}

function cleanupExpiredMessages() {
  const now = Date.now();
  const expiredKeys = [];

  for (const [key, entry] of messageMap.entries()) {
    const age = now - entry.storedAt;
    if (age > MESSAGE_TTL_MS) {
      expiredKeys.push(key);
    }
  }

  // Eliminar mensajes expirados
  for (const key of expiredKeys) {
    messageMap.delete(key);
    const index = messageOrder.indexOf(key);
    if (index > -1) {
      messageOrder.splice(index, 1);
    }
  }

  if (expiredKeys.length > 0) {
    console.log(`[messageStore] Cleaned up ${expiredKeys.length} expired messages`);
  }
}
