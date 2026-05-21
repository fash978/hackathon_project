import React, { useState } from 'react';
import { InvoiceEstimate, Transaction } from '../types';
import { Calendar, FileText, Sparkles, Loader2, AlertTriangle, ShieldCheck, ArrowRight, CornerDownRight, Coins } from 'lucide-react';

interface InvoiceEstimatorProps {
  onAddTransaction: (newTx: Omit<Transaction, 'id'>) => void;
  activeCurrencySymbol: string;
  activeCurrencyCode: string;
  activeExchangeRate: number; // to translate base USD to active currency
}

export default function InvoiceEstimator({ onAddTransaction, activeCurrencySymbol, activeCurrencyCode, activeExchangeRate }: InvoiceEstimatorProps) {
  // Local form state
  const [clientName, setClientName] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('2026-05-20');
  const [terms, setTerms] = useState('Net 30');
  const [reliabilityNote, setReliabilityNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [estimate, setEstimate] = useState<InvoiceEstimate | null>(null);
  const [isMerged, setIsMerged] = useState(false);

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !invoiceAmount || !invoiceDate) {
      setErrorMsg('Please populate all primary invoice arguments.');
      return;
    }
    
    setErrorMsg('');
    setEstimate(null);
    setIsMerged(false);
    setLoading(true);

    try {
      // Since amount in UI is entered in currently selected currency, let's convert it to equivalent base USD for server calculation
      const enteredAmount = parseFloat(invoiceAmount);
      const usdEquivalentAmount = enteredAmount / activeExchangeRate;

      const res = await fetch('/api/estimate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          amount: usdEquivalentAmount, // predict using base USD, then convert back
          invoiceDate,
          terms,
          reliabilityNote
        })
      });

      if (!res.ok) {
        throw new Error('Failure during invoice scoring model run.');
      }

      const score: InvoiceEstimate = await res.json();
      setEstimate(score);
    } catch (err: any) {
      console.error('Invoice Scoring Failed:', err);
      setErrorMsg(err.message || 'Connecting to credit scoring engine failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeToLedger = () => {
    if (!estimate) return;

    // Convert estimated amount back to base USD for the ledger state
    const originalAmount = parseFloat(invoiceAmount);
    const baseValueUSD = originalAmount / activeExchangeRate;

    // Add as a future pending transaction
    onAddTransaction({
      description: `Pending Invoice Inflow: ${clientName} (Estimated)`,
      amount: Math.round(baseValueUSD),
      type: 'inflow',
      category: 'Invoiced Sales',
      date: estimate.predictedPaymentDate,
      status: 'pending'
    });

    setIsMerged(true);
  };

  return (
    <div className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl" id="smart-invoice-credit-estimator-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
          <Coins size={14} />
        </div>
        <div>
          <div className="text-[#10b981] font-mono text-xs tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></span>
            Smart Cash Inflow Invoice Estimator
          </div>
          <h2 className="text-sm font-semibold text-white mt-0.5 tracking-tight">
            Predict Receivable Settlement Cycles
          </h2>
        </div>
      </div>

      <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
        Corporate accounts rarely settle bills precisely on raw due dates. Enter invoice metadata to let our CFO AI calculate actual cash-in-hand delays and credit risk metrics.
      </p>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-50/10 text-rose-400 text-xs px-3 py-2.5 rounded-xl mb-4">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleEstimate} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Client Name */}
          <div>
            <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">Debtor Client Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chevron Corp / Acme Africa"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-[#0A0B0D] border border-[#26272B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {/* Amount in Current Active Currency */}
          <div>
            <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
              Invoice Amount ({activeCurrencyCode}) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-zinc-500 text-xs font-mono">{activeCurrencySymbol}</span>
              <input
                type="number"
                required
                min="1"
                placeholder="0.00"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full bg-[#0A0B0D] border border-[#26272B] rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981] font-mono"
              />
            </div>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">Billing Issue Date *</label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full bg-[#0A0B0D] border border-[#26272B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981] font-mono"
            />
          </div>

          {/* Terms Selector */}
          <div>
            <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">Agreed Payment Terms Protocol *</label>
            <select
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full bg-[#0A0B0D] border border-[#26272B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
            >
              <option value="Due on Receipt">Due on Receipt</option>
              <option value="Net 15">Net 15 (15 Days)</option>
              <option value="Net 30">Net 30 (30 Days)</option>
              <option value="Net 45">Net 45 (45 Days)</option>
              <option value="Net 60">Net 60 (60 Days)</option>
              <option value="Net 90">Net 90 (90 Days)</option>
            </select>
          </div>
        </div>

        {/* Client History Notes */}
        <div>
          <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
            Client Risk Factors / Historical Latency Notes (Optional)
          </label>
          <textarea
            placeholder="e.g. Large enterprise with multi-layered accounts payable department, previous invoice was delayed by 18 days, or highly reliable cash-rich partner."
            value={reliabilityNote}
            onChange={(e) => setReliabilityNote(e.target.value)}
            className="w-full bg-[#0A0B0D] border border-[#26272B] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-[#10b981] min-h-[50px] text-zinc-200"
          />
        </div>

        {/* Action triggers */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-black font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin text-black" />
              Scoring credit cycles via Lumina Agent...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Evaluate Settlement Cycle
            </>
          )}
        </button>
      </form>

      {/* Credit scoring results details panel */}
      {estimate && (
        <div className="mt-5 border-t border-[#26272B] pt-5 space-y-4" id="invoice-estimator-report">
          {/* Top highlight banners */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Predicted Date */}
            <div className="bg-[#0A0B0D] border border-[#26272B] p-3 rounded-xl">
              <span className="text-[9px] text-[#71717A] uppercase font-mono block">Estimated Cash Receipt</span>
              <span className="text-xs font-bold font-mono text-teal-400 mt-1 block">
                {estimate.predictedPaymentDate}
              </span>
              <span className="text-[8px] text-zinc-500 uppercase font-mono mt-0.5 block">
                {estimate.delayDays > 0 ? `+${estimate.delayDays}d overdue` : 'On Time'}
              </span>
            </div>

            {/* Confidence score */}
            <div className="bg-[#0A0B0D] border border-[#26272B] p-3 rounded-xl">
              <span className="text-[9px] text-[#71717A] uppercase font-mono block">Prompt Settlement Likelihood</span>
              <span className="text-xs font-bold font-mono mt-1 block text-zinc-100">
                {estimate.probabilityOnTime}%
              </span>
              <div className="w-full bg-[#1C1D21] h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full ${estimate.probabilityOnTime >= 75 ? 'bg-[#10b981]' : estimate.probabilityOnTime >= 40 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                  style={{ width: `${estimate.probabilityOnTime}%` }}
                ></div>
              </div>
            </div>

            {/* Risk Badge */}
            <div className="bg-[#0A0B0D] border border-[#26272B] p-3 rounded-xl col-span-2 sm:col-span-1 flex flex-col justify-between">
              <span className="text-[9px] text-[#71717A] uppercase font-mono block">Cashflow Latency Risk</span>
              <span className={`text-[10px] font-semibold mt-1 px-2.5 py-1 rounded inline-flex items-center gap-1.5 ${
                estimate.riskLevel.toLowerCase() === 'high' 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                  : estimate.riskLevel.toLowerCase() === 'medium' 
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
                    : 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25'
              }`}>
                {estimate.riskLevel.toLowerCase() === 'high' ? <AlertTriangle size={11} /> : <ShieldCheck size={11} />}
                {estimate.riskLevel} Risk
              </span>
            </div>
          </div>

          {/* Narrative description */}
          <div className="bg-[#0A0B0D] border border-[#26272B] p-3.5 rounded-xl text-xs text-zinc-300 leading-relaxed">
            <span className="text-[9px] font-mono uppercase text-teal-400 block mb-1">CFO Credit Narrative</span>
            <p className="text-zinc-350 text-[11px] font-sans">{estimate.analysis}</p>
          </div>

          {/* Action Recommendations */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Receiver Collection Acceleration Tactics:</span>
            {estimate.mitigationSteps.map((step, idx) => (
              <div key={idx} className="text-[11px] text-zinc-400 flex items-start gap-1.5 leading-relaxed">
                <CornerDownRight size={10} className="shrink-0 mt-1 text-[#10b981]" />
                <p>{step}</p>
              </div>
            ))}
          </div>

          {/* Merge Trigger Action */}
          {!isMerged ? (
            <button
              onClick={handleMergeToLedger}
              className="w-full bg-[#1C1D21] hover:bg-[#26272B] text-white border border-[#2D2E32] hover:border-teal-500/30 py-2 rounded-xl text-[11px] font-mono transition flex items-center justify-center gap-2"
            >
              <ArrowRight size={11} className="text-[#10b981]" />
              Inject Predicted Inflow Date ({estimate.predictedPaymentDate}) to Rolling Cashflow Table
            </button>
          ) : (
            <div className="text-center py-2 text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 rounded-xl border border-[#10b981]/15">
              ✓ Merged into Active Forecasting Charts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
