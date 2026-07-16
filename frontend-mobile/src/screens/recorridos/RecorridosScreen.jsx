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
  Switch,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

export default function RecorridosScreen() {
  const { usuario } = useAuth();
  const navigation = useNavigation();
  const rol = usuario?.rol?.toLowerCase();

  // ADMIN puede eliminar; DUEÑO y ADMIN pueden crear y editar
  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';
  const canEdit = rol === 'admin' || rol === 'dueno';

  const [view, setView] = useState('list'); // 'list' | 'register' | 'edit'
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Formulario creación
  const emptyForm = {
    nombre: '',
    descripcion: '',
    activo: true,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Formulario edición
  const [editRecorridoId, setEditRecorridoId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', activo: true });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadRecorridos();
  }, []);

  const loadRecorridos = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.recorridos.list();
      const payload = result?.ok !== false ? (result?.data || result || []) : [];
      setRecorridos(Array.isArray(payload) ? payload : []);
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
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      setSaving(true);
      const duenoId = rol === 'dueno' ? usuario.id : null;
      const result = await api.recorridos.create(
        formData.nombre.trim(),
        formData.descripcion.trim(),
        formData.activo,
        duenoId
      );

      if (result.ok) {
        setView('list');
        setFormData(emptyForm);
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

  const handleEditOpen = (recorrido) => {
    setEditRecorridoId(recorrido.id);
    setEditForm({
      nombre: recorrido.nombre || '',
      descripcion: recorrido.descripcion || '',
      activo: recorrido.activo !== false,
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
      const result = await api.recorridos.update(
        editRecorridoId,
        editForm.nombre.trim(),
        editForm.descripcion.trim(),
        editForm.activo
      );
      if (result.ok) {
        setView('list');
        setEditRecorridoId(null);
        loadRecorridos();
        Alert.alert('✅ Éxito', 'Recorrido actualizado correctamente');
      } else {
        Alert.alert('Error', result.mensaje || 'No se pudo actualizar el recorrido');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el recorrido');
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Render de Recorrido ────────────────────────────────────────────────────

  const renderRecorrido = ({ item }) => (
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
            <View style={[styles.statusBadge, item.activo ? styles.badgeActivo : styles.badgeInactivo]}>
              <Text style={[styles.statusBadgeText, item.activo ? styles.textActivo : styles.textInactivo]}>
                {item.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            {item.rutas_count > 0 && (
              <View style={styles.routesBadge}>
                <Ionicons name="navigate-outline" size={9} color="#888780" style={{ marginRight: 2 }} />
                <Text style={styles.routesBadgeText}>{item.rutas_count} rutas</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('RutasTab', { recorridoId: item.id })}
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

  if (loading && recorridos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Cargando recorridos…</Text>
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
        <Text style={[styles.breadcrumbLink, view === 'list' && styles.breadcrumbActive]} onPress={() => setView('list')}>Recorridos</Text>
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
              <Text style={styles.title}>Recorridos del Sistema</Text>
              <Text style={styles.subtitle}>Listado de vehículos y rutas asignadas</Text>
            </View>
            {canCreate && (
              <TouchableOpacity
                style={styles.btnAdd}
                onPress={() => setView('register')}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {recorridos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trail-sign-outline" size={32} color="#B4B2A9" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>No hay recorridos registrados en el sistema.</Text>
            </View>
          ) : (
            <FlatList
              data={recorridos}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRecorrido}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          )}
        </View>
      ) : view === 'register' ? (
        // ─── VISTA REGISTRO (Estilo Migajas) ───────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Registrar Nuevo Recorrido</Text>
          <Text style={styles.formSubtitle}>Define los detalles y la disponibilidad del transporte.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre del Recorrido *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Recorrido Norte"
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
              placeholder="Descripción del recorrido y zonas que abarca"
              placeholderTextColor="#9ca3af"
              value={formData.descripcion}
              onChangeText={(val) => setFormData({ ...formData, descripcion: val })}
              multiline
              editable={!saving}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitleLabel}>Recorrido Activo</Text>
              <Text style={styles.switchDescLabel}>Indica si está disponible para asignar rutas</Text>
            </View>
            <Switch
              value={formData.activo}
              onValueChange={(val) => setFormData({ ...formData, activo: val })}
              disabled={saving}
              trackColor={{ false: '#cbd5e0', true: '#B5D4F4' }}
              thumbColor={formData.activo ? '#185FA5' : '#f4f3f4'}
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
                <Text style={styles.btnPrimaryText}>Crear Recorrido</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // ─── VISTA EDICIÓN (Estilo Migajas) ─────────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Editar Recorrido</Text>
          <Text style={styles.formSubtitle}>Modifica los datos del transporte y disponibilidad en tiempo real.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre del Recorrido *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Recorrido Norte"
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
              placeholder="Descripción del recorrido"
              placeholderTextColor="#9ca3af"
              value={editForm.descripcion}
              onChangeText={(val) => setEditForm({ ...editForm, descripcion: val })}
              multiline
              editable={!savingEdit}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitleLabel}>Recorrido Activo</Text>
              <Text style={styles.switchDescLabel}>Indica si está disponible para asignar rutas</Text>
            </View>
            <Switch
              value={editForm.activo}
              onValueChange={(val) => setEditForm({ ...editForm, activo: val })}
              disabled={savingEdit}
              trackColor={{ false: '#cbd5e0', true: '#B5D4F4' }}
              thumbColor={editForm.activo ? '#185FA5' : '#f4f3f4'}
            />
          </View>

          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setView('list');
                setEditRecorridoId(null);
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#2C2C2A' },
  subtitle: { fontSize: 11, color: '#888780', marginTop: 2 },
  btnAdd: { backgroundColor: '#185FA5', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 2 },

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
  statusBadge: { paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  badgeActivo: { backgroundColor: '#E1F5EE' },
  badgeInactivo: { backgroundColor: '#FCEBEB' },
  statusBadgeText: { fontSize: 8, fontWeight: '600' },
  textActivo: { color: '#0F6E56' },
  textInactivo: { color: '#A32D2D' },
  routesBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F8FD', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  routesBadgeText: { color: '#888780', fontSize: 8, fontWeight: '500' },

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

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F8FD',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 12,
    marginBottom: 16,
  },
  switchTitleLabel: { fontSize: 12, fontWeight: '700', color: '#2C2C2A' },
  switchDescLabel: { fontSize: 10, color: '#888780', marginTop: 1 },

  formButtons: { flexDirection: 'row', gap: 7, marginTop: 12 },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', alignItems: 'center' },
  btnSecondaryText: { color: '#A32D2D', fontSize: 13, fontWeight: '600' },
  btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
