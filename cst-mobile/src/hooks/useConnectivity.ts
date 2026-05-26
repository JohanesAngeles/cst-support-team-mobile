import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import client from '../api/client';
import { getQueue, removeFromQueue } from '../utils/offlineCache';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) syncQueue();
    });
    return () => unsub();
  }, []);

  return isOnline;
}

async function syncQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    try {
      if (item.method === 'POST') await client.post(item.url, item.data);
      else if (item.method === 'PUT') await client.put(item.url, item.data);
      else if (item.method === 'DELETE') await client.delete(item.url);
      await removeFromQueue(item.id);
    } catch {
      // Leave in queue to retry on next connectivity event
    }
  }
}
