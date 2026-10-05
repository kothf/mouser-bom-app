'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  RefreshCw,
  Loader2,
  ExternalLink,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { MouserPart } from '@/lib/mouser/types';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { parseStockQuantity } from '@/lib/mouser/client';

export function ReplacePartModal() {
  const {
    isReplaceModalOpen,
    setIsReplaceModalOpen,
    selectedItemForReplace,
    replaceItemPart,
  } = useBomStore();
  const { searchApiKey } = useSettingsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MouserPart[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedItemForReplace) {
      setSearchQuery(selectedItemForReplace.rawPartNumber);
      // Auto-trigger initial search for the current part
      handleSearch(selectedItemForReplace.rawPartNumber);
    }
  }, [selectedItemForReplace]);

  if (!isReplaceModalOpen || !selectedItemForReplace) return null;

  const handleSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (searchApiKey) {
        headers['x-mouser-search-key'] = searchApiKey;
      }

      const res = await fetch('/api/mouser/search/keyword', {
        method: 'POST',
        headers,
        body: JSON.stringify({ keyword: q, records: 15 }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to search`);
      }

      const data = await res.json();
      setResults(data.parts || []);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to search replacement parts');
    } finally {
      setLoading(false);
    }
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
                placeholder="Search alternate MPN, Mouser Part #, or specs..."
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
        </div>

        {/* Results List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {results.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-500 text-xs">
              No matching alternate parts found for &quot;{searchQuery}&quot;.
            </div>
          )}

          {results.map((part) => {
            const stockNum = parseStockQuantity(part.Availability);
            const inStock = stockNum > 0;
            const isCurrent =
              part.ManufacturerPartNumber.toUpperCase() ===
              selectedItemForReplace.rawPartNumber.toUpperCase();

            return (
              <div
                key={part.MouserPartNumber}
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
                    <span className="font-mono text-slate-500">Mouser #: {part.MouserPartNumber}</span>
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
