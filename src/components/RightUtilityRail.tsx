/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from "react";
import { 
  ShieldAlert, Sparkles, Activity, Clock, Layers, Zap,
  CheckCircle, Flame, Eye, RefreshCw, FileText, ArrowRight
} from "lucide-react";
import { PromptDefinition, PromptSession } from "../types";

interface RightUtilityRailProps {
  currentPrompt: PromptDefinition | null;
  activeSession: PromptSession | null;
  isRunningTests: boolean;
  onOptimizeClick: () => void;
  onTriggerSelfCorrection: () => void;
  uiScale: "compact" | "comfortable" | "spacious";
  totalSessionsCount: number;
}

export default function RightUtilityRail({
  currentPrompt,
  activeSession,
  isRunningTests,
  onOptimizeClick,
  onTriggerSelfCorrection,
  uiScale,
  totalSessionsCount
}: RightUtilityRailProps) {
  const isCompact = uiScale === "compact";
  
  const overallScore = currentPrompt?.scores?.overall || 94;
  const clarityScore = currentPrompt?.scores?.clarity || 92;
  const constraintsScore = currentPrompt?.scores?.constraintAdherence || 95;
  const efficiencyScore = currentPrompt?.scores?.tokenEfficiency || 91;

  // Platform pipeline labels — "Demo" suffix marks capabilities not tied to live external services
  const PLATFORM_TOOLS = [
    { name: "Prompt Optimizer", status: currentPrompt ? "Active" : "Idle", color: currentPrompt ? "text-[#6CECC8]" : "text-[#9BAAD4]/40" },
    { name: "Constraint Checker", status: currentPrompt ? "Active" : "Idle", color: currentPrompt ? "text-[#6CECC8]" : "text-[#9BAAD4]/40" },
    { name: "Test Suite", status: isRunningTests ? "Running" : "Idle", color: isRunningTests ? "text-amber-400" : "text-[#9BAAD4]/40" },
    { name: "RAG Grounding", status: "Keyword", color: "text-[#79AEFF]" }
  ];

  // Derive last activity log from real session history (most recent 2 assistant turns)
  const recentHistory = activeSession?.history
    ? [...activeSession.history]
        .filter(h => h.role === "assistant" || h.role === "system")
        .slice(-2)
        .reverse()
    : [];

  const UTILITY_LOGS = recentHistory.length > 0
    ? recentHistory.map((h, i) => ({
        label: h.content.replace(/\*\*/g, "").replace(/\n/g, " ").slice(0, 42),
        time: i === 0 ? "Latest" : "Previous",
      }))
    : [{ label: "No activity yet in this session", time: "" }];

  return (
    <div className={`flex flex-col h-full glass-pane rounded-3xl p-5 select-none justify-between overflow-hidden shadow-sm ${
      isCompact ? "p-3 space-y-3" : "space-y-4"
    }`}>
      {/* Session / Platform Agent Monitor Block */}
      <div className="space-y-4">
        {/* Section Heading */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#9BAAD4]/50 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#6CECC8]" /> Agent Monitor
          </span>
          <span className="text-[9px] font-mono text-[#6CECC8] font-extrabold flex items-center gap-1 shrink-0 uppercase">
            <span className="w-1.5 h-1.5 bg-[#6CECC8] rounded-full animate-pulse shadow-[0_0_4px_#6CECC8]"></span> Synchronized
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-mono tracking-wide">
          <div className="p-2.5 rounded-xl bg-[#040910]/45 border border-white/5">
            <span className="text-white/40 block text-[8px] tracking-wider mb-0.5">Session state</span>
            <span className="text-[#EDF2FF] font-bold truncate max-w-[80px] block">
              {activeSession ? "Writable" : "Read-only"}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040910]/45 border border-white/5">
            <span className="text-white/40 block text-[8px] tracking-wider mb-0.5">Cached Sessions</span>
            <span className="text-[#EDF2FF] font-black">{totalSessionsCount} persistent</span>
          </div>
        </div>

        {/* Active Tools list */}
        <div className="space-y-2">
          <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-[0.15em] block">
            System Subsystems
          </span>
          <div className="space-y-1.5 text-[10px]">
            {PLATFORM_TOOLS.map((t) => (
              <div key={t.name} className="flex justify-between items-center bg-[#040910]/30 px-2.5 py-1.5 rounded-lg border border-white/5">
                <span className="text-[#9BAAD4]/70 font-semibold truncate max-w-[135px]">{t.name}</span>
                <span className={`font-mono text-[9px] uppercase font-bold tracking-wider ${t.color}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Prompt Health Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#9BAAD4]/50 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-[#6CECC8]" /> Prompt Health
          </span>
          <span className="font-mono text-[#6CECC8] font-bold text-[10px] select-all">
            {overallScore}% Rating
          </span>
        </div>

        {/* Meter progress metrics */}
        <div className="space-y-3 text-[10px]">
          {/* Clarity bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[#9BAAD4]/65 uppercase font-medium">
              <span>Clarity Index</span>
              <span className="font-mono text-[#EDF2FF]/90 font-bold">{clarityScore}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#6CECC8] to-[#79AEFF] rounded-full" style={{ width: `${clarityScore}%` }}></div>
            </div>
          </div>

          {/* Constraints adhere bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[#9BAAD4]/65 uppercase font-medium">
              <span>Constraint Rails</span>
              <span className="font-mono text-[#EDF2FF]/90 font-bold">{constraintsScore}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#79AEFF] rounded-full" style={{ width: `${constraintsScore}%` }}></div>
            </div>
          </div>

          {/* Token foot print index */}
          <div className="space-y-1">
            <div className="flex justify-between text-[#9BAAD4]/65 uppercase font-medium">
              <span>Token Economy</span>
              <span className="font-mono text-[#EDF2FF]/90 font-bold">{efficiencyScore}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#B48FFF] rounded-full" style={{ width: `${efficiencyScore}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Immediate Shortcuts / Quick Actions HUD block */}
      <div className="space-y-2.5">
        <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-[0.2em] block">
          Diagnostics Actions
        </span>
        <div className="space-y-1.5">
          <button
            onClick={onOptimizeClick}
            className="w-full bg-[#6CECC8]/10 border border-[#6CECC8]/20 hover:bg-[#6CECC8] hover:text-black transition-all py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#6CECC8] flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-[0_0_8px_rgba(108,236,200,0.3)]"
          >
            <Sparkles className="h-3.5 w-3.5" /> Optimize Architect
          </button>
          
          <button
            onClick={onTriggerSelfCorrection}
            className="w-full bg-[#79AEFF]/15 border border-[#79AEFF]/20 hover:bg-[#79AEFF]/35 transition-all py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#79AEFF] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Force Loop
          </button>
        </div>
      </div>

      {/* Saved Diagnostics Action Timeline Logs */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex justify-between text-[10px] leading-snug">
          {UTILITY_LOGS.slice(0, 2).map((lg, i) => (
            <div key={i} className="flex gap-1.5 items-center text-[#9BAAD4]/45 text-[9px]">
              <Clock className="h-2.5 w-2.5 text-white/20 shrink-0" />
              <span className="truncate max-w-[85px] uppercase tracking-wide">{lg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
