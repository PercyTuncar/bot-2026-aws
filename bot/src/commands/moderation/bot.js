import { upsertGroup } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function botCommand(sock, msg, context) {
  try {
    const { args, senderJid } = context;
    const remoteJid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();
    const targetGroupJid = args[1];

    if (sub === 'on') {
      if (!targetGroupJid) {
        await enqueueMessage(remoteJid, { text: '❌ Especifica el ID del grupo.\nUso: *!bot on [ID]*\nEjemplo: `!bot on 120363199@g.us`' }, {}, 1);
        return;
      }
      await upsertGroup(targetGroupJid, { jid: targetGroupJid, active: true, activatedAt: new Date().toISOString(), activatedBy: senderJid });
      await enqueueMessage(remoteJid, { text: `✅ Bot *activado* en:\n\`${targetGroupJid}\`` }, {}, 1);
    } else if (sub === 'off') {
      if (!targetGroupJid) {
        await enqueueMessage(remoteJid, { text: '❌ Especifica el ID del grupo.\nUso: *!bot off [ID]*' }, {}, 1);
        return;
      }
      await upsertGroup(targetGroupJid, { active: false, deactivatedAt: new Date().toISOString() });
      await enqueueMessage(remoteJid, { text: `🔴 Bot *desactivado* en:\n\`${targetGroupJid}\`` }, {}, 1);
    } else {
      await enqueueMessage(remoteJid, { text: `🤖 *Control del Bot*\n\n• *!bot on [ID]* — Activar en un grupo\n• *!bot off [ID]* — Desactivar\n\nUsa *!groups* para ver los IDs.` }, {}, 1);
    }
  } catch (err) {
    console.error('[botCommand]', err.message);
  }
}
