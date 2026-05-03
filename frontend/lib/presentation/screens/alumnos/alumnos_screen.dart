import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class AlumnoItem {
  final int id;
  final String nombre;
  final String apellido;
  final int padreId;
  final String? padreNombre;
  final int recorridoId;
  final int? paradaId;
  final String? paradaNombre;
  final DateTime fechaNacimiento;

  AlumnoItem({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.padreId,
    required this.padreNombre,
    required this.recorridoId,
    required this.paradaId,
    required this.paradaNombre,
    required this.fechaNacimiento,
  });

  factory AlumnoItem.fromJson(Map<String, dynamic> json) {
    return AlumnoItem(
      id: json['id'] as int,
      nombre: (json['nombre'] as String?) ?? '',
      apellido: (json['apellido'] as String?) ?? '',
      padreId: (json['padre_id'] as int?) ?? 0,
      padreNombre: json['padre_nombre'] as String?,
      recorridoId: (json['recorrido_id'] as int?) ?? 0,
      paradaId: json['parada_id'] as int?,
      paradaNombre: json['parada_nombre'] as String?,
      fechaNacimiento: DateTime.parse(json['fecha_nacimiento'] as String),
    );
  }
}

class PadreOption {
  final int id;
  final String nombre;

  PadreOption({required this.id, required this.nombre});

  factory PadreOption.fromJson(Map<String, dynamic> json) {
    final nombre = (json['nombre'] as String?) ?? '';
    final apellido = (json['apellido'] as String?) ?? '';
    return PadreOption(
      id: json['id'] as int,
      nombre: '$nombre $apellido'.trim(),
    );
  }
}

class RecorridoOption {
  final int id;
  final String nombre;

  RecorridoOption({required this.id, required this.nombre});

  factory RecorridoOption.fromJson(Map<String, dynamic> json) {
    return RecorridoOption(
      id: json['id'] as int,
      nombre: (json['nombre'] as String?) ?? 'Sin nombre',
    );
  }
}

class ParadaOption {
  final int id;
  final String nombre;

  ParadaOption({required this.id, required this.nombre});

  factory ParadaOption.fromJson(Map<String, dynamic> json) {
    return ParadaOption(
      id: json['id'] as int,
      nombre: (json['nombre'] as String?) ?? 'Parada',
    );
  }
}

class AlumnosScreen extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const AlumnosScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  State<AlumnosScreen> createState() => _AlumnosScreenState();
}

class _AlumnosScreenState extends State<AlumnosScreen> {
  static const _baseUrl = 'http://localhost:8000/api/v1';
  final _dateFormatter = DateFormat('yyyy-MM-dd');

  bool _isLoading = true;
  String? _errorMessage;
  List<AlumnoItem> _alumnos = const [];
  List<PadreOption> _padres = const [];
  List<RecorridoOption> _recorridos = const [];
  List<ParadaOption> _paradas = const [];

  @override
  void initState() {
    super.initState();
    _cargarTodo();
  }

  Future<http.Response> _getWithAuth(String endpoint) {
    return http.get(
      Uri.parse('$_baseUrl/$endpoint'),
      headers: {'Authorization': 'Bearer ${widget.accessToken}'},
    );
  }

  Future<void> _cargarTodo() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final responses = await Future.wait([
        _getWithAuth('alumnos'),
        _getWithAuth('usuarios?rol=padre'),
        _getWithAuth('recorridos'),
      ]).timeout(const Duration(seconds: 6));

      if (!mounted) return;

      if (responses.any((response) => response.statusCode != 200)) {
        setState(() {
          _errorMessage = 'No se pudieron cargar los datos.';
          _isLoading = false;
        });
        return;
      }

      final alumnosPayload =
          jsonDecode(responses[0].body) as Map<String, dynamic>;
      final padresPayload =
          jsonDecode(responses[1].body) as Map<String, dynamic>;
      final recorridosPayload =
          jsonDecode(responses[2].body) as Map<String, dynamic>;

      final alumnos = (alumnosPayload['data'] as List<dynamic>? ?? const [])
          .map((item) => AlumnoItem.fromJson(item))
          .toList();
      final padres = (padresPayload['data'] as List<dynamic>? ?? const [])
          .map((item) => PadreOption.fromJson(item))
          .toList();
      final recorridos =
          (recorridosPayload['data'] as List<dynamic>? ?? const [])
              .map((item) => RecorridoOption.fromJson(item))
              .toList();

      setState(() {
        _alumnos = alumnos;
        _padres = padres;
        _recorridos = recorridos;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Error al cargar datos: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _cargarParadas(int recorridoId) async {
    try {
      final response = await _getWithAuth('paradas?recorrido_id=$recorridoId')
          .timeout(const Duration(seconds: 4));
      if (response.statusCode != 200) {
        return;
      }
      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      final paradas = (payload['data'] as List<dynamic>? ?? const [])
          .map((item) => ParadaOption.fromJson(item))
          .toList();
      if (!mounted) return;
      setState(() {
        _paradas = paradas;
      });
    } catch (_) {
      return;
    }
  }

  Future<bool> _crearAlumno({
    required String nombre,
    required String apellido,
    required DateTime fechaNacimiento,
    required int padreId,
    required int recorridoId,
    int? paradaId,
  }) async {
    try {
      final payload = {
        'nombre': nombre,
        'apellido': apellido,
        'fecha_nacimiento': _dateFormatter.format(fechaNacimiento),
        'padre_id': padreId,
        'recorrido_id': recorridoId,
      };
      if (paradaId != null) {
        payload['parada_id'] = paradaId;
      }

      final response = await http
          .post(
            Uri.parse('$_baseUrl/alumnos'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${widget.accessToken}',
            },
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }

      setState(() {
        _errorMessage =
            'No se pudo crear el alumno (${response.statusCode}).';
      });
      return false;
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al crear alumno: $e';
      });
      return false;
    }
  }

  Future<void> _mostrarDialogoCrear() async {
    if (_padres.isEmpty || _recorridos.isEmpty) {
      setState(() {
        _errorMessage =
            'Debes tener padres y recorridos creados antes de agregar alumnos.';
      });
      return;
    }

    final nombreController = TextEditingController();
    final apellidoController = TextEditingController();
    DateTime? fechaNacimiento;
    int padreSeleccionado = _padres.first.id;
    int recorridoSeleccionado = _recorridos.first.id;
    int paradaSeleccionada = 0;
    String? errorTexto;

    await _cargarParadas(recorridoSeleccionado);

    final creado = await showDialog<bool>(
          context: context,
          builder: (context) {
            return StatefulBuilder(
              builder: (context, setDialogState) {
                return AlertDialog(
                  title: const Text('Nuevo alumno'),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextField(
                          controller: nombreController,
                          decoration: const InputDecoration(
                            labelText: 'Nombre',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: apellidoController,
                          decoration: const InputDecoration(
                            labelText: 'Apellido',
                          ),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          value: padreSeleccionado,
                          decoration: const InputDecoration(
                            labelText: 'Padre',
                          ),
                          items: _padres
                              .map(
                                (padre) => DropdownMenuItem(
                                  value: padre.id,
                                  child: Text(padre.nombre),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            if (value == null) return;
                            setDialogState(() {
                              padreSeleccionado = value;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          value: recorridoSeleccionado,
                          decoration: const InputDecoration(
                            labelText: 'Recorrido',
                          ),
                          items: _recorridos
                              .map(
                                (recorrido) => DropdownMenuItem(
                                  value: recorrido.id,
                                  child: Text(recorrido.nombre),
                                ),
                              )
                              .toList(),
                          onChanged: (value) async {
                            if (value == null) return;
                            setDialogState(() {
                              recorridoSeleccionado = value;
                              paradaSeleccionada = 0;
                            });
                            await _cargarParadas(value);
                            if (!context.mounted) return;
                            setDialogState(() {});
                          },
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          value: paradaSeleccionada,
                          decoration: const InputDecoration(
                            labelText: 'Parada (opcional)',
                          ),
                          items: [
                            const DropdownMenuItem(
                              value: 0,
                              child: Text('Sin parada'),
                            ),
                            ..._paradas.map(
                              (parada) => DropdownMenuItem(
                                value: parada.id,
                                child: Text(parada.nombre),
                              ),
                            ),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setDialogState(() {
                              paradaSeleccionada = value;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                fechaNacimiento == null
                                    ? 'Fecha de nacimiento'
                                    : _dateFormatter.format(fechaNacimiento!),
                              ),
                            ),
                            TextButton(
                              onPressed: () async {
                                final now = DateTime.now();
                                final picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime(now.year - 8),
                                  firstDate: DateTime(1990),
                                  lastDate: now,
                                );
                                if (picked == null) return;
                                setDialogState(() {
                                  fechaNacimiento = picked;
                                });
                              },
                              child: const Text('Seleccionar'),
                            ),
                          ],
                        ),
                        if (errorTexto != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            errorTexto!,
                            style: const TextStyle(color: Colors.redAccent),
                          ),
                        ],
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: const Text('Cancelar'),
                    ),
                    ElevatedButton(
                      onPressed: () async {
                        final nombre = nombreController.text.trim();
                        final apellido = apellidoController.text.trim();
                        if (nombre.isEmpty || apellido.isEmpty) {
                          setDialogState(() {
                            errorTexto = 'Nombre y apellido son obligatorios.';
                          });
                          return;
                        }
                        if (fechaNacimiento == null) {
                          setDialogState(() {
                            errorTexto = 'Selecciona la fecha de nacimiento.';
                          });
                          return;
                        }
                        int? paradaId;
                        if (paradaSeleccionada != 0) {
                          paradaId = paradaSeleccionada;
                        }

                        final ok = await _crearAlumno(
                          nombre: nombre,
                          apellido: apellido,
                          fechaNacimiento: fechaNacimiento!,
                          padreId: padreSeleccionado,
                          recorridoId: recorridoSeleccionado,
                          paradaId: paradaId,
                        );
                        if (!context.mounted) return;
                        Navigator.of(context).pop(ok);
                      },
                      child: const Text('Guardar'),
                    ),
                  ],
                );
              },
            );
          },
        ) ??
        false;

    if (creado) {
      await _cargarTodo();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Alumnos',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF534AB7),
                    ),
                  ),
                ),
                FilledButton.icon(
                  onPressed: _mostrarDialogoCrear,
                  icon: const Icon(Icons.add),
                  label: const Text('Nuevo'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red.shade900),
                ),
              ),
            const SizedBox(height: 16),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _alumnos.isEmpty
                      ? const Center(
                          child: Text('No hay alumnos registrados.'),
                        )
                      : RefreshIndicator(
                          onRefresh: _cargarTodo,
                          child: ListView.separated(
                            itemCount: _alumnos.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final alumno = _alumnos[index];
                              return Card(
                                elevation: 1,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.all(16),
                                  leading: CircleAvatar(
                                    backgroundColor: Colors.blue.shade100,
                                    child: const Icon(
                                      Icons.school,
                                      color: Color(0xFF534AB7),
                                    ),
                                  ),
                                  title: Text(
                                    '${alumno.nombre} ${alumno.apellido}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 6),
                                        child: Text(
                                          'Padre: ${alumno.padreNombre ?? alumno.padreId}',
                                          style: const TextStyle(
                                            color: Colors.black54,
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Recorrido: ${alumno.recorridoId}',
                                          style: const TextStyle(
                                            color: Colors.black54,
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Nacimiento: ${_dateFormatter.format(alumno.fechaNacimiento)}',
                                          style: const TextStyle(
                                            color: Colors.black54,
                                          ),
                                        ),
                                      ),
                                      if (alumno.paradaNombre != null)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 4),
                                          child: Text(
                                            'Parada: ${alumno.paradaNombre}',
                                            style: const TextStyle(
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
