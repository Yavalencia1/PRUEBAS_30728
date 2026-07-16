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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  validateNombre,
  validateApellido,
  validateEmail,
  validateTelefono,
  validatePassword,
  validateConfirmarPassword,
} from '../utils/validation';

function calcularFortaleza(pass) {
  if (!pass) return { percent: 0, label: 'Vacía', color: '#cbd5e0' };
  let strength = 0;
  if (pass.length >= 8) strength += 25;
  if (/[A-Z]/.test(pass)) strength += 25;
  if (/\d/.test(pass)) strength += 25;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength += 25;

  if (strength === 100) return { percent: 100, label: 'Fuerte', color: '#0d9488' };
  if (strength > 50) return { percent: strength, label: 'Media', color: '#EF9F27' };
  return { percent: strength, label: 'Débil', color: '#E24B4A' };
}

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmar_password: '',
    rol: 'padre',
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

    const errores = [
      validateNombre(formData.nombre),
      validateApellido(formData.apellido),
      validateEmail(formData.email),
      validateTelefono(formData.telefono),
      validatePassword(formData.password),
      validateConfirmarPassword(formData.password, formData.confirmar_password),
    ].filter(Boolean);

    if (errores.length > 0) {
      setErrorMsg(errores[0]);
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleGoBack} disabled={isLoading}>
            <Ionicons name="arrow-back" size={20} color="#185FA5" />
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
              <Ionicons name="alert-circle-outline" size={18} color="#A32D2D" style={styles.alertIcon} />
              <Text style={styles.alertText}>{errorMsg}</Text>
            </View>
          )}

          {/* Nombre */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
              <Ionicons name="person-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
              <Ionicons name="mail-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
              <Ionicons name="call-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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

          {/* Contraseña */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#888780" />
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
              <Ionicons name="lock-closed-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
                <Text style={styles.submitButtonText}>Registrar Cuenta</Text>
              )}
            </Pressable>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  subtitle: {
    fontSize: 11,
    color: '#888780',
    marginTop: 2,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6F1FB',
    borderRadius: 12,
    backgroundColor: '#F4F8FD',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#2C2C2A',
  },
  inputIcon: {
    marginRight: 4,
  },
  iconButton: {
    padding: 8,
  },
  alertContainer: {
    backgroundColor: '#FCEBEB',
    borderWidth: 0.5,
    borderColor: '#e24b4a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    marginRight: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#A32D2D',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E6F1FB',
    borderRadius: 2,
    marginRight: 10,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 10,
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    flex: 0.35,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#B5D4F4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: '#F4F8FD',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#185FA5',
  },
  submitButton: {
    flex: 0.65,
    backgroundColor: '#185FA5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
});
