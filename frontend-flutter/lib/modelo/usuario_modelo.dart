class UsuarioModelo {
  final int id;
  final String nombre;
  final String apellido;
  final String email;
  final String? telefono;
  final String rol;
  final bool primerIngreso;
  final DateTime? creadoEn;

  const UsuarioModelo({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.email,
    this.telefono,
    required this.rol,
    required this.primerIngreso,
    this.creadoEn,
  });

  factory UsuarioModelo.fromJson(Map<String, dynamic> json) {
    return UsuarioModelo(
      id: (json['id'] ?? 0) as int,
      nombre: json['nombre']?.toString() ?? '',
      apellido: json['apellido']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      telefono: json['telefono']?.toString(),
      rol: json['rol']?.toString() ?? 'padre',
      primerIngreso: (json['primer_ingreso'] as bool?) ?? true,
      creadoEn: json['creado_en'] == null
          ? null
          : DateTime.tryParse(json['creado_en'].toString()),
    );
  }

  String get nombreCompleto => '$nombre $apellido';

  String get rolEtiqueta {
    switch (rol.toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'dueno':
        return 'Dueño';
      case 'conductor':
        return 'Conductor';
      case 'padre':
        return 'Padre';
      default:
        return rol;
    }
  }
}
