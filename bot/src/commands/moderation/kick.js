import { autoKick, getBotIsAdmin } from '../../services/moderationService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { getQuotedMessageKey } from '../../utils/helpers.js';

export async function kickCommand(sock, msg, context) {
  const { args, groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  // ── Identificar target ────────────────────────────────────────────────────
  // Prioridad 1: mención directa (@usuario)
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const hasDirectMention = mentions.length > 0;
  let targetJid = mentions[0] || null;

  // Prioridad 2: respuesta a un mensaje — autor del mensaje citado
  let quotedKey = null;
  if (!targetJid) {
    quotedKey = getQuotedMessageKey(msg);
    targetJid = quotedKey?.participant || null;
  }

  if (!targetJid) {
    await enqueueMessage(remoteJid, {
      text: '❌ Menciona al usuario o responde a su mensaje.\nUso: *!kick @usuario [motivo]* o responde con *!kick [motivo]*',
    }, { quoted: msg }, 1);
    return;
  }

  const botIsAdmin = await getBotIsAdmin(sock, groupJid);
  if (!botIsAdmin) {
    await enqueueMessage(remoteJid, {
      text: '❌ El bot necesita ser *administrador* para expulsar usuarios.',
    }, { quoted: msg }, 1);
    return;
  }

  // ── Borrar el mensaje infractor (solo cuando se usó reply) ─────────────────
  if (quotedKey?.id) {
    try {
      await enqueueMessage(remoteJid, {
        delete: {
          id: quotedKey.id,
          remoteJid: groupJid,
          participant: quotedKey.participant,
          fromMe: false,
        },
      }, {}, 1);
    } catch (e) {
      console.error('[kick] No se pudo borrar el mensaje:', e.message);
    }
  }

  // ── Expulsar al usuario ────────────────────────────────────────────────────
  const reason = (hasDirectMention ? args.slice(1) : args).join(' ') || 'Expulsado por un administrador';
  await autoKick(sock, groupJid, targetJid, reason);

  await enqueueMessage(remoteJid, {
    text: `🚫 @${targetJid.replace('@s.whatsapp.net', '')} fue *expulsado* del grupo.\n> _${reason}_`,
    mentions: [targetJid],
  }, { quoted: msg }, 1);
}
