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
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

// Servicios del Desarrollador 4
import ConductorWebSocket from '../services/websocket';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  isBackgroundLocationRunning,
  getCurrentPosition,
} from '../services/backgroundLocation';

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRACION Dev 4 → Dev 1 completada:
// useAuth viene del AuthContext real (Dev 1 - Carlos Caiza).
// El token JWT se obtiene de AsyncStorage via AuthContext.
// ─────────────────────────────────────────────────────────────────────────────
import { useAuth } from '../context/AuthContext';

import { api } from '../services/api';

// Coordenadas base del simulador (Quito, Ecuador)
const SIM_LAT_BASE = -0.180653;
const SIM_LNG_BASE = -78.467834;
const SIM_INTERVAL_MS = 3000;

// Paleta de colores del tema RouteKids Mobile (light mode)
const C = {
  primary: '#6366f1',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  bgDark: '#f8f9fa', // Fondo claro
  bgCard: '#ffffff', // Tarjetas blancas
  bgCardLight: '#f1f5f9',
  textPrimary: '#1a202c', // Texto oscuro
  textSecondary: '#718096',
  textMuted: '#a0aec0',
  border: '#e2e8f0',
  white: '#ffffff',
};


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

  // Paradas de la ruta seleccionada (mapa)
  const [stops, setStops] = useState([]);
  const mapRef = useRef(null);

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
    if (Platform.OS === 'web') {
      setLoading(false);
      return;
    }
    inicializar();
    return () => {
      // Cleanup: desconectar WS al salir de la pantalla
      // El GPS de fondo NO se detiene aqui — sigue corriendo hasta terminar ruta
      ConductorWebSocket.disconnect();
      _stopSimulator();
    };
  }, []);

  const inicializar = async () => {
    if (Platform.OS === 'web') return;
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
      const r = await api.rutas.list();
      const dataRutas = (r && r.ok !== false && r.data) ? r.data : (Array.isArray(r) ? r : []);
      if (Array.isArray(dataRutas)) {
        setRutas(dataRutas);
        if (dataRutas.length > 0) {
          setSelectedRutaId(dataRutas[0].id.toString());
          const nombre = dataRutas[0].recorrido_nombre
            ? `${dataRutas[0].nombre} (${dataRutas[0].recorrido_nombre})`
            : dataRutas[0].nombre;
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
      const r = await api.sesiones.getActivaParaUsuario(); // Devuelve las sesiones activas del usuario

      let sessionData = null;
      if (r && r.ok !== false) {
        const payload = r.data || r;
        if (Array.isArray(payload) && payload.length > 0) sessionData = payload[0];
        else if (payload.id) sessionData = payload;
      }

      if (sessionData) {
        const sId = sessionData.id.toString();
        setSessionId(sId);
        setSelectedRutaId(sessionData.ruta_id?.toString());
        setIsRouteActive(true);
        await cargarAlumnos(sessionData.recorrido_id, sId);
        conectarWebSocket(sId);
        await cargarParadas(sessionData.ruta_id);
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
      let r;
      if (recorridoId) {
        r = await api.alumnos.listByRecorrido(recorridoId);
      } else {
        r = await api.alumnos.list();
      }
      const dataAlumnos = (r && r.ok !== false && r.data) ? r.data : (Array.isArray(r) ? r : []);

      if (Array.isArray(dataAlumnos)) {
        let lista = dataAlumnos.map(a => ({
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
            const ar = await api.asistencias.listBySesion(sId);
            const dataAsist = (ar && ar.ok !== false && ar.data) ? ar.data : (Array.isArray(ar) ? ar : []);
            if (Array.isArray(dataAsist)) {
              const mapa = {};
              dataAsist.forEach(a => { mapa[a.alumno_id.toString()] = a; });
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

  // ─── Carga de paradas de la ruta (mapa) ───────────────────────────────────────

  const cargarParadas = async (rutaId) => {
    if (!rutaId) {
      setStops([]);
      return;
    }
    try {
      const r = await api.paradas.list({ rutaId: parseInt(rutaId, 10) });
      const data = (r && r.ok !== false && r.data) ? r.data : (Array.isArray(r) ? r : []);
      setStops(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Conductor] Error cargando paradas:', err.message);
      setStops([]);
    }
  };

  // Centrar el mapa en la primera parada cuando cargan las paradas (sin bus activo aun)
  useEffect(() => {
    if (mapRef.current && stops.length > 0 && !lastCoords) {
      mapRef.current.animateToRegion(
        {
          latitude: parseFloat(stops[0].latitud),
          longitude: parseFloat(stops[0].longitud),
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  }, [stops]);

  // ─── Gestion del WebSocket ────────────────────────────────────────────────────

  /**
   * Conecta el WebSocket del conductor.
   * Usa ConductorWebSocket de services/websocket.js del Desarrollador 4.
   * El backend recibe el payload GPS y lo broadcast a los padres en /ws/gps/{sesion_id}.
   */
  const conectarWebSocket = useCallback((sId) => {
    ConductorWebSocket.connect(sId, token, {
      onOpen: () => { setIsWsConnected(true); setError(null); },
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
    const result = await startBackgroundLocation((pos) => setLastCoords(pos));
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
      // Usar capa de servicios api.js
      const result = await api.sesiones.create(parseInt(selectedRutaId, 10));
      if (result && result.ok !== false) {
        const dataResult = result.id ? result : (result.data || result); // Handle wrapper if any
        const sId = dataResult.id.toString();
        setSessionId(sId);
        setIsRouteActive(true);
        Vibration.vibrate(200); // Retroalimentacion haptica al iniciar
        await cargarAlumnos(dataResult.recorrido_id, sId);
        conectarWebSocket(sId);
        await cargarParadas(selectedRutaId);
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
      await api.sesiones.terminar(sessionId);
      Vibration.vibrate([100, 100, 100]); // Triple vibration = exito
      // Detener todos los servicios
      ConductorWebSocket.disconnect();
      await detenerGps();
      _stopSimulator();
      // Resetear estado de la pantalla
      setIsRouteActive(false);
      setSessionId(null);
      setAlumnos([]);
      setStops([]);
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
      const r = await api.asistencias.marcarSubida(sessionId, alumnoId);
      if (r && r.ok !== false) {
        Vibration.vibrate(100);
        setAlumnos(prev => prev.map(a =>
          a.id === alumnoId
            ? { ...a, estado: 'en_bus', horaSubida: new Date().toISOString() }
            : a
        ));
      } else {
        throw new Error(r?.mensaje || 'Error del servidor');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo registrar la subida.');
    }
  };

  const handleMarcarBajada = async (alumnoId) => {
    if (!isRouteActive || !sessionId) return;
    try {
      const r = await api.asistencias.marcarBajada(sessionId, alumnoId);
      if (r && r.ok !== false) {
        Vibration.vibrate(100);
        setAlumnos(prev => prev.map(a =>
          a.id === alumnoId
            ? { ...a, estado: 'finalizado', horaBajada: new Date().toISOString() }
            : a
        ));
      } else {
        throw new Error(r?.mensaje || 'Error del servidor');
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

  // ─── Mapa: centrar en bus / primera parada ───────────────────────────────────

  const handleCentrarMapa = () => {
    if (!mapRef.current) return;
    const primera = stops[0];
    const target = lastCoords
      ? { ...lastCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : (primera
          ? { latitude: parseFloat(primera.latitud), longitude: parseFloat(primera.longitud), latitudeDelta: 0.01, longitudeDelta: 0.01 }
          : null);
    if (target) mapRef.current.animateToRegion(target, 500);
  };

  // ─── Pantalla de carga ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bgDark} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Cargando panel del conductor...</Text>
      </SafeAreaView>
    );
  }

  // ─── Render Principal ─────────────────────────────────────────────────────────

  if (Platform.OS === 'web') {
    return (
      <View style={s.webContainer}>
        <Ionicons name="bus-outline" size={48} color="#185FA5" style={{ marginBottom: 12 }} />
        <Text style={s.webTitle}>Módulo del Conductor</Text>
        <Text style={s.webSubtitle}>
          El panel de conducción y transmisión GPS en tiempo real requiere un dispositivo móvil nativo (Android/iOS) con servicios de geolocalización.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bgDark} />
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Encabezado ── */}
        <View style={s.header}>
          <View style={s.headerIconContainer}>
            <Ionicons name="bus" size={20} color="#185FA5" />
          </View>
          <View>
            <Text style={s.headerTitle}>Panel del Conductor</Text>
            {usuario && (
              <Text style={s.headerSubtitle}>{usuario.nombre} {usuario.apellido}</Text>
            )}
          </View>
        </View>

        {/* ── Mapa del recorrido ── */}
        <View style={s.mapWrapper}>
          <MapView
            ref={mapRef}
            style={s.map}
            initialRegion={
              stops[0]
                ? {
                    latitude: parseFloat(stops[0].latitud),
                    longitude: parseFloat(stops[0].longitud),
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
                : { latitude: -0.180653, longitude: -78.467834, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            }
            showsUserLocation={false}
          >
            {stops.map((p) => (
              <Marker
                key={p.id?.toString()}
                coordinate={{
                  latitude: parseFloat(p.latitud),
                  longitude: parseFloat(p.longitud),
                }}
                pinColor="#10b981"
                title={p.nombre}
              />
            ))}
            {lastCoords && (
              <Marker
                coordinate={{ latitude: lastCoords.lat, longitude: lastCoords.lng }}
                pinColor="#6366f1"
                title="Bus escolar (tu posición)"
              />
            )}
          </MapView>
          <TouchableOpacity style={s.mapCenterBtn} onPress={handleCentrarMapa}>
            <Ionicons name="locate-outline" size={18} color="#ffffff" />
            <Text style={s.mapCenterBtnText}>Centrar en bus</Text>
          </TouchableOpacity>
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
                    {isWsConnected ? 'WebSocket OK' : 'Reconectando...'}
                  </Text>
                </View>
                <View style={[s.statusBadge, { borderColor: isGpsActive ? C.success + '44' : C.danger + '44' }]}>
                  <Text style={[s.statusText, { color: isGpsActive ? C.success : C.danger }]}>
                    {isGpsActive ? 'GPS Activo' : 'GPS Inactivo'}
                  </Text>
                </View>
              </View>

              {/* Coordenadas GPS en tiempo real */}
              {lastCoords && (
                <View style={s.coordsBox}>
                  <Text style={s.coordsText}>
                    {`Posición: ${lastCoords.lat.toFixed(6)}, ${lastCoords.lng.toFixed(6)}`}
                  </Text>
                  {simMode && (
                    <Text style={s.simLabel}>MODO SIMULACION ACTIVO</Text>
                  )}
                </View>
              )}

              {/* Boton simulador de viaje */}
              <TouchableOpacity
                style={[s.simBtn, simMode && s.simBtnActive]}
                onPress={handleToggleSimulator}
              >
                <Text style={s.simBtnText}>
                  {simMode ? 'Detener Simulador' : 'Simulador de Viaje (Emulador)'}
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
                  : <Text style={s.mainBtnText}>Terminar Recorrido</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            /* Estado: Sin Ruta Activa */
            <View>
              <View style={s.idleIconContainer}>
                <Ionicons name="bus" size={32} color="#185FA5" />
              </View>
              <Text style={s.idleTitle}>Iniciar Recorrido del Dia</Text>
              <Text style={s.idleSubtitle}>
                Selecciona tu ruta asignada para abrir el canal GPS y notificar a los padres de familia.
              </Text>

              {error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
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
                            cargarParadas(ruta.id);
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
                  : <Text style={s.mainBtnText}>Comenzar Ruta</Text>
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
  safeArea: { flex: 1, backgroundColor: C.bgDark },
  loadingContainer: { flex: 1, backgroundColor: C.bgDark, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: C.textSecondary, fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Mapa del recorrido
  mapWrapper: { position: 'relative', marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  map: { height: 280, borderRadius: 16 },
  mapCenterBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
  },
  mapCenterBtnText: { color: C.white, fontWeight: '600', fontSize: 13 },

  // Encabezado
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: Platform.OS === 'android' ? 8 : 0 },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },

  // Tarjeta de control
  controlCard: { backgroundColor: C.bgCard, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border, elevation: 6 },

  // Estado activo
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  activePulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.success, shadowColor: C.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  activeTitle: { fontSize: 18, fontWeight: '700', color: C.success },
  rutaNombre: { fontSize: 14, color: C.textSecondary, marginBottom: 14, marginLeft: 22 },

  // Badges de estado
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, backgroundColor: C.bgCardLight },
  statusText: { fontSize: 12, fontWeight: '600' },

  // Coordenadas GPS
  coordsBox: { backgroundColor: C.bgCardLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  coordsText: { fontSize: 12, color: C.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  simLabel: { fontSize: 11, color: C.warning, fontWeight: '700', marginTop: 4 },

  // Simulador
  simBtn: { borderWidth: 1, borderColor: C.textMuted, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 14 },
  simBtnActive: { borderColor: C.warning, backgroundColor: C.warning + '15' },
  simBtnText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },

  // Estado idle (sin ruta)
  idleIconContainer: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  idleTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 8 },
  idleSubtitle: { fontSize: 12, color: C.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 },

  // Mensajes de error/warning
  errorBox: { backgroundColor: C.danger + '20', borderWidth: 1, borderColor: C.danger + '50', borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: '500' },
  warningBox: { backgroundColor: C.warning + '20', borderWidth: 1, borderColor: C.warning + '50', borderRadius: 8, padding: 14, marginBottom: 14 },
  warningText: { color: C.warning, fontSize: 13, lineHeight: 18 },

  // Web Fallback
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  webTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 8,
  },
  webSubtitle: {
    fontSize: 11,
    color: '#888780',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Selector de rutas (chips horizontales)
  rutaSelectorContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: C.textSecondary, marginBottom: 8, fontWeight: '500' },
  rutaChip: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, minWidth: 120, maxWidth: 180, backgroundColor: C.bgCardLight },
  rutaChipSelected: { borderColor: C.primary, backgroundColor: C.primary + '25' },
  rutaChipText: { fontSize: 13, color: C.textSecondary, textAlign: 'center' },
  rutaChipTextSelected: { color: C.primary, fontWeight: '600' },

  // Botones principales
  mainBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, elevation: 4 },
  successBtn: { backgroundColor: C.success },
  dangerBtn: { backgroundColor: C.danger },
  btnDisabled: { opacity: 0.5 },
  mainBtnText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Seccion de alumnos
  alumnosSection: { marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },

  // Tarjeta de alumno
  alumnoCard: { backgroundColor: C.bgCard, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: C.border, elevation: 3 },
  alumnoInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  alumnoAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  alumnoAvatarText: { fontSize: 20, fontWeight: '700' },
  alumnoMeta: { flex: 1, gap: 3 },
  alumnoNombre: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  alumnoTachado: { textDecorationLine: 'line-through', color: C.textMuted },
  alumnoParada: { fontSize: 12, color: C.textSecondary },
  estadoBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  estadoBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  horaText: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  // Botones de asistencia
  alumnoActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  subidaBtn: { backgroundColor: C.success + '30', borderWidth: 1, borderColor: C.success + '60' },
  bajadaBtn: { backgroundColor: C.info + '30', borderWidth: 1, borderColor: C.info + '60' },
  actionBtnDisabled: { opacity: 0.3 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  // Tarjeta vacia
  emptyCard: { backgroundColor: C.bgCard, borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  emptyText: { color: C.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
});
