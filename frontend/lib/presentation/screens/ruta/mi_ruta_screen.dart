import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:frontend/presentation/screens/asistencia/asistencia_screen.dart';

// --------------------------------------------------------
// Modelos
// --------------------------------------------------------

class AlumnoRuta {
  final String id;
  final String nombre;
  final String parada;
  final String estadoAsistencia;
  final DateTime? horaSubida;
  final DateTime? horaBajada;

  AlumnoRuta({
    required this.id,
    required this.nombre,
    required this.parada,
    this.estadoAsistencia = 'pendiente',
    this.horaSubida,
    this.horaBajada,
  });

  bool get presente =>
      estadoAsistencia == 'en_bus' || estadoAsistencia == 'finalizado';

  bool get enBus => estadoAsistencia == 'en_bus';

  bool get finalizado => estadoAsistencia == 'finalizado';

  AlumnoRuta copyWith({
    String? nombre,
    String? parada,
    String? estadoAsistencia,
    DateTime? horaSubida,
    DateTime? horaBajada,
  }) {
    return AlumnoRuta(
      id: id,
      nombre: nombre ?? this.nombre,
      parada: parada ?? this.parada,
      estadoAsistencia: estadoAsistencia ?? this.estadoAsistencia,
      horaSubida: horaSubida ?? this.horaSubida,
      horaBajada: horaBajada ?? this.horaBajada,
    );
  }
}

class MiRutaState {
  final bool isRouteActive;
  final bool isWsConnected;
  final String? sessionId;
  final List<AlumnoRuta> alumnos;
  final String? error;
  final bool isLoading;

  MiRutaState({
    required this.isRouteActive,
    required this.isWsConnected,
    this.sessionId,
    required this.alumnos,
    this.error,
    this.isLoading = false,
  });

  MiRutaState copyWith({
    bool? isRouteActive,
    bool? isWsConnected,
    String? sessionId,
    List<AlumnoRuta>? alumnos,
    String? error,
    bool? isLoading,
  }) {
    return MiRutaState(
      isRouteActive: isRouteActive ?? this.isRouteActive,
      isWsConnected: isWsConnected ?? this.isWsConnected,
      sessionId: sessionId ?? this.sessionId,
      alumnos: alumnos ?? this.alumnos,
      error: error,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

// --------------------------------------------------------
// Provider & Controller
// --------------------------------------------------------

class MiRutaController extends StateNotifier<MiRutaState> {
  Timer? _gpsTimer;
  WebSocketChannel? _channel;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  bool _isDisposed = false;
  bool _shouldReconnect = false;
  String accessToken;

  MiRutaController({required this.accessToken})
    : super(
        MiRutaState(
          isRouteActive: false,
          isWsConnected: false,
          alumnos: [],
          isLoading: false,
        ),
      );

  Future<void> toggleRuta() async {
    if (state.isRouteActive) {
      await _terminarRuta();
    } else {
      await _iniciarRuta();
    }
  }

  Future<void> _iniciarRuta() async {
    state = state.copyWith(isLoading: true, error: null);
    String? sId;

    try {
      // Crear sesión en el backend
      final response = await http
          .post(
            Uri.parse('http://localhost:8000/api/v1/sesiones/'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $accessToken',
            },
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          sId = data['data']['id'].toString();

          // Cargar alumnos del backend
          await _cargarAlumnos();

          state = state.copyWith(
            isRouteActive: true,
            sessionId: sId,
            isLoading: false,
          );
          _connectWebSocket(sId);
          _startGpsSimulation();
          return;
        }
      }
      state = state.copyWith(
        error: 'Error al crear la sesión: ${response.statusCode}',
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(error: 'Error: $e', isLoading: false);
    }
  }

  Future<void> _cargarAlumnos() async {
    try {
      final response = await http
          .get(
            Uri.parse('http://localhost:8000/api/v1/alumnos/'),
            headers: {'Authorization': 'Bearer $accessToken'},
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true && data['data'] is List) {
          final alumnos = (data['data'] as List)
              .map(
                (a) => AlumnoRuta(
                  id: a['id'].toString(),
                  nombre: a['nombre'] ?? '',
                  parada: a['parada_nombre'] ?? 'Sin parada',
                ),
              )
              .toList();
          state = state.copyWith(alumnos: alumnos);
        }
      }
    } catch (e) {
      print('Error cargando alumnos: $e');
    }
  }

  Future<void> _terminarRuta() async {
    state = state.copyWith(isLoading: true);
    try {
      if (state.sessionId != null) {
        await http
            .patch(
              Uri.parse(
                'http://localhost:8000/api/v1/sesiones/${state.sessionId}/terminar',
              ),
              headers: {'Authorization': 'Bearer $accessToken'},
            )
            .timeout(const Duration(seconds: 5));
      }
    } catch (e) {
      print('Error terminando ruta: $e');
    } finally {
      _stopGpsSimulation();
      _disconnectWebSocket();

      final resetAlumnos = state.alumnos
          .map((a) => a.copyWith(estadoAsistencia: 'pendiente'))
          .toList();
      state = state.copyWith(
        isRouteActive: false,
        sessionId: null,
        isWsConnected: false,
        alumnos: resetAlumnos,
        isLoading: false,
      );
    }
  }

  bool refAsistenciaRefresh() => false;

  void _connectWebSocket(String sessionId) {
    try {
      _shouldReconnect = true;
      _reconnectTimer?.cancel();
      _channel?.sink.close();
      _channel = WebSocketChannel.connect(
        _buildWebSocketUri(sessionId),
      );
      _reconnectAttempts = 0;
      state = state.copyWith(isWsConnected: true);

      _channel!.stream.listen(
        (message) {},
        onDone: () {
          state = state.copyWith(isWsConnected: false);
          _scheduleReconnect();
        },
        onError: (e) {
          state = state.copyWith(isWsConnected: false);
          _scheduleReconnect();
        },
      );
    } catch (e) {
      state = state.copyWith(isWsConnected: false);
      _scheduleReconnect();
    }
  }

  Uri _buildWebSocketUri(String sessionId) {
    final baseUri = Uri.parse('ws://localhost:8000/ws/conductor/$sessionId');
    if (accessToken.isEmpty) {
      return baseUri;
    }
    return baseUri.replace(queryParameters: {'token': accessToken});
  }

  void _scheduleReconnect() {
    if (_isDisposed) return;
    if (!state.isRouteActive || state.sessionId == null) return;
    if (!_shouldReconnect || state.isWsConnected) return;
    if (accessToken.isEmpty) return;

    _reconnectTimer?.cancel();
    final delaySeconds = math.min(30, 2 * (1 << _reconnectAttempts));
    _reconnectAttempts = math.min(_reconnectAttempts + 1, 5);
    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      if (_isDisposed || state.sessionId == null) return;
      _connectWebSocket(state.sessionId!);
    });
  }

  void _disconnectWebSocket() {
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _reconnectAttempts = 0;
    _shouldReconnect = false;
  }

  void _startGpsSimulation() {
    _gpsTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (state.isWsConnected && _channel != null) {
        final location = {
          'lat': -0.180653 + (timer.tick * 0.0001),
          'lng': -78.467834,
          'timestamp': DateTime.now().toIso8601String(),
        };
        try {
          _channel!.sink.add(jsonEncode(location));
        } catch (_) {
          state = state.copyWith(isWsConnected: false);
          _scheduleReconnect();
        }
      }
    });
  }

  void _stopGpsSimulation() {
    _gpsTimer?.cancel();
    _gpsTimer = null;
  }

  Future<void> marcarSubida(String alumnoId) async {
    if (!state.isRouteActive || state.sessionId == null) return;

    final alumno = state.alumnos.firstWhere(
      (a) => a.id == alumnoId,
      orElse: () => throw Exception('Alumno no encontrado'),
    );

    try {
      if (alumno.estadoAsistencia != 'pendiente') {
        state = state.copyWith(
          error: 'La subida solo se puede marcar una vez.',
        );
        return;
      }

      final response = await http
          .post(
            Uri.parse(
              'http://localhost:8000/api/v1/asistencias/subida?sesion_id=${state.sessionId}&alumno_id=$alumnoId',
            ),
            headers: {'Authorization': 'Bearer $accessToken'},
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final asistencia = data['data'] as Map<String, dynamic>?;
        final horaSubida = asistencia?['hora_subida'] != null
            ? DateTime.parse(asistencia!['hora_subida'] as String)
            : DateTime.now().toUtc();
        final newAlumnos = state.alumnos.map((current) {
          if (current.id == alumnoId) {
            return current.copyWith(
              estadoAsistencia: 'en_bus',
              horaSubida: horaSubida,
              horaBajada: null,
            );
          }
          return current;
        }).toList();
        state = state.copyWith(alumnos: newAlumnos, error: null);
      } else {
        state = state.copyWith(
          error: 'Error al marcar subida: ${response.statusCode}',
        );
      }
    } catch (e) {
      state = state.copyWith(error: 'Error: $e');
    }
  }

  Future<void> marcarBajada(String alumnoId) async {
    if (!state.isRouteActive || state.sessionId == null) return;

    final alumno = state.alumnos.firstWhere(
      (a) => a.id == alumnoId,
      orElse: () => throw Exception('Alumno no encontrado'),
    );

    try {
      if (alumno.estadoAsistencia != 'en_bus') {
        state = state.copyWith(
          error: 'La bajada solo se puede marcar si el alumno ya subió.',
        );
        return;
      }

      final response = await http
          .post(
            Uri.parse(
              'http://localhost:8000/api/v1/asistencias/bajada?sesion_id=${state.sessionId}&alumno_id=$alumnoId',
            ),
            headers: {'Authorization': 'Bearer $accessToken'},
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final asistencia = data['data'] as Map<String, dynamic>?;
        final horaBajada = asistencia?['hora_bajada'] != null
            ? DateTime.parse(asistencia!['hora_bajada'] as String)
            : DateTime.now().toUtc();
        final newAlumnos = state.alumnos.map((current) {
          if (current.id == alumnoId) {
            return current.copyWith(
              estadoAsistencia: 'finalizado',
              horaBajada: horaBajada,
            );
          }
          return current;
        }).toList();
        state = state.copyWith(alumnos: newAlumnos, error: null);
      } else {
        state = state.copyWith(
          error: 'Error al marcar bajada: ${response.statusCode}',
        );
      }
    } catch (e) {
      state = state.copyWith(error: 'Error: $e');
    }
  }

  Future<void> toggleAsistencia(String alumnoId) async {
    final alumno = state.alumnos.firstWhere(
      (a) => a.id == alumnoId,
      orElse: () => throw Exception('Alumno no encontrado'),
    );

    if (alumno.estadoAsistencia == 'pendiente') {
      await marcarSubida(alumnoId);
    } else if (alumno.estadoAsistencia == 'en_bus') {
      await marcarBajada(alumnoId);
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _shouldReconnect = false;
    _reconnectTimer?.cancel();
    _stopGpsSimulation();
    _disconnectWebSocket();
    super.dispose();
  }
}

final miRutaProvider =
    StateNotifierProvider.family<MiRutaController, MiRutaState, String>((
      ref,
      accessToken,
    ) {
      return MiRutaController(accessToken: accessToken);
    });

// --------------------------------------------------------
// Pantalla (Screen)
// --------------------------------------------------------

class MiRutaScreen extends ConsumerWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const MiRutaScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(miRutaProvider(accessToken));
    final controller = ref.read(miRutaProvider(accessToken).notifier);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text(
          'Mi Ruta de Hoy',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Panel de Control Principal
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    const Icon(
                      Icons.directions_bus,
                      size: 64,
                      color: Color(0xFF534AB7),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      state.isRouteActive
                          ? 'Ruta en Progreso'
                          : 'Ruta Detenida',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: state.isRouteActive
                              ? Colors.redAccent
                              : Colors.green,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        icon: Icon(
                          state.isRouteActive
                              ? Icons.stop_circle
                              : Icons.play_circle_fill,
                          size: 28,
                        ),
                        label: Text(
                          state.isRouteActive
                              ? 'TERMINAR RUTA'
                              : 'INICIAR RUTA',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onPressed: state.isLoading
                            ? null
                            : () async {
                                final estabaActiva = state.isRouteActive;
                                await controller.toggleRuta();
                                if (estabaActiva &&
                                    !controller.state.isRouteActive) {
                                  ref
                                      .read(
                                        asistenciaRefreshTriggerProvider
                                            .notifier,
                                      )
                                      .state++;
                                }
                              },
                      ),
                    ),
                    if (state.isRouteActive) ...[
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            state.isWsConnected ? Icons.wifi : Icons.wifi_off,
                            color: state.isWsConnected
                                ? Colors.green
                                : Colors.orange,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            state.isWsConnected
                                ? 'GPS Conectado (transmitiendo)'
                                : 'Conectando al GPS...',
                            style: TextStyle(
                              color: state.isWsConnected
                                  ? Colors.green
                                  : Colors.orange,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (state.error != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          state.error!,
                          style: TextStyle(color: Colors.red.shade900),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Título de Lista
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Alumnos a Recoger',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),

            // Lista de Alumnos o Loading
            Expanded(
              child: state.alumnos.isEmpty && state.isRouteActive
                  ? const Center(child: CircularProgressIndicator())
                  : state.alumnos.isEmpty
                  ? const Center(
                      child: Text('Inicia una ruta para ver los alumnos'),
                    )
                  : ListView.separated(
                      itemCount: state.alumnos.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final alumno = state.alumnos[index];
                        return Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            leading: CircleAvatar(
                              backgroundColor: alumno.finalizado
                                  ? Colors.blue.shade100
                                  : alumno.enBus
                                  ? Colors.green.shade100
                                  : Colors.orange.shade100,
                              child: Icon(
                                alumno.finalizado
                                    ? Icons.flag
                                    : alumno.enBus
                                    ? Icons.directions_bus
                                    : Icons.schedule,
                                color: alumno.finalizado
                                    ? Colors.blue
                                    : alumno.enBus
                                    ? Colors.green
                                    : Colors.orange,
                              ),
                            ),
                            title: Text(
                              alumno.nombre,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                decoration: alumno.finalizado
                                    ? TextDecoration.lineThrough
                                    : null,
                                color: alumno.finalizado
                                    ? Colors.grey
                                    : Colors.black87,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.location_on,
                                      size: 14,
                                      color: Colors.grey,
                                    ),
                                    const SizedBox(width: 4),
                                    Expanded(child: Text(alumno.parada)),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                _EstadoAsistenciaChip(alumno: alumno),
                              ],
                            ),
                            trailing: Wrap(
                              spacing: 8,
                              children: [
                                OutlinedButton.icon(
                                  onPressed:
                                      state.isRouteActive &&
                                          alumno.estadoAsistencia == 'pendiente'
                                      ? () => controller.marcarSubida(alumno.id)
                                      : null,
                                  icon: const Icon(
                                    Icons.arrow_upward,
                                    size: 16,
                                  ),
                                  label: const Text('Subida'),
                                ),
                                OutlinedButton.icon(
                                  onPressed:
                                      state.isRouteActive &&
                                          alumno.estadoAsistencia == 'en_bus'
                                      ? () => controller.marcarBajada(alumno.id)
                                      : null,
                                  icon: const Icon(
                                    Icons.arrow_downward,
                                    size: 16,
                                  ),
                                  label: const Text('Bajada'),
                                ),
                              ],
                            ),
                            onTap: state.isRouteActive
                                ? () => controller.toggleAsistencia(alumno.id)
                                : null,
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EstadoAsistenciaChip extends StatelessWidget {
  final AlumnoRuta alumno;

  const _EstadoAsistenciaChip({required this.alumno});

  @override
  Widget build(BuildContext context) {
    final Color color;
    final IconData icon;
    final String label;

    if (alumno.finalizado) {
      color = Colors.blue;
      icon = Icons.flag;
      label = 'Finalizado';
    } else if (alumno.enBus) {
      color = Colors.green;
      icon = Icons.directions_bus;
      label = 'En bus';
    } else {
      color = Colors.orange;
      icon = Icons.schedule;
      label = 'Pendiente';
    }

    return Chip(
      visualDensity: VisualDensity.compact,
      avatar: Icon(icon, size: 16, color: color),
      label: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
      backgroundColor: color.withOpacity(0.10),
      side: BorderSide(color: color.withOpacity(0.25)),
    );
  }
}
