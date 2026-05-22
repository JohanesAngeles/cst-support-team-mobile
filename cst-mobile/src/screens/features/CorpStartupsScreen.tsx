import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Step {
  number: string;
  title: string;
  time: string;
  cost: string;
  color: string;
  details: string[];
  tips?: string;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Choose Your Business Structure',
    time: '1 day',
    cost: 'Free',
    color: '#3498DB',
    details: [
      'Sole Proprietorship — simplest, no separation of personal/business liability. No formal filing required.',
      'LLC (Limited Liability Company) — most popular for owner-operators. Protects personal assets from business debts.',
      'S-Corp — better tax advantages once profitable (saves on self-employment tax). More admin overhead.',
      'Most truckers start as LLC, then elect S-Corp taxation once revenue justifies it.',
    ],
    tips: 'For most owner-operators, start with a single-member LLC. It\'s flexible, affordable, and provides liability protection.',
  },
  {
    number: '02',
    title: 'Form Your LLC',
    time: '1–5 business days',
    cost: '$50–$500 (state filing fee)',
    color: '#9B59B6',
    details: [
      'Go to your state\'s Secretary of State website and file Articles of Organization.',
      'Choose a unique business name (must include "LLC" at the end).',
      'Designate a registered agent — a person or service that receives legal documents.',
      'Pay the state filing fee (varies: ~$50 in Kentucky to ~$500 in Massachusetts).',
      'Most states process online filings in 1–5 business days.',
    ],
    tips: 'Use your state\'s official .gov website to file — avoid third-party services that charge extra fees for the same process.',
  },
  {
    number: '03',
    title: 'Get Your EIN (Tax ID)',
    time: 'Instant (online)',
    cost: 'Free',
    color: '#2ECC71',
    details: [
      'EIN = Employer Identification Number. It\'s like a Social Security Number for your business.',
      'Apply free at irs.gov/ein — takes about 5 minutes online.',
      'You\'ll need it to open a business bank account, hire employees, and file taxes.',
      'Even as a single-member LLC with no employees, you need an EIN for banking.',
      'Never pay a third party to get your EIN — the IRS issues it 100% free.',
    ],
    tips: 'Apply online at IRS.gov during business hours for instant approval. Save your EIN confirmation letter — you\'ll need it for everything.',
  },
  {
    number: '04',
    title: 'Open a Business Bank Account',
    time: '1 day',
    cost: 'Varies (often free)',
    color: '#F39C12',
    details: [
      'Keep business and personal finances completely separate — critical for LLC liability protection.',
      'Bring your EIN, LLC formation documents, and government-issued ID.',
      'Look for accounts with no monthly fees and free ACH transfers (Chase, Bank of America, credit unions).',
      'Consider a business credit card for fuel and expenses — builds business credit.',
    ],
    tips: 'Never mix personal and business money. If a lawsuit happens, commingling funds can "pierce the corporate veil" and destroy your LLC protection.',
  },
  {
    number: '05',
    title: 'Apply for USDOT Number',
    time: '1–2 days',
    cost: 'Free',
    color: '#E67E22',
    details: [
      'Required for all commercial vehicles over 10,001 lbs in interstate commerce.',
      'Apply free at the FMCSA portal: fmcsa.dot.gov/registration',
      'You\'ll need your EIN, business address, and basic vehicle/cargo info.',
      'USDOT number is issued immediately after registration.',
    ],
    tips: 'The USDOT number is free — never pay anyone to get one for you.',
  },
  {
    number: '06',
    title: 'Get Your MC Number (Motor Carrier)',
    time: '20–25 business days',
    cost: '$300',
    color: '#E74C3C',
    details: [
      'MC number is required if you haul regulated commodities for hire across state lines.',
      'Apply at fmcsa.dot.gov/registration at the same time as your USDOT number.',
      '$300 filing fee paid to FMCSA.',
      'After filing, there is a 10-business-day protest period. If no protests, authority is granted.',
      'Full activation takes about 20–25 business days total.',
    ],
    tips: 'You cannot operate for-hire until your MC number is ACTIVE. Check status at safer.fmcsa.dot.gov.',
  },
  {
    number: '07',
    title: 'File BOC-3 (Process Agent)',
    time: 'Same day',
    cost: '$20–$40/year',
    color: '#1ABC9C',
    details: [
      'BOC-3 designates a process agent in every state you operate in (required by FMCSA).',
      'You cannot activate your MC authority without a BOC-3 on file.',
      'Use a BOC-3 filing service — they file in all 50 states for ~$20–$40/year.',
      'Search "BOC-3 filing service" — many reputable companies handle this quickly.',
      'The service files directly with FMCSA on your behalf.',
    ],
    tips: 'File your BOC-3 the same day you get your MC number approved — it\'s the last step before you can legally haul for hire.',
  },
  {
    number: '08',
    title: 'Get Required Insurance',
    time: '1–3 days',
    cost: '$8,000–$15,000+/year',
    color: '#2ECC71',
    details: [
      'Primary liability: minimum $750,000 (most shippers require $1M). Required to activate MC number.',
      'Cargo insurance: protects freight you haul. Most brokers require $100,000 minimum.',
      'Physical damage: covers your truck (collision, comprehensive).',
      'Bobtail/non-trucking liability: covers you when driving without a trailer.',
      'File proof of insurance (Form BMC-91 or BMC-34) with FMCSA through your insurer.',
    ],
    tips: 'Shop multiple trucking insurance brokers. Rates vary widely. Progressive, Great West Casualty, and Old Republic are major carriers.',
  },
];

const CHECKLIST = [
  { label: 'Business structure chosen', done: false },
  { label: 'LLC filed with state', done: false },
  { label: 'EIN obtained from IRS', done: false },
  { label: 'Business bank account opened', done: false },
  { label: 'USDOT number registered', done: false },
  { label: 'MC number applied for', done: false },
  { label: 'BOC-3 filed', done: false },
  { label: 'Insurance purchased & filed', done: false },
];

export default function CorpStartupsScreen() {
  const [expanded, setExpanded] = useState<string | null>('01');
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));

  const toggle = (num: string) => setExpanded(expanded === num ? null : num);
  const toggleCheck = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const completedCount = checked.filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="business-outline" size={28} color={Colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Start Your Trucking Business</Text>
            <Text style={styles.bannerSub}>LLC → EIN → USDOT → MC → BOC-3 → Insurance</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Setup Progress</Text>
            <Text style={styles.progressCount}>{completedCount}/{CHECKLIST.length}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completedCount / CHECKLIST.length) * 100}%` }]} />
          </View>
          <View style={styles.checklistGrid}>
            {CHECKLIST.map((item, i) => (
              <TouchableOpacity key={item.label} style={styles.checkRow} onPress={() => toggleCheck(i)} activeOpacity={0.7}>
                <Ionicons
                  name={checked[i] ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={checked[i] ? Colors.success : Colors.textMuted}
                />
                <Text style={[styles.checkLabel, checked[i] && styles.checkLabelDone]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.stepsTitle}>Step-by-Step Guide</Text>

        {STEPS.map((step) => {
          const open = expanded === step.number;
          return (
            <TouchableOpacity
              key={step.number}
              style={[styles.stepCard, { borderLeftColor: step.color }]}
              onPress={() => toggle(step.number)}
              activeOpacity={0.7}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepNum, { backgroundColor: step.color + '22' }]}>
                  <Text style={[styles.stepNumText, { color: step.color }]}>{step.number}</Text>
                </View>
                <View style={styles.stepMeta}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <View style={styles.stepPills}>
                    <View style={styles.pill}>
                      <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.pillText}>{step.time}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Ionicons name="cash-outline" size={11} color={Colors.secondary} />
                      <Text style={[styles.pillText, { color: Colors.secondary }]}>{step.cost}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
              </View>

              {open && (
                <View style={styles.stepBody}>
                  {step.details.map((d, i) => (
                    <View key={i} style={styles.detailRow}>
                      <View style={[styles.dot, { backgroundColor: step.color }]} />
                      <Text style={styles.detailText}>{d}</Text>
                    </View>
                  ))}
                  {step.tips && (
                    <View style={styles.tipBox}>
                      <Ionicons name="bulb-outline" size={14} color={Colors.secondary} />
                      <Text style={styles.tipText}>{step.tips}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            For informational purposes only. Requirements vary by state. Consult a business attorney or CPA for personalized advice.
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
  progressCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  progressCount: { color: Colors.secondary, fontSize: 14, fontWeight: '800' },
  progressBar: {
    height: 6, backgroundColor: Colors.surfaceLight,
    borderRadius: 3, marginBottom: 14, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 3 },
  checklistGrid: { gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { color: Colors.white, fontSize: 13, flex: 1 },
  checkLabelDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  stepsTitle: { color: Colors.white, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  stepCard: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4, padding: 14, marginBottom: 10,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '900' },
  stepMeta: { flex: 1 },
  stepTitle: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  stepPills: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pillText: { color: Colors.textMuted, fontSize: 11 },
  stepBody: { marginTop: 14, gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  detailText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.secondary + '15', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: Colors.secondary + '33',
  },
  tipText: { color: Colors.secondary, fontSize: 12, lineHeight: 18, flex: 1 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border, marginTop: 4,
  },
  disclaimerText: { color: Colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
});
