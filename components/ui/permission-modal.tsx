import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from './icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePermissionsStore } from '@/lib/stores/permissions';
import { primary, dark, colors } from '@/constants/theme';
import type { Permission } from '@/lib/opencode/types';

function getPermissionIcon(type: string): React.ComponentProps<typeof IconSymbol>['name'] {
  switch (type) {
    case 'edit':
      return 'pencil';
    case 'bash':
      return 'terminal';
    case 'webfetch':
      return 'link';
    default:
      return 'exclamationmark.triangle.fill';
  }
}

function getPermissionDescription(permission: Permission): string {
  const { type, metadata } = permission;

  switch (type) {
    case 'edit':
      return `Edit file: ${metadata.path || 'unknown'}`;
    case 'bash':
      return `Run command: ${metadata.command || 'unknown'}`;
    case 'webfetch':
      return `Fetch URL: ${metadata.url || 'unknown'}`;
    default:
      return permission.title;
  }
}

interface PermissionModalProps {
  permission: Permission | null;
  onClose: () => void;
}

export function PermissionModal({ permission, onClose }: PermissionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const respondToPermission = usePermissionsStore((s) => s.respondToPermission);

  if (!permission) return null;

  const handleResponse = async (response: 'once' | 'always' | 'reject') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await respondToPermission(permission.sessionID, permission.id, response);
    onClose();
  };

  const icon = getPermissionIcon(permission.type);
  const description = getPermissionDescription(permission);

  return (
    <Modal
      visible={!!permission}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, isDark && styles.modalDark]}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
              <IconSymbol
                name={icon}
                size={32}
                color={isDark ? colors.amber[400] : colors.amber[600]}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, isDark && styles.titleDark]}>
            Permission Required
          </Text>

          {/* Permission title */}
          <Text style={[styles.permissionTitle, isDark && styles.permissionTitleDark]}>
            {permission.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, isDark && styles.descriptionDark]}>
            {description}
          </Text>

          {/* Pattern if available */}
          {permission.pattern && (
            <View style={[styles.patternContainer, isDark && styles.patternContainerDark]}>
              <Text style={[styles.patternText, isDark && styles.patternTextDark]}>
                {Array.isArray(permission.pattern)
                  ? permission.pattern.join('\n')
                  : permission.pattern}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => handleResponse('once')}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Allow Once
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleResponse('always')}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                isDark && styles.secondaryButtonDark,
                pressed && styles.secondaryButtonPressed,
                pressed && isDark && styles.secondaryButtonPressedDark,
              ]}
            >
              <Text style={[styles.secondaryButtonText, isDark && styles.secondaryButtonTextDark]}>
                Always Allow
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleResponse('reject')}
              style={styles.button}
            >
              <Text style={styles.denyButtonText}>
                Deny
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 24,
  },
  modalDark: {
    backgroundColor: dark[800],
  },
  iconWrapper: {
    marginBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: 32,
    backgroundColor: colors.amber[100],
    padding: 16,
  },
  iconContainerDark: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: dark[900],
  },
  titleDark: {
    color: '#fff',
  },
  permissionTitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: dark[700],
  },
  permissionTitleDark: {
    color: dark[300],
  },
  description: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
    color: dark[500],
  },
  descriptionDark: {
    color: dark[400],
  },
  patternContainer: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: dark[100],
    padding: 12,
  },
  patternContainerDark: {
    backgroundColor: dark[700],
  },
  patternText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: dark[600],
  },
  patternTextDark: {
    color: dark[400],
  },
  actions: {
    gap: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: primary[500],
  },
  primaryButtonPressed: {
    backgroundColor: primary[600],
  },
  primaryButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: dark[100],
  },
  secondaryButtonDark: {
    backgroundColor: dark[700],
  },
  secondaryButtonPressed: {
    backgroundColor: dark[200],
  },
  secondaryButtonPressedDark: {
    backgroundColor: dark[600],
  },
  secondaryButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: dark[700],
  },
  secondaryButtonTextDark: {
    color: dark[200],
  },
  denyButtonText: {
    textAlign: 'center',
    fontWeight: '500',
    color: colors.red[500],
  },
});
