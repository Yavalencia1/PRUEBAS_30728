import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, WS_BASE_URL } from '../config';

/**
 * api.js — Cliente HTTP centralizado para RouteKids Mobile
 *
 * Todos los endpoints apuntan a API_BASE_URL definido en src/config.js.
 * Para cambiar de entorno (emulador ↔ red local ↔ producción),
 * editar únicamente API_HOST en config.js.
 *
 * Patrón de respuesta del backend FastAPI:
 *   { ok: boolean, data: any, mensaje: string }
 */

// ─── Helper base ─────────────────────────────────────────────────────────────

async function fetchApi(endpoint, options = {}) {
  try {
    const token = await AsyncStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = { ...options, headers };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Token expirado → limpiar sesión local
    if (response.status === 401) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('usuario');
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      let errorMsg = `Error de red (${response.status})`;

      if (Array.isArray(data?.detail)) {
        errorMsg = data.detail.map(e => e.msg).join('\n');
      } else if (typeof data?.detail === 'string') {
        errorMsg = data.detail;
      } else if (data?.mensaje) {
        errorMsg = data.mensaje;
      }

      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const api = {

  // Autenticación
  auth: {
    login: async (email, password) => {
      try {
        const result = await fetchApi('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        if (result.ok && result.data) {
          await AsyncStorage.setItem('access_token', result.data.tokens.access_token);
          await AsyncStorage.setItem('usuario', JSON.stringify(result.data.usuario));
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

        const result = await fetchApi('/auth/registro', {
          method: 'POST',
          headers,
          body,
        });

        return result;
      } catch (error) {
        return {
          ok: false,
          mensaje: error.message,
        };
      }
    },
    logout: async () => {
      try {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('usuario');
      } catch (error) {
        console.error('Error al hacer logout:', error);
      }
    },

    getCurrentUser: async () => {
      try {
        const u = await AsyncStorage.getItem('usuario');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },

    getToken: async () => {
      try {
        return await AsyncStorage.getItem('access_token');
      } catch {
        return null;
      }
    },
  },

  // Usuarios
  usuarios: {
    listByRol: async (rol) => {
      try {
        return await fetchApi(`/usuarios?rol=${rol}`);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Recorridos
  recorridos: {
    list: async () => {
      try {
        return await fetchApi('/recorridos');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    create: async (nombre, descripcion, activo, duenoId) => {
      try {
        return await fetchApi('/recorridos/', {
          method: 'POST',
          body: { nombre, descripcion, activo, dueno_id: duenoId },
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    update: async (id, nombre, descripcion, activo) => {
      try {
        return await fetchApi(`/recorridos/${id}`, {
          method: 'PUT',
          body: { nombre, descripcion, activo },
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    // Endpoint DELETE — solo ADMIN
    delete: async (id) => {
      try {
        return await fetchApi(`/recorridos/${id}`, { method: 'DELETE' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Rutas
  rutas: {
    list: async () => {
      try {
        return await fetchApi('/rutas');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    create: async (recorridoId, nombre, descripcion, tipo) => {
      try {
        return await fetchApi('/rutas/', {
          method: 'POST',
          body: { recorrido_id: recorridoId, nombre, descripcion, tipo },
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    update: async (id, recorridoId, nombre, descripcion, tipo) => {
      try {
        return await fetchApi(`/rutas/${id}`, {
          method: 'PUT',
          body: { recorrido_id: recorridoId, nombre, descripcion, tipo },
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    // Endpoint DELETE — solo ADMIN
    delete: async (id) => {
      try {
        return await fetchApi(`/rutas/${id}`, { method: 'DELETE' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Paradas
  paradas: {
    list: async (recorridoId = null) => {
      try {
        const query = recorridoId ? `?recorrido_id=${recorridoId}` : '';
        return await fetchApi(`/paradas${query}`);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    create: async (rutaId, nombre, latitud, longitud, orden) => {
      try {
        return await fetchApi('/paradas/', {
          method: 'POST',
          body: { ruta_id: rutaId, nombre, latitud, longitud, orden },
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    // Endpoint DELETE — solo ADMIN
    delete: async (id) => {
      try {
        return await fetchApi(`/paradas/${id}`, { method: 'DELETE' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    listForSession: async (sessionId) => {
      try {
        return await fetchApi(`/paradas/por-sesion/${sessionId}`);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Alumnos
  alumnos: {
    list: async () => {
      try {
        return await fetchApi('/alumnos');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    listByRecorrido: async (recorridoId) => {
      try {
        return await fetchApi(`/alumnos/por-recorrido/${recorridoId}`);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    create: async (alumnoData) => {
      try {
        return await fetchApi('/alumnos/', {
          method: 'POST',
          body: alumnoData,
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    // Endpoint DELETE — solo ADMIN
    delete: async (id) => {
      try {
        return await fetchApi(`/alumnos/${id}`, { method: 'DELETE' });
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
        return await fetchApi(`/pagos/${query}`);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    resumen: async () => {
      try {
        return await fetchApi('/pagos/resumen');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    marcarPagado: async (pagoId) => {
      try {
        return await fetchApi(`/pagos/${pagoId}/marcar-pagado`, { method: 'POST' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    marcarNoPagado: async (pagoId) => {
      try {
        return await fetchApi(`/pagos/${pagoId}/marcar-no-pagado`, { method: 'POST' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    delete: async (pagoId) => {
      try {
        return await fetchApi(`/pagos/${pagoId}`, { method: 'DELETE' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Sesiones de Ruta
  sesiones: {
    getActiva: async () => {
      try {
        return await fetchApi('/sesiones/activa');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    getActivaParaUsuario: async () => {
      try {
        return await fetchApi('/sesiones/activa-para-usuario');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    create: async (rutaId) => {
      try {
        return await fetchApi('/sesiones/', {
          method: 'POST',
          body: { ruta_id: rutaId },
        });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    terminar: async (sessionId) => {
      try {
        return await fetchApi(`/sesiones/${sessionId}/terminar`, { method: 'PATCH' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    historial: async () => {
      try {
        return await fetchApi('/sesiones/historial');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    delete: async (sessionId) => {
      try {
        return await fetchApi(`/sesiones/${sessionId}`, { method: 'DELETE' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // Asistencia
  asistencias: {
    listBySesion: async (sessionId) => {
      try {
        return await fetchApi(`/asistencias/sesion/${sessionId}`);
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    marcarSubida: async (sessionId, alumnoId) => {
      try {
        return await fetchApi(
          `/asistencias/subida?sesion_id=${sessionId}&alumno_id=${alumnoId}`,
          { method: 'POST' }
        );
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    marcarBajada: async (sessionId, alumnoId) => {
      try {
        return await fetchApi(
          `/asistencias/bajada?sesion_id=${sessionId}&alumno_id=${alumnoId}`,
          { method: 'POST' }
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
        return await fetchApi('/notificaciones');
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    marcarLeida: async (id) => {
      try {
        return await fetchApi(`/notificaciones/${id}/marcar-leida`, { method: 'POST' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },

    delete: async (id) => {
      try {
        return await fetchApi(`/notificaciones/${id}`, { method: 'DELETE' });
      } catch (error) {
        return { ok: false, mensaje: error.message };
      }
    },
  },

  // URLs WebSocket (construidas desde config.js)
  websockets: {
    getConductorUrl: async (sessionId) => {
      const token = await AsyncStorage.getItem('access_token');
      return `${WS_BASE_URL}/conductor/${sessionId}?token=${token}`;
    },

    getGpsUrl: async (sessionId) => {
      const token = await AsyncStorage.getItem('access_token');
      return `${WS_BASE_URL}/gps/${sessionId}?token=${token}`;
    },
  },
};
