import { useColorScheme } from '@/hooks/useColorScheme';
import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Use your actual publishable key
const publishableKey = "pk_test_YW1hemluZy1raWQtODAuY2xlcmsuYWNjb3VudHMuZGV2JA";

console.log("🔑 Using Clerk key:", publishableKey ? `${publishableKey.substring(0, 10)}...` : "NOT FOUND");

if (!publishableKey) {
  throw new Error('Missing Publishable Key');
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) return null;

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <View style={{ flex: 1 }}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                animationTypeForReplace: 'push',
              }}
            >
              <Stack.Screen 
                name="index" 
                options={{ 
                  animation: 'fade',
                  animationDuration: 300 
                }} 
              />
              <Stack.Screen 
                name="login" 
                options={{ 
                  animation: 'slide_from_right',
                  animationDuration: 350,
                  gestureEnabled: true 
                }} 
              />
              <Stack.Screen 
                name="signup" 
                options={{ 
                  animation: 'slide_from_right', 
                  animationDuration: 350,
                  gestureEnabled: true 
                }} 
              />
              <Stack.Screen 
                name="AppContent" 
                options={{ 
                  animation: 'slide_from_bottom',
                  animationDuration: 400 
                }} 
              />
            </Stack>
          </ThemeProvider>
          <StatusBar style="auto" />
        </View>
      </ClerkLoaded>
    </ClerkProvider>
  );
}