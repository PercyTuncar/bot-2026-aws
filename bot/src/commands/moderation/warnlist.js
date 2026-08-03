import { getAllMembers } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function warnlistCommand(sock, msg, context) {
  const { groupJid } = context;
  const remoteJid = msg.key.remoteJid;

  const members = await getAllMembers(groupJid);
  const warned = members.filter((m) => (m.warnings || []).length > 0);

  if (warned.length === 0) {
    await enqueueMessage(remoteJid, {
      text: '✅ No hay usuarios con advertencias en este grupo.',
    }, { quoted: msg }, 1);
    return;
  }

  let text = `⚠️ *Usuarios con Advertencias (${warned.length})*\n\n`;
  warned.forEach((m) => {
    const name = m.pushName || m.jid?.replace('@s.whatsapp.net', '') || m.id;
    const count = m.warnings.length;
    const emoji = count >= 3 ? '🔴' : count === 2 ? '🟡' : '🟢';
    text += `${emoji} *${name}* — ${count}/3\n`;
  });

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
