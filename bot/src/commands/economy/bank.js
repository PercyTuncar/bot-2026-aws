import { getMember } from '../../firebase/firebaseClient.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const BANK_IMAGE_URL = 'https://res.cloudinary.com/amadodedios/image/upload/v1785989707/ravehubank_jcixjh.jpg';

export async function bankCommand(sock, msg, context) {
  const { groupJid, senderJid } = context;
  const remoteJid = msg.key.remoteJid;

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0] || senderJid;

  const member = await getMember(groupJid, targetJid);
  const bank = member?.bank || 0;

  // Determinar el nombre a mostrar
  let displayName;
  let mentionsList = [];

  if (member?.pushName) {
    // Si tiene pushName, usarlo
    displayName = member.pushName;
  } else if (targetJid) {
    // Si tiene JID, usar mención
    displayName = `@${cleanJidForDisplay(targetJid)}`;
    mentionsList = [targetJid];
  } else {
    // Fallback
    displayName = 'Usuario';
  }

  // Construir mensaje con imagen
  await enqueueMessage(remoteJid, {
    image: { url: BANK_IMAGE_URL },
    caption: `🏦 *Saldo bancario de ${displayName}*\n\n• 🏦 Banco: *${formatCoins(bank)}*\n\n> _El tiempo vale más que el dinero_`,
    mentions: mentionsList,
  }, { quoted: msg }, 1);
}
