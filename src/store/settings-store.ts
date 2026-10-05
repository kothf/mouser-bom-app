import { create } from 'zustand';

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
    set({ searchApiKey: key });
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, searchApiKey: key }));
    } catch {}
    fetch('/api/mouser/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchApiKey: key }),
    }).catch(() => {});
  },

  setCartApiKey: (key: string) => {
    set({ cartApiKey: key });
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, cartApiKey: key }));
    } catch {}
    fetch('/api/mouser/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartApiKey: key }),
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
    set(settings);
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
    } catch {}

    try {
      await fetch('/api/mouser/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchApiKey: settings.searchApiKey,
          cartApiKey: settings.cartApiKey,
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
          searchApiKey: parsed.searchApiKey || '',
          cartApiKey: parsed.cartApiKey || '',
          rateLimitDelayMs: parsed.rateLimitDelayMs || 300,
          maxConcurrency: parsed.maxConcurrency || 3,
        });
      }

      // Also sync from server .env.local if present
      const res = await fetch('/api/mouser/settings');
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
