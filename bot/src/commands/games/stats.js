import { getGameHistory } from '../../firebase/firebaseClient.js';

export async function statsCommand(sock, msg, context) {
  const { args, groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const game = args[0]?.toLowerCase();
  const VALID_GAMES = ['roulette', 'ruleta', 'fstudio', 'fstudio2'];

  if (!game || !VALID_GAMES.includes(game)) {
    await sock.sendMessage(remoteJid, {
      text: `📊 Uso: *!stats [roulette|fstudio]*\nEjemplo: \`!stats roulette\` o \`!stats fstudio\``,
    }, { quoted: msg });
    return;
  }

  const gameType = ['roulette', 'ruleta'].includes(game) ? 'roulette' : 'fstudio';
  const history = await getGameHistory(groupJid, gameType, 15);

  if (history.length === 0) {
    await sock.sendMessage(remoteJid, {
      text: `📊 No hay historial de *${gameType}* en este grupo aún.`,
    }, { quoted: msg });
    return;
  }

  let text = `📊 *Historial de ${gameType === 'roulette' ? 'Ruleta' : 'Football Studio'}* (últimas ${history.length} rondas)\n\n`;

  if (gameType === 'roulette') {
    const colorCount = { rojo: 0, negro: 0, verde: 0 };
    const parImparCount = { par: 0, impar: 0, cero: 0 };
    const altoBajoCount = { bajo: 0, alto: 0, cero: 0 };

    for (const r of history) {
      const d = r.result;
      const num = d.number;
      const colorEmoji = d.color === 'rojo' ? '🔴' : d.color === 'negro' ? '⚫' : '🟢';

      // Determinar par/impar
      let parImpar = '';
      if (num === 0) {
        parImpar = '⭕';
        parImparCount.cero++;
        altoBajoCount.cero++;
      } else {
        if (num % 2 === 0) {
          parImpar = '🟦 Par';
          parImparCount.par++;
        } else {
          parImpar = '🟨 Impar';
          parImparCount.impar++;
        }

        // Alto/Bajo
        if (num >= 1 && num <= 18) {
          altoBajoCount.bajo++;
        } else {
          altoBajoCount.alto++;
        }
      }

      text += `${colorEmoji} *${num}* ${parImpar}\n`;
      if (d.color) colorCount[d.color] = (colorCount[d.color] || 0) + 1;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔴 Rojos: ${colorCount.rojo} | ⚫ Negros: ${colorCount.negro} | 🟢 Ceros: ${colorCount.verde}\n`;
    text += `🟦 Pares: ${parImparCount.par} | 🟨 Impares: ${parImparCount.impar}\n`;
    text += `🔽 Bajos (1-18): ${altoBajoCount.bajo} | 🔼 Altos (19-36): ${altoBajoCount.alto}`;
  } else {
    for (const r of history) {
      const d = r.result;
      const resultEmoji = d.result === 'home' ? '🏠' : d.result === 'away' ? '✈️' : '🤝';
      const date = r.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleString('es-PE', { timeZone: 'America/Lima' })
        : 'Desconocido';
      text += `${resultEmoji} Home: *${d.homeCard}* vs Away: *${d.awayCard}* — ${date}\n`;
    }
  }

  await sock.sendMessage(remoteJid, { text }, { quoted: msg });
}
