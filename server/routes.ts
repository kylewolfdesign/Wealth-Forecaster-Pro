import type { Express } from "express";
import { createServer, type Server } from "node:http";

interface YahooQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
}

interface YahooSearchResponse {
  quotes?: YahooQuote[];
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/search/stocks", async (req, res) => {
    const q = (req.query.q as string || "").trim();
    if (!q) {
      return res.json({ results: [] });
    }

    try {
      const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
      url.searchParams.set("q", q);
      url.searchParams.set("quotesCount", "8");
      url.searchParams.set("newsCount", "0");
      url.searchParams.set("listsCount", "0");
      url.searchParams.set("enableFuzzyQuery", "false");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return res.json({ results: [] });
      }

      const data: YahooSearchResponse = await response.json();
      const quotes = (data.quotes || [])
        .filter((quote) => quote.quoteType === "EQUITY" || quote.quoteType === "ETF")
        .map((quote) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchange,
          quoteType: quote.quoteType,
        }));

      return res.json({ results: quotes });
    } catch {
      return res.json({ results: [] });
    }
  });

  app.get("/api/price/stock/:symbol", async (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return res.status(404).json({ error: `Price not found for ${symbol}` });
      }

      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;

      if (price == null) {
        return res.status(404).json({ error: `Price not available for ${symbol}` });
      }

      return res.json({ symbol, price });
    } catch {
      return res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
