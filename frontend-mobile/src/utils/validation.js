/**
 * Validadores de campos de formulario.
 * Coinciden con las reglas del backend (app/schemas/auth.py).
 */

const NAME_RE = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;
const ROLES_PERMITIDOS = ['padre', 'conductor', 'dueno', 'admin'];

export function validateNombre(value, label = 'Nombre') {
  if (!value || value.trim().length < 2) return `${label} debe tener al menos 2 caracteres.`;
  if (value.trim().length > 100) return `${label} no debe exceder 100 caracteres.`;
  if (!NAME_RE.test(value.trim())) return `${label} solo debe contener letras y espacios.`;
  return null;
}

export function validateApellido(value) {
  return validateNombre(value, 'Apellido');
}

export function validateEmail(value) {
  if (!value) return 'El correo es obligatorio.';
  if (!EMAIL_RE.test(value.trim())) return 'Ingresa un correo electrónico válido.';
  return null;
}

export function validateTelefono(value) {
  if (!value) return 'El teléfono es obligatorio.';
  if (!PHONE_RE.test(value.trim())) return 'El teléfono debe tener 10 dígitos numéricos.';
  return null;
}

export function validatePassword(value) {
  if (!value) return 'La contraseña es obligatoria.';
  if (value.length < 8 || value.length > 128) return 'La contraseña debe tener entre 8 y 128 caracteres.';
  if (!/[A-Z]/.test(value)) return 'Debe contener al menos una mayúscula.';
  if (!/\d/.test(value)) return 'Debe contener al menos un número.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Debe contener al menos un carácter especial.';
  return null;
}

export function validateConfirmarPassword(password, confirmar) {
  if (!confirmar) return 'Confirma tu contraseña.';
  if (password !== confirmar) return 'Las contraseñas no coinciden.';
  return null;
}

export function validateRol(value) {
  if (!value || !ROLES_PERMITIDOS.includes(value.toLowerCase())) {
    return `Rol debe ser uno de: ${ROLES_PERMITIDOS.join(', ')}.`;
  }
  return null;
}

export const ROLES = ROLES_PERMITIDOS;
