import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AboutContent from './AboutContent';

const { width } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SettingsModal({
  visible,
  onClose
}: Props) {

  // Slide animation state
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const [display, setDisplay] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
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
        setAboutOpen(false); 
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
                left: "4%",
                alignSelf: "center",
            }
          ]}
        >
            {/* About page (with left back button and proper scroll) */}
          {aboutOpen ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", minHeight: 50 }}>
                <TouchableOpacity
                  style={[styles.backButton, { left: 0, right: undefined }]}
                  onPress={() => setAboutOpen(false)}
                >
                  <Ionicons
                    name="chevron-back"
                    size={28}
                    color="#fff"
                  />
                </TouchableOpacity>
                <Text style={[styles.title, { flex: 1, textAlign: "center", marginLeft: -28 }]}>
                  About This App
                </Text>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
              >
                <AboutContent noTitle />
              </ScrollView>
            </>
          ) : (
            <>
                {/* Settings topbar */}
                <View style={styles.headerRow}>

                {/* Pill/oval for the SETTINGS title */}
                <View style={styles.pillHeader}>
                    <Text style={styles.pillHeaderText}>SETTINGS</Text>
                </View>

                {/* Back chevron on the right */}
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
                </View>
            
                <ScrollView style={{ maxHeight: width > 480 ? 630 : 540 }}>

                {/* Appearance */}
                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.glassCard}>
                <TouchableOpacity style={[
                    styles.menuItem,
                    { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
                    ]} 
                    onPress={() => Alert.alert("Theme", "Theme switching coming soon!")}>
                    <Text style={styles.menuText}>Theme</Text>
                    <Feather name="moon" size={18} color="#FFA842" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Background", "Change background coming soon!")}>
                    <Text style={styles.menuText}>Background</Text>
                    <Feather name="image" size={18} color="#FFA842" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Character", "Change character coming soon!")}>
                    <Text style={styles.menuText}>Character</Text>
                    <Feather name="smile" size={18} color="#FFA842" />
                </TouchableOpacity>
                </View>
            
                {/* Notifications */}
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.glassCard}>
                <TouchableOpacity style={[
                    styles.menuItem,
                    { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
                    ]}
                    onPress={() => Alert.alert("Notifications", "This will open system settings for notifications.")}>
                    <Text style={styles.menuText}>Manage Notifications</Text>
                    <Feather name="bell" size={18} color="#FFA842" />
                </TouchableOpacity>
                </View>
            
                {/* App Preferences */}
                <Text style={styles.sectionTitle}>App Preferences</Text>
                <View style={styles.glassCard}>
                <TouchableOpacity style={[
                    styles.menuItem,
                    { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
                    ]}  
                    onPress={() => Alert.alert("Vibration / Haptics", "Toggle vibration/haptics when Aria responds coming soon!")}>
                    <Text style={styles.menuText}>Vibration / Haptics</Text>
                    <Feather name="smartphone" size={18} color="#FFA842" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Compact Mode", "Reduce animations / compact mode coming soon!")}>
                    <Text style={styles.menuText}>Compact Mode</Text>
                    <Feather name="minimize" size={18} color="#FFA842" />
                </TouchableOpacity>
                </View>
            
                {/* Language */}
                <Text style={styles.sectionTitle}>Language</Text>
                <View style={styles.glassCard}>
                <TouchableOpacity style={[
                    styles.menuItem,
                    { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
                    ]}
                    onPress={() => Alert.alert("Language", "Language selection coming soon!")}>
                    <Text style={styles.menuText}>App Language</Text>
                    <Feather name="globe" size={18} color="#FFA842" />
                </TouchableOpacity>
                </View>
            
                {/* About */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.glassCard}>
                <TouchableOpacity style={[
                    styles.menuItem,
                    { borderTopWidth: 0.7, borderTopColor: "rgba(255,255,255,0.13)" }
                    ]}
                    onPress={() => setAboutOpen(true)}>
                    <Text style={styles.menuText}>About This App</Text>
                    <Feather name="info" size={18} color="#FFA842" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Privacy Statement", "Opens privacy policy (link or modal)")}>
                    <Text style={styles.menuText}>Privacy Statement</Text>
                    <Feather name="shield" size={18} color="#FFA842" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Feedback", "Feedback / rate coming soon!")}>
                    <Text style={styles.menuText}>Feedback & Rate App</Text>
                    <Feather name="star" size={18} color="#FFA842" />
                </TouchableOpacity>
                </View>
            </ScrollView>
            </>
          )}
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
    justifyContent: "space-between",
    minHeight: 58,
    marginBottom: 26,
    marginTop: 2,
  },
  
  pillHeader: {
    backgroundColor: "rgba(255,174,73,0.15)",
    borderRadius: 34,
    paddingHorizontal: 26,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1, 
    marginRight: 6, 
  },
  
  pillHeaderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 30,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  backButton: {
    padding: 2,
    zIndex: 4,
    marginRight: -16,
  },
  title: {
    fontWeight: "bold",
    fontSize: 32,
    color: "#fff",
    marginBottom: 18,
    alignSelf: "center",
    marginTop: 6,
    letterSpacing: 1.4,
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
    marginBottom: 24,
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