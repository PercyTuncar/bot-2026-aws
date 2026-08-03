import { getMember } from '../../firebase/firebaseClient.js';
import { creditCash, deductCash } from '../../services/economyService.js';
import { playFStudio } from '../../services/gamesService.js';
import { addGameResult } from '../../firebase/firebaseClient.js';
import { formatCoins } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

const HELP_TEXT = `🏟️ *Football Studio — Cómo Jugar*

Dos cartas son repartidas: una para *Local (Home)* y otra para *Visitante (Away)*.
Apuesta a cuál carta tendrá el valor más alto, o a que haya *Empate (Ties)*.

*Apuestas y pagos:*
• 🏠 Local  → gana si la carta local es más alta → paga x2
• ✈️ Visitante → gana si la carta visitante es más alta → paga x2
• 🤝 Empate → gana si ambas cartas son iguales → paga x3

*Uso:*
\`!fstudio home 5\`   — apuesta al local
\`!fstudio away 5\`   — apuesta al visitante
\`!fstudio ties 5\`   — apuesta al empate
(también: local, visitante, empate)`;

const RESULT_LABEL = { home: '🏠 Local', away: '✈️ Visitante', ties: '🤝 Empate' };
const MULTIPLIER   = { home: 2, away: 2, ties: 3 };

export async function fstudioCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'help' || sub === 'ayuda') {
    await enqueueMessage(remoteJid, { text: HELP_TEXT }, { quoted: msg }, 1);
    return;
  }

  // Normalizar elección
  const CHOICE_MAP = {
    home: 'home', local: 'home',
    away: 'away', visitante: 'away',
    ties: 'ties', empate: 'ties',
  };
  const betChoice = CHOICE_MAP[sub];
  const bet = parseInt(args[1], 10);

  if (!betChoice || !bet || bet <= 0) {
    await enqueueMessage(remoteJid, {
      text: `❌ Uso: *!fstudio [home|away|ties] [monto]*\nUsa *!fstudio help* para ver las reglas.`,
    }, { quoted: msg }, 1);
    return;
  }

  const member = memberData || await getMember(groupJid, senderJid);
  if ((member?.cash || 0) < bet) {
    await enqueueMessage(remoteJid, {
      text: `❌ No tienes suficiente efectivo.\n💵 Tu efectivo: *${formatCoins(member?.cash || 0)}*`,
    }, { quoted: msg }, 1);
    return;
  }

  await deductCash(groupJid, senderJid, bet);

  // ── Paso 1: mensaje inicial con cartas ocultas ────────────────────────────
  const gameMsg = await enqueueMessage(remoteJid, {
    text: `🏟️ *Football Studio*\n\n` +
          `Tu apuesta: *${RESULT_LABEL[betChoice]}* — *${formatCoins(bet)}*\n\n` +
          `🎴 _Barajando el mazo..._\n\n` +
          `🏠 Local:      *[?]*\n` +
          `✈️ Visitante:  *[?]*`,
  }, { quoted: msg }, 1);

  await new Promise((r) => setTimeout(r, 1500));

  // Calcular resultado (lo calculamos ya pero lo revelamos animado)
  const { homeCard, awayCard, result } = playFStudio(bet);

  // ── Paso 2: revelar carta del Local ──────────────────────────────────────
  if (gameMsg?.key) {
    await enqueueMessage(remoteJid, {
      text: `🏟️ *Football Studio*\n\n` +
            `Tu apuesta: *${RESULT_LABEL[betChoice]}* — *${formatCoins(bet)}*\n\n` +
            `🎴 _Carta Local revelada..._\n\n` +
            `🏠 Local:      *${homeCard.display}*\n` +
            `✈️ Visitante:  *[?]*`,
      edit: gameMsg.key,
    }, {}, 1);
  }

  await new Promise((r) => setTimeout(r, 1200));

  // ── Paso 3: revelar carta del Visitante ──────────────────────────────────
  if (gameMsg?.key) {
    await enqueueMessage(remoteJid, {
      text: `🏟️ *Football Studio*\n\n` +
            `Tu apuesta: *${RESULT_LABEL[betChoice]}* — *${formatCoins(bet)}*\n\n` +
            `🎴 _Carta Visitante revelada..._\n\n` +
            `🏠 Local:      *${homeCard.display}*\n` +
            `✈️ Visitante:  *${awayCard.display}*\n\n` +
            `⏳ _Calculando resultado..._`,
      edit: gameMsg.key,
    }, {}, 1);
  }

  await new Promise((r) => setTimeout(r, 1000));

  // ── Paso 4: resultado final ───────────────────────────────────────────────
  const won       = betChoice === result;
  const prize     = won ? bet * MULTIPLIER[betChoice] : 0;
  if (won) await creditCash(groupJid, senderJid, prize);

  // Guardar en historial de Firebase
  await addGameResult(groupJid, 'fstudio', {
    homeCard: homeCard.display,
    awayCard: awayCard.display,
    result,
    betChoice,
    bet,
    won,
    timestamp: new Date().toISOString(),
  });

  const updated      = await getMember(groupJid, senderJid);
  const resultLine   = won
    ? `🎉 *¡GANASTE!* +${formatCoins(prize)}`
    : `😞 *Perdiste* ${formatCoins(bet)}`;
  const winnerLabel  = RESULT_LABEL[result];

  const finalText =
    `🏟️ *Football Studio*\n\n` +
    `🏠 Local:      *${homeCard.display}*\n` +
    `✈️ Visitante:  *${awayCard.display}*\n\n` +
    `🏆 Resultado: *${winnerLabel}*\n` +
    `Tu apuesta: *${RESULT_LABEL[betChoice]}*\n\n` +
    `${resultLine}\n\n` +
    `💵 Efectivo: *${formatCoins(updated?.cash || 0)}*`;

  if (gameMsg?.key) {
    await enqueueMessage(remoteJid, { text: finalText, edit: gameMsg.key }, {}, 1);
  } else {
    await enqueueMessage(remoteJid, { text: finalText }, { quoted: msg }, 1);
  }
}
