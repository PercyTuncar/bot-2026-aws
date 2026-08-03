import { NextResponse } from 'next/server';
import { upsertGlobalProfileAdmin, sanitizeJid } from '../../../lib/firebaseAdmin.js';

export async function POST(request) {
  try {
    const { jid, birthday } = await request.json();
    if (!jid) return NextResponse.json({ error: 'JID requerido' }, { status: 400 });

    await upsertGlobalProfileAdmin(jid, { birthday });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
