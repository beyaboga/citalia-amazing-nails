import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

/**
 * Historial de un fondo (GET) y aportes/retiros manuales (POST). El saldo mostrado
 * se calcula al vuelo con una suma corrida sobre los movimientos del período — nunca
 * se guarda, igual filosofía que la vista `cash_movements`. Cada período es
 * independiente: el saldo reinicia en 0 al cambiar de mes.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('funds.view');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const periodIdParam = searchParams.get('periodId');

  await pool.query('SELECT close_elapsed_financial_periods()');
  let periodId: number;
  if (periodIdParam) {
    periodId = Number(periodIdParam);
  } else {
    const { rows } = await pool.query('SELECT get_or_create_financial_period(CURRENT_DATE) AS id');
    periodId = rows[0].id;
  }

  const { rows } = await pool.query(
    `SELECT
       fm.id,
       to_char(fm.created_at, 'YYYY-MM-DD HH24:MI') AS date,
       fm.movement_type AS "movementType",
       fm.direction,
       fm.amount::float8 AS amount,
       fm.concept,
       fm.notes,
       fm.voided_at IS NOT NULL AS voided,
       r.receipt_number AS "receiptNumber",
       c.name AS "customerName",
       u.name AS "employeeName",
       SUM(CASE
         WHEN fm.voided_at IS NOT NULL THEN 0
         WHEN fm.direction = 'IN' THEN fm.amount
         ELSE -fm.amount
       END) OVER (ORDER BY fm.created_at, fm.id)::float8 AS balance
     FROM fund_movements fm
     LEFT JOIN receipts r ON r.payment_id = fm.payment_id
     LEFT JOIN customers c ON c.id = fm.customer_id
     LEFT JOIN team_members tm ON tm.id = fm.team_member_id
     LEFT JOIN users u ON u.id = tm.user_id
     WHERE fm.fund_id = $1 AND fm.financial_period_id = $2
     ORDER BY fm.created_at, fm.id`,
    [id, periodId]
  );

  return NextResponse.json({ periodId, movements: rows });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission('funds.contribute');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const direction = String(body?.direction ?? '');
  const amount = Number(body?.amount);
  const concept = String(body?.concept ?? '').trim();
  const notes = body?.notes ? String(body.notes).trim() : null;

  if (direction !== 'IN' && direction !== 'OUT') {
    return NextResponse.json({ error: 'Dirección inválida' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
  }
  if (!concept || concept.length < 3) {
    return NextResponse.json(
      { error: 'El concepto es obligatorio (mínimo 3 caracteres)' },
      { status: 400 }
    );
  }

  await pool.query('SELECT close_elapsed_financial_periods()');
  const { rows: fundRows } = await pool.query('SELECT id, name FROM reserve_funds WHERE id = $1', [
    id,
  ]);
  if (fundRows.length === 0) {
    return NextResponse.json({ error: 'Fondo no encontrado' }, { status: 404 });
  }

  const { rows: periodRows } = await pool.query(
    `SELECT id, status FROM financial_periods
     WHERE (year, month) = (EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int)`
  );
  let period = periodRows[0];
  if (!period) {
    const { rows } = await pool.query('SELECT get_or_create_financial_period(CURRENT_DATE) AS id');
    period = { id: rows[0].id, status: 'OPEN' };
  }
  if (period.status === 'CLOSED') {
    return NextResponse.json(
      { error: 'El período actual está cerrado; no admite aportes manuales' },
      { status: 400 }
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO fund_movements
         (fund_id, financial_period_id, direction, amount, movement_type, source_type, concept, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, 'manual', $6, $7, $8)
       RETURNING id, direction, amount::float8 AS amount, concept`,
      [
        id,
        period.id,
        direction,
        amount,
        direction === 'IN' ? 'MANUAL_CONTRIBUTION' : 'MANUAL_WITHDRAWAL',
        concept,
        notes,
        auth.user.id,
      ]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating manual fund movement:', error);
    return NextResponse.json({ error: 'Error al registrar el movimiento' }, { status: 500 });
  }
}
