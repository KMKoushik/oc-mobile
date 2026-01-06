import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './icon-symbol';
import { useToastStore, type ToastType } from '@/lib/stores/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dark, colors } from '@/constants/theme';

function getToastConfig(type: ToastType, isDark: boolean) {
  switch (type) {
    case 'success':
      return {
        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.9)' : colors.green[600],
        icon: 'checkmark.circle.fill' as const,
      };
    case 'error':
      return {
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.9)' : colors.red[600],
        icon: 'xmark.circle.fill' as const,
      };
    case 'warning':
      return {
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.9)' : colors.amber[600],
        icon: 'exclamationmark.triangle.fill' as const,
      };
    default:
      return {
        backgroundColor: isDark ? 'rgba(51, 65, 85, 0.9)' : dark[800],
        icon: 'info.circle.fill' as const,
      };
  }
}

interface ToastItemProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

function ToastItem({ id, message, type, onDismiss }: ToastItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const config = getToastConfig(type, isDark);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={handleDismiss}
        style={[styles.toast, { backgroundColor: config.backgroundColor }]}
      >
        <IconSymbol name={config.icon} size={20} color="#fff" />
        <Text style={styles.toastText}>
          {message}
        </Text>
        <IconSymbol name="xmark" size={16} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const hideToast = useToastStore((s) => s.hideToast);

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => hideToast(toast.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  toastWrapper: {
    marginBottom: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
