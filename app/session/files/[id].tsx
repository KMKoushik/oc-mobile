import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSessionDiffs } from "@/lib/query";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FileListItem } from "@/components/files/file-list-item";
import { dark, primary } from "@/constants/theme";

export default function FilesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const { data: diffs, isLoading } = useSessionDiffs(id);

  const [allExpanded, setAllExpanded] = useState(false);

  // Calculate totals
  const totals = useMemo(() => {
    if (!diffs) return { additions: 0, deletions: 0, files: 0 };
    return {
      additions: diffs.reduce((sum, d) => sum + d.additions, 0),
      deletions: diffs.reduce((sum, d) => sum + d.deletions, 0),
      files: diffs.length,
    };
  }, [diffs]);

  const handleToggleAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAllExpanded((prev) => !prev);
  }, []);

  // Update header
  useEffect(() => {
    navigation.setOptions({
      title: "Session changes",
      headerRight: () =>
        diffs && diffs.length > 0 ? (
          <Pressable
            onPress={handleToggleAll}
            style={styles.headerButton}
            hitSlop={8}
          >
            <IconSymbol
              name={
                allExpanded
                  ? "arrow.down.right.and.arrow.up.left"
                  : "arrow.up.left.and.arrow.down.right"
              }
              size={20}
              color={isDark ? dark[400] : dark[500]}
            />
          </Pressable>
        ) : null,
    });
  }, [navigation, diffs, allExpanded, handleToggleAll, isDark]);

  if (isLoading) {
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
      </View>
    );
  }

  if (!diffs || diffs.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          isDark && styles.containerDark,
        ]}
      >
        <IconSymbol
          name="doc.text"
          size={48}
          color={isDark ? dark[600] : dark[300]}
        />
        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
          No file changes in this session
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Summary header */}
      <View style={[styles.summaryHeader, isDark && styles.summaryHeaderDark]}>
        <View style={styles.summaryRow}>
          <Text
            style={[styles.summaryLabel, isDark && styles.summaryLabelDark]}
          >
            {totals.files} {totals.files === 1 ? "file" : "files"} changed
          </Text>
          <View style={styles.summaryStats}>
            <Text style={[styles.additions]}>+{totals.additions}</Text>
            <Text style={[styles.deletions]}>-{totals.deletions}</Text>
          </View>
        </View>
      </View>

      {/* File list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {diffs.map((diff) => (
          <FileListItem
            key={diff.file}
            diff={diff}
            defaultExpanded={allExpanded || diffs.length <= 3}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  containerDark: {
    backgroundColor: dark[900],
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerButton: {
    padding: 8,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: dark[500],
    textAlign: "center",
  },
  emptyTextDark: {
    color: dark[400],
  },
  summaryHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: dark[200],
    backgroundColor: "#fff",
  },
  summaryHeaderDark: {
    borderBottomColor: dark[800],
    backgroundColor: dark[900],
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: dark[700],
  },
  summaryLabelDark: {
    color: dark[200],
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  additions: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  deletions: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
});
