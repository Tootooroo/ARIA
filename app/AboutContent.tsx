import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

type AboutContentProps = {
    noTitle?: boolean;
  };
  
function AboutContent({ noTitle }: AboutContentProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>About This App</Text>

      <Text style={styles.body}>
        Welcome to your dream AI companion—a smart assistant, friendly partner, and caring helper, all in one place.
      </Text>

      <Text style={styles.body}>
        Imagine an AI that truly <Text style={styles.italic}>gets</Text> you: ready to listen, chat, motivate, organize, teach, and be there for you 24/7. With natural conversations, reminders, and unlimited curiosity, your AI is here to help you thrive, every single day.
      </Text>

      <Text style={styles.sectionHeader}>For Everyone, Everywhere</Text>

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
        <Text style={styles.bold}>• Special Needs: </Text>
        Gentle routines, encouragement, and a non-judgmental buddy who adapts to your pace.
      </Text>

      <Text style={styles.sectionHeader}>Why Choose Us?</Text>
      <Text style={styles.body}>• Deeply personalized. Change themes, backgrounds, and even your AI’s personality.</Text>
      <Text style={styles.body}>• Secure and private. Your conversations stay yours.</Text>
      <Text style={styles.body}>• Always improving. Your feedback shapes our future.</Text>

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
  title: { fontWeight: "bold", fontSize: 28, color: "#fff", marginBottom: 18, textAlign: "center" },
  sectionHeader: { fontWeight: "bold", fontSize: 20, marginTop: 18, marginBottom: 7, color: "#FFD07B" },
  bold: { fontWeight: "bold", color: "#FFA842" },
  italic: { fontStyle: "italic", color: "#fff" },
  body: { color: "#fff", fontSize: 17, lineHeight: 26, marginBottom: 10 },
  ending: { marginTop: 22, fontWeight: "bold", color: "#FFA842", fontSize: 17, textAlign: "center" },
});
