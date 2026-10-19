'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud, ShoppingCart, Zap, TrendingDown, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
import { SupplierSwitcher } from '@/components/SupplierSwitcher';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { useSupplierStore } from '@/store/supplier-store';
import { SUPPLIER_LABELS } from '@/lib/supplier';
import { ParsedRawFile } from '@/lib/mouser/types';

export default function Home() {
  const { supplier, items, setIsManualSearchOpen, loadSavedBom, isLoaded } = useBomStore();
  const { loadFromStorage } = useSettingsStore();
  const { loadActiveSupplier } = useSupplierStore();
  const label = SUPPLIER_LABELS[supplier];

  const [parsedFileForMapping, setParsedFileForMapping] = useState<ParsedRawFile | null>(null);
  const [showUploadAccordion, setShowUploadAccordion] = useState(false);

  useEffect(() => {
    loadFromStorage();
    loadActiveSupplier();
  }, [loadFromStorage, loadActiveSupplier]);

  // Each supplier's BOM is loaded the first time it is shown.
  useEffect(() => {
    if (!isLoaded) loadSavedBom();
  }, [isLoaded, loadSavedBom]);

  const handleParsedFile = (parsed: ParsedRawFile) => {
    setParsedFileForMapping(parsed);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* API Key Notice Banner */}
        <ApiKeyBanner />

        {/* Mouser / DigiKey BOM selector, with the list actions beside it once a BOM exists */}
        <SupplierSwitcher
          actions={
            items.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowUploadAccordion(!showUploadAccordion)}
                  aria-expanded={showUploadAccordion}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition ${
                    showUploadAccordion
                      ? 'bg-slate-800 text-white border-slate-600'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                  <span>Import more</span>
                  {showUploadAccordion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsManualSearchOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700/80 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add line</span>
                </button>
              </>
            )
          }
        />

        {/* When items exist in the BOM */}
        {items.length > 0 ? (
          <div>
            {/* Top Metric Strip */}
            <SummaryCards />

            {/* Collapsible Upload Zone */}
            {showUploadAccordion && (
              <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
                <FileUploadZone onParsedFile={handleParsedFile} />
              </div>
            )}

            {/* TanStack Table Data Grid */}
            <BomGrid key={supplier} />
          </div>
        ) : (
          /* Empty State: Initial Ingestion Flow */
          <div className="space-y-8 sm:space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-2 sm:pt-6">
              <h1 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight text-balance">
                Turn a parts list into a {label} cart
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed text-pretty">
                Import a spreadsheet or a tube amp CAD export, check live {label} stock and volume pricing, then send
                the matched parts to a {label} cart.
              </p>
            </div>

            {/* Primary Dropzone */}
            <FileUploadZone onParsedFile={handleParsedFile} />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  icon: <Zap className="w-4 h-4" />,
                  tint: 'text-blue-400 bg-blue-500/10',
                  title: 'Live Mouser & DigiKey search',
                  body: 'Look up parts by manufacturer part number, distributor part number or keywords, with rate limiting and retries built in. Each supplier keeps its own BOM.',
                },
                {
                  icon: <TrendingDown className="w-4 h-4" />,
                  tint: 'text-emerald-400 bg-emerald-500/10',
                  title: 'Volume price breaks',
                  body: 'Change a quantity and the unit price follows the price tiers, with checks for minimum order quantities and reel multiples.',
                },
                {
                  icon: <ShoppingCart className="w-4 h-4" />,
                  tint: 'text-violet-400 bg-violet-500/10',
                  title: 'Cart export',
                  body: 'Send matched Mouser parts straight to a Mouser cart with a checkout link, or copy a quick-add list for the DigiKey cart.',
                },
              ].map((f) => (
                <div key={f.title} className="flex gap-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.tint}`}>{f.icon}</div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>BOM Studio for Mouser &amp; DigiKey</p>
          <div className="zx-spectrum-badge">
            <span className="zx-rainbow-stripe" aria-hidden="true" />
            <span className="zx-spectrum-text">Designed by Andrey Dumchin - 4X5VA</span>
            <span className="zx-rainbow-stripe" aria-hidden="true" />
          </div>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <ColumnMappingModal
        key={parsedFileForMapping ? `${parsedFileForMapping.fileName}-${parsedFileForMapping.rows.length}` : 'none'}
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
