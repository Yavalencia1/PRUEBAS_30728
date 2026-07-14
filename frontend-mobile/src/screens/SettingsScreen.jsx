import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
  };

  const handleLocationToggle = (value) => {
    setLocationEnabled(value);
  };

  const handleBiometricToggle = (value) => {
    setBiometricEnabled(value);
  };

  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    Alert.alert('Modo Oscuro', 'Esta funcionalidad estará disponible próximamente');
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar Caché',
      '¿Estás seguro que deseas limpiar los datos en caché?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Limpiar',
          onPress: () => {
            Alert.alert('✅', 'Caché limpiado correctamente');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Política de Privacidad', 'Consulta nuestra política de privacidad en www.routekids.com');
  };

  const handleTermsOfService = () => {
    Alert.alert('Términos de Servicio', 'Consulta nuestros términos de servicio en www.routekids.com');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Notificaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Notificaciones Habilitadas</Text>
            <Text style={styles.settingDescription}>
              Recibe alertas de asistencia, pagos y avisos importantes
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#cbd5e0', true: '#a5f3fc' }}
            thumbColor={notificationsEnabled ? '#06b6d4' : '#e2e8f0'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Ubicación en Tiempo Real</Text>
            <Text style={styles.settingDescription}>
              Permite el tracking GPS del autobús (solo padres)
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#cbd5e0', true: '#a5f3fc' }}
            thumbColor={locationEnabled ? '#06b6d4' : '#e2e8f0'}
          />
        </View>
      </View>

      {/* Seguridad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Autenticación Biométrica</Text>
            <Text style={styles.settingDescription}>
              Usa huella dactilar o reconocimiento facial
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: '#cbd5e0', true: '#a5f3fc' }}
            thumbColor={biometricEnabled ? '#06b6d4' : '#e2e8f0'}
          />
        </View>
      </View>

      {/* Apariencia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apariencia</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Modo Oscuro</Text>
            <Text style={styles.settingDescription}>
              Próximamente disponible
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: '#cbd5e0', true: '#a5f3fc' }}
            thumbColor={darkMode ? '#06b6d4' : '#e2e8f0'}
            disabled
          />
        </View>
      </View>

      {/* Almacenamiento */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Almacenamiento</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>🗑️ Limpiar Caché</Text>
            <Text style={styles.actionButtonDescription}>
              Libera espacio eliminando archivos temporales
            </Text>
          </View>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handlePrivacyPolicy}>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Política de Privacidad</Text>
          </View>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleTermsOfService}>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Términos de Servicio</Text>
          </View>
          <Text style={styles.actionButtonArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Información de la App */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión de la App</Text>
            <Text style={styles.infoValue}>3.0.1</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Compilación</Text>
            <Text style={styles.infoValue}>2024.001</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
  },
  settingRow: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#718096',
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  actionButtonDescription: {
    fontSize: 12,
    color: '#718096',
  },
  actionButtonArrow: {
    fontSize: 18,
    color: '#cbd5e0',
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#718096',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a202c',
    fontWeight: '600',
  },
});
