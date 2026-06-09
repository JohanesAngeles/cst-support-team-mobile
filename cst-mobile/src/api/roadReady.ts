import client from './client';

export const getRoadReadyProfile = () => client.get('/road-ready').then(r => r.data);
export const completeLesson = (lessonId: string, scoreGained: number) =>
  client.patch('/road-ready/lesson', { lessonId, scoreGained }).then(r => r.data);
export const submitChallengeScore = (challengeId: string, score: number) =>
  client.patch('/road-ready/challenge', { challengeId, score }).then(r => r.data);
export const updateFreightCareer = (stats: object) =>
  client.patch('/road-ready/freight', stats).then(r => r.data);
export const updateOOStats = (stats: object) =>
  client.patch('/road-ready/oo', stats).then(r => r.data);
export const refreshSafetyScore = () =>
  client.patch('/road-ready/safety', {}).then(r => r.data);
export const syncRoadReadyScores = () =>
  client.patch('/road-ready/sync', {}).then(r => r.data);
