import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { usuario, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar' },
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header con avatar */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: getRolColor(usuario?.rol) }]}>
          <Text style={styles.avatarText}>{getInitials(usuario?.nombre)}</Text>
        </View>
        <Text style={styles.userName}>{usuario?.nombre}</Text>
        <Text style={styles.userRole}>{getRolLabel(usuario?.rol)}</Text>
      </View>

      {/* Información Personal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>

        <InfoRow label="Nombre"             value={usuario?.nombre} />
        <InfoRow label="Correo Electrónico" value={usuario?.email} />
        {usuario?.apellido  && <InfoRow label="Apellido" value={usuario.apellido} />}
        {usuario?.telefono  && <InfoRow label="Teléfono" value={usuario.telefono} />}
        <InfoRow label="Rol"  value={getRolLabel(usuario?.rol)} />
        {usuario?.id && (
          <InfoRow
            label="ID"
            value={String(usuario.id)}
            valueStyle={{ fontSize: 11, fontFamily: 'monospace' }}
          />
        )}
      </View>

      {/* Seguridad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
          <Text style={styles.actionButtonIcon}>🔐</Text>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Cambiar Contraseña</Text>
            <Text style={styles.actionButtonSubtitle}>Actualiza tu contraseña de forma segura</Text>
          </View>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sobre la App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre la Aplicación</Text>
        <InfoRow label="Aplicación" value="RouteKids Mobile" />
        <InfoRow label="Versión"    value="1.0.0" />
      </View>

      {/* Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Sub-componente ────────────────────────────────────────────────────────────

function InfoRow({ label, value, valueStyle }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
      </View>
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
  container:            { flex: 1, backgroundColor: '#f8f9fa' },

  header:               { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 32, alignItems: 'center' },
  avatar:               { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText:           { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  userName:             { fontSize: 22, fontWeight: 'bold', color: '#1a202c', marginBottom: 4 },
  userRole:             { fontSize: 14, color: '#6366f1', fontWeight: '600' },

  section:              { paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle:         { fontSize: 16, fontWeight: '600', color: '#1a202c', marginBottom: 12 },

  infoCard:             { backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  infoRow:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel:            { fontSize: 14, color: '#718096' },
  infoValue:            { fontSize: 14, color: '#1a202c', fontWeight: '600', flex: 1, textAlign: 'right' },

  actionButton:         { backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  actionButtonIcon:     { fontSize: 20, marginRight: 12 },
  actionButtonContent:  { flex: 1 },
  actionButtonTitle:    { fontSize: 14, fontWeight: '600', color: '#1a202c', marginBottom: 2 },
  actionButtonSubtitle: { fontSize: 12, color: '#718096' },
  actionButtonArrow:    { fontSize: 18, color: '#cbd5e0' },

  logoutButton:         { marginHorizontal: 16, marginTop: 24, marginBottom: 16, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  logoutButtonText:     { color: '#ffffff', fontWeight: '600', fontSize: 16 },
});
