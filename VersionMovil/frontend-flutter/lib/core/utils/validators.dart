class Validators {
  static String? validarNombre(String? v) {
    if (v == null || v.trim().isEmpty) return 'Este campo es obligatorio';
    if (v.trim().length < 2) return 'Debe tener mínimo 2 letras';
    final hasNumbers = RegExp(r'[0-9]').hasMatch(v);
    if (hasNumbers) return 'No debe contener números';
    return null;
  }

  static String? validarEmail(String? v) {
    if (v == null || v.trim().isEmpty) return 'El correo es obligatorio';
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(v.trim())) return 'Formato de correo inválido';
    return null;
  }

  static String? validarTelefono(String? v) {
    if (v == null || v.trim().isEmpty) return 'El teléfono es obligatorio';
    final phoneRegex = RegExp(r'^\d{10}$');
    if (!phoneRegex.hasMatch(v.trim())) return 'Debe tener exactamente 10 dígitos';
    return null;
  }

  static String? validarPassword(String? v) {
    if (v == null || v.isEmpty) return 'La contraseña es obligatoria';
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Debe contener una mayúscula';
    if (!RegExp(r'\d').hasMatch(v)) return 'Debe contener un número';
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(v)) {
      return 'Debe contener un carácter especial';
    }
    return null;
  }

  static String? validarConfirmPassword(String? pass, String? confirm) {
    if (confirm == null || confirm.isEmpty) return 'Confirma tu contraseña';
    if (pass != confirm) return 'Las contraseñas no coinciden';
    return null;
  }
}
