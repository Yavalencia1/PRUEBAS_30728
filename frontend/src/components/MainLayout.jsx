import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Map, 
  MapPin, 
  Users, 
  CreditCard, 
  History, 
  Navigation, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  Bus
} from 'lucide-react';
import { api } from '../services/api';

export default function MainLayout({ 
  usuario, 
  currentTab, 
  onTabChange, 
  children 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const rol = (usuario?.rol || 'padre').toLowerCase();
  const nombre = usuario?.nombre || 'Usuario';
  const apellido = usuario?.apellido || '';

  const handleLogout = () => {
    api.auth.logout();
  };

  // Definición de tabs según rol
  const tabsConfig = {
    dueno: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'recorridos', label: 'Recorridos', icon: Car },
      { id: 'rutas', label: 'Rutas', icon: Navigation },
      { id: 'paradas', label: 'Paradas', icon: MapPin },
      { id: 'alumnos', label: 'Alumnos', icon: Users },
      { id: 'pagos', label: 'Pagos', icon: CreditCard },
    ],
    conductor: [
      { id: 'miruta', label: 'Mi Ruta', icon: Bus },
      { id: 'asistencia', label: 'Historial Asistencia', icon: History },
    ],
    admin: [
      { id: 'mapa', label: 'Rastreo en Vivo', icon: Map },
      { id: 'asistencia', label: 'Reporte Asistencias', icon: History },
      { id: 'pagos', label: 'Pagos', icon: CreditCard },
    ],
    padre: [
      { id: 'mapa', label: 'Rastreo en Vivo', icon: Map },
      { id: 'asistencia', label: 'Historial Asistencia', icon: History },
      { id: 'pagos', label: 'Mis Pagos', icon: CreditCard },
      { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    ]
  };

  const currentTabs = tabsConfig[rol] || tabsConfig.padre;

  // Traducir rol para mostrarlo estéticamente
  const getRolLabel = (r) => {
    switch(r) {
      case 'dueno': return 'Dueño / Cooperativa';
      case 'conductor': return 'Conductor';
      case 'admin': return 'Administrador';
      case 'padre': default: return 'Padre de Familia';
    }
  };

  return (
    <div className="app-container">
      {/* Botón Menu Móvil */}
      <div className="md:hidden" style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 999,
        display: 'flex',
        gap: '10px'
      }}>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-primary btn-circle"
          style={{ width: '45px', height: '45px' }}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          position: sidebarOpen ? 'fixed' : 'relative',
          height: '100vh',
          zIndex: 900,
          left: 0,
          transform: sidebarOpen ? 'translateX(0)' : '',
          // En CSS para pantallas móviles agregamos un media query, pero en JS aseguramos estilos inline básicos si es necesario:
          display: sidebarOpen ? 'flex' : undefined
        }}
      >
        <div className="sidebar-brand">
          <Bus size={28} color="var(--primary-light)" />
          <span>RouteKids</span>
        </div>

        <nav className="sidebar-nav">
          {currentTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setSidebarOpen(false);
                }}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <IconComponent size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">
              {nombre.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{nombre} {apellido}</span>
              <span className="user-role">{getRolLabel(rol)}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay para cerrar sidebar móvil al hacer click fuera */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 850
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="main-header">
          <div className="header-title">
            {currentTabs.find(t => t.id === currentTab)?.label || 'RouteKids'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--neutral-muted)',
              fontWeight: 500,
              backgroundColor: 'var(--neutral-light)',
              padding: '6px 12px',
              borderRadius: '50px',
              border: '1px solid var(--neutral-border)'
            }}>
              {getRolLabel(rol)}
            </span>
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Responsive mobile sidebar overrides inline styles block */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }
          .sidebar.open {
            display: flex !important;
            width: 260px !important;
          }
          .main-header {
            padding-left: 80px;
          }
        }
      `}</style>
    </div>
  );
}
