/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Clean service adapter layer for all external integrations.
 *
 * Each adapter exposes a `status` field that clearly reports whether it is
 * configured or not, preventing silent fake-active states in the UI.
 *
 * Real implementations can be dropped in by replacing the stub bodies below
 * once the corresponding credentials/API access are available.
 *
 * Required env vars (configure in Settings > Secrets / .env):
 *   - Google Drive:  GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_API_KEY
 *   - GitHub:        GITHUB_TOKEN
 *   - HuggingFace:   HF_TOKEN  (optional — public search works without it)
 *   - NotebookLM:    No public API yet
 */

export interface AdapterStatus {
  configured: boolean;
  /** Short human-readable label shown in the UI */
  label: "Connected" | "Not Configured" | "Public Access" | "Unavailable";
  /** Optional tooltip / description */
  hint: string;
}

// ---------------------------------------------------------------------------
// Google Drive
// ---------------------------------------------------------------------------

export interface DriveFile {
  id: string;
  name: string;
  size: string;
  mimeType: string;
}

export interface GoogleDriveAdapter {
  status: AdapterStatus;
  /** List files accessible to the configured service account / OAuth token */
  listFiles: () => Promise<DriveFile[]>;
  /** Fetch plain-text content of a document by its Drive file ID */
  getFileContent: (fileId: string) => Promise<string>;
}

export function createGoogleDriveAdapter(): GoogleDriveAdapter {
  const configured = false; // Set to true once GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_API_KEY are present

  return {
    status: configured
      ? { configured: true, label: "Connected", hint: "" }
      : {
          configured: false,
          label: "Not Configured",
          hint: "Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_API_KEY to your environment secrets.",
        },

    listFiles: async () => {
      // TODO: GET https://www.googleapis.com/drive/v3/files?fields=files(id,name,size,mimeType)
      // with Authorization: Bearer <oauth_token>
      throw new Error(
        "Google Drive integration not configured. Add the required credentials in Settings > Secrets."
      );
    },

    getFileContent: async (_fileId: string) => {
      // TODO: GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media
      throw new Error("Google Drive integration not configured.");
    },
  };
}

// ---------------------------------------------------------------------------
// NotebookLM
// ---------------------------------------------------------------------------

export interface NotebookProject {
  id: string;
  name: string;
  notesCount: number;
}

export interface NotebookLMAdapter {
  status: AdapterStatus;
  listProjects: () => Promise<NotebookProject[]>;
  getProjectContent: (projectId: string) => Promise<string>;
}

export function createNotebookLMAdapter(): NotebookLMAdapter {
  return {
    status: {
      configured: false,
      label: "Unavailable",
      hint: "The NotebookLM public API is not yet available. Integration will be enabled when Google releases official API access.",
    },

    listProjects: async () => {
      throw new Error("NotebookLM does not have a public API yet.");
    },

    getProjectContent: async (_projectId: string) => {
      throw new Error("NotebookLM does not have a public API yet.");
    },
  };
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

export interface GitHubRepo {
  name: string;
  fullName: string;
  branch: string;
  lastCommitHash: string;
}

export interface GitHubAdapter {
  status: AdapterStatus;
  getRepo: (owner: string, repo: string) => Promise<GitHubRepo | null>;
  /** Commit a single file via the GitHub Contents API */
  commitFile: (
    owner: string,
    repo: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branch?: string
  ) => Promise<{ sha: string }>;
}

export function createGitHubAdapter(token?: string): GitHubAdapter {
  const configured = Boolean(token);

  return {
    status: configured
      ? { configured: true, label: "Connected", hint: "" }
      : {
          configured: false,
          label: "Not Configured",
          hint: "Add GITHUB_TOKEN to your environment secrets and enter your repo details in Settings > Integrations.",
        },

    getRepo: async (owner: string, repo: string) => {
      if (!configured) throw new Error("GitHub integration not configured.");
      // TODO: GET https://api.github.com/repos/{owner}/{repo}
      // with Authorization: Bearer <token>
      throw new Error("GitHub getRepo not yet implemented.");
    },

    commitFile: async (owner, repo, filePath, content, commitMessage, branch = "main") => {
      if (!configured) throw new Error("GitHub integration not configured.");
      // TODO: PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}
      throw new Error("GitHub commitFile not yet implemented.");
    },
  };
}

// ---------------------------------------------------------------------------
// Hugging Face
// ---------------------------------------------------------------------------

export interface HFTemplate {
  id: string;
  name: string;
  author: string;
  downloads: string;
  systemInstruction: string;
  userTemplate: string;
  variables: string[];
}

export interface HuggingFaceAdapter {
  status: AdapterStatus;
  /** Search the HF Hub for prompt templates / model cards */
  searchTemplates: (query: string) => Promise<HFTemplate[]>;
  /** Fetch a single template by its Hub model ID */
  getTemplate: (modelId: string) => Promise<HFTemplate | null>;
}

export function createHuggingFaceAdapter(token?: string): HuggingFaceAdapter {
  return {
    status: {
      configured: true, // Public Hub search works without auth
      label: "Public Access",
      hint: token
        ? "Authenticated — private model access enabled."
        : "Add HF_TOKEN for private model/dataset access.",
    },

    searchTemplates: async (_query: string) => {
      // TODO: GET https://huggingface.co/api/models?search={query}&filter=text-generation&limit=10
      // Parse model cards for system_prompt / prompt_template metadata
      throw new Error(
        "Hugging Face live search not yet implemented. The local template catalog is used instead."
      );
    },

    getTemplate: async (_modelId: string) => {
      // TODO: GET https://huggingface.co/api/models/{modelId}
      return null;
    },
  };
}
