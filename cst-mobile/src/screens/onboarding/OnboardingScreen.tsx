import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

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
    color: '#2C6EBD',
    title: 'Welcome to CST',
    subtitle: 'Built for Commercial Drivers',
    body: 'Everything you need — trip tracking, IFTA, legal help, and 60+ purpose-built tools — in one platform designed for the road.',
    features: [
      { icon: 'map-outline',             text: 'Trip & Fuel Logging' },
      { icon: 'document-text-outline',   text: 'Document Vault' },
      { icon: 'shield-checkmark-outline',text: 'Legal Protection' },
      { icon: 'calendar-outline',        text: 'Deadline Alerts' },
    ],
  },
  {
    key: 'financial',
    icon: 'bar-chart-outline',
    color: '#3498DB',
    title: 'Know Your Numbers',
    subtitle: 'Live P&L, always up to date',
    body: 'Log trips and expenses once. Your Profit & Loss, cost per mile, and fuel percentage update automatically — no spreadsheets.',
    features: [
      { icon: 'cash-outline',       text: 'Auto P&L calculation' },
      { icon: 'globe-outline',      text: 'IFTA quarterly reports' },
      { icon: 'receipt-outline',    text: 'Expense tracker' },
      { icon: 'calculator-outline', text: 'Per diem & tax tools' },
    ],
  },
  {
    key: 'protected',
    icon: 'shield-checkmark-outline',
    color: '#2ECC71',
    title: 'Protected Every Run',
    subtitle: 'From the cab to the courtroom',
    body: 'AI legal assistant, ticket dispute letters, emergency SOS with GPS, driver protection guides, and state law for all 50 states.',
    features: [
      { icon: 'alert-circle-outline', text: 'Emergency SOS + GPS' },
      { icon: 'hammer-outline',       text: 'Ticket dispute generator' },
      { icon: 'people-outline',       text: 'Coercion protection' },
      { icon: 'business-outline',     text: 'LLC & EIN filing help' },
    ],
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { theme, isDark } = useTheme();
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
  const activeSlide = SLIDES[currentIndex];

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[s.slide, { width }]}>

      {/* Icon circle */}
      <View style={[s.iconCircle, {
        backgroundColor: item.color + (isDark ? '1A' : '14'),
        borderColor:     item.color + (isDark ? '40' : '30'),
      }]}>
        <Ionicons name={item.icon as any} size={68} color={item.color} />
      </View>

      {/* Text */}
      <Text style={[s.slideTitle, { color: item.color }]}>{item.title}</Text>
      <Text style={[s.slideSubtitle, { color: theme.textMuted }]}>{item.subtitle}</Text>
      <Text style={[s.slideBody, { color: isDark ? '#C8D8E4' : '#444F5A' }]}>{item.body}</Text>

      {/* Feature list */}
      <View style={s.featureList}>
        {item.features.map((f: { icon: string; text: string }) => (
          <View
            key={f.text}
            style={[s.featureRow, {
              backgroundColor: isDark ? theme.surface : theme.surfaceLight,
              borderColor: isDark ? theme.border : item.color + '22',
              borderLeftColor: item.color,
            }]}
          >
            <View style={[s.featureIconWrap, { backgroundColor: item.color + '1A' }]}>
              <Ionicons name={f.icon as any} size={15} color={item.color} />
            </View>
            <Text style={[s.featureText, { color: theme.text }]}>{f.text}</Text>
          </View>
        ))}
      </View>

    </View>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>

      {/* Logo at top */}
      <View style={[s.logoBar, { borderBottomColor: theme.border }]}>
        <View style={[s.logoPill, { backgroundColor: '#021B3A' }]}>
          <Image
            source={require('../../../assets/logo/cst_logo_white.png')}
            style={s.logoImg}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={renderSlide}
        style={s.flatlist}
      />

      {/* Dots */}
      <View style={s.dotsRow}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            style={[
              s.dot,
              { backgroundColor: theme.border },
              i === currentIndex && { backgroundColor: activeSlide.color, width: 22 },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={[s.btnBar, { borderTopColor: theme.border }]}>
        {!isLast && (
          <TouchableOpacity
            style={[s.skipBtn, { backgroundColor: isDark ? theme.surfaceLight : theme.surface, borderColor: theme.border }]}
            onPress={handleDone}
          >
            <Text style={[s.skipText, { color: theme.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: activeSlide.color, flex: isLast ? 1 : 0 }]}
          onPress={isLast ? handleDone : goNext}
          activeOpacity={0.85}
        >
          <Text style={[s.nextText, { color: '#021B3A' }]}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#021B3A"
          />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // Top logo bar
  logoBar: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  logoPill: { borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 130, height: 44 },

  // Slide
  flatlist: { flex: 1 },
  slide: { paddingHorizontal: 28, paddingTop: 28, alignItems: 'center', gap: 14 },
  iconCircle: {
    width: 130, height: 130, borderRadius: 65,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 4,
  },
  slideTitle:    { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  slideSubtitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: -6 },
  slideBody:     { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 300 },

  // Features
  featureList: { width: '100%', gap: 8 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderLeftWidth: 3,
  },
  featureIconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 14, fontWeight: '600' },

  // Dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 16 },
  dot: { height: 8, width: 8, borderRadius: 4 },

  // Buttons
  btnBar: {
    flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 20,
    paddingTop: 12, gap: 12, borderTopWidth: 1,
  },
  skipBtn: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, justifyContent: 'center',
  },
  skipText: { fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 1, flexDirection: 'row', borderRadius: 14,
    paddingVertical: 14, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  nextText: { fontWeight: '900', fontSize: 16 },
});



