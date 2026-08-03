import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production-minimum-32'
);

const COOKIE_NAME = 'admin-session';

export async function createAdminSession(uid, email) {
  const token = await new SignJWT({ role: 'admin', uid, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

export async function verifyAdminSession(token) {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}
