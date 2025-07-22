import { useAriaStore } from '@/lib/ariatalking';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from "react";
import { Dimensions, Image, ImageBackground, SafeAreaView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/stayloggedin";

// Animation assets
const ariaImages = [
  require("@/assets/main_ui/aria_mouthclosed.png"),
  require("@/assets/main_ui/aria_mouthopened.png"),
];

const { width, height } = Dimensions.get("window");

export default function ChatScreen() {
  const { isLoggedIn, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const ariaTalking = useAriaStore((s) => s.ariaTalking);
  const setAriaTalking = useAriaStore((s) => s.setAriaTalking);
  const [ariaFrame, setAriaFrame] = useState(0);

  // Animate mouth open/close
  useEffect(() => {
    let interval: number | null = null;
    if (ariaTalking) {
      interval = setInterval(() => {
        setAriaFrame((prev) => (prev + 1) % ariaImages.length);
      }, 180); // Adjust speed as you like
    } else {
      setAriaFrame(0);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [ariaTalking]);

  // Expose this function for anywhere you want Aria to "speak"
  // (call it after you get an AI reply)
  const speakAndAnimate = (text: string) => {
    // Start animating
    setAriaTalking(true);
    Speech.speak(text, {
      onStart: () => setAriaTalking(true),
      onDone: () => setAriaTalking(false),
      onStopped: () => setAriaTalking(false),
      onError: () => setAriaTalking(false),
      // Optionally: set voice, language, pitch, etc here
    });
  };

  if (loading || !isLoggedIn) return null;

  return (
    <ImageBackground
      source={require('@/assets/main_ui/Branch_Background.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.characterWrap}>
          <Image
            source={ariaImages[ariaFrame]}
            style={styles.ariaImage}
            resizeMode="contain"
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );  
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  characterWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ariaImage: {
    width: width * 1.2,
    height: height / 1.5,
    alignSelf: "center",
  },
});
