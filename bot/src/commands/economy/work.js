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

// Mensajes divertidos de cooldown para !work
const WORK_COOLDOWN_MESSAGES = [
  '😴 Estás agotado. Descansa *{time}* antes de volver a trabajar.',
  '💤 Necesitas un descanso. Vuelve en *{time}*.',
  '🛋️ Tómate un café. Regresa en *{time}*.',
  '🥱 Demasiado trabajo te agota. Espera *{time}*.',
  '😪 Tu jefe dice: "Vuelve en *{time}*, te ves terrible".',
  '🏖️ Es hora de descansar. Vuelve en *{time}*.',
  '⏰ Turno terminado. Siguiente disponible en *{time}*.',
  '🍕 Ve a comer algo. Regresa en *{time}*.',
  '😵 Estás exhausto. Necesitas *{time}* para recuperarte.',
  '🎮 Relájate un rato. Vuelve al trabajo en *{time}*.',
  '☕ Break time! Vuelve en *{time}*.',
  '🌙 Necesitas dormir. Despierta en *{time}*.',
  '🚶 Sal a caminar. Regresa fresquito en *{time}*.',
  '🎵 Pon música y relájate. Vuelve en *{time}*.',
  '🍔 Tu estómago gruñe. Come algo y vuelve en *{time}*.',
  '🧘 Medita un poco. Vuelve renovado en *{time}*.',
  '😎 Demasiado cool para trabajar ahora. Espera *{time}*.',
  '🏃 Haz ejercicio y regresa en *{time}* con más energía.',
  '📱 Revisa tus redes sociales. Vuelve en *{time}*.',
  '🎬 Ve una serie. Siguiente turno en *{time}*.',
  '🛌 Recarga baterías. Vuelve en *{time}*.',
  '💪 Estás en modo ahorro de energía. Reactiva en *{time}*.',
];

function getRandomCooldownMessage(timeText) {
  const template = WORK_COOLDOWN_MESSAGES[randomInt(0, WORK_COOLDOWN_MESSAGES.length - 1)];
  return template.replace('{time}', timeText);
}

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
    const cooldownMessage = getRandomCooldownMessage(text);
    await enqueueMessage(remoteJid,
      { text: cooldownMessage },
      { quoted: msg }, 1);
    return;
  }

  // Ganancias base: 3-5 RC
  const baseEarnings = randomInt(3, 5);

  // Buscar multiplicador activo (puede ser 2x, 3x, 4x o 5x)
  const activeMultiplier = member?.inventory?.find((i) =>
    i.itemId?.startsWith('multiplier') && i.active && (!i.expiresAt || i.expiresAt > Date.now())
  );

  let multiplierValue = 1;
  let multiplierName = '';

  if (activeMultiplier) {
    // Extraer el valor del multiplicador del itemId (multiplier2x -> 2, multiplier5x -> 5)
    const match = activeMultiplier.itemId.match(/multiplier(\d+)x/);
    if (match) {
      multiplierValue = parseInt(match[1], 10);
      multiplierName = `x${multiplierValue}`;
    }
  }

  const earnings = baseEarnings * multiplierValue;

  const phrase = WORK_PHRASES[randomInt(0, WORK_PHRASES.length - 1)];

  // Acreditar ganancias (aplica pago de deudas primero si las hay)
  const { credited, debtPaid } = await creditCash(groupJid, senderJid, earnings);

  // Cooldown aleatorio 2-30 minutos usando update() (dot notation correcto en Firestore)
  const cooldownMs = randomInt(2, 30) * 60 * 1000;
  await setCooldown(groupJid, senderJid, 'work', cooldownMs);

  const updated = await getMember(groupJid, senderJid);

  let text = `💼 _${phrase}_ ${formatCoins(earnings)}`;
  if (multiplierValue > 1) {
    text += `\n> 💎 Multiplicador ${multiplierName} activo (${formatCoins(baseEarnings)} x ${multiplierValue} = ${formatCoins(earnings)})`;
  }
  if (debtPaid > 0) text += `\n> 💸 Se descontaron *${formatCoins(debtPaid)}* de tu deuda.`;
  text += `\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
