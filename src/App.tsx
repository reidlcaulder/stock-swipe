import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { MOCK_STOCKS } from './constants';
import { StockCard } from './components/StockCard';
import { Watchlist } from './components/Watchlist';
import { Stock } from './types';
import { Heart, X, List, Github, TrendingUp, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real stocks from our new API
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/stocks');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (data && data.length > 0) {
          setStocks(data.sort(() => Math.random() - 0.5));
        } else {
          setStocks([...MOCK_STOCKS]);
        }
      } catch (error) {
        console.error("Using mock data due to API error:", error);
        setStocks([...MOCK_STOCKS].sort(() => Math.random() - 0.5));
      } finally {
        setIsLoading(false);
      }
    };
    fetchStocks();
  }, []);

  const currentStock = stocks[0];

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (!currentStock) return;

    if (direction === 'right') {
      if (!watchlist.find(s => s.symbol === currentStock.symbol)) {
        setWatchlist(prev => [currentStock, ...prev]);
      }
    }

    setStocks(prev => prev.slice(1));
    setAnalysis(null);
    setShowAnalysis(false);
  }, [currentStock, watchlist]);

  const removeLastStock = useCallback(() => {
     handleSwipe('left');
  }, [handleSwipe]);

  const likeCurrentStock = useCallback(() => {
     handleSwipe('right');
  }, [handleSwipe]);

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s.symbol !== symbol));
  };

  const analyzeStock = async () => {
    if (!currentStock) return;
    setIsAnalyzing(true);
    setShowAnalysis(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze ${currentStock.name} (${currentStock.symbol}) as if you were a quick Tinder-style bio. 
        Current Price: $${currentStock.price}. Market Cap: ${currentStock.marketCap}. 
        Provide a 2-sentence summary: one sentence on their "vibe" (what they do) and one sentence on why someone might "swipe right" (bull case) or "swipe left" (bear case). Keep it punchy and personality-driven. 
        Format as: "VIBE: ... \nDRIVE: ..."`,
      });
      setAnalysis(response.text || "Couldn't get info right now.");
    } catch (error) {
      console.error(error);
      setAnalysis("AI Analysis unavailable. Focus on the numbers!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset if we run out of stocks (infinitely loop for this demo)
  useEffect(() => {
    if (stocks.length === 0) {
      setStocks([...MOCK_STOCKS].sort(() => Math.random() - 0.5));
    }
  }, [stocks]);

  return (
    <div className="flex flex-col h-screen bg-brand-bg select-none relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-accent/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-accent/10 blur-[100px] rounded-full" />
      <div className="absolute top-1/2 -right-24 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-[80] px-6 py-8 flex justify-between items-center bg-brand-bg/80 backdrop-blur-md border-b border-brand-border/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center rotate-12 shadow-lg shadow-brand-accent/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white">StockSwipe</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsWatchlistOpen(true)}
            className="group flex items-center space-x-2 bg-brand-card hover:bg-zinc-800 transition-all border border-brand-border px-4 py-2 rounded-xl text-sm font-bold active:scale-95"
            id="open-watchlist"
          >
            <List className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="text-zinc-300 group-hover:text-white transition-colors">Watchlist</span>
            {watchlist.length > 0 && (
              <span className="bg-brand-accent text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                {watchlist.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Card Stack Area */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-8 px-6 relative">
        <div className="relative w-full max-w-sm aspect-[9/16] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Tapping into Markets...</p>
            </div>
          ) : (
            <AnimatePresence>
              {stocks.slice(0, 2).reverse().map((stock, index) => (
                <StockCard 
                  key={stock.symbol}
                  stock={stock}
                  onSwipe={handleSwipe}
                  isFront={index === 1 || (index === 0 && stocks.length === 1)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* AI Analysis Modal/Overlay */}
        <AnimatePresence>
          {showAnalysis && currentStock && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-6 right-6 z-[60] bg-brand-card/95 backdrop-blur-xl border border-brand-accent/30 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-brand-accent/20 rounded flex items-center justify-center">
                  <Info className="w-3.5 h-3.5 text-brand-accent" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-accent">AI Insight: {currentStock.symbol}</h4>
              </div>
              
              {isAnalyzing ? (
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
                </div>
              ) : (
                <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                  {analysis}
                </p>
              )}
              
              <button 
                onClick={() => setShowAnalysis(false)}
                className="mt-4 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors"
              >
                Close Insight
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center space-x-6">
          <button 
            onClick={removeLastStock}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-brand-card border border-brand-danger/20 text-brand-danger hover:bg-brand-danger hover:text-white transition-all shadow-xl active:scale-90"
            id="swipe-left-btn"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button 
            onClick={analyzeStock}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-card border border-brand-accent/20 text-brand-accent hover:bg-brand-accent hover:text-white transition-all shadow-xl active:scale-90"
            id="info-btn"
          >
            <Info className="w-6 h-6" />
          </button>
          
          <button 
            onClick={likeCurrentStock}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-brand-card border border-brand-success/20 text-brand-success hover:bg-brand-success hover:text-white transition-all shadow-xl active:scale-90"
            id="swipe-right-btn"
          >
            <Heart className="w-8 h-8 fill-current" />
          </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-6 px-6 flex justify-center items-center">
        <p className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase flex items-center">
          Powered by Gemini 3.0 & Recharts
        </p>
      </footer>

      {/* Watchlist Drawer */}
      <Watchlist 
        isOpen={isWatchlistOpen} 
        onClose={() => setIsWatchlistOpen(false)}
        watchlist={watchlist}
        onRemove={removeFromWatchlist}
      />
    </div>
  );
}

