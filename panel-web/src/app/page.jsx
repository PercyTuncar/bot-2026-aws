export default function HomePage() {
  return (
    <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#25d366', marginBottom: 8 }}>
          RCoin Bot
        </h1>
        <p style={{ color: '#888', fontSize: 16, lineHeight: 1.6 }}>
          Bot de WhatsApp con economía, juegos, moderación y alertas programadas.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/update" className="card" style={{ padding: '20px 32px', display: 'block' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Mi Perfil</div>
          <div style={{ color: '#888', fontSize: 13 }}>Actualiza tu cumpleaños y datos</div>
        </a>
      </div>
    </main>
  );
}
