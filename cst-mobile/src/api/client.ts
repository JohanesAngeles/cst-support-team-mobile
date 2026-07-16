import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://cst-support-api-3020a5341eb4.herokuapp.com/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let _logoutHandler: (() => void) | null = null;
export const setLogoutHandler = (fn: () => void) => { _logoutHandler = fn; };

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const code = err.response?.data?.code;
    if ((err.response?.status === 401 || code === 'ACCOUNT_BANNED' || code === 'ACCOUNT_SUSPENDED') && _logoutHandler) {
      _logoutHandler();
    }
    const message = err.response?.data?.message || 'Something went wrong';
    const apiError = new Error(message) as Error & { status?: number; code?: string };
    apiError.status = err.response?.status;
    apiError.code   = err.response?.data?.code;
    return Promise.reject(apiError);
  }
);

export default client;
