import { NextResponse } from 'next/server';
import { updateMemberAdmin } from '@/lib/firebaseAdmin.js';

export async function POST(request) {
  try {
    const { groupId, memberId, cash, bank, birthday, warnings } = await request.json();
    if (!groupId || !memberId) return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 });

    const updates = {};
    if (cash !== undefined) updates.cash = Number(cash);
    if (bank !== undefined) updates.bank = Number(bank);
    if (birthday !== undefined) updates.birthday = birthday;
    if (warnings !== undefined) updates.warnings = warnings;

    await updateMemberAdmin(groupId, memberId, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
