import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Recorridos from './pages/Recorridos';
import Rutas from './pages/Rutas';
import Paradas from './pages/Paradas';
import Alumnos from './pages/Alumnos';
import Pagos from './pages/Pagos';
import MiRuta from './pages/MiRuta';
import Asistencia from './pages/Asistencia';
import MapaTracking from './pages/MapaTracking';
import Notificaciones from './pages/Notificaciones';
import { api } from './services/api';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [tab, setTab] = useState('login'); // login, register, dashboard, etc.
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Restaurar sesión persistida
    const currentUser = api.auth.getCurrentUser();
    const token = api.auth.getToken();

    if (currentUser && token) {
      setUsuario(currentUser);
      setTab(getDefaultTabForRole(currentUser.rol));
    }
    setInitialized(true);

    // Escuchar evento de logout automático (token expirado)
    const handleAuthLogout = () => {
      setUsuario(null);
      setTab('login');
    };

    window.addEventListener('auth-logout', handleAuthLogout);
    return () => {
      window.removeEventListener('auth-logout', handleAuthLogout);
    };
  }, []);

  const getDefaultTabForRole = (rol) => {
    switch (rol?.toLowerCase()) {
      case 'dueno': return 'dashboard';
      case 'conductor': return 'miruta';
      case 'admin': return 'mapa';
      case 'padre': default: return 'mapa';
    }
  };

  const handleLoginSuccess = (user) => {
    setUsuario(user);
    setTab(getDefaultTabForRole(user.rol));
  };

  const handleLogoutSuccess = () => {
    setUsuario(null);
    setTab('login');
  };

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Cargando entorno RouteKids...</div>
      </div>
    );
  }

  // Si no está autenticado
  if (!usuario) {
    if (tab === 'register') {
      return (
        <Register 
          onNavigateToLogin={() => setTab('login')} 
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onNavigateToRegister={() => setTab('register')} 
      />
    );
  }

  // Si está autenticado, renderizar layout y componente activo
  return (
    <MainLayout 
      usuario={usuario} 
      currentTab={tab} 
      onTabChange={setTab}
    >
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'recorridos' && <Recorridos usuario={usuario} />}
      {tab === 'rutas' && <Rutas />}
      {tab === 'paradas' && <Paradas />}
      {tab === 'alumnos' && <Alumnos />}
      {tab === 'pagos' && <Pagos usuario={usuario} />}
      {tab === 'miruta' && <MiRuta />}
      {tab === 'asistencia' && <Asistencia usuario={usuario} />}
      {tab === 'mapa' && <MapaTracking usuario={usuario} />}
      {tab === 'notificaciones' && <Notificaciones />}
    </MainLayout>
  );
}

export default App;
