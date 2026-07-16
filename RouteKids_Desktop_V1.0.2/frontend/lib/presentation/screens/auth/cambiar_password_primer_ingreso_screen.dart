import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:frontend/core/config/api_config.dart';
import 'package:frontend/core/utils/top_snackbar.dart';
import 'package:frontend/main.dart';

class CambiarPasswordPrimerIngresoScreen extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const CambiarPasswordPrimerIngresoScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  State<CambiarPasswordPrimerIngresoScreen> createState() =>
      _CambiarPasswordPrimerIngresoScreenState();
}

class _CambiarPasswordPrimerIngresoScreenState
    extends State<CambiarPasswordPrimerIngresoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nuevaPasswordController = TextEditingController();
  final _confirmarPasswordController = TextEditingController();

  bool _isLoading = false;
  bool _obscureNueva = true;
  bool _obscureConfirmar = true;
  String? _errorGeneral;

  @override
  void dispose() {
    _nuevaPasswordController.dispose();
    _confirmarPasswordController.dispose();
    super.dispose();
  }

  // Validación idéntica al backend: mayúscula, número, carácter especial, mín. 8
  String? _validarPassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Ingresa la nueva contraseña';
    }
    if (value.length < 8) {
      return 'Mínimo 8 caracteres';
    }
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return 'Debe contener al menos una mayúscula';
    }
    if (!RegExp(r'\d').hasMatch(value)) {
      return 'Debe contener al menos un número';
    }
    if (!RegExp(r'[!@#$%^&*(),.?":{}|<>]').hasMatch(value)) {
      return 'Debe contener al menos un carácter especial (!@#\$%...)';
    }
    return null;
  }

  Future<void> _cambiarPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorGeneral = null;
    });

    try {
      final response = await http
          .patch(
            Uri.parse('${ApiConfig.baseUrl}/api/v1/auth/cambiar-password'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${widget.accessToken}',
            },
            body: jsonEncode({
              'password_actual': widget.usuario['_password_temporal'],
              'nueva_password': _nuevaPasswordController.text,
              'confirmar_nueva_password': _confirmarPasswordController.text,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          // Actualizar el usuario con primer_ingreso=false
          final usuarioActualizado =
              Map<String, dynamic>.from(widget.usuario);
          usuarioActualizado['primer_ingreso'] = false;
          usuarioActualizado.remove('_password_temporal');

          TopSnackBar.showSuccess(
            context,
            '¡Contraseña actualizada! Bienvenido a RouteKids.',
          );

          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => HomePage(
                accessToken: widget.accessToken,
                usuario: usuarioActualizado,
              ),
            ),
          );
        }
      } else {
        final data = jsonDecode(response.body);
        final detail = data['detail'] ?? 'Error al cambiar contraseña';
        // Manejar errores de validación de Pydantic (lista)
        if (detail is List) {
          final msgs = detail
              .map((e) => e['msg']?.toString() ?? '')
              .where((m) => m.isNotEmpty)
              .join('\n');
          setState(() => _errorGeneral = msgs);
        } else {
          setState(() => _errorGeneral = detail.toString());
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorGeneral = 'Error de conexión. Intenta de nuevo.');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    // Bloquear navegación con PopScope
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: Center(
          child: SingleChildScrollView(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 480),
              margin: const EdgeInsets.all(32),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Ícono
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: colorScheme.primary.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.lock_reset,
                            size: 40,
                            color: colorScheme.primary,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Título
                        Text(
                          'Bienvenido a RouteKids',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: colorScheme.onSurface,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),

                        // Subtítulo
                        Text(
                          'Por seguridad debes cambiar tu contraseña antes de continuar.',
                          style: TextStyle(
                            fontSize: 14,
                            color: colorScheme.onSurface.withValues(alpha: 0.65),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),

                        // Error general
                        if (_errorGeneral != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: colorScheme.errorContainer,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline,
                                    color: colorScheme.onErrorContainer),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorGeneral!,
                                    style: TextStyle(
                                        color: colorScheme.onErrorContainer),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Campo nueva contraseña
                        TextFormField(
                          controller: _nuevaPasswordController,
                          obscureText: _obscureNueva,
                          decoration: InputDecoration(
                            labelText: 'Nueva contraseña',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(_obscureNueva
                                  ? Icons.visibility
                                  : Icons.visibility_off),
                              onPressed: () => setState(
                                  () => _obscureNueva = !_obscureNueva),
                            ),
                          ),
                          validator: _validarPassword,
                        ),
                        const SizedBox(height: 16),

                        // Campo confirmar contraseña
                        TextFormField(
                          controller: _confirmarPasswordController,
                          obscureText: _obscureConfirmar,
                          decoration: InputDecoration(
                            labelText: 'Confirmar contraseña',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(_obscureConfirmar
                                  ? Icons.visibility
                                  : Icons.visibility_off),
                              onPressed: () => setState(
                                  () => _obscureConfirmar = !_obscureConfirmar),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Confirma tu contraseña';
                            }
                            if (value != _nuevaPasswordController.text) {
                              return 'Las contraseñas no coinciden';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 8),

                        // Hint de reglas
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Mín. 8 caracteres · 1 mayúscula · 1 número · 1 carácter especial',
                            style: TextStyle(
                              fontSize: 11,
                              color:
                                  colorScheme.onSurface.withValues(alpha: 0.55),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Botón
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: FilledButton(
                            onPressed: _isLoading ? null : _cambiarPassword,
                            child: _isLoading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white),
                                  )
                                : const Text(
                                    'Cambiar contraseña',
                                    style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
