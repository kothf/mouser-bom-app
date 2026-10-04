import { create } from 'zustand';
import { BOMItem, BOMSummary, MouserPart, MouserCartResponse } from '@/lib/mouser/types';
import { calculateTierPrice, parseStockQuantity } from '@/lib/mouser/client';

export interface ResolveProgress {
  current: number;
  total: number;
  currentPart: string;
}

export interface BomState {
  items: BOMItem[];
  isResolving: boolean;
  resolveProgress: ResolveProgress | null;
  activeCart: MouserCartResponse | null;
  selectedItemForReplace: BOMItem | null;
  isCartModalOpen: boolean;
  isManualSearchOpen: boolean;
  isReplaceModalOpen: boolean;

  setItems: (items: BOMItem[]) => void;
  addItem: (item: Partial<BOMItem>) => void;
  updateItemQty: (id: string, newQty: number) => void;
  deleteItem: (id: string) => void;
  clearBom: () => void;
  replaceItemPart: (id: string, newPart: MouserPart) => void;
  setSelectedForReplace: (item: BOMItem | null) => void;
  setIsCartModalOpen: (open: boolean) => void;
  setIsManualSearchOpen: (open: boolean) => void;
  setIsReplaceModalOpen: (open: boolean) => void;
  setActiveCart: (cart: MouserCartResponse | null) => void;

  resolveAllItems: (searchApiKey?: string, useDemoMode?: boolean) => Promise<void>;
  getSummary: () => BOMSummary;
}

export const useBomStore = create<BomState>((set, get) => ({
  items: [],
  isResolving: false,
  resolveProgress: null,
  activeCart: null,
  selectedItemForReplace: null,
  isCartModalOpen: false,
  isManualSearchOpen: false,
  isReplaceModalOpen: false,

  setItems: (items: BOMItem[]) => set({ items }),

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
      availableStock = parseStockQuantity(matchedPart.Availability);
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

    set({ items: [...current, newItem] });
  },

  updateItemQty: (id: string, newQty: number) => {
    const safeQty = Math.max(1, Math.floor(newQty) || 1);
    set((state) => ({
      items: state.items.map((item) => {
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
      }),
    }));
  },

  deleteItem: (id: string) => {
    set((state) => ({
      items: state.items
        .filter((i) => i.id !== id)
        .map((item, idx) => ({ ...item, lineNumber: idx + 1 })),
    }));
  },

  clearBom: () => set({ items: [], activeCart: null }),

  replaceItemPart: (id: string, newPart: MouserPart) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;

        const qty = item.requestedQty;
        const tier = calculateTierPrice(newPart.PriceBreaks, qty);
        const stock = parseStockQuantity(newPart.Availability);
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
      }),
      isReplaceModalOpen: false,
      selectedItemForReplace: null,
    }));
  },

  setSelectedForReplace: (item: BOMItem | null) => {
    set({ selectedItemForReplace: item, isReplaceModalOpen: item !== null });
  },

  setIsCartModalOpen: (open: boolean) => set({ isCartModalOpen: open }),
  setIsManualSearchOpen: (open: boolean) => set({ isManualSearchOpen: open }),
  setIsReplaceModalOpen: (open: boolean) => set({ isReplaceModalOpen: open }),
  setActiveCart: (cart: MouserCartResponse | null) => set({ activeCart: cart }),

  resolveAllItems: async (searchApiKey?: string, useDemoMode: boolean = false) => {
    const { items } = get();
    if (items.length === 0) return;

    set({ isResolving: true, resolveProgress: { current: 0, total: items.length, currentPart: 'Starting...' } });

    // Copy array for immutability
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

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (searchApiKey) {
          headers['x-mouser-search-key'] = searchApiKey;
        }

        const res = await fetch('/api/mouser/search/partnumber', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            partNumber: item.rawPartNumber,
            useDemoMode,
            description: item.notes,
            designator: item.designator,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const parts: MouserPart[] = data.parts || [];

        if (parts.length > 0) {
          const matchedPart = parts[0];
          const stock = parseStockQuantity(matchedPart.Availability);
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

          updatedItems[i] = {
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
            errorMessage: data.error,
          };
        } else {
          updatedItems[i] = {
            ...item,
            status: 'unresolved',
            errorMessage: 'Part not found in Mouser catalog',
          };
        }
      } catch (err: unknown) {
        console.error(`Failed to resolve ${item.rawPartNumber}:`, err);
        updatedItems[i] = {
          ...item,
          status: 'error',
          errorMessage: (err as Error).message || 'Connection error',
        };
      }

      // Update state incrementally so user sees live row-by-row updates
      set({ items: [...updatedItems] });
    }

    set({ isResolving: false, resolveProgress: null });
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
