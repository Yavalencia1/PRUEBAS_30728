import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ParadaItem {
  final int id;
  final int rutaId;
  final String? rutaNombre;
  final String nombre;
  final double latitud;
  final double longitud;
  final int orden;

  ParadaItem({
    required this.id,
    required this.rutaId,
    required this.rutaNombre,
    required this.nombre,
    required this.latitud,
    required this.longitud,
    required this.orden,
  });

  factory ParadaItem.fromJson(Map<String, dynamic> json) {
    return ParadaItem(
      id: json['id'] as int,
      rutaId: json['ruta_id'] as int,
      rutaNombre: json['ruta_nombre'] as String?,
      nombre: (json['nombre'] as String?) ?? 'Sin nombre',
      latitud: (json['latitud'] as num?)?.toDouble() ?? 0,
      longitud: (json['longitud'] as num?)?.toDouble() ?? 0,
      orden: (json['orden'] as num?)?.toInt() ?? 0,
    );
  }
}

class RutaOption {
  final int id;
  final String nombre;
  final String? recorridoNombre;

  RutaOption({required this.id, required this.nombre, this.recorridoNombre});

  factory RutaOption.fromJson(Map<String, dynamic> json) {
    return RutaOption(
      id: json['id'] as int,
      nombre: (json['nombre'] as String?) ?? 'Ruta',
      recorridoNombre: json['recorrido_nombre'] as String?,
    );
  }
}

class ParadasScreen extends StatefulWidget {
  final String accessToken;
  final Map<String, dynamic> usuario;

  const ParadasScreen({
    super.key,
    required this.accessToken,
    required this.usuario,
  });

  @override
  State<ParadasScreen> createState() => _ParadasScreenState();
}

class _ParadasScreenState extends State<ParadasScreen> {
  static const _baseUrl = 'http://localhost:8000/api/v1';

  bool _isLoading = true;
  String? _errorMessage;
  List<ParadaItem> _paradas = const [];
  List<RutaOption> _rutas = const [];

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
          Uri.parse('$_baseUrl/paradas'),
          headers: {'Authorization': 'Bearer ${widget.accessToken}'},
        ),
        http.get(
          Uri.parse('$_baseUrl/rutas'),
          headers: {'Authorization': 'Bearer ${widget.accessToken}'},
        ),
      ]).timeout(const Duration(seconds: 6));

      if (!mounted) return;

      if (responses.any((response) => response.statusCode != 200)) {
        setState(() {
          _errorMessage = 'No se pudieron cargar las paradas.';
          _isLoading = false;
        });
        return;
      }

      final paradasPayload =
          jsonDecode(responses[0].body) as Map<String, dynamic>;
      final rutasPayload =
          jsonDecode(responses[1].body) as Map<String, dynamic>;

      final paradas = (paradasPayload['data'] as List<dynamic>? ?? const [])
          .map((item) => ParadaItem.fromJson(item))
          .toList();
      final rutas = (rutasPayload['data'] as List<dynamic>? ?? const [])
          .map((item) => RutaOption.fromJson(item))
          .toList();

      setState(() {
        _paradas = paradas;
        _rutas = rutas;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Error al cargar paradas: $e';
        _isLoading = false;
      });
    }
  }

  Future<bool> _crearParada({
    required int rutaId,
    required String nombre,
    required double latitud,
    required double longitud,
    required int orden,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/paradas'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${widget.accessToken}',
            },
            body: jsonEncode({
              'ruta_id': rutaId,
              'nombre': nombre,
              'latitud': latitud,
              'longitud': longitud,
              'orden': orden,
            }),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      }

      setState(() {
        _errorMessage =
            'No se pudo crear la parada (${response.statusCode}).';
      });
      return false;
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al crear parada: $e';
      });
      return false;
    }
  }

  Future<void> _mostrarDialogoCrear() async {
    if (_rutas.isEmpty) {
      setState(() {
        _errorMessage = 'Debes crear una ruta antes de agregar paradas.';
      });
      return;
    }

    final nombreController = TextEditingController();
    final latController = TextEditingController();
    final lngController = TextEditingController();
    final ordenController = TextEditingController(text: '0');
    int rutaSeleccionada = _rutas.first.id;
    String? errorTexto;

    final creado = await showDialog<bool>(
          context: context,
          builder: (context) {
            return StatefulBuilder(
              builder: (context, setDialogState) {
                return AlertDialog(
                  title: const Text('Nueva parada'),
                  content: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        DropdownButtonFormField<int>(
                          value: rutaSeleccionada,
                          decoration: const InputDecoration(
                            labelText: 'Ruta',
                          ),
                          items: _rutas
                              .map(
                                (ruta) => DropdownMenuItem(
                                  value: ruta.id,
                                  child: Text(
                                    ruta.recorridoNombre != null
                                        ? '${ruta.nombre} (${ruta.recorridoNombre})'
                                        : ruta.nombre,
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            if (value == null) return;
                            setDialogState(() {
                              rutaSeleccionada = value;
                            });
                          },
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: nombreController,
                          decoration: const InputDecoration(
                            labelText: 'Nombre',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: latController,
                          decoration: const InputDecoration(
                            labelText: 'Latitud',
                          ),
                          keyboardType:
                              const TextInputType.numberWithOptions(decimal: true),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: lngController,
                          decoration: const InputDecoration(
                            labelText: 'Longitud',
                          ),
                          keyboardType:
                              const TextInputType.numberWithOptions(decimal: true),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: ordenController,
                          decoration: const InputDecoration(
                            labelText: 'Orden',
                          ),
                          keyboardType: TextInputType.number,
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
                        if (nombre.isEmpty) {
                          setDialogState(() {
                            errorTexto = 'El nombre es obligatorio.';
                          });
                          return;
                        }
                        final lat = double.tryParse(latController.text.trim());
                        final lng = double.tryParse(lngController.text.trim());
                        if (lat == null || lng == null) {
                          setDialogState(() {
                            errorTexto = 'Latitud y longitud son obligatorias.';
                          });
                          return;
                        }
                        final orden = int.tryParse(ordenController.text.trim());
                        if (orden == null || orden < 0) {
                          setDialogState(() {
                            errorTexto = 'Orden debe ser un numero >= 0.';
                          });
                          return;
                        }

                        final ok = await _crearParada(
                          rutaId: rutaSeleccionada,
                          nombre: nombre,
                          latitud: lat,
                          longitud: lng,
                          orden: orden,
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
                    'Paradas',
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
                  : _paradas.isEmpty
                      ? const Center(
                          child: Text('No hay paradas registradas.'),
                        )
                      : RefreshIndicator(
                          onRefresh: _cargarDatos,
                          child: ListView.separated(
                            itemCount: _paradas.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final parada = _paradas[index];
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
                                      Icons.location_on,
                                      color: Color(0xFF534AB7),
                                    ),
                                  ),
                                  title: Text(
                                    parada.nombre,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if (parada.rutaNombre != null)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(top: 4),
                                          child: Text(
                                            'Ruta: ${parada.rutaNombre}',
                                            style: const TextStyle(
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ),
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Lat/Lng: ${parada.latitud.toStringAsFixed(5)}, ${parada.longitud.toStringAsFixed(5)}',
                                          style: const TextStyle(
                                            color: Colors.black54,
                                          ),
                                        ),
                                      ),
                                      Padding(
                                        padding:
                                            const EdgeInsets.only(top: 4),
                                        child: Text(
                                          'Orden: ${parada.orden}',
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
