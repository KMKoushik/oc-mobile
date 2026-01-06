import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import type { ToolPart as ToolPartType } from '@/lib/opencode/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { primary, dark, colors, semantic } from '@/constants/theme';

interface ToolPartProps {
  part: ToolPartType;
}

function getToolIcon(toolName: string): React.ComponentProps<typeof IconSymbol>['name'] {
  if (toolName.toLowerCase().includes('bash') || toolName.toLowerCase().includes('shell')) {
    return 'terminal';
  }
  if (toolName.toLowerCase().includes('read') || toolName.toLowerCase().includes('file')) {
    return 'doc.fill';
  }
  if (toolName.toLowerCase().includes('edit') || toolName.toLowerCase().includes('write')) {
    return 'pencil';
  }
  if (toolName.toLowerCase().includes('glob') || toolName.toLowerCase().includes('grep')) {
    return 'doc.on.doc';
  }
  return 'wrench.fill';
}

export function ToolPart({ part }: ToolPartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  const { state, tool } = part;
  const icon = getToolIcon(tool);

  const isPending = state.status === 'pending';
  const isRunning = state.status === 'running';
  const isCompleted = state.status === 'completed';
  const isError = state.status === 'error';

  const title = isCompleted || isRunning ? state.title || tool : tool;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={[
          styles.header,
          isDark && styles.headerDark,
          isError && styles.headerError,
          isError && isDark && styles.headerErrorDark,
        ]}
      >
        {/* Status indicator */}
        <View style={styles.statusContainer}>
          {isPending || isRunning ? (
            <ActivityIndicator
              size="small"
              color={isDark ? primary[400] : primary[500]}
            />
          ) : isCompleted ? (
            <IconSymbol name="checkmark.circle.fill" size={18} color={semantic.success} />
          ) : isError ? (
            <IconSymbol name="xmark.circle.fill" size={18} color={semantic.error} />
          ) : null}
        </View>

        {/* Tool icon */}
        <View style={styles.iconContainer}>
          <IconSymbol
            name={icon}
            size={16}
            color={isDark ? dark[400] : dark[500]}
          />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            isDark && styles.titleDark,
            isError && styles.titleError,
            isError && isDark && styles.titleErrorDark,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Expand indicator */}
        {(isCompleted || isError) && (
          <IconSymbol
            name="chevron.right"
            size={14}
            color={isDark ? dark[500] : dark[400]}
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        )}
      </Pressable>

      {/* Expanded content */}
      {isExpanded && (isCompleted || isError) && (
        <View style={[styles.expandedContent, isDark && styles.expandedContentDark]}>
          {/* Input */}
          {state.input && Object.keys(state.input).length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>
                Input
              </Text>
              <Text
                style={[styles.codeText, isDark && styles.codeTextDark]}
                numberOfLines={10}
              >
                {JSON.stringify(state.input, null, 2)}
              </Text>
            </View>
          )}

          {/* Output or Error */}
          {isCompleted && state.output && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, isDark && styles.sectionLabelDark]}>
                Output
              </Text>
              <Text
                style={[styles.codeText, isDark && styles.codeTextDark]}
                numberOfLines={20}
              >
                {state.output.slice(0, 1000)}
                {state.output.length > 1000 && '...'}
              </Text>
            </View>
          )}

          {isError && state.error && (
            <View style={styles.section}>
              <Text style={styles.errorLabel}>
                Error
              </Text>
              <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
                {state.error}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: dark[100],
  },
  headerDark: {
    backgroundColor: dark[800],
  },
  headerError: {
    backgroundColor: colors.red[50],
  },
  headerErrorDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusContainer: {
    marginRight: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    color: dark[700],
  },
  titleDark: {
    color: dark[300],
  },
  titleError: {
    color: colors.red[700],
  },
  titleErrorDark: {
    color: colors.red[300],
  },
  expandedContent: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: dark[50],
    padding: 12,
  },
  expandedContentDark: {
    backgroundColor: dark[900],
  },
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '500',
    color: dark[500],
  },
  sectionLabelDark: {
    color: dark[400],
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: dark[600],
  },
  codeTextDark: {
    color: dark[400],
  },
  errorLabel: {
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '500',
    color: colors.red[500],
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.red[500],
  },
  errorTextDark: {
    color: colors.red[400],
  },
});
