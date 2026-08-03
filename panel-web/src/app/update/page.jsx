'use client';

import { useState } from 'react';

function formatCoins(amount) {
  return `${(amount || 0).toLocaleString('es-PE')} RC`;
}

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
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selected.groupId,
          memberId: selected.memberId,
          birthday: birthday.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setMessage('✅ ¡Perfil actualizado correctamente!');
      // Actualizar el selected para reflejar el nuevo cumpleaños
      setSelected({ ...selected, birthday: birthday.trim() });
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

      {error && results?.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#e74c3c' }}>
          {error}
        </div>
      )}

      {results && results.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', color: '#888' }}>
          <p>No se encontró ningún usuario con ese ID.</p>
          <p style={{ marginTop: 8, fontSize: 13 }}>
            Usa <strong>!id</strong> en el grupo de WhatsApp para obtener tu Número de Identificación.
          </p>
        </div>
      )}

      {results && results.length > 1 && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Selecciona tu grupo:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(r);
                  setBirthday(r.birthday || '');
                }}
                className="btn-secondary"
                style={{ textAlign: 'left', padding: 12 }}
              >
                <div style={{ fontWeight: 600 }}>{r.groupName || 'Grupo sin nombre'}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  Nivel {r.level || 1} • {(r.messageCount || 0).toLocaleString('es-PE')} mensajes
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            👤 {selected.pushName || 'Usuario'}
          </h2>
          <div style={{ marginBottom: 20, padding: 16, background: '#111', borderRadius: 8, border: '1px solid #2a2a2a' }}>
            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Grupo:</span>
                <span style={{ fontWeight: 600 }}>{selected.groupName || 'Sin nombre'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Nivel:</span>
                <span className="badge badge-green">{selected.level || 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Mensajes:</span>
                <span style={{ fontWeight: 600 }}>{(selected.messageCount || 0).toLocaleString('es-PE')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Efectivo:</span>
                <span style={{ fontWeight: 600, color: '#25d366' }}>{formatCoins(selected.cash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Banco:</span>
                <span style={{ fontWeight: 600, color: '#25d366' }}>{formatCoins(selected.bank)}</span>
              </div>
            </div>
          </div>

          {selected.birthday ? (
            // Si ya tiene cumpleaños configurado, mostrar solo lectura
            <div style={{ padding: 20, background: '#1a2a1a', borderRadius: 8, border: '1px solid #25d366' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎂</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#25d366', marginBottom: 8 }}>
                  Tu cumpleaños ya está configurado
                </h3>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{selected.birthday}</div>
              </div>
              <div style={{ padding: 16, background: '#111', borderRadius: 6, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: 0 }}>
                  ✅ Tu fecha de cumpleaños ha sido guardada exitosamente y no puede ser modificada.
                  Si necesitas cambiarla, contacta a un administrador del grupo.
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: 16, background: '#0a1a0a', borderRadius: 6 }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  🎉 ¡Gracias por ser parte del grupo!<br />
                  <span style={{ color: '#25d366', fontWeight: 600 }}>Sigue participando y ganando RCoins</span>
                </p>
              </div>
            </div>
          ) : (
            // Si no tiene cumpleaños, permitir configurarlo
            <form onSubmit={handleSave}>
              <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>
                🎂 Configura tu cumpleaños (DD/MM)
              </label>
              <input
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder="25/12"
                maxLength={5}
                required
                style={{ marginBottom: 8 }}
              />
              <div style={{ fontSize: 11, color: '#666', marginBottom: 16 }}>
                Formato: DD/MM (ejemplo: 25/12 para 25 de diciembre).<br />
                ⚠️ <strong>Una vez guardado, no podrás modificarlo.</strong>
              </div>
              {error && (
                <div style={{ marginBottom: 12, color: '#e74c3c', fontSize: 13 }}>{error}</div>
              )}
              <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Guardando...' : 'Guardar cumpleaños'}
              </button>
            </form>
          )}

          {message && (
            <div style={{ marginTop: 16, padding: 16, background: '#1a2a1a', borderRadius: 8, border: '1px solid #25d366', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <p style={{ color: '#25d366', fontSize: 14, fontWeight: 600, margin: 0 }}>{message}</p>
              <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                ¡Sigue chateando en el grupo para ganar más RCoins!
              </p>
            </div>
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
