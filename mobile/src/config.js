import Constants from 'expo-constants';

/**
 * Resolución de la URL base del backend FastAPI.
 *
 * En desarrollo el backend corre en la máquina del desarrollador.
 * - Web / emulador iOS: http://127.0.0.1:8000
 * - Emulador Android: http://10.0.2.2:8000
 * - Dispositivo físico (Expo Go): usa la IP LAN de la máquina derivada de
 *   Constants.expoConfig.hostUri (p.ej. 192.168.1.10:19000 -> 192.168.1.10:8000).
 *
 * Puede sobreescribirse con la variable extra "apiBaseUrl" en app.json o con
 * la variable de entorno EXPO_PUBLIC_API_BASE_URL.
 */

const FALLBACK = 'http://127.0.0.1:8000';
const API_PORT = '8000';

function deriveBaseUrl() {
  // Override explícito vía env o app.json extra
  const override =
    (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_BASE_URL) ||
    Constants.expoConfig?.extra?.apiBaseUrl;
  if (override && override !== FALLBACK) {
    return override.replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri; // p.ej. "192.168.1.10:19000"
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${API_PORT}`;
    }
  }

  return FALLBACK;
}

export const API_BASE_URL = deriveBaseUrl();
export const API_V1_PREFIX = '/api/v1';
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

export const ENDPOINTS = {
  login: `${API_V1_PREFIX}/auth/login`,
  registro: `${API_V1_PREFIX}/auth/registro`,
  refresh: `${API_V1_PREFIX}/auth/refresh`,
  me: `${API_V1_PREFIX}/auth/me`,
};
