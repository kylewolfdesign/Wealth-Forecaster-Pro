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

const MOCK_STOCK_PRICES: Record<string, number> = {
  AAPL: 198.50,
  GOOGL: 178.25,
  GOOG: 179.80,
  MSFT: 425.30,
  AMZN: 195.75,
  META: 510.20,
  TSLA: 245.60,
  NVDA: 875.40,
  NFLX: 620.15,
  DIS: 112.80,
  JPM: 198.40,
  V: 285.60,
  MA: 468.90,
  WMT: 172.30,
  PG: 168.50,
  JNJ: 158.20,
  UNH: 525.40,
  HD: 365.70,
  BAC: 38.25,
  XOM: 108.50,
  SPY: 520.00,
  QQQ: 445.00,
  VTI: 265.00,
  VOO: 478.00,
};

function generateMockPrice(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash + symbol.charCodeAt(i)) | 0;
  }
  return 50 + Math.abs(hash % 500);
}

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coinId) return null;

  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data[coinId]?.usd ?? null;
  } catch {
    return null;
  }
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

    const knownPrice = MOCK_STOCK_PRICES[symbol.toUpperCase()];
    if (knownPrice) {
      return { price: knownPrice, asOfISO: now };
    }

    return { price: generateMockPrice(symbol), asOfISO: now };
  },
};

export function getInstantPrice(symbol: string, type: 'stock' | 'crypto', manualPrice?: number): number {
  if (manualPrice != null && manualPrice > 0) return manualPrice;
  if (type === 'crypto') {
    const coinPrices: Record<string, number> = {
      BTC: 67500, ETH: 3450, SOL: 175, DOGE: 0.165, ADA: 0.62,
      DOT: 7.8, XRP: 0.58, BNB: 605, LTC: 82, LINK: 18.5,
      AVAX: 38, UNI: 12.5, ATOM: 9.2, NEAR: 7.5, APT: 9.8,
      ARB: 1.15, OP: 2.4, SUI: 1.65,
    };
    return coinPrices[symbol.toUpperCase()] ?? 10;
  }
  return MOCK_STOCK_PRICES[symbol.toUpperCase()] ?? generateMockPrice(symbol);
}
