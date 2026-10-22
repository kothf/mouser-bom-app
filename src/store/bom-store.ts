import { createStore, useStore } from 'zustand';
import { BOMItem, BOMSummary, MouserPart, MouserCartResponse } from '@/lib/mouser/types';
import { calculateTierPrice, parseStockQuantity, pickBestMatchedPart } from '@/lib/mouser/client';
import { mountingKeyword, mountingScore } from '@/lib/mounting/mounting';
import {
  higherRatings,
  partsRatedBetween,
  partVoltage,
  requestedCapacitorVoltage,
  withVoltage,
} from '@/lib/voltage/voltage';
import { alternateValueQueries } from '@/lib/value/notation';
import { manufacturerScore, priceScores, valueScore } from '@/lib/scoring/manufacturers';
import { Supplier, SUPPLIER_LABELS, supplierApiPath } from '@/lib/supplier';
import { apiPath } from '@/lib/api-path';
import {
  UsdRates,
  convertBomItemWithRates,
  convertCartWithRates,
  isUsd,
  partNeedsUsd,
} from '@/lib/currency/convert';
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
 * quantity, whose description mentions the query's values. Among those, a
 * well-rated manufacturer and a lower price win (never over a missed value).
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

  const prices = priceScores(parts, requestedQty);
  const score = (p: MouserPart): number => {
    let s = 500 * mountingScore(p, wantSmd);
    s += valueScore(manufacturerScore(p), prices.get(p) ?? 0);
    if (!p.MouserPartNumber || p.MouserPartNumber.toLowerCase() === 'n/a') s -= 1000;
    const stock = parseStockQuantity(p.Availability, p.AvailabilityInStock, p.FactoryStock);
    if (stock >= requestedQty) s += 400;
    else if (stock > 0) s += 150;
    if (p.PriceBreaks && p.PriceBreaks.length > 0) s += 100;
    const moq = parseInt(p.Min || '1', 10) || 1;
    if (moq <= requestedQty) s += 100;
    const haystack = `${p.Description} ${p.ManufacturerPartNumber}`.toLowerCase().replace(/\s+/g, '');
    tokens.forEach((t) => {
      if (haystack.includes(t.replace(/\s+/g, ''))) s += 120;
    });
    return s;
  };

  return [...parts].sort((a, b) => score(b) - score(a))[0] || parts[0];
}

function isAuthError(message?: string): boolean {
  return Boolean(message) && /api key|unauthorized|forbidden|quota|rate limit|identifier|rejected|authoriz|client id|secret/i.test(message!);
}

export async function queryAndMatchSingleItem(
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

    // Keyword search for one query: ask for the line's mounting first; if that
    // finds nothing of the right kind, run the plain query too and pick from both.
    const searchKeyword = async (query: string) => {
      const hint = mountingKeyword(supplier, wantSmd);
      let result = await search({ keyword: hint ? `${query} ${hint}` : query, records: 50 });
      const hinted: MouserPart[] = result.error ? [] : result.parts || [];
      const best = pickBestKeywordPart(hinted, query, item.requestedQty, wantSmd);
      if (hint && (!best || mountingScore(best, wantSmd) < 0)) {
        const plain = await search({ keyword: query, records: 50 });
        if (!plain.error) {
          result = { ...plain, parts: [...hinted, ...(plain.parts || [])] };
        } else if (hinted.length === 0) {
          result = plain;
        }
      }
      return result;
    };

    // One keyword lookup. Capacitors: when nothing is rated at the asked
    // voltage, try the next higher standard ratings (400V -> 450V, 500V,
    // 550V), never a lower one.
    const resolveKeyword = async (base: string) => {
      let query = base;
      let voltageNote: string | undefined;
      let data = await searchKeyword(base);
      const volts = requestedCapacitorVoltage(base, item.category);
      if (volts !== null && !data.error) {
        const seen: MouserPart[] = [...(data.parts || [])];
        let found = partsRatedBetween(seen, volts, volts);
        for (const higher of found.length > 0 ? [] : higherRatings(volts)) {
          const q = withVoltage(base, higher);
          const next = await searchKeyword(q);
          if (next.error) continue;
          seen.push(...(next.parts || []));
          found = partsRatedBetween(next.parts || [], volts, higher);
          if (found.length > 0) {
            query = q;
            break;
          }
        }
        // Still nothing in range: take any part rated above the asked voltage.
        if (found.length === 0) found = partsRatedBetween(seen, volts);
        if (found.length > 0) {
          data = { ...data, error: undefined, parts: found };
          const best = pickBestKeywordPart(found, query, item.requestedQty, wantSmd);
          const bestVolts = best ? partVoltage(best) : null;
          if (bestVolts !== null && bestVolts > volts) {
            voltageNote = `No ${volts}V part found, picked a ${bestVolts}V one`;
          }
        }
      }
      const parts: MouserPart[] = data.error ? [] : data.parts || [];
      const best = pickBestKeywordPart(parts, query, item.requestedQty, wantSmd);
      const stock = best ? parseStockQuantity(best.Availability, best.AvailabilityInStock, best.FactoryStock) : 0;
      return { data, query, voltageNote, best, stock };
    };

    let data;
    let query = item.rawPartNumber;
    let note: string | undefined;
    if (isKeyword) {
      let r = await resolveKeyword(item.rawPartNumber);
      // Nothing in stock: the value may be written another way by the
      // supplier (470nF = 0.47uF = 470000pF, 4.7k = 4K7 = 4700 Ohm).
      let notationNote: string | undefined;
      if (r.stock <= 0 && !isAuthError(r.data.error)) {
        for (const alt of alternateValueQueries(item.rawPartNumber, item.category)) {
          const next = await resolveKeyword(alt.query);
          // Only a part that has stock, more than any found so far, and the
          // line's mounting (an unticked SMD box means through-hole only).
          if (!next.best || next.stock <= Math.max(r.stock, 0)) continue;
          if (mountingScore(next.best, wantSmd) < 0) continue;
          r = next;
          notationNote = `None in stock as ${alt.from}, found as ${alt.to}`;
          if (r.stock >= item.requestedQty) break;
        }
      }
      data = r.data;
      query = r.query;
      note = [notationNote, r.voltageNote].filter(Boolean).join('; ') || undefined;
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
          ? pickBestKeywordPart(parts, query, item.requestedQty, wantSmd)
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
        searchNote: note,
      };
    } else {
      const errMsg =
        data.error ||
        (isKeyword
          ? `No ${label} results for "${item.rawPartNumber}"`
          : `Part "${item.rawPartNumber}" not found in ${label} catalog`);
      const isAuthOrNetworkError = isAuthError(errMsg);

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
        smd: Boolean(partialItem.smd),
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
          searchNote: undefined,
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

      // Lines saved before prices were USD-only can still hold another currency.
      const needsUsd =
        (loadedItems ?? []).some((i) => !isUsd(i.currency) || partNeedsUsd(i.matchedPart)) ||
        Boolean(loadedCart && !isUsd(loadedCart.CurrencyCode));
      if (needsUsd) {
        try {
          const res = await fetch(apiPath('/api/currency/rates'));
          const { rates } = (await res.json()) as { rates: UsdRates };
          const items = get().items.map((i) => convertBomItemWithRates(i, rates));
          const cart = get().activeCart;
          const activeCart = cart ? convertCartWithRates(cart, rates) : cart;
          set({ items, activeCart });
          // Without live rates the prices are only hidden; keep the saved copy to convert later.
          if (Object.keys(rates).length > 1) persistToStorage(items, activeCart);
        } catch (err) {
          console.warn('Could not convert saved BOM prices to USD:', err);
        }
      }
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
