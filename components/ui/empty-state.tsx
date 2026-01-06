import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IconSymbol, type IconSymbolName } from './icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface EmptyStateProps {
  icon: IconSymbolName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
        <IconSymbol
          name={icon}
          size={32}
          color="#94a3b8"
        />
      </View>
      <Text style={[styles.title, isDark && styles.titleDark]}>
        {title}
      </Text>
      <Text style={[styles.description, isDark && styles.descriptionDark]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 16,
    borderRadius: 9999,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  iconContainerDark: {
    backgroundColor: '#1e293b',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  titleDark: {
    color: '#fff',
  },
  description: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
  descriptionDark: {
    color: '#94a3b8',
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonPressed: {
    backgroundColor: '#0284c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
