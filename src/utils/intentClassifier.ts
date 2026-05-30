/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lightweight, rule-based intent classifier for chat messages.
 * Kept isolated so it can later be replaced by a model-based classifier
 * without touching any UI components.
 */

export type MessageIntent =
  | "new_prompt"
  | "continuation"
  | "modification"
  | "optimization"
  | "feedback_analysis";

export interface ClassificationResult {
  intent: MessageIntent;
  confidence: "high" | "medium" | "low";
  label: string;
}

const FEEDBACK_PATTERNS = [
  "bad output", "wrong output", "it said", "model output",
  "actual output", "gemini responded", "ai studio output",
  "went wrong", "it ignored", "the response was", "got this output",
  "pasted output", "it keeps saying", "broken output", "incorrect response",
  "hallucinated", "diagnose this", "analyze this output", "why did it",
];

const NEW_PROMPT_PATTERNS = [
  "create a new", "start fresh", "new prompt", "from scratch",
  "build a prompt", "write a prompt", "make a prompt",
  "design a prompt", "i need a prompt", "create a prompt",
];

const OPTIMIZATION_PATTERNS = [
  "optimize", "improve", "enhance", "make better",
  "make it better", "strengthen", "sharpen", "increase score",
  "boost", "upgrade", "higher score", "more efficient",
  "optimize this", "can you improve", "how do i improve",
];

const MODIFICATION_PATTERNS = [
  "change", "update", "modify", "add", "remove", "edit",
  "rewrite", "adjust", "fix", "replace", "include", "exclude",
  "make it", "set the", "switch to", "apply", "append",
  "delete", "insert", "restructure",
];

export function classifyMessageIntent(
  message: string,
  hasExistingPrompt: boolean
): ClassificationResult {
  const lower = message.toLowerCase().trim();

  for (const p of FEEDBACK_PATTERNS) {
    if (lower.includes(p)) {
      return { intent: "feedback_analysis", confidence: "high", label: "Feedback Analysis" };
    }
  }

  if (!hasExistingPrompt) {
    return { intent: "new_prompt", confidence: "high", label: "New Prompt" };
  }

  for (const p of NEW_PROMPT_PATTERNS) {
    if (lower.includes(p)) {
      return { intent: "new_prompt", confidence: "medium", label: "New Prompt" };
    }
  }

  for (const p of OPTIMIZATION_PATTERNS) {
    if (lower.includes(p)) {
      return { intent: "optimization", confidence: "high", label: "Optimization" };
    }
  }

  for (const p of MODIFICATION_PATTERNS) {
    if (lower.includes(p)) {
      return { intent: "modification", confidence: "medium", label: "Modification" };
    }
  }

  return { intent: "continuation", confidence: "low", label: "Continuation" };
}

export const INTENT_STYLE: Record<MessageIntent, string> = {
  new_prompt: "text-[#6CECC8] border-[#6CECC8]/30 bg-[#6CECC8]/10",
  continuation: "text-[#9BAAD4] border-white/10 bg-white/5",
  modification: "text-[#79AEFF] border-[#79AEFF]/30 bg-[#79AEFF]/10",
  optimization: "text-[#B48FFF] border-[#B48FFF]/30 bg-[#B48FFF]/10",
  feedback_analysis: "text-amber-400 border-amber-500/30 bg-amber-500/10",
};
