import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const tokenCache = {
  async getToken(key: string) { try { return SecureStore.getItemAsync(key); } catch { return null; } },
  async saveToken(key: string, value: string) { try { return SecureStore.setItemAsync(key, value); } catch { return; } },
};

// Use your actual publishable key
const publishableKey = 'pk_test_YW1hemluZy1raWQtODAuY2xlcmsuYWNjb3VudHMuZGV2JA';
console.log('🔑 Using Clerk key:', publishableKey ? `${publishableKey.substring(0, 10)}...` : 'NOT FOUND');
if (!publishableKey) throw new Error('Missing Publishable Key');

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  if (!loaded) return null;

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Root wrapper never steals taps/gestures */}
          <View style={{ flex: 1 }} pointerEvents="box-none">
            {/* === Global brand background across ALL screens === */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Image
                source={require('@/assets/main_ui/Background_Gradient.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>

            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  animationTypeForReplace: 'push',
                  // 👇 crucial: let the gradient show through
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              >
                {/* Auth / landing */}
                <Stack.Screen name="index" options={{ animation: 'fade', animationDuration: 300 }} />
                <Stack.Screen name="login" options={{ animation: 'slide_from_right', animationDuration: 350, gestureEnabled: true }} />
                <Stack.Screen name="signup" options={{ animation: 'slide_from_right', animationDuration: 350, gestureEnabled: true }} />

                {/* Main learner app pages (moved under simtrading/) */}
                <Stack.Screen name="simtrading/learn" options={{ headerShown: false }} />
                <Stack.Screen name="simtrading/journal" options={{ headerShown: false }} />
                <Stack.Screen name="simtrading/progress" options={{ headerShown: false }} />
                {/* If you navigate to a branded component directly */}
                <Stack.Screen name="simtrading/brand" options={{ headerShown: false }} />

                {/* AI screens now under screens/ */}
                <Stack.Screen name="screens/chat" options={{ headerShown: false }} />
                <Stack.Screen name="screens/transcript" options={{ headerShown: false }} />
                <Stack.Screen name="screens/practice" options={{ headerShown: false }} />

                {/* Pager container (Chat/Transcript/Practice) at app/AppContent.tsx */}
                <Stack.Screen
                  name="AppContent"
                  options={{
                    headerShown: false,
                    animation: 'slide_from_bottom',
                    animationDuration: 400,
                    gestureEnabled: false,
                    fullScreenGestureEnabled: false,
                    freezeOnBlur: false,
                  }}
                />

                {/* Settings & misc (paths preserved) */}
                <Stack.Screen name="FAQ" options={{ headerShown: false }} />
                <Stack.Screen name="Settings/AboutContent" options={{ headerShown: false }} />
                <Stack.Screen name="Settings/PrivacyStatement" options={{ headerShown: false }} />
                <Stack.Screen name="Settings/Updates" options={{ headerShown: false }} />

                {/* User modals now under user/ */}
                <Stack.Screen name="user/SettingsModal" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="user/UserProfileModal" options={{ presentation: 'modal', headerShown: false }} />

                <Stack.Screen name="+not-found" options={{ headerShown: false }} />
              </Stack>
            </ThemeProvider>

            <StatusBar style="auto" />
          </View>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
