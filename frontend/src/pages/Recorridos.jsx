import React, { useState, useEffect } from 'react';
import { Plus, X, Bus, Check, ToggleLeft } from 'lucide-react';
import { api } from '../services/api';

export default function Recorridos({ usuario }) {
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchRecorridos();
  }, []);

  const fetchRecorridos = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.recorridos.list();
      if (result.ok && Array.isArray(result.data)) {
        setRecorridos(result.data);
      } else {
        setError('Error al recuperar la lista de recorridos.');
      }
    } catch (e) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setSubmitLoading(true);
    try {
      const result = await api.recorridos.create(
        formData.nombre.trim(),
        formData.descripcion.trim(),
        formData.activo,
        usuario.id
      );

      if (result.ok) {
        setIsModalOpen(false);
        setFormData({ nombre: '', descripcion: '', activo: true });
        fetchRecorridos();
      } else {
        alert(result.mensaje || 'Error al guardar el recorrido.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && recorridos.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando recorridos...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Listado de Recorridos</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>Crea y gestiona los vehículos y trayectos de RouteKids</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} />
          Nuevo Recorrido
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      )}

      {recorridos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <Bus size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>No hay recorridos registrados. ¡Crea el primero ahora!</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Creador/Dueño</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recorridos.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                  <td>{item.descripcion || '-'}</td>
                  <td>{item.dueno_nombre || `Dueño #${item.dueno_id}`}</td>
                  <td>
                    {item.activo ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-neutral">Inactivo</span>
                    )}
                  </td>
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
              <h3 className="modal-title">Nuevo Recorrido</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre del Recorrido / Autobús *</label>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. Ruta Norte - Autobús 12"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    placeholder="Detalles del vehículo, chofer asignado habitual, etc."
                    rows="3"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <input
                    id="activo"
                    type="checkbox"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    style={{ width: '20px', height: '20px', margin: 0, cursor: 'pointer' }}
                  />
                  <label htmlFor="activo" style={{ cursor: 'pointer', margin: 0 }}>Habilitar este recorrido</label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Guardando...' : 'Guardar Recorrido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
