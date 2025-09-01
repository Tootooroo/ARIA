import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FAQS = [
  /* ======================== GENERAL ======================== */
  { section: 'General' },
  {
    question: 'What is ARIA?',
    answer:
      'ARIA is a free, AI-powered companion for learning and practicing trading. You can chat by text or voice, study lessons, paper trade in a realistic simulator, journal your trades, and track progress—all in one app.',
  },
  {
    question: 'Is ARIA really free?',
    answer:
      'Yes. ARIA is fully free right now. If we ever offer paid features in the future, we’ll announce them clearly and you’ll opt-in explicitly.',
  },
  {
    question: 'What devices are supported?',
    answer:
      'ARIA runs on iOS and Android. Just sign in with your account and your learning progress and practice data come with you.',
  },

  /* ======================== VOICE & CHAT ======================== */
  { section: 'Voice & Chat' },
  {
    question: 'How do I talk to ARIA with my voice?',
    answer:
      'Grant microphone permission when prompted, then tap the mic button in Chat. ARIA uses OpenAI for speech-to-text and replies in natural language.',
  },
  {
    question: 'Can ARIA explain trading concepts step-by-step?',
    answer:
      'Yes. Ask anything—from “what is risk-to-reward?” to “how do I size a position?”—and ARIA will break it down in simple steps. You can save notes in your Journal.',
  },

  /* ======================== PRACTICE TRADING ======================== */
  { section: 'Practice Trading' },
  {
    question: 'Is the trading real?',
    answer:
      'No—Practice Trading uses simulated prices and paper money that you control. The experience is designed to feel like a live market so you can build real skills without real risk.',
  },
  {
    question: 'How realistic is the simulator?',
    answer:
      'The simulator updates prices frequently and models market drift, volatility, beta, and long-term trend (EMA). Position P&L, cash, and equity update just like a brokerage account—only with paper funds.',
  },
  {
    question: 'What does the “Score” mean?',
    answer:
      'Score is a practice-only ranking (0–30) that blends simple momentum and trend. It is not investment advice. Use it to shortlist ideas, then rely on your risk rules.',
  },
  {
    question: 'How do I size my trades?',
    answer:
      'Open Practice Trading → “Position Sizing · Risk R”. Set Account and Risk %, then enter Entry and Stop. ARIA computes per-share risk, recommended size, and a target from your chosen R multiple.',
  },

  /* ======================== LEARNING FLOW ======================== */
  { section: 'Learning Flow' },
  {
    question: 'What should a beginner do first?',
    answer:
      'Start with Learn → Lessons (the 5 intro lessons). Then practice a few paper trades with the Quick Ticket, journal each one, and use Pre-Trade Risk Check to keep risk at or below 1R.',
  },
  {
    question: 'Where do I review my progress?',
    answer:
      'Go to Learn → Progress to see streaks, badges, quiz stats, and capstone readiness. The Journal page lets you reflect on your trades and improve your plan.',
  },

  /* ======================== ACCOUNT & PRIVACY ======================== */
  { section: 'Account & Privacy' },
  {
    question: 'How do I sign up / sign in?',
    answer:
      'We use Clerk for secure authentication. Create an account with email (or social sign-in if available), then you can use ARIA across devices.',
  },
  {
    question: 'How is my data stored?',
    answer:
      'Your practice data (like paper trades and journal notes) is stored securely in Firebase. Our serverless endpoints run on Vercel and keep API keys and secure operations on the server—never exposed in the app.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes. We don’t sell your data. Chats are processed via OpenAI to enable responses; we store only what’s needed to provide features like history, progress, and practice state.',
  },
  {
    question: 'How do I delete my data?',
    answer:
      'Open User Settings → Delete Account to remove your account and associated data. If you need help, contact support and we’ll assist.',
  },

  /* ======================== TROUBLESHOOTING ======================== */
  { section: 'Troubleshooting' },
  {
    question: 'The app isn’t responding or seems slow.',
    answer:
      'Check your internet connection, then try closing and reopening the app. Make sure you’re on the latest version. If it persists, restart your device and contact support with details.',
  },
  {
    question: 'I can’t sign in.',
    answer:
      'Verify your email and password, or use “Forgot Password” to reset. If you still can’t access your account, reach out to support.',
  },
  {
    question: 'Voice input isn’t working.',
    answer:
      'Ensure microphone permission is granted in your device settings. Then return to Chat and tap the mic again.',
  },

  /* ======================== PRICING ======================== */
  { section: 'Pricing' },
  {
    question: 'Will I ever be charged without permission?',
    answer:
      'Never. ARIA is currently free. If we introduce paid features later, you’ll see clear options and must opt-in.',
  },

  /* ======================== GETTING HELP ======================== */
  { section: 'Getting Help' },
  {
    question: 'How do I contact support or give feedback?',
    answer:
      'Email jtjrjtjr0000@gmail.com any time. Include screenshots if possible—we typically respond within 24 hours.',
  },
  {
    question: 'How often is ARIA updated?',
    answer:
      'We ship improvements regularly. Keep your app updated to get the latest learning content, simulator refinements, and fixes.',
  },
];
  
  export default function FAQScreen() {
    const router = useRouter();
  
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Frequently Asked Questions</Text>
        </View>
        <ScrollView contentContainerStyle={styles.faqWrap}>
          {FAQS.map((item, i) =>
            item.section ? (
              <Text key={i} style={styles.sectionHeader}>{item.section}</Text>
            ) : (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.question}>{item.question}</Text>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#FFE8CA",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: Platform.OS === "ios" ? 5 : 15,
      paddingBottom: 8,
      paddingHorizontal: 10,
      backgroundColor: "#FFDFAE",
      borderBottomWidth: 1,
      borderBottomColor: "#FFE8CA",
    },
    backButton: {
      paddingRight: 10,
      paddingVertical: 2,
    },
    headerText: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#222",
      flex: 1,
    },
    faqWrap: {
      padding: 22,
    },
    sectionHeader: {
      color: "#AD5C00",
      fontSize: 28,
      fontWeight: "bold",
      marginTop: 18,
      marginBottom: 10,
      letterSpacing: 0.5,
    },
    faqItem: {
      marginBottom: 30,
    },
    question: {
      fontWeight: "bold",
      color: "#DE7600",
      fontSize: 16,
      marginBottom: 6,
    },
    answer: {
      fontSize: 15,
      color: "#333",
      lineHeight: 21,
    },
  });