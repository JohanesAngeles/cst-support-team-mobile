import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Image, ScrollView, Animated, Dimensions, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { googleAuth, appleAuth } from '../../api/socialAuth';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../../constants/googleAuth';
import { AuthStackParamList } from '../../navigation/AuthStack';

WebBrowser.maybeCompleteAuthSession();

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = Math.round(SH * 0.42);

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

// ─── Stars ────────────────────────────────────────────────────────────────────
const STARS = [
  { x: 5,  y: 8,  r: 1.5 }, { x: 15, y: 15, r: 2 },  { x: 28, y: 6,  r: 1 },
  { x: 42, y: 11, r: 1.5 }, { x: 57, y: 5,  r: 2 },   { x: 70, y: 13, r: 1 },
  { x: 83, y: 8,  r: 1.5 }, { x: 92, y: 20, r: 1 },   { x: 10, y: 25, r: 1 },
  { x: 23, y: 30, r: 1.5 }, { x: 38, y: 20, r: 1 },   { x: 53, y: 27, r: 2 },
  { x: 67, y: 22, r: 1 },   { x: 80, y: 32, r: 1.5 }, { x: 95, y: 38, r: 1 },
  { x: 3,  y: 42, r: 1.5 }, { x: 19, y: 45, r: 1 },   { x: 49, y: 40, r: 1 },
  { x: 62, y: 48, r: 1.5 }, { x: 77, y: 44, r: 1 },
];

// ─── Truck geometry ───────────────────────────────────────────────────────────
const TW  = Math.min(SW * 0.9, 350);   // total truck width
const SC  = TW / 350;                   // scale factor

function Wheel({ x, y, d }: { x: number; y: number; d: number }) {
  const sz = d * SC;
  return (
    <View style={[tw.wheel, {
      left: x * SC, top: y * SC,
      width: sz, height: sz, borderRadius: sz / 2,
    }]}>
      <View style={[tw.hub, { width: sz * 0.4, height: sz * 0.4, borderRadius: sz * 0.2 }]} />
    </View>
  );
}

function TruckIllustration({ bob }: { bob: Animated.Value }) {
  return (
    <Animated.View style={[tw.root, { width: TW, height: 148 * SC, transform: [{ translateY: bob }] }]}>

      {/* Exhaust stacks */}
      <View style={[tw.exhaust, { left: 249 * SC, top: 0, width: 8 * SC, height: 52 * SC }]} />
      <View style={[tw.exhaust, { left: 262 * SC, top: 6 * SC, width: 7 * SC, height: 46 * SC }]} />

      {/* Cab top fairing */}
      <View style={[tw.fairing, { left: 240 * SC, top: 28 * SC, width: 104 * SC, height: 18 * SC }]} />

      {/* Trailer body */}
      <View style={[tw.trailer, { top: 44 * SC, width: 238 * SC, height: 64 * SC }]}>
        <View style={tw.trailerStripe} />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[tw.rib, { left: `${i * 16 + 4}%` as any }]} />
        ))}
      </View>

      {/* Cab body */}
      <View style={[tw.cab, { left: 240 * SC, top: 44 * SC, width: 104 * SC, height: 64 * SC }]}>
        {/* Windshield */}
        <View style={[tw.windshield, { right: 5 * SC, top: 7 * SC, width: 56 * SC, height: 37 * SC }]} />
        {/* Side window */}
        <View style={[tw.sideWin, { left: 6 * SC, top: 9 * SC, width: 22 * SC, height: 22 * SC }]} />
        {/* Door seam */}
        <View style={[tw.doorSeam, { left: 32 * SC }]} />
      </View>

      {/* Headlight halo */}
      <View style={[tw.halo, { right: -7 * SC, top: 66 * SC, width: 32 * SC, height: 24 * SC }]} />
      {/* Headlight */}
      <View style={[tw.headlight, { right: 3 * SC, top: 72 * SC, width: 12 * SC, height: 12 * SC }]} />

      {/* 5th wheel coupling */}
      <View style={[tw.coupling, { left: 232 * SC, top: 100 * SC, width: 18 * SC, height: 7 * SC }]} />

      {/* Chassis rail */}
      <View style={[tw.chassis, { top: 104 * SC, width: TW }]} />

      {/* Wheels */}
      <Wheel x={14}  y={100} d={28} />
      <Wheel x={40}  y={100} d={28} />
      <Wheel x={178} y={98}  d={30} />
      <Wheel x={204} y={98}  d={30} />
      <Wheel x={296} y={101} d={26} />
    </Animated.View>
  );
}

const tw = StyleSheet.create({
  root:     { position: 'relative' },
  exhaust:  { position: 'absolute', backgroundColor: '#1A3050', borderRadius: 3 },
  fairing:  { position: 'absolute', backgroundColor: '#1A3050', borderTopLeftRadius: 6, borderTopRightRadius: 10 },
  trailer: {
    position: 'absolute', left: 0,
    backgroundColor: '#122030', borderRadius: 3, overflow: 'hidden',
  },
  trailerStripe: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3, backgroundColor: '#F5A623', opacity: 0.75,
  },
  rib: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: '#1A3040' },
  cab: {
    position: 'absolute',
    backgroundColor: '#1C304E', borderTopRightRadius: 8, overflow: 'hidden',
  },
  windshield: {
    position: 'absolute', backgroundColor: '#091520',
    borderRadius: 3, borderWidth: 1.5, borderColor: '#243C5A',
  },
  sideWin: {
    position: 'absolute', backgroundColor: '#091520',
    borderRadius: 3, borderWidth: 1, borderColor: '#1E3550',
  },
  doorSeam: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: '#0D1F30' },
  halo:     { position: 'absolute', backgroundColor: '#F5A623', opacity: 0.15, borderRadius: 14 },
  headlight: {
    position: 'absolute', backgroundColor: '#FFF8D6', borderRadius: 2,
    shadowColor: '#F5A623', shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.95, shadowRadius: 14, elevation: 12,
  },
  coupling: { position: 'absolute', backgroundColor: '#243A55', borderRadius: 2 },
  chassis:  { position: 'absolute', left: 0, height: 4, backgroundColor: '#182C40', borderRadius: 2 },
  wheel: {
    position: 'absolute', backgroundColor: '#09141E',
    borderWidth: 2.5, borderColor: '#2E4560',
    alignItems: 'center', justifyContent: 'center',
  },
  hub: { backgroundColor: '#1E3040' },
});

// ─── Road dashes ──────────────────────────────────────────────────────────────
function RoadDashes() {
  const offset = useRef(new Animated.Value(0)).current;
  const DASH = 48, GAP = 32, UNIT = DASH + GAP;

  useEffect(() => {
    Animated.loop(
      Animated.timing(offset, {
        toValue: -UNIT,
        duration: 520,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const count = Math.ceil(SW / UNIT) + 3;
  return (
    <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, height: 4, overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: offset }] }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ width: DASH, height: 4, backgroundColor: '#FFFFFF', opacity: 0.3, borderRadius: 2, marginRight: GAP }} />
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Google G logo ────────────────────────────────────────────────────────────
function GoogleG() {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 13, fontWeight: '900', color: '#4285F4', lineHeight: 15 }}>G</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: Props) {
  const { login, loginWithSocial } = useAuth();
  const { theme, isDark }          = useTheme();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [focused,     setFocused]     = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [socialBusy,  setSocialBusy]  = useState<'google' | 'apple' | null>(null);

  // ── Truck bob ──
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0,  duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Google OAuth ──
  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    clientId:        GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const { authentication } = googleResponse;
    if (!authentication?.accessToken) return;

    setSocialBusy('google');
    googleAuth(authentication.accessToken)
      .then(({ token, user }) => loginWithSocial(token, user))
      .catch(err => Alert.alert('Google Sign-In Failed', err?.response?.data?.message ?? err.message))
      .finally(() => setSocialBusy(null));
  }, [googleResponse]);

  const handleGoogleSignIn = () => {
    if (GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')) {
      Alert.alert('Not Configured', 'Add your Google Client IDs to src/constants/googleAuth.ts first.');
      return;
    }
    googlePrompt();
  };

  // ── Apple Sign-In ──
  const handleAppleSignIn = async () => {
    try {
      setSocialBusy('apple');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(' ') || undefined;
      const { token, user } = await appleAuth(credential.identityToken!, fullName);
      await loginWithSocial(token, user);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In Failed', err?.response?.data?.message ?? err.message);
      }
    } finally {
      setSocialBusy(null);
    }
  };

  // ── Email / Password ──
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    s.inputBox,
    {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F0F4F8',
      borderColor: focused === field
        ? theme.secondary
        : isDark ? 'rgba(255,255,255,0.18)' : theme.border,
      borderWidth: focused === field ? 1.5 : 1,
    },
  ];

  // The solid bg color used for the form section and the gradient fade target
  const solidBg = isDark ? '#021B3A' : '#FFFFFF';

  return (
    <View style={[s.root, { backgroundColor: solidBg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            bounces={false}
          >

            {/* ══ HERO ═══════════════════════════════════════════════════════ */}
            <View style={[s.hero, { height: HERO_H }]}>

              {/* Night sky gradient */}
              <LinearGradient
                colors={['#010C18', '#011526', '#021B3A']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />

              {/* Stars */}
              {STARS.map((st, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: (st.x / 100) * SW,
                    top: (st.y / 100) * HERO_H,
                    width: st.r * 2,
                    height: st.r * 2,
                    borderRadius: st.r,
                    backgroundColor: '#FFFFFF',
                    opacity: 0.55 + (i % 5) * 0.08,
                  }}
                />
              ))}

              {/* Road surface */}
              <View style={s.road}>
                <View style={s.roadEdge} />
                <RoadDashes />
              </View>

              {/* Truck centered above road */}
              <View style={s.truckWrap}>
                <TruckIllustration bob={bob} />
              </View>

              {/* Smooth fade from hero → solid form background */}
              <LinearGradient
                colors={['transparent', solidBg as string]}
                style={s.heroFade}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </View>

            {/* ══ FORM ════════════════════════════════════════════════════════ */}
            <View style={[s.form, { backgroundColor: solidBg }]}>

              {/* Logo */}
              <View style={s.logoWrap}>
                <View style={s.logoPill}>
                  <Image
                    source={require('../../../assets/logo/cst_logo_white.png')}
                    style={s.logoImg}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={[s.title, { color: theme.text }]}>Welcome back</Text>
              <Text style={[s.subtitle, { color: theme.textMuted }]}>Sign in to your account</Text>

              <View style={s.fields}>

                {/* Email */}
                <View style={inputStyle('email')}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={focused === 'email' ? theme.secondary : theme.textMuted}
                    style={s.icon}
                  />
                  <TextInput
                    style={[s.input, { color: theme.text }]}
                    placeholder="Email address"
                    placeholderTextColor={theme.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                {/* Password */}
                <View style={inputStyle('password')}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={focused === 'password' ? theme.secondary : theme.textMuted}
                    style={s.icon}
                  />
                  <TextInput
                    style={[s.input, { color: theme.text }]}
                    placeholder="Password"
                    placeholderTextColor={theme.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPwd}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPwd(v => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPwd ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot */}
                <TouchableOpacity
                  style={s.forgotRow}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={[s.forgotText, { color: theme.secondary }]}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign In */}
                <TouchableOpacity
                  style={[s.signInBtn, { backgroundColor: theme.secondary }, loading && s.disabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.87}
                >
                  {loading
                    ? <ActivityIndicator color={isDark ? '#021B3A' : '#FFFFFF'} />
                    : <Text style={[s.signInText, { color: '#021B3A' }]}>Sign In</Text>
                  }
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.divRow}>
                  <View style={[s.divLine, { backgroundColor: theme.border }]} />
                  <Text style={[s.divLabel, { color: theme.textMuted }]}>or continue with</Text>
                  <View style={[s.divLine, { backgroundColor: theme.border }]} />
                </View>

                {/* Google */}
                <TouchableOpacity
                  style={[s.socialBtn, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F9' }, socialBusy === 'google' && s.disabled]}
                  onPress={handleGoogleSignIn}
                  disabled={!!socialBusy || loading}
                  activeOpacity={0.87}
                >
                  {socialBusy === 'google'
                    ? <ActivityIndicator size="small" color={theme.textMuted} style={{ width: 22 }} />
                    : <GoogleG />
                  }
                  <Text style={[s.socialText, { color: theme.text }]}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Apple — only available on iOS */}
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[s.socialBtn, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F4F6F9' }, socialBusy === 'apple' && s.disabled]}
                    onPress={handleAppleSignIn}
                    disabled={!!socialBusy || loading}
                    activeOpacity={0.87}
                  >
                    {socialBusy === 'apple'
                      ? <ActivityIndicator size="small" color={theme.textMuted} style={{ width: 22 }} />
                      : <Ionicons name="logo-apple" size={20} color={theme.text} />
                    }
                    <Text style={[s.socialText, { color: theme.text }]}>Continue with Apple</Text>
                  </TouchableOpacity>
                )}

                {/* Register */}
                <TouchableOpacity
                  style={[s.registerBtn, { borderColor: theme.border }]}
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.87}
                >
                  <Text style={[s.registerText, { color: theme.text }]}>Create an account</Text>
                </TouchableOpacity>
              </View>

              {/* Legal */}
              <View style={s.legal}>
                <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                  <Text style={[s.legalLink, { color: theme.textMuted }]}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={[s.legalDot, { color: theme.border }]}>·</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
                  <Text style={[s.legalLink, { color: theme.textMuted }]}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flexGrow: 1 },

  // Hero
  hero: { width: '100%', overflow: 'hidden' },
  road: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
    backgroundColor: '#0A1A28',
  },
  roadEdge: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: '#F5A623', opacity: 0.4,
  },
  truckWrap: {
    position: 'absolute',
    bottom: 36,
    left: 0, right: 0,
    alignItems: 'center',
  },
  heroFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 80,
  },

  // Form
  form: { paddingHorizontal: 26, paddingBottom: 28 },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 18, marginTop: -12 },
  logoPill: {
    backgroundColor: '#021B3A',
    borderRadius: 16,
    paddingHorizontal: 22, paddingVertical: 12,
  },
  logoImg: { width: 150, height: 52 },

  title:    { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },

  // Fields
  fields: { gap: 12 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 14, height: 54,
  },
  icon:  { marginRight: 10 },
  input: { flex: 1, fontSize: 15 },

  forgotRow:  { alignSelf: 'flex-end', marginTop: -2 },
  forgotText: { fontSize: 13, fontWeight: '600' },

  signInBtn: {
    height: 54, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  signInText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  disabled:   { opacity: 0.6 },

  divRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divLine: { flex: 1, height: 1 },
  divLabel:{ fontSize: 12, fontWeight: '500' },

  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    height: 54, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 20, gap: 14,
  },
  socialText: { flex: 1, fontSize: 15, fontWeight: '600', textAlign: 'center', marginRight: 22 },

  registerBtn: {
    height: 54, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  registerText: { fontSize: 15, fontWeight: '700' },

  legal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
  legalDot:  { fontSize: 11 },
});
