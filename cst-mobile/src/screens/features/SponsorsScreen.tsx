import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface Partner {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  website?: string;
  phone?: string;
  icon: string;
  iconColor: string;
  logo?: string;
  featured?: boolean;
  veteran?: boolean;
  comingSoon?: boolean;
}

// Verify website URLs match what was agreed in the partnership — from 2026-06-03 meeting
const PARTNERS: Partner[] = [
  {
    id: 'trucklop',
    name: 'Trucklop Magazine',
    category: 'Media & Industry News',
    tagline: 'The Voice of the Trucking Industry',
    description:
      'Road Ready Network proudly partners with Trucklop Magazine — the go-to publication for trucking professionals. Otis Cooper contributes monthly articles on compliance, business strategy, and driver advocacy. New issues featured here each month.',
    website: 'https://truckclopmagazine.com',
    icon: 'newspaper-outline',
    iconColor: '#021B3A',
    logo: 'https://logo.clearbit.com/truckclopmagazine.com',
    featured: true,
  },
  {
    id: 'truckclub',
    name: 'Truck Club Magazine',
    category: 'Media & Trucking Culture',
    tagline: 'Where Trucking Culture Lives',
    description:
      'Truck Club Magazine celebrates the lifestyle, culture, and community behind the wheel. From custom rigs and road stories to industry news and driver spotlights — this is the magazine built for truckers who take pride in the craft. Road Ready Network is proud to have them as our first official sponsor.',
    website: 'https://truckclubmagazine.com',
    icon: 'journal-outline',
    iconColor: '#C0392B',
    logo: 'https://logo.clearbit.com/truckclubmagazine.com',
    featured: true,
  },
  {
    id: 'digitalstudios',
    name: 'Digital Studios Network',
    category: 'Veterans Media & Entertainment',
    tagline: 'Built by Veterans. Powered by Purpose.',
    description:
      'Digital Studios Network is a veteran-owned media platform delivering content that matters — from business and entrepreneurship to community storytelling. Road Ready Network is proud to stand alongside fellow veteran-led organizations building something greater.',
    website: 'https://www.digitalstudios.tv',
    icon: 'tv-outline',
    iconColor: '#E67E22',
    logo: 'https://logo.clearbit.com/digitalstudios.tv',
    featured: true,
    veteran: true,
  },
  {
    id: 'slot-insurance',
    name: 'Your Business Here',
    category: 'Insurance & Legal',
    tagline: 'Reach 10,000+ trucking professionals',
    description:
      'Law firms, insurance providers, and freight brokers — put your brand in front of owner-operators and fleet managers across the United States.',
    icon: 'shield-checkmark-outline',
    iconColor: '#3498DB',
    comingSoon: true,
  },
  {
    id: 'slot-services',
    name: 'Become a Road Ready Network Partner',
    category: 'Truck Services & Fuel',
    tagline: 'Target your ideal trucking audience',
    description:
      'Fuel networks, maintenance shops, factoring companies — advertise directly inside the app used by professional drivers every day.',
    icon: 'business-outline',
    iconColor: '#27AE60',
    comingSoon: true,
  },
];

function PartnerCard({ partner }: { partner: Partner }) {
  const Colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: Colors.surface, borderColor: Colors.border },
        partner.featured && { borderColor: '#021B3A', borderWidth: 2 },
      ]}
    >
      <View style={styles.badgeRow}>
        {partner.featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={9} color="#FFFFFF" />
            <Text style={styles.badgeTxt}>FEATURED PARTNER</Text>
          </View>
        )}
        {partner.veteran && (
          <View style={[styles.featuredBadge, { backgroundColor: '#8B0000', marginLeft: 6 }]}>
            <Text style={styles.badgeTxt}>🎖️ VETERAN-OWNED</Text>
          </View>
        )}
        {partner.comingSoon && (
          <View style={[styles.featuredBadge, { backgroundColor: '#8E8E93' }]}>
            <Text style={styles.badgeTxt}>PARTNER SLOT AVAILABLE</Text>
          </View>
        )}
      </View>

      <View style={styles.cardHeader}>
        {partner.logo ? (
          <View style={styles.logoWrap}>
            <Image
              source={{ uri: partner.logo }}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: partner.iconColor + '18' }]}>
            <Ionicons name={partner.icon as any} size={28} color={partner.iconColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.partnerName, { color: Colors.text }]}>{partner.name}</Text>
          <Text style={[styles.categoryLabel, { color: partner.iconColor }]}>{partner.category}</Text>
        </View>
      </View>

      <Text style={[styles.tagline, { color: Colors.text }]}>{partner.tagline}</Text>
      <Text style={[styles.description, { color: Colors.textMuted }]}>{partner.description}</Text>

      <View style={styles.actions}>
        {partner.website && !partner.comingSoon && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#021B3A' }]}
            onPress={() => Linking.openURL(partner.website!)}
            activeOpacity={0.85}
          >
            <Ionicons name="globe-outline" size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnTxt}>Visit Website</Text>
          </TouchableOpacity>
        )}
        {partner.phone && !partner.comingSoon && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#27AE60' }]}
            onPress={() => Linking.openURL(`tel:${partner.phone}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="call-outline" size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnTxt}>Call</Text>
          </TouchableOpacity>
        )}
        {partner.comingSoon && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#021B3A' }]}
            onPress={() =>
              Linking.openURL(
                'mailto:caschooloftruckingofficial@gmail.com?subject=Partnership%20Inquiry'
              )
            }
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={14} color="#FFFFFF" />
            <Text style={styles.actionBtnTxt}>Contact Us</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function SponsorsScreen() {
  const Colors = useColors();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: Colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="ribbon-outline" size={38} color="#F4C430" />
          <Text style={styles.heroTitle}>Road Ready Network Partners & Sponsors</Text>
          <Text style={styles.heroSub}>
            Industry businesses vetted and trusted by Road Ready Network — proudly built in collaboration with the California School of Trucking.
          </Text>
        </View>

        {/* Partner cards */}
        {PARTNERS.map(p => <PartnerCard key={p.id} partner={p} />)}

        {/* Advertise CTA */}
        <View style={[styles.ctaBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="megaphone-outline" size={24} color="#021B3A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaTitle, { color: Colors.text }]}>Want to advertise here?</Text>
            <Text style={[styles.ctaSub, { color: Colors.textMuted }]}>
              Reach thousands of truckers daily. Email us to discuss partnership options.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() =>
                Linking.openURL(
                  'mailto:caschooloftruckingofficial@gmail.com?subject=Partnership%20Inquiry'
                )
              }
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnTxt}>Get In Touch</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  hero: {
    backgroundColor: '#021B3A', borderRadius: 18,
    padding: 24, alignItems: 'center', gap: 8,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  heroSub:   { color: '#A8C4E0', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },

  badgeRow: { flexDirection: 'row' },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#021B3A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeTxt: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
  },
  logoWrap: {
    width: 54, height: 54, borderRadius: 12,
    backgroundColor: '#FFFFFF', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E5EA',
  },
  logoImg: { width: 46, height: 46 },
  partnerName:   { fontSize: 16, fontWeight: '800' },
  categoryLabel: { fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },

  tagline:     { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  description: { fontSize: 13, lineHeight: 19 },

  actions:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
  },
  actionBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  ctaBox: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  ctaIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#021B3A18',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  ctaTitle: { fontSize: 14, fontWeight: '800' },
  ctaSub:   { fontSize: 12, lineHeight: 17, marginTop: 3, marginBottom: 10 },
  ctaBtn: {
    backgroundColor: '#021B3A', alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
  },
  ctaBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
