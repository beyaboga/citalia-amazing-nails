import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { readReceipt } from '@/lib/receipts';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/expenses/[id]/receipt — sirve el comprobante con autenticación.
 * Los comprobantes viven fuera de `public`; nunca son de acceso libre.
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePermission('expenses.register');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const expenseId = Number(id);
  if (!Number.isInteger(expenseId)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });

  const { rows } = await pool.query('SELECT receipt_file AS "receiptFile" FROM expenses WHERE id = $1', [expenseId]);
  if (rows.length === 0 || !rows[0].receiptFile) {
    return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 });
  }

  const file = await readReceipt(rows[0].receiptFile);
  if (!file) return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 });

  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
    },
  });
}
