import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'PartnerGateway'> };

export default function PartnerGatewayScreen({ navigation }: Props) {
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

        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Ionicons name="business" size={36} color="#F5C842" />
          </View>
          <Text style={s.title}>Founding Partner</Text>
          <Text style={s.subtitle}>
            Join the Road Ready Network and put your business in front of thousands of drivers across the country.
          </Text>
        </View>

        {/* Benefits */}
        <View style={s.benefits}>
          {[
            { icon: 'map-outline',       text: 'Your business listed on our driver map' },
            { icon: 'star-outline',       text: 'Receive ratings and reviews from real drivers' },
            { icon: 'trending-up-outline', text: 'Analytics on views and clicks' },
            { icon: 'pricetag-outline',   text: '$10/month or $100/year — first 30 days free' },
          ].map((item, i) => (
            <View key={i} style={s.benefitRow}>
              <View style={s.benefitIcon}>
                <Ionicons name={item.icon as any} size={18} color="#F5C842" />
              </View>
              <Text style={s.benefitText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.applyBtn}
            onPress={() => navigation.navigate('PartnerApplication')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#D4A017', '#F5C842']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.applyGradient}
            >
              <Ionicons name="document-text-outline" size={20} color="#021B3A" />
              <Text style={s.applyBtnText}>Apply to Become a Founding Partner</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={s.loginBtnText}>I Already Have a Partner Account</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },

  backBtn: { padding: 4, alignSelf: 'flex-start', paddingTop: 16, marginBottom: 8 },

  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 28 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(212,160,23,0.20)',
    borderWidth: 1.5, borderColor: 'rgba(245,200,66,0.35)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  title:    { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 10, textAlign: 'center', lineHeight: 20 },

  benefits: { gap: 14, marginBottom: 36 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(212,160,23,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  benefitText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 19 },

  actions: { gap: 12 },

  applyBtn:      { borderRadius: 16, overflow: 'hidden' },
  applyGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, gap: 10,
  },
  applyBtnText: { fontSize: 15, fontWeight: '800', color: '#021B3A' },

  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  loginBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
});
