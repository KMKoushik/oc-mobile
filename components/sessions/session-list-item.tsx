import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useRef } from "react";
import type { Session, SessionStatus } from "@/lib/opencode/types";
import { SessionStatusBadge } from "./session-status-badge";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { dark, colors } from "@/constants/theme";

interface TokenCounts {
  input: number;
  output: number;
  total: number;
}

interface SessionListItemProps {
  session: Session;
  status?: SessionStatus;
  tokenCounts?: TokenCounts;
  onPress: () => void;
  onDelete: () => void;
}

function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function SessionListItem({
  session,
  status,
  tokenCounts,
  onPress,
  onDelete,
}: SessionListItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const swipeableRef = useRef<Swipeable>(null);

  const title = session.title || "Untitled Session";
  const updatedAt = formatRelativeTime(session.time.updated);
  const hasChanges =
    session.summary &&
    (session.summary.additions > 0 || session.summary.deletions > 0);

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
        style={({ pressed }) => [
          styles.item,
          isDark && styles.itemDark,
          pressed && styles.itemPressed,
          pressed && isDark && styles.itemPressedDark,
        ]}
      >
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isDark && styles.titleDark]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <SessionStatusBadge status={status} />
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.timestamp, isDark && styles.timestampDark]}>
              {updatedAt}
            </Text>

            {hasChanges && (
              <View style={styles.changesContainer}>
                <Text
                  style={[styles.additions, isDark && styles.additionsDark]}
                >
                  +{session.summary!.additions}
                </Text>
                <Text
                  style={[styles.deletions, isDark && styles.deletionsDark]}
                >
                  -{session.summary!.deletions}
                </Text>
              </View>
            )}

            {session.share?.url && (
              <View style={styles.sharedContainer}>
                <IconSymbol
                  name="link"
                  size={12}
                  color={isDark ? dark[500] : dark[400]}
                />
                <Text
                  style={[styles.sharedText, isDark && styles.sharedTextDark]}
                >
                  Shared
                </Text>
              </View>
            )}

            {tokenCounts && tokenCounts.total > 0 && (
              <View style={styles.tokenContainer}>
                <IconSymbol
                  name="number"
                  size={11}
                  color={isDark ? dark[500] : dark[400]}
                />
                <Text
                  style={[styles.tokenText, isDark && styles.tokenTextDark]}
                >
                  {formatTokenCount(tokenCounts.total)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
  },
  itemDark: {
    backgroundColor: dark[900],
  },
  itemPressed: {
    backgroundColor: dark[50],
  },
  itemPressedDark: {
    backgroundColor: dark[800],
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: dark[900],
  },
  titleDark: {
    color: "#fff",
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timestamp: {
    fontSize: 12,
    color: dark[500],
  },
  timestampDark: {
    color: dark[400],
  },
  changesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  additions: {
    fontSize: 12,
    color: colors.green[600],
  },
  additionsDark: {
    color: colors.green[400],
  },
  deletions: {
    fontSize: 12,
    color: colors.red[600],
  },
  deletionsDark: {
    color: colors.red[400],
  },
  sharedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sharedText: {
    fontSize: 12,
    color: dark[500],
  },
  sharedTextDark: {
    color: dark[400],
  },
  tokenContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tokenText: {
    fontSize: 12,
    color: dark[500],
  },
  tokenTextDark: {
    color: dark[400],
  },
  deleteAction: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red[500],
  },
});
