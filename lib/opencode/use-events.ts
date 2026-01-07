import { useEffect, useRef, useCallback } from "react";
import EventSource from "react-native-sse";
import { useServersStore } from "@/lib/stores/servers";
import { useSessionsStore } from "@/lib/stores/sessions";
import { usePermissionsStore } from "@/lib/stores/permissions";
import { useSessionQueryUpdaters } from "@/lib/query";
import type {
  Session,
  Message,
  Part,
  SessionStatus,
  Todo,
  Permission,
} from "./types";

interface EventData {
  type: string;
  properties: Record<string, unknown>;
}

/**
 * Hook to subscribe to SSE events from the active server
 */
export function useEvents() {
  const eventSourceRef = useRef<EventSource<string> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);
  const activeProjectPath = useServersStore((s) => s.activeProjectPath);

  // Store updaters for real-time current session
  const updateMessageFromEvent = useSessionsStore(
    (s) => s.updateMessageFromEvent,
  );
  const updatePartFromEvent = useSessionsStore((s) => s.updatePartFromEvent);
  const updateStatusFromEvent = useSessionsStore(
    (s) => s.updateStatusFromEvent,
  );
  const updateTodosFromEvent = useSessionsStore((s) => s.updateTodosFromEvent);

  // Permission store
  const addPermission = usePermissionsStore((s) => s.addPermission);
  const removePermission = usePermissionsStore((s) => s.removePermission);

  // TanStack Query updaters for cache
  const queryUpdaters = useSessionQueryUpdaters();

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const isConnected = activeServer?.status === "connected";
  const serverUrl = activeServer?.config.url;

  const handleEvent = useCallback(
    (event: EventData) => {
      const { type, properties } = event;

      switch (type) {
        case "session.created":
        case "session.updated":
          if (properties.info) {
            // Update TanStack Query cache
            queryUpdaters.updateSession(properties.info as Session);
          }
          break;

        case "session.deleted":
          if (properties.info) {
            // Update TanStack Query cache
            queryUpdaters.removeSession((properties.info as Session).id);
          }
          break;

        case "session.status":
          if (properties.sessionID && properties.status) {
            // Update both the Zustand store (for current session) and query cache
            updateStatusFromEvent(
              properties.sessionID as string,
              properties.status as SessionStatus,
            );
            queryUpdaters.updateStatus(
              properties.sessionID as string,
              properties.status as SessionStatus,
            );
          }
          break;

        case "message.updated":
          if (properties.info) {
            // Update Zustand store (for real-time display)
            updateMessageFromEvent(properties.info as Message);
            // Update query cache
            queryUpdaters.updateMessage(properties.info as Message);
          }
          break;

        case "message.part.updated":
          if (properties.part) {
            // Update Zustand store (for real-time display)
            updatePartFromEvent(
              properties.part as Part,
              properties.delta as string | undefined,
            );
            // Update query cache
            queryUpdaters.updatePart(properties.part as Part);
          }
          break;

        case "todo.updated":
          if (properties.sessionID && properties.todos) {
            // Update both stores
            updateTodosFromEvent(
              properties.sessionID as string,
              properties.todos as Todo[],
            );
            queryUpdaters.updateTodos(
              properties.sessionID as string,
              properties.todos as Todo[],
            );
          }
          break;

        case "session.idle":
          if (properties.sessionID) {
            const idleStatus: SessionStatus = { type: "idle" };
            updateStatusFromEvent(properties.sessionID as string, idleStatus);
            queryUpdaters.updateStatus(
              properties.sessionID as string,
              idleStatus,
            );
          }
          break;

        case "permission.updated":
          if (properties.id) {
            addPermission(properties as unknown as Permission);
          }
          break;

        case "permission.replied":
          if (properties.permissionID) {
            removePermission(properties.permissionID as string);
          }
          break;

        default:
          // Ignore other events
          break;
      }
    },
    [
      queryUpdaters,
      updateMessageFromEvent,
      updatePartFromEvent,
      updateStatusFromEvent,
      updateTodosFromEvent,
      addPermission,
      removePermission,
    ],
  );

  const connect = useCallback(() => {
    if (!serverUrl || !activeProjectPath) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${serverUrl}/event?directory=${encodeURIComponent(activeProjectPath)}`;

    try {
      const eventSource = new EventSource<string>(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("message", (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data) as EventData;
            handleEvent(data);
          } catch (error) {
            console.error("Failed to parse SSE event:", error);
          }
        }
      });

      eventSource.addEventListener("error", (event) => {
        console.error("SSE connection error:", event);
        eventSource.close();

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isConnected) {
            connect();
          }
        }, 5000);
      });

      eventSource.addEventListener("open", () => {
        console.log("SSE connection opened");
        // Invalidate queries to refresh data when reconnected
        queryUpdaters.invalidateAll();
      });
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
    }
  }, [serverUrl, activeProjectPath, isConnected, handleEvent, queryUpdaters]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isConnected && serverUrl && activeProjectPath) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isConnected, serverUrl, activeProjectPath, connect, disconnect]);

  return { connect, disconnect };
}
