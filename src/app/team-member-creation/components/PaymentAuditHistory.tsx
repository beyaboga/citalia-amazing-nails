'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { PAYMENT_SCHEME_LABELS, formatLempiras, type PaymentScheme } from '@/lib/payroll';

interface AuditSnapshot {
  scheme?: PaymentScheme;
  monthlySalary?: number;
  rules?: unknown[];
}

interface AuditEntry {
  id: number;
  changeType: string;
  changedBy: string | null;
  changedAt: string;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
}

interface PaymentAuditHistoryProps {
  userId: string | number;
}

const schemeLabel = (s?: PaymentScheme) => (s ? PAYMENT_SCHEME_LABELS[s] ?? s : '—');

const PaymentAuditHistory = ({ userId }: PaymentAuditHistoryProps) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/team-members/${userId}/payment-audit`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: AuditEntry[]) => setEntries(rows))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading || entries.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-6 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Icon name="ClockIcon" size={20} className="text-primary" />
          <h3 className="font-heading font-semibold text-lg text-foreground">Historial del esquema de pago</h3>
          <span className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
            {entries.length}
          </span>
        </div>
        <Icon name={open ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={20} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3">
          {entries.map((e) => {
            const b = e.before ?? {};
            const a = e.after ?? {};
            const schemeChanged = b.scheme !== a.scheme;
            const salaryChanged = (b.monthlySalary ?? 0) !== (a.monthlySalary ?? 0);
            const rulesChanged = (b.rules?.length ?? 0) !== (a.rules?.length ?? 0);
            return (
              <div key={e.id} className="border-l-2 border-border pl-4 py-1">
                <p className="caption text-muted-foreground text-xs">
                  {e.changedAt} · {e.changedBy ?? 'Sistema'}
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                  <li className={schemeChanged ? '' : 'text-muted-foreground'}>
                    Esquema: <span className="font-medium">{schemeLabel(a.scheme)}</span>
                    {schemeChanged && (
                      <span className="caption text-muted-foreground text-xs"> (antes {schemeLabel(b.scheme)})</span>
                    )}
                  </li>
                  <li className={salaryChanged ? '' : 'text-muted-foreground'}>
                    Sueldo: <span className="font-medium">{formatLempiras(a.monthlySalary ?? 0)}</span>
                    {salaryChanged && (
                      <span className="caption text-muted-foreground text-xs"> (antes {formatLempiras(b.monthlySalary ?? 0)})</span>
                    )}
                  </li>
                  <li className={rulesChanged ? '' : 'text-muted-foreground'}>
                    Reglas de comisión: <span className="font-medium">{a.rules?.length ?? 0}</span>
                    {rulesChanged && (
                      <span className="caption text-muted-foreground text-xs"> (antes {b.rules?.length ?? 0})</span>
                    )}
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentAuditHistory;
