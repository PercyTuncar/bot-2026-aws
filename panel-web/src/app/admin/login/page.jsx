'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 2. Get the Firebase ID token
      const idToken = await userCredential.user.getIdToken();

      // 3. Send token to backend to create a secure httpOnly session cookie
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

      router.push('/admin');
    } catch (err) {
      // Map Firebase error codes to user-friendly messages
      const code = err.code;
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-email'
      ) {
        setError('Correo o contraseña incorrectos');
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde');
      } else if (code === 'auth/user-disabled') {
        setError('Esta cuenta está deshabilitada');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Panel Administrativo</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Ingresa tus credenciales para continuar</p>
        </div>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={{ marginBottom: 10 }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ marginBottom: 14 }}
          />
          {error && (
            <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: '#3a1a1a', borderRadius: 6 }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
