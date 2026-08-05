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
 * Construye la respuesta de perfil (!me).
 */
export function buildProfileMessage({ pushName, level, isMax, messageCount, xp, required, cash, bank, warnings, hasShield, birthday, lidNumber }) {
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
  if (hasShield) lines.push(`🛡️ Escudo activo`);

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
export function buildBalanceMessage({ cash, bank }) {
  const total = (cash || 0) + (bank || 0);
  return [
    `${section('💰', 'Tu Balance')}\n`,
    bullet('💵 Efectivo', formatCoins(cash)),
    bullet('🏦 Banco', formatCoins(bank)),
    sep(),
    bullet('📊 Total', formatCoins(total)),
  ].join('\n');
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
  return `${bold('$' + num.toLocaleString('en-US'))} RC`;
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
