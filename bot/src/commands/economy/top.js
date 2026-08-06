import { getAllMembers } from '../../firebase/firebaseClient.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function topCommand(sock, msg, context) {
  const { groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const members = await getAllMembers(groupJid);
  const sorted = members
    .map((m) => ({ ...m, total: (m.cash || 0) + (m.bank || 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (sorted.length === 0) {
    await enqueueMessage(remoteJid, { text: '❌ No hay datos de economía en este grupo aún.' }, { quoted: msg }, 1);
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let text = `🏆 *Top 10 — Los Ricos de Ravehub City*\n\n`;

  // Construir lista con menciones
  const mentions = [];
  sorted.forEach((m, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const jid = m.jid;

    if (jid) {
      mentions.push(jid);
      text += `${medal} @${cleanJidForDisplay(jid)} — ${formatCoins(m.total)}\n`;
    } else {
      const name = m.pushName || m.id || 'Usuario';
      text += `${medal} *${name}* — ${formatCoins(m.total)}\n`;
    }
  });

  await enqueueMessage(remoteJid, {
    text,
    mentions,
  }, { quoted: msg }, 1);
}
