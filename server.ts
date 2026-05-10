import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pkg from 'yahoo-finance2';

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
