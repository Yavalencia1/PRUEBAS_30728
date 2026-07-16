import 'dart:convert';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/config/api_config.dart';
import 'package:frontend/modelo/usuario_modelo.dart';
import 'package:http/http.dart' as http;

final usuariosServiceProvider = Provider<UsuariosService>((ref) {
  return UsuariosService();
});

class UsuariosService {
  UsuariosService({http.Client? client}) : _client = client ?? http.Client();

  static String get _baseUrl => '${ApiConfig.baseUrl}/api/v1';
  final http.Client _client;

  Map<String, String> _headers({required String accessToken}) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    };
  }

  /// Genera una contraseña temporal con formato RK-XXXXXX (6 dígitos numéricos).
  static String generarPasswordTemporal() {
    final rng = Random.secure();
    final numero = rng.nextInt(900000) + 100000; // 100000–999999
    return 'RK-$numero';
  }

  /// Lista todos los usuarios. Opcionalmente filtra por [rol].
  Future<List<UsuarioModelo>> listarUsuarios({
    required String accessToken,
    String? rol,
  }) async {
    final queryParams = <String, String>{};
    if (rol != null && rol.isNotEmpty) {
      queryParams['rol'] = rol;
    }

    final uri = Uri.parse('$_baseUrl/usuarios/').replace(
      queryParameters: queryParams.isEmpty ? null : queryParams,
    );

    final response = await _client.get(uri, headers: _headers(accessToken: accessToken));

    if (response.statusCode != 200) {
      throw Exception('No se pudieron cargar los usuarios (${response.statusCode})');
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final lista = decoded['data'] as List? ?? [];
    return lista
        .whereType<Map<String, dynamic>>()
        .map(UsuarioModelo.fromJson)
        .toList();
  }

  /// Crea un nuevo usuario. Devuelve el modelo creado y la contraseña temporal usada.
  Future<({UsuarioModelo usuario, String passwordTemporal})> crearUsuario({
    required String accessToken,
    required String nombre,
    required String apellido,
    required String email,
    String? telefono,
    required String rol,
  }) async {
    final password = generarPasswordTemporal();

    final uri = Uri.parse('$_baseUrl/usuarios/');
    final body = jsonEncode({
      'nombre': nombre,
      'apellido': apellido,
      'email': email.toLowerCase().trim(),
      if (telefono != null && telefono.isNotEmpty) 'telefono': telefono,
      'rol': rol,
      'password': password,
    });

    final response = await _client.post(
      uri,
      headers: _headers(accessToken: accessToken),
      body: body,
    );

    if (response.statusCode != 201) {
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final detalle = decoded['detail']?.toString() ?? 'Error desconocido';
      throw Exception(detalle);
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final usuarioJson = decoded['data'] as Map<String, dynamic>;
    return (
      usuario: UsuarioModelo.fromJson(usuarioJson),
      passwordTemporal: password,
    );
  }

  /// Elimina el usuario con [usuarioId].
  Future<void> eliminarUsuario({
    required String accessToken,
    required int usuarioId,
  }) async {
    final uri = Uri.parse('$_baseUrl/usuarios/$usuarioId');
    final response = await _client.delete(
      uri,
      headers: _headers(accessToken: accessToken),
    );

    if (response.statusCode != 200) {
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final detalle = decoded['detail']?.toString() ?? 'Error al eliminar';
      throw Exception(detalle);
    }
  }
}
