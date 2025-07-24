import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
<<<<<<< HEAD
import { useSafeAreaInsets } from "react-native-safe-area-context";
=======
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525

const { width, height } = Dimensions.get("window");

const SignupScreen: React.FC = () => {
  const router = useRouter();
<<<<<<< HEAD
  const insets = useSafeAreaInsets();
=======
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Your actual Google OAuth will need an external handler!
  const handleGoogleSignUp = () => {
    alert("Google sign up coming soon!");
  };

  const handleSignup = () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
<<<<<<< HEAD
=======
      <View style={styles.background}>
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
      {/* Back arrow */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
        <Ionicons name="chevron-back" size={28} color="#de7600" />
      </TouchableOpacity>
<<<<<<< HEAD
      
      <View style={styles.background}>

      {/* Centered Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.header}>Sign up for ARIA</Text>

          <View style={styles.formGroup}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Or Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          {/* Sign up with Google */}
          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.85}
            onPress={handleGoogleSignUp}
          >
            <AntDesign name="google" size={26} color="#444" />
            <Text style={styles.googleText}>Sign up with Google</Text>
          </TouchableOpacity>

          <View style={styles.signUpPrompt}>
            <Text style={styles.promptText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.signupText}> Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

        {/* Footer stays at bottom */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push("/FAQ")}>
            <Text style={styles.footerText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
=======

      {/* Header */}
      <Text style={styles.header}>Sign up for ARIA</Text>

      {/* Email/Password Inputs */}
      <View style={styles.formGroup}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {/* Password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Or Divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* Sign up with Google */}
        <TouchableOpacity
          style={styles.googleButton}
          activeOpacity={0.85}
          onPress={handleGoogleSignUp}
        >
          <AntDesign name="google" size={26} color="#" />
          <Text style={styles.googleText}>Sign up with Google</Text>
        </TouchableOpacity>

        <View style={styles.signUpPrompt}>
          <Text style={styles.promptText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.signupText}> Log In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => alert("Support coming soon!")}>
            <Text style={styles.footerText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </View>
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
    </SafeAreaView>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: "#FFB980", 
=======
    backgroundColor: "#FFB980", // your original background
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
  },
  background: {
    flex: 1,
    alignItems: "center",
<<<<<<< HEAD
    justifyContent: "center",
=======
    justifyContent: "flex-start",
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
    paddingTop: 100,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : 28,
    left: 10,
    zIndex: 2,
  },
<<<<<<< HEAD
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
=======
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
  header: {
    fontSize: width * 0.1,
    fontWeight: "bold",
    marginBottom: 20,
<<<<<<< HEAD
    marginTop: 20,
=======
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
    color: "#de7600",
    alignSelf: "center",
    textShadowColor: "rgba(18, 17, 17, 0.23)",
    textShadowOffset: { width: 2, height: 2 },
    letterSpacing: 1,
  },
  formGroup: {
    width: width * 0.85,
    marginTop: 2,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 28,
    fontSize: width * 0.04,
    paddingVertical: height * 0.018,
    paddingHorizontal: width * 0.045,
    marginBottom: 12,
    fontWeight: "600",
    color: "#222",
    elevation: 1.5,
    shadowColor: "#e4c2a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  button: {
    width: width * 0.75,
    height: 50,
    backgroundColor: "#FFA842",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
<<<<<<< HEAD
    marginTop: 120,
=======
    marginTop: 100,
>>>>>>> 862bc7f87e41e1f44a0aaeab006e8682877e9525
    marginBottom: 10,
    alignSelf: "center",
    shadowColor: "#ffa842",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width * 0.058,
    letterSpacing: 0.5,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    alignSelf: "center",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#de7600",
    marginHorizontal: 12,
    opacity: 0.6,
  },
  orText: {
    color: "#de7600",
    fontSize: width * 0.044,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 35,
    width: width * 0.75,
    height: 51,
    alignSelf: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#c1c1c1",
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    marginTop: 10,
  },
  googleText: {
    color: "#444",
    fontWeight: "bold",
    fontSize: width * 0.049,
    marginLeft: 13,
    letterSpacing: 0.3,
  },
  signUpPrompt: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    alignSelf: "flex-start", // FIXED from "left"
    marginTop: 20,
    marginLeft: width / 4,
  },
  promptText: {
    color: "#444",
    fontSize: width * 0.03,
    fontWeight: "500",
    textShadowColor: "rgba(18,17,17,0.08)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  signupText: {
    color: "#444",
    fontSize: width * 0.03,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginLeft: 10,
  },
  errorText: {
    color: "#B40020",
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 38 : 25,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: width * 0.025,
    color: "#444",
    fontWeight: "800",
    textAlign: "center",
  },
});
