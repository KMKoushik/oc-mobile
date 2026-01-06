// Import from /client to avoid Node.js server dependencies
import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk/client';

// Cache for client instances per server URL
const clientCache = new Map<string, OpencodeClient>();

/**
 * Get or create an OpenCode client for a given server URL
 */
export function getClient(baseUrl: string): OpencodeClient {
  const cached = clientCache.get(baseUrl);
  if (cached) {
    return cached;
  }

  const client = createOpencodeClient({
    baseUrl,
  });

  clientCache.set(baseUrl, client);
  return client;
}

/**
 * Remove a client from cache (e.g., when server is removed)
 */
export function removeClient(baseUrl: string): void {
  clientCache.delete(baseUrl);
}

/**
 * Clear all cached clients
 */
export function clearClients(): void {
  clientCache.clear();
}

/**
 * Check if a server is healthy and get its version
 */
export async function checkServerHealth(
  baseUrl: string
): Promise<{ healthy: boolean; version?: string; error?: string }> {
  try {
    const response = await fetch(`${baseUrl}/global/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return { healthy: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { healthy: true, version: data.version };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
