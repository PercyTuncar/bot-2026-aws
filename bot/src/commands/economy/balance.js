import { getMember } from '../../firebase/firebaseClient.js';
import { buildBalanceMessage } from '../../utils/format.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function balanceCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);

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

  const text = buildBalanceMessage({
    cash: member?.cash || 0,
    bank: member?.bank || 0,
    debt: totalDebt,
    loanInfo,
  });

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
