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
    <div
      role="status"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 mb-5"
    >
      <div className="flex items-start gap-3 min-w-0">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-amber-200">
            {isDigiKey ? 'DigiKey API credentials are not set.' : 'Mouser Search API key is not set.'}
          </span>{' '}
          {isDigiKey
            ? 'Add the Client ID and Client Secret of your DigiKey API app (Product Information v4) to get live stock and pricing.'
            : 'Add your Mouser Search API key to get live stock, volume price breaks and Mouser carts.'}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setIsSettingsOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 transition self-start sm:self-auto"
      >
        <Key className="w-3.5 h-3.5" />
        {isDigiKey ? 'Add DigiKey credentials' : 'Add API key'}
      </button>
    </div>
  );
}
