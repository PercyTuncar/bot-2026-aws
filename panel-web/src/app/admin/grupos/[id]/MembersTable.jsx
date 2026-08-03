'use client';

import { useState } from 'react';
import { formatCoins } from '@/lib/helpers.js';

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
          onClose={() => {
            setEditTarget(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function MemberEditModal({ member, groupId, onClose }) {
  const [cash, setCash] = useState(member.cash || 0);
  const [bank, setBank] = useState(member.bank || 0);
  const [warnings, setWarnings] = useState(member.warnings || []);
  const [newWarningReason, setNewWarningReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/groups/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          memberId: member.id,
          cash: Number(cash),
          bank: Number(bank),
          warnings
        }),
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
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function addWarning() {
    if (!newWarningReason.trim()) return;
    const newWarning = {
      reason: newWarningReason.trim(),
      source: 'panel-admin',
      date: new Date().toISOString()
    };
    setWarnings([...warnings, newWarning]);
    setNewWarningReason('');
  }

  function removeWarning(index) {
    setWarnings(warnings.filter((_, i) => i !== index));
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
      overflowY: 'auto'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, position: 'sticky', top: 0, background: '#1a1a1a', paddingBottom: 12 }}>
          <h3 style={{ fontWeight: 700 }}>Editar: {member.pushName}</h3>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
        </div>

        {/* Economía */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>💰 Economía</h4>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Efectivo (RC)</label>
          <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} style={{ marginBottom: 12 }} />
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Banco (RC)</label>
          <input type="number" value={bank} onChange={(e) => setBank(e.target.value)} style={{ marginBottom: 12 }} />
        </div>

        {/* Información de solo lectura */}
        <div style={{ marginBottom: 20, padding: 12, background: '#111', borderRadius: 8, border: '1px solid #2a2a2a' }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📊 Estadísticas</h4>
          <div style={{ fontSize: 13, color: '#888', display: 'grid', gap: 4 }}>
            <div>Nivel: <span style={{ color: '#fff' }}>{member.level || 1}</span></div>
            <div>XP: <span style={{ color: '#fff' }}>{member.xp || 0}</span></div>
            <div>Mensajes: <span style={{ color: '#fff' }}>{(member.messageCount || 0).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Advertencias */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚠️ Advertencias ({warnings.length}/3)</h4>

          {warnings.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {warnings.map((w, idx) => (
                <div key={idx} style={{
                  background: '#2a1a1a',
                  border: '1px solid #e74c3c33',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{w.reason}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {new Date(w.date).toLocaleString('es-PE')} • {w.source}
                    </div>
                  </div>
                  <button
                    onClick={() => removeWarning(idx)}
                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Motivo de la advertencia..."
              value={newWarningReason}
              onChange={(e) => setNewWarningReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addWarning();
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn-secondary"
              onClick={addWarning}
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              Agregar
            </button>
          </div>
        </div>

        {msg && <p style={{ fontSize: 13, color: msg.startsWith('✅') ? '#25d366' : '#e74c3c', marginBottom: 12 }}>{msg}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button className="btn-danger" onClick={handleDelete} disabled={loading}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}
