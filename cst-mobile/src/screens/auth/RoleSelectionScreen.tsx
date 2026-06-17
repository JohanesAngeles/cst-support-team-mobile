import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthStack';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'RoleSelection'> };

export default function RoleSelectionScreen({ navigation }: Props) {
  const Colors  = useColors();
  const { isDark } = useTheme();

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* Hidden admin entry */}
        <TouchableOpacity
          style={s.adminEntry}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="menu" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={[s.logoMark, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <Ionicons name="shield-checkmark" size={36} color={Colors.primary} />
          </View>
          <Text style={[s.appName, { color: Colors.text }]}>Road Ready Network</Text>
          <Text style={[s.tagline, { color: Colors.textMuted }]}>
            The one-stop shop for trucking professionals
          </Text>
        </View>

        {/* Role cards */}
        <View style={s.cards}>
          <Text style={[s.chooseLabel, { color: Colors.textMuted }]}>How will you use this app?</Text>

          {/* Driver card */}
          <TouchableOpacity
            style={[s.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.88}
          >
            <View style={[s.iconCircle, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="car-sport" size={30} color={Colors.primary} />
            </View>
            <View style={s.cardText}>
              <Text style={[s.cardTitle, { color: Colors.text }]}>I'm a Driver</Text>
              <Text style={[s.cardSub, { color: Colors.textMuted }]}>
                Free access to 65+ tools — HOS, IFTA, fuel maps, AI legal assistant, and more.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Partner card */}
          <TouchableOpacity
            style={[s.card, { backgroundColor: Colors.surface, borderColor: '#D4A017' + '55' }]}
            onPress={() => navigation.navigate('PartnerGateway')}
            activeOpacity={0.88}
          >
            <View style={[s.iconCircle, { backgroundColor: '#F5C842' + '22' }]}>
              <Ionicons name="business" size={30} color="#D4A017" />
            </View>
            <View style={s.cardText}>
              <View style={s.badgeRow}>
                <Text style={[s.cardTitle, { color: Colors.text }]}>Founding Partner</Text>
                <View style={s.badge}>
                  <Text style={s.badgeText}>BUSINESS</Text>
                </View>
              </View>
              <Text style={[s.cardSub, { color: Colors.textMuted }]}>
                List your business on the network and reach thousands of drivers nationwide.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: Colors.textMuted }]}>By continuing you agree to our</Text>
          <View style={s.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={[s.footerLink, { color: Colors.secondary }]}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={[s.footerDot, { color: Colors.textMuted }]}> · </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
              <Text style={[s.footerLink, { color: Colors.secondary }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },

  adminEntry: { alignSelf: 'flex-start', padding: 4, marginTop: 4, marginBottom: -8 },

  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  appName:  { fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  tagline:  { fontSize: 14, marginTop: 6, textAlign: 'center' },

  cards:       { gap: 14 },
  chooseLabel: {
    fontSize: 13, fontWeight: '600', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 4, textAlign: 'center',
  },

  card: {
    borderRadius: 20, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
    padding: 20, gap: 16,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  cardText:  { flex: 1, gap: 5 },
  badgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardSub:   { fontSize: 13, lineHeight: 18 },

  badge: {
    backgroundColor: 'rgba(245,200,66,0.22)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.5)',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#D4A017', letterSpacing: 0.8 },

  footer:      { alignItems: 'center', paddingBottom: 8, gap: 4 },
  footerText:  { fontSize: 12 },
  footerLinks: { flexDirection: 'row', alignItems: 'center' },
  footerLink:  { fontSize: 12, textDecorationLine: 'underline' },
  footerDot:   { fontSize: 12 },
});
