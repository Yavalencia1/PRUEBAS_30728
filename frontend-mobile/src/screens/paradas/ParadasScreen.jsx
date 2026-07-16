import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import MapView, { Marker } from 'react-native-maps';

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
        <Text style={selectorStyles.triggerText} numberOfLines={1}>
          {selected ? selected.label : 'Seleccionar…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#185FA5" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={selectorStyles.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={selectorStyles.sheet}>
            <Text style={selectorStyles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[selectorStyles.option, opt.value === selectedValue && selectorStyles.optionSelected]}
                  onPress={() => { onValueChange(opt.value); setOpen(false); }}
                >
                  <Text style={[selectorStyles.optionText, opt.value === selectedValue && selectorStyles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                  {opt.value === selectedValue && <Ionicons name="checkmark" size={18} color="#6366f1" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Centro por defecto (Quito)
const DEFAULT_REGION = {
  latitude: -0.180653,
  longitude: -78.467834,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const mapStyles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  map: {
    height: 200,
    width: '100%',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
  },
  hint: {
    fontSize: 10,
    color: '#888780',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

// Selector de ubicación interactivo
function LocationPicker({ latitude, longitude, onChange }) {
  if (Platform.OS === 'web') {
    return (
      <View style={mapStyles.container}>
        <View style={[mapStyles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F8FD', borderColor: '#E6F1FB', borderWidth: 0.5 }]}>
          <Ionicons name="map-outline" size={32} color="#185FA5" style={{ marginBottom: 6 }} />
          <Text style={{ fontSize: 11, color: '#888780', textAlign: 'center', paddingHorizontal: 16 }}>
            El mapa interactivo no está disponible en la web. Introduce las coordenadas manuales en el formulario.
          </Text>
        </View>
      </View>
    );
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoord = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  const initialRegion = hasCoord
    ? { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : DEFAULT_REGION;

  const coordinate = hasCoord
    ? { latitude: lat, longitude: lng }
    : { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };

  const handlePick = (e) => {
    const { latitude: la, longitude: lo } = e.nativeEvent.coordinate;
    onChange(la, lo);
  };

  return (
    <View style={mapStyles.container}>
      <MapView
        style={mapStyles.map}
        initialRegion={initialRegion}
        onPress={handlePick}
        scrollEnabled
        zoomEnabled
      >
        <Marker
          coordinate={coordinate}
          draggable
          onDragEnd={handlePick}
          title="Ubicación de la parada"
        />
      </MapView>
      <Text style={mapStyles.hint}>Toca el mapa o arrastra el pin para ubicar la parada</Text>
    </View>
  );
}

export default function ParadasScreen({ rutaId, recorridoId }) {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';
  const canEdit = rol === 'admin' || rol === 'dueno';

  const [view, setView] = useState('list'); // 'list' | 'register' | 'edit'
  const [paradas, setParadas] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Formulario creación
  const emptyForm = {
    nombre: '',
    latitud: '',
    longitud: '',
    ruta_id: '',
    orden: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filtros manuales
  const [filterRecorridoId, setFilterRecorridoId] = useState('');
  const [filterRutaId, setFilterRutaId] = useState('');

  // Formulario edición
  const [editParadaId, setEditParadaId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', latitud: '', longitud: '', orden: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const rec = recorridoId ? String(recorridoId) : '';
    const rut = rutaId ? String(rutaId) : '';
    if (!rec && !rut) return;
    applyFilters(rec, rut);
  }, [rutaId, recorridoId]);

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
      console.error('[ParadasScreen] Error filtros:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [paradasResult, rutasResult, recorridosResult] = await Promise.all([
        api.paradas.list(),
        api.rutas.list(),
        api.recorridos.list(),
      ]);

      setParadas(paradasResult.ok && Array.isArray(paradasResult.data) ? paradasResult.data : []);
      setRutas(rutasResult.ok && Array.isArray(rutasResult.data) ? rutasResult.data : []);

      const activeRecorridos = recorridosResult.ok && Array.isArray(recorridosResult.data)
        ? recorridosResult.data.filter(r => r.activo)
        : [];
      setRecorridos(activeRecorridos);

      if (rutasResult.ok && Array.isArray(rutasResult.data) && rutasResult.data.length > 0) {
        setFormData(prev => ({ ...prev, ruta_id: rutasResult.data[0].id.toString() }));
      }

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
    if (!formData.nombre.trim() || !formData.ruta_id) {
      Alert.alert('Error', 'Nombre y ruta son requeridos');
      return;
    }

    try {
      setSaving(true);
      const result = await api.paradas.create(
        parseInt(formData.ruta_id),
        formData.nombre.trim(),
        parseFloat(formData.latitud) || 0,
        parseFloat(formData.longitud) || 0,
        parseInt(formData.orden) || 1
      );

      if (result.ok) {
        setView('list');
        setFormData(prev => ({ ...prev, nombre: '', latitud: '', longitud: '', orden: '' }));
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

  const handleEditOpen = (parada) => {
    setEditParadaId(parada.id);
    setEditForm({
      nombre: parada.nombre || '',
      latitud: String(parada.latitud || ''),
      longitud: String(parada.longitud || ''),
      orden: String(parada.orden || '1'),
    });
    setView('edit');
  };

  const handleEditSave = async () => {
    if (!editForm.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    try {
      setSavingEdit(true);
      const result = await api.paradas.update(editParadaId, {
        nombre: editForm.nombre.trim(),
        latitud: parseFloat(editForm.latitud) || 0,
        longitud: parseFloat(editForm.longitud) || 0,
        orden: parseInt(editForm.orden) || 1,
      });
      if (result.ok) {
        setView('list');
        setEditParadaId(null);
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

  const handlePickerChange = (la, lo) => {
    if (view === 'register') {
      setFormData(prev => ({ ...prev, latitud: String(la), longitud: String(lo) }));
    } else if (view === 'edit') {
      setEditForm(prev => ({ ...prev, latitud: String(la), longitud: String(lo) }));
    }
  };

  const rutaOptions = rutas.map(r => ({
    value: r.id.toString(),
    label: r.nombre,
  }));

  const recorridoFilterOptions = [
    { value: '', label: 'Todos los recorridos' },
    ...recorridos.map(r => ({ value: r.id.toString(), label: r.nombre })),
  ];

  const filteredRutas = filterRecorridoId
    ? rutas.filter(r => r.recorrido_id === parseInt(filterRecorridoId))
    : rutas;

  const rutaFilterOptions = [
    { value: '', label: 'Todas las rutas' },
    ...filteredRutas.map(r => ({ value: r.id.toString(), label: r.nombre })),
  ];

  const handleManualFilterChange = async (recId, rutId) => {
    setFilterRecorridoId(recId);
    setFilterRutaId(rutId);
    try {
      setLoading(true);
      let result;
      if (rutId) {
        result = await api.paradas.list({ rutaId: rutId });
      } else if (recId) {
        result = await api.paradas.list({ recorridoId: recId });
      } else {
        result = await api.paradas.list();
      }
      setParadas(result.ok && Array.isArray(result.data) ? result.data : []);
    } catch {
      setError('Error al filtrar paradas');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render de Parada ───────────────────────────────────────────────────────

  const renderParada = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name="location-outline" size={18} color="#185FA5" />
        </View>
        <View style={styles.cardInfoCol}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre}</Text>
            {item.orden != null && (
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>Orden #{item.orden}</Text>
              </View>
            )}
          </View>
          <View style={styles.badgeRow}>
            {item.ruta?.nombre && (
              <View style={styles.rutaBadge}>
                <Ionicons name="trail-sign-outline" size={9} color="#888780" style={{ marginRight: 2 }} />
                <Text style={styles.rutaBadgeText} numberOfLines={1}>{item.ruta.nombre}</Text>
              </View>
            )}
            {item.recorrido?.nombre && (
              <View style={styles.recorridoBadge}>
                <Ionicons name="bus-outline" size={9} color="#888780" style={{ marginRight: 2 }} />
                <Text style={styles.recorridoBadgeText} numberOfLines={1}>{item.recorrido.nombre}</Text>
              </View>
            )}
          </View>
          {item.latitud != null && item.longitud != null && (
            <Text style={styles.cardCoords}>
              Coordenadas: {Number(item.latitud).toFixed(4)}, {Number(item.longitud).toFixed(4)}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.actionsContainer}>
          {canEdit && (
            <TouchableOpacity style={styles.editBtn} onPress={() => handleEditOpen(item)}>
              <Ionicons name="pencil-outline" size={12} color="#185FA5" />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={12} color="#A32D2D" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading && paradas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Cargando paradas…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra de Migas de Pan (Breadcrumbs) */}
      <View style={styles.breadcrumbContainer}>
        <Ionicons name="settings-outline" size={12} color="#888780" />
        <Text style={styles.breadcrumbLink} onPress={() => setView('list')}> Gestión</Text>
        <Text style={styles.breadcrumbSeparator}> &gt; </Text>
        <Text style={[styles.breadcrumbLink, view === 'list' && styles.breadcrumbActive]} onPress={() => setView('list')}>Paradas</Text>
        {view === 'register' && (
          <>
            <Text style={styles.breadcrumbSeparator}> &gt; </Text>
            <Text style={[styles.breadcrumbLink, styles.breadcrumbActive]}>Registrar</Text>
          </>
        )}
        {view === 'edit' && (
          <>
            <Text style={styles.breadcrumbSeparator}> &gt; </Text>
            <Text style={[styles.breadcrumbLink, styles.breadcrumbActive]}>Editar</Text>
          </>
        )}
      </View>

      {view === 'list' ? (
        // ─── VISTA LISTADO ─────────────────────────────────────────────────────
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Paradas del Sistema</Text>
              <Text style={styles.subtitle}>Listado de puntos de abordaje de alumnos</Text>
            </View>
            {canCreate && (
              <TouchableOpacity
                style={styles.btnAdd}
                onPress={() => {
                  if (rutas.length === 0) {
                    Alert.alert('Aviso', 'Necesitas tener rutas registradas para crear paradas.');
                    return;
                  }
                  setView('register');
                }}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros */}
          <View style={styles.filtersWrapper}>
            <SimpleSelector
              label="Filtrar Recorrido"
              options={recorridoFilterOptions}
              selectedValue={filterRecorridoId}
              onValueChange={(val) => handleManualFilterChange(val, '')}
            />
            <SimpleSelector
              label="Filtrar Ruta"
              options={rutaFilterOptions}
              selectedValue={filterRutaId}
              onValueChange={(val) => handleManualFilterChange(filterRecorridoId, val)}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {paradas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={32} color="#B4B2A9" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>No hay paradas registradas con este criterio.</Text>
            </View>
          ) : (
            <FlatList
              data={paradas}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderParada}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          )}
        </View>
      ) : view === 'register' ? (
        // ─── VISTA REGISTRO (Estilo Migajas) ───────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Registrar Nueva Parada</Text>
          <Text style={styles.formSubtitle}>Configura el punto de parada y su geolocalización.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre de la Parada *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Parada La Carolina"
              placeholderTextColor="#9ca3af"
              value={formData.nombre}
              onChangeText={(val) => setFormData({ ...formData, nombre: val })}
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <SimpleSelector
              label="Ruta Relacionada *"
              options={rutaOptions}
              selectedValue={formData.ruta_id}
              onValueChange={(val) => setFormData({ ...formData, ruta_id: val })}
              disabled={saving}
            />
          </View>

          {/* Location Picker (Map con fallback) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ubicación en el Mapa</Text>
            <LocationPicker
              latitude={formData.latitud}
              longitude={formData.longitude}
              onChange={handlePickerChange}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 6 }]}>
              <Text style={styles.label}>Latitud</Text>
              <TextInput
                style={styles.input}
                placeholder="Latitud"
                placeholderTextColor="#9ca3af"
                value={formData.latitud}
                onChangeText={(val) => setFormData({ ...formData, latitud: val })}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 6 }]}>
              <Text style={styles.label}>Longitud</Text>
              <TextInput
                style={styles.input}
                placeholder="Longitud"
                placeholderTextColor="#9ca3af"
                value={formData.longitud}
                onChangeText={(val) => setFormData({ ...formData, longitud: val })}
                keyboardType="decimal-pad"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Orden en la Ruta (ej. 1)</Text>
            <TextInput
              style={styles.input}
              placeholder="Orden de parada"
              placeholderTextColor="#9ca3af"
              value={formData.orden}
              onChangeText={(val) => setFormData({ ...formData, orden: val })}
              keyboardType="numeric"
              editable={!saving}
            />
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setView('list');
                setFormData(emptyForm);
              }}
              disabled={saving}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrimaryText}>Crear Parada</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // ─── VISTA EDICIÓN (Estilo Migajas) ─────────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Editar Parada</Text>
          <Text style={styles.formSubtitle}>Modifica los datos de la parada y geolocalización.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre de la Parada *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Parada La Carolina"
              placeholderTextColor="#9ca3af"
              value={editForm.nombre}
              onChangeText={(val) => setEditForm({ ...editForm, nombre: val })}
              editable={!savingEdit}
            />
          </View>

          {/* Location Picker (Map con fallback) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ubicación en el Mapa</Text>
            <LocationPicker
              latitude={editForm.latitud}
              longitude={editForm.longitud}
              onChange={handlePickerChange}
            />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 6 }]}>
              <Text style={styles.label}>Latitud</Text>
              <TextInput
                style={styles.input}
                placeholder="Latitud"
                placeholderTextColor="#9ca3af"
                value={editForm.latitud}
                onChangeText={(val) => setEditForm({ ...editForm, latitud: val })}
                keyboardType="decimal-pad"
                editable={!savingEdit}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 6 }]}>
              <Text style={styles.label}>Longitud</Text>
              <TextInput
                style={styles.input}
                placeholder="Longitud"
                placeholderTextColor="#9ca3af"
                value={editForm.longitud}
                onChangeText={(val) => setEditForm({ ...editForm, longitud: val })}
                keyboardType="decimal-pad"
                editable={!savingEdit}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Orden en la Ruta (ej. 1)</Text>
            <TextInput
              style={styles.input}
              placeholder="Orden de parada"
              placeholderTextColor="#9ca3af"
              value={editForm.orden}
              onChangeText={(val) => setEditForm({ ...editForm, orden: val })}
              keyboardType="numeric"
              editable={!savingEdit}
            />
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setView('list');
                setEditParadaId(null);
              }}
              disabled={savingEdit}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, savingEdit && styles.btnDisabled]}
              onPress={handleEditSave}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrimaryText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 8, color: '#888780', fontSize: 13 },

  // Breadcrumbs (Migajas de Pan)
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FD',
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  breadcrumbLink: { fontSize: 11, color: '#185FA5', fontWeight: '500' },
  breadcrumbActive: { color: '#888780' },
  breadcrumbSeparator: { fontSize: 11, color: '#B5D4F4', marginHorizontal: 4 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 6 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#2C2C2A' },
  subtitle: { fontSize: 11, color: '#888780', marginTop: 2 },
  btnAdd: { backgroundColor: '#185FA5', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 2 },

  filtersWrapper: { paddingHorizontal: 12, marginBottom: 4, gap: 4 },

  errorContainer: { marginHorizontal: 12, marginVertical: 6, padding: 10, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#E6F1FB', borderRadius: 8 },
  errorText: { color: '#A32D2D', fontSize: 11 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 8, fontSize: 11, color: '#888780', textAlign: 'center' },

  listContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 7 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.82,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardInfoCol: {
    flex: 1,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#2C2C2A' },
  orderBadge: { backgroundColor: '#FAEEDA', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  orderBadgeText: { color: '#854F0B', fontSize: 8, fontWeight: '600' },
  badgeRow: { marginTop: 4, flexDirection: 'row', gap: 6 },
  rutaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F8FD', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8, maxWidth: 120 },
  rutaBadgeText: { color: '#888780', fontSize: 8, fontWeight: '500' },
  recorridoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F8FD', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8, maxWidth: 120 },
  recorridoBadgeText: { color: '#888780', fontSize: 8, fontWeight: '500' },
  cardCoords: { fontSize: 9, color: '#B4B2A9', marginTop: 4 },

  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 48,
    flex: 0.18,
  },
  actionsContainer: { flexDirection: 'row', gap: 4 },
  editBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E6F1FB', borderWidth: 0.5, borderColor: '#B5D4F4', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', justifyContent: 'center', alignItems: 'center' },

  // Formulario
  formContainer: { paddingHorizontal: 12, paddingVertical: 12 },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#2C2C2A', marginBottom: 2 },
  formSubtitle: { fontSize: 11, color: '#888780', marginBottom: 16 },

  formGroup: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#2C2C2A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#E6F1FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#2C2C2A', backgroundColor: '#F4F8FD' },
  rowInputs: { flexDirection: 'row', marginBottom: 0 },

  formButtons: { flexDirection: 'row', gap: 7, marginTop: 12 },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', alignItems: 'center' },
  btnSecondaryText: { color: '#A32D2D', fontSize: 13, fontWeight: '600' },
  btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});

const selectorStyles = StyleSheet.create({
  container:          { marginBottom: 8 },
  label:              { fontSize: 11, fontWeight: '600', color: '#2C2C2A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  trigger:            { borderWidth: 1, borderColor: '#E6F1FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F4F8FD', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled:           { opacity: 0.5 },
  triggerText:        { fontSize: 13, color: '#2C2C2A', flex: 1, fontWeight: '500' },
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '60%' },
  sheetTitle:         { fontSize: 14, fontWeight: '700', color: '#2C2C2A', marginBottom: 12, textAlign: 'center' },
  option:             { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#edf2f7', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionSelected:     { backgroundColor: '#f5f3ff', borderRadius: 12, paddingHorizontal: 12 },
  optionText:         { fontSize: 14, color: '#4a5568', fontWeight: '500' },
  optionTextSelected: { color: '#6366f1', fontWeight: '700' },
});
