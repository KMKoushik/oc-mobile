import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useServersStore } from "@/lib/stores/servers";
import { dark, colors } from "@/constants/theme";

interface SettingsRowProps {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  title: string;
  subtitle?: string;
  value?: React.ReactNode;
  onPress?: () => void;
}

function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
}: SettingsRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const content = (
    <View style={[styles.row, isDark && styles.rowDark]}>
      <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
        <IconSymbol
          name={icon}
          size={20}
          color={isDark ? dark[400] : dark[500]}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, isDark && styles.rowTitleDark]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSubtitle, isDark && styles.rowSubtitleDark]}>
            {subtitle}
          </Text>
        )}
      </View>
      {value}
      {onPress && !value && (
        <IconSymbol
          name="chevron.right"
          size={16}
          color={isDark ? dark[500] : dark[400]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.rowPressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

function SectionHeader({ title }: { title: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Text style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const activeServerId = useServersStore((s) => s.activeServerId);
  const serverStates = useServersStore((s) => s.serverStates);

  const activeServer = activeServerId ? serverStates[activeServerId] : null;

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <SectionHeader title="Connection" />
      <SettingsRow
        icon="server.rack"
        title="Active Server"
        subtitle={activeServer?.config.name || "None selected"}
        value={
          activeServer?.status === "connected" && (
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text
                style={[
                  styles.connectedText,
                  isDark && styles.connectedTextDark,
                ]}
              >
                Connected
              </Text>
            </View>
          )
        }
      />
      {activeServer?.version && (
        <SettingsRow
          icon="info.circle.fill"
          title="Server Version"
          subtitle={activeServer.version}
        />
      )}

      <SectionHeader title="Appearance" />
      <SettingsRow
        icon="gearshape"
        title="Theme"
        subtitle={colorScheme === "dark" ? "Dark" : "Light"}
        value={
          <Text style={[styles.valueText, isDark && styles.valueTextDark]}>
            System
          </Text>
        }
      />

      <SectionHeader title="About" />
      <SettingsRow icon="info.circle.fill" title="Version" subtitle="1.0.0" />
      <SettingsRow
        icon="link"
        title="OpenCode"
        subtitle="opencode.ai"
        onPress={() => {
          // Open URL
        }}
      />

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark[50],
  },
  containerDark: {
    backgroundColor: dark[950],
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 24,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    color: dark[500],
  },
  sectionHeaderDark: {
    color: dark[400],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: dark[200],
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowDark: {
    borderBottomColor: dark[800],
    backgroundColor: dark[900],
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: dark[100],
    padding: 8,
  },
  iconContainerDark: {
    backgroundColor: dark[800],
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: dark[900],
  },
  rowTitleDark: {
    color: "#fff",
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: dark[500],
  },
  rowSubtitleDark: {
    color: dark[400],
  },
  valueText: {
    fontSize: 14,
    color: dark[500],
  },
  valueTextDark: {
    color: dark[400],
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green[500],
  },
  connectedText: {
    fontSize: 14,
    color: colors.green[600],
  },
  connectedTextDark: {
    color: colors.green[400],
  },
  bottomSpacer: {
    height: 32,
  },
});
