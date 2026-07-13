import React, { useState, useEffect, useRef } from 'react';
import { Map, Navigation, Wifi, WifiOff, RefreshCw, Compass } from 'lucide-react';
import { api } from '../services/api';
import L from 'leaflet';

// Leaflet styles
const stopIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 32],
  iconAnchor: [10, 32],
});

const busIcon = L.divIcon({
  html: `<div style="background-color: var(--primary-color); border: 2px solid white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M4 14V9c0-1.7 1.3-3 3-3h10c1.7 0 3 1.3 3 3v5"/><path d="M4 20v-2c0-1 1-2 2-2h12c1 0 2 1 2 2v2"/><path d="M8 20v2"/><path d="M16 20v2"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/></svg></div>`,
  className: 'custom-bus-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function MapaTracking({ usuario }) {
  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const [busLocation, setBusLocation] = useState(null);
  const [stops, setStops] = useState([]);
  const [eta, setEta] = useState('Calculando...');
  const [lastUpdate, setLastUpdate] = useState(null);

  const rol = (usuario?.rol || 'padre').toLowerCase();
  const esAdmin = rol === 'admin';

  // Refs
  const mapRef = useRef(null);
  const busMarkerRef = useRef(null);
  const stopsLayerRef = useRef(null);
  const mapContainerRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    verificarSesionActiva();
    return () => {
      desconectarWS();
      destruirMapa();
    };
  }, []);

  // Inicializar mapa cuando se detecta sesión activa
  useEffect(() => {
    if (hasActiveSession && busLocation && mapContainerRef.current) {
      setTimeout(() => {
        inicializarMapa();
      }, 100);
    }
  }, [hasActiveSession, busLocation]);

  const verificarSesionActiva = async () => {
    setLoading(true);
    try {
      // Endpoint depende de si es admin u otro rol
      const result = esAdmin 
        ? await api.sesiones.getActiva()
        : await api.sesiones.getActivaParaUsuario();

      if (result.ok && result.data) {
        const sId = result.data.id.toString();
        setSessionId(sId);
        setHasActiveSession(true);
        
        // Cargar paradas del recorrido de la sesión
        await cargarParadas(sId);
        
        // Configurar ubicación inicial (por defecto Quito, se actualizará por WS)
        setBusLocation({ lat: -0.180653, lng: -78.467834 });
        
        // Conectar al WebSocket
        conectarWS(sId);
      } else {
        setHasActiveSession(false);
      }
    } catch (e) {
      setHasActiveSession(false);
    } finally {
      setLoading(false);
    }
  };

  const cargarParadas = async (sId) => {
    try {
      const result = await api.paradas.listForSession(sId);
      if (result.ok && Array.isArray(result.data)) {
        setStops(result.data);
      }
    } catch (e) {
      console.error('Error loading stops:', e);
    }
  };

  const conectarWS = (sId) => {
    desconectarWS();
    try {
      const wsUrl = api.websockets.getGpsUrl(sId);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onclose = () => {
        setIsWsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.lat && data.lng) {
            const loc = { lat: data.lat, lng: data.lng };
            setBusLocation(loc);
            setLastUpdate(new Date());
            setEta('10 min aprox.'); // Simulado o calculado
            
            // Actualizar marcador de bus en el mapa directamente
            if (busMarkerRef.current) {
              busMarkerRef.current.setLatLng([data.lat, data.lng]);
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = () => {
        setIsWsConnected(false);
      };
    } catch (e) {
      setIsWsConnected(false);
    }
  };

  const desconectarWS = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsWsConnected(false);
  };

  const inicializarMapa = () => {
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([busLocation.lat, busLocation.long || busLocation.lng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Marcador del autobús
    const busMarker = L.marker([busLocation.lat, busLocation.lng], { icon: busIcon }).addTo(map);
    busMarkerRef.current = busMarker;

    // Capa de paradas
    const stopsGroup = L.featureGroup();
    stops.forEach((stop, index) => {
      L.marker([stop.latitud, stop.longitud], { icon: stopIcon })
        .bindPopup(`<strong>Parada ${index + 1}: ${stop.nombre}</strong>`)
        .addTo(stopsGroup);
    });
    stopsGroup.addTo(map);
    stopsLayerRef.current = stopsGroup;
  };

  const destruirMapa = () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      busMarkerRef.current = null;
      stopsLayerRef.current = null;
    }
  };

  const handleCentrar = () => {
    if (mapRef.current && busLocation) {
      mapRef.current.setView([busLocation.lat, busLocation.lng], 16);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Buscando recorridos activos...</div>
      </div>
    );
  }

  if (!hasActiveSession) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 150px)',
        textAlign: 'center',
        padding: '24px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--neutral-light)',
          color: 'var(--neutral-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <Map size={40} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>El recorrido aún no ha iniciado</h3>
        <p style={{ color: 'var(--neutral-muted)', maxWidth: '320px', marginTop: '8px' }}>
          Te notificaremos en cuanto el conductor inicie el autobús escolar.
        </p>
        <button onClick={verificarSesionActiva} className="btn btn-primary" style={{ marginTop: '16px' }}>
          <RefreshCw size={16} />
          Verificar Estado
        </button>
      </div>
    );
  }

  return (
    <div className="map-container-full" style={{ margin: '-32px' }}>
      {/* El Contenedor del Mapa */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 70px)' }} />

      {/* Botón Flotante para Centrar */}
      <div className="map-floating-header">
        <button 
          onClick={handleCentrar} 
          className="btn btn-primary btn-circle" 
          style={{ width: '50px', height: '50px', boxShadow: 'var(--shadow-premium)' }}
          title="Centrar en autobús"
        >
          <Compass size={24} />
        </button>
      </div>

      {/* Panel Flotante Inferior de Información */}
      <div className="map-floating-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-muted)', fontWeight: 600 }}>Rastreo GPS en Tiempo Real</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
            {isWsConnected ? (
              <>
                <Wifi size={16} color="var(--success-color)" />
                <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>Conexión en vivo</span>
              </>
            ) : (
              <>
                <WifiOff size={16} color="var(--danger-color)" />
                <span style={{ color: 'var(--danger-color)', fontWeight: 700 }}>Desconectado</span>
              </>
            )}
          </div>
        </div>

        <h3 style={{ margin: '4px 0', fontSize: '1.6rem', color: 'var(--primary-color)', fontWeight: 800 }}>
          Llegada estimada: {eta}
        </h3>

        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--neutral-muted)' }}>
          Última señal recibida: {lastUpdate ? lastUpdate.toLocaleTimeString('es-ES') : 'Esperando primer reporte...'}
        </p>
      </div>
    </div>
  );
}
