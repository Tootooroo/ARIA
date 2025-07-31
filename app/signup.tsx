import { createUserProfile } from "@/lib/memory";
import { isUsernameAppropriate } from "@/lib/profanityFilter";
import { useAuth, useSignUp } from '@clerk/clerk-expo';
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const SignupScreen: React.FC = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleGoogleSignUp = async () => {
    Alert.alert("Hang tight, Coming Soon!");
    // Implement with Clerk OAuth if you wish
  };

  const handleSignup = async () => {
    if (!isLoaded) {
      console.log("❌ Clerk not loaded yet");
      return;
    }

    // Check if user is already signed in
    if (isSignedIn) {
      Alert.alert(
        "Already Signed In", 
        "You're already signed in. Would you like to sign out and create a new account?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Sign Out", 
            onPress: async () => {
              await signOut();
              setError("");
            }
          }
        ]
      );
      return;
    }

    if (!signUp) {
      console.log("❌ SignUp object is null");
      setError("Authentication not initialized. Please restart the app.");
      return;
    }

    console.log("✅ Clerk loaded, signUp object exists");

    if (!username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate username
    const usernameValidation = isUsernameAppropriate(username);
    if (!usernameValidation.isValid) {
      setError(usernameValidation.reason || "Invalid username.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      console.log("🔐 Creating signup with email:", email.toLowerCase().trim());
      console.log("🔐 Password length:", password.length);
      
      const result = await signUp.create({
        emailAddress: email.toLowerCase().trim(),
        password,
      });

      console.log("📋 Signup result status:", result.status);
      console.log("📋 Full signup result:", JSON.stringify(result, null, 2));

      if (result.status === 'missing_requirements') {
        console.log("📧 Preparing email verification");
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setVerifying(true);
        Alert.alert("Check Your Email", `We sent a verification code to ${email}`);
      } else if (result.status === 'complete') {
        console.log("✅ Signup complete immediately");
        await setActive({ session: result.createdSessionId });

        // Create user profile with username
        try {
          await createUserProfile(result.createdUserId!, {
            email: email.toLowerCase().trim(),
            username: username.toLowerCase().trim(),
            displayName: username.trim(),
            createdAt: Date.now(),
          });
          console.log("✅ User profile created with username");
        } catch (profileError) {
          console.error("❌ Failed to create user profile:", profileError);
          // Don't block signup for profile creation failure
        }
        
        Alert.alert("Welcome!", "Account created successfully!", [
          { text: "Continue", onPress: () => router.replace("/AppContent") }
        ]);
      }
    } catch (err: any) {
      console.error("❌ Signup error:", JSON.stringify(err, null, 2));
      
      if (err.errors && err.errors.length > 0) {
        const errorCode = err.errors[0].code;
        const errorMessage = err.errors[0].message;
        
        console.log("Error code:", errorCode);
        
        switch (errorCode) {
          case 'form_password_pwned':
            setError("Please use a different, more unique password.");
            break;
          case 'form_identifier_exists':
            setError("An account with this email already exists. Try logging in instead.");
            break;
          case 'form_password_validation_failed':
            setError("Password too weak. Try a longer password with mixed characters.");
            break;
          default:
            setError(errorMessage || "Signup failed. Please try again.");
        }
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!isLoaded || !code.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      console.log("📧 Attempting verification with code:", code);
      console.log("📧 Current signUp status before verification:", signUp?.status);
      
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      console.log("📋 Verification result status:", completeSignUp.status);
      console.log("📋 Full verification result:", JSON.stringify(completeSignUp, null, 2));

      if (completeSignUp.status === 'complete') {
        console.log("✅ Verification successful, setting active session");
        console.log("✅ Session ID:", completeSignUp.createdSessionId);
        
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Create user profile with username
        try {
          await createUserProfile(completeSignUp.createdUserId!, {
            email: email.toLowerCase().trim(),
            username: username.toLowerCase().trim(),
            displayName: username.trim(),
            createdAt: Date.now(),
          });
          console.log("✅ User profile created with username after verification");
        } catch (profileError) {
          console.error("❌ Failed to create user profile:", profileError);
          // Don't block signup for profile creation failure
        }
        
        Alert.alert("Success!", "Account verified and created successfully!", [
          { text: "Continue", onPress: () => router.replace("/AppContent") }
        ]);
      } else {
        console.log("❌ Verification incomplete, status:", completeSignUp.status);
        console.log("❌ Verification object:", JSON.stringify(completeSignUp.verifications, null, 2));
        setError(`Verification incomplete. Status: ${completeSignUp.status}`);
      }
    } catch (err: any) {
      console.error("❌ Verification error:", JSON.stringify(err, null, 2));
      
      if (err.errors && err.errors.length > 0) {
        const errorCode = err.errors[0].code;
        const errorMessage = err.errors[0].message;
        
        console.log("❌ Verification error code:", errorCode);
        
        if (errorCode === 'verification_already_verified') {
          console.log("🔄 Email already verified, checking current signup status...");
          
          // Check if the signup is actually complete
          try {
            console.log("🔍 Current signUp object:", JSON.stringify(signUp, null, 2));
            
            if (signUp?.status === 'complete' && signUp?.createdSessionId) {
              console.log("✅ Found complete signup, setting session");
              await setActive({ session: signUp.createdSessionId });
              
              // Create user profile with username
              try {
                await createUserProfile(signUp.createdUserId!, {
                  email: email.toLowerCase().trim(),
                  username: username.toLowerCase().trim(),
                  displayName: username.trim(),
                  createdAt: Date.now(),
                });
                console.log("✅ User profile created with username (already verified case)");
              } catch (profileError) {
                console.error("❌ Failed to create user profile:", profileError);
                // Don't block signup for profile creation failure
              }
              
              Alert.alert("Welcome!", "Account created successfully!", [
                { text: "Continue", onPress: () => router.replace("/AppContent") }
              ]);
              return;
            } else {
              console.log("❌ Signup not complete despite verification");
              Alert.alert(
                "Verification Issue", 
                "Your email is verified but account creation is incomplete. Please try signing up again or contact support.",
                [
                  { text: "Try Again", onPress: () => router.replace("/signup") },
                  { text: "Go to Login", onPress: () => router.replace("/login") }
                ]
              );
              return;
            }
          } catch (sessionError) {
            console.error("❌ Session error:", sessionError);
            setError("Account verification completed but couldn't sign you in. Please try logging in.");
          }
        } else {
          switch (errorCode) {
            case 'form_code_incorrect':
              setError("Incorrect verification code. Please try again.");
              break;
            case 'verification_expired':
              setError("Verification code expired. Please request a new one.");
              break;
            default:
              setError(errorMessage || "Verification failed. Please try again.");
          }
        }
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signUp) return;
    
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
    } catch (err: any) {
      console.error("Resend error:", err);
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => setVerifying(false)}>
          <Ionicons name="chevron-back" size={28} color="#de7600" />
        </TouchableOpacity>
        
        <View style={styles.background}>
          <View style={styles.contentContainer}>
            <Text style={styles.header}>Verify Email</Text>
            <Text style={styles.verifyText}>
              We sent a 6-digit code to {email}. Enter it below:
            </Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#888"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              editable={!loading}
            />
            
            <TouchableOpacity 
              style={[styles.button, (loading || !code.trim()) && { opacity: 0.6 }]} 
              onPress={handleVerification}
              disabled={loading || !code.trim()}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify Email"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back arrow */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
        <Ionicons name="chevron-back" size={28} color="#de7600" />
      </TouchableOpacity>
      
      <View style={styles.background}>

      {/* Centered Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.header}>Sign up for ARIA</Text>

          <View style={styles.formGroup}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            {/* Username field */}
            <View style={styles.usernameContainer}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={[styles.input, styles.usernameInput]}
                placeholder="username"
                placeholderTextColor="#888"
                value={username}
                onChangeText={(text) => {
                  // Clean username: only alphanumeric and underscore, lowercase
                  const cleanUsername = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setUsername(cleanUsername);
                  setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                maxLength={20}
              />
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#888"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Password (8+ characters)"
                placeholderTextColor="#888"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(prev => !prev)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && { opacity: 0.6 }]} 
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
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
    </SafeAreaView>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFB980", 
  },
  background: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 48 : 28,
    left: 10,
    zIndex: 2,
    paddingTop: 10,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  header: {
    fontSize: width * 0.1,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 20,
    color: "#de7600",
    alignSelf: "center",
    textShadowColor: "rgba(18, 17, 17, 0.23)",
    textShadowOffset: { width: 2, height: 2 },
    letterSpacing: 1,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 28,
    marginBottom: 12,
  },
  eyeIcon: {
    padding: 12,
  },
  verifyText: {
    fontSize: width * 0.04,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
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
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    borderRadius: 28,
    marginBottom: 12,
    paddingLeft: width * 0.045,
    elevation: 1.5,
    shadowColor: "#e4c2a6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  usernamePrefix: {
    fontSize: width * 0.04,
    fontWeight: "bold",
    color: "#de7600",
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    marginBottom: 0,
    paddingLeft: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  button: {
    width: width * 0.75,
    height: 50,
    backgroundColor: "#FFA842",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 70,
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
  resendButton: {
    marginTop: 15,
  },
  resendText: {
    color: "#de7600",
    fontSize: width * 0.035,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  signUpPrompt: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    alignSelf: "flex-start",
    marginTop: 18,
    marginLeft: width / 5,
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
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
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
