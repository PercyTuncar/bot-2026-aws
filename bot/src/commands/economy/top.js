import { getAllMembers } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';
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
  let text = `🏆 *Top 10 — Ricos del Grupo*\n\n`;
  sorted.forEach((m, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const name = m.pushName || m.jid?.replace('@s.whatsapp.net', '') || m.id;
    text += `${medal} *${name}* — ${formatCoins(m.total)}\n`;
  });

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
