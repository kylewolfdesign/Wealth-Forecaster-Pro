import type { Currency } from './currency';
export type { Currency };

export interface Holding {
  id: string;
  type: 'stock' | 'crypto';
  symbol: string;
  shares: number;
  costBasis?: number;
  manualPrice?: number;
  growthOverride?: number;
  recurringShares?: number;
  recurringCadence?: 'monthly' | 'quarterly' | 'yearly';
  currency?: Currency;
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
  currency?: Currency;
}

export interface CashAccount {
  id: string;
  type: 'savings' | 'offset';
  name: string;
  balance: number;
  monthlyContribution: number;
  annualInterestRate?: number;
  currency?: Currency;
}

export interface Mortgage {
  id: string;
  name: string;
  principalBalance: number;
  annualInterestRate: number;
  monthlyPayment: number;
  annualPaymentIncreasePct?: number;
  currency?: Currency;
}

export interface OtherAsset {
  id: string;
  name: string;
  value: number;
  annualGrowthRate?: number;
  currency?: Currency;
}

export interface RealEstate {
  id: string;
  name: string;
  currentValue: number;
  annualGrowthRate?: number;
  equity?: number;
  additionalEquity?: number;
  equityCadence?: 'monthly' | 'quarterly' | 'yearly';
  mortgageId?: string;
  currency?: Currency;
}

export interface RetirementAccount {
  id: string;
  name: string;
  accountType: '401k' | 'ira' | 'roth_ira' | 'pension' | 'other';
  balance: number;
  monthlyContribution: number;
  employerMatchPct?: number;
  employerMatchLimit?: number;
  currency?: Currency;
}

export interface StockOption {
  id: string;
  symbol: string;
  optionType: 'iso' | 'nso';
  totalOptions: number;
  vestedOptions: number;
  strikePrice: number;
  currentPrice?: number;
  vest: {
    startDate: string;
    cliffMonths: number;
    durationMonths: number;
    frequency: 'monthly' | 'quarterly' | 'yearly';
  };
  expirationDate?: string;
  currency?: Currency;
}

export interface Bond {
  id: string;
  name: string;
  faceValue: number;
  couponRate: number;
  maturityDate: string;
  purchasePrice?: number;
  currency?: Currency;
}

export interface Business {
  id: string;
  name: string;
  value: number;
  annualGrowthRate?: number;
  isIlliquid?: boolean;
  currency?: Currency;
}

export interface Vehicle {
  id: string;
  name: string;
  currentValue: number;
  annualDepreciationRate?: number;
  currency?: Currency;
}

export interface Settings {
  stockGrowthPct: number;
  cryptoGrowthPct: number;
  cashGrowthPct: number;
  rsuGrowthPct: number;
  retirementGrowthPct: number;
  inflationPct: number;
  showRealReturns: boolean;
  displayCurrency: Currency;
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
  realEstate: number;
  mortgage: number;
  retirement: number;
  stockOptions: number;
  bonds: number;
  business: number;
  vehicles: number;
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
  isJump?: boolean;
  breakdown: {
    stocks: number;
    crypto: number;
    rsus: number;
    savings: number;
    offset: number;
    otherAssets: number;
    realEstate: number;
    mortgage: number;
    retirement: number;
    stockOptions: number;
    bonds: number;
    business: number;
    vehicles: number;
  };
}

export type ItemType = 'holding' | 'rsu' | 'cash' | 'mortgage' | 'other' | 'realEstate' | 'retirement' | 'stockOption' | 'bond' | 'business' | 'vehicle';

export const DEFAULT_SETTINGS: Settings = {
  stockGrowthPct: 10,
  cryptoGrowthPct: 15,
  cashGrowthPct: 4.5,
  rsuGrowthPct: 10,
  retirementGrowthPct: 8,
  inflationPct: 3,
  showRealReturns: false,
  displayCurrency: 'USD',
};
