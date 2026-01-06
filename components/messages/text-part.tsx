import { View, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { TextPart as TextPartType } from '@/lib/opencode/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dark } from '@/constants/theme';

interface TextPartProps {
  part: TextPartType;
}

export function TextPart({ part }: TextPartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!part.text) return null;

  const markdownStyles = {
    body: {
      color: isDark ? '#e2e8f0' : '#1e293b',
      fontSize: 15,
      lineHeight: 22,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: isDark ? '#334155' : '#f1f5f9',
      color: isDark ? '#f1f5f9' : '#334155',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    code_block: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      color: isDark ? '#e2e8f0' : '#334155',
      padding: 12,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 13,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      color: isDark ? '#e2e8f0' : '#334155',
      padding: 12,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 13,
      marginVertical: 8,
    },
    heading1: {
      color: isDark ? '#f8fafc' : '#0f172a',
      fontSize: 24,
      fontWeight: '700' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      color: isDark ? '#f8fafc' : '#0f172a',
      fontSize: 20,
      fontWeight: '600' as const,
      marginTop: 14,
      marginBottom: 6,
    },
    heading3: {
      color: isDark ? '#f8fafc' : '#0f172a',
      fontSize: 17,
      fontWeight: '600' as const,
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
      color: isDark ? '#38bdf8' : '#0ea5e9',
    },
    blockquote: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderLeftColor: isDark ? '#475569' : '#cbd5e1',
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 4,
      marginVertical: 8,
    },
    hr: {
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      height: 1,
      marginVertical: 16,
    },
    strong: {
      fontWeight: '600' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
  };

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
