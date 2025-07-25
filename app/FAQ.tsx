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
      answer: "ARIA is your personal AI companion. Whether you need help staying organized, want to chat, or are looking for answers, ARIA is here to support and connect with you; like a friendly sidekick, always at your fingertips."
    },
    {
      question: "How do I create an account?",
      answer: "Tap “Sign Up” on the home screen. Enter your email and a password, or use your Google account for quick registration. Once signed up, you'll be able to start chatting right away."
    },
    {
      question: "Is ARIA free to use?",
      answer: "ARIA is currently free for all users during our beta period. In the future, some advanced features may require a subscription. We’ll give you plenty of notice before making any changes."
    },
    {
      question: "How do I reset my password?",
      answer: "If you forget your password, just tap 'Forgot Password?' on the login screen. We'll send you a password reset email—follow the link inside to set a new password and regain access."
    },
    {
      question: "What platforms does ARIA support?",
      answer: "ARIA is available as a mobile app for both iOS and Android devices. We are working on bringing ARIA to more platforms in the future!"
    },
    {
      question: "Can I use ARIA on multiple devices?",
      answer: "Yes! Simply log into the same account on any supported device and your chat history will sync automatically."
    },
  
    // PRIVACY
    { section: "Privacy & Security" },
    {
      question: "Is my data private?",
      answer: "Yes—your privacy is extremely important to us. Your conversations are encrypted and can only be accessed by you. We do not sell, share, or use your personal data for advertising purposes. For more details, see our Privacy Policy."
    },
    {
      question: "Does ARIA store my chat history?",
      answer: "Yes, ARIA saves your chat history securely in the cloud so you can revisit previous conversations anytime. Only you have access to your chat logs."
    },
    {
      question: "How do I delete my account or data?",
      answer: "You can delete your account by navigating to User Settings > Delete Account. This will permanently remove all your data and conversations from our servers. If you have trouble, please contact support for help."
    },
    {
      question: "Does ARIA listen to my conversations when I’m not using the app?",
      answer: "No. ARIA only listens when you actively use the voice input feature. Your device’s microphone is never accessed in the background."
    },
  
    // FEATURES
    { section: "Features" },
    {
      question: "What can ARIA do?",
      answer: "ARIA can answer your questions, remind you about important tasks, help manage schedules, explain difficult concepts, and even provide casual conversation. We’re always adding new features—let us know what you’d like to see next!"
    },
    {
      question: "Can ARIA help me with homework or research?",
      answer: "Absolutely! ARIA can explain concepts, define terms, help brainstorm ideas, and support you with assignments across various subjects. Just ask your question, and ARIA will do its best to assist."
    },
    {
      question: "Does ARIA support voice input?",
      answer: "Yes! You can chat with ARIA by typing or speaking, as long as voice input is enabled on your device. Make sure to grant microphone permissions in your device settings."
    },
    {
      question: "Can I change ARIA’s avatar or voice?",
      answer: "Not yet, but customization options for avatar appearance and voice are coming soon! Stay tuned for updates."
    },
    {
      question: "How do I export my chat history?",
      answer: "This feature is not available yet, but we plan to add the ability to export conversations in future updates."
    },
    {
      question: "Does ARIA work offline?",
      answer: "No. ARIA requires an active internet connection to provide responses and save your chat history."
    },
  
    // TROUBLESHOOTING
    { section: "Troubleshooting" },
    {
      question: "I can’t log in—what should I do?",
      answer: "First, check that your email and password are correct. If you’ve forgotten your password, use the 'Forgot Password?' link to reset it. If you still can’t log in, make sure you have a stable internet connection or contact support for further help."
    },
    {
      question: "Why am I not receiving notification reminders?",
      answer: "Please make sure notifications are enabled for ARIA in your device’s settings. Also check your device’s 'Do Not Disturb' mode and confirm that ARIA has permission to send notifications."
    },
    {
      question: "The app is running slow or crashing—what should I do?",
      answer: "Try closing and reopening ARIA, and ensure your app is updated to the latest version. If problems persist, restart your device. If you’re still having trouble, please contact our support team with details about your device and the issue."
    },
    {
      question: "Some features aren’t working on my device.",
      answer: "Not all features are supported on every device or OS version. Make sure you’re running the latest version of ARIA and that your device’s operating system is up-to-date. Contact support if you believe a feature should be working but isn’t."
    },
    {
      question: "I see an error message or bug—how do I report it?",
      answer: "Please take a screenshot (if possible) and email us at jtjrjtjr0000@gmail.com with a description of what happened. We appreciate your feedback and will work to resolve issues quickly."
    },

    // ACCOUNT & BILLING
    { section: "Account & Billing" },
    {
      question: "Will ARIA ever charge me without my permission?",
      answer: "No. Any future paid features or subscriptions will be clearly communicated, and you’ll always be asked to confirm before being charged. There are no hidden fees."
    },
    {
      question: "How do I update my email or password?",
      answer: "You can update your email or password in Settings > Account. If you have trouble updating your info, reach out to our support team."
    },

    // GETTING HELP
    { section: "Getting Help" },
    {
      question: "How do I contact support?",
      answer: "You can reach our support team anytime by emailing jtjrjtjr0000@gmail.com. We strive to respond within 24 hours.",
    },
    {
      question: "How often does ARIA update?",
      answer: "We’re constantly working to improve ARIA, with updates released regularly. Make sure to keep your app up to date for new features and bug fixes.",
    },
    {
      question: "Where can I give feedback or suggestions?",
      answer: "We’d love to hear from you! Email us at jtjrjtjr0000@gmail.com or use the feedback form in the app if available."
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