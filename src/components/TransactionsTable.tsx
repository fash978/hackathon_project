import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  Search, Plus, Filter, Trash2, Calendar, DollarSign, ArrowUpLeft, ArrowDownRight, Tag,
  Briefcase, Coffee, ShoppingBag, Landmark, Key, HeartPulse, Sparkles, SlidersHorizontal, CheckCircle2, AlertCircle, Sparkle
} from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  activeCurrencySymbol: string;
  activeCurrencyCode: string;
  activeExchangeRate: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Sales Retainer': <Briefcase className="text-emerald-400" size={14} />,
  'Project Revenue': <Sparkles className="text-purple-400" size={14} />,
  'Rent & Space': <Key className="text-orange-400" size={14} />,
  'Salaries': <Landmark className="text-blue-400" size={14} />,
  'SaaS & Infrastructure': <ShoppingBag className="text-amber-400" size={14} />,
  'Marketing': <Coffee className="text-indigo-400" size={14} />,
  'Contractors': <HeartPulse className="text-pink-400" size={14} />,
  'Taxes': <AlertCircle className="text-rose-400" size={14} />,
};

const AVAILABLE_CATEGORIES = [
  'Sales Retainer',
  'Project Revenue',
  'Rent & Space',
  'Salaries',
  'SaaS & Infrastructure',
  'Marketing',
  'Contractors',
  'Taxes',
  'Consulting Inflow',
  'Travel Outflow',
  'Miscellaneous'
];

export default function TransactionsTable({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction,
  activeCurrencySymbol,
  activeCurrencyCode,
  activeExchangeRate
}: TransactionsTableProps) {
  // Filter core states
  const [search, setSearch] = useState('');
  const [flowFilter, setFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'projected'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // New Transaction Form state
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'outflow' as 'inflow' | 'outflow',
    category: 'Rent & Space',
    date: new Date().toISOString().substring(0, 10),
    status: 'pending' as 'completed' | 'pending' | 'projected',
  });

  // Calculate distinct categories present
  const presentCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [transactions]);

  // Combined filtered output
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase());
      const matchFlow = flowFilter === 'all' || t.type === flowFilter;
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchCat = categoryFilter === 'all' || t.category === categoryFilter;

      return matchSearch && matchFlow && matchStatus && matchCat;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, flowFilter, statusFilter, categoryFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    let parsedAmt = parseFloat(formData.amount);
    if (isNaN(parsedAmt)) return;

    // Standardize amount signs (negative for outflow)
    if (formData.type === 'outflow' && parsedAmt > 0) {
      parsedAmt = -parsedAmt;
    } else if (formData.type === 'inflow' && parsedAmt < 0) {
      parsedAmt = Math.abs(parsedAmt);
    }

    onAddTransaction({
      description: formData.description,
      amount: parsedAmt / activeExchangeRate,
      type: formData.type,
      category: formData.category,
      date: formData.date,
      status: formData.status,
    });

    // Reset Form
    setFormData({
      description: '',
      amount: '',
      type: 'outflow',
      category: 'Rent & Space',
      date: new Date().toISOString().substring(0, 10),
      status: 'pending',
    });
    setIsAdding(false);
  };

  return (
    <div className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl" id="ledger-manager-card">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight text-white flex items-center gap-2">
            Interactive Transaction Book
            <span className="text-xs bg-[#1C1D21] text-zinc-400 font-mono px-2 py-0.5 rounded-full border border-[#2D2E32]">
              {filteredTransactions.length} items
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            Maintain invoices, retainers, taxes, and operational expenses in real-time.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          id="btn-trigger-add-transaction"
          className="bg-[#10b981] hover:bg-emerald-600 text-black px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition duration-200 shadow-lg shadow-emerald-500/15"
        >
          <Plus size={14} /> Add Transaction
        </button>
      </div>

      {/* Dynamic Slide-Down New Transaction Entry Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} id="add-transaction-form" className="bg-[#0A0B0D] border border-[#26272B] rounded-xl p-4 mb-6 transition">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#10b981] mb-3 flex items-center gap-1">
            <Plus size={14} /> Record Manual Cashflow Node
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Acme Invoice, Cloud Licenses"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Amount ({activeCurrencySymbol} {activeCurrencyCode})</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 4500"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Flow Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as 'inflow' | 'outflow' })}
                className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="outflow">Expense / Outflow (-)</option>
                <option value="inflow">Revenue / Inflow (+)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {AVAILABLE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Simulation Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="completed">Completed (Historic)</option>
                <option value="pending">Pending (Awaiting Settlement)</option>
                <option value="projected">AI Model Projected</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#26272B]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg border border-[#2D2E32] text-zinc-400 hover:bg-[#1C1D21] text-xs transition duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#10b981] hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-150"
            >
              Record Transaction
            </button>
          </div>
        </form>
      )}

      {/* FILTER CONTROL SHELF */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0F1014] p-3 rounded-xl border border-[#26272B] mb-4">
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search memo or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#141519] border border-[#26272B] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Direction filter */}
        <div className="flex bg-[#141519] border border-[#26272B] p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setFlowFilter('all')}
            className={`flex-1 text-[10px] font-mono py-1 rounded ${flowFilter === 'all' ? 'bg-[#1C1D21] text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFlowFilter('inflow')}
            className={`flex-1 text-[10px] font-mono py-1 rounded ${flowFilter === 'inflow' ? 'bg-[#10b981]/20 text-[#10b981] font-semibold' : 'text-zinc-400 hover:text-[#10b981]'}`}
          >
            Inflow
          </button>
          <button
            type="button"
            onClick={() => setFlowFilter('outflow')}
            className={`flex-1 text-[10px] font-mono py-1 rounded ${flowFilter === 'outflow' ? 'bg-rose-500/20 text-rose-400 font-semibold' : 'text-zinc-400 hover:text-rose-400'}`}
          >
            Outflow
          </button>
        </div>

        {/* Status filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Status: (All)</option>
            <option value="completed">Historic Completed</option>
            <option value="pending">Upcoming Pending</option>
            <option value="projected">AI Predicted</option>
          </select>
        </div>

        {/* Category filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full bg-[#141519] border border-[#26272B] rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Category: (All)</option>
            {presentCategories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RENDER TABLE ROWS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#26272B] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
              <th className="pb-3 pl-2">Flow / Memo</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Due Date</th>
              <th className="pb-3">Confidence Status</th>
              <th className="pb-3 text-right pr-4">Amount</th>
              <th className="pb-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26272B]/60 font-sans text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                  No matches found of current parameters. Record a transaction or run an AI forecast!
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isPositive = tx.amount > 0;
                // Status styles
                const statusStyles = {
                  completed: 'bg-[#10b981]/15 text-emerald-400 border border-emerald-500/20',
                  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
                  projected: 'bg-indigo-500/15 text-indigo-400 border border-indigo-400/25'
                }[tx.status];

                const statusIcons = {
                  completed: <CheckCircle2 size={10} className="inline mr-1 text-emerald-400" />,
                  pending: <Calendar size={10} className="inline mr-1 text-amber-400" />,
                  projected: <Sparkle size={10} className="inline mr-1 text-indigo-400" />
                }[tx.status];

                return (
                  <tr key={tx.id} className="hover:bg-[#1C1D21]/30 transition-colors group">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {isPositive ? <ArrowUpLeft size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        <div>
                          <p className="text-white font-medium line-clamp-1">{tx.description}</p>
                          <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5 sm:hidden">
                            #{tx.id} • {tx.category}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 hidden sm:table-cell text-zinc-350">
                      <span className="inline-flex items-center gap-1.5 bg-[#1C1D21] px-2.5 py-1 rounded-md border border-[#2D2E32]">
                        {CATEGORY_ICONS[tx.category] || <Tag size={10} className="text-zinc-400" />}
                        <span className="text-xs text-zinc-300 font-medium">{tx.category}</span>
                      </span>
                    </td>

                    <td className="py-3.5 text-zinc-300 font-mono">
                      {tx.date}
                    </td>

                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono ${statusStyles}`}>
                        {statusIcons}
                        {tx.status}
                      </span>
                    </td>

                    <td className={`py-3.5 text-right pr-4 font-mono font-semibold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {isPositive ? '+' : '-'}{activeCurrencySymbol}{Math.round(Math.abs(tx.amount) * activeExchangeRate).toLocaleString()}
                    </td>

                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#1C1D21] transition"
                        title="Remove Node"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
