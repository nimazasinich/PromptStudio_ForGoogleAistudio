/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Plus, MessageSquare, Send, Sparkles, Upload, FileText, X, 
  Settings, CheckCircle, AlertTriangle, Layers, Info, Trash2, ShieldAlert
} from "lucide-react";
import { classifyMessageIntent, INTENT_STYLE } from "./utils/intentClassifier";
import { 
  PromptSession, PromptDefinition, EcosystemIntegrationState, 
  TestScenario, PromptHistoryItem, UserProfile 
} from "./types";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import PromptViewer from "./components/PromptViewer";
import TestingSuite from "./components/TestingSuite";
import FeedbackAnalyzer from "./components/FeedbackAnalyzer";
import KnowledgeSearch from "./components/KnowledgeSearch";
import SettingsModal from "./components/SettingsModal";
import CinematicLoader from "./components/CinematicLoader";
import RightUtilityRail from "./components/RightUtilityRail";
import AuthModal from "./components/AuthModal";

export default function App() {
  const [sessions, setSessions] = useState<PromptSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("workspace");
  const [promptIdeaInput, setPromptIdeaInput] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authentication Management States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    const cachedUser = localStorage.getItem("userProfile");
    if (cachedUser) {
      try {
        setCurrentUser(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem("userProfile");
      }
    }
  }, []);

  // Ecosystem Integrations states
  const [integrations, setIntegrations] = useState<EcosystemIntegrationState>({
    googleDrive: { connected: false },
    notebookLM: { connected: false },
    github: { connected: false },
    huggingFace: { connected: false },
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uiScale, setUiScale] = useState<"compact" | "comfortable" | "spacious">("comfortable");
  const [preferredModel, setPreferredModel] = useState<string>("gemini-2.0-flash");
  const [showLoader, setShowLoader] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // File loading/Multi-modal state
  const [groundingDocContent, setGroundingDocContent] = useState<string>("");
  const [groundingDocName, setGroundingDocName] = useState<string>("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>("");
  const [uploadedImageName, setUploadedImageName] = useState<string>("");
  const [uploadedImageMimeType, setUploadedImageMimeType] = useState<string>("image/jpeg");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Testing & Evaluation states
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Feedback Analyzer states
  const [isAnalyzingFeedback, setIsAnalyzingFeedback] = useState(false);
  const [feedbackAnalysisResult, setFeedbackAnalysisResult] = useState<any>(null);

  useEffect(() => {
    checkApiHealth();
    loadSessions();
  }, []);

  const checkApiHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setApiHealthy(data.hasApiKey);
        if (!data.hasApiKey) {
          setErrorMessage("GEMINI_API_KEY is missing or unconfigured in Secrets panel. API calls will simulate response paths securely.");
        }
      } else {
        setApiHealthy(false);
      }
    } catch {
      setApiHealthy(false);
    }
  };

  const loadSessions = async (selectLatestId?: string) => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const list = await res.json();
        setSessions(list);
        
        if (list.length > 0) {
          if (selectLatestId) {
            setActiveSessionId(selectLatestId);
          } else if (!activeSessionId) {
            setActiveSessionId(list[0].id);
          }
        } else {
          // Auto create a draft session if empty to ensure visual layout is immediately interactive
          handleCreateSession();
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions: ", err);
    }
  };

  const handleCreateSession = async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      if (res.ok) {
        const nextSess = await res.json();
        loadSessions(nextSess.id);
      }
    } catch (err) {
      console.error("Failed to instantiate session:", err);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        const nextId = activeSessionId === id ? null : activeSessionId;
        setActiveSessionId(nextId);
        loadSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectVersion = async (promptVersion: PromptDefinition) => {
    if (!activeSessionId) return;
    try {
      const res = await fetch(`/api/sessions/${activeSessionId}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: promptVersion.id }),
      });
      if (res.ok) {
        // Reload all workspaces and hold active selection
        loadSessions(activeSessionId);
      }
    } catch (err) {
      console.error("Failed to select prompt version dynamic index: ", err);
    }
  };

  const getActiveSession = (): PromptSession | null => {
    return sessions.find((s) => s.id === activeSessionId) || null;
  };

  // Compile active prompt from pure idea with grounding document inline
  const executePromptOptimization = async () => {
    if (!promptIdeaInput.trim()) return;
    setIsCompiling(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/prompt/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptIdea: promptIdeaInput,
          contextDoc: groundingDocContent,
          sessionId: activeSessionId,
          model: preferredModel,
        }),
      });

      if (response.ok) {
        setPromptIdeaInput("");
        setGroundingDocContent("");
        setGroundingDocName("");
        loadSessions(activeSessionId || undefined);
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to compile prompt.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network optimization error.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Chat message submission matching continuous active conversational flow
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptIdeaInput.trim() || !activeSessionId) return;

    setIsSendingChat(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/sessions/${activeSessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptIdeaInput,
          imageBase64: uploadedImageBase64 || undefined,
          mimeType: uploadedImageBase64 ? uploadedImageMimeType : undefined,
          contextDoc: groundingDocContent || undefined,
          model: preferredModel,
        }),
      });

      if (response.ok) {
        setPromptIdeaInput("");
        setUploadedImageBase64("");
        setUploadedImageName("");
        setUploadedImageMimeType("image/jpeg");
        loadSessions(activeSessionId);
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed sending chat turn.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed running conversational turn.");
    } finally {
      setIsSendingChat(false);
    }
  };

  // Manage manual Grounding Document file parsing (support drag-and-drop or manual picks)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setGroundingDocContent(text);
      setGroundingDocName(file.name);
    };
    reader.readAsText(file);
  };

  // Manage uploaded multimodality file photo parsing
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fullData = event.target?.result as string;
      // Extract MIME type from the data URL header (e.g. "data:image/jpeg;base64,...")
      const mimeMatch = fullData.match(/^data:([^;]+);base64,/);
      const detectedMime = mimeMatch ? mimeMatch[1] : file.type || "image/jpeg";
      const base64Str = fullData.split(",")[1];
      setUploadedImageBase64(base64Str);
      setUploadedImageName(file.name);
      setUploadedImageMimeType(detectedMime);
    };
    reader.readAsDataURL(file);
  };

  // Direct injection callback from GDrive picker
  const handleInjectGroundingDoc = (content: string, filename: string) => {
    setGroundingDocContent(content);
    setGroundingDocName(filename);
  };

  // Direct HuggingFace Template deployment callback
  const handleHuggingFaceTemplateSelection = async (tmpl: any) => {
    if (!activeSessionId) return;
    setIsCompiling(true);

    try {
      const promptDef: PromptDefinition = {
        id: "pdef_" + Math.random().toString(36).substr(2, 9),
        version: 1,
        systemInstruction: tmpl.systemInstruction,
        userTemplate: tmpl.userTemplate,
        variables: tmpl.variables || [],
        examples: [
          { id: "ex_1", input: "Generate custom classifications values...", output: "{\"classification_status\": \"success\"}" }
        ],
        createdAt: new Date().toISOString(),
        scores: { clarity: 95, constraintAdherence: 90, edgeCases: 85, tokenEfficiency: 95, overall: 91 },
        scoringFeedback: {
          clarity: "Community validated clear instructions.",
          constraintAdherence: "Enforces strict JSON schema rails.",
          edgeCases: "Fallback variables defined.",
          tokenEfficiency: "Lightweight and efficient system overhead."
        }
      };

      // Apply the template to the active session via the dedicated endpoint
      const applyResponse = await fetch(`/api/sessions/${activeSessionId}/apply-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptDefinition: promptDef,
          historyMessage: `Imported Hugging Face template **${tmpl.name}** by *${tmpl.author || "community"}*. Overall score: **${promptDef.scores.overall}/100**.\n\nYou can now chat to customize this template or run tests directly.`,
        }),
      });

      if (applyResponse.ok) {
        loadSessions(activeSessionId);
      } else {
        setErrorMessage("Failed to deploy Hugging Face template.");
      }
    } catch {
      setErrorMessage("Failed to deploy Hugging Face template.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Run autonomous QA tests iterations or specialized manual stress runs
  const handleRunTestingSuite = async (customScenariosSpec?: TestScenario[], targetModels?: string[]) => {
    const activeSession = getActiveSession();
    if (!activeSession || !activeSession.currentPrompt) return;

    setIsRunningTests(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/prompt/run-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          promptDefinition: activeSession.currentPrompt,
          testScenarios: customScenariosSpec || [],
          models: targetModels || [],
          model: preferredModel,
        }),
      });

      if (response.ok) {
        const outcome = await response.json();
        setTestRuns(outcome.testRuns);
        if (outcome.generatedScenarios) {
          setScenarios(outcome.generatedScenarios);
        }
        loadSessions(activeSessionId);
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed running autonomous testers.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Autonomous QA connection failed.");
    } finally {
      setIsRunningTests(false);
    }
  };

  // Google AI Studio Disappointing output Feedback debugger diagnostics patch tool
  const handleFeedbackAuditReview = async (original: string, badOut: string, expect: string) => {
    setIsAnalyzingFeedback(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/prompt/analyze-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          originalPrompt: original,
          pastedOutput: badOut,
          expectation: expect,
          model: preferredModel,
        }),
      });

      if (response.ok) {
        const outcome = await response.json();
        setFeedbackAnalysisResult(outcome);
        loadSessions(activeSessionId);
      } else {
        const errorDetails = await response.json();
        setErrorMessage(errorDetails.error || "Failed examining logs.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Diagnostics connection failed.");
    } finally {
      setIsAnalyzingFeedback(false);
    }
  };

  const handleVoiceInputCaptured = (voiceText: string) => {
    setPromptIdeaInput(voiceText);
  };

  const activeSess = getActiveSession();

  // Derive intent classification whenever the input or active prompt changes
  const detectedIntent = useMemo(() => {
    if (!promptIdeaInput.trim()) return null;
    return classifyMessageIntent(promptIdeaInput, Boolean(activeSess?.currentPrompt));
  }, [promptIdeaInput, activeSess?.currentPrompt]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[#040910] bg-cyber-grid font-sans antialiased text-[#EDF2FF] density-${uiScale}`}>
      {/* Cinematic Loader Core Landing */}
      {showLoader && (
        <CinematicLoader onComplete={() => setShowLoader(false)} />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
        }}
        uiScale={uiScale}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main workspace arena */}
      <div className="flex flex-1 flex-col overflow-hidden bg-transparent p-4 gap-4">
        {/* Top Header Controls bar */}
        <Header 
          currentPrompt={activeSess?.currentPrompt || null} 
          apiHealthy={apiHealthy}
          onVoiceInputCaptured={handleVoiceInputCaptured}
          currentUser={currentUser}
          onAuthClick={() => setIsAuthOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Global Warning / Notifications center banner */}
        {errorMessage && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-300 font-medium flex items-center justify-between shadow-sm animate-fade-in rounded-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-amber-500/20 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Core Workspace Screens switching grids */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "workspace" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full w-full items-stretch animate-fade-in">
              
              {/* Chat Thread Console column */}
              <div className="col-span-1 lg:col-span-2 flex flex-col justify-between glass-pane border border-white/5 rounded-3xl p-6 relative overflow-hidden min-h-[500px]">
                {/* Conversations display body panel */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-6 max-h-[460px]">
                  {activeSess ? (
                    activeSess.history.map((hist) => {
                      const isSystem = hist.role === "system";
                      const isUser = hist.role === "user";
                      return (
                        <div
                          key={hist.id}
                          className={`flex items-start gap-3.5 max-w-[85%] ${
                            isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-3xs font-black uppercase shrink-0 ${
                              isUser ? "bg-emerald-500 text-black shadow" : "bg-[#040910]/85 text-[#9BAAD4] border border-white/5"
                            }`}
                          >
                            {isUser ? "U" : "P"}
                          </div>
                          
                          <div className="space-y-1">
                            <div
                              className={`rounded-2xl px-5 py-3.5 text-xs leading-relaxed shadow-sm ${
                                isUser
                                  ? "bg-emerald-500 text-black rounded-tr-none font-bold shadow-md"
                                  : "bg-[#040910]/45 border border-white/5 text-[#EDF2FF]/90 rounded-tl-none font-medium"
                              }`}
                            >
                              <p className="whitespace-pre-wrap font-sans">{hist.content}</p>
                            </div>
                            <span className="text-[10px] font-mono text-[#9BAAD4]/40 tracking-wider block px-1 text-right uppercase">
                              {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 text-[#9BAAD4]/40 italic text-xs uppercase font-mono tracking-widest font-extrabold">
                      Select or instantiate an active workshop session.
                    </div>
                  )}
                </div>

                {/* Multimodal document or photo selection indicator bar */}
                <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {/* Document grounding linked badge */}
                    {groundingDocName && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3.5 py-1.5 text-3xs font-mono uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                        <FileText className="h-3 w-3 text-emerald-400" />
                        <span className="truncate max-w-[140px]">{groundingDocName}</span>
                        <button onClick={() => { setGroundingDocName(""); setGroundingDocContent(""); }} className="hover:bg-white/10 rounded p-0.5 ml-1 cursor-pointer">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Image multi-modal preview badge */}
                    {uploadedImageName && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3.5 py-1.5 text-3xs font-mono uppercase tracking-wider text-amber-400 border border-amber-500/20">
                        <Upload className="h-3 w-3 text-amber-400" />
                        <span className="truncate max-w-[140px]">{uploadedImageName}</span>
                        <button onClick={() => { setUploadedImageName(""); setUploadedImageBase64(""); setUploadedImageMimeType("image/jpeg"); }} className="hover:bg-white/10 rounded p-0.5 ml-1 cursor-pointer">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Intent classification badge — shown when user is typing */}
                  {detectedIntent && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-[#9BAAD4]/40 uppercase tracking-widest">Detected:</span>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${INTENT_STYLE[detectedIntent.intent]}`}>
                        {detectedIntent.label}
                      </span>
                    </div>
                  )}

                  {/* Message Input text areas buttons */}
                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    {/* Hidden entries controls for file pickers */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".txt,.json,.csv,.md"
                    />
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />

                    {/* Quick attach utility options */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all border border-white/10 shrink-0 cursor-pointer"
                      title="Attach .txt, .json or .md grounding files"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all border border-white/10 shrink-0 cursor-pointer"
                      title="Attach multimodality image sources"
                    >
                      <Upload className="h-4 w-4" />
                    </button>

                    <input
                      type="text"
                      value={promptIdeaInput}
                      onChange={(e) => setPromptIdeaInput(e.target.value)}
                      placeholder="Discuss revisions, or type a prompt goal..."
                      className="flex-1 rounded-xl focus:outline-none px-4 text-xs text-[#EDF2FF] uppercase placeholder:text-[#9BAAD4]/30 tracking-wider font-extrabold transition-all glass-pane-input"
                    />
                    
                    <button
                      type="button"
                      onClick={executePromptOptimization}
                      disabled={isCompiling || !promptIdeaInput.trim()}
                      className="bg-[#EDF2FF] hover:bg-emerald-500 hover:text-black text-black px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-40 shrink-0 flex items-center justify-center cursor-pointer tactile-glow"
                      title="Compile and optimize structured prompt instantly"
                    >
                      {isCompiling ? (
                        <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles className="h-4 w-4 text-emerald-600 mr-1.5" />
                      )}
                      <span>Optimize</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingChat || !promptIdeaInput.trim()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-[11px] px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shrink-0 cursor-pointer tactile-glow"
                      title="Send instructions"
                    >
                      {isSendingChat ? (
                        <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Advanced blueprint and visualization layouts panel column */}
              <div className="col-span-1 lg:col-span-2">
                <PromptViewer
                  prompt={activeSess?.currentPrompt || null}
                  versionHistory={activeSess?.versionHistory || []}
                  onSelectVersion={handleSelectVersion}
                  onRunTestScenario={(mInputs) => {
                    const scene: TestScenario = {
                      id: "scen_temp",
                      name: "Quick Hydrator execution test",
                      inputs: mInputs,
                      expectedCriteria: ["Evaluate variable formats", "Check output readability"],
                    };
                    handleRunTestingSuite([scene]);
                    setActiveTab("testing");
                  }}
                  isRunningTest={isRunningTests}
                />
              </div>

              {/* Right Telemetry Column Rail */}
              <div className="col-span-1 lg:col-span-1">
                <RightUtilityRail
                  currentPrompt={activeSess?.currentPrompt || null}
                  activeSession={activeSess}
                  isRunningTests={isRunningTests}
                  onOptimizeClick={executePromptOptimization}
                  onTriggerSelfCorrection={async () => {
                    if (activeSess?.currentPrompt) {
                      handleRunTestingSuite([], ["gemini-2.0-flash"]);
                    }
                  }}
                  uiScale={uiScale}
                  totalSessionsCount={sessions.length}
                />
              </div>

            </div>
          )}

          {activeTab === "testing" && (
            <div className="max-w-7xl mx-auto">
              <TestingSuite
                prompt={activeSess?.currentPrompt || null}
                scenarios={scenarios}
                testRuns={testRuns}
                onAddScenario={(sc) => setScenarios([...scenarios, sc])}
                onRunActiveTests={handleRunTestingSuite}
                isRunning={isRunningTests}
              />
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="max-w-7xl mx-auto">
              <FeedbackAnalyzer
                prompt={activeSess?.currentPrompt || null}
                onAnalyzeFeedback={handleFeedbackAuditReview}
                isAnalyzing={isAnalyzingFeedback}
                analysisResult={feedbackAnalysisResult}
              />
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="max-w-7xl mx-auto">
              <KnowledgeSearch
                onSelectKnowledgeRef={(guidelineSnippet) => {
                  setPromptIdeaInput((p) => p ? p + "\n\n" + guidelineSnippet : guidelineSnippet);
                  setActiveTab("workspace");
                }}
                activeSessionId={activeSessionId}
                onImportTemplate={() => {
                  if (activeSessionId) {
                    loadSessions(activeSessionId);
                  }
                  setActiveTab("workspace");
                }}
              />
            </div>
          )}
        </main>

        {/* Sub-Footer Status */}
        <footer className="mt-1 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 py-2 select-none gap-2 shrink-0">
          <div className="flex flex-wrap gap-4 items-center text-[9px] font-mono text-white/40 uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-[#6CECC8] rounded-full shadow-[0_0_4px_#6cecc8]"></div>
              <span>Server: <span className="text-white">ACTIVE</span></span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${groundingDocContent ? "bg-[#79AEFF] shadow-[0_0_4px_#79aeff]" : "bg-white/20"}`}></div>
              <span>RAG: <span className={groundingDocContent ? "text-[#79AEFF]" : "text-white/30"}>{groundingDocContent ? "ACTIVE" : "READY"}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${(isCompiling || isSendingChat || isRunningTests || isAnalyzingFeedback) ? "bg-[#6CECC8] animate-pulse shadow-[0_0_4px_#6cecc8]" : "bg-white/20"}`}></div>
              <span>Self-Correction: <span className={`font-extrabold uppercase ${(isCompiling || isSendingChat || isRunningTests || isAnalyzingFeedback) ? "animate-pulse text-[#6CECC8]" : "text-white/30"}`}>{(isCompiling || isSendingChat || isRunningTests || isAnalyzingFeedback) ? "RUNNING" : "READY"}</span></span>
            </div>
          </div>
          <div className="text-[9px] uppercase font-mono text-white/35">
            SESSION_ID &rarr; <span className="text-[#6CECC8] font-bold tracking-wider">{activeSessionId ? activeSessionId.toUpperCase() : "G-STUDIO-8891-X"}</span>
          </div>
        </footer>
      </div>

      {/* Pop-up Ecosystem settings modal overlay */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          integrations={integrations}
          onUpdateIntegrations={setIntegrations}
          activePrompt={activeSess?.currentPrompt || null}
          onInjectGroundingContent={handleInjectGroundingDoc}
          onHuggingFaceTemplatePicked={handleHuggingFaceTemplateSelection}
          uiScale={uiScale}
          onChangeUiScale={setUiScale}
          preferredModel={preferredModel}
          onChangePreferredModel={setPreferredModel}
        />
      )}

      {/* Auth Modal overlay */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onLogin={(userObj) => {
            setCurrentUser(userObj);
            localStorage.setItem("userProfile", JSON.stringify(userObj));
          }}
          onLogout={() => {
            setCurrentUser(null);
            localStorage.removeItem("userProfile");
          }}
        />
      )}
    </div>
  );
}
export { App };
