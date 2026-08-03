import { NextResponse } from 'next/server';
import { getAlertsForGroupAdmin, createAlertAdmin, updateAlertAdmin } from '../../../../lib/firebaseAdmin.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    if (!groupId) return NextResponse.json({ alerts: [] });
    const alerts = await getAlertsForGroupAdmin(groupId);
    return NextResponse.json({ alerts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { alertId, ...data } = body;

    if (alertId) {
      await updateAlertAdmin(alertId, data);
      return NextResponse.json({ ok: true, id: alertId });
    } else {
      const id = await createAlertAdmin(data);
      return NextResponse.json({ ok: true, id });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
