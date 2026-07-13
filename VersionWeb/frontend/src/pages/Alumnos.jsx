import React, { useState, useEffect } from 'react';
import { Plus, X, Users, Calendar } from 'lucide-react';
import { api } from '../services/api';

export default function Alumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [padres, setPadres] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [paradas, setParadas] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form / Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    padre_id: '',
    recorrido_id: '',
    parada_id: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alumnosResult, padresResult, recorridosResult] = await Promise.all([
        api.alumnos.list(),
        api.usuarios.listByRol('padre'),
        api.recorridos.list()
      ]);

      if (alumnosResult.ok && Array.isArray(alumnosResult.data)) {
        setAlumnos(alumnosResult.data);
      }
      
      if (padresResult.ok && Array.isArray(padresResult.data)) {
        setPadres(padresResult.data);
        if (padresResult.data.length > 0) {
          setFormData(prev => ({ ...prev, padre_id: padresResult.data[0].id.toString() }));
        }
      }

      if (recorridosResult.ok && Array.isArray(recorridosResult.data)) {
        const activeRecorridos = recorridosResult.data.filter(r => r.activo);
        setRecorridos(activeRecorridos);
        
        if (activeRecorridos.length > 0) {
          const firstRecId = activeRecorridos[0].id;
          setFormData(prev => ({ ...prev, recorrido_id: firstRecId.toString() }));
          // Cargar las paradas del primer recorrido
          fetchParadas(firstRecId);
        }
      }
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchParadas = async (recorridoId) => {
    try {
      const result = await api.paradas.list(recorridoId);
      if (result.ok && Array.isArray(result.data)) {
        setParadas(result.data);
        if (result.data.length > 0) {
          setFormData(prev => ({ ...prev, parada_id: result.data[0].id.toString() }));
        } else {
          setFormData(prev => ({ ...prev, parada_id: '' }));
        }
      }
    } catch (_) {
      setParadas([]);
      setFormData(prev => ({ ...prev, parada_id: '' }));
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));

    // Si cambia el recorrido, recargar paradas asociadas
    if (id === 'recorrido_id') {
      fetchParadas(parseInt(value));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.fecha_nacimiento || !formData.padre_id || !formData.recorrido_id) {
      alert('Por favor, completa los campos requeridos.');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        fecha_nacimiento: formData.fecha_nacimiento, // YYYY-MM-DD del date picker
        padre_id: parseInt(formData.padre_id),
        recorrido_id: parseInt(formData.recorrido_id),
        ...(formData.parada_id ? { parada_id: parseInt(formData.parada_id) } : {})
      };

      const result = await api.alumnos.create(payload);
      if (result.ok) {
        setIsModalOpen(false);
        setFormData(prev => ({
          ...prev,
          nombre: '',
          apellido: '',
          fecha_nacimiento: '',
          parada_id: ''
        }));
        fetchDatos();
      } else {
        alert(result.mensaje || 'Error al guardar el alumno.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && alumnos.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando alumnos...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Gestión de Alumnos</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>Registra y asocia a los estudiantes con sus padres, recorridos y paradas habituales</p>
        </div>
        <button 
          onClick={() => {
            if (padres.length === 0 || recorridos.length === 0) {
              alert('Debes tener padres y recorridos registrados para poder dar de alta alumnos.');
              return;
            }
            setIsModalOpen(true);
          }} 
          className="btn btn-primary"
        >
          <Plus size={18} />
          Nuevo Alumno
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      )}

      {alumnos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Users size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>No hay alumnos registrados en el sistema.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre y Apellido</th>
                <th>Padre asignado</th>
                <th>Recorrido (ID)</th>
                <th>Parada Asignada</th>
                <th>Fecha Nacimiento</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre} {item.apellido}</td>
                  <td>{item.padre_nombre || `Padre #${item.padre_id}`}</td>
                  <td>{item.recorrido_id}</td>
                  <td>
                    {item.parada_nombre ? (
                      <span className="badge badge-info">{item.parada_nombre}</span>
                    ) : (
                      <span className="badge badge-neutral">Sin parada asignada</span>
                    )}
                  </td>
                  <td>{new Date(item.fecha_nacimiento).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Nuevo Alumno</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre *</label>
                    <input
                      id="nombre"
                      type="text"
                      placeholder="Ej. Mateo"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="apellido">Apellido *</label>
                    <input
                      id="apellido"
                      type="text"
                      placeholder="Ej. Pérez"
                      value={formData.apellido}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                      <Calendar size={16} />
                    </span>
                    <input
                      id="fecha_nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={handleInputChange}
                      style={{ paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="padre_id">Padre / Representante *</label>
                  <select id="padre_id" value={formData.padre_id} onChange={handleInputChange} required>
                    {padres.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.apellido}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="recorrido_id">Recorrido asignado *</label>
                    <select id="recorrido_id" value={formData.recorrido_id} onChange={handleInputChange} required>
                      {recorridos.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="parada_id">Parada habitual (Opcional)</label>
                    <select id="parada_id" value={formData.parada_id} onChange={handleInputChange}>
                      <option value="">Sin parada asignada</option>
                      {paradas.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Guardando...' : 'Guardar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
