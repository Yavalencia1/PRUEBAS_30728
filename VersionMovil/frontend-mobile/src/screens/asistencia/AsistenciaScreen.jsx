import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AsistenciaScreen() {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  // Solo el ADMIN puede eliminar sesiones pasadas (historial)
  const canDelete = rol === 'admin';

  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [asistencias, setAsistencias] = useState([]);

  useEffect(() => {
    loadSesiones();
  }, []);

  const loadSesiones = async () => {
    try {
      setLoading(true);
      setError(null);
      // El backend devuelve el historial correspondiente al usuario (JWT)
      const result = await api.sesiones.historial();
      const payload = result?.ok !== false ? (result?.data || result || []) : [];
      setSesiones(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('No se pudieron cargar las sesiones');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSesiones();
    setRefreshing(false);
  };

  const handleSesionPress = async (sesion) => {
    setSelectedSesion(sesion);
    try {
      const data = await api.asistencias.listBySesion(sesion.id);
      const payload = data?.ok !== false ? (data?.data || data || []) : [];
      setAsistencias(Array.isArray(payload) ? payload : []);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar las asistencias');
    }
  };

  const handleDeleteSesion = (sesion) => {
    if (!canDelete) return;

    Alert.alert(
      'Eliminar Sesión',
      '¿Estás seguro que deseas eliminar esta sesión?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.sesiones.delete(sesion.id);
              if (result && result.ok === false) {
                Alert.alert('Error', result.mensaje || 'No se pudo eliminar la sesión');
                return;
              }
              loadSesiones();
              Alert.alert('✅', 'Sesión eliminada');
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la sesión');
            }
          },
        },
      ]
    );
  };

  if (loading && !sesiones.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (selectedSesion) {
    return (
      <SesionDetailView
        sesion={selectedSesion}
        asistencias={asistencias}
        onBack={() => setSelectedSesion(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sesiones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No hay sesiones</Text>
        </View>
      ) : (
        <FlatList
          data={sesiones}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <SesionCard
              sesion={item}
              canDelete={canDelete}
              onPress={handleSesionPress}
              onDelete={handleDeleteSesion}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function SesionCard({ sesion, canDelete, onPress, onDelete }) {
  const duracion = sesion.duracion_minutos
    ? `${Math.floor(sesion.duracion_minutos / 60)}h ${sesion.duracion_minutos % 60}m`
    : 'En progreso';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(sesion)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          {sesion.recorrido?.nombre || 'Sin nombre'}
        </Text>
        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>
            📅 {formatDate(sesion.fecha_inicio)}
          </Text>
          <Text style={styles.detailText}>
            ⏱️ {duracion}
          </Text>
          <Text style={styles.detailText}>
            ✅ {sesion.asistencias_count || 0} alumnos
          </Text>
        </View>
      </View>

      {canDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(sesion)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function SesionDetailView({ sesion, asistencias, onBack }) {
  return (
    <View style={styles.container}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle}>{sesion.recorrido?.nombre}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailCard}>
          <Text style={styles.detailCardLabel}>Información de la Sesión</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha:</Text>
            <Text style={styles.detailValue}>{formatDate(sesion.fecha_inicio)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duración:</Text>
            <Text style={styles.detailValue}>
              {Math.floor(sesion.duracion_minutos / 60)}h {sesion.duracion_minutos % 60}m
            </Text>
          </View>
        </View>

        <Text style={styles.asistenciasTitle}>Asistencias</Text>

        {asistencias.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No hay registros de asistencia</Text>
          </View>
        ) : (
          asistencias.map((asistencia) => (
            <View key={asistencia.id} style={styles.asistenciaItem}>
              <View style={styles.asistenciaInfo}>
                <Text style={styles.asistenciaAlumno}>
                  {asistencia.alumno?.nombre} {asistencia.alumno?.apellido}
                </Text>
                <View style={styles.asistenciaHoras}>
                  <Text style={styles.asistenciaHora}>
                    ↓ {formatTime(asistencia.hora_subida)}
                  </Text>
                  {asistencia.hora_bajada && (
                    <Text style={styles.asistenciaHora}>
                      ↑ {formatTime(asistencia.hora_bajada)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(timeString) {
  if (!timeString) return '--:--';
  const date = new Date(timeString);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  cardDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#718096',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 18,
  },
  detailHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 12,
  },
  backButtonText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
  detailTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailCardLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#718096',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  asistenciasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noDataText: {
    color: '#718096',
    fontSize: 14,
  },
  asistenciaItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  asistenciaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  asistenciaAlumno: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  asistenciaHoras: {
    flexDirection: 'row',
    gap: 8,
  },
  asistenciaHora: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
});
