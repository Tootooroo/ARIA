import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FAQS = [
    // GENERAL
    { section: "General" },
    {
      question: "What is ARIA?",
      answer: "ARIA is your personal AI companion designed to help with information, organization, and fun conversations—available 24/7!",
    },
    {
      question: "How do I create an account?",
      answer: "Just tap “Sign Up” on the home screen and fill in your email and password. You can also sign up using your Google account.",
    },
    {
      question: "Is ARIA free to use?",
      answer: "Yes! The core features are free. Future premium features may be added, but you will always have access to ARIA’s basic chat.",
    },
    {
      question: "How do I reset my password?",
      answer: "Tap 'Forgot Password?' on the login screen and follow the instructions to reset your password via email.",
    },
    {
      question: "What platforms does ARIA support?",
      answer: "ARIA is available for both iOS and Android devices.",
    },
  
    // PRIVACY
    { section: "Privacy & Security" },
    {
      question: "Is my data private?",
      answer: "Yes. Your conversations are private and only accessible by you. We never share your personal data with third parties.",
    },
    {
      question: "Does ARIA store my chat history?",
      answer: "Yes, your chat history is securely stored so you can access past conversations at any time.",
    },
    {
      question: "How do I delete my account or data?",
      answer: "Go to Settings > Account, then choose 'Delete Account.' This will permanently erase your data and history.",
    },
  
    // FEATURES
    { section: "Features" },
    {
      question: "What can ARIA do?",
      answer: "ARIA can answer questions, help you plan your day, remind you of important tasks, and even have fun conversations. We’re always adding new features!",
    },
    {
      question: "Can ARIA help me with homework or research?",
      answer: "Yes! ARIA can explain concepts, provide definitions, and help with a variety of school subjects.",
    },
    {
      question: "Does ARIA support voice input?",
      answer: "Yes, you can chat with ARIA by typing or using voice input (if enabled on your device).",
    },
    {
      question: "Can I change ARIA’s avatar or voice?",
      answer: "Coming soon! We’re working on personalization features, including voice and character customization.",
    },
  
    // TROUBLESHOOTING
    { section: "Troubleshooting" },
    {
      question: "I can’t log in—what should I do?",
      answer: "Double-check your email and password. If you forgot your password, tap “Forgot Password?” for a reset link.",
    },
    {
      question: "Why am I not receiving notification reminders?",
      answer: "Ensure that ARIA has permission to send notifications in your device’s settings.",
    },
    {
      question: "The app crashed or froze!",
      answer: "Try restarting ARIA. If the issue continues, reinstall the app or contact us via the support form.",
    },
  
    // SUPPORT
    { section: "Getting Help" },
    {
      question: "How do I contact support?",
      answer: "Use the “Need Help?” button at the bottom of the login screen, or email us at support@aria-app.com.",
    },
    {
      question: "How often does ARIA update?",
      answer: "We’re always working to improve ARIA. Updates are released regularly—keep your app up-to-date for the best experience!",
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