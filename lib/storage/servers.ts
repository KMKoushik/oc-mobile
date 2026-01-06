import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServerConfig } from '@/types/server';

const SERVERS_KEY = '@opencode/servers';
const ACTIVE_SERVER_KEY = '@opencode/active-server';
const ACTIVE_PROJECT_KEY = '@opencode/active-project';

/**
 * Get all saved servers
 */
export async function getServers(): Promise<ServerConfig[]> {
  try {
    const data = await AsyncStorage.getItem(SERVERS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Save a new server
 */
export async function saveServer(server: ServerConfig): Promise<void> {
  const servers = await getServers();
  const existingIndex = servers.findIndex((s) => s.id === server.id);

  if (existingIndex >= 0) {
    servers[existingIndex] = server;
  } else {
    servers.push(server);
  }

  await AsyncStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
}

/**
 * Remove a server by ID
 */
export async function removeServer(id: string): Promise<void> {
  const servers = await getServers();
  const filtered = servers.filter((s) => s.id !== id);
  await AsyncStorage.setItem(SERVERS_KEY, JSON.stringify(filtered));

  // Clear active server if it was the one removed
  const activeId = await getActiveServerId();
  if (activeId === id) {
    await setActiveServerId(null);
    await setActiveProjectPath(null);
  }
}

/**
 * Get the active server ID
 */
export async function getActiveServerId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_SERVER_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the active server ID
 */
export async function setActiveServerId(id: string | null): Promise<void> {
  if (id === null) {
    await AsyncStorage.removeItem(ACTIVE_SERVER_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_SERVER_KEY, id);
  }
}

/**
 * Get the active project path for a server
 */
export async function getActiveProjectPath(
  serverId: string
): Promise<string | null> {
  try {
    const key = `${ACTIVE_PROJECT_KEY}/${serverId}`;
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Set the active project path for a server
 */
export async function setActiveProjectPath(
  serverId: string | null,
  path?: string | null
): Promise<void> {
  if (serverId === null) return;

  const key = `${ACTIVE_PROJECT_KEY}/${serverId}`;
  if (path === null || path === undefined) {
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, path);
  }
}

/**
 * Update server's last connected time
 */
export async function updateServerLastConnected(id: string): Promise<void> {
  const servers = await getServers();
  const server = servers.find((s) => s.id === id);
  if (server) {
    server.lastConnectedAt = Date.now();
    await AsyncStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
  }
}
