/**
 * RoleMenu.js
 * Define qué módulos puede ver cada rol en el menú de navegación.
 * Roles soportados: admin | dueno | conductor | padre
 */

export const getRoleMenu = (rol) => {
  const roleMenus = {
    padre: [
      { name: 'Dashboard',      icon: '📊', color: '#6366f1' },
      { name: 'MapaTracking',   icon: '🗺️', color: '#06b6d4' },
      { name: 'Asistencia',     icon: '✅', color: '#10b981' },
      { name: 'Pagos',          icon: '💳', color: '#f59e0b' },
      { name: 'Notificaciones', icon: '🔔', color: '#ef4444' },
      { name: 'Profile',        icon: '👤', color: '#8b5cf6' },
    ],

    conductor: [
      { name: 'Dashboard',      icon: '📊', color: '#6366f1' },
      { name: 'Conductor',      icon: '🚌', color: '#14b8a6' },  // → ConductorScreen (Dev 4)
      { name: 'Notificaciones', icon: '🔔', color: '#ef4444' },
      { name: 'Profile',        icon: '👤', color: '#8b5cf6' },
    ],

    dueno: [
      { name: 'Dashboard',      icon: '📊', color: '#6366f1' },
      { name: 'Recorridos',     icon: '🚌', color: '#14b8a6' },
      { name: 'Rutas',          icon: '🛣️', color: '#3b82f6' },
      { name: 'Paradas',        icon: '📍', color: '#ec4899' },
      { name: 'Alumnos',        icon: '👨‍👧‍👦', color: '#f97316' },
      { name: 'Pagos',          icon: '💳', color: '#f59e0b' },
      { name: 'Notificaciones', icon: '🔔', color: '#ef4444' },
      { name: 'Profile',        icon: '👤', color: '#8b5cf6' },
    ],

    admin: [
      { name: 'Dashboard',      icon: '📊', color: '#6366f1' },
      { name: 'Alumnos',        icon: '👨‍👧‍👦', color: '#f97316' },
      { name: 'Recorridos',     icon: '🚌', color: '#14b8a6' },
      { name: 'Rutas',          icon: '🛣️', color: '#3b82f6' },
      { name: 'Paradas',        icon: '📍', color: '#ec4899' },
      { name: 'Asistencia',     icon: '✅', color: '#10b981' },
      { name: 'Pagos',          icon: '💳', color: '#f59e0b' },
      { name: 'MapaTracking',   icon: '🗺️', color: '#06b6d4' },
      { name: 'Notificaciones', icon: '🔔', color: '#ef4444' },
      { name: 'Profile',        icon: '👤', color: '#8b5cf6' },
    ],
  };

  return roleMenus[rol?.toLowerCase()] || [];
};

/** Verificar si un rol tiene acceso a un módulo específico */
export const hasAccessToModule = (rol, moduleName) => {
  const menu = getRoleMenu(rol);
  return menu.some((item) => item.name === moduleName);
};

/** Solo módulos (sin Profile ni Notificaciones, para BottomTabs de primer nivel) */
export const getModuleMenuForRole = (rol) => {
  const fullMenu = getRoleMenu(rol);
  return fullMenu.filter(
    (item) => item.name !== 'Profile' && item.name !== 'Notificaciones'
  );
};

/**
 * Mapeo de nombres de módulos a nombres de screens
 */
export const moduleToScreenName = {
  Dashboard: 'Dashboard',
  MapaTracking: 'MapaTracking',
  Asistencia: 'Asistencia',
  Pagos: 'Pagos',
  Notificaciones: 'Notificaciones',
  Conductor: 'Conductor', // Conservamos Conductor en lugar de MiRuta
  Recorridos: 'Recorridos',
  Rutas: 'Rutas',
  Paradas: 'Paradas',
  Alumnos: 'Alumnos',
  Profile: 'Profile',
};
