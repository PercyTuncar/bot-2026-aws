import { NextResponse } from 'next/server';
import { searchMemberByPhone, searchMemberByToken } from '@/lib/firebaseAdmin.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q) return NextResponse.json({ results: [] });

    let results = [];

    // Try token-based search first (from !me links)
    if (q.length >= 16 && /^[A-Za-z0-9_-]+$/.test(q)) {
      const member = await searchMemberByToken(q);
      if (member) results = [member];
    }

    // Fall back to phone number search
    if (results.length === 0) {
      const phone = q.replace(/[^\d]/g, '');
      if (phone.length >= 8) {
        results = await searchMemberByPhone(phone);
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
