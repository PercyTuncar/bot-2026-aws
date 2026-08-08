import { getMember } from '../../firebase/firebaseClient.js';
import { transferCash } from '../../services/economyService.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function transferCommand(sock, msg, context) {
  const { args, senderJid, groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0];
  const amount = parseInt(args[args.length - 1], 10);

  if (!targetJid || !amount || amount <= 0) {
    await enqueueMessage(remoteJid, {
      text: '❌ Uso: *!transfer @usuario [monto]*\nEjemplo: `!yapear @juan 5000`',
    }, { quoted: msg }, 1);
    return;
  }
  if (targetJid === senderJid) {
    await enqueueMessage(remoteJid, { text: '❌ No puedes transferirte dinero a ti mismo.' }, { quoted: msg }, 1);
    return;
  }

  const result = await transferCash(groupJid, senderJid, targetJid, amount);
  if (!result.success) {
    await enqueueMessage(remoteJid, { text: `❌ ${result.reason}` }, { quoted: msg }, 1);
    return;
  }

  const sender = await getMember(groupJid, senderJid);
  const receiver = await getMember(groupJid, targetJid);

  let paymentInfo = '';
  if (result.fromBank > 0) {
    paymentInfo = `\n\n💳 Deducido: ${formatCoins(result.fromCash)} de efectivo + ${formatCoins(result.fromBank)} del banco`;
  }

  await enqueueMessage(remoteJid, {
    text: `💸 *Transferencia exitosa*\n\n> Enviaste ${formatCoins(amount)} a @${cleanJidForDisplay(targetJid)}\n> El dinero fue depositado directo a su banco${paymentInfo}\n\n📊 *Tu saldo actual:*\n• 💵 Efectivo: ${formatCoins(sender?.cash || 0)}\n• 🏦 Banco: ${formatCoins(sender?.bank || 0)}`,
    mentions: [targetJid],
  }, { quoted: msg }, 1);
}
