import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useServersStore } from './servers';

const SELECTED_MODEL_KEY = '@opencode/selected_model';

interface ProviderModel {
  id: string;
  name: string;
  reasoning: boolean;
  attachment: boolean;
  status?: 'alpha' | 'beta' | 'deprecated';
}

interface ProviderInfo {
  id: string;
  name: string;
  models: Record<string, ProviderModel>;
}

export interface ModelInfo {
  id: string; // format: "provider/model"
  modelId: string; // just the model ID
  name: string;
  providerId: string;
  providerName: string;
  hasReasoning: boolean;
}

interface ModelsStore {
  // State
  allProviders: ProviderInfo[];
  connectedProviderIds: string[];
  defaultModels: Record<string, string>; // { providerID: modelID }
  models: ModelInfo[]; // Only models from connected providers
  selectedModel: string | null; // format: "provider/model"
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchModels: () => Promise<void>;
  setSelectedModel: (modelId: string | null) => Promise<void>;
  loadSelectedModel: () => Promise<void>;
  getSelectedModelInfo: () => ModelInfo | null;
}

export const useModelsStore = create<ModelsStore>((set, get) => ({
  // Initial state
  allProviders: [],
  connectedProviderIds: [],
  defaultModels: {},
  models: [],
  selectedModel: null,
  isLoading: false,
  error: null,

  // Fetch all available models from providers
  fetchModels: async () => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) {
      set({ allProviders: [], connectedProviderIds: [], models: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await client.provider.list({
        query: { directory: activeProjectPath },
      });

      if (response.data) {
        const providerList = response.data.all || [];
        const connectedProviderIds = response.data.connected || [];
        const defaultModels = response.data.default || {};

        // Create a set of connected provider IDs for fast lookup
        const connectedSet = new Set(connectedProviderIds);

        const allProviders: ProviderInfo[] = [];
        const models: ModelInfo[] = [];

        for (const provider of providerList) {
          const providerInfo: ProviderInfo = {
            id: provider.id,
            name: provider.name,
            models: {},
          };

          if (provider.models) {
            for (const [modelId, model] of Object.entries(provider.models)) {
              // Skip deprecated models
              if (model.status === 'deprecated') continue;

              providerInfo.models[modelId] = {
                id: modelId,
                name: model.name || modelId,
                reasoning: model.reasoning ?? false,
                attachment: model.attachment ?? false,
                status: model.status,
              };

              // Only add models from connected providers to the usable list
              if (connectedSet.has(provider.id)) {
                models.push({
                  id: `${provider.id}/${modelId}`,
                  modelId,
                  name: model.name || modelId,
                  providerId: provider.id,
                  providerName: provider.name,
                  hasReasoning: model.reasoning ?? false,
                });
              }
            }
          }

          allProviders.push(providerInfo);
        }

        set({
          allProviders,
          connectedProviderIds,
          defaultModels,
          models,
          isLoading: false,
        });

        // If no model selected, try to select a default one
        const { selectedModel } = get();
        const validModels = get().models;

        // Check if current selection is still valid
        if (selectedModel && !validModels.some((m) => m.id === selectedModel)) {
          // Current selection is no longer valid, reset it
          set({ selectedModel: null });
        }

        if (!get().selectedModel && validModels.length > 0) {
          // Try to find a default model from connected providers
          let defaultModelId: string | null = null;

          for (const providerId of connectedProviderIds) {
            const defaultModelForProvider = defaultModels[providerId];
            if (defaultModelForProvider) {
              const fullId = `${providerId}/${defaultModelForProvider}`;
              if (validModels.some((m) => m.id === fullId)) {
                defaultModelId = fullId;
                break;
              }
            }
          }

          // If no default found, use the first available model
          if (!defaultModelId) {
            defaultModelId = validModels[0].id;
          }

          await get().setSelectedModel(defaultModelId);
        }
      } else {
        set({ allProviders: [], connectedProviderIds: [], models: [], isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch models',
        isLoading: false,
      });
    }
  },

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
      console.error('Failed to save selected model:', error);
    }
  },

  // Load selected model from storage
  loadSelectedModel: async () => {
    try {
      const savedModel = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
      if (savedModel) {
        set({ selectedModel: savedModel });
      }
    } catch (error) {
      console.error('Failed to load selected model:', error);
    }
  },

  // Get the currently selected model info
  getSelectedModelInfo: () => {
    const { selectedModel, models } = get();
    if (!selectedModel) return null;
    return models.find((m) => m.id === selectedModel) || null;
  },
}));
