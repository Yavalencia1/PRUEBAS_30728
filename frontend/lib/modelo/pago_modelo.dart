class PagoModelo {
  final int id;
  final int alumnoId;
  final String? alumnoNombre;
  final int padreId;
  final String? padreNombre;
  final double monto;
  final DateTime fechaVencimiento;
  final DateTime? fechaPago;
  final String estado;
  final String? referencia;

  const PagoModelo({
    required this.id,
    required this.alumnoId,
    required this.alumnoNombre,
    required this.padreId,
    required this.padreNombre,
    required this.monto,
    required this.fechaVencimiento,
    required this.fechaPago,
    required this.estado,
    required this.referencia,
  });

  factory PagoModelo.fromJson(Map<String, dynamic> json) {
    return PagoModelo(
      id: (json['id'] ?? 0) as int,
      alumnoId: (json['alumno_id'] ?? 0) as int,
      alumnoNombre: json['alumno_nombre']?.toString(),
      padreId: (json['padre_id'] ?? 0) as int,
      padreNombre: json['padre_nombre']?.toString(),
      monto: (json['monto'] as num? ?? 0).toDouble(),
      fechaVencimiento:
          DateTime.tryParse(json['fecha_vencimiento']?.toString() ?? '') ??
          DateTime.now(),
      fechaPago: json['fecha_pago'] == null
          ? null
          : DateTime.tryParse(json['fecha_pago'].toString()),
      estado: json['estado']?.toString() ?? 'pendiente',
      referencia: json['referencia']?.toString(),
    );
  }

  bool get estaPagado => estado.toLowerCase() == 'pagado';
}
