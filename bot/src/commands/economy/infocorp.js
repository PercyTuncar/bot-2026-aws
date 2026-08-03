import { getAllMembers } from '../../firebase/firebaseClient.js';
import { isInInfocorp } from '../../services/economyService.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function infocorpCommand(sock, msg, context) {
  const { groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const members = await getAllMembers(groupJid);

  const inInfocorp = members.filter((m) => isInInfocorp(m));
  const recentlyCleared = members.filter((m) => {
    const cleared = (m.loans || []).find((l) => l.type === 'loan' && l.status === 'cleared');
    if (!cleared) return false;
    return Date.now() - new Date(cleared.clearedAt).getTime() < 72 * 60 * 60 * 1000;
  });

  let text = `🏦 *Infocorp — Deudores del Grupo*\n\n`;

  if (inInfocorp.length === 0) {
    text += `✅ No hay deudores activos.\n\n`;
  } else {
    text += `🔴 *Deudores activos (${inInfocorp.length}):*\n`;
    for (const m of inInfocorp) {
      const debt = (m.loans || []).find((l) => l.type === 'loan' && (l.status === 'overdue' || l.status === 'infocorp'));
      const name = m.pushName || m.jid?.replace('@s.whatsapp.net', '') || m.id;
      text += `• ${name} — Deuda: *${formatCoins(debt?.amount || 0)}*\n`;
    }
    text += '\n';
  }

  if (recentlyCleared.length > 0) {
    text += `🟡 *Saldaron recientemente (restricción 72h):*\n`;
    for (const m of recentlyCleared) {
      const name = m.pushName || m.jid?.replace('@s.whatsapp.net', '') || m.id;
      text += `• ${name} _— aún no puede pedir préstamos_\n`;
    }
  }

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
