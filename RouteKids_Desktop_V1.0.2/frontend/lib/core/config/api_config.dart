import 'package:flutter/foundation.dart';

class ApiConfig {
  /// Retorna la URL base de la API dependiendo del entorno (Debug o Release)
  static String get baseUrl {
    if (kReleaseMode) {
      // Modo Producción/Release: El backend está en la misma máquina local que corre el .exe
      // El .bat levanta el Docker de manera local.
      return 'http://127.0.0.1:8000';
    } else {
      // Modo Debug: Cambiar esto según la necesidad. 
      // Si usas un emulador Android, podrías necesitar 'http://10.0.2.2:8000'.
      // Para Windows Debug, 'http://127.0.0.1:8000' funciona perfecto.
      return 'http://127.0.0.1:8000';
    }
  }
}
