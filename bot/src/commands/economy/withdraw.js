import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';
import { creditCash } from '../../services/economyService.js';
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

  // Primero descontar del banco
  await upsertMember(groupJid, senderJid, { bank: Math.round(bank - amount) });

  // Luego acreditar al efectivo (paga deudas automáticamente)
  const { credited, debtPaid } = await creditCash(groupJid, senderJid, amount);

  const updated = await getMember(groupJid, senderJid);

  let text = `💵 *Retiro exitoso*\n\n> Retiraste *${formatCoins(amount)}* del banco`;
  if (debtPaid > 0) {
    text += `\n> 💸 Se descontaron *${formatCoins(debtPaid)}* de tu deuda`;
  }
  text += `\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;
  text += `\n• 🏦 Banco: *${formatCoins(updated?.bank || 0)}*`;

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
