import { getAllMembersAcrossGroups } from '../../../lib/firebaseAdmin.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  let members = [];
  try {
    members = await getAllMembersAcrossGroups();
  } catch (err) {
    console.error('[UsersPage]', err.message);
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <Link href="/admin" style={{ color: '#888', fontSize: 14, display: 'block', marginBottom: 8 }}>← Volver al panel</Link>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>👥 Usuarios ({members.length})</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Todos los usuarios registrados en todos los grupos</p>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Grupo</th>
                <th>Nivel</th>
                <th>Mensajes</th>
                <th>Efectivo</th>
                <th>Banco</th>
                <th>Advertencias</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={`${m.groupId}-${m.memberId}-${i}`}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.pushName || 'Sin nombre'}</div>
                    <div style={{ color: '#555', fontSize: 11, wordBreak: 'break-all' }}>{m.jid || m.memberId}</div>
                  </td>
                  <td>
                    <Link href={`/admin/grupos/${m.groupId}`} style={{ fontSize: 13 }}>
                      {m.groupName || m.groupId}
                    </Link>
                  </td>
                  <td><span className="badge badge-green">{m.level || 1}</span></td>
                  <td style={{ fontSize: 14 }}>{(m.messageCount || 0).toLocaleString('es-PE')}</td>
                  <td style={{ fontSize: 13 }}>{(m.cash || 0).toLocaleString('es-PE')} RC</td>
                  <td style={{ fontSize: 13 }}>{(m.bank || 0).toLocaleString('es-PE')} RC</td>
                  <td>
                    {(m.warnings || []).length > 0 ? (
                      <span className={`badge ${(m.warnings || []).length >= 3 ? 'badge-red' : 'badge-yellow'}`}>
                        {m.warnings.length}/3
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <Link href={`/admin/grupos/${m.groupId}`}>
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}>Ver grupo</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', padding: 32 }}>No hay usuarios registrados aún.</div>
          )}
        </div>
      </div>
    </main>
  );
}
