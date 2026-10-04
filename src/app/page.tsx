'use client';

import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  Search,
  ShoppingCart,
  ShieldCheck,
  Zap,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiKeyBanner } from '@/components/ApiKeyBanner';
import { SummaryCards } from '@/components/SummaryCards';
import { FileUploadZone } from '@/components/FileUploadZone';
import { ColumnMappingModal } from '@/components/ColumnMappingModal';
import { BomGrid } from '@/components/BomGrid';
import { ManualSearchModal } from '@/components/ManualSearchModal';
import { ReplacePartModal } from '@/components/ReplacePartModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CartSuccessModal } from '@/components/CartSuccessModal';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { ParsedRawFile } from '@/lib/mouser/types';

export default function Home() {
  const { items, setIsManualSearchOpen } = useBomStore();
  const { loadFromStorage } = useSettingsStore();

  const [parsedFileForMapping, setParsedFileForMapping] = useState<ParsedRawFile | null>(null);
  const [showUploadAccordion, setShowUploadAccordion] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleParsedFile = (parsed: ParsedRawFile) => {
    setParsedFileForMapping(parsed);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Key / Demo Notice Banner */}
        <ApiKeyBanner />

        {/* When items exist in the BOM */}
        {items.length > 0 ? (
          <div className="space-y-6">
            {/* Top Metric Strip */}
            <SummaryCards />

            {/* Ingestion & Tools Accordion Bar */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3 px-4 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUploadAccordion(!showUploadAccordion)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>{showUploadAccordion ? 'Hide File Ingestion' : 'Upload Another BOM / Append'}</span>
                  {showUploadAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => setIsManualSearchOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 hidden sm:block">
                Showing <strong className="text-white">{items.length}</strong> components
              </div>
            </div>

            {/* Collapsible Upload Zone */}
            {showUploadAccordion && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <FileUploadZone onParsedFile={handleParsedFile} />
              </div>
            )}

            {/* TanStack Table Data Grid */}
            <BomGrid />
          </div>
        ) : (
          /* Empty State: Initial Ingestion Flow */
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Bill of Materials (BOM) &amp; Mouser Cart Studio
              </h1>
              <p className="text-sm text-slate-400">
                Ingest component spreadsheets, query Mouser Electronics in real-time for live stock and volume price tiers, and export directly to a Mouser Shopping Cart.
              </p>
            </div>

            {/* Primary Dropzone */}
            <FileUploadZone onParsedFile={handleParsedFile} />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Live Mouser Search API</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatically queries Mouser REST API by Manufacturer Part Number (MPN) or Mouser Part # with rate-limit throttling and exponential backoff.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Dynamic Volume Price Breaks</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inline quantity changes instantly recalculate unit prices across manufacturer price tiers, checking Minimum Order Quantities (MOQ) and reel packaging multiples.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">1-Click Mouser Cart Push</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Transfers matched components directly into Mouser Cart API, generating a Cart Key and a direct checkout URL on Mouser.com.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Mouser BOM Studio • Full-Stack Web Application</p>
          <div className="zx-spectrum-badge whitespace-nowrap flex-nowrap shrink-0">
            <span className="zx-rainbow-stripe" aria-hidden="true" />
            <span className="zx-spectrum-text whitespace-nowrap">Designed by Andrey Dumchin - 4X5VA</span>
            <span className="zx-rainbow-stripe" aria-hidden="true" />
          </div>
          <p className="font-mono text-[11px]">Next.js • TypeScript • Tailwind CSS • TanStack Table</p>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <ColumnMappingModal
        parsedFile={parsedFileForMapping}
        onClose={() => setParsedFileForMapping(null)}
      />

      <ManualSearchModal />
      <ReplacePartModal />
      <SettingsModal />
      <CartSuccessModal />
    </div>
  );
}
