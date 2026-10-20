'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  RefreshCw,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { BOMItem, MouserPart } from '@/lib/mouser/types';
import { useBomStore } from '@/store/bom-store';
import { getSupplierSearchHeaders, useSettingsStore } from '@/store/settings-store';
import { parseStockQuantity } from '@/lib/mouser/client';
import { Supplier, SUPPLIER_LABELS, supplierApiPath } from '@/lib/supplier';
import { mountingKeyword, partMounting } from '@/lib/mounting/mounting';
import { alternateValueQueries } from '@/lib/value/notation';

async function searchKeyword(
  supplier: Supplier,
  keyword: string,
  headers: Record<string, string>
): Promise<{ parts: MouserPart[]; error?: string }> {
  try {
    const res = await fetch(supplierApiPath(supplier, 'search/keyword'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ keyword, records: 30 }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to search`);
    }

    const data = await res.json();
    if (data.error && (!data.parts || data.parts.length === 0)) {
      return { parts: [], error: data.error };
    }
    return { parts: data.parts || [] };
  } catch (err: unknown) {
    return { parts: [], error: (err as Error).message || 'Failed to search replacement parts' };
  }
}

/**
 * Search replacements with the line's mounting (an unticked SMD box means
 * through-hole parts only) and every other notation of the value
 * (470nF = 0.47uF = 470000pF, 4.7k = 4K7 = 4700 Ohm). In-stock parts first.
 */
async function searchAlternates(
  supplier: Supplier,
  query: string,
  item: BOMItem
): Promise<{ parts: MouserPart[]; error?: string }> {
  const { headers, hasCredentials } = getSupplierSearchHeaders(supplier);

  // DigiKey may use credentials from the server environment, so only Mouser is checked here.
  if (supplier === 'mouser' && !hasCredentials) {
    return { parts: [], error: 'Mouser Search API Key is not configured. Please open Settings to enter your key.' };
  }

  const wantSmd = Boolean(item.smd);
  const hint = mountingKeyword(supplier, wantSmd);
  const queries = [query, ...alternateValueQueries(query, item.category).map((a) => a.query)];
  const results = await Promise.all(
    queries.map(async (q) => {
      const hinted = hint ? await searchKeyword(supplier, `${q} ${hint}`, headers) : null;
      // The mounting word can hide parts the supplier describes differently,
      // so fall back to the plain query; the filter below keeps mounting right.
      return hinted && hinted.parts.length > 0 ? hinted : searchKeyword(supplier, q, headers);
    })
  );

  const seen = new Set<string>();
  const parts = results
    .flatMap((r) => r.parts)
    .filter((p) => partMounting(p) !== (wantSmd ? 'tht' : 'smd'))
    .filter((p) => {
      const key = `${p.MouserPartNumber}|${p.ManufacturerPartNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const stockOf = (p: MouserPart) => parseStockQuantity(p.Availability, p.AvailabilityInStock, p.FactoryStock);
  parts.sort((a, b) => Number(stockOf(b) > 0) - Number(stockOf(a) > 0));

  const error = parts.length === 0 ? results.find((r) => r.error)?.error : undefined;
  return { parts, error };
}

export function ReplacePartModal() {
  const { isReplaceModalOpen, selectedItemForReplace } = useBomStore();

  if (!isReplaceModalOpen || !selectedItemForReplace) return null;

  // Keyed by item so the dialog starts fresh (and searches) for every row.
  return <ReplacePartDialog key={selectedItemForReplace.id} item={selectedItemForReplace} />;
}

function ReplacePartDialog({ item: selectedItemForReplace }: { item: BOMItem }) {
  const { supplier, setIsReplaceModalOpen, replaceItemPart } = useBomStore();
  const { setIsSettingsOpen } = useSettingsStore();
  const label = SUPPLIER_LABELS[supplier];

  const [searchQuery, setSearchQuery] = useState(selectedItemForReplace.rawPartNumber);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<MouserPart[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-trigger initial search for the current part
  useEffect(() => {
    let cancelled = false;
    searchAlternates(supplier, selectedItemForReplace.rawPartNumber, selectedItemForReplace).then((result) => {
      if (cancelled) return;
      setResults(result.parts);
      setErrorMsg(result.error || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supplier, selectedItemForReplace]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);
    const result = await searchAlternates(supplier, q, selectedItemForReplace);
    setResults(result.parts);
    setErrorMsg(result.error || null);
    setLoading(false);
  };

  const handleSelectReplacement = (part: MouserPart) => {
    replaceItemPart(selectedItemForReplace.id, part);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Find Alternate / Replacement Part</h2>
              <p className="text-xs text-slate-400">
                Replacing Line {selectedItemForReplace.lineNumber} ({selectedItemForReplace.designator}):{' '}
                <strong className="text-slate-200 font-mono">{selectedItemForReplace.rawPartNumber}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReplaceModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search controls */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/30 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search alternate MPN, ${label} Part #, or specs...`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 pr-10 font-mono"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
            >
              <Search className="w-4 h-4" />
              <span>Search Alternates</span>
            </button>
          </form>
          <p className="text-[11px] text-slate-500">
            {selectedItemForReplace.smd
              ? 'SMD is ticked for this line, so only surface-mount parts are shown.'
              : 'SMD is not ticked for this line, so SMD parts are hidden.'}{' '}
            Other ways of writing the value (e.g. 470nF = 0.47uF, 4.7k = 4K7) are searched too.
          </p>
        </div>

        {/* Results List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
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
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shrink-0 shadow-sm transition"
                >
                  Open Settings
                </button>
              )}
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No matching alternate parts found for &quot;{searchQuery}&quot;.
            </div>
          )}

          {results.map((part, idx) => {
            const stockNum = parseStockQuantity(part.Availability, part.AvailabilityInStock, part.FactoryStock);
            const inStock = stockNum > 0;
            const isCurrent =
              part.ManufacturerPartNumber.toUpperCase() ===
              selectedItemForReplace.rawPartNumber.toUpperCase();

            return (
              <div
                key={`${part.MouserPartNumber}-${part.ManufacturerPartNumber}-${idx}`}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {part.ManufacturerPartNumber}
                    </span>
                    <span className="text-xs text-slate-400">by {part.Manufacturer}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        inStock
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {part.Availability}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Current Match
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{part.Description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="font-mono text-slate-500">{label} #: {part.MouserPartNumber}</span>
                    <span>•</span>
                    <span>MOQ: <strong className="text-slate-200">{part.Min || '1'}</strong></span>
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
                  </div>
                </div>

                <button
                  onClick={() => handleSelectReplacement(part)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Select Replacement</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
