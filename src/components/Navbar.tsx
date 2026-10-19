'use client';

import React from 'react';
import { Cpu, Search, Settings, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';
import { SUPPLIER_LABELS } from '@/lib/supplier';

export function Navbar() {
  const { supplier, activeCart, setIsManualSearchOpen, setIsCartModalOpen } = useBomStore();

  const { searchApiKey, digikeyClientId, digikeyClientSecret, setIsSettingsOpen } = useSettingsStore();

  const hasCredentials =
    supplier === 'digikey' ? Boolean(digikeyClientId && digikeyClientSecret) : Boolean(searchApiKey);
  const label = SUPPLIER_LABELS[supplier];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Back to Homepage & Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="https://aerocat.tech"
            className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 text-xs font-medium transition group shrink-0"
            title="Return to aerocat.tech homepage"
            aria-label="Return to aerocat.tech homepage"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden md:inline">aerocat.tech</span>
          </a>

          <div className="h-6 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Cpu className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 leading-tight">
              <span className="flex items-baseline gap-1.5">
                <span className="font-semibold text-white tracking-tight text-[15px]">BOM Studio</span>
                {process.env.NEXT_PUBLIC_APP_VERSION && (
                  <span className="tabular font-mono text-[10px] text-slate-500" title="App version">
                    v{process.env.NEXT_PUBLIC_APP_VERSION}
                  </span>
                )}
              </span>
              <span className="hidden sm:block text-[11px] text-slate-500 truncate">
                Parts search &amp; carts for Mouser and DigiKey
              </span>
            </div>
          </div>

          <div className="hidden lg:block ml-2 shrink-0">
            <div className="zx-spectrum-badge">
              <span className="zx-rainbow-stripe" aria-hidden="true" />
              <span className="zx-spectrum-text">Designed by Andrey Dumchin - 4X5VA</span>
              <span className="zx-rainbow-stripe" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Status Badge */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-full border text-xs font-medium transition ${
              hasCredentials
                ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10'
            }`}
            title={hasCredentials ? `${label} API connected` : `Add your ${label} API credentials in Settings`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasCredentials ? 'bg-emerald-400' : 'bg-amber-400'}`}
              aria-hidden="true"
            />
            {hasCredentials ? `${label} connected` : `${label} not connected`}
          </button>

          {/* Search Button */}
          <button
            type="button"
            onClick={() => setIsManualSearchOpen(true)}
            className="inline-flex items-center gap-2 h-8 px-2.5 sm:px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-medium transition"
            aria-label={`Search ${label}`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search {label}</span>
          </button>

          {/* Active Cart Quick Link */}
          {activeCart && (
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cart ready</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition relative"
            title="API keys & settings"
            aria-label="API keys & settings"
          >
            <Settings className="w-4 h-4" />
            {!hasCredentials && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
