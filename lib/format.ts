import { Currency, getCurrencySymbol } from './currency';

export function formatCurrency(value: number, currency: Currency = 'USD'): string {
  const symbol = getCurrencySymbol(currency);
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000_000).toFixed(2)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${symbol}${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 10_000) {
    return `${sign}${symbol}${(absValue / 1_000).toFixed(1)}K`;
  }

  return `${sign}${symbol}${absValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrencyFull(value: number, currency: Currency = 'USD'): string {
  const symbol = getCurrencySymbol(currency);
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatShares(value: number): string {
  if (value % 1 === 0) return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function formatDate(dateISO: string): string {
  const d = new Date(dateISO);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateISO: string): string {
  const d = new Date(dateISO);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
