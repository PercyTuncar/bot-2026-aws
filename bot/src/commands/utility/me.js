import {
  getMember,
  upsertMember,
  getGlobalProfile,
} from '../../firebase/firebaseClient.js';
import { generateToken } from '../../utils/helpers.js';
import { getLevelProgress } from '../../services/levelingService.js';
import { enqueueMessage } from '../../queue/sendQueue.js';
import { buildProfileMessage } from '../../utils/format.js';

export async function meCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  if (!member) {
    await enqueueMessage(remoteJid, {
      text: '❌ No encontré tu perfil en este grupo. Intenta enviar otro mensaje primero.',
    }, { quoted: msg }, 1);
    return;
  }

  // Extraer el LID (número de identificación)
  const userLid = senderJid.split('@')[0]; // Obtiene "51999999999:12" o similar
  const lidNumber = userLid.split(':')[0]; // Obtiene solo "51999999999"

  const globalProfile = await getGlobalProfile(senderJid);
  const { level, progress, required, isMax } = getLevelProgress(member);
  const warnings = (member.warnings || []).length;

  // Verificar shields activos con tiempo restante
  const shieldItem = (member.inventory || []).find(
    (i) => i.itemId === 'shield' && i.active && i.expiresAt > Date.now()
  );
  const bodyguardItem = (member.inventory || []).find(
    (i) => i.itemId === 'bodyguard' && i.active && i.expiresAt > Date.now()
  );

  const text = buildProfileMessage({
    pushName: member.pushName || 'Sin nombre',
    level,
    isMax,
    messageCount: member.messageCount || 0,
    xp: progress,
    required,
    cash: member.cash || 0,
    bank: member.bank || 0,
    warnings,
    shieldItem,
    bodyguardItem,
    birthday: globalProfile?.birthday,
    lidNumber, // Pasar el LID en lugar del profileLink
  });

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
