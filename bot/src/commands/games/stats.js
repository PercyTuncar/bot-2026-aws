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

    let index = 1;
    for (const r of history) {
      const d = r.result;
      const num = d.number;
      const colorEmoji = d.color === 'rojo' ? '🔴' : d.color === 'negro' ? '⚫' : '🟢';

      // Determinar par/impar
      let parImpar = '';
      if (num === 0) {
        parImpar = '';
        parImparCount.cero++;
        altoBajoCount.cero++;
      } else {
        if (num % 2 === 0) {
          parImpar = ' • Par';
          parImparCount.par++;
        } else {
          parImpar = ' • Impar';
          parImparCount.impar++;
        }

        // Alto/Bajo (mitades)
        if (num >= 1 && num <= 18) {
          parImpar += ' • 1ra Mitad';
          altoBajoCount.bajo++;
        } else {
          parImpar += ' • 2da Mitad';
          altoBajoCount.alto++;
        }
      }

      // Marcar el más reciente
      const recent = index === 1 ? ' ⬅️ *Último*' : '';
      text += `${index}. ${colorEmoji} *${num}*${parImpar}${recent}\n`;
      if (d.color) colorCount[d.color] = (colorCount[d.color] || 0) + 1;
      index++;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *RESUMEN DE TENDENCIAS:*\n\n`;
    text += `🎨 *Colores:*\n`;
    text += `   🔴 Rojos: ${colorCount.rojo} | ⚫ Negros: ${colorCount.negro} | 🟢 Ceros: ${colorCount.verde}\n\n`;
    text += `🔢 *Par/Impar:*\n`;
    text += `   Pares: ${parImparCount.par} | Impares: ${parImparCount.impar}\n\n`;
    text += `📍 *Mitades (1-18 / 19-36):*\n`;
    text += `   1ra Mitad: ${altoBajoCount.bajo} | 2da Mitad: ${altoBajoCount.alto}`;
  } else {
    // FStudio stats con formato mejorado
    const resultCount = { home: 0, away: 0, empate: 0 };
    const homeWins = [];
    const awayWins = [];
    const empates = [];

    let index = 1;
    for (const r of history) {
      const d = r.result;
      const resultEmoji = d.result === 'home' ? '🏠' : d.result === 'away' ? '✈️' : '🤝';
      const resultText = d.result === 'home' ? 'Home' : d.result === 'away' ? 'Away' : 'Empate';

      // Marcar el más reciente
      const recent = index === 1 ? ' ⬅️ *Último*' : '';

      text += `${index}. ${resultEmoji} *${resultText}* • Home: ${d.homeCard} vs Away: ${d.awayCard}${recent}\n`;

      // Contar resultados
      if (d.result === 'home') {
        resultCount.home++;
        homeWins.push(d.homeCard);
      } else if (d.result === 'away') {
        resultCount.away++;
        awayWins.push(d.awayCard);
      } else {
        resultCount.empate++;
        empates.push(`${d.homeCard}-${d.awayCard}`);
      }

      index++;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *RESUMEN DE TENDENCIAS:*\n\n`;
    text += `🎯 *Resultados:*\n`;
    text += `   🏠 Home: ${resultCount.home} | ✈️ Away: ${resultCount.away} | 🤝 Empates: ${resultCount.empate}\n\n`;

    // Mostrar las cartas ganadoras más frecuentes
    if (homeWins.length > 0) {
      const homeCardCount = {};
      homeWins.forEach(card => homeCardCount[card] = (homeCardCount[card] || 0) + 1);
      const topHomeCard = Object.entries(homeCardCount).sort((a, b) => b[1] - a[1])[0];
      text += `🏠 *Carta Home más ganadora:* ${topHomeCard[0]} (${topHomeCard[1]} veces)\n`;
    }

    if (awayWins.length > 0) {
      const awayCardCount = {};
      awayWins.forEach(card => awayCardCount[card] = (awayCardCount[card] || 0) + 1);
      const topAwayCard = Object.entries(awayCardCount).sort((a, b) => b[1] - a[1])[0];
      text += `✈️ *Carta Away más ganadora:* ${topAwayCard[0]} (${topAwayCard[1]} veces)`;
    }
  }

  await sock.sendMessage(remoteJid, { text }, { quoted: msg });
}
