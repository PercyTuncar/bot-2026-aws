import { getGroup, upsertMember, getMember } from '../firebase/firebaseClient.js';
import { getMessageText, getContentType, isGroupJid, extractName, normalizePhone, generateToken } from '../utils/helpers.js';
import { routeCommand } from '../registry/commandRouter.js';
import { applyAntilink, applyAntiwords, applyFormatLock } from '../services/moderationService.js';
import { recalculateLevel } from '../services/levelingService.js';
import { Timestamp } from 'firebase-admin/firestore';

const OWNER_JID = process.env.OWNER_JID || '';
const LOG_MESSAGES = process.env.LOG_MESSAGES === 'true';

export async function handleMessage(sock, msg) {
  try {
    if (!msg?.key || !msg.message) return;

    const remoteJid = msg.key.remoteJid;
    const isGroup = isGroupJid(remoteJid);
    const senderJid = isGroup ? (msg.key.participant || msg.key.remoteJid) : msg.key.remoteJid;
    const senderAlt = msg.key.participantAlt || null;
    const text = getMessageText(msg).trim();
    const contentType = getContentType(msg);

    // Baileys 7.x: sock.user contiene { id: 'numero@s.whatsapp.net', lid: 'LID@lid' }
    // Cuando el dueño se auto-envía desde el teléfono vinculado, remoteJid es el LID
    const ownerNormalized = OWNER_JID.replace(/:.*@/, '@');
    const ownerLid = sock.user?.lid ? sock.user.lid.replace(/:.*@/, '@') : null; // ej: '198650894532802@lid'
    
    const senderNormalized = senderJid.replace(/:.*@/, '@');
    const remoteNormalized = remoteJid.replace(/:.*@/, '@');
    const senderAltNormalized = senderAlt ? senderAlt.replace(/:.*@/, '@') : null;

    // Comparar tanto con el número como con el LID del dueño (ambos normalizados)
    const isOwner = senderNormalized === ownerNormalized
      || remoteNormalized === ownerNormalized
      || (senderAltNormalized && senderAltNormalized === ownerNormalized)
      || (ownerLid && (senderNormalized === ownerLid || remoteNormalized === ownerLid));

    // DM del dueño: procesar comandos (incluyendo fromMe: true)
    if (!isGroup) {
      if (LOG_MESSAGES || true) { // Siempre logear DMs para debug
        console.log(`[DM] remote=${remoteJid} | sender=${senderJid} | owner=${isOwner} | text="${text}"`);
      }

      if (isOwner && text && /^[.!]/.test(text)) {
        const [rawCmd, ...args] = text.slice(1).trim().split(/\s+/);
        const cmdName = rawCmd?.toLowerCase();
        console.log(`[DM-CMD] Ejecutando: ${cmdName}`);
        try { await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } }); } catch {}
        let ok = false;
        try {
          await routeCommand(sock, msg, { text, cmdName, args, senderJid, groupJid: null, isGroup: false, isOwner: true, isAdmin: true });
          ok = true;
        } catch (err) { console.error(`[DM-ERR] ${cmdName}:`, err.message); }
        try { await sock.sendMessage(remoteJid, { react: { text: ok ? '✅' : '❌', key: msg.key } }); } catch {}
      }
      return;
    }

    // Ignorar mensajes propios en grupos, EXCEPTO si es el owner ejecutando un comando
    if (msg.key.fromMe && !(isOwner && text && /^[.!]/.test(text))) return;

    const group = await getGroup(remoteJid);
    if (!group || !group.active) return;

    // No registrar al bot como miembro cuando envía sus propios mensajes
    let memberData = null;
    if (!msg.key.fromMe) {
      memberData = await registerMember(sock, remoteJid, senderJid, msg, senderAlt);
    }

    const isAdmin = msg.key.fromMe ? true : await checkIsAdmin(sock, remoteJid, senderJid);

    if (!isAdmin && !isOwner) {
      if (group.antilink?.enabled && await applyAntilink(sock, msg, remoteJid, senderJid, text, group.antilink)) return;
      if (group.antiwords?.enabled && await applyAntiwords(sock, msg, remoteJid, senderJid, text, group.antiwords)) return;
      if (group.formatLock && await applyFormatLock(sock, msg, remoteJid, senderJid, contentType, group.formatLock)) return;
    }

    if (!text || !/^[.!]/.test(text)) return;
    const [rawCmd, ...args] = text.slice(1).trim().split(/\s+/);
    const cmdName = rawCmd?.toLowerCase();
    if (LOG_MESSAGES) console.log(`[CMD] ${cmdName}`);
    try { await sock.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } }); } catch {}
    let ok = false;
    try {
      await routeCommand(sock, msg, { text, cmdName, args, senderJid, groupJid: remoteJid, isGroup: true, isOwner, isAdmin, group, memberData });
      ok = true;
    } catch (err) { console.error(`[CMD-ERR] ${cmdName}:`, err.message); }
    try { await sock.sendMessage(remoteJid, { react: { text: ok ? '✅' : '❌', key: msg.key } }); } catch {}
  } catch (err) { console.error('[handleMessage]', err.message); }
}

async function registerMember(sock, groupJid, senderJid, msg, senderAlt) {
  const pushName = extractName(msg);
  let phoneNormalized = null;
  if (senderAlt && !senderAlt.endsWith('@lid')) phoneNormalized = normalizePhone(senderAlt.replace('@s.whatsapp.net', ''));
  else if (!senderJid.endsWith('@lid')) phoneNormalized = normalizePhone(senderJid.replace('@s.whatsapp.net', ''));
  const existing = await getMember(groupJid, senderJid);
  const now = Timestamp.now();
  const updateData = { jid: senderJid, pushName, lastMessageAt: now };
  if (senderAlt) updateData.jidAlt = senderAlt;
  if (phoneNormalized) updateData.phoneNormalized = phoneNormalized;
  if (!existing) {
    Object.assign(updateData, { cash: 0, bank: 0, level: 1, xp: 0, warnings: [], inventory: [], loans: [], cooldowns: {}, messageCount: 1, profileToken: generateToken(senderJid), joinedAt: now });
    await upsertMember(groupJid, senderJid, updateData);
  } else {
    updateData.messageCount = (existing.messageCount || 0) + 1;
    await upsertMember(groupJid, senderJid, updateData);
  }
  const currentData = existing ? { ...existing, messageCount: (existing.messageCount || 0) + 1 } : { ...updateData, messageCount: 1 };
  await recalculateLevel(groupJid, senderJid, currentData);
  return { ...(existing || {}), ...updateData };
}

async function checkIsAdmin(sock, groupJid, senderJid) {
  try {
    const { groupMetadataCache } = await import('../utils/groupCache.js');
    let metadata = groupMetadataCache.get(groupJid);
    if (!metadata) { metadata = await sock.groupMetadata(groupJid); groupMetadataCache.set(groupJid, metadata); }
    const participant = metadata.participants?.find((p) => p.id === senderJid);
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
  } catch { return false; }
}
