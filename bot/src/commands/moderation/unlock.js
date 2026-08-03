import { upsertGroup } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function unlockCommand(sock, msg, context) {
  try {
    const { args, groupJid, group } = context;
    const remoteJid = msg.key.remoteJid;
    const format = args[0]?.toLowerCase();
    const VALID_FORMATS = ['sticker', 'imagen', 'audio', 'texto'];

    if (!VALID_FORMATS.includes(format)) {
      await enqueueMessage(remoteJid, { text: `❌ Formato inválido.\nUso: *!unlock [${VALID_FORMATS.join('|')}]*` }, { quoted: msg }, 1);
      return;
    }

    const currentLocks = group?.formatLock?.lockedFormats || {};
    if (!currentLocks[format] || currentLocks[format] < Date.now()) {
      await enqueueMessage(remoteJid, { text: `ℹ️ El formato *${format}* no está bloqueado actualmente.` }, { quoted: msg }, 1);
      return;
    }

    delete currentLocks[format];
    await upsertGroup(groupJid, { formatLock: { lockedFormats: currentLocks } });
    await enqueueMessage(remoteJid, { text: `🔓 *Formato desbloqueado: ${format}*\nLos mensajes de tipo *${format}* ya pueden enviarse normalmente.` }, { quoted: msg }, 1);
  } catch (err) {
    console.error('[unlockCommand]', err.message);
  }
}
