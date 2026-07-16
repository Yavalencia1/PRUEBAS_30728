/**
 * config.js — Configuración centralizada de RouteKids Mobile
 *
 * Para cambiar de entorno edita SOLO API_HOST:
 *   - Emulador Android : '10.0.2.2'   (localhost de la PC dentro del emulador)
 *   - iOS sim / Web    : '127.0.0.1'  (valor por defecto)
 *   - Dispositivo físico: se auto-detecta la IP LAN de la PC; si falla,
 *                         usa API_HOST o el fallback 127.0.0.1.
 *   - Red remota/prod  : la IP pública o el dominio del backend.
 *
 * El puerto 8000 es el que usa el backend FastAPI por defecto.
 */
import Constants from 'expo-constants';

export const API_PORT = 8000;

// Host manual forzado. Se inyecta desde expo.extra.apiHost (app.config.js lee
// process.env.API_HOST). Vacío/null => auto-detección de la IP LAN (Expo Go).
export const API_HOST = Constants.expoConfig?.extra?.apiHost || null;

function deriveHost() {
  // 1. Override manual explícito
  if (API_HOST) return API_HOST;

  // 2. Auto-detección de la IP LAN de la PC (dispositivo físico en Expo Go)
  const hostUri = Constants.expoConfig?.hostUri; // p.ej. "192.168.1.10:19000"
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  // 3. Fallback por defecto (emulador Android / iOS sim / web)
  return '127.0.0.1';
}

export const API_BASE_URL = `http://${deriveHost()}:${API_PORT}/api/v1`;
export const WS_BASE_URL = `ws://${deriveHost()}:${API_PORT}/ws`;
