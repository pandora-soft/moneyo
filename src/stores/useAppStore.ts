import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, Currency, Settings } from '@shared/types';
export type ModalState = {
  isModalOpen: boolean;
  modalInitialValues: Partial<Transaction>;
  openModal: (initialValues?: Partial<Transaction>) => void;
  closeModal: () => void;
};
export type AppState = ModalState & {
  currency: Currency;
  settings: Partial<Settings>;
  setCurrency: (currency: Currency) => void;
  setSettings: (settings: Partial<Settings>) => void;
  refetchData: () => void; // Dummy function to trigger refetches
  triggerRefetch: () => void;
};
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Modal State
      isModalOpen: false,
      modalInitialValues: {},
      openModal: (initialValues = {}) => set({ isModalOpen: true, modalInitialValues: initialValues }),
      closeModal: () => set({ isModalOpen: false, modalInitialValues: {} }),
      // App State
      currency: 'USD',
      settings: {},
      setCurrency: (currency) => set({ currency }),
      setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
      // Refetch trigger
      refetchData: () => {}, // Initial no-op
      triggerRefetch: () => set(state => ({ refetchData: () => {} })), // This will change identity and trigger effects
    }),
    {
      name: 'casaconta-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currency: state.currency, settings: state.settings }),
    }
  )
);