import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// ─── Selector nativo (sin @react-native-picker/picker) ───────────────────────

function SimpleSelector({ label, options, selectedValue, onValueChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === selectedValue);
  return (
    <View style={selStyles.container}>
      <Text style={selStyles.label}>{label}</Text>
      <TouchableOpacity
        style={[selStyles.trigger, disabled && selStyles.disabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={selStyles.triggerText} numberOfLines={1}>
          {selected ? selected.label : 'Seleccionar…'}
        </Text>
        <Text style={selStyles.arrow}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={selStyles.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={selStyles.sheet}>
            <Text style={selStyles.sheetTitle}>{label}</Text>
            <ScrollView>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[selStyles.option, opt.value === selectedValue && selStyles.optionSelected]}
                  onPress={() => { onValueChange(opt.value); setOpen(false); }}
                >
                  <Text style={[selStyles.optionText, opt.value === selectedValue && selStyles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AlumnosScreen() {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  // ADMIN puede eliminar y crear; DUEÑO solo puede crear
  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';

  const [alumnos, setAlumnos]     = useState([]);
  const [padres, setPadres]       = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [paradas, setParadas]     = useState([]);

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const emptyForm = {
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    padre_id: '',
    recorrido_id: '',
    parada_id: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      // El backend ya filtra según el token JWT:
      // - ADMIN recibe todos los alumnos y todos los recorridos
      // - DUEÑO recibe solo los alumnos de sus recorridos y sus propios recorridos
      const [alumnosResult, padresResult, recorridosResult] = await Promise.all([
        api.alumnos.list(),
        api.usuarios.listByRol('padre'),
        api.recorridos.list(),
      ]);

      if (alumnosResult.ok && Array.isArray(alumnosResult.data)) {
        setAlumnos(alumnosResult.data);
      }

      if (padresResult.ok && Array.isArray(padresResult.data)) {
        setPadres(padresResult.data);
        if (padresResult.data.length > 0) {
          setFormData(prev => ({ ...prev, padre_id: padresResult.data[0].id.toString() }));
        }
      }

      if (recorridosResult.ok && Array.isArray(recorridosResult.data)) {
        const activeRecorridos = recorridosResult.data.filter(r => r.activo);
        setRecorridos(activeRecorridos);
        if (activeRecorridos.length > 0) {
          const firstId = activeRecorridos[0].id;
          setFormData(prev => ({ ...prev, recorrido_id: firstId.toString() }));
          fetchParadas(firstId);
        }
      }
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchParadas = async (recorridoId) => {
    try {
      const result = await api.paradas.list(recorridoId);
      if (result.ok && Array.isArray(result.data)) {
        setParadas(result.data);
        setFormData(prev => ({
          ...prev,
          parada_id: result.data.length > 0 ? result.data[0].id.toString() : '',
        }));
      } else {
        setParadas([]);
        setFormData(prev => ({ ...prev, parada_id: '' }));
      }
    } catch {
      setParadas([]);
      setFormData(prev => ({ ...prev, parada_id: '' }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'recorrido_id' && value) {
      fetchParadas(parseInt(value));
    }
  };

  const handleCreate = async () => {
    if (
      !formData.nombre.trim() ||
      !formData.apellido.trim() ||
      !formData.fecha_nacimiento ||
      !formData.padre_id ||
      !formData.recorrido_id
    ) {
      Alert.alert('Error', 'Por favor, completa todos los campos requeridos.');
      return;
    }

    // Validación de formato de fecha YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.fecha_nacimiento)) {
      Alert.alert('Error', 'El formato de la fecha debe ser YYYY-MM-DD (ej. 2010-05-20)');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        nombre:           formData.nombre.trim(),
        apellido:         formData.apellido.trim(),
        fecha_nacimiento: formData.fecha_nacimiento,
        padre_id:         parseInt(formData.padre_id),
        recorrido_id:     parseInt(formData.recorrido_id),
        ...(formData.parada_id ? { parada_id: parseInt(formData.parada_id) } : {}),
      };

      const result = await api.alumnos.create(payload);
      if (result.ok) {
        setIsModalOpen(false);
        setFormData(emptyForm);
        fetchDatos();
        Alert.alert('✅ Éxito', 'Alumno guardado correctamente.');
      } else {
        Alert.alert('Error', result.mensaje || 'Error al guardar el alumno.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Error de conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (alumno) => {
    Alert.alert(
      'Eliminar Alumno',
      `¿Estás seguro de eliminar a "${alumno.nombre} ${alumno.apellido}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.alumnos.delete(alumno.id);
              if (result.ok) {
                fetchDatos();
                Alert.alert('✅', 'Alumno eliminado');
              } else {
                Alert.alert('Error', result.mensaje || 'No se pudo eliminar el alumno');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el alumno');
            }
          },
        },
      ]
    );
  };

  // ─── Opciones para selectores ───────────────────────────────────────────────

  const padreOptions = padres.map(p => ({
    value: p.id.toString(),
    label: `${p.nombre} ${p.apellido}`,
  }));

  const recorridoOptions = recorridos.map(r => ({
    value: r.id.toString(),
    label: r.nombre,
  }));

  const paradaOptions = [
    { value: '', label: 'Sin parada asignada' },
    ...paradas.map(p => ({ value: p.id.toString(), label: p.nombre })),
  ];

  // ─── Render de alumno en la lista ───────────────────────────────────────────

  const renderAlumno = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.nombre} {item.apellido}</Text>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.cardId}>#{item.id}</Text>
          {/* Botón eliminar — solo ADMIN */}
          {canDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.infoText}>
          <Text style={styles.boldText}>Padre: </Text>
          {item.padre_nombre || `Padre #${item.padre_id}`}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.boldText}>Recorrido ID: </Text>
          {item.recorrido_nombre || item.recorrido_id}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.boldText}>Nacimiento: </Text>
          {new Date(item.fecha_nacimiento).toLocaleDateString('es-ES')}
        </Text>
        <View style={styles.badgeContainer}>
          {item.parada_nombre ? (
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeInfoText}>📍 {item.parada_nombre}</Text>
            </View>
          ) : (
            <View style={styles.badgeNeutral}>
              <Text style={styles.badgeNeutralText}>Sin parada asignada</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loading && alumnos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Cargando alumnos…</Text>
      </View>
    );
  }

  // ─── Render principal ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Gestión de Alumnos</Text>
          <Text style={styles.subtitle}>Registra y asocia estudiantes</Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            style={styles.btnAdd}
            onPress={() => {
              if (padres.length === 0 || recorridos.length === 0) {
                Alert.alert('Aviso', 'Necesitas padres y recorridos registrados para agregar alumnos.');
                return;
              }
              setIsModalOpen(true);
            }}
          >
            <Text style={styles.btnAddText}>＋</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {alumnos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No hay alumnos registrados en el sistema.</Text>
        </View>
      ) : (
        <FlatList
          data={alumnos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAlumno}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal de creación */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Alumno</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Mateo"
                  placeholderTextColor="#9ca3af"
                  value={formData.nombre}
                  onChangeText={(val) => handleInputChange('nombre', val)}
                  editable={!submitLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Apellido *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Pérez"
                  placeholderTextColor="#9ca3af"
                  value={formData.apellido}
                  onChangeText={(val) => handleInputChange('apellido', val)}
                  editable={!submitLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Fecha de Nacimiento * (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2010-05-20"
                  placeholderTextColor="#9ca3af"
                  value={formData.fecha_nacimiento}
                  onChangeText={(val) => handleInputChange('fecha_nacimiento', val)}
                  editable={!submitLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <SimpleSelector
                  label="Padre / Representante *"
                  options={padreOptions}
                  selectedValue={formData.padre_id}
                  onValueChange={(val) => handleInputChange('padre_id', val)}
                  disabled={submitLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <SimpleSelector
                  label="Recorrido asignado *"
                  options={recorridoOptions}
                  selectedValue={formData.recorrido_id}
                  onValueChange={(val) => handleInputChange('recorrido_id', val)}
                  disabled={submitLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <SimpleSelector
                  label="Parada habitual (Opcional)"
                  options={paradaOptions}
                  selectedValue={formData.parada_id}
                  onValueChange={(val) => handleInputChange('parada_id', val)}
                  disabled={submitLoading}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setIsModalOpen(false)}
                disabled={submitLoading}
              >
                <Text style={styles.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, submitLoading && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={submitLoading}
              >
                {submitLoading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnPrimaryText}>Guardar Alumno</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:       { marginTop: 12, color: '#6366f1', fontSize: 16 },

  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTextContainer: { flex: 1 },
  title:             { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  subtitle:          { fontSize: 14, color: '#6b7280', marginTop: 2 },
  btnAdd:            { backgroundColor: '#6366f1', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnAddText:        { color: '#ffffff', fontSize: 22, lineHeight: 26 },

  errorContainer:    { margin: 16, padding: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 8 },
  errorText:         { color: '#ef4444' },

  emptyContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon:         { fontSize: 64 },
  emptyText:         { marginTop: 16, fontSize: 16, color: '#6b7280', textAlign: 'center' },

  listContent:       { padding: 16, gap: 12 },
  card:              { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1 },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardHeaderRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:         { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1 },
  cardId:            { fontSize: 14, color: '#9ca3af' },
  deleteBtn:         { width: 32, height: 32, borderRadius: 6, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText:     { fontSize: 16 },

  cardBody:          { gap: 6 },
  infoText:          { fontSize: 14, color: '#4b5563' },
  boldText:          { fontWeight: '600', color: '#374151' },
  badgeContainer:    { marginTop: 8, alignItems: 'flex-start' },
  badgeInfo:         { backgroundColor: '#e0e7ff', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  badgeInfoText:     { color: '#4338ca', fontSize: 12, fontWeight: '600' },
  badgeNeutral:      { backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  badgeNeutralText:  { color: '#4b5563', fontSize: 12, fontWeight: '500' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:      { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle:        { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  closeBtn:          { fontSize: 20, color: '#6b7280', padding: 4 },
  modalBody:         { padding: 20 },
  formGroup:         { marginBottom: 4 },
  label:             { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:             { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#1f2937', backgroundColor: '#f9fafb', marginBottom: 12 },

  modalFooter:       { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 12 },
  btnSecondary:      { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center' },
  btnSecondaryText:  { color: '#374151', fontSize: 16, fontWeight: '600' },
  btnPrimary:        { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText:    { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled:       { backgroundColor: '#a5b4fc' },
});

const selStyles = StyleSheet.create({
  container:          { marginBottom: 12 },
  label:              { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  trigger:            { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f9fafb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled:           { opacity: 0.5 },
  triggerText:        { fontSize: 16, color: '#1f2937', flex: 1 },
  arrow:              { fontSize: 12, color: '#9ca3af' },
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40, maxHeight: '60%' },
  sheetTitle:         { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  option:             { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionSelected:     { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 8 },
  optionText:         { fontSize: 15, color: '#1a202c' },
  optionTextSelected: { color: '#6366f1', fontWeight: '600' },
});
