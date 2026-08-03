import { NextResponse } from 'next/server';
import { upsertGlobalProfileAdmin, sanitizeJid } from '@/lib/firebaseAdmin.js';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request) {
  try {
    const { jid, birthday } = await request.json();
    if (!jid) return NextResponse.json({ error: 'JID requerido' }, { status: 400 });

    if (!birthday) {
      return NextResponse.json({ error: 'Fecha de nacimiento requerida' }, { status: 400 });
    }

    // Validar formato DD/MM/AAAA
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = birthday.match(datePattern);

    if (!match) {
      return NextResponse.json({ error: 'Formato inválido. Use DD/MM/AAAA' }, { status: 400 });
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Crear fecha y convertir a Timestamp
    const birthDate = new Date(year, month - 1, day);

    // Verificar que la conversión fue exitosa
    if (isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    const birthdayTimestamp = Timestamp.fromDate(birthDate);

    await upsertGlobalProfileAdmin(jid, { birthday: birthdayTimestamp });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
