'use client';

import React from 'react';
import {
  Cpu,
  Search,
  Settings,
  ShoppingCart,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';

export function Navbar() {
  const {
    activeCart,
    setIsManualSearchOpen,
    setIsCartModalOpen,
  } = useBomStore();

  const {
    searchApiKey,
    setIsSettingsOpen,
  } = useSettingsStore();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 min-h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-base sm:text-lg">
                Mouser BOM Studio
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Electronics Bill of Materials &amp; Shopping Cart Automation
            </p>
            <div className="mt-1 flex items-center">
              <div className="zx-spectrum-badge whitespace-nowrap flex-nowrap shrink-0">
                <span className="zx-rainbow-stripe" aria-hidden="true" />
                <span className="zx-spectrum-text whitespace-nowrap">Designed by Andrey Dumchin - 4X5VA</span>
                <span className="zx-rainbow-stripe" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            {searchApiKey ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Mouser Live API</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">API Key Required</span>
              </>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={() => setIsManualSearchOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Search Catalog</span>
          </button>

          {/* Active Cart Quick Link */}
          {activeCart && (
            <button
              onClick={() => setIsCartModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cart Ready</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition relative"
            title="Configure API Keys & Settings"
          >
            <Settings className="w-4 h-4" />
            {!searchApiKey && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
