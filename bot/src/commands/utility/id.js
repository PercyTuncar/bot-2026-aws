import { enqueueMessage } from '../../queue/sendQueue.js';

/**
 * !id — Envía el LID del usuario en el chat del grupo
 */
export async function idCommand(sock, msg, context) {
  const { senderJid, isGroup } = context;

  if (!isGroup) {
    await enqueueMessage(msg.key.remoteJid, {
      text: '❌ Este comando solo funciona en grupos.',
    }, { quoted: msg }, 1);
    return;
  }

  // Extraer el LID del usuario (formato: numero:XX@s.whatsapp.net o numero:XX@lid)
  const userLid = senderJid.split('@')[0]; // Obtiene "51999999999:12" o similar
  const lidNumber = userLid.split(':')[0]; // Obtiene solo "51999999999"

  const panelUrl = process.env.PANEL_WEB_URL || 'http://localhost:3000';
  const updateUrl = `${panelUrl}/update`;

  // Enviar el ID respondiendo al mensaje del usuario (más privado)
  await enqueueMessage(msg.key.remoteJid, {
    text: `🆔 *Tu Número de Identificación*\n\n` +
          `Para actualizar tu perfil:\n\n` +
          `1️⃣ Entra aquí: ${updateUrl}\n\n` +
          `2️⃣ Copia y pega este ID:\n` +
          `\`\`\`${lidNumber}\`\`\`\n\n` +
          `_⚠️ No compartas este ID con nadie._`,
  }, { quoted: msg }, 1);
}
