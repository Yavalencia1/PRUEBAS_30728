import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#2d3748',
  },
  iconButton: {
    padding: 8,
  },
  iconText: {
    fontSize: 18,
  },
  alertContainer: {
    backgroundColor: '#fed7d7',
    borderLeftWidth: 4,
    borderLeftColor: '#f56565',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
  },
  alertIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#742a2a',
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonPressed: {
    backgroundColor: '#4f46e5',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loginButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  registerButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonPressed: {
    backgroundColor: '#f7fafc',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  buttonsContainer: {
    marginTop: 24,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e0',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#718096',
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#2d3748',
    flex: 1,
  },
  alertWarningContainer: {
    backgroundColor: '#feebc8',
    borderLeftColor: '#ed8936',
  },
  alertWarningText: {
    color: '#7c2d12',
  },
});

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { login, isLoading } = useAuth();

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setErrorMsg('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setErrorMsg(null);

    const result = await login(email, password);

    if (!result.success) {
      setFailedAttempts((prev) => prev + 1);
      setErrorMsg(result.error || 'Error al iniciar sesión');
      setPassword('');
    } else {
      setFailedAttempts(0);
      // La navegación se maneja automáticamente en AppNavigator según isLoggedIn
    }
  }, [email, password, login]);

  const handleRegisterPress = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo y título */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🚌</Text>
          <Text style={styles.title}>RouteKids</Text>
          <Text style={styles.subtitle}>Lleva a tus niños seguros, siempre</Text>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          {/* Alerta de múltiples intentos fallidos */}
          {failedAttempts >= 3 && (
            <View style={[styles.alertContainer, styles.alertWarningContainer]}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertText, styles.alertWarningText, { fontWeight: '600' }]}>
                  Varios intentos fallidos.
                </Text>
                <Text style={[styles.alertText, styles.alertWarningText]}>
                  Por favor, verifica tus datos de inicio.
                </Text>
              </View>
            </View>
          )}

          {/* Alerta de error */}
          {errorMsg && (
            <View style={styles.alertContainer}>
              <Text style={styles.alertIcon}>❌</Text>
              <Text style={styles.alertText}>{errorMsg}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="nombre@ejemplo.com"
                placeholderTextColor="#a0aec0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Contraseña */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.iconText}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#a0aec0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <Pressable
                style={styles.iconButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.iconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Recordarme */}
          <View style={styles.checkboxContainer}>
            <Pressable
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              {rememberMe && (
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
              )}
            </Pressable>
            <Text style={styles.checkboxLabel}>Recordarme</Text>
          </View>

          {/* Botones */}
          <View style={styles.buttonsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && !isLoading && styles.loginButtonPressed,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && !isLoading && styles.registerButtonPressed,
              ]}
              onPress={handleRegisterPress}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>Crear Cuenta</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
