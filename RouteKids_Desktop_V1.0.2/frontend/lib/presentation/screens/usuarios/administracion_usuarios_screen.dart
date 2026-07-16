import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/controlador/usuarios_service.dart';
import 'package:frontend/modelo/usuario_modelo.dart';
import 'package:frontend/core/utils/validators.dart';
import 'package:frontend/core/utils/top_snackbar.dart';

// ── Providers ────────────────────────────────────────────────────────────────

final usuariosProvider = FutureProvider.autoDispose
    .family<List<UsuarioModelo>, String>((ref, accessToken) async {
  final service = ref.watch(usuariosServiceProvider);
  return service.listarUsuarios(accessToken: accessToken);
});

// ── Pantalla principal ───────────────────────────────────────────────────────

class AdministracionUsuariosScreen extends ConsumerStatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const AdministracionUsuariosScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  ConsumerState<AdministracionUsuariosScreen> createState() =>
      _AdministracionUsuariosScreenState();
}

class _AdministracionUsuariosScreenState
    extends ConsumerState<AdministracionUsuariosScreen> {
  static const Color _primary = Color(0xFF534AB7);

  String? _filtroRol;

  Future<void> _refrescar() async {
    ref.invalidate(usuariosProvider(widget.accessToken));
    await ref.read(usuariosProvider(widget.accessToken).future);
  }

  Future<void> _abrirDialogoCrear() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _DialogoCrearUsuario(
        accessToken: widget.accessToken,
        onCreado: _refrescar,
      ),
    );
  }

  Future<void> _confirmarEliminar(UsuarioModelo usuario) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar usuario'),
        content: Text(
          '¿Deseas eliminar a ${usuario.nombreCompleto}?\n\nEsta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirmar != true || !mounted) return;

    try {
      await ref.read(usuariosServiceProvider).eliminarUsuario(
            accessToken: widget.accessToken,
            usuarioId: usuario.id,
          );
      if (mounted) {
        TopSnackBar.showSuccess(context, 'Usuario ${usuario.nombreCompleto} eliminado.');
      }
      await _refrescar();
    } catch (e) {
      if (mounted) {
        TopSnackBar.showError(context, 'Error al eliminar: $e');
      }
    }
  }

  List<UsuarioModelo> _aplicarFiltro(List<UsuarioModelo> usuarios) {
    if (_filtroRol == null || _filtroRol!.isEmpty) return usuarios;
    return usuarios.where((u) => u.rol == _filtroRol).toList();
  }

  @override
  Widget build(BuildContext context) {
    final asyncUsuarios = ref.watch(usuariosProvider(widget.accessToken));

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refrescar,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          children: [
            // ── Encabezado ────────────────────────────────────────────────
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Administración de Usuarios',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: _primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Gestiona los usuarios del sistema. Solo el administrador puede crear y eliminar usuarios.',
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                FilledButton.icon(
                  onPressed: _abrirDialogoCrear,
                  style: FilledButton.styleFrom(
                    backgroundColor: _primary,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 14),
                  ),
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Crear Usuario'),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // ── Filtros de rol ────────────────────────────────────────────
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ChipFiltro(
                  label: 'Todos',
                  seleccionado: _filtroRol == null,
                  color: _primary,
                  onTap: () => setState(() => _filtroRol = null),
                ),
                _ChipFiltro(
                  label: 'Dueños',
                  seleccionado: _filtroRol == 'dueno',
                  color: Colors.indigo,
                  onTap: () => setState(() => _filtroRol = 'dueno'),
                ),
                _ChipFiltro(
                  label: 'Conductores',
                  seleccionado: _filtroRol == 'conductor',
                  color: Colors.teal,
                  onTap: () => setState(() => _filtroRol = 'conductor'),
                ),
                _ChipFiltro(
                  label: 'Padres',
                  seleccionado: _filtroRol == 'padre',
                  color: Colors.orange,
                  onTap: () => setState(() => _filtroRol = 'padre'),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // ── Lista de usuarios ─────────────────────────────────────────
            asyncUsuarios.when(
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 48),
                  child: Column(
                    children: [
                      Icon(Icons.error_outline,
                          size: 48, color: Colors.red.shade300),
                      const SizedBox(height: 12),
                      Text(
                        'No se pudieron cargar los usuarios.\n$error',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: _refrescar,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Reintentar'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (usuarios) {
                final filtrados = _aplicarFiltro(usuarios);

                if (filtrados.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 48),
                      child: Column(
                        children: [
                          Icon(Icons.people_outline,
                              size: 56, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text(
                            'No hay usuarios para mostrar.',
                            style: TextStyle(
                                color: Colors.grey.shade600, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return Column(
                  children: filtrados
                      .map((u) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _TarjetaUsuario(
                              usuario: u,
                              onEliminar: () => _confirmarEliminar(u),
                            ),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Tarjeta de usuario ───────────────────────────────────────────────────────

class _TarjetaUsuario extends StatelessWidget {
  final UsuarioModelo usuario;
  final VoidCallback onEliminar;

  const _TarjetaUsuario({
    required this.usuario,
    required this.onEliminar,
  });

  Color _colorRol(String rol) {
    switch (rol.toLowerCase()) {
      case 'admin':
        return Colors.deepPurple;
      case 'dueno':
        return Colors.indigo;
      case 'conductor':
        return Colors.teal;
      case 'padre':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorRol = _colorRol(usuario.rol);

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            // Avatar con inicial
            CircleAvatar(
              radius: 24,
              backgroundColor: colorRol.withOpacity(0.15),
              child: Text(
                usuario.nombre.isNotEmpty
                    ? usuario.nombre[0].toUpperCase()
                    : '?',
                style: TextStyle(
                  color: colorRol,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Datos principales
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    usuario.nombreCompleto,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    usuario.email,
                    style: TextStyle(
                        fontSize: 13, color: Colors.grey.shade600),
                  ),
                  if (usuario.telefono != null &&
                      usuario.telefono!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      usuario.telefono!,
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(width: 12),

            // Chip de rol
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: colorRol.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: colorRol.withOpacity(0.3)),
              ),
              child: Text(
                usuario.rolEtiqueta,
                style: TextStyle(
                  color: colorRol,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

            // Indicador primer ingreso
            if (usuario.primerIngreso) ...[
              const SizedBox(width: 8),
              Tooltip(
                message: 'Aún no ha iniciado sesión',
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.amber.shade300),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.lock_clock,
                          size: 12, color: Colors.amber.shade700),
                      const SizedBox(width: 4),
                      Text(
                        'Temporal',
                        style: TextStyle(
                            fontSize: 11, color: Colors.amber.shade800),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(width: 12),

            // Botón eliminar (no para admin)
            if (usuario.rol != 'admin')
              IconButton(
                onPressed: onEliminar,
                icon: const Icon(Icons.delete_outline),
                color: Colors.red.shade400,
                tooltip: 'Eliminar usuario',
              ),
          ],
        ),
      ),
    );
  }
}

// ── Chip de filtro ───────────────────────────────────────────────────────────

class _ChipFiltro extends StatelessWidget {
  final String label;
  final bool seleccionado;
  final Color color;
  final VoidCallback onTap;

  const _ChipFiltro({
    required this.label,
    required this.seleccionado,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: seleccionado ? color : color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: seleccionado ? color : color.withOpacity(0.3)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: seleccionado ? Colors.white : color,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

// ── Diálogo crear usuario ────────────────────────────────────────────────────

class _DialogoCrearUsuario extends ConsumerStatefulWidget {
  final String accessToken;
  final Future<void> Function() onCreado;

  const _DialogoCrearUsuario({
    required this.accessToken,
    required this.onCreado,
  });

  @override
  ConsumerState<_DialogoCrearUsuario> createState() =>
      _DialogoCrearUsuarioState();
}

class _DialogoCrearUsuarioState extends ConsumerState<_DialogoCrearUsuario> {
  static const Color _primary = Color(0xFF534AB7);

  final _formKey = GlobalKey<FormState>();
  final _nombreCtrl = TextEditingController();
  final _apellidoCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  String _rolSeleccionado = 'padre';
  bool _cargando = false;

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _emailCtrl.dispose();
    _telefonoCtrl.dispose();
    super.dispose();
  }

  Future<void> _crear() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _cargando = true);

    try {
      final resultado = await ref.read(usuariosServiceProvider).crearUsuario(
            accessToken: widget.accessToken,
            nombre: _nombreCtrl.text.trim(),
            apellido: _apellidoCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
            telefono: _telefonoCtrl.text.trim().isEmpty
                ? null
                : _telefonoCtrl.text.trim(),
            rol: _rolSeleccionado,
          );

      if (!mounted) return;
      Navigator.of(context).pop(); // Cierra el diálogo de formulario

      // Muestra diálogo con credenciales
      await showDialog<void>(
        // ignore: use_build_context_synchronously
        context: context,
        builder: (ctx) => _DialogoCredenciales(
          email: resultado.usuario.email,
          password: resultado.passwordTemporal,
        ),
      );

      await widget.onCreado();
    } catch (e) {
      if (mounted) {
        TopSnackBar.showError(context, 'Error al crear usuario: $e');
      }
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Título
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: _primary.withOpacity(0.1),
                      child: const Icon(Icons.person_add_alt_1,
                          color: _primary),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Crear Usuario',
                      style: TextStyle(
                          fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Se generará una contraseña temporal automáticamente.',
                  style: TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 24),

                // Nombre
                TextFormField(
                  controller: _nombreCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Nombre *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  textCapitalization: TextCapitalization.words,
                  validator: Validators.validarNombre,
                ),
                const SizedBox(height: 16),

                // Apellido
                TextFormField(
                  controller: _apellidoCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Apellido *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  textCapitalization: TextCapitalization.words,
                  validator: Validators.validarNombre,
                ),
                const SizedBox(height: 16),

                // Email
                TextFormField(
                  controller: _emailCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Correo electrónico *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: Validators.validarEmail,
                ),
                const SizedBox(height: 16),

                // Teléfono (opcional)
                TextFormField(
                  controller: _telefonoCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Teléfono (opcional)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                ),
                const SizedBox(height: 16),

                // Rol
                DropdownButtonFormField<String>(
                  value: _rolSeleccionado,
                  decoration: const InputDecoration(
                    labelText: 'Rol *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.manage_accounts_outlined),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'dueno', child: Text('Dueño')),
                    DropdownMenuItem(
                        value: 'conductor', child: Text('Conductor')),
                    DropdownMenuItem(value: 'padre', child: Text('Padre')),
                  ],
                  onChanged: (v) {
                    if (v != null) setState(() => _rolSeleccionado = v);
                  },
                ),

                const SizedBox(height: 28),

                // Botones
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed:
                          _cargando ? null : () => Navigator.of(context).pop(),
                      child: const Text('Cancelar'),
                    ),
                    const SizedBox(width: 12),
                    FilledButton.icon(
                      onPressed: _cargando ? null : _crear,
                      style: FilledButton.styleFrom(
                          backgroundColor: _primary),
                      icon: _cargando
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.check),
                      label: Text(_cargando ? 'Creando...' : 'Crear Usuario'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Diálogo de credenciales ──────────────────────────────────────────────────

class _DialogoCredenciales extends StatelessWidget {
  final String email;
  final String password;

  const _DialogoCredenciales({
    required this.email,
    required this.password,
  });

  static const Color _primary = Color(0xFF534AB7);

  void _copiar(BuildContext context) {
    final texto = 'Usuario: $email\nContraseña temporal: $password';
    Clipboard.setData(ClipboardData(text: texto));
    TopSnackBar.showSuccess(context, 'Credenciales copiadas al portapapeles');
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SizedBox(
        width: 400,
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icono de éxito
              CircleAvatar(
                radius: 30,
                backgroundColor: Colors.green.withOpacity(0.1),
                child: Icon(Icons.check_circle,
                    size: 40, color: Colors.green.shade600),
              ),
              const SizedBox(height: 16),
              const Text(
                '¡Usuario creado exitosamente!',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Comparte estas credenciales temporales con el usuario.',
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Caja de credenciales
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Theme.of(context).colorScheme.outline.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _FilaCredencial(
                        etiqueta: 'Usuario', valor: email),
                    const Divider(height: 20),
                    _FilaCredencial(
                      etiqueta: 'Contraseña temporal',
                      valor: password,
                      destacado: true,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Botones
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _copiar(context),
                      icon: const Icon(Icons.copy),
                      label: const Text('Copiar credenciales'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: FilledButton.styleFrom(
                          backgroundColor: _primary),
                      child: const Text('Aceptar'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilaCredencial extends StatelessWidget {
  final String etiqueta;
  final String valor;
  final bool destacado;

  const _FilaCredencial({
    required this.etiqueta,
    required this.valor,
    this.destacado = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          etiqueta,
          style: TextStyle(
              fontSize: 11,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          valor,
          style: TextStyle(
            fontSize: destacado ? 18 : 14,
            fontWeight:
                destacado ? FontWeight.bold : FontWeight.w500,
            color: destacado ? const Color(0xFF534AB7) : Theme.of(context).colorScheme.onSurface,
            letterSpacing: destacado ? 1.5 : 0,
          ),
        ),
      ],
    );
  }
}
