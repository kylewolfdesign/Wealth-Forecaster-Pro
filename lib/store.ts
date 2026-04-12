import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate,
  RetirementAccount, StockOption, Bond, Business, Vehicle,
  Settings, Snapshot, DEFAULT_SETTINGS,
} from './types';
import { generateDemoData } from './demo-data';

export interface AppState {
  holdings: Holding[];
  rsuGrants: RSUGrant[];
  cashAccounts: CashAccount[];
  mortgages: Mortgage[];
  otherAssets: OtherAsset[];
  realEstate: RealEstate[];
  retirementAccounts: RetirementAccount[];
  stockOptions: StockOption[];
  bonds: Bond[];
  businesses: Business[];
  vehicles: Vehicle[];
  snapshots: Snapshot[];
  settings: Settings;
  onboardingComplete: boolean;
  isPro: boolean;
  purchasedThisSession: boolean;

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

  addRealEstate: (r: RealEstate) => void;
  updateRealEstate: (id: string, r: Partial<RealEstate>) => void;
  deleteRealEstate: (id: string) => void;

  addRetirementAccount: (r: RetirementAccount) => void;
  updateRetirementAccount: (id: string, r: Partial<RetirementAccount>) => void;
  deleteRetirementAccount: (id: string) => void;

  addStockOption: (o: StockOption) => void;
  updateStockOption: (id: string, o: Partial<StockOption>) => void;
  deleteStockOption: (id: string) => void;

  addBond: (b: Bond) => void;
  updateBond: (id: string, b: Partial<Bond>) => void;
  deleteBond: (id: string) => void;

  addBusiness: (b: Business) => void;
  updateBusiness: (id: string, b: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;

  addVehicle: (v: Vehicle) => void;
  updateVehicle: (id: string, v: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  addSnapshot: (s: Snapshot) => void;

  setSettings: (s: Partial<Settings>) => void;
  setIsPro: (val: boolean, fromPurchase?: boolean) => void;
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
      realEstate: [],
      retirementAccounts: [],
      stockOptions: [],
      bonds: [],
      businesses: [],
      vehicles: [],
      snapshots: [],
      settings: { ...DEFAULT_SETTINGS },
      onboardingComplete: false,
      isPro: false,
      purchasedThisSession: false,

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

      addRealEstate: (r) => set((s) => ({ realEstate: [...s.realEstate, r] })),
      updateRealEstate: (id, updates) =>
        set((s) => ({
          realEstate: s.realEstate.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      deleteRealEstate: (id) =>
        set((s) => ({ realEstate: s.realEstate.filter((r) => r.id !== id) })),

      addRetirementAccount: (r) => set((s) => ({ retirementAccounts: [...s.retirementAccounts, r] })),
      updateRetirementAccount: (id, updates) =>
        set((s) => ({
          retirementAccounts: s.retirementAccounts.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      deleteRetirementAccount: (id) =>
        set((s) => ({ retirementAccounts: s.retirementAccounts.filter((r) => r.id !== id) })),

      addStockOption: (o) => set((s) => ({ stockOptions: [...s.stockOptions, o] })),
      updateStockOption: (id, updates) =>
        set((s) => ({
          stockOptions: s.stockOptions.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),
      deleteStockOption: (id) =>
        set((s) => ({ stockOptions: s.stockOptions.filter((o) => o.id !== id) })),

      addBond: (b) => set((s) => ({ bonds: [...s.bonds, b] })),
      updateBond: (id, updates) =>
        set((s) => ({
          bonds: s.bonds.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      deleteBond: (id) =>
        set((s) => ({ bonds: s.bonds.filter((b) => b.id !== id) })),

      addBusiness: (b) => set((s) => ({ businesses: [...s.businesses, b] })),
      updateBusiness: (id, updates) =>
        set((s) => ({
          businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      deleteBusiness: (id) =>
        set((s) => ({ businesses: s.businesses.filter((b) => b.id !== id) })),

      addVehicle: (v) => set((s) => ({ vehicles: [...s.vehicles, v] })),
      updateVehicle: (id, updates) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
      deleteVehicle: (id) =>
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),

      addSnapshot: (snapshot) =>
        set((s) => {
          const existing = s.snapshots.filter(
            (sn) => sn.dateISO !== snapshot.dateISO
          );
          return { snapshots: [...existing, snapshot].slice(-365) };
        }),

      setSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      setIsPro: (val, fromPurchase) => set({ isPro: val, ...(fromPurchase && val ? { purchasedThisSession: true } : {}) }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      loadDemoData: () => {
        const demo = generateDemoData();
        set({
          holdings: demo.holdings,
          rsuGrants: demo.rsuGrants,
          cashAccounts: demo.cashAccounts,
          mortgages: demo.mortgages,
          otherAssets: demo.otherAssets,
          realEstate: demo.realEstate,
          retirementAccounts: demo.retirementAccounts,
          stockOptions: demo.stockOptions,
          bonds: demo.bonds,
          businesses: demo.businesses,
          vehicles: demo.vehicles,
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
          realEstate: [],
          retirementAccounts: [],
          stockOptions: [],
          bonds: [],
          businesses: [],
          vehicles: [],
          snapshots: [],
          settings: { ...DEFAULT_SETTINGS },
          onboardingComplete: false,
          isPro: false,
        }),
    }),
    {
      name: 'networth-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: (state) => {
        const { purchasedThisSession, ...rest } = state;
        return rest;
      },
      migrate: (persistedState, version) => {
        const state = persistedState as AppState;
        if (version === 0 && Array.isArray(state.realEstate)) {
          state.realEstate = state.realEstate.map((r) => ({
            ...r,
            equity: r.equity ?? r.currentValue,
          }));
        }
        if (version < 2) {
          if (!state.retirementAccounts) state.retirementAccounts = [];
          if (!state.stockOptions) state.stockOptions = [];
          if (!state.bonds) state.bonds = [];
          if (!state.businesses) state.businesses = [];
          if (!state.vehicles) state.vehicles = [];
          if (state.settings.retirementGrowthPct == null) state.settings.retirementGrowthPct = 8;
        }
        return state;
      },
    }
  )
);
