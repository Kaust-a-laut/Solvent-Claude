import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { Swords, Bot, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { parse } from 'marked';

export const DebateArea = () => {
  const [isDebating, setIsDebating] = useState(false);
  const [leftHistory, setLeftHistory] = useState<any[]>([]);
  const [rightHistory, setRightHistory] = useState<any[]>([]);
  const [topic, setTopic] = useState("The future of Artificial Intelligence");

  const callModel = async (provider: string, model: string, history: any[], prompt: string) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         provider,
         model,
         messages: [...history, { role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.response;
  };

  const handleStartDebate = async () => {
     if (!topic.trim()) return;
     setIsDebating(true);
     setLeftHistory([]);
     setRightHistory([]);

     try {
         // Round 1: Gemini Proposes
         const leftResponse = await callModel('gemini', 'gemini-1.5-flash', [], `Present a strong argument for: "${topic}". Be concise and provocative.`);
         setLeftHistory([{ role: 'assistant', content: leftResponse }]);
         
         // Round 1: Ollama Rebuts
         const rightResponse = await callModel('ollama', 'qwen2.5:3b', [], `Critique this argument aggressively: "${leftResponse}". Defend the opposing view.`);
         setRightHistory([{ role: 'assistant', content: rightResponse }]);
         
         // Round 2: Gemini Counter-Rebuts
         const leftRebuttal = await callModel('gemini', 'gemini-1.5-flash', [{ role: 'user', content: topic }, { role: 'assistant', content: leftResponse }], `Your argument was critiqued: "${rightResponse}". Counter this critique effectively.`);
         setLeftHistory(prev => [...prev, { role: 'assistant', content: leftRebuttal }]);

     } catch (e) {
         console.error(e);
     } finally {
         setIsDebating(false);
     }
  };

  return (
    <div className="flex flex-col h-full bg-jb-dark/50 backdrop-blur-sm rounded-tl-2xl border-l border-t border-jb-border/50 overflow-hidden shadow-2xl p-6">
      
      {/* Header / Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-jb-purple/20 rounded-xl border border-jb-purple/50">
                <Swords className="text-jb-purple" size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-200">Adversarial Debate Lab</h2>
                <p className="text-xs text-slate-500 font-mono">Gemini Pro (Cloud) vs Qwen 2.5 (Local)</p>
            </div>
        </div>

        <div className="flex gap-3">
            <input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-jb-panel border border-jb-border rounded-lg px-4 py-2 w-96 text-sm outline-none focus:border-jb-purple"
              placeholder="Enter debate topic..."
            />
            <button 
                onClick={handleStartDebate} 
                disabled={isDebating}
                className="bg-jb-purple hover:bg-fuchsia-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
                {isDebating ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                {isDebating ? 'Debating...' : 'Ignite Debate'}
            </button>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        
        {/* Left Corner (Gemini) */}
        <div className="flex flex-col gap-4 bg-gradient-to-b from-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 text-blue-400 font-bold border-b border-blue-500/20 pb-2">
                <Bot size={18} /> Gemini Pro
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                {leftHistory.map((m, i) => (
                    <div key={i} className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl text-sm text-slate-300 leading-relaxed shadow-lg">
                        <div dangerouslySetInnerHTML={{ __html: parse(m.content) as string }} />
                    </div>
                ))}
            </div>
        </div>

        {/* Right Corner (Ollama) */}
        <div className="flex flex-col gap-4 bg-gradient-to-b from-orange-500/5 to-transparent border border-orange-500/20 rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center gap-2 text-orange-400 font-bold border-b border-orange-500/20 pb-2">
                <Bot size={18} /> Qwen 2.5 (Local)
            </div>
             <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                {rightHistory.map((m, i) => (
                    <div key={i} className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl text-sm text-slate-300 leading-relaxed shadow-lg">
                         <div dangerouslySetInnerHTML={{ __html: parse(m.content) as string }} />
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};