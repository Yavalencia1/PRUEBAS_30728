import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MapaTrackingScreen() {
  const { usuario } = useAuth();
  const [sesionesActivas, setSesionesActivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSesionesActivas();
  }, []);

  const loadSesionesActivas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Usamos el endpoint adecuado de api.js para obtener sesiones activas
      // pertinentes al usuario actual.
      const result = await api.sesiones.getActivaParaUsuario();
      
      // Si el backend devuelve un solo objeto, lo metemos en un array.
      // Si devuelve un array, lo usamos directamente.
      let sesiones = [];
      if (result && result.ok !== false) {
        const payload = result.data || result;
        if (Array.isArray(payload)) {
          sesiones = payload;
        } else if (payload.id) {
          sesiones = [payload];
        }
      }
      setSesionesActivas(sesiones);

    } catch (err) {
      console.error('Error loading active sessions:', err);
      setError('No se pudieron cargar las rutas activas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSesionesActivas();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Placeholder para mapa */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>Mapa en Tiempo Real</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Se necesita: react-native-maps
        </Text>
        <Text style={styles.mapPlaceholderNote}>
          Instala con: npm install react-native-maps react-native-geolocation-service
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista de rutas activas */}
      {sesionesActivas.length > 0 ? (
        <View style={styles.sesionesContainer}>
          <Text style={styles.sectionTitle}>Rutas Activas</Text>

          <FlatList
            data={sesionesActivas}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={({ item }) => (
              <SesionCard sesion={item} />
            )}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚌</Text>
          <Text style={styles.emptyText}>No hay rutas activas</Text>
          <Text style={styles.emptySubtext}>
            Las rutas aparecerán aquí cuando se activen
          </Text>
        </View>
      )}
    </View>
  );
}

function SesionCard({ sesion }) {
  return (
    <View style={styles.sesionCard}>
      <View style={styles.sesionHeader}>
        <View>
          <Text style={styles.sesionTitle}>{sesion.recorrido?.nombre || `Ruta #${sesion.ruta_id}`}</Text>
          <Text style={styles.sesionSubtitle}>
            👥 {sesion.asistencias_count || 0} asistencias
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>En vivo</Text>
        </View>
      </View>

      <View style={styles.sesionDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>
            Parada actual: {sesion.parada_actual?.nombre || 'Desconocida'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>⏱️</Text>
          <Text style={styles.detailText}>
            Duración: {sesion.duracion_minutos ? `${Math.floor(sesion.duracion_minutos / 60)}h ${sesion.duracion_minutos % 60}m` : 'Iniciando...'}
          </Text>
        </View>
      </View>

      {/* Coordenadas simuladas */}
      {sesion.ubicacion_actual && (
        <View style={styles.coordsContainer}>
          <Text style={styles.coordsLabel}>Ubicación Actual:</Text>
          <Text style={styles.coords}>
            📍 {Number(sesion.ubicacion_actual.latitud || 0).toFixed(4)}, 
            {Number(sesion.ubicacion_actual.longitud || 0).toFixed(4)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapPlaceholder: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  mapPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#0369a1',
    marginBottom: 8,
  },
  mapPlaceholderNote: {
    fontSize: 10,
    color: '#0369a1',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#7dd3fc',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  sesionesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  sesionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  sesionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sesionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  sesionSubtitle: {
    fontSize: 12,
    color: '#718096',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
  },
  sesionDetails: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#4a5568',
    flex: 1,
  },
  coordsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  coordsLabel: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 4,
  },
  coords: {
    fontSize: 11,
    color: '#1a202c',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
});
