import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Undo2, Trash2, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Pagos({ usuario }) {
  const [pagos, setPagos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rol = (usuario?.rol || 'padre').toLowerCase();
  const esConductor = rol === 'conductor';
  const esPadre = rol === 'padre';
  const esAdminOrDueno = rol === 'admin' || rol === 'dueno';

  useEffect(() => {
    if (!esConductor) {
      fetchPagos();
    }
  }, [filtroEstado]);

  const fetchPagos = async () => {
    setLoading(true);
    setError(null);
    try {
      const padreId = esPadre ? usuario.id : null;
      const result = await api.pagos.list(filtroEstado, padreId);
      if (result.ok && Array.isArray(result.data)) {
        setPagos(result.data);
      } else {
        setError('No se pudieron recuperar los pagos.');
      }
    } catch (e) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPagado = async (pagoId) => {
    try {
      const result = await api.pagos.marcarPagado(pagoId);
      if (result.ok) {
        fetchPagos();
      } else {
        alert(result.mensaje || 'Error al actualizar el pago.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    }
  };

  const handleMarcarNoPagado = async (pagoId) => {
    try {
      const result = await api.pagos.marcarNoPagado(pagoId);
      if (result.ok) {
        fetchPagos();
      } else {
        alert(result.mensaje || 'Error al actualizar el pago.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    }
  };

  const handleEliminarPago = async (pagoId) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el pago #${pagoId}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const result = await api.pagos.delete(pagoId);
      if (result.ok) {
        fetchPagos();
      } else {
        alert(result.mensaje || 'Error al eliminar el pago.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    }
  };

  const colorEstado = (estado) => {
    switch (estado.toLowerCase()) {
      case 'pagado': return 'var(--success-color)';
      case 'vencido': return 'var(--danger-color)';
      case 'pendiente': default: return 'var(--warning-color)';
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado.toLowerCase()) {
      case 'pagado': return 'badge-success';
      case 'vencido': return 'badge-danger';
      case 'pendiente': default: return 'badge-warning';
    }
  };

  if (esConductor) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', margin: 0 }}>El módulo de pagos no está habilitado para conductores.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Control de Mensualidades y Pagos</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>
            {esPadre 
              ? 'Consulta los cobros asignados a tus representados y su estado actual' 
              : 'Registra, concilia y administra los pagos de pensiones escolares'
            }
          </p>
        </div>
        <button onClick={fetchPagos} className="btn btn-secondary btn-circle" title="Recargar lista">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['todos', 'pendiente', 'pagado', 'vencido'].map(estado => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`btn ${filtroEstado === estado ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', textTransform: 'capitalize' }}
          >
            {estado}
          </button>
        ))}
      </div>

      {loading && pagos.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '160px' }}>
          <div>Cargando listado de pagos...</div>
        </div>
      ) : error ? (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      ) : pagos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <CreditCard size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>No se encontraron registros de pago.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pagos.map((pago) => (
            <div key={pago.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: `${colorEstado(pago.estado)}1A`,
                    color: colorEstado(pago.estado),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{pago.alumno_nombre || `Alumno #${pago.alumno_id}`}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--neutral-muted)' }}>
                      Referencia: {pago.referencia || 'Sin referencia registrada'}
                    </span>
                  </div>
                </div>

                <span className={`badge ${getBadgeClass(pago.estado)}`}>
                  {pago.estado}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                borderTop: '1px solid var(--neutral-border)',
                borderBottom: '1px solid var(--neutral-border)',
                padding: '16px 0',
                fontSize: '0.9rem'
              }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-muted)', marginBottom: '4px' }}>MONTO</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--neutral-dark)' }}>${pago.monto.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-muted)', marginBottom: '4px' }}>VENCIMIENTO</span>
                  <span style={{ fontWeight: 500 }}>{new Date(pago.fecha_vencimiento).toLocaleDateString('es-ES')}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-muted)', marginBottom: '4px' }}>FECHA DE PAGO</span>
                  <span style={{ fontWeight: 500 }}>
                    {pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-ES') : 'Pendiente'}
                  </span>
                </div>
              </div>

              {/* Action bar for Admins and Owners */}
              {esAdminOrDueno && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {pago.estado.toLowerCase() !== 'pagado' ? (
                    <button 
                      onClick={() => handleMarcarPagado(pago.id)}
                      className="btn btn-success"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <CheckCircle size={16} />
                      Marcar Pagado
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleMarcarNoPagado(pago.id)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <Undo2 size={16} />
                      Revertir Pago
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleEliminarPago(pago.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'none', border: '1px solid var(--danger-border)', color: 'var(--danger-color)' }}
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
