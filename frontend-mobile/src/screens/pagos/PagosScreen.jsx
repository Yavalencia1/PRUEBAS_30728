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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';

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
        data = await api.pagos.list(filtro, usuario.id);
      } else {
        data = await api.pagos.list(filtro);
      }

      const payload = data?.ok !== false ? (data?.data || data || []) : [];
      setPagos(Array.isArray(payload) ? payload : []);

      // Cargar resumen
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
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
          <Ionicons name="alert-circle-outline" size={16} color="#A32D2D" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Resumen en cards compactas */}
      {resumen && filtro === 'pendiente' && (
        <View style={styles.resumenSection}>
          <View style={styles.resumenGrid}>
            <ResumenCard
              label="Pendientes"
              value={resumen.pendiente_count || 0}
              total={resumen.pendiente_total || 0}
              type="pendiente"
            />
            <ResumenCard
              label="Pagados"
              value={resumen.pagado_count || 0}
              total={resumen.pagado_total || 0}
              type="pagado"
            />
          </View>
          <ResumenCard
            label="Vencidos"
            value={resumen.vencido_count || 0}
            total={resumen.vencido_total || 0}
            type="vencido"
          />
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {filterOptions.map((opt) => {
            const active = filtro === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                onPress={() => setFiltro(opt.value)}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {pagos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={28} color="#B4B2A9" style={{ marginBottom: 6 }} />
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

function ResumenCard({ label, value, total, type }) {
  const getTheme = () => {
    switch (type) {
      case 'pendiente':
        return { bg: '#FAEEDA', border: '#EF9F27', numColor: '#EF9F27', icon: 'time-outline', textDark: '#854F0B' };
      case 'pagado':
        return { bg: '#E1F5EE', border: '#1D9E75', numColor: '#1D9E75', icon: 'checkmark-circle-outline', textDark: '#0F6E56' };
      case 'vencido':
        return { bg: '#FCEBEB', border: '#E24B4A', numColor: '#E24B4A', icon: 'alert-circle-outline', textDark: '#A32D2D' };
      default:
        return { bg: '#E6F1FB', border: '#0C447C', numColor: '#0C447C', icon: 'card-outline', textDark: '#0C447C' };
    }
  };
  const theme = getTheme();

  if (type === 'vencido') {
    return (
      <View style={[styles.resumenCardFull, { backgroundColor: theme.bg, borderLeftColor: theme.border, borderLeftWidth: 3 }]}>
        <View style={styles.resumenHorizontal}>
          <View style={[styles.statIconContainerSquare, { backgroundColor: '#ffffff' }]}>
            <Ionicons name={theme.icon} size={14} color={theme.numColor} />
          </View>
          <View style={styles.resumenInfoCol}>
            <Text style={styles.resumenLabelSmall}>{label}</Text>
            <Text style={[styles.resumenNum, { color: theme.numColor }]}>{value} cuotas</Text>
          </View>
          <Text style={[styles.resumenMontoSmall, { color: theme.textDark }]}>${total.toFixed(2)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.resumenCardHalf, { backgroundColor: theme.bg, borderLeftColor: theme.border, borderLeftWidth: 3 }]}>
      <View style={styles.resumenCardHeader}>
        <View style={[styles.statIconContainerSquare, { backgroundColor: '#ffffff' }]}>
          <Ionicons name={theme.icon} size={14} color={theme.numColor} />
        </View>
        <Text style={[styles.resumenNum, { color: theme.numColor }]}>{value}</Text>
      </View>
      <Text style={styles.resumenLabelSmall}>{label}</Text>
      <Text style={[styles.resumenMontoSmall, { color: theme.textDark }]}>${total.toFixed(2)}</Text>
    </View>
  );
}

function PagoCard({ pago, canUpdate, canDelete, onMarcarPagado, onMarcarNoPagado, onDelete }) {
  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getMontoColor = (estado) => {
    const colors = {
      pendiente: '#854F0B',
      pagado: '#0F6E56',
      vencido: '#A32D2D',
    };
    return colors[estado] || '#2C2C2A';
  };

  return (
    <View style={styles.pagoCard}>
      <View style={styles.pagoLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(pago.alumno?.nombre)}</Text>
        </View>
        <View style={styles.pagoInfoCol}>
          <Text style={styles.alumnoNombre} numberOfLines={1} ellipsizeMode="tail">
            {pago.alumno?.nombre || 'Alumno'} {pago.alumno?.apellido || ''}
          </Text>
          <Text style={styles.pagoMes} numberOfLines={1} ellipsizeMode="tail">
            {pago.concepto || 'Mensualidad Ruta'}
          </Text>
        </View>
      </View>

      <View style={styles.pagoRight}>
        <View style={styles.pagoMontoCol}>
          <Text style={[styles.pagoMonto, { color: getMontoColor(pago.estado) }]}>
            ${pago.monto?.toFixed(2)}
          </Text>
          <StatusBadge estado={pago.estado} />
        </View>

        {/* Botones de acción si es admin/dueño */}
        {(canUpdate || canDelete) && (
          <View style={styles.actionsRow}>
            {canUpdate && pago.estado === 'pendiente' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onMarcarPagado(pago)}
              >
                <Ionicons name="checkmark" size={14} color="#0F6E56" />
              </TouchableOpacity>
            )}
            {canUpdate && pago.estado === 'pagado' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}
                onPress={() => onMarcarNoPagado(pago)}
              >
                <Ionicons name="arrow-undo-outline" size={14} color="#b45309" />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FCEBEB', borderColor: '#fca5a5' }]}
                onPress={() => onDelete(pago)}
              >
                <Ionicons name="trash-outline" size={14} color="#A32D2D" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  errorContainer: { marginHorizontal: 12, marginTop: 12, backgroundColor: '#FCEBEB', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: '#E6F1FB', flexDirection: 'row', alignItems: 'center' },
  errorText: { color: '#A32D2D', fontSize: 11, fontWeight: '500' },

  resumenSection: { paddingHorizontal: 12, paddingTop: 12, gap: 7 },
  resumenGrid: { flexDirection: 'row', gap: 7 },
  resumenCardHalf: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: '#E6F1FB' },
  resumenCardFull: { width: '100%', borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: '#E6F1FB' },
  resumenHorizontal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumenInfoCol: { flex: 1, marginLeft: 10 },
  statIconContainerSquare: { width: 26, height: 26, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  resumenNum: { fontSize: 16, fontWeight: '700' },
  resumenLabelSmall: { fontSize: 9, color: '#888780', marginTop: 2 },
  resumenMontoSmall: { fontSize: 10, fontWeight: '500' },

  filterContainer: { marginHorizontal: 12, marginTop: 12 },
  chipsScroll: { gap: 6 },
  chip: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  chipActive: { backgroundColor: '#185FA5', borderColor: '#185FA5' },
  chipInactive: { backgroundColor: '#ffffff', borderColor: '#B5D4F4' },
  chipText: { fontSize: 11 },
  chipTextActive: { color: '#ffffff', fontWeight: '500' },
  chipTextInactive: { color: '#185FA5' },

  listContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 7 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 11, color: '#888780' },

  pagoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#0C447C',
    fontSize: 10,
    fontWeight: '700',
  },
  pagoInfoCol: {
    flex: 1,
  },
  alumnoNombre: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2C2C2A',
  },
  pagoMes: {
    fontSize: 9,
    color: '#888780',
    marginTop: 2,
  },
  pagoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 0.4,
    gap: 8,
  },
  pagoMontoCol: {
    alignItems: 'flex-end',
  },
  pagoMonto: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E1F5EE',
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
