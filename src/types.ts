export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: string;
  description: string;
  industry: string;
  history: { time: string; price: number }[];
}

export type SwipeDirection = 'left' | 'right' | 'up' | null;
