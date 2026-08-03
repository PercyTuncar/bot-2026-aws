import { getAllGroupsAdmin, getPendingVouchersAdmin } from '@/lib/firebaseAdmin.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  let groups = [];
  let pendingVouchers = [];
  try {
    [groups, pendingVouchers] = await Promise.all([
      getAllGroupsAdmin(),
      getPendingVouchersAdmin(),
    ]);
  } catch (err) {
    console.error('[AdminDashboard] Error:', err.message);
  }

  const activeGroups = groups.filter((g) => g.active);
  const inactiveGroups = groups.filter((g) => !g.active);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>🤖 Panel de Administración</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Gestión del bot y grupos</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/admin/users">
            <button className="btn-secondary">👥 Usuarios</button>
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="btn-danger">Cerrar sesión</button>
          </form>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Grupos activos" value={activeGroups.length} emoji="🟢" />
        <StatCard label="Grupos inactivos" value={inactiveGroups.length} emoji="🔴" />
        <StatCard label="Total grupos" value={groups.length} emoji="📋" />
        {pendingVouchers.length > 0 && (
          <StatCard label="Comprobantes pendientes" value={pendingVouchers.length} emoji="🧾" highlight />
        )}
      </div>

      {/* Pending vouchers notification */}
      {pendingVouchers.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: '#f1c40f', background: '#1a1a00' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            🧾 Comprobantes pendientes de revisión ({pendingVouchers.length})
          </h2>
          {pendingVouchers.slice(0, 3).map((v) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #2a2a2a' }}>
              <div>
                <span style={{ fontSize: 14 }}>JID: {v.memberJid?.slice(0, 20)}...</span>
                <span style={{ color: '#888', fontSize: 12, marginLeft: 10 }}>{new Date(v.createdAt?.seconds * 1000 || v.createdAt).toLocaleDateString('es-PE')}</span>
              </div>
              <Link href={`/admin/vouchers`}>
                <button className="btn-secondary" style={{ fontSize: 12 }}>Ver</button>
              </Link>
            </div>
          ))}
          {pendingVouchers.length > 3 && (
            <Link href="/admin/vouchers" style={{ display: 'block', marginTop: 12, fontSize: 14 }}>
              Ver todos ({pendingVouchers.length}) →
            </Link>
          )}
        </div>
      )}

      {/* Groups grid */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>📱 Grupos</h2>
      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#888', padding: 40 }}>
          <p>No hay grupos registrados aún.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Activa el bot en un grupo con <code>!bot on [ID]</code></p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, emoji, highlight }) {
  return (
    <div className="card" style={{ textAlign: 'center', ...(highlight ? { borderColor: '#f1c40f' } : {}) }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
      <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function GroupCard({ group }) {
  return (
    <Link href={`/admin/grupos/${group.id}`} style={{ display: 'block' }}>
      <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, flex: 1, marginRight: 10, wordBreak: 'break-word' }}>
            {group.name || group.jid}
          </h3>
          <span className={`badge ${group.active ? 'badge-green' : 'badge-red'}`}>
            {group.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8, wordBreak: 'break-all' }}>
          {group.jid}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {group.alertsActive && <span className="badge badge-yellow">⏰ Alertas</span>}
          {group.antilink?.enabled && <span className="badge" style={{ background: '#1a2a3a', color: '#5599ff' }}>🔗 Antilink</span>}
          {group.antiwords?.enabled && <span className="badge" style={{ background: '#2a1a3a', color: '#aa55ff' }}>🚫 Antiwords</span>}
        </div>
      </div>
    </Link>
  );
}
