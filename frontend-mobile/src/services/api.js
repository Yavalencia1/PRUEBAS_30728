import axios from 'axios';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { tokenStorage } from './secureStore';

/**
 * api.js — Cliente HTTP centralizado para RouteKids Mobile (Axios)
 *
 * - Inyecta el access token (Bearer) en cada request desde expo-secure-store.
 * - Ante un 401 intenta refrescar el token con /auth/refresh (cola de peticiones).
 * - Forma de respuesta del backend FastAPI: { ok, data, mensaje }
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

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
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

        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

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
  if (body && typeof body === 'object' && 'data' in body) {
    return { ok: body.ok !== false, data: body.data, mensaje: body.mensaje };
  }
  return { ok: true, data: body, mensaje: '' };
}

function toError(error) {
  const detail = error.response?.data?.detail || error.response?.data?.mensaje;
  const message =
    (typeof detail === 'string' && detail) ||
    (Array.isArray(detail) && detail.map((e) => e.msg).join('\n')) ||
    error.message ||
    'Error de red';
  return new Error(message);
}

export const api = {
  // Autenticación
  auth: {
    login: async (email, password) => {
      try {
        const response = await client.post('/auth/login', { email, password });
        const result = extractPayload(response);
        if (result.ok && result.data?.tokens) {
          await tokenStorage.setTokens({
            accessToken: result.data.tokens.access_token,
            refreshToken: result.data.tokens.refresh_token,
          });
          await tokenStorage.setUser(result.data.usuario);
        }
        return result;
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    registro: async (userData) => {
      try {
        const headers = {};
        // Solo si intenta crear un administrador
        if (userData.rol === 'admin' && userData.adminSecret) {
          headers['X-Admin-Secret'] = userData.adminSecret;
        }
        // No enviar adminSecret al body
        const { adminSecret, ...body } = userData;

        const response = await client.post('/auth/registro', body, { headers });
        return extractPayload(response);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    logout: async () => {
      try {
        await tokenStorage.clear();
      } catch (error) {
        console.error('Error al hacer logout:', error);
      }
    },

    getCurrentUser: async () => {
      try {
        return await tokenStorage.getUser();
      } catch {
        return null;
      }
    },

    getToken: async () => {
      try {
        return await tokenStorage.getAccessToken();
      } catch {
        return null;
      }
    },
  },

  // Usuarios
  usuarios: {
    listByRol: async (rol) => {
      try {
        return extractPayload(await client.get(`/usuarios?rol=${rol}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Recorridos
  recorridos: {
    list: async () => {
      try {
        return extractPayload(await client.get('/recorridos'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    create: async (nombre, descripcion, activo, duenoId) => {
      try {
        return extractPayload(
          await client.post('/recorridos/', {
            nombre,
            descripcion,
            activo,
            dueno_id: duenoId,
          })
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    update: async (id, nombre, descripcion, activo) => {
      try {
        return extractPayload(
          await client.put(`/recorridos/${id}`, { nombre, descripcion, activo })
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (id) => {
      try {
        return extractPayload(await client.delete(`/recorridos/${id}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Rutas
  rutas: {
    list: async (recorridoId = null) => {
      try {
        const query = recorridoId ? `?recorrido_id=${recorridoId}` : '';
        return extractPayload(await client.get(`/rutas${query}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    create: async (recorridoId, nombre, descripcion, tipo) => {
      try {
        return extractPayload(
          await client.post('/rutas/', {
            recorrido_id: recorridoId,
            nombre,
            descripcion,
            tipo,
          })
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    update: async (id, nombre, descripcion, tipo) => {
      try {
        return extractPayload(
          await client.put(`/rutas/${id}`, {
            nombre,
            descripcion,
            tipo,
          })
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (id) => {
      try {
        return extractPayload(await client.delete(`/rutas/${id}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Paradas
  paradas: {
    list: async ({ recorridoId = null, rutaId = null } = {}) => {
      try {
        const params = [];
        if (recorridoId) params.push(`recorrido_id=${recorridoId}`);
        if (rutaId) params.push(`ruta_id=${rutaId}`);
        const query = params.length ? `?${params.join('&')}` : '';
        return extractPayload(await client.get(`/paradas${query}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    create: async (rutaId, nombre, latitud, longitud, orden) => {
      try {
        return extractPayload(
          await client.post('/paradas/', {
            ruta_id: rutaId,
            nombre,
            latitud,
            longitud,
            orden,
          })
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    update: async (id, { nombre, latitud, longitud, orden }) => {
      try {
        return extractPayload(
          await client.put(`/paradas/${id}`, {
            nombre,
            latitud,
            longitud,
            orden,
          })
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (id) => {
      try {
        return extractPayload(await client.delete(`/paradas/${id}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    listForSession: async (sessionId) => {
      try {
        return extractPayload(await client.get(`/paradas/por-sesion/${sessionId}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Alumnos
  alumnos: {
    list: async () => {
      try {
        return extractPayload(await client.get('/alumnos'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    listByRecorrido: async (recorridoId) => {
      try {
        return extractPayload(await client.get(`/alumnos/por-recorrido/${recorridoId}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    create: async (alumnoData) => {
      try {
        return extractPayload(await client.post('/alumnos/', alumnoData));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (id) => {
      try {
        return extractPayload(await client.delete(`/alumnos/${id}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Pagos
  pagos: {
    list: async (estado = 'todos', padreId = null) => {
      try {
        const params = new URLSearchParams();
        if (padreId) params.append('padre_id', padreId);
        if (estado && estado !== 'todos') params.append('estado', estado);
        const query = params.toString() ? `?${params.toString()}` : '';
        return extractPayload(await client.get(`/pagos/${query}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    resumen: async () => {
      try {
        return extractPayload(await client.get('/pagos/resumen'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    marcarPagado: async (pagoId) => {
      try {
        return extractPayload(await client.post(`/pagos/${pagoId}/marcar-pagado`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    marcarNoPagado: async (pagoId) => {
      try {
        return extractPayload(await client.post(`/pagos/${pagoId}/marcar-no-pagado`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (pagoId) => {
      try {
        return extractPayload(await client.delete(`/pagos/${pagoId}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Sesiones de Ruta
  sesiones: {
    getActiva: async () => {
      try {
        return extractPayload(await client.get('/sesiones/activa'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    getActivaParaUsuario: async () => {
      try {
        return extractPayload(await client.get('/sesiones/activa-para-usuario'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    create: async (rutaId) => {
      try {
        return extractPayload(await client.post('/sesiones/', { ruta_id: rutaId }));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    terminar: async (sessionId) => {
      try {
        return extractPayload(await client.patch(`/sesiones/${sessionId}/terminar`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    historial: async () => {
      try {
        return extractPayload(await client.get('/sesiones/historial'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (sessionId) => {
      try {
        return extractPayload(await client.delete(`/sesiones/${sessionId}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Asistencia
  asistencias: {
    listBySesion: async (sessionId) => {
      try {
        return extractPayload(await client.get(`/asistencias/sesion/${sessionId}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    marcarSubida: async (sessionId, alumnoId) => {
      try {
        return extractPayload(
          await client.post(
            `/asistencias/subida?sesion_id=${sessionId}&alumno_id=${alumnoId}`
          )
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    marcarBajada: async (sessionId, alumnoId) => {
      try {
        return extractPayload(
          await client.post(
            `/asistencias/bajada?sesion_id=${sessionId}&alumno_id=${alumnoId}`
          )
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Notificaciones
  notificaciones: {
    list: async () => {
      try {
        return extractPayload(await client.get('/notificaciones'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    contarSinLeer: async () => {
      try {
        return extractPayload(await client.get('/notificaciones/sin-leer'));
      } catch (error) {
        return { ok: false, data: { sin_leer: 0 }, mensaje: error.message };
      }
    },
    marcarLeida: async (id) => {
      try {
        return extractPayload(await client.post(`/notificaciones/${id}/marcar-leida`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    marcarTodasLeidas: async () => {
      try {
        return extractPayload(await client.post('/notificaciones/marcar-todas-leidas'));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
    delete: async (id) => {
      try {
        return extractPayload(await client.delete(`/notificaciones/${id}`));
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // URLs WebSocket (construidas desde config.js)
  websockets: {
    getConductorUrl: async (sessionId) => {
      const token = await tokenStorage.getAccessToken();
      return `${WS_BASE_URL}/conductor/${sessionId}?token=${token}`;
    },
    getGpsUrl: async (sessionId) => {
      const token = await tokenStorage.getAccessToken();
      return `${WS_BASE_URL}/gps/${sessionId}?token=${token}`;
    },
  },
};
