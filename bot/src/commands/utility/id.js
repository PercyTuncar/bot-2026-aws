import { enqueueMessage } from '../../queue/sendQueue.js';

/**
 * !id — Envía el LID del usuario en el chat del grupo y lo elimina después de 40 segundos
 */
export async function idCommand(sock, msg, context) {
  const { senderJid, isGroup } = context;
  const remoteJid = msg.key.remoteJid;

  if (!isGroup) {
    await enqueueMessage(remoteJid, {
      text: '❌ Este comando solo funciona en grupos.',
    }, { quoted: msg }, 1);
    return;
  }

  // Extraer el LID del usuario (formato: numero:XX@s.whatsapp.net o numero:XX@lid)
  const userLid = senderJid.split('@')[0]; // Obtiene "51999999999:12" o similar
  const lidNumber = userLid.split(':')[0]; // Obtiene solo "51999999999"

  const panelUrl = process.env.PANEL_WEB_URL || 'http://localhost:3000';
  const updateUrl = `${panelUrl}/update`;

  // Enviar el ID respondiendo al mensaje del usuario
  const sentMessage = await sock.sendMessage(remoteJid, {
    text: `🆔 *Tu Número de Identificación*\n\n` +
          `Para actualizar tu perfil:\n\n` +
          `1️⃣ Entra aquí: ${updateUrl}\n\n` +
          `2️⃣ Copia y pega este ID:\n` +
          `\`\`\`${lidNumber}\`\`\`\n\n` +
          `_⚠️ Este mensaje se eliminará en 40 segundos._`,
  }, { quoted: msg });

  // Programar eliminación del mensaje después de 40 segundos
  setTimeout(async () => {
    try {
      await sock.sendMessage(remoteJid, {
        delete: sentMessage.key,
      });
      console.log(`[idCommand] Mensaje ID eliminado para ${senderJid}`);
    } catch (error) {
      console.error('[idCommand] Error eliminando mensaje:', error.message);
    }
  }, 40000); // 40 segundos
}
