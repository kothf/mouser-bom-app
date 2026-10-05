'use client';

import React from 'react';
import { AlertCircle, Key } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';

export function ApiKeyBanner() {
  const { searchApiKey, setIsSettingsOpen } = useSettingsStore();

  // If user has set an API key, no banner is needed
  if (searchApiKey) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-xl p-4 mb-6 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">
                Mouser Search API Key Not Configured
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              To query live Mouser inventory, retrieve real-time volume price breaks, and push shopping carts directly to Mouser.com, please configure your Mouser Search API Key.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
          >
            <Key className="w-3.5 h-3.5" />
            Configure API Key
          </button>
        </div>
      </div>
    </div>
  );
}
