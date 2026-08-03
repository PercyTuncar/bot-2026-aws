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

  // Asegurar que el miembro tiene un token de perfil
  let token = member.profileToken;
  if (!token) {
    token = generateToken(senderJid);
    await upsertMember(groupJid, senderJid, { profileToken: token });
  }

  const globalProfile = await getGlobalProfile(senderJid);
  const { level, progress, required, isMax } = getLevelProgress(member);
  const warnings = (member.warnings || []).length;
  const hasShield = (member.inventory || []).some(
    (i) => i.itemId === 'shield' && i.active && i.expiresAt > Date.now()
  );

  const panelUrl = process.env.PANEL_WEB_URL || 'http://localhost:3000';
  const profileLink = `${panelUrl}/update?token=${token}`;

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
    hasShield,
    birthday: globalProfile?.birthday,
    profileLink,
  });

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
