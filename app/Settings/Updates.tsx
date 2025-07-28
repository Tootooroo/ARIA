import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text } from "react-native";

const { width } = Dimensions.get("window");

type AboutContentProps = {
    noTitle?: boolean;
  };
  
function Updates({ }: AboutContentProps) {
  return (
    <ScrollView style={{ maxHeight: width > 480 ? 630 : 540 }}>

<Text style={styles.header}>
        Aria is always evolving! Here you’ll find details on our current version, what’s next, and the exciting future we’re building together. {'\n'}The journey has just begun!
      </Text>

      <Text style={styles.sectionHeader}>Current Version: <Text style={styles.bold}>Beta 1.0.1</Text></Text>
      <Text style={styles.body}>
        • Aria character model (2D animated){'\n'}
        • Base theme and user interface{'\n'}
        • Unlimited conversation history{'\n'}
        • Unlimited AI questions, always available, any time{'\n'}
        • English language support (more coming soon){'\n'}
        • Photo support{'\n'}
        • Smart scheduling, reminders, and calendar{'\n'}
        • control device basics (open apps, reminders, etc.){'\n'}
        • Modern settings menu and user features{'\n'}
        • Full privacy and About pages{'\n'}
        • Direct user feedback and support—your ideas matter!
      </Text>

      <Text style={styles.sectionHeader}>Coming Next: <Text style={styles.bold}>Beta 1.0.2</Text></Text>
      <Text style={styles.body}>
        • All settings and menu buttons activated{'\n'}
        • Smarter device controls and actions{'\n'}
        • Theme/background color selection{'\n'}
        • Character switching and new looks{'\n'}
        • Start 3D Aria character rendering{'\n'}
        • Multi-language UI and voice options{'\n'}
        • Compact mode for faster access{'\n'}
        • Better notifications and alerts{'\n'}
        • Multifactor authentication{'\n'}
        • UI polish and smoother animations
      </Text>

      <Text style={styles.sectionHeader}>Planned for Upcoming Updates</Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>AI Features:</Text>{'\n'}
        • Proactive reminders and suggestions{'\n'}
        • Context-aware, multi-turn chat{'\n'}
        • Pick Aria’s personality and mood{'\n'}
        • Advanced voice, gender, and tone choices{'\n'}
        • Learning routines and coaching support{'\n'}
        • Voice commands for all device controls{'\n'}
        • In-app photo analysis and voice description
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>Character & Visuals:</Text>{'\n'}
        • Full 3D Aria with movement and emotion{'\n'}
        • Pop-up Aria mascot on homescreen{'\n'}
        • Use your own photos for Aria’s look{'\n'}
        • Virtual pet/mascot mode for fun{'\n'}
        • Unlockable outfits and custom styles
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>User Experience:</Text>{'\n'}
        • Offline mode for chat and reminders{'\n'}
        • Home screen widgets and shortcuts{'\n'}
        • Family/child safe content modes{'\n'}
        • Accessibility: big text, high contrast{'\n'}
        • Better onboarding and app tour
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>Community & Security:</Text>{'\n'}
        • In-app help and FAQ center{'\n'}
        • Detailed privacy and notification settings{'\n'}
        • Export/import and cross-device sync{'\n'}
        • Frequent security and bug updates{'\n'}
        • User badges, rewards, and public roadmap
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>And more!</Text>
        {'\n'}Have an idea? Tap feedback—help shape Aria’s future! All suggestions welcome!
      </Text>

      <Text style={styles.sectionHeader}>How We Build</Text>
      <Text style={styles.body}>
        Every update comes from your ideas and feedback. We roll out features step by step—always testing, always improving.
      </Text>
      
      <Text style={styles.ending}>
        Thanks for being a part of Aria’s journey!
        {'\n'}Stay tuned!!! This is only the beginning.
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