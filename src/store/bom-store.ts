import { createStore, useStore } from 'zustand';
import { BOMItem, BOMSummary, MouserPart, MouserCartResponse } from '@/lib/mouser/types';
import { calculateTierPrice, parseStockQuantity, pickBestMatchedPart } from '@/lib/mouser/client';
import { mountingKeyword, mountingScore } from '@/lib/mounting/mounting';
import { Supplier, SUPPLIER_LABELS, supplierApiPath } from '@/lib/supplier';
import { getSupplierSearchHeaders, useSettingsStore } from './settings-store';
import { useSupplierStore } from './supplier-store';

export interface ResolveProgress {
  current: number;
  total: number;
  currentPart: string;
}

export interface BomState {
  supplier: Supplier;
  items: BOMItem[];
  isResolving: boolean;
  isLoaded: boolean;
  resolveProgress: ResolveProgress | null;
  activeCart: MouserCartResponse | null;
  selectedItemForReplace: BOMItem | null;
  isCartModalOpen: boolean;
  isManualSearchOpen: boolean;
  isReplaceModalOpen: boolean;

  setItems: (items: BOMItem[]) => void;
  addItem: (item: Partial<BOMItem>) => void;
  updateItemQty: (id: string, newQty: number) => void;
  setItemSmd: (id: string, smd: boolean) => void;
  deleteItem: (id: string) => void;
  deleteItems: (ids: string[]) => void;
  clearBom: () => void;
  replaceItemPart: (id: string, newPart: MouserPart) => void;
  setSelectedForReplace: (item: BOMItem | null) => void;
  setIsCartModalOpen: (open: boolean) => void;
  setIsManualSearchOpen: (open: boolean) => void;
  setIsReplaceModalOpen: (open: boolean) => void;
  setActiveCart: (cart: MouserCartResponse | null) => void;

  loadSavedBom: () => Promise<void>;
  resolveAllItems: (searchApiKey?: string) => Promise<void>;
  resolveSingleItem: (id: string, searchApiKey?: string) => Promise<void>;
  getSummary: () => BOMSummary;
}

// Mouser keeps its original keys so existing saved BOMs still load.
const STORAGE_KEYS: Record<Supplier, { items: string; cart: string }> = {
  mouser: { items: 'mouser_bom_items_v1', cart: 'mouser_bom_cart_v1' },
  digikey: { items: 'digikey_bom_items_v1', cart: 'digikey_bom_cart_v1' },
};

/**
 * Pick the best part for a keyword query (CAD import): favour parts with the
 * line's mounting (SMD or regular through-hole), in stock for the requested
 * quantity, whose description mentions the query's values.
 */
export function pickBestKeywordPart(
  parts: MouserPart[],
  query: string,
  requestedQty: number,
  wantSmd: boolean = false
): MouserPart | null {
  if (!parts || parts.length === 0) return null;
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/ohm$/, ''))
    .filter((t) => t.length > 1 && /\d/.test(t));

  const score = (p: MouserPart): number => {
    let s = 500 * mountingScore(p, wantSmd);
    if (!p.MouserPartNumber || p.MouserPartNumber.toLowerCase() === 'n/a') s -= 1000;
    const stock = parseStockQuantity(p.Availability, p.AvailabilityInStock, p.FactoryStock);
    if (stock >= requestedQty) s += 400;
    else if (stock > 0) s += 150;
    if (p.PriceBreaks && p.PriceBreaks.length > 0) s += 100;
    const moq = parseInt(p.Min || '1', 10) || 1;
    if (moq <= requestedQty) s += 100;
    const haystack = `${p.Description} ${p.ManufacturerPartNumber}`.toLowerCase().replace(/\s+/g, '');
    tokens.forEach((t) => {
      if (haystack.includes(t.replace(/\s+/g, ''))) s += 60;
    });
    return s;
  };

  return [...parts].sort((a, b) => score(b) - score(a))[0] || parts[0];
}

async function queryAndMatchSingleItem(
  item: BOMItem,
  supplier: Supplier,
  headers: Record<string, string>
): Promise<BOMItem> {
  const label = SUPPLIER_LABELS[supplier];
  const isKeyword = item.searchMode === 'keyword';
  const wantSmd = Boolean(item.smd);
  try {
    const search = async (body: Record<string, unknown>) => {
      const res = await fetch(supplierApiPath(supplier, isKeyword ? 'search/keyword' : 'search/partnumber'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    };

    let data;
    if (isKeyword) {
      // Ask for the line's mounting first; if that finds nothing of the right
      // kind, run the plain query too and pick from both result sets.
      const hint = mountingKeyword(supplier, wantSmd);
      data = await search({ keyword: hint ? `${item.rawPartNumber} ${hint}` : item.rawPartNumber, records: 50 });
      const hinted: MouserPart[] = data.error ? [] : data.parts || [];
      const best = pickBestKeywordPart(hinted, item.rawPartNumber, item.requestedQty, wantSmd);
      if (hint && (!best || mountingScore(best, wantSmd) < 0)) {
        const plain = await search({ keyword: item.rawPartNumber, records: 50 });
        if (!plain.error) {
          data = { ...plain, parts: [...hinted, ...(plain.parts || [])] };
        } else if (hinted.length === 0) {
          data = plain;
        }
      }
    } else {
      data = await search({
        partNumber: item.rawPartNumber,
        description: item.notes,
        designator: item.designator,
      });
    }

    const parts: MouserPart[] = data.parts || [];

    if (parts.length > 0 && !data.error) {
      const matchedPart =
        (isKeyword
          ? pickBestKeywordPart(parts, item.rawPartNumber, item.requestedQty, wantSmd)
          : pickBestMatchedPart(parts, item.rawPartNumber, wantSmd)) || parts[0];
      const stock = parseStockQuantity(
        matchedPart.Availability,
        matchedPart.AvailabilityInStock,
        matchedPart.FactoryStock
      );
      const tier = calculateTierPrice(matchedPart.PriceBreaks, item.requestedQty);
      const moq = parseInt(matchedPart.Min || '1', 10) || 1;
      const mult = parseInt(matchedPart.Mult || '1', 10) || 1;
      const meetsMoq = item.requestedQty >= moq;
      const meetsMultiple = item.requestedQty % mult === 0;

      let status: BOMItem['status'] = 'matched';
      if (stock < item.requestedQty) {
        status = 'low_stock';
      } else if (!meetsMoq || !meetsMultiple) {
        status = 'moq_warning';
      }

      return {
        ...item,
        matchedPart,
        availableStock: stock,
        unitPrice: tier.unitPrice,
        extendedPrice: tier.unitPrice * item.requestedQty,
        currency: tier.currency,
        moq,
        orderMultiple: mult,
        meetsMoq,
        meetsMultiple,
        status,
        errorMessage: undefined,
      };
    } else {
      const errMsg =
        data.error ||
        (isKeyword
          ? `No ${label} results for "${item.rawPartNumber}"`
          : `Part "${item.rawPartNumber}" not found in ${label} catalog`);
      const isAuthOrNetworkError = /api key|unauthorized|forbidden|quota|rate limit|identifier|rejected|authoriz|client id|secret/i.test(errMsg);

      return {
        ...item,
        matchedPart: undefined,
        availableStock: 0,
        unitPrice: 0,
        extendedPrice: 0,
        status: isAuthOrNetworkError ? 'error' : 'unresolved',
        errorMessage: errMsg,
      };
    }
  } catch (err: unknown) {
    console.error(`Failed to resolve ${item.rawPartNumber}:`, err);
    const errMsg = (err as Error).message || 'Connection error';
    return {
      ...item,
      matchedPart: undefined,
      availableStock: 0,
      unitPrice: 0,
      extendedPrice: 0,
      status: 'error',
      errorMessage: errMsg,
    };
  }
}

/**
 * Resolve search credentials before a lookup. Mouser needs a key in the
 * browser; DigiKey may also use credentials configured on the server, so a
 * missing browser credential does not block it.
 */
function credentialsOrPrompt(supplier: Supplier, explicitKey?: string): Record<string, string> | null {
  const { headers, hasCredentials } = getSupplierSearchHeaders(supplier, explicitKey);
  if (supplier === 'mouser' && !hasCredentials) {
    useSettingsStore.getState().setIsSettingsOpen(true);
    alert('Please configure your Mouser Search API Key in Settings to query live Mouser inventory.');
    return null;
  }
  return headers;
}

function createBomStore(supplier: Supplier) {
  const storageKeys = STORAGE_KEYS[supplier];

  function persistToStorage(items: BOMItem[], activeCart: MouserCartResponse | null) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKeys.items, JSON.stringify(items));
        if (activeCart) {
          localStorage.setItem(storageKeys.cart, JSON.stringify(activeCart));
        } else {
          localStorage.removeItem(storageKeys.cart);
        }
      } catch (err) {
        console.warn('Failed to save BOM to browser localStorage:', err);
      }
    }
  }

  return createStore<BomState>((set, get) => ({
    supplier,
    items: [],
    isResolving: false,
    isLoaded: false,
    resolveProgress: null,
    activeCart: null,
    selectedItemForReplace: null,
    isCartModalOpen: false,
    isManualSearchOpen: false,
    isReplaceModalOpen: false,

    setItems: (items: BOMItem[]) => {
      set({ items });
      persistToStorage(items, get().activeCart);
    },

    addItem: (partialItem: Partial<BOMItem>) => {
      const current = get().items;
      const requestedQty = Math.max(1, partialItem.requestedQty || 1);
      const matchedPart = partialItem.matchedPart;

      let unitPrice = 0;
      let currency = 'USD';
      let availableStock = 0;
      let moq = 1;
      let mult = 1;

      if (matchedPart) {
        const tier = calculateTierPrice(matchedPart.PriceBreaks, requestedQty);
        unitPrice = tier.unitPrice;
        currency = tier.currency;
        availableStock = parseStockQuantity(
          matchedPart.Availability,
          matchedPart.AvailabilityInStock,
          matchedPart.FactoryStock
        );
        moq = parseInt(matchedPart.Min || '1', 10) || 1;
        mult = parseInt(matchedPart.Mult || '1', 10) || 1;
      }

      const meetsMoq = requestedQty >= moq;
      const meetsMultiple = requestedQty % mult === 0;

      let status = partialItem.status || 'pending';
      if (matchedPart) {
        if (availableStock < requestedQty) {
          status = 'low_stock';
        } else if (!meetsMoq || !meetsMultiple) {
          status = 'moq_warning';
        } else {
          status = 'matched';
        }
      }

      const newItem: BOMItem = {
        id: `bom-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        lineNumber: current.length + 1,
        designator: partialItem.designator || `Line ${current.length + 1}`,
        rawPartNumber: partialItem.rawPartNumber || '',
        requestedQty,
        notes: partialItem.notes || '',
        status,
        matchedPart,
        unitPrice,
        extendedPrice: unitPrice * requestedQty,
        currency,
        availableStock,
        moq,
        orderMultiple: mult,
        meetsMoq,
        meetsMultiple,
        isCustomPart: Boolean(partialItem.isCustomPart),
      };

      const updated = [...current, newItem];
      set({ items: updated });
      persistToStorage(updated, get().activeCart);
    },

    updateItemQty: (id: string, newQty: number) => {
      const safeQty = Math.max(1, Math.floor(newQty) || 1);
      const current = get().items;
      const updated = current.map((item) => {
        if (item.id !== id) return item;

        let unitPrice = item.unitPrice;
        let currency = item.currency;

        if (item.matchedPart) {
          const tier = calculateTierPrice(item.matchedPart.PriceBreaks, safeQty);
          unitPrice = tier.unitPrice;
          currency = tier.currency;
        }

        const meetsMoq = safeQty >= item.moq;
        const meetsMultiple = safeQty % item.orderMultiple === 0;

        let status = item.status;
        if (item.matchedPart) {
          if (item.availableStock < safeQty) {
            status = 'low_stock';
          } else if (!meetsMoq || !meetsMultiple) {
            status = 'moq_warning';
          } else {
            status = 'matched';
          }
        }

        return {
          ...item,
          requestedQty: safeQty,
          unitPrice,
          extendedPrice: unitPrice * safeQty,
          currency,
          meetsMoq,
          meetsMultiple,
          status,
        };
      });

      set({ items: updated });
      persistToStorage(updated, get().activeCart);
    },

    setItemSmd: (id: string, smd: boolean) => {
      const updated = get().items.map((item) => (item.id === id ? { ...item, smd } : item));
      set({ items: updated });
      persistToStorage(updated, get().activeCart);
    },

    deleteItem: (id: string) => {
      get().deleteItems([id]);
    },

    deleteItems: (ids: string[]) => {
      const remove = new Set(ids);
      const updated = get()
        .items.filter((i) => !remove.has(i.id))
        .map((item, idx) => ({ ...item, lineNumber: idx + 1 }));

      set({ items: updated });
      persistToStorage(updated, get().activeCart);
    },

    clearBom: () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(storageKeys.items);
          localStorage.removeItem(storageKeys.cart);
        } catch {}
      }

      set({ items: [], activeCart: null, selectedItemForReplace: null, resolveProgress: null });
    },

    replaceItemPart: (id: string, newPart: MouserPart) => {
      const current = get().items;
      const updated = current.map((item) => {
        if (item.id !== id) return item;

        const qty = item.requestedQty;
        const tier = calculateTierPrice(newPart.PriceBreaks, qty);
        const stock = parseStockQuantity(
          newPart.Availability,
          newPart.AvailabilityInStock,
          newPart.FactoryStock
        );
        const moq = parseInt(newPart.Min || '1', 10) || 1;
        const mult = parseInt(newPart.Mult || '1', 10) || 1;

        const meetsMoq = qty >= moq;
        const meetsMultiple = qty % mult === 0;

        let status: BOMItem['status'] = 'matched';
        if (stock < qty) {
          status = 'low_stock';
        } else if (!meetsMoq || !meetsMultiple) {
          status = 'moq_warning';
        }

        return {
          ...item,
          matchedPart: newPart,
          rawPartNumber: newPart.ManufacturerPartNumber,
          // A chosen part is re-checked by its part number from now on.
          searchMode: 'partnumber' as const,
          notes: newPart.Description,
          unitPrice: tier.unitPrice,
          extendedPrice: tier.unitPrice * qty,
          currency: tier.currency,
          availableStock: stock,
          moq,
          orderMultiple: mult,
          meetsMoq,
          meetsMultiple,
          status,
          errorMessage: undefined,
        };
      });

      set({
        items: updated,
        isReplaceModalOpen: false,
        selectedItemForReplace: null,
      });
      persistToStorage(updated, get().activeCart);
    },

    setSelectedForReplace: (item: BOMItem | null) => {
      set({ selectedItemForReplace: item, isReplaceModalOpen: item !== null });
    },

    setIsCartModalOpen: (open: boolean) => set({ isCartModalOpen: open }),
    setIsManualSearchOpen: (open: boolean) => set({ isManualSearchOpen: open }),
    setIsReplaceModalOpen: (open: boolean) => set({ isReplaceModalOpen: open }),
    setActiveCart: (cart: MouserCartResponse | null) => {
      set({ activeCart: cart });
      persistToStorage(get().items, cart);
    },

    loadSavedBom: async () => {
      let loadedItems: BOMItem[] | null = null;
      let loadedCart: MouserCartResponse | null = null;

      // BOMs live only in this browser so visitors never see each other's BOMs
      if (typeof window !== 'undefined') {
        try {
          const localRaw = localStorage.getItem(storageKeys.items);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedItems = parsed;
            }
          }
          const cartRaw = localStorage.getItem(storageKeys.cart);
          if (cartRaw) {
            loadedCart = JSON.parse(cartRaw);
          }
        } catch (err) {
          console.warn('Could not read BOM from localStorage:', err);
        }
      }

      set({ items: loadedItems ?? [], activeCart: loadedCart, isLoaded: true });
    },

    resolveAllItems: async (explicitKey?: string) => {
      const { items } = get();
      if (items.length === 0) return;

      const headers = credentialsOrPrompt(supplier, explicitKey);
      if (!headers) return;

      set({
        isResolving: true,
        resolveProgress: { current: 0, total: items.length, currentPart: 'Starting...' },
      });

      const updatedItems = [...items];

      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        set({
          resolveProgress: {
            current: i + 1,
            total: updatedItems.length,
            currentPart: item.rawPartNumber,
          },
        });

        updatedItems[i] = await queryAndMatchSingleItem(item, supplier, headers);

        // Update state incrementally so user sees live row-by-row updates
        set({ items: [...updatedItems] });
      }

      set({ isResolving: false, resolveProgress: null });
      persistToStorage(updatedItems, get().activeCart);
    },

    resolveSingleItem: async (id: string, explicitKey?: string) => {
      const { items } = get();
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const headers = credentialsOrPrompt(supplier, explicitKey);
      if (!headers) return;

      const updatedItem = await queryAndMatchSingleItem(item, supplier, headers);
      const updatedItems = get().items.map((i) => (i.id === id ? updatedItem : i));
      set({ items: updatedItems });
      persistToStorage(updatedItems, get().activeCart);
    },

    getSummary: (): BOMSummary => {
      const { items } = get();
      let totalQuantity = 0;
      let totalCost = 0;
      let matchedCount = 0;
      let lowStockCount = 0;
      let unresolvedCount = 0;
      let fulfillableItems = 0;

      items.forEach((item) => {
        totalQuantity += item.requestedQty;
        totalCost += item.extendedPrice;

        if (item.status === 'matched') {
          matchedCount++;
          fulfillableItems++;
        } else if (item.status === 'low_stock') {
          lowStockCount++;
        } else if (item.status === 'moq_warning') {
          matchedCount++;
          if (item.availableStock >= item.requestedQty) fulfillableItems++;
        } else if (item.status === 'unresolved' || item.status === 'error') {
          unresolvedCount++;
        }
      });

      const fulfillmentRate =
        items.length > 0 ? Math.round((fulfillableItems / items.length) * 100) : 0;

      return {
        totalLineItems: items.length,
        totalQuantity,
        totalCost,
        currency: items[0]?.currency || 'USD',
        matchedCount,
        lowStockCount,
        unresolvedCount,
        fulfillmentRate,
      };
    },
  }));
}

const bomStores: Record<Supplier, ReturnType<typeof createBomStore>> = {
  mouser: createBomStore('mouser'),
  digikey: createBomStore('digikey'),
};

/** Direct access to one supplier's BOM store (outside React or for a non-active supplier). */
export function getBomStore(supplier: Supplier) {
  return bomStores[supplier];
}

/** The BOM of the supplier currently selected in the UI. */
export function useBomStore(): BomState {
  const supplier = useSupplierStore((s) => s.activeSupplier);
  return useStore(bomStores[supplier]);
}

/** Line counts per supplier, for the supplier switcher badges. */
export function useBomItemCount(supplier: Supplier): number {
  return useStore(bomStores[supplier], (s) => s.items.length);
}
