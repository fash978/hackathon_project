import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Transaction } from '../types';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

interface CashflowChartProps {
  transactions: Transaction[];
  initialBalance: number;
  activeCurrencySymbol: string;
  activeCurrencyCode: string;
  activeExchangeRate: number;
}

export default function CashflowChart({ 
  transactions, 
  initialBalance,
  activeCurrencySymbol,
  activeCurrencyCode,
  activeExchangeRate
}: CashflowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Try measuring initially
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setChartWidth(Math.floor(rect.width));
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setChartWidth(Math.floor(width));
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const chartData = useMemo(() => {
    // Determine the min and max dates in our provided transactions
    let minYearMonth = '';
    let maxYearMonth = '';

    if (transactions.length > 0) {
      const validDates = transactions
        .map(t => t.date)
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      
      if (validDates.length > 0) {
        const sorted = [...validDates].sort();
        minYearMonth = sorted[0].substring(0, 7); // "YYYY-MM"
        maxYearMonth = sorted[sorted.length - 1].substring(0, 7);
      }
    }

    // Default parameters if data is empty 
    if (!minYearMonth || !maxYearMonth) {
      const now = new Date();
      const startD = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const endD = new Date(now.getFullYear(), now.getMonth() + 6, 1);
      minYearMonth = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`;
      maxYearMonth = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}`;
    }

    // Parse years and months and generate all months between min and max matching user data
    const startYear = parseInt(minYearMonth.split('-')[0]);
    const startMonth = parseInt(minYearMonth.split('-')[1]);
    const endYear = parseInt(maxYearMonth.split('-')[0]);
    const endMonth = parseInt(maxYearMonth.split('-')[1]);

    const months: { key: string; label: string; monthLabel: string }[] = [];
    let curYear = startYear;
    let curMonth = startMonth;

    // Safety limit of 36 months map to prevent infinite looping
    let iterations = 0;
    while ((curYear < endYear || (curYear === endYear && curMonth <= endMonth)) && iterations < 36) {
      const padMonth = String(curMonth).padStart(2, '0');
      const yearMonthKey = `${curYear}-${padMonth}`;
      
      const dateObj = new Date(curYear, curMonth - 1, 1);
      const labelShort = dateObj.toLocaleDateString(undefined, { month: 'short' });
      const displayLabel = startYear === endYear ? labelShort : `${labelShort} '${String(curYear).substring(2)}`;

      months.push({
        key: yearMonthKey,
        label: displayLabel,
        monthLabel: displayLabel
      });

      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
      iterations++;
    }

    // Group transactions chronologically by year-month
    const monthlyGroups: Record<string, { monthLabel: string; inflow: number; outflow: number }> = {};

    months.forEach((m) => {
      monthlyGroups[m.key] = {
        monthLabel: m.label,
        inflow: 0,
        outflow: 0,
      };
    });

    // Populate transaction figures
    transactions.forEach((tx) => {
      const monthPrefix = tx.date.substring(0, 7); // "YYYY-MM"
      if (monthlyGroups[monthPrefix]) {
        if (tx.amount > 0) {
          monthlyGroups[monthPrefix].inflow += tx.amount;
        } else {
          monthlyGroups[monthPrefix].outflow += Math.abs(tx.amount);
        }
      }
    });

    // Compute cumulative rolling balance starting with initial Balance
    let rollingBalance = initialBalance;
    const finalData = months.map((m) => {
      const group = monthlyGroups[m.key];
      const net = group.inflow - group.outflow;
      rollingBalance += net;

      return {
        month: group.monthLabel,
        inflow: Math.round(group.inflow * activeExchangeRate),
        outflow: Math.round(group.outflow * activeExchangeRate),
        net: Math.round(net * activeExchangeRate),
        borderOffset: 0,
        balance: Math.round(rollingBalance * activeExchangeRate),
      };
    });

    return finalData;
  }, [transactions, initialBalance, activeExchangeRate]);

  // Compute key summary details from chartData
  const lastMonth = chartData[chartData.length - 1];
  const maxCashValue = Math.max(...chartData.map((d) => d.balance, 0));
  const minCashValue = Math.min(...chartData.map((d) => d.balance, 0));

  return (
    <div id="cashflow-projection-chart-card" className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            Predictive Model Engine
          </div>
          <h2 className="text-xl font-sans font-semibold tracking-tight text-white mt-1">
            Cash Reserves & Rolling Forecast ({activeCurrencyCode})
          </h2>
        </div>

        {/* Dynamic mini indicators */}
        <div className="flex flex-wrap gap-3">
          <div className="bg-[#1C1D21] px-3 py-1.5 rounded-lg border border-[#2D2E32] flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full"></span>
            <span className="text-xs text-zinc-400 font-mono">Cash Reserve</span>
          </div>
          <div className="bg-[#1C1D21] px-3 py-1.5 rounded-lg border border-[#2D2E32] flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#10b981]/30 border border-[#10b981] rounded-sm"></span>
            <span className="text-xs text-zinc-400 font-mono">Inflows</span>
          </div>
          <div className="bg-[#1C1D21] px-3 py-1.5 rounded-lg border border-[#2D2E32] flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-rose-500/50 border border-rose-500 rounded-sm"></span>
            <span className="text-xs text-zinc-400 font-mono">Outflows</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[320px] mt-2 flex items-center justify-center">
        {chartWidth > 0 ? (
          <ComposedChart width={chartWidth} height={320} data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#26272B" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#71717A"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#71717A"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${activeCurrencySymbol}${Math.round(val / 1000).toLocaleString()}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F1014',
                borderColor: '#26272B',
                borderRadius: '12px',
                color: '#E4E4E7',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'balance') return [`${activeCurrencySymbol}${Number(value).toLocaleString()}`, 'Total Cash Reserve'];
                if (name === 'inflow') return [`${activeCurrencySymbol}${Number(value).toLocaleString()}`, 'Monthly Inflows'];
                if (name === 'outflow') return [`${activeCurrencySymbol}${Number(value).toLocaleString()}`, 'Monthly Outflows'];
                if (name === 'net') return [`${activeCurrencySymbol}${Number(value).toLocaleString()}`, 'Net Flow'];
                return [value, name];
              }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Zero Balance Limit`, fill: '#ef4444', fontSize: 10 }} />
            
            {/* Base metrics: Inflow (green bar) and Outflow (red bar) */}
            <Bar dataKey="inflow" fill="#10b981" opacity={0.35} radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="outflow" fill="#dc2626" opacity={0.45} radius={[4, 4, 0, 0]} barSize={24} />

            {/* Cash rolling forecast trend area */}
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#balanceGrad)"
            />
          </ComposedChart>
        ) : (
          <div className="text-zinc-550 font-mono text-xs animate-pulse">Initializing charting matrix...</div>
        )}
      </div>

      {/* Dynamic Mini Insights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#26272B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Peak Cash Level</div>
            <div className="text-sm font-semibold text-white font-mono">{activeCurrencySymbol}{maxCashValue.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <ArrowDownRight size={18} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Lowest Cash Reserve</div>
            <div className="text-sm font-semibold text-white font-mono">{activeCurrencySymbol}{minCashValue.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{lastMonth?.month || 'Future'} Forecast</div>
            <div className="text-sm font-semibold text-white font-mono">{activeCurrencySymbol}{(lastMonth?.balance || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
