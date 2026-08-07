import { addWarning } from '../../services/moderationService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { buildWarnMessage } from '../../utils/format.js';
import { getQuotedMessageKey } from '../../utils/helpers.js';

export async function warnCommand(sock, msg, context) {
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
      text: '❌ Menciona al usuario o responde a su mensaje.\nUso: *!warn @usuario [motivo]* o responde con *!warn [motivo]*',
    }, { quoted: msg }, 1);
    return;
  }

  // ── Verificar que no sea el owner ─────────────────────────────────────────
  const OWNER_JID = process.env.OWNER_JID || '';
  const ownerNormalized = OWNER_JID.replace(/:.*@/, '@');
  const targetNormalized = targetJid.replace(/:.*@/, '@');

  if (targetNormalized === ownerNormalized) {
    await enqueueMessage(remoteJid, {
      text: '❌ No puedes advertir al propietario del bot.',
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
      console.error('[warn] No se pudo borrar el mensaje:', e.message);
    }
  }

  // ── Aplicar advertencia ────────────────────────────────────────────────────
  const rawReason = (hasDirectMention ? args.slice(1) : args).join(' ').trim();
  const defaultReason = quotedKey ? 'Contenido inapropiado' : 'Sin motivo especificado';
  const reason = rawReason || defaultReason;
  const count = await addWarning(sock, groupJid, targetJid, reason, 'manual');

  const shortJid = targetJid.replace('@s.whatsapp.net', '').replace('@lid', '');
  const text = buildWarnMessage({ targetShortJid: shortJid, reason, count, wasKicked: count >= 3 });

  await enqueueMessage(remoteJid, { text, mentions: [targetJid] }, { quoted: msg }, 1);
}
