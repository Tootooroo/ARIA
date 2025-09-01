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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  FlatList as RNFlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScrollView as GScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Authentication
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

// Main UI page
import { useAriaStore } from '@/lib/voice/ariatalking';

// Shared messages store
import { useMessagesStore } from '@/lib/voice/messagesStore';

// User icon button & More icon button
import SettingsModal from '../user/SettingsModal';
import UserProfileModal from '../user/UserProfileModal';

const { height } = Dimensions.get('window');

const THINKING_MSG: ChatMessage = { role: 'assistant', content: '(thinking...)' };
const ERROR_MSG: ChatMessage = { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' };

type ClearableInputProps = {
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  editable?: boolean;
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
  editable = true,
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
        editable={editable}
      />
      {Platform.OS === 'android' && value.length > 0 && editable && (
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
  isActive?: boolean;
  pagerGestureRef?: React.RefObject<any>;
  isSwiping?: boolean;
  setPagerSwipeEnabled?: (enabled: boolean) => void;
}

const DEFAULT_WINDOW = 30;
const JUMP_BEFORE = 10;
const JUMP_SIZE = 40;

// Deep-search pool controls
const SEARCH_MIN_POOL = 400;
const SEARCH_MAX_POOL = 2000;
const SEARCH_STEP = 300;

export default function TranscriptPage({
  onNavigateToChat,
  isActive,
  pagerGestureRef,
}: TranscriptPageProps) {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const messages = useMessagesStore((s) => s.messages);
  const setAllMessages = useMessagesStore((s) => s.setAll);

  const [input, setInput] = useState('');
  const [sending, setLoading] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const flatListRef = useRef<RNFlatList<ChatMessage>>(null);

  const [activeModal, setActiveModal] = useState<'none' | 'profile' | 'settings'>('none');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Windowed rendering state
  const [displayStart, setDisplayStart] = useState(0);
  const [displayData, setDisplayData] = useState<ChatMessage[]>([]);

  // Deep-search flags
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchExhausted, setSearchExhausted] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const userId = user?.id || 'anonymous';

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    setSearchFocused(false);
  }, []);

  const openModal = useCallback((modalType: 'profile' | 'settings') => {
    dismissKeyboard();
    setActiveModal((prev) => {
      if (prev !== 'none' && prev !== modalType) {
        setTimeout(() => setActiveModal(modalType), 150);
        return 'none';
      }
      return prev === modalType ? 'none' : modalType;
    });
  }, [dismissKeyboard]);

  const closeModal = useCallback(() => setActiveModal('none'), []);

  const goBackToChat = useCallback(() => {
    dismissKeyboard();
    closeModal();
    if (onNavigateToChat) onNavigateToChat();
    else router.push('./chat');
  }, [dismissKeyboard, closeModal, onNavigateToChat, router]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/login');
  }, [isLoaded, isSignedIn, router]);

  // Profile load
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isLoaded || !isSignedIn || !user?.id) return;
      setProfileLoading(true);
      try {
        let profile = await getUserProfile(user.id);
        if (!profile) {
          const email = user.emailAddresses?.[0]?.emailAddress || '';
          const firstName = user.firstName || '';
          let generatedUsername = '';
          if (email) generatedUsername = email.split('@')[0];
          else if (firstName) generatedUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
          else generatedUsername = `user${Date.now()}`;

          const newProfileData = {
            email,
            firstName,
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

  // Debounce search typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch loop
  useEffect(() => {
    let interval: any;
    const fetchHistory = async () => {
      const history = await getUserMemory(userId, 100);
      setAllMessages(history);
    };

    if (isActive === false) return;

    fetchHistory();

    if (!debouncedSearch.trim()) {
      interval = setInterval(fetchHistory, 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, debouncedSearch, setAllMessages, userId]);

  // ---- Auto-scroll helpers ----
  const forceScrollRef = useRef(false);

  const scrollToBottom = useCallback((animated: boolean = true) => {
    // Try across a few frames to beat layout timing
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd?.({ animated });
      setTimeout(() => flatListRef.current?.scrollToEnd?.({ animated }), 16);
      setTimeout(() => flatListRef.current?.scrollToEnd?.({ animated }), 80);
    });
  }, []);

  // Display window helpers
  const resetToLast30 = useCallback(() => {
    const start = Math.max(0, messages.length - DEFAULT_WINDOW);
    setDisplayStart(start);
    setDisplayData(messages.slice(start));
    forceScrollRef.current = true;
  }, [messages]);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      resetToLast30();
    }
  }, [messages, debouncedSearch, resetToLast30]);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchExhausted(false);
      resetToLast30();
    }
  }, [debouncedSearch, resetToLast30]);

  // Chip indexes
  const searchIndexes = useMemo(
    () =>
      debouncedSearch.trim()
        ? messages.reduce((arr, msg, idx) => {
            const text = (msg?.content || '').toLowerCase();
            return text.includes(debouncedSearch.toLowerCase()) ? [...arr, idx] : arr;
          }, [] as number[])
        : [],
    [debouncedSearch, messages]
  );

  const MAX_VISIBLE = 10;
  const visibleIndexes = showAllMatches ? searchIndexes : searchIndexes.slice(0, MAX_VISIBLE);

  // Deep-search expansion
  const expandHistoryForSearch = useCallback(async () => {
    if (!debouncedSearch.trim()) return;
    if (messages.length >= SEARCH_MIN_POOL || searchExhausted) return;

    setSearchLoading(true);
    try {
      const target = Math.min(Math.max(SEARCH_MIN_POOL, messages.length + SEARCH_STEP), SEARCH_MAX_POOL);
      const expanded = await getUserMemory(userId, target);

      if (expanded.length <= messages.length) setSearchExhausted(true);
      setAllMessages(expanded);
    } catch {
      // ignore
    } finally {
      setSearchLoading(false);
    }
  }, [debouncedSearch, messages.length, searchExhausted, userId, setAllMessages]);

  useEffect(() => {
    if (debouncedSearch.trim()) void expandHistoryForSearch();
  }, [debouncedSearch, expandHistoryForSearch]);

  useEffect(() => {
    if (!debouncedSearch.trim()) return;
    const noMatches = searchIndexes.length === 0;
    if (noMatches && !searchLoading && !searchExhausted && messages.length < SEARCH_MAX_POOL) {
      void expandHistoryForSearch();
    }
  }, [debouncedSearch, searchIndexes.length, searchLoading, searchExhausted, messages.length, expandHistoryForSearch]);

  // Jump helper
  const jumpToAbsoluteIndex = useCallback((absIdx: number) => {
    const safeIdx = Math.max(0, Math.min(absIdx, messages.length - 1));
    const start = Math.max(0, safeIdx - JUMP_BEFORE);
    const end = Math.min(messages.length, start + JUMP_SIZE);
    setDisplayStart(start);
    setDisplayData(messages.slice(start, end));

    const localIndex = safeIdx - start;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex?.({
        index: Math.max(0, Math.min(localIndex, end - start - 1)),
        animated: true,
        viewPosition: 0.7,
      });
    }, 30);
  }, [messages]);

  const CONTEXT_WINDOW_SIZE = 20;

  // ---- SEND MESSAGE ----
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    dismissKeyboard();
    setLoading(true);

    const text = input;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };

    // Optimistic add user + thinking
    const liveBefore = useMessagesStore.getState().messages;
    const optimistic = [...liveBefore, userMsg, THINKING_MSG];
    setAllMessages(optimistic);
    setDisplayData((prev) => [...prev, userMsg, THINKING_MSG].slice(-DEFAULT_WINDOW));
    forceScrollRef.current = true;
    scrollToBottom(true);

    try {
      await storeUserMessage(userId, text);

      const fullHistory = await getUserMemory(userId, 200);
      const contextHistory = fullHistory.slice(-CONTEXT_WINDOW_SIZE);

      useAriaStore.getState().setAriaTalking(true);

      const replyText = await sendMessageToOpenAI([...contextHistory, userMsg]);

      await storeAssistantReply(userId, replyText);

      const assistantMsg: ChatMessage = { role: 'assistant', content: String(replyText ?? '') };

      // Replace THINKING with real reply
      const liveNow = useMessagesStore.getState().messages;
      const updated =
        liveNow.length > 0 &&
        liveNow[liveNow.length - 1].role === THINKING_MSG.role &&
        liveNow[liveNow.length - 1].content === THINKING_MSG.content
          ? [...liveNow.slice(0, -1), assistantMsg]
          : [...liveNow, assistantMsg];

      setAllMessages(updated);

      setDisplayData((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].content === THINKING_MSG.content) {
          const copy = prev.slice(0, -1);
          copy.push(assistantMsg);
          return copy.slice(-DEFAULT_WINDOW);
        }
        return [...prev, assistantMsg].slice(-DEFAULT_WINDOW);
      });

      forceScrollRef.current = true;
      scrollToBottom(true);
    } catch (error) {
      console.error('handleSend error', error);

      const live = useMessagesStore.getState().messages;
      const withError =
        live.length > 0 && live[live.length - 1]?.content === THINKING_MSG.content
          ? [...live.slice(0, -1), ERROR_MSG]
          : [...live, ERROR_MSG];

      setAllMessages(withError);
      setDisplayData((prev) => {
        if (prev.length > 0 && prev[prev.length - 1]?.content === THINKING_MSG.content) {
          const copy = prev.slice(0, -1);
          copy.push(ERROR_MSG);
          return copy.slice(-DEFAULT_WINDOW);
        }
        return [...prev, ERROR_MSG].slice(-DEFAULT_WINDOW);
      });

      forceScrollRef.current = true;
      scrollToBottom(true);
    } finally {
      useAriaStore.getState().setAriaTalking(false);
      setLoading(false);
    }
  }, [input, sending, dismissKeyboard, userId, setAllMessages, scrollToBottom]);

  const handleProfileUpdate = useCallback((updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      closeModal();
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [closeModal, signOut, router]);

  if (!isLoaded || !isSignedIn) return null;

  const modalOpen = activeModal !== 'none';

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      <ImageBackground
        source={require('@/assets/main_ui/Background_Gradient.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']} pointerEvents="box-none">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          >
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top }]} pointerEvents={modalOpen ? 'none' : 'auto'}>
              <TouchableOpacity onPress={() => openModal('profile')}>
                <Image source={require('@/assets/main_ui/User_Icon.png')} style={styles.usericon} />
              </TouchableOpacity>
              <View style={styles.searchInputWrap}>
                <ClearableInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search chat history..."
                  inputStyle={styles.searchBar}
                  editable={!modalOpen}
                  onFocus={() => {
                    if (modalOpen) closeModal();
                    setSearchFocused(true);
                  }}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>
              <TouchableOpacity onPress={() => openModal('settings')}>
                <Image source={require('@/assets/main_ui/More_icon.png')} style={styles.moreicon} />
              </TouchableOpacity>
            </View>

            {/* Search chips */}
            {search.trim() && searchFocused && (
              <View pointerEvents="box-none" style={[styles.searchOverlay, { top: insets.top + 55 }]}>
                <GScrollView
                  style={{ maxHeight: Math.min(180, height * 0.26) }}
                  contentContainerStyle={styles.searchChipsWrap}
                  keyboardShouldPersistTaps="handled"
                >
                  {visibleIndexes.map((absIdx) => {
                    const itm = messages[absIdx];
                    if (!itm) return null;
                    const preview = itm.content.length > 22 ? `${itm.content.slice(0, 22)}...` : itm.content;
                    return (
                      <TouchableOpacity
                        key={absIdx}
                        onPress={() => {
                          dismissKeyboard();
                          jumpToAbsoluteIndex(absIdx);
                        }}
                        style={styles.searchChip}
                      >
                        <Text style={styles.searchChipText} numberOfLines={1} ellipsizeMode="tail">
                          {preview}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {!showAllMatches && searchIndexes.length > MAX_VISIBLE && (
                    <TouchableOpacity onPress={() => setShowAllMatches(true)} style={styles.searchChip}>
                      <Text style={styles.searchChipText}>+{searchIndexes.length - MAX_VISIBLE} more...</Text>
                    </TouchableOpacity>
                  )}
                  {showAllMatches && searchIndexes.length > MAX_VISIBLE && (
                    <TouchableOpacity
                      onPress={() => setShowAllMatches(false)}
                      style={[styles.searchChip, { backgroundColor: '#ffbb5e' }]}
                    >
                      <Text style={[styles.searchChipText, { color: '#ad5c00' }]}>Show less</Text>
                      </TouchableOpacity>
                  )}

                  {searchLoading && (
                    <Text style={{ marginLeft: 6, marginTop: 4, color: '#ad5c00' }}>
                      searching deeper…
                    </Text>
                  )}
                  {!searchLoading && debouncedSearch.trim() && searchIndexes.length === 0 && searchExhausted && (
                    <Text style={{ marginLeft: 6, marginTop: 4, color: '#ad5c00' }}>
                      no older matches
                    </Text>
                  )}
                </GScrollView>
              </View>
            )}

            {/* Transcript List */}
            <View style={styles.transcriptContainer} pointerEvents={modalOpen ? 'none' : 'auto'}>
              <View style={styles.transcriptArea}>
                {displayData.length === 0 ? (
                  <Text style={{ color: '#bbb', alignSelf: 'center', marginTop: 20 }}>
                    No chat history yet.
                  </Text>
                ) : (
                  <RNFlatList
                    ref={flatListRef}
                    style={{ flex: 1 }}
                    data={displayData}
                    keyExtractor={(_, index) => index.toString()}
                    removeClippedSubviews
                    maxToRenderPerBatch={20}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={15}
                    windowSize={10}
                    nestedScrollEnabled
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => {
                      // If user just sent / a reply landed, or they're already at bottom, snap to bottom
                      if (forceScrollRef.current || isAtBottom) {
                        scrollToBottom(true);
                        forceScrollRef.current = false;
                      }
                    }}
                    renderItem={({ item }) => (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                        {item.role === 'user' ? (
                          <Text style={[styles.transcriptLine, styles.userText, { marginRight: 6 }]}>
                            You:{' '}
                          </Text>
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
                              search && item.content.toLowerCase().includes(search.toLowerCase())
                                ? { backgroundColor: '#ffecc5', borderRadius: 4 }
                                : {},
                            ]}
                          >
                            {item.content}
                          </Text>
                        </View>
                      </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    onScrollToIndexFailed={(info) => {
                      setTimeout(() => {
                        flatListRef.current?.scrollToOffset?.({
                          offset: info.averageItemLength * info.index,
                          animated: true,
                        });
                      }, 300);
                    }}
                    onScroll={(event) => {
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

            {/* Scroll to Bottom Arrow */}
            {displayData.length > 0 && !modalOpen && !isKeyboardVisible && (
              <TouchableOpacity
                onPress={() => {
                  dismissKeyboard();
                  forceScrollRef.current = true;
                  scrollToBottom(true);
                }}
                style={styles.scrollDownBtn}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontSize: 25, fontWeight: 'bold' }}>↓</Text>
              </TouchableOpacity>
            )}

            {/* Chat Bar */}
            <View
              style={[styles.chatBar, { marginBottom: isKeyboardVisible ? 0 : insets.bottom }]}
              pointerEvents={modalOpen ? 'none' : 'auto'}
            >
              <ClearableInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                placeholder="Type a message..."
                inputStyle={styles.input}
                editable={!modalOpen}
              />
              <TouchableOpacity onPress={handleSend} disabled={sending || modalOpen} style={styles.chatIconButton}>
                <Image
                  source={require('@/assets/main_ui/Chat_Icon.png')}
                  style={[styles.chatIcon, (sending || modalOpen) && { opacity: 0.5 }, { tintColor: '#fff' }]}
                />
              </TouchableOpacity>
            </View>

            <UserProfileModal
              visible={activeModal === 'profile'}
              onClose={closeModal}
              userProfile={userProfile}
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
              onChatHistoryDeleted={() => {
                setAllMessages([]);
                setDisplayData([]);
              }}
            />
            <SettingsModal visible={activeModal === 'settings'} onClose={closeModal} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 248, 238, 0.9)',
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

  searchOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 12,
    paddingHorizontal: 10,
  },
  searchChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 10,
    alignItems: 'flex-start',
  },
  searchChip: {
    backgroundColor: '#ffd98e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    margin: 2,
    minWidth: 60,
    maxWidth: 140,
    alignItems: 'center',
  },
  searchChipText: {
    color: '#de7600',
    fontWeight: 'bold',
    fontSize: 12,
    flexShrink: 1,
  },

  transcriptContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  transcriptArea: {
    flex: 1,
    backgroundColor: 'rgba(255, 204, 153, 0.85)',
    margin: 18,
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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

  scrollDownBtn: {
    position: 'absolute',
    right: 20,
    bottom: 95,
    backgroundColor: '#de7600',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  chatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 185, 128, 0.9)',
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
