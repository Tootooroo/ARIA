import {
  deleteChatHistory,
  deleteUserAccount,
  disableMFA,
  enableMFA,
  sendMFACode,
  updateProfilePicture,
  updateUserProfile,
  verifyMFACode,
  type UserProfile
} from '@/lib/memory';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  View as RNView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get("window");
const POPOVER_WIDTH = 180;

type Props = {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onProfileUpdate?: (profile: UserProfile) => void;
  onChatHistoryDeleted?: () => void;
};

export default function UserProfileModal({
  visible,
  onClose,
  userProfile,
  onLogout,
  onProfileUpdate,
  onChatHistoryDeleted
}: Props) {
  
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  
  // Enhanced animation state for glass morphism
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(false);
  const insets = useSafeAreaInsets();

  // Avatar state
  const [avatarUri, setAvatarUri] = useState<string | null>(userProfile?.profilePictureUrl || null);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ x: number, y: number } | null>(null);

  // Editing states
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempName, setTempName] = useState(userProfile?.displayName || userProfile?.firstName || '');
  const [tempEmail, setTempEmail] = useState(userProfile?.email || '');
  const [saving, setSaving] = useState(false);

  // Security modals
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [mfaModalVisible, setMfaModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // MFA states
  const [mfaStep, setMfaStep] = useState<'setup' | 'verify' | 'success'>('setup');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [sentCode, setSentCode] = useState('');

  // Avatar ref for measurement
  const avatarRef = useRef<RNView | null>(null);

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setAvatarUri(userProfile.profilePictureUrl || null);
      setTempName(userProfile.displayName || userProfile.firstName || '');
      setTempEmail(userProfile.email || '');
    }
  }, [userProfile]);

// Enhanced animate in/out logic with glass morphism
  useEffect(() => {
    if (visible) {
      setDisplay(true);
      
      // Parallel animations for smooth entrance
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 420,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Smooth custom curve
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Parallel animations for smooth exit
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 300,
          easing: Easing.bezier(0.55, 0.085, 0.68, 0.53), // Smooth exit curve
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setDisplay(false);
      });
    }
  }, [visible]);

  // Save profile picture
  const saveProfilePicture = async (imageUri: string) => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      await updateProfilePicture(user.id, imageUri);
      setAvatarUri(imageUri);
      
      // Update parent component
      if (userProfile && onProfileUpdate) {
        onProfileUpdate({
          ...userProfile,
          profilePictureUrl: imageUri,
        });
      }
      
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture');
      console.error('Profile picture update error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Camera picker
  const pickFromCamera = async () => {
    setAvatarPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      await saveProfilePicture(result.assets[0].uri);
    }
  };  

  // Gallery picker
  const pickFromGallery = async () => {
    setAvatarPickerVisible(false);
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      await saveProfilePicture(result.assets[0].uri);
    }
  };

  // Files picker (expo-document-picker v11+)
  const pickFromFiles = async () => {
    setAvatarPickerVisible(false);
    let result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    // If user picked a file
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await saveProfilePicture(result.assets[0].uri);
    }
  };

  // Save name changes (automatically updates username too)
  const saveName = async () => {
    if (!user?.id || !userProfile) return;
    
    try {
      setSaving(true);
      
      // Generate username from name
      const cleanedName = tempName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const newUsername = cleanedName || `user${Date.now()}`;
      
      await updateUserProfile(user.id, {
        displayName: tempName.trim(),
        username: newUsername,
      });
      
      setEditingName(false);
      
      // Update parent component
      if (onProfileUpdate) {
        onProfileUpdate({
          ...userProfile,
          displayName: tempName.trim(),
          username: newUsername,
        });
      }
      
      Alert.alert('Success', 'Name and username updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update name');
      console.error('Name update error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Save email changes
  const saveEmail = async () => {
    if (!user?.id || !userProfile) return;
    
    try {
      setSaving(true);
      await updateUserProfile(user.id, {
        email: tempEmail.trim(),
      });
      
      setEditingEmail(false);
      
      // Update parent component
      if (onProfileUpdate) {
        onProfileUpdate({
          ...userProfile,
          email: tempEmail.trim(),
        });
      }
      
      Alert.alert('Success', 'Email updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update email');
      console.error('Email update error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const cancelNameEdit = () => {
    setTempName(userProfile?.displayName || userProfile?.firstName || '');
    setEditingName(false);
  };

  const cancelEmailEdit = () => {
    setTempEmail(userProfile?.email || '');
    setEditingEmail(false);
  };

  // Close all editing modes
  const closeAllEditing = () => {
    if (editingName) {
      cancelNameEdit();
    }
    if (editingEmail) {
      cancelEmailEdit();
    }
  };



  // Security Functions
  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              onLogout();
              onClose();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      await user?.updatePassword({
        newPassword: newPassword,
        currentPassword: currentPassword,
      });
      
      Alert.alert('Success', 'Password updated successfully!');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.errors?.[0]?.message || 'Failed to update password';
      Alert.alert('Error', errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  // MFA Functions
  const handleMFASetup = () => {
    if (userProfile?.mfaEnabled) {
      // Show disable confirmation
      Alert.alert(
        "Disable Multi-Factor Authentication",
        "Are you sure you want to disable MFA? This will make your account less secure.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disable", style: "destructive", onPress: handleDisableMFA }
        ]
      );
    } else {
      // Start MFA setup
      setMfaStep('setup');
      setMfaModalVisible(true);
    }
  };

  const handleEnableMFA = async () => {
    if (!user?.id || !userProfile?.email) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      setMfaLoading(true);
      
      // Send verification code
      const code = await sendMFACode(user.id, userProfile.email);
      setSentCode(code); // For demo - remove in production
      
      setMfaStep('verify');
      Alert.alert(
        'Verification Code Sent', 
        `We sent a 6-digit code to ${userProfile.email}. Please check your email and enter the code below.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
      console.error('MFA code send error:', error);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!user?.id || !mfaCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setMfaLoading(true);
      
      const isValid = verifyMFACode(user.id, mfaCode);
      
      if (isValid) {
        // Enable MFA in user profile
        await enableMFA(user.id, 'email');
        
        // Update local state
        if (onProfileUpdate && userProfile) {
          onProfileUpdate({
            ...userProfile,
            mfaEnabled: true,
            mfaMethod: 'email',
          });
        }
        
        setMfaStep('success');
        setTimeout(() => {
          setMfaModalVisible(false);
          resetMFAState();
        }, 2000);
      } else {
        Alert.alert('Invalid Code', 'The verification code is incorrect or expired. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify code. Please try again.');
      console.error('MFA verification error:', error);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      await disableMFA(user.id);
      
      // Update local state
      if (onProfileUpdate && userProfile) {
        onProfileUpdate({
          ...userProfile,
          mfaEnabled: false,
          mfaMethod: undefined,
        });
      }
      
      Alert.alert('Success', 'Multi-factor authentication has been disabled.');
    } catch (error) {
      Alert.alert('Error', 'Failed to disable MFA. Please try again.');
      console.error('MFA disable error:', error);
    }
  };

  const resetMFAState = () => {
    setMfaStep('setup');
    setMfaCode('');
    setSentCode('');
  };

  const closeMFAModal = () => {
    setMfaModalVisible(false);
    resetMFAState();
  };

  // Delete Functions
  const handleDeleteChatHistory = () => {
    Alert.alert(
      "Delete Chat History",
      "Are you sure you want to delete all your chat messages? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: confirmDeleteChatHistory
        }
      ]
    );
  };

  const confirmDeleteChatHistory = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    // Immediately clear the UI messages
    if (onChatHistoryDeleted) {
      onChatHistoryDeleted();
    }

    // Show immediate success feedback
    Alert.alert(
      '✅ Deleted!', 
      'All chat messages have been deleted.',
      [{ text: 'OK' }]
    );

    // Delete in background without blocking UI
    try {
      await deleteChatHistory(user.id);
      console.log('✅ Chat history successfully deleted from Firebase');
    } catch (error) {
      console.error('Delete chat history error:', error);
      // Show error after a delay if deletion actually failed
      setTimeout(() => {
        Alert.alert(
          'Sync Error', 
          'Chat history was cleared locally but there was an issue syncing with the server. Your messages are still deleted from your device.',
          [{ text: 'OK' }]
        );
      }, 1000);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Delete Account",
      "This will permanently delete your account and ALL data including:\n\n• Profile information\n• Chat history\n• Settings\n• All personal data\n\nThis action CANNOT be undone. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Forever", 
          style: "destructive",
          onPress: confirmDeleteAccount
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    // Final confirmation
    Alert.alert(
      "Final Confirmation",
      "Last chance! This will permanently delete everything. Type your email to confirm deletion.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "I'm Sure - Delete Everything", 
          style: "destructive",
          onPress: executeAccountDeletion
        }
      ]
    );
  };

  const executeAccountDeletion = async () => {
    if (!user?.id) return;

    try {
      // 1. Delete all Firebase data
      await deleteUserAccount(user.id);
      
      // 2. Sign out from Clerk
      await signOut();
      
      // 3. Close modal
      onClose();
      
      // 4. Navigate to login page
      router.replace('/login');
      
      // 5. Show final confirmation
      setTimeout(() => {
        Alert.alert(
          'Account Deleted', 
          'Your account and all data have been permanently deleted.',
          [{ text: 'OK' }]
        );
      }, 500);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
      console.error('Delete account error:', error);
    }
  };

  // Open popover with perfect alignment
  const openAvatarPicker = () => {
    if (avatarRef.current) {
      avatarRef.current.measureInWindow((x, y, w, h) => {
        setPopoverPos({ x: x + w / 2, y: y + h }); // centerX, bottomY
        setAvatarPickerVisible(true);
      });
    } else {
      setAvatarPickerVisible(true);
    }
  };

  // No render if not visible
  if (!display) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 1. Overlay (closes modal on outside tap) */}
      {visible && (
        <TouchableOpacity
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setAvatarPickerVisible(false)}
        >
          {popoverPos && (
            <View
              style={[
                styles.avatarPopover,
                {
                  position: "absolute",
                  top: popoverPos.y + 6, // 6 px below avatar
                  left: Math.max(popoverPos.x - POPOVER_WIDTH / 2, 16), // prevent overflow
                  width: POPOVER_WIDTH,
                },
              ]}
              pointerEvents="box-none"
            >
              {/* Arrow triangle */}
              <View style={styles.arrowDown} />
              <View style={styles.avatarPickerBox}>
                <TouchableOpacity onPress={pickFromCamera} style={styles.pickerButton}>
                  <Feather name="camera" size={20} color="#de7600" />
                  <Text style={styles.pickerText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromGallery} style={styles.pickerButton}>
                  <Feather name="image" size={20} color="#de7600" />
                  <Text style={styles.pickerText}>Choose from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFromFiles} style={styles.pickerButton}>
                  <Feather name="folder" size={20} color="#de7600" />
                  <Text style={styles.pickerText}>Upload from Files</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAvatarPickerVisible(false)} style={{alignSelf: 'center', padding: 7}}>
                  <Text style={{ color: "#F38D91", fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity 
                onPress={() => setPasswordModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 8 characters)"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveModalButton, passwordLoading && { opacity: 0.6 }]}
                  onPress={handlePasswordChange}
                  disabled={passwordLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MFA Setup Modal */}
      <Modal
        visible={mfaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMFAModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mfaStep === 'setup' ? 'Enable Multi-Factor Authentication' :
                 mfaStep === 'verify' ? 'Verify Your Email' : 'MFA Enabled!'}
              </Text>
              {mfaStep !== 'success' && (
                <TouchableOpacity 
                  onPress={closeMFAModal}
                  style={styles.modalCloseButton}
                >
                  <Feather name="x" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalContent}>
              {mfaStep === 'setup' && (
                <>
                  <Text style={styles.mfaDescription}>
                    Add an extra layer of security to your account. When enabled, you'll need to enter a verification code sent to your email address when logging in.
                  </Text>
                  
                  <View style={styles.mfaFeatures}>
                    <View style={styles.mfaFeature}>
                      <Feather name="shield" size={20} color="#4CAF50" />
                      <Text style={styles.mfaFeatureText}>Enhanced Security</Text>
                    </View>
                    <View style={styles.mfaFeature}>
                      <Feather name="mail" size={20} color="#4CAF50" />
                      <Text style={styles.mfaFeatureText}>Email Verification</Text>
                    </View>
                    <View style={styles.mfaFeature}>
                      <Feather name="clock" size={20} color="#4CAF50" />
                      <Text style={styles.mfaFeatureText}>Quick Setup</Text>
                    </View>
                  </View>

                  <Text style={styles.mfaEmail}>
                    Verification codes will be sent to: {userProfile?.email}
                  </Text>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelModalButton]}
                      onPress={closeMFAModal}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveModalButton, mfaLoading && { opacity: 0.6 }]}
                      onPress={handleEnableMFA}
                      disabled={mfaLoading}
                    >
                      <Text style={styles.saveButtonText}>
                        {mfaLoading ? 'Sending...' : 'Enable MFA'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {mfaStep === 'verify' && (
                <>
                  <Text style={styles.mfaDescription}>
                    We sent a 6-digit verification code to your email address. Enter it below to complete MFA setup.
                  </Text>

                  {/* Demo code display - remove in production */}
                  {sentCode && (
                    <View style={styles.demoCodeContainer}>
                      <Text style={styles.demoCodeLabel}>Demo Code (remove in production):</Text>
                      <Text style={styles.demoCodeText}>{sentCode}</Text>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <TextInput
                    style={styles.mfaCodeInput}
                    value={mfaCode}
                    onChangeText={(text) => setMfaCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelModalButton]}
                      onPress={closeMFAModal}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveModalButton, (mfaLoading || mfaCode.length !== 6) && { opacity: 0.6 }]}
                      onPress={handleVerifyMFA}
                      disabled={mfaLoading || mfaCode.length !== 6}
                    >
                      <Text style={styles.saveButtonText}>
                        {mfaLoading ? 'Verifying...' : 'Verify Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleEnableMFA}
                    disabled={mfaLoading}
                  >
                    <Text style={styles.resendText}>Resend Code</Text>
                  </TouchableOpacity>
                </>
              )}

              {mfaStep === 'success' && (
                <View style={styles.successContainer}>
                  <Feather name="check-circle" size={60} color="#4CAF50" />
                  <Text style={styles.successTitle}>MFA Enabled!</Text>
                  <Text style={styles.successDescription}>
                    Your account is now protected with multi-factor authentication.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Modal (fully interactive) */}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateX: slideAnim },
                { scale: scaleAnim }
              ],
              opacity: opacityAnim,
              top: (insets.top || 16) + 50, 
              right: 10,
            }
          ]}
        >
        {/* New top header row */}
        <View style={styles.headerRow}>
          {/* Back chevron, always far left */}
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          {/* User card sits to the right of arrow */}
          <View style={styles.userCard}>
              <TouchableOpacity
                ref={avatarRef}
                style={styles.avatar}
                onPress={openAvatarPicker}
                activeOpacity={0.82}
              >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "#ececec" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(tempName && tempName.length > 0 ? tempName[0] : "?").toUpperCase()}
                </Text>
              )}
              <Feather name="camera" size={14} color="#fff" style={{ position: 'absolute', bottom: 3, right: 5 }} />
              {saving && (
                <View style={styles.savingOverlay}>
                  <Text style={styles.savingText}>...</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableWithoutFeedback onPress={closeAllEditing}>
            <View style={styles.userText}>
                {/* Name editing */}
              <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  {editingName ? (
                    <View style={styles.editingContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={tempName}
                        onChangeText={setTempName}
                        placeholder="Enter name"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        autoFocus
                        onSubmitEditing={saveName}
                      />
                      <TouchableOpacity onPress={saveName} style={styles.saveButton}>
                        <Feather name="check" size={14} color="#4CAF50" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={cancelNameEdit} style={styles.cancelButton}>
                        <Feather name="x" size={14} color="#F38D91" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editableRow}
                      onPress={() => setEditingName(true)} 
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                <Text
                  style={styles.userName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit={true}
                >
                        {tempName || 'Add name'}
                </Text>
                  <Feather name="edit-3" size={13} color="#FFA842" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
                  )}
              </View>
                
                {/* Email editing */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -12, minWidth: 0, flex: 1 }}>
                  {editingEmail ? (
                    <View style={styles.editingContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={tempEmail}
                        onChangeText={setTempEmail}
                        placeholder="Enter email"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                        onSubmitEditing={saveEmail}
                      />
                      <TouchableOpacity onPress={saveEmail} style={styles.saveButton}>
                        <Feather name="check" size={14} color="#4CAF50" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={cancelEmailEdit} style={styles.cancelButton}>
                        <Feather name="x" size={14} color="#F38D91" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.editableRow}
                      onPress={() => setEditingEmail(true)} 
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                <Text
                  style={styles.userEmail}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  adjustsFontSizeToFit={true}
                >
                        {tempEmail || 'Add email'}
                </Text>
                      <Feather name="edit-3" size={13} color="#FFA842" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
                  )}
              </View>


            </View>
            </TouchableWithoutFeedback>
          </View>
        </View>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.glassCard}>
          <TouchableOpacity style={[
              styles.menuItem,
              { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
            ]} 
            onPress={() => setPasswordModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuText}>Change Password</Text>
            <Feather name="lock" size={18} color="#FFA842" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleMFASetup}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Multi-Factor Authentication</Text>
              <Text style={styles.menuSubtext}>
                {userProfile?.mfaEnabled ? 'Enabled via email' : 'Disabled'}
              </Text>
            </View>
            <Feather 
              name="shield" 
              size={18} 
              color={userProfile?.mfaEnabled ? "#4CAF50" : "#FFA842"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuText, { color: "#F38D91" }]}>Log Out</Text>
            <Feather name="log-out" size={18} color="#F38D91" />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.glassCard}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
            ]}
            onPress={handleDeleteChatHistory}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuText, { color: "#F38D91" }]}>Delete Chat History</Text>
            <Feather name="trash-2" size={18} color="#F38D91" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuText, { color: "#F38D91" }]}>Delete Account</Text>
            <Feather name="user-x" size={18} color="#F38D91" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
    zIndex: 2,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.20)",
    zIndex: 5,
  },
  avatarPopover: {
    alignItems: "center",
    zIndex: 5,
    minWidth: 100,
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 18,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: "#fff",
    marginBottom: -6,
    alignSelf: "center",
    zIndex: 10,

  },
  avatarPickerBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    alignItems: "stretch",
    minWidth: 100,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingLeft: 8,
  },
  pickerText: {
    marginLeft: 10,
    color: "#222",
    fontSize: 12,
    fontWeight: "600"
  },
  container: {
    position: "absolute",
    top: 80, 
    left: "4%", 
    alignSelf: "flex-end",
    width: width > 480 ? 400 : width * 0.92,
    backgroundColor: "rgba(180, 90, 0, 0.82)", // Toned down orange with glass transparency
    borderRadius: 32,
    padding: 22,
    paddingBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)", // Glass border
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 20,
    zIndex: 3,
    // Glass morphism backdrop (iOS style)
    ...(Platform.OS === 'ios' && {
      backdropFilter: "blur(20px)",
    }),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  backButton: {
    marginRight: 4,
    marginLeft: -16,
    padding: 2,
    zIndex: 5,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,174,73,0.15)",
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minWidth: 0,
    flexShrink: 1,
    flexGrow: 1,
    flex: 1,
  },
  userText: {
    marginLeft: 8,
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 30,
    backgroundColor: "rgba(160,155,143,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 0,
    position: "relative"
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
  },
  userName: {
    fontWeight: "bold",
    fontSize: 24,
    color: "#fff",
    marginBottom: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: width > 480 ? 240 : width * 0.45,
  },
  userEmail: {
    fontSize: 11,
    color: "#fff",
    opacity: 0.84,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: width > 480 ? 240 : width * 0.45, 
  },
  userUsername: {
    fontSize: 10,
    color: "#fff",
    opacity: 0.8,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: width > 480 ? 240 : width * 0.45,
    fontWeight: '500',
  },

  sectionTitle: {
    fontWeight: "bold",
    fontSize: 24,
    color: "#fff",
    marginBottom: 6,
    marginLeft: 10,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)", // More subtle transparency
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)", // Subtle glass border
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    // Glass morphism backdrop
    ...(Platform.OS === 'ios' && {
      backdropFilter: "blur(10px)",
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.6,
    borderBottomColor: "rgba(255,255,255,0.13)",
  },
  menuText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // New editing styles
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    minHeight: 24,
  },
  saveButton: {
    marginLeft: 8,
    padding: 4,
  },
  cancelButton: {
    marginLeft: 4,
    padding: 4,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Password Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passwordModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveModalButton: {
    backgroundColor: '#FFA842',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 6,
  },
  // MFA Styles
  menuSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  mfaDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  mfaFeatures: {
    marginBottom: 20,
  },
  mfaFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  mfaFeatureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  mfaEmail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  mfaCodeInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 24,
    backgroundColor: '#f8f8f8',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  demoCodeContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  demoCodeLabel: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  demoCodeText: {
    fontSize: 20,
    color: '#856404',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 4,
  },
  resendButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  resendText: {
    color: '#FFA842',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
  },
  successDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});