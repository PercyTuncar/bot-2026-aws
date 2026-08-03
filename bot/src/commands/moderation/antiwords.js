import { upsertGroup } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function antiwordsCommand(sock, msg, context) {
  try {
    const { args, groupJid, group } = context;
    const remoteJid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (sub === 'on') {
      await upsertGroup(groupJid, { antiwords: { ...(group?.antiwords || {}), enabled: true } });
      await enqueueMessage(remoteJid, { text: '✅ *Antipalabras activado.*\nLos mensajes con palabras prohibidas serán eliminados automáticamente.' }, { quoted: msg }, 1);
    } else if (sub === 'off') {
      await upsertGroup(groupJid, { antiwords: { ...(group?.antiwords || {}), enabled: false } });
      await enqueueMessage(remoteJid, { text: '🔴 *Antipalabras desactivado.*' }, { quoted: msg }, 1);
    } else if (sub === 'add') {
      const newWords = args.slice(1).join(' ').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
      if (!newWords.length) {
        await enqueueMessage(remoteJid, { text: '❌ Especifica las palabras separadas por coma.\nUso: *!antiwords add palabra1, palabra2*' }, { quoted: msg }, 1);
        return;
      }
      const current = group?.antiwords?.words || [];
      const updated = [...new Set([...current, ...newWords])];
      await upsertGroup(groupJid, { antiwords: { ...(group?.antiwords || {}), words: updated } });
      await enqueueMessage(remoteJid, { text: `✅ Palabras agregadas: *${newWords.join(', ')}*\nTotal: ${updated.length}` }, { quoted: msg }, 1);
    } else if (sub === 'remove') {
      const toRemove = args.slice(1).join(' ').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
      const updated = (group?.antiwords?.words || []).filter((w) => !toRemove.includes(w));
      await upsertGroup(groupJid, { antiwords: { ...(group?.antiwords || {}), words: updated } });
      await enqueueMessage(remoteJid, { text: `✅ Palabras removidas: *${toRemove.join(', ')}*` }, { quoted: msg }, 1);
    } else {
      const enabled = group?.antiwords?.enabled ? '🟢 Activo' : '🔴 Inactivo';
      const words = (group?.antiwords?.words || []).join(', ') || 'Ninguna';
      await enqueueMessage(remoteJid, {
        text: `🚫 *Configuración de Antipalabras*\n\nEstado: ${enabled}\nPalabras prohibidas: ${words}`,
      }, { quoted: msg }, 1);
    }
  } catch (err) {
    console.error('[antiwordsCommand]', err.message);
  }
}
