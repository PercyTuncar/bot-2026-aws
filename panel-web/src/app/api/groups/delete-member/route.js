import { NextResponse } from 'next/server';
import { deleteMemberAdmin } from '../../../../lib/firebaseAdmin.js';

export async function POST(request) {
  try {
    const { groupId, memberId } = await request.json();
    if (!groupId || !memberId) return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 });
    await deleteMemberAdmin(groupId, memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
