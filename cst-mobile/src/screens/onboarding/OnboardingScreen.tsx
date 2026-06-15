import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const GAP = 8;

interface TileConfig {
  icon: string;
  colors: [string, string];
}

interface Slide {
  key: string;
  hero: TileConfig;
  tiles: [TileConfig, TileConfig, TileConfig, TileConfig];
  title: string;
  subtitle: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    hero: { icon: 'bus-outline', colors: ['#F97316', '#EF4444'] },
    tiles: [
      { icon: 'map-outline',              colors: ['#6366F1', '#8B5CF6'] },
      { icon: 'document-text-outline',    colors: ['#0EA5E9', '#6366F1'] },
      { icon: 'calendar-outline',         colors: ['#14B8A6', '#0EA5E9'] },
      { icon: 'shield-checkmark-outline', colors: ['#10B981', '#14B8A6'] },
    ],
    title: 'Welcome to Road Ready Network',
    subtitle: 'Built for Commercial Drivers',
    body: '60+ purpose-built tools — trip tracking, IFTA, legal help, and more — in one platform designed for the road.',
  },
  {
    key: 'financial',
    hero: { icon: 'bar-chart-outline', colors: ['#10B981', '#0EA5E9'] },
    tiles: [
      { icon: 'cash-outline',       colors: ['#F97316', '#F59E0B'] },
      { icon: 'receipt-outline',    colors: ['#6366F1', '#8B5CF6'] },
      { icon: 'calculator-outline', colors: ['#0EA5E9', '#6366F1'] },
      { icon: 'globe-outline',      colors: ['#8B5CF6', '#EC4899'] },
    ],
    title: 'Know Your Numbers',
    subtitle: 'Live P&L, always up to date',
    body: 'Log trips and expenses once. Your Profit & Loss, cost per mile, and IFTA reports update automatically.',
  },
  {
    key: 'protected',
    hero: { icon: 'shield-checkmark-outline', colors: ['#6366F1', '#4F46E5'] },
    tiles: [
      { icon: 'alert-circle-outline', colors: ['#EF4444', '#F97316'] },
      { icon: 'hammer-outline',       colors: ['#F97316', '#F59E0B'] },
      { icon: 'people-outline',       colors: ['#14B8A6', '#10B981'] },
      { icon: 'business-outline',     colors: ['#0EA5E9', '#6366F1'] },
    ],
    title: 'Protected Every Run',
    subtitle: 'From the cab to the courtroom',
    body: 'AI legal assistant, ticket dispute letters, emergency SOS with GPS, and state law for all 50 states.',
  },
];

function MosaicTile({ icon, colors, style, isHero = false }: {
  icon: string;
  colors: [string, string];
  style?: object;
  isHero?: boolean;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.tile, style]}
    >
      {isHero ? (
        <View style={s.heroGlow}>
          <Ionicons name={icon as any} size={52} color="#FFFFFF" />
        </View>
      ) : (
        <Ionicons name={icon as any} size={28} color="rgba(255,255,255,0.92)" />
      )}
    </LinearGradient>
  );
}

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem('@rrn_onboarded', 'true');
    onComplete();
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>

      {/* ── Slide area ── */}
      <View style={{ flex: 1 }} onLayout={e => setContainerH(e.nativeEvent.layout.height)}>
        {containerH > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {SLIDES.map((item) => (
              <View key={item.key} style={{ width, height: containerH }}>

                {/* Mosaic — fills remaining space above text */}
                <View style={s.mosaicWrapper}>
                  {/* Left: hero tile */}
                  <MosaicTile
                    icon={item.hero.icon}
                    colors={item.hero.colors}
                    isHero
                    style={s.heroTile}
                  />

                  {/* Right: 2×2 grid */}
                  <View style={s.tileGrid}>
                    <View style={s.tileRow}>
                      <MosaicTile icon={item.tiles[0].icon} colors={item.tiles[0].colors} style={s.gridTile} />
                      <MosaicTile icon={item.tiles[1].icon} colors={item.tiles[1].colors} style={s.gridTile} />
                    </View>
                    <View style={s.tileRow}>
                      <MosaicTile icon={item.tiles[2].icon} colors={item.tiles[2].colors} style={s.gridTile} />
                      <MosaicTile icon={item.tiles[3].icon} colors={item.tiles[3].colors} style={s.gridTile} />
                    </View>
                  </View>
                </View>

                {/* Text content */}
                <View style={s.textBlock}>
                  <Text style={s.title}>{item.title}</Text>
                  <Text style={s.subtitle}>{item.subtitle}</Text>
                  <Text style={s.body}>{item.body}</Text>
                </View>

              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Bottom bar ── */}
      <View style={s.bottomBar}>

        {/* Dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[s.dot, i === currentIndex && s.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={s.btnRow}>
          {!isLast && (
            <TouchableOpacity style={s.skipBtn} onPress={handleDone} activeOpacity={0.7}>
              <Text style={s.skipTxt}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ flex: 1 }} onPress={isLast ? handleDone : goNext} activeOpacity={0.88}>
            <LinearGradient
              colors={['#F97316', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.nextBtn}
            >
              <Text style={s.nextTxt}>{isLast ? 'Get Started' : 'Next'}</Text>
              <Ionicons
                name={isLast ? 'checkmark' : 'arrow-forward'}
                size={18}
                color="#FFFFFF"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFBFF' },

  // Mosaic
  mosaicWrapper: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: GAP,
  },
  heroTile: {
    flex: 4,
    borderRadius: 24,
  },
  tileGrid: {
    flex: 6,
    gap: GAP,
  },
  tileRow: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  gridTile: {
    flex: 1,
    borderRadius: 18,
  },
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Text
  textBlock: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 5,
  },
  title:    { fontSize: 28, fontWeight: '900', color: '#0D1B3E', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  body:     { fontSize: 13, color: '#6B7280', lineHeight: 20, marginTop: 2 },

  // Bottom
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 12,
    gap: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#F97316',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  skipBtn: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipTxt: { color: '#6B7280', fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  nextTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
