import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

let db = null;

export function initFirebase() {
  if (getApps().length > 0) return;

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log('Firebase initialized.');
}

function getDb() {
  if (!db) {
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}

// Export getDb so the health monitor can use it without re-importing the full module
export { getDb };

// ─── Sanitize JID for use as Firestore document ID ──────────────────────────
// Firestore doc IDs cannot contain '/', and we strip '@' and '.' to avoid issues
export function sanitizeJidForDocId(jid) {
  if (!jid) return 'unknown';
  return jid.replace(/[@./]/g, '_').replace(/\s/g, '');
}

// ─── Groups ──────────────────────────────────────────────────────────────────
export async function getGroup(groupJid) {
  const docId = sanitizeJidForDocId(groupJid);
  const snap = await getDb().collection('groups').doc(docId).get();
  return snap.exists ? { id: docId, jid: groupJid, ...snap.data() } : null;
}

export async function upsertGroup(groupJid, data) {
  const docId = sanitizeJidForDocId(groupJid);
  await getDb().collection('groups').doc(docId).set(
    { jid: groupJid, ...data },
    { merge: true }
  );
}

export async function getAllActiveGroups() {
  const snap = await getDb().collection('groups').where('active', '==', true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllGroups() {
  const snap = await getDb().collection('groups').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Members ──────────────────────────────────────────────────────────────────
/**
 * Register or update a member. Uses JID/LID as the document ID (primary key).
 * Phone number is stored as an alternate field when available.
 */
export async function upsertMember(groupJid, memberJid, data) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const memberDocId = sanitizeJidForDocId(memberJid);
  const ref = getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('members')
    .doc(memberDocId);
  await ref.set({ jid: memberJid, ...data }, { merge: true });
}

/**
 * Actualiza campos específicos de un miembro usando update().
 * A diferencia de upsertMember (que usa set+merge), update() sí interpreta
 * el dot notation como campo anidado: { 'cooldowns.work': ts } → cooldowns.work = ts
 * IMPORTANTE: el documento debe existir previamente.
 */
export async function updateMember(groupJid, memberJid, data) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const memberDocId = sanitizeJidForDocId(memberJid);
  const ref = getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('members')
    .doc(memberDocId);
  await ref.update(data);
}

export async function getMember(groupJid, memberJid) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const memberDocId = sanitizeJidForDocId(memberJid);
  const snap = await getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('members')
    .doc(memberDocId)
    .get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllMembers(groupJid) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const snap = await getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('members')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMembersByPhone(phoneNormalized) {
  // Search across all groups
  const groupsSnap = await getDb().collection('groups').get();
  const results = [];
  for (const groupDoc of groupsSnap.docs) {
    const membersSnap = await groupDoc.ref
      .collection('members')
      .where('phoneNormalized', '==', phoneNormalized)
      .limit(1)
      .get();
    membersSnap.forEach((d) =>
      results.push({ groupId: groupDoc.id, groupJid: groupDoc.data().jid, memberId: d.id, ...d.data() })
    );
  }
  return results;
}

export async function getMemberByToken(token) {
  const groupsSnap = await getDb().collection('groups').get();
  for (const groupDoc of groupsSnap.docs) {
    const membersSnap = await groupDoc.ref
      .collection('members')
      .where('profileToken', '==', token)
      .limit(1)
      .get();
    if (!membersSnap.empty) {
      const d = membersSnap.docs[0];
      return { groupId: groupDoc.id, groupJid: groupDoc.data().jid, memberId: d.id, ...d.data() };
    }
  }
  return null;
}

export async function incrementMemberMessages(groupJid, memberJid) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const memberDocId = sanitizeJidForDocId(memberJid);
  const ref = getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('members')
    .doc(memberDocId);
  await ref.set(
    {
      messageCount: FieldValue.increment(1),
      lastMessageAt: Timestamp.now(),
    },
    { merge: true }
  );
}

// ─── Global User Profiles ─────────────────────────────────────────────────────
export async function getGlobalProfile(memberJid) {
  const docId = sanitizeJidForDocId(memberJid);
  const snap = await getDb().collection('profiles').doc(docId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertGlobalProfile(memberJid, data) {
  const docId = sanitizeJidForDocId(memberJid);
  await getDb().collection('profiles').doc(docId).set({ jid: memberJid, ...data }, { merge: true });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export async function getAlertsForGroup(groupJid) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const snap = await getDb()
    .collection('alerts')
    .where('groupDocId', '==', groupDocId)
    .where('active', '==', true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllAlerts() {
  const snap = await getDb().collection('alerts').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertAlert(alertId, data) {
  const ref = alertId
    ? getDb().collection('alerts').doc(alertId)
    : getDb().collection('alerts').doc();
  await ref.set(data, { merge: true });
  return ref.id;
}

export async function updateAlert(alertId, data) {
  await getDb().collection('alerts').doc(alertId).update(data);
}

export async function deleteAlert(alertId) {
  await getDb().collection('alerts').doc(alertId).delete();
}

// ─── Vouchers (payment proof) ──────────────────────────────────────────────────
export async function createVoucher(data) {
  const ref = getDb().collection('vouchers').doc();
  await ref.set({ ...data, status: 'pending', createdAt: Timestamp.now() });
  return ref.id;
}

export async function getPendingVouchers() {
  const snap = await getDb().collection('vouchers').where('status', '==', 'pending').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateVoucher(voucherId, data) {
  await getDb().collection('vouchers').doc(voucherId).update(data);
}

// ─── Game History ──────────────────────────────────────────────────────────────
export async function addGameResult(groupJid, gameType, result) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  await getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('gameHistory')
    .add({ gameType, result, createdAt: Timestamp.now() });
}

export async function getGameHistory(groupJid, gameType, limit = 20) {
  const groupDocId = sanitizeJidForDocId(groupJid);
  const snap = await getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('gameHistory')
    .where('gameType', '==', gameType)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Shop / Store ──────────────────────────────────────────────────────────────
export const SHOP_ITEMS = {
  shield: {
    id: 'shield',
    name: '🛡️ Escudo Antirrobos',
    description: 'Protege tu efectivo de robos durante 24 horas.',
    price: 10,
    duration: 24 * 60 * 60 * 1000,
  },
  bodyguard: {
    id: 'bodyguard',
    name: '💂 Guardaespaldas Personal',
    description: 'Te protege de crímenes dirigidos durante 24 horas.',
    price: 10,
    duration: 24 * 60 * 60 * 1000,
  },
  eraser: {
    id: 'eraser',
    name: '🧹 Borrador de Advertencias',
    description: 'Elimina una advertencia de tu historial en este grupo.',
    price: 200,
    duration: null,
  },
  multiplier2x: {
    id: 'multiplier2x',
    name: '💎 Multiplicador x2',
    description: 'Duplica tus ganancias de !work durante 24 horas.',
    price: 20,
    multiplier: 2,
    duration: 24 * 60 * 60 * 1000,
  },
  multiplier3x: {
    id: 'multiplier3x',
    name: '💎💎 Multiplicador x3',
    description: 'Triplica tus ganancias de !work durante 24 horas.',
    price: 30,
    multiplier: 3,
    duration: 24 * 60 * 60 * 1000,
  },
  multiplier4x: {
    id: 'multiplier4x',
    name: '💎💎💎 Multiplicador x4',
    description: 'Cuadruplica tus ganancias de !work durante 24 horas.',
    price: 40,
    multiplier: 4,
    duration: 24 * 60 * 60 * 1000,
  },
  multiplier5x: {
    id: 'multiplier5x',
    name: '💎💎💎💎 Multiplicador x5',
    description: 'Quintuplica tus ganancias de !work durante 24 horas.',
    price: 50,
    multiplier: 5,
    duration: 24 * 60 * 60 * 1000,
  },
  vv: {
    id: 'vv',
    name: '👁️ Ver Mensajes VV',
    description: 'Permite ver mensajes de "ver una vez" con !vv.',
    price: 250,
    duration: null,
  },
  lock: {
    id: 'lock',
    name: '🔒 Bloqueo de Formato',
    description: 'Bloquea un tipo de contenido en el grupo por 3-10 min.',
    price: 120,
    duration: null,
  },
  unlock: {
    id: 'unlock',
    name: '🔓 Desbloqueo de Formato',
    description: 'Desbloquea un tipo de contenido bloqueado.',
    price: 100,
    duration: null,
  },
  insta: {
    id: 'insta',
    name: '📸 Descarga Instagram',
    description: 'Permite usar .insta para descargar reels y fotos.',
    price: 150,
    duration: null,
  },
};

export { FieldValue, Timestamp };
