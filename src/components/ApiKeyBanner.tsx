'use client';

import React from 'react';
import { AlertCircle, Key, Sparkles, Settings } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';

export function ApiKeyBanner() {
  const { searchApiKey, useDemoMode, setUseDemoMode, setIsSettingsOpen } = useSettingsStore();

  // If user has set an API key and is not in demo mode, no banner is needed
  if (searchApiKey && !useDemoMode) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-xl p-4 mb-6 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
            {useDemoMode ? <Sparkles className="w-5 h-5 text-amber-400" /> : <AlertCircle className="w-5 h-5 text-blue-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                {useDemoMode ? 'Demo / Simulation Mode Active' : 'Mouser API Key Not Configured'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {useDemoMode ? 'Full Mock Catalog' : 'Demo Available'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {useDemoMode
                ? 'Using built-in electronic components catalog (STM32, ESP32, passives, ICs) with realistic pricing tiers, stock, and simulated Mouser cart generation.'
                : 'To query live Mouser inventory & push carts directly to Mouser.com, provide your free Mouser API Key. Alternatively, click "Use Demo Mode" to test all features with simulated components.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {!useDemoMode && (
            <button
              onClick={() => setUseDemoMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Use Demo Mode
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
          >
            <Key className="w-3.5 h-3.5" />
            Configure API Keys
          </button>
        </div>
      </div>
    </div>
  );
}
