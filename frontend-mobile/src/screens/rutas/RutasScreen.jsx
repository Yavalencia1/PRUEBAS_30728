import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export default function RutasScreen({ recorridoId }) {
  const { usuario } = useAuth();
  const navigation = useNavigation();
  const rol = usuario?.rol?.toLowerCase();

  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';
  const canEdit = rol === 'admin' || rol === 'dueno';

  const [view, setView] = useState('list'); // 'list' | 'register' | 'edit'
  const [rutas, setRutas] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Formulario creación
  const emptyForm = {
    nombre: '',
    descripcion: '',
    recorrido_id: '',
    tipo: 'ida',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filtro manual
  const [filterRecorridoId, setFilterRecorridoId] = useState('');

  // Formulario edición
  const [editRutaId, setEditRutaId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', tipo: 'ida' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (recorridoId) {
      applyRecorridoFilter(String(recorridoId));
    }
  }, [recorridoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rutasResult, recorridosResult] = await Promise.all([
        api.rutas.list(),
        api.recorridos.list(),
      ]);

      const dataRutas = rutasResult.ok && Array.isArray(rutasResult.data) ? rutasResult.data : [];
      setRutas(dataRutas);

      const activeRecorridos = recorridosResult.ok && Array.isArray(recorridosResult.data)
        ? recorridosResult.data.filter(r => r.activo)
        : [];
      setRecorridos(activeRecorridos);

      if (activeRecorridos.length > 0) {
        setFormData(prev => ({ ...prev, recorrido_id: activeRecorridos[0].id.toString() }));
      }

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

  const applyRecorridoFilter = async (idVal) => {
    setFilterRecorridoId(idVal);
    try {
      setLoading(true);
      const result = idVal ? await api.rutas.list(parseInt(idVal)) : await api.rutas.list();
      setRutas(result.ok && Array.isArray(result.data) ? result.data : []);
    } catch {
      setError('Error al filtrar rutas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nombre.trim() || !formData.recorrido_id) {
      Alert.alert('Error', 'Nombre y recorrido son requeridos');
      return;
    }

    try {
      setSaving(true);
      const result = await api.rutas.create(
        parseInt(formData.recorrido_id),
        formData.nombre.trim(),
        formData.descripcion.trim(),
        formData.tipo
      );

      if (result.ok) {
        setView('list');
        setFormData(prev => ({ ...prev, nombre: '', descripcion: '' }));
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

  const handleEditOpen = (ruta) => {
    setEditRutaId(ruta.id);
    setEditForm({
      nombre: ruta.nombre || '',
      descripcion: ruta.descripcion || '',
      tipo: ruta.tipo || 'ida',
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
      const result = await api.rutas.update(
        editRutaId,
        editForm.nombre.trim(),
        editForm.descripcion.trim(),
        editForm.tipo
      );
      if (result.ok) {
        setView('list');
        setEditRutaId(null);
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

  const recorridoOptions = recorridos.map(r => ({
    value: r.id.toString(),
    label: r.nombre,
  }));

  const recorridoFilterOptions = [
    { value: '', label: 'Todos los recorridos' },
    ...recorridoOptions,
  ];

  const tipoOptions = [
    { value: 'ida', label: 'Ida' },
    { value: 'vuelta', label: 'Vuelta' },
  ];

  // ─── Render de Ruta ─────────────────────────────────────────────────────────

  const renderRuta = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name="trail-sign-outline" size={18} color="#185FA5" />
        </View>
        <View style={styles.cardInfoCol}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre}</Text>
          {item.descripcion ? (
            <Text style={styles.cardDescription} numberOfLines={2}>{item.descripcion}</Text>
          ) : null}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, item.tipo === 'ida' ? styles.badgeIda : styles.badgeVuelta]}>
              <Ionicons
                name={item.tipo === 'ida' ? 'arrow-down' : 'arrow-up'}
                size={8}
                color={item.tipo === 'ida' ? '#0F6E56' : '#0C447C'}
                style={{ marginRight: 2 }}
              />
              <Text style={[styles.typeBadgeText, item.tipo === 'ida' ? styles.textIda : styles.textVuelta]}>
                {item.tipo.toUpperCase()}
              </Text>
            </View>
            {item.recorrido_nombre && (
              <View style={styles.recorridoBadge}>
                <Ionicons name="bus-outline" size={9} color="#888780" style={{ marginRight: 2 }} />
                <Text style={styles.recorridoBadgeText} numberOfLines={1}>{item.recorrido_nombre}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate('ParadasTab', {
              rutaId: item.id,
              recorridoId: item.recorrido_id,
            })
          }
          style={styles.openDetailsBtn}
        >
          <Ionicons name="chevron-forward" size={14} color="#185FA5" />
        </TouchableOpacity>
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

  if (loading && rutas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Cargando rutas…</Text>
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
        <Text style={[styles.breadcrumbLink, view === 'list' && styles.breadcrumbActive]} onPress={() => setView('list')}>Rutas</Text>
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
              <Text style={styles.title}>Rutas del Sistema</Text>
              <Text style={styles.subtitle}>Listado de trayectos de ida y vuelta</Text>
            </View>
            {canCreate && (
              <TouchableOpacity
                style={styles.btnAdd}
                onPress={() => {
                  if (recorridos.length === 0) {
                    Alert.alert('Aviso', 'Necesitas tener recorridos registrados para crear rutas.');
                    return;
                  }
                  setView('register');
                }}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtro por recorrido */}
          <View style={styles.filterContainer}>
            <SimpleSelector
              label="Filtrar por recorrido"
              options={recorridoFilterOptions}
              selectedValue={filterRecorridoId}
              onValueChange={applyRecorridoFilter}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {rutas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="navigate-outline" size={32} color="#B4B2A9" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>No hay rutas registradas con este criterio.</Text>
            </View>
          ) : (
            <FlatList
              data={rutas}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRuta}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          )}
        </View>
      ) : view === 'register' ? (
        // ─── VISTA REGISTRO (Estilo Migajas) ───────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Registrar Nueva Ruta</Text>
          <Text style={styles.formSubtitle}>Configura el trayecto para los estudiantes.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre de la Ruta *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Ruta Norte - Ida"
              placeholderTextColor="#9ca3af"
              value={formData.nombre}
              onChangeText={(val) => setFormData({ ...formData, nombre: val })}
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción opcional"
              placeholderTextColor="#9ca3af"
              value={formData.descripcion}
              onChangeText={(val) => setFormData({ ...formData, descripcion: val })}
              multiline
              editable={!saving}
            />
          </View>

          <View style={styles.formGroup}>
            <SimpleSelector
              label="Recorrido Relacionado *"
              options={recorridoOptions}
              selectedValue={formData.recorrido_id}
              onValueChange={(val) => setFormData({ ...formData, recorrido_id: val })}
              disabled={saving}
            />
          </View>

          <View style={styles.formGroup}>
            <SimpleSelector
              label="Tipo de Trayecto *"
              options={tipoOptions}
              selectedValue={formData.tipo}
              onValueChange={(val) => setFormData({ ...formData, tipo: val })}
              disabled={saving}
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
                <Text style={styles.btnPrimaryText}>Crear Ruta</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // ─── VISTA EDICIÓN (Estilo Migajas) ─────────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Editar Ruta</Text>
          <Text style={styles.formSubtitle}>Modifica los datos de la ruta y tipo de trayecto.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre de la Ruta *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Ruta Norte - Ida"
              placeholderTextColor="#9ca3af"
              value={editForm.nombre}
              onChangeText={(val) => setEditForm({ ...editForm, nombre: val })}
              editable={!savingEdit}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Descripción de la ruta"
              placeholderTextColor="#9ca3af"
              value={editForm.descripcion}
              onChangeText={(val) => setEditForm({ ...editForm, descripcion: val })}
              multiline
              editable={!savingEdit}
            />
          </View>

          <View style={styles.formGroup}>
            <SimpleSelector
              label="Tipo de Trayecto *"
              options={tipoOptions}
              selectedValue={editForm.tipo}
              onValueChange={(val) => setEditForm({ ...editForm, tipo: val })}
              disabled={savingEdit}
            />
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setView('list');
                setEditRutaId(null);
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: flexStyle => ({ flex: 1, backgroundColor: '#ffffff' }),
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

  filterContainer: { paddingHorizontal: 12, marginBottom: 4 },

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
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#2C2C2A', marginBottom: 2 },
  cardDescription: { fontSize: 10, color: '#888780', marginTop: 1, lineHeight: 14 },
  badgeRow: { marginTop: 4, flexDirection: 'row', gap: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  badgeIda: { backgroundColor: '#E1F5EE' },
  badgeVuelta: { backgroundColor: '#E6F1FB' },
  typeBadgeText: { fontSize: 8, fontWeight: '600' },
  textIda: { color: '#0F6E56' },
  textVuelta: { color: '#0C447C' },
  recorridoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F8FD', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8, maxWidth: 120 },
  recorridoBadgeText: { color: '#888780', fontSize: 8, fontWeight: '500' },

  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
    flex: 0.18,
  },
  openDetailsBtn: { padding: 4 },
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

  formButtons: { flexDirection: 'row', gap: 7, marginTop: 12 },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', alignItems: 'center' },
  btnSecondaryText: { color: '#A32D2D', fontSize: 13, fontWeight: '600' },
  btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});

const selectorStyles = StyleSheet.create({
  container:          { marginBottom: 10 },
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
