import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { colors } from "@/constants/theme";

interface DiffChangesProps {
  additions: number;
  deletions: number;
  variant?: "default" | "compact";
}

export function DiffChanges({
  additions,
  deletions,
  variant = "default",
}: DiffChangesProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const total = additions + deletions;

  if (total === 0 && variant === "default") {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          styles.additions,
          isDark && styles.additionsDark,
          variant === "compact" && styles.textCompact,
        ]}
      >
        +{additions}
      </Text>
      <Text
        style={[
          styles.text,
          styles.deletions,
          isDark && styles.deletionsDark,
          variant === "compact" && styles.textCompact,
        ]}
      >
        -{deletions}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  textCompact: {
    fontSize: 12,
  },
  additions: {
    color: colors.green[600],
  },
  additionsDark: {
    color: colors.green[400],
  },
  deletions: {
    color: colors.red[600],
  },
  deletionsDark: {
    color: colors.red[400],
  },
});
