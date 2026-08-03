'use client';

import { useState } from 'react';

export default function UpdatePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    setSelected(null);
    setMessage('');
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar');
      setResults(data.results || []);
      if (data.results?.length === 1) {
        setSelected(data.results[0]);
        setBirthday(data.results[0].birthday || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid: selected.jid, groupId: selected.groupId, birthday }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setMessage('✅ ¡Perfil actualizado correctamente!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Actualizar mi Perfil</h1>
        <p style={{ color: '#888', marginTop: 8, lineHeight: 1.5 }}>
          Ingresa tu Número de Identificación para actualizar tu perfil.<br />
          <span style={{ color: '#25d366', fontSize: 13 }}>
            💡 Tip: Usa el comando <strong>!id</strong> en el grupo de WhatsApp para obtener tu ID.
          </span>
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearch}>
          <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>
            Número de Identificación (ejemplo: 51999999999)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="51999999999"
              required
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Buscar'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div style={{ background: '#3a1a1a', border: '1px solid #e74c3c', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#e74c3c', fontSize: 14 }}>
          {error}
        </div>
      )}

      {results && results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#888' }}>
          <p>No se encontró ningún usuario con ese ID.</p>
          <p style={{ marginTop: 8, fontSize: 13 }}>
            Usa <strong>!id</strong> en el grupo de WhatsApp para obtener tu Número de Identificación.
          </p>
        </div>
      )}

      {results && results.length > 1 && !selected && (
        <div className="card">
          <p style={{ marginBottom: 12, fontSize: 14, color: '#888' }}>Se encontraron múltiples perfiles. Selecciona el correcto:</p>
          {results.map((r) => (
            <button
              key={`${r.groupId}-${r.memberId}`}
              className="btn-secondary"
              style={{ display: 'block', width: '100%', marginBottom: 8, textAlign: 'left', padding: '10px 14px' }}
              onClick={() => { setSelected(r); setBirthday(r.birthday || ''); }}
            >
              <strong>{r.pushName || 'Sin nombre'}</strong> · Grupo: {r.groupName || r.groupId}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {selected.pushName || 'Usuario'}
          </h2>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
            Grupo: {selected.groupName || selected.groupId} · Nivel {selected.level || 1}
          </p>

          <form onSubmit={handleSave}>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>
              Fecha de cumpleaños
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>

          {message && (
            <div style={{ marginTop: 16, color: '#25d366', fontSize: 14 }}>{message}</div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 20, background: '#111', border: '1px solid #222' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💰 Comprar RCoins</h3>
        <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>
          El tipo de cambio es <strong>1 sol = 1,000 RC</strong>.<br />
          Transfiere via Plin al número <strong>{process.env.NEXT_PUBLIC_PLIN_NUMBER || 'configurar en .env'}</strong>,
          luego usa el comando <strong>!id</strong> en WhatsApp para obtener tu ID y actualizar tu perfil con el comprobante.
        </p>
      </div>
    </main>
  );
}
