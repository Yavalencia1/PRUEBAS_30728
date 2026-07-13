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
import {
  validateNombre,
  validateApellido,
  validateEmail,
  validateTelefono,
  validatePassword,
  validateConfirmarPassword,
  ROLES,
} from '../utils/validation';

// Roles disponibles en el registro (admin requiere secret y se excluye de la UI)
const ROLES_REGISTRABLES = ROLES.filter((r) => r !== 'admin');

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmar_password: '',
    rol: 'padre',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => ({
    nombre: validateNombre(form.nombre),
    apellido: validateApellido(form.apellido),
    email: validateEmail(form.email),
    telefono: validateTelefono(form.telefono),
    password: validatePassword(form.password),
    confirmar_password: validateConfirmarPassword(form.password, form.confirmar_password),
    rol: null,
  });

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setApiError(null);
    setSuccessMsg(null);

    if (Object.values(nextErrors).some(Boolean)) return;

    setIsLoading(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        password: form.password,
        confirmar_password: form.confirmar_password,
        rol: form.rol,
      };
      const result = await register(payload);
      if (result.ok) {
        setSuccessMsg(result.mensaje || 'Cuenta creada correctamente.');
        setTimeout(() => navigation.navigate('Login'), 1200);
      } else {
        setApiError(result.mensaje || 'No se pudo completar el registro.');
      }
    } catch (error) {
      setApiError(error.message || 'Error de conexión. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (key, label, options = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[GlobalStyles.input, errors[key] && styles.inputError]}
        placeholder={options.placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize={options.autoCapitalize || 'none'}
        keyboardType={options.keyboardType || 'default'}
        secureTextEntry={options.secureTextEntry || false}
        value={form[key]}
        onChangeText={(v) => setField(key, v)}
      />
      {errors[key] && <Text style={GlobalStyles.errorText}>{errors[key]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <Text style={GlobalStyles.title}>Crear Cuenta</Text>
          <Text style={[GlobalStyles.subtitle, { marginTop: Spacing.xs, marginBottom: Spacing.md }]}>
            Completa tus datos para unirte a RouteKids
          </Text>

          {apiError && (
            <View style={styles.alertError}>
              <Text style={GlobalStyles.errorText}>{apiError}</Text>
            </View>
          )}
          {successMsg && (
            <View style={styles.alertSuccess}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {renderField('nombre', 'Nombre', { placeholder: 'Juan', autoCapitalize: 'words' })}
          {renderField('apellido', 'Apellido', { placeholder: 'Pérez', autoCapitalize: 'words' })}
          {renderField('email', 'Correo Electrónico', {
            placeholder: 'nombre@ejemplo.com',
            keyboardType: 'email-address',
          })}
          {renderField('telefono', 'Teléfono', {
            placeholder: '0991234567',
            keyboardType: 'phone-pad',
          })}

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[GlobalStyles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Mín. 8, con mayúscula, número y símbolo"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => setField('password', v)}
              />
              <TouchableOpacity style={styles.toggle} onPress={() => setShowPassword((v) => !v)}>
                <Text style={GlobalStyles.link}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={GlobalStyles.errorText}>{errors.password}</Text>}
          </View>

          {renderField('confirmar_password', 'Confirmar Contraseña', {
            placeholder: 'Repite tu contraseña',
            secureTextEntry: !showPassword,
          })}

          <View style={styles.field}>
            <Text style={styles.label}>Rol</Text>
            <View style={styles.roles}>
              {ROLES_REGISTRABLES.map((rol) => (
                <TouchableOpacity
                  key={rol}
                  style={[
                    styles.roleChip,
                    form.rol === rol && styles.roleChipActive,
                  ]}
                  onPress={() => setField('rol', rol)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      form.rol === rol && styles.roleChipTextActive,
                    ]}
                  >
                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[GlobalStyles.buttonPrimary, { marginTop: Spacing.sm }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.primaryContrast} />
            ) : (
              <Text style={GlobalStyles.buttonPrimaryText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={GlobalStyles.subtitle}>¿Ya tienes cuenta? </Text>
            <Text style={GlobalStyles.link}>Inicia sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  inner: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
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
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleChipText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: FontSizes.sm,
  },
  roleChipTextActive: {
    color: Colors.primaryContrast,
  },
  alertError: {
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  alertSuccess: {
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  successText: {
    color: Colors.success,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
};
