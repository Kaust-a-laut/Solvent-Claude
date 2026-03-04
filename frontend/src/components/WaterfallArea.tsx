import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Sparkles, X, RotateCcw, FlaskConical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { WaterfallStageCard, STAGE_CONFIGS } from './waterfall/WaterfallStageCard';
import type { StageKey } from './waterfall/WaterfallStageCard';
import { WaterfallConnector } from './waterfall/WaterfallConnector';
import { WaterfallScore } from './waterfall/WaterfallScore';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STAGE_ORDER: StageKey[] = ['architect', 'reasoner', 'executor', 'reviewer'];

const IDLE_DOTS = [
  { color: 'bg-jb-purple',   glow: 'rgba(157,91,210,0.5)',  delay: 0    },
  { color: 'bg-jb-accent',   glow: 'rgba(60,113,247,0.5)',  delay: 0.5  },
  { color: 'bg-jb-orange',   glow: 'rgba(251,146,60,0.5)',  delay: 1.0  },
  { color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.5)',  delay: 1.5  },
] as const;

const INIT_DOTS = [
  { color: 'bg-jb-purple', glow: 'rgba(157,91,210,0.6)', delay: 0    },
  { color: 'bg-jb-accent', glow: 'rgba(60,113,247,0.6)', delay: 0.25 },
  { color: 'bg-jb-orange', glow: 'rgba(251,146,60,0.6)', delay: 0.5  },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export const WaterfallArea = () => {
  const {
    deviceInfo,
    waterfall,
    waterfallAbortController,
    runFullWaterfall,
    cancelWaterfall,
    resetWaterfall,
    proceedWithWaterfall,
    editPlanDraft,
    setEditPlanDraft,
    applyEditedPlan,
    retryCount,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [expandedStages, setExpandedStages] = useState<Record<StageKey, boolean>>({
    architect: true,
    reasoner:  true,
    executor:  true,
    reviewer:  true,
  });

  // ── Stage timing tracking ──────────────────────────────────────────────────
  const stageStartTimes = useRef<Record<StageKey, number | null>>({
    architect: null,
    reasoner:  null,
    executor:  null,
    reviewer:  null,
  });
  const [stageTimings, setStageTimings] = useState<Partial<Record<StageKey, number>>>({});

  useEffect(() => {
    STAGE_ORDER.forEach((stage) => {
      const status = waterfall.steps[stage].status;
      if (status === 'processing' && stageStartTimes.current[stage] === null) {
        stageStartTimes.current[stage] = Date.now();
      } else if (status === 'completed' && stageStartTimes.current[stage] !== null) {
        setStageTimings((prev) => ({
          ...prev,
          [stage]: Date.now() - (stageStartTimes.current[stage] as number),
        }));
        stageStartTimes.current[stage] = null;
      }
    });
  }, [
    waterfall.steps.architect.status,
    waterfall.steps.reasoner.status,
    waterfall.steps.executor.status,
    waterfall.steps.reviewer.status,
  ]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isStreaming   = waterfallAbortController !== null;
  const isActive      = waterfall.currentStep !== null;
  const isInitializing = !isActive && isStreaming;
  const reviewerScore = waterfall.steps.reviewer.data?.score;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return;
    await runFullWaterfall(input);
  };

  const handleStartEditPlan = () => {
    const planData = waterfall.steps.architect.data;
    setEditPlanDraft(JSON.stringify(planData, null, 2));
  };

  const toggleExpand = (stage: StageKey) =>
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-3xl overflow-y-auto scrollbar-thin">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center justify-between border-b border-white/5 bg-black/40 shrink-0 transition-all duration-500',
        deviceInfo.isMobile ? 'px-6 pt-28 pb-8 h-auto' : 'px-12 h-28',
      )}>
        {/* Left: identity */}
        <div className="flex items-center gap-6">
          <div className="relative w-14 h-14 bg-jb-purple/10 rounded-[1.75rem] flex items-center justify-center border border-jb-purple/20 shadow-2xl shrink-0">
            <div className="absolute inset-0 bg-jb-purple/10 rounded-[1.75rem] blur-xl opacity-70" />
            <FlaskConical className="text-jb-purple relative z-10" size={26} />
            {/* Dot accent */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-jb-purple shadow-[0_0_10px_rgba(157,91,210,0.9)] animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.45em] block mb-1.5">
              Tiered Orchestration Pipeline
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter leading-none">
              Logic <span className="text-vibrant">Waterfall</span>
            </h2>
          </div>
        </div>

        {/* Right: Cancel / Reset (animated in when pipeline is active) */}
        <AnimatePresence>
          {(isActive || isStreaming) && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="flex items-center gap-2"
            >
              {isStreaming && (
                <button
                  onClick={cancelWaterfall}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                >
                  <X size={12} />
                  Cancel
                </button>
              )}
              <button
                onClick={resetWaterfall}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-white/[0.08] transition-all"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Workspace ──────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col gap-6 transition-all duration-500',
        deviceInfo.isMobile ? 'p-6' : 'p-12',
      )}>
        <div className="max-w-3xl w-full mx-auto flex flex-col gap-6">

          {/* ── Mission Directive textarea ─────────────────────────────────── */}
          <div className={cn('rounded-[2rem]', isStreaming && 'vibrant-border')}>
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="flex flex-col gap-4 p-5">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                  Mission Directive
                </span>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Describe the complex task for the pipeline to orchestrate..."
                  rows={3}
                  disabled={isStreaming}
                  className="w-full bg-transparent text-[14px] font-medium text-white placeholder:text-slate-800 resize-none outline-none leading-relaxed input-focus-ring disabled:opacity-50 transition-opacity"
                />
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                  <span className="text-[8px] text-slate-700 font-mono">⌘↩ to submit</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isStreaming}
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-jb-purple/15 border border-jb-purple/25 text-jb-purple text-[10px] font-black uppercase tracking-widest hover:bg-jb-purple/25 disabled:opacity-30 transition-all shadow-lg"
                  >
                    <Sparkles size={13} className={isStreaming ? 'animate-pulse' : ''} />
                    {isStreaming ? 'Processing...' : 'Initiate'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Reviewer score ring ────────────────────────────────────────── */}
          <AnimatePresence>
            {reviewerScore != null && (
              <motion.div
                key="score-ring"
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="flex justify-center py-2"
              >
                <WaterfallScore score={reviewerScore} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Pipeline / Idle / Initializing ────────────────────────────── */}
          <AnimatePresence mode="wait">

            {/* Initializing: pipeline not yet set up but request is in flight */}
            {isInitializing && (
              <motion.div
                key="initializing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center gap-6 py-24"
              >
                <div className="flex items-center gap-4">
                  {INIT_DOTS.map((dot, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.65, 1], opacity: [0.35, 1, 0.35] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: dot.delay, ease: 'easeInOut' }}
                      className={cn('w-4 h-4 rounded-full', dot.color)}
                      style={{ boxShadow: `0 0 18px ${dot.glow}` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-600 animate-pulse">
                  Initializing Pipeline...
                </span>
              </motion.div>
            )}

            {/* Active: cascade of stage cards with connectors */}
            {isActive && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                {STAGE_ORDER.map((stageKey, i) => {
                  const config  = STAGE_CONFIGS[stageKey];
                  const step    = waterfall.steps[stageKey];
                  const isLast  = i === STAGE_ORDER.length - 1;
                  const nextKey = !isLast ? STAGE_ORDER[i + 1] : null;
                  const isArchitectConnector = stageKey === 'architect';

                  return (
                    <div key={stageKey}>
                      <WaterfallStageCard
                        config={config}
                        status={step.status}
                        data={step.data}
                        error={step.error}
                        retryCount={stageKey === 'executor' ? retryCount : 0}
                        isExpanded={expandedStages[stageKey]}
                        onToggleExpand={() => toggleExpand(stageKey)}
                        timing={stageTimings[stageKey]}
                      />

                      {/* Connector between this stage and next */}
                      {!isLast && nextKey && (
                        <WaterfallConnector
                          fromStatus={step.status}
                          fromColor={config.color}
                          toColor={STAGE_CONFIGS[nextKey].color}
                          // Human-in-the-Loop plan editing — only on architect→reasoner
                          showEditPlan={isArchitectConnector}
                          editPlanDraft={isArchitectConnector ? editPlanDraft : null}
                          onStartEdit={isArchitectConnector ? handleStartEditPlan : undefined}
                          onEditChange={isArchitectConnector ? setEditPlanDraft : undefined}
                          onApplyEdit={isArchitectConnector ? applyEditedPlan : undefined}
                          onCancelEdit={isArchitectConnector ? () => setEditPlanDraft(null) : undefined}
                          // Resource gate controls — only on architect→reasoner when paused
                          isPaused={isArchitectConnector ? step.status === 'paused' : false}
                          onProceed={isArchitectConnector ? proceedWithWaterfall : undefined}
                          onCancel={isArchitectConnector ? cancelWaterfall : undefined}
                        />
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Idle: floating dots + prompt text */}
            {!isActive && !isStreaming && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 py-24"
              >
                <div className="flex items-end gap-3">
                  {IDLE_DOTS.map((dot, i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -8, 0], opacity: [0.25, 0.65, 0.25] }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        delay: dot.delay,
                        ease: 'easeInOut',
                      }}
                      className={cn('w-2.5 h-2.5 rounded-full', dot.color)}
                      style={{ boxShadow: `0 0 8px ${dot.glow}` }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.45em] text-slate-700 text-center max-w-xs">
                  Enter a mission directive to begin the cascade
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
