import { useUser } from '@clerk/clerk-expo';
import { ActivityIndicator, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useUserSync } from '../lib/userSync';
import ChatScreen from './chat';
import WelcomeScreen from './index';
import TranscriptScreen from './transcript';

export default function AppContent() {
  const { isSignedIn, isLoaded } = useUser();
  useUserSync();

  console.log("🔍 AppContent - isSignedIn:", isSignedIn, "isLoaded:", isLoaded);

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
      <PagerView style={{ flex: 1 }} initialPage={0}>
        <ChatScreen key="chat" />
        <TranscriptScreen key="transcript" />
      </PagerView>
    )
  );
}