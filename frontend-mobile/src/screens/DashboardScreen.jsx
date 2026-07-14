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
      { text: 'Cancelar' },
      { text: 'Cerrar', onPress: logout, style: 'destructive' },
    ]);
  };

  if (loading && !stats) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header con info del usuario */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: getRolColor(usuario?.rol) }]}>
            <Text style={styles.avatarText}>{getInitials(usuario?.nombre)}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.welcomeText}>¡Bienvenido!</Text>
            <Text style={styles.userName}>{usuario?.nombre}</Text>
            <Text style={styles.userRole}>{getRolLabel(usuario?.rol)}</Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Contenido dinámico según rol */}
      {stats?.type === 'padre'     && <PadreStats     stats={stats} />}
      {stats?.type === 'conductor' && <ConductorStats stats={stats} />}
      {stats?.type === 'dueno'     && <DuenoStats     stats={stats} />}
      {stats?.type === 'admin'     && <AdminStats     stats={stats} />}

      {/* Botón de Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
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
        <StatCard label="Pendientes" value={pagos.pendiente_count || 0} subtotal={`$${(pagos.pendiente_total || 0).toFixed(2)}`} color="#f59e0b" icon="⏰" />
        <StatCard label="Pagados"    value={pagos.pagado_count    || 0} subtotal={`$${(pagos.pagado_total    || 0).toFixed(2)}`} color="#10b981" icon="✅" />
        <StatCard label="Vencidos"   value={pagos.vencido_count   || 0} subtotal={`$${(pagos.vencido_total   || 0).toFixed(2)}`} color="#ef4444" icon="⚠️" />
      </View>
      <Text style={styles.infoText}>Navega a la pestaña "Pagos" para gestionar tus cuotas.</Text>
    </View>
  );
}

function ConductorStats({ stats }) {
  const sesion = stats?.sesionActiva;
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Mi Ruta</Text>
      {sesion ? (
        <View style={styles.sessionCard}>
          <Text style={styles.cardLabel}>Ruta Activa</Text>
          <Text style={styles.cardValue}>{sesion.recorrido?.nombre}</Text>
          <View style={styles.sessionDetails}>
            <Text style={styles.detailText}>👥 {sesion.alumnos_count} alumnos</Text>
            <Text style={styles.detailText}>✅ {sesion.asistencias_count} asistencias</Text>
          </View>
          <Text style={styles.infoText}>Ve a la pestaña "Mi Ruta" para gestionar la asistencia.</Text>
        </View>
      ) : (
        <View style={styles.noDataCard}>
          <Text style={styles.noDataText}>No hay ruta activa en este momento</Text>
          <Text style={styles.infoText}>Las rutas se activan según el cronograma establecido.</Text>
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
        <StatCard label="Recorridos" value={stats?.recorridosCount || 0} color="#14b8a6" icon="🚌" />
      </View>
      <Text style={styles.infoText}>Gestiona tus recorridos, rutas y paradas desde el menú.</Text>
    </View>
  );
}

function AdminStats({ stats }) {
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Sistema General</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Alumnos"    value={stats?.alumnosCount    || 0} color="#f97316" icon="👨‍👧‍👦" />
        <StatCard label="Recorridos" value={stats?.recorridosCount || 0} color="#14b8a6" icon="🚌" />
        <StatCard label="Rutas"      value={stats?.rutasCount      || 0} color="#3b82f6" icon="🛣️" />
      </View>
      <Text style={styles.infoText}>Tienes acceso a todas las opciones de administración del sistema.</Text>
    </View>
  );
}

function StatCard({ label, value, subtotal, color, icon }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtotal && <Text style={styles.statSubtotal}>{subtotal}</Text>}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

function getRolColor(rol) {
  const colors = { padre: '#6366f1', conductor: '#14b8a6', dueno: '#f97316', admin: '#8b5cf6' };
  return colors[rol?.toLowerCase()] || '#6366f1';
}

function getRolLabel(rol) {
  const labels = { padre: '👨‍👩‍👧 Padre/Madre', conductor: '🚌 Conductor', dueno: '🏢 Dueño', admin: '⚙️ Administrador' };
  return labels[rol?.toLowerCase()] || rol;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8f9fa' },
  header:          { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 20 },
  userInfo:        { flexDirection: 'row', alignItems: 'center' },
  avatar:          { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText:      { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  userDetails:     { flex: 1 },
  welcomeText:     { fontSize: 12, color: '#a0aec0', marginBottom: 2 },
  userName:        { fontSize: 18, fontWeight: '600', color: '#1a202c', marginBottom: 2 },
  userRole:        { fontSize: 12, color: '#6366f1', fontWeight: '600' },

  statsContainer:  { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  sectionTitle:    { fontSize: 18, fontWeight: '600', color: '#1a202c', marginBottom: 16 },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },

  statCard:        { flex: 1, minWidth: '47%', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 8 },
  statIcon:        { fontSize: 28, marginBottom: 8 },
  statLabel:       { fontSize: 12, color: '#718096', marginBottom: 4 },
  statValue:       { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statSubtotal:    { fontSize: 12, color: '#a0aec0' },

  sessionCard:     { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardLabel:       { fontSize: 12, color: '#718096', marginBottom: 4 },
  cardValue:       { fontSize: 18, fontWeight: '600', color: '#1a202c', marginBottom: 12 },
  sessionDetails:  { gap: 8, marginBottom: 12 },
  detailText:      { fontSize: 14, color: '#4a5568' },

  noDataCard:      { backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#fecaca', marginBottom: 16 },
  noDataText:      { fontSize: 14, color: '#991b1b', fontWeight: '600', marginBottom: 8 },
  infoText:        { fontSize: 12, color: '#718096', fontStyle: 'italic' },

  errorContainer:  { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  errorText:       { color: '#991b1b', fontSize: 14 },

  logoutButton:    { marginHorizontal: 16, marginTop: 24, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  logoutButtonText:{ color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
