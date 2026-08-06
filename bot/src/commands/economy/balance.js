import { getMember } from '../../firebase/firebaseClient.js';
import { buildBalanceMessage } from '../../utils/format.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { cleanJidForDisplay } from '../../utils/helpers.js';

export async function balanceCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  // Verificar si hay mención para ver balance de otro usuario
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0] || senderJid;

  // Obtener datos del usuario objetivo
  const member = targetJid === senderJid && memberData
    ? memberData
    : await getMember(groupJid, targetJid);

  if (!member) {
    await enqueueMessage(remoteJid,
      { text: '❌ Usuario no encontrado en la base de datos.' },
      { quoted: msg }, 1);
    return;
  }

  // Calcular deuda total
  const loans = member?.loans || [];
  let totalDebt = 0;
  let loanInfo = null;

  for (const loan of loans) {
    if (loan.type === 'loan' && (loan.status === 'active' || loan.status === 'overdue' || loan.status === 'infocorp')) {
      totalDebt += loan.amount || 0;
      if (!loanInfo) {
        loanInfo = {
          dueAt: loan.dueAt,
          status: loan.status,
        };
      }
    } else if (loan.type === 'fine') {
      totalDebt += loan.amount || 0;
    }
  }

  // Determinar el nombre a mostrar
  let displayName;
  let mentionsList = [];

  if (targetJid !== senderJid) {
    // Mostrando balance de otro usuario
    if (member.pushName) {
      displayName = member.pushName;
    } else {
      displayName = `@${cleanJidForDisplay(targetJid)}`;
      mentionsList = [targetJid];
    }
  } else {
    // Mostrando balance propio
    displayName = 'Tu';
  }

  const text = buildBalanceMessage({
    cash: member?.cash || 0,
    bank: member?.bank || 0,
    debt: totalDebt,
    loanInfo,
    userName: displayName,
    isOtherUser: targetJid !== senderJid,
  });

  await enqueueMessage(remoteJid, { text, mentions: mentionsList }, { quoted: msg }, 1);
}
