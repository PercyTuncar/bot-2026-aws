import { getAlertsForGroup, upsertGroup } from '../../firebase/firebaseClient.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function alertsCommand(sock, msg, context) {
  try {
    const { args, groupJid, group } = context;
    const remoteJid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (sub === 'on' || sub === 'update') {
      const alerts = await getAlertsForGroup(groupJid);
      const wasActive = group?.alertsActive;
      await upsertGroup(groupJid, { alertsActive: true });

      if (alerts.length === 0) {
        await enqueueMessage(remoteJid, { text: `⏰ Sistema de alertas *activado*.\n\n_No hay alertas configuradas todavía._\nCrea alertas desde el panel web.` }, { quoted: msg }, 1);
      } else if (!wasActive) {
        await enqueueMessage(remoteJid, { text: `⏰ Sistema de alertas *activado* para este grupo.\n📋 ${alerts.length} alerta(s) activas.` }, { quoted: msg }, 1);
      } else {
        await enqueueMessage(remoteJid, { text: `🔄 Alertas *actualizadas*.\n📋 ${alerts.length} alerta(s) activas.` }, { quoted: msg }, 1);
      }
    } else if (sub === 'off') {
      await upsertGroup(groupJid, { alertsActive: false });
      await enqueueMessage(remoteJid, { text: `🔴 Sistema de alertas *desactivado* para este grupo.` }, { quoted: msg }, 1);
    } else if (sub === 'list') {
      const alerts = await getAlertsForGroup(groupJid);
      if (alerts.length === 0) {
        await enqueueMessage(remoteJid, { text: '📋 No hay alertas configuradas para este grupo.' }, { quoted: msg }, 1);
        return;
      }
      let text = `⏰ *Alertas del grupo (${alerts.length}):*\n\n`;
      for (const a of alerts) text += `• ${a.title || 'Sin título'} — ${a.active ? '🟢 Activa' : '🔴 Pausada'}\n`;
      await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
    } else {
      const state = group?.alertsActive ? '🟢 Activo' : '🔴 Inactivo';
      await enqueueMessage(remoteJid, {
        text: `⏰ *Sistema de Alertas*\n\nEstado: ${state}`,
      }, { quoted: msg }, 1);
    }
  } catch (err) {
    console.error('[alertsCommand]', err.message);
  }
}
