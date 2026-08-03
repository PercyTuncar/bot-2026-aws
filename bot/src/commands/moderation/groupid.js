import { enqueueMessage } from '../../queue/sendQueue.js';

export async function groupidCommand(sock, msg, context) {
  const { groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  // Extraer solo el ID numérico (sin @g.us)
  const numericId = groupJid.replace('@g.us', '');

  await enqueueMessage(remoteJid, {
    text: `🆔 *ID del grupo*\n\n\`\`\`${numericId}\`\`\``,
  }, { quoted: msg }, 1);
}
