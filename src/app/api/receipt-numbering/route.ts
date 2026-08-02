import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';

/** GET /api/receipt-numbering — configuración de numeración (fila única). */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT prefix, next_sequence AS "nextSequence", padding
     FROM receipt_numbering WHERE id = 1`
  );
  return NextResponse.json(rows[0] ?? null);
}

/** PUT /api/receipt-numbering — cambiar prefijo, número inicial y relleno. */
export async function PUT(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'settings.manage')) {
    return NextResponse.json({ error: 'No tiene permiso para configurar el recibo' }, { status: 403 });
  }

  const body = await request.json();
  const prefix = String(body?.prefix ?? '').trim();
  const nextSequence = Number(body?.nextSequence);
  const padding = Number(body?.padding);

  if (!prefix) return NextResponse.json({ error: 'El prefijo es obligatorio' }, { status: 400 });
  if (!Number.isInteger(nextSequence) || nextSequence < 1) {
    return NextResponse.json({ error: 'El número inicial debe ser 1 o mayor' }, { status: 400 });
  }
  if (!Number.isInteger(padding) || padding < 1 || padding > 12) {
    return NextResponse.json({ error: 'El relleno debe estar entre 1 y 12' }, { status: 400 });
  }

  // No permitir un número inicial que colisione con recibos ya emitidos de ese
  // prefijo: el número de recibo es único y se rechazaría al cobrar.
  const { rows: maxRows } = await pool.query(
    'SELECT COALESCE(MAX(sequence_number), 0) AS max FROM receipts WHERE prefix = $1',
    [prefix]
  );
  if (nextSequence <= Number(maxRows[0].max)) {
    return NextResponse.json(
      {
        error: `Ya existe el recibo ${prefix}${maxRows[0].max}. El número inicial debe ser mayor a ${maxRows[0].max}.`,
      },
      { status: 409 }
    );
  }

  await pool.query(
    `UPDATE receipt_numbering
        SET prefix = $1, next_sequence = $2, padding = $3, updated_by = $4
      WHERE id = 1`,
    [prefix, nextSequence, padding, user.id]
  );

  return NextResponse.json({ success: true });
}
