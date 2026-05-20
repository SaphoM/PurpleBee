import { create } from 'zustand';

export interface AppSettings {
  keepMockData: boolean;
  showTips: boolean;
  hasSeenWelcomeTips: boolean;
  showWelcomeModal: boolean;
}

interface SettingsStore extends AppSettings {
  setKeepMockData: (v: boolean) => void;
  setShowTips: (v: boolean) => void;
  markWelcomeTipsSeen: () => void;
  openWelcomeModal: () => void;
  closeWelcomeModal: () => void;
  resetSettings: () => void;
}

const STORAGE_KEY = 'purplebee-settings';

const defaults: AppSettings = {
  keepMockData: true,
  showTips: true,
  hasSeenWelcomeTips: false,
  showWelcomeModal: false,
};

// Load persisted settings from localStorage
function loadPersistedSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Save settings to localStorage (only persistable keys)
function persistSettings(state: AppSettings) {
  try {
    const toPersist = {
      keepMockData: state.keepMockData,
      showTips: state.showTips,
      hasSeenWelcomeTips: state.hasSeenWelcomeTips,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaults,
  ...loadPersistedSettings(),

  setKeepMockData: (v) => {
    set({ keepMockData: v });
    persistSettings({ ...get(), keepMockData: v });
  },

  setShowTips: (v) => {
    set({ showTips: v });
    persistSettings({ ...get(), showTips: v });
  },

  markWelcomeTipsSeen: () => {
    set({ hasSeenWelcomeTips: true, showWelcomeModal: false });
    persistSettings({ ...get(), hasSeenWelcomeTips: true });
  },

  openWelcomeModal: () => set({ showWelcomeModal: true }),

  closeWelcomeModal: () => {
    set({ showWelcomeModal: false, hasSeenWelcomeTips: true });
    persistSettings({ ...get(), hasSeenWelcomeTips: true });
  },

  resetSettings: () => {
    set({ ...defaults });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },
}));
