import { useMemo, useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { codeToTokens, type ThemedToken } from "shiki";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { dark, colors } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";

// Number of context lines to show around changes
const CONTEXT_LINES = 3;

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
}

interface Hunk {
  type: "hunk" | "separator";
  lines?: DiffLine[];
  hiddenCount?: number;
  startLine?: number;
  endLine?: number;
}

interface FileDiffViewProps {
  before: string;
  after: string;
  filename: string;
}

// Map file extensions to Shiki language IDs
function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    md: "markdown",
    mdx: "mdx",
    css: "css",
    scss: "scss",
    html: "html",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    py: "python",
    go: "go",
    rs: "rust",
    sh: "bash",
    bash: "bash",
    swift: "swift",
    kt: "kotlin",
    java: "java",
    c: "c",
    cpp: "cpp",
    sql: "sql",
    graphql: "graphql",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || "text";
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// Compute unified diff - outputs lines in display order with single line number
function computeUnifiedDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const result: DiffLine[] = [];

  const lcs = computeLCS(oldLines, newLines);

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;
  let displayLineNum = 1;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (
      lcsIdx < lcs.length &&
      oldIdx < oldLines.length &&
      oldLines[oldIdx] === lcs[lcsIdx]
    ) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        // Unchanged line
        result.push({
          type: "unchanged",
          content: oldLines[oldIdx],
          lineNumber: displayLineNum++,
        });
        oldIdx++;
        newIdx++;
        lcsIdx++;
      } else {
        // Added line (before the unchanged one)
        result.push({
          type: "added",
          content: newLines[newIdx],
          lineNumber: displayLineNum++,
        });
        newIdx++;
      }
    } else if (
      oldIdx < oldLines.length &&
      (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])
    ) {
      // Removed line
      result.push({
        type: "removed",
        content: oldLines[oldIdx],
        lineNumber: displayLineNum++,
      });
      oldIdx++;
    } else if (newIdx < newLines.length) {
      // Added line
      result.push({
        type: "added",
        content: newLines[newIdx],
        lineNumber: displayLineNum++,
      });
      newIdx++;
    }
  }

  return result;
}

function createHunks(diffLines: DiffLine[]): Hunk[] {
  const hunks: Hunk[] = [];
  let currentHunk: DiffLine[] = [];
  let unchangedBuffer: DiffLine[] = [];

  for (const line of diffLines) {
    if (line.type === "unchanged") {
      unchangedBuffer.push(line);
    } else {
      if (unchangedBuffer.length > 0) {
        if (currentHunk.length === 0) {
          if (unchangedBuffer.length > CONTEXT_LINES) {
            hunks.push({
              type: "separator",
              hiddenCount: unchangedBuffer.length - CONTEXT_LINES,
              startLine: unchangedBuffer[0].lineNumber,
              endLine:
                unchangedBuffer[unchangedBuffer.length - CONTEXT_LINES - 1]
                  .lineNumber,
            });
            currentHunk = unchangedBuffer.slice(-CONTEXT_LINES);
          } else {
            currentHunk = [...unchangedBuffer];
          }
        } else {
          if (unchangedBuffer.length > CONTEXT_LINES * 2) {
            currentHunk.push(...unchangedBuffer.slice(0, CONTEXT_LINES));
            hunks.push({ type: "hunk", lines: currentHunk });

            hunks.push({
              type: "separator",
              hiddenCount: unchangedBuffer.length - CONTEXT_LINES * 2,
              startLine: unchangedBuffer[CONTEXT_LINES].lineNumber,
              endLine:
                unchangedBuffer[unchangedBuffer.length - CONTEXT_LINES - 1]
                  .lineNumber,
            });

            currentHunk = unchangedBuffer.slice(-CONTEXT_LINES);
          } else {
            currentHunk.push(...unchangedBuffer);
          }
        }
        unchangedBuffer = [];
      }

      currentHunk.push(line);
    }
  }

  if (unchangedBuffer.length > 0) {
    if (currentHunk.length > 0) {
      if (unchangedBuffer.length > CONTEXT_LINES) {
        currentHunk.push(...unchangedBuffer.slice(0, CONTEXT_LINES));
        hunks.push({ type: "hunk", lines: currentHunk });

        hunks.push({
          type: "separator",
          hiddenCount: unchangedBuffer.length - CONTEXT_LINES,
          startLine: unchangedBuffer[CONTEXT_LINES].lineNumber,
          endLine: unchangedBuffer[unchangedBuffer.length - 1].lineNumber,
        });
      } else {
        currentHunk.push(...unchangedBuffer);
        hunks.push({ type: "hunk", lines: currentHunk });
      }
    }
  } else if (currentHunk.length > 0) {
    hunks.push({ type: "hunk", lines: currentHunk });
  }

  return hunks;
}

interface SeparatorProps {
  hiddenCount: number;
  onExpand: () => void;
  isDark: boolean;
}

function Separator({ hiddenCount, onExpand, isDark }: SeparatorProps) {
  return (
    <Pressable
      onPress={onExpand}
      style={({ pressed }) => [
        styles.separator,
        isDark && styles.separatorDark,
        pressed && styles.separatorPressed,
      ]}
    >
      <IconSymbol
        name="chevron.down.2"
        size={12}
        color={isDark ? dark[400] : dark[500]}
      />
      <Text style={[styles.separatorText, isDark && styles.separatorTextDark]}>
        {hiddenCount} unchanged {hiddenCount === 1 ? "line" : "lines"}
      </Text>
      <IconSymbol
        name="chevron.down.2"
        size={12}
        color={isDark ? dark[400] : dark[500]}
      />
    </Pressable>
  );
}

// Shiki highlighted line component
function HighlightedLine({
  tokens,
  fallbackContent,
  isDark,
}: {
  tokens: ThemedToken[] | null;
  fallbackContent: string;
  isDark: boolean;
}) {
  if (!tokens || tokens.length === 0) {
    return (
      <Text
        style={[styles.codeText, { color: isDark ? dark[200] : dark[800] }]}
      >
        {fallbackContent || " "}
      </Text>
    );
  }

  return (
    <Text style={styles.codeText}>
      {tokens.map((token, idx) => (
        <Text
          key={idx}
          style={{
            color: token.color || (isDark ? dark[200] : dark[800]),
            fontStyle: token.fontStyle === 1 ? "italic" : "normal",
            fontWeight: token.fontStyle === 2 ? "bold" : "normal",
          }}
        >
          {token.content}
        </Text>
      ))}
    </Text>
  );
}

export function FileDiffView({ before, after, filename }: FileDiffViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const language = getLanguage(filename);

  const [expandedSeparators, setExpandedSeparators] = useState<Set<number>>(
    new Set(),
  );

  const [highlightedLines, setHighlightedLines] = useState<
    Map<string, ThemedToken[]>
  >(new Map());

  const { diffLines, hunks, allContent } = useMemo((): {
    diffLines: DiffLine[];
    hunks: Hunk[];
    allContent: string;
  } => {
    // New file
    if (!before && after) {
      const lines: DiffLine[] = after.split("\n").map((line, idx) => ({
        type: "added" as const,
        content: line,
        lineNumber: idx + 1,
      }));
      return {
        diffLines: lines,
        hunks: [{ type: "hunk" as const, lines }],
        allContent: after,
      };
    }

    // Deleted file
    if (before && !after) {
      const lines: DiffLine[] = before.split("\n").map((line, idx) => ({
        type: "removed" as const,
        content: line,
        lineNumber: idx + 1,
      }));
      return {
        diffLines: lines,
        hunks: [{ type: "hunk" as const, lines }],
        allContent: before,
      };
    }

    const diffLines = computeUnifiedDiff(before, after);
    const hunks = createHunks(diffLines);
    // Combine both for highlighting
    const allContent = before + "\n" + after;
    return { diffLines, hunks, allContent };
  }, [before, after]);

  // Highlight content using Shiki
  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const theme = isDark ? "github-dark" : "github-light";
        const result = await codeToTokens(allContent, {
          lang: language as never,
          theme,
        });

        if (cancelled) return;

        const lineTokens = new Map<string, ThemedToken[]>();
        result.tokens.forEach((lineTokenList) => {
          const lineContent = lineTokenList.map((t) => t.content).join("");
          lineTokens.set(lineContent, lineTokenList);
        });

        setHighlightedLines(lineTokens);
      } catch {
        // Fallback: no highlighting on error
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [allContent, language, isDark]);

  const handleExpand = useCallback((index: number) => {
    setExpandedSeparators((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const getExpandedLines = useCallback(
    (separator: Hunk): DiffLine[] => {
      const startLine = separator.startLine ?? 1;
      const endLine = separator.endLine ?? startLine;

      return diffLines.filter((line) => {
        if (line.type === "unchanged") {
          return line.lineNumber >= startLine && line.lineNumber <= endLine;
        }
        return false;
      });
    },
    [diffLines],
  );

  const maxLineNum =
    diffLines.length > 0 ? diffLines[diffLines.length - 1].lineNumber : 1;
  const lineNumWidth = String(maxLineNum).length * 9 + 8;

  const renderLine = (line: DiffLine, index: number) => {
    const tokens = highlightedLines.get(line.content) || null;

    return (
      <View
        key={`${line.lineNumber}-${index}`}
        style={[
          styles.line,
          line.type === "added" && styles.lineAdded,
          line.type === "added" && isDark && styles.lineAddedDark,
          line.type === "removed" && styles.lineRemoved,
          line.type === "removed" && isDark && styles.lineRemovedDark,
        ]}
      >
        {/* Line number */}
        <Text
          style={[
            styles.lineNumber,
            isDark && styles.lineNumberDark,
            { minWidth: lineNumWidth },
          ]}
        >
          {line.lineNumber}
        </Text>

        {/* +/- indicator */}
        <Text
          style={[
            styles.lineIndicator,
            line.type === "added" && styles.indicatorAdded,
            line.type === "added" && isDark && styles.indicatorAddedDark,
            line.type === "removed" && styles.indicatorRemoved,
            line.type === "removed" && isDark && styles.indicatorRemovedDark,
            line.type === "unchanged" && styles.indicatorUnchanged,
            line.type === "unchanged" &&
              isDark &&
              styles.indicatorUnchangedDark,
          ]}
        >
          {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
        </Text>

        {/* Code content */}
        <View style={styles.lineContentWrapper}>
          <HighlightedLine
            tokens={tokens}
            fallbackContent={line.content}
            isDark={isDark}
          />
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      horizontal
      showsHorizontalScrollIndicator={true}
    >
      <ScrollView
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
        contentContainerStyle={styles.verticalContent}
      >
        {hunks.map((hunk, hunkIndex) => {
          if (hunk.type === "separator") {
            if (expandedSeparators.has(hunkIndex)) {
              const expandedLines = getExpandedLines(hunk);
              return (
                <View key={`separator-${hunkIndex}`}>
                  {expandedLines.map((line, lineIndex) =>
                    renderLine(line, lineIndex),
                  )}
                </View>
              );
            }
            return (
              <Separator
                key={`separator-${hunkIndex}`}
                hiddenCount={hunk.hiddenCount ?? 0}
                onExpand={() => handleExpand(hunkIndex)}
                isDark={isDark}
              />
            );
          }

          return (
            <View key={`hunk-${hunkIndex}`}>
              {hunk.lines?.map((line, lineIndex) =>
                renderLine(line, lineIndex),
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f8fa",
    maxHeight: 350,
  },
  containerDark: {
    backgroundColor: "#0d1117",
  },
  verticalContent: {
    paddingVertical: 4,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 26,
    paddingRight: 12,
  },
  lineAdded: {
    backgroundColor: "#dafbe1",
  },
  lineAddedDark: {
    backgroundColor: "rgba(46, 160, 67, 0.25)",
  },
  lineRemoved: {
    backgroundColor: "#ffebe9",
  },
  lineRemovedDark: {
    backgroundColor: "rgba(248, 81, 73, 0.25)",
  },
  lineNumber: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#6e7781",
    textAlign: "right",
    paddingHorizontal: 8,
    lineHeight: 26,
  },
  lineNumberDark: {
    color: "#484f58",
  },
  lineIndicator: {
    width: 20,
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
  },
  indicatorAdded: {
    color: colors.green[600],
  },
  indicatorAddedDark: {
    color: colors.green[400],
  },
  indicatorRemoved: {
    color: colors.red[600],
  },
  indicatorRemovedDark: {
    color: colors.red[400],
  },
  indicatorUnchanged: {
    color: "transparent",
  },
  indicatorUnchangedDark: {
    color: "transparent",
  },
  lineContentWrapper: {
    flexShrink: 0,
    paddingRight: 16,
  },
  codeText: {
    fontSize: 13,
    fontFamily: "monospace",
    lineHeight: 26,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  separatorDark: {
    backgroundColor: "#161b22",
    borderColor: "#30363d",
  },
  separatorPressed: {
    opacity: 0.7,
  },
  separatorText: {
    fontSize: 12,
    color: dark[500],
    fontFamily: "monospace",
  },
  separatorTextDark: {
    color: dark[400],
  },
});
