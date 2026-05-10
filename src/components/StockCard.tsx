import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'motion/react';
import { Stock } from '../types';
import { TrendingUp, TrendingDown, Info, DollarSign, BarChart3, Clock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { cn, formatCurrency } from '../lib/utils';

interface StockCardProps {
  stock: Stock;
  onSwipe: (direction: 'left' | 'right') => void;
  isFront: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, onSwipe, isFront }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  const isPositive = stock.change >= 0;

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity: isFront ? 1 : 0.5,
        scale: isFront ? 1 : 0.95,
        zIndex: isFront ? 50 : 0,
      }}
      drag={isFront ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={cn(
        "absolute w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden bg-brand-card border border-brand-border shadow-2xl cursor-grab active:cursor-grabbing",
        !isFront && "pointer-events-none"
      )}
    >
      {/* Swipe Badges */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-10 left-10 z-50 border-4 border-brand-success rounded-xl px-4 py-1 -rotate-12"
      >
        <span className="text-brand-success text-4xl font-black uppercase">Buy</span>
      </motion.div>

      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-10 right-10 z-50 border-4 border-brand-danger rounded-xl px-4 py-1 rotate-12"
      >
        <span className="text-brand-danger text-4xl font-black uppercase">Sell</span>
      </motion.div>

      {/* Content */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-4xl font-black tracking-tighter text-white">{stock.symbol}</h2>
              <p className="text-zinc-400 font-medium truncate max-w-[200px]">{stock.name}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{formatCurrency(stock.price)}</div>
              <div className={cn(
                "flex items-center justify-end text-sm font-semibold",
                isPositive ? "text-brand-success" : "text-brand-danger"
              )}>
                {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {isPositive ? '+' : ''}{stock.changePercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 min-h-[150px] px-2 py-4 relative group">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stock.history}>
              <defs>
                <linearGradient id={`gradient-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={isPositive ? "#22c55e" : "#ef4444"} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#gradient-${stock.symbol})`} 
                isAnimationActive={false}
              />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
            </AreaChart>
          </ResponsiveContainer>
          
          <div className="absolute bottom-4 left-6 flex space-x-4 opacity-50">
             <div className="flex items-center text-[10px] uppercase tracking-widest font-bold">
               <Clock className="w-3 h-3 mr-1" /> Today
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 grid grid-cols-2 gap-4 my-4">
          <div className="bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
             <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">Market Cap</div>
             <div className="text-sm font-bold text-zinc-200">{stock.marketCap}</div>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
             <div className="text-[10px] text-zinc-500 uppercase font-black mb-1">P/E Ratio</div>
             <div className="text-sm font-bold text-zinc-200">{stock.peRatio}</div>
          </div>
        </div>

        {/* Description / Bio */}
        <div className="px-6 pb-8">
           <div className="flex items-center text-[10px] text-brand-accent uppercase font-black mb-2">
             <Info className="w-3 h-3 mr-1" /> Company Profile
           </div>
           <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
             {stock.description}
           </p>
           
           <div className="mt-4 flex flex-wrap gap-2">
             <span className="px-2 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-md text-[10px] font-bold text-brand-accent uppercase">
               {stock.industry}
             </span>
             {stock.changePercent > 5 && (
               <span className="px-2 py-1 bg-brand-success/10 border border-brand-success/20 rounded-md text-[10px] font-bold text-brand-success uppercase">
                 Hot
               </span>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
};
