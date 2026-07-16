import client from './client';

export interface AppConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minVersion: { ios: string; android: string };
  storeUrls: { ios?: string; android?: string };
  featureFlags: Record<string, boolean>;
}

export const configAPI = {
  get: () => client.get<AppConfig>('/config').then(r => r.data),
};
