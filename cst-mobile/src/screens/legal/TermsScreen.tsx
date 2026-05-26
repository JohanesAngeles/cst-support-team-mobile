import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Commercial Support Technologies (CST) mobile application, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.',
  },
  {
    title: '2. Description of Service',
    body: 'CST provides trucking professionals with tools including IFTA tracking, HOS logging, fuel logs, expense management, AI-assisted legal information, document storage, and related services. The app is intended for lawful commercial use only.',
  },
  {
    title: '3. AI Legal Assistant Disclaimer',
    body: 'The AI Legal Assistant provides general information about trucking law and regulations. It does NOT constitute legal advice and is NOT a substitute for a licensed attorney. CST is not a law firm and assumes no liability for actions taken based on AI-generated content.',
  },
  {
    title: '4. User Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your account credentials, ensuring the accuracy of data you enter, and complying with all applicable federal, state, and local laws including FMCSA regulations.',
  },
  {
    title: '5. Subscription & Billing',
    body: 'Some features require a paid subscription. Subscriptions renew automatically unless cancelled at least 24 hours before the renewal date. Refunds are handled in accordance with the App Store or Google Play policies.',
  },
  {
    title: '6. Data Accuracy',
    body: 'CST provides IFTA, HOS, tax, and other calculations as estimates based on user-entered data. Users are responsible for verifying all figures before filing with any government agency. CST is not liable for errors resulting from incorrect data entry.',
  },
  {
    title: '7. Emergency Services',
    body: 'The Emergency SOS feature supplements — it does not replace — official emergency services. Always call 911 in a life-threatening emergency. CST is not liable for any delay, failure, or outcome related to emergency feature use.',
  },
  {
    title: '8. Intellectual Property',
    body: 'All content, branding, and software in the CST app are the property of Commercial Support Technologies. You may not copy, modify, distribute, or reverse-engineer any part of the application.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'To the maximum extent permitted by law, CST shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including lost profits or data loss.',
  },
  {
    title: '10. Governing Law',
    body: 'These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the American Arbitration Association rules.',
  },
  {
    title: '11. Changes to Terms',
    body: 'CST reserves the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the updated terms.',
  },
  {
    title: '12. Contact',
    body: 'For questions about these Terms of Service, contact us at support@commercialsupporttech.com.',
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.effective}>Effective: January 1, 2025</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            Please read these Terms of Service carefully before using the CST Driver Support App operated by Commercial Support Technologies.
          </Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          © {new Date().getFullYear()} Commercial Support Technologies. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { color: Colors.white, fontSize: 24, fontWeight: '900' },
  effective: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  intro: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  introText: { color: Colors.textMuted, fontSize: 14, lineHeight: 22 },
  section: { marginBottom: 20 },
  sectionTitle: { color: Colors.secondary, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  sectionBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 21 },
  footer: { color: Colors.border, fontSize: 12, textAlign: 'center', marginTop: 12 },
});
