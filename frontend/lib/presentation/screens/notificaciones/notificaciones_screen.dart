import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:frontend/controlador/notificaciones_service.dart';

class NotificacionesScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> usuario;
  final String accessToken;

  const NotificacionesScreen({
    super.key,
    required this.usuario,
    required this.accessToken,
  });

  @override
  ConsumerState<NotificacionesScreen> createState() =>
      _NotificacionesScreenState();
}

class _NotificacionesScreenState extends ConsumerState<NotificacionesScreen> {
  late Future<List<Map<String, dynamic>>> _notificacionesFuture;

  @override
  void initState() {
    super.initState();
    _notificacionesFuture = _cargarNotificaciones();
  }

  Future<List<Map<String, dynamic>>> _cargarNotificaciones() async {
    final notificaciones = await fetchNotificaciones(widget.accessToken);
    notificaciones.sort((a, b) {
      final fechaA =
          _parseFecha(a['creado_en']) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final fechaB =
          _parseFecha(b['creado_en']) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return fechaB.compareTo(fechaA);
    });
    return notificaciones;
  }

  DateTime? _parseFecha(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is DateTime) {
      return value.toLocal();
    }
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value).toLocal();
    }

    final texto = value.toString().trim();
    if (texto.isEmpty) {
      return null;
    }

    final variantes = <String>[
      texto,
      texto.replaceFirst(' ', 'T'),
      texto.replaceFirst(' ', 'T').replaceFirst('Z', '+00:00'),
    ];

    for (final candidato in variantes) {
      final parsed = DateTime.tryParse(candidato);
      if (parsed != null) {
        return parsed.toLocal();
      }
    }

    return null;
  }

  Color _getTipoColor(String tipo) {
    switch (tipo) {
      case 'llegada':
        return Colors.green;
      case 'salida':
        return Colors.orange;
      case 'pago':
        return Colors.blue;
      case 'alerta':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getTipoIcon(String tipo) {
    switch (tipo) {
      case 'llegada':
        return Icons.arrow_upward;
      case 'salida':
        return Icons.arrow_downward;
      case 'pago':
        return Icons.payment;
      case 'alerta':
        return Icons.warning;
      default:
        return Icons.notifications;
    }
  }

  String _horaAbsoluta(String fechaIso) {
    try {
      final fecha = _parseFecha(fechaIso);
      if (fecha == null) {
        return '--:--';
      }
      final hora = fecha.hour.toString().padLeft(2, '0');
      final minuto = fecha.minute.toString().padLeft(2, '0');
      return '$hora:$minuto';
    } catch (e) {
      return '--:--';
    }
  }

  String _tiempoRelativo(String fechaIso) {
    try {
      final fecha = _parseFecha(fechaIso);
      if (fecha == null) {
        return 'fecha desconocida';
      }
      final diferencia = DateTime.now().difference(fecha);

      if (diferencia.inMinutes < 1) {
        return 'hace unos segundos';
      }
      if (diferencia.inMinutes < 60) {
        return 'hace ${diferencia.inMinutes} min';
      }
      if (diferencia.inHours < 24) {
        return 'hace ${diferencia.inHours} h';
      }
      const meses = [
        'ene',
        'feb',
        'mar',
        'abr',
        'may',
        'jun',
        'jul',
        'ago',
        'sep',
        'oct',
        'nov',
        'dic',
      ];
      return '${fecha.day} ${meses[fecha.month - 1]}';
    } catch (e) {
      return 'fecha desconocida';
    }
  }

  Future<void> _refrescar() async {
    if (!mounted) {
      return;
    }
    setState(() {
      _notificacionesFuture = _cargarNotificaciones();
    });
  }

  Future<void> _marcarComoLeida(int notificacionId) async {
    final ok = await marcarNotificacionComoLeida(
      widget.accessToken,
      notificacionId,
    );
    if (ok) {
      await _refrescar();
    }
  }

  Future<void> _eliminarNotificacion(int notificacionId) async {
    final ok = await eliminarNotificacion(widget.accessToken, notificacionId);
    if (ok) {
      await _refrescar();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Notificación eliminada')));
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo eliminar la notificación')),
      );
    }
  }

  String _mensajeConHora(Map<String, dynamic> notif) {
    final mensaje = notif['mensaje']?.toString() ?? '';
    final hora = _horaAbsoluta(notif['creado_en']?.toString() ?? '');
    final relativo = _tiempoRelativo(notif['creado_en']?.toString() ?? '');
    return '$mensaje · $hora · $relativo';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _notificacionesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  const Text('Error al cargar notificaciones'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _refrescar,
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }

          final notificaciones = snapshot.data ?? [];

          if (notificaciones.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_none,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No hay notificaciones',
                    style: TextStyle(color: Colors.grey[600], fontSize: 16),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _cargarNotificaciones,
            child: ListView.builder(
              itemCount: notificaciones.length,
              itemBuilder: (context, index) {
                final notif = notificaciones[index];
                final tipo = notif['tipo']?.toString() ?? 'alerta';
                final leida = notif['leida'] == true;
                final tipoColor = _getTipoColor(tipo);
                final tipoIcon = _getTipoIcon(tipo);
                final id = notif['id'] as int;

                return Dismissible(
                  key: Key(id.toString()),
                  direction: DismissDirection.endToStart,
                  confirmDismiss: (direction) async {
                    await _eliminarNotificacion(id);
                    return false;
                  },
                  background: Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 24),
                    color: Colors.red.shade400,
                    child: const Icon(
                      Icons.delete_outline,
                      color: Colors.white,
                    ),
                  ),
                  child: Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: leida ? Colors.grey[50] : Colors.blue[50],
                      border: Border(
                        left: BorderSide(color: tipoColor, width: 4),
                      ),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      leading: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Color.fromRGBO(
                            (tipoColor.r * 255).round().clamp(0, 255),
                            (tipoColor.g * 255).round().clamp(0, 255),
                            (tipoColor.b * 255).round().clamp(0, 255),
                            0.2,
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(tipoIcon, color: tipoColor),
                      ),
                      title: Text(
                        notif['titulo']?.toString() ?? 'Sin título',
                        style: TextStyle(
                          fontWeight: leida
                              ? FontWeight.normal
                              : FontWeight.bold,
                        ),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(_mensajeConHora(notif)),
                          const SizedBox(height: 4),
                          Text(
                            _horaAbsoluta(notif['creado_en']?.toString() ?? ''),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!leida)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.blue,
                                shape: BoxShape.circle,
                              ),
                            ),
                          IconButton(
                            tooltip: 'Eliminar notificación',
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () => _eliminarNotificacion(id),
                          ),
                        ],
                      ),
                      onTap: () {
                        if (!leida) {
                          _marcarComoLeida(id);
                        }
                      },
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
