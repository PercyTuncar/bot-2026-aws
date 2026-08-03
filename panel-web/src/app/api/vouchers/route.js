import { NextResponse } from 'next/server';
import { getPendingVouchersAdmin, approveVoucherAdmin, rejectVoucherAdmin } from '../../../../lib/firebaseAdmin.js';

export async function GET() {
  try {
    const vouchers = await getPendingVouchersAdmin();
    return NextResponse.json({ vouchers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, voucherId, coinsAmount, reason } = await request.json();
    if (!voucherId) return NextResponse.json({ error: 'voucherId requerido' }, { status: 400 });

    if (action === 'approve') {
      if (!coinsAmount) return NextResponse.json({ error: 'coinsAmount requerido para aprobar' }, { status: 400 });
      await approveVoucherAdmin(voucherId, Number(coinsAmount));
    } else if (action === 'reject') {
      await rejectVoucherAdmin(voucherId, reason);
    } else {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
