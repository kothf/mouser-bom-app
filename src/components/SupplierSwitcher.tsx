'use client';

import React from 'react';
import { Store } from 'lucide-react';
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
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
        isActive
          ? supplier === 'mouser'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-rose-600 text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <span>{SUPPLIER_LABELS[supplier]}</span>
      <span
        className={`min-w-5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Switches between the per-supplier BOMs. Each supplier has its own list,
 * search results and cart; nothing is shared between them.
 */
export function SupplierSwitcher() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 px-4 mb-6">
      <div className="flex items-center gap-3">
        <Store className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {SUPPLIERS.map((s) => (
            <SupplierTab key={s} supplier={s} />
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Each supplier keeps its own separate BOM. Searches and imports go to the selected supplier only.
      </p>
    </div>
  );
}
