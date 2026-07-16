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
import { Ionicons } from '@expo/vector-icons';
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
      <View style={styles.centerContainer}>
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
          <Ionicons name="alert-circle-outline" size={20} color="#991b1b" style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {sesiones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={48} color="#a0aec0" style={{ marginBottom: 12 }} />
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
          {sesion.recorrido_nombre || sesion.recorrido?.nombre || 'Sin nombre'}
        </Text>
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#718096" style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>{formatDate(sesion.inicio)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#718096" style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>{duracion}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color="#718096" style={{ marginRight: 6 }} />
            <Text style={styles.detailText}>{sesion.total_presentes || sesion.asistencias_count || 0} alumnos</Text>
          </View>
        </View>
      </View>

      {canDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(sesion)}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
          <Ionicons name="arrow-back-outline" size={20} color="#6366f1" style={{ marginRight: 4 }} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle} numberOfLines={1} ellipsizeMode="tail">
          {sesion.recorrido_nombre || sesion.recorrido?.nombre}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailCard}>
          <Text style={styles.detailCardLabel}>Información de la Sesión</Text>
          <View style={styles.detailRowSpace}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={16} color="#718096" style={{ marginRight: 6 }} />
              <Text style={styles.detailLabel}>Fecha:</Text>
            </View>
            <Text style={styles.detailValue}>{formatDate(sesion.inicio)}</Text>
          </View>
          <View style={styles.detailRowSpace}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={16} color="#718096" style={{ marginRight: 6 }} />
              <Text style={styles.detailLabel}>Duración:</Text>
            </View>
            <Text style={styles.detailValue}>
              {sesion.duracion_minutos 
                ? `${Math.floor(sesion.duracion_minutos / 60)}h ${sesion.duracion_minutos % 60}m`
                : 'En progreso'}
            </Text>
          </View>
        </View>

        <Text style={styles.asistenciasTitle}>Alumnos y Asistencias</Text>

        {asistencias.length === 0 ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="people-outline" size={32} color="#a0aec0" style={{ marginBottom: 8 }} />
            <Text style={styles.noDataText}>No hay alumnos registrados en esta sesión</Text>
          </View>
        ) : (
          asistencias.map((asistencia) => (
            <View key={asistencia.id} style={styles.asistenciaItem}>
              <View style={styles.asistenciaInfo}>
                <View style={styles.asistenciaNameContainer}>
                  <Ionicons name="person-circle-outline" size={24} color="#6366f1" style={{ marginRight: 8 }} />
                  <Text style={styles.asistenciaAlumno}>
                    {asistencia.alumno_nombre || `${asistencia.alumno?.nombre} ${asistencia.alumno?.apellido}`}
                  </Text>
                </View>
                <View style={styles.asistenciaHoras}>
                  {asistencia.hora_subida ? (
                    <View style={styles.timeTag}>
                      <Ionicons name="enter-outline" size={12} color="#4f46e5" style={{ marginRight: 2 }} />
                      <Text style={styles.asistenciaHora}>
                        {formatTime(asistencia.hora_subida)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.timeTag, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="close-circle-outline" size={12} color="#ef4444" style={{ marginRight: 2 }} />
                      <Text style={[styles.asistenciaHora, { color: '#ef4444' }]}>Ausente</Text>
                    </View>
                  )}
                  {asistencia.hora_bajada && (
                    <View style={[styles.timeTag, { backgroundColor: '#ccfbf1' }]}>
                      <Ionicons name="exit-outline" size={12} color="#0d9488" style={{ marginRight: 2 }} />
                      <Text style={[styles.asistenciaHora, { color: '#0d9488' }]}>
                        {formatTime(asistencia.hora_bajada)}
                      </Text>
                    </View>
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

// Helper para formatear la hora (soporta UTC/ISO strings y horas simples)
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a0aec0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 10,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: '#6366f1',
    fontWeight: '700',
    fontSize: 14,
  },
  detailTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a202c',
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  detailCardLabel: {
    fontSize: 11,
    color: '#a0aec0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#4a5568',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a202c',
  },
  asistenciasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 10,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  noDataText: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '500',
  },
  asistenciaItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  asistenciaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  asistenciaNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.5,
  },
  asistenciaAlumno: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  asistenciaHoras: {
    flexDirection: 'row',
    gap: 6,
    flex: 0.5,
    justifyContent: 'flex-end',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  asistenciaHora: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '600',
  },
});
