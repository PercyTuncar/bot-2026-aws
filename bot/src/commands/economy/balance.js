import { getMember } from '../../firebase/firebaseClient.js';
import { buildBalanceMessage } from '../../utils/format.js';
import { enqueueMessage } from '../../queue/sendQueue.js';

export async function balanceCommand(sock, msg, context) {
  const { senderJid, groupJid, memberData } = context;
  const remoteJid = msg.key.remoteJid;

  const member = memberData || await getMember(groupJid, senderJid);
  const text = buildBalanceMessage({ cash: member?.cash || 0, bank: member?.bank || 0 });

  await enqueueMessage(remoteJid, { text }, { quoted: msg }, 1);
}
