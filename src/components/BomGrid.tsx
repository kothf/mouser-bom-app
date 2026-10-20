'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  FileText,
  Search,
  ShoppingCart,
  Loader2,
  Package,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowLeftRight,
  Key,
  Copy,
} from 'lucide-react';
import { BOMItem } from '@/lib/mouser/types';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { calculateTierPrice } from '@/lib/mouser/client';
import { apiPath } from '@/lib/api-path';
import { SUPPLIER_LABELS, SUPPLIER_SITES } from '@/lib/supplier';
import { ExportDropdown } from './ExportDropdown';

const DIGIKEY_CART_URL = 'https://www.digikey.com/ordering/shoppingcart';

const columnHelper = createColumnHelper<BOMItem>();

export function BomGrid() {
  const {
    supplier,
    items,
    isResolving,
    resolveProgress,
    updateItemQty,
    setItemSmd,
    deleteItem,
    deleteItems,
    clearBom,
    resolveAllItems,
    resolveSingleItem,
    setSelectedForReplace,
    setActiveCart,
    setIsCartModalOpen,
  } = useBomStore();

  const { searchApiKey, cartApiKey } = useSettingsStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPushingCart, setIsPushingCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [resolvingItemId, setResolvingItemId] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const label = SUPPLIER_LABELS[supplier];

  // Compute robust effective search key with localStorage fallback
  const effectiveSearchKey = useMemo(() => {
    if (searchApiKey?.trim()) return searchApiKey.trim();
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('mouser_bom_settings_v1') || '{}');
        if (stored.searchApiKey?.trim()) return stored.searchApiKey.trim();
      } catch {}
    }
    return '';
  }, [searchApiKey]);

  // Check if any items have not been queried or need resolution
  const hasUnresolved = useMemo(() => {
    return items.some(
      (i) => !i.matchedPart || i.status === 'unresolved' || i.status === 'pending' || i.status === 'error'
    );
  }, [items]);

  // Filter items by status if statusFilter is not 'all'
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return items;
    if (statusFilter === 'attention') {
      return items.filter(
        (i) => i.status === 'low_stock' || i.status === 'unresolved' || i.status === 'moq_warning' || i.status === 'error'
      );
    }
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  // DigiKey has no public cart API: copy a quick-add list (Qty, DigiKey #, Customer Ref)
  // and open the DigiKey cart, where it can be pasted.
  const handleCopyDigiKeyCart = async () => {
    const lines = items
      .filter((i) => i.matchedPart?.MouserPartNumber)
      .map((i) => `${i.requestedQty},${i.matchedPart!.MouserPartNumber},${(i.designator || '').replace(/,/g, ' ')}`);

    if (lines.length === 0) {
      alert('No resolved parts with DigiKey part numbers yet. Please resolve items first.');
      return;
    }

    setCartError(null);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCartNotice(
        `Copied ${lines.length} lines (Quantity, DigiKey Part Number, Customer Reference). Paste them into the bulk add / quick add box of the DigiKey cart that just opened.`
      );
      window.open(DIGIKEY_CART_URL, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      setCartError((err as Error).message || 'Could not copy to clipboard');
    }
  };

  // Handle Export to Mouser Cart API
  const handleExportToCart = async () => {
    if (items.length === 0) return;
    if (supplier === 'digikey') {
      await handleCopyDigiKeyCart();
      return;
    }

    // Validate only resolved parts with a valid Mouser Part Number
    const validItems = items
      .filter((i) => i.matchedPart?.MouserPartNumber || i.status === 'matched')
      .map((i) => ({
        MouserPartNumber: i.matchedPart?.MouserPartNumber || i.rawPartNumber,
        Quantity: i.requestedQty,
        CustomerPartNumber: i.designator,
      }));

    if (validItems.length === 0) {
      alert('No resolved parts available with valid Mouser Part Numbers. Please resolve items first.');
      return;
    }

    setIsPushingCart(true);
    setCartError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cartApiKey) {
        headers['x-mouser-cart-key'] = cartApiKey;
      }

      const res = await fetch(apiPath('/api/mouser/cart/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: validItems,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to create Mouser cart`);
      }

      const cartData = await res.json();
      setActiveCart(cartData);
      setIsCartModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to create cart:', err);
      setCartError((err as Error).message || 'Failed to create Mouser cart session');
    } finally {
      setIsPushingCart(false);
    }
  };

  const selectedIds = useMemo(
    () => items.filter((i) => rowSelection[i.id]).map((i) => i.id),
    [items, rowSelection]
  );

  // Ticking SMD changes what the line should be searched for, so a line that
  // was already looked up is searched again right away.
  const handleToggleSmd = useCallback(
    async (item: BOMItem, smd: boolean) => {
      setItemSmd(item.id, smd);
      if (item.status === 'pending' || isResolving) return;
      setResolvingItemId(item.id);
      try {
        await resolveSingleItem(item.id, effectiveSearchKey);
      } finally {
        setResolvingItemId(null);
      }
    },
    [setItemSmd, isResolving, resolveSingleItem, effectiveSearchKey]
  );

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const noun = selectedIds.length === 1 ? 'line' : 'lines';
    if (window.confirm(`Delete ${selectedIds.length} selected ${noun} from the BOM?`)) {
      deleteItems(selectedIds);
      setRowSelection({});
    }
  };

  // Define Table Columns
  const columns = useMemo(
    () => [
      // 0. Row selection
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all lines"
            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer align-middle"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select line ${row.original.lineNumber}`}
            className="w-3.5 h-3.5 accent-blue-500 cursor-pointer align-middle"
          />
        ),
      }),

      // 1. Status Indicator
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const item = info.row.original;

          switch (status) {
            case 'matched':
              return (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Matched</span>
                </div>
              );
            case 'low_stock':
              return (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20" title={`Only ${item.availableStock} in stock!`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Low Stock</span>
                </div>
              );
            case 'moq_warning':
              return (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 text-orange-400 ring-1 ring-inset ring-orange-500/20" title={`MOQ is ${item.moq}, Mult is ${item.orderMultiple}`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">MOQ Alert</span>
                </div>
              );
            case 'unresolved':
              return (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20" title={item.errorMessage || 'Not found'}>
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Not Found</span>
                </div>
              );
            case 'error':
              const isKeyRejected = /identifier/i.test(item.errorMessage || '');
              const isKeyMissing = /api key|unauthorized/i.test(item.errorMessage || '');
              return (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20" title={item.errorMessage || 'Error'}>
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
                    {isKeyRejected ? 'Key Rejected' : isKeyMissing ? 'No API Key' : 'Error'}
                  </span>
                </div>
              );
            default:
              return (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/60 text-slate-400 ring-1 ring-inset ring-slate-700/60">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Pending</span>
                </div>
              );
          }
        },
      }),

      // 2. Line Item / Designator
      columnHelper.accessor('designator', {
        header: 'Designator',
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 inline-block">
                {info.getValue() || '—'}
              </span>
              <p className="text-[10px] text-slate-500">Line #{item.lineNumber}</p>
              <label
                className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer select-none w-fit"
                title="Search a surface-mount (SMD/SMT) part for this line. Unticked lines get regular through-hole parts."
              >
                <input
                  type="checkbox"
                  checked={Boolean(item.smd)}
                  onChange={(e) => handleToggleSmd(item, e.target.checked)}
                  disabled={resolvingItemId === item.id}
                  aria-label={`SMD/SMT part for line ${item.lineNumber}`}
                  className="w-3 h-3 accent-cyan-500 cursor-pointer"
                />
                <span className={item.smd ? 'text-cyan-300 font-semibold' : ''}>SMD</span>
              </label>
            </div>
          );
        },
      }),

      // 3. Part Number (MPN & Mouser PN)
      columnHelper.accessor('rawPartNumber', {
        header: 'Part Number',
        cell: (info) => {
          const item = info.row.original;
          const part = item.matchedPart;

          return (
            <div className="space-y-1 max-w-[220px]">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-white text-xs truncate">
                  {part?.ManufacturerPartNumber || info.getValue()}
                </span>
                {part?.ProductDetailUrl && (
                  <a
                    href={part.ProductDetailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-400 transition"
                    title={`Open on ${SUPPLIER_SITES[supplier]}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {part?.MouserPartNumber && (
                <p className="font-mono text-[11px] text-slate-400 truncate">
                  {label}: <span className="text-slate-300">{part.MouserPartNumber}</span>
                </p>
              )}

              {item.searchMode === 'keyword' && (
                <p
                  className="text-[10px] text-amber-300/90 truncate"
                  title={`Picked automatically from a keyword search: ${item.rawPartNumber}`}
                >
                  Keyword: <span className="font-mono">{item.rawPartNumber}</span>
                </p>
              )}

              {part?.Manufacturer && (
                <p className="text-[10px] text-slate-400 truncate">
                  Mfr: <span className="text-slate-200">{part.Manufacturer}</span>
                </p>
              )}
            </div>
          );
        },
      }),

      // 4. Description & Lifecycle Status
      columnHelper.accessor('notes', {
        header: 'Description & Lifecycle',
        cell: (info) => {
          const item = info.row.original;
          const part = item.matchedPart;
          const desc = part?.Description || info.getValue() || '—';
          const lifecycle = part ? part.LifecycleStatus || 'Active' : null;

          return (
            <div className="space-y-1 max-w-[260px]">
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" title={desc}>
                {desc}
              </p>
              <div className="flex items-center gap-2 text-[10px]">
                {lifecycle && (
                <span
                  className={`px-1.5 py-0.5 rounded font-medium ${
                    lifecycle === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {lifecycle}
                </span>
                )}

                {part?.DataSheetUrl && (
                  <a
                    href={part.DataSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    <FileText className="w-3 h-3" /> Datasheet
                  </a>
                )}
              </div>
            </div>
          );
        },
      }),

      // 5. Requested Qty (Inline Editable)
      columnHelper.accessor('requestedQty', {
        header: 'Req Qty',
        cell: (info) => {
          const item = info.row.original;
          const currentQty = info.getValue();

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={currentQty}
                  onChange={(e) => updateItemQty(item.id, parseInt(e.target.value, 10) || 1)}
                  aria-label={`Quantity for ${item.designator || item.rawPartNumber}`}
                  className="no-spin tabular w-18 h-8 bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-md px-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-center font-semibold transition"
                />
              </div>

              {/* MOQ Warnings */}
              {item.matchedPart && (!item.meetsMoq || !item.meetsMultiple) && (
                <div className="text-[10px] text-amber-400 font-medium">
                  {!item.meetsMoq ? `Min: ${item.moq}` : `Mult: ${item.orderMultiple}`}
                </div>
              )}
            </div>
          );
        },
      }),

      // 6. Factory Stock / Available Quantity
      columnHelper.accessor('availableStock', {
        header: `${label} Stock`,
        cell: (info) => {
          const item = info.row.original;
          const stock = info.getValue();
          const inStock = stock >= item.requestedQty;

          if (!item.matchedPart) {
            const isIdentifierError = /identifier/i.test(item.errorMessage || '');
            const isKeyMissing = /api key|unauthorized/i.test(item.errorMessage || '');
            return (
              <div className="space-y-0.5">
                <span
                  className={`font-mono text-xs font-semibold ${
                    item.status === 'error' ? 'text-rose-400' : 'text-slate-500'
                  }`}
                >
                  {item.status === 'error'
                    ? isIdentifierError
                      ? 'Key Rejected'
                      : isKeyMissing
                      ? 'Key Missing'
                      : 'Error'
                    : '—'}
                </span>
                <p
                  className="text-[10px] text-slate-400 truncate max-w-[130px]"
                  title={item.errorMessage || 'Part not resolved'}
                >
                  {item.status === 'error'
                    ? isIdentifierError
                      ? 'Invalid identifier'
                      : 'Check Settings'
                    : 'Not matched'}
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-0.5">
              <span
                className={`font-mono text-xs font-semibold ${
                  stock === 0
                    ? 'text-rose-400'
                    : inStock
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {formatNumber(stock)}
              </span>
              <p className="text-[10px] text-slate-500">
                {stock === 0 ? 'Out of Stock' : inStock ? 'Immediate' : `Short by ${item.requestedQty - stock}`}
              </p>
            </div>
          );
        },
      }),

      // 7. Unit Price (Tiered)
      columnHelper.accessor('unitPrice', {
        header: 'Unit Price',
        cell: (info) => {
          const item = info.row.original;
          const unitPrice = info.getValue();
          const breaks = item.matchedPart?.PriceBreaks || [];
          const activeTier = breaks.length > 0 ? calculateTierPrice(breaks, item.requestedQty) : null;

          return (
            <div className="relative group cursor-help space-y-0.5">
              <span className={`font-mono text-xs font-bold ${unitPrice > 0 ? 'text-white' : 'text-slate-600'}`}>
                {unitPrice > 0 ? formatCurrency(unitPrice, item.currency) : '—'}
              </span>
              {breaks.length > 1 && (
                <p className="text-[10px] text-blue-400 underline decoration-dotted">
                  {breaks.length} price tiers
                </p>
              )}

              {/* Hover Tooltip showing price tiers */}
              {breaks.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-40 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl text-[11px] min-w-[200px] font-mono pointer-events-none">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <span className="text-slate-400 text-[10px] font-sans font-semibold uppercase tracking-wider">
                      Volume Price Breaks
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      Req: {item.requestedQty}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {breaks.map((b, idx) => {
                      const tierQty = parseInt(String(b.Quantity).replace(/[^0-9]/g, ''), 10) || 1;
                      const isActive = activeTier?.matchedTierQty === tierQty;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between px-1.5 py-0.5 rounded transition ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                              : 'text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{b.Quantity}+</span>
                            {isActive && (
                              <span className="text-[9px] px-1 rounded bg-emerald-500/30 text-emerald-300 font-sans font-semibold uppercase">
                                Active
                              </span>
                            )}
                          </div>
                          <span>{b.Price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        },
      }),

      // 8. Extended Total Price
      columnHelper.accessor('extendedPrice', {
        header: 'Ext Total',
        cell: (info) => {
          const item = info.row.original;
          const ext = info.getValue();

          return (
            <div className={`font-mono text-xs font-bold ${ext > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>
              {ext > 0 ? formatCurrency(ext, item.currency) : '—'}
            </div>
          );
        },
      }),

      // 9. Actions
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const item = info.row.original;

          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  setResolvingItemId(item.id);
                  try {
                    await resolveSingleItem(item.id, effectiveSearchKey);
                  } finally {
                    setResolvingItemId(null);
                  }
                }}
                disabled={isResolving || resolvingItemId === item.id}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-50 transition"
                title={`Query live ${label} stock for this part`}
                aria-label={`Query live ${label} stock for this part`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    resolvingItemId === item.id ? 'animate-spin text-cyan-400' : ''
                  }`}
                />
              </button>
              <button
                onClick={() => setSelectedForReplace(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                title="Search alternate / replacement part"
                aria-label="Search alternate / replacement part"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Delete line item"
                aria-label="Delete line item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      }),
    ],
    [updateItemQty, deleteItem, setSelectedForReplace, resolveSingleItem, effectiveSearchKey, resolvingItemId, isResolving, label, supplier, handleToggleSmd]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (items.length === 0) return null;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 overflow-hidden mb-12">
      {/* Alert banner when API key is rejected */}
      {items.some((i) => /identifier|rejected|authoriz|client id|secret/i.test(i.errorMessage || '')) && !isResolving && (
        <div className="bg-gradient-to-r from-rose-950/90 via-red-950/70 to-slate-900 border-b border-rose-500/40 p-3.5 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              {supplier === 'digikey' ? (
                <>
                  <p className="text-xs font-semibold text-white">DigiKey API Credentials Rejected or Missing</p>
                  <p className="text-[11px] text-slate-300">
                    Please check the <strong>Client ID</strong> and <strong>Client Secret</strong> of your DigiKey API app in Settings.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-white">
                    Mouser API Key Rejected: &quot;Invalid unique identifier&quot;
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Mouser rejected the configured key. Please ensure your <strong>Mouser Search API Key</strong> (not Cart/Order key) is entered in Settings.
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => useSettingsStore.getState().setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950 shrink-0 transition"
          >
            <Key className="w-3.5 h-3.5 text-white" />
            <span>Open Settings</span>
          </button>
        </div>
      )}

      {/* Banner when parts need resolution */}
      {hasUnresolved && !isResolving && (
        <div className="bg-blue-500/[0.07] border-b border-blue-500/20 p-3.5 px-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-cyan-400">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {items.filter((i) => !i.matchedPart || ['unresolved', 'pending', 'error'].includes(i.status)).length} of{' '}
                {items.length} lines not looked up on {label} yet
              </p>
              <p className="text-[11px] text-slate-300">
                Fetch live stock, volume pricing and lead times for every line.
              </p>
            </div>
          </div>
          <button
            onClick={() => resolveAllItems(effectiveSearchKey)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-950 shrink-0 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span>Look up on {label}</span>
          </button>
        </div>
      )}

      {/* Table Action Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter by part, designator or maker"
              aria-label="Filter lines"
              className="w-full h-8 bg-slate-950/60 border border-slate-700/80 rounded-lg px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pl-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status filter pill buttons */}
          <div role="group" aria-label="Filter by status" className="flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`h-7 px-2.5 rounded-md font-medium transition ${
                statusFilter === 'all' ? 'bg-slate-800 text-white ring-1 ring-white/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('matched')}
              className={`h-7 px-2.5 rounded-md font-medium transition ${
                statusFilter === 'matched' ? 'bg-slate-800 text-white ring-1 ring-white/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matched
            </button>
            <button
              onClick={() => setStatusFilter('attention')}
              className={`h-7 px-2.5 rounded-md font-medium transition ${
                statusFilter === 'attention' ? 'bg-slate-800 text-white ring-1 ring-white/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Review
            </button>
          </div>
        </div>

        {/* Global BOM Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh / Resolve Button (the banner above carries it while lines are unresolved) */}
          {(!hasUnresolved || isResolving) && (
          <button
            onClick={() => resolveAllItems(effectiveSearchKey)}
            disabled={isResolving}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium shadow-sm transition ${
              hasUnresolved
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            } disabled:opacity-50`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isResolving ? 'animate-spin' : hasUnresolved ? 'text-white' : 'text-blue-400'
              }`}
            />
            <span>
              {isResolving
                ? 'Resolving…'
                : hasUnresolved
                ? 'Resolve live inventory'
                : 'Re-check inventory'}
            </span>
          </button>
          )}

          {/* Enriched Export Dropdown */}
          <ExportDropdown />

          {/* Primary Cart Checkout Button */}
          <button
            onClick={handleExportToCart}
            disabled={isPushingCart || isResolving}
            className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-emerald-950 transition"
          >
            {isPushingCart ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : supplier === 'digikey' ? (
              <Copy className="w-3.5 h-3.5" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            <span>{supplier === 'digikey' ? 'Copy DigiKey Cart List' : 'Export to Mouser Cart'}</span>
          </button>

          {/* Delete selected lines */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950 transition"
              title="Delete the selected lines"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete selected ({selectedIds.length})</span>
            </button>
          )}

          {/* Clear BOM Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all BOM items? This will reset your current working list.')) {
                clearBom();
              }
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 text-xs font-medium transition"
            title="Clear all line items from the list"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear List</span>
          </button>
        </div>
      </div>

      {/* Progress banner during batch resolution */}
      {isResolving && resolveProgress && (
        <div className="bg-blue-950/50 border-b border-blue-900/60 p-3 px-6 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>
              Querying {label} catalog: <strong>{resolveProgress.currentPart}</strong> ({resolveProgress.current} of{' '}
              {resolveProgress.total})
            </span>
          </div>
          <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(resolveProgress.current / resolveProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Cart Error Notification */}
      {cartError && (
        <div className="bg-rose-950/60 border-b border-rose-800 p-3 px-6 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Cart Creation Error: {cartError}</span>
          </div>
          <button onClick={() => setCartError(null)} className="text-rose-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DigiKey cart list notice */}
      {cartNotice && (
        <div className="bg-emerald-950/50 border-b border-emerald-800 p-3 px-6 text-xs text-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{cartNotice}</span>
          </div>
          <button onClick={() => setCartNotice(null)} className="text-emerald-400 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive TanStack Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-800 bg-slate-950/50 text-slate-500 uppercase tracking-wider text-[10px]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`py-2.5 font-semibold whitespace-nowrap ${
                      header.column.id === 'select' ? 'pl-4 pr-1 w-8' : 'px-3'
                    }`}
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-1 hover:text-white'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-blue-400" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-blue-400" />
                        ) : header.column.getCanSort() ? (
                          <ArrowUpDown className="w-3 h-3 text-slate-700" />
                        ) : null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 tabular">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`transition ${row.getIsSelected() ? 'bg-blue-500/[0.08]' : 'hover:bg-slate-800/40'}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`py-3 align-top ${cell.column.id === 'select' ? 'pl-4 pr-1 w-8' : 'px-3'}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-xs text-slate-500">
                  No lines match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
