import React, { useState, useEffect, useRef } from 'react';
import { Bus, Play, Square, Wifi, WifiOff, ArrowUp, ArrowDown, ShieldAlert, Award } from 'lucide-react';
import { api } from '../services/api';

export default function MiRuta() {
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  
  const [rutas, setRutas] = useState([]);
  const [selectedRutaId, setSelectedRutaId] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  // References for interval and socket
  const wsRef = useRef(null);
  const gpsIntervalRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    inicializar();
    return () => {
      desconectarWS();
      pararGpsSimulation();
    };
  }, []);

  const inicializar = async () => {
    setLoading(true);
    await checkActiveSession();
    await loadRoutes();
    setLoading(false);
  };

  const checkActiveSession = async () => {
    try {
      const result = await api.sesiones.getActiva();
      if (result.ok && result.data) {
        const sId = result.data.id.toString();
        const recorridoId = result.data.recorrido_id;
        const rId = result.data.ruta_id;

        setSessionId(sId);
        setSelectedRutaId(rId.toString());
        setIsRouteActive(true);

        // Cargar alumnos y sincronizar sus asistencias
        await cargarAlumnos(recorridoId, sId);
        conectarWS(sId);
        iniciarGpsSimulation(sId);
      }
    } catch (e) {
      console.log('No active session found or connection issue.', e);
    }
  };

  const loadRoutes = async () => {
    try {
      const result = await api.rutas.list();
      if (result.ok && Array.isArray(result.data)) {
        setRutas(result.data);
        if (result.data.length > 0 && !selectedRutaId) {
          setSelectedRutaId(result.data[0].id.toString());
        }
      }
    } catch (e) {
      console.error('Error loading routes: ', e);
    }
  };

  const cargarAlumnos = async (recorridoId, sId) => {
    try {
      const alumnosResult = recorridoId 
        ? await api.alumnos.listByRecorrido(recorridoId)
        : await api.alumnos.list();

      if (alumnosResult.ok && Array.isArray(alumnosResult.data)) {
        let listAlumnos = alumnosResult.data.map(a => ({
          id: a.id.toString(),
          nombre: `${a.nombre} ${a.apellido}`.trim(),
          parada: a.parada_nombre || 'Sin parada',
          estadoAsistencia: 'pendiente', // pendiente, en_bus, finalizado
          horaSubida: null,
          horaBajada: null
        }));

        // Sincronizar asistencias con el backend
        if (sId) {
          const assistResult = await api.asistencias.listBySesion(sId);
          if (assistResult.ok && Array.isArray(assistResult.data)) {
            const statusMap = {};
            assistResult.data.forEach(item => {
              statusMap[item.alumno_id.toString()] = item;
            });

            listAlumnos = listAlumnos.map(alumno => {
              const match = statusMap[alumno.id];
              if (match) {
                const subido = match.hora_subida != null;
                const bajado = match.hora_bajada != null;
                return {
                  ...alumno,
                  estadoAsistencia: bajado ? 'finalizado' : (subido ? 'en_bus' : 'pendiente'),
                  horaSubida: match.hora_subida,
                  horaBajada: match.hora_bajada
                };
              }
              return alumno;
            });
          }
        }
        setAlumnos(listAlumnos);
      }
    } catch (e) {
      console.error('Error loading students: ', e);
    }
  };

  // Manejar el ciclo del WebSocket
  const conectarWS = (sId) => {
    desconectarWS();
    
    try {
      const wsUrl = api.websockets.getConductorUrl(sId);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
        setErrorMsg(null);
      };

      ws.onclose = () => {
        setIsWsConnected(false);
      };

      ws.onerror = (e) => {
        console.error('WS Error:', e);
        setIsWsConnected(false);
      };
    } catch (e) {
      setIsWsConnected(false);
      console.error(e);
    }
  };

  const desconectarWS = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsWsConnected(false);
  };

  // Simulación de geolocalización enviada al WebSocket
  const iniciarGpsSimulation = (sId) => {
    pararGpsSimulation();
    tickRef.current = 0;

    gpsIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        tickRef.current++;
        const payload = {
          lat: -0.180653 + (tickRef.current * 0.0001),
          lng: -78.467834,
          timestamp: new Date().toISOString()
        };
        try {
          wsRef.current.send(JSON.stringify(payload));
        } catch (e) {
          console.error('Error sending GPS:', e);
        }
      }
    }, 3000);
  };

  const pararGpsSimulation = () => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  };

  const handleIniciarRuta = async () => {
    if (!selectedRutaId) {
      setErrorMsg('Por favor selecciona una ruta primero.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await api.sesiones.create(parseInt(selectedRutaId));
      if (result.ok && result.data) {
        const sId = result.data.id.toString();
        const recorridoId = result.data.recorrido_id;

        setSessionId(sId);
        setIsRouteActive(true);

        await cargarAlumnos(recorridoId, sId);
        conectarWS(sId);
        iniciarGpsSimulation(sId);
      } else {
        setErrorMsg(result.mensaje || 'Error al iniciar la sesión.');
      }
    } catch (e) {
      setErrorMsg(e.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminarRuta = async () => {
    if (!sessionId) return;
    if (!window.confirm('¿Estás seguro de que deseas terminar el recorrido de hoy?')) {
      return;
    }

    setLoading(true);
    try {
      await api.sesiones.terminar(sessionId);
    } catch (e) {
      console.error('Error ending route:', e);
    } finally {
      desconectarWS();
      pararGpsSimulation();
      
      setIsRouteActive(false);
      setSessionId(null);
      setAlumnos([]);
      setLoading(false);
    }
  };

  const handleMarcarSubida = async (alumnoId) => {
    if (!isRouteActive || !sessionId) return;
    try {
      const result = await api.asistencias.marcarSubida(sessionId, alumnoId);
      if (result.ok) {
        setAlumnos(prev => prev.map(a => {
          if (a.id === alumnoId) {
            return {
              ...a,
              estadoAsistencia: 'en_bus',
              horaSubida: new Date().toISOString()
            };
          }
          return a;
        }));
      }
    } catch (e) {
      alert(e.message || 'Error al marcar subida.');
    }
  };

  const handleMarcarBajada = async (alumnoId) => {
    if (!isRouteActive || !sessionId) return;
    try {
      const result = await api.asistencias.marcarBajada(sessionId, alumnoId);
      if (result.ok) {
        setAlumnos(prev => prev.map(a => {
          if (a.id === alumnoId) {
            return {
              ...a,
              estadoAsistencia: 'finalizado',
              horaBajada: new Date().toISOString()
            };
          }
          return a;
        }));
      }
    } catch (e) {
      alert(e.message || 'Error al marcar bajada.');
    }
  };

  const toggleAsistencia = (alumno) => {
    if (!isRouteActive) return;
    if (alumno.estadoAsistencia === 'pendiente') {
      handleMarcarSubida(alumno.id);
    } else if (alumno.estadoAsistencia === 'en_bus') {
      handleMarcarBajada(alumno.id);
    }
  };

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'finalizado': return 'var(--info-color)';
      case 'en_bus': return 'var(--success-color)';
      case 'pendiente': default: return 'var(--warning-color)';
    }
  };

  if (loading && alumnos.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Iniciando controlador de rutas...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Principal Route Control Card */}
      <div className="card driver-control-card" style={{ padding: '32px' }}>
        {isRouteActive ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="route-active-pulse" />
              <strong style={{ fontSize: '1.2rem', color: 'var(--success-color)' }}>Recorrido en Progreso</strong>
            </div>
            
            <p style={{ margin: 0 }}>El bus está transmitiendo ubicación GPS en tiempo real.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', margin: '4px 0 12px 0' }}>
              {isWsConnected ? (
                <>
                  <Wifi size={18} color="var(--success-color)" />
                  <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>GPS En Línea</span>
                </>
              ) : (
                <>
                  <WifiOff size={18} color="var(--warning-color)" />
                  <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>Reconectando GPS...</span>
                </>
              )}
            </div>

            <button 
              onClick={handleTerminarRuta} 
              className="btn btn-danger"
              style={{ width: '100%', maxWidth: '280px', padding: '14px', fontSize: '1.1rem' }}
            >
              <Square size={20} fill="white" />
              Terminar Recorrido
            </button>
          </>
        ) : (
          <>
            <Bus size={56} color="var(--neutral-muted)" />
            <h3 style={{ margin: 0 }}>Iniciar Recorrido del Día</h3>
            <p style={{ margin: '0 0 12px 0', maxWidth: '400px', fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>
              Selecciona tu ruta asignada para abrir el canal de geolocalización y notificar a los padres de familia.
            </p>

            {errorMsg && (
              <div className="auth-alert auth-alert-danger" style={{ width: '100%', maxWidth: '400px', margin: '0 0 16px 0' }}>
                <ShieldAlert size={18} />
                <div>{errorMsg}</div>
              </div>
            )}

            {rutas.length === 0 ? (
              <div style={{ color: 'var(--warning-color)', fontSize: '0.9rem', fontWeight: 600 }}>
                No hay rutas registradas en el sistema. Solicite al dueño asociar rutas.
              </div>
            ) : (
              <div className="form-group" style={{ width: '100%', maxWidth: '360px', textAlign: 'left' }}>
                <label htmlFor="selectedRutaId">Elige tu Ruta:</label>
                <select 
                  id="selectedRutaId" 
                  value={selectedRutaId} 
                  onChange={(e) => setSelectedRutaId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.recorrido_nombre ? `${r.nombre} (${r.recorrido_nombre})` : r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              onClick={handleIniciarRuta}
              disabled={rutas.length === 0}
              className="btn btn-success"
              style={{ width: '100%', maxWidth: '280px', padding: '14px', fontSize: '1.1rem', marginTop: '8px' }}
            >
              <Play size={20} fill="white" />
              Comenzar Ruta
            </button>
          </>
        )}
      </div>

      {/* Students List */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Alumnos en este Recorrido</h3>
        
        {!isRouteActive ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--neutral-muted)' }}>
            Inicia un recorrido para cargar la lista de alumnos y registrar asistencias.
          </div>
        ) : alumnos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--neutral-muted)' }}>
            No hay alumnos asignados a este recorrido.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alumnos.map((alumno) => {
              const status = alumno.estadoAsistencia;
              const color = getColorEstado(status);
              
              return (
                <div 
                  key={alumno.id} 
                  className="student-card" 
                  onClick={() => toggleAsistencia(alumno)}
                  style={{ cursor: 'pointer', borderColor: `${color}40`, margin: 0 }}
                >
                  <div className="student-info">
                    <div className="student-initials" style={{
                      backgroundColor: `${color}1A`,
                      color: color
                    }}>
                      {status === 'finalizado' ? <Award size={22} /> : <Bus size={22} />}
                    </div>
                    
                    <div className="student-meta">
                      <span className="student-name" style={{
                        textDecoration: status === 'finalizado' ? 'line-through' : 'none',
                        color: status === 'finalizado' ? 'var(--neutral-muted)' : 'var(--neutral-dark)'
                      }}>
                        {alumno.nombre}
                      </span>
                      <span className="student-stop">
                        📍 Parada: {alumno.parada}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-muted)', marginTop: '2px' }}>
                        {status === 'pendiente' && 'Pendiente de abordar'}
                        {status === 'en_bus' && `Abordó: ${new Date(alumno.horaSubida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                        {status === 'finalizado' && `Entregado: ${new Date(alumno.horaBajada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  </div>

                  <div className="student-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleMarcarSubida(alumno.id)}
                      disabled={status !== 'pendiente'}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ArrowUp size={14} />
                      Subida
                    </button>
                    <button
                      onClick={() => handleMarcarBajada(alumno.id)}
                      disabled={status !== 'en_bus'}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ArrowDown size={14} />
                      Bajada
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
