import { useAriaStore } from '@/lib/ariatalking';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// VOICE: Handles wake word + conversation
import { useVoiceFlow } from '@/lib/voiceHandler';
import {
  destroyWakeWordDetection,
  initWakeWordDetection,
  stopWakeWordDetection,
} from '@/lib/voiceWakeService';

// Animation assets
const ariaImages = [
  require("@/assets/main_ui/aria_mouthclosed.png"),
  require("@/assets/main_ui/aria_mouthopened.png"),
];

async function ensureMicrophonePermission() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "App needs access to your microphone for wake-word detection.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK"
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // On iOS, Expo handles this with Info.plist entry
  return true;
}

const { width, height } = Dimensions.get("window");

interface ChatScreenProps {
  onNavigateToTranscript?: () => void;
}

export default function ChatScreen({ onNavigateToTranscript }: ChatScreenProps) {
  const { isSignedIn, isLoaded } = useUser();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ariaTalking = useAriaStore((s) => s.ariaTalking);
  const [ariaFrame, setAriaFrame] = useState(0);

  // --- Chat message state (so you see what was said, optional) ---
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // -- Setup Voice Flow (handles speaking/AI reply/animation/listen again) --
  const { startVoiceFlow, stopVoiceFlow } = useVoiceFlow(
    (msg) => setMessages((prev) => [...prev, msg]),
    (msg) => setMessages((prev) => {
      // Replace the last assistant message with the real reply
      const idx = prev.findIndex((m) => m.role === 'assistant' && m.content === '(thinking...)');
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = msg;
        return updated;
      }
      return [...prev, msg];
    })
  );

  // Function to navigate to transcript
  const goToTranscript = () => {
    console.log("🚀 Chat: Navigating to transcript...");
    if (onNavigateToTranscript) {
      onNavigateToTranscript();
    } else {
      // Fallback for standalone usage
      router.push('/transcript');
    }
  };

  // Animate mouth open/close
  useEffect(() => {
    let interval: number | null = null;
    if (ariaTalking) {
      interval = setInterval(() => {
        setAriaFrame((prev) => (prev + 1) % ariaImages.length);
      }, 180);
    } else {
      setAriaFrame(0);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [ariaTalking]);

  // Only init/destroy Porcupine when this screen is focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true; // to handle async race if quickly unfocused

      const setupWakeWord = async () => {
        const permissionOk = await ensureMicrophonePermission();
        if (!permissionOk) {
          console.warn("No microphone permission! Wake-word won't work.");
          return;
        }
        if (!isLoaded || !isSignedIn) return;

        console.log('💬 ChatScreen focused – init wake‑word');
        await initWakeWordDetection(() => {
          if (!isActive) return;
          console.log('🚨 Hotword detected – start flow');
          stopWakeWordDetection();  // release mic from Porcupine
          startVoiceFlow();         // begin STT→AI→TTS cycle
        });
      };

      setupWakeWord();

      return () => {
        isActive = false;
        if (!isLoaded || !isSignedIn) return;
        console.log('💤 ChatScreen blurred – cleanup wake‑word');
        stopVoiceFlow();
        destroyWakeWordDetection();
      };
    }, [startVoiceFlow, stopVoiceFlow, isLoaded, isSignedIn])
  );

  if (!isLoaded || !isSignedIn) return null;

  return (
    <ImageBackground
      source={require('@/assets/main_ui/Branch_Background.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
        {/* Right side tap zone for navigation */}
        <TouchableOpacity 
          style={styles.rightTapZone}
          onPress={goToTranscript}
          activeOpacity={0.1}
        />
        
        <View style={styles.characterWrap}>
          <Image
            source={ariaImages[ariaFrame]}
            style={styles.ariaImage}
            resizeMode="contain"
          />
        </View>
        {/* Optional: Show the most recent message (can hide in prod) */}
        {/* <View style={{ position: "absolute", bottom: 120, width: "100%", alignItems: "center" }}>
          {messages.length > 0 && (
            <Text style={{ color: "#18435a", backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12, padding: 8, fontSize: 16, maxWidth: "90%" }}>
              {messages[messages.length - 1].content}
            </Text>
          )}
        </View> */}
      </SafeAreaView>
    </ImageBackground>
  );
}

const ARIA_WIDTH = width * 1.2;
const ARIA_HEIGHT = ARIA_WIDTH * 1.5;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  characterWrap: {
    position: "absolute",
    left: (width - ARIA_WIDTH) / 2,
    bottom: height * 0.03,
    width: ARIA_WIDTH,
    height: ARIA_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  ariaImage: {
    width: ARIA_WIDTH,
    height: ARIA_HEIGHT,
  },
  rightTapZone: {
    position: 'absolute',
    right: 0,
    top: height * 0.2,
    bottom: height * 0.2,
    width: width * 0.25,
    zIndex: 20,
    backgroundColor: 'transparent',
  },
});
