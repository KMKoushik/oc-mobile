import { useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useServersStore } from "@/lib/stores/servers";
import { useSessionsStore } from "@/lib/stores/sessions";
import { SessionListItem } from "@/components/sessions/session-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { primary, dark } from "@/constants/theme";

export default function SessionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);
  const activeProjectPath = useServersStore((s) => s.activeProjectPath);

  const sessions = useSessionsStore((s) => s.sessions);
  const sessionStatuses = useSessionsStore((s) => s.sessionStatuses);
  const sessionTokenCounts = useSessionsStore((s) => s.sessionTokenCounts);
  const isLoading = useSessionsStore((s) => s.isLoading);
  const fetchSessions = useSessionsStore((s) => s.fetchSessions);
  const createSession = useSessionsStore((s) => s.createSession);
  const deleteSession = useSessionsStore((s) => s.deleteSession);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const isConnected = activeServer?.status === "connected";

  useEffect(() => {
    if (isConnected && activeProjectPath) {
      fetchSessions();
    }
  }, [isConnected, activeProjectPath, fetchSessions]);

  const handleRefresh = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = async () => {
    const session = await createSession();
    if (session) {
      router.push(`/session/${session.id}`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
  };

  // No server selected
  if (!activeServerId) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <EmptyState
          icon="server.rack"
          title="No Server Selected"
          description="Add a server and select it to view sessions"
          actionLabel="Go to Servers"
          onAction={() => router.push("/(tabs)/servers")}
        />
      </View>
    );
  }

  // Server not connected
  if (!isConnected) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          isDark && styles.containerDark,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#fff" : primary[500]}
        />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Connecting to server...
        </Text>
      </View>
    );
  }

  // No project selected - waiting for auto-selection
  if (!activeProjectPath) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          isDark && styles.containerDark,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#fff" : primary[500]}
        />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading projects...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionListItem
            session={item}
            status={sessionStatuses[item.id]}
            tokenCounts={sessionTokenCounts[item.id]}
            onPress={() => router.push(`/session/${item.id}`)}
            onDelete={() => handleDeleteSession(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={isDark ? "#fff" : primary[500]}
          />
        }
        contentContainerStyle={
          sessions.length === 0 ? styles.emptyList : styles.listContent
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, isDark && styles.separatorDark]} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="bubble.left.and.bubble.right"
              title="No Sessions"
              description="Create a new session to get started"
              actionLabel="New Session"
              onAction={handleCreateSession}
            />
          ) : null
        }
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    color: dark[500],
  },
  loadingTextDark: {
    color: dark[400],
  },
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyList: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: dark[200],
    marginVertical: 6,
  },
  separatorDark: {
    backgroundColor: dark[800],
  },
});
