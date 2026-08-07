import { getMember } from '../../firebase/firebaseClient.js';
import { creditCash, deductCash } from '../../services/economyService.js';
import { spinRoulette, resolveRouletteBet } from '../../services/gamesService.js';
import { addGameResult } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';

const ROULETTE_IMAGE_URL = 'https://res.cloudinary.com/amadodedios/image/upload/v1786117874/casino-imagen_ri0ds5.jpg';

const HELP_TEXT = `🎡 *Ruleta — Cómo Jugar*

*Tipos de apuesta:*
• \`!ruleta numero [0-36] [monto]\` — número exacto, paga x36
• \`!ruleta color [rojo|negro] [monto]\` — color, paga x2
• \`!ruleta par [monto]\` — número par, paga x2
• \`!ruleta impar [monto]\` — número impar, paga x2
• \`!ruleta docena [1|2|3] [monto]\` — docena (1-12, 13-24, 25-36), paga x3
• \`!ruleta columna [1|2|3] [monto]\` — columna, paga x3
• \`!ruleta mitad [baja|alta] [monto]\` — mitad (1-18 o 19-36), paga x2

*El 0 solo gana con apuesta al número 0.*

Ejemplo: \`!ruleta color rojo 3000\``;

export async function rouletteCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const sub = args[0]?.toLowerCase();
  if (!sub || sub === 'help' || sub === 'ayuda') {
    await sock.sendMessage(remoteJid, { text: HELP_TEXT }, { quoted: msg });
    return;
  }

  // Parse bet: !ruleta betType [betValue] monto
  let betType = sub;
  let betValue;
  let bet;

  const SINGLE_VALUE_TYPES = ['par', 'impar'];
  if (SINGLE_VALUE_TYPES.includes(betType)) {
    bet = parseInt(args[1], 10);
    betValue = null;
  } else {
    betValue = args[1];
    bet = parseInt(args[2], 10);
  }

  if (!bet || bet <= 0) {
    await sock.sendMessage(remoteJid, {
      text: `❌ Monto inválido.\nUsa *!ruleta help* para ver los tipos de apuesta.`,
    }, { quoted: msg });
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);
  if ((member?.cash || 0) < bet) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No tienes suficiente efectivo.\n💵 Tu efectivo: *${formatCoins(member?.cash || 0)}*`,
    }, { quoted: msg });
    return;
  }

  await deductCash(groupJid, senderJid, bet);

  // Spin animation con imagen
  const spinMsg = await sock.sendMessage(remoteJid, {
    image: { url: ROULETTE_IMAGE_URL },
    caption: `🎡 *Ruleta girando...*\n\n🔄 La bola rueda...`,
  }, { quoted: msg });

  await new Promise((r) => setTimeout(r, 2500));

  const result = spinRoulette();
  const { win, multiplier } = resolveRouletteBet(betType, betValue, result);
  const prize = win ? Math.floor(bet * multiplier) : 0;

  if (win) await creditCash(groupJid, senderJid, prize);

  // Save to history
  await addGameResult(groupJid, 'roulette', {
    number: result.number,
    color: result.color,
    timestamp: new Date().toISOString(),
  });

  const updated = await getMember(groupJid, senderJid);
  const colorEmoji = result.color === 'rojo' ? '🔴' : result.color === 'negro' ? '⚫' : '🟢';

  await sock.sendMessage(remoteJid, {
    image: { url: ROULETTE_IMAGE_URL },
    caption: `🎡 *Ruleta*\n\n${colorEmoji} Número: *${result.number}* (${result.color})\nPar/Impar: *${result.isEven ? 'Par' : 'Impar'}*\n\n${win ? `🎉 *¡Ganaste!* x${multiplier} → *${formatCoins(prize)}*` : `😞 *Perdiste.* Perdiste *${formatCoins(bet)}*`}\n\n💵 Tu efectivo: *${formatCoins(updated?.cash || 0)}*`,
    edit: spinMsg.key,
  });
}
