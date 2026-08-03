import { getMember } from '../../firebase/firebaseClient.js';
import { creditCash, deductCash } from '../../services/economyService.js';
import { rollDice } from '../../services/gamesService.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const DADO_MULTIPLIER = 5;

export async function dadoCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const number = parseInt(args[0], 10);
  const bet = parseInt(args[1], 10);

  if (!number || number < 1 || number > 6 || !bet || bet <= 0) {
    await enqueueMessage(remoteJid, {
      text: `🎲 Uso: *!dado [1-6] [monto]*\nEjemplo: \`!dado 3 2000\`\n\nAcierta el número y gana *x${DADO_MULTIPLIER}* tu apuesta.`,
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
  const result = rollDice();
  const win = result === number;
  if (win) await creditCash(groupJid, senderJid, bet * DADO_MULTIPLIER);

  const updated = await getMember(groupJid, senderJid);
  const DICE_EMOJIS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  await enqueueMessage(remoteJid, {
    text: `🎲 *Dado*\n\n> Resultado: *${DICE_EMOJIS[result]} (${result})*\n> Tu número: *${number}*\n\n${win ? `🎉 ¡Acertaste! Ganaste *${formatCoins(bet * DADO_MULTIPLIER)}* (x${DADO_MULTIPLIER})` : `😞 No coincidió. Perdiste *${formatCoins(bet)}*`}\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`,
  }, { quoted: msg }, 1);
}
