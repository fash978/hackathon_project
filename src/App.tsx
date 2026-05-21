import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_TRANSACTIONS } from './data';
import { Transaction, ScenarioPrediction } from './types';
import CashflowChart from './components/CashflowChart';
import TransactionsTable from './components/TransactionsTable';
import ScenarioSimulator from './components/ScenarioSimulator';
import AICoach from './components/AICoach';
import CsvImporter from './components/CsvImporter';
import InvoiceEstimator from './components/InvoiceEstimator';
import Forecaster30Day from './components/Forecaster30Day';
import { 
  DollarSign, Clock, BarChart3, TrendingUp, HelpCircle, 
  Settings, Landmark, ArrowUpRight, ArrowDownRight, RefreshCw, BookOpen, AlertCircle, Coins, Sparkles, SlidersHorizontal, Printer, Sun, Moon
} from 'lucide-react';
import { motion } from 'motion/react';

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira (NGN)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export default function App() {
  // Theme Toggle: dark mode (default) or light mode
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('kashflow-theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('kashflow-theme', nextTheme);
  };

  // Primary App Ledger state
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [activePrediction, setActivePrediction] = useState<ScenarioPrediction | null>(null);
  
  // Quick state for starting balance config form
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('0');

  // Custom multi-currency rates states
  const [activeCurrency, setActiveCurrency] = useState('USD');
  const [rates, setRates] = useState<Record<string, number>>({
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    NGN: 1450.0,
    CAD: 1.36,
    AUD: 1.50,
    JPY: 155.50,
    ZAR: 18.40,
    GHS: 14.20,
    INR: 83.30
  });
  const [rateUpdatedTime, setRateUpdatedTime] = useState('Default (Offline)');

  // Selected Currency Config helpers
  const activeCurrConfig = useMemo(() => {
    return SUPPORTED_CURRENCIES.find(c => c.code === activeCurrency) || SUPPORTED_CURRENCIES[0];
  }, [activeCurrency]);

  const activeRate = useMemo(() => {
    return rates[activeCurrency] || 1;
  }, [rates, activeCurrency]);

  // Fetch live exchange rates on mount
  useEffect(() => {
    fetch('/api/rates')
      .then(res => res.json())
      .then(data => {
        if (data.rates) {
          setRates(data.rates);
          if (data.time_last_update_utc) {
            const timeStr = new Date(data.time_last_update_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setRateUpdatedTime(`Synced live at ${timeStr}`);
          } else {
            setRateUpdatedTime('Synced live from bank provider');
          }
        }
      })
      .catch(err => {
        console.error('Failed fetching live exchange rates, using local fallbacks:', err);
        setRateUpdatedTime('Using safe cache (offline-ready)');
      });
  }, []);

  // Compute transactions including prediction overlays if active
  const blendedTransactions = useMemo(() => {
    if (!activePrediction) return transactions;
    
    // Map projected Transactions from prediction generator to full Transactions
    const mappedProjected: Transaction[] = activePrediction.projectedTransactions.map((pt, idx) => ({
      ...pt,
      id: `ai-proj-${idx}-${Date.now()}`,
      status: 'projected'
    }));

    return [...transactions, ...mappedProjected];
  }, [transactions, activePrediction]);

  // Handle transaction modifications
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const freshTx: Transaction = {
      ...newTx,
      id: `tx-user-${Date.now()}`
    };
    setTransactions(prev => [...prev, freshTx]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    // If the active prediction got dirty, maybe clear or let it recalculate
  };

  // State application triggers
  const handleApplyPrediction = (prediction: ScenarioPrediction) => {
    setActivePrediction(prediction);
  };

  const handleClearActivePrediction = () => {
    setActivePrediction(null);
  };

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(balanceInput);
    if (!isNaN(val)) {
      setInitialBalance(val / activeRate);
      setIsEditingBalance(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset finance dashboard back to a clean state with starting capital?')) {
      setTransactions(INITIAL_TRANSACTIONS);
      setInitialBalance(0);
      setBalanceInput('0');
      setActivePrediction(null);
    }
  };

  // REAL-TIME KPI ANALYZER calculation (double-entry standard simulation)
  const stats = useMemo(() => {
    // Current reserves (only computed matching historical & pending totals relative to start balance)
    let solvedReserve = initialBalance;
    let pendingInflows = 0;
    let pendingOutflows = 0;

    // Monthly burn rate helper from completed outgoing sums
    let totalCompletedOutflows = 0;
    let totalCompletedInflows = 0;

    // Count unique months in the completed transactions dataset
    const completedTx = transactions.filter(t => t.status === 'completed');
    const uniqueMonths = new Set(completedTx.map(t => t.date.substring(0, 7)));
    const completedMonthsCount = Math.max(1, uniqueMonths.size);

    transactions.forEach(tx => {
      if (tx.status === 'completed') {
        solvedReserve += tx.amount;
        if (tx.amount > 0) totalCompletedInflows += tx.amount;
        else totalCompletedOutflows += Math.abs(tx.amount);
      } else if (tx.status === 'pending') {
        if (tx.amount > 0) pendingInflows += tx.amount;
        else pendingOutflows += Math.abs(tx.amount);
      }
    });

    const averageMonthlyOutflow = totalCompletedOutflows / completedMonthsCount;
    const averageMonthlyInflow = totalCompletedInflows / completedMonthsCount;
    const netBurn = averageMonthlyOutflow - averageMonthlyInflow;

    // Runway months calculation based on rolling netBurn
    let runwaysMonths = 99; // infinite placeholder
    if (netBurn > 0) {
      runwaysMonths = parseFloat((solvedReserve / netBurn).toFixed(1));
    }

    // Quick Ratio = (Cash + Pending Inflow Assets) / Upcoming Pending Liabilities
    const totalLiabilities = pendingOutflows === 0 ? 1 : pendingOutflows;
    const quickRatio = parseFloat(((solvedReserve + pendingInflows) / totalLiabilities).toFixed(2));

    return {
      currentCashReserve: solvedReserve,
      burnRate: Math.round(netBurn > 0 ? netBurn : 0),
      runway: runwaysMonths,
      quickRatio: quickRatio,
      averageInflow: Math.round(averageMonthlyInflow),
      averageOutflow: Math.round(averageMonthlyOutflow)
    };
  }, [transactions, initialBalance]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${theme === 'light' ? 'light-theme bg-[#F8FAFC] text-[#0F172A]' : 'bg-[#0A0B0D] text-[#E4E4E7]'}`}>
      {/* PROFESSIONAL PRINT ONLY CORPORATE REPORT HEADER */}
      <div className="hidden print:block border-b-2 border-zinc-900 pb-5 mb-6 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Kashflow Accounts & Statements</h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">KASHFLOW PREDICTOR & LEDGER STATEMENT</p>
          </div>
          <div className="text-right text-xs font-mono text-zinc-650">
            <p className="font-semibold text-zinc-900">Report Currency: {activeCurrConfig.code} ({activeCurrConfig.symbol})</p>
            <p className="mt-0.5">Export Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>Verification Status: Live Calculated Co-Pilot</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 border-t border-b border-zinc-200 py-3 text-zinc-900">
          <div>
            <span className="text-[10px] text-zinc-550 font-mono uppercase block">Total Cash Reserve</span>
            <span className="text-base font-bold font-mono text-[#047857]">
              {activeCurrConfig.symbol}{Math.round(stats.currentCashReserve * activeRate).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-550 font-mono uppercase block">Average Monthly Inflow</span>
            <span className="text-base font-bold font-mono">
              {activeCurrConfig.symbol}{Math.round(stats.averageInflow * activeRate).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-550 font-mono uppercase block">Average Monthly Outflow</span>
            <span className="text-base font-bold font-mono">
              {activeCurrConfig.symbol}{Math.round(stats.averageOutflow * activeRate).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-550 font-mono uppercase block">Monthly Net Burn Rate</span>
            <span className="text-base font-bold font-mono text-rose-700">
              {activeCurrConfig.symbol}{Math.round(stats.burnRate * activeRate).toLocaleString()}/mo
            </span>
          </div>
        </div>
      </div>

      {/* PROFESSIONAL DASHBOARD META BANNER */}
      <header className="border-b border-[#26272B] bg-[#0F1014] sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10b981] to-teal-40 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#10b981]/10">
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">Kashflow</h1>
                <span className="text-[9px] bg-[#10b981]/10 text-[#10b981] font-mono px-1.5 py-0.2 rounded border border-[#10b981]/15">
                  AI Active
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Kashflow Accounts • FY 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-[9px] text-zinc-500 font-mono uppercase">{rateUpdatedTime}</span>
              <span className="text-xs text-teal-400 font-medium font-mono">1 USD = {activeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {activeCurrency}</span>
            </div>

            {/* Currency Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#1C1D21] border border-[#2D2E32] rounded-xl px-2.5 py-1.5">
              <Coins size={14} className="text-[#10b981]" />
              <select
                value={activeCurrency}
                onChange={(e) => {
                  const newCurr = e.target.value;
                  setActiveCurrency(newCurr);
                  // Update balance input if editing so it aligns with new currency
                  const rateToNew = rates[newCurr] || 1;
                  setBalanceInput(String(Math.round(initialBalance * rateToNew)));
                }}
                className="bg-transparent text-white text-xs font-mono font-medium focus:outline-none cursor-pointer"
                title="Choose forecasting and ledger currency"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[#141519] text-white">
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Print action button */}
            <button
              onClick={() => window.print()}
              title="Print PDF Financial Report"
              className="p-2 sm:px-3 sm:py-1.5 bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] font-medium rounded-xl border border-[#10b981]/25 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer size={12} />
              <span>Print PDF</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 sm:px-3 sm:py-1.5 bg-[#1C1D21] hover:bg-[#26272B] rounded-xl border border-[#2D2E32] text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} className="text-[#10b981]" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
            </button>

            <button
              onClick={handleResetData}
              title="Reset Simulated State"
              className="p-2 sm:px-3 sm:py-1.5 bg-[#1C1D21] hover:bg-[#26272B] rounded-xl border border-[#2D2E32] text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Reset Ledger</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* TOP COMPONENT SECTION: BALANCES & ADJUST CAPITAL FORM */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#141519] border border-[#26272B] p-5 rounded-2xl">
          <div>
            <h2 className="text-lg font-sans font-semibold text-white">Liquid Assets Reserve</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Currently calculated relative to primary seed capital. Configure starting balances to test customized states.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {isEditingBalance ? (
              <form onSubmit={handleSaveBalance} className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-zinc-500 font-mono text-xs">{activeCurrConfig.symbol}</span>
                  <input
                    type="number"
                    value={balanceInput}
                    onChange={e => setBalanceInput(e.target.value)}
                    className="bg-[#0A0B0D] border border-[#26272B] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white max-w-[150px] font-mono focus:outline-none focus:border-[#10b981]"
                    placeholder="Starting cash"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#10b981] hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBalance(false)}
                  className="text-zinc-400 text-xs px-2"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-zinc-400 font-mono">Seed Reserves ({activeCurrency}):</span>
                <span className="text-sm font-semibold font-mono text-[#10b981] bg-[#0A0B0D] px-3 py-1.5 rounded-lg border border-[#26272B]">
                  {activeCurrConfig.symbol}{Math.round(initialBalance * activeRate).toLocaleString()}
                </span>
                <button
                  onClick={() => {
                    setBalanceInput(String(Math.round(initialBalance * activeRate)));
                    setIsEditingBalance(true);
                  }}
                  className="text-[11px] text-zinc-450 hover:text-white underline font-mono shrink-0"
                >
                  Adjust Capital
                </button>
              </div>
            )}
          </div>
        </div>

        {/* METRIC CORE CARDS HIGHLIGHT SHELF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-summaries-grid">
          
          {/* Card 1: Cumulative Calculated Flow */}
          <div className="bg-[#141519] border border-[#26272B] p-5 rounded-2xl flex items-start justify-between shadow-xl">
            <div>
              <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider block">Calculated Current Cash</span>
              <span className="text-2xl font-bold font-mono text-white mt-1.5 block">
                {activeCurrConfig.symbol}{Math.round(stats.currentCashReserve * activeRate).toLocaleString()}
              </span>
              <div className="text-[10px] text-[#10b981] mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></span>
                Completed basis liquid cash
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>

          {/* Card 2: Survivability Safety Runway */}
          <div className="bg-[#141519] border border-[#26272B] p-5 rounded-2xl flex items-start justify-between shadow-xl">
            <div>
              <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider block">Survival Safety Runway</span>
              <span className="text-2xl font-bold font-mono text-white mt-1.5 block">
                {stats.runway >= 99 ? 'Infinite' : `${stats.runway} Months`}
              </span>
              <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5">
                {stats.runway >= 99 ? (
                  <span className="text-[#10b981] font-sans">✓ Profitable business model</span>
                ) : (
                  <span>Estimated burnout at current outflow</span>
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>

          {/* Card 3: Financial Quick Ratio */}
          <div className="bg-[#141519] border border-[#26272B] p-5 rounded-2xl flex items-start justify-between shadow-xl">
            <div>
              <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider block">Liquidity Quick Ratio</span>
              <span className={`text-2xl font-bold font-mono mt-1.5 block ${stats.quickRatio >= 1.5 ? 'text-[#10b981]' : stats.quickRatio >= 1 ? 'text-teal-400' : 'text-rose-400'}`}>
                {stats.quickRatio}x
              </span>
              <div className="text-[10px] mt-2 flex items-center gap-1">
                {stats.quickRatio >= 1.2 ? (
                  <span className="text-[#10b981]">Excellent target threshold</span>
                ) : (
                  <span className="text-rose-450">Bottleneck risk: critical</span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>

          {/* Card 4: Net Estimated Burn Rate */}
          <div className="bg-[#141519] border border-[#26272B] p-5 rounded-2xl flex items-start justify-between shadow-xl">
            <div>
              <span className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider block">Average Monthly Outflow</span>
              <span className="text-2xl font-bold font-mono text-zinc-200 mt-1.5 block">
                {activeCurrConfig.symbol}{Math.round(stats.averageOutflow * activeRate).toLocaleString()}
              </span>
              <p className="text-[10px] text-zinc-400 mt-2">
                Monthly Net Burn: <strong className="text-rose-450 font-mono">{activeCurrConfig.symbol}{Math.round(stats.burnRate * activeRate).toLocaleString()}/mo</strong>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
        </div>

        {/* MAIN CHART PANEL */}
        <CashflowChart 
          transactions={blendedTransactions} 
          initialBalance={initialBalance}
          activeCurrencySymbol={activeCurrConfig.symbol}
          activeCurrencyCode={activeCurrConfig.code}
          activeExchangeRate={activeRate}
        />

        {/* 30+ DAY ROLLING ESTIMATE FORWARD SECTION */}
        <Forecaster30Day 
          transactions={blendedTransactions}
          initialBalance={initialBalance}
          activeCurrencySymbol={activeCurrConfig.symbol}
          activeCurrencyCode={activeCurrConfig.code}
          activeExchangeRate={activeRate}
        />

        {/* ACTIVE CO-PILOT ADVISOR & DEBT ESTIMATOR BLOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InvoiceEstimator 
            onAddTransaction={(tx) => {
              // Add a transaction which was estimated
              handleAddTransaction(tx);
            }}
            activeCurrencySymbol={activeCurrConfig.symbol}
            activeCurrencyCode={activeCurrConfig.code}
            activeExchangeRate={activeRate}
          />

          <CsvImporter 
            onImport={(cleanHistorical) => {
              setTransactions(prev => [...prev, ...cleanHistorical]);
            }}
            activeCurrencySymbol={activeCurrConfig.symbol}
          />
        </div>

        {/* SPLIT EXPERT PREDICTIONS & MENTOR BAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Model Scenario Selection Form */}
          <div className="lg:col-span-7">
            <ScenarioSimulator 
              transactions={transactions}
              initialBalance={initialBalance}
              onApplyPrediction={handleApplyPrediction}
              currentPrediction={activePrediction}
              onClearActivePrediction={handleClearActivePrediction}
            />
          </div>

          {/* Chat Advisor Mentor Feedback Box */}
          <div className="lg:col-span-5">
            <AICoach transactions={transactions} initialBalance={initialBalance} />
          </div>
        </div>

        {/* LEDGER & JOURNAL MANAGEMENT TABLE */}
        <TransactionsTable 
          transactions={transactions}
          onAddTransaction={handleAddTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          activeCurrencySymbol={activeCurrConfig.symbol}
          activeCurrencyCode={activeCurrConfig.code}
          activeExchangeRate={activeRate}
        />

        {/* DISCLAIMER FOOTER */}
        <footer className="py-10 text-[10px] text-zinc-500 border-t border-[#26272B] font-mono flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <div>
            <p>Kashflow Forecast Model • AI predictions generated using Google Gemini 3.5 Flash.</p>
            <p className="mt-1 text-zinc-650">All projections are models calculated for testing strategic organizational directions, and do not constitute legal financial audits.</p>
          </div>
          <div className="flex gap-4 uppercase tracking-wider font-semibold text-[9px] text-[#71717A]">
            <span>Active Rate: <span className="text-[#10b981] font-mono">1 USD = {activeRate.toFixed(2)} {activeCurrency}</span></span>
            <span>Update Time: Live Ticker</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
