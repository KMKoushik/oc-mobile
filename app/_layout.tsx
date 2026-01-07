import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { queryClient } from "@/lib/query/client";
import { useServersStore } from "@/lib/stores/servers";
import { usePermissionsStore } from "@/lib/stores/permissions";
import { useEvents } from "@/lib/opencode/use-events";
import { ToastContainer } from "@/components/ui/toast-container";
import { PermissionModal } from "@/components/ui/permission-modal";

// Prevent the splash screen from auto-hiding before initialization completes
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StoreInitializer() {
  const initialize = useServersStore((state) => state.initialize);
  const isInitialized = useServersStore((state) => state.isInitialized);

  useEffect(() => {
    async function init() {
      try {
        if (!isInitialized) {
          await initialize();
        }
      } catch (error) {
        console.error("Failed to initialize stores:", error);
      } finally {
        // Always hide splash screen, even if initialization fails
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, [initialize, isInitialized]);

  return null;
}

function EventSubscriber() {
  useEvents();
  return null;
}

function PermissionHandler() {
  const pendingPermissions = usePermissionsStore((s) => s.pendingPermissions);
  const [currentPermission, setCurrentPermission] = useState<
    (typeof pendingPermissions)[0] | null
  >(null);

  useEffect(() => {
    // Show the first pending permission
    if (pendingPermissions.length > 0 && !currentPermission) {
      setCurrentPermission(pendingPermissions[0]);
    }
  }, [pendingPermissions, currentPermission]);

  const handleClose = () => {
    setCurrentPermission(null);
  };

  return (
    <PermissionModal permission={currentPermission} onClose={handleClose} />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <StoreInitializer />
            <EventSubscriber />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="server/add"
                options={{
                  presentation: "modal",
                  title: "Add Server",
                }}
              />
              <Stack.Screen
                name="projects"
                options={{
                  presentation: "modal",
                  title: "Switch Project",
                }}
              />
              <Stack.Screen
                name="session/[id]"
                options={{
                  title: "Session",
                  headerBackTitle: "Back",
                }}
              />
            </Stack>
            <ToastContainer />
            <PermissionHandler />
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
