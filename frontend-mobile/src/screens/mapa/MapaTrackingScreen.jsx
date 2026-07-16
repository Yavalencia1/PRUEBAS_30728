import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// Centro por defecto (Quito), coherente con los otros frontends.
const QUITO = { latitude: -0.180653, longitude: -78.467834, latitudeDelta: 0.02, longitudeDelta: 0.02 };

// Importar react-native-maps de forma condicional para evitar crashes en la web
let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('No se pudo cargar react-native-maps de forma nativa:', e);
  }
}

export default function MapaTrackingScreen() {
  const { token, usuario } = useAuth();
  const rol = (usuario?.rol || '').toLowerCase();
  const showSelector = ['admin', 'dueno', 'padre'].includes(rol);

  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [busLocation, setBusLocation] = useState(QUITO);
  const [stops, setStops] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [recorridos, setRecorridos] = useState([]);
  const [childrenByRecorrido, setChildrenByRecorrido] = useState({});
  const [selectedRecorridoId, setSelectedRecorridoId] = useState(null);

  const wsRef = useRef(null);
  const mapRef = useRef(null);

  const closeWs = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }
    setIsWsConnected(false);
  };

  const cargarParadas = async (sId) => {
    try {
      const res = await api.paradas.listForSession(sId);
      const data = (res && res.ok !== false && res.data) ? res.data : (Array.isArray(res) ? res : []);
      setStops(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[MapaTracking] Error paradas:', err);
      setStops([]);
    }
  };

  const conectarWS = async (sId) => {
    try {
      const url = await api.websockets.getGpsUrl(sId);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setIsWsConnected(true);
      ws.onclose = () => setIsWsConnected(false);
      ws.onerror = () => setIsWsConnected(false);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const lat = data.lat ?? data.latitude;
          const lng = data.lng ?? data.longitude;
          if (lat != null && lng != null) {
            setBusLocation({ latitude: Number(lat), longitude: Number(lng) });
            setLastUpdate(new Date());
          }
        } catch (e) {
          console.error('[MapaTracking] Error parse WS:', e);
        }
      };
    } catch (err) {
      console.error('[MapaTracking] Error WS:', err);
      setIsWsConnected(false);
    }
  };

  const verificarSesionActiva = async (recorridoId = null) => {
    setLoading(true);
    closeWs();
    try {
      const r = await api.sesiones.getActivaParaUsuario(recorridoId);
      let sessionData = null;
      if (r && r.ok !== false) {
        const payload = r.data || r;
        if (Array.isArray(payload) && payload.length > 0) sessionData = payload[0];
        else if (payload && payload.id) sessionData = payload;
      }

      if (sessionData) {
        const sId = sessionData.id.toString();
        setSessionId(sId);
        setHasActiveSession(true);
        await cargarParadas(sId);
        if (sessionData.ubicacion_actual && sessionData.ubicacion_actual.latitud != null) {
          setBusLocation({
            latitude: Number(sessionData.ubicacion_actual.latitud),
            longitude: Number(sessionData.ubicacion_actual.longitud),
          });
        } else {
          setBusLocation(QUITO);
        }
        conectarWS(sId);
      } else {
        setHasActiveSession(false);
        setSessionId(null);
        if (showSelector && recorridoId != null) {
          // Vista de recorrido sin sesión activa: mostrar sus paradas.
          try {
            const res = await api.paradas.list({ recorridoId });
            const data = (res && res.ok !== false && res.data) ? res.data : (Array.isArray(res) ? res : []);
            setStops(Array.isArray(data) ? data : []);
          } catch (err) {
            console.error('[MapaTracking] Error paradas recorrido:', err);
            setStops([]);
          }
        } else {
          setStops([]);
        }
      }
    } catch (err) {
      console.error('[MapaTracking] Error:', err);
      setHasActiveSession(false);
      setStops([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarRecorridos = async () => {
    try {
      const r = rol === 'padre'
        ? await api.recorridos.list({ padreId: usuario.id })
        : await api.recorridos.list();
      const data = (r && Array.isArray(r.data)) ? r.data : (Array.isArray(r) ? r : []);
      const arr = Array.isArray(data) ? data : [];

      if (rol === 'padre') {
        try {
          const a = await api.alumnos.list();
          const al = (a && Array.isArray(a.data)) ? a.data : (Array.isArray(a) ? a : []);
          const map = {};
          al.forEach((alumno) => {
            if (alumno.recorrido_id != null) {
              const nombre = [alumno.nombre, alumno.apellido].filter(Boolean).join(' ').trim();
              if (nombre) {
                if (!map[alumno.recorrido_id]) map[alumno.recorrido_id] = [];
                map[alumno.recorrido_id].push(nombre);
              }
            }
          });
          setChildrenByRecorrido(map);
        } catch (err) {
          console.error('[MapaTracking] Error alumnos:', err);
        }
      }

      setRecorridos(arr);
      if (arr.length > 0) {
        const first = arr[0];
        setSelectedRecorridoId(first.id);
        await verificarSesionActiva(first.id);
        return;
      }
    } catch (err) {
      console.error('[MapaTracking] Error recorridos:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!usuario) return;
    if (showSelector) {
      cargarRecorridos();
    } else {
      verificarSesionActiva(null);
    }
    return () => closeWs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, showSelector]);

  const onSelectRecorrido = (id) => {
    if (id === selectedRecorridoId) return;
    setSelectedRecorridoId(id);
    verificarSesionActiva(id);
  };

  const handleCentrar = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { ...busLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      );
    }
  };

  const selectedRecorrido = recorridos.find((r) => r.id === selectedRecorridoId);
  const showMap = hasActiveSession || stops.length > 0;

  // ─── Renderizado Web Fallback ──────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallbackContainer}>
        <View style={styles.webFallbackCard}>
          <View style={styles.webFallbackIconBox}>
            <Ionicons name="map-outline" size={32} color="#185FA5" />
          </View>
          <Text style={styles.webFallbackTitle}>El mapa no está disponible en la web</Text>
          <Text style={styles.webFallbackSubtext}>
            Para visualizar el rastreo GPS en tiempo real de los autobuses, por favor abre la aplicación en un dispositivo móvil Android o iOS (emulador o dispositivo físico con Expo Go).
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Buscando recorridos activos…</Text>
      </View>
    );
  }

  if (!showMap) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="map-outline" size={40} color="#B4B2A9" />
        </View>
        <Text style={styles.emptyTitle}>El recorrido aún no ha iniciado</Text>
        <Text style={styles.emptySubtext}>
          Te notificaremos en cuanto el conductor inicie el autobús escolar.
        </Text>
        <TouchableOpacity style={styles.verifyButton} onPress={() => verificarSesionActiva(showSelector ? selectedRecorridoId : null)}>
          <Ionicons name="refresh-outline" size={16} color="#ffffff" />
          <Text style={styles.verifyButtonText}>Verificar Estado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showSelector && (
        <View style={styles.selectorBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {recorridos.map((r) => {
              const active = r.id === selectedRecorridoId;
              const hijos = childrenByRecorrido[r.id];
              return (
                <TouchableOpacity
                  key={r.id.toString()}
                  style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  onPress={() => onSelectRecorrido(r.id)}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{r.nombre}</Text>
                  {Array.isArray(hijos) && hijos.length > 0 && (
                    <Text
                      style={[styles.chipSubText, active ? styles.chipSubTextActive : styles.chipSubTextInactive]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {hijos.join(', ')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {MapView && (
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{ ...busLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
            showsUserLocation={false}
          >
            {hasActiveSession && Marker && (
              <Marker coordinate={busLocation} pinColor="#185FA5" title="Bus escolar" />
            )}
            {stops.map((p) => {
              if (!Marker) return null;
              return (
                <Marker
                  key={p.id?.toString()}
                  coordinate={{
                    latitude: parseFloat(p.latitud),
                    longitude: parseFloat(p.longitud),
                  }}
                  pinColor="#10b981"
                  title={p.nombre}
                />
              );
            })}
          </MapView>
        </View>
      )}

      {/* Panel flotante inferior personalizado */}
      <View style={styles.panel}>
        {hasActiveSession ? (
          <View style={styles.activePanelCol}>
            <View style={styles.activePanelHeader}>
              <View style={styles.busIconContainer}>
                <Ionicons name="bus" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activePanelTitle}>Recorrido en curso</Text>
                <Text style={styles.activePanelEta}>Llega en ~8 min</Text>
              </View>
              <TouchableOpacity style={styles.centerLocationButton} onPress={handleCentrar}>
                <Ionicons name="locate-outline" size={16} color="#185FA5" />
              </TouchableOpacity>
            </View>
            {/* Barra de progreso */}
            <View style={styles.progressBarBg}>
              <View style={styles.progressBarFill} />
            </View>
            <Text style={styles.lastUpdateText}>
              Última actualización: {lastUpdate ? lastUpdate.toLocaleTimeString('es-ES') : 'En vivo'}
            </Text>
          </View>
        ) : (
          <View style={styles.inactivePanelRow}>
            <Ionicons name="bus-outline" size={20} color="#B4B2A9" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.inactivePanelTitle}>El recorrido aún no ha iniciado</Text>
              <Text style={styles.inactivePanelSubtext}>Recibirás una notificación cuando comience</Text>
            </View>
            <TouchableOpacity style={styles.refreshBadgeButton} onPress={() => verificarSesionActiva(selectedRecorridoId)}>
              <Ionicons name="refresh-outline" size={16} color="#185FA5" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', gap: 12 },
  loadingText: { color: '#888780', fontSize: 13 },
  map: { flex: 1 },
  mapWrapper: { flex: 1 },

  // Web Fallback styles
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  webFallbackCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    shadowColor: '#185FA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  webFallbackIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  webFallbackTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C2A',
    textAlign: 'center',
    marginBottom: 8,
  },
  webFallbackSubtext: {
    fontSize: 11,
    color: '#888780',
    textAlign: 'center',
    lineHeight: 16,
  },

  selectorBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderColor: '#E6F1FB',
    paddingVertical: 10,
    flexShrink: 0,
  },
  selectorScroll: { paddingHorizontal: 12, gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: '#185FA5', borderColor: '#185FA5' },
  chipInactive: { backgroundColor: '#ffffff', borderColor: '#B5D4F4' },
  chipText: { fontSize: 11 },
  chipTextActive: { color: '#ffffff', fontWeight: '500' },
  chipTextInactive: { color: '#185FA5' },
  chipSubText: { fontSize: 9, marginTop: 1, maxWidth: 150 },
  chipSubTextActive: { color: '#E6F1FB' },
  chipSubTextInactive: { color: '#888780' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: '#2C2C2A', textAlign: 'center', marginBottom: 4 },
  emptySubtext: { fontSize: 11, color: '#888780', textAlign: 'center', lineHeight: 16, maxWidth: 280 },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#185FA5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  verifyButtonText: { color: '#ffffff', fontWeight: '500', fontSize: 12 },

  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 12,
    shadowColor: '#185FA5',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  inactivePanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inactivePanelTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2C2C2A',
    marginBottom: 2,
  },
  inactivePanelSubtext: {
    fontSize: 10,
    color: '#888780',
  },
  refreshBadgeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePanelCol: {
    gap: 8,
  },
  activePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#185FA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePanelTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#185FA5',
    marginBottom: 2,
  },
  activePanelEta: {
    fontSize: 20,
    fontWeight: '500',
    color: '#1D9E75',
  },
  centerLocationButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#E6F1FB',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    width: '40%',
    height: '100%',
    backgroundColor: '#185FA5',
  },
  lastUpdateText: {
    fontSize: 9,
    color: '#888780',
  },
});
