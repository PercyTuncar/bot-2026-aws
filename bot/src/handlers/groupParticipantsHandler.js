import { getGroup, upsertMember } from '../firebase/firebaseClient.js';
import { Timestamp } from 'firebase-admin/firestore';
import { enqueueMessage } from '../queue/sendQueue.js';
import { buildWelcomeText } from '../utils/format.js';

export async function handleGroupParticipantsUpdate(sock, event) {
  const { id: groupJid, participants, action } = event;

  try {
    const group = await getGroup(groupJid);
    if (!group || !group.active) return;

    if (action === 'add') {
      for (const participantJid of participants) {
        // Registrar nuevo miembro con todos los campos inicializados
        await upsertMember(groupJid, participantJid, {
          jid: participantJid,
          cash: 0,
          bank: 0,
          level: 1,
          xp: 0,
          warnings: [],
          inventory: [],
          loans: [],
          cooldowns: {},
          messageCount: 0,
          joinedAt: Timestamp.now(),
        });

        // PRD 7: Enviar bienvenida si está activada
        if (group.welcome?.enabled) {
          await sendWelcomeMessage(sock, groupJid, participantJid, group);
        }
      }
    }
  } catch (err) {
    console.error('[handleGroupParticipantsUpdate] Error:', err.message);
  }
}

async function sendWelcomeMessage(sock, groupJid, newMemberJid, group) {
  try {
    const { groupMetadataCache } = await import('../utils/groupCache.js');
    let metadata = groupMetadataCache.get(groupJid);
    if (!metadata) {
      metadata = await sock.groupMetadata(groupJid);
      groupMetadataCache.set(groupJid, metadata);
    }

    const participantCount = metadata.participants?.length || 0;

    // Construir texto con la capa de formato unificada (PRD 0.2)
    const welcomeText = buildWelcomeText(group.welcome?.text, {
      memberJid: newMemberJid,
      participantCount,
      groupSubject: metadata.subject,
    });

    // PRD 0.3: El mensaje de bienvenida pasa por la cola central
    if (group.welcome?.imageUrl) {
      await enqueueMessage(groupJid, {
        image: { url: group.welcome.imageUrl },
        caption: welcomeText,
        mentions: [newMemberJid],
      }, {}, 0);
    } else {
      await enqueueMessage(groupJid, {
        text: welcomeText,
        mentions: [newMemberJid],
      }, {}, 0);
    }
  } catch (err) {
    console.error('[sendWelcomeMessage] Error:', err.message);
  }
}
