import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type AuthContextType = {
    isLoggedIn: boolean;
    setLoggedIn: (value: boolean, remember?: boolean) => void;
    loading: boolean;
  };
  

  const AuthContext = createContext<AuthContextType>({
    isLoggedIn: false,
    setLoggedIn: () => {},
    loading: true,
  });

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
  
    // On mount, check AsyncStorage for stayLoggedIn
    useEffect(() => {
      const checkLogin = async () => {
        try {
          const val = await AsyncStorage.getItem("stayLoggedIn");
          setIsLoggedIn(val === "true");
        } finally {
          setLoading(false);
        }
      };
      checkLogin();
    }, []);
  
    // Log in/out and set AsyncStorage
    const setLoggedIn = async (val: boolean, remember = false) => {
      setIsLoggedIn(val);
      if (remember && val) {
        await AsyncStorage.setItem("stayLoggedIn", "true");
      } else {
        await AsyncStorage.removeItem("stayLoggedIn");
      }
    };
  
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
  
    return (
      <AuthContext.Provider value={{ isLoggedIn, setLoggedIn, loading }}>
        {children}
      </AuthContext.Provider>
    );
  };