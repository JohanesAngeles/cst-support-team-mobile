import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

const PROFESSIONAL_ROLES = [
  'Legal Consultant · 20-Year Legal Investigator',
  'Actor & Reality Television Personality',
  '21-Year Fugitive Recovery Instructor',
  '35-Year Martial Arts Practitioner & Instructor',
  'Senior Investigator / Volunteer — Missing Children Investigation Agency',
  'Public Speaker, Bodyguard, Mediator & Content Creator',
  'Transportation Advocate, Business Strategist & Radio Guest Personality',
];

const KNOWN_BRANDS = [
  'California School of Trucking — Creator of the Road Ready Program',
  'TRAC Podcast',
  'LEGAL Defense Investigations & Mediation Services',
  "America's Top Trucker",
  'Founder — US Enforcement Agency Online Magazine',
  'Co-Inventor of MegaBeam Flashlight',
  'Founder — Bring It to Reality Video Investigations',
  'Supporter of SafeKidZone.com',
];

const LEGAL_FOCUS = [
  'Civil, family, and criminal case support',
  'Investigative research and evidence review',
  'Transportation compliance and driver accountability',
  'Public safety advocacy and child protection support',
];

export default function DeveloperScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },
    hero: {
      backgroundColor: '#021B3A', borderRadius: 20, padding: 28,
      alignItems: 'center', gap: 10, marginBottom: 24,
    },
    avatarCircle: {
      width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 2, borderColor: '#F4C430', justifyContent: 'center', alignItems: 'center',
      marginBottom: 6, overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    name: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center' },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#F4C430', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4,
    },
    roleBadgeText: { color: '#021B3A', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    titleText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginTop: 4 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
      borderWidth: 1, borderColor: Colors.border, gap: 10, marginBottom: 16,
    },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
    cardBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
    bulletRow: { flexDirection: 'row', gap: 8 },
    bulletDot: { color: '#F4C430', fontSize: 13, lineHeight: 20 },
    bulletText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
    quoteCard: {
      backgroundColor: '#021B3A', borderRadius: 16, padding: 20,
      alignItems: 'center', marginBottom: 16,
    },
    quoteText: { color: '#F4C430', fontSize: 16, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' },
    footer: { color: Colors.border, fontSize: 12, textAlign: 'center', marginTop: 12 },
  }), [Colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Image
              source={require('../../../assets/images/Otis_Cooper_Image.jpeg')}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.name}>Otis Lee Cooper Jr.</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="construct" size={13} color="#021B3A" />
            <Text style={styles.roleBadgeText}>APP DEVELOPER</Text>
          </View>
          <Text style={styles.titleText}>Bounty Hunter Trucker</Text>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About Otis L. Cooper</Text>
          <Text style={styles.cardBody}>
            Otis Lee Cooper Jr. — known throughout the transportation industry as "Bounty Hunter
            Trucker" — is a third-generation trucking professional, legal consultant, actor,
            instructor, investigator, entrepreneur, media personality, and transportation advocate
            with more than three decades of real-world experience spanning transportation,
            compliance, safety, investigations, media, and business development. He is also the
            developer of this app, built to give truckers a single place to log hours, track
            expenses, find help on the road, and stay protected.
          </Text>
          <Text style={styles.cardBody}>
            Born in Pinal County, Arizona, Cooper has built a reputation around one core philosophy:
            Responsibility • Accountability • Consequences. That philosophy is the foundation of his
            training systems, legal consulting work, media platforms, investigative services, and
            public advocacy throughout the trucking and transportation industries.
          </Text>
          <Text style={styles.cardBody}>
            Cooper obtained his commercial driving license at 18 years old operating a twin-stick
            transmission truck, building his foundation in traditional hands-on trucking before
            expanding into high-value freight, movie and trade show transportation, agriculture,
            flatbed, hopper, tanker, refrigeration unit operations, and military-related freight
            support.
          </Text>
          <Text style={styles.cardBody}>
            A proud Native American, Cooper is a former congressional candidate for California's
            25th District, an FMCSA-certified transportation professional, a 34-year CDL holder,
            longtime instructor, martial arts instructor, and public speaker committed to raising
            standards within the trucking industry.
          </Text>
        </View>

        {/* Road Ready Program */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>The Road Ready Program</Text>
          <Text style={styles.cardBody}>
            He is the founder and creator of the Road Ready Program for the California School of
            Trucking — an advanced driver training concept designed to take students far beyond
            basic CDL instruction. The program focuses on real-world preparedness, defensive
            driving, mountain driving, brake adjustments, FMCSA compliance, cargo securement, snow
            chains, inspections, and professional driver responsibility.
          </Text>
        </View>

        {/* Media */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Media & Recognition</Text>
          <Text style={styles.cardBody}>
            Cooper is recognized as a writer, contributor, and media personality featured in Truck
            Club Magazine, El Troquero Newspaper, SiriusXM Radio, transportation podcasts, and news
            media platforms. He has appeared on Fox 11 News, KTLA 5 News, City Watch LA, and in
            national publications including Home Defender Magazine and The Banksters: Madoff with
            America. He is the original Cooper of Cooper's Crusaders reality show, and has appeared
            on the Teen 911 Reality Show and in the Slumlords documentary.
          </Text>
        </View>

        {/* Professional Roles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Professional Roles & Background</Text>
          {PROFESSIONAL_ROLES.map((item) => (
            <View style={styles.bulletRow} key={item}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Known Brands */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Known Brands & Projects</Text>
          {KNOWN_BRANDS.map((item) => (
            <View style={styles.bulletRow} key={item}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Legal & Investigative Focus */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal & Investigative Focus</Text>
          {LEGAL_FOCUS.map((item) => (
            <View style={styles.bulletRow} key={item}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"Ignorance is expensive."</Text>
        </View>

        <Text style={styles.footer}>Road Ready Network · Built for truckers, by truckers</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
