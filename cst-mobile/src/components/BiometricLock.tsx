import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  AppState, AppStateStatus, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../constants/colors';

const BIOMETRIC_KEY   = '@rrn_biometric_enabled';
const BG_TIME_KEY     = '@rrn_bg_time';
const LOCK_AFTER_MS   = 10_000;

export const BIOMETRIC_STORAGE_KEY = BIOMETRIC_KEY;

interface Props { children: React.ReactNode }

export default function BiometricLock({ children }: Props) {
  const { user } = useAuth();
  const Colors   = useColors();
  const [locked,   setLocked]   = useState(false);
  const [error,    setError]    = useState('');
  const [checking, setChecking] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;
    checkLockOnForeground();
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (!user) return;

      if (appState.current === 'active' && next === 'background') {
        AsyncStorage.setItem(BG_TIME_KEY, String(Date.now()));
      }

      if ((appState.current === 'background' || appState.current === 'inactive') && next === 'active') {
        checkLockOnForeground();
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, [user]);

  const checkLockOnForeground = async () => {
    const [enabled, bgTimeRaw] = await Promise.all([
      AsyncStorage.getItem(BIOMETRIC_KEY),
      AsyncStorage.getItem(BG_TIME_KEY),
    ]);
    if (enabled !== 'true') return;

    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hasHardware || !isEnrolled) return;

    const bgTime = bgTimeRaw ? parseInt(bgTimeRaw, 10) : 0;
    const elapsed = Date.now() - bgTime;
    if (bgTime > 0 && elapsed < LOCK_AFTER_MS) return;

    setLocked(true);
    setError('');
  };

  const authenticate = async () => {
    setChecking(true);
    setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Road Ready Network',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await AsyncStorage.setItem(BG_TIME_KEY, String(Date.now()));
        setLocked(false);
      } else {
        setError('Authentication failed. Try again.');
      }
    } catch {
      setError('Biometric not available. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  if (!locked) return <>{children}</>;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, backgroundColor: Colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.container}>

          <Image
            source={require('../../assets/logo/road_ready_logo.jpeg')}
            style={s.logo}
            resizeMode="contain"
          />

          <View style={s.textBlock}>
            <Text style={[s.heading, { color: Colors.text }]}>App Locked</Text>
            <Text style={[s.subtitle, { color: Colors.textMuted }]}>Authenticate to continue</Text>
          </View>

          {error ? (
            <View style={[s.errorBox, { backgroundColor: Colors.surface, borderColor: '#FFCDD2' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#CC0000" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.primaryBtn, checking && s.disabled]}
            onPress={authenticate}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking
              ? <ActivityIndicator color="#FFFFFF" />
              : <>
                  <Ionicons name="finger-print-outline" size={22} color="#FFFFFF" />
                  <Text style={s.primaryBtnText}>Unlock with Biometrics</Text>
                </>
            }
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 20,
  },
  logo: {
    width: 200,
    height: 72,
    alignSelf: 'center',
    marginBottom: 8,
  },
  textBlock: { gap: 6 },
  heading:  { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 15 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: '#CC0000', fontSize: 13, flex: 1 },
  primaryBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#021B3A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#021B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },
});
