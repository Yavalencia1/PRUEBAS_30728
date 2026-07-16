import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/presentation/layouts/main_layout.dart';
import 'package:frontend/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:frontend/presentation/screens/recorridos/recorridos_screen.dart';
import 'package:frontend/presentation/screens/paradas/paradas_screen.dart';
import 'package:frontend/presentation/screens/alumnos/alumnos_screen.dart';
import 'package:frontend/presentation/screens/ruta/mi_ruta_screen.dart';
import 'package:frontend/presentation/screens/ruta/rutas_screen.dart';
import 'package:frontend/presentation/screens/mapa/mapa_screen.dart';
import 'package:frontend/presentation/screens/asistencia/asistencia_screen.dart';
import 'package:frontend/presentation/screens/notificaciones/notificaciones_screen.dart';
import 'package:frontend/presentation/screens/auth/login_screen.dart';
import 'package:frontend/vista/pagos_screen.dart';
import 'package:frontend/presentation/screens/usuarios/administracion_usuarios_screen.dart';
import 'package:frontend/presentation/screens/perfil/perfil_admin_screen.dart';
import 'package:frontend/presentation/screens/perfil/perfil_generico_screen.dart';
import 'package:frontend/core/theme/theme_provider.dart';

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

class RouteKidsApp extends ConsumerWidget {
  const RouteKidsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);

    return MaterialApp(
      title: 'RouteKids',
      themeMode: themeMode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
          iconTheme: IconThemeData(color: Colors.black87),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
        ),
        dialogTheme: const DialogThemeData(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
        ),
        dividerTheme: const DividerThemeData(
          color: Colors.black12,
          thickness: 1,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.grey.shade50,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        listTileTheme: const ListTileThemeData(
          iconColor: Colors.black54,
          textColor: Colors.black87,
        ),
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF121212),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1E1E1E),
          foregroundColor: Colors.white,
          elevation: 0,
          iconTheme: IconThemeData(color: Colors.white),
        ),
        cardTheme: const CardThemeData(
          color: Color(0xFF1E1E1E),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
        ),
        dialogTheme: const DialogThemeData(
          backgroundColor: Color(0xFF1E1E1E),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
        ),
        dividerTheme: const DividerThemeData(
          color: Colors.white12,
          thickness: 1,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white10,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        listTileTheme: const ListTileThemeData(
          iconColor: Colors.white70,
          textColor: Colors.white,
        ),
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
              return RutasScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 3:
              return ParadasScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 4:
              return AlumnosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 5:
              return PagosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 6:
              return PerfilGenericoScreen(usuario: widget.usuario);
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
              return PerfilGenericoScreen(usuario: widget.usuario);
            default:
              return MiRutaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
          }
        case 'admin':
          switch (_currentIndex) {
            case 0:
              return AdministracionUsuariosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 1:
              return AsistenciaScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 2:
              return PerfilAdminScreen(
                usuario: widget.usuario,
              );
            default:
              return AdministracionUsuariosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
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
              return PerfilGenericoScreen(usuario: widget.usuario);
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
