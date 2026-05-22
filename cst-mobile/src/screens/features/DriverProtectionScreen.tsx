import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Section {
  title: string;
  icon: string;
  color: string;
  items: { q: string; a: string }[];
}

const SECTIONS: Section[] = [
  {
    title: 'Anti-Coercion Rules',
    icon: 'shield-checkmark-outline',
    color: '#E74C3C',
    items: [
      {
        q: 'What is coercion?',
        a: 'Coercion is when a motor carrier, shipper, broker, or receiver threatens a driver with loss of a job, contract, or business to make them violate FMCSA safety regulations (HOS, weight limits, etc.).',
      },
      {
        q: 'Is coercion illegal?',
        a: 'Yes. Under 49 CFR Part 390.6, it is illegal for anyone to coerce a driver to violate federal safety rules. Violators can face civil penalties up to $16,000 per violation.',
      },
      {
        q: 'How do I report coercion?',
        a: 'File a complaint with FMCSA at 1-888-DOT-SAFT (1-888-368-7238) or online at nccdb.dot.gov. You are protected from retaliation for reporting.',
      },
      {
        q: 'Can I refuse a load if it violates safety rules?',
        a: 'Yes. You have the right to refuse any load, dispatch, or instruction that would require you to violate HOS, weight limits, or any FMCSA safety regulation — without penalty.',
      },
    ],
  },
  {
    title: 'Your FMCSA Rights',
    icon: 'document-text-outline',
    color: '#3498DB',
    items: [
      {
        q: 'Right to refuse unsafe equipment',
        a: 'You can refuse to operate a vehicle you believe is unsafe. Under the Surface Transportation Assistance Act (STAA), you cannot be fired or punished for refusing to drive an unsafe vehicle.',
      },
      {
        q: 'Right to accurate HOS records',
        a: 'Your Electronic Logging Device (ELD) must accurately reflect your driving time. No one can instruct you to falsify your logs. Falsification is a serious federal violation.',
      },
      {
        q: 'Whistleblower protection',
        a: 'STAA protects drivers who report safety violations. If you are fired or retaliated against for reporting, file a complaint with OSHA within 180 days at 1-800-321-OSHA.',
      },
      {
        q: 'Right to sleep',
        a: 'You are entitled to your full 10-hour off-duty period (11-hour driving rule). No carrier can pressure you to skip rest. Fatigued driving is a federal safety violation.',
      },
      {
        q: 'Independent contractor rights',
        a: 'As an O/O or lease operator, review your lease agreement carefully. Under 49 CFR Part 376, carriers must give you a copy of all settlements and charge-backs must be itemized.',
      },
    ],
  },
  {
    title: 'Mental Health & Wellness',
    icon: 'heart-outline',
    color: '#2ECC71',
    items: [
      {
        q: 'NATSO Driver Wellness Resources',
        a: 'NATSO Foundation offers trucking-specific wellness resources. Visit natso.com/foundation for programs on physical and mental health for professional drivers.',
      },
      {
        q: 'Road-related stress',
        a: 'Long hauls, traffic, and isolation are major stressors. Take regular breaks, stay connected with family, and do not hesitate to pull over and rest if you feel overwhelmed.',
      },
      {
        q: 'Substance use help',
        a: 'The FMCSA Drug & Alcohol Clearinghouse is not a help line — it tracks violations. For substance use support, contact SAMHSA at 1-800-662-4357 (free, confidential, 24/7).',
      },
      {
        q: 'Suicide prevention',
        a: 'Truckers are at higher risk for depression and isolation. National Suicide Prevention Lifeline: call or text 988. Available 24/7, free and confidential.',
      },
    ],
  },
  {
    title: 'Roadside Inspection Rights',
    icon: 'search-outline',
    color: '#9B59B6',
    items: [
      {
        q: 'Can I be detained for a long inspection?',
        a: 'Officers can conduct Level I–VI inspections. A Level I (full inspection) can take 45–90 minutes. You must comply, but you can ask for a copy of the inspection report.',
      },
      {
        q: 'Out-of-service (OOS) orders',
        a: 'If placed OOS, you cannot drive until the violation is corrected. Driving OOS is a serious violation. Call your carrier and document everything.',
      },
      {
        q: 'Your right to a fair inspection',
        a: 'Officers must follow CVSA inspection procedures. If you believe an inspection was improper, document the officer\'s name/badge and contact your carrier or FMCSA.',
      },
      {
        q: 'DataQ challenges',
        a: 'You can challenge inaccurate inspection data via FMCSA\'s DataQs system at dataqs.fmcsa.dot.gov. Incorrect violations can hurt your CSA score — always challenge errors.',
      },
    ],
  },
];

export default function DriverProtectionScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="shield-half-outline" size={28} color={Colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Driver Protection Center</Text>
            <Text style={styles.bannerSub}>Know your rights. Stay protected on every mile.</Text>
          </View>
        </View>

        <View style={styles.emergencyRow}>
          <View style={styles.emergencyCard}>
            <Ionicons name="call-outline" size={20} color='#E74C3C' />
            <Text style={styles.emergencyLabel}>Coercion Hotline</Text>
            <Text style={styles.emergencyNum}>1-888-368-7238</Text>
          </View>
          <View style={styles.emergencyCard}>
            <Ionicons name="heart-outline" size={20} color='#2ECC71' />
            <Text style={styles.emergencyLabel}>Crisis Line</Text>
            <Text style={styles.emergencyNum}>Call/Text 988</Text>
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={[styles.section, { borderLeftColor: section.color }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section.color + '22' }]}>
                <Ionicons name={section.icon as any} size={20} color={section.color} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.items.map((item) => {
              const key = `${section.title}-${item.q}`;
              const open = expanded === key;
              return (
                <TouchableOpacity key={key} style={styles.item} onPress={() => toggle(key)} activeOpacity={0.7}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemQ}>{item.q}</Text>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
                  </View>
                  {open && <Text style={styles.itemA}>{item.a}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            For informational purposes only. Not legal advice. Consult a transportation attorney for specific legal matters.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.secondary + '18', borderRadius: 14,
    padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.secondary + '44',
  },
  bannerTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  bannerSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  emergencyRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  emergencyCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  emergencyLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
  emergencyNum: { color: Colors.white, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  section: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, padding: 14, marginBottom: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: Colors.white, fontSize: 15, fontWeight: '800', flex: 1 },
  item: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemQ: { color: Colors.secondary, fontSize: 13, fontWeight: '700', flex: 1 },
  itemA: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border, marginTop: 4,
  },
  disclaimerText: { color: Colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
});
