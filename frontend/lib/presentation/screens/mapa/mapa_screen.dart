import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;

// --------------------------------------------------------
// Estado del Mapa
// --------------------------------------------------------

class MapaState {
  final bool isLoading;
  final bool hasActiveSession;
  final String? sessionId;
  final LatLng busLocation;
  final List<LatLng> stops;
  final String eta;
  final DateTime? lastUpdate;
  final bool isWsConnected;

  MapaState({
    required this.isLoading,
    required this.hasActiveSession,
    this.sessionId,
    required this.busLocation,
    required this.stops,
    required this.eta,
    this.lastUpdate,
    required this.isWsConnected,
  });

  MapaState copyWith({
    bool? isLoading,
    bool? hasActiveSession,
    String? sessionId,
    LatLng? busLocation,
    List<LatLng>? stops,
    String? eta,
    DateTime? lastUpdate,
    bool? isWsConnected,
  }) {
    return MapaState(
      isLoading: isLoading ?? this.isLoading,
      hasActiveSession: hasActiveSession ?? this.hasActiveSession,
      sessionId: sessionId ?? this.sessionId,
      busLocation: busLocation ?? this.busLocation,
      stops: stops ?? this.stops,
      eta: eta ?? this.eta,
      lastUpdate: lastUpdate ?? this.lastUpdate,
      isWsConnected: isWsConnected ?? this.isWsConnected,
    );
  }
}

// --------------------------------------------------------
// Provider & Controller
// --------------------------------------------------------

class MapaController extends StateNotifier<MapaState> {
  WebSocketChannel? _channel;
  final MapController mapController = MapController();

  MapaController()
      : super(MapaState(
          isLoading: true,
          hasActiveSession: false,
          busLocation: const LatLng(-0.180653, -78.467834), // Quito default
          stops: [
            const LatLng(-0.181000, -78.468000),
            const LatLng(-0.185000, -78.465000),
            const LatLng(-0.189000, -78.462000),
          ],
          eta: 'Calculando...',
          isWsConnected: false,
        )) {
    _init();
  }

  Future<void> _init() async {
    try {
      // Intentamos verificar si hay una sesión activa
      // Reemplaza esto con tu endpoint real de sesiones activas
      final response = await http.get(
        Uri.parse('http://localhost:8000/api/v1/sesiones/activa'),
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final sessionId = data['id'].toString();
        state = state.copyWith(
          isLoading: false,
          hasActiveSession: true,
          sessionId: sessionId,
        );
        _connectWebSocket(sessionId);
      } else {
        // Fallback a mock para demostración si no hay endpoint
        _usarMock();
      }
    } catch (e) {
      // Si el servidor no está, usamos mock para ver el diseño
      _usarMock();
    }
  }

  void _usarMock() {
    state = state.copyWith(
      isLoading: false,
      hasActiveSession: true,
      sessionId: 'mock_session_padre_123',
    );
    _connectWebSocket('mock_session_padre_123');
  }

  void _connectWebSocket(String sessionId) {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('ws://localhost:8000/ws/gps/$sessionId'),
      );
      state = state.copyWith(isWsConnected: true);

      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message);
            final newLocation = LatLng(data['lat'], data['lng']);
            state = state.copyWith(
              busLocation: newLocation,
              lastUpdate: DateTime.now(),
              eta: '10 min aprox.', // Aquí calcularías con la API
            );
          } catch (_) {}
        },
        onDone: () => state = state.copyWith(isWsConnected: false),
        onError: (e) => state = state.copyWith(isWsConnected: false),
      );
    } catch (e) {
      state = state.copyWith(isWsConnected: false);
    }
  }

  void centrarMapa() {
    mapController.move(state.busLocation, 16.0);
  }

  @override
  void dispose() {
    _channel?.sink.close();
    mapController.dispose();
    super.dispose();
  }
}

final mapaProvider = StateNotifierProvider.autoDispose<MapaController, MapaState>((ref) {
  return MapaController();
});

// --------------------------------------------------------
// Pantalla (Screen)
// --------------------------------------------------------

class MapaScreen extends ConsumerWidget {
  const MapaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(mapaProvider);
    final controller = ref.read(mapaProvider.notifier);

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!state.hasActiveSession) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bus_alert, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'El recorrido aún no ha iniciado',
              style: TextStyle(fontSize: 20, color: Colors.grey, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          // Mapa
          FlutterMap(
            mapController: controller.mapController,
            options: MapOptions(
              initialCenter: state.busLocation,
              initialZoom: 15.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.routekids.frontend',
              ),
              MarkerLayer(
                markers: [
                  // Marcadores de paradas
                  ...state.stops.map(
                    (stop) => Marker(
                      point: stop,
                      width: 30,
                      height: 30,
                      child: const Icon(
                        Icons.location_on,
                        color: Colors.blueAccent,
                        size: 30,
                      ),
                    ),
                  ),
                  // Marcador principal del bus
                  Marker(
                    point: state.busLocation,
                    width: 60,
                    height: 60,
                    // Usamos TweenAnimationBuilder para animar el movimiento suave del marcador
                    child: TweenAnimationBuilder<LatLng>(
                      tween: LatLngTween(
                        begin: state.busLocation,
                        end: state.busLocation,
                      ),
                      duration: const Duration(seconds: 1),
                      builder: (context, latLng, child) {
                        return const Icon(
                          Icons.directions_bus,
                          color: Color(0xFF534AB7),
                          size: 45,
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Botón para centrar
          Positioned(
            top: 16,
            right: 16,
            child: FloatingActionButton(
              backgroundColor: Colors.white,
              onPressed: () => controller.centrarMapa(),
              child: const Icon(Icons.my_location, color: Color(0xFF534AB7)),
            ),
          ),

          // Panel inferior
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(24.0),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 10,
                    offset: Offset(0, -2),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Estado del Recorrido',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                      Row(
                        children: [
                          Icon(
                            state.isWsConnected ? Icons.circle : Icons.error_outline,
                            size: 12,
                            color: state.isWsConnected ? Colors.green : Colors.red,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            state.isWsConnected ? 'En vivo' : 'Desconectado',
                            style: TextStyle(
                              color: state.isWsConnected ? Colors.green : Colors.red,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Llegada estimada: ${state.eta}',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF534AB7),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Última actualización: ${state.lastUpdate != null ? _formatTime(state.lastUpdate!) : "Esperando..."}',
                    style: const TextStyle(color: Colors.black54),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}:${time.second.toString().padLeft(2, '0')}';
  }
}

// Custom Tween para animar suavemente LatLng
class LatLngTween extends Tween<LatLng> {
  LatLngTween({required LatLng begin, required LatLng end}) : super(begin: begin, end: end);

  @override
  LatLng lerp(double t) {
    return LatLng(
      begin!.latitude + (end!.latitude - begin!.latitude) * t,
      begin!.longitude + (end!.longitude - begin!.longitude) * t,
    );
  }
}
