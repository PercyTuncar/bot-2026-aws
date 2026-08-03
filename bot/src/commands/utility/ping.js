import { enqueueMessage } from '../../queue/sendQueue.js';

export async function pingCommand(sock, msg, context) {
  const startTime = Date.now();
  const remoteJid = msg.key.remoteJid;

  // Responder a través de la cola central (como todo mensaje saliente)
  await enqueueMessage(remoteJid,
    { text: `🏓 *Pong!*\n\n• Latencia: *${Date.now() - startTime}ms*` },
    { quoted: msg }, 1);
}
