import { upsertGroup } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function antilinkCommand(sock, msg, context) {
  try {
    const { args, groupJid, group } = context;
    const remoteJid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (sub === 'on') {
      await upsertGroup(groupJid, { antilink: { ...(group?.antilink || {}), enabled: true } });
      await enqueueMessage(remoteJid, { text: '✅ *Antilink activado.*\nLos mensajes con links serán eliminados.\nUsa *!antilink add [dominio]* para añadir dominios permitidos.' }, { quoted: msg }, 1);
    } else if (sub === 'off') {
      await upsertGroup(groupJid, { antilink: { ...(group?.antilink || {}), enabled: false } });
      await enqueueMessage(remoteJid, { text: '🔴 *Antilink desactivado.*' }, { quoted: msg }, 1);
    } else if (sub === 'add') {
      const domain = args[1]?.toLowerCase()?.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
      if (!domain) {
        await enqueueMessage(remoteJid, { text: '❌ Especifica el dominio.\nUso: *!antilink add dominio.com*' }, { quoted: msg }, 1);
        return;
      }
      const current = group?.antilink?.allowedDomains || [];
      if (!current.includes(domain)) current.push(domain);
      await upsertGroup(groupJid, { antilink: { ...(group?.antilink || {}), allowedDomains: current } });
      await enqueueMessage(remoteJid, { text: `✅ *${domain}* agregado a dominios permitidos.` }, { quoted: msg }, 1);
    } else if (sub === 'remove') {
      const domain = args[1]?.toLowerCase();
      if (!domain) {
        await enqueueMessage(remoteJid, { text: '❌ Especifica el dominio a remover.' }, { quoted: msg }, 1);
        return;
      }
      const updated = (group?.antilink?.allowedDomains || []).filter((d) => d !== domain);
      await upsertGroup(groupJid, { antilink: { ...(group?.antilink || {}), allowedDomains: updated } });
      await enqueueMessage(remoteJid, { text: `✅ *${domain}* removido de dominios permitidos.` }, { quoted: msg }, 1);
    } else {
      const enabled = group?.antilink?.enabled ? '🟢 Activo' : '🔴 Inactivo';
      const domains = (group?.antilink?.allowedDomains || []).join(', ') || 'Ninguno';
      await enqueueMessage(remoteJid, {
        text: `🔗 *Configuración de Antilink*\n\nEstado: ${enabled}\nDominios permitidos: ${domains}\n\nComandos:\n• *!antilink on/off*\n• *!antilink add [dominio]*\n• *!antilink remove [dominio]*`,
      }, { quoted: msg }, 1);
    }
  } catch (err) {
    console.error('[antilinkCommand]', err.message);
  }
}
