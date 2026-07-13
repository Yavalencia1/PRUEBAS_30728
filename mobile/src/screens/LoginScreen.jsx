import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, GlobalStyles, Spacing, FontSizes, Radius } from '../theme/theme';
import { validateEmail, validatePassword } from '../utils/validation';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    setApiError(null);

    if (nextErrors.email || nextErrors.password) return;

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setApiError(result.mensaje || 'No se pudo iniciar sesión.');
      }
    } catch (error) {
      setApiError(error.message || 'Error de conexión. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>RK</Text>
            </View>
            <Text style={GlobalStyles.title}>RouteKids</Text>
            <Text style={[GlobalStyles.subtitle, { textAlign: 'center', marginTop: Spacing.xs }]}>
              Rastreabilidad escolar en tiempo real
            </Text>
          </View>

          <Text style={styles.formTitle}>Iniciar Sesión</Text>

          {apiError && (
            <View style={styles.alertError}>
              <Text style={GlobalStyles.errorText}>{apiError}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={[GlobalStyles.input, errors.email && styles.inputError]}
              placeholder="nombre@ejemplo.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {errors.email && <Text style={GlobalStyles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[GlobalStyles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.toggle}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={GlobalStyles.link}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={GlobalStyles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            style={[GlobalStyles.buttonPrimary, { marginTop: Spacing.md }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.primaryContrast} />
            ) : (
              <Text style={GlobalStyles.buttonPrimaryText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={GlobalStyles.subtitle}>¿No tienes cuenta? </Text>
            <Text style={GlobalStyles.link}>Regístrate aquí</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    color: Colors.primaryContrast,
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  formTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  inputError: {
    borderColor: Colors.error,
  },
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 80,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  alertError: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
};
