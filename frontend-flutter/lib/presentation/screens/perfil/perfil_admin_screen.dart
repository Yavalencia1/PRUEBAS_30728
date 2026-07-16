import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/core/theme/theme_provider.dart';

class PerfilAdminScreen extends ConsumerWidget {
  final Map<String, dynamic> usuario;

  const PerfilAdminScreen({super.key, required this.usuario});

  static const Color _primary = Color(0xFF534AB7);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final nombre = usuario['nombre'] ?? 'Administrador';
    final apellido = usuario['apellido'] ?? '';
    final email = usuario['email'] ?? 'admin@routekids.com';
    final rol = (usuario['rol'] ?? 'admin').toString().toUpperCase();

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Perfil Administrativo',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: _primary,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Panel de control institucional y funciones del administrador.',
                      style: TextStyle(color: Colors.black54),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.dark_mode_outlined, color: Colors.grey),
                    const SizedBox(width: 8),
                    Switch(
                      value: ref.watch(themeProvider) == ThemeMode.dark,
                      onChanged: (isDark) {
                        ref.read(themeProvider.notifier).toggleTheme(isDark);
                      },
                      activeColor: _primary,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 32),

            // ── Grid Layout para pantallas grandes ────────────────────────
            LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth > 800) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 1,
                        child: _buildInfoAdmin(context, nombre, apellido, email, rol),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildAcercaDe(),
                            const SizedBox(height: 24),
                            _buildFunciones(),
                          ],
                        ),
                      ),
                    ],
                  );
                }
                // Disposición en columna para pantallas más pequeñas
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildInfoAdmin(context, nombre, apellido, email, rol),
                    const SizedBox(height: 24),
                    _buildAcercaDe(),
                    const SizedBox(height: 24),
                    _buildFunciones(),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  // ── Tarjeta de Información del Administrador ─────────────────────────
  Widget _buildInfoAdmin(BuildContext context, String nombre, String apellido, String email, String rol) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            CircleAvatar(
              radius: 48,
              backgroundColor: _primary.withOpacity(0.1),
              child: Text(
                nombre.isNotEmpty ? nombre[0].toUpperCase() : 'A',
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: _primary,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              '$nombre $apellido'.trim(),
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
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
                  letterSpacing: 1.2,
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Divider(height: 1),
            const SizedBox(height: 24),
            _buildInfoRow(context, Icons.email_outlined, email),
            const SizedBox(height: 16),
            _buildInfoRow(context, Icons.security_outlined, 'Acceso Total al Sistema'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: Colors.grey.shade600, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 15,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
            ),
          ),
        ),
      ],
    );
  }

  // ── Tarjeta Acerca de RouteKids ──────────────────────────────────────
  Widget _buildAcercaDe() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.directions_bus, color: _primary, size: 28),
                const SizedBox(width: 12),
                const Text(
                  'Acerca de RouteKids',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'RouteKids es un sistema de gestión y seguimiento del transporte escolar que permite administrar recorridos, rutas, conductores, padres de familia y alumnos, mejorando la seguridad y el control de las operaciones.',
              style: TextStyle(
                fontSize: 16,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Tarjeta Funciones del Administrador ──────────────────────────────
  Widget _buildFunciones() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.admin_panel_settings, color: _primary, size: 28),
                const SizedBox(width: 12),
                const Text(
                  'Funciones del Administrador',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildFuncionItem(
              icon: Icons.person_add_alt_1,
              title: 'Crear usuarios del sistema.',
            ),
            _buildFuncionItem(
              icon: Icons.business,
              title: 'Gestionar cuentas de Dueños.',
            ),
            _buildFuncionItem(
              icon: Icons.drive_eta,
              title: 'Gestionar Conductores.',
            ),
            _buildFuncionItem(
              icon: Icons.family_restroom,
              title: 'Gestionar Padres.',
            ),
            _buildFuncionItem(
              icon: Icons.checklist_rtl,
              title: 'Supervisar asistencias.',
            ),
            _buildFuncionItem(
              icon: Icons.security,
              title: 'Administrar el acceso al sistema.',
              showDivider: false,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFuncionItem({
    required IconData icon,
    required String title,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.blue.shade700, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        if (showDivider)
          Padding(
            padding: const EdgeInsets.only(left: 56, top: 12, bottom: 12),
            child: Divider(height: 1, color: Colors.grey.shade200),
          ),
      ],
    );
  }
}
