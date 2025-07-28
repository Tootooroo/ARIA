import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text } from "react-native";

const { width } = Dimensions.get("window");

type AboutContentProps = {
    noTitle?: boolean;
  };
  
function AboutContent({ }: AboutContentProps) {
  return (
    <ScrollView style={{ maxHeight: width > 480 ? 630 : 540 }}>

      <Text style={styles.subtitle}>
        Welcome to your dream AI companion! 
      </Text>
        
      <Text style={styles.body}>
        A smart assistant, friendly partner, and caring helper, all in one place.
      </Text>

      <Text style={styles.body}>
        Imagine an AI that truly <Text style={styles.italic}>gets</Text> you: ready to listen, chat, motivate, organize, teach, and be there for you 24/7. With natural conversations, smart reminders, and unlimited curiosity, your AI is here to help you thrive, every single day.
      </Text>

      <Text style={styles.sectionHeader}>Designed For Everyone, Everywhere</Text>

      <Text style={styles.body}>
        <Text style={styles.bold}>• Professionals: </Text>
        Stay productive, organized, and inspired—let your AI handle reminders, emails, ideas, and mental breaks.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Families & Kids: </Text>
        Safe, fun conversations spark learning and friendship. Homework help, jokes, and new adventures await.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Seniors: </Text>
        A patient, friendly guide for tech, health, and daily life—plus, real companionship for every moment.
      </Text>
      <Text style={styles.body}>
        <Text style={styles.bold}>• Unique Needs: </Text>
        Gentle routines, encouragement, and a non-judgmental buddy who adapts to your pace.
      </Text>

      <Text style={styles.sectionHeader}>Why Choose Us?</Text>
      <Text style={styles.body}>• Truly personal: Customize themes, backgrounds, and even your AI’s personality.</Text>
      <Text style={styles.body}>• Peace of mind: Your data is secure and private. Your conversations stay yours.</Text>
      <Text style={styles.body}>• Grows with you:Our AI gets smarter, more helpful, and your feedback drives every update.</Text>

      <Text style={styles.body}>
        With our app, you never have to feel lost, lonely, or overwhelmed again. Discover your new AI best friend, helper, and coach—always there, always on your side.
      </Text>
      <Text style={styles.ending}>
        Welcome to a better, brighter you. Download now and let the journey begin!
      </Text>
    </ScrollView>
  );
}

export default AboutContent;

const styles = StyleSheet.create({
  container: { padding: 26, backgroundColor: "transparent", flex: 1 },
  subtitle: { fontWeight: "bold", fontSize: 26, color: "#FFA842", marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontWeight: "bold", fontSize: 20, marginTop: 20, marginBottom: 8, color: "#FFD07B" },
  bold: { fontWeight: "bold", color: "#FFA842" },
  italic: { fontStyle: "italic", color: "#ccc" },
  body: { color: "#fff", fontSize: 16, lineHeight: 26, marginBottom: 10 },
  ending: { marginTop: 16, marginBottom: 26, fontWeight: "bold", color: "#FFA842", fontSize: 18, textAlign: "center" },
});
