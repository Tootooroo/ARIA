import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';

import { useUserSync } from '@/lib/userSync';
import ChatScreen from './screens/chat';
import PracticeScreen from './screens/practice';
import TranscriptScreen from './screens/transcript';

export default function AppContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  useUserSync();

  // Allow children to enable/disable pager swipe gestures
  const setPagerSwipeEnabled = useCallback((enabled: boolean) => {
    // react-native-pager-view provides setScrollEnabled on the ref
    // (older versions call it "setScrollEnabled"; leaving optional chaining for safety)
    pagerRef.current?.setScrollEnabled?.(enabled);
  }, []);

  const setPageSafely = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(2, page)); // 3 pages
      if (clamped !== currentPage) {
        pagerRef.current?.setPage?.(clamped);
        setCurrentPage(clamped);
      }
    },
    [currentPage]
  );

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/login');
  }, [isLoaded, isSignedIn, router]);

  const handlePageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    setCurrentPage(e.nativeEvent.position);
  }, []);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!isSignedIn) return null;

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        scrollEnabled
        overdrag
        offscreenPageLimit={3}
        orientation="horizontal"
        layoutDirection="ltr"
        onPageSelected={handlePageSelected}
      >
        <View key="chat" style={{ flex: 1 }} pointerEvents="box-none">
          <ChatScreen
            isActive={currentPage === 0}
            isSwiping={true}
            onNavigateToTranscript={() => setPageSafely(1)}
            setPagerSwipeEnabled={setPagerSwipeEnabled}
          />
        </View>

        <View key="transcript" style={{ flex: 1 }} pointerEvents="box-none">
          <TranscriptScreen
            isActive={currentPage === 1}
            isSwiping={true}
            onNavigateToChat={() => setPageSafely(0)}
            setPagerSwipeEnabled={setPagerSwipeEnabled}
          />
        </View>

        <View key="practice" style={{ flex: 1 }} pointerEvents="box-none">
          <PracticeScreen
            isActive={currentPage === 2}
            isSwiping={true}
            setPagerSwipeEnabled={setPagerSwipeEnabled}
          />
        </View>
      </PagerView>
    </View>
  );
}
