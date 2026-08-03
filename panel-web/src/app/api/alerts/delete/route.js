import { NextResponse } from 'next/server';
import { deleteAlertAdmin } from '@/lib/firebaseAdmin.js';

export async function POST(request) {
  try {
    const { alertId } = await request.json();
    if (!alertId) return NextResponse.json({ error: 'alertId requerido' }, { status: 400 });
    await deleteAlertAdmin(alertId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
