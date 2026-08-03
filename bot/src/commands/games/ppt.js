import { getMember } from '../../firebase/firebaseClient.js';
import { creditCash, deductCash } from '../../services/economyService.js';
import { playPPT } from '../../services/gamesService.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const EMOJIS = { piedra: '🪨', papel: '📄', tijera: '✂️' };

export async function pptCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const choice = args[0]?.toLowerCase();
  const bet = parseInt(args[1], 10);

  if (!['piedra', 'papel', 'tijera'].includes(choice) || !bet || bet <= 0) {
    await enqueueMessage(remoteJid, {
      text: '✂️ Uso: *!ppt [piedra|papel|tijera] [monto]*\nEjemplo: `!ppt piedra 2000`\n\nGana y recibe *x1.5* tu apuesta.',
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
  const { botChoice, outcome } = playPPT(choice);
  let prize = 0;
  let resultText;

  if (outcome === 'win') {
    prize = Math.floor(bet * 1.5);
    await creditCash(groupJid, senderJid, prize);
    resultText = `🎉 *¡Ganaste!* +${formatCoins(prize)}`;
  } else if (outcome === 'empate') {
    await creditCash(groupJid, senderJid, bet);
    resultText = `🤝 *¡Empate!* Se devuelve tu apuesta.`;
  } else {
    resultText = `😞 *Perdiste.* -${formatCoins(bet)}`;
  }

  const updated = await getMember(groupJid, senderJid);
  await enqueueMessage(remoteJid, {
    text: `✂️ *Piedra, Papel o Tijera*\n\n> Tú: ${EMOJIS[choice]} *${choice}*\n> Bot: ${EMOJIS[botChoice]} *${botChoice}*\n\n${resultText}\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`,
  }, { quoted: msg }, 1);
}
