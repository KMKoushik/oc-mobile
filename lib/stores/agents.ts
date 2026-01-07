import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_AGENT_KEY = "@opencode/selected_agent";

export interface AgentInfo {
  name: string;
  description?: string;
  mode: "primary" | "subagent" | "all";
  builtIn: boolean;
  color?: string;
}

/**
 * Agents store - now only manages selected agent preference
 * All server data fetching is handled by TanStack Query hooks
 */
interface AgentsStore {
  // Local state
  selectedAgent: string;
  isLoadingPreference: boolean;

  // Actions
  setSelectedAgent: (agentName: string) => Promise<void>;
  loadSelectedAgent: () => Promise<void>;
}

export const useAgentsStore = create<AgentsStore>((set) => ({
  // Initial state - default to build
  selectedAgent: "build",
  isLoadingPreference: true,

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
      set({
        selectedAgent: savedAgent ?? "build",
        isLoadingPreference: false,
      });
    } catch (error) {
      console.error("Failed to load selected agent:", error);
      set({ isLoadingPreference: false });
    }
  },
}));
