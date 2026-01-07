import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServersStore } from "@/lib/stores/servers";
import { queryKeys } from "../keys";
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

interface SessionMessages {
  messages: Array<{ info: Message; parts: Part[] }>;
  todos: Todo[];
  status: SessionStatus;
  tokenCounts: TokenCounts;
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

/**
 * Hook to get the active server URL and project path
 */
function useActiveConnection() {
  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);
  const activeProjectPath = useServersStore((s) => s.activeProjectPath);
  const getActiveClient = useServersStore((s) => s.getActiveClient);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const isConnected = activeServer?.status === "connected";
  const serverUrl = activeServer?.config.url ?? "";

  return {
    serverUrl,
    activeProjectPath: activeProjectPath ?? "",
    isConnected,
    getActiveClient,
  };
}

/**
 * Hook to fetch the list of sessions
 */
export function useSessions() {
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return useQuery({
    queryKey: queryKeys.sessions.list(serverUrl, activeProjectPath),
    queryFn: async () => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        return { sessions: [], statuses: {} as Record<string, SessionStatus> };
      }

      const [sessionsRes, statusRes] = await Promise.all([
        client.session.list({ query: { directory: activeProjectPath } }),
        client.session.status({ query: { directory: activeProjectPath } }),
      ]);

      const sessions = sessionsRes.data
        ? [...sessionsRes.data].sort((a, b) => b.time.updated - a.time.updated)
        : [];

      return {
        sessions,
        statuses: (statusRes.data || {}) as Record<string, SessionStatus>,
      };
    },
    enabled: isConnected && !!activeProjectPath,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch session statuses
 */
export function useSessionStatuses() {
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return useQuery({
    queryKey: queryKeys.sessions.status(serverUrl, activeProjectPath),
    queryFn: async () => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        return {} as Record<string, SessionStatus>;
      }

      const response = await client.session.status({
        query: { directory: activeProjectPath },
      });

      return (response.data || {}) as Record<string, SessionStatus>;
    },
    enabled: isConnected && !!activeProjectPath,
    staleTime: 10 * 1000,
  });
}

/**
 * Hook to fetch a single session
 */
export function useSession(id: string | undefined) {
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return useQuery({
    queryKey: queryKeys.sessions.detail(serverUrl, activeProjectPath, id ?? ""),
    queryFn: async () => {
      const client = getActiveClient();
      if (!client || !activeProjectPath || !id) {
        return null;
      }

      const response = await client.session.get({
        path: { id },
        query: { directory: activeProjectPath },
      });

      return response.data ?? null;
    },
    enabled: isConnected && !!activeProjectPath && !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch session messages, todos, and status
 */
export function useSessionMessages(id: string | undefined) {
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return useQuery({
    queryKey: queryKeys.sessions.messages(
      serverUrl,
      activeProjectPath,
      id ?? "",
    ),
    queryFn: async (): Promise<SessionMessages | null> => {
      const client = getActiveClient();
      if (!client || !activeProjectPath || !id) {
        return null;
      }

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

      const messages = messagesRes.data || [];
      const status =
        statusRes.data?.[id] || ({ type: "idle" } as SessionStatus);
      const tokenCounts = calculateTokenCounts(messages);

      return {
        messages,
        todos: todoRes.data || [],
        status,
        tokenCounts,
      };
    },
    enabled: isConnected && !!activeProjectPath && !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath, getActiveClient } =
    useActiveConnection();

  return useMutation<Session, Error, string | void>({
    mutationFn: async (title) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      const response = await client.session.create({
        body: { title: title || undefined },
        query: { directory: activeProjectPath },
      });

      if (!response.data) {
        throw new Error("Failed to create session");
      }

      return response.data;
    },
    onSuccess: (newSession) => {
      // Add the new session to the cache
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [newSession], statuses: {} };
          return {
            ...old,
            sessions: [newSession, ...old.sessions],
          };
        },
      );
    },
  });
}

/**
 * Hook to delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath, getActiveClient } =
    useActiveConnection();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      const response = await client.session.delete({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (!response.data) {
        throw new Error("Failed to delete session");
      }

      return id;
    },
    onSuccess: (deletedId) => {
      // Remove the session from the cache
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [], statuses: {} };
          return {
            ...old,
            sessions: old.sessions.filter((s) => s.id !== deletedId),
          };
        },
      );
    },
  });
}

/**
 * Hook to update a session
 */
export function useUpdateSession() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath, getActiveClient } =
    useActiveConnection();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      const response = await client.session.update({
        path: { id },
        body: { title },
        query: { directory: activeProjectPath },
      });

      if (!response.data) {
        throw new Error("Failed to update session");
      }

      return response.data;
    },
    onSuccess: (updatedSession) => {
      // Update the session in the cache
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [updatedSession], statuses: {} };
          return {
            ...old,
            sessions: old.sessions.map((s) =>
              s.id === updatedSession.id ? updatedSession : s,
            ),
          };
        },
      );
      // Also update the detail cache
      queryClient.setQueryData(
        queryKeys.sessions.detail(
          serverUrl,
          activeProjectPath,
          updatedSession.id,
        ),
        updatedSession,
      );
    },
  });
}

/**
 * Hook to share a session
 */
export function useShareSession() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath, getActiveClient } =
    useActiveConnection();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      const response = await client.session.share({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (!response.data) {
        throw new Error("Failed to share session");
      }

      return response.data;
    },
    onSuccess: (sharedSession) => {
      // Update the session in all caches
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [sharedSession], statuses: {} };
          return {
            ...old,
            sessions: old.sessions.map((s) =>
              s.id === sharedSession.id ? sharedSession : s,
            ),
          };
        },
      );
      queryClient.setQueryData(
        queryKeys.sessions.detail(
          serverUrl,
          activeProjectPath,
          sharedSession.id,
        ),
        sharedSession,
      );
    },
  });
}

/**
 * Hook to unshare a session
 */
export function useUnshareSession() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath, getActiveClient } =
    useActiveConnection();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      const response = await client.session.unshare({
        path: { id },
        query: { directory: activeProjectPath },
      });

      if (!response.data) {
        throw new Error("Failed to unshare session");
      }

      return response.data;
    },
    onSuccess: (unsharedSession) => {
      // Update the session in all caches
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [unsharedSession], statuses: {} };
          return {
            ...old,
            sessions: old.sessions.map((s) =>
              s.id === unsharedSession.id ? unsharedSession : s,
            ),
          };
        },
      );
      queryClient.setQueryData(
        queryKeys.sessions.detail(
          serverUrl,
          activeProjectPath,
          unsharedSession.id,
        ),
        unsharedSession,
      );
    },
  });
}

/**
 * Hook to abort a session
 */
export function useAbortSession() {
  const { getActiveClient, activeProjectPath } = useActiveConnection();

  return useMutation({
    mutationFn: async (id: string) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      const response = await client.session.abort({
        path: { id },
        query: { directory: activeProjectPath },
      });

      return response.data === true;
    },
  });
}

/**
 * Hook to send a prompt
 */
export function useSendPrompt() {
  const { getActiveClient, activeProjectPath } = useActiveConnection();

  return useMutation({
    mutationFn: async ({
      sessionId,
      text,
      modelId,
      agent,
    }: {
      sessionId: string;
      text: string;
      modelId?: string;
      agent?: string;
    }) => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        throw new Error("No active connection");
      }

      // Parse modelId into provider and model parts
      let modelParam: { providerID: string; modelID: string } | undefined;
      if (modelId) {
        const [providerID, ...modelParts] = modelId.split("/");
        const modelID = modelParts.join("/");
        if (providerID && modelID) {
          modelParam = { providerID, modelID };
        }
      }

      await client.session.promptAsync({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }],
          ...(modelParam && { model: modelParam }),
          ...(agent && { agent }),
        },
        query: { directory: activeProjectPath },
      });
    },
  });
}

/**
 * Hook to prefetch a session's messages
 */
export function usePrefetchSession() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return async (id: string) => {
    if (!isConnected || !activeProjectPath) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.sessions.messages(serverUrl, activeProjectPath, id),
      queryFn: async (): Promise<SessionMessages | null> => {
        const client = getActiveClient();
        if (!client || !activeProjectPath) {
          return null;
        }

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

        const messages = messagesRes.data || [];
        const status =
          statusRes.data?.[id] || ({ type: "idle" } as SessionStatus);
        const tokenCounts = calculateTokenCounts(messages);

        return {
          messages,
          todos: todoRes.data || [],
          status,
          tokenCounts,
        };
      },
      staleTime: 5 * 60 * 1000, // 5 minutes for prefetched data
    });
  };
}

/**
 * Hook to invalidate sessions queries
 */
export function useInvalidateSessions() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath } = useActiveConnection();

  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.sessions.list(serverUrl, activeProjectPath),
    });
  };
}

/**
 * Hook to update session data from SSE events
 */
export function useSessionQueryUpdaters() {
  const queryClient = useQueryClient();
  const { serverUrl, activeProjectPath } = useActiveConnection();

  return {
    updateSession: (session: Session) => {
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [session], statuses: {} };
          const filtered = old.sessions.filter((s) => s.id !== session.id);
          const sessions = [session, ...filtered].sort(
            (a, b) => b.time.updated - a.time.updated,
          );
          return { ...old, sessions };
        },
      );
      queryClient.setQueryData(
        queryKeys.sessions.detail(serverUrl, activeProjectPath, session.id),
        session,
      );
    },

    removeSession: (sessionId: string) => {
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [], statuses: {} };
          return {
            ...old,
            sessions: old.sessions.filter((s) => s.id !== sessionId),
          };
        },
      );
      queryClient.removeQueries({
        queryKey: queryKeys.sessions.detail(
          serverUrl,
          activeProjectPath,
          sessionId,
        ),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.sessions.messages(
          serverUrl,
          activeProjectPath,
          sessionId,
        ),
      });
    },

    updateStatus: (sessionId: string, status: SessionStatus) => {
      queryClient.setQueryData(
        queryKeys.sessions.list(serverUrl, activeProjectPath),
        (
          old:
            | { sessions: Session[]; statuses: Record<string, SessionStatus> }
            | undefined,
        ) => {
          if (!old) return { sessions: [], statuses: { [sessionId]: status } };
          return {
            ...old,
            statuses: { ...old.statuses, [sessionId]: status },
          };
        },
      );
      // Update the messages query too
      queryClient.setQueryData(
        queryKeys.sessions.messages(serverUrl, activeProjectPath, sessionId),
        (old: SessionMessages | null | undefined) => {
          if (!old) return null;
          return { ...old, status };
        },
      );
    },

    updateMessage: (message: Message) => {
      queryClient.setQueryData(
        queryKeys.sessions.messages(
          serverUrl,
          activeProjectPath,
          message.sessionID,
        ),
        (old: SessionMessages | null | undefined) => {
          if (!old) return null;

          const exists = old.messages.some((m) => m.info.id === message.id);
          const messages = exists
            ? old.messages.map((m) =>
                m.info.id === message.id ? { ...m, info: message } : m,
              )
            : [...old.messages, { info: message, parts: [] }];

          const tokenCounts = calculateTokenCounts(messages);

          return { ...old, messages, tokenCounts };
        },
      );
    },

    updatePart: (part: Part) => {
      queryClient.setQueryData(
        queryKeys.sessions.messages(
          serverUrl,
          activeProjectPath,
          part.sessionID,
        ),
        (old: SessionMessages | null | undefined) => {
          if (!old) return null;

          const messages = old.messages.map((m) => {
            if (m.info.id !== part.messageID) return m;

            const exists = m.parts.some((p) => p.id === part.id);
            const parts = exists
              ? m.parts.map((p) => (p.id === part.id ? part : p))
              : [...m.parts, part];

            return { ...m, parts };
          });

          return { ...old, messages };
        },
      );
    },

    updateTodos: (sessionId: string, todos: Todo[]) => {
      queryClient.setQueryData(
        queryKeys.sessions.messages(serverUrl, activeProjectPath, sessionId),
        (old: SessionMessages | null | undefined) => {
          if (!old) return null;
          return { ...old, todos };
        },
      );
    },

    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.list(serverUrl, activeProjectPath),
      });
    },
  };
}
