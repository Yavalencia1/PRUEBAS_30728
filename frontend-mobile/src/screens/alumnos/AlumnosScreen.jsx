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
  TextInput,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <Ionicons name="chevron-down" size={16} color="#185FA5" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
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

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AlumnosScreen() {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  // ADMIN puede eliminar y crear; DUEÑO solo puede crear
  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin' || rol === 'dueno';

  const [view, setView] = useState('list'); // 'list' o 'register'
  const [alumnos, setAlumnos] = useState([]);
  const [padres, setPadres] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [paradas, setParadas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Estados para búsqueda de Padres (Autocompletado)
  const [parentSearch, setParentSearch] = useState('');
  const [selectedParent, setSelectedParent] = useState(null);

  const emptyForm = {
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    curso: '',
    padre_id: '',
    recorrido_id: '',
    parada_id: '',
    fotografia: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    setLoading(true);
    setError(null);
    try {
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
      const result = await api.paradas.list({ recorridoId });
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

  const selectParent = (padre) => {
    setSelectedParent(padre);
    handleInputChange('padre_id', padre.id.toString());
    setParentSearch('');
  };

  const clearSelectedParent = () => {
    setSelectedParent(null);
    handleInputChange('padre_id', '');
  };

  const handleSimulatePhoto = () => {
    // Generar un mockup de foto de alumno en uniforme usando avatares predeterminados profesionales
    const mockPhotos = [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1597524675050-67211a91cfa7?auto=format&fit=crop&q=80&w=200',
    ];
    const index = (formData.nombre.length || 0) % 2;
    handleInputChange('fotografia', mockPhotos[index]);
    Alert.alert('Foto Cargada', 'Se ha adjuntado la fotografía del alumno con su uniforme.');
  };

  const handleCreate = async () => {
    if (
      !formData.nombre.trim() ||
      !formData.apellido.trim() ||
      !formData.fecha_nacimiento ||
      !formData.padre_id ||
      !formData.recorrido_id ||
      !formData.curso.trim()
    ) {
      Alert.alert('Error', 'Por favor, completa todos los campos requeridos.');
      return;
    }

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
        curso:            formData.curso.trim(),
        padre_id:         parseInt(formData.padre_id),
        recorrido_id:     parseInt(formData.recorrido_id),
        fotografia:       formData.fotografia || null,
        ...(formData.parada_id ? { parada_id: parseInt(formData.parada_id) } : {}),
      };

      const result = await api.alumnos.create(payload);
      if (result.ok) {
        setView('list');
        setFormData(emptyForm);
        setSelectedParent(null);
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

  // Filtrado de padres según la barra de búsqueda
  const filteredPadres = parentSearch.trim()
    ? padres.filter(p =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(parentSearch.toLowerCase()) ||
        p.email.toLowerCase().includes(parentSearch.toLowerCase())
      )
    : [];

  const recorridoOptions = recorridos.map(r => ({
    value: r.id.toString(),
    label: r.nombre,
  }));

  const paradaOptions = [
    { value: '', label: 'Sin parada asignada' },
    ...paradas.map(p => ({ value: p.id.toString(), label: p.nombre })),
  ];

  // ─── Renderizado de Alumnos ──────────────────────────────────────────────────

  const renderAlumno = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Image
          source={{ uri: item.fotografia || 'https://via.placeholder.com/100?text=Uniforme' }}
          style={styles.studentImage}
        />
        <View style={styles.cardInfoCol}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.nombre} {item.apellido}
          </Text>
          <Text style={styles.cardSubtitleText}>
            Curso: {item.curso || 'No registrado'}
          </Text>
          <Text style={styles.cardSubtitleText}>
            Representante: {item.padre_nombre || `ID: ${item.padre_id}`}
          </Text>
          <View style={styles.badgeRow}>
            {item.parada_nombre ? (
              <View style={styles.badgeInfo}>
                <Ionicons name="location-outline" size={10} color="#0C447C" style={{ marginRight: 2 }} />
                <Text style={styles.badgeInfoText} numberOfLines={1}>{item.parada_nombre}</Text>
              </View>
            ) : (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>Sin parada</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardId}>#{item.id}</Text>
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={14} color="#A32D2D" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && alumnos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Cargando alumnos…</Text>
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
        <Text style={[styles.breadcrumbLink, view === 'list' && styles.breadcrumbActive]} onPress={() => setView('list')}>Alumnos</Text>
        {view === 'register' && (
          <>
            <Text style={styles.breadcrumbSeparator}> &gt; </Text>
            <Text style={[styles.breadcrumbLink, styles.breadcrumbActive]}>Registrar</Text>
          </>
        )}
      </View>

      {view === 'list' ? (
        // ─── VISTA LISTADO ─────────────────────────────────────────────────────
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Alumnos Registrados</Text>
              <Text style={styles.subtitle}>Listado oficial de estudiantes y rutas</Text>
            </View>
            {canCreate && (
              <TouchableOpacity
                style={styles.btnAdd}
                onPress={() => {
                  if (recorridos.length === 0) {
                    Alert.alert('Aviso', 'Necesitas recorridos registrados para agregar alumnos.');
                    return;
                  }
                  setView('register');
                }}
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

          {alumnos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={32} color="#B4B2A9" style={{ marginBottom: 6 }} />
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
        </View>
      ) : (
        // ─── VISTA REGISTRO (Nueva pestaña estilo migaja) ──────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Registrar Nuevo Alumno</Text>
          <Text style={styles.formSubtitle}>Ingresa la información académica y del representante.</Text>

          {/* Foto del Uniforme */}
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: formData.fotografia || 'https://via.placeholder.com/150?text=Foto+Uniforme' }}
              style={styles.uploadImagePreview}
            />
            <TouchableOpacity style={styles.photoButton} onPress={handleSimulatePhoto}>
              <Ionicons name="camera-outline" size={16} color="#185FA5" style={{ marginRight: 6 }} />
              <Text style={styles.photoButtonText}>Fotografía del Uniforme</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del estudiante"
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
              placeholder="Apellido del estudiante"
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
              placeholder="Ej. 2015-05-20"
              placeholderTextColor="#9ca3af"
              value={formData.fecha_nacimiento}
              onChangeText={(val) => handleInputChange('fecha_nacimiento', val)}
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Curso / Grado *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 5to de Básica A"
              placeholderTextColor="#9ca3af"
              value={formData.curso}
              onChangeText={(val) => handleInputChange('curso', val)}
              editable={!submitLoading}
            />
          </View>

          {/* Campo Autocompletado del Padre (Sin listas plegables largas) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Buscar Representante (Padre de Familia) *</Text>
            {selectedParent ? (
              <View style={styles.selectedParentCard}>
                <Ionicons name="person-circle-outline" size={24} color="#185FA5" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.parentNameText}>{selectedParent.nombre} {selectedParent.apellido}</Text>
                  <Text style={styles.parentEmailText}>{selectedParent.email}</Text>
                </View>
                <TouchableOpacity style={styles.clearParentBtn} onPress={clearSelectedParent}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.searchBarContainer}>
                  <Ionicons name="search-outline" size={16} color="#888780" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Escribe nombre o correo del representante..."
                    placeholderTextColor="#9ca3af"
                    value={parentSearch}
                    onChangeText={setParentSearch}
                  />
                </View>
                {parentSearch.trim().length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {filteredPadres.length === 0 ? (
                      <Text style={styles.noSuggestionText}>No se encontraron padres con ese término</Text>
                    ) : (
                      filteredPadres.map(p => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.suggestionItem}
                          onPress={() => selectParent(p)}
                        >
                          <Text style={styles.suggestionName}>{p.nombre} {p.apellido}</Text>
                          <Text style={styles.suggestionEmail}>{p.email}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
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

          {/* Botones del formulario */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setView('list');
                setFormData(emptyForm);
                setSelectedParent(null);
              }}
              disabled={submitLoading}
            >
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, submitLoading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrimaryText}>Guardar Alumno</Text>
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
    flex: 0.85,
  },
  studentImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#E6F1FB',
    marginRight: 10,
  },
  cardInfoCol: {
    flex: 1,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#2C2C2A', marginBottom: 2 },
  cardSubtitleText: { fontSize: 10, color: '#888780', marginTop: 1 },
  badgeRow: { marginTop: 4, flexDirection: 'row' },
  badgeInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F1FB', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  badgeInfoText: { color: '#0C447C', fontSize: 8, fontWeight: '600' },
  badgeNeutral: { backgroundColor: '#F4F8FD', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  badgeNeutralText: { color: '#888780', fontSize: 8, fontWeight: '500' },

  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    flex: 0.15,
  },
  cardId: { fontSize: 10, color: '#B4B2A9', fontWeight: '600' },
  deleteBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', justifyContent: 'center', alignItems: 'center' },

  // Formulario de Registro
  formContainer: { paddingHorizontal: 12, paddingVertical: 12 },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#2C2C2A', marginBottom: 2 },
  formSubtitle: { fontSize: 11, color: '#888780', marginBottom: 16 },

  photoContainer: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  uploadImagePreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#E6F1FB',
    backgroundColor: '#F4F8FD',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F1FB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  photoButtonText: {
    fontSize: 10,
    color: '#185FA5',
    fontWeight: '700',
  },

  formGroup: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#2C2C2A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#E6F1FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#2C2C2A', backgroundColor: '#F4F8FD' },

  // Autocomplete del Representante
  selectedParentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 10,
  },
  parentNameText: { fontSize: 12, fontWeight: '600', color: '#0F6E56' },
  parentEmailText: { fontSize: 10, color: '#10b981' },
  clearParentBtn: { padding: 2 },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6F1FB',
    borderRadius: 12,
    backgroundColor: '#F4F8FD',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#2C2C2A' },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#E6F1FB',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginTop: 4,
    maxHeight: 150,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E6F1FB',
  },
  suggestionName: { fontSize: 12, fontWeight: '600', color: '#2C2C2A' },
  suggestionEmail: { fontSize: 10, color: '#888780' },
  noSuggestionText: { padding: 12, fontSize: 11, color: '#888780', fontStyle: 'italic', textAlign: 'center' },

  formButtons: { flexDirection: 'row', gap: 7, marginTop: 12 },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', alignItems: 'center' },
  btnSecondaryText: { color: '#A32D2D', fontSize: 13, fontWeight: '600' },
  btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});

const selStyles = StyleSheet.create({
  container:          { marginBottom: 0 },
  label:              { fontSize: 11, fontWeight: '600', color: '#2C2C2A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  trigger:            { borderWidth: 1, borderColor: '#E6F1FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F4F8FD', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
