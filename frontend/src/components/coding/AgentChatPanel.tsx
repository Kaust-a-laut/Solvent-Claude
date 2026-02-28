import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Trash2, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import type { AgentMessage, CodeSuggestion } from '../../store/codingSlice';
import { fetchWithRetry } from '../../lib/api-client';
import { API_BASE_URL } from '../../lib/config';
import { AgentCodeBlock } from './AgentCodeBlock';
import {
  SLASH_COMMANDS,
  parseSlashCommand,
  buildSystemPrompt,
} from './slashCommands';

// Extracts fenced code blocks from AI response text
function extractCodeBlocks(text: string): { cleanText: string; blocks: CodeSuggestion[] } {
  const blocks: CodeSuggestion[] = [];
  let idx = 0;
  const cleanText = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = `cb-${Date.now()}-${idx++}`;
    blocks.push({ id, language: lang || 'text', code: code.trim(), applied: false, rejected: false });
    return `[[CODE_BLOCK:${id}]]`;
  });
  return { cleanText, blocks };
}

export const AgentChatPanel: React.FC = () => {
  const {
    agentMessages, addAgentMessage, clearAgentMessages, updateAgentMessage,
    activeFile, openFiles, selectedCloudModel, selectedCloudProvider, apiKeys,
    setPendingDiff,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [fileContextActive, setFileContextActive] = useState(true);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeFileContent = openFiles.find((f) => f.path === activeFile)?.content ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');
    setShowSlashMenu(false);

    const parsed = parseSlashCommand(text);
    const slashCmd = parsed ? SLASH_COMMANDS.find((c) => c.id === parsed.command) : null;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      fileContext: fileContextActive && activeFile ? activeFile : undefined,
    };
    addAgentMessage(userMsg);

    setIsGenerating(true);
    try {
      const systemPrompt = buildSystemPrompt(
        fileContextActive ? activeFile : null,
        fileContextActive ? activeFileContent : null,
        null
      );

      const messages = [
        { role: 'system', content: slashCmd ? slashCmd.systemInstruction + '\n\n' + systemPrompt : systemPrompt },
        ...agentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: parsed?.rest || text },
      ];

      const data = await fetchWithRetry(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedCloudProvider || 'groq',
          model: selectedCloudModel,
          messages,
          apiKeys,
        }),
      }) as Record<string, unknown>;

      const rawResponse: string = (data.response as string) ?? '';
      const { cleanText, blocks } = extractCodeBlocks(rawResponse);

      const assistantMsg: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: cleanText,
        codeBlocks: blocks,
      };
      addAgentMessage(assistantMsg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addAgentMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error: ${message}`,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, agentMessages, activeFile, activeFileContent, fileContextActive,
      addAgentMessage, selectedCloudModel, selectedCloudProvider, apiKeys, setPendingDiff]);

  const handleApply = (msgId: string, blockId: string) => {
    const msg = agentMessages.find((m) => m.id === msgId);
    const block = msg?.codeBlocks?.find((b) => b.id === blockId);
    if (!block || !activeFile || !activeFileContent) return;
    setPendingDiff({
      original: activeFileContent,
      modified: block.code,
      filePath: activeFile,
      description: 'AI suggestion from chat',
    });
    updateAgentMessage(msgId, {
      codeBlocks: msg!.codeBlocks!.map((b) => b.id === blockId ? { ...b, applied: true } : b),
    });
  };

  const handleReject = (msgId: string, blockId: string) => {
    const msg = agentMessages.find((m) => m.id === msgId);
    if (!msg?.codeBlocks) return;
    updateAgentMessage(msgId, {
      codeBlocks: msg.codeBlocks.map((b) => b.id === blockId ? { ...b, rejected: true } : b),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === '/') {
      setShowSlashMenu(true);
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setShowSlashMenu(e.target.value.startsWith('/') && e.target.value.length < 20);
  };

  const renderMessageContent = (msg: AgentMessage) => {
    const parts = msg.content.split(/(\[\[CODE_BLOCK:[^\]]+\]\])/);
    return (
      <>
        {parts.map((part, i) => {
          const blockMatch = part.match(/\[\[CODE_BLOCK:([^\]]+)\]\]/);
          if (blockMatch) {
            const block = msg.codeBlocks?.find((b) => b.id === blockMatch[1]);
            if (block) {
              return (
                <AgentCodeBlock
                  key={block.id}
                  suggestion={block}
                  onApply={(id) => handleApply(msg.id, id)}
                  onReject={(id) => handleReject(msg.id, id)}
                />
              );
            }
          }
          return part ? (
            <p key={i} className="text-[12px] leading-relaxed text-slate-300 whitespace-pre-wrap">{part}</p>
          ) : null;
        })}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-jb-accent" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Agent</span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/30 truncate max-w-[100px]">{selectedCloudModel ?? 'auto'}</span>
        </div>
        <button
          type="button"
          onClick={clearAgentMessages}
          className="p-1 hover:bg-white/10 rounded text-white/20 hover:text-white/50 transition-colors"
          title="Clear chat"
          aria-label="Clear chat"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {agentMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 gap-3">
            <Sparkles size={28} strokeWidth={1} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Ask the agent anything</p>
          </div>
        )}
        {agentMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'rounded-xl px-3 py-2',
              msg.role === 'user'
                ? 'bg-jb-accent/[0.08] border border-jb-accent/15 ml-4'
                : 'bg-white/[0.03] border border-white/[0.05]'
            )}
          >
            {msg.fileContext && (
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/40 font-mono">
                  📄 {msg.fileContext.split('/').pop()}
                </span>
              </div>
            )}
            {renderMessageContent(msg)}
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-jb-accent/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Slash command menu */}
      {showSlashMenu && (
        <div className="mx-3 mb-1 rounded-xl border border-white/[0.07] bg-[#0a0a14] overflow-hidden">
          {SLASH_COMMANDS.filter((c) => input === '/' || c.id.startsWith(input.slice(1))).map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => { setInput(cmd.label + ' '); setShowSlashMenu(false); inputRef.current?.focus(); }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
            >
              <span className="text-[11px] font-mono text-jb-accent font-bold w-20 shrink-0">{cmd.label}</span>
              <span className="text-[10px] text-white/40">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-white/[0.04] shrink-0">
        {/* Active file badge */}
        {activeFile && (
          <div className="flex items-center gap-1 mb-2">
            <button
              type="button"
              onClick={() => setFileContextActive(!fileContextActive)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors border',
                fileContextActive
                  ? 'bg-jb-accent/10 border-jb-accent/20 text-jb-accent/80'
                  : 'bg-white/5 border-white/10 text-white/30 line-through'
              )}
            >
              📄 {activeFile.split('/').pop()}
            </button>
          </div>
        )}
        {/* Text input */}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="/fix, /explain, /test…"
            rows={2}
            className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-slate-200 placeholder-white/20 resize-none focus:outline-none focus:border-jb-accent/30 scrollbar-thin"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="p-2.5 rounded-xl bg-jb-accent/15 border border-jb-accent/25 text-jb-accent hover:bg-jb-accent/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        {/* Slash command chips */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {['/fix', '/explain', '/test'].map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => { setInput(cmd + ' '); inputRef.current?.focus(); }}
              className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[9px] font-mono text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
