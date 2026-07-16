import { useEffect, useState } from 'react';
import { configAPI, type AppConfig } from '../api/config';

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configAPI.get()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
