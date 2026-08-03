import { upsertGroup } from '../../firebase/firebaseClient.js';

export async function welcomeCommand(sock, msg, context) {
  const { args, groupJid, group } = context;
  const remoteJid = msg.key.remoteJid;
  const sub = args[0]?.toLowerCase();

  if (sub === 'on') {
    const text = args.slice(1).join(' ') || null;
    await upsertGroup(groupJid, {
      welcome: { ...(group?.welcome || {}), enabled: true, ...(text ? { text } : {}) },
    });
    await sock.sendMessage(remoteJid, {
      text: `✅ *Bienvenida activada.*\n\nTexto actual:\n${group?.welcome?.text || 'Bienvenido/a al grupo, @{{mention}}! 🎉 Ahora somos {{count}} miembros.'}`,
    }, { quoted: msg });
  } else if (sub === 'off') {
    await upsertGroup(groupJid, { welcome: { ...(group?.welcome || {}), enabled: false } });
    await sock.sendMessage(remoteJid, { text: '🔴 *Bienvenida desactivada.*' }, { quoted: msg });
  } else if (sub === 'text') {
    const newText = args.slice(1).join(' ');
    if (!newText) {
      await sock.sendMessage(remoteJid, { text: '❌ Especifica el texto de bienvenida.' }, { quoted: msg });
      return;
    }
    await upsertGroup(groupJid, { welcome: { ...(group?.welcome || {}), text: newText } });
    await sock.sendMessage(remoteJid, { text: `✅ Texto de bienvenida actualizado:\n${newText}` }, { quoted: msg });
  } else if (sub === 'image') {
    const imageUrl = args[1];
    if (!imageUrl) {
      await sock.sendMessage(remoteJid, { text: '❌ Especifica la URL de la imagen.' }, { quoted: msg });
      return;
    }
    await upsertGroup(groupJid, { welcome: { ...(group?.welcome || {}), imageUrl } });
    await sock.sendMessage(remoteJid, { text: `✅ Imagen de bienvenida configurada.` }, { quoted: msg });
  } else {
    const enabled = group?.welcome?.enabled ? '🟢 Activo' : '🔴 Inactivo';
    await sock.sendMessage(remoteJid, {
      text: `👋 *Configuración de Bienvenida*\n\nEstado: ${enabled}`,
    }, { quoted: msg });
  }
}
