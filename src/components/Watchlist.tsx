import React from 'react';
import { Stock } from '../types';
import { X, Trash2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

interface WatchlistProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Stock[];
  onRemove: (symbol: string) => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ isOpen, onClose, watchlist, onRemove }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-brand-bg border-l border-brand-border z-[101] shadow-2xl p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">WATCHLIST</h2>
                <p className="text-zinc-500 text-sm font-medium">{watchlist.length} companies matched</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                id="close-watchlist"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {watchlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-brand-border rounded-full flex items-center justify-center mb-4 text-zinc-600">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nothing here yet</h3>
                  <p className="text-zinc-500 text-sm">Swipe right on stocks you like to build your personal watchlist.</p>
                </div>
              ) : (
                watchlist.map((stock) => (
                  <motion.div
                    layout
                    key={stock.symbol}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-brand-card border border-brand-border group relative transition-all hover:bg-zinc-900/50"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center font-black text-brand-accent text-xs">
                          {stock.symbol[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-brand-accent transition-colors flex items-center">
                            {stock.symbol}
                            <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-50" />
                          </div>
                          <div className="text-xs text-zinc-500 truncate max-w-[150px]">{stock.name}</div>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                        <div>
                          <div className="font-bold">{formatCurrency(stock.price)}</div>
                          <div className={cn(
                            "text-[10px] font-black uppercase flex items-center justify-end",
                            stock.change >= 0 ? "text-brand-success" : "text-brand-danger"
                          )}>
                            {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                          </div>
                        </div>
                        <button
                          onClick={() => onRemove(stock.symbol)}
                          className="p-2 text-zinc-600 hover:text-brand-danger transition-colors opacity-0 group-hover:opacity-100"
                          id={`remove-${stock.symbol}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {watchlist.length > 0 && (
              <div className="mt-8 pt-6 border-t border-brand-border">
                <button 
                  className="w-full py-4 bg-brand-accent hover:bg-blue-600 active:scale-[0.98] transition-all rounded-2xl font-black text-white tracking-widest uppercase text-sm shadow-lg shadow-brand-accent/20"
                  id="trade-now"
                >
                  Confirm Strategy
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
