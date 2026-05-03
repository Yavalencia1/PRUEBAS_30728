import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

const String _baseUrl = 'http://localhost:8000/api/v1';

Future<List<Map<String, dynamic>>> fetchNotificaciones(String token) async {
  final response = await http.get(
    Uri.parse('$_baseUrl/notificaciones'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode != 200) {
    throw Exception('No se pudieron cargar las notificaciones');
  }

  final decoded = jsonDecode(response.body) as Map<String, dynamic>;
  final data = List<dynamic>.from(decoded['data'] ?? const []);
  return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
}

Future<bool> marcarNotificacionComoLeida(
  String token,
  int notificacionId,
) async {
  final response = await http.post(
    Uri.parse('$_baseUrl/notificaciones/$notificacionId/marcar-leida'),
    headers: {'Authorization': 'Bearer $token'},
  );
  return response.statusCode == 200;
}

Future<bool> eliminarNotificacion(String token, int notificacionId) async {
  final response = await http.delete(
    Uri.parse('$_baseUrl/notificaciones/$notificacionId'),
    headers: {'Authorization': 'Bearer $token'},
  );
  return response.statusCode == 200;
}

final notificacionesProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, String>((ref, token) async {
      return fetchNotificaciones(token);
    });

final notificacionesSinLeerProvider = FutureProvider.autoDispose
    .family<int, String>((ref, token) async {
      final notificaciones = await ref.watch(
        notificacionesProvider(token).future,
      );
      return notificaciones.where((n) => n['leida'] == false).length;
    });
