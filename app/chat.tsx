import { useAriaStore } from '@/lib/ariatalking';
import { useUser } from '@clerk/clerk-expo';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from "react";
import { Dimensions, Image, ImageBackground, SafeAreaView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Animation assets
const ariaImages = [
  require("@/assets/main_ui/aria_mouthclosed.png"),
  require("@/assets/main_ui/aria_mouthopened.png"),
];

const { width, height } = Dimensions.get("window");

export default function ChatScreen() {
  const { isSignedIn, isLoaded } = useUser();
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
      }, 180);
    } else {
      setAriaFrame(0);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [ariaTalking]);

  // Expose this function for anywhere you want Aria to "speak"
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

  if (!isLoaded || !isSignedIn) return null;

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
});
