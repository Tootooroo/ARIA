import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
};

export default function UserProfileModal({
  visible,
  onClose,
  userName,
  userEmail,
  onLogout
}: Props) {
  
  // Slide animation state
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const [display, setDisplay] = useState(false);
  const insets = useSafeAreaInsets();

  // Animate in/out logic
  useEffect(() => {
    if (visible) {
      setDisplay(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 270,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setDisplay(false);
      });
    }
  }, [visible]);

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

      {/* 2. Modal (fully interactive) */}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateX: slideAnim }],
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
            <TouchableOpacity style={styles.avatar} onPress={() => Alert.alert("Change Avatar", "Avatar change coming soon!")}>
              <Text style={styles.avatarText}>
                {(userName && userName.length > 0 ? userName[0] : "?").toUpperCase()}
              </Text>
              <Feather name="camera" size={14} color="#fff" style={{ position: 'absolute', bottom: 3, right: 5 }} />
            </TouchableOpacity>
            <View style={styles.userText}>
              <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0, flex: 1 }}>
                <Text
                  style={styles.userName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit={true}
                >
                  {userName}
                </Text>
                <TouchableOpacity onPress={() => Alert.alert("Change Username", "Username editing coming soon!")}>
                  <Feather name="edit-3" size={13} color="#FFA842" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -12, minWidth: 0, flex: 1 }}>
                <Text
                  style={styles.userEmail}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  adjustsFontSizeToFit={true}
                >
                  {userEmail}
                </Text>
                <TouchableOpacity onPress={() => Alert.alert("Change Email", "Email editing coming soon!")}>
                  <Feather name="edit-3" size={11} color="#FFA842" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.glassCard}>
          <TouchableOpacity style={[
              styles.menuItem,
              { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
            ]} 
            onPress={() => Alert.alert("Change Password", "Password change coming soon!")}>
            <Text style={styles.menuText}>Change Password</Text>
            <Feather name="lock" size={18} color="#FFA842" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("MFA Setup", "Multi-factor Authentication setup coming soon!")}>{/*phone number*/}
            <Text style={styles.menuText}>Multi-Factor Authentication</Text>
            <Feather name="shield" size={18} color="#FFA842" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
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
            onPress={() => Alert.alert(
              "Delete Chat History",
              "Are you sure you want to delete all your chat messages? This will reset all your data and cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted (demo)") },
              ]
            )}
          >
            <Text style={[styles.menuText, { color: "#F38D91" }]}>Delete Chat History</Text>
            <Feather name="trash-2" size={18} color="#F38D91" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert(
              "Delete Account",
              "Are you sure you want to permanently delete your account? This will erase all your data and cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted (demo)") },
              ]
            )}
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
  container: {
    position: "absolute",
    top: 80, 
    left: "4%", 
    alignSelf: "flex-end",
    width: width > 480 ? 400 : width * 0.92,
    backgroundColor: "hsla(30, 76.90%, 28.80%, 0.94)",
    borderRadius: 30,
    padding: 22,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 15,
    zIndex: 3,
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
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 24,
    color: "#fff",
    marginBottom: 6,
    marginLeft: 10,
  },
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
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
});