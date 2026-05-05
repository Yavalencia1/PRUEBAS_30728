import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/presentation/layouts/main_layout.dart';
import 'package:frontend/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:frontend/presentation/screens/recorridos/recorridos_screen.dart';
import 'package:frontend/presentation/screens/paradas/paradas_screen.dart';
import 'package:frontend/presentation/screens/alumnos/alumnos_screen.dart';
import 'package:frontend/presentation/screens/ruta/mi_ruta_screen.dart';
import 'package:frontend/presentation/screens/mapa/mapa_screen.dart';
import 'package:frontend/presentation/screens/asistencia/asistencia_screen.dart';
import 'package:frontend/presentation/screens/notificaciones/notificaciones_screen.dart';
import 'package:frontend/presentation/screens/auth/login_screen.dart';
import 'package:frontend/vista/pagos_screen.dart';

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:window_manager/window_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  if (!kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux)) {
    await windowManager.ensureInitialized();
    WindowOptions windowOptions = const WindowOptions(
      size: Size(1024, 768),
      minimumSize: Size(800, 600),
      center: true,
      title: 'RouteKids',
    );
    
    windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  runApp(const ProviderScope(child: RouteKidsApp()));
}

class RouteKidsApp extends StatelessWidget {
  const RouteKidsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RouteKids',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}

// Auth screens have been moved to lib/presentation/screens/auth/

class HomePage extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const HomePage({super.key, required this.accessToken, required this.usuario});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final String rol = widget.usuario['rol'] ?? 'padre';

    // Decidimos qué pantalla mostrar en base al índice del menú
    Widget getBody() {
      switch (rol.toLowerCase()) {
        case 'dueno':
          switch (_currentIndex) {
            case 0:
              return const DashboardScreen();
            case 1:
              return RecorridosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 2:
              return ParadasScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 3:
              return AlumnosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 4:
              return PagosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 5:
              return const Center(
                child: Text('Perfil de Dueño', style: TextStyle(fontSize: 20)),
              );
            default:
              return const DashboardScreen();
          }
        case 'conductor':
          switch (_currentIndex) {
            case 0:
              return MiRutaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 1:
              return AsistenciaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 2:
              return const Center(
                child: Text(
                  'Perfil del Conductor',
                  style: TextStyle(fontSize: 20),
                ),
              );
            default:
              return MiRutaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
          }
        case 'admin':
          switch (_currentIndex) {
            case 0:
              return MapaScreen(accessToken: widget.accessToken);
            case 1:
              return AsistenciaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 2:
              return PagosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 3:
              return const Center(
                child: Text('Perfil de Admin', style: TextStyle(fontSize: 20)),
              );
            default:
              return MapaScreen(accessToken: widget.accessToken);
          }
        case 'padre':
        default:
          switch (_currentIndex) {
            case 0:
              return MapaScreen(accessToken: widget.accessToken);
            case 1:
              return AsistenciaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 2:
              return PagosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 3:
              return NotificacionesScreen(
                usuario: widget.usuario,
                accessToken: widget.accessToken,
              );
            case 4:
              return const Center(
                child: Text('Perfil de Padre', style: TextStyle(fontSize: 20)),
              );
            default:
              return MapaScreen(accessToken: widget.accessToken);
          }
      }
    }

    return MainLayout(
      userRole: rol,
      userName: widget.usuario['nombre'] ?? 'Usuario',
      currentIndex: _currentIndex,
      onNavigate: (index) {
        setState(() {
          _currentIndex = index;
        });
      },
      onLogout: () {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginPage()),
        );
      },
      child: getBody(),
    );
  }
}
