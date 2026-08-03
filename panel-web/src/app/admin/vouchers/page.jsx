'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vouchers')
      .then((r) => r.json())
      .then((d) => { setVouchers(d.vouchers || []); setLoading(false); });
  }, []);

  async function approve(id) {
    const coins = prompt('¿Cuántos RCoins acreditar?');
    if (!coins || isNaN(coins)) return;
    await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', voucherId: id, coinsAmount: Number(coins) }),
    });
    setVouchers((prev) => prev.filter((v) => v.id !== id));
  }

  async function reject(id) {
    const reason = prompt('Motivo del rechazo (opcional):') || 'Rechazado';
    await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', voucherId: id, reason }),
    });
    setVouchers((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/admin" style={{ color: '#888', fontSize: 14, display: 'block', marginBottom: 16 }}>← Volver</Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🧾 Comprobantes de Pago</h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>Revisa y aprueba las recargas de RCoins</p>

      {loading && <p style={{ color: '#888' }}>Cargando...</p>}

      {!loading && vouchers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#888', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <p>No hay comprobantes pendientes.</p>
        </div>
      )}

      {vouchers.map((v) => (
        <div key={v.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                Usuario: {v.memberJid}
              </div>
              <div style={{ color: '#888', fontSize: 13 }}>
                Grupo: {v.groupJid || v.groupDocId}
              </div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                Enviado: {v.createdAt ? new Date(v.createdAt?.seconds * 1000 || v.createdAt).toLocaleString('es-PE') : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <button className="btn-primary" onClick={() => approve(v.id)}>✅ Aprobar</button>
              <button className="btn-danger" onClick={() => reject(v.id)}>❌ Rechazar</button>
            </div>
          </div>
          {v.imageUrl && (
            <div style={{ marginTop: 12 }}>
              <img
                src={v.imageUrl}
                alt="Comprobante"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
