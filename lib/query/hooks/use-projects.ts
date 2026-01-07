import { useQuery } from "@tanstack/react-query";
import { useServersStore } from "@/lib/stores/servers";
import { getClient, checkServerHealth } from "@/lib/opencode/client";
import { queryKeys } from "../keys";
import type { Project } from "@/lib/opencode/types";

/**
 * Hook to fetch projects for a specific server
 */
export function useProjects(serverUrl: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.list(serverUrl ?? ""),
    queryFn: async (): Promise<Project[]> => {
      if (!serverUrl) {
        return [];
      }

      const client = getClient(serverUrl);
      const response = await client.project.list();

      return response.data ?? [];
    },
    enabled: !!serverUrl,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch projects for the active server
 */
export function useActiveProjects() {
  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const isConnected = activeServer?.status === "connected";
  const serverUrl = activeServer?.config.url;

  return useQuery({
    queryKey: queryKeys.projects.list(serverUrl ?? ""),
    queryFn: async (): Promise<Project[]> => {
      if (!serverUrl) {
        return [];
      }

      const client = getClient(serverUrl);
      const response = await client.project.list();

      return response.data ?? [];
    },
    enabled: isConnected && !!serverUrl,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to check server health
 */
export function useServerHealth(serverUrl: string | undefined) {
  return useQuery({
    queryKey: queryKeys.server.health(serverUrl ?? ""),
    queryFn: async () => {
      if (!serverUrl) {
        return { healthy: false, error: "No server URL" };
      }

      return checkServerHealth(serverUrl);
    },
    enabled: !!serverUrl,
    staleTime: 60 * 1000, // Check health every minute
    retry: 1,
  });
}
