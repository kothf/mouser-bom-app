import { create } from 'zustand';
import { Supplier, isSupplier } from '@/lib/supplier';

const STORAGE_KEY = 'bom_active_supplier_v1';

interface SupplierState {
  activeSupplier: Supplier;
  setActiveSupplier: (supplier: Supplier) => void;
  loadActiveSupplier: () => void;
}

export const useSupplierStore = create<SupplierState>((set) => ({
  activeSupplier: 'mouser',

  setActiveSupplier: (supplier: Supplier) => {
    set({ activeSupplier: supplier });
    try {
      localStorage.setItem(STORAGE_KEY, supplier);
    } catch {}
  },

  loadActiveSupplier: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isSupplier(stored)) set({ activeSupplier: stored });
    } catch {}
  },
}));
