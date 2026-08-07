import { getMember } from '../../firebase/firebaseClient.js';
import { deductCashOrBank } from '../../services/economyService.js';
import { formatCoins, cleanJidForDisplay } from '../../utils/helpers.js';

const MARICOMETRO_COST = 1;

// Mensajes de resultados según el porcentaje
const MARICOMETRO_MESSAGES = {
  0: ['🚹 0%', 'Más hetero imposible. 100% macho alfa.'],
  10: ['😐 10%', 'Casi nada. Solo un toque de sensibilidad.'],
  20: ['🤔 20%', 'Un poco sospechoso, pero nada confirmado.'],
  30: ['👀 30%', 'Empieza a notarse algo...'],
  40: ['🌈 40%', 'Definitivamente hay señales.'],
  50: ['🎨 50%', '50/50. Perfectamente balanceado.'],
  60: ['💅 60%', 'Ya es bastante obvio.'],
  70: ['✨ 70%', 'El armario está empezando a abrirse.'],
  80: ['🦄 80%', 'Muy evidente. Solo falta la confirmación oficial.'],
  90: ['🌈✨ 90%', '¡Casi saliendo del armario completamente!'],
  100: ['🏳️‍🌈 100%', '¡SÚPER GAY! Orgullosamente fuera del armario. 🎉'],
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
  // Encontrar el rango más cercano
  const ranges = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const closest = ranges.reduce((prev, curr) => {
    return Math.abs(curr - percentage) < Math.abs(prev - percentage) ? curr : prev;
  });

  return MARICOMETRO_MESSAGES[closest];
}

export async function maricometroCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  // Obtener menciones
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  // Si no hay menciones, mostrar ayuda
  if (mentions.length === 0) {
    await sock.sendMessage(remoteJid, {
      text: `🌈 *Maricómetro*\n\n*Uso:*\n• \`!maricometro @usuario\` — Calcula el nivel gay del usuario\n• \`!mariposometro @usuario\` — (Alias)\n\n💰 *Costo:* ${formatCoins(MARICOMETRO_COST)} por uso\n\n_⚠️ Este es un juego de humor. No representa orientaciones sexuales reales._`,
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
    text: `🌈 *Maricómetro* 🌈\n\n> @${cleanJidForDisplay(targetJid)}\n\n*${emoji}*\n\n_"${message}"_\n\n📊 *Nivel Gay: ${percentage}%*\n\n_⚠️ Esto es solo humor, no representa la realidad._`,
    mentions: [targetJid],
    edit: loadingMsg.key,
  });

  // Mostrar detalles del pago si se usó banco
  if (payment.fromBank > 0) {
    const paymentDetails = `💰 Pagaste ${formatCoins(payment.fromCash)} de efectivo + ${formatCoins(payment.fromBank)} del banco`;
    await sock.sendMessage(remoteJid, {
      text: paymentDetails,
    });
  }
}
