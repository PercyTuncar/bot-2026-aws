import { removeLastWarning, removeAllWarnings } from '../../services/moderationService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { cleanJidForDisplay } from '../../utils/helpers.js';

export async function unwarnCommand(sock, msg, context) {
  const { args, groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0];
  if (!targetJid) {
    await enqueueMessage(remoteJid, {
      text: '❌ Menciona al usuario.\nUso: *!unwarn @usuario* (elimina la última)\n*!unwarn @usuario all* (elimina todas)',
    }, { quoted: msg }, 1);
    return;
  }

  const removeAll = args[1]?.toLowerCase() === 'all';
  const remaining = removeAll
    ? await removeAllWarnings(groupJid, targetJid)
    : await removeLastWarning(groupJid, targetJid);

  await enqueueMessage(remoteJid, {
    text: `✅ Advertencia(s) eliminada(s) de @${cleanJidForDisplay(targetJid)}.\n• ⚠️ Advertencias restantes: *${remaining}/3*`,
    mentions: [targetJid],
  }, { quoted: msg }, 1);
}
