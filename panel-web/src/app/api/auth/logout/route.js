import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookieName } from '../../../../lib/auth.js';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
  return NextResponse.redirect(
    new URL('/admin/login', process.env.NEXT_PUBLIC_PANEL_URL || 'http://localhost:3000')
  );
}
