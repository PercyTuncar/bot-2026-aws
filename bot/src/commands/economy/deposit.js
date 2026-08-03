import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function depositCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;
  const bank = member?.bank || 0;
  const input = args[0]?.toLowerCase();
  const amount = (input === 'all' || input === 'todo') ? cash : parseInt(input, 10);

  if (!amount || amount <= 0) {
    await enqueueMessage(remoteJid, { text: '❌ Uso: *!deposit [monto]* o *!deposit all*' }, { quoted: msg }, 1);
    return;
  }
  if (amount > cash) {
    await enqueueMessage(remoteJid, {
      text: `❌ Saldo insuficiente.\n• 💵 Efectivo disponible: *${formatCoins(cash)}*`,
    }, { quoted: msg }, 1);
    return;
  }

  await upsertMember(groupJid, senderJid, { cash: Math.round(cash - amount), bank: Math.round(bank + amount) });

  await enqueueMessage(remoteJid, {
    text: `🏦 *Depósito exitoso*\n\n> Depositaste *${formatCoins(amount)}*\n• 💵 Efectivo: *${formatCoins(cash - amount)}*\n• 🏦 Banco: *${formatCoins(bank + amount)}*`,
  }, { quoted: msg }, 1);
}
