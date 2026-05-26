import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cst_cache_';
const QUEUE_KEY = 'cst_write_queue';

// Cache a value by key
export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // Silent — cache is best-effort
  }
}

// Read a cached value (returns null if missing or expired)
export async function cacheGet<T>(key: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > maxAgeMs) return null;
    return data as T;
  } catch {
    return null;
  }
}

// Clear a cached key
export async function cacheClear(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {}
}

// Offline write queue — stores mutations to replay when connectivity returns
export interface QueuedWrite {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: unknown;
  queuedAt: number;
}

export async function enqueueWrite(write: Omit<QueuedWrite, 'id' | 'queuedAt'>): Promise<void> {
  try {
    const queue = await getQueue();
    queue.push({ ...write, id: `${Date.now()}_${Math.random()}`, queuedAt: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function getQueue(): Promise<QueuedWrite[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {}
}

export async function removeFromQueue(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(q => q.id !== id)));
  } catch {}
}

// Cache keys used across the app
export const CACHE_KEYS = {
  trips: 'trips',
  fuelStops: 'fuel_stops',
  expenses: 'expenses',
  hosEntries: 'hos_entries',
  detentionEvents: 'detention_events',
  brokerNotes: 'broker_notes',
  maintenance: 'maintenance',
  deadlines: 'deadlines',
  iftaEntries: 'ifta_entries',
  emergencyContacts: 'emergency_contacts',
};
