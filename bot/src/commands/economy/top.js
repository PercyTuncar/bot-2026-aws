import { getAllMembers, getMember } from '../../firebase/firebaseClient.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { deductCashOrBank } from '../../services/economyService.js';

const TOP_COST = 5;

export async function topCommand(sock, msg, context) {
  const { args, senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const type = args[0]?.toLowerCase() || 'total';

  // Validar tipo
  if (!['cash', 'efectivo', 'bank', 'banco', 'total'].includes(type)) {
    await enqueueMessage(remoteJid, {
      text: `💰 *Top Ranking*\n\n*Uso:*\n• \`!top\` — Top 10 con más dinero total (default)\n• \`!top cash\` — Top 10 con más efectivo\n• \`!top bank\` — Top 10 con más en banco\n• \`!top total\` — Top 10 con más dinero total\n\n💵 *Costo:* ${formatCoins(TOP_COST)} por consulta`,
    }, { quoted: msg }, 1);
    return;
  }

  // Verificar y cobrar
  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;
  const bank = member?.bank || 0;

  if (cash + bank < TOP_COST) {
    await enqueueMessage(remoteJid, {
      text: `❌ No tienes suficiente dinero.\n💰 Costo: ${formatCoins(TOP_COST)}\n💵 Tu efectivo: ${formatCoins(cash)}\n🏦 Tu banco: ${formatCoins(bank)}\n\n_Trabaja o juega para ganar más RC._`,
    }, { quoted: msg }, 1);
    return;
  }

  // Deducir costo
  await deductCashOrBank(groupJid, senderJid, TOP_COST);

  // Obtener todos los miembros
  const members = await getAllMembers(groupJid);

  if (!members || members.length === 0) {
    await enqueueMessage(remoteJid, { text: '❌ No hay datos de economía en este grupo aún.' }, { quoted: msg }, 1);
    return;
  }

  // Determinar qué ordenar
  let sorted;
  let title;
  let emoji;

  const normalizedType = ['cash', 'efectivo'].includes(type) ? 'cash'
    : ['bank', 'banco'].includes(type) ? 'bank'
    : 'total';

  if (normalizedType === 'cash') {
    sorted = members
      .map(m => ({ ...m, value: m.cash || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    title = 'Top 10 - Más Efectivo 💵';
    emoji = '💵';
  } else if (normalizedType === 'bank') {
    sorted = members
      .map(m => ({ ...m, value: m.bank || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    title = 'Top 10 - Más en Banco 🏦';
    emoji = '🏦';
  } else {
    sorted = members
      .map(m => ({ ...m, value: (m.cash || 0) + (m.bank || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    title = 'Top 10 - Los Ricos de Ravehub City 🏆';
    emoji = '🏆';
  }

  // Filtrar usuarios con dinero > 0
  sorted = sorted.filter(m => m.value > 0);

  if (sorted.length === 0) {
    await enqueueMessage(remoteJid, { text: '❌ No hay usuarios con dinero en este grupo.' }, { quoted: msg }, 1);
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let text = `${emoji} *${title}*\n\n`;

  // Construir lista con menciones
  const mentions = [];
  sorted.forEach((m, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const jid = m.jid;
    const isYou = jid === senderJid ? ' ⬅️ *Tú*' : '';

    if (jid) {
      mentions.push(jid);
      text += `${medal} @${cleanJidForDisplay(jid)} — ${formatCoins(m.value)}${isYou}\n`;
    } else {
      const name = m.pushName || m.id || 'Usuario';
      text += `${medal} *${name}* — ${formatCoins(m.value)}${isYou}\n`;
    }
  });

  text += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 _Consulta pagada: ${formatCoins(TOP_COST)}_`;

  await enqueueMessage(remoteJid, {
    text,
    mentions,
  }, { quoted: msg }, 1);
}
