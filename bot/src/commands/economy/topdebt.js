import { getAllMembers } from '../../firebase/firebaseClient.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function topdebtCommand(sock, msg, context) {
  const { groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const members = await getAllMembers(groupJid);

  // Calcular deuda total de cada miembro
  const membersWithDebt = members
    .map((m) => {
      let totalDebt = 0;
      const loans = m.loans || [];

      for (const loan of loans) {
        // Sumar préstamos activos, vencidos o en infocorp
        if (loan.type === 'loan' && (loan.status === 'active' || loan.status === 'overdue' || loan.status === 'infocorp')) {
          totalDebt += loan.amount || 0;
        }
        // Sumar multas pendientes
        if (loan.type === 'fine') {
          totalDebt += loan.amount || 0;
        }
      }

      return {
        ...m,
        totalDebt,
      };
    })
    .filter((m) => m.totalDebt > 0) // Solo miembros con deuda
    .sort((a, b) => b.totalDebt - a.totalDebt) // Ordenar de mayor a menor deuda
    .slice(0, 10); // Top 10

  if (membersWithDebt.length === 0) {
    await enqueueMessage(remoteJid, {
      text: '✅ *¡Grupo financieramente sano!*\n\nNo hay deudores en Ravehub City. 🎉',
    }, { quoted: msg }, 1);
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let text = `💳 *Top 10 — Los Más Endeudados de Ravehub City*\n\n`;

  // Construir lista con menciones
  const mentions = [];
  membersWithDebt.forEach((m, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const jid = m.jid;

    // Determinar estado del deudor
    const hasOverdueLoan = (m.loans || []).some(
      (l) => l.type === 'loan' && (l.status === 'overdue' || l.status === 'infocorp')
    );
    const statusIcon = hasOverdueLoan ? '🔴' : '🟡';

    if (jid) {
      mentions.push(jid);
      text += `${medal} ${statusIcon} @${cleanJidForDisplay(jid)} — ${formatCoins(m.totalDebt)}\n`;
    } else {
      const name = m.pushName || m.id || 'Usuario';
      text += `${medal} ${statusIcon} *${name}* — ${formatCoins(m.totalDebt)}\n`;
    }
  });

  text += `\n🔴 En Infocorp (préstamo vencido)\n`;
  text += `🟡 Deuda activa (en plazo)\n`;
  text += `\n💡 _Paga tus deudas trabajando con !work_`;

  await enqueueMessage(remoteJid, {
    text,
    mentions,
  }, { quoted: msg }, 1);
}
