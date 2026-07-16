import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar', onPress: logout, style: 'destructive' },
    ]);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Cambiar Contraseña',
      'Esta funcionalidad estará disponible próximamente',
      [{ text: 'OK' }]
    );
  };

  if (!usuario) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header con avatar premium */}
      <View style={styles.headerCard}>
        {usuario?.fotografia ? (
          <Image source={{ uri: usuario.fotografia }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: getRolColor(usuario?.rol) }]}>
            <Text style={styles.avatarText}>{getInitials(usuario?.nombre)}</Text>
          </View>
        )}
        <Text style={styles.userName}>{usuario?.nombre} {usuario?.apellido || ''}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRolColorLight(usuario?.rol) }]}>
          <Ionicons name={getRolIcon(usuario?.rol)} size={14} color={getRolColor(usuario?.rol)} style={styles.roleIcon} />
          <Text style={[styles.userRole, { color: getRolColor(usuario?.rol) }]}>
            {getRolLabel(usuario?.rol)}
          </Text>
        </View>
      </View>

      {/* Información Personal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <InfoCard label="Nombre" value={usuario?.nombre} iconName="person-outline" />
        {usuario?.apellido && <InfoCard label="Apellido" value={usuario.apellido} iconName="person-outline" />}
        <InfoCard label="Correo Electrónico" value={usuario?.email} iconName="mail-outline" />
        {usuario?.telefono && <InfoCard label="Teléfono" value={usuario.telefono} iconName="call-outline" />}
        <InfoCard label="Rol en el Sistema" value={getRolLabel(usuario?.rol)} iconName="shield-checkmark-outline" />
        {usuario?.id && (
          <InfoCard
            label="ID de Usuario"
            value={String(usuario.id)}
            valueStyle={styles.monospaceValue}
            iconName="finger-print-outline"
          />
        )}
      </View>

      {/* Información del Vehículo (Solo Conductores) */}
      {usuario?.rol?.toLowerCase() === 'conductor' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Vehículo</Text>
          <InfoCard label="Número de Placa" value={usuario?.placa || 'No registrada'} iconName="card-outline" />
          {usuario?.numero_ruta && <InfoCard label="Número de Ruta" value={usuario.numero_ruta} iconName="trail-sign-outline" />}
          {usuario?.nombre_ruta && <InfoCard label="Nombre de la Ruta" value={usuario.nombre_ruta} iconName="navigate-outline" />}
        </View>
      )}

      {/* Seguridad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6366f1" />
          </View>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Cambiar Contraseña</Text>
            <Text style={styles.actionButtonSubtitle}>Actualiza tu contraseña periódicamente</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color="#a0aec0" />
        </TouchableOpacity>
      </View>

      {/* Sobre la App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <InfoCard label="Aplicación" value="RouteKids Mobile" iconName="apps-outline" />
        <InfoCard label="Versión" value="1.0.0" iconName="information-circle-outline" />
      </View>

      {/* Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButtonSecondary} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
        <Text style={styles.logoutButtonTextSecondary}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────────

function InfoCard({ label, value, valueStyle, iconName }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <Ionicons name={iconName} size={16} color="#718096" style={styles.infoCardIcon} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueStyle]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function getRolColor(rol) {
  const colors = { padre: '#6366f1', conductor: '#0d9488', dueno: '#ea580c', admin: '#7c3aed' };
  return colors[rol?.toLowerCase()] || '#6366f1';
}

function getRolColorLight(rol) {
  const colors = { padre: '#e0e7ff', conductor: '#ccfbf1', dueno: '#ffedd5', admin: '#f3e8ff' };
  return colors[rol?.toLowerCase()] || '#e0e7ff';
}

function getRolIcon(rol) {
  const icons = { padre: 'people-outline', conductor: 'bus-outline', dueno: 'business-outline', admin: 'settings-outline' };
  return icons[rol?.toLowerCase()] || 'person-outline';
}

function getRolLabel(rol) {
  const labels = { padre: 'Padre / Madre', conductor: 'Conductor', dueno: 'Dueño de Transporte', admin: 'Administrador' };
  return labels[rol?.toLowerCase()] || rol;
}

// ─── Estilos Premium y Responsivos ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginBottom: 12,
    backgroundColor: '#F4F8FD',
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  roleIcon: {
    marginRight: 6,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoCardIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#1a202c',
    fontWeight: '600',
    paddingLeft: 24,
  },
  monospaceValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#718096',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#718096',
  },
  logoutButtonSecondary: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutButtonTextSecondary: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 14,
  },
});
