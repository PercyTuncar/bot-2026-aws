/**
 * Normalize a phone number string to E.164-like format (digits only, no +).
 * Used for searching members by phone number.
 */
export function normalizePhone(input) {
  if (!input) return '';
  return input.replace(/[^\d]/g, '');
}

/**
 * Extract a human-readable name from a Baileys message participant or contact.
 */
export function extractName(msg) {
  return (
    msg?.pushName ||
    msg?.verifiedBizName ||
    'Usuario'
  );
}

/**
 * Determine if a JID is a group JID.
 */
export function isGroupJid(jid) {
  return jid?.endsWith('@g.us') ?? false;
}

/**
 * Determine if a JID is a private (DM) JID.
 */
export function isDmJid(jid) {
  return jid?.endsWith('@s.whatsapp.net') || jid?.endsWith('@lid') || false;
}

/**
 * Format RCoins to a readable string with $ symbol, rounded (no decimals).
 * Scale: $1 RC = 1 RC (exchange rate: $1000 RC = S/ 1.00 PEN)
 * Example: formatCoins(8723) → "$8,723 RC"
 */
export function formatCoins(amount) {
  if (amount === undefined || amount === null) return '$0 RC';
  return `$${Math.round(Number(amount)).toLocaleString('en-US')} RC`;
}

/**
 * Format RCoins to Soles (1000 RC = 1 sol).
 */
export function coinsToSoles(amount) {
  const rate = parseInt(process.env.EXCHANGE_RATE || '1000', 10);
  return (amount / rate).toFixed(2);
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random profile token (for !me links).
 */
export function generateToken(jid) {
  const base = Buffer.from(jid).toString('base64url').slice(0, 16);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}${rand}`;
}

/**
 * Check if a cooldown has expired.
 * NOTE: cooldowns are stored as expiration timestamps (Date.now() + duration),
 * not as "last used" timestamps. Always pass the expiration timestamp here.
 * @param {number|null} expiresAt - Epoch ms when the cooldown expires
 */
export function isCooldownExpired(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
}

/**
 * Get remaining cooldown time as human-readable string.
 * @param {number} expiresAt - Epoch ms when the cooldown expires
 */
export function getCooldownRemaining(expiresAt) {
  const remaining = Math.max(0, (expiresAt || 0) - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { ms: remaining, text: mins > 0 ? `${mins}m ${secs}s` : `${secs}s` };
}

/**
 * Extract the plain text body from a Baileys message.
 */
export function getMessageText(msg) {
  const m = msg?.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  );
}

/**
 * Get the content type of a message.
 */
export function getContentType(m) {
  if (!m?.message) return null;
  const keys = Object.keys(m.message).filter(
    (k) => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage'
  );
  return keys[0] || null;
}

/**
 * Extract the quoted message from a Baileys message.
 */
export function getQuotedMessage(msg) {
  return (
    msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg?.message?.imageMessage?.contextInfo?.quotedMessage ||
    msg?.message?.videoMessage?.contextInfo?.quotedMessage ||
    null
  );
}

/**
 * Extract the stanza ID of the quoted message.
 */
export function getQuotedMessageKey(msg) {
  const ctx =
    msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.imageMessage?.contextInfo ||
    msg?.message?.videoMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    id: ctx.stanzaId,
    remoteJid: ctx.remoteJid || msg?.key?.remoteJid,
    fromMe: ctx.participant === (process.env.OWNER_JID || ''),
    participant: ctx.participant,
  };
}

/**
 * Work phrases for !work command — variedad de trabajos en Ravehub City.
 */
export const WORK_PHRASES = [
  'Vendiste palomitas en el festival 🍿 y ganaste',
  'Acomodaste sillas en el concierto 💺 y ganaste',
  'Cargaste equipos de sonido 🎛️ y ganaste',
  'Repartiste flyers del evento 📄 y ganaste',
  'Fuiste guardia de seguridad del backstage 🔒 y ganaste',
  'Fotografiaste el show 📸 y ganaste',
  'Controlaste el tráfico en el estacionamiento 🚗 y ganaste',
  'Ayudaste con el escenario antes del show 🎪 y ganaste',
  'Vendiste pulseras del evento 🎟️ y ganaste',
  'Manejaste el carro de souvenirs 🛒 y ganaste',
  'Hiciste delivery en bicicleta por Ravehub 🚴 y ganaste',
  'Paseaste perros en el parque central 🐕 y ganaste',
  'Bartender en un bar de moda 🍹 y ganaste',
  'Reparaste computadoras en un café 💻 y ganaste',
  'DJ en una fiesta privada 🎧 y ganaste',
  'Limpiaste grafitis en el metro 🚇 y ganaste',
  'Preparaste hamburguesas en un food truck 🍔 y ganaste',
  'Diste clases de baile en la plaza 💃 y ganaste',
  'Vendiste artesanías en la feria 🎨 y ganaste',
  'Hiciste de Uber por la ciudad 🚕 y ganaste',
  'Entrenaste en el gimnasio como sparring 🥊 y ganaste',
  'Moderaste un torneo de videojuegos 🎮 y ganaste',
  'Repartiste pizzas en moto 🍕 y ganaste',
  'Fuiste extra en una película local 🎬 y ganaste',
  'Lavaste autos en el car wash 🚙 y ganaste',
  'Vendiste café en una esquina ☕ y ganaste',
  'Hiciste de mimo en el distrito turístico 🎭 y ganaste',
  'Cuidaste niños en un cumpleaños 🎂 y ganaste',
  'Ayudaste en una mudanza 📦 y ganaste',
  'Tradujiste documentos online 📝 y ganaste',
  'Diseñaste logos para empresas locales 🎨 y ganaste',
  'Instalaste internet en edificios 📡 y ganaste',
  'Hiciste mantenimiento de jardines 🌱 y ganaste',
  'Reparaste bicicletas en el taller 🔧 y ganaste',
  'Vendiste flores en la avenida principal 💐 y ganaste',
  'Diste tours turísticos por Ravehub 🗺️ y ganaste',
  'Editaste videos para youtubers 🎥 y ganaste',
  'Cocinaste en un restaurante japonés 🍣 y ganaste',
  'Organizaste un evento corporativo 💼 y ganaste',
  'Pintaste murales en el barrio bohemio 🖌️ y ganaste',
  'Vendiste helados en el malecón 🍦 y ganaste',
  'Hiciste streaming de videojuegos 🎮 y ganaste',
  'Reparaste celulares en el centro comercial 📱 y ganaste',
  'Fuiste camarógrafo en una boda 📹 y ganaste',
  'Vendiste ropa vintage en el mercado 👕 y ganaste',
  'Diste clases de yoga en el parque 🧘 y ganaste',
  'Hiciste tatuajes temporales en la playa 💉 y ganaste',
  'Armaste muebles para clientes 🪑 y ganaste',
  'Vendiste empanadas en la terminal 🥟 y ganaste',
  'Hiciste malabares en el semáforo 🤹 y ganaste',
];
