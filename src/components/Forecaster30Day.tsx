import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { CalendarDays, AlertTriangle, TrendingDown, ArrowUpRight, ArrowDownRight, Milestone, Sparkles } from 'lucide-react';

interface Forecaster30DayProps {
  transactions: Transaction[];
  initialBalance: number;
  activeCurrencySymbol: string;
  activeCurrencyCode: string;
  activeExchangeRate: number;
}

export default function Forecaster30Day({ 
  transactions, 
  initialBalance,
  activeCurrencySymbol,
  activeCurrencyCode,
  activeExchangeRate 
}: Forecaster30DayProps) {
  
  // Calculate dynamic starting reference day based on latest completed transaction or current date
  const today = useMemo(() => {
    let d = new Date();
    const completedTx = transactions.filter(t => t.status === 'completed');
    if (completedTx.length > 0) {
      const dates = completedTx.map(t => new Date(t.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        d = new Date(Math.max(...dates));
      }
    }
    return d;
  }, [transactions]);
  
  // Calculate rolling forecast stages
  const forecastBuckets = useMemo(() => {
    // Interval blocks 
    const block1End = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 Days
    const block2End = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 Days
    const block3End = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 Days

    const formatDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const p1 = `${formatDate(new Date(today.getTime() + 24*60*60*1000))} – ${formatDate(block1End)}`;
    const p2 = `${formatDate(new Date(block1End.getTime() + 24*60*60*1000))} – ${formatDate(block2End)}`;
    const p3 = `${formatDate(new Date(block2End.getTime() + 24*60*60*1000))} – ${formatDate(block3End)}`;

    // Historical completed transactions cash at 'today'
    let baselineReservesUSD = initialBalance;
    transactions.forEach(t => {
      if (t.status === 'completed') {
        baselineReservesUSD += t.amount;
      }
    });

    // Bucket variables
    let b1InUSD = 0, b1OutUSD = 0;
    let b2InUSD = 0, b2OutUSD = 0;
    let b3InUSD = 0, b3OutUSD = 0;

    // Distribute pending & projected future transactions into relative date buckets
    transactions.forEach(t => {
      if (t.status === 'pending' || t.status === 'projected') {
        const txDate = new Date(t.date);
        if (isNaN(txDate.getTime())) return;

        if (txDate > today) {
          if (txDate <= block1End) {
            if (t.amount > 0) b1InUSD += t.amount;
            else b1OutUSD += Math.abs(t.amount);
          } else if (txDate <= block2End) {
            if (t.amount > 0) b2InUSD += t.amount;
            else b2OutUSD += Math.abs(t.amount);
          } else if (txDate <= block3End) {
            if (t.amount > 0) b3InUSD += t.amount;
            else b3OutUSD += Math.abs(t.amount);
          }
        }
      }
    });

    // Compute converted parameters
    const startReserves = baselineReservesUSD * activeExchangeRate;
    
    const b1In = b1InUSD * activeExchangeRate;
    const b1Out = b1OutUSD * activeExchangeRate;
    const b1End = startReserves + b1In - b1Out;

    const b2In = b2InUSD * activeExchangeRate;
    const b2Out = b2OutUSD * activeExchangeRate;
    const b2End = b1End + b2In - b2Out;

    const b3In = b3InUSD * activeExchangeRate;
    const b3Out = b3OutUSD * activeExchangeRate;
    const b3End = b2End + b3In - b3Out;

    return [
      {
        title: '30-Day Outlook (Immediate Forecast)',
        period: p1,
        startBalance: startReserves,
        inflow: b1In,
         outflow: b1Out,
        endBalance: b1End,
        days: 30,
        risk: b1End < 0 ? 'Critical Red' : b1End < startReserves * 0.4 ? 'Suboptimal Margin' : 'Extremely Stable'
      },
      {
        title: '60-Day Outlook (Medium Forecast)',
        period: p2,
        startBalance: b1End,
        inflow: b2In,
         outflow: b2Out,
        endBalance: b2End,
        days: 60,
        risk: b2End < 0 ? 'Critical Red' : b2End < b1End * 0.5 ? 'Suboptimal Margin' : 'Extremely Stable'
      },
      {
        title: '90-Day Outlook (Quarterly Forecast)',
        period: p3,
        startBalance: b2End,
        inflow: b3In,
        outflow: b3Out,
        endBalance: b3End,
        days: 90,
        risk: b3End < 0 ? 'Critical Red' : b3End < b2End * 0.5 ? 'Suboptimal Margin' : 'Extremely Stable'
      }
    ];
  }, [transactions, initialBalance, activeExchangeRate, today]);

  return (
    <div className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl" id="rolling-forecast-chronology-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[#10b981] font-mono text-xs tracking-wider uppercase flex items-center gap-1.5">
            <CalendarDays size={14} />
            Rolling Corporate Forecast Models
          </div>
          <h2 className="text-sm font-semibold text-white tracking-tight mt-0.5">
            Forward-Looking Liquidity Outlook (30-90 Days)
          </h2>
        </div>
        <div className="bg-[#1C1D21] text-indigo-400 text-[10px] px-2.5 py-1 rounded border border-[#2D2E32] font-mono">
          As of {today.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
        Our double-entry cash projection isolates forthcoming contract cycles over consecutive 30-day blocks. Track exact reserve depletion points.
      </p>

      {/* Grid of the 3 buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forecastBuckets.map((bucket, idx) => {
          const isNegativeChange = bucket.endBalance < bucket.startBalance;
          const pctChange = bucket.startBalance === 0 ? 0 : ((bucket.endBalance - bucket.startBalance) / bucket.startBalance) * 100;
          
          return (
            <div key={idx} className="bg-[#0A0B0D] border border-[#26272B] rounded-xl p-4 flex flex-col justify-between">
              {/* Info Period Title */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{bucket.title}</span>
                  {bucket.days === 30 && (
                    <span className="bg-[#10b981]/10 text-[#10b981] text-[8px] font-semibold px-2 py-0.2 rounded border border-[#10b981]/15 uppercase font-mono">Active Run</span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block mt-1">{bucket.period}</span>

                {/* Main Ending Balance Stat */}
                <div className="mt-4 pb-4 border-b border-[#1C1D21]">
                  <span className="text-[10px] text-[#71717A] uppercase font-mono block">Projected Ending Balances</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-xl font-bold font-mono ${bucket.endBalance < 0 ? 'text-rose-500' : 'text-zinc-100'}`}>
                      {activeCurrencySymbol}{Math.round(bucket.endBalance).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">{activeCurrencyCode}</span>
                  </div>
                  
                  {/* Pct direction indicator */}
                  <div className="flex items-center gap-1 mt-1 text-[10px]">
                    {isNegativeChange ? (
                      <span className="text-rose-400 flex items-center gap-0.5 font-mono">
                        <ArrowDownRight size={10} />
                        {Math.abs(pctChange).toFixed(1)}% burn rate
                      </span>
                    ) : (
                      <span className="text-[#10b981] flex items-center gap-0.5 font-mono">
                        <ArrowUpRight size={10} />
                        +{Math.abs(pctChange).toFixed(1)}% cash expansion
                      </span>
                    )}
                  </div>
                </div>

                {/* Detailed Flow Lists */}
                <div className="mt-4 space-y-2 text-[11px]">
                  {/* Start Reserve */}
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Starting Reserves:</span>
                    <span className="text-zinc-400">{activeCurrencySymbol}{Math.round(bucket.startBalance).toLocaleString()}</span>
                  </div>

                  {/* Planned Inflow */}
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Planned Inflows:</span>
                    <span className="text-[#10b981] font-semibold">+{activeCurrencySymbol}{Math.round(bucket.inflow).toLocaleString()}</span>
                  </div>

                  {/* Fixed Outflow */}
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Fixed Outflows:</span>
                    <span className="text-rose-450 font-semibold">-{activeCurrencySymbol}{Math.round(bucket.outflow).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status footer warning */}
              <div className={`mt-5 pt-3 border-t border-[#1C1D21] text-[10px] font-mono flex items-center gap-1.5 ${
                bucket.risk.toLowerCase().includes('critical') 
                  ? 'text-rose-400' 
                  : bucket.risk.toLowerCase().includes('suboptimal')
                    ? 'text-yellow-500'
                    : 'text-[#10b981]'
              }`}>
                {bucket.risk.toLowerCase().includes('critical') ? (
                  <AlertTriangle size={12} className="shrink-0" />
                ) : (
                  <Milestone size={12} className="shrink-0" />
                )}
                <span>Health Index: {bucket.risk}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
