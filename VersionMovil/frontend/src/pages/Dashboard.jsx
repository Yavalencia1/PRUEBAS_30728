import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    pendientesCantidad: 0,
    pendientesTotal: 0,
    pagadosCantidad: 0,
    pagadosTotal: 0,
    vencidosCantidad: 0,
    vencidosTotal: 0
  });
  const [ultimosPendientes, setUltimosPendientes] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener resumen de pagos
      const resumenResult = await api.pagos.resumen();
      let resData = resumenResult.data || {};
      const porEstado = resData.por_estado || {};
      
      const p = porEstado.pendiente || { cantidad: 0, total: 0 };
      const c = porEstado.pagado || { cantidad: 0, total: 0 };
      const v = porEstado.vencido || { cantidad: 0, total: 0 };

      setMetrics({
        pendientesCantidad: p.cantidad,
        pendientesTotal: p.total,
        pagadosCantidad: c.cantidad,
        pagadosTotal: c.total,
        vencidosCantidad: v.cantidad,
        vencidosTotal: v.total
      });

      // 2. Obtener lista de pagos pendientes (limitado a 5)
      const listResult = await api.pagos.list('pendiente');
      if (listResult.ok && Array.isArray(listResult.data)) {
        setUltimosPendientes(listResult.data.slice(0, 5));
      }
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="btn" style={{ background: 'none', cursor: 'default' }}>Cargando información...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)' }}>
        <p style={{ color: 'var(--danger-color)', margin: 0, fontWeight: 600 }}>
          Error al cargar Dashboard: {error}
        </p>
        <button onClick={fetchDashboardData} className="btn btn-danger" style={{ marginTop: '14px' }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Metric Cards Grid */}
      <div className="grid-metrics">
        <div className="metric-card pending">
          <div className="metric-header">
            <span>Pagos Pendientes</span>
            <Clock size={20} />
          </div>
          <div className="metric-value">
            {metrics.pendientesCantidad}
          </div>
          <div className="metric-desc">
            Total pendiente: ${metrics.pendientesTotal.toFixed(2)}
          </div>
        </div>

        <div className="metric-card paid">
          <div className="metric-header">
            <span>Pagos Cobrados</span>
            <CheckCircle size={20} />
          </div>
          <div className="metric-value">
            {metrics.pagadosCantidad}
          </div>
          <div className="metric-desc">
            Total cobrado: ${metrics.pagadosTotal.toFixed(2)}
          </div>
        </div>

        <div className="metric-card overdue">
          <div className="metric-header">
            <span>Pagos Vencidos</span>
            <AlertCircle size={20} />
          </div>
          <div className="metric-value">
            {metrics.vencidosCantidad}
          </div>
          <div className="metric-desc">
            Total vencido: ${metrics.vencidosTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recents list card */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <CreditCard size={20} color="var(--primary-color)" />
          Últimos Pagos Pendientes
        </h3>
        
        {ultimosPendientes.length === 0 ? (
          <p style={{ color: 'var(--neutral-muted)', textAlign: 'center', margin: '20px 0' }}>
            No hay pagos pendientes en este momento.
          </p>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Alumno</th>
                  <th>Fecha Vencimiento</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimosPendientes.map((pago) => (
                  <tr key={pago.id}>
                    <td>#{pago.id}</td>
                    <td style={{ fontWeight: 600 }}>{pago.alumno_nombre || `Alumno #${pago.alumno_id}`}</td>
                    <td>{new Date(pago.fecha_vencimiento).toLocaleDateString('es-ES')}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                      ${pago.monto.toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-warning">Pendiente</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
