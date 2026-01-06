import { create } from "zustand";
import { useServersStore } from "./servers";
import type {
  Session,
  Message,
  Part,
  SessionStatus,
  Todo,
  AssistantMessage,
} from "@/lib/opencode/types";

interface TokenCounts {
  input: number;
  output: number;
  total: number;
}

interface SessionWithMessages {
  session: Session;
  messages: Array<{ info: Message; parts: Part[] }>;
  todos: Todo[];
  status: SessionStatus;
}

interface SessionsStore {
  // State
  sessions: Session[];
  sessionStatuses: Record<string, SessionStatus>;
  sessionTokenCounts: Record<string, TokenCounts>;
  currentSession: SessionWithMessages | null;
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  fetchSessionMessages: (id: string) => Promise<void>;
  createSession: (title?: string) => Promise<Session | null>;
  deleteSession: (id: string) => Promise<boolean>;
  updateSession: (id: string, title: string) => Promise<void>;
  shareSession: (id: string) => Promise<Session | null>;
  unshareSession: (id: string) => Promise<Session | null>;
  abortSession: (id: string) => Promise<boolean>;
  sendPrompt: (
    sessionId: string,
    text: string,
    modelId?: string,
    agent?: string,
  ) => Promise<void>;
  clearCurrentSession: () => void;

  // Real-time updates
  updateSessionFromEvent: (session: Session) => void;
  removeSessionFromEvent: (sessionId: string) => void;
  updateMessageFromEvent: (message: Message) => void;
  updatePartFromEvent: (part: Part, delta?: string) => void;
  updateStatusFromEvent: (sessionId: string, status: SessionStatus) => void;
  updateTodosFromEvent: (sessionId: string, todos: Todo[]) => void;
}

// Helper function to calculate token counts from messages
function calculateTokenCounts(
  messages: Array<{ info: Message; parts: Part[] }>,
): TokenCounts {
  let input = 0;
  let output = 0;

  for (const msg of messages) {
    if (msg.info.role === "assistant") {
      const assistantMsg = msg.info as AssistantMessage;
      if (assistantMsg.tokens) {
        input += assistantMsg.tokens.input;
        output += assistantMsg.tokens.output;
      }
    }
  }

  return { input, output, total: input + output };
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  // Initial state
  sessions: [],
  sessionStatuses: {},
  sessionTokenCounts: {},
  currentSession: null,
  isLoading: false,
  isLoadingMessages: false,
  error: null,

  // Fetch all sessions
  fetchSessions: async () => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) {
      set({ sessions: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const [sessionsRes, statusRes] = await Promise.all([
        client.session.list({ query: { directory: activeProjectPath } }),
        client.session.status({ query: { directory: activeProjectPath } }),
      ]);

      if (sessionsRes.data) {
        // Sort by updated time descending
        const sorted = [...sessionsRes.data].sort(
          (a, b) => b.time.updated - a.time.updated,
        );
        set({
          sessions: sorted,
          sessionStatuses: statusRes.data || {},
          isLoading: false,
        });
      } else {
        set({ sessions: [], isLoading: false });
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch sessions",
        isLoading: false,
      });
    }
  },

  // Fetch a single session
  fetchSession: async (id: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return;

    try {
      const response = await client.session.get({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, session: response.data! }
            : {
                session: response.data!,
                messages: [],
                todos: [],
                status: { type: "idle" },
              },
        }));
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  },

  // Fetch messages for a session
  fetchSessionMessages: async (id: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return;

    set({ isLoadingMessages: true });

    try {
      const [messagesRes, todoRes, statusRes] = await Promise.all([
        client.session.messages({
          path: { id },
          query: { directory: activeProjectPath },
        }),
        client.session.todo({
          path: { id },
          query: { directory: activeProjectPath },
        }),
        client.session.status({ query: { directory: activeProjectPath } }),
      ]);

      const status = statusRes.data?.[id] || { type: "idle" as const };
      const messages = messagesRes.data || [];
      const tokenCounts = calculateTokenCounts(messages);

      set((state) => ({
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              messages,
              todos: todoRes.data || [],
              status,
            }
          : null,
        sessionTokenCounts: {
          ...state.sessionTokenCounts,
          [id]: tokenCounts,
        },
        isLoadingMessages: false,
      }));
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      set({ isLoadingMessages: false });
    }
  },

  // Create a new session
  createSession: async (title?: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return null;

    try {
      const response = await client.session.create({
        body: { title },
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        set((state) => ({
          sessions: [response.data!, ...state.sessions],
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  },

  // Delete a session
  deleteSession: async (id: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return false;

    try {
      const response = await client.session.delete({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSession:
            state.currentSession?.session.id === id
              ? null
              : state.currentSession,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete session:", error);
      return false;
    }
  },

  // Update session title
  updateSession: async (id: string, title: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return;

    try {
      const response = await client.session.update({
        path: { id },
        body: { title },
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? response.data! : s,
          ),
          currentSession:
            state.currentSession?.session.id === id
              ? { ...state.currentSession, session: response.data! }
              : state.currentSession,
        }));
      }
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  },

  // Share a session
  shareSession: async (id: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return null;

    try {
      const response = await client.session.share({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        get().updateSessionFromEvent(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to share session:", error);
      return null;
    }
  },

  // Unshare a session
  unshareSession: async (id: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return null;

    try {
      const response = await client.session.unshare({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        get().updateSessionFromEvent(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to unshare session:", error);
      return null;
    }
  },

  // Abort a session
  abortSession: async (id: string) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return false;

    try {
      const response = await client.session.abort({
        path: { id },
        query: { directory: activeProjectPath },
      });
      return response.data === true;
    } catch (error) {
      console.error("Failed to abort session:", error);
      return false;
    }
  },

  // Send a prompt
  sendPrompt: async (
    sessionId: string,
    text: string,
    modelId?: string,
    agent?: string,
  ) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return;

    try {
      // Parse modelId into provider and model parts
      // modelId format: "provider/model"
      let modelParam: { providerID: string; modelID: string } | undefined;
      if (modelId) {
        const [providerID, ...modelParts] = modelId.split("/");
        const modelID = modelParts.join("/"); // Handle model IDs with slashes
        if (providerID && modelID) {
          modelParam = { providerID, modelID };
        }
      }

      // Use promptAsync to not block
      await client.session.promptAsync({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }],
          ...(modelParam && { model: modelParam }),
          ...(agent && { agent }),
        },
        query: { directory: activeProjectPath },
      });
    } catch (error) {
      console.error("Failed to send prompt:", error);
    }
  },

  // Clear current session
  clearCurrentSession: () => {
    set({ currentSession: null });
  },

  // Real-time update handlers
  updateSessionFromEvent: (session: Session) => {
    set((state) => {
      // Filter out any existing session with this id, then add the updated one
      const filtered = state.sessions.filter((s) => s.id !== session.id);
      const sessions = [session, ...filtered];

      // Sort by updated time
      sessions.sort((a, b) => b.time.updated - a.time.updated);

      return {
        sessions,
        currentSession:
          state.currentSession?.session.id === session.id
            ? { ...state.currentSession, session }
            : state.currentSession,
      };
    });
  },

  removeSessionFromEvent: (sessionId: string) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSession:
        state.currentSession?.session.id === sessionId
          ? null
          : state.currentSession,
    }));
  },

  updateMessageFromEvent: (message: Message) => {
    set((state) => {
      if (!state.currentSession) return state;
      if (state.currentSession.session.id !== message.sessionID) return state;

      const exists = state.currentSession.messages.some(
        (m) => m.info.id === message.id,
      );

      const messages = exists
        ? state.currentSession.messages.map((m) =>
            m.info.id === message.id ? { ...m, info: message } : m,
          )
        : [...state.currentSession.messages, { info: message, parts: [] }];

      // Recalculate token counts when messages change
      const tokenCounts = calculateTokenCounts(messages);

      return {
        currentSession: {
          ...state.currentSession,
          messages,
        },
        sessionTokenCounts: {
          ...state.sessionTokenCounts,
          [message.sessionID]: tokenCounts,
        },
      };
    });
  },

  updatePartFromEvent: (part: Part, delta?: string) => {
    set((state) => {
      if (!state.currentSession) return state;
      if (state.currentSession.session.id !== part.sessionID) return state;

      const messages = state.currentSession.messages.map((m) => {
        if (m.info.id !== part.messageID) return m;

        const exists = m.parts.some((p) => p.id === part.id);
        const parts = exists
          ? m.parts.map((p) => (p.id === part.id ? part : p))
          : [...m.parts, part];

        return { ...m, parts };
      });

      return {
        currentSession: {
          ...state.currentSession,
          messages,
        },
      };
    });
  },

  updateStatusFromEvent: (sessionId: string, status: SessionStatus) => {
    set((state) => ({
      sessionStatuses: {
        ...state.sessionStatuses,
        [sessionId]: status,
      },
      currentSession:
        state.currentSession?.session.id === sessionId
          ? { ...state.currentSession, status }
          : state.currentSession,
    }));
  },

  updateTodosFromEvent: (sessionId: string, todos: Todo[]) => {
    set((state) => {
      if (state.currentSession?.session.id !== sessionId) return state;
      return {
        currentSession: {
          ...state.currentSession,
          todos,
        },
      };
    });
  },
}));
