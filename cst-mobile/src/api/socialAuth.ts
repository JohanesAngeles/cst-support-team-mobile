import client from './client';

export const googleAuth = (accessToken: string) =>
  client.post('/auth/social/google', { accessToken }).then(r => r.data);

export const appleAuth = (identityToken: string, fullName?: string) =>
  client.post('/auth/social/apple', { identityToken, fullName }).then(r => r.data);
