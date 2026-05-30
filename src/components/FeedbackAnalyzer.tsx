/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LifeBuoy, AlertTriangle, Lightbulb, Wand2, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { PromptDefinition } from "../types";

interface FeedbackAnalyzerProps {
  prompt: PromptDefinition | null;
  onAnalyzeFeedback: (originalPrompt: string, pastedOutput: string, expectation: string) => void;
  isAnalyzing: boolean;
  analysisResult: any;
}

export default function FeedbackAnalyzer({
  prompt,
  onAnalyzeFeedback,
  isAnalyzing,
  analysisResult,
}: FeedbackAnalyzerProps) {
  const [originalPromptText, setOriginalPromptText] = useState("");
  const [badOutputText, setBadOutputText] = useState("");
  const [expectationText, setExpectationText] = useState("");

  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badOutputText.trim()) return;

    // Use current prompt's system instructions if they don't specify an alternative
    const promptToSend = originalPromptText.trim() || (prompt ? prompt.systemInstruction : "");
    onAnalyzeFeedback(promptToSend, badOutputText, expectationText);
  };

  const loadCurrentPromptIntoInputs = () => {
    if (prompt) {
      setOriginalPromptText(prompt.systemInstruction);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 font-sans">
      {/* Input Form console */}
      <div className="col-span-1 lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 select-none">
          <LifeBuoy className="h-5 w-5 text-emerald-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">AI Studio Feedback Debugger</h4>
            <p className="text-[10px] font-mono text-white/45 uppercase tracking-widest">Auto diagnose & patch prompt bugs</p>
          </div>
        </div>

        <form onSubmit={handleRunAnalysis} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono uppercase text-white/40 tracking-widest select-none">
              <label>Original System Instruction</label>
              {prompt && (
                <button
                  type="button"
                  onClick={loadCurrentPromptIntoInputs}
                  className="text-emerald-400 hover:text-emerald-300 font-extrabold"
                >
                  Load Active System Prompt
                </button>
              )}
            </div>
            <textarea
              value={originalPromptText}
              onChange={(e) => setOriginalPromptText(e.target.value)}
              placeholder="Paste original AI Studio instruction here (or leave blank to use active prompt)..."
              className="w-full text-xs rounded-xl border border-white/15 px-4 py-2.5 h-36 font-mono bg-white/5 text-white uppercase placeholder:text-white/20 tracking-wider font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-white/40 tracking-widest block select-none">Pasted Defective Output (AI Studio Response)</label>
            <textarea
              required
              value={badOutputText}
              onChange={(e) => setBadOutputText(e.target.value)}
              placeholder="Paste the bad, bloated, or buggy response the model returned here..."
              className="w-full text-xs rounded-xl border border-white/15 px-4 py-2.5 h-36 font-mono text-red-400 bg-red-500/5 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-white/40 tracking-widest block select-none">Correct Target Expectation / Criteria</label>
            <input
              type="text"
              required
              value={expectationText}
              onChange={(e) => setExpectationText(e.target.value)}
              placeholder="e.g. Needs to output bullet points, of max 20 words, or strictly in JSON format"
              className="w-full text-xs rounded-xl border border-white/15 px-4 py-2.5 bg-white/5 text-white uppercase placeholder:text-white/20 tracking-wider font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full bg-emerald-500 text-black hover:bg-emerald-450 transition-all font-extrabold text-xs uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4 shrink-0" />
            <span>{isAnalyzing ? "Processing Diagnosis Logs..." : "Diagnose and Apply Security Patch"}</span>
          </button>
        </form>
      </div>

      {/* Reports output panel */}
      <div className="col-span-1 lg:col-span-3 space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm min-h-[460px] flex flex-col justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 select-none">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Diagnostic Analysis & Security Re-Writes</h4>
                <p className="text-[10px] font-mono text-white/45 uppercase tracking-widest">Strategic prompt correction readouts</p>
              </div>
            </div>

            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
                <p className="text-sm text-white font-bold uppercase tracking-wider animate-pulse">Debugging system instruction limits...</p>
                <p className="text-[10px] font-mono text-white/40 max-w-md leading-relaxed uppercase tracking-wider">
                  Analyzing semantic bugs, comparing instruction gaps, and drafting protective structural code changes.
                </p>
              </div>
            )}

            {!isAnalyzing && !analysisResult && (
              <div className="flex flex-col items-center justify-center py-28 text-center select-none">
                <AlertTriangle className="h-12 w-12 text-white/20 mb-3" />
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Awaiting evaluation feedback logs</p>
                <p className="text-[10px] font-mono text-white/30 mt-2 max-w-sm uppercase tracking-wider leading-relaxed">
                  Provide original system prompts, paste buggy returns, and run debugger to observe diagnostics and patch models.
                </p>
              </div>
            )}

            {!isAnalyzing && analysisResult && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Diagnosis */}
                  <div className="p-4 rounded-xl bg-black/40 border border-red-500/20 text-xs space-y-1.5 leading-relaxed">
                    <span className="font-bold uppercase text-red-400 font-mono text-[10px] tracking-wider block">Observed Bug Behavior</span>
                    <p className="text-white/80 leading-relaxed font-semibold">{analysisResult.diagnosis}</p>
                  </div>

                  {/* Root cause */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1.5 leading-relaxed">
                    <span className="font-bold uppercase text-white/40 font-mono text-[10px] tracking-wider block">Instruction Flaw Root Cause</span>
                    <p className="text-white/80 leading-relaxed font-semibold">{analysisResult.rootCause}</p>
                  </div>
                </div>

                {/* Applied patches */}
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-3">
                  <span className="font-mono font-bold uppercase text-emerald-400 text-[10px] tracking-widest block">Structural Patches Injected</span>
                  <ul className="space-y-2 pl-1">
                    {analysisResult.suggestedFixes.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-white/80 leading-relaxed font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mini Diff display */}
                <div className="space-y-1.5 text-xs">
                  <span className="font-mono font-bold uppercase text-white/30 text-[10px] tracking-widest block">Strategic Prompt Rewriting</span>
                  <div className="p-4.5 rounded-xl bg-black text-emerald-450 font-mono text-xs h-28 overflow-y-auto border border-white/5 leading-relaxed select-all">
                    {analysisResult.patchedPrompt.systemInstruction}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isAnalyzing && analysisResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-white/90 gap-2 mt-4">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Prompt Patched and Saved in Current Session history.
              </span>
              <span className="font-mono text-emerald-400 font-bold uppercase text-[10px] tracking-wider">Refined Grade: {analysisResult.patchedPrompt.scores.overall}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export { FeedbackAnalyzer };
