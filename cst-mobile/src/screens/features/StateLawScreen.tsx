import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import { STATE_LAWS, StateLawEntry } from '../../data/stateLaws';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'StateLaw'> };

export default function StateLawScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');

  const filtered = query.trim().length === 0
    ? STATE_LAWS
    : STATE_LAWS.filter((s) =>
        s.state.toLowerCase().includes(query.toLowerCase()) ||
        s.abbr.toLowerCase().includes(query.toLowerCase())
      );

  const renderItem: ListRenderItem<StateLawEntry> = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('StateLawDetail', { abbr: item.abbr })}
      activeOpacity={0.7}
    >
      <View style={styles.abbrBox}>
        <Text style={styles.abbrText}>{item.abbr}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.stateName}>{item.state}</Text>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Ionicons name="speedometer-outline" size={11} color={Colors.secondary} />
            <Text style={styles.pillText}>{item.truckSpeed} mph</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="water-outline" size={11} color='#3498DB' />
            <Text style={[styles.pillText, { color: '#3498DB' }]}>{item.dieselTax}¢/gal</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  ), [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search state..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.abbr}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No states match "{query}"</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.banner}>
            <Ionicons name="library-outline" size={20} color={Colors.secondary} />
            <Text style={styles.bannerText}>All 50 states · Trucking laws & regulations</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.white, fontSize: 15 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary + '18',
    borderRadius: 10, padding: 10,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.secondary + '44',
  },
  bannerText: { color: Colors.secondary, fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.border,
  },
  separator: { height: 6 },
  abbrBox: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: Colors.secondary + '22',
    borderWidth: 1, borderColor: Colors.secondary + '55',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  abbrText: { color: Colors.secondary, fontSize: 14, fontWeight: '900' },
  rowBody: { flex: 1, gap: 6 },
  stateName: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceLight, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  pillText: { color: Colors.secondary, fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
});
