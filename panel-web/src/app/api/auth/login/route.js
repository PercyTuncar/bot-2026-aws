import { NextResponse } from 'next/server';
import { initAdminFirebase } from '@/lib/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';
import { createAdminSession, getSessionCookieName } from '@/lib/auth.js';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    // Initialize Firebase Admin if not already done
    initAdminFirebase();

    // Verify the Firebase ID token using firebase-admin
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Create a signed JWT session cookie
    const sessionToken = await createAdminSession(decodedToken.uid, decodedToken.email);

    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[login] Error:', err.message);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
