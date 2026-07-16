import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function DashboardScreen() {
  const { usuario, logout } = useAuth();
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats]         = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => {
    loadStats();
  }, [usuario?.rol]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      if (usuario?.rol === 'padre') {
        const pagosResumen = await api.pagos.resumen();
        setStats({ type: 'padre', pagosResumen });

      } else if (usuario?.rol === 'conductor') {
        try {
          const sesionActiva = await api.sesiones.getActiva();
          setStats({ type: 'conductor', sesionActiva: sesionActiva?.data || null });
        } catch {
          setStats({ type: 'conductor', sesionActiva: null });
        }

      } else if (usuario?.rol === 'dueno') {
        const recorridos = await api.recorridos.list();
        setStats({
          type: 'dueno',
          recorridosCount: recorridos?.data?.length || 0,
        });

      } else if (usuario?.rol === 'admin') {
        const [alumnos, recorridos, rutas] = await Promise.all([
          api.alumnos.list().catch(() => ({ data: [] })),
          api.recorridos.list().catch(() => ({ data: [] })),
          api.rutas.list().catch(() => ({ data: [] })),
        ]);
        setStats({
          type:            'admin',
          alumnosCount:    alumnos?.data?.length    || 0,
          recorridosCount: recorridos?.data?.length || 0,
          rutasCount:      rutas?.data?.length      || 0,
        });
      }
    } catch (err) {
      console.error('[Dashboard] Error loading stats:', err);
      setError('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', onPress: logout, style: 'destructive' },
    ]);
  };

  if (loading && !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#185FA5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Hero Card (perfil actual personalizado) */}
      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroWelcome}>¡Bienvenida de nuevo!</Text>
          <Text style={styles.heroName} numberOfLines={1} ellipsizeMode="tail">
            {usuario?.nombre}
          </Text>
          <View style={styles.heroBadge}>
            <Ionicons name="people" size={9} color="#B5D4F4" style={{ marginRight: 4 }} />
            <Text style={styles.heroRole}>{getRolLabel(usuario?.rol)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.heroLogout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
          <Text style={styles.heroLogoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color="#A32D2D" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Contenido dinámico según rol */}
      {stats?.type === 'padre'     && <PadreStats     stats={stats} />}
      {stats?.type === 'conductor' && <ConductorStats stats={stats} />}
      {stats?.type === 'dueno'     && <DuenoStats     stats={stats} />}
      {stats?.type === 'admin'     && <AdminStats     stats={stats} />}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Sub-componentes por rol ──────────────────────────────────────────────────

function PadreStats({ stats }) {
  const pagos = stats?.pagosResumen?.data || stats?.pagosResumen || {};
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Resumen de Pagos</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Pendientes" value={pagos.pendiente_count || 0} subtotal={`$${(pagos.pendiente_total || 0).toFixed(2)}`} iconName="time-outline" type="pendiente" />
        <StatCard label="Pagados"    value={pagos.pagado_count    || 0} subtotal={`$${(pagos.pagado_total    || 0).toFixed(2)}`} iconName="checkmark-circle-outline" type="pagado" />
        <StatCard label="Vencidos"   value={pagos.vencido_count   || 0} subtotal={`$${(pagos.vencido_total   || 0).toFixed(2)}`} iconName="alert-circle-outline" type="vencido" />
      </View>

      {/* Tip informativo */}
      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={13} color="#378ADD" style={{ marginRight: 6 }} />
        <Text style={styles.tipText}>Navega a la pestaña "Pagos" para gestionar tus cuotas.</Text>
      </View>
    </View>
  );
}

function ConductorStats({ stats }) {
  const sesion = stats?.sesionActiva;
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Mi Ruta Activa</Text>
      {sesion ? (
        <View style={styles.sessionCard}>
          <Text style={styles.sessionLabel}>Ruta Activa</Text>
          <Text style={styles.sessionValue}>{sesion.recorrido?.nombre}</Text>
          <View style={styles.sessionDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={14} color="#888780" style={{ marginRight: 6 }} />
              <Text style={styles.detailText}>{sesion.alumnos_count} alumnos asignados</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-done-circle-outline" size={14} color="#0F6E56" style={{ marginRight: 6 }} />
              <Text style={styles.detailText}>{sesion.asistencias_count} asistencias registradas</Text>
            </View>
          </View>
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={13} color="#378ADD" style={{ marginRight: 6 }} />
            <Text style={styles.tipText}>Ve a la pestaña "Mi Ruta" para gestionar la asistencia.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noDataCard}>
          <View style={styles.noDataHeader}>
            <Ionicons name="bus-outline" size={20} color="#A32D2D" style={{ marginRight: 6 }} />
            <Text style={styles.noDataText}>No hay ruta activa en este momento</Text>
          </View>
          <Text style={styles.noDataSubtext}>Las rutas se activan según el cronograma establecido por el transportista.</Text>
        </View>
      )}
    </View>
  );
}

function DuenoStats({ stats }) {
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Mi Negocio</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Recorridos" value={stats?.recorridosCount || 0} iconName="bus-outline" type="activo" />
      </View>
      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={13} color="#378ADD" style={{ marginRight: 6 }} />
        <Text style={styles.tipText}>Gestiona tus recorridos, rutas y paradas desde el menú lateral.</Text>
      </View>
    </View>
  );
}

function AdminStats({ stats }) {
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Sistema General</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Alumnos"    value={stats?.alumnosCount    || 0} iconName="people-outline" type="pendiente" />
        <StatCard label="Recorridos" value={stats?.recorridosCount || 0} iconName="bus-outline" type="activo" />
        <StatCard label="Rutas"      value={stats?.rutasCount      || 0} iconName="trail-sign-outline" type="default" />
      </View>
      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={13} color="#378ADD" style={{ marginRight: 6 }} />
        <Text style={styles.tipText}>Tienes acceso a todas las opciones de administración del sistema.</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value, subtotal, iconName, type }) {
  const getTheme = () => {
    switch (type) {
      case 'pendiente':
        return { iconBg: '#FAEEDA', iconColor: '#EF9F27', numColor: '#EF9F27', subtotalColor: '#854F0B' };
      case 'pagado':
        return { iconBg: '#E1F5EE', iconColor: '#1D9E75', numColor: '#1D9E75', subtotalColor: '#0F6E56' };
      case 'vencido':
        return { iconBg: '#FCEBEB', iconColor: '#E24B4A', numColor: '#E24B4A', subtotalColor: '#A32D2D' };
      case 'activo':
        return { iconBg: '#E6F1FB', iconColor: '#0C447C', numColor: '#0C447C', subtotalColor: '#0C447C' };
      default:
        return { iconBg: '#E6F1FB', iconColor: '#185FA5', numColor: '#185FA5', subtotalColor: '#2C2C2A' };
    }
  };
  const theme = getTheme();
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>
        <View style={[styles.statIconContainer, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconName} size={14} color={theme.iconColor} />
        </View>
        <Text style={[styles.statValue, { color: theme.numColor }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {subtotal ? <Text style={[styles.statSubtotal, { color: theme.subtotalColor }]}>{subtotal}</Text> : null}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRolLabel(rol) {
  const labels = { padre: 'Padre / Madre', conductor: 'Conductor', dueno: 'Dueño de Transporte', admin: 'Administrador' };
  return labels[rol?.toLowerCase()] || rol;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  heroCard: {
    backgroundColor: '#185FA5',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  heroWelcome: {
    fontSize: 10,
    color: '#B5D4F4',
    marginBottom: 2,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  heroRole: {
    fontSize: 9,
    color: '#E6F1FB',
  },
  heroLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroLogoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 4,
  },
  errorContainer: {
    backgroundColor: '#FCEBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: '#A32D2D',
    fontSize: 11,
    fontWeight: '500',
  },
  statsContainer: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2C2C2A',
    marginBottom: 7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    color: '#888780',
    marginBottom: 2,
  },
  statSubtotal: {
    fontSize: 10,
    fontWeight: '500',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FD',
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  tipText: {
    fontSize: 9,
    color: '#185FA5',
    flex: 1,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 12,
    marginBottom: 12,
  },
  sessionLabel: {
    fontSize: 9,
    color: '#888780',
    marginBottom: 2,
  },
  sessionValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C2C2A',
    marginBottom: 8,
  },
  sessionDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 11,
    color: '#2C2C2A',
  },
  noDataCard: {
    backgroundColor: '#FCEBEB',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 12,
    marginBottom: 12,
  },
  noDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noDataText: {
    fontSize: 11,
    color: '#A32D2D',
    fontWeight: '500',
  },
  noDataSubtext: {
    fontSize: 11,
    color: '#888780',
  },
});
