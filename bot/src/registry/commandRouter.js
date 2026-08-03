import { getCommand } from './commandRegistry.js';
import { getMember } from '../firebase/firebaseClient.js';
import { isCooldownExpired, getCooldownRemaining } from '../utils/helpers.js';
import { enqueueMessage } from '../queue/sendQueue.js';

const OWNER_JID = process.env.OWNER_JID || '';

export async function routeCommand(sock, msg, context) {
  const { cmdName, args, senderJid, groupJid, isGroup, isOwner, isAdmin, group, memberData } = context;

  if (!cmdName) return;

  const cmd = getCommand(cmdName);
  if (!cmd) return;

  const replyJid = msg.key.remoteJid;

  // ── Permission check ───────────────────────────────────────────────────────
  const perm = cmd.permission;

  if (perm === 'owner' && !isOwner) return;

  if (perm === 'admin' && !isAdmin && !isOwner) {
    await enqueueMessage(replyJid,
      { text: '❌ Solo los _administradores_ pueden usar este comando.' },
      { quoted: msg }, 1);
    return;
  }

  if (perm === 'bought' && !isAdmin && !isOwner) {
    const member = memberData || (groupJid && senderJid ? await getMember(groupJid, senderJid) : null);
    const hasItem = member?.inventory?.some(
      (item) => item.itemId === cmd.shopItemId && (item.active || item.permanent)
        && (!item.expiresAt || item.expiresAt > Date.now())
    );
    if (!hasItem) {
      await enqueueMessage(replyJid,
        { text: `❌ Necesitas comprar *${cmd.shopItemId}* en la tienda.\nUsa *!shop* para ver los artículos.` },
        { quoted: msg }, 1);
      return;
    }
  }

  // ── Cooldown check ─────────────────────────────────────────────────────────
  // Cooldowns are stored as expiration timestamps (Date.now() + duration)
  if (cmd.cooldown && isGroup && senderJid) {
    const member = memberData || (await getMember(groupJid, senderJid));
    const expiresAt = member?.cooldowns?.[cmd.cooldown] || 0;

    if (!isCooldownExpired(expiresAt)) {
      const { text } = getCooldownRemaining(expiresAt);
      await enqueueMessage(replyJid,
        { text: `⏳ Espera *${text}* para volver a usar este comando.` },
        { quoted: msg }, 1);
      return;
    }
  }

  // ── Execute command ────────────────────────────────────────────────────────
  try {
    await cmd.handler(sock, msg, { ...context, args: args || [], cmd });
  } catch (err) {
    console.error(`[routeCommand] Error executing ${cmdName}:`, err.message);
    try {
      await enqueueMessage(replyJid,
        { text: `❌ Error al ejecutar *${cmdName}*. Intenta de nuevo.` },
        { quoted: msg }, 1);
    } catch { /* silencio total — no dejar que esto derribe el proceso */ }
  }
}
