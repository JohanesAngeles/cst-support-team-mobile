import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../constants/colors';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide when you create an account (name, email address), data you enter into the app (trip logs, fuel stops, expenses, HOS entries, IFTA records, documents), your device location when you use GPS features (Emergency SOS, Find Help), and push notification tokens for sending alerts.',
  },
  {
    title: '2. How We Use Your Information',
    body: "We use your data to provide and improve the Road Ready Network app, calculate IFTA, tax, and HOS estimates, send deadline reminders and push notifications you have opted into, power the AI Legal Assistant and AI Rate Advisor (your messages are sent to xAI's Grok API), and respond to support requests.",
  },
  {
    title: '3. Data Storage & Security',
    body: 'Your data is stored on secure servers using MongoDB with industry-standard encryption. Passwords are hashed using bcrypt and never stored in plain text. JWT tokens are used for authentication and expire automatically.',
  },
  {
    title: '4. AI Legal Assistant & Third Parties',
    body: "When you use the AI Legal Assistant or AI Rate Advisor, your messages are processed by xAI's Grok API. xAI's privacy policy applies to this processing. We do not share your personal identity with xAI — only the message content is transmitted.",
  },
  {
    title: '5. Document Vault',
    body: 'Documents you upload to the Document Vault are stored via Cloudinary\'s secure cloud storage. Documents are private to your account and are not shared with other users or third parties.',
  },
  {
    title: '6. Location Data',
    body: 'Location data is only accessed when you actively use the Emergency SOS or Find Help features. We do not track your location in the background. Location coordinates shared via SMS during SOS are sent directly through your device\'s messaging app — we do not store them.',
  },
  {
    title: '7. Push Notifications',
    body: 'If you enable push notifications, we store your Expo push token to send you deadline reminders and other alerts. You can disable push notifications at any time through your device settings.',
  },
  {
    title: '8. Data Retention',
    body: 'We retain your data for as long as your account is active. You may request deletion of your account and all associated data by contacting caschooloftruckingofficial@gmail.com. Deletion is processed within 30 days.',
  },
  {
    title: '9. Your Rights',
    body: 'You have the right to access, correct, or delete your personal data. You may export your data (IFTA reports, tax prep PDFs) at any time using the in-app export features. Contact us to request a full data export or deletion.',
  },
  {
    title: '10. Children\'s Privacy',
    body: 'Road Ready Network is intended for commercial trucking professionals aged 18 and older. We do not knowingly collect personal information from children under 13.',
  },
  {
    title: '11. Changes to This Policy',
    body: 'We may update this Privacy Policy periodically. We will notify you of significant changes via push notification or email. Continued use of the app after changes constitutes acceptance.',
  },
  {
    title: '12. Contact Us',
    body: 'For privacy questions or data requests, contact us at:\n\nEmail: caschooloftruckingofficial@gmail.com',
  },
];

export default function PrivacyScreen() {
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
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.effective}>Effective: January 1, 2025</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            Road Ready Network ("Road Ready", "we", "us") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.
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
