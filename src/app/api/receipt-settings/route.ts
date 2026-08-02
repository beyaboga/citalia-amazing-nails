import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * GET /api/receipt-settings — encabezado del recibo (fila única).
 * Autenticado: el recibo se arma al cobrar, no solo al configurar.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT business_name AS "businessName", address, phone,
            logo_url AS "logoUrl", footer_message AS "footerMessage"
     FROM receipt_settings WHERE id = 1`
  );
  return NextResponse.json(rows[0] ?? null);
}

/** PUT /api/receipt-settings — guardar el encabezado del recibo. */
export async function PUT(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'settings.manage')) {
    return NextResponse.json({ error: 'No tiene permiso para configurar el recibo' }, { status: 403 });
  }

  const body = await request.json();
  const businessName = String(body?.businessName ?? '').trim();
  if (!businessName) {
    return NextResponse.json({ error: 'El nombre del negocio es obligatorio' }, { status: 400 });
  }

  await pool.query(
    `UPDATE receipt_settings
        SET business_name = $1, address = $2, phone = $3, logo_url = $4,
            footer_message = $5, updated_by = $6
      WHERE id = 1`,
    [
      businessName,
      String(body?.address ?? '').trim() || null,
      String(body?.phone ?? '').trim() || null,
      String(body?.logoUrl ?? '').trim() || null,
      String(body?.footerMessage ?? '').trim() || null,
      user.id,
    ]
  );

  return NextResponse.json({ success: true });
}
