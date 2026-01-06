import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useServersStore } from '@/lib/stores/servers';
import { checkServerHealth } from '@/lib/opencode/client';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AddServerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const addServer = useServersStore((s) => s.addServer);
  const setActiveServer = useServersStore((s) => s.setActiveServer);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('http://');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (!url.trim() || !url.startsWith('http')) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Test connection
    const health = await checkServerHealth(url);
    if (!health.healthy) {
      setError(health.error || 'Could not connect to server');
      setIsLoading(false);
      return;
    }

    // Add server
    const server = await addServer(name.trim(), url.trim());

    // Set as active
    await setActiveServer(server.id);

    setIsLoading(false);
    router.back();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView style={styles.flex1} contentContainerStyle={styles.content}>
          <Text style={[styles.label, isDark && styles.labelDark]}>
            Server Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="My OpenCode Server"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            style={[styles.input, isDark && styles.inputDark]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, isDark && styles.labelDark]}>
            Server URL
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.100:4096"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            style={[styles.input, isDark && styles.inputDark]}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.hint, isDark && styles.hintDark]}>
            Enter the URL of your OpenCode server. You can find this in the
            terminal when running OpenCode.
          </Text>

          {error && (
            <View style={[styles.errorBox, isDark && styles.errorBoxDark]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleAdd}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
          >
            {isLoading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.buttonText}>Connecting...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Add Server</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  flex1: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  inputDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#fff',
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  hintDark: {
    color: '#94a3b8',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxDark: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: '#0284c7',
  },
  buttonDisabled: {
    backgroundColor: '#7dd3fc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
