import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useServersStore } from "./servers";
import type { Agent } from "@/lib/opencode/types";

const SELECTED_AGENT_KEY = "@opencode/selected_agent";

export interface AgentInfo {
  name: string;
  description?: string;
  mode: "primary" | "subagent" | "all";
  builtIn: boolean;
  color?: string;
}

interface AgentsStore {
  // State
  agents: AgentInfo[];
  selectedAgent: string; // "build" or "plan"
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAgents: () => Promise<void>;
  setSelectedAgent: (agentName: string) => Promise<void>;
  loadSelectedAgent: () => Promise<void>;
  cycleAgent: (direction: 1 | -1) => Promise<void>;
  getPrimaryAgents: () => AgentInfo[];
}

export const useAgentsStore = create<AgentsStore>((set, get) => ({
  // Initial state - default to build
  agents: [],
  selectedAgent: "build",
  isLoading: false,
  error: null,

  // Fetch all available agents
  fetchAgents: async () => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) {
      // Set default agents if no server
      set({
        agents: [
          { name: "build", mode: "primary", builtIn: true },
          { name: "plan", mode: "primary", builtIn: true },
        ],
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await client.app.agents({
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        const agents: AgentInfo[] = response.data.map((agent: Agent) => ({
          name: agent.name,
          description: agent.description,
          mode: agent.mode,
          builtIn: agent.builtIn ?? false,
          color: agent.color,
        }));

        set({ agents, isLoading: false });

        // Validate selected agent is still valid
        const { selectedAgent } = get();
        const primaryAgents = agents.filter((a) => a.mode === "primary");
        if (!primaryAgents.some((a) => a.name === selectedAgent)) {
          // Current selection is not valid, reset to first primary or 'build'
          const defaultAgent = primaryAgents[0]?.name ?? "build";
          await get().setSelectedAgent(defaultAgent);
        }
      } else {
        set({ agents: [], isLoading: false });
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      // Set default agents on error
      set({
        agents: [
          { name: "build", mode: "primary", builtIn: true },
          { name: "plan", mode: "primary", builtIn: true },
        ],
        error:
          error instanceof Error ? error.message : "Failed to fetch agents",
        isLoading: false,
      });
    }
  },

  // Set the selected agent
  setSelectedAgent: async (agentName: string) => {
    set({ selectedAgent: agentName });

    try {
      await AsyncStorage.setItem(SELECTED_AGENT_KEY, agentName);
    } catch (error) {
      console.error("Failed to save selected agent:", error);
    }
  },

  // Load selected agent from storage
  loadSelectedAgent: async () => {
    try {
      const savedAgent = await AsyncStorage.getItem(SELECTED_AGENT_KEY);
      if (savedAgent) {
        set({ selectedAgent: savedAgent });
      }
    } catch (error) {
      console.error("Failed to load selected agent:", error);
    }
  },

  // Cycle through primary agents
  cycleAgent: async (direction: 1 | -1) => {
    const { agents, selectedAgent } = get();
    const primaryAgents = agents.filter((a) => a.mode === "primary");

    if (primaryAgents.length === 0) return;

    const currentIndex = primaryAgents.findIndex(
      (a) => a.name === selectedAgent,
    );
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = primaryAgents.length - 1;
    if (nextIndex >= primaryAgents.length) nextIndex = 0;

    const nextAgent = primaryAgents[nextIndex];
    if (nextAgent) {
      await get().setSelectedAgent(nextAgent.name);
    }
  },

  // Get only primary agents (for UI selector)
  getPrimaryAgents: () => {
    return get().agents.filter((a) => a.mode === "primary");
  },
}));
