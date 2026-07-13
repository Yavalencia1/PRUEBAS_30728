import React, { useState, useEffect } from 'react';
import { History, Calendar, Clock, Check, X, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function Asistencia({ usuario }) {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal States
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const rol = (usuario?.rol || 'padre').toLowerCase();
  const esAdmin = rol === 'admin';

  useEffect(() => {
    fetchSesiones();
  }, []);

  const fetchSesiones = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.sesiones.historial();
      if (result.ok && Array.isArray(result.data)) {
        // Ordenar por fecha de inicio descendente (más recientes primero)
        const sorted = result.data.sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
        setSesiones(sorted);
      } else {
        setError('No se pudo recuperar el historial de asistencias.');
      }
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarSesion = async (e, sesionId) => {
    e.stopPropagation(); // Evitar abrir detalles
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta sesión de asistencia? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const result = await api.sesiones.delete(sesionId);
      if (result.ok) {
        fetchSesiones();
      } else {
        alert(result.mensaje || 'No se pudo eliminar la sesión.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    }
  };

  const handleVerDetalles = async (sesion) => {
    setSelectedSesion(sesion);
    setAsistencias([]);
    setLoadingDetalle(true);
    
    try {
      // Intentar cargar del anidado primero, si no, hacer fetch
      if (sesion.asistencias && sesion.asistencias.length > 0) {
        setAsistencias(sesion.asistencias);
      } else {
        const result = await api.asistencias.listBySesion(sesion.id);
        if (result.ok && Array.isArray(result.data)) {
          setAsistencias(result.data);
        }
      }
    } catch (e) {
      console.error('Error fetching list: ', e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Calcular duración en minutos
  const getDuracionMinutos = (inicioStr, finStr) => {
    if (!finStr) return 0;
    const diffMs = new Date(finStr) - new Date(inicioStr);
    const diffMins = Math.max(0, Math.ceil(diffMs / 1000 / 60));
    return diffMins;
  };

  const formatHora = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && sesiones.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando historial de asistencias...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Historial de Asistencias</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>Revisa las bitácoras de los recorridos finalizados y la asistencia de los niños</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      )}

      {sesiones.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <History size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>No hay sesiones de recorrido completadas en el historial.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sesiones.map((sesion) => {
            const fecha = new Date(sesion.inicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const duracion = getDuracionMinutos(sesion.inicio, sesion.fin);
            return (
              <div 
                key={sesion.id} 
                className="card" 
                onClick={() => handleVerDetalles(sesion)}
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  margin: 0,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <History size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{sesion.ruta_nombre || 'Ruta de Transporte'}</h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--neutral-muted)' }}>
                        Conductor: {sesion.conductor_nombre || 'Desconocido'}  •  {fecha}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {esAdmin && (
                      <button 
                        onClick={(e) => handleEliminarSesion(e, sesion.id)}
                        className="btn btn-danger btn-circle"
                        style={{ width: '36px', height: '36px', background: 'none', border: '1px solid var(--danger-border)', color: 'var(--danger-color)' }}
                        title="Eliminar sesión"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ArrowRight size={18} style={{ color: 'var(--neutral-muted)' }} />
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '10px',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--neutral-light)',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius-sm)'
                }}>
                  <div>
                    <span style={{ display: 'block', color: 'var(--neutral-muted)', fontWeight: 600, fontSize: '0.75rem' }}>INICIO</span>
                    <strong>{formatHora(sesion.hora_inicio || sesion.inicio)}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--neutral-muted)', fontWeight: 600, fontSize: '0.75rem' }}>FIN</span>
                    <strong>{formatHora(sesion.hora_fin || sesion.fin)}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--neutral-muted)', fontWeight: 600, fontSize: '0.75rem' }}>DURACIÓN</span>
                    <strong>{duracion} min</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--neutral-muted)', fontWeight: 600, fontSize: '0.75rem' }}>PRESENTES</span>
                    <strong style={{ color: 'var(--success-color)' }}>{sesion.total_presentes || 0}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: 'var(--neutral-muted)', fontWeight: 600, fontSize: '0.75rem' }}>AUSENTES</span>
                    <strong style={{ color: 'var(--danger-color)' }}>{sesion.total_ausentes || 0}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedSesion && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedSesion.ruta_nombre}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--neutral-muted)' }}>
                  Chofer: {selectedSesion.conductor_nombre}  •  {new Date(selectedSesion.inicio).toLocaleDateString('es-ES')}
                </span>
              </div>
              <button onClick={() => setSelectedSesion(null)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '14px' }}>Asistencia de Alumnos</h4>

              {loadingDetalle ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>Cargando detalles de asistencia...</div>
              ) : asistencias.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--neutral-muted)' }}>
                  No se registraron asistencias para esta sesión.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {asistencias.map((ast) => {
                    const presente = ast.hora_subida != null && ast.estado !== 'ausente';
                    const color = presente ? 'var(--success-color)' : 'var(--danger-color)';
                    
                    return (
                      <div 
                        key={ast.id || ast.alumno_id} 
                        className="student-card"
                        style={{ borderColor: `${color}40`, margin: 0 }}
                      >
                        <div className="student-info">
                          <div className="student-initials" style={{
                            backgroundColor: `${color}1A`,
                            color: color
                          }}>
                            {presente ? <Check size={20} /> : <X size={20} />}
                          </div>
                          <div className="student-meta">
                            <span className="student-name">{ast.alumno_nombre || `Alumno #${ast.alumno_id}`}</span>
                            <span className="student-stop" style={{ fontSize: '0.8rem' }}>
                              Subida: {formatHora(ast.hora_subida)} | Bajada: {formatHora(ast.hora_bajada)}
                            </span>
                          </div>
                        </div>

                        <span className={`badge ${presente ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                          {ast.estado || (presente ? 'presente' : 'ausente')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedSesion(null)} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
