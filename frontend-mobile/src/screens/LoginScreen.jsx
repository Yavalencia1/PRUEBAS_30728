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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

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
    }
  }, [email, password, login]);

  const handleRegisterPress = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo y título */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Ionicons name="bus" size={32} color="#185FA5" />
          </View>
          <Text style={styles.title}>RouteKids</Text>
          <Text style={styles.subtitle}>Lleva a tus niños seguros, siempre</Text>
        </View>

        {/* Formulario */}
        <View style={styles.formContainer}>
          {/* Alerta de múltiples intentos fallidos */}
          {failedAttempts >= 3 && (
            <View style={[styles.alertContainer, styles.alertWarningContainer]}>
              <Ionicons name="warning-outline" size={18} color="#7c2d12" style={styles.alertIcon} />
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
              <Ionicons name="alert-circle-outline" size={18} color="#A32D2D" style={styles.alertIcon} />
              <Text style={styles.alertText}>{errorMsg}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
              <Ionicons name="lock-closed-outline" size={18} color="#185FA5" style={styles.inputIcon} />
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
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#888780"
                />
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
                <Ionicons name="checkmark" size={12} color="#ffffff" />
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F1FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#888780',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#E6F1FB',
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: '#185FA5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  loginButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  registerButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#B5D4F4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerButtonPressed: {
    backgroundColor: '#F4F8FD',
  },
  registerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#185FA5',
  },
  buttonsContainer: {
    marginTop: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#E6F1FB',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#888780',
    fontSize: 11,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#E6F1FB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F8FD',
  },
  checkboxChecked: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#888780',
    flex: 1,
  },
  alertWarningContainer: {
    backgroundColor: '#FAEEDA',
    borderColor: '#EF9F27',
  },
  alertWarningText: {
    color: '#854F0B',
  },
});
