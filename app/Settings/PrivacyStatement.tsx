import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text } from "react-native";

const { width } = Dimensions.get("window");

type AboutContentProps = {
    noTitle?: boolean;
  };
  
function PrivacyStatement({ }: AboutContentProps) {
  return (
    <ScrollView style={{ maxHeight: width > 480 ? 630 : 540 }}>

      <Text style={styles.body}>
        Your privacy, security, and trust are at the heart of everything we do at Aria. This page explains how we handle your information and keep your data safe.
      </Text>

      <Text style={styles.sectionHeader}>1. Your Conversations Are Private</Text>
      <Text style={styles.body}>
        All chats and conversations with your AI companion are stored securely. We never sell your data or use your chat content for advertising. Your messages are only used to provide you with a better experience, improve AI accuracy, and allow you to access your own chat history.
      </Text>

      <Text style={styles.sectionHeader}>2. What Information We Collect</Text>
      <Text style={styles.body}>
        We collect:
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Chat history:</Text> So you can access your previous conversations anytime, on any device.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• App usage data:</Text> To understand which features are helpful, and to fix bugs or improve performance.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Device information:</Text> Limited technical details (like device type or OS version) to make sure the app works smoothly for everyone.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Optional profile info:</Text> If you choose to add your name or preferences, they are used only to personalize your experience.
      </Text>

      <Text style={styles.sectionHeader}>3. Your Data, Your Control</Text>
      <Text style={styles.body}>
        You can clear your chat history at any time in the app. Your account and all associated data can be deleted permanently by contacting us or using built-in app settings (coming soon). You always control your information.
      </Text>

      <Text style={styles.sectionHeader}>4. Notifications & Permissions</Text>
      <Text style={styles.body}>
        Notifications are optional. You can enable, disable, or customize them anytime in your device’s settings. The app will only request permissions needed to deliver features like reminders, notifications, or AI speech.
      </Text>

      <Text style={styles.sectionHeader}>5. How We Use Your Data</Text>
      <Text style={styles.body}>
        We use your data to:
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Power your personal AI experience</Text> (reminders, chat, recommendations, learning your preferences).
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Improve app quality</Text> through bug fixes, design updates, and new features—always driven by anonymous usage data and your feedback.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Never for advertising or selling.</Text>
      </Text>

      <Text style={styles.sectionHeader}>6. Secure by Design</Text>
      <Text style={styles.body}>
        All your conversations and data are encrypted in transit and stored securely using trusted cloud providers. We regularly update security protocols to keep your information safe.
      </Text>

      <Text style={styles.sectionHeader}>7. AI Speech & Language</Text>
      <Text style={styles.body}>
        When you use AI voice or change the app’s language, your speech input is processed securely for the purpose of providing responses. Language selection may affect which language models are used, but your voice data is never used for any other purpose.
      </Text>

      <Text style={styles.sectionHeader}>8. Feedback & Questions</Text>
      <Text style={styles.body}>
        Your feedback helps shape the future of Aria. If you have questions or want to request deletion of your data, please contact us anytime through the app or our website.
      </Text>

      <Text style={styles.sectionHeader}>9. Policy Updates</Text>
      <Text style={styles.body}>
        This privacy statement may be updated from time to time. We’ll always notify you of major changes and keep this page up to date, so you’re always in control.
      </Text>

      <Text style={styles.ending}>
        Thank you for trusting Aria. Your privacy and peace of mind are our priority—always.
      </Text>
    </ScrollView>
  );
}

export default PrivacyStatement;

const styles = StyleSheet.create({
  container: { padding: 26, backgroundColor: "transparent", flex: 1 },
  subtitle: { fontWeight: "bold", fontSize: 26, color: "#FFA842", marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontWeight: "bold", fontSize: 18, marginTop: 14, marginBottom: 7, color: "#FFD07B" }, // was 20/8
  bold: { fontWeight: "bold", color: "#FFA842" },
  italic: { fontStyle: "italic", color: "#ccc" },
  body: { color: "#fff", fontSize: 15.5, lineHeight: 25, marginBottom: 9 },
  ending: { marginTop: 16, marginBottom: 24, fontWeight: "bold", color: "#FFA842", fontSize: 16, textAlign: "center" },
});