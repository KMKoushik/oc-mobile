import { create } from "zustand";
import type {
  Session,
  Message,
  Part,
  SessionStatus,
  Todo,
} from "@/lib/opencode/types";

/**
 * Sessions store - now only manages real-time state that comes from SSE events
 * All server data fetching is handled by TanStack Query hooks
 */
interface SessionsStore {
  // Real-time state from SSE events (for the current session only)
  currentSessionId: string | null;
  currentMessages: Array<{ info: Message; parts: Part[] }>;
  currentTodos: Todo[];
  currentStatus: SessionStatus;

  // Actions
  setCurrentSession: (sessionId: string | null) => void;
  clearCurrentSession: () => void;

  // Real-time updates from SSE
  updateMessageFromEvent: (message: Message) => void;
  updatePartFromEvent: (part: Part, delta?: string) => void;
  updateStatusFromEvent: (sessionId: string, status: SessionStatus) => void;
  updateTodosFromEvent: (sessionId: string, todos: Todo[]) => void;

  // Initialize from fetched data
  initializeMessages: (
    messages: Array<{ info: Message; parts: Part[] }>,
  ) => void;
  initializeTodos: (todos: Todo[]) => void;
  initializeStatus: (status: SessionStatus) => void;
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  // Initial state
  currentSessionId: null,
  currentMessages: [],
  currentTodos: [],
  currentStatus: { type: "idle" },

  // Set current session
  setCurrentSession: (sessionId: string | null) => {
    set({
      currentSessionId: sessionId,
      currentMessages: [],
      currentTodos: [],
      currentStatus: { type: "idle" },
    });
  },

  // Clear current session
  clearCurrentSession: () => {
    set({
      currentSessionId: null,
      currentMessages: [],
      currentTodos: [],
      currentStatus: { type: "idle" },
    });
  },

  // Initialize messages from fetched data
  initializeMessages: (messages) => {
    set({ currentMessages: messages });
  },

  // Initialize todos from fetched data
  initializeTodos: (todos) => {
    set({ currentTodos: todos });
  },

  // Initialize status from fetched data
  initializeStatus: (status) => {
    set({ currentStatus: status });
  },

  // Real-time update handlers from SSE
  updateMessageFromEvent: (message: Message) => {
    const state = get();
    if (state.currentSessionId !== message.sessionID) return;

    const exists = state.currentMessages.some((m) => m.info.id === message.id);

    const messages = exists
      ? state.currentMessages.map((m) =>
          m.info.id === message.id ? { ...m, info: message } : m,
        )
      : [...state.currentMessages, { info: message, parts: [] }];

    set({ currentMessages: messages });
  },

  updatePartFromEvent: (part: Part) => {
    const state = get();
    if (state.currentSessionId !== part.sessionID) return;

    const messages = state.currentMessages.map((m) => {
      if (m.info.id !== part.messageID) return m;

      const exists = m.parts.some((p) => p.id === part.id);
      const parts = exists
        ? m.parts.map((p) => (p.id === part.id ? part : p))
        : [...m.parts, part];

      return { ...m, parts };
    });

    set({ currentMessages: messages });
  },

  updateStatusFromEvent: (sessionId: string, status: SessionStatus) => {
    const state = get();
    if (state.currentSessionId !== sessionId) return;
    set({ currentStatus: status });
  },

  updateTodosFromEvent: (sessionId: string, todos: Todo[]) => {
    const state = get();
    if (state.currentSessionId !== sessionId) return;
    set({ currentTodos: todos });
  },
}));
