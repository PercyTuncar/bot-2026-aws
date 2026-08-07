import { getMember } from '../../firebase/firebaseClient.js';
import { deductCashOrBank } from '../../services/economyService.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';

const SHIP_COST = 2;

// Mensajes de resultados según el porcentaje
const SHIP_MESSAGES = {
  0: ['💔 0%', 'Esto no va a funcionar... ni en un millón de años.'],
  10: ['💔 10%', 'Mejor como amigos... o mejor ni eso.'],
  20: ['😐 20%', 'Hay química... pero solo en la clase de química.'],
  30: ['😕 30%', 'Podrían intentarlo, pero no promete mucho.'],
  40: ['🤔 40%', 'Hay potencial, pero falta chispa.'],
  50: ['😊 50%', '50/50. Como lanzar una moneda al aire.'],
  60: ['😍 60%', '¡Interesante! Hay algo aquí.'],
  70: ['💕 70%', 'Tienen buena química juntos.'],
  80: ['💖 80%', '¡Wow! Definitivamente hay amor en el aire.'],
  90: ['💗 90%', '¡Casi perfectos! El destino los juntó.'],
  100: ['💝 100%', '¡AMOR VERDADERO! Son almas gemelas. 🎉'],
};

function getShipPercentage(jid1, jid2) {
  // Ordenar JIDs para que siempre den el mismo resultado
  const [a, b] = [jid1, jid2].sort();

  // Crear un hash simple pero consistente
  const combined = a + b;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convertir a porcentaje (0-100)
  return Math.abs(hash % 101);
}

function getShipMessage(percentage) {
  // Encontrar el rango más cercano
  const ranges = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const closest = ranges.reduce((prev, curr) => {
    return Math.abs(curr - percentage) < Math.abs(prev - percentage) ? curr : prev;
  });

  return SHIP_MESSAGES[closest];
}

export async function shipCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  // Obtener menciones
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  // Si no hay menciones, mostrar ayuda
  if (mentions.length === 0) {
    await sock.sendMessage(remoteJid, {
      text: `💕 *Ship Calculator*\n\n*Uso:*\n• \`!ship @user1 @user2\` — Calcula amor entre dos usuarios\n• \`!ship @user\` — Calcula amor entre tú y el usuario\n\n💰 *Costo:* ${formatCoins(SHIP_COST)} por uso\n\n_El calculador usa algoritmos avanzados de compatibilidad... o no. 😏_`,
    }, { quoted: msg });
    return;
  }

  // Verificar y cobrar
  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;
  const bank = member?.bank || 0;

  if (cash + bank < SHIP_COST) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No tienes suficiente dinero.\n💰 Costo: ${formatCoins(SHIP_COST)}\n💵 Tu efectivo: ${formatCoins(cash)}\n🏦 Tu banco: ${formatCoins(bank)}\n\n_Trabaja o juega para ganar más RC._`,
    }, { quoted: msg });
    return;
  }

  // Deducir costo
  const payment = await deductCashOrBank(groupJid, senderJid, SHIP_COST);

  // Determinar los dos usuarios
  let user1Jid, user2Jid;
  let user1Name, user2Name;

  if (mentions.length === 1) {
    // !ship @user - entre el que ejecuta y el mencionado
    user1Jid = senderJid;
    user2Jid = mentions[0];

    // Obtener nombres
    const member1 = member;
    const member2 = await getMember(groupJid, user2Jid);

    user1Name = member1?.pushName || `@${cleanJidForDisplay(user1Jid)}`;
    user2Name = member2?.pushName || `@${cleanJidForDisplay(user2Jid)}`;
  } else {
    // !ship @user1 @user2 - entre dos mencionados
    user1Jid = mentions[0];
    user2Jid = mentions[1];

    // Obtener nombres
    const member1 = await getMember(groupJid, user1Jid);
    const member2 = await getMember(groupJid, user2Jid);

    user1Name = member1?.pushName || `@${cleanJidForDisplay(user1Jid)}`;
    user2Name = member2?.pushName || `@${cleanJidForDisplay(user2Jid)}`;
  }

  // Validar que no sea la misma persona
  if (user1Jid === user2Jid) {
    await sock.sendMessage(remoteJid, {
      text: `😅 No puedes calcular tu amor contigo mismo.\n\n_Pero hey, el amor propio es importante. Te devolvemos ${formatCoins(SHIP_COST)}._`,
    }, { quoted: msg });

    // Devolver el dinero
    await deductCashOrBank(groupJid, senderJid, -SHIP_COST);
    return;
  }

  // Calcular porcentaje
  const percentage = getShipPercentage(user1Jid, user2Jid);
  const [emoji, message] = getShipMessage(percentage);

  // Animación de carga progresiva (6 etapas)
  const loadingMsg = await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator*\n\n👤 ${user1Name}\n❤️\n👤 ${user2Name}\n\n⚙️ Iniciando análisis...`,
    mentions: [user1Jid, user2Jid],
  }, { quoted: msg });

  await new Promise((r) => setTimeout(r, 1200));

  // Etapa 2
  await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator*\n\n👤 ${user1Name}\n❤️\n👤 ${user2Name}\n\n🔍 Escaneando perfiles...\n▓░░░░░░░░░ 10%`,
    mentions: [user1Jid, user2Jid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Etapa 3
  await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator*\n\n👤 ${user1Name}\n❤️\n👤 ${user2Name}\n\n🧬 Analizando química...\n▓▓▓░░░░░░░ 30%`,
    mentions: [user1Jid, user2Jid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1100));

  // Etapa 4
  await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator*\n\n👤 ${user1Name}\n❤️\n👤 ${user2Name}\n\n💫 Calculando compatibilidad...\n▓▓▓▓▓░░░░░ 50%`,
    mentions: [user1Jid, user2Jid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Etapa 5
  await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator*\n\n👤 ${user1Name}\n❤️\n👤 ${user2Name}\n\n🔮 Consultando el destino...\n▓▓▓▓▓▓▓░░░ 75%`,
    mentions: [user1Jid, user2Jid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1200));

  // Etapa 6
  await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator*\n\n👤 ${user1Name}\n❤️\n👤 ${user2Name}\n\n✨ Finalizando cálculos...\n▓▓▓▓▓▓▓▓▓░ 95%`,
    mentions: [user1Jid, user2Jid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 800));

  // Mostrar resultado final
  await sock.sendMessage(remoteJid, {
    text: `💕 *Ship Calculator* 💕\n\n> @${cleanJidForDisplay(user1Jid)}\n> 💖\n> @${cleanJidForDisplay(user2Jid)}\n\n*${emoji}*\n\n_"${message}"_\n\n📊 *Compatibilidad: ${percentage}%*`,
    mentions: [user1Jid, user2Jid],
    edit: loadingMsg.key,
  });
}
