/**
 * websocket.js — Desarrollador 4 (Voncho)
 * =========================================
 * Gestor del canal WebSocket del conductor para RouteKids Mobile.
 *
 * Conecta con el endpoint del backend FastAPI:
 *   ws://<HOST>/ws/conductor/<sesion_id>?token=<JWT>
 *
 * El payload enviado al backend es:
 *   { lat: number, lng: number, timestamp: string (ISO) }
 *
 * Esto es compatible con la funcion _parsear_gps() del backend existente.
 */

// URL base del servidor WebSocket.
// IMPORTANTE: En dispositivo fisico usar la IP de la maquina (ej. 192.168.1.X)
// No usar "localhost" en Expo Go, ya que apunta al telefono, no a la PC.
const WS_BASE_URL = 'ws://127.0.0.1:8000';

const RECONNECT_DELAY_MIN = 2000;
const RECONNECT_DELAY_MAX = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

let _socket = null;
let _sesionId = null;
let _token = null;
let _reconnectAttempts = 0;
let _reconnectTimer = null;
let _intentionalClose = false;

let _onOpen = null;
let _onClose = null;
let _onError = null;
let _onMessage = null;

function _buildUrl(sesionId, token) {
  return `${WS_BASE_URL}/ws/conductor/${sesionId}?token=${token}`;
}

function _calcReconnectDelay(attempt) {
  const base = Math.min(
    RECONNECT_DELAY_MIN * Math.pow(2, attempt),
    RECONNECT_DELAY_MAX
  );
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

function _clearReconnectTimer() {
  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

function _scheduleReconnect() {
  if (_intentionalClose) return;
  if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[WS RouteKids] Maximo de intentos de reconexion alcanzado.');
    if (_onError) _onError(new Error('Conexion perdida: maximo de reintentos alcanzado.'));
    return;
  }

  const delay = _calcReconnectDelay(_reconnectAttempts);
  _reconnectAttempts++;

  console.log(
    `[WS RouteKids] Reconectando en ${delay}ms (intento ${_reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
  );

  _reconnectTimer = setTimeout(() => {
    if (!_intentionalClose && _sesionId && _token) {
      _doConnect(_sesionId, _token);
    }
  }, delay);
}

function _doConnect(sesionId, token) {
  if (_socket) {
    try { _socket.close(); } catch (_) {}
    _socket = null;
  }

  const url = _buildUrl(sesionId, token);
  console.log(`[WS RouteKids] Conectando a: ${url}`);

  try {
    _socket = new WebSocket(url);
  } catch (err) {
    console.error('[WS RouteKids] Error al crear WebSocket:', err);
    if (_onError) _onError(err);
    _scheduleReconnect();
    return;
  }

  _socket.onopen = () => {
    console.log('[WS RouteKids] Conexion establecida');
    _reconnectAttempts = 0;
    if (_onOpen) _onOpen();
  };

  _socket.onclose = (event) => {
    console.log(`[WS RouteKids] Conexion cerrada (code: ${event.code})`);
    _socket = null;
    if (_onClose) _onClose(event);
    if (!_intentionalClose) _scheduleReconnect();
  };

  _socket.onerror = (error) => {
    console.error('[WS RouteKids] Error de WebSocket:', error);
    if (_onError) _onError(error);
  };

  _socket.onmessage = (event) => {
    if (_onMessage) _onMessage(event.data);
  };
}

const ConductorWebSocket = {
  /**
   * Conecta el WebSocket del conductor al backend.
   * @param {string|number} sesionId - ID de la sesion activa
   * @param {string} token - Token JWT del conductor
   * @param {object} callbacks - { onOpen, onClose, onError, onMessage }
   */
  connect(sesionId, token, callbacks = {}) {
    _intentionalClose = false;
    _reconnectAttempts = 0;
    _sesionId = sesionId.toString();
    _token = token;

    _onOpen = callbacks.onOpen || null;
    _onClose = callbacks.onClose || null;
    _onError = callbacks.onError || null;
    _onMessage = callbacks.onMessage || null;

    _clearReconnectTimer();
    _doConnect(_sesionId, _token);
  },

  /**
   * Envia las coordenadas GPS al backend.
   * Formato: { lat, lng, timestamp } compatible con _parsear_gps() del backend.
   * @param {number} lat - Latitud actual
   * @param {number} lng - Longitud actual
   * @returns {boolean} true si el mensaje fue enviado
   */
  sendLocation(lat, lng) {
    if (!_socket || _socket.readyState !== WebSocket.OPEN) {
      console.warn('[WS RouteKids] No se puede enviar: WebSocket no conectado.');
      return false;
    }

    const payload = {
      lat,
      lng,
      timestamp: new Date().toISOString(),
    };

    try {
      _socket.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      console.error('[WS RouteKids] Error al enviar ubicacion:', err);
      return false;
    }
  },

  /**
   * Desconecta el WebSocket y cancela reconexiones pendientes.
   * Llamar al terminar la ruta o desmontar la pantalla.
   */
  disconnect() {
    _intentionalClose = true;
    _clearReconnectTimer();

    if (_socket) {
      try { _socket.close(1000, 'Conductor termino la ruta'); } catch (_) {}
      _socket = null;
    }

    _sesionId = null;
    _token = null;
    _reconnectAttempts = 0;
    console.log('[WS RouteKids] Desconectado correctamente.');
  },

  /** @returns {boolean} true si el WebSocket esta conectado */
  isConnected() {
    return _socket !== null && _socket.readyState === WebSocket.OPEN;
  },

  /** @returns {string} Estado del socket para debugging */
  getReadyState() {
    if (!_socket) return 'NO_SOCKET';
    const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
    return states[_socket.readyState] || 'UNKNOWN';
  },
};

export default ConductorWebSocket;
