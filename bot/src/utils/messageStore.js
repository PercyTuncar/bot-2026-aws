// In-memory message store for retry support and poll vote decryption.
// Baileys requires a getMessage function that retrieves a previously sent/received message.
// We keep the last 200 messages in memory (rolling window).

const MAX_MESSAGES = 200;
const messageMap = new Map();
const messageOrder = [];

export function storeMessage(msg) {
  if (!msg?.key?.id) return;
  const key = `${msg.key.remoteJid}-${msg.key.id}`;
  messageMap.set(key, msg.message);
  messageOrder.push(key);
  if (messageOrder.length > MAX_MESSAGES) {
    const oldest = messageOrder.shift();
    messageMap.delete(oldest);
  }
}

export function getMessageFromStore(key) {
  const storeKey = `${key.remoteJid}-${key.id}`;
  return messageMap.get(storeKey) || undefined;
}
