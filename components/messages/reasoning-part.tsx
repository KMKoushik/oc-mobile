import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ReasoningPart as ReasoningPartType } from '@/lib/opencode/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors } from '@/constants/theme';

interface ReasoningPartProps {
  part: ReasoningPartType;
}

export function ReasoningPart({ part }: ReasoningPartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  if (!part.text) return null;

  // Preview text (first line or first 100 chars)
  const preview = part.text.split('\n')[0].slice(0, 100);
  const hasMore = part.text.length > preview.length;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={[styles.pressable, isDark && styles.pressableDark]}
      >
        <IconSymbol
          name="lightbulb.fill"
          size={14}
          color={isDark ? colors.amber[400] : colors.amber[600]}
          style={styles.icon}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.label, isDark && styles.labelDark]}>
              Thinking
            </Text>
            {hasMore && (
              <IconSymbol
                name="chevron.right"
                size={12}
                color={isDark ? colors.amber[400] : colors.amber[600]}
                style={{
                  marginLeft: 4,
                  transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                }}
              />
            )}
          </View>
          <Text
            style={[styles.text, isDark && styles.textDark]}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {isExpanded ? part.text : preview}
            {!isExpanded && hasMore && '...'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    backgroundColor: colors.amber[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressableDark: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  icon: {
    marginTop: 2,
  },
  content: {
    marginLeft: 8,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.amber[700],
  },
  labelDark: {
    color: colors.amber[300],
  },
  text: {
    marginTop: 4,
    fontSize: 14,
    color: colors.amber[800],
  },
  textDark: {
    color: colors.amber[200],
  },
});
