import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useServersStore } from "@/lib/stores/servers";
import { queryKeys } from "../keys";
import type { Agent } from "@/lib/opencode/types";

const SELECTED_AGENT_KEY = "@opencode/selected_agent";

export interface AgentInfo {
  name: string;
  description?: string;
  mode: "primary" | "subagent" | "all";
  builtIn: boolean;
  color?: string;
}

const DEFAULT_AGENTS: AgentInfo[] = [
  { name: "build", mode: "primary", builtIn: true },
  { name: "plan", mode: "primary", builtIn: true },
];

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
 * Hook to fetch available agents
 */
export function useAgents() {
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return useQuery({
    queryKey: queryKeys.agents.list(serverUrl, activeProjectPath),
    queryFn: async (): Promise<AgentInfo[]> => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        return DEFAULT_AGENTS;
      }

      try {
        const response = await client.app.agents({
          query: { directory: activeProjectPath },
        });

        if (response.data) {
          return response.data.map((agent: Agent) => ({
            name: agent.name,
            description: agent.description,
            mode: agent.mode,
            builtIn: agent.builtIn ?? false,
            color: agent.color,
          }));
        }

        return DEFAULT_AGENTS;
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        return DEFAULT_AGENTS;
      }
    },
    enabled: isConnected && !!activeProjectPath,
    staleTime: 5 * 60 * 1000, // Agents don't change often
  });
}

/**
 * Hook to get/set the selected agent from AsyncStorage
 */
export function useSelectedAgent() {
  const { data: agents = DEFAULT_AGENTS } = useAgents();

  const selectedAgentQuery = useQuery({
    queryKey: ["selectedAgent"],
    queryFn: async () => {
      const saved = await AsyncStorage.getItem(SELECTED_AGENT_KEY);
      return saved ?? "build";
    },
    staleTime: Infinity, // This is local storage, doesn't need refetching
  });

  const setSelectedAgent = async (agentName: string) => {
    await AsyncStorage.setItem(SELECTED_AGENT_KEY, agentName);
  };

  // Get primary agents (for UI selector)
  const primaryAgents = agents.filter((a) => a.mode === "primary");

  // Validate selected agent
  const getEffectiveSelectedAgent = (): string => {
    const savedAgent = selectedAgentQuery.data ?? "build";

    // If saved agent is valid primary agent, use it
    if (primaryAgents.some((a) => a.name === savedAgent)) {
      return savedAgent;
    }

    // Fall back to first primary agent or 'build'
    return primaryAgents[0]?.name ?? "build";
  };

  const selectedAgent = getEffectiveSelectedAgent();

  // Cycle through primary agents
  const cycleAgent = async (direction: 1 | -1) => {
    if (primaryAgents.length === 0) return;

    const currentIndex = primaryAgents.findIndex(
      (a) => a.name === selectedAgent,
    );
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = primaryAgents.length - 1;
    if (nextIndex >= primaryAgents.length) nextIndex = 0;

    const nextAgent = primaryAgents[nextIndex];
    if (nextAgent) {
      await setSelectedAgent(nextAgent.name);
    }
  };

  return {
    agents,
    primaryAgents,
    selectedAgent,
    setSelectedAgent,
    cycleAgent,
    isLoading: selectedAgentQuery.isLoading,
  };
}
