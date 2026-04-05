import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

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

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message || "Invalid input";
        return res.status(400).json({ message: firstError });
      }

      const { email, password, rememberMe } = parsed.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ email, hashedPassword });

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) return reject(err);
          if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
          }
          req.session.userId = user.id;
          req.session.save((saveErr) => {
            if (saveErr) return reject(saveErr);
            resolve();
          });
        });
      });

      return res.status(201).json({
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message || "Invalid input";
        return res.status(400).json({ message: firstError });
      }

      const { email, password, rememberMe } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.hashedPassword);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) return reject(err);
          if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
          }
          req.session.userId = user.id;
          req.session.save((saveErr) => {
            if (saveErr) return reject(saveErr);
            resolve();
          });
        });
      });

      return res.json({
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updatePassword(user.id, hashedPassword);

      return res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/portfolio", requireAuth, async (req, res) => {
    try {
      const data = await storage.getPortfolioData(req.session.userId!);
      return res.json({ data });
    } catch (error) {
      console.error("Get portfolio error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/portfolio", requireAuth, async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ message: "Invalid portfolio data" });
      }
      await storage.updatePortfolioData(req.session.userId!, req.body);
      return res.json({ message: "Portfolio saved" });
    } catch (error) {
      console.error("Save portfolio error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

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
