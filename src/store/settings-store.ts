import { create } from 'zustand';
import { apiPath } from '@/lib/api-path';
import { sanitizeApiKey } from '@/lib/mouser/client';
import { Supplier } from '@/lib/supplier';

export interface DigiKeySettings {
  digikeyClientId: string;
  digikeyClientSecret: string;
  digikeyLocaleSite: string;
}

export interface SettingsState {
  searchApiKey: string;
  cartApiKey: string;
  rateLimitDelayMs: number;
  maxConcurrency: number;
  isSettingsOpen: boolean;
  // True once browser-saved settings have been read (avoids banner flicker)
  settingsLoaded: boolean;

  digikeyClientId: string;
  digikeyClientSecret: string;
  digikeyLocaleSite: string;

  // CAD keyword import rules (empty string = built-in defaults)
  cadCategoriesText: string;
  cadColumnsText: string;

  setSearchApiKey: (key: string) => void;
  setCartApiKey: (key: string) => void;
  setRateLimitDelayMs: (ms: number) => void;
  setMaxConcurrency: (count: number) => void;
  setIsSettingsOpen: (open: boolean) => void;
  saveSettings: (settings: {
    searchApiKey: string;
    cartApiKey: string;
    rateLimitDelayMs: number;
    maxConcurrency: number;
  }) => Promise<void>;
  saveDigiKeySettings: (settings: DigiKeySettings) => void;
  saveCadRules: (categoriesText: string, columnsText: string) => void;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'mouser_bom_settings_v1';

function cleanCredential(raw: string | undefined | null): string {
  return String(raw || '').trim().replace(/^['"`]+|['"`]+$/g, '').trim();
}

function mergeIntoStorage(patch: Record<string, unknown>) {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

export const useSettingsStore = create<SettingsState>((set) => ({
  searchApiKey: '',
  cartApiKey: '',
  rateLimitDelayMs: 300,
  maxConcurrency: 3,
  isSettingsOpen: false,
  settingsLoaded: false,
  digikeyClientId: '',
  digikeyClientSecret: '',
  digikeyLocaleSite: 'US',
  cadCategoriesText: '',
  cadColumnsText: '',

  setSearchApiKey: (key: string) => {
    const clean = sanitizeApiKey(key);
    set({ searchApiKey: clean });
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, searchApiKey: clean }));
    } catch {}
    fetch(apiPath('/api/mouser/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchApiKey: clean }),
    }).catch(() => {});
  },

  setCartApiKey: (key: string) => {
    const clean = sanitizeApiKey(key);
    set({ cartApiKey: clean });
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, cartApiKey: clean }));
    } catch {}
    fetch(apiPath('/api/mouser/settings'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartApiKey: clean }),
    }).catch(() => {});
  },

  setRateLimitDelayMs: (ms: number) => {
    set({ rateLimitDelayMs: ms });
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, rateLimitDelayMs: ms }));
    } catch {}
  },

  setMaxConcurrency: (count: number) => {
    set({ maxConcurrency: count });
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, maxConcurrency: count }));
    } catch {}
  },

  setIsSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),

  saveSettings: async (settings) => {
    const cleanSettings = {
      ...settings,
      searchApiKey: sanitizeApiKey(settings.searchApiKey),
      cartApiKey: sanitizeApiKey(settings.cartApiKey),
    };
    set(cleanSettings);
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...cleanSettings }));
    } catch {}

    try {
      await fetch(apiPath('/api/mouser/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchApiKey: cleanSettings.searchApiKey,
          cartApiKey: cleanSettings.cartApiKey,
        }),
      });
    } catch (e) {
      console.warn('Failed to save settings to server:', e);
    }
  },

  saveDigiKeySettings: (settings: DigiKeySettings) => {
    const clean: DigiKeySettings = {
      digikeyClientId: cleanCredential(settings.digikeyClientId),
      digikeyClientSecret: cleanCredential(settings.digikeyClientSecret),
      digikeyLocaleSite: cleanCredential(settings.digikeyLocaleSite).toUpperCase() || 'US',
    };
    set(clean);
    mergeIntoStorage({ ...clean });
  },

  saveCadRules: (categoriesText: string, columnsText: string) => {
    set({ cadCategoriesText: categoriesText, cadColumnsText: columnsText });
    mergeIntoStorage({ cadCategoriesText: categoriesText, cadColumnsText: columnsText });
  },

  loadFromStorage: async () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          searchApiKey: sanitizeApiKey(parsed.searchApiKey || ''),
          cartApiKey: sanitizeApiKey(parsed.cartApiKey || ''),
          rateLimitDelayMs: parsed.rateLimitDelayMs || 300,
          maxConcurrency: parsed.maxConcurrency || 3,
          digikeyClientId: cleanCredential(parsed.digikeyClientId),
          digikeyClientSecret: cleanCredential(parsed.digikeyClientSecret),
          digikeyLocaleSite: cleanCredential(parsed.digikeyLocaleSite) || 'US',
          cadCategoriesText: typeof parsed.cadCategoriesText === 'string' ? parsed.cadCategoriesText : '',
          cadColumnsText: typeof parsed.cadColumnsText === 'string' ? parsed.cadColumnsText : '',
        });
      }
      set({ settingsLoaded: true });

      // Also sync from server if configured
      const res = await fetch(apiPath('/api/mouser/settings'));
      if (res.ok) {
        const serverData = await res.json();
        set((state) => ({
          searchApiKey: state.searchApiKey || serverData.searchApiKey || '',
          cartApiKey: state.cartApiKey || serverData.cartApiKey || '',
        }));
      }
    } catch (e) {
      console.warn('Failed to load settings from storage/server', e);
      set({ settingsLoaded: true });
    }
  },
}));

function readStoredSettings(): Record<string, string | undefined> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Request headers carrying the user's own credentials for a supplier's search
 * API. `hasCredentials` is false when the browser holds none (the server may
 * still have its own from environment variables).
 */
export function getSupplierSearchHeaders(
  supplier: Supplier,
  explicitMouserKey?: string
): { headers: Record<string, string>; hasCredentials: boolean } {
  const state = useSettingsStore.getState();
  const stored = readStoredSettings();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (supplier === 'digikey') {
    const clientId = state.digikeyClientId || cleanCredential(stored.digikeyClientId);
    const clientSecret = state.digikeyClientSecret || cleanCredential(stored.digikeyClientSecret);
    if (clientId && clientSecret) {
      headers['x-digikey-client-id'] = clientId;
      headers['x-digikey-client-secret'] = clientSecret;
    }
    headers['x-digikey-locale-site'] = state.digikeyLocaleSite || stored.digikeyLocaleSite || 'US';
    return { headers, hasCredentials: Boolean(clientId && clientSecret) };
  }

  const key =
    explicitMouserKey?.trim() || state.searchApiKey?.trim() || sanitizeApiKey(stored.searchApiKey || '');
  if (key) headers['x-mouser-search-key'] = key;
  return { headers, hasCredentials: Boolean(key) };
}
