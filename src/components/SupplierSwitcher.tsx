'use client';

import React from 'react';
import { SUPPLIERS, SUPPLIER_LABELS, Supplier } from '@/lib/supplier';
import { useSupplierStore } from '@/store/supplier-store';
import { useBomItemCount } from '@/store/bom-store';

function SupplierTab({ supplier }: { supplier: Supplier }) {
  const { activeSupplier, setActiveSupplier } = useSupplierStore();
  const count = useBomItemCount(supplier);
  const isActive = activeSupplier === supplier;

  return (
    <button
      type="button"
      onClick={() => setActiveSupplier(supplier)}
      aria-pressed={isActive}
      className={`inline-flex items-center gap-2 h-8 px-3.5 rounded-md text-xs font-semibold transition ${
        isActive ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-400 hover:text-white'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${supplier === 'mouser' ? 'bg-blue-400' : 'bg-rose-400'} ${
          isActive ? '' : 'opacity-50'
        }`}
        aria-hidden="true"
      />
      <span>{SUPPLIER_LABELS[supplier]}</span>
      <span
        className={`tabular min-w-5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
          isActive ? 'bg-white/10 text-slate-200' : 'bg-slate-800/80 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Switches between the per-supplier BOMs. Each supplier has its own list,
 * search results and cart; nothing is shared between them. `actions` sit on
 * the right of the same row (the BOM toolbar when a list is open).
 */
export function SupplierSwitcher({ actions }: { actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div
          role="group"
          aria-label="Supplier"
          className="inline-flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800"
        >
          {SUPPLIERS.map((s) => (
            <SupplierTab key={s} supplier={s} />
          ))}
        </div>
        <p className="text-[11px] text-slate-500">Each supplier keeps its own BOM.</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
