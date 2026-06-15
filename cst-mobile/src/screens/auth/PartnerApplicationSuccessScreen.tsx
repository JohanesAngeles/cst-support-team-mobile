import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'PartnerApplicationSuccess'> };

export default function PartnerApplicationSuccessScreen({ navigation }: Props) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#021B3A', '#03306B', '#021B3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        <View style={s.content}>
          {/* Success icon */}
          <View style={s.iconWrap}>
            <LinearGradient
              colors={['#D4A017', '#F5C842']}
              style={s.iconCircle}
            >
              <Ionicons name="checkmark" size={44} color="#021B3A" />
            </LinearGradient>
          </View>

          <Text style={s.title}>Application Submitted!</Text>
          <Text style={s.subtitle}>
            Thank you for applying to join the Road Ready Network as a Founding Partner.
          </Text>

          <View style={s.infoCard}>
            {[
              { icon: 'time-outline',         text: 'We\'ll review your application within 2–3 business days.' },
              { icon: 'mail-outline',          text: 'You\'ll receive an email with your account credentials once approved.' },
              { icon: 'shield-checkmark-outline', text: 'Founding Partners get 30 days free — no credit card needed to apply.' },
            ].map((item, i) => (
              <View key={i} style={[s.infoRow, i < 2 && s.infoRowBorder]}>
                <View style={s.infoIcon}>
                  <Ionicons name={item.icon as any} size={18} color="#F5C842" />
                </View>
                <Text style={s.infoText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom action */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.homeBtn}
            onPress={() => navigation.navigate('RoleSelection')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#D4A017', '#F5C842']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.homeBtnGradient}
            >
              <Ionicons name="home-outline" size={20} color="#021B3A" />
              <Text style={s.homeBtnText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={s.loginBtnText}>Already approved? Sign in →</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },

  iconWrap: {
    marginBottom: 8,
    shadowColor: '#D4A017',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
  },

  title:    { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.60)', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },

  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: 8,
  },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(212,160,23,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1,
  },
  infoText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 19 },

  actions: { gap: 12, paddingBottom: 8 },

  homeBtn:         { borderRadius: 16, overflow: 'hidden' },
  homeBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, gap: 10,
  },
  homeBtnText: { fontSize: 16, fontWeight: '800', color: '#021B3A' },

  loginBtn:     { alignItems: 'center', paddingVertical: 10 },
  loginBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.50)', fontWeight: '600' },
});
