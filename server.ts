import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pkg from 'yahoo-finance2';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

const { YahooFinance } = pkg as any;
const yahooFinance = new YahooFinance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In newer versions, we might need to instantiate if the default export isn't working as expected in ESM
// Or ensure we are using the sub-module correctly. 
// However, the error suggests calling `new YahooFinance()`.
// Let's try to use the provided singleton but if that fails, we can try to find the constructor.

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cache for stock data to avoid hitting Yahoo Finance too hard
  let stockCache: any = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

  // SEC Edgar caching
  let cikMap: Record<string, string> | null = null;
  const secHeaders = {
    'User-Agent': 'StockSwipe App reid@example.com',
    'Accept-Encoding': 'gzip, deflate'
  };

  async function getCikMap() {
    if (cikMap) return cikMap;
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', { headers: secHeaders });
      const data = await res.json();
      cikMap = {};
      Object.values(data).forEach((company: any) => {
        // Pad CIK to 10 digits as required by the CompanyFacts API
        cikMap![company.ticker.toUpperCase()] = String(company.cik_str).padStart(10, '0');
      });
      return cikMap;
    } catch (error) {
      console.error("Failed to fetch CIK map:", error);
      return {};
    }
  }

  // API Routes
  app.get("/api/stocks", async (req, res) => {
    const now = Date.now();
    if (stockCache && (now - lastFetchTime < CACHE_DURATION)) {
      return res.json(stockCache);
    }

    try {
      const tickers = [
        'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 
        'NFLX', 'DIS', 'AMD', 'COIN', 'MSTR', 'PLTR', 'SNOW', 'ABNB'
      ];
      
      const stocksData = await Promise.all(tickers.map(async (symbol) => {
        try {
          // Fetch current quote and last 30 days of history
          const quote: any = await yahooFinance.quote(symbol);
          
          // For history, we'll get last 20 elements (approx 1 month of trading days)
          const chart: any = await yahooFinance.chart(symbol, { 
            period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
            interval: '1d' 
          });

          const history = chart.quotes.map((q: any) => ({
            time: new Date(q.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: q.close || q.adjclose || 0
          })).filter((h: any) => h.price > 0).slice(-20);

          return {
            symbol: quote.symbol,
            name: quote.longName || quote.shortName || symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
            marketCap: formatCompact(quote.marketCap),
            peRatio: quote.trailingPE?.toFixed(1) || 'N/A',
            industry: quote.industry || 'Tech/Mixed',
            description: quote.longBusinessSummary || 'Company profile unavailable.',
            history: history
          };
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return null;
        }
      }));

      const filteredData = stocksData.filter(Boolean);
      stockCache = filteredData;
      lastFetchTime = now;
      
      res.json(filteredData);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  function formatCompact(value?: number) {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  // SEC Edgar Financials API Database
  app.get("/api/financials/:ticker", async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    try {
      const cacheRef = doc(db, 'financialsCache', ticker);
      const cacheSnap = await getDoc(cacheRef);
      
      if (cacheSnap.exists()) {
        const data = cacheSnap.data();
        const updatedAt = new Date(data.updatedAt).getTime();
        // Return if fetched in the last 24 hours
        if (Date.now() - updatedAt < 1000 * 60 * 60 * 24) {
          return res.json(data);
        }
      }

      const map = await getCikMap();
      const cik = map[ticker];
      if (!cik) {
        return res.status(404).json({ error: "Ticker not found in SEC database" });
      }

      const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
      const response = await fetch(url, { headers: secHeaders });
      
      if (!response.ok) {
        throw new Error(`SEC API returned status: ${response.status}`);
      }

      const rawFacts = await response.json();
      
      // Extract a basic financial summary from US-GAAP values
      const usGaap = rawFacts.facts?.['us-gaap'] || {};
      
      // Helper to get latest annual fact
      const getLatestAnnual = (concept: string) => {
         const data = usGaap[concept]?.units?.USD || [];
         const annuals = data.filter((d: any) => d.form === '10-K');
         if (!annuals.length) return null;
         annuals.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
         return annuals[0]?.val || null;
      };

      const financials = {
        ticker,
        companyName: rawFacts.entityName || '',
        cik,
        netIncome: getLatestAnnual('NetIncomeLoss'),
        revenues: getLatestAnnual('Revenues') || getLatestAnnual('SalesRevenueNet'),
        assets: getLatestAnnual('Assets'),
        liabilities: getLatestAnnual('Liabilities'),
        updatedAt: new Date().toISOString()
      };

      // Ensure no undefined values which Firebase rejects. Replace nulls or undefined with missing or remove.
      const cleanedFinancials = Object.fromEntries(Object.entries(financials).filter(([_, v]) => v != null));

      try {
        await setDoc(cacheRef, cleanedFinancials, { merge: true });
      } catch (e) {
        console.error("Cache write error:", e);
      }

      res.json(cleanedFinancials);
    } catch (error) {
      console.error(`Failed to fetch financials for ${ticker}:`, error);
      res.status(500).json({ error: "Failed to fetch SEC financial data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
