import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../constants/colors';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Road Ready Network mobile application, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.',
  },
  {
    title: '2. Description of Service',
    body: 'Road Ready Network provides trucking professionals with tools including IFTA tracking, HOS logging, fuel logs, expense management, AI-assisted legal information, document storage, and related services. The app is intended for lawful commercial use only.',
  },
  {
    title: '3. AI Legal Assistant Disclaimer',
    body: 'The AI Legal Assistant provides general information about trucking law and regulations. It does NOT constitute legal advice and is NOT a substitute for a licensed attorney. Road Ready Network is not a law firm and assumes no liability for actions taken based on AI-generated content.',
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
    body: 'Road Ready Network provides IFTA, HOS, tax, and other calculations as estimates based on user-entered data. Users are responsible for verifying all figures before filing with any government agency. Road Ready Network is not liable for errors resulting from incorrect data entry.',
  },
  {
    title: '7. Emergency Services',
    body: 'The Emergency SOS feature supplements — it does not replace — official emergency services. Always call 911 in a life-threatening emergency. Road Ready Network is not liable for any delay, failure, or outcome related to emergency feature use.',
  },
  {
    title: '8. Intellectual Property',
    body: 'All content, branding, and software in the Road Ready Network app are the property of Road Ready Network. You may not copy, modify, distribute, or reverse-engineer any part of the application.',
  },
  {
    title: '9. Limitation of Liability',
    body: 'To the maximum extent permitted by law, Road Ready Network shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including lost profits or data loss.',
  },
  {
    title: '10. Governing Law',
    body: 'These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration in accordance with the American Arbitration Association rules.',
  },
  {
    title: '11. Business Directory & Partner Listings',
    body: 'The Road Ready Network app includes a directory of partner businesses ("Listings") that drivers may use to locate services. Road Ready Network does not endorse, guarantee, or assume responsibility for the quality, accuracy, or availability of any listed business. Businesses listed on the platform have agreed to separate partner terms. Road Ready Network reserves the right to remove or modify any listing at any time.',
  },
  {
    title: '12. User Reviews & Ratings',
    body: 'Drivers may submit ratings and reviews of listed businesses. By submitting a review, you confirm that it is honest, based on your personal experience, and does not contain false, defamatory, or inappropriate content. Road Ready Network reserves the right to remove any review that violates these standards. Reviews do not represent the views of Road Ready Network.',
  },
  {
    title: '13. Founding Partner Program',
    body: 'Businesses may apply to become Founding Partners of the Road Ready Network. Partner listings are subject to approval. Partners are responsible for the accuracy of their business information. Subscription fees and terms are communicated at time of enrollment. Road Ready Network reserves the right to suspend or remove any partner listing for violations of these terms or for non-payment.',
  },
  {
    title: '14. California School of Trucking Endorsement',
    body: 'The Road Ready Network app is endorsed by the California School of Trucking (CST). CST\'s endorsement does not constitute ownership or operational responsibility for the app. The Road Ready Network app is an independent product operated separately from CST\'s educational programs.',
  },
  {
    title: '15. Changes to Terms',
    body: 'Road Ready Network reserves the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the updated terms.',
  },
  {
    title: '16. Contact',
    body: 'For questions about these Terms of Service, contact us at caschooloftruckingofficial@gmail.com.',
  },
];

export default function TermsScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },
    header: { marginBottom: 20 },
    title: { color: Colors.text, fontSize: 24, fontWeight: '900' },
    effective: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
    intro: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
    introText: { color: Colors.textMuted, fontSize: 14, lineHeight: 22 },
    section: { marginBottom: 20 },
    sectionTitle: { color: Colors.secondary, fontSize: 14, fontWeight: '800', marginBottom: 6 },
    sectionBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 21 },
    footer: { color: Colors.border, fontSize: 12, textAlign: 'center', marginTop: 12 },
  }), [Colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.effective}>Effective: June 1, 2026 · Endorsed by California School of Trucking</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            Please read these Terms of Service carefully before using the Road Ready Network app.
          </Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          © {new Date().getFullYear()} Road Ready Network. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
