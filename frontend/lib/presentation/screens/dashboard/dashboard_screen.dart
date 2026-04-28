import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

// --------------------------------------------------------
// Modelos de Datos
// --------------------------------------------------------

class PagoPendiente {
  final String alumno;
  final double monto;

  PagoPendiente({required this.alumno, required this.monto});

  factory PagoPendiente.fromJson(Map<String, dynamic> json) {
    return PagoPendiente(
      alumno: json['alumno'] ?? 'Desconocido',
      monto: (json['monto'] ?? 0).toDouble(),
    );
  }
}

class DashboardData {
  final int totalAlumnosActivos;
  final int recorridosActivos;
  final double pagosPendientesMes;
  final double pagosCobradosMes;
  final List<PagoPendiente> ultimosPagosPendientes;

  DashboardData({
    required this.totalAlumnosActivos,
    required this.recorridosActivos,
    required this.pagosPendientesMes,
    required this.pagosCobradosMes,
    required this.ultimosPagosPendientes,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final pagosJson = json['ultimos_pagos_pendientes'] as List? ?? [];
    return DashboardData(
      totalAlumnosActivos: json['total_alumnos_activos'] ?? 0,
      recorridosActivos: json['recorridos_activos'] ?? 0,
      pagosPendientesMes: (json['pagos_pendientes_mes'] ?? 0).toDouble(),
      pagosCobradosMes: (json['pagos_cobrados_mes'] ?? 0).toDouble(),
      ultimosPagosPendientes: pagosJson.map((e) => PagoPendiente.fromJson(e)).toList(),
    );
  }
}

// --------------------------------------------------------
// Provider (Riverpod)
// --------------------------------------------------------

final dashboardProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  try {
    // Intentar conectar con el backend real
    final response = await http.get(
      Uri.parse('http://localhost:8000/api/v1/dashboard/resumen'),
      headers: {'Content-Type': 'application/json'},
    ).timeout(const Duration(seconds: 3));

    if (response.statusCode == 200) {
      return DashboardData.fromJson(jsonDecode(response.body));
    }
    
    // Si no es 200 o el endpoint no existe, caemos a datos mock
    return _getMockData();
  } catch (e) {
    // Si hay error de conexión o timeout, usamos mock data
    return _getMockData();
  }
});

DashboardData _getMockData() {
  return DashboardData(
    totalAlumnosActivos: 142,
    recorridosActivos: 5,
    pagosPendientesMes: 450.0,
    pagosCobradosMes: 3200.0,
    ultimosPagosPendientes: [
      PagoPendiente(alumno: 'Juan Pérez', monto: 50.0),
      PagoPendiente(alumno: 'María López', monto: 50.0),
      PagoPendiente(alumno: 'Carlos Ruiz', monto: 50.0),
      PagoPendiente(alumno: 'Ana Torres', monto: 50.0),
      PagoPendiente(alumno: 'Luis Gómez', monto: 50.0),
    ],
  );
}

// --------------------------------------------------------
// Pantalla (Screen)
// --------------------------------------------------------

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncDashboardData = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: asyncDashboardData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text('Ocurrió un error al cargar el dashboard:\n$error'),
        ),
        data: (data) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dashboard General',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF534AB7),
                  ),
                ),
                const SizedBox(height: 24),
                
                // Grid de Métricas
                LayoutBuilder(
                  builder: (context, constraints) {
                    final width = constraints.maxWidth;
                    int crossAxisCount = 1;
                    double childAspectRatio = 3.0;

                    if (width >= 1024) {
                      crossAxisCount = 4;
                      childAspectRatio = 2.2;
                    } else if (width >= 600) {
                      crossAxisCount = 2;
                      childAspectRatio = 2.5;
                    }

                    return GridView.count(
                      crossAxisCount: crossAxisCount,
                      childAspectRatio: childAspectRatio,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 16,
                      crossAxisSpacing: 16,
                      children: [
                        _MetricCard(
                          title: 'Alumnos Activos',
                          value: data.totalAlumnosActivos.toString(),
                          icon: Icons.school,
                          color: Colors.purple,
                        ),
                        _MetricCard(
                          title: 'Recorridos Activos',
                          value: data.recorridosActivos.toString(),
                          icon: Icons.directions_bus,
                          color: Colors.teal,
                        ),
                        _MetricCard(
                          title: 'Pagos Pendientes',
                          value: '\$${data.pagosPendientesMes.toStringAsFixed(2)}',
                          icon: Icons.warning_amber_rounded,
                          color: Colors.amber.shade700,
                        ),
                        _MetricCard(
                          title: 'Pagos Cobrados',
                          value: '\$${data.pagosCobradosMes.toStringAsFixed(2)}',
                          icon: Icons.check_circle_outline,
                          color: Colors.green,
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),

                // Lista de Últimos Pagos Pendientes
                Card(
                  elevation: 2,
                  color: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.payment, color: Color(0xFF534AB7)),
                            SizedBox(width: 8),
                            Text(
                              'Últimos Pagos Pendientes',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 32),
                        if (data.ultimosPagosPendientes.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(16.0),
                            child: Text('No hay pagos pendientes.', style: TextStyle(color: Colors.grey)),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: data.ultimosPagosPendientes.length,
                            separatorBuilder: (context, index) => const Divider(),
                            itemBuilder: (context, index) {
                              final pago = data.ultimosPagosPendientes[index];
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: CircleAvatar(
                                  backgroundColor: Colors.amber.shade100,
                                  child: Icon(Icons.person, color: Colors.amber.shade800),
                                ),
                                title: Text(
                                  pago.alumno,
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                                subtitle: const Text('Pendiente de pago'),
                                trailing: Text(
                                  '\$${pago.monto.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: Colors.redAccent,
                                  ),
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// --------------------------------------------------------
// Widget Reutilizable: Tarjeta de Métrica
// --------------------------------------------------------

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.black54,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
