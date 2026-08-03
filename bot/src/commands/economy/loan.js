import { getMember, getAllMembers } from '../../firebase/firebaseClient.js';
import { grantLoan, hasActiveLoan, isInInfocorp, isRecentlyCleared } from '../../services/economyService.js';
import { formatCoins, randomInt } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function loanCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);

  if (isInInfocorp(member)) {
    await enqueueMessage(remoteJid, {
      text: '❌ Estás en *Infocorp*. No puedes solicitar préstamos hasta saldar tu deuda.',
    }, { quoted: msg }, 1);
    return;
  }
  if (isRecentlyCleared(member)) {
    await enqueueMessage(remoteJid, {
      text: '❌ Saliste de Infocorp recientemente. Debes esperar *72 horas* antes de pedir otro préstamo.',
    }, { quoted: msg }, 1);
    return;
  }
  if (hasActiveLoan(member)) {
    await enqueueMessage(remoteJid, {
      text: '❌ Ya tienes un préstamo activo. Paga tu deuda antes de solicitar otro.',
    }, { quoted: msg }, 1);
    return;
  }

  const amount = parseInt(args[0], 10);
  if (!amount || amount <= 0) {
    await enqueueMessage(remoteJid, {
      text: `💳 *Sistema de Préstamos*\n\n• Interés: *20%*\n• Plazo: *24 horas*\n• Incumplimiento → *Infocorp*\n\nUso: *!loan [monto]*\nEjemplo: \`!loan 10000\``,
    }, { quoted: msg }, 1);
    return;
  }

  const MAX_LOAN = 50;
  if (amount > MAX_LOAN) {
    await enqueueMessage(remoteJid, {
      text: `❌ El monto máximo es *${formatCoins(MAX_LOAN)}*.`,
    }, { quoted: msg }, 1);
    return;
  }

  const result = await grantLoan(groupJid, senderJid, amount);
  if (!result.success) {
    await enqueueMessage(remoteJid, { text: `❌ ${result.reason}` }, { quoted: msg }, 1);
    return;
  }

  const dueDate = new Date(result.dueAt).toLocaleString('es-PE', { timeZone: 'America/Lima' });
  await enqueueMessage(remoteJid, {
    text: `💳 *Préstamo aprobado*\n\n• 💵 Recibiste: *${formatCoins(result.principal)}*\n• 💸 Total a pagar: *${formatCoins(result.totalOwed)}* (20% interés)\n• 📅 Vence: _${dueDate}_\n\n> ⚠️ Si no pagas a tiempo, entrarás a *Infocorp* y tus ingresos se destinarán al pago.`,
  }, { quoted: msg }, 1);
}
