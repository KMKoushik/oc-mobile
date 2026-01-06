import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { SessionStatus } from '@/lib/opencode/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { primary, semantic } from '@/constants/theme';

interface SessionStatusBadgeProps {
  status?: SessionStatus;
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!status) return null;

  if (status.type === 'busy') {
    return (
      <View style={[styles.badge, styles.busyBadge, isDark && styles.busyBadgeDark]}>
        <ActivityIndicator size="small" color={isDark ? primary[400] : primary[500]} />
        <Text style={[styles.text, styles.busyText, isDark && styles.busyTextDark]}>
          Running
        </Text>
      </View>
    );
  }

  if (status.type === 'retry') {
    return (
      <View style={[styles.badge, styles.retryBadge]}>
        <View style={styles.retryDot} />
        <Text style={styles.retryText}>Retrying</Text>
      </View>
    );
  }

  // Idle - don't show anything
  return null;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  busyBadge: {
    backgroundColor: primary[100],
  },
  busyBadgeDark: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
  },
  busyText: {
    color: primary[700],
  },
  busyTextDark: {
    color: primary[300],
  },
  retryBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  retryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.warning,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '500',
    color: semantic.warning,
  },
});
