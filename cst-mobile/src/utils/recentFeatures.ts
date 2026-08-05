import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feature } from '../constants/features';

const KEY = '@rrn_recent_features';
const MAX = 5;

export type RecentFeature = Pick<Feature, 'label' | 'icon' | 'color' | 'desc' | 'screen'> & { usedAt: number };

export async function recordFeatureUse(feature: Pick<Feature, 'label' | 'icon' | 'color' | 'desc' | 'screen'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let list: RecentFeature[] = raw ? JSON.parse(raw) : [];
    list = list.filter(f => f.screen !== feature.screen);
    list.unshift({ ...feature, usedAt: Date.now() });
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

export async function getRecentFeatures(): Promise<RecentFeature[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
