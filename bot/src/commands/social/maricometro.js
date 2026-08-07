import { getMember } from '../../firebase/firebaseClient.js';
import { deductCashOrBank } from '../../services/economyService.js';
import { formatCoins, cleanJidForDisplay, randomInt } from '../../utils/helpers.js';

const MARICOMETRO_COST = 5;

// Mensajes de resultados según rangos con múltiples opciones aleatorias
const MARICOMETRO_MESSAGES = {
  // 0% - 10%: Muy hetero
  low: [
    '100% Macho pecho peludo,💪 lomo plateado, que se respeta. 🦍',
    'Más hetero imposible. Alpha total. 🔥👑',
    'Testosterona pura. Cero pluma detectada. 💉🚫',
    'Macho alfa. Ni una señal sospechosa. 🦁⚡',
    'Hetero nivel Dios. Respetos. 🙏✨',
    'Cero gay. 100% macizo. 🏋️‍♂️💪',
    '0 indicios. Puro macho. 🥩🔨',
    'Hetero certificado. Sin duda alguna. ✅📜',
    'Ni un poquito. Totalmente heterosexual. 🚹💯',
    'Macho recio mi King color Kong 🦍',
  ],

  // 11% - 40%: Un poco dudoso
  medium_low: [
    'Mmm... medio dudoso, pero pasable. 🤨👀',
    'Se le nota un toquecito, pero tranqui. 😬✋',
    'Algo sospechoso, pero nada confirmado. 🕵️‍♂️❓',
    'Mmm... no sé, se le ve un poquito raro. 🤔🧐',
    'Ligeramente cuestionable... pero bueno. 🤷',
    'Medio amanerado pero no del todo. 🤏💅',
    'Dudoso level bajo. Aún hay esperanza. 🙏😰',
    'Apenas y se nota. Casi hetero. 😐👌',
    'Un toque de sensibilidad extra... sospechoso. 🎭🤔',
    'Medio rarito, pero pasa desapercibido. 😶🌫️',
  ],

  // 41% - 70%: Bastante obvio
  medium_high: [
    '¡Cuidado! Medio rosquete el muchacho. ⚠️🍩',
    'Ya se nota bastante. Ya no hay vuelta atrás. 🏳️‍🌈🚪',
    'Alerta: Ya ni quiere disimular. 🚨👀',
    'Uy, ya no hay forma de negarlo. 🌈 🪶',
    'Se le ve el plumerito ya. 🪶👁️',
    'Medio obvio la verdad. 👀💅',
    'Se está notando mucho, bebita. 💁‍♀️🌈',
    'Ya no lo oculta tan bien... 😬🚪',
    'Bastante sospechoso. Confirmación pendiente. 🤨📋',
    'El armario está abierto a medias. 🚪🔓',
  ],

  // 71% - 90%: Muy gay
  high: [
    '¡Peligro! Casi casi Bebita. 🚨👶💅',
    'Alerta: Se le nota demasiado. 🌈🦄',
    'Ya es muy obvio. Solo falta la confirmación. 📢✅',
    'Se le sale la pluma por todos lados. 🪶💨🌪️',
    'Bebita en formación. Casi completo. 👶✨🌈',
    'El armario está abierto de par en par. 🚪🔓💨',
    'Uy, este ya está del otro lado... 🚶‍♂️➡️🌈',
    'Casi 100% confirmado. Pluma everywhere. 🪶🌍💯',
    'Se le nota a kilómetros. Muy gay. 📏🌈👀',
    'Solo falta que lo admita oficialmente. 📢🏳️‍🌈⏳',
  ],

  // 91% - 100%: 100% Gay
  ultra: [
    '¡100% Cabrazo!!! Se te recontra quemó el arroz, bebita. 💅🔥🍚',
    'Mariconazo!! Hasta participa en desfiles del orgullo. 🏳️‍🌈🎉💃',
    '¡SÚPER GAY! Ya salió a la luz. No hay vuelta atrás. 🌈🚨',
    'Bebita confirmada. Pluma nivel experto. ✨💅🪶',
    '100% Fabuloso. Hasta orgulloso es. 🌈💎💃',
    'Se te quemó el arroz, se te cayó el helado, se te perdió todo bebita. 🍚🔥🍦💔',
    'Saauuu! Ya no le importa nada.  🪶🌍💅',
    'Demasiada pluma. Es oficialmente una diva. 💅👑🌈',
  ],
};

function getMaricometroPercentage(jid) {
  // Crear un hash simple pero consistente basado en el JID
  let hash = 0;
  for (let i = 0; i < jid.length; i++) {
    hash = ((hash << 5) - hash) + jid.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convertir a porcentaje (0-100)
  return Math.abs(hash % 101);
}

function getMaricometroMessage(percentage) {
  let category;
  let emoji;

  if (percentage <= 10) {
    category = 'low';
    emoji = '🚹';
  } else if (percentage <= 40) {
    category = 'medium_low';
    emoji = '🤔';
  } else if (percentage <= 70) {
    category = 'medium_high';
    emoji = '🌈';
  } else if (percentage <= 90) {
    category = 'high';
    emoji = '🦄';
  } else {
    category = 'ultra';
    emoji = '🏳️‍🌈';
  }

  const messages = MARICOMETRO_MESSAGES[category];
  const randomMessage = messages[randomInt(0, messages.length - 1)];

  return [emoji, randomMessage];
}

export async function maricometroCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  // Obtener menciones
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  // Si no hay menciones, mostrar ayuda
  if (mentions.length === 0) {
    await sock.sendMessage(remoteJid, {
      text: `🌈 *Maricómetro*\n\n*Uso:*\n• \`!maricometro @usuario\` — Calcula el nivel gay del usuario\n• \`!mariposometro @usuario\` — (Alias)\n\n💰 *Costo:* ${formatCoins(MARICOMETRO_COST)} por uso`,
    }, { quoted: msg });
    return;
  }

  const targetJid = mentions[0];

  // Verificar y cobrar
  const member = memberData || await getMember(groupJid, senderJid);
  const cash = member?.cash || 0;
  const bank = member?.bank || 0;

  if (cash + bank < MARICOMETRO_COST) {
    await sock.sendMessage(remoteJid, {
      text: `❌ No tienes suficiente dinero.\n💰 Costo: ${formatCoins(MARICOMETRO_COST)}\n💵 Tu efectivo: ${formatCoins(cash)}\n🏦 Tu banco: ${formatCoins(bank)}\n\n_Trabaja o juega para ganar más RC._`,
    }, { quoted: msg });
    return;
  }

  // Deducir costo
  const payment = await deductCashOrBank(groupJid, senderJid, MARICOMETRO_COST);

  // Obtener nombre del target
  const targetMember = await getMember(groupJid, targetJid);
  const targetName = targetMember?.pushName || `@${cleanJidForDisplay(targetJid)}`;

  // Calcular porcentaje
  const percentage = getMaricometroPercentage(targetJid);
  const [emoji, message] = getMaricometroMessage(percentage);

  // Animación de carga progresiva (6 etapas)
  const loadingMsg = await sock.sendMessage(remoteJid, {
    text: `🌈 *Maricómetro*\n\n🎯 Analizando a @${cleanJidForDisplay(targetJid)}...\n\n⚙️ Iniciando escaneo...`,
    mentions: [targetJid],
  }, { quoted: msg });

  await new Promise((r) => setTimeout(r, 1200));

  // Etapa 2
  await sock.sendMessage(remoteJid, {
    text: `🌈 *Maricómetro*\n\n🎯 Analizando a @${cleanJidForDisplay(targetJid)}...\n\n🔍 Revisando comportamiento...\n▓░░░░░░░░░ 10%`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Etapa 3
  await sock.sendMessage(remoteJid, {
    text: `🌈 *Maricómetro*\n\n🎯 Analizando a @${cleanJidForDisplay(targetJid)}...\n\n💅 Escaneando gestos...\n▓▓▓░░░░░░░ 30%`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1100));

  // Etapa 4
  await sock.sendMessage(remoteJid, {
    text: `🌈 *Maricómetro*\n\n🎯 Analizando a @${cleanJidForDisplay(targetJid)}...\n\n🎨 Midiendo nivel de fabulosidad...\n▓▓▓▓▓░░░░░ 50%`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Etapa 5
  await sock.sendMessage(remoteJid, {
    text: `🌈 *Maricómetro*\n\n🎯 Analizando a @${cleanJidForDisplay(targetJid)}...\n\n✨ Consultando el armario...\n▓▓▓▓▓▓▓░░░ 75%`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 1200));

  // Etapa 6
  await sock.sendMessage(remoteJid, {
    text: `🌈 *Maricómetro*\n\n🎯 Analizando a @${cleanJidForDisplay(targetJid)}...\n\n🦄 Finalizando análisis...\n▓▓▓▓▓▓▓▓▓░ 95%`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });

  await new Promise((r) => setTimeout(r, 800));

  // Mostrar resultado final
  await sock.sendMessage(remoteJid, {
    text: `🌈 *MARICÓMETRO* 🌈\n\n> @${cleanJidForDisplay(targetJid)} ${emoji}\n\n_"${message}"_\n\n📊 *Nivel Gay: ${percentage}%*`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });
}
