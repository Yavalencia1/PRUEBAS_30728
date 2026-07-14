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
  Modal,
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Selector nativo (sin @react-native-picker/picker) ───────────────────────

function SimpleSelector({ label, options, selectedValue, onValueChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === selectedValue);
  return (
    <View style={selStyles.container}>
      {label ? <Text style={selStyles.label}>{label}</Text> : null}
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
            {label ? <Text style={selStyles.sheetTitle}>{label}</Text> : null}
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

export default function PagosScreen() {
  const { usuario } = useAuth();
  const rol = usuario?.rol?.toLowerCase();

  // ADMIN puede eliminar. DUEÑO/ADMIN pueden actualizar estado.
  const canDelete = rol === 'admin';
  const canUpdate = rol === 'admin' || rol === 'dueno';

  const [pagos, setPagos] = useState([]);
  const [filtro, setFiltro] = useState('pendiente');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    loadPagos();
  }, [filtro]);

  const loadPagos = async () => {
    try {
      setLoading(true);
      setError(null);

      // El backend filtra según el rol/ID, pero enviamos el padre_id si es padre
      let data;
      if (rol === 'padre') {
        // En api.js el método es list(estado, padreId)
        data = await api.pagos.list(filtro, usuario.id);
      } else {
        data = await api.pagos.list(filtro);
      }

      const payload = data?.ok !== false ? (data?.data || data || []) : [];
      setPagos(Array.isArray(payload) ? payload : []);

      // Cargar resumen (opcional, si el backend lo soporta para padres/dueños)
      if (filtro === 'pendiente') {
        const summary = await api.pagos.resumen();
        if (summary && summary.ok !== false) {
          setResumen(summary);
        }
      }
    } catch (err) {
      console.error('Error loading pagos:', err);
      setError('No se pudieron cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPagos();
    setRefreshing(false);
  };

  const handleMarcarPagado = async (pago) => {
    if (!canUpdate) return;
    try {
      const result = await api.pagos.marcarPagado(pago.id);
      if (result && result.ok === false) {
        Alert.alert('Error', result.mensaje || 'No se pudo actualizar el pago');
        return;
      }
      loadPagos();
      Alert.alert('✅', 'Pago registrado');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el pago');
    }
  };

  const handleMarcarNoPagado = async (pago) => {
    if (!canUpdate) return;
    try {
      const result = await api.pagos.marcarNoPagado(pago.id);
      if (result && result.ok === false) {
        Alert.alert('Error', result.mensaje || 'No se pudo actualizar el pago');
        return;
      }
      loadPagos();
      Alert.alert('✅', 'Pago revertido a pendiente');
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el pago');
    }
  };

  const handleDelete = async (pago) => {
    if (!canDelete) return;
    Alert.alert('Eliminar', '¿Está seguro que deseas eliminar este pago?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await api.pagos.delete(pago.id);
            if (result && result.ok === false) {
              Alert.alert('Error', result.mensaje || 'No se pudo eliminar el pago');
              return;
            }
            loadPagos();
            Alert.alert('✅', 'Pago eliminado');
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar el pago');
          }
        },
      },
    ]);
  };

  if (loading && !pagos.length) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const filterOptions = [
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
    { value: 'vencido', label: 'Vencidos' },
    { value: 'todos', label: 'Todos' },
  ];

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Resumen */}
      {resumen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.resumenContainer}
        >
          <ResumenCard
            label="Pendientes"
            value={resumen.pendiente_count || 0}
            total={resumen.pendiente_total || 0}
            color="#f59e0b"
            icon="⏰"
          />
          <ResumenCard
            label="Pagados"
            value={resumen.pagado_count || 0}
            total={resumen.pagado_total || 0}
            color="#10b981"
            icon="✅"
          />
          <ResumenCard
            label="Vencidos"
            value={resumen.vencido_count || 0}
            total={resumen.vencido_total || 0}
            color="#ef4444"
            icon="⚠️"
          />
        </ScrollView>
      )}

      {/* Filtro */}
      <View style={styles.filterContainer}>
        <SimpleSelector
          options={filterOptions}
          selectedValue={filtro}
          onValueChange={setFiltro}
        />
      </View>

      {pagos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyText}>No hay pagos en este filtro</Text>
        </View>
      ) : (
        <FlatList
          data={pagos}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <PagoCard
              pago={item}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onMarcarPagado={handleMarcarPagado}
              onMarcarNoPagado={handleMarcarNoPagado}
              onDelete={handleDelete}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function ResumenCard({ label, value, total, color, icon }) {
  return (
    <View style={[styles.resumenCard, { borderLeftColor: color }]}>
      <Text style={styles.resumenIcon}>{icon}</Text>
      <Text style={styles.resumenLabel}>{label}</Text>
      <Text style={[styles.resumenValue, { color }]}>{value}</Text>
      <Text style={styles.resumenTotal}>${total.toFixed(2)}</Text>
    </View>
  );
}

function PagoCard({ pago, canUpdate, canDelete, onMarcarPagado, onMarcarNoPagado, onDelete }) {
  const getFechaVencimiento = () => {
    if (!pago.fecha_vencimiento) return 'Sin fecha';
    const date = new Date(pago.fecha_vencimiento);
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };

  const getEstadoColor = (estado) => {
    const colors = {
      pendiente: '#f59e0b',
      pagado: '#10b981',
      vencido: '#ef4444',
    };
    return colors[estado] || '#6366f1';
  };

  return (
    <View style={styles.pagoCard}>
      <View
        style={[
          styles.pagoEstadoBorder,
          { borderLeftColor: getEstadoColor(pago.estado) },
        ]}
      >
        <View style={styles.pagoContent}>
          <View style={styles.pagoHeader}>
            <Text style={styles.pagoConcepto}>{pago.concepto || 'Pago'}</Text>
            <Text style={styles.pagoMonto}>${pago.monto?.toFixed(2)}</Text>
          </View>

          {pago.alumno?.nombre && (
            <Text style={styles.pagoAlumno}>👨‍👧 {pago.alumno.nombre}</Text>
          )}

          <View style={styles.pagoDetails}>
            <Text style={styles.pagoDetalle}>
              📅 Vencimiento: {getFechaVencimiento()}
            </Text>
            <Text style={[styles.pagoEstado, { color: getEstadoColor(pago.estado) }]}>
              {pago.estado.toUpperCase()}
            </Text>
          </View>
        </View>

        {canUpdate && pago.estado === 'pendiente' && (
          <TouchableOpacity
            style={styles.pagoActionButton}
            onPress={() => onMarcarPagado(pago)}
          >
            <Text style={styles.pagoActionIcon}>✓</Text>
          </TouchableOpacity>
        )}

        {canUpdate && pago.estado === 'pagado' && (
          <TouchableOpacity
            style={[styles.pagoActionButton, { backgroundColor: '#fef3c7' }]}
            onPress={() => onMarcarNoPagado(pago)}
          >
            <Text style={styles.pagoActionIcon}>↶</Text>
          </TouchableOpacity>
        )}
      </View>

      {canDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(pago)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  errorContainer: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  errorText: { color: '#991b1b', fontSize: 14 },
  resumenContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, maxHeight: 120 },
  resumenCard: { backgroundColor: '#ffffff', borderRadius: 8, padding: 12, borderLeftWidth: 4, minWidth: 140, alignItems: 'center' },
  resumenIcon: { fontSize: 24, marginBottom: 4 },
  resumenLabel: { fontSize: 12, color: '#718096', marginBottom: 4 },
  resumenValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  resumenTotal: { fontSize: 11, color: '#a0aec0' },
  filterContainer: { marginHorizontal: 16, marginVertical: 4 },
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1a202c' },
  pagoCard: { backgroundColor: '#ffffff', borderRadius: 8, marginBottom: 12, overflow: 'hidden', flexDirection: 'row' },
  pagoEstadoBorder: { flex: 1, borderLeftWidth: 4, padding: 12, flexDirection: 'row', alignItems: 'center' },
  pagoContent: { flex: 1 },
  pagoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pagoConcepto: { fontSize: 14, fontWeight: '600', color: '#1a202c' },
  pagoMonto: { fontSize: 14, fontWeight: 'bold', color: '#1a202c' },
  pagoAlumno: { fontSize: 12, color: '#718096', marginBottom: 6 },
  pagoDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  pagoDetalle: { fontSize: 11, color: '#a0aec0' },
  pagoEstado: { fontSize: 11, fontWeight: '600' },
  pagoActionButton: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  pagoActionIcon: { fontSize: 16, color: '#10b981', fontWeight: 'bold' },
  deleteButton: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 8, alignSelf: 'center' },
  deleteIcon: { fontSize: 18 },
});

const selStyles = StyleSheet.create({
  container:          { marginBottom: 8 },
  label:              { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  trigger:            { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled:           { opacity: 0.5 },
  triggerText:        { fontSize: 14, color: '#1f2937', flex: 1 },
  arrow:              { fontSize: 12, color: '#9ca3af' },
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40, maxHeight: '60%' },
  sheetTitle:         { fontSize: 16, fontWeight: '700', color: '#1a202c', marginBottom: 12 },
  option:             { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionSelected:     { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 8 },
  optionText:         { fontSize: 15, color: '#1a202c' },
  optionTextSelected: { color: '#6366f1', fontWeight: '600' },
});
