import {
  Holding, RSUGrant, CashAccount, Mortgage, OtherAsset, RealEstate,
  RetirementAccount, StockOption, Bond, Business, Vehicle,
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

export function computeStockOptionVesting(option: StockOption, atDate: Date): { vested: number; unvested: number } {
  const startDate = new Date(option.vest.startDate);
  const monthsElapsed = (atDate.getFullYear() - startDate.getFullYear()) * 12 +
    (atDate.getMonth() - startDate.getMonth());

  if (monthsElapsed < 0) {
    return { vested: option.vestedOptions, unvested: option.totalOptions - option.vestedOptions };
  }

  if (monthsElapsed < option.vest.cliffMonths) {
    return { vested: option.vestedOptions, unvested: option.totalOptions - option.vestedOptions };
  }

  const vestableOptions = option.totalOptions - option.vestedOptions;
  const vestIntervalMonths = option.vest.frequency === 'monthly' ? 1 : option.vest.frequency === 'quarterly' ? 3 : 12;
  const totalVestPeriods = Math.floor(
    (option.vest.durationMonths - option.vest.cliffMonths) / vestIntervalMonths
  );

  if (totalVestPeriods <= 0) {
    return { vested: option.totalOptions, unvested: 0 };
  }

  const optionsPerPeriod = vestableOptions / totalVestPeriods;
  const periodsElapsed = Math.min(
    Math.floor((monthsElapsed - option.vest.cliffMonths) / vestIntervalMonths) + 1,
    totalVestPeriods
  );

  const vestedFromSchedule = Math.min(periodsElapsed * optionsPerPeriod, vestableOptions);
  const totalVested = Math.min(option.vestedOptions + vestedFromSchedule, option.totalOptions);

  return {
    vested: totalVested,
    unvested: option.totalOptions - totalVested,
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
  realEstate: RealEstate[] = [],
  retirementAccounts: RetirementAccount[] = [],
  stockOptions: StockOption[] = [],
  bonds: Bond[] = [],
  businesses: Business[] = [],
  vehicles: Vehicle[] = [],
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
  const realEstateTotal = realEstate.reduce((sum, r) => sum + (r.equity ?? r.currentValue), 0);
  const mortgageTotal = mortgages.reduce((sum, m) => sum + m.principalBalance, 0);

  const retirementTotal = retirementAccounts.reduce((sum, a) => sum + a.balance, 0);

  let stockOptionsTotal = 0;
  for (const opt of stockOptions) {
    const { vested } = computeStockOptionVesting(opt, now);
    const price = opt.currentPrice ?? getInstantPrice(opt.symbol, 'stock');
    const intrinsicValue = Math.max(price - opt.strikePrice, 0) * vested;
    stockOptionsTotal += intrinsicValue;
  }

  const bondsTotal = bonds.reduce((sum, b) => sum + (b.purchasePrice ?? b.faceValue), 0);
  const businessTotal = businesses.reduce((sum, b) => sum + b.value, 0);
  const vehiclesTotal = vehicles.reduce((sum, v) => sum + v.currentValue, 0);

  const totalAssets = stocks + crypto + rsusVested + rsusUnvested + savings + offset +
    otherTotal + realEstateTotal + retirementTotal + stockOptionsTotal + bondsTotal +
    businessTotal + vehiclesTotal;
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
    realEstate: realEstateTotal,
    mortgage: mortgageTotal,
    retirement: retirementTotal,
    stockOptions: stockOptionsTotal,
    bonds: bondsTotal,
    business: businessTotal,
    vehicles: vehiclesTotal,
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
  realEstate: RealEstate[] = [],
  retirementAccounts: RetirementAccount[] = [],
  stockOptions: StockOption[] = [],
  bonds: Bond[] = [],
  businesses: Business[] = [],
  vehicles: Vehicle[] = [],
): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  const now = new Date();
  const totals = computeCurrentTotals(holdings, rsuGrants, cashAccounts, mortgages, otherAssets, realEstate, retirementAccounts, stockOptions, bonds, businesses, vehicles);
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
      realEstate: totals.realEstate,
      mortgage: totals.mortgage,
      retirement: totals.retirement,
      stockOptions: totals.stockOptions,
      bonds: totals.bonds,
      business: totals.business,
      vehicles: totals.vehicles,
    },
  });

  const totalMonths = maxYears * 12;
  const step = totalMonths <= 24 ? 1 : totalMonths <= 120 ? 3 : 6;
  const intervals: number[] = [];
  for (let m = step; m <= totalMonths; m += step) {
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

    let realEstateVal = 0;
    for (const r of realEstate) {
      const rate = r.annualGrowthRate ?? 0;
      const equityBase = r.equity ?? r.currentValue;
      const addEquity = r.additionalEquity ?? 0;
      let monthlyContribution = 0;
      if (addEquity > 0) {
        const cadence = r.equityCadence ?? 'monthly';
        if (cadence === 'monthly') monthlyContribution = addEquity;
        else if (cadence === 'quarterly') monthlyContribution = addEquity / 3;
        else monthlyContribution = addEquity / 12;
      }
      realEstateVal += growWithContributions(equityBase, monthlyContribution, rate, months);
    }

    let mortgageVal = 0;
    for (const m of mortgages) {
      mortgageVal += computeMortgageBalance(m, months);
    }

    let retirementVal = 0;
    for (const acct of retirementAccounts) {
      const totalMonthlyContrib = acct.monthlyContribution +
        (acct.employerMatchPct ? Math.min(
          acct.monthlyContribution * (acct.employerMatchPct / 100),
          (acct.employerMatchLimit ?? Infinity) / 12
        ) : 0);
      retirementVal += growWithContributions(acct.balance, totalMonthlyContrib, settings.retirementGrowthPct, months);
    }

    let stockOptionsVal = 0;
    for (const opt of stockOptions) {
      const { vested } = computeStockOptionVesting(opt, futureDate);
      const price = opt.currentPrice ?? getInstantPrice(opt.symbol, 'stock');
      const projectedPrice = growMonthly(price, settings.stockGrowthPct, months);
      const intrinsicValue = Math.max(projectedPrice - opt.strikePrice, 0) * vested;
      stockOptionsVal += intrinsicValue;
    }

    let bondsVal = 0;
    for (const b of bonds) {
      const maturity = new Date(b.maturityDate);
      const monthsToMaturity = (maturity.getFullYear() - now.getFullYear()) * 12 + (maturity.getMonth() - now.getMonth());
      if (months >= monthsToMaturity) {
        bondsVal += b.faceValue;
      } else {
        const currentVal = b.purchasePrice ?? b.faceValue;
        bondsVal += growMonthly(currentVal, b.couponRate, months);
      }
    }

    let businessVal = 0;
    for (const biz of businesses) {
      const rate = biz.annualGrowthRate ?? 0;
      businessVal += growMonthly(biz.value, rate, months);
    }

    let vehiclesVal = 0;
    for (const v of vehicles) {
      const rate = -(v.annualDepreciationRate ?? 15);
      vehiclesVal += Math.max(growMonthly(v.currentValue, rate, months), 0);
    }

    const totalAssets = stocksVal + cryptoVal + rsusVal + savingsVal + offsetVal + otherVal +
      realEstateVal + retirementVal + stockOptionsVal + bondsVal + businessVal + vehiclesVal;
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
        realEstate: realEstateVal * realAdj,
        mortgage: mortgageVal * realAdj,
        retirement: retirementVal * realAdj,
        stockOptions: stockOptionsVal * realAdj,
        bonds: bondsVal * realAdj,
        business: businessVal * realAdj,
        vehicles: vehiclesVal * realAdj,
      },
    });
  }

  return points;
}
