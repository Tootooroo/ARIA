import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width, height } = Dimensions.get("window");

const WelcomeScreen: React.FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        {/* Top-only PNG gradient, absolutely positioned */}
        <Image
          source={require("../assets/main_ui/Background_Gradient.png")}
          style={styles.bgImage}
          resizeMode="cover"
        />

        {/* Logo and Title */}
        <Image
          source={require("../assets/main_ui/APP_LOGO.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ height: height * 0.15 }} /> {/* Spacer */}
        <Text style={styles.header}>ARIA</Text>
        <Text style={styles.subheader}>Your AI Companion.</Text>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.loginButton}
              activeOpacity={0.85}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signupButton}
              activeOpacity={0.85}
              onPress={() => router.push("/signup")}
            >
              <Text style={styles.signupText}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => alert("Support coming soon!")}
            >
              <Text style={styles.footerText}>Need Help?</Text>
            </TouchableOpacity>
            <Text style={styles.betaText}>Beta 1.0.1 Version</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#fff",
    },
    background: {
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-start",
    },
    bgImage: {
      position: "absolute",
      top: -65,
      left: 0,
      width: width,
      height: height * 0.8, // Dynamic height based on screen
      zIndex: -1,
    },
    logo: {
      width: width * 0.75,     // Scales with screen size
      height: height * 0.38,   // Scales with screen size
      marginTop: height * 0.01,
      alignSelf: "center",
      zIndex: 1,
    },
    header: {
      fontSize: width * 0.20, // Responsive font size
      fontWeight: "bold",
      marginTop: -200,
      color: "#fff",
      textShadowColor: "rgba(18, 17, 17, 0.23)",
      textShadowOffset: { width: 1, height: 2 },
      textShadowRadius: 8,
      letterSpacing: 1,
    },
    subheader: {
      fontSize: width * 0.032,
      fontWeight: "bold",
      marginTop: 5,
      color: "#000",
      textShadowColor: "rgba(4, 1, 1, 0.18)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    buttonGroup: {
      marginTop: height * 0.15,
      width: "100%",
      alignItems: "center",
    },
    loginButton: {
      width: width * 0.5,
      height: 50,
      borderRadius: 35,
      backgroundColor: "#FFA842",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      shadowColor: "#FFA842",
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 7,
    },
    loginText: {
      color: "#fff",
      fontSize: width * 0.065,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
    signupButton: {
      width: width * 0.5,
      height: 50,
      borderRadius: 35,
      backgroundColor: "#D3D3D3",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#111",
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 7,
    },
    signupText: {
      color: "#444",
      fontSize: width * 0.06,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
    footer: {
      position: "absolute",
      bottom: Platform.OS === "ios" ? 38 : 25,
      width: "100%",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    footerText: {
      fontSize: width * 0.025,
      color: "#444",
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 8,
    },
    betaText: {
      fontSize: width * 0.03,
      fontWeight: "500",
      color: "#111",
      textAlign: "right",
      marginBottom: -14,
    },
  }
);

export default function Page() {
  return <WelcomeScreen />;
}
