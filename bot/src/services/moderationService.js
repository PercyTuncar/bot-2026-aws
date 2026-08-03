import {
  getMember,
  upsertMember,
  upsertGroup,
  sanitizeJidForDocId,
} from '../firebase/firebaseClient.js';
import { groupMetadataCache } from '../utils/groupCache.js';
import { enqueueMessage } from '../queue/sendQueue.js';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function extractDomain(url) {
  try {
    const cleaned = url.startsWith('www.') ? 'https://' + url : url;
    return new URL(cleaned).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export async function applyAntilink(sock, msg, groupJid, senderJid, text, antilinkConfig) {
  if (!text) return false;
  const links = text.match(URL_REGEX);
  if (!links) return false;

  const allowedDomains = antilinkConfig.allowedDomains || [];
  const blockedLinks = links.filter((link) => !allowedDomains.includes(extractDomain(link)));
  if (blockedLinks.length === 0) return false;

  // Eliminar el mensaje ofensivo — alta prioridad, inmediato
  try {
    await enqueueMessage(groupJid, { delete: msg.key }, {}, 1);
  } catch (e) {
    console.error('[antilink] Failed to delete message:', e.message);
  }

  await addWarning(sock, groupJid, senderJid, 'Compartió un link no permitido', 'auto-antilink');
  return true;
}

export async function applyAntiwords(sock, msg, groupJid, senderJid, text, antiwordsConfig) {
  if (!text) return false;
  const words = antiwordsConfig.words || [];
  const lower = text.toLowerCase();
  if (!words.some((w) => lower.includes(w.toLowerCase()))) return false;

  try {
    await enqueueMessage(groupJid, { delete: msg.key }, {}, 1);
  } catch (e) {
    console.error('[antiwords] Failed to delete message:', e.message);
  }

  await addWarning(sock, groupJid, senderJid, 'Escribió una palabra prohibida', 'auto-antiwords');
  return true;
}

export async function applyFormatLock(sock, msg, groupJid, senderJid, contentType, formatLock) {
  if (!formatLock?.lockedFormats) return false;

  const TYPE_MAP = {
    sticker: ['stickerMessage'],
    imagen: ['imageMessage'],
    audio: ['audioMessage'],
    texto: ['conversation', 'extendedTextMessage'],
  };

  const now = Date.now();
  for (const [format, expiry] of Object.entries(formatLock.lockedFormats)) {
    if (expiry > now && (TYPE_MAP[format] || []).includes(contentType)) {
      try {
        await enqueueMessage(groupJid, { delete: msg.key }, {}, 1);
      } catch (e) {
        console.error('[formatLock] Failed to delete message:', e.message);
      }
      return true;
    }
  }
  return false;
}

/**
 * Agregar advertencia. Compartida por !warn, antilink y antiwords.
 * Retorna el nuevo conteo de advertencias.
 */
export async function addWarning(sock, groupJid, targetJid, reason, source = 'manual') {
  const member = await getMember(groupJid, targetJid);
  if (!member) return 0;

  const warnings = [...(member.warnings || []), {
    reason,
    source,
    date: new Date().toISOString(),
  }];

  await upsertMember(groupJid, targetJid, { warnings });
  const count = warnings.length;

  // Expulsión automática al llegar a 3 advertencias (PRD 7)
  if (count >= 3) {
    await autoKick(sock, groupJid, targetJid, 'Acumuló 3 advertencias');
  }

  return count;
}

export async function removeLastWarning(groupJid, targetJid) {
  const member = await getMember(groupJid, targetJid);
  if (!member?.warnings?.length) return 0;
  const warnings = member.warnings.slice(0, -1);
  await upsertMember(groupJid, targetJid, { warnings });
  return warnings.length;
}

export async function removeAllWarnings(groupJid, targetJid) {
  await upsertMember(groupJid, targetJid, { warnings: [] });
  return 0;
}

export async function autoKick(sock, groupJid, targetJid, reason) {
  try {
    await sock.groupParticipantsUpdate(groupJid, [targetJid], 'remove');
    await upsertMember(groupJid, targetJid, {
      kicked: true,
      kickedAt: new Date().toISOString(),
      kickReason: reason,
    });
    console.log(`[autoKick] Kicked ${targetJid} from ${groupJid}: ${reason}`);
  } catch (e) {
    console.error('[autoKick] Failed to kick:', e.message);
  }
}

export async function getGroupParticipants(sock, groupJid) {
  let metadata = groupMetadataCache.get(groupJid);
  if (!metadata) {
    metadata = await sock.groupMetadata(groupJid);
    groupMetadataCache.set(groupJid, metadata);
  }
  return metadata.participants || [];
}

export async function getBotIsAdmin(sock, groupJid) {
  try {
    const participants = await getGroupParticipants(sock, groupJid);
    const botJid = sock.user?.id?.replace(/:.*@/, '@');
    const botParticipant = participants.find((p) => p.id === botJid);
    return botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
  } catch {
    return false;
  }
}
