import PagerView from 'react-native-pager-view';
import { useAuth } from '../lib/stayloggedin';
import ChatScreen from './chat';
import WelcomeScreen from './index';
import TranscriptScreen from './transcript';

export default function AppContent() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return null;

  return (
    !isLoggedIn ? (
      <WelcomeScreen />
    ) : (
      <PagerView style={{ flex: 1 }} initialPage={0}>
        <ChatScreen key="chat" />
        <TranscriptScreen key="transcript" />
      </PagerView>
    )
  );
}
