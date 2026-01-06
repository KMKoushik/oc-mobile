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

export function MessageBubble({ message, parts }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isUser = isUserMessage(message);

  // Filter and sort parts
  const textParts = parts.filter((p) => p.type === "text");
  const reasoningParts = parts.filter((p) => p.type === "reasoning");
  const toolParts = parts.filter((p) => p.type === "tool");

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
