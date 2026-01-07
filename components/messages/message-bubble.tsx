import { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type {
  Message,
  Part,
  UserMessage,
  AssistantMessage,
} from "@/lib/opencode/types";
import { TextPart } from "./text-part";
import { ToolPart } from "./tool-part";
import { ReasoningPart } from "./reasoning-part";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { primary, dark, colors } from "@/constants/theme";

interface MessageBubbleProps {
  message: Message;
  parts: Part[];
}

function isUserMessage(message: Message): message is UserMessage {
  return message.role === "user";
}

function MessageBubbleComponent({ message, parts }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isUser = isUserMessage(message);

  // Memoize filtered parts to avoid recalculation on every render
  const { textParts, reasoningParts, toolParts } = useMemo(
    () => ({
      textParts: parts.filter((p) => p.type === "text"),
      reasoningParts: parts.filter((p) => p.type === "reasoning"),
      toolParts: parts.filter((p) => p.type === "tool"),
    }),
    [parts],
  );

  // For user messages, just show the first text part
  if (isUser) {
    const textContent = textParts[0];
    if (!textContent || textContent.type !== "text") return null;

    return (
      <View style={styles.container}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{textContent.text}</Text>
        </View>
      </View>
    );
  }

  // Assistant message
  const assistantMessage = message as AssistantMessage;
  const hasError = !!assistantMessage.error;

  return (
    <View style={styles.container}>
      <View style={styles.assistantContainer}>
        {/* Reasoning parts (collapsible) */}
        {reasoningParts.map((part) => {
          if (part.type !== "reasoning") return null;
          return <ReasoningPart key={part.id} part={part} />;
        })}

        {/* Tool parts */}
        {toolParts.map((part) => {
          if (part.type !== "tool") return null;
          return <ToolPart key={part.id} part={part} />;
        })}

        {/* Text parts */}
        {textParts.map((part) => {
          if (part.type !== "text") return null;
          return <TextPart key={part.id} part={part} />;
        })}

        {/* Error display */}
        {hasError && assistantMessage.error && (
          <View
            style={[styles.errorContainer, isDark && styles.errorContainerDark]}
          >
            <Text style={[styles.errorTitle, isDark && styles.errorTitleDark]}>
              {assistantMessage.error.name}
            </Text>
            {"message" in assistantMessage.error.data && (
              <Text
                style={[styles.errorMessage, isDark && styles.errorMessageDark]}
              >
                {(assistantMessage.error.data as { message: string }).message}
              </Text>
            )}
          </View>
        )}

        {/* Token usage (subtle) */}
        {assistantMessage.tokens && assistantMessage.tokens.output > 0 && (
          <Text style={[styles.tokenText, isDark && styles.tokenTextDark]}>
            {assistantMessage.tokens.input.toLocaleString()} in /{" "}
            {assistantMessage.tokens.output.toLocaleString()} out
            {assistantMessage.cost > 0 &&
              ` · $${assistantMessage.cost.toFixed(4)}`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  userBubble: {
    maxWidth: "85%",
    alignSelf: "flex-end",
    borderRadius: 16,
    borderBottomRightRadius: 6,
    backgroundColor: primary[500],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    fontSize: 16,
    color: "#fff",
  },
  assistantContainer: {
    maxWidth: "95%",
    alignSelf: "flex-start",
  },
  errorContainer: {
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: colors.red[50],
    padding: 12,
  },
  errorContainerDark: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.red[600],
  },
  errorTitleDark: {
    color: colors.red[400],
  },
  errorMessage: {
    marginTop: 4,
    fontSize: 14,
    color: colors.red[500],
  },
  errorMessageDark: {
    color: colors.red[400],
  },
  tokenText: {
    marginTop: 8,
    fontSize: 12,
    color: dark[400],
  },
  tokenTextDark: {
    color: dark[500],
  },
});

// Memoize the component to prevent unnecessary re-renders
export const MessageBubble = memo(
  MessageBubbleComponent,
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    // Only re-render if message id changes or parts array length/content changes
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.parts.length !== nextProps.parts.length) return false;

    // Check if any part has changed (by id and relevant content)
    for (let i = 0; i < prevProps.parts.length; i++) {
      const prevPart = prevProps.parts[i];
      const nextPart = nextProps.parts[i];
      if (prevPart.id !== nextPart.id) return false;
      // For text parts, check if text changed (streaming updates)
      if (prevPart.type === "text" && nextPart.type === "text") {
        if (prevPart.text !== nextPart.text) return false;
      }
      // For tool parts, check if state changed
      if (prevPart.type === "tool" && nextPart.type === "tool") {
        if (prevPart.state.status !== nextPart.state.status) return false;
        // Check title only for states that have it (running, completed)
        const prevTitle =
          "title" in prevPart.state ? prevPart.state.title : undefined;
        const nextTitle =
          "title" in nextPart.state ? nextPart.state.title : undefined;
        if (prevTitle !== nextTitle) return false;
      }
    }

    return true;
  },
);
