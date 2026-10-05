import { create } from 'zustand';
import { apiPath } from '@/lib/api-path';
import { sanitizeApiKey } from '@/lib/mouser/client';

export interface SettingsState {
  searchApiKey: string;
  cartApiKey: string;
  rateLimitDelayMs: number;
  maxConcurrency: number;
  isSettingsOpen: boolean;

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
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'mouser_bom_settings_v1';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  searchApiKey: '',
  cartApiKey: '',
  rateLimitDelayMs: 300,
  maxConcurrency: 3,
  isSettingsOpen: false,

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
        });
      }

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
    }
  },
}));
