import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text } from "react-native";

const { width } = Dimensions.get("window");

type AboutContentProps = {
  noTitle?: boolean;
};

function AboutContent({}: AboutContentProps) {
  return (
    <ScrollView
      style={{ maxHeight: width > 480 ? 630 : 540 }}
      contentContainerStyle={{ padding: 26 }}
    >
      <Text style={styles.subtitle}>Welcome to ARIA</Text>

      <Text style={styles.body}>
        Your focused AI copilot for learning, practice, and review. ARIA keeps things simple:
        learn the essentials, practice safely, journal honestly, and track progress with clear
        metrics.
      </Text>

      <Text style={styles.sectionHeader}>Built for real life</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Professionals:</Text> Draft, summarize, and plan without the fluff.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Families & learners:</Text> Clear explanations, patient tutoring, creative prompts.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Traders & investors:</Text> Practice with a simulated market, size by{" "}
        Risk “R”, check risk before every order, and journal each trade.
      </Text>

      <Text style={styles.sectionHeader}>What’s inside today</Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Conversational AI:</Text> Helpful, context-aware chat for answers, planning, and review.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Practice Trading:</Text> Simulated market feed, Quick Ticket,{" "}
        <Text style={styles.bold}>Position Sizing · Risk “R”</Text>, and{" "}
        <Text style={styles.bold}>Pre-Trade Risk Check</Text>.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Journal:</Text> Attach notes to trades to grade your execution and mindset.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Progress:</Text> Lessons completed, quiz accuracy/coverage, learning streak, badges, and an optional readiness checklist.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Paper Trading:</Text> Toggle on to track simulated cash, positions, and P&amp;L.
      </Text>

      <Text style={styles.sectionHeader}>Why ARIA</Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Personal:</Text> Adaptable tone and settings that match your style.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Transparent:</Text> Clear logs and controls—what happens and why.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Risk-first:</Text> Position sizing, 1R limits, and a pre-trade check built into the workflow.
      </Text>
      <Text style={styles.body}>
        • <Text style={styles.bold}>Privacy-aware:</Text> Features are opt-in; your data is used only to provide what you enable.
      </Text>

      <Text style={styles.body}>
        ARIA is here to reduce friction, build discipline, and help you practice the right way—before you ever risk real dollars.
      </Text>

      <Text style={styles.ending}>Ready when you are. Let’s get started.</Text>

      {/* Clear, consistent disclaimer (matches Practice/Progress wording) */}
      <Text style={[styles.body, { opacity: 0.9 }]}>
        <Text style={styles.bold}>Disclaimer:</Text> Educational use only. Not investment advice. Market data may be
        delayed or simulated. Paper Trading is optional and separate from any future live integrations. If you later connect
        a supported broker, automation remains off by default and requires explicit opt-in with your risk limits. All
        investing involves risk—no strategy can guarantee profits.
      </Text>
    </ScrollView>
  );
}

export default AboutContent;

const styles = StyleSheet.create({
  subtitle: {
    fontWeight: "bold",
    fontSize: 26,
    color: "#FFA842",
    marginBottom: 12,
    textAlign: "center",
  },
  sectionHeader: {
    fontWeight: "bold",
    fontSize: 20,
    marginTop: 20,
    marginBottom: 8,
    color: "#FFD07B",
  },
  bold: { fontWeight: "bold", color: "#FFA842" },
  italic: { fontStyle: "italic", color: "#ccc" },
  body: { color: "#fff", fontSize: 16, lineHeight: 26, marginBottom: 10 },
  ending: {
    marginTop: 16,
    marginBottom: 26,
    fontWeight: "bold",
    color: "#FFA842",
    fontSize: 18,
    textAlign: "center",
  },
});
