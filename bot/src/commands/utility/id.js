import { enqueueMessage } from '../../queue/sendQueue.js';

/**
 * !id — Envía por mensaje privado el LID del usuario para usar en el panel web
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

  // Enviar mensaje al grupo confirmando
  await enqueueMessage(msg.key.remoteJid, {
    text: '✅ Te envié tu ID por mensaje privado.',
  }, { quoted: msg }, 1);

  // Enviar el ID por privado
  const userPrivateJid = senderJid.replace('@g.us', '').split('@')[0] + '@s.whatsapp.net';

  try {
    await enqueueMessage(userPrivateJid, {
      text: `🆔 *Tu Número de Identificación*\n\n` +
            `Para actualizar tu perfil, sigue estos pasos:\n\n` +
            `1. Entra a este enlace:\n${updateUrl}\n\n` +
            `2. Copia y pega tu ID cuando te lo pida 👇`,
    }, {}, 1);

    // Enviar el ID en un mensaje separado para que sea fácil de copiar
    await enqueueMessage(userPrivateJid, {
      text: lidNumber,
    }, {}, 1);
  } catch (error) {
    console.error('[idCommand] Error enviando DM:', error);
    await enqueueMessage(msg.key.remoteJid, {
      text: '❌ No pude enviarte el mensaje privado. Asegúrate de tener mi número guardado o de haberme enviado un mensaje primero.',
    }, { quoted: msg }, 1);
  }
}
