import { Tabs, useRouter } from "expo-router";
import { Pressable, View, Text, StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useServersStore } from "@/lib/stores/servers";
import { useSessionsStore } from "@/lib/stores/sessions";
import { primary, dark } from "@/constants/theme";

function SessionsHeaderLeft() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);
  const activeProjectPath = useServersStore((s) => s.activeProjectPath);
  const projects = useServersStore((s) => s.projects);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const currentProject = projects.find((p) => p.worktree === activeProjectPath);
  const projectName =
    currentProject?.worktree.split("/").pop() || "Select Project";

  if (!activeServerId) {
    return null;
  }

  const handleSwitchProject = () => {
    if (projects.length === 0) return;
    router.push("/projects");
  };

  return (
    <Pressable
      onPress={handleSwitchProject}
      style={({ pressed }) => [
        styles.headerLeft,
        pressed && styles.headerLeftPressed,
      ]}
    >
      <View style={styles.headerLeftContent}>
        <Text
          style={[styles.serverLabel, isDark && styles.serverLabelDark]}
          numberOfLines={1}
        >
          {activeServer?.config.name || "Server"}
        </Text>
        <View style={styles.projectRow}>
          <Text
            style={[styles.projectLabel, isDark && styles.projectLabelDark]}
            numberOfLines={1}
          >
            {projectName}
          </Text>
          <IconSymbol
            name="chevron.down"
            size={12}
            color={isDark ? dark[400] : dark[500]}
          />
        </View>
      </View>
    </Pressable>
  );
}

function SessionsHeaderRight() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeServerId = useServersStore((s) => s.activeServerId);
  const activeProjectPath = useServersStore((s) => s.activeProjectPath);
  const serverStates = useServersStore((s) => s.serverStates);
  const createSession = useSessionsStore((s) => s.createSession);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;
  const isConnected = activeServer?.status === "connected";

  const handleCreateSession = async () => {
    const session = await createSession();
    if (session) {
      router.push(`/session/${session.id}`);
    }
  };

  if (!activeServerId || !isConnected || !activeProjectPath) {
    return null;
  }

  return (
    <Pressable
      onPress={handleCreateSession}
      style={({ pressed }) => pressed && styles.headerRightPressed}
    >
      <View style={styles.headerRightButton}>
        <IconSymbol
          name="plus"
          size={18}
          color={isDark ? "#fff" : primary[500]}
        />
        <Text
          style={[styles.headerRightText, isDark && styles.headerRightTextDark]}
        >
          New
        </Text>
      </View>
    </Pressable>
  );
}

function ServersHeaderRight() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable
      onPress={() => router.push("/server/add")}
      style={({ pressed }) => pressed && styles.headerRightPressed}
    >
      <View style={styles.headerRightButton}>
        <IconSymbol
          name="plus"
          size={18}
          color={isDark ? "#fff" : primary[500]}
        />
        <Text
          style={[styles.headerRightText, isDark && styles.headerRightTextDark]}
        >
          Add
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  headerLeftPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  headerLeftContent: {
    maxWidth: 180,
  },
  serverLabel: {
    fontSize: 11,
    color: dark[500],
  },
  serverLabelDark: {
    color: dark[400],
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  projectLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: dark[900],
  },
  projectLabelDark: {
    color: "#fff",
  },
  headerRightButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerRightPressed: {
    opacity: 0.7,
  },
  headerRightText: {
    fontSize: 17,
    fontWeight: "400",
    color: primary[500],
  },
  headerRightTextDark: {
    color: "#fff",
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? "#fff" : "#0ea5e9",
        tabBarInactiveTintColor: isDark ? "#64748b" : "#94a3b8",
        tabBarStyle: {
          backgroundColor: isDark ? "#0f172a" : "#fff",
          borderTopColor: isDark ? "#1e293b" : "#e2e8f0",
        },
        headerStyle: {
          backgroundColor: isDark ? "#0f172a" : "#fff",
        },
        headerTintColor: isDark ? "#fff" : "#0f172a",
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Sessions",
          headerTitle: "",
          headerLeft: () => <SessionsHeaderLeft />,
          headerRight: () => <SessionsHeaderRight />,
          headerLeftContainerStyle: { paddingLeft: 20 },
          headerRightContainerStyle: { paddingRight: 20 },
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={24}
              name="bubble.left.and.bubble.right.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="servers"
        options={{
          title: "Servers",
          headerRight: () => <ServersHeaderRight />,
          headerRightContainerStyle: { paddingRight: 20 },
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="server.rack" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
