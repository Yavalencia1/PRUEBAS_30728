import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

// --------------------------------------------------------
// Modelos
// --------------------------------------------------------

class AlumnoRuta {
  final String id;
  final String nombre;
  final String parada;
  final bool presente;

  AlumnoRuta({
    required this.id,
    required this.nombre,
    required this.parada,
    this.presente = false,
  });

  AlumnoRuta copyWith({bool? presente}) {
    return AlumnoRuta(
      id: id,
      nombre: nombre,
      parada: parada,
      presente: presente ?? this.presente,
    );
  }
}

class MiRutaState {
  final bool isRouteActive;
  final bool isWsConnected;
  final String? sessionId;
  final List<AlumnoRuta> alumnos;

  MiRutaState({
    required this.isRouteActive,
    required this.isWsConnected,
    this.sessionId,
    required this.alumnos,
  });

  MiRutaState copyWith({
    bool? isRouteActive,
    bool? isWsConnected,
    String? sessionId,
    List<AlumnoRuta>? alumnos,
  }) {
    return MiRutaState(
      isRouteActive: isRouteActive ?? this.isRouteActive,
      isWsConnected: isWsConnected ?? this.isWsConnected,
      sessionId: sessionId ?? this.sessionId,
      alumnos: alumnos ?? this.alumnos,
    );
  }
}

// --------------------------------------------------------
// Provider & Controller
// --------------------------------------------------------

class MiRutaController extends StateNotifier<MiRutaState> {
  Timer? _gpsTimer;
  WebSocketChannel? _channel;

  MiRutaController() : super(MiRutaState(
    isRouteActive: false,
    isWsConnected: false,
    alumnos: [
      AlumnoRuta(id: '1', nombre: 'Juan Pérez', parada: 'Calle Principal 123'),
      AlumnoRuta(id: '2', nombre: 'María López', parada: 'Av. Siempre Viva 742'),
      AlumnoRuta(id: '3', nombre: 'Carlos Ruiz', parada: 'Plaza Mayor'),
      AlumnoRuta(id: '4', nombre: 'Ana Torres', parada: 'El Condado'),
    ],
  ));

  Future<void> toggleRuta() async {
    if (state.isRouteActive) {
      await _terminarRuta();
    } else {
      await _iniciarRuta();
    }
  }

  Future<void> _iniciarRuta() async {
    String sId = 'sesion_mock_123';
    
    try {
      final response = await http.post(
        Uri.parse('http://localhost:8000/api/v1/sesiones/'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        sId = data['id'].toString();
      }
    } catch (e) {
      // Ignoramos el error para seguir la simulación si la API no está lista
    }

    state = state.copyWith(isRouteActive: true, sessionId: sId);
    _connectWebSocket(sId);
    _startGpsSimulation();
  }

  Future<void> _terminarRuta() async {
    try {
      if (state.sessionId != null) {
        await http.patch(
          Uri.parse('http://localhost:8000/api/v1/sesiones/${state.sessionId}/terminar'),
        ).timeout(const Duration(seconds: 3));
      }
    } catch (e) {
      // Ignorar error para la simulación
    } finally {
      _stopGpsSimulation();
      _disconnectWebSocket();
      
      // Reiniciar asistencia al terminar
      final resetAlumnos = state.alumnos.map((a) => a.copyWith(presente: false)).toList();
      state = state.copyWith(
        isRouteActive: false, 
        sessionId: null, 
        isWsConnected: false,
        alumnos: resetAlumnos,
      );
    }
  }

  void _connectWebSocket(String sessionId) {
    try {
      // Intentamos conectar al WebSocket
      _channel = WebSocketChannel.connect(
        Uri.parse('ws://localhost:8000/ws/conductor/$sessionId'),
      );
      state = state.copyWith(isWsConnected: true);
      
      // Escuchamos si se cierra o hay error
      _channel!.stream.listen(
        (message) {},
        onDone: () => state = state.copyWith(isWsConnected: false),
        onError: (e) => state = state.copyWith(isWsConnected: false),
      );
    } catch (e) {
      state = state.copyWith(isWsConnected: false);
    }
  }

  void _disconnectWebSocket() {
    _channel?.sink.close();
    _channel = null;
  }

  void _startGpsSimulation() {
    _gpsTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (state.isWsConnected && _channel != null) {
        final location = {
          'lat': -0.180653 + (timer.tick * 0.0001),
          'lng': -78.467834,
          'timestamp': DateTime.now().toIso8601String()
        };
        try {
          _channel!.sink.add(jsonEncode(location));
          print('GPS Enviado: $location');
        } catch (_) {
          state = state.copyWith(isWsConnected: false);
        }
      }
    });
  }

  void _stopGpsSimulation() {
    _gpsTimer?.cancel();
    _gpsTimer = null;
  }

  void toggleAsistencia(String alumnoId) {
    if (!state.isRouteActive) return; // Solo permitir si la ruta está activa

    final newAlumnos = state.alumnos.map((a) {
      if (a.id == alumnoId) {
        return a.copyWith(presente: !a.presente);
      }
      return a;
    }).toList();
    
    state = state.copyWith(alumnos: newAlumnos);
  }

  @override
  void dispose() {
    _stopGpsSimulation();
    _disconnectWebSocket();
    super.dispose();
  }
}

final miRutaProvider = StateNotifierProvider<MiRutaController, MiRutaState>((ref) {
  return MiRutaController();
});

// --------------------------------------------------------
// Pantalla (Screen)
// --------------------------------------------------------

class MiRutaScreen extends ConsumerWidget {
  const MiRutaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(miRutaProvider);
    final controller = ref.read(miRutaProvider.notifier);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Mi Ruta de Hoy', style: TextStyle(fontWeight: FontWeight.bold)),
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
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    const Icon(Icons.directions_bus, size: 64, color: Color(0xFF534AB7)),
                    const SizedBox(height: 16),
                    Text(
                      state.isRouteActive ? 'Ruta en Progreso' : 'Ruta Detenida',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: state.isRouteActive ? Colors.redAccent : Colors.green,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        icon: Icon(
                          state.isRouteActive ? Icons.stop_circle : Icons.play_circle_fill,
                          size: 28,
                        ),
                        label: Text(
                          state.isRouteActive ? 'TERMINAR RUTA' : 'INICIAR RUTA',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        onPressed: () => controller.toggleRuta(),
                      ),
                    ),
                    if (state.isRouteActive) ...[
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            state.isWsConnected ? Icons.wifi : Icons.wifi_off,
                            color: state.isWsConnected ? Colors.green : Colors.orange,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            state.isWsConnected 
                                ? 'GPS Conectado (transmitiendo)'
                                : 'Conectando al GPS...',
                            style: TextStyle(
                              color: state.isWsConnected ? Colors.green : Colors.orange,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      )
                    ]
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

            // Lista de Alumnos
            Expanded(
              child: ListView.separated(
                itemCount: state.alumnos.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final alumno = state.alumnos[index];
                  return Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      leading: CircleAvatar(
                        backgroundColor: alumno.presente ? Colors.green.shade100 : Colors.blue.shade50,
                        child: Icon(
                          alumno.presente ? Icons.check : Icons.person,
                          color: alumno.presente ? Colors.green : const Color(0xFF534AB7),
                        ),
                      ),
                      title: Text(
                        alumno.nombre,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          decoration: alumno.presente ? TextDecoration.lineThrough : null,
                          color: alumno.presente ? Colors.grey : Colors.black87,
                        ),
                      ),
                      subtitle: Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(alumno.parada),
                        ],
                      ),
                      trailing: Checkbox(
                        value: alumno.presente,
                        activeColor: Colors.green,
                        onChanged: state.isRouteActive 
                          ? (value) => controller.toggleAsistencia(alumno.id)
                          : null, // Deshabilitado si la ruta no está activa
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
