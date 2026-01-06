import { ActionSheetIOS, Platform, Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { primary, dark, colors } from '@/constants/theme';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onCancel: () => void;
}

export function showActionSheet(props: Omit<ActionSheetProps, 'visible'>) {
  const { title, message, options, onCancel } = props;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [...options.map((o) => o.label), 'Cancel'],
        destructiveButtonIndex: options.findIndex((o) => o.destructive),
        cancelButtonIndex: options.length,
      },
      (buttonIndex) => {
        if (buttonIndex === options.length) {
          onCancel();
        } else {
          options[buttonIndex]?.onPress();
        }
      }
    );
  }
}

// Android fallback modal component
export function ActionSheet({
  visible,
  title,
  message,
  options,
  onCancel,
}: ActionSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (Platform.OS === 'ios') {
    // iOS uses native ActionSheetIOS
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.overlay}
        onPress={onCancel}
      >
        <Pressable
          style={[styles.sheet, isDark && styles.sheetDark]}
          onPress={(e) => e.stopPropagation()}
        >
          {(title || message) && (
            <View style={[styles.header, isDark && styles.headerDark]}>
              {title && (
                <Text style={[styles.title, isDark && styles.titleDark]}>
                  {title}
                </Text>
              )}
              {message && (
                <Text style={[styles.message, isDark && styles.messageDark]}>
                  {message}
                </Text>
              )}
            </View>
          )}

          {options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => {
                onCancel();
                option.onPress();
              }}
              style={({ pressed }) => [
                styles.option,
                isDark && styles.optionDark,
                pressed && styles.optionPressed,
                pressed && isDark && styles.optionPressedDark,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  option.destructive ? styles.optionTextDestructive : styles.optionTextPrimary,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              isDark && styles.cancelButtonDark,
              pressed && styles.cancelButtonPressed,
              pressed && isDark && styles.cancelButtonPressedDark,
            ]}
          >
            <Text style={[styles.cancelText, isDark && styles.cancelTextDark]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#fff',
    paddingBottom: 32,
  },
  sheetDark: {
    backgroundColor: dark[800],
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: dark[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerDark: {
    borderBottomColor: dark[700],
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: dark[900],
  },
  titleDark: {
    color: '#fff',
  },
  message: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 14,
    color: dark[500],
  },
  messageDark: {
    color: dark[400],
  },
  option: {
    borderBottomWidth: 1,
    borderBottomColor: dark[100],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  optionDark: {
    borderBottomColor: dark[700],
  },
  optionPressed: {
    backgroundColor: dark[50],
  },
  optionPressedDark: {
    backgroundColor: dark[700],
  },
  optionText: {
    textAlign: 'center',
    fontSize: 16,
  },
  optionTextDestructive: {
    fontWeight: '500',
    color: colors.red[500],
  },
  optionTextPrimary: {
    color: primary[500],
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: dark[100],
    paddingVertical: 16,
  },
  cancelButtonDark: {
    backgroundColor: dark[700],
  },
  cancelButtonPressed: {
    backgroundColor: dark[200],
  },
  cancelButtonPressedDark: {
    backgroundColor: dark[600],
  },
  cancelText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: dark[900],
  },
  cancelTextDark: {
    color: '#fff',
  },
});
