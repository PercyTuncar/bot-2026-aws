import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function withdrawCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;
  const bank = member?.bank || 0;
  const input = args[0]?.toLowerCase();

  // Validar que se proporcionó un argumento
  if (!input) {
    await enqueueMessage(remoteJid, { text: '❌ Uso: *!withdraw [monto]* o *!withdraw all*' }, { quoted: msg }, 1);
    return;
  }

  // Calcular monto a retirar
  const amount = (input === 'all' || input === 'todo') ? bank : parseInt(input, 10);

  // Validar que el monto sea válido
  if (isNaN(amount) || amount <= 0) {
    await enqueueMessage(remoteJid, { text: '❌ Uso: *!withdraw [monto]* o *!withdraw all*' }, { quoted: msg }, 1);
    return;
  }

  // Validar que tenga suficiente en el banco
  if (amount > bank) {
    await enqueueMessage(remoteJid, {
      text: `❌ Saldo bancario insuficiente.\n• 🏦 Banco disponible: *${formatCoins(bank)}*`,
    }, { quoted: msg }, 1);
    return;
  }

  await upsertMember(groupJid, senderJid, { cash: Math.round(cash + amount), bank: Math.round(bank - amount) });

  await enqueueMessage(remoteJid, {
    text: `💵 *Retiro exitoso*\n\n> Retiraste *${formatCoins(amount)}* del banco\n• 💵 Efectivo: *${formatCoins(cash + amount)}*\n• 🏦 Banco: *${formatCoins(bank - amount)}*`,
  }, { quoted: msg }, 1);
}
