import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import { api } from '../services/api';
import L from 'leaflet';

// Corregir icono por defecto de Leaflet en Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

export default function Paradas() {
  const [paradas, setParadas] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form / Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    ruta_id: '',
    nombre: '',
    latitud: -0.180653, // Centro de Quito por defecto
    longitud: -78.467834,
    orden: '0'
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Map references
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    fetchDatos();
  }, []);

  // Inicializar mapa cuando se abre el modal
  useEffect(() => {
    if (isModalOpen && mapContainerRef.current) {
      setTimeout(() => {
        initMap();
      }, 100);
    }
    return () => {
      // Destruir mapa al cerrar modal para evitar fugas de memoria
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isModalOpen]);

  const fetchDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paradasResult, rutasResult] = await Promise.all([
        api.paradas.list(),
        api.rutas.list()
      ]);

      if (paradasResult.ok && Array.isArray(paradasResult.data)) {
        setParadas(paradasResult.data);
      }
      
      if (rutasResult.ok && Array.isArray(rutasResult.data)) {
        setRutas(rutasResult.data);
        if (rutasResult.data.length > 0) {
          setFormData(prev => ({ ...prev, ruta_id: rutasResult.data[0].id.toString() }));
        }
      }
    } catch (e) {
      setError(e.message || 'Error de conexión al cargar paradas.');
    } finally {
      setLoading(false);
    }
  };

  const initMap = () => {
    if (mapRef.current) return;

    const initialPos = [formData.latitud, formData.longitud];
    
    // Crear el mapa Leaflet
    const map = L.map(mapContainerRef.current).setView(initialPos, 13);
    mapRef.current = map;

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Agregar marcador arrastrable
    const marker = L.marker(initialPos, { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Escuchar el movimiento del marcador (dragend)
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setFormData(prev => ({
        ...prev,
        latitud: parseFloat(pos.lat.toFixed(6)),
        longitud: parseFloat(pos.lng.toFixed(6))
      }));
    });

    // Escuchar clicks en el mapa para mover el pin
    map.on('click', (e) => {
      const pos = e.latlng;
      marker.setLatLng(pos);
      setFormData(prev => ({
        ...prev,
        latitud: parseFloat(pos.lat.toFixed(6)),
        longitud: parseFloat(pos.lng.toFixed(6))
      }));
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [id]: value };
      
      // Actualizar marcador si cambia manualmente la latitud o longitud
      if ((id === 'latitud' || id === 'longitud') && markerRef.current && mapRef.current) {
        const lat = parseFloat(id === 'latitud' ? value : prev.latitud);
        const lng = parseFloat(id === 'longitud' ? value : prev.longitud);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const newPos = [lat, lng];
          markerRef.current.setLatLng(newPos);
          mapRef.current.setView(newPos, mapRef.current.getZoom());
        }
      }
      
      return updated;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const lat = parseFloat(formData.latitud);
    const lng = parseFloat(formData.longitud);
    const orden = parseInt(formData.orden);

    if (!formData.nombre.trim() || !formData.ruta_id) {
      alert('Por favor, ingresa todos los campos obligatorios.');
      return;
    }

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      alert('Por favor, ingresa coordenadas válidas.');
      return;
    }

    if (isNaN(orden) || orden < 0) {
      alert('El orden debe ser un número mayor o igual a 0.');
      return;
    }

    setSubmitLoading(true);
    try {
      const result = await api.paradas.create(
        parseInt(formData.ruta_id),
        formData.nombre.trim(),
        lat,
        lng,
        orden
      );

      if (result.ok) {
        setIsModalOpen(false);
        setFormData(prev => ({
          ...prev,
          nombre: '',
          latitud: -0.180653,
          longitud: -78.467834,
          orden: '0'
        }));
        fetchDatos();
      } else {
        alert(result.mensaje || 'Error al guardar la parada.');
      }
    } catch (e) {
      alert(e.message || 'Error de conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && paradas.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando paradas del mapa...</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Paradas de la Ruta</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>Ubica geográficamente los paraderos del autobús escolar</p>
        </div>
        <button 
          onClick={() => {
            if (rutas.length === 0) {
              alert('Debes tener rutas activas en el sistema para poder registrar paradas.');
              return;
            }
            setIsModalOpen(true);
          }} 
          className="btn btn-primary"
        >
          <Plus size={18} />
          Nueva Parada
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)' }}>
          {error}
        </div>
      )}

      {paradas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <MapPin size={48} style={{ color: 'var(--neutral-border)', marginBottom: '16px' }} />
          <p style={{ margin: 0 }}>No hay paradas registradas en el sistema.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Parada</th>
                <th>Ruta Asociada</th>
                <th>Ubicación (Lat, Lng)</th>
                <th>Orden</th>
              </tr>
            </thead>
            <tbody>
              {paradas.map((item) => (
                <tr key={item.id}>
                  <td>#{item.id}</td>
                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                  <td>{item.ruta_nombre || `#${item.ruta_id}`}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--neutral-muted)' }}>
                      {item.latitud.toFixed(5)}, {item.longitud.toFixed(5)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ minWidth: '30px', textAlign: 'center' }}>
                      {item.orden}
                    </span>
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
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Nueva Parada</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div className="form-group">
                  <label htmlFor="ruta_id">Ruta de Transporte *</label>
                  <select id="ruta_id" value={formData.ruta_id} onChange={handleInputChange} required>
                    {rutas.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.recorrido_nombre ? `${r.nombre} (${r.recorrido_nombre})` : r.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="nombre">Nombre de la Parada *</label>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Ej. Parada 1 - Centro Comercial"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="latitud">Latitud *</label>
                    <input
                      id="latitud"
                      type="number"
                      step="0.000001"
                      value={formData.latitud}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="longitud">Longitud *</label>
                    <input
                      id="longitud"
                      type="number"
                      step="0.000001"
                      value={formData.longitud}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Ubica el paradero en el mapa (Arrastra el pin):</label>
                  {/* Contenedor del mapa Leaflet */}
                  <div ref={mapContainerRef} className="map-container" style={{ height: '220px' }}></div>
                </div>

                <div className="form-group">
                  <label htmlFor="orden">Orden de la Parada en la Ruta *</label>
                  <input
                    id="orden"
                    type="number"
                    min="0"
                    placeholder="Ej. 0, 1, 2..."
                    value={formData.orden}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Guardando...' : 'Guardar Parada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
