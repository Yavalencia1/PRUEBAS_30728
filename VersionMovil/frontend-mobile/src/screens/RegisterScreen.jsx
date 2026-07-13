import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

// ─── Selector de rol táctil (reemplaza Picker nativo de RN ─────────────────────
// react-native eliminó <Picker> del core. Usamos botones táctiles.
const ROL_OPTIONS = [
  { label: '👨‍👩‍👧 Padre / Madre', value: 'padre' },
  { label: '🚌 Conductor',         value: 'conductor' },
  { label: '🏢 Dueño',             value: 'dueno' },
  { label: '⚙️ Administrador',     value: 'admin' },
];

function RolPicker({ value, onChange, disabled }) {
  return (
    <View style={styles.rolPickerContainer}>
      {ROL_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.rolOption, selected && styles.rolOptionSelected]}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
          >
            <Text style={[styles.rolOptionText, selected && styles.rolOptionTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Indicador de fortaleza de contraseña ─────────────────────────────────────

function calcularFortaleza(pass) {
  if (!pass) return { percent: 0, label: 'Vacía', color: '#cbd5e0' };
  let strength = 0;
  if (pass.length >= 8)                       strength += 25;
  if (/[A-Z]/.test(pass))                     strength += 25;
  if (/\d/.test(pass))                        strength += 25;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pass))   strength += 25;

  if (strength === 100) return { percent: 100, label: 'Fuerte',  color: '#38a169' };
  if (strength > 50)    return { percent: strength, label: 'Media', color: '#ed8936' };
  return                       { percent: strength, label: 'Débil', color: '#e53e3e' };
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre:             '',
    apellido:           '',
    email:              '',
    telefono:           '',
    password:           '',
    confirmar_password: '',
    rol:                'padre',
  });

  const [errorMsg, setErrorMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const { registro, isLoading } = useAuth();

  const passwordStrength = useMemo(
    () => calcularFortaleza(formData.password),
    [formData.password]
  );

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleRegister = useCallback(async () => {
    setErrorMsg(null);

    if (!formData.nombre.trim()) {
      setErrorMsg('Por favor, ingresa tu nombre.');
      return;
    }
    if (!formData.apellido.trim()) {
      setErrorMsg('Por favor, ingresa tu apellido.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Por favor, ingresa tu correo electrónico.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (formData.password !== formData.confirmar_password) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    if (!/^\d{10}$/.test(formData.telefono)) {
      setErrorMsg('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    const result = await registro(formData);

    if (result.success) {
      alert('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
      navigation.goBack();
    } else {
      setErrorMsg(result.error || 'Error al registrarse');
    }
  }, [formData, registro, navigation]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleGoBack} disabled={isLoading}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Regístrate completando tus datos personales</Text>
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          {/* Alerta de error */}
          {errorMsg && (
            <View style={styles.alertContainer}>
              <Text style={styles.alertIcon}>❌</Text>
              <Text style={styles.alertText}>{errorMsg}</Text>
            </View>
          )}

          {/* Nombre */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan"
                placeholderTextColor="#a0aec0"
                value={formData.nombre}
                onChangeText={(t) => handleInputChange('nombre', t)}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Apellido */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Apellido</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Pérez"
                placeholderTextColor="#a0aec0"
                value={formData.apellido}
                onChangeText={(t) => handleInputChange('apellido', t)}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="nombre@ejemplo.com"
                placeholderTextColor="#a0aec0"
                value={formData.email}
                onChangeText={(t) => handleInputChange('email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Teléfono */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Teléfono (10 dígitos)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>📱</Text>
              <TextInput
                style={styles.input}
                placeholder="1234567890"
                placeholderTextColor="#a0aec0"
                value={formData.telefono}
                onChangeText={(t) => handleInputChange('telefono', t)}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Rol — selector táctil (sin Picker nativo) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tipo de Rol</Text>
            <RolPicker
              value={formData.rol}
              onChange={(v) => handleInputChange('rol', v)}
              disabled={isLoading}
            />
          </View>

          {/* Contraseña */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#a0aec0"
                value={formData.password}
                onChangeText={(t) => handleInputChange('password', t)}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.iconButton}>
                <Text style={styles.iconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
            {formData.password ? (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      { width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  Fortaleza: {passwordStrength.label}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Confirmar Contraseña */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#a0aec0"
                value={formData.confirmar_password}
                onChangeText={(t) => handleInputChange('confirmar_password', t)}
                secureTextEntry
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && !isLoading && styles.cancelButtonPressed,
              ]}
              onPress={handleGoBack}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !isLoading && styles.submitButtonPressed,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Crear Cuenta</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent:    { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 },

  headerContainer:  { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  backButton:       { padding: 8, marginRight: 12 },
  backButtonText:   { fontSize: 18, color: '#1a202c' },
  headerContent:    { flex: 1 },
  title:            { fontSize: 28, fontWeight: 'bold', color: '#1a202c', marginBottom: 4 },
  subtitle:         { fontSize: 14, color: '#718096' },

  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },

  formGroup:    { marginBottom: 16 },
  label:        { fontSize: 14, fontWeight: '600', color: '#2d3748', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    paddingHorizontal: 12,
  },
  input:        { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: '#2d3748' },
  iconText:     { fontSize: 16, marginRight: 4 },
  iconButton:   { padding: 6 },

  // Selector de rol táctil
  rolPickerContainer: { flexDirection: 'column', gap: 8 },
  rolOption: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f7fafc',
  },
  rolOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  rolOptionText:         { fontSize: 14, color: '#4a5568' },
  rolOptionTextSelected: { color: '#6366f1', fontWeight: '600' },

  // Fortaleza de contraseña
  strengthContainer: { marginTop: 8 },
  strengthBar:       { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  strengthFill:      { height: '100%', borderRadius: 3 },
  strengthText:      { fontSize: 12, fontWeight: '600' },

  alertContainer: {
    backgroundColor: '#fed7d7',
    borderLeftWidth: 4,
    borderLeftColor: '#f56565',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
  },
  alertIcon: { fontSize: 18, marginRight: 12, marginTop: 2 },
  alertText: { flex: 1, fontSize: 14, color: '#742a2a' },

  buttonsContainer: { flexDirection: 'row', gap: 12, marginTop: 24 },

  cancelButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonPressed:  { backgroundColor: '#f7fafc' },
  cancelButtonText:     { fontSize: 14, fontWeight: '600', color: '#718096' },

  submitButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonPressed:  { backgroundColor: '#4f46e5' },
  submitButtonText:     { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  submitButtonDisabled: { backgroundColor: '#cbd5e0' },
});
