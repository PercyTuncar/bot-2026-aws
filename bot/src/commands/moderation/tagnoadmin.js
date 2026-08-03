import { downloadMediaMessage } from 'baileys';
import { getGroupParticipants } from '../../services/moderationService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

/**
 * !tagnoadmin — menciona solo a los miembros no-admin del grupo.
 *
 * Modo grupo:
 *   .tagnoadmin *Mensaje*
 *   [enviar imagen con caption .tagnoadmin *Mensaje*]
 *
 * Modo DM (remoto):
 *   .tagnoadmin *Mensaje*
 *   120363199955210379
 *
 *   [enviar imagen con caption]:
 *   .tagnoadmin *Mensaje*
 *   120363199955210379
 */
export async function tagnoadminCommand(sock, msg, context) {
  const { text, cmdName, groupJid, isGroup } = context;
  const remoteJid = msg.key.remoteJid;

  const hasImage = !!(msg.message?.imageMessage);

  const rawContent = text.slice(1 + cmdName.length).trim();

  let targetGroupJid = groupJid;
  let customText = rawContent;

  // ── Modo DM: extraer ID del grupo de la última línea ─────────────────────
  if (!isGroup) {
    const lines = rawContent.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    const match = lastLine.match(/^(\d+)(@g\.us)?$/);

    if (!match) {
      await enqueueMessage(remoteJid, {
        text:
          `❌ En DM debes indicar el ID del grupo en la última línea.\n\n` +
          `*Uso (texto):*\n\`\`\`\n.tagnoadmin *Tu mensaje*\n120363199955210379\n\`\`\`\n\n` +
          `*Uso (imagen):*\n_Envía la imagen con caption:_\n\`\`\`\n.tagnoadmin *Tu mensaje*\n120363199955210379\n\`\`\``,
      }, { quoted: msg }, 1);
      return;
    }

    targetGroupJid = `${match[1]}@g.us`;
    customText = lines.slice(0, -1).join('\n').trim();
  }

  // ── Obtener participantes no-admin ───────────────────────────────────────
  let participants;
  try {
    participants = await getGroupParticipants(sock, targetGroupJid);
  } catch {
    await enqueueMessage(remoteJid, {
      text: `❌ No se pudo acceder al grupo \`${targetGroupJid}\`.\nVerifica que el bot esté en ese grupo y el ID sea correcto.`,
    }, { quoted: msg }, 1);
    return;
  }

  const nonAdmins = participants
    .filter((p) => p.admin !== 'admin' && p.admin !== 'superadmin')
    .map((p) => p.id)
    .filter(Boolean);

  const caption = customText || '';

  // ── Construir contenido del mensaje ──────────────────────────────────────
  let content;
  if (hasImage) {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      content = { image: buffer, caption, mentions: nonAdmins };
    } catch {
      content = { text: caption, mentions: nonAdmins };
    }
  } else {
    content = { text: caption, mentions: nonAdmins };
  }

  // ── Enviar al grupo destino ───────────────────────────────────────────────
  await enqueueMessage(targetGroupJid, content, {}, 2);

  // ── Confirmación al DM ────────────────────────────────────────────────────
  if (!isGroup) {
    const tipo = hasImage ? '🖼️ imagen + texto' : '📝 texto';
    await enqueueMessage(remoteJid, {
      text: `✅ *Tagnoadmin enviado* (${tipo})\nGrupo: \`${targetGroupJid}\`\n👥 ${nonAdmins.length} menciones (no-admins)`,
    }, { quoted: msg }, 1);
  }
}
