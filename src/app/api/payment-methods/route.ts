import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession, hasPermission } from '@/lib/auth';
import { PAYMENT_METHOD_TYPES, type PaymentMethodType } from '@/lib/payments';

const SELECT = `
  SELECT id, name, type, bank, account,
         is_active AS "isActive", display_order AS "displayOrder",
         is_default AS "isDefault", is_system AS "isSystem"
  FROM payment_methods
`;

/**
 * GET /api/payment-methods — lista de métodos.
 *
 * Cualquier usuario autenticado puede leerla: quien cobra una cita necesita los
 * métodos disponibles aunque no pueda configurarlos.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { rows } = await pool.query(`${SELECT} ORDER BY display_order, name`);
  return NextResponse.json(rows);
}

/** POST /api/payment-methods — crear un método. */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!hasPermission(user, 'settings.manage')) {
    return NextResponse.json({ error: 'No tiene permiso para configurar métodos de pago' }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body?.name ?? '').trim();
  const type = String(body?.type ?? '') as PaymentMethodType;

  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  // SPLIT_PAYMENT está reservado al método fijo del sistema: no se crea otro.
  if (!PAYMENT_METHOD_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tipo de método no válido' }, { status: 400 });
  }

  const bank = String(body?.bank ?? '').trim() || null;
  const account = String(body?.account ?? '').trim() || null;
  const isActive = body?.isActive !== false;
  const isDefault = Boolean(body?.isDefault);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // El nuevo predeterminado desplaza al anterior (el índice único solo deja uno).
    if (isDefault) {
      await client.query('UPDATE payment_methods SET is_default = false WHERE is_default');
    }

    // Se coloca al final del orden visual.
    const { rows: orderRows } = await client.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM payment_methods WHERE NOT is_system'
    );

    const { rows } = await client.query(
      `INSERT INTO payment_methods (name, type, bank, account, is_active, display_order, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [name, type, bank, account, isActive, orderRows[0].next, isDefault]
    );

    await client.query('COMMIT');
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
