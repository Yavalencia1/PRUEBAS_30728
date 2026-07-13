import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config';
import { tokenStorage } from './secureStore';

/**
 * Cliente HTTP central de RouteKids sobre Axios.
 * - Inyecta el access token en cada request (Bearer).
 * - Ante un 401 intenta refrescar el token con el refresh token.
 * - Si no puede refrescar, dispara un evento global de logout.
 */

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

client.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Evitar bucle infinito en el propio refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== ENDPOINTS.refresh
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.refresh}`, {
          refresh_token: refreshToken,
        });

        const newAccessToken = data?.data?.tokens?.access_token;
        const newRefreshToken = data?.data?.tokens?.refresh_token;
        if (!newAccessToken) throw new Error('Token inválido');

        await tokenStorage.setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshToken,
        });

        flushQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError);
        await tokenStorage.clear();
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function extractPayload(response) {
  const body = response.data;
  // Respuesta estandarizada del backend: { ok, data, mensaje }
  if (body && typeof body === 'object' && 'data' in body) {
    return { ok: body.ok !== false, data: body.data, mensaje: body.mensaje };
  }
  return { ok: true, data: body, mensaje: '' };
}

function toError(error) {
  const detail = error.response?.data?.detail || error.response?.data?.mensaje;
  const message =
    (typeof detail === 'string' && detail) ||
    (Array.isArray(detail) && detail[0]?.msg) ||
    error.message ||
    'Error de red';
  return new Error(message);
}

export const api = {
  auth: {
    login: async (email, password) => {
      const response = await client.post(ENDPOINTS.login, { email, password });
      const result = extractPayload(response);
      if (result.ok && result.data?.tokens) {
        await tokenStorage.setTokens({
          accessToken: result.data.tokens.access_token,
          refreshToken: result.data.tokens.refresh_token,
        });
        await tokenStorage.setUser(result.data.usuario);
      }
      return result;
    },

    registro: async (userData) => {
      const response = await client.post(ENDPOINTS.registro, userData);
      return extractPayload(response);
    },

    refresh: async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      const response = await client.post(ENDPOINTS.refresh, { refresh_token: refreshToken });
      return extractPayload(response);
    },

    me: async () => {
      const response = await client.get(ENDPOINTS.me);
      return extractPayload(response);
    },

    logout: async () => {
      await tokenStorage.clear();
    },

    getCurrentUser: () => tokenStorage.getUser(),
  },
};

export default client;
