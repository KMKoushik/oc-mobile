/**
 * Query key factory for TanStack Query
 * Provides type-safe and consistent query keys across the app
 */
export const queryKeys = {
  // Sessions
  sessions: {
    all: ["sessions"] as const,
    list: (serverUrl: string, projectPath: string) =>
      [...queryKeys.sessions.all, "list", serverUrl, projectPath] as const,
    detail: (serverUrl: string, projectPath: string, id: string) =>
      [
        ...queryKeys.sessions.all,
        "detail",
        serverUrl,
        projectPath,
        id,
      ] as const,
    messages: (serverUrl: string, projectPath: string, id: string) =>
      [
        ...queryKeys.sessions.all,
        "messages",
        serverUrl,
        projectPath,
        id,
      ] as const,
    todos: (serverUrl: string, projectPath: string, id: string) =>
      [...queryKeys.sessions.all, "todos", serverUrl, projectPath, id] as const,
    status: (serverUrl: string, projectPath: string) =>
      [...queryKeys.sessions.all, "status", serverUrl, projectPath] as const,
    diffs: (serverUrl: string, projectPath: string, id: string) =>
      [...queryKeys.sessions.all, "diffs", serverUrl, projectPath, id] as const,
  },

  // Models/Providers
  models: {
    all: ["models"] as const,
    list: (serverUrl: string, projectPath: string) =>
      [...queryKeys.models.all, "list", serverUrl, projectPath] as const,
  },

  // Agents
  agents: {
    all: ["agents"] as const,
    list: (serverUrl: string, projectPath: string) =>
      [...queryKeys.agents.all, "list", serverUrl, projectPath] as const,
  },

  // Projects
  projects: {
    all: ["projects"] as const,
    list: (serverUrl: string) =>
      [...queryKeys.projects.all, "list", serverUrl] as const,
  },

  // Server health
  server: {
    all: ["server"] as const,
    health: (serverUrl: string) =>
      [...queryKeys.server.all, "health", serverUrl] as const,
  },
} as const;
