import { getMember } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function bankCommand(sock, msg, context) {
  const { groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0] || context.senderJid;

  const member = await getMember(groupJid, targetJid);
  const bank = member?.bank || 0;
  const name = member?.pushName || targetJid.replace('@s.whatsapp.net', '');

  await enqueueMessage(remoteJid, {
    text: `🏦 *Saldo bancario de ${name}*\n\n• 🏦 Banco: *${formatCoins(bank)}*`,
  }, { quoted: msg }, 1);
}
