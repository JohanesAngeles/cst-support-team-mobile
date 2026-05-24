import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  body: string;
  features: { icon: string; text: string }[];
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'bus-outline',
    color: Colors.secondary,
    title: 'Welcome to CST',
    subtitle: 'Built for Commercial Drivers',
    body: 'Everything you need — trip tracking, IFTA, legal help, and 20+ purpose-built tools — in one platform designed for the road.',
    features: [
      { icon: 'map-outline', text: 'Trip & Fuel Logging' },
      { icon: 'document-text-outline', text: 'Document Vault' },
      { icon: 'shield-checkmark-outline', text: 'Legal Protection' },
      { icon: 'calendar-outline', text: 'Deadline Alerts' },
    ],
  },
  {
    key: 'financial',
    icon: 'bar-chart-outline',
    color: '#3498DB',
    title: 'Know Your Numbers',
    subtitle: 'Live P&L, always up to date',
    body: 'Log trips and expenses once. Your Profit & Loss, cost per mile, and fuel percentage update automatically. No spreadsheets required.',
    features: [
      { icon: 'cash-outline', text: 'Auto P&L calculation' },
      { icon: 'globe-outline', text: 'IFTA quarterly reports' },
      { icon: 'receipt-outline', text: 'Expense tracker' },
      { icon: 'calculator-outline', text: 'Tax calculator' },
    ],
  },
  {
    key: 'protected',
    icon: 'shield-checkmark-outline',
    color: '#2ECC71',
    title: 'Protected on Every Run',
    subtitle: 'From the cab to the courtroom',
    body: 'AI legal assistant, ticket dispute letters, emergency SOS with GPS, driver protection guides, and state law for all 50 states.',
    features: [
      { icon: 'alert-circle-outline', text: 'Emergency SOS + GPS' },
      { icon: 'hammer-outline', text: 'Ticket dispute generator' },
      { icon: 'people-outline', text: 'Coercion protection' },
      { icon: 'business-outline', text: 'LLC & EIN filing help' },
    ],
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('@cst_onboarded', 'true');
    onComplete();
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
              <Ionicons name={item.icon as any} size={72} color={item.color} />
            </View>

            <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={styles.body}>{item.body}</Text>

            <View style={styles.featureGrid}>
              {item.features.map(f => (
                <View key={f.text} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={f.icon as any} size={16} color={item.color} />
                  </View>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={[styles.dot, i === currentIndex && { backgroundColor: SLIDES[currentIndex].color, width: 24 }]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        {!isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: SLIDES[currentIndex].color, flex: isLast ? 1 : 0 }]}
          onPress={isLast ? handleDone : goNext}
        >
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={Colors.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slide: { width, paddingHorizontal: 32, paddingTop: 40, alignItems: 'center', gap: 16 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: Colors.textMuted, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: -8 },
  body: { color: Colors.white, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  featureGrid: { width: '100%', gap: 10, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  featureIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  featureText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 20 },
  dot: { height: 8, width: 8, borderRadius: 4, backgroundColor: Colors.border },
  btnRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  skipText: { color: Colors.textMuted, fontWeight: '700', fontSize: 14 },
  nextBtn: { flex: 1, flexDirection: 'row', borderRadius: 14, padding: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextText: { color: Colors.background, fontWeight: '900', fontSize: 16 },
});
