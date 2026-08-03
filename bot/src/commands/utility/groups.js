import { getAllActiveGroups } from '../../firebase/firebaseClient.js';
import { getBotIsAdmin } from '../../services/moderationService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function groupsCommand(sock, msg, context) {
  const { isOwner } = context;
  const remoteJid = msg.key.remoteJid;

  if (!isOwner) return; // Solo el dueño puede ver este comando

  try {
    const allGroups = await sock.groupFetchAllParticipating();
    const groupIds = Object.keys(allGroups);

    if (groupIds.length === 0) {
      await enqueueMessage(remoteJid, { text: '❌ El bot no está en ningún grupo.' }, { quoted: msg }, 1);
      return;
    }

    const activeGroups = await getAllActiveGroups();
    const activeSet = new Set(activeGroups.map((g) => g.jid));

    let text = `📋 *Grupos del Bot* (${groupIds.length})\n\n`;

    for (const gid of groupIds) {
      const gData = allGroups[gid];
      const name = gData.subject || 'Sin nombre';
      const participants = gData.participants?.length || 0;
      const isActive = activeSet.has(gid);
      const isBotAdmin = await getBotIsAdmin(sock, gid);

      const statusEmoji = isActive ? '🟢' : '🔴';
      const roleEmoji = isBotAdmin ? '👑' : '👤';

      text += `${statusEmoji} *${name}*\n`;
      text += `   ID: \`${gid}\`\n`;
      text += `   👥 ${participants} | ${roleEmoji} ${isBotAdmin ? 'Admin' : 'Miembro'}\n\n`;
    }

    text += `\n💡 Usa *!bot on [ID]* para activar un grupo.`;

    await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
  } catch (err) {
    await enqueueMessage(remoteJid, {
      text: `❌ Error al obtener grupos: _${err.message}_`,
    }, { quoted: msg }, 1);
  }
}
