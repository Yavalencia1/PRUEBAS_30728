import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/controlador/pagos_service.dart';
import 'package:frontend/modelo/pago_modelo.dart';

final pagosServiceProvider = Provider<PagosService>((ref) {
  return PagosService();
});

final pagosProvider = FutureProvider.autoDispose
    .family<List<PagoModelo>, _PagosQuery>((ref, query) async {
      final service = ref.watch(pagosServiceProvider);
      return service.listarPagos(
        accessToken: query.accessToken,
        padreId: query.padreId,
        estado: query.estado,
      );
    });

class _PagosQuery {
  final String? accessToken;
  final int? padreId;
  final String? estado;

  const _PagosQuery({this.accessToken, this.padreId, this.estado});

  @override
  bool operator ==(Object other) {
    return other is _PagosQuery &&
        other.accessToken == accessToken &&
        other.padreId == padreId &&
        other.estado == estado;
  }

  @override
  int get hashCode => Object.hash(accessToken, padreId, estado);
}

class PagosScreen extends ConsumerStatefulWidget {
  final String? accessToken;
  final Map<String, dynamic> usuario;

  const PagosScreen({super.key, this.accessToken, required this.usuario});

  @override
  ConsumerState<PagosScreen> createState() => _PagosScreenState();
}

class _PagosScreenState extends ConsumerState<PagosScreen> {
  String _filtroEstado = 'todos';

  String get _rol =>
      (widget.usuario['rol'] ?? 'padre').toString().toLowerCase();

  bool get _puedeVerPagos => _rol != 'conductor';

  bool get _puedeMarcarPagado => _rol == 'admin' || _rol == 'dueno';
  bool get _puedeEliminarPago => _rol == 'admin' || _rol == 'dueno';

  int? get _padreId {
    if (_rol != 'padre') {
      return null;
    }
    final value = widget.usuario['id'];
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '');
  }

  _PagosQuery get _query => _PagosQuery(
    accessToken: widget.accessToken,
    padreId: _padreId,
    estado: _filtroEstado,
  );

  Future<void> _refrescar() async {
    ref.invalidate(pagosProvider(_query));
    await ref.read(pagosProvider(_query).future);
  }

  Future<void> _marcarPagado(PagoModelo pago) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(pagosServiceProvider)
          .marcarPagoComoPagado(
            pagoId: pago.id,
            accessToken: widget.accessToken,
          );
      messenger.showSnackBar(
        SnackBar(content: Text('Pago #${pago.id} marcado como pagado')),
      );
      await _refrescar();
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text('Error al actualizar pago: $error')),
      );
    }
  }

  Future<void> _marcarNoPagado(PagoModelo pago) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(pagosServiceProvider)
          .marcarPagoComoNoPagado(
            pagoId: pago.id,
            accessToken: widget.accessToken,
          );
      messenger.showSnackBar(
        SnackBar(content: Text('Pago #${pago.id} marcado como no pagado')),
      );
      await _refrescar();
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text('Error al actualizar pago: $error')),
      );
    }
  }

  Future<void> _eliminarPago(PagoModelo pago) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar eliminación'),
        content: Text(
          '¿Deseas eliminar el pago #${pago.id}? Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ref
          .read(pagosServiceProvider)
          .eliminarPago(pagoId: pago.id, accessToken: widget.accessToken);
      messenger.showSnackBar(
        SnackBar(content: Text('Pago #${pago.id} eliminado')),
      );
      await _refrescar();
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text('Error al eliminar pago: $error')),
      );
    }
  }

  String _formatearFecha(DateTime fecha) {
    final year = fecha.year.toString().padLeft(4, '0');
    final month = fecha.month.toString().padLeft(2, '0');
    final day = fecha.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }

  Color _colorEstado(String estado) {
    switch (estado.toLowerCase()) {
      case 'pagado':
        return Colors.green;
      case 'vencido':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  List<PagoModelo> _aplicarFiltro(List<PagoModelo> pagos) {
    if (_filtroEstado == 'todos') {
      return pagos;
    }
    return pagos
        .where((pago) => pago.estado.toLowerCase() == _filtroEstado)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    if (!_puedeVerPagos) {
      return Scaffold(
        backgroundColor: Colors.grey.shade50,
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Text(
              'El módulo de pagos no está disponible para conductor.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final asyncPagos = ref.watch(pagosProvider(_query));

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: RefreshIndicator(
        onRefresh: _refrescar,
        child: asyncPagos.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              const SizedBox(height: 120),
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text(
                    'No se pudieron cargar los pagos.\n$error',
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
          data: (pagos) {
            final pagosFiltrados = _aplicarFiltro(pagos);

            return ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24.0),
              children: [
                const Text(
                  'Pagos',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF534AB7),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Consulta los pagos registrados y marca los que ya fueron cubiertos.',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Todos'),
                      selected: _filtroEstado == 'todos',
                      onSelected: (_) =>
                          setState(() => _filtroEstado = 'todos'),
                    ),
                    ChoiceChip(
                      label: const Text('Pendiente'),
                      selected: _filtroEstado == 'pendiente',
                      onSelected: (_) =>
                          setState(() => _filtroEstado = 'pendiente'),
                    ),
                    ChoiceChip(
                      label: const Text('Pagado'),
                      selected: _filtroEstado == 'pagado',
                      onSelected: (_) =>
                          setState(() => _filtroEstado = 'pagado'),
                    ),
                    ChoiceChip(
                      label: const Text('Vencido'),
                      selected: _filtroEstado == 'vencido',
                      onSelected: (_) =>
                          setState(() => _filtroEstado = 'vencido'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (pagosFiltrados.isEmpty)
                  Card(
                    color: Colors.white,
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Padding(
                      padding: EdgeInsets.all(24.0),
                      child: Text('No hay pagos para mostrar con ese filtro.'),
                    ),
                  )
                else
                  ...pagosFiltrados.map(
                    (pago) => Padding(
                      padding: const EdgeInsets.only(bottom: 16.0),
                      child: Card(
                        elevation: 2,
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: _colorEstado(
                                      pago.estado,
                                    ).withOpacity(0.12),
                                    child: Icon(
                                      Icons.payment,
                                      color: _colorEstado(pago.estado),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          pago.alumnoNombre ??
                                              'Alumno #${pago.alumnoId}',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          pago.referencia?.isNotEmpty == true
                                              ? 'Referencia: ${pago.referencia}'
                                              : 'Sin referencia',
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Chip(
                                    label: Text(
                                      pago.estado.toUpperCase(),
                                      style: const TextStyle(
                                        color: Colors.white,
                                      ),
                                    ),
                                    backgroundColor: _colorEstado(pago.estado),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: _InfoPago(
                                      label: 'Monto',
                                      value:
                                          '\$${pago.monto.toStringAsFixed(2)}',
                                    ),
                                  ),
                                  Expanded(
                                    child: _InfoPago(
                                      label: 'Vence',
                                      value: _formatearFecha(
                                        pago.fechaVencimiento,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: _InfoPago(
                                      label: 'Pagado',
                                      value: pago.fechaPago == null
                                          ? 'Pendiente'
                                          : _formatearFecha(pago.fechaPago!),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              if (_puedeMarcarPagado || _puedeEliminarPago)
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (!_puedeMarcarPagado)
                                        const SizedBox.shrink()
                                      else if (!pago.estaPagado)
                                        FilledButton.icon(
                                          onPressed: () => _marcarPagado(pago),
                                          icon: const Icon(
                                            Icons.check_circle_outline,
                                          ),
                                          label: const Text('Marcar pagado'),
                                        )
                                      else
                                        FilledButton.icon(
                                          onPressed: () =>
                                              _marcarNoPagado(pago),
                                          icon: const Icon(Icons.undo),
                                          label: const Text('Marcar no pagado'),
                                        ),
                                      const SizedBox(width: 8),
                                      if (_puedeEliminarPago)
                                        OutlinedButton.icon(
                                          onPressed: () => _eliminarPago(pago),
                                          icon: const Icon(
                                            Icons.delete_outline,
                                          ),
                                          label: const Text('Eliminar'),
                                        ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _InfoPago extends StatelessWidget {
  final String label;
  final String value;

  const _InfoPago({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
