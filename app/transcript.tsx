// OpenAI
import { sendMessageToOpenAI } from '@/lib/api';

// Memory
import type { ChatMessage } from '@/lib/memory';
import {
  getUserMemory,
  storeAssistantReply,
  storeUserMessage,
} from '@/lib/memory';

// React imports
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Authentication 
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/stayloggedin';

// Main UI page
import { useAriaStore } from '@/lib/ariatalking';

// User icon button & More icon button
import SettingsModal from "./SettingsModal";
import UserProfileModal from "./UserProfileModal";

const userId = 'demo-user'; // Replace with your logic for real user ID

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

export default function TranscriptPage() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setLoading] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false); 
  const insets = useSafeAreaInsets();
  const flatListRef = React.useRef<FlatList<ChatMessage>>(null);
  const [showProfile, setShowProfile] = useState(false); // User Icon
  const [showSettings, setShowSettings] = useState(false); // Settings
  const [isAtBottom, setIsAtBottom] = useState(true); // Move screen to bottom
  const [searchFocused, setSearchFocused] = useState(false); // Make list invisible

  // Redirected if not logged in (fix)
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, loading]);

  // Load all history from firebase
  useEffect(() => {
    let interval: any;
    const fetchHistory = async () => {
      const history = await getUserMemory(userId, 10000);
      setMessages(history);
    };
    fetchHistory();

    // Only poll when search is empty
    if (!search.trim()) {
      interval = setInterval(() => {
        fetchHistory();
      }, 2000);
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
  }, [search]);

  // Search: Find indexes of all matches
  const searchIndexes = useMemo(() =>
    search.trim()
      ? messages.reduce((arr, msg, idx) => (
          msg.content.toLowerCase().includes(search.toLowerCase()) ? [...arr, idx] : arr
        ), [] as number[])
      : []
  , [search, messages]);

  // Only top N visible if not showAllMatches
  const MAX_VISIBLE = 10;
  const visibleIndexes = showAllMatches ? searchIndexes : searchIndexes.slice(0, MAX_VISIBLE);

  // Send message, store to Firebase, recall ALL history
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setLoading(true);

    // 1. Store user message in Firebase
    await storeUserMessage(userId, input);

    // 2. Load ALL chat history from Firebase
    const fullHistory = await getUserMemory(userId, 10000); // Increase as needed

    // 3. Append "thinking..." for UI feedback
    setMessages([...fullHistory, { role: 'assistant', content: '(thinking...)' }]);
    setInput('');

    // START ANIMATION GLOBALLY:
    useAriaStore.getState().setAriaTalking(true);
    setIsAtBottom(true); // Pull screen to bottom

    try {
      // 4. Send entire chat to OpenAI
      const aiReply = await sendMessageToOpenAI(fullHistory.concat([{ role: 'user', content: input }]));

      // 5. Store AI reply in Firebase
      await storeAssistantReply(userId, aiReply);

      // 6. Load updated history and update UI
      const updatedHistory = await getUserMemory(userId, 10000);
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

  if (loading || !isLoggedIn) return null;

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
        {/* Top Bar */}
        <View style={[styles.topBar, {paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setShowProfile(true)}>
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
          <TouchableOpacity onPress={() => setShowSettings(true)}>
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

        {/* Scroll to Bottom Arrow */}
        {messages.length > 0 && (
          <TouchableOpacity
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
          <TouchableOpacity onPress={handleSend} disabled={loading} style={styles.chatIconButton}>
            <Image
              source={require('@/assets/main_ui/Chat_Icon.png')}
              style={[styles.chatIcon, loading && { opacity: 0.5 }, { tintColor: '#fff' }]}
            />
          </TouchableOpacity>
        </View>
        <UserProfileModal
          visible={showProfile}
          onClose={() => setShowProfile(false)}
          userName="Ricky"
          userEmail="demoemail123@gmail.com"
          onLogout={() => alert("Logged out!")}
        />
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
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
    backgroundColor: '#fff8ee',
    borderRadius: 17,
    height: 35,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'center',
  },
  transcriptContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  transcriptArea: {
    flex: 1,
    backgroundColor: '#ffcc99',
    margin: 16,
    borderRadius: 28,
    padding: 18,
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
    backgroundColor: '#FFB980',
    borderRadius: 24,
    minHeight: 40,
    marginHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    paddingHorizontal: 14,
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