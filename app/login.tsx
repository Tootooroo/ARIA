import { useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");

const LoginScreen: React.FC = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!isLoaded) return;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await signIn.create({
        identifier: email.toLowerCase().trim(),
        password,
      });

      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        router.replace('/chat');          // <-- go right to the chat page
        return;
      }
    } catch (err: any) {
      const code = err?.errors?.[0]?.code;
      const msg  = err?.errors?.[0]?.message || 'Login failed. Try again.';
      if (code === 'session_exists') {
        router.replace('/chat');        // already signed-in → straight to chat
        return;
      }
      if (code === 'form_identifier_not_found') {
        setError('Account not found. Please sign up first.');
      } else if (code === 'form_password_incorrect') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // CHANGE: Fix back navigation to slide from left
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <ImageBackground
      source={require("../assets/main_ui/BACKGROUND.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* BACK BUTTON */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* Everything centered here */}
            <View style={styles.centerWrap}>
              <Image
                source={require("../assets/main_ui/aria_mouthopen.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.header}>Log in to ARIA</Text>

              <View style={styles.formGroup}>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.inputPassword}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(prev => !prev)}
                    disabled={loading}
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
                  </TouchableOpacity>
                </View>

                {/* Remember me checkbox */}
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <View style={[styles.checkboxBox, rememberMe && styles.checkboxBoxChecked]}>
                      {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Stay signed in</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.signUpPrompt}>
                <Text style={styles.promptText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                  <Text style={styles.signupText}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

            {/* Footer stays at the bottom */}
            <View style={styles.bottomAction}>
              <TouchableOpacity
                style={[styles.LogInButton, loading && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.LogInText}>
                  {loading ? "Signing in..." : "Log in"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/FAQ")}>
                <Text style={styles.footerText}>Need Help?</Text>
              </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : 28,
    left: 10,
    paddingTop: 10,
    zIndex: 2,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    paddingTop: 20,
  },
  logo: {
    width: 220,
    height: 220,
    marginTop: 70,
    alignSelf: "center",
  },
  header: {
    fontSize: width * 0.1,
    fontWeight: "bold",
    marginTop: -35,
    color: "#fff",
    alignSelf: "center",
    textShadowColor: "rgba(18, 17, 17, 0.23)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
    marginBottom: 10,
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
    marginBottom: 10,
    fontWeight: "600",
    color: "#222",
    elevation: 1.5,
    shadowColor: "#e4c2a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    marginBottom: 10,
    elevation: 1.5,
    shadowColor: "#e4c2a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  inputPassword: {
    flex: 1,
    fontSize: width * 0.04,
    fontWeight: "600",
    color: "#222",
    paddingVertical: height * 0.018,
    paddingHorizontal: width * 0.045,
    backgroundColor: "#fff",
    borderRadius: 28,
  },
  eyeIcon: {
    padding: 12,
    position: "absolute",
    right: 0,
    top: 0,
    height: "100%",
    justifyContent: "center",
  },
  forgotText: {
    color: "#111",
    fontSize: width * 0.028,
    alignSelf: "center",
    fontWeight: "500",
    textShadowColor: "rgba(18,17,17,0.08)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  LogInButton: {
    backgroundColor: "#FFA842",
    borderRadius: 35,
    width: width * 0.5,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    alignSelf: "center",
    shadowColor: "#ffa842",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  LogInText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width * 0.058,
    letterSpacing: 0.5,
  },
  signUpPrompt: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    alignSelf: "flex-start",
    marginTop: 8,
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
  bottomAction: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // flush with the screen
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingBottom: 0, // more gap if you want
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
  checkboxContainer: {
    width: width * 0.8,
    marginTop: 8,
    marginBottom: 40,
    alignItems: "flex-start",
    alignSelf: "center",
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#888",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxChecked: {
    backgroundColor: "#FFA842",
    borderColor: "#FFA842",
  },
  checkboxLabel: {
    fontSize: width * 0.03,
    color: "#444",
    fontWeight: "500",
  },
});

export default LoginScreen;