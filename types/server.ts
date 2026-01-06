export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  lastConnectedAt?: number;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface ServerState {
  config: ServerConfig;
  status: ConnectionStatus;
  error?: string;
  version?: string;
}
