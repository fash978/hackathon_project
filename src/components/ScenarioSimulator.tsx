import React, { useState } from 'react';
import { SCENARIOS } from '../data';
import { Transaction, ScenarioPrediction } from '../types';
import { Sparkles, Sliders, ShieldCheck, Flame, TrendingUp, AlertTriangle, ChevronRight, Activity, ArrowRight, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScenarioSimulatorProps {
  transactions: Transaction[];
  initialBalance: number;
  onApplyPrediction: (prediction: ScenarioPrediction) => void;
  currentPrediction: ScenarioPrediction | null;
  onClearActivePrediction: () => void;
}

export default function ScenarioSimulator({
  transactions,
  initialBalance,
  onApplyPrediction,
  currentPrediction,
  onClearActivePrediction,
}: ScenarioSimulatorProps) {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeScenario = SCENARIOS[selectedScenarioIdx];

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const scenarioText = customPrompt.trim() || activeScenario.defaultPrompt;

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          scenarioPrompt: scenarioText,
          currentBalance: initialBalance,
        }),
      });

      if (!res.ok) {
        throw new Error(`Model Error: ${res.statusText}`);
      }

      const predictionData: ScenarioPrediction = await res.json();
      onApplyPrediction(predictionData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'The predictive AI engine is warming up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-scenario-simulation-card" className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-emerald-400 font-mono text-xs tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={12} className="animate-pulse" />
            VIRTUAL CFO SIMULATOR
          </div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight mt-1">
            Predictive Business Scenarios
          </h2>
        </div>
        <div className="bg-[#1C1D21] text-[#10b981] p-2 rounded-xl border border-[#2D2E32]">
          <Sliders size={18} />
        </div>
      </div>

      <p className="text-xs text-zinc-400 mb-6">
        Test high-impact actions (sales hiring, tax shocks, customer churn) to look ahead 6 months in simulated time.
      </p>

      {/* Preset Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {SCENARIOS.map((sc, index) => {
          const isSelected = selectedScenarioIdx === index && !customPrompt;
          return (
            <button
              key={sc.id}
              onClick={() => {
                setSelectedScenarioIdx(index);
                setCustomPrompt('');
              }}
              type="button"
              className={`text-left p-4 rounded-xl border transition-all duration-150 relative overflow-hidden group ${
                isSelected
                  ? 'bg-[#0A0B0D] border-[#10b981] shadow-md shadow-[#10b981]/5'
                  : 'bg-[#0F1014] border-[#26272B] hover:border-[#10b981]/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-xs font-semibold ${isSelected ? 'text-[#10b981]' : 'text-zinc-200 group-hover:text-white'}`}>
                  {sc.name}
                </span>
                {isSelected && <span className="text-[9px] font-mono bg-[#10b981]/10 text-[#10b981] px-1.5 py-0.5 rounded border border-[#10b981]/20">Active</span>}
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2">{sc.description}</p>
              <div className="text-[9px] text-[#71717A] italic mt-3 flex items-center gap-1">
                <Activity size={10} /> Impact: {sc.estimatedImpact}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Prompt Text Area */}
      <div className="mb-6">
        <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-450 mb-2">
          Or Type Custom Scenario (Leverage AI Agency Advisory)
        </label>
        <textarea
          placeholder="e.g. What happens if I acquire a business loan for $80,000 on June 1st at 8% annual interest paid over 2 years, but hire one developer at $5,000/month?"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          className="w-full bg-[#0A0B0D] border border-[#26272B] rounded-xl px-3 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#10b981] min-h-[75px]"
        />
      </div>

      {/* Error Sheet */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs mb-4">
          {error}
        </div>
      )}

      {/* Simulator Trigger */}
      <div className="flex justify-between items-center gap-4">
        {currentPrediction && (
          <button
            onClick={onClearActivePrediction}
            className="text-zinc-400 hover:text-white text-xs font-medium font-sans flex items-center gap-1 transition-colors"
          >
            Clear Active Model
          </button>
        )}
        <button
          onClick={handleSimulate}
          disabled={loading}
          id="btn-simulate"
          className="ml-auto w-full sm:w-auto bg-[#10b981] hover:bg-emerald-600 text-black px-5 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/15"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4.5 w-4.5 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Running CFO Simulation...</span>
            </>
          ) : (
            <>
              <span>Compile AI Scenario Predictor</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>

      {/* RENDER MODEL OUTPUT FOR ACTIVE SELECTION */}
      <AnimatePresence mode="wait">
        {currentPrediction && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="mt-6 border-t border-[#26272B] pt-6"
            id="simulation-report-panel"
          >
            {/* Header Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-[#0A0B0D] p-3 h-full rounded-xl border border-[#26272B]">
                <div className="text-[10px] uppercase font-mono text-zinc-500">Threat Risk Assessment</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-lg font-bold font-mono ${currentPrediction.riskScore > 65 ? 'text-rose-450' : 'text-emerald-400'}`}>
                    {currentPrediction.riskScore}%
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${currentPrediction.riskScore > 65 ? 'bg-rose-500/10 text-rose-400' : 'bg-[#10b981]/10 text-emerald-400'}`}>
                    {currentPrediction.riskScore > 65 ? 'High Risk' : currentPrediction.riskScore > 35 ? 'Moderate' : 'Low Threat'}
                  </span>
                </div>
              </div>

              <div className="bg-[#0A0B0D] p-3 h-full rounded-xl border border-[#26272B]">
                <div className="text-[10px] uppercase font-mono text-zinc-500">Financial Health Rating</div>
                <div className="text-sm font-semibold text-white mt-1.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentPrediction.financialHealthRating === 'Excellent' ? 'bg-[#10b981]' : currentPrediction.financialHealthRating === 'Good' ? 'bg-teal-400' : currentPrediction.financialHealthRating === 'Fair' ? 'bg-amber-400' : 'bg-rose-500'}`}></span>
                  {currentPrediction.financialHealthRating} Health
                </div>
              </div>

              <div className="bg-[#0A0B0D] p-3 h-full rounded-xl border border-[#26272B]">
                <div className="text-[10px] uppercase font-mono text-zinc-500">Reserve Runway Impact</div>
                <div className={`text-sm font-bold font-mono mt-1.5 ${currentPrediction.runwayMonthsImpact >= 0 ? 'text-emerald-400' : 'text-[#ef4444]'}`}>
                  {currentPrediction.runwayMonthsImpact >= 0 ? `+${currentPrediction.runwayMonthsImpact}` : currentPrediction.runwayMonthsImpact} Months
                </div>
              </div>
            </div>

            {/* CFO Narrative Markdown Display */}
            <div className="bg-[#0A0B0D] p-4 rounded-xl border border-[#26272B] text-zinc-300 text-xs leading-relaxed mb-5">
              <h4 className="text-xs font-mono uppercase text-[#10b981] mb-2 flex items-center gap-2">
                <Activity size={12} /> Strategic CFO Narrative
              </h4>
              <p className="whitespace-pre-line text-zinc-300">{currentPrediction.analysis}</p>
            </div>

            {/* Mitigation Recommendations */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-white mb-2.5">Mitigating Action Plan & Advice:</h4>
              <div className="space-y-2">
                {currentPrediction.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-zinc-350">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0"></span>
                    <p>{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Projected Transactions Imported Indicator */}
            <div className="bg-[#0F1014] rounded-xl border border-[#26272B] p-4">
              <h4 className="text-xs font-mono uppercase text-indigo-400 flex items-center gap-1.5 mb-2">
                <TrendingUp size={12} /> Active Scenario Adjustments ({currentPrediction.projectedTransactions.length})
              </h4>
              <p className="text-[11px] text-zinc-400 mb-3">
                The following temporary AI-projected transactions have been merged into your rolling charts for evaluation:
              </p>

              <div className="space-y-2 max-h-[140px] overflow-y-auto divide-y divide-[#1C1D21]">
                {currentPrediction.projectedTransactions.map((pt, j) => {
                  const outSign = pt.amount > 0 ? '+' : '-';
                  return (
                    <div key={j} className="flex justify-between items-center text-[11px] pt-2 first:pt-0">
                      <div className="flex items-center gap-1">
                        <CornerDownRight size={10} className="text-indigo-400" />
                        <span className="text-zinc-200 font-medium">{pt.description}</span>
                        <span className="text-[8px] bg-[#1C1D21] border border-[#2D2E32] text-zinc-400 px-1.5 py-0.2 rounded font-mono uppercase ml-1.5">{pt.category}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#71717A]">{pt.date}</span>
                        <span className={pt.amount > 0 ? 'text-[#10b981] font-semibold' : 'text-rose-450 font-semibold'}>
                          {outSign}${Math.abs(pt.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
