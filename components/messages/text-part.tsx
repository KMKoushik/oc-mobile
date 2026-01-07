import { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import type { TextPart as TextPartType } from "@/lib/opencode/types";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { dark } from "@/constants/theme";

interface TextPartProps {
  part: TextPartType;
}

// Move static styles outside component to avoid recreation on every render
const lightMarkdownStyles = {
  body: {
    color: "#1e293b",
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 13,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: "#f1f5f9",
    color: "#334155",
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 13,
    marginVertical: 8,
  },
  heading1: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "700" as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "600" as const,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "600" as const,
    marginTop: 12,
    marginBottom: 4,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: "#0ea5e9",
  },
  blockquote: {
    backgroundColor: "#f8fafc",
    borderLeftColor: "#cbd5e1",
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: "#e2e8f0",
    height: 1,
    marginVertical: 16,
  },
  strong: {
    fontWeight: "600" as const,
  },
  em: {
    fontStyle: "italic" as const,
  },
};

const darkMarkdownStyles = {
  body: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: "#334155",
    color: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 13,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
    fontSize: 13,
    marginVertical: 8,
  },
  heading1: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "700" as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "600" as const,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "600" as const,
    marginTop: 12,
    marginBottom: 4,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: "#38bdf8",
  },
  blockquote: {
    backgroundColor: "#1e293b",
    borderLeftColor: "#475569",
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: "#334155",
    height: 1,
    marginVertical: 16,
  },
  strong: {
    fontWeight: "600" as const,
  },
  em: {
    fontStyle: "italic" as const,
  },
};

function TextPartComponent({ part }: TextPartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Memoize the style selection - only changes when theme changes
  const markdownStyles = useMemo(
    () => (isDark ? darkMarkdownStyles : lightMarkdownStyles),
    [isDark],
  );

  if (!part.text) return null;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Markdown style={markdownStyles}>{part.text}</Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderBottomLeftRadius: 6,
    backgroundColor: dark[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  containerDark: {
    backgroundColor: dark[800],
  },
});

// Memoize component - only re-render when text changes
export const TextPart = memo(TextPartComponent, (prevProps, nextProps) => {
  return (
    prevProps.part.id === nextProps.part.id &&
    prevProps.part.text === nextProps.part.text
  );
});
