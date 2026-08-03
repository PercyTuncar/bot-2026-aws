import {
  getGroupAdmin,
  getGroupMembersAdmin,
  getAlertsForGroupAdmin,
} from '@/lib/firebaseAdmin.js';
import Link from 'next/link';
import AlertsManager from './AlertsManager.jsx';
import MembersTable from './MembersTable.jsx';

export const dynamic = 'force-dynamic';

// Convierte Timestamps de Firestore y cualquier valor no serializable a plain objects
function serialize(value) {
  if (value === null || value === undefined) return value;
  // Firestore Timestamp (tiene _seconds o seconds + toDate)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date(value._seconds * 1000).toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

export default async function GroupDetailPage({ params }) {
  const { id } = await params;
  let group = null;
  let members = [];
  let alerts = [];

  try {
    [group, members, alerts] = await Promise.all([
      getGroupAdmin(id),
      getGroupMembersAdmin(id),
      getAlertsForGroupAdmin(id),
    ]);
  } catch (err) {
    console.error('[GroupDetailPage] Error:', err.message);
  }

  // Serialize before passing to Client Components
  group = serialize(group);
  members = serialize(members);
  alerts = serialize(alerts);

  if (!group) {
    return (
      <main style={{ maxWidth: 900, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Grupo no encontrado.</p>
        <Link href="/admin"><button className="btn-secondary" style={{ marginTop: 16 }}>← Volver</button></Link>
      </main>
    );
  }

  const sortedMembers = [...members].sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ color: '#888', fontSize: 14 }}>← Volver al panel</Link>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>{group.name || group.jid}</h1>
          <span className={`badge ${group.active ? 'badge-green' : 'badge-red'}`}>
            {group.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <p style={{ color: '#666', fontSize: 13, marginTop: 4, wordBreak: 'break-all' }}>{group.jid}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard emoji="👥" label="Miembros" value={members.length} />
        <StatCard emoji="⏰" label="Alertas" value={alerts.length} />
        <StatCard emoji="💬" label="Mensajes" value={members.reduce((s, m) => s + (m.messageCount || 0), 0).toLocaleString()} />
        <StatCard emoji="⚠️" label="Con advertencias" value={members.filter((m) => (m.warnings || []).length > 0).length} />
      </div>

      {/* Alerts section */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>⏰ Alertas Programadas</h2>
        <AlertsManager groupId={id} groupJid={group.jid} initialAlerts={alerts} />
      </section>

      {/* Members section */}
      <section className="card">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          👥 Miembros ({members.length})
        </h2>
        <MembersTable members={sortedMembers} groupId={id} />
      </section>
    </main>
  );
}

function StatCard({ emoji, label, value }) {
  return (
    <div style={{ background: '#111', borderRadius: 10, padding: '16px', textAlign: 'center', border: '1px solid #2a2a2a' }}>
      <div style={{ fontSize: 24 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
      <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  );
}
