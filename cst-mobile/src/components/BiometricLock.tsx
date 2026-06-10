import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  AppState, AppStateStatus, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import BlobBackground from './BlobBackground';

const BIOMETRIC_KEY   = '@cst_biometric_enabled';
const BG_TIME_KEY     = '@cst_bg_time';
const LOCK_AFTER_MS   = 10_000; // lock after 10 s in background

export const BIOMETRIC_STORAGE_KEY = BIOMETRIC_KEY;

interface Props { children: React.ReactNode }

export default function BiometricLock({ children }: Props) {
  const { user } = useAuth();
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
        promptMessage: 'Unlock CST Driver',
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
    <BlobBackground style={{ ...StyleSheet.absoluteFillObject, zIndex: 9999, backgroundColor: '#0A0F1E' }}>
      <View style={s.overlay}>
        <View style={s.logoPill}>
          <Image
            source={require('../../assets/logo/cst_logo_white.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={s.heading}>App Locked</Text>
        <Text style={s.sub}>Authenticate to continue</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.btnWrap} onPress={authenticate} disabled={checking} activeOpacity={0.85}>
          <LinearGradient
            colors={['#F97316', '#6366F1']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.btn}
          >
            {checking
              ? <ActivityIndicator color="#FFFFFF" />
              : <>
                  <Ionicons name="finger-print-outline" size={24} color="#FFFFFF" />
                  <Text style={s.btnTxt}>Unlock with Biometrics</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </BlobBackground>
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 20, paddingHorizontal: 28, paddingVertical: 16,
    marginBottom: 12,
  },
  logo:    { width: 180, height: 64 },
  heading: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  sub:     { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  error:   { color: '#E74C3C', fontSize: 13, textAlign: 'center' },
  btnWrap: { marginTop: 8 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 16,
  },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
