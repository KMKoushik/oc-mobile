import { useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  type ViewToken,
} from "react-native";
import type { Session } from "@/lib/opencode/types";
import { useRouter } from "expo-router";
import { useServersStore } from "@/lib/stores/servers";
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  usePrefetchSession,
} from "@/lib/query";
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

  // TanStack Query hooks
  const {
    data: sessionsData,
    isLoading,
    refetch,
    isRefetching,
  } = useSessions();

  const createSessionMutation = useCreateSession();
  const deleteSessionMutation = useDeleteSession();
  const prefetchSession = usePrefetchSession();

  // Filter out child sessions (explore task sessions) - only show root sessions
  const sessions = (sessionsData?.sessions ?? []).filter((s) => !s.parentID);
  const sessionStatuses = sessionsData?.statuses ?? {};

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const isConnected = activeServer?.status === "connected";

  // Viewability config for prefetching
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Session>[] }) => {
      const visibleIds = viewableItems
        .filter((item) => item.isViewable && item.item)
        .map((item) => item.item.id);

      // Prefetch visible sessions (limit to 3)
      visibleIds.slice(0, 3).forEach((id) => {
        prefetchSession(id);
      });
    },
  ).current;

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCreateSession = async () => {
    try {
      const session = await createSessionMutation.mutateAsync();
      if (session) {
        router.push(`/session/${session.id}`);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSessionMutation.mutateAsync(id);
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
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
            onPress={() => router.push(`/session/${item.id}`)}
            onDelete={() => handleDeleteSession(item.id)}
          />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
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
