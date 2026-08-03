'use client';

import { useState } from 'react';
import { formatCoins } from '../../../../lib/helpers.js';

export default function MembersTable({ members, groupId }) {
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);

  const filtered = members.filter((m) => {
    const name = (m.pushName || '').toLowerCase();
    const jid = (m.jid || m.id || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || jid.includes(q);
  });

  return (
    <div>
      <input
        placeholder="Buscar por nombre o JID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nivel</th>
              <th>Mensajes</th>
              <th>Efectivo</th>
              <th>Banco</th>
              <th>Advertencias</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.pushName || 'Sin nombre'}</div>
                  <div style={{ color: '#666', fontSize: 11, wordBreak: 'break-all' }}>{m.jid || m.id}</div>
                </td>
                <td><span className="badge badge-green">{m.level || 1}</span></td>
                <td>{(m.messageCount || 0).toLocaleString('es-PE')}</td>
                <td>{formatCoins(m.cash)}</td>
                <td>{formatCoins(m.bank)}</td>
                <td>
                  {(m.warnings || []).length > 0 ? (
                    <span className={`badge ${(m.warnings || []).length >= 3 ? 'badge-red' : 'badge-yellow'}`}>
                      {(m.warnings || []).length}/3
                    </span>
                  ) : (
                    <span style={{ color: '#555' }}>—</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setEditTarget(m)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', padding: 24 }}>No se encontraron miembros.</div>
        )}
      </div>

      {editTarget && (
        <MemberEditModal
          member={editTarget}
          groupId={groupId}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

function MemberEditModal({ member, groupId, onClose }) {
  const [cash, setCash] = useState(member.cash || 0);
  const [bank, setBank] = useState(member.bank || 0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch('/api/groups/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, memberId: member.id, cash: Number(cash), bank: Number(bank) }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setMsg('✅ Guardado');
      setTimeout(onClose, 800);
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${member.pushName}? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    try {
      await fetch('/api/groups/delete-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, memberId: member.id }),
      });
      onClose();
      window.location.reload();
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>Editar: {member.pushName}</h3>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
        </div>
        <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Efectivo (RC)</label>
        <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} style={{ marginBottom: 12 }} />
        <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Banco (RC)</label>
        <input type="number" value={bank} onChange={(e) => setBank(e.target.value)} style={{ marginBottom: 16 }} />
        {msg && <p style={{ fontSize: 13, color: msg.startsWith('✅') ? '#25d366' : '#e74c3c', marginBottom: 12 }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>Guardar</button>
          <button className="btn-danger" onClick={handleDelete} disabled={loading}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
