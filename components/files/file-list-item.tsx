import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { dark } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FileIcon } from "@/components/ui/file-icon";
import { DiffChanges } from "@/components/ui/diff-changes";
import { FileDiffView } from "./file-diff-view";
import type { FileDiff } from "@/lib/opencode/types";

interface FileListItemProps {
  diff: FileDiff;
  defaultExpanded?: boolean;
}

function getFilename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function getDirectory(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/") + "/";
}

export function FileListItem({
  diff,
  defaultExpanded = false,
}: FileListItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  const filename = getFilename(diff.file);
  const directory = getDirectory(diff.file);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.header,
          isDark && styles.headerDark,
          pressed && styles.headerPressed,
          pressed && isDark && styles.headerPressedDark,
        ]}
      >
        <View style={styles.fileInfo}>
          <FileIcon filename={filename} size={18} />
          <View style={styles.pathContainer}>
            {directory ? (
              <Text
                style={[styles.directory, isDark && styles.directoryDark]}
                numberOfLines={1}
              >
                {directory}
              </Text>
            ) : null}
            <Text
              style={[styles.filename, isDark && styles.filenameDark]}
              numberOfLines={1}
            >
              {filename}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <DiffChanges
            additions={diff.additions}
            deletions={diff.deletions}
            variant="compact"
          />
          <IconSymbol
            name={isExpanded ? "chevron.up" : "chevron.down"}
            size={16}
            color={isDark ? dark[400] : dark[500]}
          />
        </View>
      </Pressable>

      {isExpanded && (
        <View
          style={[styles.diffContainer, isDark && styles.diffContainerDark]}
        >
          <FileDiffView
            before={diff.before}
            after={diff.after}
            filename={diff.file}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: dark[200],
  },
  containerDark: {
    backgroundColor: dark[800],
    borderColor: dark[700],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  headerDark: {
    backgroundColor: dark[800],
  },
  headerPressed: {
    backgroundColor: dark[50],
  },
  headerPressedDark: {
    backgroundColor: dark[700],
  },
  fileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  pathContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    minWidth: 0,
  },
  directory: {
    fontSize: 14,
    color: dark[500],
  },
  directoryDark: {
    color: dark[400],
  },
  filename: {
    fontSize: 14,
    fontWeight: "600",
    color: dark[900],
  },
  filenameDark: {
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 12,
  },
  diffContainer: {
    borderTopWidth: 1,
    borderTopColor: dark[200],
  },
  diffContainerDark: {
    borderTopColor: dark[700],
  },
});
