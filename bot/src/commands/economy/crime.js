import { getMember, upsertMember } from '../../firebase/firebaseClient.js';
import { deductCash, creditCash, setCooldown } from '../../services/economyService.js';
import { formatCoins, randomInt, isCooldownExpired, getCooldownRemaining } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos

const CRIME_SCENARIOS = [
  { desc: 'Falsificaste billetes en el mercado negro', success: '¡Nadie sospechó nada!', fail: 'La policía te atrapó in fraganti' },
  { desc: 'Hackeaste una cuenta bancaria', success: '¡Transferencia exitosa desde las sombras!', fail: 'Tu IP fue rastreada' },
  { desc: 'Vendiste artículos robados en el mercado', success: '¡Transacción sin testigos!', fail: 'El comprador era policía encubierto' },
  { desc: 'Organizaste una estafa telefónica', success: '¡Depósito recibido sin complicaciones!', fail: 'La víctima llamó a la policía' },
  { desc: 'Robaste un cargamento de mercancía', success: '¡Nadie vigilaba el almacén!', fail: 'Las cámaras te captaron' },
];

export async function crimeCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  const expiresAt = member?.cooldowns?.crime || 0;

  if (!isCooldownExpired(expiresAt)) {
    const { text } = getCooldownRemaining(expiresAt);
    await enqueueMessage(remoteJid,
      { text: `⏳ Mantén un perfil bajo. Espera *${text}* para cometer otro crimen.` },
      { quoted: msg }, 1);
    return;
  }

  // Guardar cooldown usando update() — dot notation correcto en Firestore
  await setCooldown(groupJid, senderJid, 'crime', COOLDOWN_MS);

  const scenario = CRIME_SCENARIOS[randomInt(0, CRIME_SCENARIOS.length - 1)];
  const success = Math.random() < 0.55;

  if (success) {
    const reward = randomInt(5, 15);
    await creditCash(groupJid, senderJid, reward);
    const updated = await getMember(groupJid, senderJid);

    await enqueueMessage(remoteJid, {
      text: `🦹 _${scenario.desc}_\n> ✅ ${scenario.success}\n\n• 💰 Ganaste *${formatCoins(reward)}*\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`,
    }, { quoted: msg }, 1);
  } else {
    const fine = randomInt(3, 10);
    await deductCash(groupJid, senderJid, fine);
    const updated = await getMember(groupJid, senderJid);

    await enqueueMessage(remoteJid, {
      text: `👮 _${scenario.desc}_\n> ❌ ${scenario.fail}\n\n• 💸 Multa: *${formatCoins(fine)}*\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`,
    }, { quoted: msg }, 1);
  }
}
