class ErrorMessages {
  static String getMessage(int? statusCode) {
    switch (statusCode) {
      case 401:
        return 'Correo o contraseña incorrectos';
      case 409:
        return 'Este correo ya está registrado, ¿quieres iniciar sesión?';
      case 422:
        return 'Por favor revisa los datos ingresados';
      case 429:
        return 'Demasiados intentos. Espera 15 minutos';
      case 500:
        return 'Algo salió mal. Intenta de nuevo en un momento';
      default:
        return 'No hay conexión al servidor. Verifica tu internet';
    }
  }
}
