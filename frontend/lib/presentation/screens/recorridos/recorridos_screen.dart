import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class RecorridoItem {
  final int id;
  final String nombre;
  final String? descripcion;
  final bool activo;
  final int duenoId;
  final String? duenoNombre;
  final DateTime? creadoEn;

  RecorridoItem({
    required this.id,
    required this.nombre,
    required this.descripcion,
    required this.activo,
    required this.duenoId,
    required this.duenoNombre,
    required this.creadoEn,
  });

  factory RecorridoItem.fromJson(Map<String, dynamic> json) {
    return RecorridoItem(
      id: json['id'] as int,
      nombre: (json['nombre'] as String?) ?? 'Sin nombre',
      descripcion: json['descripcion'] as String?,
      activo: (json['activo'] as bool?) ?? true,
      duenoId: (json['dueno_id'] as int?) ?? 0,
      duenoNombre: json['dueno_nombre'] as String?,
      creadoEn: json['creado_en'] != null
          ? DateTime.parse(json['creado_en'] as String)
          : null,
    );
  }
}

class RecorridosScreen extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const RecorridosScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  State<RecorridosScreen> createState() => _RecorridosScreenState();
}

class _RecorridosScreenState extends State<RecorridosScreen> {
  static const _baseUrl = 'http://localhost:8000/api/v1';

  bool _isLoading = true;
  String? _errorMessage;
  List<RecorridoItem> _recorridos = const [];

  @override
  void initState() {
    super.initState();
    _cargarRecorridos();
  }

  Future<void> _cargarRecorridos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/recorridos'),
        headers: {'Authorization': 'Bearer ${widget.accessToken}'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final payload = jsonDecode(response.body) as Map<String, dynamic>;
        final data = (payload['data'] as List<dynamic>? ?? const [])
            .map((item) => RecorridoItem.fromJson(item))
            .toList();
        setState(() {
          _recorridos = data;
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _errorMessage =
            'No se pudieron cargar los recorridos (${response.statusCode}).';
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al cargar recorridos: $e';
        _isLoading = false;
      });
    }
  }

  Future<bool> _crearRecorrido({
    required String nombre,
    required String descripcion,
    required bool activo,
  }) async {
    final duenoId = widget.usuario['id'];
    if (duenoId == null) {
      setState(() {
        _errorMessage = 'No se pudo identificar el dueño actual.';
      });
      return false;
    }

    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/recorridos'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${widget.accessToken}',
            },
            body: jsonEncode({
              'nombre': nombre,
              'descripcion': descripcion.isEmpty ? null : descripcion,
              'activo': activo,
              'dueno_id': duenoId,
            }),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }

      setState(() {
        _errorMessage =
            'No se pudo crear el recorrido (${response.statusCode}).';
      });
      return false;
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al crear recorrido: $e';
      });
      return false;
    }
  }

  Future<void> _mostrarDialogoCrear() async {
    final nombreController = TextEditingController();
    final descripcionController = TextEditingController();
    bool activo = true;
    String? errorTexto;

    final creado = await showDialog<bool>(
          context: context,
          builder: (context) {
            return StatefulBuilder(
              builder: (context, setDialogState) {
                return AlertDialog(
                  title: const Text('Nuevo recorrido'),
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
                          controller: descripcionController,
                          decoration: const InputDecoration(
                            labelText: 'Descripcion',
                          ),
                        ),
                        const SizedBox(height: 8),
                        SwitchListTile(
                          value: activo,
                          onChanged: (value) {
                            setDialogState(() {
                              activo = value;
                            });
                          },
                          title: const Text('Activo'),
                          contentPadding: EdgeInsets.zero,
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
                        final descripcion = descripcionController.text.trim();
                        if (nombre.isEmpty) {
                          setDialogState(() {
                            errorTexto = 'El nombre es obligatorio.';
                          });
                          return;
                        }
                        final ok = await _crearRecorrido(
                          nombre: nombre,
                          descripcion: descripcion,
                          activo: activo,
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
      await _cargarRecorridos();
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
                    'Recorridos',
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
                  : _recorridos.isEmpty
                      ? const Center(
                          child: Text('No hay recorridos registrados.'),
                        )
                      : RefreshIndicator(
                          onRefresh: _cargarRecorridos,
                          child: ListView.separated(
                            itemCount: _recorridos.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final recorrido = _recorridos[index];
                              return Card(
                                elevation: 1,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.all(16),
                                  leading: CircleAvatar(
                                    backgroundColor: recorrido.activo
                                        ? Colors.green.shade100
                                        : Colors.grey.shade300,
                                    child: Icon(
                                      Icons.directions_bus,
                                      color: recorrido.activo
                                          ? Colors.green
                                          : Colors.grey.shade700,
                                    ),
                                  ),
                                  title: Text(
                                    recorrido.nombre,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if ((recorrido.descripcion ?? '')
                                          .trim()
                                          .isNotEmpty)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 6),
                                          child: Text(
                                            recorrido.descripcion!,
                                            style: const TextStyle(
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ),
                                      if (recorrido.duenoNombre != null)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 6),
                                          child: Text(
                                            'Dueno: ${recorrido.duenoNombre}',
                                            style: const TextStyle(
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  trailing: Chip(
                                    label: Text(
                                      recorrido.activo
                                          ? 'Activo'
                                          : 'Inactivo',
                                    ),
                                    backgroundColor: recorrido.activo
                                        ? Colors.green.shade50
                                        : Colors.grey.shade200,
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
