import React, { useState, useRef, useEffect } from 'react';
import { Transaction, ChatMessage } from '../types';
import { Send, Sparkles, User, HelpCircle, ArrowRight, Loader2, Landmark } from 'lucide-react';

interface AICoachProps {
  transactions: Transaction[];
  initialBalance: number;
}

const PRESET_QUESTIONS = [
  'Estimate my current monthly runway survival rate?',
  'What strategic contract structures can protect against client payment lag?',
  'How do I implement effective cashflow reserve targets for a digital SME?',
  'What are some safe ways to lower monthly SaaS/overhead burn?'
];

// Lightweight custom markdown compiler to render AI guidance nicely
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-xs text-slate-300">
      {lines.map((line, index) => {
        let trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('###')) {
          return <h5 key={index} className="text-white font-semibold text-xs mt-3 mb-1 font-sans">{trimmed.replace('###', '').trim()}</h5>;
        }
        if (trimmed.startsWith('##')) {
          return <h4 key={index} className="text-emerald-400 font-semibold text-sm mt-4 mb-2 font-sans">{trimmed.replace('##', '').trim()}</h4>;
        }
        if (trimmed.startsWith('#')) {
          return <h3 key={index} className="text-white font-bold text-base mt-4 mb-2 font-sans">{trimmed.replace('#', '').trim()}</h3>;
        }

        // Bullet list
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const content = trimmed.substring(1).trim();
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span>{content}</span>
            </div>
          );
        }

        // Bold formatting parse (simplistic)
        const parts = trimmed.split('**');
        if (parts.length > 1) {
          return (
            <p key={index} className="leading-relaxed">
              {parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="text-white font-medium">{p}</strong> : p))}
            </p>
          );
        }

        if (trimmed === '') {
          return <div key={index} className="h-2" />;
        }

        return <p key={index} className="leading-relaxed">{trimmed}</p>;
      })}
    </div>
  );
}

export default function AICoach({ transactions, initialBalance }: AICoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'ai',
      text: "Hello! I am your AI Virtual CFO. Let's optimize your cashflow and liquidity. Ask me questions on runway ratios, cash reserves, debt management, or budget optimizations based on your active transactions.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          transactions,
          currentBalance: initialBalance,
        }),
      });

      if (!res.ok) {
        throw new Error('CFO model service is momentarily offline.');
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'ai',
          text: 'Oops! I had an issue connecting to the AI brain. Please verify processes are run and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  return (
    <div id="ai-advisor-coach-card" className="bg-[#141519] border border-[#26272B] rounded-2xl p-6 shadow-xl flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#26272B] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">SME Advisory Terminal</h3>
            <span className="text-[10px] font-mono text-[#10b981]">CFO Co-Pilot Active</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
          <span className="font-mono text-[10px]">Kashflow Advisor</span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.map((msg) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] shrink-0 ${isAI ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25' : 'bg-[#1C1D21] text-zinc-200 border border-[#2D2E32]'}`}>
                {isAI ? <Sparkles size={12} /> : <User size={12} />}
              </div>
              <div className={`p-3.5 rounded-2xl ${isAI ? 'bg-[#0A0B0D] text-zinc-200 border border-[#26272B]' : 'bg-[#1C1D21] text-white border border-[#2D2E32]'}`}>
                {isAI ? (
                  <SimpleMarkdown text={msg.text} />
                ) : (
                  <p className="text-xs leading-relaxed">{msg.text}</p>
                )}
                <span className="block text-[8px] text-[#71717A] mt-2 text-right font-mono">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-6 h-6 rounded-md bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 flex items-center justify-center shrink-0">
              <Loader2 size={12} className="animate-spin" />
            </div>
            <div className="bg-[#0A0B0D] text-zinc-400 border border-[#26272B] px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
              <span className="text-xs font-mono">Formulating strategy model...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts chips */}
      {messages.length < 3 && !loading && (
        <div className="py-2.5 border-t border-[#26272B] shrink-0">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <HelpCircle size={10} /> Consult CFO On Recommended Subjects:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-[10px] text-zinc-300 hover:text-white bg-[#0A0B0D] hover:bg-[#1C1D21] font-sans border border-[#26272B] rounded-lg px-2.5 py-1 text-left transition duration-150 flex items-center gap-1"
              >
                <span>{q}</span>
                <ArrowRight size={10} className="shrink-0 text-zinc-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Input Form */}
      <form onSubmit={handleFormSubmit} className="pt-3 border-t border-[#26272B] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your strategic query (e.g. Can we delay payment terms?)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-1 bg-[#0A0B0D] border border-[#26272B] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#10b981] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="bg-[#10b981] text-black hover:bg-emerald-600 disabled:opacity-40 p-2.5 rounded-xl transition duration-150 shrink-0 flex items-center justify-center"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
