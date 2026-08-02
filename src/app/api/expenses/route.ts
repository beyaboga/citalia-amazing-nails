import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { saveReceipt } from '@/lib/receipts';

/**
 * Gastos del negocio. GET lista (con filtros); POST registra un gasto vía
 * multipart/form-data (campos + comprobante opcional). Un gasto 'PAID' entra
 * automáticamente en la vista cash_movements y baja el saldo del método.
 */
export async function GET(request: Request) {
  const auth = await requirePermission('expenses.register');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const conditions: string[] = [];
  const params: any[] = [];
  const add = (cond: string, value: any) => {
    params.push(value);
    conditions.push(cond.replace('$?', `$${params.length}`));
  };

  if (searchParams.get('from')) add('e.expense_date >= $?', searchParams.get('from'));
  if (searchParams.get('to')) add('e.expense_date <= $?', searchParams.get('to'));
  if (searchParams.get('categoryId')) add('e.expense_category_id = $?', Number(searchParams.get('categoryId')));
  if (searchParams.get('methodId')) add('e.payment_method_id = $?', Number(searchParams.get('methodId')));
  if (searchParams.get('status')) add('e.status = $?', searchParams.get('status'));

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT e.id, e.expense_category_id AS "categoryId", ec.name AS "categoryName",
            e.supplier_name AS "supplierName", e.description, e.amount::float8 AS amount,
            to_char(e.expense_date, 'YYYY-MM-DD') AS "expenseDate",
            e.payment_method_id AS "paymentMethodId", pm.name AS "paymentMethodName",
            e.status, (e.receipt_file IS NOT NULL) AS "hasReceipt", e.notes,
            u.name AS "createdByName", to_char(e.created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.expense_category_id
       JOIN payment_methods pm ON pm.id = e.payment_method_id
       LEFT JOIN users u ON u.id = e.created_by
       ${where}
       ORDER BY e.expense_date DESC, e.id DESC`,
    params
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const auth = await requirePermission('expenses.register');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await request.formData();
  const categoryId = Number(form.get('categoryId'));
  const supplierName = String(form.get('supplierName') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const amount = Number(form.get('amount'));
  const expenseDate = String(form.get('expenseDate') ?? '').trim();
  const paymentMethodId = Number(form.get('paymentMethodId'));
  const status = String(form.get('status') ?? 'PENDING').trim();
  const notes = String(form.get('notes') ?? '').trim();
  const receipt = form.get('receipt');

  if (!Number.isInteger(categoryId)) return NextResponse.json({ error: 'Seleccione una categoría' }, { status: 400 });
  if (!description || description.length < 2) return NextResponse.json({ error: 'El concepto es obligatorio' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return NextResponse.json({ error: 'La fecha no es válida' }, { status: 400 });
  if (!Number.isInteger(paymentMethodId)) return NextResponse.json({ error: 'Seleccione un método de pago' }, { status: 400 });
  if (!['PENDING', 'PAID', 'VOIDED'].includes(status)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });

  // El método debe existir y estar activo (no se permite "Dividir pago").
  const { rows: methodRows } = await pool.query(
    `SELECT id FROM payment_methods WHERE id = $1 AND is_active AND type <> 'SPLIT_PAYMENT'`,
    [paymentMethodId]
  );
  if (methodRows.length === 0) return NextResponse.json({ error: 'El método de pago no es válido' }, { status: 400 });

  let receiptFile: string | null = null;
  if (receipt instanceof File && receipt.size > 0) {
    const saved = await saveReceipt(receipt);
    if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: 400 });
    receiptFile = saved.filename;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses
         (expense_category_id, supplier_name, description, amount, expense_date,
          payment_method_id, status, receipt_file, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [categoryId, supplierName || null, description, amount, expenseDate,
       paymentMethodId, status, receiptFile, notes || null, auth.user.id]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23503') {
      return NextResponse.json({ error: 'La categoría o el método de pago no existe' }, { status: 400 });
    }
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Error al registrar el gasto' }, { status: 500 });
  }
}
