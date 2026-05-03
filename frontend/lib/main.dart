import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/presentation/layouts/main_layout.dart';
import 'package:frontend/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:frontend/presentation/screens/ruta/mi_ruta_screen.dart';
import 'package:frontend/presentation/screens/mapa/mapa_screen.dart';
import 'package:frontend/presentation/screens/asistencia/asistencia_screen.dart';
import 'package:frontend/presentation/screens/notificaciones/notificaciones_screen.dart';
import 'package:frontend/vista/pagos_screen.dart';

void main() {
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

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await http.post(
        Uri.parse('http://localhost:8000/api/v1/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailController.text,
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          final tokens = data['data']['tokens'];
          final usuario = data['data']['usuario'];

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('¡Bienvenido, ${usuario['nombre']}!')),
            );
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => HomePage(
                  accessToken: tokens['access_token'],
                  usuario: usuario,
                ),
              ),
            );
          }
        }
      } else {
        setState(() {
          _errorMessage = 'Error: Email o contraseña incorrectos';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error de conexión: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('RouteKids - Login'), centerTitle: true),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Iniciar Sesión',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Correo',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  decoration: const InputDecoration(
                    labelText: 'Contraseña',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock),
                  ),
                  obscureText: true,
                ),
                const SizedBox(height: 24),
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(8),
                    color: Colors.red.shade100,
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red.shade900),
                    ),
                  ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Iniciar Sesión'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const RegisterPage(),
                      ),
                    );
                  },
                  child: const Text('¿No tienes cuenta? Regístrate'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _nameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRol = 'padre';
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await http.post(
        Uri.parse('http://localhost:8000/api/v1/auth/registro'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'nombre': _nameController.text,
          'apellido': _lastNameController.text,
          'email': _emailController.text,
          'telefono': _phoneController.text,
          'password': _passwordController.text,
          'rol': _selectedRol,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('¡Registro exitoso! Inicia sesión.'),
              ),
            );
            Navigator.of(context).pop();
          }
        }
      } else {
        setState(() {
          _errorMessage = 'Error al registrarse. Intenta de nuevo.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error de conexión: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('RouteKids - Registro'),
        centerTitle: true,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Crear Cuenta',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nombre',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _lastNameController,
                    decoration: const InputDecoration(
                      labelText: 'Apellido',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _emailController,
                    decoration: const InputDecoration(
                      labelText: 'Correo',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.email),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _phoneController,
                    decoration: const InputDecoration(
                      labelText: 'Teléfono',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.phone),
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Contraseña',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _selectedRol,
                    decoration: const InputDecoration(
                      labelText: 'Rol',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.security),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'padre', child: Text('Padre')),
                      DropdownMenuItem(
                        value: 'conductor',
                        child: Text('Conductor'),
                      ),
                      DropdownMenuItem(value: 'dueno', child: Text('Dueño')),
                      DropdownMenuItem(value: 'admin', child: Text('Admin')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _selectedRol = value ?? 'padre';
                      });
                    },
                  ),
                  const SizedBox(height: 24),
                  if (_errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(8),
                      color: Colors.red.shade100,
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(color: Colors.red.shade900),
                      ),
                    ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _register,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator()
                        : const Text('Registrarse'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

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
              return const Center(
                child: Text(
                  'Pantalla de Recorridos en construcción',
                  style: TextStyle(fontSize: 20),
                ),
              );
            case 2:
              return const Center(
                child: Text(
                  'Pantalla de Alumnos en construcción',
                  style: TextStyle(fontSize: 20),
                ),
              );
            case 3:
              return PagosScreen(
                accessToken: widget.accessToken,
                usuario: widget.usuario,
              );
            case 4:
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
