import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { FEATURES, CATS, Feature, CatId } from '../../constants/features';
import { recordFeatureUse, getRecentFeatures, RecentFeature } from '../../utils/recentFeatures';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: SW } = Dimensions.get('window');
const GRID_CARD_W = (SW - 42) / 2;
const HERO_GAP    = 12;
const HERO_W      = SW - 32 - HERO_GAP;

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

// Converts a 6-char hex color to rgba string
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function FeatureCard({ item, onPress, width, isDark }: {
  item: Feature; onPress: () => void; width: number; isDark: boolean;
}) {
  const cardBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.84)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.92)';
  const textColor  = isDark ? '#FFFFFF' : '#0D1B3E';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280';

  return (
    <TouchableOpacity
      style={[s.card, { width, backgroundColor: cardBg, borderColor: cardBorder,
        shadowColor: item.color, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 10, elevation: 3 }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Image-style icon tile up top, title + short description below —
          mirrors the reference layout's image-then-caption card shape */}
      <LinearGradient
        colors={[item.color, rgba(item.color, 0.65)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.iconTile}
      >
        <Ionicons name={item.icon as any} size={30} color="#FFFFFF" />
      </LinearGradient>

      <Text style={[s.cardLabel, { color: textColor }]} numberOfLines={1}>{item.label}</Text>
      <Text style={[s.cardDesc,  { color: mutedColor }]} numberOfLines={2}>{item.desc}</Text>
    </TouchableOpacity>
  );
}

// Full-width, swipeable "used today" hero — the first thing on the screen,
// paged with dot indicators, matching the reference layout's big image +
// dots up top. Falls back to a friendly empty state before any tool's been
// opened today so the slot is always present, not just once there's history.
function TodayUsedSection({ items, onPress, isDark }: {
  items: RecentFeature[]; onPress: (f: RecentFeature) => void; isDark: boolean;
}) {
  const [page, setPage] = useState(0);
  const textColor  = isDark ? '#FFFFFF' : '#0D1B3E';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280';
  const cardBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.84)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.92)';

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / (HERO_W + HERO_GAP)));
  };

  return (
    <View style={{ marginBottom: 22 }}>
      <View style={[s.sectionHeader, { paddingTop: 4 }]}>
        <Text style={[s.sectionTitle, { color: textColor, flex: undefined }]}>Used Today</Text>
      </View>

      {items.length === 0 ? (
        <View style={[s.heroEmpty, { width: HERO_W, backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Ionicons name="time-outline" size={26} color={mutedColor} />
          <Text style={{ color: mutedColor, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            Tools you open today will show up here
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={HERO_W + HERO_GAP}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 16, gap: HERO_GAP }}
          >
            {items.map(item => (
              <TouchableOpacity
                key={item.screen}
                style={[s.heroCard, { width: HERO_W }]}
                onPress={() => onPress(item)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[item.color, rgba(item.color, 0.6)]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={item.icon as any} size={54} color="rgba(255,255,255,0.35)" />
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.72)']}
                  style={s.heroOverlay}
                >
                  <Text style={s.heroLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={s.heroDesc} numberOfLines={1}>{item.desc}</Text>
                  <View style={s.heroOpenRow}>
                    <Text style={s.heroOpenText}>Open</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {items.length > 1 && (
            <View style={s.dotsRow}>
              {items.map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, { width: i === page ? 16 : 6, backgroundColor: i === page ? '#021B3A' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)') }]}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function CategorySection({
  cat, features, onPress, isDark,
}: {
  cat: typeof CATS[number];
  features: Feature[];
  onPress: (f: Feature) => void;
  isDark: boolean;
}) {
  const { t } = useTranslation();
  const textColor = isDark ? '#FFFFFF' : '#0D1B3E';

  return (
    <View style={{ marginBottom: 4 }}>
      {/* Colored left-border section header */}
      <View style={s.sectionHeader}>
        <View style={[s.sectionBar, { backgroundColor: cat.color }]} />
        <Text style={[s.sectionTitle, { color: textColor }]}>
          {t(`dashboard.cats.${cat.id}`)}
        </Text>
        <View style={[s.sectionBadge, { backgroundColor: rgba(cat.color, 0.15) }]}>
          <Text style={[s.sectionCount, { color: cat.color }]}>{features.length}</Text>
        </View>
      </View>
      <View style={s.gridWrap}>
        {features.map(f => (
          <FeatureCard key={f.label} item={f} onPress={() => onPress(f)} width={GRID_CARD_W} isDark={isDark} />
        ))}
      </View>
    </View>
  );
}

export default function FeaturesScreen() {
  const Colors  = useColors();
  const { isDark } = useTheme();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const [search,    setSearch]    = useState('');
  const [activeCat, setActiveCat] = useState<CatId>('all');
  const [recents,   setRecents]   = useState<RecentFeature[]>([]);

  // Refetched on every focus (not just mount) so a tool opened just now shows
  // up immediately when the user backs out to this screen.
  useFocusEffect(useCallback(() => {
    getRecentFeatures().then(setRecents);
  }, []));
  const todaysTools = useMemo(() => recents.filter(r => isToday(r.usedAt)), [recents]);

  const headerBg   = isDark ? 'rgba(8,12,24,0.90)'    : 'rgba(245,247,255,0.90)';
  const headerBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const searchBg   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)';
  const searchBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.9)';
  const titleColor = isDark ? '#FFFFFF' : '#0D1B3E';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : '#6B7280';

  const goTo = async (feature: Feature) => {
    if (!feature.screen) return;
    await recordFeatureUse({
      label: feature.label, icon: feature.icon,
      color: feature.color, desc: feature.desc, screen: feature.screen,
    });
    navigation.navigate(feature.screen as any);
  };

  const goToRecent = async (feature: RecentFeature) => {
    if (!feature.screen) return;
    await recordFeatureUse(feature);
    navigation.navigate(feature.screen as any);
  };

  const isFiltered = search.trim().length > 0 || activeCat !== 'all';

  const filteredFeatures = useMemo(() => {
    let list = FEATURES;
    if (activeCat !== 'all') list = list.filter(f => f.cat === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(f =>
        f.label.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeCat]);

  const groupedCats = useMemo(() =>
    CATS.filter(c => c.id !== 'all').map(cat => ({
      cat,
      features: FEATURES.filter(f => f.cat === cat.id),
    })),
  []);

  return (
    <View style={{ flex: 1 }}>

      {/* ── Frosted-glass header ── */}
      <SafeAreaView
        style={{ backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: headerBorder }}
        edges={['top']}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 }}>
          <Text style={[s.screenTitle, { color: titleColor }]}>
            All Tools
            <Text style={{ color: mutedColor, fontSize: 15, fontWeight: '500' }}>  {FEATURES.length}</Text>
          </Text>

          {/* Search bar */}
          <View style={[s.searchBar, { backgroundColor: searchBg, borderColor: searchBorder }]}>
            <Ionicons name="search-outline" size={18} color={mutedColor} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: titleColor }}
              placeholder="Search tools..."
              placeholderTextColor={mutedColor}
              value={search}
              onChangeText={v => { setSearch(v); setActiveCat('all'); }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={mutedColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
        >
          {CATS.map(c => {
            const active = activeCat === c.id && !search;
            const label = c.id === 'all' ? 'All' : c.id.charAt(0).toUpperCase() + c.id.slice(1);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => { setActiveCat(c.id); setSearch(''); }}
                activeOpacity={0.8}
              >
                {active ? (
                  <LinearGradient
                    colors={[c.color, rgba(c.color, 0.75)]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.chipActive}
                  >
                    <Text style={s.chipActiveText}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[s.chip, { backgroundColor: searchBg, borderColor: searchBorder }]}>
                    <Text style={[s.chipText, { color: titleColor }]}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Content ── */}
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {isFiltered ? (
            <View>
              <View style={s.filterHeader}>
                <Text style={[s.filterTitle, { color: titleColor }]}>
                  {search ? `"${search}"` : CATS.find(c => c.id === activeCat)?.id}
                  {'  '}
                  <Text style={{ color: mutedColor, fontWeight: '500', fontSize: 14 }}>
                    {filteredFeatures.length} results
                  </Text>
                </Text>
                <TouchableOpacity
                  style={[s.clearBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => { setSearch(''); setActiveCat('all'); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: mutedColor, fontSize: 12, fontWeight: '600' }}>Clear</Text>
                  <Ionicons name="close" size={13} color={mutedColor} />
                </TouchableOpacity>
              </View>

              {filteredFeatures.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 48, gap: 12 }}>
                  <Ionicons name="search-outline" size={44} color={mutedColor} />
                  <Text style={{ color: mutedColor, fontSize: 14 }}>No tools found</Text>
                </View>
              ) : (
                <View style={s.gridWrap}>
                  {filteredFeatures.map(f => (
                    <FeatureCard
                      key={f.label}
                      item={f}
                      onPress={() => goTo(f)}
                      width={GRID_CARD_W}
                      isDark={isDark}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <TodayUsedSection items={todaysTools} onPress={goToRecent} isDark={isDark} />
              {groupedCats.map(({ cat, features }) => (
                <CategorySection key={cat.id} cat={cat} features={features} onPress={goTo} isDark={isDark} />
              ))}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screenTitle: { fontSize: 24, fontWeight: '900', marginBottom: 12 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1,
  },

  // Category chips
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipActive: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  chipActiveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // Feature card
  card: {
    borderRadius: 18, padding: 12, borderWidth: 1, gap: 8,
  },
  iconTile: {
    width: '100%', height: 84, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cardLabel: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  cardDesc:  { fontSize: 11, lineHeight: 15 },

  // "Used Today" hero
  heroCard: {
    height: 170, borderRadius: 20, overflow: 'hidden',
  },
  heroOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 28, paddingBottom: 14, gap: 2,
  },
  heroLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  heroDesc:  { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  heroOpenRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
  },
  heroOpenText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroEmpty: {
    marginHorizontal: 16, height: 120, borderRadius: 20, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginTop: 12,
  },
  dot: { height: 6, borderRadius: 3 },

  // Category section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  sectionBar:   { width: 4, height: 22, borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  sectionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sectionCount: { fontSize: 12, fontWeight: '700' },

  // Filter mode
  filterHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  filterTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  gridWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10, paddingBottom: 16,
  },
});
