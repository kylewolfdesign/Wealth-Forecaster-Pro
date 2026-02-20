import * as Crypto from 'expo-crypto';
import { Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, Snapshot } from './types';

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
    { id: uid(), name: 'Car', value: 28000, annualGrowthRate: -10 },
    { id: uid(), name: 'Art Collection', value: 15000, annualGrowthRate: 5 },
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
        otherAssets: 43000,
        mortgage: 450000,
      },
    });
  }

  return { holdings, rsuGrants, cashAccounts, mortgages, otherAssets, snapshots };
}
