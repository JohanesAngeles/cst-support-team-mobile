import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  AppState, AppStateStatus, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../constants/colors';

const BIOMETRIC_KEY   = '@rrn_biometric_enabled';
const BG_TIME_KEY     = '@rrn_bg_time';
const LOCK_AFTER_MS   = 10_000; // lock after 10 s in background

export const BIOMETRIC_STORAGE_KEY = BIOMETRIC_KEY;

interface Props { children: React.ReactNode }

export default function BiometricLock({ children }: Props) {
  const { user } = useAuth();
  const Colors   = useColors();
  const [locked,   setLocked]   = useState(false);
  const [error,    setError]    = useState('');
  const [checking, setChecking] = useState(false);
  const appState = useRef(AppState.currentState);

  // Check biometric eligibility once on mount
  useEffect(() => {
    if (!user) return;
    checkLockOnForeground();
  }, [user]);

  // Watch AppState transitions
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

    // Don't lock if the device has no enrolled biometrics — would trap the user
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
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}>
      <View style={s.overlay}>
        <View style={[s.logoPill, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <Image
            source={require('../../assets/road_ready_favicon.jpeg')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={[s.heading, { color: Colors.text }]}>App Locked</Text>
        <Text style={[s.sub, { color: Colors.textMuted }]}>Authenticate to continue</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.btn, { backgroundColor: Colors.primary }]}
          onPress={authenticate}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking
            ? <ActivityIndicator color="#FFFFFF" />
            : <>
                <Ionicons name="finger-print-outline" size={24} color="#FFFFFF" />
                <Text style={s.btnTxt}>Unlock with Biometrics</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
  },
  logoPill: {
    borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 28, paddingVertical: 16,
    marginBottom: 12,
  },
  logo:  { width: 180, height: 64 },
  heading: { fontSize: 26, fontWeight: '900' },
  sub:     { fontSize: 14 },
  error:   { color: '#CC0000', fontSize: 13, textAlign: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 28, height: 56,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
