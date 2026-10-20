import { apiPath } from './api-path';

/**
 * Supported distributors. Every supplier gets its own, fully separate BOM
 * (own items, own storage, own cart) so results are never mixed.
 */
export type Supplier = 'mouser' | 'digikey';

export const SUPPLIERS: Supplier[] = ['mouser', 'digikey'];

export const SUPPLIER_LABELS: Record<Supplier, string> = {
  mouser: 'Mouser',
  digikey: 'DigiKey',
};

export const SUPPLIER_SITES: Record<Supplier, string> = {
  mouser: 'Mouser.com',
  digikey: 'DigiKey.com',
};

export function isSupplier(value: unknown): value is Supplier {
  return value === 'mouser' || value === 'digikey';
}

export type SupplierEndpoint = 'search/partnumber' | 'search/keyword' | 'verify';

export function supplierApiPath(supplier: Supplier, endpoint: SupplierEndpoint): string {
  return apiPath(`/api/${supplier}/${endpoint}`);
}
