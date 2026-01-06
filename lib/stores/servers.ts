import { create } from 'zustand';
import uuid from 'react-native-uuid';
import type { ServerConfig, ConnectionStatus, ServerState } from '@/types/server';
import * as storage from '@/lib/storage/servers';
import { checkServerHealth, getClient, removeClient } from '@/lib/opencode/client';
import type { OpencodeClient } from '@opencode-ai/sdk/client';
import type { Project } from '@/lib/opencode/types';

interface ServersStore {
  // State
  servers: ServerConfig[];
  serverStates: Record<string, ServerState>;
  activeServerId: string | null;
  activeProjectPath: string | null;
  projects: Project[];
  isLoadingProjects: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  addServer: (name: string, url: string) => Promise<ServerConfig>;
  removeServer: (id: string) => Promise<void>;
  updateServer: (id: string, updates: Partial<ServerConfig>) => Promise<void>;
  setActiveServer: (id: string | null) => Promise<void>;
  setActiveProject: (path: string | null) => Promise<void>;
  connectToServer: (id: string) => Promise<boolean>;
  disconnectFromServer: (id: string) => void;
  refreshProjects: () => Promise<void>;
  getActiveClient: () => OpencodeClient | null;
}

export const useServersStore = create<ServersStore>((set, get) => ({
  // Initial state
  servers: [],
  serverStates: {},
  activeServerId: null,
  activeProjectPath: null,
  projects: [],
  isLoadingProjects: false,
  isInitialized: false,

  // Initialize from storage
  initialize: async () => {
    const [servers, activeServerId] = await Promise.all([
      storage.getServers(),
      storage.getActiveServerId(),
    ]);

    // Initialize server states
    const serverStates: Record<string, ServerState> = {};
    for (const server of servers) {
      serverStates[server.id] = {
        config: server,
        status: 'disconnected',
      };
    }

    let activeProjectPath: string | null = null;
    if (activeServerId) {
      activeProjectPath = await storage.getActiveProjectPath(activeServerId);
    }

    set({
      servers,
      serverStates,
      activeServerId,
      activeProjectPath,
      isInitialized: true,
    });

    // Auto-connect to active server
    if (activeServerId) {
      get().connectToServer(activeServerId);
    }
  },

  // Add a new server
  addServer: async (name: string, url: string) => {
    // Normalize URL (remove trailing slash)
    const normalizedUrl = url.replace(/\/$/, '');

    const server: ServerConfig = {
      id: uuid.v4() as string,
      name,
      url: normalizedUrl,
      createdAt: Date.now(),
    };

    await storage.saveServer(server);

    set((state) => ({
      servers: [...state.servers, server],
      serverStates: {
        ...state.serverStates,
        [server.id]: {
          config: server,
          status: 'disconnected',
        },
      },
    }));

    return server;
  },

  // Remove a server
  removeServer: async (id: string) => {
    const { serverStates } = get();
    const serverState = serverStates[id];

    if (serverState) {
      removeClient(serverState.config.url);
    }

    await storage.removeServer(id);

    set((state) => {
      const { [id]: _, ...restStates } = state.serverStates;
      return {
        servers: state.servers.filter((s) => s.id !== id),
        serverStates: restStates,
        activeServerId: state.activeServerId === id ? null : state.activeServerId,
        activeProjectPath: state.activeServerId === id ? null : state.activeProjectPath,
        projects: state.activeServerId === id ? [] : state.projects,
      };
    });
  },

  // Update a server
  updateServer: async (id: string, updates: Partial<ServerConfig>) => {
    const { servers } = get();
    const server = servers.find((s) => s.id === id);
    if (!server) return;

    const updatedServer = { ...server, ...updates };
    await storage.saveServer(updatedServer);

    set((state) => ({
      servers: state.servers.map((s) => (s.id === id ? updatedServer : s)),
      serverStates: {
        ...state.serverStates,
        [id]: {
          ...state.serverStates[id],
          config: updatedServer,
        },
      },
    }));
  },

  // Set active server
  setActiveServer: async (id: string | null) => {
    await storage.setActiveServerId(id);

    let activeProjectPath: string | null = null;
    if (id) {
      activeProjectPath = await storage.getActiveProjectPath(id);
    }

    set({ activeServerId: id, activeProjectPath, projects: [] });

    if (id) {
      const { serverStates } = get();
      const serverState = serverStates[id];
      if (serverState?.status !== 'connected') {
        await get().connectToServer(id);
      } else {
        await get().refreshProjects();
      }
    }
  },

  // Set active project
  setActiveProject: async (path: string | null) => {
    const { activeServerId } = get();
    if (activeServerId) {
      await storage.setActiveProjectPath(activeServerId, path);
    }
    set({ activeProjectPath: path });
  },

  // Connect to a server
  connectToServer: async (id: string) => {
    const { serverStates } = get();
    const serverState = serverStates[id];
    if (!serverState) return false;

    // Update status to connecting
    set((state) => ({
      serverStates: {
        ...state.serverStates,
        [id]: { ...state.serverStates[id], status: 'connecting', error: undefined },
      },
    }));

    // Check health
    const health = await checkServerHealth(serverState.config.url);

    if (!health.healthy) {
      set((state) => ({
        serverStates: {
          ...state.serverStates,
          [id]: {
            ...state.serverStates[id],
            status: 'error',
            error: health.error || 'Failed to connect',
          },
        },
      }));
      return false;
    }

    // Update to connected
    await storage.updateServerLastConnected(id);

    set((state) => ({
      serverStates: {
        ...state.serverStates,
        [id]: {
          ...state.serverStates[id],
          status: 'connected',
          version: health.version,
          error: undefined,
        },
      },
    }));

    // If this is the active server, refresh projects
    const { activeServerId } = get();
    if (activeServerId === id) {
      await get().refreshProjects();
    }

    return true;
  },

  // Disconnect from a server
  disconnectFromServer: (id: string) => {
    const { serverStates } = get();
    const serverState = serverStates[id];
    if (serverState) {
      removeClient(serverState.config.url);
    }

    set((state) => ({
      serverStates: {
        ...state.serverStates,
        [id]: {
          ...state.serverStates[id],
          status: 'disconnected',
          error: undefined,
        },
      },
    }));
  },

  // Refresh projects for active server
  refreshProjects: async () => {
    const { activeServerId, serverStates } = get();
    if (!activeServerId) return;

    const serverState = serverStates[activeServerId];
    if (!serverState || serverState.status !== 'connected') return;

    set({ isLoadingProjects: true });

    try {
      const client = getClient(serverState.config.url);
      const response = await client.project.list();

      if (response.data) {
        set({ projects: response.data, isLoadingProjects: false });

        // Auto-select first project if none selected
        const { activeProjectPath } = get();
        if (!activeProjectPath && response.data.length > 0) {
          await get().setActiveProject(response.data[0].worktree);
        }
      } else {
        set({ projects: [], isLoadingProjects: false });
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ projects: [], isLoadingProjects: false });
    }
  },

  // Get the active client
  getActiveClient: () => {
    const { activeServerId, serverStates } = get();
    if (!activeServerId) return null;

    const serverState = serverStates[activeServerId];
    if (!serverState || serverState.status !== 'connected') return null;

    return getClient(serverState.config.url);
  },
}));
