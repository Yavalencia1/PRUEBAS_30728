import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class AsistenciaAlumnoHistorial {
  final int? id;
  final int alumnoId;
  final String alumnoNombre;
  final DateTime? horaSubida;
  final DateTime? horaBajada;
  final String estado;

  AsistenciaAlumnoHistorial({
    required this.id,
    required this.alumnoId,
    required this.alumnoNombre,
    required this.horaSubida,
    required this.horaBajada,
    required this.estado,
  });

  bool get presente => horaSubida != null && estado != 'ausente';

  factory AsistenciaAlumnoHistorial.fromJson(Map<String, dynamic> json) {
    return AsistenciaAlumnoHistorial(
      id: json['id'] as int?,
      alumnoId: json['alumno_id'] as int,
      alumnoNombre: (json['alumno_nombre'] as String?) ?? 'Alumno desconocido',
      horaSubida: json['hora_subida'] != null
          ? DateTime.parse(json['hora_subida'] as String)
          : null,
      horaBajada: json['hora_bajada'] != null
          ? DateTime.parse(json['hora_bajada'] as String)
          : null,
      estado: (json['estado'] as String?) ?? 'ausente',
    );
  }
}

class SesionHistorialAgrupada {
  final int id;
  final int rutaId;
  final String rutaNombre;
  final int conductorId;
  final String conductorNombre;
  final DateTime inicio;
  final DateTime? fin;
  final DateTime horaInicio;
  final DateTime? horaFin;
  final String estado;
  final int totalPresentes;
  final int totalAusentes;
  final List<AsistenciaAlumnoHistorial> asistencias;

  SesionHistorialAgrupada({
    required this.id,
    required this.rutaId,
    required this.rutaNombre,
    required this.conductorId,
    required this.conductorNombre,
    required this.inicio,
    required this.fin,
    required this.horaInicio,
    required this.horaFin,
    required this.estado,
    required this.totalPresentes,
    required this.totalAusentes,
    required this.asistencias,
  });

  factory SesionHistorialAgrupada.fromJson(Map<String, dynamic> json) {
    final asistenciasJson = (json['asistencias'] as List<dynamic>? ?? const []);
    final inicio = DateTime.parse(json['inicio'] as String);
    final fin = json['fin'] != null
        ? DateTime.parse(json['fin'] as String)
        : null;
    final horaInicio = json['hora_inicio'] != null
        ? DateTime.parse(json['hora_inicio'] as String)
        : inicio;
    final horaFin = json['hora_fin'] != null
        ? DateTime.parse(json['hora_fin'] as String)
        : fin;

    return SesionHistorialAgrupada(
      id: json['id'] as int,
      rutaId: json['ruta_id'] as int,
      rutaNombre: (json['ruta_nombre'] as String?) ?? 'Ruta desconocida',
      conductorId: json['conductor_id'] as int,
      conductorNombre:
          (json['conductor_nombre'] as String?) ?? 'Conductor desconocido',
      inicio: inicio,
      fin: fin,
      horaInicio: horaInicio,
      horaFin: horaFin,
      estado: (json['estado'] as String?) ?? 'completada',
      totalPresentes: (json['total_presentes'] as num?)?.toInt() ?? 0,
      totalAusentes: (json['total_ausentes'] as num?)?.toInt() ?? 0,
      asistencias: asistenciasJson
          .map(
            (item) => AsistenciaAlumnoHistorial.fromJson(
              item as Map<String, dynamic>,
            ),
          )
          .toList(),
    );
  }

  int get duracionMinutos {
    final finEfectiva = horaFin ?? fin ?? horaInicio;
    final segundos = finEfectiva.difference(horaInicio).inSeconds;
    if (segundos <= 0) {
      return 0;
    }
    return (segundos / 60).ceil();
  }
}

class AsistenciaState {
  final bool isLoading;
  final List<SesionHistorialAgrupada> sesiones;
  final String? error;

  AsistenciaState({
    required this.isLoading,
    required this.sesiones,
    this.error,
  });
}

class AsistenciaController extends StateNotifier<AsistenciaState> {
  final String accessToken;

  AsistenciaController({required this.accessToken})
    : super(AsistenciaState(isLoading: true, sesiones: const [])) {
    cargarSesiones();
  }

  Future<void> cargarSesiones() async {
    state = AsistenciaState(isLoading: true, sesiones: const [], error: null);
    try {
      final response = await http
          .get(
            Uri.parse('http://localhost:8000/api/v1/sesiones/historial'),
            headers: {'Authorization': 'Bearer $accessToken'},
          )
          .timeout(const Duration(seconds: 8));

      if (response.statusCode != 200) {
        state = AsistenciaState(
          isLoading: false,
          sesiones: const [],
          error: _extraerError(response.body, response.statusCode),
        );
        return;
      }

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      if (decoded['ok'] != true || decoded['data'] is! List) {
        state = AsistenciaState(
          isLoading: false,
          sesiones: const [],
          error:
              (decoded['mensaje'] as String?) ??
              'Respuesta invalida del servidor',
        );
        return;
      }

      final sesiones = (decoded['data'] as List)
          .map(
            (item) =>
                SesionHistorialAgrupada.fromJson(item as Map<String, dynamic>),
          )
          .toList();

      state = AsistenciaState(
        isLoading: false,
        sesiones: sesiones,
        error: null,
      );
    } catch (e) {
      state = AsistenciaState(
        isLoading: false,
        sesiones: const [],
        error: 'Error al cargar sesiones: $e',
      );
    }
  }

  Future<void> eliminarSesion(int sesionId) async {
    try {
      final response = await http
          .delete(
            Uri.parse('http://localhost:8000/api/v1/sesiones/$sesionId'),
            headers: {'Authorization': 'Bearer $accessToken'},
          )
          .timeout(const Duration(seconds: 8));

      if (response.statusCode != 200) {
        state = AsistenciaState(
          isLoading: false,
          sesiones: state.sesiones,
          error: _extraerError(response.body, response.statusCode),
        );
        return;
      }

      await cargarSesiones();
    } catch (e) {
      state = AsistenciaState(
        isLoading: false,
        sesiones: state.sesiones,
        error: 'Error al eliminar sesión: $e',
      );
    }
  }

  String _extraerError(String body, int statusCode) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final detail =
            decoded['detail'] ?? decoded['mensaje'] ?? decoded['error'];
        if (detail is String && detail.isNotEmpty) {
          return detail;
        }
      }
    } catch (_) {
      // Ignorar y usar fallback.
    }
    return 'Error al cargar sesiones ($statusCode)';
  }
}

final asistenciaProvider = StateNotifierProvider.autoDispose
    .family<AsistenciaController, AsistenciaState, String>(
      (ref, accessToken) => AsistenciaController(accessToken: accessToken),
    );

final asistenciaRefreshTriggerProvider = StateProvider<int>((ref) => 0);

class AsistenciaScreen extends ConsumerWidget {
  final String accessToken;
  final Map<String, dynamic>? usuario;

  const AsistenciaScreen({super.key, required this.accessToken, this.usuario});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(asistenciaProvider(accessToken));
    final controller = ref.read(asistenciaProvider(accessToken).notifier);

    ref.listen<int>(asistenciaRefreshTriggerProvider, (previous, next) {
      if (previous != next) {
        controller.cargarSesiones();
      }
    });

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text(
          'Reporte de Asistencias',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
        actions: [
          IconButton(
            onPressed: controller.cargarSesiones,
            icon: const Icon(Icons.refresh),
            tooltip: 'Recargar',
          ),
        ],
      ),
      body: state.isLoading && state.sesiones.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : state.error != null && state.sesiones.isEmpty
          ? _ErrorState(
              mensaje: state.error!,
              onRetry: controller.cargarSesiones,
            )
          : RefreshIndicator(
              onRefresh: controller.cargarSesiones,
              child: state.sesiones.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        const SizedBox(height: 120),
                        Icon(
                          Icons.history,
                          size: 72,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 16),
                        Center(
                          child: Text(
                            'No hay sesiones completadas',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: state.sesiones.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final sesion = state.sesiones[index];
                        final userRole =
                            (usuario != null && usuario!['rol'] != null)
                            ? usuario!['rol'].toString().toLowerCase()
                            : '';
                        final showDelete = userRole == 'admin';
                        return _SesionCard(
                          sesion: sesion,
                          showDelete: showDelete,
                          onDelete: () async {
                            final confirmar = await showDialog<bool>(
                              context: context,
                              builder: (dialogContext) {
                                return AlertDialog(
                                  title: const Text('Eliminar ruta'),
                                  content: const Text(
                                    '¿Esta seguro de borrar esta ruta?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.of(
                                        dialogContext,
                                      ).pop(false),
                                      child: const Text('Cancelar'),
                                    ),
                                    FilledButton(
                                      onPressed: () =>
                                          Navigator.of(dialogContext).pop(true),
                                      child: const Text('Borrar'),
                                    ),
                                  ],
                                );
                              },
                            );

                            if (confirmar == true) {
                              await controller.eliminarSesion(sesion.id);
                            }
                          },
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    AsistenciaDetalleScreen(sesion: sesion),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
    );
  }
}

String _formatLocal(DateTime value, String pattern) {
  return DateFormat(pattern).format(value.toLocal());
}

String _formatLocalNullable(DateTime? value, String pattern) {
  if (value == null) return '--:--';
  return _formatLocal(value, pattern);
}

class _SesionCard extends StatelessWidget {
  final SesionHistorialAgrupada sesion;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final bool showDelete;

  const _SesionCard({
    required this.sesion,
    required this.onTap,
    required this.onDelete,
    this.showDelete = false,
  });

  @override
  Widget build(BuildContext context) {
    final fecha = _formatLocal(sesion.inicio, 'dd/MM/yyyy');
    final horaInicio = _formatLocal(sesion.horaInicio, 'HH:mm');
    final horaFin = _formatLocalNullable(sesion.horaFin, 'HH:mm');

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.blue.shade100,
                    child: const Icon(
                      Icons.directions_bus,
                      color: Color(0xFF1E3A8A),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sesion.rutaNombre,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          sesion.conductorNombre,
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          fecha,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (showDelete)
                        IconButton(
                          onPressed: onDelete,
                          icon: const Icon(Icons.delete_outline),
                          color: Colors.redAccent,
                          tooltip: 'Eliminar ruta',
                        ),
                      Icon(Icons.chevron_right, color: Colors.grey.shade500),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _InfoChip(
                    label: 'Inicio',
                    value: horaInicio,
                    color: Colors.indigo,
                  ),
                  const SizedBox(width: 8),
                  _InfoChip(label: 'Fin', value: horaFin, color: Colors.teal),
                  const SizedBox(width: 8),
                  _InfoChip(
                    label: 'Duracion',
                    value: '${sesion.duracionMinutos} min',
                    color: Colors.orange,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _MiniResumen(
                    label: 'Presentes',
                    value: sesion.totalPresentes,
                    color: Colors.green,
                  ),
                  const SizedBox(width: 12),
                  _MiniResumen(
                    label: 'Ausentes',
                    value: sesion.totalAusentes,
                    color: Colors.red,
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

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _InfoChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniResumen extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _MiniResumen({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value.toString(),
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AsistenciaDetalleScreen extends StatelessWidget {
  final SesionHistorialAgrupada sesion;

  const AsistenciaDetalleScreen({super.key, required this.sesion});

  @override
  Widget build(BuildContext context) {
    final fecha = _formatLocal(sesion.inicio, 'dd/MM/yyyy');
    final horaInicio = _formatLocal(sesion.horaInicio, 'HH:mm');
    final horaFin = _formatLocalNullable(sesion.horaFin, 'HH:mm');

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Detalle de Asistencia'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    sesion.rutaNombre,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${sesion.conductorNombre}  •  $fecha',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _ResumenBloque(
                          label: 'Inicio',
                          value: horaInicio,
                          color: Colors.indigo,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ResumenBloque(
                          label: 'Fin',
                          value: horaFin,
                          color: Colors.teal,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ResumenBloque(
                          label: 'Duracion',
                          value: '${sesion.duracionMinutos} min',
                          color: Colors.orange,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _ResumenBloque(
                          label: 'Presentes',
                          value: sesion.totalPresentes.toString(),
                          color: Colors.green,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ResumenBloque(
                          label: 'Ausentes',
                          value: sesion.totalAusentes.toString(),
                          color: Colors.red,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Alumnos',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade900,
            ),
          ),
          const SizedBox(height: 12),
          if (sesion.asistencias.isEmpty)
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('No hay alumnos para esta sesion')),
              ),
            )
          else
            ...sesion.asistencias.map((asistencia) {
              final color = asistencia.presente ? Colors.green : Colors.red;
              final horaSubida = _formatLocalNullable(
                asistencia.horaSubida,
                'HH:mm',
              );
              final horaBajada = _formatLocalNullable(
                asistencia.horaBajada,
                'HH:mm',
              );

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: color.shade200),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  leading: CircleAvatar(
                    backgroundColor: color.shade100,
                    child: Icon(
                      asistencia.presente ? Icons.check_circle : Icons.cancel,
                      color: color,
                    ),
                  ),
                  title: Text(
                    asistencia.alumnoNombre,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: asistencia.presente
                          ? Colors.black87
                          : Colors.grey.shade700,
                    ),
                  ),
                  subtitle: Text(
                    'Subida: $horaSubida  |  Bajada: $horaBajada',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                  trailing: _EstadoTag(estado: asistencia.estado),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _ResumenBloque extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _ResumenBloque({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _EstadoTag extends StatelessWidget {
  final String estado;

  const _EstadoTag({required this.estado});

  @override
  Widget build(BuildContext context) {
    final estadoNormalizado = estado.toLowerCase();
    final bool presente =
        estadoNormalizado == 'presente' || estadoNormalizado == 'tarde';
    final bool ausente = estadoNormalizado == 'ausente';
    final Color color = presente
        ? Colors.green
        : ausente
        ? Colors.red
        : Colors.orange;
    final String etiqueta = presente
        ? 'PRESENTE'
        : ausente
        ? 'AUSENTE'
        : estado.toUpperCase();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        etiqueta,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String mensaje;
  final Future<void> Function() onRetry;

  const _ErrorState({required this.mensaje, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              mensaje,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                onRetry();
              },
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
