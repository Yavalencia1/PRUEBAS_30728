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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  validateNombre,
  validateApellido,
  validateEmail,
  validateTelefono,
  validatePassword,
  validateConfirmarPassword,
} from '../../utils/validation';

export default function ConductoresScreen() {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();
  const canDelete = rol === 'admin';
  const canCreate = rol === 'admin';

  const [view, setView] = useState('list'); // 'list' o 'register'
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const emptyForm = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmar_password: '',
    placa: '',
    numero_ruta: '',
    nombre_ruta: '',
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
      const result = await api.usuarios.listByRol('conductor');
      if (result.ok && Array.isArray(result.data)) {
        setConductores(result.data);
      } else {
        setConductores([]);
        if (!result.ok) setError(result.mensaje || 'Error al cargar conductores.');
      }
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSimulatePhoto = () => {
    const mockPhotos = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    ];
    const index = (formData.nombre.length || 0) % 2;
    handleInputChange('fotografia', mockPhotos[index]);
    Alert.alert('Foto Cargada', 'Se ha adjuntado la fotografía del conductor con su uniforme.');
  };

  const handleCreate = async () => {
    // Validaciones
    const errorNombre = validateNombre(formData.nombre);
    if (errorNombre) { Alert.alert('Error', `Nombre: ${errorNombre}`); return; }

    const errorApellido = validateApellido(formData.apellido);
    if (errorApellido) { Alert.alert('Error', `Apellido: ${errorApellido}`); return; }

    const errorEmail = validateEmail(formData.email);
    if (errorEmail) { Alert.alert('Error', `Correo: ${errorEmail}`); return; }

    const errorTelefono = validateTelefono(formData.telefono);
    if (errorTelefono) { Alert.alert('Error', `Teléfono: ${errorTelefono}`); return; }

    const errorPassword = validatePassword(formData.password);
    if (errorPassword) { Alert.alert('Error', `Contraseña: ${errorPassword}`); return; }

    const errorConfirmar = validateConfirmarPassword(formData.password, formData.confirmar_password);
    if (errorConfirmar) { Alert.alert('Error', `Confirmación: ${errorConfirmar}`); return; }

    if (!formData.placa.trim()) {
      Alert.alert('Error', 'La placa del vehículo es requerida.');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        email: formData.email.toLowerCase().trim(),
        telefono: formData.telefono.trim(),
        password: formData.password,
        confirmar_password: formData.confirmar_password,
        rol: 'conductor',
        placa: formData.placa.trim().toUpperCase(),
        numero_ruta: formData.numero_ruta.trim() || null,
        nombre_ruta: formData.nombre_ruta.trim() || null,
        fotografia: formData.fotografia || null,
      };

      const result = await api.auth.registro(payload);
      if (result.ok) {
        setView('list');
        setFormData(emptyForm);
        fetchDatos();
        Alert.alert('✅ Éxito', 'Conductor registrado correctamente.');
      } else {
        Alert.alert('Error', result.mensaje || 'Error al registrar conductor.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Error de conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (conductor) => {
    Alert.alert(
      'Eliminar Conductor',
      `¿Estás seguro de eliminar a "${conductor.nombre} ${conductor.apellido}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.usuarios.delete(conductor.id);
              if (result.ok) {
                fetchDatos();
                Alert.alert('✅', 'Conductor eliminado correctamente.');
              } else {
                Alert.alert('Error', result.mensaje || 'No se pudo eliminar el conductor.');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el conductor.');
            }
          },
        },
      ]
    );
  };

  const renderConductor = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Image
          source={{ uri: item.fotografia || 'https://via.placeholder.com/100?text=Conductor' }}
          style={styles.driverImage}
        />
        <View style={styles.cardInfoCol}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.nombre} {item.apellido}
          </Text>
          <Text style={styles.cardSubtitleText}>
            Contacto: {item.telefono || 'No registrado'}
          </Text>
          <Text style={styles.cardSubtitleText}>
            Vehículo: Placa {item.placa || 'N/A'}
          </Text>
          <View style={styles.badgeRow}>
            {item.nombre_ruta ? (
              <View style={styles.badgeInfo}>
                <Ionicons name="bus-outline" size={10} color="#0C447C" style={{ marginRight: 2 }} />
                <Text style={styles.badgeInfoText} numberOfLines={1}>
                  Ruta {item.numero_ruta || '#'}: {item.nombre_ruta}
                </Text>
              </View>
            ) : (
              <View style={styles.badgeNeutral}>
                <Text style={styles.badgeNeutralText}>Sin ruta asignada</Text>
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

  if (loading && conductores.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
        <Text style={styles.loadingText}>Cargando conductores…</Text>
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
        <Text style={[styles.breadcrumbLink, view === 'list' && styles.breadcrumbActive]} onPress={() => setView('list')}>Conductores</Text>
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
              <Text style={styles.title}>Conductores Registrados</Text>
              <Text style={styles.subtitle}>Listado oficial de transportistas y vehículos</Text>
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

          {conductores.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={32} color="#B4B2A9" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>No hay conductores registrados en el sistema.</Text>
            </View>
          ) : (
            <FlatList
              data={conductores}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderConductor}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      ) : (
        // ─── VISTA REGISTRO (Estilo Migajas) ──────────────────────────────────
        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>Registrar Nuevo Conductor</Text>
          <Text style={styles.formSubtitle}>Ingresa la información personal y los datos del vehículo de transporte.</Text>

          {/* Foto del Conductor */}
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: formData.fotografia || 'https://via.placeholder.com/150?text=Foto+Conductor' }}
              style={styles.uploadImagePreview}
            />
            <TouchableOpacity style={styles.photoButton} onPress={handleSimulatePhoto}>
              <Ionicons name="camera-outline" size={16} color="#185FA5" style={{ marginRight: 6 }} />
              <Text style={styles.photoButtonText}>Fotografía del Conductor</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del conductor"
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
              placeholder="Apellido del conductor"
              placeholderTextColor="#9ca3af"
              value={formData.apellido}
              onChangeText={(val) => handleInputChange('apellido', val)}
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo Electrónico *</Text>
            <TextInput
              style={styles.input}
              placeholder="ejemplo@routekids.com"
              placeholderTextColor="#9ca3af"
              value={formData.email}
              onChangeText={(val) => handleInputChange('email', val)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Teléfono Móvil * (10 dígitos)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 0979692167"
              placeholderTextColor="#9ca3af"
              value={formData.telefono}
              onChangeText={(val) => handleInputChange('telefono', val)}
              keyboardType="number-pad"
              maxLength={10}
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mín. 8 caracteres (Mayús, Núm, Especial)"
              placeholderTextColor="#9ca3af"
              value={formData.password}
              onChangeText={(val) => handleInputChange('password', val)}
              secureTextEntry
              autoCapitalize="none"
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirma la contraseña"
              placeholderTextColor="#9ca3af"
              value={formData.confirmar_password}
              onChangeText={(val) => handleInputChange('confirmar_password', val)}
              secureTextEntry
              autoCapitalize="none"
              editable={!submitLoading}
            />
          </View>

          {/* Información del Vehículo */}
          <Text style={styles.sectionHeader}>Información del Vehículo</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Número de Placa *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. ABC-1234 o PBX-9876"
              placeholderTextColor="#9ca3af"
              value={formData.placa}
              onChangeText={(val) => handleInputChange('placa', val)}
              autoCapitalize="characters"
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Número de Ruta Asignada</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 5"
              placeholderTextColor="#9ca3af"
              value={formData.numero_ruta}
              onChangeText={(val) => handleInputChange('numero_ruta', val)}
              keyboardType="number-pad"
              editable={!submitLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre de la Ruta Asignada</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Ruta Cumbayá Directo"
              placeholderTextColor="#9ca3af"
              value={formData.nombre_ruta}
              onChangeText={(val) => handleInputChange('nombre_ruta', val)}
              editable={!submitLoading}
            />
          </View>

          {/* Botones del formulario */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                setView('list');
                setFormData(emptyForm);
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
                <Text style={styles.btnPrimaryText}>Registrar Conductor</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

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
  driverImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#F4F8FD',
  },
  cardInfoCol: {
    flex: 1,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#2C2C2A', marginBottom: 2 },
  cardSubtitleText: { fontSize: 10, color: '#888780', marginTop: 1 },
  badgeRow: { marginTop: 4, flexDirection: 'row', gap: 6 },
  badgeInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F1FB', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8, maxWidth: 180 },
  badgeInfoText: { color: '#0C447C', fontSize: 8, fontWeight: '600' },
  badgeNeutral: { backgroundColor: '#FCEBEB', paddingVertical: 1.5, paddingHorizontal: 6, borderRadius: 8 },
  badgeNeutralText: { color: '#A32D2D', fontSize: 8, fontWeight: '600' },

  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
    flex: 0.15,
  },
  cardId: { fontSize: 10, fontWeight: '600', color: '#888780' },
  deleteBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', justifyContent: 'center', alignItems: 'center' },

  // Formulario
  formContainer: { paddingHorizontal: 12, paddingVertical: 12 },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#2C2C2A', marginBottom: 2 },
  formSubtitle: { fontSize: 11, color: '#888780', marginBottom: 16 },

  photoContainer: { alignItems: 'center', marginBottom: 16 },
  uploadImagePreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F4F8FD', borderWidth: 0.5, borderColor: '#E6F1FB', marginBottom: 8 },
  photoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F1FB', borderWidth: 0.5, borderColor: '#B5D4F4', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  photoButtonText: { color: '#185FA5', fontSize: 11, fontWeight: '600' },

  formGroup: { marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '600', color: '#2C2C2A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#E6F1FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#2C2C2A', backgroundColor: '#F4F8FD' },

  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#185FA5', marginTop: 16, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  formButtons: { flexDirection: 'row', gap: 7, marginTop: 12 },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FCEBEB', borderWidth: 0.5, borderColor: '#fca5a5', alignItems: 'center' },
  btnSecondaryText: { color: '#A32D2D', fontSize: 13, fontWeight: '600' },
  btnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#185FA5', alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
