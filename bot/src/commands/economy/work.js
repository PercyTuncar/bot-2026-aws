import { getMember } from '../../firebase/firebaseClient.js';
import {
  formatCoins,
  randomInt,
  isCooldownExpired,
  getCooldownRemaining,
  WORK_PHRASES,
} from '../../utils/helpers.js';
import { creditCash, getActiveItem, setCooldown } from '../../services/economyService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function workCommand(sock, msg, context) {
  const { senderJid, groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  // Siempre leer fresh de Firebase para cooldown preciso
  const member = await getMember(groupJid, senderJid);
  if (!member) return;

  // Cooldown almacenado como timestamp de EXPIRACIÓN vía update() (dot notation correcto)
  const expiresAt = member?.cooldowns?.work || 0;

  if (!isCooldownExpired(expiresAt)) {
    const { text } = getCooldownRemaining(expiresAt);
    await enqueueMessage(remoteJid,
      { text: `⏳ Estás cansado. Espera *${text}* para volver a trabajar.` },
      { quoted: msg }, 1);
    return;
  }

  // Ganancias base: 3-5 RC
  const baseEarnings = randomInt(3, 5);
  const hasMultiplier = !!getActiveItem(member, 'multiplier');
  const earnings = hasMultiplier ? baseEarnings * 2 : baseEarnings;

  const phrase = WORK_PHRASES[randomInt(0, WORK_PHRASES.length - 1)];

  // Acreditar ganancias (aplica pago de deudas primero si las hay)
  const { credited, debtPaid } = await creditCash(groupJid, senderJid, earnings);

  // Cooldown aleatorio 2-30 minutos usando update() (dot notation correcto en Firestore)
  const cooldownMs = randomInt(2, 30) * 60 * 1000;
  await setCooldown(groupJid, senderJid, 'work', cooldownMs);

  const updated = await getMember(groupJid, senderJid);

  let text = `💼 _${phrase}_ ${formatCoins(earnings)}`;
  if (hasMultiplier) text += `\n> 💎 Multiplicador x2 activo`;
  if (debtPaid > 0) text += `\n> 💸 Se descontaron *${formatCoins(debtPaid)}* de tu deuda.`;
  text += `\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
