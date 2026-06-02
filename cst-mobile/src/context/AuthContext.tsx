import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/auth';
import { registerPushToken, unregisterPushToken } from '../utils/notifications';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isVerified: boolean;
  avatarUrl?: string | null;
  subscriptionStatus?: 'free' | 'active' | 'cancelled' | 'past_due';
  subscriptionPlan?: 'monthly' | 'annual' | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  onboarded: boolean | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  loginWithSocial: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  markVerified: () => void;
  updateUser: (data: Partial<User>) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]         = useState<User | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const res = await authAPI.getMe();
          setUser(res.data.user);
          const v = await AsyncStorage.getItem('@cst_onboarded');
          setOnboarded(v === 'true');
        }
      } catch {
        await AsyncStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    const v = await AsyncStorage.getItem('@cst_onboarded');
    setOnboarded(v === 'true');
    registerPushToken();
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await authAPI.register({ name, email, password, phone });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    setOnboarded(false);
    registerPushToken();
  };

  const loginWithSocial = async (t: string, u: User) => {
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    const v = await AsyncStorage.getItem('@cst_onboarded');
    setOnboarded(v === 'true');
    registerPushToken();
  };

  const logout = async () => {
    unregisterPushToken();
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setOnboarded(null);
  };

  const markVerified = () => {
    setUser(prev => prev ? { ...prev, isVerified: true } : prev);
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('@cst_onboarded', 'true');
    setOnboarded(true);
  };

  // Resets the onboarding flag so the tour shows again — no logout needed
  const resetOnboarding = async () => {
    await AsyncStorage.removeItem('@cst_onboarded');
    setOnboarded(false);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, onboarded,
      login, register, loginWithSocial, logout,
      markVerified, updateUser, completeOnboarding, resetOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
