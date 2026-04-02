import * as Crypto from 'expo-crypto';
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate, RetirementAccount, StockOption, Bond, Business, Vehicle, Snapshot } from './types';

function uid(): string {
  return Crypto.randomUUID();
}

export function generateDemoData() {
  const holdings: Holding[] = [
    { id: uid(), type: 'stock', symbol: 'AAPL', shares: 50, costBasis: 145 },
    { id: uid(), type: 'stock', symbol: 'MSFT', shares: 30, costBasis: 310 },
    { id: uid(), type: 'stock', symbol: 'VOO', shares: 20, costBasis: 380 },
    { id: uid(), type: 'crypto', symbol: 'BTC', shares: 0.5, costBasis: 42000 },
    { id: uid(), type: 'crypto', symbol: 'ETH', shares: 5, costBasis: 2200 },
  ];

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rsuGrants: RSUGrant[] = [
    {
      id: uid(),
      symbol: 'GOOGL',
      totalShares: 200,
      alreadyVestedShares: 50,
      vest: {
        startDate: sixMonthsAgo.toISOString().split('T')[0],
        cliffMonths: 12,
        durationMonths: 48,
        frequency: 'quarterly',
      },
    },
  ];

  const cashAccounts: CashAccount[] = [
    { id: uid(), type: 'savings', name: 'Emergency Fund', balance: 25000, monthlyContribution: 1500, annualInterestRate: 5.0 },
    { id: uid(), type: 'savings', name: 'Investment Savings', balance: 12000, monthlyContribution: 2000, annualInterestRate: 4.5 },
    { id: uid(), type: 'offset', name: 'Offset Account', balance: 35000, monthlyContribution: 500, annualInterestRate: 0 },
  ];

  const mortgages: Mortgage[] = [
    {
      id: uid(),
      name: 'Home Loan',
      principalBalance: 450000,
      annualInterestRate: 5.89,
      monthlyPayment: 3200,
      annualPaymentIncreasePct: 2,
    },
  ];

  const otherAssets: OtherAsset[] = [
    { id: uid(), name: 'Art Collection', value: 15000, annualGrowthRate: 5 },
  ];

  const realEstate: RealEstate[] = [
    { id: uid(), name: 'Primary Residence', currentValue: 750000, annualGrowthRate: 4, equity: 300000, additionalEquity: 1200, equityCadence: 'monthly' },
    { id: uid(), name: 'Rental Property', currentValue: 420000, annualGrowthRate: 5, equity: 180000, additionalEquity: 800, equityCadence: 'monthly' },
  ];

  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const retirementAccounts: RetirementAccount[] = [
    {
      id: uid(),
      name: 'Fidelity 401k',
      accountType: '401k',
      balance: 185000,
      monthlyContribution: 1875,
      employerMatchPct: 50,
      employerMatchLimit: 11250,
    },
  ];

  const stockOptions: StockOption[] = [
    {
      id: uid(),
      symbol: 'NVDA',
      optionType: 'iso',
      totalOptions: 5000,
      vestedOptions: 1250,
      strikePrice: 45,
      currentPrice: 130,
      vest: {
        startDate: twoYearsAgo.toISOString().split('T')[0],
        cliffMonths: 12,
        durationMonths: 48,
        frequency: 'monthly',
      },
    },
  ];

  const tenYearsFromNow = new Date(now);
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);

  const bonds: Bond[] = [
    {
      id: uid(),
      name: 'US Treasury 10Y',
      faceValue: 50000,
      couponRate: 4.25,
      maturityDate: tenYearsFromNow.toISOString().split('T')[0],
      purchasePrice: 48500,
    },
  ];

  const businesses: Business[] = [
    {
      id: uid(),
      name: 'Angel Investment',
      value: 25000,
      annualGrowthRate: 12,
      isIlliquid: true,
    },
  ];

  const vehicles: Vehicle[] = [
    {
      id: uid(),
      name: '2022 Tesla Model 3',
      currentValue: 32000,
      annualDepreciationRate: 15,
    },
  ];

  const snapshots: Snapshot[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateISO = d.toISOString().split('T')[0];
    const baseNetWorth = 180000 + Math.random() * 10000 + (30 - i) * 200;
    snapshots.push({
      id: uid(),
      dateISO,
      totals: {
        netWorth: Math.round(baseNetWorth),
        stocks: Math.round(45000 + Math.random() * 3000),
        crypto: Math.round(35000 + Math.random() * 5000),
        rsusVested: Math.round(8900 + Math.random() * 500),
        rsusUnvested: Math.round(26700 + Math.random() * 500),
        savings: 37000,
        offset: 35000,
        otherAssets: 15000,
        realEstate: 480000,
        mortgage: 450000,
        retirement: 185000,
        stockOptions: 106250,
        bonds: 48500,
        business: 25000,
        vehicles: 32000,
      },
    });
  }

  return { holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles, snapshots };
}
