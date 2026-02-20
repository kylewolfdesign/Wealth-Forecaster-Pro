export interface Holding {
  id: string;
  type: 'stock' | 'crypto';
  symbol: string;
  shares: number;
  costBasis?: number;
  manualPrice?: number;
  growthOverride?: number;
}

export interface RSUGrant {
  id: string;
  symbol: string;
  totalShares: number;
  alreadyVestedShares: number;
  vest: {
    startDate: string;
    cliffMonths: number;
    durationMonths: number;
    frequency: 'monthly' | 'quarterly' | 'yearly';
  };
  growthOverride?: number;
}

export interface CashAccount {
  id: string;
  type: 'savings' | 'offset';
  name: string;
  balance: number;
  monthlyContribution: number;
  annualInterestRate?: number;
}

export interface Mortgage {
  id: string;
  name: string;
  principalBalance: number;
  annualInterestRate: number;
  monthlyPayment: number;
  annualPaymentIncreasePct?: number;
}

export interface OtherAsset {
  id: string;
  name: string;
  value: number;
  annualGrowthRate?: number;
}

export interface Settings {
  stockGrowthPct: number;
  cryptoGrowthPct: number;
  cashGrowthPct: number;
  rsuGrowthPct: number;
  inflationPct: number;
  showRealReturns: boolean;
}

export interface SnapshotTotals {
  netWorth: number;
  stocks: number;
  crypto: number;
  rsusVested: number;
  rsusUnvested: number;
  savings: number;
  offset: number;
  otherAssets: number;
  mortgage: number;
}

export interface Snapshot {
  id: string;
  dateISO: string;
  totals: SnapshotTotals;
  notes?: string;
}

export interface ForecastPoint {
  monthsFromNow: number;
  date: string;
  netWorth: number;
  breakdown: {
    stocks: number;
    crypto: number;
    rsus: number;
    savings: number;
    offset: number;
    otherAssets: number;
    mortgage: number;
  };
}

export type ItemType = 'holding' | 'rsu' | 'cash' | 'mortgage' | 'other';

export const DEFAULT_SETTINGS: Settings = {
  stockGrowthPct: 10,
  cryptoGrowthPct: 15,
  cashGrowthPct: 4.5,
  rsuGrowthPct: 10,
  inflationPct: 3,
  showRealReturns: false,
};
