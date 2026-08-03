import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db = null;

export function initAdminFirebase() {
  if (getApps().length > 0) {
    db = getFirestore();
    return;
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
}

export function getDb() {
  if (!db) initAdminFirebase();
  return db;
}

export function sanitizeJid(jid) {
  if (!jid) return 'unknown';
  return jid.replace(/[@./]/g, '_').replace(/\s/g, '');
}

// ─── Groups ───────────────────────────────────────────────────────────────────
export async function getAllGroupsAdmin() {
  initAdminFirebase();
  const snap = await getDb().collection('groups').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGroupAdmin(groupId) {
  initAdminFirebase();
  const snap = await getDb().collection('groups').doc(groupId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function updateGroupAdmin(groupId, data) {
  initAdminFirebase();
  await getDb().collection('groups').doc(groupId).set(data, { merge: true });
}

// ─── Members ──────────────────────────────────────────────────────────────────
export async function getGroupMembersAdmin(groupId) {
  initAdminFirebase();
  const snap = await getDb().collection('groups').doc(groupId).collection('members').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMemberAdmin(groupId, memberId) {
  initAdminFirebase();
  const snap = await getDb().collection('groups').doc(groupId).collection('members').doc(memberId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function updateMemberAdmin(groupId, memberId, data) {
  initAdminFirebase();
  await getDb().collection('groups').doc(groupId).collection('members').doc(memberId).set(data, { merge: true });
}

export async function deleteMemberAdmin(groupId, memberId) {
  initAdminFirebase();
  await getDb().collection('groups').doc(groupId).collection('members').doc(memberId).delete();
}

export async function searchMemberByPhone(phone) {
  initAdminFirebase();
  const normalized = phone.replace(/[^\d]/g, '');
  const groupsSnap = await getDb().collection('groups').get();
  const results = [];

  for (const groupDoc of groupsSnap.docs) {
    // Buscar por phoneNormalized (usuarios antiguos sin LID)
    const membersSnap = await groupDoc.ref
      .collection('members')
      .where('phoneNormalized', '==', normalized)
      .limit(1)
      .get();

    membersSnap.forEach((d) =>
      results.push({ groupId: groupDoc.id, groupJid: groupDoc.data().jid, memberId: d.id, ...d.data() })
    );

    // Si no encontró nada, buscar por JID que contiene el número (usuarios con LID)
    if (results.length === 0) {
      const allMembers = await groupDoc.ref.collection('members').get();
      allMembers.forEach((d) => {
        const memberData = d.data();
        // Extraer el número del JID (formato: 51999999999:XX@lid o 51999999999@s.whatsapp.net)
        const jid = memberData.jid || '';
        const jidNumber = jid.split('@')[0].split(':')[0]; // Obtiene "51999999999"

        if (jidNumber === normalized) {
          results.push({ groupId: groupDoc.id, groupJid: groupDoc.data().jid, memberId: d.id, ...memberData });
        }
      });
    }
  }

  return results;
}

export async function searchMemberByToken(token) {
  initAdminFirebase();
  const groupsSnap = await getDb().collection('groups').get();
  for (const groupDoc of groupsSnap.docs) {
    const snap = await groupDoc.ref
      .collection('members')
      .where('profileToken', '==', token)
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      return { groupId: groupDoc.id, groupJid: groupDoc.data().jid, memberId: d.id, ...d.data() };
    }
  }
  return null;
}

export async function getAllMembersAcrossGroups() {
  initAdminFirebase();
  const groupsSnap = await getDb().collection('groups').get();
  const all = [];
  for (const groupDoc of groupsSnap.docs) {
    const membersSnap = await groupDoc.ref.collection('members').get();
    membersSnap.forEach((d) =>
      all.push({ groupId: groupDoc.id, groupName: groupDoc.data().name || groupDoc.id, memberId: d.id, ...d.data() })
    );
  }
  return all;
}

// ─── Global Profiles ──────────────────────────────────────────────────────────
export async function getGlobalProfileAdmin(jid) {
  initAdminFirebase();
  const docId = sanitizeJid(jid);
  const snap = await getDb().collection('profiles').doc(docId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertGlobalProfileAdmin(jid, data) {
  initAdminFirebase();
  const docId = sanitizeJid(jid);
  await getDb().collection('profiles').doc(docId).set({ jid, ...data }, { merge: true });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export async function getAlertsForGroupAdmin(groupId) {
  initAdminFirebase();
  const snap = await getDb().collection('alerts').where('groupDocId', '==', groupId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createAlertAdmin(data) {
  initAdminFirebase();
  const ref = getDb().collection('alerts').doc();
  await ref.set({ ...data, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function updateAlertAdmin(alertId, data) {
  initAdminFirebase();
  await getDb().collection('alerts').doc(alertId).set(data, { merge: true });
}

export async function deleteAlertAdmin(alertId) {
  initAdminFirebase();
  await getDb().collection('alerts').doc(alertId).delete();
}

// ─── Vouchers ─────────────────────────────────────────────────────────────────
export async function getPendingVouchersAdmin() {
  initAdminFirebase();
  const snap = await getDb().collection('vouchers').where('status', '==', 'pending').orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function approveVoucherAdmin(voucherId, coinsAmount) {
  initAdminFirebase();
  const vSnap = await getDb().collection('vouchers').doc(voucherId).get();
  if (!vSnap.exists) throw new Error('Voucher not found');
  const v = vSnap.data();

  // Credit the coins to the member in the specified group
  const { FieldValue } = await import('firebase-admin/firestore');
  const groupDocId = sanitizeJid(v.groupJid);
  const memberDocId = sanitizeJid(v.memberJid);

  await getDb()
    .collection('groups')
    .doc(groupDocId)
    .collection('members')
    .doc(memberDocId)
    .set({ cash: FieldValue.increment(coinsAmount) }, { merge: true });

  await getDb().collection('vouchers').doc(voucherId).update({
    status: 'approved',
    approvedAt: new Date().toISOString(),
    coinsAmount,
  });
}

export async function rejectVoucherAdmin(voucherId, reason) {
  initAdminFirebase();
  await getDb().collection('vouchers').doc(voucherId).update({
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason || 'Rechazado por administrador',
  });
}
