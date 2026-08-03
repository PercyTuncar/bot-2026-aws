import { upsertGroup } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { upsertGroup as _u } from '../../firebase/firebaseClient.js';

const VALID_FORMATS = ['sticker', 'imagen', 'audio', 'texto'];

export async function lockCommand(sock, msg, context) {
  try {
    const { args, groupJid, group } = context;
    const remoteJid = msg.key.remoteJid;
    const format = args[0]?.toLowerCase();

    if (!VALID_FORMATS.includes(format)) {
      await enqueueMessage(remoteJid, { text: `❌ Formato inválido.\nUso: *!lock [${VALID_FORMATS.join('|')}]*` }, { quoted: msg }, 1);
      return;
    }

    const { randomInt } = await import('../../utils/helpers.js');
    const durationMs = randomInt(3 * 60 * 1000, 10 * 60 * 1000);
    const expiresAt = Date.now() + durationMs;
    const minutesText = Math.ceil(durationMs / 60000);

    const currentLocks = { ...(group?.formatLock?.lockedFormats || {}) };
    currentLocks[format] = expiresAt;
    await upsertGroup(groupJid, { formatLock: { lockedFormats: currentLocks } });

    await enqueueMessage(remoteJid, {
      text: `🔒 *Formato bloqueado: ${format}*\nDuración: ~${minutesText} minutos\nLos mensajes de tipo *${format}* serán eliminados automáticamente.`,
    }, { quoted: msg }, 1);
  } catch (err) {
    console.error('[lockCommand]', err.message);
  }
}
