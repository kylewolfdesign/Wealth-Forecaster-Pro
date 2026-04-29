import { apiRequest, getApiUrl } from '@/lib/query-client';
import { useAppStore, type AppState } from '@/lib/store';
import type {
  Holding, RSUGrant, CashAccount, Mortgage, OtherAsset,
  RealEstate, RetirementAccount, StockOption, Bond, Business,
  Vehicle, Settings, Snapshot,
} from '@/lib/types';

type PortfolioData = {
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
};

const DATA_KEYS: (keyof PortfolioData)[] = [
  'holdings', 'rsuGrants', 'cashAccounts', 'mortgages',
  'otherAssets', 'realEstate', 'retirementAccounts',
  'stockOptions', 'bonds', 'businesses', 'vehicles',
  'snapshots', 'settings', 'onboardingComplete', 'isPro',
];

export function getPortfolioSnapshot(): PortfolioData {
  const state = useAppStore.getState();
  return {
    holdings: state.holdings,
    rsuGrants: state.rsuGrants,
    cashAccounts: state.cashAccounts,
    mortgages: state.mortgages,
    otherAssets: state.otherAssets,
    realEstate: state.realEstate,
    retirementAccounts: state.retirementAccounts,
    stockOptions: state.stockOptions,
    bonds: state.bonds,
    businesses: state.businesses,
    vehicles: state.vehicles,
    snapshots: state.snapshots,
    settings: state.settings,
    onboardingComplete: state.onboardingComplete,
    isPro: state.isPro,
  };
}

export async function savePortfolioToServer(): Promise<void> {
  const data = getPortfolioSnapshot();
  await apiRequest('PUT', '/api/portfolio', data);
}

export async function loadPortfolioFromServer(): Promise<PortfolioData | null> {
  try {
    const baseUrl = getApiUrl();
    const url = new URL('/api/portfolio', baseUrl);
    const res = await fetch(url.toString(), { credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export function hydrateStoreFromServer(data: PortfolioData): void {
  const updates: Partial<Pick<AppState, keyof PortfolioData>> = {};

  for (const key of DATA_KEYS) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      Object.assign(updates, { [key]: value });
    }
  }

  useAppStore.setState(updates);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveToServer(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(async () => {
    try {
      await savePortfolioToServer();
    } catch (err) {
      console.warn('Portfolio sync failed:', err);
    }
  }, 3000);
}
