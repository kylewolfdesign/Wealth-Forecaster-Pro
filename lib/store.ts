import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Holding, RSUGrant, CashAccount, Mortgage, OtherAsset,
  Settings, Snapshot, DEFAULT_SETTINGS,
} from './types';
import { generateDemoData } from './demo-data';

interface AppState {
  holdings: Holding[];
  rsuGrants: RSUGrant[];
  cashAccounts: CashAccount[];
  mortgages: Mortgage[];
  otherAssets: OtherAsset[];
  snapshots: Snapshot[];
  settings: Settings;
  onboardingComplete: boolean;
  isPro: boolean;

  addHolding: (h: Holding) => void;
  updateHolding: (id: string, h: Partial<Holding>) => void;
  deleteHolding: (id: string) => void;

  addRSUGrant: (r: RSUGrant) => void;
  updateRSUGrant: (id: string, r: Partial<RSUGrant>) => void;
  deleteRSUGrant: (id: string) => void;

  addCashAccount: (c: CashAccount) => void;
  updateCashAccount: (id: string, c: Partial<CashAccount>) => void;
  deleteCashAccount: (id: string) => void;

  addMortgage: (m: Mortgage) => void;
  updateMortgage: (id: string, m: Partial<Mortgage>) => void;
  deleteMortgage: (id: string) => void;

  addOtherAsset: (a: OtherAsset) => void;
  updateOtherAsset: (id: string, a: Partial<OtherAsset>) => void;
  deleteOtherAsset: (id: string) => void;

  addSnapshot: (s: Snapshot) => void;

  setSettings: (s: Partial<Settings>) => void;
  completeOnboarding: () => void;
  loadDemoData: () => void;
  clearAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      holdings: [],
      rsuGrants: [],
      cashAccounts: [],
      mortgages: [],
      otherAssets: [],
      snapshots: [],
      settings: { ...DEFAULT_SETTINGS },
      onboardingComplete: false,
      isPro: false,

      addHolding: (h) => set((s) => ({ holdings: [...s.holdings, h] })),
      updateHolding: (id, updates) =>
        set((s) => ({
          holdings: s.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        })),
      deleteHolding: (id) => set((s) => ({ holdings: s.holdings.filter((h) => h.id !== id) })),

      addRSUGrant: (r) => set((s) => ({ rsuGrants: [...s.rsuGrants, r] })),
      updateRSUGrant: (id, updates) =>
        set((s) => ({
          rsuGrants: s.rsuGrants.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      deleteRSUGrant: (id) => set((s) => ({ rsuGrants: s.rsuGrants.filter((r) => r.id !== id) })),

      addCashAccount: (c) => set((s) => ({ cashAccounts: [...s.cashAccounts, c] })),
      updateCashAccount: (id, updates) =>
        set((s) => ({
          cashAccounts: s.cashAccounts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCashAccount: (id) =>
        set((s) => ({ cashAccounts: s.cashAccounts.filter((c) => c.id !== id) })),

      addMortgage: (m) => set((s) => ({ mortgages: [...s.mortgages, m] })),
      updateMortgage: (id, updates) =>
        set((s) => ({
          mortgages: s.mortgages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      deleteMortgage: (id) => set((s) => ({ mortgages: s.mortgages.filter((m) => m.id !== id) })),

      addOtherAsset: (a) => set((s) => ({ otherAssets: [...s.otherAssets, a] })),
      updateOtherAsset: (id, updates) =>
        set((s) => ({
          otherAssets: s.otherAssets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      deleteOtherAsset: (id) =>
        set((s) => ({ otherAssets: s.otherAssets.filter((a) => a.id !== id) })),

      addSnapshot: (snapshot) =>
        set((s) => {
          const existing = s.snapshots.filter(
            (sn) => sn.dateISO !== snapshot.dateISO
          );
          return { snapshots: [...existing, snapshot].slice(-365) };
        }),

      setSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      completeOnboarding: () => set({ onboardingComplete: true }),

      loadDemoData: () => {
        const demo = generateDemoData();
        set({
          holdings: demo.holdings,
          rsuGrants: demo.rsuGrants,
          cashAccounts: demo.cashAccounts,
          mortgages: demo.mortgages,
          otherAssets: demo.otherAssets,
          snapshots: demo.snapshots,
          onboardingComplete: true,
        });
      },

      clearAllData: () =>
        set({
          holdings: [],
          rsuGrants: [],
          cashAccounts: [],
          mortgages: [],
          otherAssets: [],
          snapshots: [],
          settings: { ...DEFAULT_SETTINGS },
          onboardingComplete: false,
          isPro: false,
        }),
    }),
    {
      name: 'networth-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
