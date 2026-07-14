/**
 * config.js — Configuración centralizada de RouteKids Mobile
 *
 * ⚙️  EDITA SOLO ESTA CONSTANTE PARA CAMBIAR DE ENTORNO:
 *
 *   API_HOST = '10.0.2.2'      → Emulador Android (localhost de la PC)
 *   API_HOST = '192.168.1.X'   → Dispositivo físico (IP LAN de tu PC)
 *   API_HOST = 'TU_IP_PUBLICA' → Producción o acceso remoto
 *
 * El puerto 8000 es el que usa el backend FastAPI por defecto.
 */
export const API_HOST = '192.168.100.11';
export const API_PORT = 8000;

export const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api/v1`;
export const WS_BASE_URL = `ws://${API_HOST}:${API_PORT}/ws`;