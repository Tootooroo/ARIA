import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text } from "react-native";

const { width } = Dimensions.get("window");

type AboutContentProps = {
  noTitle?: boolean;
};

function PrivacyStatement({}: AboutContentProps) {
  return (
    <ScrollView
      style={{ maxHeight: width > 480 ? 630 : 540 }}
      contentContainerStyle={{ padding: 26 }}
    >
      <Text style={styles.body}>
        Your privacy, security, and trust are at the heart of everything we build in ARIA.
        This page explains how your information is handled across Learn, Practice (simulated market + Paper Trading),
        Journal, and Progress.
      </Text>

      <Text style={styles.sectionHeader}>1) Your conversations are private</Text>
      <Text style={styles.body}>
        We never sell your data or use your chat content for advertising. Your messages are used
        only to provide features you enable (answers, planning, risk/sizing helpers, journaling, etc.).
        When AI providers process text to generate replies, it is transmitted securely. We aim to minimize
        retention and do not allow providers to use your content for their advertising.
      </Text>

      <Text style={styles.sectionHeader}>2) What we collect</Text>
      <Text style={styles.body}>We collect only what’s needed to run the app:</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Chat history (optional):</Text> So you can revisit prior conversations and plans.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Learn & Progress state:</Text> lessons completed, quiz attempts/accuracy,
        unique questions answered correctly, and your learning streak.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Practice & Paper Trading:</Text> simulated orders, positions, and related settings
        (e.g., quantity, account size, risk %, entry/stop/target) plus optional journal notes attached to trades.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• App usage & diagnostics:</Text> anonymized data that helps us fix bugs, improve
        performance, and understand which features are helpful.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Device info (limited):</Text> e.g., OS version and basic device type for
        compatibility and performance.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Optional profile info:</Text> if you add a name or preferences, we use them only to
        personalize your experience.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Optional broker data (future/opt-in):</Text> if you later connect a supported broker,
        we may access read-only balances, positions, and orders strictly to display and (if you explicitly enable it)
        place live orders under your risk rules. Credentials/tokens are stored securely and never sold.
      </Text>

      <Text style={styles.sectionHeader}>3) Where your data lives</Text>
      <Text style={styles.body}>
        Most state for learning and practice (e.g., paper.enabled, lesson progress, streak day) is stored on-device
        using secure storage. Simulated market data is generated for educational practice and may be refreshed in-app.
        If you sign in or enable cloud backup in the future, certain data may sync to our servers so it’s available
        across devices, protected by authentication and encryption.
      </Text>

      <Text style={styles.sectionHeader}>4) Your control</Text>
      <Text style={styles.body}>
        You can reset Paper Trading, clear journal notes, and (when available) delete chats and learning data from
        within the app. You may also request full account deletion. We’ll remove associated personal data unless
        retention is legally required (e.g., for fraud prevention or compliance if live brokerage features are enabled).
      </Text>

      <Text style={styles.sectionHeader}>5) Permissions</Text>
      <Text style={styles.body}>
        Notifications, microphone/voice, and similar permissions are optional and requested only when a feature needs
        them. You can enable or disable these at any time in your device settings.
      </Text>

      <Text style={styles.sectionHeader}>6) How we use your data</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• To power your experience:</Text> conversational help, simulated practice, risk
        sizing (1R), pre-trade checks, journaling, and progress tracking.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• To improve quality:</Text> bug fixes, performance, and design—guided by anonymous,
        aggregate diagnostics and your feedback.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Never for ads or selling:</Text> we do not sell your personal data.
      </Text>

      <Text style={styles.sectionHeader}>7) Security</Text>
      <Text style={styles.body}>
        Data is encrypted in transit and stored using secure services. Access is limited to authorized systems and
        personnel with a need to know. We review and update security controls on a regular cadence.
      </Text>

      <Text style={styles.sectionHeader}>8) Data retention</Text>
      <Text style={styles.body}>
        We retain data only as long as necessary to provide the app and comply with law. Simulated trading history and
        learn/progress state persist until you reset or delete them. If you request deletion of your account, we remove
        associated personal data unless retention is required by law or for security.
      </Text>

      <Text style={styles.sectionHeader}>9) Simulated vs. live trading</Text>
      <Text style={styles.body}>
        ARIA’s practice tools use a simulated market for education. Any future live trading integrations will be strictly
        opt-in with explicit risk controls (e.g., 1R sizing, daily loss limits) and clear logs of actions taken. All
        investing involves risk; no strategy or AI can guarantee profits.
      </Text>

      <Text style={styles.sectionHeader}>10) Children</Text>
      <Text style={styles.body}>
        The app is not intended for children under the age of 13. If we learn we’ve
        collected personal information from a child, we’ll delete it.
      </Text>

      <Text style={styles.sectionHeader}>11) Policy updates</Text>
      <Text style={styles.body}>
        We may update this statement as the app evolves. We’ll notify you of material changes and keep this page current
        so you can make informed choices.
      </Text>

      <Text style={styles.sectionHeader}>12) Contact</Text>
      <Text style={styles.body}>
        Questions, feedback, or data requests? Contact us through jtjrjtjr0000@gmail.com. We’re here to help.
      </Text>

      <Text style={styles.ending}>
        Thank you for trusting ARIA. Your privacy and peace of mind come first.
      </Text>
    </ScrollView>
  );
}

export default PrivacyStatement;

const styles = StyleSheet.create({
  container: { padding: 26, backgroundColor: "transparent", flex: 1 },
  subtitle: { fontWeight: "bold", fontSize: 26, color: "#FFA842", marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontWeight: "bold", fontSize: 18, marginTop: 14, marginBottom: 7, color: "#FFD07B" },
  bold: { fontWeight: "bold", color: "#FFA842" },
  italic: { fontStyle: "italic", color: "#ccc" },
  body: { color: "#fff", fontSize: 15.5, lineHeight: 25, marginBottom: 9 },
  ending: { marginTop: 16, marginBottom: 24, fontWeight: "bold", color: "#FFA842", fontSize: 16, textAlign: "center" },
});
