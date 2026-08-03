import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { deductCash, creditCash, getActiveItem, setCooldown } from '../../services/economyService.js';
import { formatCoins, randomInt, isCooldownExpired, getCooldownRemaining } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutos

export async function robCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const targetJid = mentions[0];

  if (!targetJid) {
    await enqueueMessage(remoteJid,
      { text: '❌ Menciona a quien quieres robar.\nUso: *!rob @usuario*' },
      { quoted: msg }, 1);
    return;
  }

  if (targetJid === senderJid) {
    await enqueueMessage(remoteJid, { text: '❌ No puedes robarte a ti mismo.' }, { quoted: msg }, 1);
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);

  // Cooldown almacenado como timestamp de expiración
  const expiresAt = member?.cooldowns?.rob || 0;
  if (!isCooldownExpired(expiresAt)) {
    const { text } = getCooldownRemaining(expiresAt);
    await enqueueMessage(remoteJid,
      { text: `⏳ Espera *${text}* para intentar robar de nuevo.` },
      { quoted: msg }, 1);
    return;
  }

  // Guardar cooldown usando update() — dot notation correcto en Firestore
  await setCooldown(groupJid, senderJid, 'rob', COOLDOWN_MS);

  const target = await getMember(groupJid, targetJid);
  if (!target) {
    await enqueueMessage(remoteJid, { text: '❌ No encontré a ese usuario.' }, { quoted: msg }, 1);
    return;
  }

  // PRD 9: Escudo Antirrobos bloquea el robo y penaliza al ladrón
  const hasShield = !!getActiveItem(target, 'shield');
  if (hasShield) {
    const penalty = randomInt(1, 3);
    await deductCash(groupJid, senderJid, penalty);
    await enqueueMessage(remoteJid, {
      text: `🛡️ @${targetJid.replace('@s.whatsapp.net', '')} tiene un *Escudo Antirrobos* activo!\n\n> Tu intento falló y perdiste *${formatCoins(penalty)}* como penalización.`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
    return;
  }

  const targetCash = target.cash || 0;
  if (targetCash === 0) {
    await enqueueMessage(remoteJid, {
      text: `💸 @${targetJid.replace('@s.whatsapp.net', '')} no tiene efectivo para robar.`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
    return;
  }

  // 45% éxito
  const success = Math.random() < 0.45;

  if (success) {
    const stolen = Math.floor(targetCash * (randomInt(10, 40) / 100));
    await deductCash(groupJid, targetJid, stolen);
    await creditCash(groupJid, senderJid, stolen);
    const updated = await getMember(groupJid, senderJid);

    await enqueueMessage(remoteJid, {
      text: `🦹 *¡Robo exitoso!*\n\n> Le robaste *${formatCoins(stolen)}* a @${targetJid.replace('@s.whatsapp.net', '')}\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
  } else {
    const fine = randomInt(1, 3);
    await deductCash(groupJid, senderJid, fine);
    const updated = await getMember(groupJid, senderJid);

    await enqueueMessage(remoteJid, {
      text: `👮 *¡Robo fallido!*\n\n> Te atraparon intentando robar a @${targetJid.replace('@s.whatsapp.net', '')}\n• 💸 Multa: *${formatCoins(fine)}*\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
  }
}
