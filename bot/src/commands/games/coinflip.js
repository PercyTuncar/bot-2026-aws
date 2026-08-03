import { getMember } from '../../firebase/firebaseClient.js';
import { creditCash, deductCash } from '../../services/economyService.js';
import { flipCoin } from '../../services/gamesService.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function coinflipCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const choice = args[0]?.toLowerCase();
  const bet = parseInt(args[1], 10);

  if (!['cara', 'sello'].includes(choice) || !bet || bet <= 0) {
    await enqueueMessage(remoteJid, {
      text: '🪙 Uso: *!coinflip [cara|sello] [monto]*\nEjemplo: `!coinflip cara 2000`',
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
  const result = flipCoin();
  const win = choice === result;
  if (win) await creditCash(groupJid, senderJid, bet * 2);

  const updated = await getMember(groupJid, senderJid);
  const emoji = result === 'cara' ? '😊' : '🦅';

  await enqueueMessage(remoteJid, {
    text: `🪙 *Cara o Sello*\n\n> Resultado: *${result.toUpperCase()}* ${emoji}\n> Tu elección: *${choice.toUpperCase()}*\n\n${win ? `🎉 ¡Acertaste! Ganaste *${formatCoins(bet * 2)}*` : `😞 Fallaste. Perdiste *${formatCoins(bet)}*`}\n\n• 💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`,
  }, { quoted: msg }, 1);
}
