import "@/src/i18n"; 
import { useEffect, useState } from "react";
import { Stack, usePathname } from "expo-router";
import {StatusBar} from 'expo-status-bar';
import { StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  useSafeAreaInsets,
  SafeAreaProvider,
  EdgeInsets,
} from "react-native-safe-area-context";
import Footer from "@/src/components/Footer";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { usePushNotifications } from "../src/hook/usePushNotifications";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function LayoutContent() {
  const insets: EdgeInsets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect((): void => {
    setIsReady(true);
  }, []);

  useEffect((): void => {
    const checkUser = async (): Promise<void> => {
      try {
        const storedId = await SecureStore.getItemAsync("userId");
        setUserId(storedId);
      } catch { setUserId(null); }
    };
    checkUser();
  }, [pathname]);

  usePushNotifications(userId);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: theme?.background || "#000",
        },
      ]}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'}/>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: {backgroundColor: theme.background} }}>
          <Stack.Screen name="index" />
        </Stack>
      </View>

      {isReady && <Footer />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
