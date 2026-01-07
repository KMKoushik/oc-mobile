import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SELECTED_MODEL_KEY = "@opencode/selected_model";

export interface ModelInfo {
  id: string; // format: "provider/model"
  modelId: string; // just the model ID
  name: string;
  providerId: string;
  providerName: string;
  hasReasoning: boolean;
}

/**
 * Models store - now only manages selected model preference
 * All server data fetching is handled by TanStack Query hooks
 */
interface ModelsStore {
  // Local state
  selectedModel: string | null;
  isLoadingPreference: boolean;

  // Actions
  setSelectedModel: (modelId: string | null) => Promise<void>;
  loadSelectedModel: () => Promise<void>;
}

export const useModelsStore = create<ModelsStore>((set) => ({
  // Initial state
  selectedModel: null,
  isLoadingPreference: true,

  // Set the selected model
  setSelectedModel: async (modelId: string | null) => {
    set({ selectedModel: modelId });

    try {
      if (modelId) {
        await AsyncStorage.setItem(SELECTED_MODEL_KEY, modelId);
      } else {
        await AsyncStorage.removeItem(SELECTED_MODEL_KEY);
      }
    } catch (error) {
      console.error("Failed to save selected model:", error);
    }
  },

  // Load selected model from storage
  loadSelectedModel: async () => {
    try {
      const savedModel = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
      set({
        selectedModel: savedModel,
        isLoadingPreference: false,
      });
    } catch (error) {
      console.error("Failed to load selected model:", error);
      set({ isLoadingPreference: false });
    }
  },
}));
