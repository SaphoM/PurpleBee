import { create } from 'zustand';

export type AccentColor = 'purple' | 'blue' | 'green' | 'amber' | 'red' | 'pink';
export type DashboardLayout = 'default' | 'modern';

export const accentColorMap: Record<AccentColor, { hex: string; label: string; tw: string }> = {
  purple: { hex: '#8b5cf6', label: 'Purple', tw: 'purple' },
  blue:   { hex: '#3b82f6', label: 'Blue',   tw: 'blue' },
  green:  { hex: '#10b981', label: 'Green',  tw: 'emerald' },
  amber:  { hex: '#f59e0b', label: 'Amber',  tw: 'amber' },
  red:    { hex: '#ef4444', label: 'Red',     tw: 'red' },
  pink:   { hex: '#ec4899', label: 'Pink',    tw: 'pink' },
};

export interface AppSettings {
  keepMockData: boolean;
  showTips: boolean;
  hasSeenWelcomeTips: boolean;
  showWelcomeModal: boolean;
  hideQuickLogin: boolean;
  accentColor: AccentColor;
  dashboardLayout: DashboardLayout;
}

interface SettingsStore extends AppSettings {
  setKeepMockData: (v: boolean) => void;
  setShowTips: (v: boolean) => void;
  setHideQuickLogin: (v: boolean) => void;
  setAccentColor: (c: AccentColor) => void;
  setDashboardLayout: (l: DashboardLayout) => void;
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
  hideQuickLogin: false,
  accentColor: 'purple',
  dashboardLayout: 'default',
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
      hideQuickLogin: state.hideQuickLogin,
      accentColor: state.accentColor,
      dashboardLayout: state.dashboardLayout,
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

  setHideQuickLogin: (v) => {
    set({ hideQuickLogin: v });
    persistSettings({ ...get(), hideQuickLogin: v });
  },

  setAccentColor: (c) => {
    set({ accentColor: c });
    persistSettings({ ...get(), accentColor: c });
  },

  setDashboardLayout: (l) => {
    set({ dashboardLayout: l });
    persistSettings({ ...get(), dashboardLayout: l });
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
