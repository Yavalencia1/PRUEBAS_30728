import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, MailOpen, AlertCircle, ArrowUpCircle, ArrowDownCircle, DollarSign, Inbox } from 'lucide-react';
import { api } from '../services/api';

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotificaciones();
  }, []);

  const fetchNotificaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.notificaciones.list();
      if (result.ok && Array.isArray(result.data)) {
        // Ordenar por fecha descendente (recientes primero)
        const sorted = result.data.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
        setNotificaciones(sorted);
      } else {
        setError('No se pudieron recuperar las notificaciones.');
      }
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarLeida = async (id, leida) => {
    if (leida) return; // Ya está leída
    try {
      const result = await api.notificaciones.marcarLeida(id);
      if (result) {
        setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      }
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const handleEliminar = async (e, id) => {
    e.stopPropagation(); // Evitar disparar marcar como leída
    try {
      const result = await api.notificaciones.delete(id);
      if (result) {
        setNotificaciones(prev => prev.filter(n => n.id !== id));
      } else {
        alert('No se pudo eliminar la notificación.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    }
  };

  const getTipoEstilos = (tipo) => {
    switch (tipo) {
      case 'llegada':
        return { color: 'var(--success-color)', bg: 'var(--success-light)', icon: ArrowUpCircle };
      case 'salida':
        return { color: 'var(--warning-color)', bg: 'var(--warning-light)', icon: ArrowDownCircle };
      case 'pago':
        return { color: 'var(--info-color)', bg: 'var(--info-light)', icon: DollarSign };
      case 'alerta':
      default:
        return { color: 'var(--danger-color)', bg: 'var(--danger-light)', icon: AlertCircle };
    }
  };

  const getTiempoRelativo = (dateStr) => {
    try {
      const diffMs = new Date() - new Date(dateStr);
      const diffMins = Math.floor(diffMs / 1000 / 60);
      const diffHrs = Math.floor(diffMins / 60);
      
      if (diffMins < 1) return 'Hace unos segundos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHrs < 24) return `Hace ${diffHrs} horas`;
      
      return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (_) {
      return 'Fecha desconocida';
    }
  };

  const formatHora = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && notificaciones.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando notificaciones...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Notificaciones Recibidas</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>Mantente informado sobre los abordajes, cobros y alertas de tus niños</p>
        </div>
        <button onClick={fetchNotificaciones} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      )}

      {notificaciones.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--neutral-muted)' }}>
          <Inbox size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px', strokeWidth: 1.5 }} />
          <p style={{ margin: 0 }}>No tienes notificaciones en tu bandeja.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notificaciones.map((n) => {
            const { color, bg, icon: IconComponent } = getTipoEstilos(n.tipo);
            return (
              <div
                key={n.id}
                onClick={() => handleMarcarLeida(n.id, n.leida)}
                className="card"
                style={{
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: n.leida ? 'var(--white)' : 'var(--primary-light)',
                  borderLeft: `5px solid ${color}`,
                  cursor: n.leida ? 'default' : 'pointer',
                  transition: 'background-color 0.2s',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: bg,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComponent size={22} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                      fontWeight: n.leida ? 600 : 800, 
                      fontSize: '1rem',
                      color: 'var(--neutral-dark)'
                    }}>
                      {n.titulo}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--neutral-muted)', marginTop: '2px' }}>
                      {n.mensaje}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-muted)', marginTop: '4px' }}>
                      {formatHora(n.creado_en)} • {getTiempoRelativo(n.creado_en)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                  {!n.leida && (
                    <button 
                      onClick={() => handleMarcarLeida(n.id, false)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Marcar como leída"
                    >
                      <MailOpen size={14} />
                      Leída
                    </button>
                  )}
                  <button 
                    onClick={(e) => handleEliminar(e, n.id)}
                    className="btn btn-danger btn-circle" 
                    style={{ width: '36px', height: '36px', background: 'none', border: '1px solid var(--danger-border)', color: 'var(--danger-color)' }}
                    title="Eliminar notificación"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
