import 'package:flutter/foundation.dart';

class ApiConfig {
  /// Base URL de la API. Se sobreescribe en build/run con:
  ///   flutter run --dart-define=API_BASE_URL=http://<IP>:8000
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8000',
  );

  /// Base URL del WebSocket derivada de [baseUrl] (http -> ws, https -> wss).
  static String get wsBaseUrl => baseUrl.replaceFirst(RegExp(r'^http'), 'ws');
}
