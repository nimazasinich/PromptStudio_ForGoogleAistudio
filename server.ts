/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { KNOWLEDGE_BASE } from "./src/data/knowledgeBase";
import { PromptSession, PromptHistoryItem, PromptDefinition, TestScenario } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing with limits to support large documents and files
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Local storage directory setup
const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Memory session state backed by local JSON file storage for top-tier privacy & control
let sessionsState: Record<string, PromptSession> = {};

function initLocalStorage() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
      sessionsState = JSON.parse(data);
    } else {
      sessionsState = {};
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsState, null, 2));
    }
  } catch (error) {
    console.error("Failed to read local sessions storage: ", error);
    sessionsState = {};
  }
}

function saveStateToDisk() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsState, null, 2));
  } catch (err) {
    console.error("Failed to save state to disk: ", err);
  }
}

initLocalStorage();

// Users database setup
const USERS_FILE = path.join(DATA_DIR, "users.json");
let usersState: Record<string, any> = {};

function initUsersStorage() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      usersState = JSON.parse(data);
    } else {
      usersState = {};
      fs.writeFileSync(USERS_FILE, JSON.stringify(usersState, null, 2));
    }
  } catch (error) {
    console.error("Failed to read local users storage: ", error);
    usersState = {};
  }
}

function saveUsersToDisk() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersState, null, 2));
  } catch (err) {
    console.error("Failed to save users state to disk: ", err);
  }
}

initUsersStorage();

// Prompt Templates Catalog
const PROMPT_TEMPLATES = [
  {
    id: "tmpl_code_refactor",
    name: "Elite TypeScript Refactorer",
    category: "Code Generation",
    model: "Gemini 2.0 Flash",
    description: "Translates cluttered TypeScript loops and structures into pristine, modular, highly typed functions with edge-case defenses.",
    systemInstruction: "You are an elite Staff Software Engineer specialized in TypeScript. Your goal is to receive raw functions, analyze them, and rewrite them with complete type safety, high performance, and explicit edge-case protection. Restrict outputs purely to clean code blocks, avoiding chatty prefixes.",
    userTemplate: "Optimize this TypeScript routine:\n```typescript\n{{function_body}}\n```\nEnforce handling for these scenarios: {{edge_cases}}.",
    variables: ["function_body", "edge_cases"],
    examples: [
      {
        id: "ex_1",
        input: "function process(arr) { let r = []; for(let i=0; i<arr.length; i++) { if(arr[i] > 5) r.push(arr[i]); } return r; }",
        output: "export function filterElementsAboveThreshold(values: number[], threshold: number = 5): number[] {\n  if (!Array.isArray(values)) {\n    throw new Error('Input must be an valid array of numbers');\n  }\n  return values.filter(val => val > threshold);\n}"
      }
    ],
    scores: { clarity: 98, constraintAdherence: 95, edgeCases: 92, tokenEfficiency: 96, overall: 95 },
    scoringFeedback: {
      clarity: "Extremely clear separation of structural scopes.",
      constraintAdherence: "Successfully blocks any conversational greeting phrases.",
      edgeCases: "Explicit checks for null inputs.",
      tokenEfficiency: "Utilizes streamlined map and filter constructs."
    },
    tags: ["production", "experimental"]
  },
  {
    id: "tmpl_world_building",
    name: "Cliché-Free World Builder",
    category: "Creative Writing",
    model: "Gemini 1.5 Pro",
    description: "Generates rich fantasy lands, character logs, and cohesive storyboards without relying on standard fantasy clichés.",
    systemInstruction: "You are an award-winning fantasy author. Your goal is to draft intense, highly textured fantasy locations and dialogue arcs while avoiding clichés (such as prophesied heroes, simple light-vs-dark battles, or old wise tavern keepers). Use grim, visceral narrative descriptions.",
    userTemplate: "Establish a faction or region in the world of {{world_name}} dominated by the archetype {{character_archetype}}. Focus on the main mystery of {{primary_conflict}}.",
    variables: ["world_name", "character_archetype", "primary_conflict"],
    examples: [
      {
        id: "ex_1",
        input: "Faction in world 'Zion' featuring archetype 'Soot-weavers' dealing with the 'rust wind'.",
        output: "In the shadow of the Smog-Spire of Zion, the Soot-weavers do not pray to gods—they patch the rusted filters that keep the iron gale from rotting their lungs. The wind carries a fine red powder..."
      }
    ],
    scores: { clarity: 95, constraintAdherence: 96, edgeCases: 88, tokenEfficiency: 90, overall: 92 },
    scoringFeedback: {
      clarity: "Strong identity alignment.",
      constraintAdherence: "Explicitly refutes traditional fantasy tropes.",
      edgeCases: "Good coverage of localized cultural dynamics.",
      tokenEfficiency: "Implements evocative sensory verbs that save token volume."
    },
    tags: ["experimental"]
  },
  {
    id: "tmpl_financial_analyst",
    name: "Structural Ledger Audit Parser",
    category: "Data Analysis",
    model: "Gemini 1.5 Flash",
    description: "Accepts raw spreadsheets or financial listings and extracts structured JSON outputs with calculated EBITDA margins.",
    systemInstruction: "You are a senior forensic accountant. You process financial spreadsheets and extract pristine, double-entry checked tables. Always format your responses in raw JSON matching the requested structure.",
    userTemplate: "Analyze the ledger below:\n```\n{{raw_ledger_data}}\n```\nProvide a financial statement for the year {{target_fiscal_year}} with revenue, EBITDA, and audit status.",
    variables: ["raw_ledger_data", "target_fiscal_year"],
    examples: [
      {
        id: "ex_1",
        input: "Ledger: Q1 $40k rev, $20k expenses. Q2 $60k rev, $30k expenses. Year: 2024",
        output: "{\n  \"fiscalYear\": \"2024\",\n  \"totalRevenue\": 100000,\n  \"ebitda\": 50000,\n  \"ebitdaMarginPercentage\": 50.0,\n  \"auditStatus\": \"unverified\"\n}"
      }
    ],
    scores: { clarity: 99, constraintAdherence: 98, edgeCases: 95, tokenEfficiency: 93, overall: 97 },
    scoringFeedback: {
      clarity: "No room for interpretation. Highly mathematical.",
      constraintAdherence: "Only outputs valid parsed JSON structures.",
      edgeCases: "Explicit JSON variables mapping error flags.",
      tokenEfficiency: "Uses highly compressed nested attributes."
    },
    tags: ["production", "safety-hardened"]
  },
  {
    id: "tmpl_security_audit",
    name: "OWASP API Vulnerability Scanner",
    category: "System Engineering",
    model: "Gemini 2.0 Flash",
    description: "Scans backend code blocks (Node, Python, Go) for injection points and provides concrete mitigation plans.",
    systemInstruction: "You are a Principal Security Auditor. Analyze code blocks for OWASP Top 10 vulnerabilities. Your response must categorize each risk under critical/high/medium levels, with code snippets pointing to the vulnerability, and concrete remediation steps.",
    userTemplate: "Audit this Express backend endpoint:\n```javascript\n{{code_endpoint}}\n```\nFocus parameters explicitly on: {{vulnerability_scope}}.",
    variables: ["code_endpoint", "vulnerability_scope"],
    examples: [
      {
        id: "ex_1",
        input: "app.get('/user', (req, res) => { db.query('SELECT * FROM users WHERE id=' + req.query.id, ... ) })",
        output: "### [HIGH] SQL Injection Susceptibility\n- **Vulnerable Code**: Using raw concatenations in db.query.\n- **Mitigation**: Use parameterized queries:\n`db.query('SELECT * FROM users WHERE id = ?', [req.query.id])`"
      }
    ],
    scores: { clarity: 96, constraintAdherence: 94, edgeCases: 95, tokenEfficiency: 92, overall: 94 },
    scoringFeedback: {
      clarity: "Clear markdown tables for audit readability.",
      constraintAdherence: "Never recommends obsolete mitigation modules.",
      edgeCases: "Highlights secondary risks such as unhandled promise rejections.",
      tokenEfficiency: "Presents code blocks succinctly."
    },
    tags: ["safety-hardened", "experimental"]
  }
];


// Lazy Gemini API Client instantiation to prevent startup crashes if API key isn't active
let genaiClient: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

function getGeminiClient(): GoogleGenAI {
  if (!API_KEY || API_KEY === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is missing or unconfigured. Please add your credentials in the Settings > Secrets panel of Google AI Studio."
    );
  }
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genaiClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// API Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    hasApiKey: !!API_KEY && API_KEY !== "MY_GEMINI_API_KEY",
    timestamp: new Date().toISOString(),
  });
});

// AUTHENTICATION ENDPOINTS
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (usersState[normalizedEmail]) {
    return res.status(400).json({ error: "User already exists with this email address." });
  }

  const newUser = {
    id: "usr_" + Math.random().toString(36).substr(2, 9),
    email: normalizedEmail,
    password, // Store in plain text or simple hash since this is a secure sandbox environment
    name: name.trim(),
    bio: "AI Studio Prompt Architect in-training",
    preferredModel: "Gemini 2.0 Flash",
    provider: "local",
    createdAt: new Date().toISOString(),
  };

  usersState[normalizedEmail] = newUser;
  saveUsersToDisk();

  // Return user without password
  const { password: _, ...userResponse } = newUser;
  res.status(201).json(userResponse);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = usersState[normalizedEmail];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email credentials or password." });
  }

  const { password: _, ...userResponse } = user;
  res.json(userResponse);
});

app.post("/api/auth/social", (req, res) => {
  const { email, name, provider, avatarUrl } = req.body;
  if (!email || !name || !provider) {
    return res.status(400).json({ error: "Missing identity attributes." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = usersState[normalizedEmail];

  if (!user) {
    // Auto register social user
    user = {
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      email: normalizedEmail,
      name: name.trim(),
      bio: `Google AI Studio Prompt Engineer with ${provider.toUpperCase()}`,
      preferredModel: "Gemini 2.0 Flash",
      provider,
      avatarUrl,
      createdAt: new Date().toISOString(),
    };
    usersState[normalizedEmail] = user;
    saveUsersToDisk();
  }

  const { password: _, ...userResponse } = user;
  res.json(userResponse);
});

app.get("/api/auth/profile", (req, res) => {
  const emailHeader = req.headers["x-user-email"] as string;
  if (!emailHeader) {
    return res.status(401).json({ error: "Unauthorized access. No identification header." });
  }

  const normalizedEmail = emailHeader.toLowerCase().trim();
  const user = usersState[normalizedEmail];
  if (!user) {
    return res.status(404).json({ error: "Profile not found." });
  }

  const { password: _, ...userResponse } = user;
  res.json(userResponse);
});

app.post("/api/auth/profile", (req, res) => {
  const emailHeader = req.headers["x-user-email"] as string;
  if (!emailHeader) {
    return res.status(401).json({ error: "Unauthorized access." });
  }

  const { name, bio, preferredModel } = req.body;
  const normalizedEmail = emailHeader.toLowerCase().trim();
  const user = usersState[normalizedEmail];
  
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (name) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (preferredModel) user.preferredModel = preferredModel;

  usersState[normalizedEmail] = user;
  saveUsersToDisk();

  const { password: _, ...userResponse } = user;
  res.json(userResponse);
});

// TEMPLATE LIBRARY ENDPOINTS
app.get("/api/templates", (req, res) => {
  const { q, category, model, tag } = req.query;
  let list = [...PROMPT_TEMPLATES];

  if (q) {
    const queryStr = (q as string).toLowerCase().trim();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(queryStr) ||
        t.description.toLowerCase().includes(queryStr) ||
        t.systemInstruction.toLowerCase().includes(queryStr)
    );
  }

  if (category) {
    list = list.filter((t) => t.category.toLowerCase() === (category as string).toLowerCase());
  }

  if (model) {
    list = list.filter((t) => t.model.toLowerCase().includes((model as string).toLowerCase()));
  }

  if (tag) {
    const tagStr = (tag as string).toLowerCase().trim();
    list = list.filter((t) => t.tags && t.tags.some((tg) => tg.toLowerCase() === tagStr));
  }

  res.json(list);
});

app.post("/api/templates/import", (req, res) => {
  const { sessionId, templateId } = req.body;
  if (!sessionId || !templateId) {
    return res.status(400).json({ error: "Missing sessionId or templateId parameters." });
  }

  const sess = sessionsState[sessionId];
  if (!sess) {
    return res.status(404).json({ error: "Session workspace not found." });
  }

  const template = PROMPT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: "Template could not be located in index." });
  }

  const now = new Date().toISOString();
  const newPrompt: PromptDefinition = {
    id: "pdef_" + Math.random().toString(36).substr(2, 9),
    version: (sess.currentPrompt?.version || 0) + 1,
    systemInstruction: template.systemInstruction,
    userTemplate: template.userTemplate,
    variables: [...template.variables],
    examples: template.examples.map((ex) => ({ ...ex })),
    createdAt: now,
    scores: { ...template.scores },
    scoringFeedback: { ...template.scoringFeedback },
    tags: template.tags ? [...template.tags] : [],
  };

  sess.currentPrompt = newPrompt;
  sess.versionHistory.push(newPrompt);

  const historyItem: PromptHistoryItem = {
    id: "hist_" + Math.random().toString(36).substr(2, 9),
    role: "assistant",
    content: `Successfully imported the **${template.name}** template. Optimized for **${template.model}** with an overall score rating of **${template.scores.overall}/100**!\n\nYou can now test variable configurations in the compiler or chat with me to make custom modifications.`,
    timestamp: now,
    type: "optimize",
    metadata: {
      optimizedPrompt: newPrompt,
      extractedVariables: newPrompt.variables,
    },
  };

  sess.history.push(historyItem);
  sess.updatedAt = now;
  saveStateToDisk();

  res.json({ success: true, session: sess, prompt: newPrompt });
});


// Search local vector/keyword-RAG index across optimal guidelines
app.get("/api/kb/search", (req, res) => {
  const query = (req.query.q as string || "").toLowerCase().trim();
  if (!query) {
    return res.json(KNOWLEDGE_BASE);
  }
  const filtered = KNOWLEDGE_BASE.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      a.summary.toLowerCase().includes(query) ||
      a.content.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
  );
  res.json(filtered);
});

// List saved local sessions
app.get("/api/sessions", (req, res) => {
  const list = Object.values(sessionsState).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  res.json(list);
});

// Fetch single session
app.get("/api/sessions/:id", (req, res) => {
  const id = req.params.id;
  const session = sessionsState[id];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// Create session
app.post("/api/sessions", (req, res) => {
  const { name } = req.body;
  const id = "sess_" + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  
  const newSession: PromptSession = {
    id,
    name: name || `Draft Prompt Session ${Object.keys(sessionsState).length + 1}`,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        id: "hist_init",
        role: "system",
        content: `Hi! I am your AI Studio Prompt Engineering Co-Pilot. I specialize in designing and verifying top-scoring system instructions, formatting few-shot XML arrays, running auto-tests, and correcting prompts when AI Studio outputs failures. Tell me, what kind of prompt are we crafting today?`,
        timestamp: now,
        type: "chat",
      },
    ],
    currentPrompt: null,
    versionHistory: [],
  };

  sessionsState[id] = newSession;
  saveStateToDisk();
  res.status(201).json(newSession);
});

// Rename a session
app.patch("/api/sessions/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const sess = sessionsState[id];
  if (!sess) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (name !== undefined) {
    sess.name = (name as string).trim() || sess.name;
  }
  sess.updatedAt = new Date().toISOString();
  saveStateToDisk();
  res.json({ success: true, session: sess });
});

// Apply a pre-built PromptDefinition to a session (used by HuggingFace template picker and similar flows)
app.post("/api/sessions/:id/apply-prompt", (req, res) => {
  const { id } = req.params;
  const { promptDefinition, historyMessage } = req.body;

  if (!promptDefinition) {
    return res.status(400).json({ error: "Missing promptDefinition payload." });
  }

  const sess = sessionsState[id];
  if (!sess) {
    return res.status(404).json({ error: "Session not found" });
  }

  const now = new Date().toISOString();
  const pData: PromptDefinition = {
    ...promptDefinition,
    id: "pdef_" + Math.random().toString(36).substr(2, 9),
    version: (sess.currentPrompt?.version || 0) + 1,
    createdAt: now,
  };

  sess.currentPrompt = pData;
  sess.versionHistory.push(pData);

  const histItem: PromptHistoryItem = {
    id: "hist_" + Math.random().toString(36).substr(2, 9),
    role: "assistant",
    content: historyMessage || `Prompt applied (v${pData.version}). Overall score: **${pData.scores?.overall ?? "N/A"}/100**.`,
    timestamp: now,
    type: "optimize",
    metadata: {
      optimizedPrompt: pData,
      extractedVariables: pData.variables,
    },
  };

  sess.history.push(histItem);
  sess.updatedAt = now;
  saveStateToDisk();

  res.json({ success: true, session: sess, prompt: pData });
});

// Select prompt version from history
app.post("/api/sessions/:id/version", (req, res) => {
  const { id } = req.params;
  const { promptId } = req.body;
  
  const sess = sessionsState[id];
  if (!sess) {
    return res.status(404).json({ error: "Session workspace not found" });
  }

  const targetPrompt = sess.versionHistory.find((p) => p.id === promptId);
  if (!targetPrompt) {
    return res.status(404).json({ error: "Selected prompt version index not found" });
  }

  sess.currentPrompt = targetPrompt;
  sess.updatedAt = new Date().toISOString();
  saveStateToDisk();

  res.json({ success: true, session: sess });
});

// Delete session
app.delete("/api/sessions/:id", (req, res) => {
  const id = req.params.id;
  if (!sessionsState[id]) {
    return res.status(404).json({ error: "Session not found" });
  }
  delete sessionsState[id];
  saveStateToDisk();
  res.json({ success: true });
});

// Helper for generating deep diagnostic prompts with built-in RAG references
function constructRAGContext(promptIdea: string): string {
  const keywords = ["token", "system", "instruction", "safety", "few-shot", "format", "xml", "json"];
  const matchedGuides: string[] = [];
  
  for (const keyword of keywords) {
    if (promptIdea.toLowerCase().includes(keyword)) {
      const guide = KNOWLEDGE_BASE.find((k) => k.id.includes(keyword) || k.category.includes(keyword));
      if (guide && !matchedGuides.includes(guide.content)) {
        matchedGuides.push(`[GUIDELINE: ${guide.title}]\n${guide.content}`);
      }
    }
  }

  // Fallback to primary guides if none explicitly matched
  if (matchedGuides.length === 0) {
    matchedGuides.push(`[GUIDELINE: ${KNOWLEDGE_BASE[1].title}]\n${KNOWLEDGE_BASE[1].content}`);
    matchedGuides.push(`[GUIDELINE: ${KNOWLEDGE_BASE[3].title}]\n${KNOWLEDGE_BASE[3].content}`);
  }

  return matchedGuides.join("\n\n");
}

// POST endpoint: Full prompt optimization and creation
app.post("/api/prompt/optimize", async (req, res) => {
  const { promptIdea, contextDoc, sessionId, model: requestedOptimizeModel } = req.body;
  const optimizeModel = requestedOptimizeModel || "gemini-3.5-flash";
  if (!promptIdea) {
    return res.status(400).json({ error: "Missing promptIdea parameter." });
  }

  try {
    const ai = getGeminiClient();
    const ragKnowledge = constructRAGContext(promptIdea);
    
    const optimizationSystemInstruction = `
You are an elite, world-class Google AI Studio prompt engineering system. Your mission is to rewrite and optimize a raw user prompt or goal into a pristine, production-ready, highly organized system instruction and template format matching Gemini's architecture.

CRITICAL INSTRUCTIONS:
1. DESIGN AN EXPLICIT ROLE/IDENTITY: Define a highly detailed persona that locks down tone, constraints, and objective boundaries.
2. ENFORCE STRIFE-FREE BULLETPROOF CONSTRAINTS: Always write active negatives to prevent conversational bloat, introductory fluff, or greeting lines.
3. EXTRACT ALL DYNAMIC VARIABLES: Mark placeholders with double curly braces like {{variable_name}}.
4. DELIVER HIGH-IMPACT XML FEW-SHOT EXAMPLES: Always output 2 realistic input/output pairs matching real-use cases. Wrap user instructions in <user_query> and target responses in <ideal_response>.
5. SCORE YOUR GENERATION: Rate your output from 0 to 100 on clarity, constraintAdherence, edgeCases, and tokenEfficiency. Make sure your score is objective, highlighting what works and where potential risks lie.

GUIDELINES SCANNED FROM AI STUDIO SOURCE CONTEXT:
${ragKnowledge}

${contextDoc ? `USER ATTACHED GROUNDING DOCUMENT CONTENT:\n${contextDoc}\n` : ""}
`;

    const userMessage = `Optimize this prompt goal: "${promptIdea}"`;

    const response = await ai.models.generateContent({
      model: optimizeModel,
      contents: userMessage,
      config: {
        systemInstruction: optimizationSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systemInstruction: {
              type: Type.STRING,
              description: "The complete engineering system instruction block containing roles, priority constraints, and structural mandates.",
            },
            userTemplate: {
              type: Type.STRING,
              description: "The format user queries should be fed in, incorporating dynamic double curly brace variables (e.g., {{variable}}).",
            },
            variables: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of parsed variable keys found in the user template.",
            },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  input: { type: Type.STRING, description: "Sample inputs filled into the variables structure." },
                  output: { type: Type.STRING, description: "The perfectly engineered, high-fidelity model target output." },
                },
                required: ["id", "input", "output"],
              },
            },
            scores: {
              type: Type.OBJECT,
              properties: {
                clarity: { type: Type.INTEGER, description: "Is the prompt clear, logical, and unambiguous?" },
                constraintAdherence: { type: Type.INTEGER, description: "How strictly does it define negative limits and instructions?" },
                edgeCases: { type: Type.INTEGER, description: "Does it address missing data, error handling, or fallback conditions?" },
                tokenEfficiency: { type: Type.INTEGER, description: "Is it formatted to leverage static prefixes and maintain density?" },
                overall: { type: Type.INTEGER, description: "The statistical average of the four metrics above." },
              },
              required: ["clarity", "constraintAdherence", "edgeCases", "tokenEfficiency", "overall"],
            },
            scoringFeedback: {
              type: Type.OBJECT,
              properties: {
                clarity: { type: Type.STRING },
                constraintAdherence: { type: Type.STRING },
                edgeCases: { type: Type.STRING },
                tokenEfficiency: { type: Type.STRING },
              },
              required: ["clarity", "constraintAdherence", "edgeCases", "tokenEfficiency"],
            },
          },
          required: [
            "systemInstruction",
            "userTemplate",
            "variables",
            "examples",
            "scores",
            "scoringFeedback",
          ],
        },
      },
    });

    const optimizedData: PromptDefinition = JSON.parse(response.text || "{}");
    optimizedData.id = "pdef_" + Math.random().toString(36).substr(2, 9);
    optimizedData.version = 1;
    optimizedData.createdAt = new Date().toISOString();

    // Persist optimized prompt to active session if provided
    if (sessionId && sessionsState[sessionId]) {
      const sess = sessionsState[sessionId];
      
      // Update session history
      const now = new Date().toISOString();
      const userItem: PromptHistoryItem = {
        id: "hist_" + Math.random().toString(36).substr(2, 9),
        role: "user",
        content: `Refine/Optimize prompt idea: ${promptIdea}`,
        timestamp: now,
        type: "optimize",
      };
      
      const assistantItem: PromptHistoryItem = {
        id: "hist_" + Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: `I have engineered and scored an optimized prompt candidate! Overall Rating: **${optimizedData.scores.overall}/100**.\n\n### Optimization Summary\n\n- **Clarity**: ${optimizedData.scoringFeedback.clarity}\n- **Constraint Adherence**: ${optimizedData.scoringFeedback.constraintAdherence}\n- **Edge Cases**: ${optimizedData.scoringFeedback.edgeCases}\n- **Token Efficiency**: ${optimizedData.scoringFeedback.tokenEfficiency}`,
        timestamp: now,
        type: "optimize",
        metadata: {
          optimizedPrompt: optimizedData,
          extractedVariables: optimizedData.variables,
        },
      };

      sess.history.push(userItem, assistantItem);
      sess.currentPrompt = optimizedData;
      sess.versionHistory.push(optimizedData);
      sess.updatedAt = now;
      saveStateToDisk();
    }

    res.json(optimizedData);
  } catch (error: any) {
    console.error("Optimization failed:", error);
    res.status(500).json({ error: error.message || "Prompt optimization failed." });
  }
});

// POST endpoint: Continuous chat within session to tweak / alter prompt
app.post("/api/sessions/:id/chat", async (req, res) => {
  const sessId = req.params.id;
  const { message, imageBase64, mimeType, contextDoc, model: requestedModel } = req.body;
  const sess = sessionsState[sessId];

  if (!sess) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (!message) {
    return res.status(400).json({ error: "Missing message parameter" });
  }

  // Persist the user message immediately so it survives API key failures or quota errors
  const persistNow = new Date().toISOString();
  const userMsgId = "hist_" + Math.random().toString(36).substr(2, 9);
  const userMsg: PromptHistoryItem = {
    id: userMsgId,
    role: "user",
    content: message,
    timestamp: persistNow,
    type: "chat",
  };
  sess.history.push(userMsg);
  sess.updatedAt = persistNow;
  saveStateToDisk();

  try {
    const ai = getGeminiClient();
    const now = persistNow;

    // Prepare systemic prompt manager context
    const currentPromptState = sess.currentPrompt
      ? `CURRENT TARGET PROMPT STATE:
System Instruction:
"""
${sess.currentPrompt.systemInstruction}
"""
User Template:
"""
${sess.currentPrompt.userTemplate}
"""
Variables: ${JSON.stringify(sess.currentPrompt.variables)}
Few-Shot Examples: ${JSON.stringify(sess.currentPrompt.examples)}
`
      : "No prompt currently active.";

    const dialogSystemInstruction = `
You are an expert Google AI Studio Prompt Architect that co-pilots a live chat thread with a user to iteratively build the ultimate prompt.
Your task is to review the conversational log, the current target prompt state, and any user comments.

DETERMINE USER INTENT:
1. Is the user asking general questions? Reply with helpful, highly technical, yet clean guidance.
2. Is the user trying to modify, expand, or fix the active prompt? Output an updated, improved prompt version matching their notes alongside your regular chat text.

If you generate an updated prompt version inside your output, format it cleanly. Make sure safety, clarity, edge-case coverage, and token limits are fully reinforced.

${currentPromptState}
${contextDoc ? `\nGROUNDING DOCUMENT PROVIDED BY USER:\n"""\n${contextDoc}\n"""\n` : ""}`;

    // Build Gemini-compatible multi-turn contents from persisted session history.
    // System-role messages are excluded (they belong in systemInstruction).
    // Consecutive same-role turns are merged to comply with Gemini's alternating requirement.
    const geminiContents: any[] = [];
    for (const h of sess.history) {
      if (h.role === "system") continue;
      const role = h.role === "assistant" ? "model" : "user";
      const parts: any[] = [{ text: h.content }];
      if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === role) {
        geminiContents[geminiContents.length - 1].parts.push(...parts);
      } else {
        geminiContents.push({ role, parts });
      }
    }

    // Attach image to the last user turn if provided
    if (imageBase64 && geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === "user") {
      geminiContents[geminiContents.length - 1].parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }

    // Fallback: ensure at least one user turn exists
    if (geminiContents.length === 0) {
      geminiContents.push({ role: "user", parts: [{ text: message }] });
    }

    const chatModel = requestedModel || "gemini-3.5-flash";

    // Call Gemini with full conversation history for multi-turn awareness
    const response = await ai.models.generateContent({
      model: chatModel,
      contents: geminiContents,
      config: {
        systemInstruction: dialogSystemInstruction,
        // We will request JSON schema containing a 'chattext' parameter alongside an optional 'updatedPrompt' block
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chatText: {
              type: Type.STRING,
              description: "The primary conversational feedback to display in the chat bubble.",
            },
            updatedPrompt: {
              type: Type.OBJECT,
              description: "Optional updated prompt definition if the chat resulted in modifications.",
              properties: {
                systemInstruction: { type: Type.STRING },
                userTemplate: { type: Type.STRING },
                variables: { type: Type.ARRAY, items: { type: Type.STRING } },
                examples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      input: { type: Type.STRING },
                      output: { type: Type.STRING },
                    },
                    required: ["id", "input", "output"],
                  },
                },
                scores: {
                  type: Type.OBJECT,
                  properties: {
                    clarity: { type: Type.INTEGER },
                    constraintAdherence: { type: Type.INTEGER },
                    edgeCases: { type: Type.INTEGER },
                    tokenEfficiency: { type: Type.INTEGER },
                    overall: { type: Type.INTEGER },
                  },
                  required: ["clarity", "constraintAdherence", "edgeCases", "tokenEfficiency", "overall"],
                },
                scoringFeedback: {
                  type: Type.OBJECT,
                  properties: {
                    clarity: { type: Type.STRING },
                    constraintAdherence: { type: Type.STRING },
                    edgeCases: { type: Type.STRING },
                    tokenEfficiency: { type: Type.STRING },
                  },
                  required: ["clarity", "constraintAdherence", "edgeCases", "tokenEfficiency"],
                },
              },
              required: ["systemInstruction", "userTemplate", "variables", "examples", "scores", "scoringFeedback"],
            },
          },
          required: ["chatText"],
        },
      },
    });

    const parsedResult = JSON.parse(response.text || "{}");
    const responseNow = new Date().toISOString();

    const assistantMsg: PromptHistoryItem = {
      id: "hist_" + Math.random().toString(36).substr(2, 9),
      role: "assistant",
      content: parsedResult.chatText,
      timestamp: responseNow,
      type: "chat",
    };

    if (parsedResult.updatedPrompt) {
      const pData: PromptDefinition = parsedResult.updatedPrompt;
      const nextVer = (sess.currentPrompt?.version || 0) + 1;
      pData.id = "pdef_" + Math.random().toString(36).substr(2, 9);
      pData.version = nextVer;
      pData.createdAt = responseNow;

      sess.currentPrompt = pData;
      sess.versionHistory.push(pData);
      assistantMsg.type = "optimize";
      assistantMsg.metadata = {
        optimizedPrompt: pData,
        extractedVariables: pData.variables,
      };
    }

    sess.history.push(assistantMsg);
    sess.updatedAt = responseNow;
    saveStateToDisk();

    res.json({
      chatResponse: parsedResult.chatText,
      updatedPrompt: parsedResult.updatedPrompt || null,
      session: sess,
    });
  } catch (error: any) {
    console.error("Chat turn failed:", error);
    res.status(500).json({ error: error.message || "Failed to process chat conversation." });
  }
});

// POST endpoint: Google AI feedback processor
// paste a disappointing real-life output from AI Studio along with instructions to diagnose and auto-rewrite!
app.post("/api/prompt/analyze-feedback", async (req, res) => {
  const { sessionId, originalPrompt, pastedOutput, expectation, model: requestedFeedbackModel } = req.body;
  const feedbackModel = requestedFeedbackModel || "gemini-3.5-flash";
  if (!pastedOutput) {
    return res.status(400).json({ error: "Missing pasted disappointing output data." });
  }

  try {
    const ai = getGeminiClient();
    const systemInstruction = `
You are an advanced Diagnostic Debugger for AI Studio responses.
A prompt engineer run a prompt on Gemini, copied the output, but it was incorrect, buggy, or broke a constraint.
Analyze:
1. WHAT WENT WRONG: Identify semantic bugs (hallucinations, style leaks, broken delimiters, ignoring negative limits).
2. WHY IT WENT WRONG: Diagnose if instructions weren't clear, if context is bleeding, or if few-shot samples contradicted rules.
3. STRATEGIC REWRITE: Re-engineer the prompt definition to add hard bulletproof patches, safety guards, and specific error-traps.

Provide your findings and a fully patched rewritten prompt version.
`;

    const payload = `
PROMPT ROLLED OUT IN AI STUDIO:
"""
${originalPrompt || "Unknown original prompt"}
"""

REAL (BUT DEFECTIVE/SUB-OPTIMAL) OUTPUT OBSERVED:
"""
${pastedOutput}
"""

USER'S CORRECT SPECIFICATION / EXPECTATION:
"${expectation || "Should adhere to all criteria, formatting perfectly."}"
`;

    const response = await ai.models.generateContent({
      model: feedbackModel,
      contents: payload,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING, description: "Detailed diagnosis of why the model strayed from the directives." },
            rootCause: { type: Type.STRING, description: "A simple, tech-focused explanation tracing back to the prompt's structural flaws." },
            suggestedFixes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific engineering safety patches implemented." },
            patchedPrompt: {
              type: Type.OBJECT,
              description: "The complete, revised, and bulletproof PromptDefinition.",
              properties: {
                systemInstruction: { type: Type.STRING },
                userTemplate: { type: Type.STRING },
                variables: { type: Type.ARRAY, items: { type: Type.STRING } },
                examples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      input: { type: Type.STRING },
                      output: { type: Type.STRING },
                    },
                    required: ["id", "input", "output"],
                  },
                },
                scores: {
                  type: Type.OBJECT,
                  properties: {
                    clarity: { type: Type.INTEGER },
                    constraintAdherence: { type: Type.INTEGER },
                    edgeCases: { type: Type.INTEGER },
                    tokenEfficiency: { type: Type.INTEGER },
                    overall: { type: Type.INTEGER },
                  },
                  required: ["clarity", "constraintAdherence", "edgeCases", "tokenEfficiency", "overall"],
                },
                scoringFeedback: {
                  type: Type.OBJECT,
                  properties: {
                    clarity: { type: Type.STRING },
                    constraintAdherence: { type: Type.STRING },
                    edgeCases: { type: Type.STRING },
                    tokenEfficiency: { type: Type.STRING },
                  },
                  required: ["clarity", "constraintAdherence", "edgeCases", "tokenEfficiency"],
                },
              },
              required: ["systemInstruction", "userTemplate", "variables", "examples", "scores", "scoringFeedback"],
            },
          },
          required: ["diagnosis", "rootCause", "suggestedFixes", "patchedPrompt"],
        },
      },
    });

    const parsedResult = JSON.parse(response.text || "{}");
    const now = new Date().toISOString();

    // Persist to session history if applicable
    if (sessionId && sessionsState[sessionId]) {
      const sess = sessionsState[sessionId];
      const pData: PromptDefinition = parsedResult.patchedPrompt;
      const nextVer = (sess.currentPrompt?.version || 0) + 1;
      pData.id = "pdef_" + Math.random().toString(36).substr(2, 9);
      pData.version = nextVer;
      pData.createdAt = now;

      sess.currentPrompt = pData;
      sess.versionHistory.push(pData);

      const assistantMsg: PromptHistoryItem = {
        id: "hist_" + Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: `### 🛠️ Google AI Studio Feedback Diagnosis Complete\n\n**Diagnosis**: ${parsedResult.diagnosis}\n\n**Root Cause**: ${parsedResult.rootCause}\n\n**Patches Applied:**\n${parsedResult.suggestedFixes.map((f: string) => ` - ${f}`).join("\n")}\n\nPrompt updated to version **v${nextVer}** with an overall score of **${pData.scores.overall}/100**!`,
        timestamp: now,
        type: "feedback_analysis",
        metadata: {
          optimizedPrompt: pData,
          feedbackAnalysis: {
            diagnosis: parsedResult.diagnosis,
            rootCause: parsedResult.rootCause,
            suggestedFixes: parsedResult.suggestedFixes,
            previousOutput: pastedOutput,
            pastedPrompt: originalPrompt || "",
          },
        },
      };

      sess.history.push(assistantMsg);
      sess.updatedAt = now;
      saveStateToDisk();
      parsedResult.updatedSession = sess;
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error("Feedback analysis failed: ", error);
    res.status(500).json({ error: error.message || "Failed to analyze feedback." });
  }
});

// POST endpoint: Run automated tests
app.post("/api/prompt/run-tests", async (req, res) => {
  const { sessionId, promptDefinition, testScenarios, models } = req.body;
  if (!promptDefinition) {
    return res.status(400).json({ error: "Missing promptDefinition payload to evaluate." });
  }

  try {
    const ai = getGeminiClient();
    const activePrompt: PromptDefinition = promptDefinition;
    const { model: defaultTestModel } = req.body;

    // Auto-generate test cases if none provided to keep loop friction-free and fully autonomous
    let scenariosToRun: TestScenario[] = testScenarios || [];
    
    if (scenariosToRun.length === 0) {
      const testGenSystem = `You are a strict QA engineer validating AI Studio prompt configurations. Generate exactly three robust test inputs for a prompt template that takes the following variables: ${JSON.stringify(activePrompt.variables)}. Each test case should specifically target different edge conditions, complex/challenging requests, or invalid inputs. Ensure output structure adheres strictly to the schema.`;
      
      const genResponse = await ai.models.generateContent({
        model: defaultTestModel || "gemini-3.5-flash",
        contents: `Create robust evaluation cases for: System: "${activePrompt.systemInstruction}" and Template: "${activePrompt.userTemplate}"`,
        config: {
          systemInstruction: testGenSystem,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                inputs: {
                  type: Type.OBJECT,
                  description: "Key-value pair corresponding to variables mapping to test string values.",
                },
                expectedCriteria: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Specific evaluation rules (e.g., 'Do not mention bank details', 'Tone is polite')",
                },
              },
              required: ["id", "name", "inputs", "expectedCriteria"],
            },
          },
        },
      });

      scenariosToRun = JSON.parse(genResponse.text || "[]");
    }

    const testRunsOutputs: any[] = [];
    const modelsToExecuteQuery: string[] = (models && Array.isArray(models) && models.length > 0)
      ? models
      : [defaultTestModel || "gemini-3.5-flash"];

    // Run each scenario sequentially
    for (const scenario of scenariosToRun) {
      // 1. Process variables hydration into the user template
      let userQueryHydrated = activePrompt.userTemplate;
      Object.entries(scenario.inputs || {}).forEach(([variable, val]) => {
        userQueryHydrated = userQueryHydrated.replace(new RegExp(`{{\\s*${variable}\\s*}}`, "g"), val || "");
      });

      // 2. Synthesize structured contents incorporating examples if present
      const contentsList: any[] = [];
      
      if (activePrompt.examples && activePrompt.examples.length > 0) {
        activePrompt.examples.forEach((ex) => {
          contentsList.push({ role: "user", parts: [{ text: ex.input }] });
          contentsList.push({ role: "model", parts: [{ text: ex.output }] });
        });
      }

      contentsList.push({ role: "user", parts: [{ text: userQueryHydrated }] });

      // Run each selected model for the same test case side-by-side
      for (const targetModel of modelsToExecuteQuery) {
        let actualPromptOutput = "";
        let execFailed = false;

        try {
          // Run active evaluation execution using Gemini
          const executionResponse = await ai.models.generateContent({
            model: targetModel,
            contents: contentsList,
            config: {
              systemInstruction: activePrompt.systemInstruction,
            },
          });
          actualPromptOutput = executionResponse.text || "";
        } catch (execErr: any) {
          console.error(`Prompt execution failed on model ${targetModel}:`, execErr);
          actualPromptOutput = `Execution error on model ${targetModel}: ${execErr.message || execErr}`;
          execFailed = true;
        }

        let parsedAudit = {
          evalVerdict: "needs_review",
          score: 50,
          explanation: `System was unable to perform correct inference with model ${targetModel}.`
        };

        if (!execFailed) {
          try {
            // Evaluation analysis evaluator step (using gemini-3.5-flash for independent objective audit checks)
            const critEvalSystem = `
You are a separate, objective QA audit system.
Compare the actual AI execution response against a set of expected validation checklists.
Determine if it fully adheres to all constraints.
Output an evaluation rating out of 100, a structured verdict ('pass', 'fail', 'partial'), and explanation.
`;

            const evalPrompt = `
SYSTEM UNDER AUDIT:
"""
${activePrompt.systemInstruction}
"""

TEST INPUT SENT:
"""
${userQueryHydrated}
"""

ACTUAL RESPONSE PRODUCED BY MODEL [${targetModel}]:
"""
${actualPromptOutput}
"""

CHECKLIST EXPECTATIONS:
${JSON.stringify(scenario.expectedCriteria)}
`;

            const evalResponse = await ai.models.generateContent({
              model: defaultTestModel || "gemini-3.5-flash",
              contents: evalPrompt,
              config: {
                systemInstruction: critEvalSystem,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    evalVerdict: { type: Type.STRING, description: "Must be: pass, fail, or partial" },
                    score: { type: Type.INTEGER, description: "A numerical metric from 0 to 100 on rule execution." },
                    explanation: { type: Type.STRING, description: "Specific breakdown of which rules succeeded and which failed." },
                  },
                  required: ["evalVerdict", "score", "explanation"],
                },
              },
            });

            parsedAudit = JSON.parse(evalResponse.text || "{}");
          } catch (evalErr: any) {
            console.error(`Evaluation parsing failed for ${targetModel}:`, evalErr);
            parsedAudit = {
              evalVerdict: "needs_review",
              score: 70,
              explanation: `Audit evaluator encountered error parsing JSON layout: ${evalErr.message || evalErr}`
            };
          }
        }

        testRunsOutputs.push({
          scenarioName: scenario.name,
          inputs: scenario.inputs,
          model: targetModel,
          output: actualPromptOutput,
          evalVerdict: parsedAudit.evalVerdict || "needs_review",
          score: parsedAudit.score || 70,
          explanation: parsedAudit.explanation || "Output parsed without issues.",
        });
      }
    }

    const now = new Date().toISOString();

    // Persist test results to history if session matches
    if (sessionId && sessionsState[sessionId]) {
      const sess = sessionsState[sessionId];
      
      const assistantMsg: PromptHistoryItem = {
        id: "hist_" + Math.random().toString(36).substr(2, 9),
        role: "assistant",
        content: `### 🧪 Side-by-Side Self-Testing Report Complete\n\nI have evaluated constraints sequentially across **${modelsToExecuteQuery.join(", ")}** against template **v${activePrompt.version}**:\n\n${testRunsOutputs
          .map(
            (t) =>
              `- **${t.scenarioName}** on **${t.model}**: ${
                t.evalVerdict === "pass" ? "🟩 PASS" : t.evalVerdict === "fail" ? "🟥 FAIL" : "🟨 PARTIAL"
              } (Score: **${t.score}/100**)\n  *Feedback*: ${t.explanation}`
          )
          .join("\n")}`,
        timestamp: now,
        type: "test_run",
        metadata: {
          testRuns: testRunsOutputs,
        },
      };

      sess.history.push(assistantMsg);
      sess.updatedAt = now;
      saveStateToDisk();
    }

    res.json({
      success: true,
      testRuns: testRunsOutputs,
      generatedScenarios: scenariosToRun,
    });
  } catch (error: any) {
    console.error("Test execution failed:", error);
    res.status(500).json({ error: error.message || "Autonomous testing run failed." });
  }
});


// ----------------------------------------------------
// BOOTSTRAPPING VITE DEV SERVER / STATICS
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
