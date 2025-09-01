import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text } from "react-native";

const { width } = Dimensions.get("window");

type AboutContentProps = {
  noTitle?: boolean;
};

function Updates({}: AboutContentProps) {
  return (
    <ScrollView
      style={{ maxHeight: width > 480 ? 630 : 540 }}
      contentContainerStyle={{ padding: 26 }}
    >
      <Text style={styles.header}>
        ARIA is evolving fast. Here’s what’s live today and what’s coming next. Thanks for building with us!
      </Text>

      <Text style={styles.sectionHeader}>
        Current Version: <Text style={styles.bold}>Beta 1.0.1</Text>
      </Text>
      <Text style={styles.body}>
        • Conversational AI — helpful, clear, context-aware chat{"\n"}
        • Learn, Practice, Journal, Progress — a risk-first learning loop{"\n"}
        • Simulated Market — practice safely with Quick Ticket (Buy/Sell){"\n"}
        • Paper Trading toggle — reset account, track cash/equity/positions{"\n"}
        • Position Sizing by 1R — entry/stop/target, recommended shares, target price{"\n"}
        • Pre-Trade Risk Check — confirms size fits your 1R{"\n"}
        • In-app guides — “i” info messages for each section
      </Text>

      <Text style={styles.sectionHeader}>Coming soon</Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Reminders & routines:</Text> e.g., “Take a break at 3pm”, “Water plants on Sundays”.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>World clocks & timers:</Text> e.g., “Show Tokyo & NYC time”, “20-minute focus timer”.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>More integrations:</Text> calendars, notes, and richer data sources.
      </Text>

      <Text style={styles.sectionHeader}>How we build</Text>
      <Text style={styles.body}>
        We ship in small, reliable steps. Each release is tested, measured, and improved with your feedback.
        Stability, clarity, and privacy come first.
      </Text>

      <Text style={styles.ending}>
        Thanks for being part of ARIA’s journey—this is just the beginning.
      </Text>
    </ScrollView>
  );
}

export default Updates;

const styles = StyleSheet.create({
  container: { padding: 26, backgroundColor: "transparent", flex: 1 },
  subtitle: { fontWeight: "bold", fontSize: 26, color: "#FFA842", marginBottom: 12, textAlign: "center" },
  header: { fontWeight: "bold", fontSize: 18, textAlign: "center", marginTop: 14, marginBottom: 7, color: "#FFA842" },
  sectionHeader: { fontWeight: "bold", fontSize: 16, marginTop: 14, marginBottom: 7, color: "#FFD07B" },
  bold: { fontWeight: "bold", color: "#de7600" },
  italic: { fontStyle: "italic", color: "#ccc" },
  body: { color: "#fff", fontSize: 13, lineHeight: 23, marginBottom: 7 },
  ending: { marginTop: 14, marginBottom: 18, fontWeight: "bold", color: "#FFA842", fontSize: 14, textAlign: "center" },
});
