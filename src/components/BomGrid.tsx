'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
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
  Sparkles,
} from 'lucide-react';
import { BOMItem } from '@/lib/mouser/types';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { calculateTierPrice } from '@/lib/mouser/client';
import { apiPath } from '@/lib/api-path';
import { ExportDropdown } from './ExportDropdown';

const columnHelper = createColumnHelper<BOMItem>();

export function BomGrid() {
  const {
    items,
    isResolving,
    resolveProgress,
    updateItemQty,
    deleteItem,
    clearBom,
    resolveAllItems,
    setSelectedForReplace,
    setActiveCart,
    setIsCartModalOpen,
  } = useBomStore();

  const { searchApiKey, cartApiKey } = useSettingsStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPushingCart, setIsPushingCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

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

  // Handle Export to Mouser Cart API
  const handleExportToCart = async () => {
    if (items.length === 0) return;

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

  // Define Table Columns
  const columns = useMemo(
    () => [
      // 1. Status Indicator
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const item = info.row.original;

          switch (status) {
            case 'matched':
              return (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Matched</span>
                </div>
              );
            case 'low_stock':
              return (
                <div className="flex items-center gap-1.5 text-amber-400" title={`Only ${item.availableStock} in stock!`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock</span>
                </div>
              );
            case 'moq_warning':
              return (
                <div className="flex items-center gap-1.5 text-orange-400" title={`MOQ is ${item.moq}, Mult is ${item.orderMultiple}`}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">MOQ Alert</span>
                </div>
              );
            case 'unresolved':
              return (
                <div className="flex items-center gap-1.5 text-rose-400" title={item.errorMessage || 'Not found'}>
                  <XCircle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Not Found</span>
                </div>
              );
            case 'error':
              return (
                <div className="flex items-center gap-1.5 text-rose-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Error</span>
                </div>
              );
            default:
              return (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Pending</span>
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
                    title="Open on Mouser.com"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {part?.MouserPartNumber && (
                <p className="font-mono text-[11px] text-slate-400 truncate">
                  Mouser: <span className="text-slate-300">{part.MouserPartNumber}</span>
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
          const lifecycle = part?.LifecycleStatus || 'Active';

          return (
            <div className="space-y-1 max-w-[260px]">
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" title={desc}>
                {desc}
              </p>
              <div className="flex items-center gap-2 text-[10px]">
                <span
                  className={`px-1.5 py-0.5 rounded font-medium ${
                    lifecycle === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {lifecycle}
                </span>

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
                  className="w-18 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono text-center font-bold"
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
        header: 'Mouser Stock',
        cell: (info) => {
          const item = info.row.original;
          const stock = info.getValue();
          const inStock = stock >= item.requestedQty;

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
                {stock === 0 ? 'Backorder' : inStock ? 'Immediate' : `Short by ${item.requestedQty - stock}`}
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
              <span className="font-mono text-xs font-bold text-white">
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
            <div className="font-mono text-xs font-bold text-emerald-300">
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
                onClick={() => setSelectedForReplace(item)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                title="Search alternate / replacement part"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Delete line item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      }),
    ],
    [updateItemQty, deleteItem, setSelectedForReplace]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (items.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-12">
      {/* Table Action Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter part #, designator, or manufacturer..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pl-8 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Status filter pill buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('matched')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                statusFilter === 'matched' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matched
            </button>
            <button
              onClick={() => setStatusFilter('attention')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                statusFilter === 'attention' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Review
            </button>
          </div>
        </div>

        {/* Global BOM Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
          {/* Refresh / Resolve Button */}
          <button
            onClick={() => resolveAllItems(searchApiKey)}
            disabled={isResolving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isResolving ? 'animate-spin' : ''}`} />
            <span>{isResolving ? 'Resolving...' : 'Re-check Inventory'}</span>
          </button>

          {/* Enriched Export Dropdown */}
          <ExportDropdown />

          {/* Primary Cart Checkout Button */}
          <button
            onClick={handleExportToCart}
            disabled={isPushingCart || isResolving}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition"
          >
            {isPushingCart ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            <span>Export to Mouser Cart</span>
          </button>

          {/* Clear BOM Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all BOM items? This will reset your current working list.')) {
                clearBom();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold shadow-sm transition"
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
              Querying Mouser catalog: <strong>{resolveProgress.currentPart}</strong> ({resolveProgress.current} of{' '}
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

      {/* Interactive TanStack Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px]">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="py-3 px-4 font-semibold">
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
                        {header.column.getCanSort() && <ArrowUpDown className="w-3 h-3 text-slate-600" />}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/40 transition">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-3 px-4 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
