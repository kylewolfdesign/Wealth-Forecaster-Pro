import {
  Holding, RSUGrant, CashAccount, Mortgage, OtherAsset,
  Settings, SnapshotTotals, ForecastPoint,
} from './types';
import { getInstantPrice } from './price-service';

export function computeHoldingValue(h: Holding): number {
  const price = getInstantPrice(h.symbol, h.type, h.manualPrice);
  return h.shares * price;
}

export function computeRSUVesting(grant: RSUGrant, atDate: Date): { vested: number; unvested: number } {
  const startDate = new Date(grant.vest.startDate);
  const monthsElapsed = (atDate.getFullYear() - startDate.getFullYear()) * 12 +
    (atDate.getMonth() - startDate.getMonth());

  if (monthsElapsed < 0) {
    return { vested: grant.alreadyVestedShares, unvested: grant.totalShares - grant.alreadyVestedShares };
  }

  if (monthsElapsed < grant.vest.cliffMonths) {
    return { vested: grant.alreadyVestedShares, unvested: grant.totalShares - grant.alreadyVestedShares };
  }

  const vestableShares = grant.totalShares - grant.alreadyVestedShares;
  const vestIntervalMonths = grant.vest.frequency === 'monthly' ? 1 : grant.vest.frequency === 'quarterly' ? 3 : 12;
  const totalVestPeriods = Math.floor(
    (grant.vest.durationMonths - grant.vest.cliffMonths) / vestIntervalMonths
  );

  if (totalVestPeriods <= 0) {
    return { vested: grant.totalShares, unvested: 0 };
  }

  const sharesPerPeriod = vestableShares / totalVestPeriods;
  const periodsElapsed = Math.min(
    Math.floor((monthsElapsed - grant.vest.cliffMonths) / vestIntervalMonths) + 1,
    totalVestPeriods
  );

  const vestedFromSchedule = Math.min(periodsElapsed * sharesPerPeriod, vestableShares);
  const totalVested = Math.min(grant.alreadyVestedShares + vestedFromSchedule, grant.totalShares);

  return {
    vested: totalVested,
    unvested: grant.totalShares - totalVested,
  };
}

export function computeMortgageBalance(mortgage: Mortgage, monthsFromNow: number): number {
  let balance = mortgage.principalBalance;
  let monthlyPayment = mortgage.monthlyPayment;
  const monthlyRate = mortgage.annualInterestRate / 100 / 12;

  for (let m = 0; m < monthsFromNow; m++) {
    if (m > 0 && m % 12 === 0 && mortgage.annualPaymentIncreasePct) {
      monthlyPayment *= 1 + mortgage.annualPaymentIncreasePct / 100;
    }

    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;

    if (principal <= 0) break;

    balance -= principal;
    if (balance <= 0) {
      balance = 0;
      break;
    }
  }

  return Math.max(balance, 0);
}

export function computeCurrentTotals(
  holdings: Holding[],
  rsuGrants: RSUGrant[],
  cashAccounts: CashAccount[],
  mortgages: Mortgage[],
  otherAssets: OtherAsset[],
): SnapshotTotals {
  const now = new Date();

  const stockHoldings = holdings.filter((h) => h.type === 'stock');
  const cryptoHoldings = holdings.filter((h) => h.type === 'crypto');
  const savingsAccounts = cashAccounts.filter((c) => c.type === 'savings');
  const offsetAccounts = cashAccounts.filter((c) => c.type === 'offset');

  const stocks = stockHoldings.reduce((sum, h) => sum + computeHoldingValue(h), 0);
  const crypto = cryptoHoldings.reduce((sum, h) => sum + computeHoldingValue(h), 0);

  let rsusVested = 0;
  let rsusUnvested = 0;
  for (const grant of rsuGrants) {
    const { vested, unvested } = computeRSUVesting(grant, now);
    const price = getInstantPrice(grant.symbol, 'stock');
    rsusVested += vested * price;
    rsusUnvested += unvested * price;
  }

  const savings = savingsAccounts.reduce((sum, c) => sum + c.balance, 0);
  const offset = offsetAccounts.reduce((sum, c) => sum + c.balance, 0);
  const otherTotal = otherAssets.reduce((sum, a) => sum + a.value, 0);
  const mortgageTotal = mortgages.reduce((sum, m) => sum + m.principalBalance, 0);

  const totalAssets = stocks + crypto + rsusVested + rsusUnvested + savings + offset + otherTotal;
  const netWorth = totalAssets - mortgageTotal;

  return {
    netWorth,
    stocks,
    crypto,
    rsusVested,
    rsusUnvested,
    savings,
    offset,
    otherAssets: otherTotal,
    mortgage: mortgageTotal,
  };
}

function growMonthly(value: number, annualPct: number, months: number): number {
  const monthlyRate = Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  return value * Math.pow(1 + monthlyRate, months);
}

function growWithContributions(
  balance: number,
  monthlyContribution: number,
  annualPct: number,
  months: number,
): number {
  const monthlyRate = Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  let result = balance;
  for (let m = 0; m < months; m++) {
    result = result * (1 + monthlyRate) + monthlyContribution;
  }
  return result;
}

export function computeForecast(
  holdings: Holding[],
  rsuGrants: RSUGrant[],
  cashAccounts: CashAccount[],
  mortgages: Mortgage[],
  otherAssets: OtherAsset[],
  settings: Settings,
  maxYears: number = 50,
): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const now = new Date();
  const totals = computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets);
  const inflationMultiplier = (months: number) =>
    settings.showRealReturns
      ? 1 / Math.pow(1 + settings.inflationPct / 100, months / 12)
      : 1;

  points.push({
    monthsFromNow: 0,
    date: now.toISOString(),
    netWorth: totals.netWorth,
    breakdown: {
      stocks: totals.stocks,
      crypto: totals.crypto,
      rsus: totals.rsusVested + totals.rsusUnvested,
      savings: totals.savings,
      offset: totals.offset,
      otherAssets: totals.otherAssets,
      mortgage: totals.mortgage,
    },
  });

  const intervals: number[] = [];
  for (let m = 1; m <= Math.min(maxYears * 12, 60); m++) {
    intervals.push(m);
  }
  for (let m = 72; m <= maxYears * 12; m += 12) {
    intervals.push(m);
  }

  for (const months of intervals) {
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + months);
    const realAdj = inflationMultiplier(months);

    let stocksVal = 0;
    for (const h of holdings) {
      if (h.type === 'stock') {
        const rate = h.growthOverride ?? settings.stockGrowthPct;
        stocksVal += growMonthly(computeHoldingValue(h), rate, months);
      }
    }

    let cryptoVal = 0;
    for (const h of holdings) {
      if (h.type === 'crypto') {
        const rate = h.growthOverride ?? settings.cryptoGrowthPct;
        cryptoVal += growMonthly(computeHoldingValue(h), rate, months);
      }
    }

    let rsusVal = 0;
    for (const grant of rsuGrants) {
      const { vested } = computeRSUVesting(grant, futureDate);
      const price = getInstantPrice(grant.symbol, 'stock');
      const rate = grant.growthOverride ?? settings.rsuGrowthPct;
      rsusVal += growMonthly(vested * price, rate, months);
    }

    let savingsVal = 0;
    let offsetVal = 0;
    for (const ca of cashAccounts) {
      const rate = ca.annualInterestRate ?? settings.cashGrowthPct;
      const val = growWithContributions(ca.balance, ca.monthlyContribution, rate, months);
      if (ca.type === 'savings') savingsVal += val;
      else offsetVal += val;
    }

    let otherVal = 0;
    for (const a of otherAssets) {
      const rate = a.annualGrowthRate ?? 0;
      otherVal += growMonthly(a.value, rate, months);
    }

    let mortgageVal = 0;
    for (const m of mortgages) {
      mortgageVal += computeMortgageBalance(m, months);
    }

    const totalAssets = stocksVal + cryptoVal + rsusVal + savingsVal + offsetVal + otherVal;
    const netWorth = (totalAssets - mortgageVal) * realAdj;

    points.push({
      monthsFromNow: months,
      date: futureDate.toISOString(),
      netWorth,
      breakdown: {
        stocks: stocksVal * realAdj,
        crypto: cryptoVal * realAdj,
        rsus: rsusVal * realAdj,
        savings: savingsVal * realAdj,
        offset: offsetVal * realAdj,
        otherAssets: otherVal * realAdj,
        mortgage: mortgageVal * realAdj,
      },
    });
  }

  return points;
}
