/**
 * Capa unificada de formato de mensajes — PRD sección 0.2
 *
 * TODOS los comandos construyen sus mensajes a través de estas funciones.
 * Garantiza formato consistente en todo el bot (negrita, cursiva, listas,
 * citas, emojis fijos por categoría).
 *
 * Emojis canónicos por categoría (definidos aquí, nunca en los comandos):
 *   💰  dinero / saldo
 *   ⭐  nivel / experiencia
 *   ⚠️  advertencia
 *   🎮  juegos / casino
 *   🔔  alertas
 *   🛡️  protección / tienda
 *   👤  perfil / usuario
 *   📋  listas / estadísticas
 *   ✅  éxito
 *   ❌  error
 *   ⏳  espera / cooldown
 *   💬  mensajes
 *   🏦  banco
 *   💵  efectivo
 */

// ─── Primitivas de formato ────────────────────────────────────────────────────

/** Negrita: *texto* */
export const bold = (text) => `*${text}*`;

/** Cursiva: _texto_ */
export const italic = (text) => `_${text}_`;

/** Tachado: ~texto~ */
export const strike = (text) => `~${text}~`;

/** Monoespaciado: ```texto``` (neutraliza otros formatos dentro) */
export const mono = (text) => `\`\`\`${text}\`\`\``;

/** Cita/bloque: > texto */
export const quote = (text) => `> ${text}`;

// ─── Constructores de secciones ───────────────────────────────────────────────

/**
 * Encabezado de sección (emoji + negrita).
 * Ejemplo: "💰 *Economía*"
 */
export const section = (emoji, title) => `${emoji} ${bold(title)}`;

/**
 * Elemento de lista con viñeta (para catálogos, perfiles, warnlist, infocorp).
 * Ejemplo: "• Nombre: *valor*"
 */
export const bullet = (label, value = null) =>
  value !== null ? `• ${label}: ${bold(value)}` : `• ${label}`;

/**
 * Elemento de lista numerada (para ayuda paso a paso).
 * Ejemplo: "1. Escribe !fstudio home 5000"
 */
export const numbered = (n, text) => `${n}. ${text}`;

/**
 * Separador visual entre secciones.
 */
export const sep = () => `────────────────`;

// ─── Constructores de mensajes completos ──────────────────────────────────────

/**
 * Mensaje de error estándar.
 */
export const errorMsg = (text) => `❌ ${text}`;

/**
 * Mensaje de éxito estándar.
 */
export const successMsg = (text) => `✅ ${text}`;

/**
 * Mensaje de cooldown estandarizado.
 */
export const cooldownMsg = (remaining) =>
  `⏳ Espera ${bold(remaining)} para volver a usar este comando.`;

/**
 * Formatea un cumpleaños (Timestamp de Firebase) a formato "DD de Mes" (sin año).
 * Ejemplo: formatBirthday(timestamp) → "15 de Marzo"
 */
export function formatBirthday(birthday) {
  if (!birthday) return null;

  // Si es un Timestamp de Firebase, convertir a Date
  let date;
  if (birthday.toDate && typeof birthday.toDate === 'function') {
    date = birthday.toDate();
  } else if (birthday instanceof Date) {
    date = birthday;
  } else if (birthday._seconds) {
    // Formato interno de Timestamp de Firebase
    date = new Date(birthday._seconds * 1000);
  } else {
    return null;
  }

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];

  return `${day} de ${month}`;
}

/**
 * Formatea tiempo restante para items activos (en formato "Xh Ym Zs")
 */
export function formatTimeRemaining(expiresAt) {
  if (!expiresAt) return '';
  const remaining = Math.max(0, expiresAt - Date.now());
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Construye la respuesta de perfil (!me).
 */
export function buildProfileMessage({ pushName, level, isMax, messageCount, xp, required, cash, bank, warnings, shieldItem, bodyguardItem, birthday, lidNumber }) {
  const lines = [
    `${section('👤', 'Tu Perfil en este Grupo')}\n`,
    bullet('Nombre', pushName || 'Sin nombre'),
    bullet('Nivel', `${level}${isMax ? ' (MAX)' : ''}`),
    bullet('Mensajes', messageCount.toLocaleString('es-PE')),
    bullet('Progreso XP', `${xp}/${required}`),
    bullet('Efectivo', `${formatCoins(cash)}`),
    bullet('Banco', `${formatCoins(bank)}`),
    bullet('Advertencias', `${warnings}/3`),
  ];

  // Mostrar shields activos con tiempo restante
  if (shieldItem) {
    const timeLeft = formatTimeRemaining(shieldItem.expiresAt);
    lines.push(`🛡️ Escudo activo ${timeLeft}`);
  }
  if (bodyguardItem) {
    const timeLeft = formatTimeRemaining(bodyguardItem.expiresAt);
    lines.push(`💂 Guardaespaldas activo ${timeLeft}`);
  }

  // Formatear cumpleaños correctamente
  const formattedBirthday = formatBirthday(birthday);
  if (formattedBirthday) {
    lines.push(bullet('Cumpleaños', formattedBirthday));
  }

  if (lidNumber) {
    lines.push(`\n${bullet('Tu ID', lidNumber)}`);
    lines.push(`\n_Usa ${bold('!id')} para actualizar tu perfil web_`);
  }
  return lines.join('\n');
}

/**
 * Construye mensaje de resultado de economía (!work, !rob, !crime).
 */
export function buildEconomyResult({ emoji, mainText, subText, cash }) {
  let msg = `${emoji} ${italic(mainText)}`;
  if (subText) msg += `\n${quote(subText)}`;
  msg += `\n\n${bullet('Efectivo', formatCoins(cash))}`;
  return msg;
}

/**
 * Construye mensaje de balance (!balance, !wallet).
 */
export function buildBalanceMessage({ cash, bank, debt, loanInfo, userName = 'Tu', isOtherUser = false }) {
  const total = (cash || 0) + (bank || 0);

  // Determinar el título según si es propio o de otro usuario
  const title = isOtherUser ? `Balance de ${userName}` : 'Tu Balance';

  const lines = [
    `${section('💰', title)}\n`,
    bullet('💵 Efectivo', formatCoins(cash)),
    bullet('🏦 Banco', formatCoins(bank)),
    sep(),
    bullet('📊 Total', formatCoins(total)),
  ];

  // Mostrar deuda si existe
  if (debt && debt > 0) {
    lines.push(sep());
    lines.push(bullet('💳 Deuda Total', formatCoins(debt)));

    // Si hay un préstamo activo, mostrar información adicional
    if (loanInfo) {
      if (loanInfo.status === 'overdue' || loanInfo.status === 'infocorp') {
        lines.push(`⚠️ ${italic('¡Préstamo vencido! Está en Infocorp')}`);
      } else if (loanInfo.status === 'active' && loanInfo.dueAt) {
        const dueDate = new Date(loanInfo.dueAt).toLocaleString('es-PE', {
          timeZone: 'America/Lima',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        lines.push(`📅 ${italic(`Vence: ${dueDate}`)}`);
      }
    }

    lines.push(`\n💡 ${italic('Tus ingresos se destinan automáticamente al pago')}`);
  }

  return lines.join('\n');
}

/**
 * Construye texto de una alerta programada (para el scheduler).
 */
export function buildAlertMessage({ text, link }) {
  let msg = text || '';
  if (link) msg += `\n\n🔗 ${link}`;
  return msg;
}

/**
 * Construye mensaje de bienvenida con variables.
 */
export function buildWelcomeText(template, { memberJid, participantCount, groupSubject }) {
  const shortId = memberJid.replace('@s.whatsapp.net', '').replace('@lid', '');
  return (template || `¡Bienvenido/a al grupo, @{{mention}}! 🎉\nAhora somos ${bold(String(participantCount))} miembros.`)
    .replace('{{mention}}', shortId)
    .replace('{{count}}', bold(String(participantCount)))
    .replace('{{group}}', groupSubject || 'el grupo');
}

/**
 * Formatea RCoins a string legible con símbolo $, redondeado (sin decimales).
 * Escala: $1 RC = 1 RC (tipo de cambio: $1000 RC = S/ 1.00 sol peruano)
 * Ejemplo: formatCoins(8723) → "*$8,723* RC"
 */
export function formatCoins(amount) {
  if (amount === undefined || amount === null) return '$0 RC';
  const num = Math.round(Number(amount));
  return `$${num.toLocaleString('en-US')} RC`;
}

/**
 * Construye mensaje de advertencia (!warn).
 */
export function buildWarnMessage({ targetShortJid, reason, count, wasKicked }) {
  const lines = [
    `${section('⚠️', 'Advertencia registrada')}\n`,
    bullet('Usuario', `@${targetShortJid}`),
    quote(reason),
    bullet('Advertencias', `${bold(String(count))}/3`),
  ];
  if (wasKicked) lines.push(`\n🚫 El usuario fue ${bold('expulsado')} por acumular 3 advertencias.`);
  return lines.join('\n');
}

/**
 * Construye mensaje de resultado de casino.
 */
export function buildGameResult({ game, resultText, wonAmount, lostAmount, newCash }) {
  const lines = [`${section('🎮', game)}\n`, `${quote(resultText)}\n`];
  if (wonAmount > 0) lines.push(`🎉 ${bold('¡Ganaste!')} +${formatCoins(wonAmount)}`);
  else lines.push(`😞 ${bold('Perdiste')} ${formatCoins(lostAmount)}`);
  lines.push(`\n${bullet('Efectivo', formatCoins(newCash))}`);
  return lines.join('\n');
}
