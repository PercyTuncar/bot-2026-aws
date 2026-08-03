'use client';

import { useState } from 'react';

export default function GroupSettings({ group, groupId, onUpdate }) {
  // Asegurar valores por defecto seguros
  const initialAntilink = {
    enabled: group?.antilink?.enabled || false,
    allowedDomains: Array.isArray(group?.antilink?.allowedDomains) ? group.antilink.allowedDomains : []
  };

  const initialAntiwords = {
    enabled: group?.antiwords?.enabled || false,
    words: Array.isArray(group?.antiwords?.words) ? group.antiwords.words : []
  };

  const initialWelcome = {
    enabled: group?.welcome?.enabled || false,
    text: group?.welcome?.text || '',
    imageUrl: group?.welcome?.imageUrl || ''
  };

  const [antilink, setAntilink] = useState(initialAntilink);
  const [antiwords, setAntiwords] = useState(initialAntiwords);
  const [welcome, setWelcome] = useState(initialWelcome);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleSave() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/groups/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          antilink,
          antiwords,
          welcome
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setMsg('✅ Configuración actualizada');
      if (onUpdate) onUpdate();
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function addDomain(domain) {
    if (!domain || antilink.allowedDomains.includes(domain)) return;
    setAntilink({ ...antilink, allowedDomains: [...antilink.allowedDomains, domain] });
  }

  function removeDomain(domain) {
    setAntilink({ ...antilink, allowedDomains: antilink.allowedDomains.filter(d => d !== domain) });
  }

  function addWord(word) {
    if (!word || antiwords.words.includes(word)) return;
    setAntiwords({ ...antiwords, words: [...antiwords.words, word] });
  }

  function removeWord(word) {
    setAntiwords({ ...antiwords, words: antiwords.words.filter(w => w !== word) });
  }

  return (
    <div>
      {/* Antilink */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>🔗 Antilink</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={antilink.enabled}
              onChange={(e) => setAntilink({ ...antilink, enabled: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>Activado</span>
          </label>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Dominios permitidos:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {antilink.allowedDomains.map((d) => (
            <span key={d} className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {d}
              <button onClick={() => removeDomain(d)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 0 }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="ejemplo.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addDomain(e.target.value.trim());
                e.target.value = '';
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={(e) => {
              const input = e.target.previousSibling;
              addDomain(input.value.trim());
              input.value = '';
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Antiwords */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>🚫 Antipalabras</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={antiwords.enabled}
              onChange={(e) => setAntiwords({ ...antiwords, enabled: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>Activado</span>
          </label>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Palabras prohibidas:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {antiwords.words.map((w) => (
            <span key={w} className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {w}
              <button onClick={() => removeWord(w)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="palabra"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addWord(e.target.value.trim().toLowerCase());
                e.target.value = '';
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={(e) => {
              const input = e.target.previousSibling;
              addWord(input.value.trim().toLowerCase());
              input.value = '';
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>👋 Mensaje de Bienvenida</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={welcome.enabled}
              onChange={(e) => setWelcome({ ...welcome, enabled: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>Activado</span>
          </label>
        </div>
        <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>
          Texto (usa {'{{mention}}'} para mencionar):
        </label>
        <textarea
          value={welcome.text}
          onChange={(e) => setWelcome({ ...welcome, text: e.target.value })}
          placeholder="Bienvenido/a al grupo, @{{mention}}! 🎉"
          rows={3}
          style={{ marginBottom: 12, width: '100%', resize: 'vertical' }}
        />
        <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 4 }}>URL de imagen (opcional):</label>
        <input
          value={welcome.imageUrl}
          onChange={(e) => setWelcome({ ...welcome, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('✅') ? '#25d366' : '#e74c3c', marginBottom: 12 }}>{msg}</p>}

      <button
        className="btn-primary"
        onClick={handleSave}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Guardando...' : 'Guardar Configuración'}
      </button>
    </div>
  );
}
