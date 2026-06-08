import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../constants/colors';
import { FEATURES, CATS, Feature, FeatureScreen, CatId } from '../../constants/features';
import { recordFeatureUse } from '../../utils/recentFeatures';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: SW } = Dimensions.get('window');
const CARD_W      = (SW - 48) / 3;
const GRID_CARD_W = (SW - 42) / 2;

function FeatureCard({ item, onPress, width = CARD_W }: { item: Feature; onPress: () => void; width?: number }) {
  const Colors = useColors();
  return (
    <TouchableOpacity
      style={{
        width,
        backgroundColor: Colors.surface,
        borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: Colors.border,
        gap: 6,
      }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: item.color + '22',
      }}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>
        {item.label}
      </Text>
      <Text style={{ color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>{item.desc}</Text>
    </TouchableOpacity>
  );
}

function CategorySection({
  cat, features, onPress,
}: {
  cat: typeof CATS[number];
  features: Feature[];
  onPress: (f: Feature) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color }} />
        <Text style={{ color: '#1A1A2E', fontSize: 16, fontWeight: '800', flex: 1 }}>
          {t(`dashboard.cats.${cat.id}`)}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: cat.color }}>{features.length}</Text>
      </View>
      <FlatList
        data={features}
        keyExtractor={f => f.label}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item }) => (
          <FeatureCard item={item} onPress={() => onPress(item)} />
        )}
      />
    </View>
  );
}

export default function FeaturesScreen() {
  const Colors = useColors();
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<CatId>('all');

  const goTo = async (feature: Feature) => {
    if (!feature.screen) return;
    await recordFeatureUse({
      label: feature.label,
      icon: feature.icon,
      color: feature.color,
      desc: feature.desc,
      screen: feature.screen,
    });
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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* Header */}
      <SafeAreaView style={{ backgroundColor: Colors.surface }} edges={['top']}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 }}>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '900', marginBottom: 12 }}>
            All Tools
            <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: '500' }}>  {FEATURES.length}</Text>
          </Text>

          {/* Search */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: Colors.background,
            borderRadius: 14, paddingHorizontal: 14, height: 46,
            borderWidth: 1, borderColor: Colors.border,
          }}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: Colors.text }}
              placeholder="Search tools..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={v => { setSearch(v); setActiveCat('all'); }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          {CATS.map(c => {
            const active = activeCat === c.id && !search;
            return (
              <TouchableOpacity
                key={c.id}
                style={{
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: active ? c.color : Colors.surface,
                  borderWidth: 1.5,
                  borderColor: active ? c.color : Colors.border,
                }}
                onPress={() => { setActiveCat(c.id); setSearch(''); }}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '600',
                  color: active ? '#FFFFFF' : Colors.text,
                }}>
                  {c.id === 'all' ? 'All' : c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Content */}
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {isFiltered ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
                <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '800', flex: 1 }}>
                  {search ? `"${search}"` : CATS.find(c => c.id === activeCat)?.id}
                  {'  '}
                  <Text style={{ color: Colors.textMuted, fontWeight: '500', fontSize: 14 }}>
                    {filteredFeatures.length} results
                  </Text>
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: Colors.border, borderRadius: 10,
                    paddingHorizontal: 10, paddingVertical: 5,
                  }}
                  onPress={() => { setSearch(''); setActiveCat('all'); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '600' }}>Clear</Text>
                  <Ionicons name="close" size={13} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {filteredFeatures.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 48, gap: 12 }}>
                  <Ionicons name="search-outline" size={44} color={Colors.border} />
                  <Text style={{ color: Colors.textMuted, fontSize: 14 }}>No tools found</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, paddingBottom: 16 }}>
                  {filteredFeatures.map(f => (
                    <FeatureCard
                      key={f.label}
                      item={f}
                      onPress={() => goTo(f)}
                      width={GRID_CARD_W}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            groupedCats.map(({ cat, features }) => (
              <CategorySection key={cat.id} cat={cat} features={features} onPress={goTo} />
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
