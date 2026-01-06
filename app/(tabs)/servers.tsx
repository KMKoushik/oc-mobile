import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useServersStore } from "@/lib/stores/servers";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionSheet, showActionSheet } from "@/components/ui/action-sheet";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { toast } from "@/lib/stores/toast";
import { primary, dark, semantic, colors } from "@/constants/theme";
import type { ServerConfig, ConnectionStatus } from "@/types/server";

function getStatusColor(status: ConnectionStatus, isDark: boolean): string {
  switch (status) {
    case "connected":
      return semantic.success;
    case "connecting":
      return isDark ? primary[400] : primary[500];
    case "error":
      return semantic.error;
    default:
      return isDark ? dark[500] : dark[400];
  }
}

function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting...";
    case "error":
      return "Error";
    default:
      return "Disconnected";
  }
}

interface ServerItemProps {
  server: ServerConfig;
  status: ConnectionStatus;
  version?: string;
  error?: string;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}

function ServerItem({
  server,
  status,
  version,
  error,
  isActive,
  onPress,
  onLongPress,
  onDelete,
}: ServerItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const statusColor = getStatusColor(status, isDark);
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        swipeableRef.current?.close();
        onDelete();
      }}
      style={styles.deleteAction}
    >
      <IconSymbol name="trash.fill" size={24} color="#fff" />
    </Pressable>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[
          styles.serverItem,
          isDark && styles.serverItemDark,
          isActive && styles.serverItemActive,
          isActive && isDark && styles.serverItemActiveDark,
        ]}
      >
        {/* Status indicator */}
        <View style={styles.statusContainer}>
          {status === "connecting" ? (
            <ActivityIndicator size="small" color={statusColor} />
          ) : (
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
          )}
        </View>

        {/* Server info */}
        <View style={styles.serverInfo}>
          <View style={styles.serverNameRow}>
            <Text
              style={[styles.serverName, isDark && styles.serverNameDark]}
              numberOfLines={1}
            >
              {server.name}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.serverUrl, isDark && styles.serverUrlDark]}
            numberOfLines={1}
          >
            {server.url}
          </Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(status)}
            </Text>
            {version && (
              <Text
                style={[styles.versionText, isDark && styles.versionTextDark]}
              >
                v{version}
              </Text>
            )}
            {error && (
              <Text style={styles.errorText} numberOfLines={1}>
                {error}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default function ServersScreen() {
  const router = useRouter();

  const servers = useServersStore((s) => s.servers);
  const serverStates = useServersStore((s) => s.serverStates);
  const activeServerId = useServersStore((s) => s.activeServerId);
  const setActiveServer = useServersStore((s) => s.setActiveServer);
  const removeServer = useServersStore((s) => s.removeServer);
  const connectToServer = useServersStore((s) => s.connectToServer);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerConfig | null>(
    null,
  );

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleServerPress = async (server: ServerConfig) => {
    // Set as active and connect
    await setActiveServer(server.id);
  };

  const handleServerLongPress = async (server: ServerConfig) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedServer(server);

    const options = [
      {
        label: "Reconnect",
        onPress: () => handleReconnect(server),
      },
      {
        label: "Delete Server",
        onPress: () => handleDeleteServer(server),
        destructive: true,
      },
    ];

    if (Platform.OS === "ios") {
      showActionSheet({
        title: server.name,
        message: server.url,
        options,
        onCancel: () => setSelectedServer(null),
      });
    } else {
      setActionSheetVisible(true);
    }
  };

  const handleReconnect = async (server: ServerConfig) => {
    setSelectedServer(null);
    setActionSheetVisible(false);

    const success = await connectToServer(server.id);
    if (success) {
      toast.success("Connected to server");
    } else {
      toast.error("Failed to connect");
    }
  };

  const handleDeleteServer = (server: ServerConfig) => {
    setSelectedServer(null);
    setActionSheetVisible(false);

    Alert.alert(
      "Delete Server",
      `Are you sure you want to delete "${server.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeServer(server.id);
            toast.success("Server deleted");
          },
        },
      ],
    );
  };

  const handleAddServer = () => {
    router.push("/server/add");
  };

  // Show empty state directly when no servers
  if (servers.length === 0) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <EmptyState
          icon="server.rack"
          title="No Servers"
          description="Add your first OpenCode server to get started"
          actionLabel="Add Server"
          onAction={handleAddServer}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const state = serverStates[item.id];
          return (
            <ServerItem
              server={item}
              status={state?.status || "disconnected"}
              version={state?.version}
              error={state?.error}
              isActive={activeServerId === item.id}
              onPress={() => handleServerPress(item)}
              onLongPress={() => handleServerLongPress(item)}
              onDelete={() => handleDeleteServer(item)}
            />
          );
        }}
      />

      {/* Android action sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        title={selectedServer?.name}
        message={selectedServer?.url}
        options={[
          {
            label: "Reconnect",
            onPress: () => selectedServer && handleReconnect(selectedServer),
          },
          {
            label: "Delete Server",
            onPress: () => selectedServer && handleDeleteServer(selectedServer),
            destructive: true,
          },
        ]}
        onCancel={() => {
          setActionSheetVisible(false);
          setSelectedServer(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  containerDark: {
    backgroundColor: dark[900],
  },
  listContent: {
    paddingVertical: 12,
  },
  serverItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: dark[200],
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  serverItemDark: {
    borderBottomColor: dark[800],
    backgroundColor: dark[900],
  },
  serverItemActive: {
    backgroundColor: primary[50],
  },
  serverItemActiveDark: {
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  statusContainer: {
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  serverInfo: {
    flex: 1,
  },
  serverNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serverName: {
    fontSize: 16,
    fontWeight: "500",
    color: dark[900],
  },
  serverNameDark: {
    color: "#fff",
  },
  activeBadge: {
    backgroundColor: primary[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  serverUrl: {
    marginTop: 2,
    fontSize: 14,
    color: dark[500],
  },
  serverUrlDark: {
    color: dark[400],
  },
  statusRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  versionText: {
    fontSize: 12,
    color: dark[400],
  },
  versionTextDark: {
    color: dark[500],
  },
  errorText: {
    fontSize: 12,
    color: semantic.error,
  },
  deleteAction: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red[500],
  },
});
