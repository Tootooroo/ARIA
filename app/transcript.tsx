// OpenAI
import { sendMessageToOpenAI } from '@/lib/api';

// Memory
import type { ChatMessage, UserProfile } from '@/lib/memory';
import {
  createUserProfile,
  getUserMemory,
  getUserProfile,
  storeAssistantReply,
  storeUserMessage,
} from '@/lib/memory';

// React imports
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Authentication 
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

// Main UI page
import { useAriaStore } from '@/lib/ariatalking';

// User icon button & More icon button
import SettingsModal from "./SettingsModal";
import UserProfileModal from "./UserProfileModal";

const { width, height } = Dimensions.get("window");

type ClearableInputProps = {
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

function ClearableInput({
  value,
  onChangeText,
  placeholder,
  style,
  inputStyle,
  onSubmitEditing,
  onFocus,
  onBlur,
}: ClearableInputProps) {
  return (
    <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', position: 'relative' }, style]}>
      <TextInput
        style={[{ flex: 1, paddingRight: Platform.OS === 'ios' ? 0 : 32 }, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#ccc"
        clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {Platform.OS === 'android' && value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          style={{
            position: 'absolute',
            right: 6,
            height: '100%',
            justifyContent: 'center',
            paddingHorizontal: 8,
            zIndex: 2,
          }}
        >
          <Text style={{ fontSize: 18, color: '#bbb' }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface TranscriptPageProps {
  onNavigateToChat?: () => void;
}

export default function TranscriptPage({ onNavigateToChat }: TranscriptPageProps) {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setLoading] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false); 
  const insets = useSafeAreaInsets();
  const flatListRef = React.useRef<FlatList<ChatMessage>>(null);
  // Modal state management - only one modal can be open at a time
  const [activeModal, setActiveModal] = useState<'none' | 'profile' | 'settings'>('none');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

  // Performance optimization states
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Get the current user's Clerk ID
  const userId = user?.id || 'anonymous';

  // Function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setSearchFocused(false);
  };

  // Function to open modals with smooth transitions
  const openModal = (modalType: 'profile' | 'settings') => {
    dismissKeyboard();
    
    // If another modal is open, close it first then open the new one
    if (activeModal !== 'none' && activeModal !== modalType) {
      setActiveModal('none');
      // Small delay for smooth transition
      setTimeout(() => {
        setActiveModal(modalType);
      }, 150);
    } else {
      setActiveModal(modalType);
    }
  };

  // Function to close modal
  const closeModal = () => {
    setActiveModal('none');
  };

  // Function to go back to chat
  const goBackToChat = () => {
    console.log("🚀 Transcript: Going back to chat...");
    dismissKeyboard(); // Dismiss keyboard when navigating
    closeModal(); // Close any open modals
    if (onNavigateToChat) {
      onNavigateToChat();
    } else {
      // Fallback for standalone usage
      router.push('/chat');
    }
  };

  // Redirect if not logged-in
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/login');
  }, [isLoaded, isSignedIn]);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isLoaded || !isSignedIn || !user?.id) return;
      
      setProfileLoading(true);
      try {
        let profile = await getUserProfile(user.id);
        
        // If no profile exists, create one from Clerk data
        if (!profile && user) {
          const email = user.emailAddresses?.[0]?.emailAddress || '';
          const firstName = user.firstName || '';
          
          // Generate username from email or name
          let generatedUsername = '';
          if (email) {
            generatedUsername = email.split('@')[0]; // Use part before @
          } else if (firstName) {
            generatedUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
          } else {
            generatedUsername = `user${Date.now()}`;
          }
          
          const newProfileData = {
            email: email,
            firstName: firstName,
            lastName: user.lastName || '',
            displayName: user.fullName || firstName || '',
            username: generatedUsername,
            createdAt: Date.now(),
          };
          
          await createUserProfile(user.id, newProfileData);
          profile = await getUserProfile(user.id);
        }
        
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserProfile();
  }, [isLoaded, isSignedIn, user]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load history with pagination
  useEffect(() => {
    let interval: any;
    const fetchHistory = async () => {
      const history = await getUserMemory(userId, 100);
      setMessages(history);
      setHasMoreMessages(history.length === 100);
    };
    fetchHistory();

    // Reduced polling frequency
    if (!search.trim()) {
      interval = setInterval(() => {
        fetchHistory();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [search]);

  useEffect(() => {
    if (isAtBottom && !search.trim() && messages.length > 0) {
      const timeout = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages, search]);  
  
  // When search changes, reset "show all"
  useEffect(() => {
    setShowAllMatches(false);
  }, [debouncedSearch]);

  // Load more messages function
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || search.trim()) return;
    
    setLoadingMore(true);
    try {
      const moreMessages = await getUserMemory(userId, messages.length + 50);
      const newMessages = moreMessages.slice(messages.length);
      
      if (newMessages.length === 0) {
        setHasMoreMessages(false);
      } else {
        setMessages(moreMessages);
        setHasMoreMessages(newMessages.length === 50);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
    setLoadingMore(false);
  };

  // Search: Find indexes of all matches using debounced search
  const searchIndexes = useMemo(() =>
    debouncedSearch.trim()
      ? messages.reduce((arr, msg, idx) => (
          msg.content.toLowerCase().includes(debouncedSearch.toLowerCase()) ? [...arr, idx] : arr
        ), [] as number[])
      : []
  , [debouncedSearch, messages]);

  // Only top N visible if not showAllMatches
  const MAX_VISIBLE = 10;
  const visibleIndexes = showAllMatches ? searchIndexes : searchIndexes.slice(0, MAX_VISIBLE);
  const CONTEXT_WINDOW_SIZE = 20;

  // Send message, store to Firebase, recall ALL history
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    dismissKeyboard(); // Dismiss keyboard when sending
    setLoading(true);

    // 1. Store user message in Firebase
    await storeUserMessage(userId, input);

    // 2. Load ALL chat history from Firebase
    const fullHistory = await getUserMemory(userId, 200); // Increase as needed
    const contextHistory = fullHistory.slice(-CONTEXT_WINDOW_SIZE);

    // 3. Append "thinking..." for UI feedback
    setMessages([...fullHistory, { role: 'assistant', content: '(thinking...)' }]);
    setInput('');

    // START ANIMATION GLOBALLY:
    useAriaStore.getState().setAriaTalking(true);
    setIsAtBottom(true); // Pull screen to bottom

    try {
      // 4. Send last N messages (like ChatGPT context window)
    const reply = await sendMessageToOpenAI([
      ...contextHistory,
      { role: "user", content: input },
    ]);

    let replyContent = reply;

    // 5. Store AI reply in Firebase
    await storeAssistantReply(userId, replyContent);

    // 6. Load updated history and update UI
    const updatedHistory = await getUserMemory(userId, Math.max(200, messages.length + 2));
    setMessages(updatedHistory);
  } catch (error) {
    setMessages((prev) => [
      ...prev.slice(0, -1),
      { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' },
    ]);
  }
  // STOP ANIMATION after reply
  useAriaStore.getState().setAriaTalking(false);
  setLoading(false);
};

  // Optional: handle scroll to index failed (for search jump)
  const handleScrollToIndexFailed = (info: any) => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: true,
      });
    }, 300);
  };

  // Handle profile updates
  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      closeModal(); // Close any open modals
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <ImageBackground
      source={require('@/assets/main_ui/Background_Gradient.png')} // replace with actual filename
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}  edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
          {/* Left side tap zone for navigation */}
          <TouchableOpacity 
            style={styles.leftTapZone}
            onPress={goBackToChat}
            activeOpacity={0.1}
          />

        {/* Top Bar */}
        <View style={[styles.topBar, {paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => openModal('profile')}>
            <Image source={require('@/assets/main_ui/User_Icon.png')} style={styles.usericon} />
          </TouchableOpacity>
          <View style={styles.searchInputWrap}>
            <ClearableInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search chat history..."
              inputStyle={styles.searchBar}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
          <TouchableOpacity onPress={() => openModal('settings')}>
            <Image source={require('@/assets/main_ui/More_icon.png')} style={styles.moreicon} />
          </TouchableOpacity>
        </View>

        {/* Search Results: Jump to matching messages */}
        {search.trim() && searchIndexes.length > 0 && searchFocused && (
          <View
            style={{
              position: 'absolute',
              top: insets.top + 55, 
              left: 0,
              right: 0,
              maxHeight: 400,
              zIndex: 2,
            }}
          >
            <ScrollView
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingHorizontal: 10,
                paddingBottom: 10,
                alignItems: 'flex-start',
              }}
              horizontal={false}
              keyboardShouldPersistTaps="handled"
            >
              {visibleIndexes.map(idx => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.7 });
                  }}
                  style={{
                    backgroundColor: '#ffd98e',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    margin: 2,
                    minWidth: 60,
                    maxWidth: 110,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#de7600',
                      fontWeight: 'bold',
                      fontSize: 12, 
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    >{messages[idx].content.length > 22
                      ? messages[idx].content.slice(0, 22) + '...'
                      : messages[idx].content}
                  </Text>
                </TouchableOpacity>
              ))}
              {!showAllMatches && searchIndexes.length > MAX_VISIBLE && (
                <TouchableOpacity
                  onPress={() => setShowAllMatches(true)}
                  style={{
                    backgroundColor: '#ffd98e',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    margin: 2,
                  }}
                >
                  <Text style={{ color: '#de7600', fontWeight: 'bold', fontSize: 13 }}>
                    +{searchIndexes.length - MAX_VISIBLE} more...
                  </Text>
                </TouchableOpacity>
              )}
              {showAllMatches && searchIndexes.length > MAX_VISIBLE && (
                <TouchableOpacity
                  onPress={() => setShowAllMatches(false)}
                  style={{
                    backgroundColor: '#ffbb5e',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    margin: 2,
                  }}
                >
                  <Text style={{ color: '#ad5c00', fontWeight: 'bold', fontSize: 13 }}>
                    Show less
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Transcript List */}
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.transcriptContainer}>
            <View style={styles.transcriptArea}>
              {messages.length === 0 ? (
                <Text style={{ color: '#bbb', alignSelf: 'center', marginTop: 20 }}>
                  No chat history yet.
                </Text>
              ) : (
                <FlatList
                  ref={flatListRef}
                  style={{ flex: 1 }}
                  data={messages}
                  keyExtractor={(_, index) => index.toString()}

                    // Performance optimizations
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={20}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={15}
                    windowSize={10}
                    
                    // Load more functionality
                    onEndReached={loadMoreMessages}
                    onEndReachedThreshold={0.5}

                  renderItem={({ item, index }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                      {item.role === 'user' ? (
                        <Text style={[styles.transcriptLine, styles.userText, { marginRight: 6 }]}>You: </Text>
                      ) : (
                        <Image
                          source={require('@/assets/main_ui/aria_sleep.png')}
                          style={{ width: 22, height: 22, marginRight: 6, marginTop: -2, resizeMode: 'contain' }}
                        />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.transcriptLine,
                            item.role === 'user' ? styles.userText : styles.assistantText,
                            search &&
                            item.content.toLowerCase().includes(search.toLowerCase())
                              ? { backgroundColor: '#ffecc5', borderRadius: 4 }
                              : {}
                          ]}
                        >
                          {item.content}
                        </Text>
                      </View>
                    </View>
                  )}

                    // Loading indicator for pagination
                    ListFooterComponent={() => (
                      loadingMore ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Text style={{ color: '#666' }}>Loading more messages...</Text>
                        </View>
                      ) : !hasMoreMessages && messages.length > 50 ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Text style={{ color: '#666' }}>No more messages</Text>
                        </View>
                      ) : null
                    )}

                  contentContainerStyle={{ paddingBottom: 12 }}
                  keyboardShouldPersistTaps="handled"
                  onScrollToIndexFailed={handleScrollToIndexFailed}
                  onScroll={event => {
                    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
                    const paddingToBottom = 60; 
                    setIsAtBottom(
                      contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom
                    );
                  }}
                  scrollEventThrottle={100}
                />
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Scroll to Bottom Arrow */}
        {messages.length > 0 && (
          <TouchableOpacity
          onPress={() => {
            dismissKeyboard();
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          style={{
              position: 'absolute',
              right: 20,
              bottom: insets.bottom + 62,
              backgroundColor: '#de7600',
              borderRadius: 20,
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold' }}>↓</Text>
          </TouchableOpacity>
        )}
        
        {/* Chat Bar at the bottom */}
        <View style={[
          styles.chatBar,
          { marginBottom: insets.bottom }
        ]}>
          <ClearableInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            placeholder="Type a message..."
            inputStyle={styles.input}
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={sending} 
            style={styles.chatIconButton}
          >
            <Image
              source={require('@/assets/main_ui/Chat_Icon.png')}
              style={[styles.chatIcon, sending && { opacity: 0.5 }, { tintColor: '#fff' }]}
            />
          </TouchableOpacity>
        </View>
        <UserProfileModal
          visible={activeModal === 'profile'}
          onClose={closeModal}
          userProfile={userProfile}
          onLogout={handleLogout}
          onProfileUpdate={handleProfileUpdate}
          onChatHistoryDeleted={() => setMessages([])}
        />
        <SettingsModal
          visible={activeModal === 'settings'}
          onClose={closeModal}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  leftTapZone: {
    position: 'absolute',
    left: 5,
    top: height * 0.25,
    bottom: height * 0.25,
    width: 60,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 10,
  },
  usericon: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
  },
  moreicon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchBar: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255, 248, 238, 0.9)', // Glass transparency
    borderRadius: 20,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transcriptContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  transcriptArea: {
    flex: 1,
    backgroundColor: 'rgba(255, 204, 153, 0.85)', // Glass morphism transparency
    margin: 16,
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Glass border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  transcriptLine: {
    marginBottom: 14,
    fontSize: 16,
  },
  userText: {
    color: '#de7600',
    fontWeight: 'bold',
  },
  assistantText: {
    color: '#18435a',
  },
  chatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 185, 128, 0.9)', // Glass morphism
    borderRadius: 28,
    minHeight: 46,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 14,
    borderColor: '#de7600',
    borderWidth: 1,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chatIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  chatIconButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});