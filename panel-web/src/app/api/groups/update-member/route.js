import { NextResponse } from 'next/server';
import { updateMemberAdmin } from '@/lib/firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request) {
  try {
    const { groupId, memberId, cash, bank, birthday, warnings } = await request.json();
    if (!groupId || !memberId) return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 });

    const updates = {};
    if (cash !== undefined) updates.cash = Number(cash);
    if (bank !== undefined) updates.bank = Number(bank);
    if (warnings !== undefined) updates.warnings = warnings;

    if (birthday !== undefined) {
      if (birthday === null || birthday === '') {
        updates.birthday = null;
      } else {
        // Validar y convertir a Timestamp
        const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = birthday.match(datePattern);

        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          const year = parseInt(match[3], 10);
          const birthDate = new Date(year, month - 1, day);

          if (!isNaN(birthDate.getTime())) {
            updates.birthday = Timestamp.fromDate(birthDate);
          }
        }
      }
    }

    await updateMemberAdmin(groupId, memberId, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
