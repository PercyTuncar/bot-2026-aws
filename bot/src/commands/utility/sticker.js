import { downloadMediaMessage } from 'baileys';
import { getContentType } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { convertToSticker } from '../../workers/stickerWorker.js';

export async function stickerCommand(sock, msg, context) {
  const remoteJid = msg.key.remoteJid;

  const quoted = msg.message?.extendedTextMessage?.contextInfo;
  if (!quoted?.quotedMessage) {
    await enqueueMessage(remoteJid,
      { text: '❌ Responde a una *imagen*, GIF o video corto para convertirlo en sticker.' },
      { quoted: msg }, 1);
    return;
  }

  const quotedMsg = {
    key: { remoteJid, id: quoted.stanzaId, participant: quoted.participant },
    message: quoted.quotedMessage,
  };

  const qType = getContentType(quotedMsg);
  if (!['imageMessage', 'videoMessage', 'stickerMessage'].includes(qType)) {
    await enqueueMessage(remoteJid,
      { text: '❌ Solo puedo convertir *imágenes*, GIFs o videos cortos en stickers.' },
      { quoted: msg }, 1);
    return;
  }

  // Notificar que está procesando (la conversión puede tomar unos segundos)
  await enqueueMessage(remoteJid, { text: '⏳ Convirtiendo sticker...' }, { quoted: msg }, 1);

  try {
    const buffer = await downloadMediaMessage(
      quotedMsg, 'buffer', {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    // PRD 0.5: Conversión delegada a worker_thread — no bloquea el hilo principal
    const webpBuffer = await convertToSticker(buffer);

    await enqueueMessage(remoteJid, { sticker: webpBuffer }, {}, 1);
  } catch (err) {
    await enqueueMessage(remoteJid,
      { text: `❌ Error al crear el sticker: _${err.message}_` },
      { quoted: msg }, 1);
  }
}
