import { fetch } from 'expo/fetch';
import { getApiUrl } from './query-client';

export interface PriceQuote {
  price: number;
  asOfISO: string;
}

export interface PriceService {
  getQuote(symbol: string, type: 'stock' | 'crypto'): Promise<PriceQuote>;
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  XRP: 'ripple',
  BNB: 'binancecoin',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
};

const stockPriceCache = new Map<string, { price: number; fetchedAt: number }>();
const cryptoPriceCache = new Map<string, { price: number; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const upper = symbol.toUpperCase();
  const coinId = COINGECKO_IDS[upper];
  if (!coinId) return null;

  const cached = cryptoPriceCache.get(upper);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const price = data[coinId]?.usd ?? null;
    if (price !== null) {
      cryptoPriceCache.set(upper, { price, fetchedAt: Date.now() });
    }
    return price;
  } catch {
    return null;
  }
}

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  const upper = symbol.toUpperCase();
  const cached = stockPriceCache.get(upper);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const baseUrl = getApiUrl();
    const url = new URL(`/api/price/stock/${encodeURIComponent(upper)}`, baseUrl);
    const resp = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.price != null) {
      stockPriceCache.set(upper, { price: data.price, fetchedAt: Date.now() });
      return data.price;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchMultipleStockPrices(symbols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const upper = sym.toUpperCase();
    const cached = stockPriceCache.get(upper);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      results[upper] = cached.price;
    } else {
      toFetch.push(upper);
    }
  }

  const fetches = toFetch.map(async (sym) => {
    const price = await fetchStockPrice(sym);
    if (price != null) {
      results[sym] = price;
    }
  });

  await Promise.all(fetches);
  return results;
}

export async function fetchMultiplePrices(
  symbols: { symbol: string; type: 'stock' | 'crypto' }[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const fetches = symbols.map(async ({ symbol, type }) => {
    const upper = symbol.toUpperCase();
    if (type === 'crypto') {
      const price = await fetchCryptoPrice(upper);
      if (price != null) {
        results[upper] = price;
      }
    } else {
      const price = await fetchStockPrice(upper);
      if (price != null) {
        results[upper] = price;
      }
    }
  });

  await Promise.all(fetches);
  return results;
}

export const priceService: PriceService = {
  async getQuote(symbol: string, type: 'stock' | 'crypto'): Promise<PriceQuote> {
    const now = new Date().toISOString();

    if (type === 'crypto') {
      const price = await fetchCryptoPrice(symbol);
      if (price !== null) {
        return { price, asOfISO: now };
      }
    }

    if (type === 'stock') {
      const price = await fetchStockPrice(symbol);
      if (price !== null) {
        return { price, asOfISO: now };
      }
    }

    return { price: 0, asOfISO: now };
  },
};

export function getInstantPrice(
  symbol: string,
  type: 'stock' | 'crypto',
  manualPrice?: number,
  priceSource?: 'live' | 'manual',
): number {
  // Explicitly manual holdings are pinned to the user's entered price.
  if (priceSource === 'manual' && manualPrice != null && manualPrice > 0) {
    return manualPrice;
  }

  // Live pricing: prefer the fetched market price, fall back to the
  // last-known price captured at entry time. Never invent a price.
  const upper = symbol.toUpperCase();
  const cache = type === 'crypto' ? cryptoPriceCache : stockPriceCache;
  const cached = cache.get(upper);
  if (cached) {
    return cached.price;
  }

  if (manualPrice != null && manualPrice > 0) return manualPrice;
  return 0;
}
