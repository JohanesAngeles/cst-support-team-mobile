import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PROFILE = 'rrn:game:profile';
const KEY_PENDING  = 'rrn:game:pending';

export interface GameProfile {
  totalScore: number;
  safetyScore: number;
  skillScore: number;
  complianceScore: number;
  businessScore: number;
  reputationScore: number;
  educationScore: number;
  badges: string[];
  lessonsCompleted: string[];
  challengeScores: Record<string, number>;
  freightStats: Record<string, any>;
  ooStats: Record<string, any>;
}

export type PendingAction =
  | { type: 'lesson';    payload: { lessonId: string; scoreGained: number } }
  | { type: 'challenge'; payload: { challengeId: string; score: number } }
  | { type: 'freight';   payload: Record<string, any> }
  | { type: 'oo';        payload: Record<string, any> };

const DEFAULT: GameProfile = {
  totalScore: 0,
  safetyScore: 0,
  skillScore: 0,
  complianceScore: 0,
  businessScore: 0,
  reputationScore: 0,
  educationScore: 0,
  badges: [],
  lessonsCompleted: [],
  challengeScores: {},
  freightStats: {},
  ooStats: {},
};

export async function getLocalProfile(): Promise<GameProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveLocalProfile(data: Partial<GameProfile>): Promise<GameProfile> {
  try {
    const current = await getLocalProfile();
    const updated: GameProfile = { ...current, ...data };
    updated.totalScore =
      updated.safetyScore +
      updated.skillScore +
      updated.complianceScore +
      updated.businessScore +
      updated.reputationScore +
      updated.educationScore;
    await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(updated));
    return updated;
  } catch {
    return { ...DEFAULT, ...data } as GameProfile;
  }
}

export async function addPending(action: PendingAction): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PENDING);
    const queue: PendingAction[] = raw ? JSON.parse(raw) : [];
    queue.push(action);
    await AsyncStorage.setItem(KEY_PENDING, JSON.stringify(queue));
  } catch {}
}

export async function getPending(): Promise<PendingAction[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PENDING);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearPending(): Promise<void> {
  await AsyncStorage.removeItem(KEY_PENDING).catch(() => {});
}
