/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  MessageSquare, Plus, Trash2, Github, Cloud, BookOpen, Layers, 
  Settings, FolderKanban, CheckSquare, RefreshCw, GitFork, Sliders
} from "lucide-react";
import { PromptSession } from "../types";

interface SidebarProps {
  sessions: PromptSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onOpenSettings: (initialTab?: string) => void;
  uiScale: "compact" | "comfortable" | "spacious";
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  activeTab,
  onChangeTab,
  onOpenSettings,
  uiScale,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const isCompact = uiScale === "compact";
  const isSpacious = uiScale === "spacious";

  const PRIMARY_LINKS = [
    { id: "workspace", label: "Prompt Workspace", icon: MessageSquare, desc: "Craft & iterate prompts" },
    { id: "testing", label: "AI Testing Core", icon: CheckSquare, desc: "Stress test outputs" },
    { id: "feedback", label: "Feedback Auditor", icon: RefreshCw, desc: "Auto-correct behaviors" },
    { id: "knowledge", label: "Prompt Library", icon: BookOpen, desc: "Reference templates" },
  ];

  return (
    <div className={`flex flex-col border-r border-white/5 bg-[#040910] text-[#EDF2FF] select-none shrink-0 transition-all duration-300 ease-in-out ${
      isCollapsed ? "w-[68px] p-2 space-y-4 items-center" : (isCompact ? "w-[230px] p-3 space-y-3" : isSpacious ? "w-[250px] p-6 space-y-6" : "w-[235px] p-4.5 space-y-4")
    }`}>
      {/* Brand logo container */}
      <div className={`flex h-14 items-center px-2 group ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#6CECC8] to-[#B48FFF] p-1.5 flex items-center justify-center shadow-lg hover:rotate-6 transition-all">
            <Layers className="h-4.5 w-4.5 text-white animate-pulse" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-xs font-space font-extrabold tracking-widest text-[#EDF2FF] block uppercase leading-none">
                PROMPT
              </span>
              <span className="text-[9px] font-mono font-bold text-[#6CECC8] tracking-[0.2em] block uppercase mt-0.5">
                ARCHITECT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Settings Quick Link */}
      <button
        onClick={() => onOpenSettings("general")}
        className={`flex items-center gap-2.5 rounded-xl text-xs font-bold text-[#9BAAD4]/85 hover:bg-white/5 hover:text-[#EDF2FF] border border-transparent hover:border-white/5 transition-all cursor-pointer group ${isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full px-3 py-2"}`}
        title={isCollapsed ? "Main Settings" : undefined}
      >
        <Settings className="h-4 w-4 text-[#9BAAD4]/50 group-hover:rotate-12 transition-all duration-350 shrink-0" />
        {!isCollapsed && <span className="uppercase tracking-wider">Main Settings</span>}
      </button>

      {/* Divider */}
      <div className="border-t border-white/5 w-full"></div>

      {/* Main Mode Navigation Section */}
      <div className={`space-y-1 ${isCollapsed ? "w-10" : "w-full"}`}>
        {!isCollapsed && (
          <span className="text-[9px] font-mono text-[#9BAAD4]/40 uppercase tracking-[0.2em] px-3 select-none block mb-2">
            Workspace Modes
          </span>
        )}
        
        {PRIMARY_LINKS.map((link) => {
          const IconComponent = link.icon;
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => onChangeTab(link.id)}
              className={`flex items-center transition-all duration-300 border rounded-xl ${
                isCollapsed 
                  ? `w-10 h-10 p-0 justify-center ${isActive ? "bg-[#07101F] text-[#6CECC8] border-white/5 shadow-inner" : "text-[#9BAAD4]/60 border-transparent hover:bg-white/5 hover:text-white"}`
                  : `w-full justify-between px-3 py-2.5 text-xs tracking-wider uppercase ${isActive ? "bg-[#07101F] text-[#6CECC8] border-white/5 font-black shadow-inner" : "text-[#9BAAD4]/60 border-transparent hover:bg-white/5 hover:text-white"}`
              }`}
              title={isCollapsed ? link.label : undefined}
            >
              <div className="flex items-center gap-2.5">
                <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? "text-[#6CECC8]" : "text-[#9BAAD4]/45"}`} />
                {!isCollapsed && <span className="text-[11px] font-bold tracking-wide">{link.label}</span>}
              </div>
              {!isCollapsed && isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#6CECC8] animate-pulse shadow-[0_0_4px_#6CECC8]"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Auxiliary Workspace Assets & Pipelines */}
      <div className={`space-y-1 ${isCollapsed ? "w-10" : "w-full"}`}>
        {!isCollapsed && (
          <span className="text-[9px] font-mono text-[#9BAAD4]/40 uppercase tracking-[0.2em] px-3 select-none block mb-2">
            Asset Pipelines
          </span>
        )}

        {/* Assets link */}
        <button
          onClick={() => onOpenSettings("general")}
          className={`flex items-center gap-2.5 rounded-xl text-xs font-semibold text-[#9BAAD4]/50 hover:bg-white/5 hover:text-white transition-all cursor-pointer ${isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full px-3 py-2"}`}
          title={isCollapsed ? "Assets Folder" : undefined}
        >
          <FolderKanban className="h-4 w-4 text-[#9BAAD4]/40 shrink-0" />
          {!isCollapsed && <span className="uppercase tracking-wider">Assets Folder</span>}
        </button>

        {/* Pipelines link */}
        <button
          onClick={() => onOpenSettings("experimental")}
          className={`flex items-center rounded-xl text-xs font-semibold text-[#9BAAD4]/50 hover:bg-white/5 hover:text-white transition-all cursor-pointer ${isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full justify-between px-3 py-2"}`}
          title={isCollapsed ? "Pipelines (Beta)" : undefined}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-[#9BAAD4]/40 shrink-0" />
            {!isCollapsed && <span className="uppercase tracking-wider">Pipelines</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[8px] font-mono bg-[#B48FFF]/10 text-[#B48FFF] border border-[#B48FFF]/20 px-1.5 py-0.5 rounded uppercase font-black">
              Beta
            </span>
          )}
        </button>

        {/* Integrations hub shortcut link */}
        <button
          onClick={() => onOpenSettings("integrations")}
          className={`flex items-center gap-2.5 rounded-xl text-xs font-semibold text-[#9BAAD4]/50 hover:bg-white/5 hover:text-white transition-all cursor-pointer ${isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full px-3 py-2"}`}
          title={isCollapsed ? "Integrations Hub" : undefined}
        >
          <Cloud className="h-4 w-4 text-[#9BAAD4]/40 shrink-0" />
          {!isCollapsed && <span className="uppercase tracking-wider">Integrations Hub</span>}
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5 w-full"></div>

      {/* Live Active Conversations list */}
      <div className={`flex-1 overflow-y-auto space-y-1 ${isCollapsed ? "w-10 flex flex-col items-center" : "w-full"}`}>
        <div className={`flex items-center justify-between mb-2 w-full ${isCollapsed ? "justify-center" : "px-2"}`}>
          {!isCollapsed && <span className="text-[9px] font-mono text-[#9BAAD4]/40 uppercase tracking-[0.2em]">Saved Sessions</span>}
          <button
            onClick={onCreateSession}
            className={`flex h-6 w-6 items-center justify-center rounded-lg bg-[#6CECC8]/10 text-[#6CECC8] border border-[#6CECC8]/25 hover:bg-[#6CECC8]/20 hover:border-[#6CECC8]/45 transition-all cursor-pointer ${isCollapsed ? "mx-auto" : ""}`}
            title="Create new active session"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {sessions.length === 0 ? (
          !isCollapsed && (
            <div className="text-center py-4 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
              <p className="text-[9px] text-[#9BAAD4]/30 italic uppercase font-mono">No active logs</p>
            </div>
          )
        ) : (
          sessions.map((sess) => {
            const isSelected = activeSessionId === sess.id;
            return (
              <div
                key={sess.id}
                className={`group flex items-center transition-all cursor-pointer border rounded-xl ${
                  isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full justify-between px-3 py-2"
                } ${
                  isSelected
                    ? "bg-[#07101F] text-[#6CECC8] border-[#6CECC8]/20 shadow-inner"
                    : "text-[#9BAAD4]/60 border-transparent hover:bg-white/5 hover:text-[#EDF2FF]"
                }`}
                onClick={() => onSelectSession(sess.id)}
                title={isCollapsed ? (sess.name || "Draft Instruction") : undefined}
              >
                <div className={`flex items-center overflow-hidden flex-1 ${isCollapsed ? "justify-center" : "gap-2"}`}>
                  <MessageSquare className={`h-3 w-3 shrink-0 ${isSelected ? "text-[#6CECC8]" : "text-[#9BAAD4]/35"}`} />
                  {!isCollapsed && (
                    <span className={`truncate text-xs tracking-wide ${isSelected ? "font-bold" : "font-medium"}`}>
                      {sess.name || "Draft Instruction"}
                    </span>
                  )}
                </div>
                
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-red-400 transition-all ml-1.5 cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export { Sidebar };
