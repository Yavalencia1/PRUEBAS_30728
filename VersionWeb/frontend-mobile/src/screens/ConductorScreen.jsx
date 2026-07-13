/**
 * ConductorScreen.jsx --- Desarrollador 4 (Voncho)
 * Panel principal del conductor para RouteKids Mobile (React Native / Expo).
 *
 * Tareas implementadas segun el plan de migracion:
 *  1. Panel de Conduccion: Pantalla donde el conductor selecciona su recorrido
 *     y presiona "Iniciar Ruta".
 *  2. Conexion WebSockets: Usa ConductorWebSocket (services/websocket.js) que
 *     se conecta al backend FastAPI en /ws/conductor/{sesion_id}?token=JWT.
 *  3. GPS en segundo plano: Usa backgroundLocation.js (expo-location +
 *     expo-task-manager) para GPS persistente incluso con pantalla bloqueada.
 *  4. Simulador de Viaje: Boton para simular movimiento del bus en emulador.
 *
 * INTEGRACION CON OTROS DESARROLLADORES:
 *  - Dev 1 (Carlos Caiza): Reemplazar mock useAuth() con import real de AuthContext
 *  - Dev 2 (Jerson): Registrar esta pantalla en AppNavigator con guardia rol=conductor
 *  - Dev 3 (Anahi): Los datos GPS transmitidos aqui aparecen en MapTrackingScreen
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
  Vibration,
} from 'react-native';

// Servicios del Desarrollador 4
import ConductorWebSocket from '../services/websocket';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  isBackgroundLocationRunning,
  getCurrentPosition,
} from '../services/backgroundLocation';

// ─────────────────────────────────────────────────────────────────────────────
// NOTA DE INTEGRACION (Dev 4 -> Dev 1):
// AuthContext es creado por el Desarrollador 1 (Carlos Caiza).
// Cuando el AuthContext este disponible, reemplazar el mock de abajo con:
//
//   import { useAuth } from '../context/AuthContext';
//   const { usuario, token } = useAuth();
//
// El mock temporal devuelve null para que el archivo compile independientemente.
// ─────────────────────────────────────────────────────────────────────────────
const useAuth = () => ({ usuario: null, token: null });

// URL base de la API REST del backend FastAPI
// En dispositivo fisico con Expo Go: usar la IP LAN de la PC (ej. 192.168.1.X)
// En emulador Android: usar 10.0.2.2 en vez de 127.0.0.1
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Coordenadas base del simulador (Quito, Ecuador)
// Identicas a las usadas en MiRuta.jsx del frontend web para consistencia
const SIM_LAT_BASE = -0.180653;
const SIM_LNG_BASE = -78.467834;
const SIM_INTERVAL_MS = 3000;

// Paleta de colores del tema RouteKids Mobile (dark mode)
const C = {
  primary:       '#4F46E5',
  success:       '#10B981',
  danger:        '#EF4444',
  warning:       '#F59E0B',
  info:          '#3B82F6',
  bgDark:        '#0F172A',
  bgCard:        '#1E293B',
  bgCardLight:   '#334155',
  textPrimary:   '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted:     '#64748B',
  border:        '#334155',
  white:         '#FFFFFF',
};

/**
 * Helper para llamadas HTTP autenticadas a la API REST del backend FastAPI.
 * Replica la logica de fetchApi() del frontend web (api.js) para React Native.
 */
async function apiCall(endpoint, token, options = {}) {
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
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const msg = data?.detail || data?.mensaje || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ConductorScreen() {
  const { usuario, token } = useAuth();

  // Estado de sesion y ruta
  const [rutas, setRutas] = useState([]);
  const [selectedRutaId, setSelectedRutaId] = useState(null);
  const [selectedRutaNombre, setSelectedRutaNombre] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isRouteActive, setIsRouteActive] = useState(false);

  // Estado de conectividad
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [lastCoords, setLastCoords] = useState(null);

  // Lista de alumnos del recorrido
  const [alumnos, setAlumnos] = useState([]);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estado del simulador de viaje
  const [simMode, setSimMode] = useState(false);
  const simTickRef = useRef(0);
  const simIntervalRef = useRef(null);

  // ─── Ciclo de vida ────────────────────────────────────────────────────────────

  useEffect(() => {
    inicializar();
    return () => {
      // Cleanup: desconectar WS al salir de la pantalla
      // El GPS de fondo NO se detiene aqui — sigue corriendo hasta terminar ruta
      ConductorWebSocket.disconnect();
      _stopSimulator();
    };
  }, []);

  const inicializar = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([cargarRutas(), verificarSesionActiva()]);
    } catch {
      setError('Error al cargar datos. Verifica tu conexion con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Carga de datos desde la API ─────────────────────────────────────────────

  const cargarRutas = async () => {
    try {
      const r = await apiCall('/rutas', token);
      if (r?.ok && Array.isArray(r.data)) {
        setRutas(r.data);
        if (r.data.length > 0) {
          setSelectedRutaId(r.data[0].id.toString());
          const nombre = r.data[0].recorrido_nombre
            ? `${r.data[0].nombre} (${r.data[0].recorrido_nombre})`
            : r.data[0].nombre;
          setSelectedRutaNombre(nombre);
        }
      }
    } catch (err) {
      console.error('[Conductor] Error cargando rutas:', err.message);
    }
  };

  const verificarSesionActiva = async () => {
    try {
      // Consultar si ya existe una sesion en curso para este conductor
      const r = await apiCall('/sesiones/activa', token);
      if (r?.ok && r.data) {
        const sId = r.data.id.toString();
        setSessionId(sId);
        setSelectedRutaId(r.data.ruta_id?.toString());
        setIsRouteActive(true);
        await cargarAlumnos(r.data.recorrido_id, sId);
        conectarWebSocket(sId);
        // Verificar si el GPS ya estaba corriendo en segundo plano
        const gpsRunning = await isBackgroundLocationRunning();
        setIsGpsActive(gpsRunning);
        if (!gpsRunning) await iniciarGps();
      }
    } catch {
      // Sin sesion activa es el estado normal al abrir la app por primera vez
    }
  };

  const cargarAlumnos = async (recorridoId, sId) => {
    try {
      const ep = recorridoId
        ? `/alumnos/por-recorrido/${recorridoId}`
        : '/alumnos';
      const r = await apiCall(ep, token);
      if (r?.ok && Array.isArray(r.data)) {
        let lista = r.data.map(a => ({
          id: a.id.toString(),
          nombre: `${a.nombre} ${a.apellido}`.trim(),
          parada: a.parada_nombre || 'Sin parada asignada',
          estado: 'pendiente', // pendiente | en_bus | finalizado
          horaSubida: null,
          horaBajada: null,
        }));

        // Sincronizar estados de asistencia con el backend
        if (sId) {
          try {
            const ar = await apiCall(`/asistencias/sesion/${sId}`, token);
            if (ar?.ok && Array.isArray(ar.data)) {
              const mapa = {};
              ar.data.forEach(a => { mapa[a.alumno_id.toString()] = a; });
              lista = lista.map(al => {
                const m = mapa[al.id];
                if (!m) return al;
                return {
                  ...al,
                  estado: m.hora_bajada ? 'finalizado' : m.hora_subida ? 'en_bus' : 'pendiente',
                  horaSubida: m.hora_subida,
                  horaBajada: m.hora_bajada,
                };
              });
            }
          } catch { /* asistencias no criticas para carga inicial */ }
        }
        setAlumnos(lista);
      }
    } catch (err) {
      console.error('[Conductor] Error cargando alumnos:', err.message);
    }
  };

  // ─── Gestion del WebSocket ────────────────────────────────────────────────────

  /**
   * Conecta el WebSocket del conductor.
   * Usa ConductorWebSocket de services/websocket.js del Desarrollador 4.
   * El backend recibe el payload GPS y lo broadcast a los padres en /ws/gps/{sesion_id}.
   */
  const conectarWebSocket = useCallback((sId) => {
    ConductorWebSocket.connect(sId, token, {
      onOpen:  () => { setIsWsConnected(true);  setError(null); },
      onClose: () => { setIsWsConnected(false); },
      onError: () => { setIsWsConnected(false); },
    });
  }, [token]);

  // ─── GPS en segundo plano ─────────────────────────────────────────────────────

  /**
   * Inicia el servicio de GPS persistente.
   * La tarea BACKGROUND_LOCATION_TASK (definida en backgroundLocation.js)
   * captura coordenadas y las envia via ConductorWebSocket.sendLocation().
   */
  const iniciarGps = async () => {
    const result = await startBackgroundLocation();
    if (result.success) {
      setIsGpsActive(true);
      // Enviar la posicion inicial de inmediato
      const pos = await getCurrentPosition();
      if (pos) {
        ConductorWebSocket.sendLocation(pos.lat, pos.lng);
        setLastCoords(pos);
      }
    } else {
      Alert.alert(
        'GPS Requerido',
        result.error ||
          'Activa permisos de ubicacion en Configuracion > Aplicaciones > RouteKids.',
        [{ text: 'Entendido' }]
      );
    }
  };

  const detenerGps = async () => {
    await stopBackgroundLocation();
    setIsGpsActive(false);
    setLastCoords(null);
  };

  // ─── Simulador de viaje ───────────────────────────────────────────────────────

  /**
   * Inicia el simulador de coordenadas GPS ficticias.
   * Util cuando se desarrolla en emulador sin GPS real.
   * Simula el movimiento hacia el norte desde el centro de Quito.
   */
  const _startSimulator = () => {
    _stopSimulator();
    simTickRef.current = 0;
    setSimMode(true);
    simIntervalRef.current = setInterval(() => {
      simTickRef.current++;
      const lat = SIM_LAT_BASE + simTickRef.current * 0.0001;
      const sent = ConductorWebSocket.sendLocation(lat, SIM_LNG_BASE);
      if (sent) setLastCoords({ lat, lng: SIM_LNG_BASE });
    }, SIM_INTERVAL_MS);
  };

  const _stopSimulator = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setSimMode(false);
  };

  const handleToggleSimulator = () => {
    if (!isRouteActive) {
      Alert.alert('Aviso', 'Inicia una ruta primero para activar el simulador.');
      return;
    }
    simMode ? _stopSimulator() : _startSimulator();
  };

  // ─── Accion: Iniciar Ruta ─────────────────────────────────────────────────────

  const handleIniciarRuta = async () => {
    if (!selectedRutaId) {
      Alert.alert('Error', 'Selecciona una ruta primero.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      // POST /api/v1/sesiones/ - Crea la sesion en el backend
      const result = await apiCall('/sesiones/', token, {
        method: 'POST',
        body: { ruta_id: parseInt(selectedRutaId, 10) },
      });
      if (result?.ok && result.data) {
        const sId = result.data.id.toString();
        setSessionId(sId);
        setIsRouteActive(true);
        Vibration.vibrate(200); // Retroalimentacion haptica al iniciar
        await cargarAlumnos(result.data.recorrido_id, sId);
        conectarWebSocket(sId);
        await iniciarGps();
      } else {
        throw new Error(result?.mensaje || 'Error al crear la sesion.');
      }
    } catch (err) {
      setError(err.message || 'Error de conexion con el servidor.');
      Alert.alert('Error al Iniciar', err.message || 'No se pudo iniciar la ruta.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Accion: Terminar Ruta ────────────────────────────────────────────────────

  const handleTerminarRuta = () => {
    Alert.alert(
      'Terminar Recorrido',
      'Seguro que deseas terminar el recorrido de hoy? Esta accion notificara a todos los padres de familia.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Terminar Recorrido', style: 'destructive', onPress: _confirmarTerminar },
      ]
    );
  };

  const _confirmarTerminar = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    try {
      // PATCH /api/v1/sesiones/{id}/terminar - Cierra la sesion
      await apiCall(`/sesiones/${sessionId}/terminar`, token, { method: 'PATCH' });
      Vibration.vibrate([100, 100, 100]); // Triple vibration = exito
      // Detener todos los servicios
      ConductorWebSocket.disconnect();
      await detenerGps();
      _stopSimulator();
      // Resetear estado de la pantalla
      setIsRouteActive(false);
      setSessionId(null);
      setAlumnos([]);
      setIsWsConnected(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo terminar la sesion.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Acciones de asistencia ───────────────────────────────────────────────────

  const handleMarcarSubida = async (alumnoId) => {
    if (!isRouteActive || !sessionId) return;
    try {
      const ep = `/asistencias/subida?sesion_id=${sessionId}&alumno_id=${alumnoId}`;
      const r = await apiCall(ep, token, { method: 'POST' });
      if (r?.ok) {
        Vibration.vibrate(100);
        setAlumnos(prev => prev.map(a =>
          a.id === alumnoId
            ? { ...a, estado: 'en_bus', horaSubida: new Date().toISOString() }
            : a
        ));
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo registrar la subida.');
    }
  };

  const handleMarcarBajada = async (alumnoId) => {
    if (!isRouteActive || !sessionId) return;
    try {
      const ep = `/asistencias/bajada?sesion_id=${sessionId}&alumno_id=${alumnoId}`;
      const r = await apiCall(ep, token, { method: 'POST' });
      if (r?.ok) {
        Vibration.vibrate(100);
        setAlumnos(prev => prev.map(a =>
          a.id === alumnoId
            ? { ...a, estado: 'finalizado', horaBajada: new Date().toISOString() }
            : a
        ));
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo registrar la bajada.');
    }
  };

  // ─── Helpers de formato ───────────────────────────────────────────────────────

  const formatTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : '--:--';

  const getEstadoColor = (e) =>
    e === 'en_bus' ? C.success : e === 'finalizado' ? C.info : C.warning;

  const getEstadoLabel = (e) =>
    e === 'en_bus' ? 'A bordo' : e === 'finalizado' ? 'Entregado' : 'Pendiente';

  // ─── Pantalla de carga ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Cargando panel del conductor...</Text>
      </SafeAreaView>
    );
  }

  // ─── Render Principal ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Encabezado ── */}
        <View style={s.header}>
          <Text style={s.headerEmoji}>🚌</Text>
          <View>
            <Text style={s.headerTitle}>Panel del Conductor</Text>
            {usuario && (
              <Text style={s.headerSubtitle}>{usuario.nombre} {usuario.apellido}</Text>
            )}
          </View>
        </View>

        {/* ── Tarjeta de control principal ── */}
        <View style={s.controlCard}>
          {isRouteActive ? (
            /* Estado: Ruta en Progreso */
            <View>
              <View style={s.activeRow}>
                <View style={s.activePulse} />
                <Text style={s.activeTitle}>Recorrido en Progreso</Text>
              </View>
              {selectedRutaNombre ? (
                <Text style={s.rutaNombre}>{selectedRutaNombre}</Text>
              ) : null}

              {/* Indicadores de estado en tiempo real */}
              <View style={s.statusRow}>
                <View style={[s.statusBadge, { borderColor: isWsConnected ? C.success + '44' : C.warning + '44' }]}>
                  <Text style={[s.statusText, { color: isWsConnected ? C.success : C.warning }]}>
                    {isWsConnected ? '🟢 WebSocket OK' : '🟡 Reconectando...'}
                  </Text>
                </View>
                <View style={[s.statusBadge, { borderColor: isGpsActive ? C.success + '44' : C.danger + '44' }]}>
                  <Text style={[s.statusText, { color: isGpsActive ? C.success : C.danger }]}>
                    {isGpsActive ? '🛰 GPS Activo' : '❌ GPS Inactivo'}
                  </Text>
                </View>
              </View>

              {/* Coordenadas GPS en tiempo real */}
              {lastCoords && (
                <View style={s.coordsBox}>
                  <Text style={s.coordsText}>
                    {`📍 ${lastCoords.lat.toFixed(6)}, ${lastCoords.lng.toFixed(6)}`}
                  </Text>
                  {simMode && (
                    <Text style={s.simLabel}>⚠ MODO SIMULACION ACTIVO</Text>
                  )}
                </View>
              )}

              {/* Boton simulador de viaje */}
              <TouchableOpacity
                style={[s.simBtn, simMode && s.simBtnActive]}
                onPress={handleToggleSimulator}
              >
                <Text style={s.simBtnText}>
                  {simMode ? '⏹ Detener Simulador' : '▶ Simulador de Viaje (Emulador)'}
                </Text>
              </TouchableOpacity>

              {/* Boton terminar recorrido */}
              <TouchableOpacity
                style={[s.mainBtn, s.dangerBtn, actionLoading && s.btnDisabled]}
                onPress={handleTerminarRuta}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={s.mainBtnText}>⏹ Terminar Recorrido</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            /* Estado: Sin Ruta Activa */
            <View>
              <Text style={s.idleEmoji}>🚌</Text>
              <Text style={s.idleTitle}>Iniciar Recorrido del Dia</Text>
              <Text style={s.idleSubtitle}>
                Selecciona tu ruta asignada para abrir el canal GPS y notificar a los padres de familia.
              </Text>

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>⚠ {error}</Text>
                </View>
              )}

              {rutas.length === 0 ? (
                <View style={s.warningBox}>
                  <Text style={s.warningText}>
                    No hay rutas registradas en el sistema. Solicita al dueno que asigne rutas al conductor.
                  </Text>
                </View>
              ) : (
                <View style={s.rutaSelectorContainer}>
                  <Text style={s.label}>Elige tu ruta:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {rutas.map(ruta => {
                      const nombre = ruta.recorrido_nombre
                        ? `${ruta.nombre}\n${ruta.recorrido_nombre}`
                        : ruta.nombre;
                      const sel = selectedRutaId === ruta.id.toString();
                      return (
                        <TouchableOpacity
                          key={ruta.id}
                          style={[s.rutaChip, sel && s.rutaChipSelected]}
                          onPress={() => {
                            setSelectedRutaId(ruta.id.toString());
                            setSelectedRutaNombre(nombre.replace('\n', ' - '));
                          }}
                        >
                          <Text
                            style={[s.rutaChipText, sel && s.rutaChipTextSelected]}
                            numberOfLines={2}
                          >
                            {nombre}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Boton iniciar ruta */}
              <TouchableOpacity
                style={[
                  s.mainBtn,
                  s.successBtn,
                  (rutas.length === 0 || actionLoading) && s.btnDisabled,
                ]}
                onPress={handleIniciarRuta}
                disabled={rutas.length === 0 || actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={s.mainBtnText}>▶ Comenzar Ruta</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Lista de Alumnos ── */}
        <View style={s.alumnosSection}>
          <Text style={s.sectionTitle}>
            {`Alumnos en este Recorrido${alumnos.length > 0 ? ' (' + alumnos.length + ')' : ''}`}
          </Text>

          {!isRouteActive ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>
                Inicia un recorrido para cargar la lista de alumnos y registrar asistencias.
              </Text>
            </View>
          ) : alumnos.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No hay alumnos asignados a este recorrido.</Text>
            </View>
          ) : (
            alumnos.map(alumno => {
              const color = getEstadoColor(alumno.estado);
              const label = getEstadoLabel(alumno.estado);
              return (
                <View key={alumno.id} style={[s.alumnoCard, { borderLeftColor: color }]}>
                  <View style={s.alumnoInfo}>
                    <View style={[s.alumnoAvatar, { backgroundColor: color + '22' }]}>
                      <Text style={[s.alumnoAvatarText, { color }]}>
                        {alumno.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.alumnoMeta}>
                      <Text style={[s.alumnoNombre, alumno.estado === 'finalizado' && s.alumnoTachado]}>
                        {alumno.nombre}
                      </Text>
                      <Text style={s.alumnoParada}>{`📍 ${alumno.parada}`}</Text>
                      <View style={[s.estadoBadge, { backgroundColor: color + '22' }]}>
                        <Text style={[s.estadoBadgeText, { color }]}>{label}</Text>
                      </View>
                      {alumno.estado === 'en_bus' && alumno.horaSubida && (
                        <Text style={s.horaText}>{`Subio: ${formatTime(alumno.horaSubida)}`}</Text>
                      )}
                      {alumno.estado === 'finalizado' && alumno.horaBajada && (
                        <Text style={s.horaText}>{`Entregado: ${formatTime(alumno.horaBajada)}`}</Text>
                      )}
                    </View>
                  </View>

                  {/* Botones de asistencia Subida/Bajada */}
                  <View style={s.alumnoActions}>
                    <TouchableOpacity
                      style={[s.actionBtn, s.subidaBtn, alumno.estado !== 'pendiente' && s.actionBtnDisabled]}
                      onPress={() => handleMarcarSubida(alumno.id)}
                      disabled={alumno.estado !== 'pendiente' || !isRouteActive}
                    >
                      <Text style={s.actionBtnText}>↑ Subida</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.bajadaBtn, alumno.estado !== 'en_bus' && s.actionBtnDisabled]}
                      onPress={() => handleMarcarBajada(alumno.id)}
                      disabled={alumno.estado !== 'en_bus' || !isRouteActive}
                    >
                      <Text style={s.actionBtnText}>↓ Bajada</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos (StyleSheet de React Native) ────────────────────────────────────

const s = StyleSheet.create({
  // Contenedores base
  safeArea:           { flex: 1, backgroundColor: C.bgDark },
  loadingContainer:   { flex: 1, backgroundColor: C.bgDark, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText:        { color: C.textSecondary, fontSize: 16 },
  scrollView:         { flex: 1 },
  scrollContent:      { padding: 16 },

  // Encabezado
  header:             { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: Platform.OS === 'android' ? 8 : 0 },
  headerEmoji:        { fontSize: 36 },
  headerTitle:        { fontSize: 22, fontWeight: '700', color: C.textPrimary, letterSpacing: 0.3 },
  headerSubtitle:     { fontSize: 14, color: C.textSecondary, marginTop: 2 },

  // Tarjeta de control
  controlCard:        { backgroundColor: C.bgCard, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border, elevation: 6 },

  // Estado activo
  activeRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  activePulse:        { width: 12, height: 12, borderRadius: 6, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  activeTitle:        { fontSize: 18, fontWeight: '700', color: C.success },
  rutaNombre:         { fontSize: 14, color: C.textSecondary, marginBottom: 14, marginLeft: 22 },

  // Badges de estado
  statusRow:          { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statusBadge:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: C.bgCardLight },
  statusText:         { fontSize: 12, fontWeight: '600' },

  // Coordenadas GPS
  coordsBox:          { backgroundColor: C.bgCardLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  coordsText:         { fontSize: 12, color: C.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  simLabel:           { fontSize: 11, color: C.warning, fontWeight: '700', marginTop: 4 },

  // Simulador
  simBtn:             { borderWidth: 1, borderColor: C.textMuted, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 14 },
  simBtnActive:       { borderColor: C.warning, backgroundColor: C.warning + '15' },
  simBtnText:         { fontSize: 13, color: C.textSecondary, fontWeight: '500' },

  // Estado idle (sin ruta)
  idleEmoji:          { fontSize: 52, textAlign: 'center', marginBottom: 12 },
  idleTitle:          { fontSize: 20, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  idleSubtitle:       { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  // Mensajes de error/warning
  errorBox:           { backgroundColor: C.danger + '20', borderWidth: 1, borderColor: C.danger + '50', borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText:          { color: C.danger, fontSize: 14, fontWeight: '500' },
  warningBox:         { backgroundColor: C.warning + '20', borderWidth: 1, borderColor: C.warning + '50', borderRadius: 8, padding: 14, marginBottom: 14 },
  warningText:        { color: C.warning, fontSize: 14, lineHeight: 20 },

  // Selector de rutas (chips horizontales)
  rutaSelectorContainer: { marginBottom: 16 },
  label:              { fontSize: 14, color: C.textSecondary, marginBottom: 8, fontWeight: '500' },
  rutaChip:           { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, minWidth: 120, maxWidth: 180, backgroundColor: C.bgCardLight },
  rutaChipSelected:   { borderColor: C.primary, backgroundColor: C.primary + '25' },
  rutaChipText:       { fontSize: 13, color: C.textSecondary, textAlign: 'center' },
  rutaChipTextSelected: { color: C.primary, fontWeight: '600' },

  // Botones principales
  mainBtn:            { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, elevation: 4 },
  successBtn:         { backgroundColor: C.success },
  dangerBtn:          { backgroundColor: C.danger },
  btnDisabled:        { opacity: 0.5 },
  mainBtnText:        { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Seccion de alumnos
  alumnosSection:     { marginBottom: 8 },
  sectionTitle:       { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },

  // Tarjeta de alumno
  alumnoCard:         { backgroundColor: C.bgCard, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: C.border, elevation: 3 },
  alumnoInfo:         { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  alumnoAvatar:       { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  alumnoAvatarText:   { fontSize: 20, fontWeight: '700' },
  alumnoMeta:         { flex: 1, gap: 3 },
  alumnoNombre:       { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  alumnoTachado:      { textDecorationLine: 'line-through', color: C.textMuted },
  alumnoParada:       { fontSize: 12, color: C.textSecondary },
  estadoBadge:        { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  estadoBadgeText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  horaText:           { fontSize: 11, color: C.textMuted, marginTop: 1 },

  // Botones de asistencia
  alumnoActions:      { flexDirection: 'row', gap: 8 },
  actionBtn:          { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  subidaBtn:          { backgroundColor: C.success + '30', borderWidth: 1, borderColor: C.success + '60' },
  bajadaBtn:          { backgroundColor: C.info + '30', borderWidth: 1, borderColor: C.info + '60' },
  actionBtnDisabled:  { opacity: 0.3 },
  actionBtnText:      { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  // Tarjeta vacia
  emptyCard:          { backgroundColor: C.bgCard, borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  emptyText:          { color: C.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
});
