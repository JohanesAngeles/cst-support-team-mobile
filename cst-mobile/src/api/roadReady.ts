import client from './client';
import {
  getLocalProfile, saveLocalProfile,
  addPending, getPending, clearPending,
  GameProfile,
} from '../utils/gameStorage';

type ProfileResponse = { profile: GameProfile };

// ── Flush queued offline writes when back online ──────────────────────────────
export async function flushPendingSync(): Promise<void> {
  const queue = await getPending();
  if (!queue.length) return;
  try {
    for (const action of queue) {
      if (action.type === 'lesson')
        await client.patch('/road-ready/lesson', action.payload);
      else if (action.type === 'challenge')
        await client.patch('/road-ready/challenge', action.payload);
      else if (action.type === 'freight')
        await client.patch('/road-ready/freight', action.payload);
      else if (action.type === 'oo')
        await client.patch('/road-ready/oo', action.payload);
    }
    await clearPending();
    const r = await client.get('/road-ready');
    await saveLocalProfile(r.data.profile);
  } catch {
    // Stay offline — queue stays intact for next attempt
  }
}

export async function getRoadReadyProfile(): Promise<ProfileResponse> {
  try {
    await flushPendingSync();
    const r = await client.get('/road-ready');
    const profile: GameProfile = r.data.profile;
    await saveLocalProfile(profile);
    return { profile };
  } catch {
    const profile = await getLocalProfile();
    return { profile };
  }
}

export async function completeLesson(
  lessonId: string,
  scoreGained: number,
): Promise<ProfileResponse> {
  const local = await getLocalProfile();
  const lessonsCompleted = [...new Set([...local.lessonsCompleted, lessonId])];
  const profile = await saveLocalProfile({
    lessonsCompleted,
    educationScore: Math.min(50, local.educationScore + scoreGained),
  });

  try {
    const r = await client.patch('/road-ready/lesson', { lessonId, scoreGained });
    const serverProfile: GameProfile = r.data.profile;
    await saveLocalProfile(serverProfile);
    return { profile: serverProfile };
  } catch {
    await addPending({ type: 'lesson', payload: { lessonId, scoreGained } });
    return { profile };
  }
}

export async function submitChallengeScore(
  challengeId: string,
  score: number,
): Promise<ProfileResponse> {
  const local = await getLocalProfile();
  const prev = local.challengeScores[challengeId] ?? 0;
  const skillDelta = Math.max(0, score - prev);
  const profile = await saveLocalProfile({
    challengeScores: { ...local.challengeScores, [challengeId]: Math.max(prev, score) },
    skillScore: Math.min(200, local.skillScore + skillDelta),
  });

  try {
    const r = await client.patch('/road-ready/challenge', { challengeId, score });
    const serverProfile: GameProfile = r.data.profile;
    await saveLocalProfile(serverProfile);
    return { profile: serverProfile };
  } catch {
    await addPending({ type: 'challenge', payload: { challengeId, score } });
    return { profile };
  }
}

export async function updateFreightCareer(stats: object): Promise<ProfileResponse> {
  const profile = await getLocalProfile();
  try {
    const r = await client.patch('/road-ready/freight', stats);
    const serverProfile: GameProfile = r.data.profile;
    await saveLocalProfile(serverProfile);
    return { profile: serverProfile };
  } catch {
    await addPending({ type: 'freight', payload: stats as Record<string, any> });
    return { profile };
  }
}

export async function updateOOStats(stats: object): Promise<ProfileResponse> {
  const profile = await getLocalProfile();
  try {
    const r = await client.patch('/road-ready/oo', stats);
    const serverProfile: GameProfile = r.data.profile;
    await saveLocalProfile(serverProfile);
    return { profile: serverProfile };
  } catch {
    await addPending({ type: 'oo', payload: stats as Record<string, any> });
    return { profile };
  }
}

export async function refreshSafetyScore(): Promise<ProfileResponse> {
  try {
    const r = await client.patch('/road-ready/safety', {});
    const serverProfile: GameProfile = r.data.profile;
    await saveLocalProfile(serverProfile);
    return { profile: serverProfile };
  } catch {
    const profile = await getLocalProfile();
    return { profile };
  }
}

export async function syncRoadReadyScores(): Promise<ProfileResponse> {
  try {
    const r = await client.patch('/road-ready/sync', {});
    const serverProfile: GameProfile = r.data.profile;
    await saveLocalProfile(serverProfile);
    return { profile: serverProfile };
  } catch {
    const profile = await getLocalProfile();
    return { profile };
  }
}
