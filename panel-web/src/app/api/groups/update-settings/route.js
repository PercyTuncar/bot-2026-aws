import { NextResponse } from 'next/server';
import { updateGroupAdmin } from '@/lib/firebaseAdmin.js';

export async function POST(request) {
  try {
    const { groupId, antilink, antiwords, welcome } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: 'groupId requerido' }, { status: 400 });
    }

    const updates = {};

    if (antilink !== undefined) {
      updates.antilink = antilink;
    }

    if (antiwords !== undefined) {
      updates.antiwords = antiwords;
    }

    if (welcome !== undefined) {
      updates.welcome = welcome;
    }

    await updateGroupAdmin(groupId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[update-settings]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
