import { useUser } from '@clerk/clerk-expo';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useUserSync } from '../lib/userSync';
import ChatScreen from './chat';
import WelcomeScreen from './index';
import TranscriptScreen from './transcript';

export default function AppContent() {
  const { isSignedIn, isLoaded } = useUser();
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  useUserSync();

  console.log("🔍 AppContent - isSignedIn:", isSignedIn, "isLoaded:", isLoaded);

  // Functions to control page sliding
  const goToTranscript = () => {
    console.log("📱 AppContent: Navigating to transcript");
    pagerRef.current?.setPage(1);
    setCurrentPage(1);
  };

  const goToChat = () => {
    console.log("📱 AppContent: Navigating to chat");
    pagerRef.current?.setPage(0);
    setCurrentPage(0);
  };

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    !isSignedIn ? (
      <WelcomeScreen />
    ) : (
      <PagerView 
        ref={pagerRef}
        style={{ flex: 1 }} 
        initialPage={0}
        scrollEnabled={true}
        pageMargin={0}
        overdrag={false}
        offscreenPageLimit={1}
        orientation="horizontal"
        onPageSelected={(e) => {
          console.log("📱 Page changed to:", e.nativeEvent.position);
          setCurrentPage(e.nativeEvent.position);
        }}
      >
        <ChatScreen key="chat" onNavigateToTranscript={goToTranscript} />
        <TranscriptScreen key="transcript" onNavigateToChat={goToChat} />
      </PagerView>
    )
  );
}