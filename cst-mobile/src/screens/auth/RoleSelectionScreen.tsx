import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'RoleSelection'> };

export default function RoleSelectionScreen({ navigation }: Props) {
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

        {/* Hidden admin entry — hamburger top-left, no label */}
        <TouchableOpacity
          style={s.adminEntry}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="menu" size={22} color="rgba(255,255,255,0.25)" />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoMark}>
            <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
          </View>
          <Text style={s.appName}>Road Ready Network</Text>
          <Text style={s.tagline}>The one-stop shop for trucking professionals</Text>
        </View>

        {/* Role cards */}
        <View style={s.cards}>
          <Text style={s.chooseLabel}>How will you use this app?</Text>

          {/* Driver card */}
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.06)']}
              style={s.cardGradient}
            >
              <View style={[s.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="car-sport" size={30} color="#FFFFFF" />
              </View>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>I'm a Driver</Text>
                <Text style={s.cardSub}>Free access to 65+ tools — HOS, IFTA, fuel maps, AI legal assistant, and more.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Partner card */}
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate('PartnerGateway')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['rgba(212,160,23,0.25)', 'rgba(212,160,23,0.10)']}
              style={s.cardGradient}
            >
              <View style={[s.iconCircle, { backgroundColor: 'rgba(212,160,23,0.30)' }]}>
                <Ionicons name="business" size={30} color="#F5C842" />
              </View>
              <View style={s.cardText}>
                <View style={s.badgeRow}>
                  <Text style={s.cardTitle}>Founding Partner</Text>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>BUSINESS</Text>
                  </View>
                </View>
                <Text style={s.cardSub}>List your business on the network and reach thousands of drivers nationwide.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(245,200,66,0.6)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>By continuing you agree to our</Text>
          <View style={s.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={s.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={s.footerDot}> · </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text style={s.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1 },
  safe:  { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },

  adminEntry: { alignSelf: 'flex-start', padding: 4, marginTop: 4, marginBottom: -8 },

  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  appName:  { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  tagline:  { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6, textAlign: 'center' },

  cards:       { gap: 14 },
  chooseLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },

  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardGradient: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, gap: 16,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cardText:  { flex: 1, gap: 5 },
  badgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  cardSub:   { fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 18 },

  badge: {
    backgroundColor: 'rgba(245,200,66,0.22)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.4)',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#F5C842', letterSpacing: 0.8 },

  footer:      { alignItems: 'center', paddingBottom: 8, gap: 4 },
  footerText:  { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  footerLinks: { flexDirection: 'row', alignItems: 'center' },
  footerLink:  { fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },
  footerDot:   { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
});
