import { useAriaStore } from '@/lib/voice/ariatalking';
import { useUser } from '@clerk/clerk-expo';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessagesStore, type MessagesStore } from '@/lib/voice/messagesStore';
import { useVoiceFlow } from '@/lib/voice/voiceHandler';

const ariaImages = [
  require('@/assets/main_ui/aria_mouthclosed.png'),
  require('@/assets/main_ui/aria_mouthopened.png'),
];

const { width: W, height: H } = Dimensions.get('window');
const ARIA_WIDTH = W * 1.2;
const ARIA_HEIGHT = ARIA_WIDTH * 1.5;

interface ChatScreenProps {
  onNavigateToTranscript?: () => void;
  isActive?: boolean;
  isSwiping?: boolean;
  setPagerSwipeEnabled?: (enabled: boolean) => void;
}

export default function ChatScreen({
  onNavigateToTranscript,
  isActive = true,
}: ChatScreenProps) {
  const { isSignedIn, isLoaded, user } = useUser();
  const insets = useSafeAreaInsets();

  const ariaTalking = useAriaStore((s) => s.ariaTalking);
  const setAriaTalking = useAriaStore((s) => s.setAriaTalking);
  const [ariaFrame, setAriaFrame] = useState(0);

  // Shared store so transcript stays in sync
  const addMessage = useMessagesStore((s: MessagesStore) => s.addMessage);
  const replaceThinking = useMessagesStore((s: MessagesStore) => s.replaceThinking);

  // Voice PTT
  const { toggleVoiceFlow, stopVoiceFlow, isListening, isSpeaking } = useVoiceFlow(
    addMessage,
    replaceThinking,
    user?.id
  );

  // Mouth animation when speaking
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (ariaTalking) {
      interval = setInterval(
        () => setAriaFrame((p) => (p + 1) % ariaImages.length),
        180
      );
    } else {
      setAriaFrame(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ariaTalking]);

  // Reflect speaking into ariaTalking
  useEffect(() => {
    setAriaTalking(!!isSpeaking);
  }, [isSpeaking, setAriaTalking]);

  // Stop voice when page deactivates or unmounts
  useEffect(() => {
    if (!isActive && isListening) {
      stopVoiceFlow?.();
    }
    return () => {
      stopVoiceFlow?.();
    };
  }, [isActive, isListening, stopVoiceFlow]);

  const pressLockRef = useRef(false);

  if (!isLoaded || !isSignedIn) return null;

  const pttLabel = isSpeaking
    ? '🔊 Speaking…'
    : isListening
    ? '🎙️ Listening… tap to stop'
    : '🎤 Tap to Talk';

  const pttBg = isSpeaking ? '#5a7' : isListening ? '#0A6' : '#246';

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      {/* Decorative background on top of global gradient (doesn't intercept taps) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={require('@/assets/main_ui/Branch_Background.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>

      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Character */}
        <View style={styles.characterWrap} pointerEvents="none">
          <Image source={ariaImages[ariaFrame]} style={styles.ariaImage} resizeMode="contain" />
        </View>

        {/* Push-to-talk */}
        <View style={styles.pttButtonWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.pttButton, { backgroundColor: pttBg }]}
            onPress={() => {
              if (pressLockRef.current) return;
              pressLockRef.current = true;
              setTimeout(() => (pressLockRef.current = false), 250);
              toggleVoiceFlow?.();
            }}
            activeOpacity={0.9}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Text style={styles.pttButtonText}>{pttLabel}</Text>
          </TouchableOpacity>

          {!!onNavigateToTranscript && (
            <TouchableOpacity onPress={onNavigateToTranscript} style={{ marginTop: 10 }}>
              <Text style={styles.subtle}>View Transcript →</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, width: '100%', height: '100%' },

  characterWrap: {
    position: 'absolute',
    left: (W - ARIA_WIDTH) / 2,
    bottom: H * 0.03,
    width: ARIA_WIDTH,
    height: ARIA_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  ariaImage: { width: ARIA_WIDTH, height: ARIA_HEIGHT },

  pttButtonWrap: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    bottom: H * 0.13,
    zIndex: 15,
  },
  pttButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  pttButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  subtle: { marginTop: 8, color: '#fff', opacity: 0.9, fontWeight: '700' },
});
