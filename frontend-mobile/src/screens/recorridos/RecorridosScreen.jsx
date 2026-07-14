import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function RecorridosScreen() {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  // ADMIN puede eliminar; DUEÑO y ADMIN pueden crear
  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';

  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal de creación
  const [modalVisible, setModalVisible] = useState(false);
  const [newRecorrido, setNewRecorrido] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRecorridos();
  }, []);

  const loadRecorridos = async () => {
    try {
      setLoading(true);
      setError(null);
      // El backend ya filtra según el usuario autenticado (JWT).
      // Un DUEÑO solo recibe sus propios recorridos; ADMIN recibe todos.
      // No aplicamos filtro adicional en el frontend.
      const result = await api.recorridos.list();
      if (result.ok && Array.isArray(result.data)) {
        setRecorridos(result.data);
      } else if (result.ok && result.data) {
        // Por si el backend devuelve directamente el array (sin .data)
        setRecorridos(Array.isArray(result.data) ? result.data : []);
      } else {
        setRecorridos([]);
        if (!result.ok) setError(result.mensaje || 'No se pudieron cargar los recorridos');
      }
    } catch (err) {
      console.error('[RecorridosScreen] Error:', err);
      setError('No se pudieron cargar los recorridos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecorridos();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newRecorrido.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      // api.recorridos.create(nombre, descripcion, activo, duenoId)
      // Si es dueño, se envía su ID; si es admin, duenoId queda null (el backend lo asigna)
      const duenoId = rol === 'dueno' ? usuario.id : null;
      const result = await api.recorridos.create(
        newRecorrido.nombre.trim(),
        newRecorrido.descripcion.trim(),
        newRecorrido.activo,
        duenoId
      );

      if (result.ok) {
        setModalVisible(false);
        setNewRecorrido({ nombre: '', descripcion: '', activo: true });
        loadRecorridos();
        Alert.alert('✅ Éxito', 'Recorrido creado correctamente');
      } else {
        Alert.alert('Error', result.mensaje || 'No se pudo crear el recorrido');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo crear el recorrido');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recorrido) => {
    Alert.alert(
      'Eliminar Recorrido',
      `¿Estás seguro de eliminar "${recorrido.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.recorridos.delete(recorrido.id);
              if (result.ok) {
                loadRecorridos();
                Alert.alert('✅', 'Recorrido eliminado');
              } else {
                Alert.alert('Error', result.mensaje || 'No se pudo eliminar el recorrido');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el recorrido');
            }
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewRecorrido({ nombre: '', descripcion: '', activo: true });
  };

  if (loading && !recorridos.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Botón crear — solo para admin y dueño */}
      {canCreate && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ Nuevo Recorrido</Text>
        </TouchableOpacity>
      )}

      {recorridos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚌</Text>
          <Text style={styles.emptyText}>No hay recorridos</Text>
        </View>
      ) : (
        <FlatList
          data={recorridos}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <RecorridoCard
              recorrido={item}
              canDelete={canDelete}
              onDelete={handleDelete}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal de creación */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Recorrido</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre *"
              placeholderTextColor="#a0aec0"
              value={newRecorrido.nombre}
              onChangeText={(text) => setNewRecorrido({ ...newRecorrido, nombre: text })}
              editable={!saving}
            />

            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#a0aec0"
              value={newRecorrido.descripcion}
              onChangeText={(text) => setNewRecorrido({ ...newRecorrido, descripcion: text })}
              multiline
              editable={!saving}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Activo</Text>
              <Switch
                value={newRecorrido.activo}
                onValueChange={(value) => setNewRecorrido({ ...newRecorrido, activo: value })}
                disabled={saving}
                trackColor={{ true: '#6366f1' }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.buttonCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonCreate, saving && styles.buttonDisabled]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#ffffff" size="small" />
                  : <Text style={styles.buttonText}>Crear</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RecorridoCard({ recorrido, canDelete, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{recorrido.nombre}</Text>
          {recorrido.activo && (
            <View style={styles.activoBadge}>
              <Text style={styles.activoBadgeText}>Activo</Text>
            </View>
          )}
        </View>
        {recorrido.descripcion ? (
          <Text style={styles.cardDescription}>{recorrido.descripcion}</Text>
        ) : null}
        {recorrido.rutas_count > 0 && (
          <Text style={styles.cardSubtitle}>🛣️ {recorrido.rutas_count} rutas</Text>
        )}
      </View>

      {/* Botón eliminar — solo visible para ADMIN */}
      {canDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(recorrido)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
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
  createButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    flex: 1,
  },
  activoBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activoBadgeText: {
    fontSize: 10,
    color: '#15803d',
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6366f1',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a202c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    color: '#1a202c',
    backgroundColor: '#f7fafc',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f3f4f6',
  },
  buttonCancelText: {
    fontWeight: '600',
    color: '#4a5568',
  },
  buttonCreate: {
    backgroundColor: '#6366f1',
  },
  buttonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  buttonText: {
    fontWeight: '600',
    color: '#ffffff',
  },
});
