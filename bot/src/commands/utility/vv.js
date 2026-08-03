import { downloadMediaMessage } from 'baileys';
import { getContentType } from '../../utils/helpers.js';

export async function vvCommand(sock, msg, context) {
  const remoteJid = msg.key.remoteJid;

  const quoted = msg.message?.extendedTextMessage?.contextInfo;
  if (!quoted?.quotedMessage) {
    await sock.sendMessage(remoteJid, {
      text: '❌ Responde a un mensaje de "ver una vez" para revelarlo.',
    }, { quoted: msg });
    return;
  }

  const qMsg = quoted.quotedMessage;
  const isViewOnce =
    qMsg?.viewOnceMessage ||
    qMsg?.viewOnceMessageV2 ||
    qMsg?.viewOnceMessageV2Extension ||
    qMsg?.imageMessage?.viewOnce ||
    qMsg?.videoMessage?.viewOnce ||
    qMsg?.audioMessage?.viewOnce;

  if (!isViewOnce) {
    await sock.sendMessage(remoteJid, {
      text: '❌ Ese mensaje no es de "ver una vez".',
    }, { quoted: msg });
    return;
  }

  const realMessage = qMsg?.viewOnceMessage?.message ||
    qMsg?.viewOnceMessageV2?.message ||
    qMsg;

  const quotedMsg = {
    key: {
      remoteJid,
      id: quoted.stanzaId,
      participant: quoted.participant,
    },
    message: realMessage,
  };

  try {
    const buffer = await downloadMediaMessage(
      quotedMsg,
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    const type = getContentType(quotedMsg);

    if (type === 'imageMessage' || realMessage?.imageMessage) {
      await sock.sendMessage(remoteJid, { image: buffer, caption: '👁️ Mensaje de ver una vez revelado' });
    } else if (type === 'videoMessage' || realMessage?.videoMessage) {
      await sock.sendMessage(remoteJid, { video: buffer, caption: '👁️ Mensaje de ver una vez revelado' });
    } else if (type === 'audioMessage' || realMessage?.audioMessage) {
      await sock.sendMessage(remoteJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true });
    } else {
      await sock.sendMessage(remoteJid, { text: '❌ Tipo de mensaje no soportado.' }, { quoted: msg });
    }
  } catch (err) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No pude revelar el mensaje: ${err.message}`,
    }, { quoted: msg });
  }
}
