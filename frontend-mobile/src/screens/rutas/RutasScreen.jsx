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
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

// Selector simple sin dependencia de @react-native-picker/picker
function SimpleSelector({ label, options, selectedValue, onValueChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === selectedValue);
  return (
    <View style={selectorStyles.container}>
      <Text style={selectorStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[selectorStyles.trigger, disabled && selectorStyles.disabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={selectorStyles.triggerText}>
          {selected ? selected.label : 'Seleccionar…'}
        </Text>
        <Text style={selectorStyles.arrow}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={selectorStyles.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={selectorStyles.sheet}>
            <Text style={selectorStyles.sheetTitle}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[selectorStyles.option, opt.value === selectedValue && selectorStyles.optionSelected]}
                onPress={() => { onValueChange(opt.value); setOpen(false); }}
              >
                <Text style={[selectorStyles.optionText, opt.value === selectedValue && selectorStyles.optionTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function RutasScreen({ recorridoId }) {
  const { usuario } = useAuth();
  const navigation = useNavigation();
  const rol = usuario?.rol?.toLowerCase();

  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';
  const canEdit = rol === 'admin' || rol === 'dueno';

  const [rutas, setRutas] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [newRuta, setNewRuta] = useState({
    nombre: '',
    descripcion: '',
    recorrido_id: '',
    tipo: 'ida',
  });
  const [saving, setSaving] = useState(false);

  // Filtro manual (solo cuando no está acotado por drill-down)
  const [filterRecorridoId, setFilterRecorridoId] = useState('');

  // Modal de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRuta, setEditRuta] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', tipo: 'ida' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Al navegar desde otra tab con un recorrido preseleccionado, aplicamos el filtro.
  useEffect(() => {
    if (recorridoId) {
      applyRecorridoFilter(String(recorridoId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorridoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // El backend filtra según JWT; no hay filtro adicional en el frontend.
      // Cargamos siempre todas las rutas y los recorridos (para las opciones del filtro).
      const [rutasResult, recorridosResult] = await Promise.all([
        api.rutas.list(),
        api.recorridos.list(),
      ]);

      setRutas(
        rutasResult.ok && Array.isArray(rutasResult.data) ? rutasResult.data : []
      );
      setRecorridos(
        recorridosResult.ok && Array.isArray(recorridosResult.data) ? recorridosResult.data : []
      );

      if (!rutasResult.ok) {
        setError(rutasResult.mensaje || 'No se pudieron cargar las rutas');
      }
    } catch (err) {
      console.error('[RutasScreen] Error:', err);
      setError('No se pudieron cargar las rutas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newRuta.nombre.trim() || !newRuta.recorrido_id) {
      Alert.alert('Error', 'Nombre y recorrido son requeridos');
      return;
    }

    try {
      setSaving(true);
      // api.rutas.create(recorridoId, nombre, descripcion, tipo)
      const result = await api.rutas.create(
        parseInt(newRuta.recorrido_id),
        newRuta.nombre.trim(),
        newRuta.descripcion.trim(),
        newRuta.tipo
      );

      if (result.ok) {
        closeModal();
        loadData();
        Alert.alert('✅ Éxito', 'Ruta creada correctamente');
      } else {
        Alert.alert('Error', result.mensaje || 'No se pudo crear la ruta');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo crear la ruta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruta) => {
    Alert.alert(
      'Eliminar Ruta',
      `¿Estás seguro de eliminar "${ruta.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.rutas.delete(ruta.id);
              if (result.ok) {
                loadData();
                Alert.alert('✅', 'Ruta eliminada');
              } else {
                Alert.alert('Error', result.mensaje || 'No se pudo eliminar la ruta');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la ruta');
            }
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewRuta({ nombre: '', descripcion: '', recorrido_id: '', tipo: 'ida' });
  };

  const handleEditOpen = (ruta) => {
    setEditRuta(ruta);
    setEditForm({
      nombre: ruta.nombre || '',
      descripcion: ruta.descripcion || '',
      tipo: ruta.tipo || 'ida',
    });
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!editForm.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    try {
      setSavingEdit(true);
      const result = await api.rutas.update(
        editRuta.id,
        editForm.nombre.trim(),
        editForm.descripcion.trim(),
        editForm.tipo
      );
      if (result.ok) {
        setEditModalVisible(false);
        setEditRuta(null);
        loadData();
        Alert.alert('✅ Éxito', 'Ruta actualizada correctamente');
      } else {
        Alert.alert('Error', result.mensaje || 'No se pudo actualizar la ruta');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la ruta');
    } finally {
      setSavingEdit(false);
    }
  };

  // Opciones para el selector de recorridos
  const recorridoOptions = recorridos.map(r => ({
    value: r.id?.toString(),
    label: r.nombre,
  }));

  const tipoOptions = [
    { value: 'ida', label: '↓ Ida' },
    { value: 'vuelta', label: '↑ Vuelta' },
  ];

  const recorridoFilterOptions = [
    { value: '', label: 'Todos los recorridos' },
    ...recorridoOptions,
  ];

  const applyRecorridoFilter = async (value) => {
    setFilterRecorridoId(value);
    try {
      setLoading(true);
      const result = await api.rutas.list(value || null);
      setRutas(result.ok && Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error('[RutasScreen] Error filtro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !rutas.length) {
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

      {canCreate && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            if (!recorridoId && recorridos.length === 0) {
              Alert.alert('Sin recorridos', 'Debes tener al menos un recorrido para crear rutas.');
              return;
            }
            // Pre-seleccionar el recorrido (el filtro activo si aplica)
            if (!newRuta.recorrido_id) {
              const preselect = (filterRecorridoId || recorridos[0]?.id)?.toString();
              setNewRuta(prev => ({ ...prev, recorrido_id: preselect }));
            }
            setModalVisible(true);
          }}
        >
          <Text style={styles.createButtonText}>+ Nueva Ruta</Text>
        </TouchableOpacity>
      )}

      <View style={styles.filterContainer}>
        <SimpleSelector
          label="Filtrar por recorrido"
          options={recorridoFilterOptions}
          selectedValue={filterRecorridoId}
          onValueChange={applyRecorridoFilter}
        />
      </View>

      {rutas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛣️</Text>
          <Text style={styles.emptyText}>No hay rutas</Text>
        </View>
      ) : (
        <FlatList
          data={rutas}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ParadasTab', {
                  rutaId: item.id,
                  recorridoId: item.recorrido_id ?? item.recorrido?.id,
                })
              }
            >
              <RutaCard ruta={item} canEdit={canEdit} onEdit={handleEditOpen} canDelete={canDelete} onDelete={handleDelete} />
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal de creación */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Ruta</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre *"
              placeholderTextColor="#a0aec0"
              value={newRuta.nombre}
              onChangeText={(text) => setNewRuta({ ...newRuta, nombre: text })}
              editable={!saving}
            />

            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#a0aec0"
              value={newRuta.descripcion}
              onChangeText={(text) => setNewRuta({ ...newRuta, descripcion: text })}
              multiline
              editable={!saving}
            />

            <SimpleSelector
              label="Recorrido *"
              options={recorridoOptions}
              selectedValue={newRuta.recorrido_id}
              onValueChange={(val) => setNewRuta({ ...newRuta, recorrido_id: val })}
              disabled={saving}
            />

            <SimpleSelector
              label="Tipo *"
              options={tipoOptions}
              selectedValue={newRuta.tipo}
              onValueChange={(val) => setNewRuta({ ...newRuta, tipo: val })}
              disabled={saving}
            />

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

      {/* Modal de edición */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Ruta</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre *"
              placeholderTextColor="#a0aec0"
              value={editForm.nombre}
              onChangeText={(text) => setEditForm({ ...editForm, nombre: text })}
              editable={!savingEdit}
            />

            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#a0aec0"
              value={editForm.descripcion}
              onChangeText={(text) => setEditForm({ ...editForm, descripcion: text })}
              multiline
              editable={!savingEdit}
            />

            <SimpleSelector
              label="Tipo *"
              options={tipoOptions}
              selectedValue={editForm.tipo}
              onValueChange={(val) => setEditForm({ ...editForm, tipo: val })}
              disabled={savingEdit}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.buttonCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonCreate, savingEdit && styles.buttonDisabled]}
                onPress={handleEditSave}
                disabled={savingEdit}
              >
                {savingEdit
                  ? <ActivityIndicator color="#ffffff" size="small" />
                  : <Text style={styles.buttonText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RutaCard({ ruta, canEdit, onEdit, canDelete, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{ruta.nombre}</Text>
        {ruta.descripcion ? (
          <Text style={styles.cardDescription}>{ruta.descripcion}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          {ruta.tipo && (
            <Text style={styles.cardMetaItem}>
              {ruta.tipo === 'ida' ? '↓' : '↑'} {ruta.tipo.toUpperCase()}
            </Text>
          )}
          {ruta.recorrido?.nombre && (
            <Text style={styles.cardMetaItem}>🚌 {ruta.recorrido.nombre}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        {canEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(ruta)}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(ruta)}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8f9fa' },
  listContent:     { paddingHorizontal: 16, paddingVertical: 12 },
  errorContainer:  { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  errorText:       { color: '#991b1b', fontSize: 14 },
  createButton:    { marginHorizontal: 16, marginTop: 16, backgroundColor: '#6366f1', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  createButtonText:{ color: '#ffffff', fontWeight: '600', fontSize: 16 },
  emptyContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { paddingHorizontal: 16, marginTop: 12 },
  emptyIcon:       { fontSize: 48, marginBottom: 16 },
  emptyText:       { fontSize: 18, fontWeight: '600', color: '#1a202c' },
  card:            { backgroundColor: '#ffffff', borderRadius: 8, padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardContent:     { flex: 1 },
  cardTitle:       { fontSize: 16, fontWeight: '600', color: '#1a202c', marginBottom: 4 },
  cardDescription: { fontSize: 12, color: '#718096', marginBottom: 4 },
  cardMeta:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cardMetaItem:    { fontSize: 11, color: '#6366f1', backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  deleteButton:    { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  deleteIcon:      { fontSize: 18 },
  cardActions:      { flexDirection: 'row', alignItems: 'center' },
  editButton:      { width: 36, height: 36, borderRadius: 6, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  editIcon:        { fontSize: 18 },
  modalContainer:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  modalTitle:      { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a202c' },
  input:           { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14, color: '#1a202c', backgroundColor: '#f7fafc' },
  modalButtons:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  button:          { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonCancel:    { backgroundColor: '#f3f4f6' },
  buttonCancelText:{ fontWeight: '600', color: '#4a5568' },
  buttonCreate:    { backgroundColor: '#6366f1' },
  buttonDisabled:  { backgroundColor: '#a5b4fc' },
  buttonText:      { fontWeight: '600', color: '#ffffff' },
});

const selectorStyles = StyleSheet.create({
  container:       { marginBottom: 12 },
  label:           { fontSize: 12, color: '#718096', marginBottom: 4, fontWeight: '600' },
  trigger:         { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f7fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled:        { opacity: 0.5 },
  triggerText:     { fontSize: 14, color: '#1a202c' },
  arrow:           { fontSize: 12, color: '#718096' },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
  sheetTitle:      { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  option:          { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionSelected:  { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 8 },
  optionText:      { fontSize: 15, color: '#1a202c' },
  optionTextSelected: { color: '#6366f1', fontWeight: '600' },
});
