/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Mic, MicOff, Database, CheckCircle, HelpCircle, User, Menu } from "lucide-react";
import { PromptDefinition, UserProfile } from "../types";

interface HeaderProps {
  currentPrompt: PromptDefinition | null;
  apiHealthy: boolean;
  onVoiceInputCaptured: (text: string) => void;
  currentUser: UserProfile | null;
  onAuthClick: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ 
  currentPrompt, 
  apiHealthy, 
  onVoiceInputCaptured,
  currentUser,
  onAuthClick,
  isSidebarCollapsed = false,
  onToggleSidebar
}: HeaderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [supportSpeech, setSupportSpeech] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupportSpeech(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsRecording(true);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      onVoiceInputCaptured(resultText);
    };

    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
  }, [onVoiceInputCaptured]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const overallScore = currentPrompt?.scores?.overall ?? null;
  const tokenEfficiency = currentPrompt?.scores?.tokenEfficiency
    ? `~${Math.round(currentPrompt.scores.tokenEfficiency * 12)} toks`
    : null;

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-2 pt-0.5 select-none gap-2">
      <div className="flex items-center gap-2.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-[#6CECC8] transition-all cursor-pointer shadow-sm hover:border-[#6CECC8]/25"
            title={isSidebarCollapsed ? "Expand Navigation Sidebar" : "Collapse Navigation Sidebar"}
          >
            <Menu className="h-3.5 w-3.5" />
          </button>
        )}
        <div>
          <h1 className="text-base md:text-lg font-space font-extrabold tracking-tight text-[#EDF2FF]">
            PROMPT <span className="text-[#6CECC8] font-space font-black">ARCHITECT</span>
            <span className="ml-2 text-[8px] font-mono uppercase tracking-[0.15em] text-[#9BAAD4]/40 hidden sm:inline-block">
              v7.0 // AI Studio Glass
            </span>
          </h1>
          
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {/* Support speech widget inside micro container */}
            {supportSpeech && (
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                  isRecording
                    ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.15)]"
                    : "bg-white/5 hover:bg-white/10 text-[#9BAAD4] border-white/5 hover:text-white"
                }`}
                title="Speak prompt directives directly"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-2 w-2 text-red-400" />
                    <span>Rec...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-2 w-2 text-[#6CECC8]" />
                    <span>Voice</span>
                  </>
                )}
              </button>
            )}

            {/* Core connection indicator */}
            <div className="flex items-center gap-1 rounded bg-white/5 border border-white/5 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-[#9BAAD4]/80 select-none">
              <span className="w-1 h-1 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_4px_#34d399]"></span>
              <span>API: {apiHealthy ? "ACTIVE" : "MOCKED"}</span>
            </div>

            {/* Federated Auth profile trigger button */}
            <button
              onClick={onAuthClick}
              className="flex items-center gap-1 rounded bg-[#6CECC8]/10 hover:bg-[#6CECC8]/15 border border-[#6CECC8]/25 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest text-[#6CECC8] transition-all font-semibold cursor-pointer"
              title="Manage prompt designer profile"
            >
              {currentUser ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#6CECC8] animate-pulse shadow-[0_0_4px_#6CECC8]"></span>
                  <span>{currentUser.name}</span>
                </>
              ) : (
                <>
                  <User className="h-2 w-2 text-[#6CECC8]" />
                  <span>Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-between w-full md:w-auto text-right font-space shrink-0 items-center">
        {/* Metric 1 */}
        <div className="flex items-center gap-2 border-r border-white/5 pr-3">
          <div className="flex flex-col items-end">
            <span className="text-base md:text-lg font-bold leading-none text-[#6CECC8] tracking-tight">
              {overallScore !== null ? `${overallScore}%` : "—"}
            </span>
            <span className="text-[8px] font-mono text-[#9BAAD4]/50 uppercase tracking-widest mt-0.5">{overallScore !== null ? "Optimized" : "No Prompt"}</span>
          </div>
        </div>

        {/* Metric 2 — only shown when a real prompt with scores exists */}
        {tokenEfficiency !== null && (
          <div className="flex flex-col items-end justify-center">
            <span className="text-base md:text-lg font-semibold leading-none text-[#EDF2FF] tracking-tight">
              {tokenEfficiency}
            </span>
            <span className="text-[8px] font-mono text-[#9BAAD4]/50 uppercase tracking-widest mt-0.5">Token Est.</span>
          </div>
        )}
      </div>
    </header>
  );
}
