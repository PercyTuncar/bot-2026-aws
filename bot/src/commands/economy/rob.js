import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { deductCash, creditCash, getActiveItem, setCooldown } from '../../services/economyService.js';
import { formatCoins, randomInt, isCooldownExpired, getCooldownRemaining, cleanJidForDisplay } from '../../utils/helpers.js';
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
      text: `🛡️ @${cleanJidForDisplay(targetJid)} tiene un *Escudo Antirrobos* activo!\n\n> Tu intento falló y perdiste *${formatCoins(penalty)}* como penalización.`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
    return;
  }

  const targetCash = target.cash || 0;
  if (targetCash === 0) {
    await enqueueMessage(remoteJid, {
      text: `💸 @${cleanJidForDisplay(targetJid)} no tiene efectivo para robar.`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
    return;
  }

  // 45% éxito
  const success = Math.random() < 0.45;

  if (success) {
    // Calcular robo entre 10-100% del efectivo de la víctima, mínimo 1 RC
    let stolen = Math.floor(targetCash * (randomInt(10, 100) / 100));

    // Si el robo calculado es 0, robar al menos 1 RC (siempre que la víctima tenga efectivo)
    if (stolen === 0 && targetCash > 0) {
      stolen = 1;
    }

    // Verificar si robó TODO el efectivo (100% o muy cerca)
    const robbedEverything = stolen >= targetCash;

    await deductCash(groupJid, targetJid, stolen);
    await creditCash(groupJid, senderJid, stolen);
    const updated = await getMember(groupJid, senderJid);

    let message;
    if (robbedEverything) {
      // Mensajes divertidos cuando se roba TODO
      const fullRobMessages = [
        `🦹 *¡ROBO PERFECTO!*\n\n> ¡Le vaciaste los bolsillos completamente a @${cleanJidForDisplay(targetJid)}!\n> 💰 Te llevaste TODO su efectivo: *${formatCoins(stolen)}*\n> 😱 @${cleanJidForDisplay(targetJid)} quedó en bancarrota!\n\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
        `🦹 *¡GOLPE MAESTRO!*\n\n> ¡Desvalijaste completamente a @${cleanJidForDisplay(targetJid)}!\n> 💸 Botín total: *${formatCoins(stolen)}*\n> 🤑 @${cleanJidForDisplay(targetJid)} quedó sin un centavo!\n\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
        `🦹 *¡ROBO DEL SIGLO!*\n\n> ¡Le quitaste hasta el último RCoin a @${cleanJidForDisplay(targetJid)}!\n> 💰 Robaste: *${formatCoins(stolen)}*\n> 😭 @${cleanJidForDisplay(targetJid)} ahora está en ceros!\n\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
        `🦹 *¡LIMPIEZA TOTAL!*\n\n> ¡Le sacaste hasta las monedas del sofá a @${cleanJidForDisplay(targetJid)}!\n> 💵 Todo lo que tenía: *${formatCoins(stolen)}*\n> 💔 @${cleanJidForDisplay(targetJid)} quedó pelado!\n\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
        `🦹 *¡ROBO HISTÓRICO!*\n\n> ¡Arrasaste con TODO el efectivo de @${cleanJidForDisplay(targetJid)}!\n> 🎯 Botín completo: *${formatCoins(stolen)}*\n> 😨 @${cleanJidForDisplay(targetJid)} no le quedó nada!\n\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
      ];
      message = fullRobMessages[randomInt(0, fullRobMessages.length - 1)];
    } else {
      // Mensaje normal de robo parcial
      message = `🦹 *¡Robo exitoso!*\n\n> Le robaste *${formatCoins(stolen)}* a @${cleanJidForDisplay(targetJid)}\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`;
    }

    await enqueueMessage(remoteJid, {
      text: message,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
  } else {
    // Multa aumentada: 5-15 RC
    const fine = randomInt(5, 15);
    await deductCash(groupJid, senderJid, fine);
    const updated = await getMember(groupJid, senderJid);

    await enqueueMessage(remoteJid, {
      text: `👮 *¡Robo fallido!*\n\n> Te atraparon intentando robar a @${cleanJidForDisplay(targetJid)}\n• 💸 Multa: *${formatCoins(fine)}*\n• 💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
      mentions: [targetJid],
    }, { quoted: msg }, 1);
  }
}
