import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useServersStore } from "@/lib/stores/servers";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { primary, dark } from "@/constants/theme";

export default function ProjectsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);
  const activeProjectPath = useServersStore((s) => s.activeProjectPath);
  const projects = useServersStore((s) => s.projects);
  const setActiveProject = useServersStore((s) => s.setActiveProject);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;

  const handleSelectProject = async (worktree: string) => {
    await setActiveProject(worktree);
    router.back();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {activeServer && (
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.serverName, isDark && styles.serverNameDark]}>
            {activeServer.config.name}
          </Text>
        </View>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.worktree}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const projectName = item.worktree.split("/").pop() || item.worktree;
          const isActive = item.worktree === activeProjectPath;

          return (
            <Pressable
              onPress={() => handleSelectProject(item.worktree)}
              style={({ pressed }) => [
                styles.item,
                isDark && styles.itemDark,
                pressed && styles.itemPressed,
                pressed && isDark && styles.itemPressedDark,
              ]}
            >
              <IconSymbol
                name="folder.fill"
                size={20}
                color={isActive ? primary[500] : isDark ? dark[400] : dark[500]}
              />
              <Text
                style={[
                  styles.itemText,
                  isDark && styles.itemTextDark,
                  isActive && styles.itemTextActive,
                ]}
                numberOfLines={1}
              >
                {projectName}
              </Text>
              {isActive && (
                <IconSymbol name="checkmark" size={18} color={primary[500]} />
              )}
            </Pressable>
          );
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: dark[200],
  },
  headerDark: {
    borderBottomColor: dark[700],
  },
  serverName: {
    fontSize: 14,
    color: dark[500],
  },
  serverNameDark: {
    color: dark[400],
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemDark: {},
  itemPressed: {
    backgroundColor: dark[50],
  },
  itemPressedDark: {
    backgroundColor: dark[800],
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: dark[900],
  },
  itemTextDark: {
    color: "#fff",
  },
  itemTextActive: {
    color: primary[500],
    fontWeight: "500",
  },
});
