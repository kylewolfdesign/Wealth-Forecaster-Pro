export type Currency = 'USD' | 'AUD' | 'GBP' | 'EUR' | 'CAD' | 'JPY' | 'NZD' | 'CHF' | 'HKD' | 'SGD' | 'INR';

export const CURRENCIES: { code: Currency; name: string; symbol: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
];

export const CURRENCY_PICKER_ITEMS = CURRENCIES.map(c => ({
  label: `${c.symbol} ${c.code} — ${c.name}`,
  value: c.code,
}));

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCIES.find(c => c.code === currency)?.symbol ?? '$';
}

export function getCurrencyName(currency: Currency): string {
  return CURRENCIES.find(c => c.code === currency)?.name ?? currency;
}

// rates are relative to USD (1 USD = X of that currency)
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return amount * (toRate / fromRate);
}

export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  if (!response.ok) throw new Error('Failed to fetch exchange rates');
  const data = await response.json();
  return { ...(data.rates as Record<string, number>), USD: 1 };
}

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1, AUD: 1.55, GBP: 0.79, EUR: 0.92, CAD: 1.36,
  JPY: 149.5, NZD: 1.66, CHF: 0.90, HKD: 7.82, SGD: 1.34, INR: 83.1,
};
