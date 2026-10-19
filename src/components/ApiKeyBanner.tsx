'use client';

import React from 'react';
import { AlertCircle, Key } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';
import { useBomStore } from '@/store/bom-store';
import { supplierApiPath } from '@/lib/supplier';

export function ApiKeyBanner() {
  const { supplier } = useBomStore();
  const { searchApiKey, digikeyClientId, digikeyClientSecret, settingsLoaded, setIsSettingsOpen } =
    useSettingsStore();
  const [digikeyServerConfigured, setDigikeyServerConfigured] = React.useState(false);

  React.useEffect(() => {
    if (supplier !== 'digikey') return;
    let cancelled = false;
    fetch(supplierApiPath('digikey', 'verify'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setDigikeyServerConfigured(Boolean(data.serverConfigured));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [supplier]);

  const hasKey =
    supplier === 'digikey'
      ? Boolean(digikeyClientId && digikeyClientSecret) || digikeyServerConfigured
      : Boolean(searchApiKey?.trim());

  // Wait until saved settings are read, and hide when credentials exist
  if (!settingsLoaded || hasKey) {
    return null;
  }

  const isDigiKey = supplier === 'digikey';

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
                {isDigiKey ? 'DigiKey API Credentials Not Configured' : 'Mouser Search API Key Not Configured'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isDigiKey
                ? 'To query live DigiKey inventory and pricing, add the Client ID and Client Secret of your own DigiKey API app (Product Information v4) in Settings.'
                : 'To query live Mouser inventory, retrieve real-time volume price breaks, and push shopping carts directly to Mouser.com, please configure your Mouser Search API Key.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
          >
            <Key className="w-3.5 h-3.5" />
            {isDigiKey ? 'Configure DigiKey' : 'Configure API Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
