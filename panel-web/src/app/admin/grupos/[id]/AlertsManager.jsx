'use client';

import { useState } from 'react';

export default function AlertsManager({ groupId, groupJid, initialAlerts }) {
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  const emptyForm = {
    title: '', text: '', imageUrl: '', link: '',
    mentionAll: false, frequency: 'once', scheduledAt: '',
    intervalMs: '', active: true,
  };
  const [form, setForm] = useState(emptyForm);

  function openNew() { setForm(emptyForm); setEditTarget(null); setShowForm(true); }
  function openEdit(a) { setForm({ ...emptyForm, ...a }); setEditTarget(a.id); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditTarget(null); }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: editTarget || null,
          groupId,
          groupJid,
          groupDocId: groupId,
          ...form,
          nextFireAt: form.scheduledAt ? new Date(form.scheduledAt).getTime() : null,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const updated = await fetch(`/api/alerts/upsert?groupId=${groupId}`).then((r) => r.json());
      setAlerts(updated.alerts || []);
      closeForm();
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(alertId) {
    if (!confirm('¿Eliminar esta alerta?')) return;
    await fetch('/api/alerts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  async function toggleActive(alert) {
    await fetch('/api/alerts/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: alert.id, active: !alert.active }),
    });
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, active: !a.active } : a));
  }

  return (
    <div>
      <button className="btn-primary" onClick={openNew} style={{ marginBottom: 16, fontSize: 14 }}>
        + Nueva alerta
      </button>
      {alerts.length === 0 && !showForm && (
        <p style={{ color: '#888', fontSize: 14 }}>No hay alertas. Crea una para este grupo.</p>
      )}
      {alerts.map((a) => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2a2a2a' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title || 'Sin título'}</div>
            <div style={{ color: '#888', fontSize: 12 }}>
              {a.frequency} · {a.mentionAll ? '@todos' : 'sin mención'}
              · {a.active ? <span style={{ color: '#25d366' }}>Activa</span> : <span style={{ color: '#e74c3c' }}>Pausada</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => toggleActive(a)} style={{ fontSize: 12, padding: '4px 10px' }}>
              {a.active ? 'Pausar' : 'Activar'}
            </button>
            <button className="btn-secondary" onClick={() => openEdit(a)} style={{ fontSize: 12, padding: '4px 10px' }}>Editar</button>
            <button className="btn-danger" onClick={() => handleDelete(a.id)} style={{ fontSize: 12, padding: '4px 10px' }}>Eliminar</button>
          </div>
        </div>
      ))}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700 }}>{editTarget ? 'Editar alerta' : 'Nueva alerta'}</h3>
              <button onClick={closeForm} className="btn-secondary" style={{ padding: '4px 10px' }}>✕</button>
            </div>
            {[
              { label: 'Título', key: 'title', type: 'text', placeholder: 'Ej: Alerta diaria' },
              { label: 'Imagen URL (opcional)', key: 'imageUrl', type: 'text', placeholder: 'https://...' },
              { label: 'Enlace (opcional)', key: 'link', type: 'text', placeholder: 'https://...' },
              { label: 'Fecha/hora de disparo', key: 'scheduledAt', type: 'datetime-local' },
            ].map((f) => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Texto del mensaje</label>
              <textarea rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Texto del mensaje con *negritas* y _cursivas_..." />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>Frecuencia</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="once">Una sola vez</option>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="custom">Personalizada</option>
              </select>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="mentionAll"
                checked={form.mentionAll}
                onChange={(e) => setForm({ ...form, mentionAll: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <label htmlFor="mentionAll" style={{ fontSize: 14, cursor: 'pointer' }}>Mencionar a todos (@todos silencioso)</label>
            </div>
            <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Guardando...' : 'Guardar alerta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
