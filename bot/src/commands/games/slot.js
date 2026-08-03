import { getMember } from '../../firebase/firebaseClient.js';
import { creditCash, deductCash } from '../../services/economyService.js';
import { spinSlot } from '../../services/gamesService.js';
import { formatCoins, randomInt } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { buildGameResult } from '../../utils/format.js';

export async function slotCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const bet = parseInt(args[0], 10);
  if (!bet || bet <= 0) {
    await enqueueMessage(remoteJid, {
      text: '🎰 Uso: *!slot [monto]*\nEjemplo: `!slot 2000`\n\nGana el *doble* si los 3 símbolos coinciden.',
    }, { quoted: msg }, 1);
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);
  if ((member?.cash || 0) < bet) {
    await enqueueMessage(remoteJid, {
      text: `❌ Efectivo insuficiente.\n• 💵 Tu efectivo: *${formatCoins(member?.cash || 0)}*`,
    }, { quoted: msg }, 1);
    return;
  }

  await deductCash(groupJid, senderJid, bet);

  // Primera animación — girando
  const spinMsg = await enqueueMessage(remoteJid, {
    text: `🎰 *Tragamonedas*\n\n[ 🔄 | 🔄 | 🔄 ]\n\n⏳ _Girando..._`,
  }, { quoted: msg }, 1);

  await new Promise((r) => setTimeout(r, 1500));
  const { r1, r2, r3 } = spinSlot();

  if (spinMsg?.key) {
    await enqueueMessage(remoteJid, { text: `🎰 *Tragamonedas*\n\n[ ${r1} | 🔄 | 🔄 ]\n\n⏳ _Girando..._`, edit: spinMsg.key }, {}, 1);
    await new Promise((r) => setTimeout(r, 800));
    await enqueueMessage(remoteJid, { text: `🎰 *Tragamonedas*\n\n[ ${r1} | ${r2} | 🔄 ]\n\n⏳ _Girando..._`, edit: spinMsg.key }, {}, 1);
    await new Promise((r) => setTimeout(r, 800));
  }

  const isWin = r1 === r2 && r2 === r3;
  const prize = isWin ? bet * 2 : 0;
  if (isWin) await creditCash(groupJid, senderJid, prize);

  const updated = await getMember(groupJid, senderJid);
  const resultLine = isWin
    ? `🎉 *¡JACKPOT!* Ganaste *${formatCoins(prize)}*`
    : `😞 No coinciden. Perdiste *${formatCoins(bet)}*`;

  const finalText = `🎰 *Tragamonedas*\n\n[ ${r1} | ${r2} | ${r3} ]\n\n${resultLine}\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;

  if (spinMsg?.key) {
    await enqueueMessage(remoteJid, { text: finalText, edit: spinMsg.key }, {}, 1);
  } else {
    await enqueueMessage(remoteJid, { text: finalText }, {}, 1);
  }
}
