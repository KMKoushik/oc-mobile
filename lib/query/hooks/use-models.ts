import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useServersStore } from "@/lib/stores/servers";
import { queryKeys } from "../keys";

const SELECTED_MODEL_KEY = "@opencode/selected_model";

interface ProviderModel {
  id: string;
  name: string;
  reasoning: boolean;
  attachment: boolean;
  status?: "alpha" | "beta" | "deprecated";
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

interface ModelsData {
  allProviders: ProviderInfo[];
  connectedProviderIds: string[];
  defaultModels: Record<string, string>;
  models: ModelInfo[];
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
 * Hook to fetch models from all providers
 */
export function useModels() {
  const { serverUrl, activeProjectPath, isConnected, getActiveClient } =
    useActiveConnection();

  return useQuery({
    queryKey: queryKeys.models.list(serverUrl, activeProjectPath),
    queryFn: async (): Promise<ModelsData> => {
      const client = getActiveClient();
      if (!client || !activeProjectPath) {
        return {
          allProviders: [],
          connectedProviderIds: [],
          defaultModels: {},
          models: [],
        };
      }

      const response = await client.provider.list({
        query: { directory: activeProjectPath },
      });

      if (!response.data) {
        return {
          allProviders: [],
          connectedProviderIds: [],
          defaultModels: {},
          models: [],
        };
      }

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
            if (model.status === "deprecated") continue;

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

      return {
        allProviders,
        connectedProviderIds,
        defaultModels,
        models,
      };
    },
    enabled: isConnected && !!activeProjectPath,
    staleTime: 5 * 60 * 1000, // Models don't change often
  });
}

/**
 * Hook to get/set the selected model from AsyncStorage
 */
export function useSelectedModel() {
  const { data: modelsData } = useModels();
  const models = modelsData?.models ?? [];
  const defaultModels = modelsData?.defaultModels ?? {};
  const connectedProviderIds = modelsData?.connectedProviderIds ?? [];

  const selectedModelQuery = useQuery({
    queryKey: ["selectedModel"],
    queryFn: async () => {
      const saved = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
      return saved;
    },
    staleTime: Infinity, // This is local storage, doesn't need refetching
  });

  const setSelectedModel = async (modelId: string | null) => {
    if (modelId) {
      await AsyncStorage.setItem(SELECTED_MODEL_KEY, modelId);
    } else {
      await AsyncStorage.removeItem(SELECTED_MODEL_KEY);
    }
  };

  // Get the effective selected model (validate against available models)
  const getEffectiveSelectedModel = (): string | null => {
    const savedModel = selectedModelQuery.data;

    // If saved model is valid, use it
    if (savedModel && models.some((m) => m.id === savedModel)) {
      return savedModel;
    }

    // Try to find a default model from connected providers
    for (const providerId of connectedProviderIds) {
      const defaultModelForProvider = defaultModels[providerId];
      if (defaultModelForProvider) {
        const fullId = `${providerId}/${defaultModelForProvider}`;
        if (models.some((m) => m.id === fullId)) {
          return fullId;
        }
      }
    }

    // Fall back to first available model
    return models[0]?.id ?? null;
  };

  const selectedModel = getEffectiveSelectedModel();
  const selectedModelInfo = models.find((m) => m.id === selectedModel) ?? null;

  return {
    selectedModel,
    selectedModelInfo,
    setSelectedModel,
    isLoading: selectedModelQuery.isLoading,
  };
}

/**
 * Get model info by ID
 */
export function useModelInfo(modelId: string | null) {
  const { data: modelsData } = useModels();
  const models = modelsData?.models ?? [];

  if (!modelId) return null;
  return models.find((m) => m.id === modelId) ?? null;
}
