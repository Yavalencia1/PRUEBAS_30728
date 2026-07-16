import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/theme/theme_provider.dart';

class PerfilGenericoScreen extends ConsumerWidget {
  final Map<String, dynamic> usuario;

  const PerfilGenericoScreen({super.key, required this.usuario});

  static const Color _primary = Color(0xFF534AB7);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final nombre = usuario['nombre'] ?? 'Usuario';
    final apellido = usuario['apellido'] ?? '';
    final email = usuario['email'] ?? 'usuario@routekids.com';
    final rol = (usuario['rol'] ?? 'padre').toString().toUpperCase();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Perfil'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 56,
                  backgroundColor: _primary.withOpacity(0.1),
                  child: Text(
                    nombre.isNotEmpty ? nombre[0].toUpperCase() : 'U',
                    style: const TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: _primary,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  '$nombre $apellido'.trim(),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  email,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: _primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _primary.withOpacity(0.3)),
                  ),
                  child: Text(
                    rol,
                    style: const TextStyle(
                      color: _primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 48),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.dark_mode, size: 28),
                            const SizedBox(width: 16),
                            const Text(
                              'Modo Oscuro',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        Switch(
                          value: ref.watch(themeProvider) == ThemeMode.dark,
                          onChanged: (isDark) {
                            ref.read(themeProvider.notifier).toggleTheme(isDark);
                          },
                          activeColor: _primary,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
