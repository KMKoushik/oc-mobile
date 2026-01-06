import { create } from 'zustand';
import { useServersStore } from './servers';
import type { Permission } from '@/lib/opencode/types';

interface PermissionsStore {
  // State
  pendingPermissions: Permission[];

  // Actions
  addPermission: (permission: Permission) => void;
  removePermission: (permissionId: string) => void;
  respondToPermission: (
    sessionId: string,
    permissionId: string,
    response: 'once' | 'always' | 'reject'
  ) => Promise<boolean>;
  clearPermissions: () => void;
}

export const usePermissionsStore = create<PermissionsStore>((set, get) => ({
  pendingPermissions: [],

  addPermission: (permission: Permission) => {
    set((state) => {
      // Avoid duplicates
      if (state.pendingPermissions.some((p) => p.id === permission.id)) {
        return state;
      }
      return {
        pendingPermissions: [...state.pendingPermissions, permission],
      };
    });
  },

  removePermission: (permissionId: string) => {
    set((state) => ({
      pendingPermissions: state.pendingPermissions.filter(
        (p) => p.id !== permissionId
      ),
    }));
  },

  respondToPermission: async (sessionId, permissionId, response) => {
    const client = useServersStore.getState().getActiveClient();
    const activeProjectPath = useServersStore.getState().activeProjectPath;

    if (!client || !activeProjectPath) return false;

    try {
      const result = await client.postSessionIdPermissionsPermissionId({
        path: { id: sessionId, permissionID: permissionId },
        body: { response },
        query: { directory: activeProjectPath },
      });

      if (result.data) {
        get().removePermission(permissionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to respond to permission:', error);
      return false;
    }
  },

  clearPermissions: () => {
    set({ pendingPermissions: [] });
  },
}));
