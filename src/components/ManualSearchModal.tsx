'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  Plus,
  Loader2,
  ExternalLink,
  Package,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { MouserPart } from '@/lib/mouser/types';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { parseStockQuantity, calculateTierPrice } from '@/lib/mouser/client';
import { formatCurrency } from '@/lib/utils';
import { apiPath } from '@/lib/api-path';

export function ManualSearchModal() {
  const { isManualSearchOpen, setIsManualSearchOpen, addItem, items } = useBomStore();
  const { searchApiKey, setIsSettingsOpen } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'partnumber'>('keyword');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MouserPart[]>([]);
  const [searched, setSearched] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [designators, setDesignators] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual entry fields
  const [manualPartNumber, setManualPartNumber] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualDesignator, setManualDesignator] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  if (!isManualSearchOpen) return null;

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPartNumber.trim()) return;

    addItem({
      rawPartNumber: manualPartNumber.trim(),
      requestedQty: Math.max(1, manualQty || 1),
      designator: manualDesignator.trim() || `Line ${items.length + 1}`,
      notes: manualNotes.trim() || undefined,
      isCustomPart: true,
    });

    setManualPartNumber('');
    setManualQty(1);
    setManualDesignator('');
    setManualNotes('');
    setIsManualSearchOpen(false);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    let effectiveKey = searchApiKey?.trim();
    if (!effectiveKey && typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('mouser_bom_settings_v1') || '{}');
        effectiveKey = stored.searchApiKey?.trim();
      } catch {}
    }

    if (!effectiveKey) {
      setErrorMsg('Mouser Search API Key is not configured. Please open Settings to enter your key.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const endpoint = apiPath(
        searchMode === 'partnumber'
          ? '/api/mouser/search/partnumber'
          : '/api/mouser/search/keyword'
      );

      const payload =
        searchMode === 'partnumber'
          ? { partNumber: query.trim() }
          : { keyword: query.trim(), records: 20 };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-mouser-search-key': effectiveKey,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to search`);
      }

      const data = await res.json();
      if (data.error && (!data.parts || data.parts.length === 0)) {
        setErrorMsg(data.error);
        setResults([]);
      } else {
        setResults(data.parts || []);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = (part: MouserPart) => {
    const qty = quantities[part.MouserPartNumber] || parseInt(part.Min || '1', 10) || 1;
    const des = designators[part.MouserPartNumber] || '';

    addItem({
      rawPartNumber: part.ManufacturerPartNumber,
      requestedQty: qty,
      designator: des,
      notes: part.Description,
      matchedPart: part,
      isCustomPart: true,
    });

    // Reset designator for this part
    setDesignators({ ...designators, [part.MouserPartNumber]: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              {activeTab === 'search' ? <Search className="w-5 h-5" /> : <Plus className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {activeTab === 'search' ? 'Search Mouser Electronic Components' : 'Add Line Item to BOM'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'search'
                  ? 'Search live Mouser inventory by MPN, Mouser #, or keyword'
                  : 'Manually add an individual component line directly into your BOM'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  activeTab === 'search'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mouser Search
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  activeTab === 'manual'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Manual Entry
              </button>
            </div>

            <button
              onClick={() => setIsManualSearchOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'manual' ? (
          <form onSubmit={handleManualAdd} className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Part Number (MPN or Mouser #) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualPartNumber}
                  onChange={(e) => setManualPartNumber(e.target.value)}
                  placeholder="e.g. 647-UVZ2D221MHD, STM32F401RET6, 10k 0805..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Quantity Required <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={manualQty}
                  onChange={(e) => setManualQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Designator / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={manualDesignator}
                  onChange={(e) => setManualDesignator(e.target.value)}
                  placeholder="e.g. C1, R12, U3..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. 220uF 200V Aluminum Electrolytic Capacitor..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsManualSearchOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!manualPartNumber.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Line to BOM</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Search Bar & Options */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/30 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. STM32F401, ESP32-WROOM-32E, 10k resistor, LM358..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10 font-mono"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="text-slate-500">Search mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="searchMode"
                checked={searchMode === 'keyword'}
                onChange={() => setSearchMode('keyword')}
                className="text-blue-600 focus:ring-0"
              />
              <span>Keyword & Category</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="searchMode"
                checked={searchMode === 'partnumber'}
                onChange={() => setSearchMode('partnumber')}
                className="text-blue-600 focus:ring-0"
              />
              <span>Exact Part # (MPN)</span>
            </label>
          </div>
        </div>

        {/* Results Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
              {/key|setting/i.test(errorMsg) && (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shrink-0 shadow-sm transition"
                >
                  Open Settings
                </button>
              )}
            </div>
          )}

          {results.length === 0 && searched && !loading && (
            <div className="text-center py-8 text-slate-500 text-xs space-y-3">
              <p>No component matches found for &quot;{query}&quot;. Try broadening your keywords or entering the exact MPN.</p>
              <button
                type="button"
                onClick={() => {
                  addItem({
                    rawPartNumber: query.trim(),
                    requestedQty: 1,
                    designator: `Line ${items.length + 1}`,
                    notes: 'Manual entry',
                    isCustomPart: true,
                  });
                  setIsManualSearchOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add &quot;{query}&quot; to BOM anyway</span>
              </button>
            </div>
          )}

          {errorMsg && query.trim() && !loading && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300">Add &quot;{query}&quot; as unverified line item?</span>
              <button
                type="button"
                onClick={() => {
                  addItem({
                    rawPartNumber: query.trim(),
                    requestedQty: 1,
                    designator: `Line ${items.length + 1}`,
                    notes: 'Manual entry',
                    isCustomPart: true,
                  });
                  setIsManualSearchOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add &quot;{query}&quot; to BOM</span>
              </button>
            </div>
          )}

          {!searched && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              Type a part number or description above to search live Mouser inventory, or switch to the &quot;Manual Entry&quot; tab.
            </div>
          )}

          {results.map((part) => {
            const stockNum = parseStockQuantity(part.Availability, part.AvailabilityInStock, part.FactoryStock);
            const inStock = stockNum > 0;
            const currentQty =
              quantities[part.MouserPartNumber] || parseInt(part.Min || '1', 10) || 1;
            const currentDes = designators[part.MouserPartNumber] || '';

            return (
              <div
                key={part.MouserPartNumber}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {part.ManufacturerPartNumber}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        by {part.Manufacturer}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          inStock
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {part.Availability}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{part.Description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="font-mono text-slate-500">Mouser #: {part.MouserPartNumber}</span>
                      <span>•</span>
                      <span>MOQ: <strong className="text-slate-200">{part.Min || '1'}</strong></span>
                      <span>•</span>
                      <span>Mult: <strong className="text-slate-200">{part.Mult || '1'}</strong></span>
                      {part.DataSheetUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={part.DataSheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> Datasheet
                          </a>
                        </>
                      )}
                      {part.ProductDetailUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={part.ProductDetailUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            Mouser Page <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add to BOM controls */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <div className="space-y-0.5">
                      <label className="text-[10px] text-slate-400 block">Ref / Desig</label>
                      <input
                        type="text"
                        placeholder="e.g. U1"
                        value={currentDes}
                        onChange={(e) =>
                          setDesignators({
                            ...designators,
                            [part.MouserPartNumber]: e.target.value,
                          })
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] text-slate-400 block">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={currentQty}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [part.MouserPartNumber]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <button
                      onClick={() => handleAddPart(part)}
                      className="self-end inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to BOM</span>
                    </button>
                  </div>
                </div>

                {/* Price Breaks Strip */}
                {part.PriceBreaks && part.PriceBreaks.length > 0 && (() => {
                  const activeTier = calculateTierPrice(part.PriceBreaks, currentQty);
                  const extPrice = activeTier.unitPrice * currentQty;

                  return (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          Volume Price Breaks
                        </span>
                        <span className="text-slate-300 font-medium">
                          Price for <strong className="text-white">{currentQty} pcs</strong>:{" "}
                          <strong className="text-emerald-400 font-mono">
                            {formatCurrency(activeTier.unitPrice, activeTier.currency)} / ea
                          </strong>{" "}
                          (Total:{" "}
                          <strong className="text-emerald-300 font-mono">
                            {formatCurrency(extPrice, activeTier.currency)}
                          </strong>)
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {part.PriceBreaks.map((tier, idx) => {
                          const tierQty =
                            parseInt(String(tier.Quantity).replace(/[^0-9]/g, ""), 10) || 1;
                          const isActive = activeTier.matchedTierQty === tierQty;

                          return (
                            <div
                              key={idx}
                              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1.5 font-mono border transition ${
                                isActive
                                  ? "bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40"
                                  : "bg-slate-900 border-slate-800 text-slate-400"
                              }`}
                            >
                              <span>{tier.Quantity}+</span>
                              <span className={isActive ? "text-emerald-300" : "text-emerald-400"}>
                                {tier.Price}
                              </span>
                              {isActive && (
                                <span className="text-[9px] px-1 rounded bg-emerald-500/30 text-emerald-300 font-sans font-semibold uppercase">
                                  Active
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
