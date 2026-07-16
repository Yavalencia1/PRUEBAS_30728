const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000/ws';

/**
 * Helper base para realizar peticiones HTTP autenticadas
 */
async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    // Si expira o es inválido el token, forzar logout
    localStorage.removeItem('access_token');
    localStorage.removeItem('usuario');
    window.dispatchEvent(new Event('auth-logout'));
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.mensaje || `Error de red (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Autenticación
  auth: {
    login: async (email, password) => {
      const result = await fetchApi('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (result.ok && result.data) {
        localStorage.setItem('access_token', result.data.tokens.access_token);
        localStorage.setItem('usuario', JSON.stringify(result.data.usuario));
      }
      return result;
    },
    registro: async (userData) => {
      return fetchApi('/auth/registro', {
        method: 'POST',
        body: userData,
      });
    },
    logout: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('usuario');
      window.dispatchEvent(new Event('auth-logout'));
    },
    getCurrentUser: () => {
      try {
        const u = localStorage.getItem('usuario');
        return u ? JSON.parse(u) : null;
      } catch (_) {
        return null;
      }
    },
    getToken: () => localStorage.getItem('access_token'),
  },

  // Usuarios
  usuarios: {
    listByRol: async (rol) => {
      return fetchApi(`/usuarios?rol=${rol}`);
    },
  },

  // Recorridos
  recorridos: {
    list: async () => {
      return fetchApi('/recorridos');
    },
    create: async (nombre, descripcion, activo, duenoId) => {
      return fetchApi('/recorridos/', {
        method: 'POST',
        body: { nombre, descripcion, activo, dueno_id: duenoId },
      });
    },
  },

  // Rutas
  rutas: {
    list: async () => {
      return fetchApi('/rutas');
    },
    create: async (recorridoId, nombre, descripcion, tipo) => {
      return fetchApi('/rutas/', {
        method: 'POST',
        body: { recorrido_id: recorridoId, nombre, descripcion, tipo },
      });
    },
  },

  // Paradas
  paradas: {
    list: async (recorridoId = null) => {
      const query = recorridoId ? `?recorrido_id=${recorridoId}` : '';
      return fetchApi(`/paradas${query}`);
    },
    create: async (rutaId, nombre, latitud, longitud, orden) => {
      return fetchApi('/paradas/', {
        method: 'POST',
        body: { ruta_id: rutaId, nombre, latitud, longitud, orden },
      });
    },
    listForSession: async (sessionId) => {
      return fetchApi(`/paradas/por-sesion/${sessionId}`);
    },
  },

  // Alumnos
  alumnos: {
    list: async () => {
      return fetchApi('/alumnos');
    },
    listByRecorrido: async (recorridoId) => {
      return fetchApi(`/alumnos/por-recorrido/${recorridoId}`);
    },
    create: async (alumnoData) => {
      return fetchApi('/alumnos/', {
        method: 'POST',
        body: alumnoData,
      });
    },
  },

  // Pagos
  pagos: {
    list: async (estado = 'todos', padreId = null) => {
      const params = new URLSearchParams();
      if (padreId) params.append('padre_id', padreId);
      if (estado && estado !== 'todos') params.append('estado', estado);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return fetchApi(`/pagos/${query}`);
    },
    resumen: async () => {
      return fetchApi('/pagos/resumen');
    },
    marcarPagado: async (pagoId) => {
      return fetchApi(`/pagos/${pagoId}/marcar-pagado`, { method: 'POST' });
    },
    marcarNoPagado: async (pagoId) => {
      return fetchApi(`/pagos/${pagoId}/marcar-no-pagado`, { method: 'POST' });
    },
    delete: async (pagoId) => {
      return fetchApi(`/pagos/${pagoId}`, { method: 'DELETE' });
    },
  },

  // Sesiones de Ruta
  sesiones: {
    getActiva: async () => {
      return fetchApi('/sesiones/activa');
    },
    getActivaParaUsuario: async () => {
      return fetchApi('/sesiones/activa-para-usuario');
    },
    create: async (rutaId) => {
      return fetchApi('/sesiones/', {
        method: 'POST',
        body: { ruta_id: rutaId },
      });
    },
    terminar: async (sessionId) => {
      return fetchApi(`/sesiones/${sessionId}/terminar`, {
        method: 'PATCH',
      });
    },
    historial: async () => {
      return fetchApi('/sesiones/historial');
    },
    delete: async (sessionId) => {
      return fetchApi(`/sesiones/${sessionId}`, {
        method: 'DELETE',
      });
    },
  },

  // Asistencia
  asistencias: {
    listBySesion: async (sessionId) => {
      return fetchApi(`/asistencias/sesion/${sessionId}`);
    },
    marcarSubida: async (sessionId, alumnoId) => {
      return fetchApi(`/asistencias/subida?sesion_id=${sessionId}&alumno_id=${alumnoId}`, {
        method: 'POST',
      });
    },
    marcarBajada: async (sessionId, alumnoId) => {
      return fetchApi(`/asistencias/bajada?sesion_id=${sessionId}&alumno_id=${alumnoId}`, {
        method: 'POST',
      });
    },
  },

  // Notificaciones
  notificaciones: {
    list: async () => {
      return fetchApi('/notificaciones');
    },
    marcarLeida: async (id) => {
      return fetchApi(`/notificaciones/${id}/marcar-leida`, {
        method: 'POST',
      });
    },
    delete: async (id) => {
      return fetchApi(`/notificaciones/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Conexiones WebSocket
  websockets: {
    getConductorUrl: (sessionId) => {
      const token = localStorage.getItem('access_token');
      return `${WS_BASE_URL}/conductor/${sessionId}?token=${token}`;
    },
    getGpsUrl: (sessionId) => {
      const token = localStorage.getItem('access_token');
      return `${WS_BASE_URL}/gps/${sessionId}?token=${token}`;
    }
  }
};
