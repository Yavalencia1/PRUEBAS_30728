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
import { api } from '../../services/api';

// Selector nativo sin dependencias externas
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

export default function ParadasScreen({ rutaId, recorridoId, onRowPress }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';
  const canEdit = rol === 'admin' || rol === 'dueno';

  const [paradas, setParadas] = useState([]);
  const [rutas, setRutas] = useState([]);         // <— Rutas, no recorridos (ruta_id requerido por api)
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [newParada, setNewParada] = useState({
    nombre: '',
    latitud: '',
    longitud: '',
    ruta_id: '',    // <— ruta_id, no recorrido_id
    orden: '',
  });
  const [saving, setSaving] = useState(false);

  // Filtros manuales (solo cuando no está acotado por drill-down)
  const [filterRecorridoId, setFilterRecorridoId] = useState('');
  const [filterRutaId, setFilterRutaId] = useState('');

  // Modal de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editParada, setEditParada] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', latitud: '', longitud: '', orden: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Al navegar desde otra tab, aplicamos los filtros sembrados (ruta y/o recorrido).
  useEffect(() => {
    const rec = recorridoId ? String(recorridoId) : '';
    const rut = rutaId ? String(rutaId) : '';
    if (!rec && !rut) return;
    applyFilters(rec, rut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaId, recorridoId]);

  // Carga paradas aplicando recorrido/ruta explícitos (evita closures de estado obsoletos).
  const applyFilters = async (recId, rutaIdValue) => {
    setFilterRecorridoId(recId || '');
    setFilterRutaId(rutaIdValue || '');
    try {
      setLoading(true);
      let result;
      if (rutaIdValue) {
        result = await api.paradas.list({ rutaId: rutaIdValue });
      } else if (recId) {
        result = await api.paradas.list({ recorridoId: recId });
      } else {
        result = await api.paradas.list();
      }
      setParadas(result.ok && Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error('[ParadasScreen] Error filtros sembrados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Cargamos paradas, rutas y recorridos en paralelo (los filtros siempre visibles).
      // El backend filtra según JWT; el dueño solo recibe lo suyo.
      const [paradasResult, rutasResult, recorridosResult] = await Promise.all([
        api.paradas.list(),
        api.rutas.list(),
        api.recorridos.list(),
      ]);

      setParadas(
        paradasResult.ok && Array.isArray(paradasResult.data) ? paradasResult.data : []
      );
      setRutas(
        rutasResult.ok && Array.isArray(rutasResult.data) ? rutasResult.data : []
      );
      setRecorridos(
        recorridosResult.ok && Array.isArray(recorridosResult.data) ? recorridosResult.data : []
      );

      if (!paradasResult.ok) {
        setError(paradasResult.mensaje || 'No se pudieron cargar las paradas');
      }
    } catch (err) {
      console.error('[ParadasScreen] Error:', err);
      setError('No se pudieron cargar las paradas');
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
    if (!newParada.nombre.trim() || !newParada.ruta_id) {
      Alert.alert('Error', 'Nombre y ruta son requeridos');
      return;
    }

    try {
      setSaving(true);
      // api.paradas.create(rutaId, nombre, latitud, longitud, orden)
      const result = await api.paradas.create(
        parseInt(newParada.ruta_id),
        newParada.nombre.trim(),
        parseFloat(newParada.latitud) || 0,
        parseFloat(newParada.longitud) || 0,
        parseInt(newParada.orden) || 1
      );

      if (result.ok) {
        closeModal();
        loadData();
        Alert.alert('✅ Éxito', 'Parada creada correctamente');
      } else {
        Alert.alert('Error', result.mensaje || 'No se pudo crear la parada');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo crear la parada');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (parada) => {
    Alert.alert(
      'Eliminar Parada',
      `¿Estás seguro de eliminar "${parada.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.paradas.delete(parada.id);
              if (result.ok) {
                loadData();
                Alert.alert('✅', 'Parada eliminada');
              } else {
                Alert.alert('Error', result.mensaje || 'No se pudo eliminar la parada');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la parada');
            }
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setNewParada({ nombre: '', latitud: '', longitud: '', ruta_id: '', orden: '' });
  };

  const handleEditOpen = (parada) => {
    setEditParada(parada);
    setEditForm({
      nombre: parada.nombre || '',
      latitud: parada.latitud != null ? String(parada.latitud) : '',
      longitud: parada.longitud != null ? String(parada.longitud) : '',
      orden: parada.orden != null ? String(parada.orden) : '',
    });
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!editForm.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    const lat = parseFloat(editForm.latitud);
    const lng = parseFloat(editForm.longitud);
    const ord = parseInt(editForm.orden);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Error', 'Latitud y longitud deben ser numéricas');
      return;
    }
    try {
      setSavingEdit(true);
      const result = await api.paradas.update(editParada.id, {
        nombre: editForm.nombre.trim(),
        latitud: lat,
        longitud: lng,
        orden: Number.isNaN(ord) ? 0 : ord,
      });
      if (result.ok) {
        setEditModalVisible(false);
        setEditParada(null);
        loadData();
        Alert.alert('✅ Éxito', 'Parada actualizada correctamente');
      } else {
        Alert.alert('Error', result.mensaje || 'No se pudo actualizar la parada');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar la parada');
    } finally {
      setSavingEdit(false);
    }
  };

  const rutaOptions = rutas.map(r => ({
    value: r.id?.toString(),
    label: `${r.nombre}${r.recorrido?.nombre ? ` (${r.recorrido.nombre})` : ''}`,
  }));

  const recorridoFilterOptions = [
    { value: '', label: 'Todos los recorridos' },
    ...recorridos.map(r => ({ value: r.id?.toString(), label: r.nombre })),
  ];

  // Opciones de ruta en cascada: solo las rutas del recorrido seleccionado
  const rutaFilterOptions = [
    { value: '', label: 'Todas las rutas' },
    ...rutas
      .filter(r => !filterRecorridoId || String(r.recorrido_id) === String(filterRecorridoId))
      .map(r => ({ value: r.id?.toString(), label: `${r.nombre}${r.recorrido?.nombre ? ` (${r.recorrido.nombre})` : ''}` })),
  ];

  const applyRecorridoFilter = async (value) => {
    setFilterRecorridoId(value);
    setFilterRutaId(''); // cascada: resetear ruta al cambiar recorrido
    try {
      setLoading(true);
      const result = await api.paradas.list(value ? { recorridoId: value } : {});
      setParadas(result.ok && Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error('[ParadasScreen] Error filtro recorrido:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyRutaFilter = async (value) => {
    setFilterRutaId(value);
    try {
      setLoading(true);
      const result = await api.paradas.list(value ? { rutaId: value } : (filterRecorridoId ? { recorridoId: filterRecorridoId } : {}));
      setParadas(result.ok && Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error('[ParadasScreen] Error filtro ruta:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !paradas.length) {
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
            if (!rutaId && rutas.length === 0) {
              Alert.alert('Sin rutas', 'Debes tener al menos una ruta para crear paradas.');
              return;
            }
            if (!newParada.ruta_id) {
              const preselect = (filterRutaId || rutas[0]?.id)?.toString();
              setNewParada(prev => ({ ...prev, ruta_id: preselect }));
            }
            setModalVisible(true);
          }}
        >
          <Text style={styles.createButtonText}>+ Nueva Parada</Text>
        </TouchableOpacity>
      )}

      <View style={styles.filterContainer}>
        <SimpleSelector
          label="Filtrar por recorrido"
          options={recorridoFilterOptions}
          selectedValue={filterRecorridoId}
          onValueChange={applyRecorridoFilter}
        />
        <SimpleSelector
          label="Filtrar por ruta"
          options={rutaFilterOptions}
          selectedValue={filterRutaId}
          onValueChange={applyRutaFilter}
        />
      </View>

      {paradas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>No hay paradas</Text>
        </View>
      ) : (
        <FlatList
          data={paradas}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={onRowPress ? 0.8 : 1}
              onPress={onRowPress ? () => onRowPress(item) : undefined}
              disabled={!onRowPress}
            >
              <ParadaCard parada={item} canEdit={canEdit} onEdit={handleEditOpen} canDelete={canDelete} onDelete={handleDelete} />
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
            <Text style={styles.modalTitle}>Nueva Parada</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre *"
              placeholderTextColor="#a0aec0"
              value={newParada.nombre}
              onChangeText={(text) => setNewParada({ ...newParada, nombre: text })}
              editable={!saving}
            />

            <Text style={styles.coordsLabel}>Coordenadas Geográficas</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Latitud"
                placeholderTextColor="#a0aec0"
                value={newParada.latitud}
                onChangeText={(text) => setNewParada({ ...newParada, latitud: text })}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                placeholder="Longitud"
                placeholderTextColor="#a0aec0"
                value={newParada.longitud}
                onChangeText={(text) => setNewParada({ ...newParada, longitud: text })}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Orden (ej. 1)"
              placeholderTextColor="#a0aec0"
              value={newParada.orden}
              onChangeText={(text) => setNewParada({ ...newParada, orden: text })}
              keyboardType="numeric"
              editable={!saving}
            />

            {/* SELECTOR DE RUTA — no de recorrido, ya que api.paradas.create exige ruta_id */}
            <SimpleSelector
              label="Ruta * (asociada a un recorrido)"
              options={rutaOptions}
              selectedValue={newParada.ruta_id}
              onValueChange={(val) => setNewParada({ ...newParada, ruta_id: val })}
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
            <Text style={styles.modalTitle}>Editar Parada</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre *"
              placeholderTextColor="#a0aec0"
              value={editForm.nombre}
              onChangeText={(text) => setEditForm({ ...editForm, nombre: text })}
              editable={!savingEdit}
            />

            <Text style={styles.coordsLabel}>Coordenadas Geográficas</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Latitud"
                placeholderTextColor="#a0aec0"
                value={editForm.latitud}
                onChangeText={(text) => setEditForm({ ...editForm, latitud: text })}
                keyboardType="decimal-pad"
                editable={!savingEdit}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                placeholder="Longitud"
                placeholderTextColor="#a0aec0"
                value={editForm.longitud}
                onChangeText={(text) => setEditForm({ ...editForm, longitud: text })}
                keyboardType="decimal-pad"
                editable={!savingEdit}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Orden (ej. 1)"
              placeholderTextColor="#a0aec0"
              value={editForm.orden}
              onChangeText={(text) => setEditForm({ ...editForm, orden: text })}
              keyboardType="numeric"
              editable={!savingEdit}
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

function ParadaCard({ parada, canEdit, onEdit, canDelete, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{parada.nombre}</Text>
          {parada.orden != null && (
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>#{parada.orden}</Text>
            </View>
          )}
        </View>
        {parada.ruta?.nombre && (
          <Text style={styles.cardSubtitle}>🛣️ {parada.ruta.nombre}</Text>
        )}
        {parada.recorrido?.nombre && (
          <Text style={styles.cardSubtitle}>🚌 {parada.recorrido.nombre}</Text>
        )}
        {parada.latitud != null && parada.longitud != null && (
          <Text style={styles.cardCoords}>
            📍 {Number(parada.latitud).toFixed(4)}, {Number(parada.longitud).toFixed(4)}
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        {canEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(parada)}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(parada)}
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
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle:       { fontSize: 16, fontWeight: '600', color: '#1a202c', flex: 1 },
  orderBadge:      { backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  orderBadgeText:  { fontSize: 10, color: '#92400e', fontWeight: '600' },
  cardSubtitle:    { fontSize: 12, color: '#718096', marginBottom: 2 },
  cardCoords:      { fontSize: 11, color: '#a0aec0' },
  deleteButton:    { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  deleteIcon:      { fontSize: 18 },
  cardActions:      { flexDirection: 'row', alignItems: 'center' },
  editButton:      { width: 36, height: 36, borderRadius: 6, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  editIcon:        { fontSize: 18 },
  modalContainer:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  modalTitle:      { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a202c' },
  input:           { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 14, color: '#1a202c', backgroundColor: '#f7fafc' },
  coordsLabel:     { fontSize: 12, color: '#718096', marginBottom: 4, fontWeight: '600' },
  rowInputs:       { flexDirection: 'row', marginBottom: 0 },
  modalButtons:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  button:          { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonCancel:    { backgroundColor: '#f3f4f6' },
  buttonCancelText:{ fontWeight: '600', color: '#4a5568' },
  buttonCreate:    { backgroundColor: '#6366f1' },
  buttonDisabled:  { backgroundColor: '#a5b4fc' },
  buttonText:      { fontWeight: '600', color: '#ffffff' },
});

const selectorStyles = StyleSheet.create({
  container:          { marginBottom: 12 },
  label:              { fontSize: 12, color: '#718096', marginBottom: 4, fontWeight: '600' },
  trigger:            { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f7fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled:           { opacity: 0.5 },
  triggerText:        { fontSize: 14, color: '#1a202c', flex: 1 },
  arrow:              { fontSize: 12, color: '#718096' },
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
  sheetTitle:         { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  option:             { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionSelected:     { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 8 },
  optionText:         { fontSize: 15, color: '#1a202c' },
  optionTextSelected: { color: '#6366f1', fontWeight: '600' },
});
