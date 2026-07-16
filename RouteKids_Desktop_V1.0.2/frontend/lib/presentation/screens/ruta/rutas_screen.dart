import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:frontend/core/config/api_config.dart';
import 'package:http/http.dart' as http;

class RutaItem {
  final int id;
  final int recorridoId;
  final String? recorridoNombre;
  final String nombre;
  final String? descripcion;
  final String tipo;

  RutaItem({
    required this.id,
    required this.recorridoId,
    required this.recorridoNombre,
    required this.nombre,
    required this.descripcion,
    required this.tipo,
  });

  factory RutaItem.fromJson(Map<String, dynamic> json) {
    return RutaItem(
      id: json['id'] as int,
      recorridoId: json['recorrido_id'] as int,
      recorridoNombre: json['recorrido_nombre'] as String?,
      nombre: (json['nombre'] as String?) ?? 'Sin nombre',
      descripcion: json['descripcion'] as String?,
      tipo: (json['tipo'] as String?) ?? 'ida_vuelta',
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

class RutasScreen extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const RutasScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  State<RutasScreen> createState() => _RutasScreenState();
}

class _RutasScreenState extends State<RutasScreen> {
  static String get _baseUrl => '${ApiConfig.baseUrl}/api/v1';

  bool _isLoading = true;
  String? _errorMessage;
  List<RutaItem> _rutas = const [];
  List<RecorridoOption> _recorridos = const [];

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final responses = await Future.wait([
        http.get(
          Uri.parse('$_baseUrl/rutas'),
          headers: {'Authorization': 'Bearer ${widget.accessToken}'},
        ),
        http.get(
          Uri.parse('$_baseUrl/recorridos'),
          headers: {'Authorization': 'Bearer ${widget.accessToken}'},
        ),
      ]).timeout(const Duration(seconds: 6));

      if (!mounted) return;

      if (responses.any((response) => response.statusCode != 200)) {
        setState(() {
          _errorMessage = 'No se pudieron cargar los datos de rutas o recorridos.';
          _isLoading = false;
        });
        return;
      }

      final rutasPayload = jsonDecode(responses[0].body) as Map<String, dynamic>;
      final recorridosPayload = jsonDecode(responses[1].body) as Map<String, dynamic>;

      final rutas = (rutasPayload['data'] as List<dynamic>? ?? const [])
          .map((item) => RutaItem.fromJson(item))
          .toList();
      final recorridos = (recorridosPayload['data'] as List<dynamic>? ?? const [])
          .map((item) => RecorridoOption.fromJson(item))
          .toList();

      setState(() {
        _rutas = rutas;
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

  Future<bool> _crearRuta({
    required int recorridoId,
    required String nombre,
    required String descripcion,
    required String tipo,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/rutas/'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${widget.accessToken}',
            },
            body: jsonEncode({
              'recorrido_id': recorridoId,
              'nombre': nombre,
              'descripcion': descripcion.isEmpty ? null : descripcion,
              'tipo': tipo,
            }),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }

      setState(() {
        _errorMessage = 'No se pudo crear la ruta (${response.statusCode}).';
      });
      return false;
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al crear ruta: $e';
      });
      return false;
    }
  }

  Future<void> _mostrarDialogoCrear() async {
    if (_recorridos.isEmpty) {
      setState(() {
        _errorMessage = 'Debes crear un recorrido antes de agregar rutas.';
      });
      return;
    }

    final nombreController = TextEditingController();
    final descripcionController = TextEditingController();
    int recorridoSeleccionado = _recorridos.first.id;
    String tipoSeleccionado = 'ida_vuelta';
    String? errorTexto;

    final creado = await showDialog<bool>(
          context: context,
          builder: (context) {
            return StatefulBuilder(
              builder: (context, setDialogState) {
                return AlertDialog(
                  title: const Text('Nueva ruta'),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DropdownButtonFormField<int>(
                          value: recorridoSeleccionado,
                          decoration: const InputDecoration(
                            labelText: 'Recorrido',
                          ),
                          items: _recorridos
                              .map(
                                (rec) => DropdownMenuItem(
                                  value: rec.id,
                                  child: Text(rec.nombre),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            if (value == null) return;
                            setDialogState(() {
                              recorridoSeleccionado = value;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: nombreController,
                          decoration: const InputDecoration(
                            labelText: 'Nombre de la Ruta',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: descripcionController,
                          decoration: const InputDecoration(
                            labelText: 'Descripción (Opcional)',
                          ),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: tipoSeleccionado,
                          decoration: const InputDecoration(
                            labelText: 'Tipo de Ruta',
                          ),
                          items: const [
                            DropdownMenuItem(value: 'ida', child: Text('Solo Ida (Mañana)')),
                            DropdownMenuItem(value: 'vuelta', child: Text('Solo Vuelta (Tarde)')),
                            DropdownMenuItem(value: 'ida_vuelta', child: Text('Ida y Vuelta')),
                          ],
                          onChanged: (value) {
                            if (value == null) return;
                            setDialogState(() {
                              tipoSeleccionado = value;
                            });
                          },
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
                        final desc = descripcionController.text.trim();
                        if (nombre.isEmpty) {
                          setDialogState(() {
                            errorTexto = 'El nombre es obligatorio.';
                          });
                          return;
                        }

                        final ok = await _crearRuta(
                          recorridoId: recorridoSeleccionado,
                          nombre: nombre,
                          descripcion: desc,
                          tipo: tipoSeleccionado,
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
      await _cargarDatos();
    }
  }

  String _traducirTipo(String tipo) {
    switch (tipo) {
      case 'ida':
        return 'Solo Ida';
      case 'vuelta':
        return 'Solo Vuelta';
      case 'ida_vuelta':
      default:
        return 'Ida y Vuelta';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Rutas de Transporte',
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
                  label: const Text('Nueva'),
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
                  : _rutas.isEmpty
                      ? const Center(
                          child: Text('No hay rutas registradas.'),
                        )
                      : RefreshIndicator(
                          onRefresh: _cargarDatos,
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: DataTable(
                                headingRowColor: WidgetStateProperty.resolveWith(
                                    (states) => Theme.of(context).dividerColor.withOpacity(0.05)),
                                columns: const [
                                  DataColumn(
                                      label: Text('ID',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold))),
                                  DataColumn(
                                      label: Text('Nombre',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold))),
                                  DataColumn(
                                      label: Text('Recorrido',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold))),
                                  DataColumn(
                                      label: Text('Tipo',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold))),
                                  DataColumn(
                                      label: Text('Descripción',
                                          style: TextStyle(
                                              fontWeight: FontWeight.bold))),
                                ],
                                rows: _rutas.map((ruta) {
                                  return DataRow(
                                    cells: [
                                      DataCell(Text(ruta.id.toString())),
                                      DataCell(Text(ruta.nombre)),
                                      DataCell(Text(ruta.recorridoNombre ??
                                          '#${ruta.recorridoId}')),
                                      DataCell(
                                        Chip(
                                          label: Text(_traducirTipo(ruta.tipo),
                                              style: const TextStyle(
                                                  fontSize: 12)),
                                          padding: EdgeInsets.zero,
                                        ),
                                      ),
                                      DataCell(Text(ruta.descripcion ?? '-')),
                                    ],
                                  );
                                }).toList(),
                              ),
                            ),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
