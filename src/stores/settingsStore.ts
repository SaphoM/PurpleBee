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

const defaults: AppSettings = {
  keepMockData: true,
  showTips: true,
  hasSeenWelcomeTips: false,
  showWelcomeModal: false,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...defaults,

  setKeepMockData: (v) => set({ keepMockData: v }),

  setShowTips: (v) => set({ showTips: v }),

  markWelcomeTipsSeen: () => set({ hasSeenWelcomeTips: true, showWelcomeModal: false }),

  openWelcomeModal: () => set({ showWelcomeModal: true }),

  closeWelcomeModal: () => set({ showWelcomeModal: false, hasSeenWelcomeTips: true }),

  resetSettings: () => set({ ...defaults }),
}));
