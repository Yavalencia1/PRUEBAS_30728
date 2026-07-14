import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// Centro por defecto (Quito), coherente con los otros frontends.
const QUITO = { latitude: -0.180653, longitude: -78.467834, latitudeDelta: 0.02, longitudeDelta: 0.02 };

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
    if (showSelector) {
      cargarRecorridos();
    } else {
      verificarSesionActiva(null);
    }
    return () => closeWs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Buscando recorridos activos…</Text>
      </View>
    );
  }

  if (!showMap) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="map-outline" size={40} color="#a0aec0" />
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
                  style={[styles.chip, active && styles.chipSelected]}
                  onPress={() => onSelectRecorrido(r.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextSelected]}>{r.nombre}</Text>
                  {Array.isArray(hijos) && hijos.length > 0 && (
                    <Text
                      style={[styles.chipSubText, active && styles.chipSubTextSelected]}
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

      <View style={styles.mapWrapper}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...busLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        showsUserLocation={false}
      >
        {hasActiveSession && (
          <Marker coordinate={busLocation} pinColor="#6366f1" title="Bus escolar" />
        )}
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
      </MapView>
      </View>

      {/* Panel flotante inferior */}
      <View style={styles.panel}>
        {hasActiveSession ? (
          <>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Rastreo GPS en Tiempo Real</Text>
              <View style={styles.statusBadge}>
                {isWsConnected ? (
                  <>
                    <Ionicons name="wifi-outline" size={14} color="#10b981" />
                    <Text style={[styles.statusText, { color: '#10b981' }]}>Conexión en vivo</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="wifi-outline" size={14} color="#ef4444" />
                    <Text style={[styles.statusText, { color: '#ef4444' }]}>Desconectado</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={styles.eta}>Autobús en ruta</Text>
            <Text style={styles.lastSignal}>
              Última señal recibida: {lastUpdate ? lastUpdate.toLocaleTimeString('es-ES') : 'Esperando primer reporte…'}
            </Text>
            <TouchableOpacity style={styles.centerButton} onPress={handleCentrar}>
              <Ionicons name="locate-outline" size={16} color="#ffffff" />
              <Text style={styles.centerButtonText}>Centrar en bus</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.panelRow}>
              <Text style={styles.panelLabel}>Sin sesión activa</Text>
              <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
            </View>
            <Text style={styles.eta}>
              Recorrido: {selectedRecorrido?.nombre || '—'}
              {rol === 'padre' && selectedRecorrido && (childrenByRecorrido[selectedRecorrido.id] || []).length > 0
                ? ` — ${(childrenByRecorrido[selectedRecorrido.id] || []).join(', ')}`
                : ''}
            </Text>
            <Text style={styles.lastSignal}>
              Mostrando paradas del recorrido. El bus aparecerá cuando el conductor inicie la ruta.
            </Text>
            <TouchableOpacity style={styles.centerButton} onPress={() => verificarSesionActiva(selectedRecorridoId)}>
              <Ionicons name="refresh-outline" size={16} color="#ffffff" />
              <Text style={styles.centerButtonText}>Verificar Estado</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', gap: 12 },
  loadingText: { color: '#718096', fontSize: 16 },
  map: { flex: 1 },

  selectorBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    flexShrink: 0,
  },
  selectorScroll: { paddingHorizontal: 12, gap: 8 },
  mapWrapper: { flex: 1 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  chipTextSelected: { color: '#ffffff' },
  chipSubText: { color: '#6b7280', fontSize: 11, marginTop: 2, maxWidth: 160 },
  chipSubTextSelected: { color: '#e0e7ff' },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f8f9fa',
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a202c', textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  verifyButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  panelLabel: { fontSize: 13, color: '#718096', fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  eta: { fontSize: 18, fontWeight: '800', color: '#6366f1', marginBottom: 4 },
  lastSignal: { fontSize: 12, color: '#718096', marginBottom: 10 },
  centerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 8,
  },
  centerButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
