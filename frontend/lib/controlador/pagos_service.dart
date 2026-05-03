import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/modelo/pago_modelo.dart';
import 'package:http/http.dart' as http;

final pagosServiceProvider = Provider<PagosService>((ref) {
  return PagosService();
});

class ResumenPagoEstado {
  final int cantidad;
  final double total;

  const ResumenPagoEstado({required this.cantidad, required this.total});

  factory ResumenPagoEstado.fromJson(Map<String, dynamic> json) {
    return ResumenPagoEstado(
      cantidad: (json['cantidad'] ?? 0) as int,
      total: (json['total'] as num? ?? 0).toDouble(),
    );
  }
}

class ResumenPagos {
  final Map<String, ResumenPagoEstado> porEstado;
  final double totalGeneral;

  const ResumenPagos({required this.porEstado, required this.totalGeneral});

  factory ResumenPagos.fromJson(Map<String, dynamic> json) {
    final porEstadoJson = json['por_estado'] as Map<String, dynamic>? ?? {};
    return ResumenPagos(
      porEstado: porEstadoJson.map(
        (estado, valor) => MapEntry(
          estado,
          ResumenPagoEstado.fromJson((valor as Map).cast<String, dynamic>()),
        ),
      ),
      totalGeneral: (json['total_general'] as num? ?? 0).toDouble(),
    );
  }
}

class PagosService {
  PagosService({http.Client? client}) : _client = client ?? http.Client();

  static const String _baseUrl = 'http://localhost:8000/api/v1';
  final http.Client _client;

  Map<String, String> _headers({String? accessToken}) {
    final headers = <String, String>{'Content-Type': 'application/json'};

    if (accessToken != null && accessToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $accessToken';
    }

    return headers;
  }

  Map<String, dynamic> _decodeResponse(String body) {
    final decoded = jsonDecode(body) as Map<String, dynamic>;
    return decoded;
  }

  List<PagoModelo> _parsePagos(String body) {
    final decoded = _decodeResponse(body);
    final pagos = decoded['data'] as List? ?? const [];
    return pagos
        .whereType<Map<String, dynamic>>()
        .map(PagoModelo.fromJson)
        .toList();
  }

  Future<List<PagoModelo>> listarPagos({
    String? accessToken,
    int? padreId,
    String? estado,
  }) async {
    final queryParameters = <String, String>{};
    if (padreId != null) {
      queryParameters['padre_id'] = padreId.toString();
    }
    if (estado != null &&
        estado.isNotEmpty &&
        estado.toLowerCase() != 'todos') {
      queryParameters['estado'] = estado;
    }

    final uri = Uri.parse(
      '$_baseUrl/pagos/',
    ).replace(queryParameters: queryParameters);
    final response = await _client.get(
      uri,
      headers: _headers(accessToken: accessToken),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'No se pudieron cargar los pagos (${response.statusCode})',
      );
    }

    return _parsePagos(response.body);
  }

  Future<ResumenPagos> obtenerResumenPagos({String? accessToken}) async {
    final uri = Uri.parse('$_baseUrl/pagos/resumen');
    final response = await _client.get(
      uri,
      headers: _headers(accessToken: accessToken),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'No se pudo cargar el resumen de pagos (${response.statusCode})',
      );
    }

    final decoded = _decodeResponse(response.body);
    return ResumenPagos.fromJson(
      (decoded['data'] as Map).cast<String, dynamic>(),
    );
  }

  Future<void> marcarPagoComoPagado({
    required int pagoId,
    String? accessToken,
  }) async {
    final uri = Uri.parse('$_baseUrl/pagos/$pagoId/marcar-pagado');
    final response = await _client.post(
      uri,
      headers: _headers(accessToken: accessToken),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'No se pudo marcar el pago como pagado (${response.statusCode})',
      );
    }
  }

  Future<void> marcarPagoComoNoPagado({
    required int pagoId,
    String? accessToken,
  }) async {
    final uri = Uri.parse('$_baseUrl/pagos/$pagoId/marcar-no-pagado');
    final response = await _client.post(
      uri,
      headers: _headers(accessToken: accessToken),
    );

    if (response.statusCode != 200) {
      throw Exception(
        'No se pudo marcar el pago como no pagado (${response.statusCode})',
      );
    }
  }

  Future<void> eliminarPago({required int pagoId, String? accessToken}) async {
    final uri = Uri.parse('$_baseUrl/pagos/$pagoId');
    final response = await _client.delete(
      uri,
      headers: _headers(accessToken: accessToken),
    );

    if (response.statusCode != 200) {
      throw Exception('No se pudo eliminar el pago (${response.statusCode})');
    }
  }
}
