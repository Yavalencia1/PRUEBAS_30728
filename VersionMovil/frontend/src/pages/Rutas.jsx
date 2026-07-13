import React, { useState, useEffect } from 'react';
import { Plus, X, Navigation, Check } from 'lucide-react';
import { api } from '../services/api';

export default function Rutas() {
  const [rutas, setRutas] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    recorrido_id: '',
    nombre: '',
    descripcion: '',
    tipo: 'ida_vuelta'
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener rutas y recorridos en paralelo
      const [rutasResult, recorridosResult] = await Promise.all([
        api.rutas.list(),
        api.recorridos.list()
      ]);

      if (rutasResult.ok && Array.isArray(rutasResult.data)) {
        setRutas(rutasResult.data);
      }
      
      if (recorridosResult.ok && Array.isArray(recorridosResult.data)) {
        const activeRecorridos = recorridosResult.data.filter(r => r.activo);
        setRecorridos(activeRecorridos);
        
        if (activeRecorridos.length > 0) {
          setFormData(prev => ({ ...prev, recorrido_id: activeRecorridos[0].id.toString() }));
        }
      }
    } catch (e) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.recorrido_id) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }

    setSubmitLoading(true);
    try {
      const result = await api.rutas.create(
        parseInt(formData.recorrido_id),
        formData.nombre.trim(),
        formData.descripcion.trim(),
        formData.tipo
      );

      if (result.ok) {
        setIsModalOpen(false);
        setFormData(prev => ({
          ...prev,
          nombre: '',
          descripcion: '',
          tipo: 'ida_vuelta'
        }));
        fetchDatos();
      } else {
        alert(result.mensaje || 'Error al guardar la ruta.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const traducirTipo = (tipo) => {
    switch (tipo) {
      case 'ida': return 'Solo Ida (Mañana)';
      case 'vuelta': return 'Solo Vuelta (Tarde)';
      case 'ida_vuelta': default: return 'Ida y Vuelta';
    }
  };

  if (loading && rutas.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando rutas de transporte...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Rutas de Transporte</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>Configura las sub-rutas específicas asignadas a cada recorrido</p>
        </div>
        <button 
          onClick={() => {
            if (recorridos.length === 0) {
              alert('Debes crear un recorrido activo primero antes de registrar rutas.');
              return;
            }
            setIsModalOpen(true);
          }} 
          className="btn btn-primary"
        >
          <Plus size={18} />
          Nueva Ruta
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      )}

      {rutas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Navigation size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>No hay rutas registradas.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre de la Ruta</th>
                <th>Recorrido</th>
                <th>Tipo</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {rutas.map((ruta) => (
                <tr key={ruta.id}>
                  <td>#{ruta.id}</td>
                  <td style={{ fontWeight: 600 }}>{ruta.nombre}</td>
                  <td>{ruta.recorrido_nombre || `#${ruta.recorrido_id}`}</td>
                  <td>
                    <span className="badge badge-info">
                      {traducirTipo(ruta.tipo)}
                    </span>
                  </td>
                  <td>{ruta.descripcion || '-'}</td>
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
              <h3 className="modal-title">Nueva Ruta de Transporte</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="recorrido_id">Asociar a un Recorrido *</label>
                  <select 
                    id="recorrido_id" 
                    value={formData.recorrido_id} 
                    onChange={handleInputChange} 
                    required
                  >
                    {recorridos.map(rec => (
                      <option key={rec.id} value={rec.id}>
                        {rec.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="nombre">Nombre de la Ruta *</label>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. Ruta Centro - Cumbayá"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    placeholder="Detalles sobre calles principales, puntos de inicio/fin, etc."
                    rows="3"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="tipo">Tipo de Ruta *</label>
                  <select id="tipo" value={formData.tipo} onChange={handleInputChange} required>
                    <option value="ida">Solo Ida (Mañana)</option>
                    <option value="vuelta">Solo Vuelta (Tarde)</option>
                    <option value="ida_vuelta">Ida y Vuelta</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Guardando...' : 'Guardar Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
