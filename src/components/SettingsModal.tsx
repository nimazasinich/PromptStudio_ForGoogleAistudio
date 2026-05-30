/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, Settings, Layout, Cpu, Code2, BarChart2, Shield, Sparkles, 
  Cloud, FolderKanban, Github, Layers, ArrowUpRight, CheckCircle2,
  FileText, GitCommit, GitBranch, RefreshCw, Smartphone, Eye
} from "lucide-react";
import { EcosystemIntegrationState, PromptDefinition } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrations: EcosystemIntegrationState;
  onUpdateIntegrations: (nextState: EcosystemIntegrationState) => void;
  activePrompt: PromptDefinition | null;
  onInjectGroundingContent: (content: string, filename: string) => void;
  onHuggingFaceTemplatePicked: (promptTemplate: any) => void;
  uiScale: "compact" | "comfortable" | "spacious";
  onChangeUiScale: (scale: "compact" | "comfortable" | "spacious") => void;
  preferredModel: string;
  onChangePreferredModel: (model: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  integrations,
  onUpdateIntegrations,
  activePrompt,
  onInjectGroundingContent,
  onHuggingFaceTemplatePicked,
  uiScale,
  onChangeUiScale,
  preferredModel,
  onChangePreferredModel
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "general" | "appearance" | "models" | "engine" | "analytics" | "integrations" | "security" | "experimental"
  >("general");

  // GitHub integration auxiliary states
  const [gitCommitMsg, setGitCommitMsg] = useState("");
  const [gitBranch] = useState("main");
  const [, setSelectedDriveFileId] = useState<string | null>(null);
  const [, setSelectedNotebookNotesId] = useState<string | null>(null);

  // High-fidelity structures Drive & Notebook files (representing grounding knowledge schemas)
  const GOOGLE_DRIVE_FILES = [
    { id: "gd_policy_gdpr", name: "Client_GDPR_Compliance_Policy.md", size: "24 KB", content: "CRITICAL COMPLIANCE TARGETS:\n- Keep all client data locked within continental boundaries.\n- Delete historic cookies on browser termination.\n- Explicitly cite GDPR article index when answering safety questions." },
    { id: "gd_api_standard", name: "Global_Banking_API_Specifications.json", size: "45 KB", content: "BANKING ROUTER RULES:\n- Use /v3/accounts/transfer endpoint for transactions.\n- Return only explicit ISO standard error strings on rejections.\n- Always guard input parameters securely from code-injection." },
    { id: "gd_support_guide", name: "Support_Escalation_Workflows.txt", size: "12 KB", content: "ESCALATION RAILS:\n- If client asks for standard balance, respond directly.\n- If client asks for manual account audits, transfer cleanly to manager-on-call.\n- Never reveal supervisor personal information." }
  ];

  const NOTEBOOK_LM_PROJECTS = [
    { id: "nlm_marketing", name: "Brand tone & Writing Guidelines", notes: 14, content: "BRAND ATTRIBUTES:\n- Avoid corporate slang or high-pitched sales greetings.\n- Sound polite, minimalist, and objective.\n- Format all support lists as elegant Bullet points." },
    { id: "nlm_tech", name: "Developer Code guidelines", notes: 25, content: "CODE STYLE PRINCIPLES:\n- Prioritize Named imports for type cleanliness.\n- Never write trailing commas inside JSON objects.\n- Embed error fallback states directly." }
  ];

  const HUGGING_FACE_TEMPLATES = [
    {
      id: "hf_writer_v2",
      name: "creative-storytelling-assistant-v2",
      author: "prompt-labs-hf",
      downloads: "12k",
      systemInstruction: "You are an award-winning fantasy author. Write content using dense vocabulary, rich environmental descriptions, and slow pacing.",
      userTemplate: "Write a short scene inspired by: {{concept}}",
      variables: ["concept"],
    },
    {
      id: "hf_classifier_v1",
      name: "strict-zero-shot-json-classifier",
      author: "sentence-eval",
      downloads: "24k",
      systemInstruction: "You are a rigid classification machine. Evaluate the input content and output ONLY a valid compact JSON mapping to the requested criteria classes. Do not enclose in markdown backticks or pleasantries.",
      userTemplate: "Classify input: '{{query}}' across categories: {{categories}}",
      variables: ["query", "categories"],
    }
  ];

  if (!isOpen) return null;

  const toggleConnection = (key: keyof EcosystemIntegrationState) => {
    const next = { ...integrations };
    if (key === "googleDrive") {
      next.googleDrive.connected = !next.googleDrive.connected;
      if (!next.googleDrive.connected) {
        next.googleDrive.linkedDocId = undefined;
        next.googleDrive.linkedDocName = undefined;
        next.googleDrive.linkedDocContent = undefined;
      }
    } else if (key === "notebookLM") {
      next.notebookLM.connected = !next.notebookLM.connected;
      if (!next.notebookLM.connected) {
        next.notebookLM.linkedProjectId = undefined;
        next.notebookLM.linkedProjectName = undefined;
        next.notebookLM.linkedContent = undefined;
      }
    } else if (key === "github") {
      next.github.connected = !next.github.connected;
      if (next.github.connected) {
        next.github.repoName = "ai-studio-prompt-templates";
        next.github.branch = "main";
      } else {
        next.github.repoName = undefined;
        next.github.branch = undefined;
        next.github.lastCommitHash = undefined;
      }
    } else if (key === "huggingFace") {
      next.huggingFace.connected = !next.huggingFace.connected;
    }
    onUpdateIntegrations(next);
  };

  const handleLinkDriveFile = (fileId: string) => {
    const file = GOOGLE_DRIVE_FILES.find(f => f.id === fileId);
    if (!file) return;
    const next = { ...integrations };
    next.googleDrive.linkedDocId = file.id;
    next.googleDrive.linkedDocName = file.name;
    next.googleDrive.linkedDocContent = file.content;
    onUpdateIntegrations(next);
    setSelectedDriveFileId(file.id);
    onInjectGroundingContent(file.content, file.name);
  };

  const handleLinkNotebookProject = (projectId: string) => {
    const proj = NOTEBOOK_LM_PROJECTS.find(p => p.id === projectId);
    if (!proj) return;
    const next = { ...integrations };
    next.notebookLM.linkedProjectId = proj.id;
    next.notebookLM.linkedProjectName = proj.name;
    next.notebookLM.notesCount = proj.notes;
    next.notebookLM.linkedContent = proj.content;
    onUpdateIntegrations(next);
    setSelectedNotebookNotesId(proj.id);
    onInjectGroundingContent(proj.content, proj.name);
  };

  const executeGitHubCommitPush = () => {
    if (!gitCommitMsg.trim() || !activePrompt) return;
    const next = { ...integrations };
    next.github.lastCommitHash = "git_rev_" + Math.random().toString(36).substr(2, 7);
    onUpdateIntegrations(next);
    setGitCommitMsg("");
  };

  // Sidebar settings tabs configuration list
  const TABS_CONFIG = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Layout },
    { id: "models", label: "AI Models", icon: Cpu },
    { id: "engine", label: "Prompt Engine", icon: Code2 },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "integrations", label: "Integrations", icon: Cloud },
    { id: "security", label: "Security", icon: Shield },
    { id: "experimental", label: "Experimental", icon: Sparkles }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040910]/90 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-5xl h-[80vh] rounded-3xl bg-[#07101F] border border-white/5 shadow-2xl flex overflow-hidden">
        {/* Absolute header-right close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-[#9BAAD4]/60 hover:bg-white/5 hover:text-white transition-all border border-white/5 cursor-pointer z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left Settings Sidebar Tabs selection */}
        <div className="w-[200px] md:w-[240px] bg-[#040910] border-r border-white/5 flex flex-col p-4 shrink-0 select-none">
          <div className="flex items-center gap-2 px-2.5 py-4 border-b border-white/5 mb-4">
            <Settings className="h-5 w-5 text-[#6CECC8] animate-spin" style={{ animationDuration: "12s" }} />
            <span className="text-[11px] font-space font-bold tracking-widest text-[#EDF2FF] uppercase">
              System Settings
            </span>
          </div>

          <div className="flex-1 space-y-1">
            {TABS_CONFIG.map((t) => {
              const TabIcon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all border ${
                    isSelected
                      ? "bg-[#07101F] text-[#6CECC8] border-white/5 font-bold"
                      : "text-[#9BAAD4]/50 border-transparent hover:bg-white/5 hover:text-[#EDF2FF]"
                  }`}
                >
                  <TabIcon className={`h-4 w-4 ${isSelected ? "text-[#6CECC8]" : "text-[#9BAAD4]/40"}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings build stamp */}
          <div className="mt-auto pt-4 px-2.5 border-t border-white/5 text-[9px] font-mono text-[#9BAAD4]/35 uppercase tracking-widest leading-relaxed">
            PROMPT_OS v2026.1<br />
            BUILD_REVISION_M455
          </div>
        </div>

        {/* Right Settings Configuration Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#07101F]/45 p-8 flex flex-col">
          {/* Active Tab Heading */}
          <div className="border-b border-white/5 pb-4 mb-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#6CECC8] block mb-1">
              Configuration Panel // System Environment
            </span>
            <h3 className="text-xl font-space font-bold tracking-tight text-[#EDF2FF] uppercase">
              {activeTab} Preferences
            </h3>
          </div>

          {/* Render Active Configurations Subviews */}
          {activeTab === "general" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Configure primary global environment settings for Prompt Architect workspace. Choose options below to tailor default directory linkages.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold tracking-wider text-[#EDF2FF]/60 uppercase">Workspace ID Prefix</label>
                  <input
                    type="text"
                    defaultValue="PROMPT_ARCHITECT_GLOBAL"
                    className="w-full rounded-xl focus:outline-none px-4 py-2.5 glass-pane-input text-[#EDF2FF] uppercase tracking-wide font-mono text-[10px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold tracking-wider text-[#EDF2FF]/60 uppercase">Fallback System Instructions Tone</label>
                  <select className="w-full rounded-xl focus:outline-none px-4 py-2.5 glass-pane-input text-[#EDF2FF] uppercase tracking-wide font-semibold text-[10px]">
                    <option>Extremely Rigid / Academic</option>
                    <option>Slightly Editorial / Creative</option>
                    <option>Standard Assistant Default</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#040910]/60 border border-white/5 space-y-2">
                <span className="text-[9px] font-mono font-bold text-[#B48FFF] uppercase block">Platform State Status</span>
                <p className="text-[10px] leading-relaxed">
                  Active directory synchronized over Google DeepMind Cloud Run telemetry. Persistent prompt database cached in client localStorage and synced to sandbox API cores.
                </p>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Scale the absolute graphics density and typography of the entire platform UI layout. High-information density modes scale grids and shrink padding sizes gracefully.
              </p>

              <div>
                <label className="text-[10px] font-mono font-bold tracking-wider text-[#EDF2FF]/60 uppercase mb-3 block">
                  Select Visual UI Scale Density
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "compact", label: "Compact Mode", desc: "Density-oriented" },
                    { id: "comfortable", label: "Comfortable Mode", desc: "Standard margins" },
                    { id: "spacious", label: "Spacious Mode", desc: "Generous whitespace" }
                  ].map((sc) => {
                    const isSelected = uiScale === sc.id;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => onChangeUiScale(sc.id as any)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#6CECC8]/10 border-[#6CECC8]/40 text-[#EDF2FF]"
                            : "bg-[#040910]/45 border-transparent text-[#9BAAD4]/50 hover:bg-[#040910] hover:text-[#EDF2FF]"
                        }`}
                      >
                        <span className="font-bold text-xs uppercase tracking-wider">{sc.label}</span>
                        <span className="text-[10px] opacity-60 font-mono mt-1.5 uppercase">{sc.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold tracking-wider text-[#EDF2FF]/60 uppercase block">Workspace Layout Font Family</label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-white font-space font-medium">
                    <span className="text-sm">Aa</span>
                    <span className="text-[10px] uppercase font-mono text-[#9BAAD4]">Space Grotesk (Titles)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white font-sans font-medium border-l border-white/5 pl-4">
                    <span className="text-sm">Aa</span>
                    <span className="text-[10px] uppercase font-mono text-[#9BAAD4]">Inter (San-Serif Text)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "models" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Map default LLM generative backends used to synthesize optimized prompts, evaluate constraints metrics, or test variations.
              </p>

              <div className="space-y-4">
                <label className="text-[10px] font-mono font-bold tracking-wider text-[#EDF2FF]/60 uppercase block">Active Redirection Model</label>
                
                <div className="space-y-2.5">
                  {[
                    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Multimodal Core)", desc: "Complex reasoning & deep logic constraints evaluation" },
                    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Streaming Engine)", desc: "Lightning fast iteration speeds & high token density" },
                    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Legacy Reasoner)", desc: "Solid baseline performance indices" }
                  ].map((m) => {
                    const isSelected = preferredModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => onChangePreferredModel(m.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-[#6CECC8]/10 border-[#6CECC8]/35 text-[#EDF2FF]"
                            : "bg-[#040910]/45 border-transparent text-[#9BAAD4]/60 hover:bg-[#040910]"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 accent-[#6CECC8]"
                        />
                        <div>
                          <p className="font-bold text-xs uppercase tracking-wide">{m.name}</p>
                          <p className="text-[10px] text-[#9BAAD4]/40 mt-1 uppercase font-mono">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "engine" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Fine-tune variables interpolation, few-shot generation templates, and systemic auto-correction modules.
              </p>

              <div className="space-y-3 p-4 rounded-2xl bg-[#040910] border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#EDF2FF] uppercase tracking-wide text-[10px]">Include Chain-of-Thought Guardrails</span>
                  <input type="checkbox" defaultChecked className="accent-[#6CECC8] h-4 w-4" />
                </div>
                <p className="text-[10px] text-[#9BAAD4]/40 leading-relaxed uppercase">
                  Force the compiler to append a structured COT framework before generating final variable answers. Ensures reasoning transparency.
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-[#040910] border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#EDF2FF] uppercase tracking-wide text-[10px]">Strict Safety Schema Sanity Filter</span>
                  <input type="checkbox" defaultChecked className="accent-[#6CECC8] h-4 w-4" />
                </div>
                <p className="text-[10px] text-[#9BAAD4]/40 leading-relaxed uppercase">
                  Automatically audits designed parameters against strict Google AI safety and content blocks directives.
                </p>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Overview of aggregated prompt engineering latency metrics, quality indices, token footings, and criteria audits pass margins.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Compiler Latency", val: "1.4s", trait: "Optimized" },
                  { label: "QA Checks Pass", val: "94.2%", trait: "Excellent" },
                  { label: "Avg Compression", val: "38.5%", trait: "Highly Efficient" },
                  { label: "Runs Logged", val: "1,240", trait: "Active" }
                ].map((an) => (
                  <div key={an.label} className="p-4 rounded-2xl bg-[#040910] border border-white/5 flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-[#9BAAD4]/40 uppercase tracking-widest">{an.label}</span>
                    <span className="text-xl font-bold font-mono text-[#6CECC8] mt-2 block">{an.val}</span>
                    <span className="text-[8px] font-mono text-[#6CECC8] mt-1 uppercase leading-none">{an.trait}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Link knowledge sources, version control, or community registries. This keeps reference files synced with the active workspace parameters.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Google Drive */}
                <div className="p-4 rounded-2xl bg-[#040910] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-[#6CECC8]" />
                      <span className="font-bold text-[#EDF2FF] uppercase tracking-wider text-[10px]">Google Drive Link</span>
                    </div>
                    <button
                      onClick={() => toggleConnection("googleDrive")}
                      className={`px-3 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border ${
                        integrations.googleDrive.connected
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {integrations.googleDrive.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  {integrations.googleDrive.connected ? (
                    <div className="space-y-2">
                      <span className="text-[8px] font-mono block text-[#9BAAD4]/40 uppercase">Linked Directory Items:</span>
                      {GOOGLE_DRIVE_FILES.map((f) => {
                        const isLinked = integrations.googleDrive.linkedDocId === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => handleLinkDriveFile(f.id)}
                            className={`p-2 rounded-lg text-[10px] border cursor-pointer truncate ${
                              isLinked
                                ? "bg-emerald-500/10 border-emerald-500/25 text-[#EDF2FF]"
                                : "bg-white/5 border-transparent text-[#9BAAD4]/50"
                            }`}
                          >
                            {f.name}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[9px] italic block text-[#9BAAD4]/30 select-none uppercase">Drive connection not established.</span>
                  )}
                </div>

                {/* NotebookLM */}
                <div className="p-4 rounded-2xl bg-[#040910] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-[#B48FFF]" />
                      <span className="font-bold text-[#EDF2FF] uppercase tracking-wider text-[10px]">NotebookLM Sync</span>
                    </div>
                    <button
                      onClick={() => toggleConnection("notebookLM")}
                      className={`px-3 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border ${
                        integrations.notebookLM.connected
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {integrations.notebookLM.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  {integrations.notebookLM.connected ? (
                    <div className="space-y-2">
                      {NOTEBOOK_LM_PROJECTS.map((p) => {
                        const isLinked = integrations.notebookLM.linkedProjectId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleLinkNotebookProject(p.id)}
                            className={`p-2 rounded-lg text-[10px] border cursor-pointer truncate ${
                              isLinked
                                ? "bg-emerald-500/10 border-emerald-500/25 text-[#EDF2FF]"
                                : "bg-white/5 border-transparent text-[#9BAAD4]/50"
                            }`}
                          >
                            {p.name}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[9px] italic block text-[#9BAAD4]/30 select-none uppercase">NotebookLM connection inactive.</span>
                  )}
                </div>

                {/* GitHub Sync */}
                <div className="p-4 rounded-2xl bg-[#040910] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-white" />
                      <span className="font-bold text-[#EDF2FF] uppercase tracking-wider text-[10px]">GitHub Version Panel</span>
                    </div>
                    <button
                      onClick={() => toggleConnection("github")}
                      className={`px-3 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border ${
                        integrations.github.connected
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {integrations.github.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  {integrations.github.connected ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={gitCommitMsg}
                        onChange={(e) => setGitCommitMsg(e.target.value)}
                        placeholder="Commit sync message..."
                        className="w-full rounded-xl focus:outline-none p-2 glass-pane-input text-[10px]"
                      />
                      <button
                        onClick={executeGitHubCommitPush}
                        className="w-full bg-[#EDF2FF] hover:bg-emerald-400 hover:text-black hover:scale-[1.01] transition-all text-black font-extrabold uppercase py-2 text-[9px] tracking-widest rounded-xl"
                      >
                        Push Commit Shift
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] italic block text-[#9BAAD4]/30 select-none uppercase">GitHub connector not linked.</span>
                  )}
                </div>

                {/* Hugging Face */}
                <div className="p-4 rounded-2xl bg-[#040910] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#6CECC8]" />
                      <span className="font-bold text-[#EDF2FF] uppercase tracking-wider text-[10px]">HuggingFace Hub</span>
                    </div>
                    <button
                      onClick={() => toggleConnection("huggingFace")}
                      className={`px-3 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border ${
                        integrations.huggingFace.connected
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {integrations.huggingFace.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>

                  {integrations.huggingFace.connected ? (
                    <div className="space-y-2 max-h-[100px] overflow-y-auto">
                      {HUGGING_FACE_TEMPLATES.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onHuggingFaceTemplatePicked(t)}
                          className="p-1.5 rounded bg-white/5 hover:bg-[#6CECC8]/15 cursor-pointer text-[9px] uppercase tracking-tight flex justify-between"
                        >
                          <span>{t.name}</span>
                          <span className="text-[#6CECC8]">{t.downloads}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] italic block text-[#9BAAD4]/30 select-none uppercase">templates search inactive.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Platform authentication, session caching, and secrets configurations. Security rules require that API keys are never stored directly inside code databases.
              </p>

              <div className="space-y-3 p-4 rounded-2xl bg-[#040910] border border-white/5">
                <span className="text-[9px] font-mono font-bold text-[#6CECC8] uppercase block">Workspace Credentials Safe</span>
                <p className="text-[10px] leading-relaxed uppercase font-mono">
                  Gemini SDK calls are proxied securely using server-side keys managed securely over the AI Studio Cloud Secrets interface. Absolute client-to-browser isolated protection is locked.
                </p>
              </div>
            </div>
          )}

          {activeTab === "experimental" && (
            <div className="space-y-6 text-xs text-[#9BAAD4]/80">
              <p className="leading-relaxed">
                Activate preview flags, cutting edge optimizations cycles, and auto-generated edgecase test synthesizers.
              </p>

              <div className="space-y-3 p-4 rounded-2xl bg-[#040910] border border-white/5">
                <div className="flex justify-between items-center animate-pulse">
                  <span className="font-bold text-[#EDF2FF] uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#6CECC8]" /> Self-Correcting Synthetic Code Loops
                  </span>
                  <input type="checkbox" defaultChecked className="accent-[#6CECC8] h-4 w-4" />
                </div>
                <p className="text-[10px] text-[#9BAAD4]/40 leading-relaxed uppercase">
                  Enable the editor to trigger mock code correction compiler loops automatically when diagnostics tests drop below 75% quality thresholds.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export { SettingsModal };
