import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/controlador/pagos_service.dart';
import 'package:frontend/modelo/pago_modelo.dart';

class DashboardPaymentRow {
  final String label;
  final String value;

  const DashboardPaymentRow({required this.label, required this.value});
}

class DashboardData {
  final int pendientesCantidad;
  final double pendientesTotal;
  final int pagadosCantidad;
  final double pagadosTotal;
  final int vencidosCantidad;
  final double vencidosTotal;
  final List<PagoModelo> ultimosPagosPendientes;

  const DashboardData({
    required this.pendientesCantidad,
    required this.pendientesTotal,
    required this.pagadosCantidad,
    required this.pagadosTotal,
    required this.vencidosCantidad,
    required this.vencidosTotal,
    required this.ultimosPagosPendientes,
  });
}

final dashboardProvider = FutureProvider.autoDispose<DashboardData>((
  ref,
) async {
  final service = ref.watch(pagosServiceProvider);
  final resumen = await service.obtenerResumenPagos();
  final pagosPendientes = await service.listarPagos(estado: 'pendiente');

  final pendiente = resumen.porEstado['pendiente'];
  final pagado = resumen.porEstado['pagado'];
  final vencido = resumen.porEstado['vencido'];

  return DashboardData(
    pendientesCantidad: pendiente?.cantidad ?? 0,
    pendientesTotal: pendiente?.total ?? 0,
    pagadosCantidad: pagado?.cantidad ?? 0,
    pagadosTotal: pagado?.total ?? 0,
    vencidosCantidad: vencido?.cantidad ?? 0,
    vencidosTotal: vencido?.total ?? 0,
    ultimosPagosPendientes: pagosPendientes.take(5).toList(),
  );
});

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
                          title: 'Pagos Pendientes',
                          value:
                              '${data.pendientesCantidad} (${data.pendientesTotal.toStringAsFixed(2)})',
                          icon: Icons.warning_amber_rounded,
                          color: Colors.orange,
                        ),
                        _MetricCard(
                          title: 'Pagos Cobrados',
                          value:
                              '${data.pagadosCantidad} (${data.pagadosTotal.toStringAsFixed(2)})',
                          icon: Icons.check_circle_outline,
                          color: Colors.green,
                        ),
                        _MetricCard(
                          title: 'Pagos Vencidos',
                          value:
                              '${data.vencidosCantidad} (${data.vencidosTotal.toStringAsFixed(2)})',
                          icon: Icons.error_outline,
                          color: Colors.red,
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),

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
                            child: Text(
                              'No hay pagos pendientes.',
                              style: TextStyle(color: Colors.grey),
                            ),
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: data.ultimosPagosPendientes.length,
                            separatorBuilder: (context, index) =>
                                const Divider(),
                            itemBuilder: (context, index) {
                              final pago = data.ultimosPagosPendientes[index];
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: CircleAvatar(
                                  backgroundColor: Colors.amber.shade100,
                                  child: Icon(
                                    Icons.person,
                                    color: Colors.amber.shade800,
                                  ),
                                ),
                                title: Text(
                                  pago.alumnoNombre ??
                                      'Alumno #${pago.alumnoId}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                subtitle: Text(
                                  'Vence: ${pago.fechaVencimiento.year.toString().padLeft(4, '0')}-${pago.fechaVencimiento.month.toString().padLeft(2, '0')}-${pago.fechaVencimiento.day.toString().padLeft(2, '0')}',
                                ),
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
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withValues(alpha: 0.7), color],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: Colors.white, size: 36),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.analytics_outlined, color: Colors.white, size: 20),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
