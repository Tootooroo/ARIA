import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


const { width, height } = Dimensions.get("window");

const WelcomeScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("../assets/main_ui/Background_Gradient.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 50 }]}>
          <View style={styles.top}>
            {/* Logo and Title */}
            <Image
              source={require("../assets/main_ui/APP_LOGO.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.header}>ARIA</Text>
            <Text style={styles.subheader}>Your AI Companion.</Text>
          </View>

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
            {/* Footer absolutely at the bottom */}
              <View style={styles.footer}>
                <Text style={styles.betaText}>Beta 1.0.1 Version</Text>
              </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  };

  const styles = StyleSheet.create({
    bg: { flex: 1 },
    safe: {
      flex: 1,
      width: "100%",
    },
    content: {
      flex: 1,
      width: "100%",
      justifyContent: "space-between",
    },
    top: {
      alignItems: "center",
      marginTop: height * 0,
    },
    logo: {
      width: width * 0.75,
      height: height * 0.38, 
      alignSelf: "center",
      marginBottom: -60,
      marginTop: 30,
    },
    header: {
      fontSize: width * 0.20,
      fontWeight: "bold",
      color: "#fff",
      textShadowColor: "rgba(18, 17, 17, 0.23)",
    },
    subheader: {
      fontSize: width * 0.032,
      fontWeight: "bold",
      marginTop: 0,
      color: "#000",
      textShadowColor: "rgba(4, 1, 1, 0.18)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    buttonGroup: {
      marginTop: height * 0,
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
    betaText: {
      fontSize: width * 0.025,
      fontWeight: "500",
      color: "#111",
      textAlign: "right",
    },
  }
);

export default function Page() {
  return <WelcomeScreen />;
}
