import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, Settings, Currency } from '@shared/types';
export type CurrencyMap = { [code: string]: { symbol: string; suffix: boolean } };
export type ModalState = {
  isModalOpen: boolean;
  modalInitialValues: Partial<Transaction>;
  openModal: (initialValues?: Partial<Transaction>) => void;
  closeModal: () => void;
};
export type AppState = ModalState & {
  currency: string; // code
  settings: Partial<Settings>;
  currencies: CurrencyMap;
  setCurrency: (currency: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setCurrencies: (currencies: Currency[]) => void;
  refetchData: number;
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
      currency: 'EUR',
      settings: {},
      currencies: {
        EUR: { symbol: '€', suffix: true },
        USD: { symbol: '$', suffix: false },
        ARS: { symbol: '$', suffix: false },
      },
      setCurrency: (currency) => set({ currency }),
      setSettings: (settings) => set((state) => {
        if (settings.currency && state.currency !== settings.currency) {
          return { settings: { ...state.settings, ...settings }, currency: settings.currency };
        }
        return { settings: { ...state.settings, ...settings } };
      }),
      setCurrencies: (currencies) => {
        const currencyMap = currencies.reduce((acc, cur) => {
          acc[cur.code] = { symbol: cur.symbol, suffix: cur.suffix };
          return acc;
        }, {} as CurrencyMap);
        set({ currencies: currencyMap });
      },
      // Refetch trigger for synchronization
      refetchData: 0,
      triggerRefetch: () => set(state => ({ refetchData: state.refetchData + 1 })),
    }),
    {
      name: 'moneyo-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
        settings: state.settings,
        currencies: state.currencies
      }),
    }
  )
);